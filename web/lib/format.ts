/**
 * Bantuan format angka wei ↔ IDR.
 *
 * Aturan keras (§18.2 masterplan, perangkap #1):
 *   Nilai `uint128` dari viem datang sebagai `BigInt`. `Number()` langsung
 *   pada angka wei KEHILANGAN PRESISI. Semua konversi di sini melewati
 *   `formatEther`/`parseEther` (string-safe), tidak pernah bigint → Number
 *   secara langsung pada nilai wei mentah.
 *
 * KD-01: kontrak hanya tahu wei. IDR/JPY/dll hanyalah lapisan tampilan di
 * frontend dan backend verifier — TIDAK PERNAH dipakai aritmetika kontrak.
 */

import {formatEther, parseEther} from "viem";

/** Tampilkan wei sebagai tBNB, presisi tetap, format lokal Indonesia. */
export function formatWeiAsBnb(wei: bigint, decimals = 4): string {
  const asEther = Number(formatEther(wei));
  return asEther.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Konversi IDR → wei memakai kurs IDR per 1 tBNB.
 * `idrPerBnb` harus berasal dari kurs snapshot yang sama dipakai backend (KD-02).
 */
export function idrToWei(idr: number, idrPerBnb: number): bigint {
  if (!Number.isFinite(idr) || !Number.isFinite(idrPerBnb) || idrPerBnb <= 0 || idr <= 0) {
    return BigInt(0);
  }
  const bnb = idr / idrPerBnb;
  // toFixed(18) lalu parseEther menghindari galat pembulatan ganda pada
  // pembagian float sebelum masuk ke parser bigint viem.
  return parseEther(bnb.toFixed(18));
}

/** Konversi wei → IDR untuk TAMPILAN saja. Bukan sumber kebenaran nominal. */
export function weiToIdr(wei: bigint, idrPerBnb: number): number {
  const bnb = Number(formatEther(wei));
  return Math.round(bnb * idrPerBnb);
}

export function formatIdr(idr: number): string {
  return idr.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  });
}

/** Alamat dipendekkan untuk tampilan: 0x1234…abcd */
export function shortAddress(address: string, chars = 4): string {
  if (!address || address.length < 2 + chars * 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}
