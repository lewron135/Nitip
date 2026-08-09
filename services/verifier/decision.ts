/**
 * Mesin keputusan verifikasi — tempat prinsip P2 hidup sebagai kode.
 *
 *   "AI hanya boleh MENAHAN, tidak pernah MELONGGARKAN.
 *    AI yang ragu → berhenti, bukan lanjut."
 *
 * Setiap cabang di bawah hanya punya dua keluaran: CAIRKAN atau TAHAN.
 * Tidak ada cabang yang menaikkan batas apa pun, memperlonggar syarat apa pun,
 * atau menebak angka yang tidak terbaca. Kalau kamu menambahkan cabang ketiga
 * ke berkas ini, kamu sedang mengubah tesis produk — bukan menambah fitur.
 *
 * SATU KEPUTUSAN YANG PATUT DIPERDEBATKAN, DAN ALASANNYA:
 * kalau AI membaca nominal DI ATAS plafon, kami TIDAK memotongnya ke plafon
 * lalu mencairkan. Kami menahan. Memotong terdengar aman — kontrak toh akan
 * menolak angka di atas plafon — tapi artinya kami mencairkan angka yang
 * BUKAN hasil baca struk, dan itu persis klaim yang kami pakai untuk
 * membedakan diri: "nominal yang cair adalah nominal di struk". Nominal di
 * atas plafon berarti ada yang tidak beres (jastiper belanja melebihi
 * kesepakatan, atau AI salah baca). Keduanya urusan manusia.
 */

import {type HasilBacaStruk, type HasilCocokBarang} from "./ai.js";
import {konversiStruk, mataUangDikenal, type HasilKonversi} from "./fx.js";
import {env} from "../shared/env.js";

export type Putusan = "cairkan" | "tahan";

export interface KeputusanVerifikasi {
  putusan: Putusan;
  /** Nominal yang akan dikirim ke `releaseCapital`. Hanya terisi kalau `cairkan`. */
  verifiedWei: bigint | null;
  /** Kode alasan yang stabil — dipakai frontend untuk memilih pesan. */
  alasan: KodeAlasan;
  /** Kalimat bahasa Indonesia yang boleh ditampilkan apa adanya ke pengguna. */
  penjelasan: string;
  konversi: HasilKonversi | null;
  struk: HasilBacaStruk;
  barang: HasilCocokBarang | null;
  ambangKeyakinan: number;
}

export type KodeAlasan =
  | "lolos"
  | "keyakinan-rendah"
  | "nominal-tidak-terbaca"
  | "mata-uang-tidak-dikenal"
  | "melebihi-plafon"
  | "foto-katalog"
  | "barang-tidak-cocok";

/** Di bawah nilai ini, foto dianggap tidak cukup cocok dengan deskripsi. */
export const AMBANG_KECOCOKAN_BARANG = 0.5;

export function putuskan(args: {
  struk: HasilBacaStruk;
  barang: HasilCocokBarang | null;
  capWei: bigint;
  idrPerBnbSnapshot: bigint;
}): KeputusanVerifikasi {
  const {struk, barang, capWei, idrPerBnbSnapshot} = args;
  const ambang = env.aiConfidenceThreshold;

  const dasar = {
    verifiedWei: null,
    konversi: null,
    struk,
    barang,
    ambangKeyakinan: ambang
  } as const;

  // ── Pagar 1: AI sendiri yang mengaku ragu ──────────────────────────
  if (struk.keyakinan < ambang) {
    return {
      ...dasar,
      putusan: "tahan",
      alasan: "keyakinan-rendah",
      penjelasan:
        `AI hanya yakin ${Math.round(struk.keyakinan * 100)}% atas pembacaan struk ini ` +
        `(ambang ${Math.round(ambang * 100)}%). Modal tidak dicairkan otomatis; ` +
        `kasus diteruskan ke arbiter manusia. Catatan AI: ${struk.catatan}`
    };
  }

  // ── Pagar 2: tidak ada angka untuk dicairkan ───────────────────────
  if (struk.nominal === null || !(struk.nominal > 0)) {
    return {
      ...dasar,
      putusan: "tahan",
      alasan: "nominal-tidak-terbaca",
      penjelasan:
        "AI tidak menemukan nominal total yang bisa dipertanggungjawabkan di struk ini. " +
        "Tidak ada angka yang ditebak. Kasus diteruskan ke arbiter."
    };
  }

  // ── Pagar 3: mata uang di luar tabel kurs snapshot ─────────────────
  const kode = (struk.mataUang ?? "").toUpperCase();
  if (!mataUangDikenal(kode)) {
    return {
      ...dasar,
      putusan: "tahan",
      alasan: "mata-uang-tidak-dikenal",
      penjelasan:
        `Mata uang "${struk.mataUang}" tidak ada di tabel kurs snapshot kami, ` +
        `jadi nominalnya tidak bisa dikonversi tanpa menebak kurs. Kasus diteruskan ke arbiter.`
    };
  }

  const konversi = konversiStruk(struk.nominal, kode, idrPerBnbSnapshot);

  // ── Pagar 4: nominal struk melebihi plafon yang disepakati ─────────
  if (konversi.wei > capWei) {
    return {
      ...dasar,
      putusan: "tahan",
      konversi,
      alasan: "melebihi-plafon",
      penjelasan:
        `Nominal struk (${konversi.nominalAsing.toLocaleString("id-ID")} ${konversi.mataUang} ` +
        `≈ Rp ${konversi.idr.toLocaleString("id-ID")}) melebihi plafon yang disetujui pembeli. ` +
        `Kami tidak memotongnya ke plafon lalu mencairkan, karena angka yang cair harus tetap ` +
        `angka yang tertulis di struk. Kasus diteruskan ke arbiter.`
    };
  }

  // ── Pagar 5: foto barang ───────────────────────────────────────────
  if (barang) {
    if (barang.dicurigaiKatalog) {
      return {
        ...dasar,
        putusan: "tahan",
        konversi,
        alasan: "foto-katalog",
        penjelasan: `Foto barang terindikasi bukan foto yang diambil sendiri. ${barang.alasan}`
      };
    }
    if (barang.kecocokan < AMBANG_KECOCOKAN_BARANG) {
      return {
        ...dasar,
        putusan: "tahan",
        konversi,
        alasan: "barang-tidak-cocok",
        penjelasan:
          `Foto barang hanya cocok ${Math.round(barang.kecocokan * 100)}% dengan deskripsi pesanan. ` +
          barang.alasan
      };
    }
  }

  // ── Lolos semua pagar ──────────────────────────────────────────────
  return {
    ...dasar,
    putusan: "cairkan",
    verifiedWei: konversi.wei,
    konversi,
    alasan: "lolos",
    penjelasan:
      `Struk terbaca ${konversi.nominalAsing.toLocaleString("id-ID")} ${konversi.mataUang} ` +
      `≈ Rp ${konversi.idr.toLocaleString("id-ID")} pada kurs snapshot order. ` +
      `Nominal ini di bawah plafon, dan foto barang cocok. Modal dicairkan sebesar nominal struk.`
  };
}
