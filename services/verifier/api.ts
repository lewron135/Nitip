/**
 * API verifier — satu proses, dua peran (§14.1 "satu proses, dua modul").
 *
 *   1. Melayani frontend dengan data yang sudah dirangkai indexer.
 *   2. Menjalankan pipeline verifikasi AI dan, kalau lolos, memanggil
 *      `releaseCapital` sebagai VERIFIER.
 *
 * SATU-SATUNYA KUNCI PRIVAT DI SERVER INI ADALAH VERIFIER_PK, dan kuasanya
 * dibatasi keras oleh kontrak: dia tidak bisa mencairkan di atas plafon,
 * tidak bisa menyentuh order yang tidak berstatus PROOFED, dan tidak bisa
 * memutus sengketa. Arbiter sengaja TIDAK ditaruh di sini — arbiter
 * menandatangani dari wallet-nya sendiri di browser, sehingga tidak ada
 * satu pun kunci di server yang bisa memindahkan dana sengketa.
 *
 *   npm run verifier
 */

import express, {type Request, type Response} from "express";
import cors from "cors";
import {jejakEscrowAbi} from "../shared/abi.js";
import {publicClient, walletFor} from "../shared/chain.js";
import {assertSiapJalan, env} from "../shared/env.js";
import {IndexerDb, type OrderRow} from "../indexer/db.js";
import {rekamArbiter, rekamJejak} from "../indexer/stats.js";
import {tierCapWei, tierOf, TIER_LABELS} from "../scoring/trust.js";
import {bacaStruk, cocokkanBarang, modeAi} from "./ai.js";
import {putuskan} from "./decision.js";
import {perkecilUntukAi} from "./gambar.js";
import {weiKeIdr, tabelKurs} from "./fx.js";
import {bacaBuktiLokal, simpanBukti} from "./storage.js";
import {siapkanTabelVerifier, simpanBundel, simpanKeputusan, bundelOrder, keputusanOrder} from "./store.js";

const db = new IndexerDb();
siapkanTabelVerifier(db);

const app = express();
app.use(cors());
// Foto struk beresolusi tinggi dalam base64 bisa beberapa MB. Batasnya dinaikkan
// sekali di sini, bukan dinaikkan diam-diam saat unggahan pertama gagal.
app.use(express.json({limit: "25mb"}));

// ═══════════════════════════════════════════════════════════════════════
//  KESEHATAN & KONFIGURASI
// ═══════════════════════════════════════════════════════════════════════

