/**
 * ════════════════════════════════════════════════════════════════════════
 *  JEJAK-TRUST v1.0 — implementasi referensi TypeScript
 *  Spesifikasi: docs/TRUST-SPEC.md (salinan §13 MASTERPLAN)
 * ════════════════════════════════════════════════════════════════════════
 *
 * BACA INI SEBELUM MENGUBAH SATU BARIS PUN.
 *
 * Berkas ini punya kembaran: `verify-independent/recompute.py`. Keduanya
 * WAJIB menghasilkan angka yang identik pada masukan yang sama, sampai ke
 * digit terakhir. Kalau keduanya berbeda satu basis poin saja, Skenario C
 * — momen yang kami sendiri sebut penentu pitch — runtuh di panggung.
 *
 * Karena itu ada tiga aturan keras di sini:
 *
 *   1. TIDAK ADA BILANGAN PECAHAN. Semua aritmetika `bigint`. Tidak ada
 *      `/` pada `number`, tidak ada `Math.log`, tidak ada `**`. Logaritma
 *      sengaja dihindari di seluruh spesifikasi (§13.3a) justru karena
 *      hasilnya berbeda tipis antar bahasa.
 *
 *   2. SETIAP PEMBAGIAN DIBULATKAN KE BAWAH, dan dinyatakan begitu.
 *      Pembagian `bigint` di JavaScript memang memotong ke arah nol, dan
 *      karena seluruh masukan kami tidak pernah negatif, memotong ke arah
 *      nol == membulatkan ke bawah. Itu kebetulan yang beruntung, bukan
 *      jaminan — jadi jangan pernah memasukkan nilai negatif ke sini.
 *
 *   3. SETIAP PERUBAHAN FORMULA = VERSI BARU. Jangan sunting v1.0.
 *      Tambahkan v1.1 di sebelahnya dan biarkan v1.0 tetap bisa dihitung,
 *      karena ada skor lama yang sudah ditampilkan ke orang dengan label
 *      versi itu.
 */

export const TRUST_VERSION = "JEJAK-TRUST v1.0";

/** Ambang §13.3: di bawah tiga order tuntas, skor TIDAK ditampilkan (N-13). */
export const MIN_COMPLETED_FOR_SCORE = 3;

// ════════════════════════════════════════════════════════════════════════
//  MASUKAN
// ════════════════════════════════════════════════════════════════════════

/**
 * Seluruh masukan formula. Setiap field punya event sumbernya sendiri —
 * tidak ada satu pun yang berasal dari basis data JEJAK (§13.1 prinsip 1).
 */
export interface TrustInput {
  /** Order yang pernah diterima jastiper. Sumber: `OrderAccepted`. */
  nAccepted: number;
  /** Order tuntas. Sumber: `OrderCompleted`. */
  nCompleted: number;
  /** Order ditinggalkan. Sumber: `OrderAbandoned`. */
  nAbandoned: number;
  /** Sengketa yang diputus memihak pembeli. Sumber: `DisputeResolved` dengan `buyerWei > jastiperWei`. */
  nLost: number;
  /** Total nilai (wei) di order tuntas. Sumber: penjumlahan `OrderCompleted.totalWei`. */
  vTotalWei: bigint;
  /** Jumlah alamat pembeli UNIK di order tuntas. Sumber: `OrderCompleted.buyer`. */
  uBuyers: number;
  /** Median jam `OrderAccepted` → `OrderCompleted`. Lihat `medianHours`. */
  medHours: number;
}

/** Hasil perhitungan, beserta seluruh komponennya supaya bisa diaudit. */
export interface TrustResult {
  version: string;
  /** `null` kalau `nCompleted < 3` — dan `null` WAJIB ditampilkan sebagai teks, bukan 0. */
  trust: string | null;
  /** Skor dalam basis poin (0–10000). `null` mengikuti `trust`. */
  trustBp: number | null;
  /** Alasan skor tidak ditampilkan, kalau memang tidak ditampilkan. */
  reason?: "belum-cukup-data";
  /** Komponen mentah, semuanya 0–10000. Berguna untuk debugging lintas bahasa. */
  components: {
    comp: number;
    disp: number;
    vol: number;
    spd: number;
    div: number;
  };
  /** Angka mentah yang WAJIB ikut tampil bersama skor (§13.4). */
  raw: {
    nAccepted: number;
    nCompleted: number;
    nAbandoned: number;
    nLost: number;
    vTotalWei: string;
    uBuyers: number;
    medHours: number;
  };
  /** Peringatan deterministik — tanpa AI sama sekali (F-27). */
  warnings: TrustWarning[];
}

