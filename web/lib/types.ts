/**
 * Bentuk data dari verifier API (`services/verifier/api.ts`).
 *
 * Ini SALINAN kontrak antarmuka, bukan sumbernya. Sumbernya adalah skema
 * event di §12.5 masterplan, yang dibaca indexer lalu dibentuk ulang oleh
 * `_bentukOrder`. Kalau skema event berubah, berkas ini ikut berubah — dan
 * §12.5 bilang perubahan itu wajib diumumkan ke grup hari itu juga.
 *
 * Nilai wei datang sebagai STRING dari JSON, bukan number. Jangan pernah
 * mengubahnya jadi number; pakai `BigInt()` lalu helper di lib/format.ts.
 */

import type {Status} from "./status";

export interface Order {
  id: number;
  buyer: string;
  jastiper: string | null;
  status: Status;

  /** Semua nilai uang: string desimal wei. */
  capWei: string;
  feeWei: string;
  verifiedWei: string | null;
  totalWei: string;

  /** Kurs saat createOrder. CATATAN AUDIT saja — kontrak tidak memakainya. */
  idrPerBnbSnapshot: string;

  itemHash: string;
  proofHash: string | null;

  createdAt: number;
  acceptDeadline: number;
  acceptedAt: number | null;
  proofDeadline: number | null;
  verifyDeadline: number | null;
  disputeWindowEnd: number | null;
  completedAt: number | null;

  autoReleased: boolean;
  refundReason: number | null;
  disputeStage: number | null;
  arbiterBuyerWei: string | null;
  arbiterJastiperWei: string | null;
}

/** Satu baris event mentah dari indexer, untuk garis waktu order. */
export interface OrderEvent {
  id?: number;
  order_id?: number;
  nama?: string;
  event?: string;
  block_number?: number;
  tx_hash?: string;
  log_index?: number;
  ts?: number;
  data?: string | Record<string, unknown>;
}

/** Berkas bukti yang diunggah jastiper (§11.7). */
export interface ProofBundle {
  proofHash?: string;
  struk?: {hash: string; url?: string; nama?: string} | null;
  barang?: {hash: string; url?: string; nama?: string} | null;
}

/** Keputusan AI (§13, `services/verifier/decision.ts`). */
export interface VerificationDecision {
  putusan?: string;
  verifiedWei?: string;
  alasan?: string;
  ragu?: boolean;
  mataUang?: string;
  nominalAsing?: string;
  dibuatPada?: number;
  [k: string]: unknown;
}

export interface OrderDetail {
  order: Order;
  riwayat: OrderEvent[];
  bukti: ProofBundle | null;
  verifikasi: VerificationDecision | null;
}

// ════════════════════════════════════════════════════════════════════════
//  REPUTASI
// ════════════════════════════════════════════════════════════════════════

/** Angka mentah yang WAJIB tampil bersama skor (§13.4). */
export interface TrustInput {
  nAccepted: number;
  nCompleted: number;
  nAbandoned: number;
  nLost: number;
  vTotalWei: string;
  uBuyers: number;
  medHours: number;
}

export interface TrustWarning {
  code: "konsentrasi-pembeli" | string;
  message: string;
}

export interface TrustResult {
  version: string;
  /** `null` kalau nCompleted < 3. WAJIB ditampilkan sebagai teks, bukan 0. */
  trust: string | null;
  trustBp: number | null;
  reason?: "belum-cukup-data";
  components: {comp: number; disp: number; vol: number; spd: number; div: number};
  raw: TrustInput;
  warnings: TrustWarning[];
}

export interface JastiperProfile {
  address: string;
  trust: TrustResult;
  input: TrustInput;
  completionHours: number[];
  tier: {level: number; label: string; capWei: string};
  completedCount: number;
  abandonedCount: number;
  orders: Order[];
}

export interface JastiperRingkas {
  address: string;
  trust: string | null;
  nCompleted: number;
  uBuyers: number;
  tier: number;
}
