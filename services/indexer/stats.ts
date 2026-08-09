/**
 * Merangkai event menjadi masukan JEJAK-TRUST.
 *
 * Berkas ini adalah bagian yang paling mudah membuat Skenario C gagal, dan
 * bukan karena formulanya — formulanya ada di `scoring/trust.ts` dan sudah
 * diuji. Yang gampang meleset adalah TURUNANNYA: apa persisnya yang dihitung
 * sebagai "diterima", jam dihitung dari peristiwa mana ke peristiwa mana,
 * pembulatannya ke mana.
 *
 * Karena itu setiap definisi di bawah ditulis sebagai kalimat, bukan hanya
 * sebagai SQL, dan kalimat yang sama disalin apa adanya ke
 * `verify-independent/recompute.py`. Kalau kalian mengubah salah satu,
 * ubah keduanya di commit yang sama — R-12 di daftar risiko adalah tentang
 * dua implementasi yang diam-diam berbeda.
 */

import {computeTrust, medianHours, type TrustInput, type TrustResult} from "../scoring/trust.js";
import type {IndexerDb, OrderRow} from "./db.js";

export interface RekamJejak {
  address: string;
  input: TrustInput;
  trust: TrustResult;
  /** Penghitung mentah yang dipakai kontrak untuk plafon tier. */
  completedCount: number;
  abandonedCount: number;
  /** Daftar jam penyelesaian, supaya median bisa diperiksa manusia. */
  completionHours: number[];
}

const DETIK_PER_JAM = 3600;

export function rekamJejak(db: IndexerDb, alamat: string): RekamJejak {
  const a = alamat.toLowerCase();

  const semua = db.db
    .prepare("SELECT * FROM orders WHERE lower(jastiper) = ?")
    .all(a) as unknown as OrderRow[];

  // "Diterima" = order yang pernah masuk state ACCEPTED oleh alamat ini.
  // Kami memakai keberadaan `accepted_at` (dari event OrderAccepted), bukan
  // status sekarang — karena order yang sudah tuntas jelas pernah diterima.
  const diterima = semua.filter((o) => o.accepted_at !== null);

  const tuntas = semua.filter((o) => o.status === 5);
  const ditinggalkan = semua.filter((o) => o.status === 7);

  // "Kalah sengketa" = putusan arbiter yang memberi pembeli LEBIH BANYAK
  // daripada jastiper. Sama besar TIDAK dihitung kalah: putusan seri bukan
  // bukti jastipernya bersalah, dan menghukumnya akan membuat arbiter enggan
  // mengambil jalan tengah.
  const kalah = semua.filter((o) => {
    if (o.status !== 8) return false;
    if (o.arbiter_buyer_wei === null || o.arbiter_jastiper_wei === null) return false;
    return BigInt(o.arbiter_buyer_wei) > BigInt(o.arbiter_jastiper_wei);
  });

  // Nilai total = penjumlahan `OrderCompleted.totalWei`, yaitu cap + fee
  // seluruh order tuntas. Bukan nilai yang benar-benar diterima jastiper —
  // yang diukur adalah "berapa besar dana orang lain yang pernah dia pegang".
  let vTotalWei = 0n;
  for (const o of tuntas) vTotalWei += BigInt(o.total_wei ?? "0");

  const pembeliUnik = new Set(tuntas.map((o) => o.buyer.toLowerCase()));

  // Jam penyelesaian = dari `OrderAccepted.acceptedAt` sampai
  // `OrderCompleted.completedAt`, DIBULATKAN KE BAWAH ke jam penuh.
  // Pembulatan ke bawah dinyatakan di sini karena `speedTier` memakai
  // perbandingan `<=` dan satu jam bisa memindahkan seseorang antar tingkat.
  const completionHours: number[] = [];
  for (const o of tuntas) {
    if (o.accepted_at === null || o.completed_at === null) continue;
    const detik = o.completed_at - o.accepted_at;
    completionHours.push(Math.floor(Math.max(0, detik) / DETIK_PER_JAM));
  }

  const input: TrustInput = {
    nAccepted: diterima.length,
    nCompleted: tuntas.length,
    nAbandoned: ditinggalkan.length,
    nLost: kalah.length,
    vTotalWei,
    uBuyers: pembeliUnik.size,
    medHours: medianHours(completionHours)
  };

  return {
    address: alamat,
    input,
    trust: computeTrust(input),
    // Penghitung kontrak dan penghitung indexer HARUS sama. Kalau berbeda,
    // yang benar adalah rantai, dan indexer kalian ketinggalan blok.
    completedCount: tuntas.length,
    abandonedCount: ditinggalkan.length,
    completionHours
  };
}

/** Rekam jejak arbiter: berapa kasus, condong ke mana (§11.5 KD-05). */
export function rekamArbiter(db: IndexerDb): {
  total: number;
  memihakPembeli: number;
  memihakJastiper: number;
  seri: number;
} {
  const rows = db.db
    .prepare("SELECT arbiter_buyer_wei, arbiter_jastiper_wei FROM orders WHERE status = 8")
    .all() as {arbiter_buyer_wei: string | null; arbiter_jastiper_wei: string | null}[];

  let memihakPembeli = 0;
  let memihakJastiper = 0;
  let seri = 0;

  for (const r of rows) {
    const b = BigInt(r.arbiter_buyer_wei ?? "0");
    const j = BigInt(r.arbiter_jastiper_wei ?? "0");
    if (b > j) memihakPembeli++;
    else if (j > b) memihakJastiper++;
    else seri++;
  }

  return {total: rows.length, memihakPembeli, memihakJastiper, seri};
}
