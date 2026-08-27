/**
 * Buku barang — deskripsi order, disimpan di peramban.
 *
 * KENAPA INI ADA. Kontrak hanya menyimpan `itemHash` = keccak256(deskripsi),
 * bukan teksnya (§12.2, prinsip P4: hash bukti, bukan isinya). Itu keputusan
 * yang benar untuk rantai, tapi berarti tidak ada satu pun tempat di sistem
 * yang bisa memberi tahu antarmuka bahwa order #7 itu "serum Anua 77".
 *
 * Sampai backend punya tempat menyimpan deskripsi, peramban pembeli yang
 * mengingatnya. Konsekuensinya jujur dan harus disebut di layar:
 *   · deskripsi hanya terlihat di perangkat tempat order dibuat
 *   · kalau tidak ada, antarmuka menampilkan `itemHash` — bukan tebakan
 *
 * Hash-nya sendiri tetap sumber kebenaran: `verify()` mencocokkan teks yang
 * diingat dengan hash on-chain, jadi teks yang diubah orang di localStorage
 * akan ketahuan, tidak diam-diam dipercaya.
 */

import {keccak256, toHex} from "viem";

const KUNCI = "jejak.itembook.v1";

type Buku = Record<string, string>;

function baca(): Buku {
  if (typeof window === "undefined") return {};
  try {
    const mentah = window.localStorage.getItem(KUNCI);
    return mentah ? (JSON.parse(mentah) as Buku) : {};
  } catch {
    // Mode penyamaran, penyimpanan penuh, atau situs diblokir menyimpan data.
    return {};
  }
}

function tulis(buku: Buku) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KUNCI, JSON.stringify(buku));
  } catch {
    // Gagal menyimpan tidak boleh menggagalkan pembuatan order.
  }
}

/** keccak256 dari deskripsi. Nilai inilah yang masuk ke `createOrder`. */
export function hashItem(deskripsi: string): `0x${string}` {
  return keccak256(toHex(deskripsi.trim()));
}

export function ingat(deskripsi: string): `0x${string}` {
  const hash = hashItem(deskripsi);
  const buku = baca();
  buku[hash.toLowerCase()] = deskripsi.trim();
  tulis(buku);
  return hash;
}

/**
 * Deskripsi untuk sebuah hash, atau `null` kalau peramban ini tidak
 * mengingatnya. Teks yang diingat diverifikasi ulang terhadap hash-nya,
 * jadi isi localStorage yang disunting orang tidak akan lolos.
 */
export function deskripsiUntuk(itemHash?: string | null): string | null {
  if (!itemHash) return null;
  const teks = baca()[itemHash.toLowerCase()];
  if (!teks) return null;
  return hashItem(teks).toLowerCase() === itemHash.toLowerCase() ? teks : null;
}
