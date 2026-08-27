/**
 * Pemformatan angka.
 *
 * §18.2 masterplan menandai satu perangkap yang membunuh demo keuangan:
 * `Number()` pada nilai wei. 1 tBNB = 10^18 wei, dan `Number.MAX_SAFE_INTEGER`
 * hanya 9,007 × 10^15 — artinya nilai wei sebesar 0,01 tBNB pun sudah cukup
 * besar untuk kehilangan presisi diam-diam. Berkas ini tidak pernah memanggil
 * `Number()` pada wei. Seluruh aritmetika uang di sini bigint, dan hasilnya
 * langsung menjadi string untuk dilihat manusia.
 */

export const WEI_PER_BNB = 10n ** 18n;

/** Jumlah desimal yang ditampilkan per konteks. Tabel dana selalu 4. */
export const BNB_DECIMALS = 4;

// ════════════════════════════════════════════════════════════════════════
//  tBNB
// ════════════════════════════════════════════════════════════════════════

/**
 * wei → string desimal, tanpa pembulatan yang menyesatkan.
 * Nol di belakang koma dipangkas supaya "0,2000" tidak terbaca lebih presisi
 * daripada yang sebenarnya kami ketahui.
 */
export function formatWei(wei: bigint | string, maxDecimals = BNB_DECIMALS): string {
  const v = typeof wei === "string" ? BigInt(wei || "0") : wei;
  const negatif = v < 0n;
  const abs = negatif ? -v : v;

  const bulat = abs / WEI_PER_BNB;
  const sisa = abs % WEI_PER_BNB;

  let pecahan = sisa.toString().padStart(18, "0").slice(0, maxDecimals);
  pecahan = pecahan.replace(/0+$/, "");

  return `${negatif ? "-" : ""}${bulat}${pecahan ? `.${pecahan}` : ""}`;
}

/** wei → "0.25 tBNB". Dipakai di mana pun satuannya perlu ikut terbaca. */
export function formatBnb(wei: bigint | string, maxDecimals = BNB_DECIMALS): string {
  return `${formatWei(wei, maxDecimals)} tBNB`;
}

/**
 * String desimal dari input pengguna → wei.
 * Melempar kalau tidak sah, karena mengembalikan 0n diam-diam pada input
 * salah ketik berarti pengguna mengunci dana dengan nilai yang tidak dia maksud.
 */
export function parseBnb(input: string): bigint {
  const bersih = input.trim().replace(",", ".");
  if (!/^\d*\.?\d*$/.test(bersih) || bersih === "" || bersih === ".") {
    throw new Error("Bukan angka yang sah.");
  }

  const [bulat = "0", pecahan = ""] = bersih.split(".");
  if (pecahan.length > 18) throw new Error("Maksimal 18 angka di belakang koma.");

  return BigInt(bulat || "0") * WEI_PER_BNB + BigInt((pecahan + "0".repeat(18)).slice(0, 18));
}

// ════════════════════════════════════════════════════════════════════════
//  Rupiah
//  Kurs adalah CATATAN AUDIT (§11.1 KD-01/KD-02), bukan sumber kebenaran.
//  Kontrak tidak pernah melihat angka rupiah. Karena itu setiap nilai IDR
//  di layar wajib berdampingan dengan nilai tBNB-nya.
// ════════════════════════════════════════════════════════════════════════

export function weiToIdr(wei: bigint | string, idrPerBnb: bigint | string): bigint {
  const w = typeof wei === "string" ? BigInt(wei || "0") : wei;
  const kurs = typeof idrPerBnb === "string" ? BigInt(idrPerBnb || "0") : idrPerBnb;
  return (w * kurs) / WEI_PER_BNB;
}

export function idrToWei(idr: bigint | string, idrPerBnb: bigint | string): bigint {
  const nilai = typeof idr === "string" ? BigInt(idr || "0") : idr;
  const kurs = typeof idrPerBnb === "string" ? BigInt(idrPerBnb || "0") : idrPerBnb;
  if (kurs === 0n) return 0n;
  return (nilai * WEI_PER_BNB) / kurs;
}

/** 1200000n → "Rp 1.200.000". Pemisah ribuan Indonesia adalah titik. */
export function formatIdr(idr: bigint | string | number): string {
  const v = typeof idr === "bigint" ? idr : BigInt(Math.trunc(Number(idr) || 0));
  const negatif = v < 0n;
  const digit = (negatif ? -v : v).toString();

  let keluar = "";
  for (let i = 0; i < digit.length; i++) {
    if (i > 0 && (digit.length - i) % 3 === 0) keluar += ".";
    keluar += digit[i];
  }
  return `${negatif ? "-" : ""}Rp ${keluar}`;
}

// ════════════════════════════════════════════════════════════════════════
//  Alamat & hash
// ════════════════════════════════════════════════════════════════════════

export function shortAddress(alamat: string): string {
  if (!alamat || alamat.length < 12) return alamat ?? "";
  return `${alamat.slice(0, 6)}…${alamat.slice(-4)}`;
}

export function shortHash(hash: string): string {
  if (!hash || hash.length < 14) return hash ?? "";
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

/** Nol bytes32 berarti "belum diisi", bukan "bernilai nol". */
export const HASH_KOSONG = `0x${"0".repeat(64)}`;

export function hashKosong(hash?: string | null): boolean {
  return !hash || hash === HASH_KOSONG;
}

// ════════════════════════════════════════════════════════════════════════
//  Waktu
//  Semua stempel waktu kontrak dalam detik Unix, bukan milidetik.
// ════════════════════════════════════════════════════════════════════════

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function formatHours(jam: number): string {
  if (!Number.isFinite(jam)) return "-";
  if (jam < 1) return `${Math.round(jam * 60)} menit`;
  if (jam < 48) return `${jam.toFixed(jam < 10 ? 1 : 0)} jam`;
  return `${(jam / 24).toFixed(1)} hari`;
}

/**
 * Sisa waktu menuju sebuah tenggat kontrak.
 * `lewat` sengaja dipisahkan dari teksnya: beberapa tenggat yang lewat
 * membuka aksi permissionless (§12.3 D-05, D-07), jadi pemanggil perlu
 * tahu status itu tanpa mem-parsing string.
 */
export function timeLeft(deadline: number, sekarang = nowSeconds()) {
  const detik = deadline - sekarang;
  const lewat = detik <= 0;
  const abs = Math.abs(detik);

  const hari = Math.floor(abs / 86400);
  const jam = Math.floor((abs % 86400) / 3600);
  const menit = Math.floor((abs % 3600) / 60);

  let teks: string;
  if (hari > 0) teks = `${hari} hari ${jam} jam`;
  else if (jam > 0) teks = `${jam} jam ${menit} menit`;
  else teks = `${menit} menit`;

  return {lewat, hari, jam, menit, teks};
}

/** Stempel waktu absolut. Tanggal relatif menua diam-diam di tangkapan layar. */
export function formatTimestamp(unix: number, locale = "id-ID"): string {
  if (!unix) return "-";
  return new Date(unix * 1000).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