app.get("/health", async (_req, res) => {
  let blokTerbaru: string | null = null;
  let rantaiHidup = false;
  try {
    blokTerbaru = (await publicClient.getBlockNumber()).toString();
    rantaiHidup = true;
  } catch {
    /* rantai tidak terjangkau — dilaporkan apa adanya di bawah */
  }

  res.json({
    ok: true,
    chainId: env.chainId,
    kontrak: env.contractAddress || null,
    deployBlock: env.deployBlock.toString(),
    blokTerindeks: db.lastIndexedBlock().toString(),
    blokTerbaru,
    rantaiHidup,
    jumlahEvent: db.jumlahEvent(),
    modeAi: modeAi(),
    demoMode: env.demoMode,
    verifierTerpasang: Boolean(env.verifierPk),
    kurs: tabelKurs()
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  PEMBACAAN
// ═══════════════════════════════════════════════════════════════════════

app.get("/api/orders", (req, res) => {
  const alamat = typeof req.query.alamat === "string" ? req.query.alamat : null;
  const rows = alamat ? db.orderMilik(alamat) : db.daftarOrder(100);
  res.json({orders: rows.map(_bentukOrder)});
});

app.get("/api/orders/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.order(id);
  if (!row) return res.status(404).json({error: "Order tidak ditemukan di indexer."});

  res.json({
    order: _bentukOrder(row),
    riwayat: db.eventOrder(id),
    bukti: bundelOrder(db, id),
    verifikasi: keputusanOrder(db, id)
  });
});

app.get("/api/jastiper/:address", (req, res) => {
  const alamat = req.params.address;
  if (!/^0x[0-9a-fA-F]{40}$/.test(alamat)) {
    return res.status(400).json({error: "Alamat tidak sah."});
  }

  const rekam = rekamJejak(db, alamat);
  const tier = tierOf(rekam.completedCount, rekam.abandonedCount);

  res.json({
    address: alamat,
    trust: rekam.trust,
    input: {...rekam.input, vTotalWei: rekam.input.vTotalWei.toString()},
    completionHours: rekam.completionHours,
    tier: {
      level: tier,
      label: TIER_LABELS[tier],
      capWei: tierCapWei(rekam.completedCount, rekam.abandonedCount).toString()
    },
    completedCount: rekam.completedCount,
    abandonedCount: rekam.abandonedCount,
    orders: db.orderMilik(alamat, 50).map(_bentukOrder)
  });
});

app.get("/api/jastiper", (_req, res) => {
  const daftar = db.daftarJastiper().map((a) => {
    const r = rekamJejak(db, a);
    return {
      address: a,
      trust: r.trust.trust,
      nCompleted: r.input.nCompleted,
      uBuyers: r.input.uBuyers,
      tier: tierOf(r.completedCount, r.abandonedCount)
    };
  });
  res.json({jastiper: daftar});
});

app.get("/api/arbiter", (_req, res) => {
  res.json({
    rekam: rekamArbiter(db),
    antrean: db.orderBersengketa().map(_bentukOrder)
  });
});

/** Melayani berkas bukti kalau Pinata tidak dipakai (§11.7 fallback). */
app.get("/bukti/:nama", (req, res) => {
  const isi = bacaBuktiLokal(req.params.nama);
  if (!isi) return res.status(404).end();
  const tipe = req.params.nama.endsWith(".png")
    ? "image/png"
    : req.params.nama.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  res.type(tipe).send(isi);
});

// ═══════════════════════════════════════════════════════════════════════
//  UNGGAH BUKTI
//  Jastiper mengunggah ke sini DULU, mendapat proofHash, lalu memanggil
//  `submitProof(orderId, proofHash)` dari wallet-nya sendiri. Urutan ini
//  penting: server tidak pernah menandatangani apa pun atas nama jastiper.
// ═══════════════════════════════════════════════════════════════════════

app.post("/api/proof/:id", async (req, res) => {
  const id = Number(req.params.id);
  const {struk, barang} = req.body as {
    struk?: {data: string; nama: string; tipe: string};
    barang?: {data: string; nama: string; tipe: string};
  };

  if (!struk?.data) return res.status(400).json({error: "Foto struk wajib diunggah."});

  try {
    const bStruk = await simpanBukti(struk.data, struk.nama ?? "struk", struk.tipe ?? "image/jpeg");
    const bBarang = barang?.data
      ? await simpanBukti(barang.data, barang.nama ?? "barang", barang.tipe ?? "image/jpeg")
      : null;

    // proofHash yang masuk on-chain adalah hash GABUNGAN kedua berkas, supaya
    // satu nilai di rantai mengikat seluruh berkas bukti sekaligus. Kalau
    // hanya ada struk, hash-nya adalah hash struk itu sendiri.
    const proofHash = bBarang ? _gabungHash(bStruk.hash, bBarang.hash) : bStruk.hash;

    simpanBundel(db, id, proofHash, bStruk, bBarang);

    res.json({
      orderId: id,
      proofHash,
      struk: bStruk,
      barang: bBarang,
      langkahBerikutnya:
        "Panggil submitProof(orderId, proofHash) dari wallet jastiper. Server tidak menandatangani apa pun atas namamu."
    });
  } catch (e) {
    res.status(500).json({error: e instanceof Error ? e.message : String(e)});
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  VERIFIKASI  —  jantung produk
// ═══════════════════════════════════════════════════════════════════════

app.post("/api/verify/:id", async (req, res) => {
  const id = Number(req.params.id);
  const row = db.order(id);

  if (!row) return res.status(404).json({error: "Order tidak ditemukan di indexer."});
  if (row.status !== 2) {
    return res.status(409).json({
      error: `Order berstatus ${row.status}, bukan PROOFED. Verifikasi hanya berlaku di PROOFED.`
    });
  }

  const bundel = bundelOrder(db, id);
  if (!bundel) {
    return res.status(409).json({
      error: "Bukti untuk order ini belum diunggah ke server. Unggah dulu lewat POST /api/proof/:id."
    });
  }

  try {
    // Perkecil untuk AI SAJA — berkas bukti asli di storage.ts tidak disentuh,
    // hash on-chain tetap dihitung dari yang diunggah pembeli/jastiper (§11.7).
    const strukUntukAi = await perkecilUntukAi(bundel.struk.base64, bundel.struk.mediaType);
    const barangUntukAi = bundel.barang ? await perkecilUntukAi(bundel.barang.base64, bundel.barang.mediaType) : null;

    // ── AI-1: baca struk ───────────────────────────────────────────
    const struk = await bacaStruk(strukUntukAi.base64, strukUntukAi.mediaType);

    // ── AI-2: cocokkan foto barang (kalau ada) ─────────────────────
    const barang = barangUntukAi
      ? await cocokkanBarang(barangUntukAi.base64, barangUntukAi.mediaType, bundel.deskripsi ?? "")
      : null;

    // ── Mesin keputusan (P2) ───────────────────────────────────────
    const keputusan = putuskan({
      struk,
      barang,
      capWei: BigInt(row.cap_wei),
      idrPerBnbSnapshot: BigInt(row.idr_per_bnb)
    });

    let txHash: string | null = null;
    let galatTx: string | null = null;

    if (keputusan.putusan === "cairkan") {
      if (!env.verifierPk) {
        galatTx =
          "VERIFIER_PK belum diisi, jadi transaksi tidak dikirim. Keputusannya tetap dicatat: " +
          "AI menyetujui pencairan sebesar nominal di bawah.";
      } else {
        try {
          const {client, account} = walletFor(env.verifierPk);
          txHash = await client.writeContract({
            address: env.contractAddress,
            abi: jejakEscrowAbi,
            functionName: "releaseCapital",
            args: [BigInt(id), keputusan.verifiedWei!],
            account,
            chain: client.chain
          });
        } catch (e) {
          // Kontrak menolak adalah hasil yang SAH, bukan kegagalan sistem.
          // Pesan revert "JEJAK: ..." ditampilkan apa adanya — itu pagar
          // terakhir yang kami klaim di pitch, jadi jangan disembunyikan.
          galatTx = e instanceof Error ? e.message : String(e);
        }
      }
    }

    simpanKeputusan(db, id, keputusan, txHash, galatTx);

    res.json({
      orderId: id,
      putusan: keputusan.putusan,
      alasan: keputusan.alasan,
      penjelasan: keputusan.penjelasan,
      verifiedWei: keputusan.verifiedWei?.toString() ?? null,
      verifiedIdr: keputusan.konversi?.idr ?? null,
      konversi: keputusan.konversi
        ? {...keputusan.konversi, wei: keputusan.konversi.wei.toString()}
        : null,
      struk,
      barang,
      modeAi: modeAi(),
      txHash,
      galatTx,
      catatanJalur:
        keputusan.putusan === "tahan"
          ? "Modal TIDAK dicairkan. Order tetap di PROOFED sampai jastiper mengajukan banding, " +
            "pembeli mengajukan sengketa, atau siapa pun memanggil escalateStaleVerification " +
            "setelah 24 jam. Tidak ada dana yang tersangkut."
          : null
    });
  } catch (e) {
    res.status(500).json({error: e instanceof Error ? e.message : String(e)});
  }
});

app.get("/api/verify/:id", (req, res) => {
  const hasil = keputusanOrder(db, Number(req.params.id));
  if (!hasil) return res.status(404).json({error: "Belum ada keputusan verifikasi untuk order ini."});
  res.json(hasil);
});

// ═══════════════════════════════════════════════════════════════════════

function _bentukOrder(o: OrderRow) {
  const idrPerBnb = BigInt(o.idr_per_bnb || "0");
  return {
    id: o.id,
    buyer: o.buyer,
    jastiper: o.jastiper,
    status: o.status,
    capWei: o.cap_wei,
    feeWei: o.fee_wei,
    verifiedWei: o.verified_wei,
    totalWei: o.total_wei,
    capIdr: weiKeIdr(BigInt(o.cap_wei), idrPerBnb),
    feeIdr: weiKeIdr(BigInt(o.fee_wei), idrPerBnb),
    verifiedIdr: weiKeIdr(BigInt(o.verified_wei || "0"), idrPerBnb),
    idrPerBnbSnapshot: o.idr_per_bnb,
    itemHash: o.item_hash,
    proofHash: o.proof_hash,
    createdAt: o.created_at,
    acceptDeadline: o.accept_deadline,
    acceptedAt: o.accepted_at,
    proofDeadline: o.proof_deadline,
    verifyDeadline: o.verify_deadline,
    disputeWindowEnd: o.dispute_window_end,
    completedAt: o.completed_at,
    autoReleased: o.auto_released === 1,
    refundReason: o.refund_reason,
    disputeStage: o.dispute_stage,
    arbiterBuyerWei: o.arbiter_buyer_wei,
    arbiterJastiperWei: o.arbiter_jastiper_wei
  };
}

function _gabungHash(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  // XOR dua hash adalah cara paling sederhana yang bisa direproduksi frontend
  // tanpa pustaka tambahan, dan sifat yang kami butuhkan cuma satu: berubah
  // kalau salah satu berkas berubah.
  const x = BigInt(a) ^ BigInt(b);
  return `0x${x.toString(16).padStart(64, "0")}` as `0x${string}`;
}

// ═══════════════════════════════════════════════════════════════════════

assertSiapJalan(false);

app.listen(env.verifierPort, () => {
  console.log("┌─────────────────────────────────────────────");
  console.log("│ Verifier JEJAK");
  console.log(`│   port      : ${env.verifierPort}`);
  console.log(`│   chainId   : ${env.chainId}`);
  console.log(`│   kontrak   : ${env.contractAddress || "(belum di-deploy)"}`);
  console.log(`│   mode AI   : ${modeAi()}${modeAi() === "mock" ? "  (fixture — tanpa panggilan jaringan)" : ""}`);
  console.log(`│   verifier  : ${env.verifierPk ? "kunci terpasang" : "TIDAK ADA KUNCI — hanya menilai, tidak mencairkan"}`);
  console.log(`│   DEMO_MODE : ${env.demoMode}`);
  console.log("└─────────────────────────────────────────────");
});
