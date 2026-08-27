/**
 * State machine order, dipetakan untuk antarmuka.
 *
 * Urutan enum di sini WAJIB sama persis dengan `JejakEscrow.sol` (§11.3).
 * Indexer mengirim status sebagai angka mentah, jadi satu pergeseran indeks
 * di berkas ini menampilkan status yang salah tanpa satu pun galat.
 */

export enum Status {
  CREATED = 0,
  ACCEPTED = 1,
  PROOFED = 2,
  CAPITAL_PAID = 3,
  DISPUTED = 4,
  COMPLETED = 5,
  REFUNDED = 6,
  ABANDONED = 7,
  RESOLVED = 8
}

/**
 * Sembilan status dipetakan ke EMPAT keluarga warna, mengikuti aturan di
 * globals.css. Pengguna hanya perlu belajar empat hal: sedang berjalan,
 * dana bergerak, bermasalah, dan selesai.
 */
export type StatusFamily = "wait" | "settle" | "dispute" | "closed";

const KELUARGA: Record<Status, StatusFamily> = {
  [Status.CREATED]: "wait",
  [Status.ACCEPTED]: "wait",
  [Status.PROOFED]: "wait",
  [Status.CAPITAL_PAID]: "settle",
  [Status.DISPUTED]: "dispute",
  [Status.COMPLETED]: "settle",
  [Status.REFUNDED]: "closed",
  [Status.ABANDONED]: "dispute",
  [Status.RESOLVED]: "closed"
};

export function statusFamily(s: Status | number): StatusFamily {
  return KELUARGA[s as Status] ?? "closed";
}

/** §12.3 — status final tidak punya transisi keluar. */
export function isFinal(s: Status | number): boolean {
  return (
    s === Status.COMPLETED ||
    s === Status.REFUNDED ||
    s === Status.ABANDONED ||
    s === Status.RESOLVED
  );
}

/**
 * Kelas warna chip per keluarga. Ditulis lengkap, bukan dirangkai dari
 * potongan string, supaya Tailwind bisa melihatnya saat memindai berkas.
 */
export const CHIP_CLASS: Record<StatusFamily, string> = {
  wait: "bg-wait-soft text-wait",
  settle: "bg-settle-soft text-settle",
  dispute: "bg-dispute-soft text-dispute",
  closed: "bg-closed-soft text-closed"
};

/**
 * Urutan langkah untuk garis waktu order di layar. Status cabang
 * (DISPUTED, REFUNDED, ABANDONED, RESOLVED) sengaja TIDAK ada di sini —
 * mereka keluar dari jalur normal dan ditampilkan sebagai interupsi,
 * bukan sebagai langkah berikutnya.
 */
export const JALUR_NORMAL: Status[] = [
  Status.CREATED,
  Status.ACCEPTED,
  Status.PROOFED,
  Status.CAPITAL_PAID,
  Status.COMPLETED
];

/** Posisi order di jalur normal; -1 kalau sedang di jalur cabang. */
export function langkahKe(s: Status | number): number {
  return JALUR_NORMAL.indexOf(s as Status);
}

// ════════════════════════════════════════════════════════════════════════
//  TIER  (§6.7 / §11.4)
//  Reputasi di JEJAK bukan lencana — ia plafon kredit, dipaksa kontrak.
//  Angka di bawah disalin dari konstanta `JejakEscrow.sol`.
// ════════════════════════════════════════════════════════════════════════

export const TIER_CAP_WEI = [
  50_000_000_000_000_000n, //   0,05 tBNB
  200_000_000_000_000_000n, //  0,20 tBNB
  1_000_000_000_000_000_000n, // 1,00 tBNB
  10_000_000_000_000_000_000n // 10,00 tBNB
] as const;

export const TIER_MIN_COMPLETED = [0, 3, 10, 30] as const;

/** Ambang minimum skor ditampilkan (§13). Di bawah ini: teks, bukan angka. */
export const MIN_COMPLETED_FOR_SCORE = 3;

export function tierOf(completedCount: number, abandonedCount: number): number {
  let tier = 0;
  if (completedCount >= TIER_MIN_COMPLETED[3]) tier = 3;
  else if (completedCount >= TIER_MIN_COMPLETED[2]) tier = 2;
  else if (completedCount >= TIER_MIN_COMPLETED[1]) tier = 1;

  // Satu order ditinggalkan menurunkan tier. Kontrak melakukan hal yang sama.
  if (abandonedCount > 0 && tier > 0) tier -= 1;
  return tier;
}

export function tierCapWei(completedCount: number, abandonedCount: number): bigint {
  return TIER_CAP_WEI[tierOf(completedCount, abandonedCount)];
}