export interface TrustWarning {
  code: "konsentrasi-pembeli";
  message: string;
}

// ════════════════════════════════════════════════════════════════════════
//  TABEL TIER  (§13.3a & §13.3b)
//  Tabel, bukan fungsi kontinu. Sengaja. Lihat aturan keras nomor 1.
// ════════════════════════════════════════════════════════════════════════

const E18 = 1_000_000_000_000_000_000n;

/** §13.3a — nilai 0–10000 dari total nilai yang pernah dipegang. */
export function volumeTier(vTotalWei: bigint): number {
  if (vTotalWei < E18 / 10n) return 0; //      < 0,1 tBNB
  if (vTotalWei < E18 / 2n) return 2500; //    < 0,5 tBNB
  if (vTotalWei < 2n * E18) return 5000; //    < 2   tBNB
  if (vTotalWei < 10n * E18) return 7500; //   < 10  tBNB
  return 10000; //                             >= 10 tBNB
}

/** §13.3b — nilai 0–10000 dari median waktu penyelesaian. */
export function speedTier(medHours: number): number {
  if (medHours <= 48) return 10000;
  if (medHours <= 96) return 7500;
  if (medHours <= 168) return 5000;
  if (medHours <= 336) return 2500;
  return 0;
}

// ════════════════════════════════════════════════════════════════════════
//  MEDIAN  (§13.2)
// ════════════════════════════════════════════════════════════════════════

/**
 * Median dengan definisi yang WAJIB eksplisit.
 *
 * §13.2 menyebut ini sebagai sumber ketidakcocokan antar-implementasi,
 * dan memang begitu: kebanyakan orang secara refleks merata-ratakan dua
 * elemen tengah pada jumlah data genap. Kami TIDAK. Kami mengambil
 * **elemen yang lebih kecil** dari dua elemen tengah.
 *
 * Alasannya sederhana: merata-ratakan memunculkan pecahan, dan pecahan
 * adalah pintu masuk perbedaan floating point antar bahasa.
 *
 *   [10, 20, 30, 40] → indeks tengah bawah = 1 → 20   (bukan 25)
 *   [10, 20, 30]     → indeks 1              → 20
 *   []               → 0
 */
export function medianHours(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const urut = [...values].sort((a, b) => a - b);
  const idx = urut.length % 2 === 1 ? (urut.length - 1) / 2 : urut.length / 2 - 1;
  return urut[idx]!;
}

// ════════════════════════════════════════════════════════════════════════
//  FORMULA  (§13.3)
// ════════════════════════════════════════════════════════════════════════

const BOBOT_COMP = 35n;
const BOBOT_DISP = 30n;
const BOBOT_VOL = 15n;
const BOBOT_SPD = 10n;
const BOBOT_DIV = 10n;
// 35 + 30 + 15 + 10 + 10 = 100. Kalau kamu mengubah salah satunya,
// jumlahnya harus tetap 100 — dan itu berarti versi formula baru.

export function computeTrust(input: TrustInput): TrustResult {
  const {nAccepted, nCompleted, nAbandoned, nLost, vTotalWei, uBuyers, medHours} = input;

  _validasi(input);

  const raw: TrustResult["raw"] = {
    nAccepted,
    nCompleted,
    nAbandoned,
    nLost,
    vTotalWei: vTotalWei.toString(),
    uBuyers,
    medHours
  };

  const warnings = trustWarnings(input);

  // ── Gerbang cold start (§13.3 + N-13) ──────────────────────────────
  // Ini bukan optimasi tampilan. Reputasi dengan dua titik data adalah
  // reputasi yang menyesatkan, dan menampilkan "100.00" untuk seseorang
  // yang baru sekali bertransaksi justru merusak seluruh klaim produk.
  if (nCompleted < MIN_COMPLETED_FOR_SCORE) {
    return {
      version: TRUST_VERSION,
      trust: null,
      trustBp: null,
      reason: "belum-cukup-data",
      components: {comp: 0, disp: 0, vol: 0, spd: 0, div: 0},
      raw,
      warnings
    };
  }

  const accepted = BigInt(nAccepted);
  const completed = BigInt(nCompleted);

  // comp — berapa bagian order yang diterima berakhir tuntas.
  const comp = (10000n * completed) / accepted;

  // disp — berapa bagian yang berakhir buruk (kalah sengketa atau kabur).
  const dispMentah = (10000n * BigInt(nLost + nAbandoned)) / accepted;
  // Dijepit ke 10000. Dalam data yang sehat ini mustahil terpicu karena
  // nLost + nAbandoned <= nAccepted; penjepitnya ada supaya data yang
  // rusak menghasilkan 0, bukan skor negatif. Python melakukan hal yang
  // sama persis — kalau kamu mengubah satu, ubah keduanya.
  const disp = dispMentah > 10000n ? 10000n : dispMentah;

  const vol = BigInt(volumeTier(vTotalWei));
  const spd = BigInt(speedTier(medHours));
  const div = (10000n * BigInt(uBuyers)) / completed;

  const trustBp =
    (BOBOT_COMP * comp +
      BOBOT_DISP * (10000n - disp) +
      BOBOT_VOL * vol +
      BOBOT_SPD * spd +
      BOBOT_DIV * div) /
    100n;

  return {
    version: TRUST_VERSION,
    trust: formatTrust(Number(trustBp)),
    trustBp: Number(trustBp),
    components: {
      comp: Number(comp),
      disp: Number(disp),
      vol: Number(vol),
      spd: Number(spd),
      div: Number(div)
    },
    raw,
    warnings
  };
}

