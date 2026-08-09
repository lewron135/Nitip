/**
 * Lapisan konversi mata uang — JPY/KRW/CNY/THB/USD → IDR → wei.
 *
 * INI TEMUAN K-02 MASTERPLAN, DAN JURI TEKNIS AKAN MENANYAKANNYA DALAM
 * 10 DETIK: order dalam Rupiah, escrow dalam tBNB, struk dalam Yen.
 *
 * Aturannya (KD-01 & KD-02):
 *
 *   1. KONTRAK TIDAK PERNAH MENGONVERSI APA PUN. Satu-satunya satuan di
 *      matematika kontrak adalah wei. Seluruh konversi terjadi di sini.
 *
 *   2. KURS DI-SNAPSHOT SAAT ORDER DIBUAT, bukan saat pencairan. Angka
 *      `idrPerBnbSnapshot` tercatat on-chain sebagai catatan audit, dan
 *      backend WAJIB memakai angka yang sama. Kalau backend memakai kurs
 *      hari ini sementara pembeli menyetujui kurs minggu lalu, nominal
 *      pencairannya berbeda dari yang disepakati — dan itu tidak bisa
 *      dibela di depan siapa pun.
 *
 * Kurs mata uang asing di bawah adalah SNAPSHOT MANUAL, bukan feed langsung.
 * Itu keputusan sadar: satu panggilan API pihak ketiga saat demo adalah satu
 * titik gagal tambahan, dan untuk membuktikan tesis produk kami tidak butuh
 * kurs real-time. Yang kami butuhkan adalah kurs yang bisa ditunjukkan asalnya.
 */

import {readFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {ROOT} from "../shared/env.js";

export type KodeMataUang = "JPY" | "KRW" | "CNY" | "THB" | "USD" | "SGD" | "EUR" | "IDR";

export interface TabelKurs {
  /** Tanggal snapshot diambil. Ditampilkan di UI supaya tidak ada yang mengira ini live. */
  snapshotDate: string;
  sumber: string;
  /** Berapa Rupiah untuk 1 unit mata uang asing. */
  idrPer: Record<KodeMataUang, number>;
}

/**
 * Snapshot bawaan. Diambil 9 Agustus 2026 dari kurs tengah publik.
 * `[Asumsi]` — angka ini WAJIB diperbarui sebelum demo dan sumbernya dicatat.
 * Timpa lewat berkas `services/verifier/fx-rates.json` kalau perlu.
 */
const SNAPSHOT_BAWAAN: TabelKurs = {
  snapshotDate: "2026-08-09",
  sumber: "kurs tengah publik, dicatat manual — WAJIB diperbarui sebelum Demo Day",
  idrPer: {
    JPY: 110,
    KRW: 12,
    CNY: 2250,
    THB: 450,
    USD: 16250,
    SGD: 12100,
    EUR: 17600,
    IDR: 1
  }
};

let cache: TabelKurs | null = null;

export function tabelKurs(): TabelKurs {
  if (cache) return cache;

  const path = join(ROOT, "services/verifier/fx-rates.json");
  if (existsSync(path)) {
    try {
      cache = JSON.parse(readFileSync(path, "utf8")) as TabelKurs;
      return cache;
    } catch (e) {
      console.warn("[fx] fx-rates.json tidak bisa dibaca, memakai snapshot bawaan:", e);
    }
  }
  cache = SNAPSHOT_BAWAAN;
  return cache;
}

export function mataUangDikenal(kode: string): kode is KodeMataUang {
  return kode.toUpperCase() in tabelKurs().idrPer;
}

/**
 * Nominal mata uang asing → Rupiah, dibulatkan ke bawah ke rupiah penuh.
 * Pembulatan ke bawah selalu memihak pembeli — kalau ada selisih setengah
 * rupiah, yang kehilangan adalah pihak yang menerima dana, bukan yang menaruhnya.
 */
export function keIdr(nominal: number, kode: KodeMataUang): number {
  const kurs = tabelKurs().idrPer[kode];
  if (!kurs) throw new Error(`Kurs untuk ${kode} tidak ada di tabel snapshot.`);
  return Math.floor(nominal * kurs);
}

/**
 * Rupiah → wei, memakai kurs snapshot ORDER (bukan kurs hari ini).
 *
 * wei = floor(idr * 1e18 / idrPerBnb)
 *
 * Seluruh aritmetika `bigint`. Memakai `number` di sini akan kehilangan
 * presisi di atas 2^53 — dan 1 tBNB saja sudah 1e18.
 */
export function idrKeWei(idr: number, idrPerBnbSnapshot: bigint): bigint {
  if (idrPerBnbSnapshot <= 0n) {
    throw new Error("idrPerBnbSnapshot tidak sah (0 atau negatif). Order dibuat tanpa kurs?");
  }
  if (!Number.isFinite(idr) || idr < 0) {
    throw new Error(`Nominal rupiah tidak sah: ${idr}`);
  }
  return (BigInt(Math.floor(idr)) * 10n ** 18n) / idrPerBnbSnapshot;
}

/** Wei → Rupiah, hanya untuk tampilan. Jangan pernah dipakai balik ke kontrak. */
export function weiKeIdr(wei: bigint, idrPerBnbSnapshot: bigint): number {
  if (idrPerBnbSnapshot <= 0n) return 0;
  return Number((wei * idrPerBnbSnapshot) / 10n ** 18n);
}

export interface HasilKonversi {
  nominalAsing: number;
  mataUang: KodeMataUang;
  kursIdrPerUnit: number;
  idr: number;
  wei: bigint;
  idrPerBnbSnapshot: string;
  snapshotDate: string;
}

/** Jalur penuh: nominal struk → wei yang akan dikirim ke `releaseCapital`. */
export function konversiStruk(
  nominalAsing: number,
  kode: KodeMataUang,
  idrPerBnbSnapshot: bigint
): HasilKonversi {
  const tabel = tabelKurs();
  const idr = keIdr(nominalAsing, kode);
  return {
    nominalAsing,
    mataUang: kode,
    kursIdrPerUnit: tabel.idrPer[kode],
    idr,
    wei: idrKeWei(idr, idrPerBnbSnapshot),
    idrPerBnbSnapshot: idrPerBnbSnapshot.toString(),
    snapshotDate: tabel.snapshotDate
  };
}
