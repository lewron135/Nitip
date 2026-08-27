/**
 * Klien verifier API, dengan jaring pengaman demo.
 *
 * PEMBAGIAN TUGAS (§8.4). Baca lewat API; tulis lewat wallet.
 *   · BACA  → indexer sudah menyimpan event ke SQLite, lengkap dengan
 *             keputusan AI dan berkas bukti yang tidak ada di rantai.
 *             Membacanya dari sini juga menghindari `eth_getLogs` di
 *             peramban, yang §14.5 sebut sebagai risiko nomor satu.
 *   · TULIS → selalu dari wallet pengguna, langsung ke kontrak. Server
 *             tidak pernah menandatangani apa pun atas nama siapa pun.
 *
 * KENAPA ADA CADANGAN FIXTURE. Demo day berjalan di wifi ruang lomba.
 * Kalau indexer mati atau RPC-nya lambat, layar tidak boleh kosong — tapi
 * ia juga tidak boleh berbohong. Maka setiap hasil membawa bendera `demo`,
 * dan setiap layar yang menerimanya wajib memasang lencana "DATA CONTOH".
 */

import {API_URL} from "./chain";
import type {Order, OrderDetail, JastiperProfile, JastiperRingkas} from "./types";
import {orderDemo, detailDemo, profilDemo, daftarJastiperDemo} from "./fixtures";

/** Setiap hasil membawa asal-usulnya. `demo: true` wajib terlihat di layar. */
export interface Hasil<T> {
  data: T;
  demo: boolean;
}

/**
 * Batas tunggu. Tanpa ini, backend yang menggantung membuat halaman
 * memuat selamanya alih-alih jatuh ke data contoh — kegagalan yang jauh
 * lebih buruk di atas panggung daripada galat yang cepat.
 */
const TIMEOUT_MS = 4000;

async function ambil<T>(path: string, cadangan: () => T): Promise<Hasil<T>> {
  const batal = new AbortController();
  const jam = setTimeout(() => batal.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      signal: batal.signal,
      headers: {accept: "application/json"},
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return {data: (await res.json()) as T, demo: false};
  } catch {
    return {data: cadangan(), demo: true};
  } finally {
    clearTimeout(jam);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  BACA
// ════════════════════════════════════════════════════════════════════════

export async function daftarOrder(alamat?: string): Promise<Hasil<Order[]>> {
  const q = alamat ? `?alamat=${alamat}` : "";
  const hasil = await ambil<{orders: Order[]}>(`/api/orders${q}`, () => ({
    orders: alamat
      ? orderDemo().filter(
          (o) =>
            o.buyer.toLowerCase() === alamat.toLowerCase() ||
            o.jastiper?.toLowerCase() === alamat.toLowerCase()
        )
      : orderDemo()
  }));
  return {data: hasil.data.orders ?? [], demo: hasil.demo};
}

export async function ambilOrder(id: number): Promise<Hasil<OrderDetail | null>> {
  return ambil<OrderDetail | null>(`/api/orders/${id}`, () => detailDemo(id));
}

export async function ambilJastiper(alamat: string): Promise<Hasil<JastiperProfile>> {
  return ambil<JastiperProfile>(`/api/jastiper/${alamat}`, () => profilDemo(alamat));
}

export async function daftarJastiper(): Promise<Hasil<JastiperRingkas[]>> {
  const hasil = await ambil<{jastiper: JastiperRingkas[]}>("/api/jastiper", () => ({
    jastiper: daftarJastiperDemo()
  }));
  return {data: hasil.data.jastiper ?? [], demo: hasil.demo};
}

// ════════════════════════════════════════════════════════════════════════
//  TULIS KE SERVER  (bukan ke rantai)
//  Dua endpoint ini menyiapkan bahan; yang memindahkan dana tetap wallet.
// ════════════════════════════════════════════════════════════════════════

export interface Berkas {
  data: string;
  nama: string;
  tipe: string;
}

/**
 * Unggah bukti, dapatkan `proofHash`. Urutannya penting dan tidak boleh
 * dibalik: jastiper mengunggah DULU, lalu memanggil `submitProof(orderId,
 * proofHash)` dari wallet-nya sendiri.
 */
export async function unggahBukti(
  id: number,
  berkas: {struk: Berkas; barang?: Berkas | null}
): Promise<{proofHash: `0x${string}`}> {
  const res = await fetch(`${API_URL}/api/proof/${id}`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(berkas)
  });

  const isi = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(isi?.error ?? `Unggah gagal (HTTP ${res.status}).`);
  return isi as {proofHash: `0x${string}`};
}

/** Minta verifier membaca bukti. Hanya berlaku saat order berstatus PROOFED. */
export async function mintaVerifikasi(id: number): Promise<unknown> {
  const res = await fetch(`${API_URL}/api/verify/${id}`, {method: "POST"});
  const isi = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((isi as {error?: string})?.error ?? `HTTP ${res.status}`);
  return isi;
}

/** Berkas → data URL, bentuk yang diminta `POST /api/proof/:id`. */
export function bacaBerkas(file: File): Promise<Berkas> {
  return new Promise((resolve, reject) => {
    const pembaca = new FileReader();
    pembaca.onerror = () => reject(new Error("Berkas tidak bisa dibaca."));
    pembaca.onload = () =>
      resolve({data: String(pembaca.result), nama: file.name, tipe: file.type || "image/jpeg"});
    pembaca.readAsDataURL(file);
  });
}