/**
 * Basis poin → teks dua desimal, TANPA pembagian pecahan.
 *
 * `(9050 / 100).toFixed(2)` kelihatan lebih pendek dan memang bekerja untuk
 * angka sekecil ini, tapi begitu satu orang menyalin pola itu ke tempat lain
 * yang angkanya lebih besar, pembulatan floating point masuk diam-diam.
 * Jadi: bagi dan sisakan sebagai bilangan bulat, lalu rangkai stringnya.
 */
export function formatTrust(trustBp: number): string {
  const bulat = Math.floor(trustBp / 100);
  const desimal = trustBp % 100;
  return `${bulat}.${String(desimal).padStart(2, "0")}`;
}

/**
 * §13.4 — peringatan anti-farming yang DETERMINISTIK, tanpa AI.
 *
 * Ini yang menutup kebutuhan MVP untuk deteksi sybil (M-04). AI-3 tetap
 * ada sebagai lapisan "Should", tapi dia butuh volume transaksi yang belum
 * kami punya; aturan ini tidak. Aturannya satu baris dan bisa dihitung ulang
 * siapa pun — persis semangat produk ini.
 */
export function trustWarnings(input: TrustInput): TrustWarning[] {
  const out: TrustWarning[] = [];
  if (input.uBuyers * 2 < input.nCompleted) {
    out.push({
      code: "konsentrasi-pembeli",
      message:
        "Sebagian besar transaksi jastiper ini berasal dari sedikit pembeli yang sama. Pertimbangkan lagi."
    });
  }
  return out;
}

function _validasi(i: TrustInput): void {
  const negatif =
    i.nAccepted < 0 || i.nCompleted < 0 || i.nAbandoned < 0 || i.nLost < 0 || i.uBuyers < 0 || i.medHours < 0;
  if (negatif) throw new Error("JEJAK-TRUST: masukan negatif tidak sah");
  if (i.vTotalWei < 0n) throw new Error("JEJAK-TRUST: vTotalWei negatif tidak sah");
  if (i.nCompleted > 0 && i.nAccepted === 0) {
    throw new Error("JEJAK-TRUST: nCompleted > 0 tapi nAccepted = 0 — data tidak konsisten");
  }
  if (!Number.isInteger(i.medHours)) {
    throw new Error("JEJAK-TRUST: medHours harus bilangan bulat (jam penuh, dibulatkan ke bawah)");
  }
}

// ════════════════════════════════════════════════════════════════════════
//  TIER PLAFON  (cermin dari `tierOf`/`tierCap` di JejakEscrow.sol)
//  Ditulis ulang di sini supaya frontend bisa menampilkan plafon tanpa
//  memanggil rantai. Kalau kontrak berubah, berkas ini ikut berubah.
// ════════════════════════════════════════════════════════════════════════

export const TIER_CAPS_WEI = [
  50_000_000_000_000_000n, //     T0  0,05 tBNB
  200_000_000_000_000_000n, //    T1  0,20 tBNB
  1_000_000_000_000_000_000n, //  T2  1,00 tBNB
  10_000_000_000_000_000_000n //  T3 10,00 tBNB
] as const;

export const TIER_LABELS = ["Baru", "Pemula", "Mapan", "Terpercaya"] as const;

export function tierOf(completedCount: number, abandonedCount: number): number {
  let tier = 0;
  if (completedCount >= 30) tier = 3;
  else if (completedCount >= 10) tier = 2;
  else if (completedCount >= 3) tier = 1;

  if (abandonedCount > 0 && tier > 0) tier -= 1;
  return tier;
}

export function tierCapWei(completedCount: number, abandonedCount: number): bigint {
  return TIER_CAPS_WEI[tierOf(completedCount, abandonedCount)]!;
}
