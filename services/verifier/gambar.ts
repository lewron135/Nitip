/**
 * Perkecil foto sebelum dikirim ke AI — murni kode lokal, nol panggilan jaringan.
 *
 * Foto HP mentah gampang lewat 4000×3000px. Model vision Claude punya batas
 * efektif di sekitar 1568px sisi terpanjang — kirim lebih besar dari itu cuma
 * membakar token tanpa menambah akurasi bacaan. Fungsi di sini semata memangkas
 * biaya API; ia TIDAK menyentuh berkas bukti yang sudah di-hash & disimpan oleh
 * `storage.ts` (§11.7) — hash on-chain harus tetap dihitung dari berkas asli
 * yang diunggah, bukan dari versi yang sudah diperkecil untuk AI.
 */

import sharp from "sharp";

/** Sisi terpanjang maksimum yang dikirim ke model vision. */
export const SISI_MAKS_AI = 1568;

/** Kualitas JPEG untuk versi yang dikirim ke AI. Bukan untuk arsip, jadi boleh lossy. */
const KUALITAS_JPEG_AI = 85;

export interface GambarUntukAi {
  base64: string;
  mediaType: "image/jpeg";
}

/**
 * Ambil base64 gambar apa adanya (hasil unggahan), balikin versi yang sudah
 * diperkecil (kalau perlu) dan dikompres, selalu sebagai JPEG.
 *
 * Gambar yang sudah lebih kecil dari `SISI_MAKS_AI` TIDAK diperbesar
 * (`withoutEnlargement: true`) — memperbesar foto kecil hanya menambah token
 * tanpa menambah detail apa pun.
 */
export async function perkecilUntukAi(base64: string, mediaType: string): Promise<GambarUntukAi> {
  const asli = Buffer.from(base64, "base64");

  const hasil = await sharp(asli)
    .rotate() // ikuti orientasi EXIF sebelum resize, biar foto miring dari HP tidak kepotong aneh
    .resize({width: SISI_MAKS_AI, height: SISI_MAKS_AI, fit: "inside", withoutEnlargement: true})
    .jpeg({quality: KUALITAS_JPEG_AI})
    .toBuffer();

  return {base64: hasil.toString("base64"), mediaType: "image/jpeg"};
}
