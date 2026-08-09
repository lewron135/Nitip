/**
 * Mesin pembacaan event: rantai → SQLite.
 *
 * DUA HAL YANG MEMBUAT BERKAS INI TIDAK SESEDERHANA KELIHATANNYA
 * ──────────────────────────────────────────────────────────────
 *
 * 1. PAGINASI WAJIB (§14.5 RPC-2). `eth_getLogs` di penyedia BSC menolak
 *    rentang blok lebar dengan galat `-32005 limit exceeded`. Panduan
 *    menyebut ≤5.000 blok; kami memakai 4.500. Kode yang meminta
 *    "dari DEPLOY_BLOCK sampai latest" dalam satu panggilan akan bekerja
 *    dengan sempurna di anvil dan gagal total di testnet — dan itu jenis
 *    kegagalan yang baru ketahuan di menit-menit terakhir.
 *
 * 2. TITIK MULAI (§14.5 RPC-3). Backfill selalu dari DEPLOY_BLOCK, tidak
 *    pernah dari 0. Blok 0 BSC Testnet berjarak puluhan juta blok dari
 *    kontrak kalian; itu bukan lambat, itu tidak akan pernah selesai.
 *
 * Dijalankan sendiri:
 *   npm run indexer:backfill            # sekali jalan, sampai blok terbaru
 */

import {decodeEventLog, type Log} from "viem";
import {jejakEscrowAbi} from "../shared/abi.js";
import {publicClient} from "../shared/chain.js";
import {env, assertSiapJalan} from "../shared/env.js";
import {IndexerDb} from "./db.js";

const NAMA_EVENT = [
  "OrderCreated",
  "OrderAccepted",
  "ProofSubmitted",
  "CapitalReleased",
  "OrderCompleted",
  "OrderRefunded",
  "OrderAbandoned",
  "DisputeRaised",
  "DisputeResolved",
  "Withdrawal"
] as const;

type NamaEvent = (typeof NAMA_EVENT)[number];

/** Cache stempel waktu blok — satu blok bisa memuat banyak event sekaligus. */
const cacheWaktuBlok = new Map<bigint, number>();

async function waktuBlok(blockNumber: bigint): Promise<number> {
  const ada = cacheWaktuBlok.get(blockNumber);
  if (ada !== undefined) return ada;
  const blok = await publicClient.getBlock({blockNumber});
  const t = Number(blok.timestamp);
  cacheWaktuBlok.set(blockNumber, t);
  return t;
}

/**
 * Membaca satu rentang blok dan menuliskan hasilnya. Rentang di sini sudah
 * dipastikan ≤ `logPageSize` oleh pemanggilnya.
 */
async function bacaRentang(db: IndexerDb, dari: bigint, sampai: bigint): Promise<number> {
  const logs = await publicClient.getLogs({
    address: env.contractAddress,
    fromBlock: dari,
    toBlock: sampai
  });

  let terpakai = 0;

  for (const log of logs) {
    const hasil = _decode(log);
    if (!hasil) continue;

    const {eventName, args} = hasil;
    const blockNumber = Number(log.blockNumber);
    const t = await waktuBlok(log.blockNumber!);

    const orderId = "orderId" in args ? Number(args.orderId as bigint) : null;

    db.simpanEvent({
      block_number: blockNumber,
      block_time: t,
      tx_hash: log.transactionHash!,
      log_index: log.logIndex!,
      name: eventName,
      order_id: orderId,
      actor: _aktor(eventName, args),
      data_json: JSON.stringify(args, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
    });

    _terapkanKeOrder(db, eventName, args, blockNumber, t);
    terpakai++;
  }

  return terpakai;
}

function _decode(log: Log): {eventName: NamaEvent; args: Record<string, unknown>} | null {
  try {
    const hasil = decodeEventLog({abi: jejakEscrowAbi, data: log.data, topics: log.topics});
    if (!NAMA_EVENT.includes(hasil.eventName as NamaEvent)) return null;
    return {
      eventName: hasil.eventName as NamaEvent,
      args: (hasil.args ?? {}) as Record<string, unknown>
    };
  } catch {
    // Log dari kontrak lain di alamat yang sama tidak mungkin terjadi, tapi
    // event yang tidak dikenal bisa muncul kalau ABI di sini tertinggal dari
    // kontrak yang ter-deploy. Dilewati, bukan membuat indexer berhenti.
    return null;
  }
}

function _aktor(nama: NamaEvent, args: Record<string, unknown>): string | null {
  const kandidat = ["jastiper", "buyer", "raisedBy", "arbiter", "who"];
  for (const k of kandidat) {
    if (typeof args[k] === "string") return args[k] as string;
  }
  return null;
}

function _terapkanKeOrder(
  db: IndexerDb,
  nama: NamaEvent,
  a: Record<string, unknown>,
  block: number,
  waktu: number
): void {
  const s = (k: string) => String(a[k]);
  const n = (k: string) => Number(a[k]);
  const id = a.orderId !== undefined ? Number(a.orderId as bigint) : -1;

  switch (nama) {
    case "OrderCreated":
      db.upsertOrderBaru({
        id,
        buyer: s("buyer"),
        capWei: s("capWei"),
        feeWei: s("feeWei"),
        itemHash: s("itemHash"),
        acceptDeadline: n("acceptDeadline"),
        idrPerBnb: s("idrPerBnbSnapshot"),
        createdAt: waktu,
        block
      });
      break;

    case "OrderAccepted":
      db.patchOrder(
        id,
        {status: 1, jastiper: s("jastiper"), accepted_at: n("acceptedAt"), proof_deadline: n("proofDeadline")},
        block
      );
      break;

    case "ProofSubmitted":
      db.patchOrder(id, {status: 2, proof_hash: s("proofHash"), verify_deadline: n("verifyDeadline")}, block);
      break;

    case "CapitalReleased":
      db.patchOrder(
        id,
        {status: 3, verified_wei: s("verifiedWei"), dispute_window_end: n("disputeWindowEnd")},
        block
      );
      break;

    case "OrderCompleted":
      db.patchOrder(
        id,
        {
          status: 5,
          total_wei: s("totalWei"),
          completed_at: n("completedAt"),
          auto_released: a.autoReleased ? 1 : 0
        },
        block
      );
      break;

    case "OrderRefunded":
      db.patchOrder(id, {status: 6, refund_reason: n("reason")}, block);
      break;

    case "OrderAbandoned":
      db.patchOrder(id, {status: 7}, block);
      break;

    case "DisputeRaised":
      db.patchOrder(id, {status: 4, dispute_stage: n("stage")}, block);
      break;

    case "DisputeResolved":
      db.patchOrder(
        id,
        {status: 8, arbiter_buyer_wei: s("buyerWei"), arbiter_jastiper_wei: s("jastiperWei")},
        block
      );
      break;

    case "Withdrawal":
      // Penarikan tidak terikat order mana pun (pola pull payment). Sudah
      // tersimpan di tabel `events`; tidak ada yang perlu ditambal di sini.
      break;
  }
}

/**
 * Menyusul rantai dari posisi terakhir sampai blok tujuan, sepotong demi
 * sepotong. Mengembalikan jumlah event yang terbaca.
 */
export async function susulSampai(db: IndexerDb, blokTujuan: bigint): Promise<number> {
  let mulai = db.lastIndexedBlock() + 1n;
  if (mulai < env.deployBlock) mulai = env.deployBlock;

  let total = 0;

  while (mulai <= blokTujuan) {
    const akhir = _min(mulai + env.logPageSize - 1n, blokTujuan);

    let percobaan = 0;
    for (;;) {
      try {
        const jumlah = await bacaRentang(db, mulai, akhir);
        total += jumlah;
        if (jumlah > 0) {
          console.log(`  blok ${mulai}–${akhir}: ${jumlah} event`);
        }
        break;
      } catch (e) {
        percobaan++;
        if (percobaan > 5) throw e;
        // Backoff eksponensial (§14.5 RPC-2). Penyedia gratis membatasi
        // berdasarkan IP; menabraknya berulang kali membuat kalian diblokir
        // justru saat paling butuh.
        const jeda = 500 * 2 ** (percobaan - 1);
        console.warn(`  percobaan ${percobaan} gagal untuk ${mulai}–${akhir}, tunggu ${jeda}ms`);
        await new Promise((r) => setTimeout(r, jeda));
      }
    }

    db.setLastIndexedBlock(akhir);
    mulai = akhir + 1n;
  }

  return total;
}

function _min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

// ─────────────────────────── jalan sendiri ───────────────────────────

const dijalankanLangsung = process.argv[1]?.replace(/\\/g, "/").endsWith("indexer/backfill.ts");

if (dijalankanLangsung) {
  assertSiapJalan();

  const db = new IndexerDb();
  const terbaru = await publicClient.getBlockNumber();

  console.log("Backfill JEJAK");
  console.log("  kontrak      :", env.contractAddress);
  console.log("  DEPLOY_BLOCK :", env.deployBlock.toString());
  console.log("  posisi terakhir:", db.lastIndexedBlock().toString());
  console.log("  blok terbaru :", terbaru.toString());
  console.log("  ukuran halaman:", env.logPageSize.toString(), "blok");
  console.log("");

  const mulai = Date.now();
  const total = await susulSampai(db, terbaru);
  const detik = ((Date.now() - mulai) / 1000).toFixed(1);

  console.log("");
  console.log(`Selesai dalam ${detik}s. ${total} event baru, ${db.jumlahEvent()} event total di basis data.`);
  db.close();
}
