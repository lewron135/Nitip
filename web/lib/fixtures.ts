/**
 * DATA CONTOH untuk mode demo.
 *
 * Dipakai HANYA kalau indexer/verifier tidak bisa dihubungi. Setiap layar
 * yang menampilkan data dari sini WAJIB memasang lencana "DATA CONTOH"
 * (N-14 / §13.4) — sebuah demo yang menampilkan angka karangan tanpa
 * menandainya adalah persis hal yang membuat juri berhenti percaya.
 *
 * Angka-angka di sini sengaja tidak bulat. Rekam jejak asli tidak pernah
 * berisi "10 dari 10, tepat 24 jam".
 */

import type {Order, JastiperProfile, JastiperRingkas, OrderDetail} from "./types";
import {Status} from "./status";

/** Kurs snapshot demo. Satu angka, dipakai seluruh berkas ini. */
export const KURS_DEMO = "9842500";

export const ALAMAT = {
  ranti: "0x7b21c4f0a9e5d3821b6c40f7e2a95d3c81f4b0e6",
  hafiz: "0x3d9a05c7e18b4f26a0d73c95b8e214f607ac5d31",
  yuni: "0xc4e07b3f92a6d158e0b7412f8c35a9d604e1b872",
  pembeli1: "0x1f6c83d0b47e92a5f30c8b16d4a7e025c93f8b41",
  pembeli2: "0x9a2e47f1c05b836d4e07a91f26c58b03d7e14a09",
  pembeli3: "0x58b1d09e37c4a6f20e85b7d143c096a2f81e5b37"
} as const;

const JAM = 3600;
const HARI = 86400;

function wei(bnb: string): string {
  const [b = "0", p = ""] = bnb.split(".");
  return (BigInt(b) * 10n ** 18n + BigInt((p + "0".repeat(18)).slice(0, 18))).toString();
}

function order(o: Partial<Order> & Pick<Order, "id" | "buyer" | "status">): Order {
  const capWei = o.capWei ?? wei("0.12");
  const feeWei = o.feeWei ?? wei("0.015");
  return {
    jastiper: null,
    verifiedWei: null,
    proofHash: null,
    acceptedAt: null,
    proofDeadline: null,
    verifyDeadline: null,
    disputeWindowEnd: null,
    completedAt: null,
    autoReleased: false,
    refundReason: null,
    disputeStage: null,
    arbiterBuyerWei: null,
    arbiterJastiperWei: null,
    idrPerBnbSnapshot: KURS_DEMO,
    itemHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    createdAt: 0,
    acceptDeadline: 0,
    ...o,
    capWei,
    feeWei,
    totalWei: (BigInt(capWei) + BigInt(feeWei)).toString()
  };
}

/**
 * Deskripsi barang tidak ada di rantai (§12.2) — di dunia nyata peramban
 * pembeli yang mengingatnya (lihat lib/itembook.ts). Untuk mode demo kami
 * sediakan di sini supaya layar contoh tetap terbaca.
 */
export const BARANG_DEMO: Record<number, string> = {
  1041: "Anua Heartleaf 77% Soothing Toner 250ml, 2 botol",
  1040: "Hada Labo Gokujyun Premium Lotion, 3 botol",
  1039: "Tiket Fujii Kaze Tokyo Dome, 1 lembar zona B",
  1038: "Shiro Sake Hand Cream 3 pcs + Kinu body soap",
  1037: "Muji stationery set, pouch, 6 gel pen 0.38",
  1036: "Beams Boy tote bag navy, ukuran M",
  1035: "Ketomac obat kulit resep, 2 tube"
};

export function orderDemo(now = Math.floor(Date.now() / 1000)): Order[] {
  return [
    // Baru dibuat, belum ada jastiper. Pembeli masih bisa membatalkan.
    order({
      id: 1041,
      buyer: ALAMAT.pembeli1,
      status: Status.CREATED,
      capWei: wei("0.14"),
      feeWei: wei("0.018"),
      createdAt: now - 5 * JAM,
      acceptDeadline: now + 3 * HARI + 7 * JAM,
      itemHash: "0x8f2a41d7c05be93a6f18d024b7c531e9a0f846d2b3c79e015a4d82f6b0c37e19"
    }),

    // Sudah diterima, jastiper punya 7 hari mengirim bukti (D-05).
    order({
      id: 1040,
      buyer: ALAMAT.pembeli2,
      jastiper: ALAMAT.ranti,
      status: Status.ACCEPTED,
      capWei: wei("0.096"),
      feeWei: wei("0.012"),
      createdAt: now - 2 * HARI,
      acceptDeadline: now - 1 * HARI,
      acceptedAt: now - 26 * JAM,
      proofDeadline: now + 5 * HARI + 22 * JAM,
      itemHash: "0x2c7e09b4f81a35d6027ce93b4a1d80f6539e27ac41b0d85e93f6072a4c18be35"
    }),

    // Bukti masuk, AI punya 24 jam membacanya sebelum siapa pun boleh
    // mengeskalasi ke arbiter (D-07).
    order({
      id: 1039,
      buyer: ALAMAT.pembeli3,
      jastiper: ALAMAT.hafiz,
      status: Status.PROOFED,
      capWei: wei("0.31"),
      feeWei: wei("0.04"),
      createdAt: now - 4 * HARI,
      acceptDeadline: now - 3 * HARI,
      acceptedAt: now - 3 * HARI - 4 * JAM,
      proofDeadline: now + 3 * HARI,
      verifyDeadline: now + 19 * JAM,
      proofHash: "0x5a90c3e71bd482f06a3e159c74b0d82fa613d97e05c48b26f10a7d39e2b45c80",
      itemHash: "0xd41b705ae92c6f38b071e4c25a9d306f81b4e07c2593a6d104f8b7e26c05a913"
    }),

    // Modal sudah cair. Masa sanggah pembeli 72 jam berjalan (D-02).
    order({
      id: 1038,
      buyer: ALAMAT.pembeli1,
      jastiper: ALAMAT.ranti,
      status: Status.CAPITAL_PAID,
      capWei: wei("0.085"),
      feeWei: wei("0.011"),
      verifiedWei: wei("0.0817"),
      createdAt: now - 6 * HARI,
      acceptDeadline: now - 5 * HARI,
      acceptedAt: now - 5 * HARI - 9 * JAM,
      proofDeadline: now - 1 * HARI,
      verifyDeadline: now - 2 * HARI,
      disputeWindowEnd: now + 41 * JAM,
      proofHash: "0x71e0d4b39a5c82f06d17e4a0c93b586f2d0a71c4e83b5f609d27ac41e0b856d3",
      itemHash: "0x3f8a260db14e7c95a0f73b2e816d40c5a9e2b7f310d54a86c02e93b75f1a08d4"
    }),

    // Jalur normal tuntas. Ini yang menjadi satu titik di rekam jejak.
    order({
      id: 1037,
      buyer: ALAMAT.pembeli2,
      jastiper: ALAMAT.ranti,
      status: Status.COMPLETED,
      capWei: wei("0.062"),
      feeWei: wei("0.008"),
      verifiedWei: wei("0.0594"),
      createdAt: now - 14 * HARI,
      acceptDeadline: now - 13 * HARI,
      acceptedAt: now - 13 * HARI - 2 * JAM,
      proofDeadline: now - 8 * HARI,
      verifyDeadline: now - 9 * HARI,
      disputeWindowEnd: now - 7 * HARI,
      completedAt: now - 7 * HARI + 3 * JAM,
      autoReleased: true,
      proofHash: "0x9c25a70e4b18d3f6027a5c91e4b0d38f7a2c60e15b84d39f7061ae2c83d5041b",
      itemHash: "0x60f4c19a7e0b25d38a1c07e46b9d20f5c83a1e7b042d9f6518c30ba7e94d2061"
    }),

    // Sengketa. Dana beku, arbiter manusia yang memutus (KD-05).
    order({
      id: 1036,
      buyer: ALAMAT.pembeli3,
      jastiper: ALAMAT.yuni,
      status: Status.DISPUTED,
      capWei: wei("0.155"),
      feeWei: wei("0.02"),
      verifiedWei: wei("0.1492"),
      disputeStage: 2,
      createdAt: now - 9 * HARI,
      acceptDeadline: now - 8 * HARI,
      acceptedAt: now - 8 * HARI - 6 * JAM,
      proofDeadline: now - 3 * HARI,
      verifyDeadline: now - 4 * HARI,
      disputeWindowEnd: now - 12 * JAM,
      proofHash: "0x4e81b03c6a92d75f018b4e2c907a3d61f5b08c2e93a17d06b4e825fc019a6d73",
      itemHash: "0xa07e35c1b48d29f60e7a15b3c802d94f6a1e70b5328cd0147f9b6e2a50d38c19"
    }),

    // Jastiper menghilang setelah menerima. Siapa pun boleh menarik dana
    // pembeli kembali setelah tenggat bukti lewat (D-05, permissionless).
    order({
      id: 1035,
      buyer: ALAMAT.pembeli1,
      jastiper: ALAMAT.yuni,
      status: Status.ABANDONED,
      capWei: wei("0.048"),
      feeWei: wei("0.006"),
      createdAt: now - 21 * HARI,
      acceptDeadline: now - 20 * HARI,
      acceptedAt: now - 20 * HARI - 5 * JAM,
      proofDeadline: now - 13 * HARI,
      itemHash: "0x1b60e94a7c05d283f6a04e71b93c58d20f7a6c1e458d0b37e621ac950f4d7b28"
    })
  ];
}

// ════════════════════════════════════════════════════════════════════════
//  REKAM JEJAK
// ════════════════════════════════════════════════════════════════════════

/** Jastiper mapan. Angka ini yang dipakai sebagai contoh di §13.4. */
export const PROFIL_RANTI: JastiperProfile = {
  address: ALAMAT.ranti,
  trust: {
    version: "JEJAK-TRUST v1.0",
    trust: "90.50",
    trustBp: 9050,
    components: {comp: 10000, disp: 10000, vol: 7500, spd: 7500, div: 8000},
    raw: {
      nAccepted: 10,
      nCompleted: 10,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: "612400000000000000",
      uBuyers: 8,
      medHours: 40.2
    },
    warnings: []
  },
  input: {
    nAccepted: 10,
    nCompleted: 10,
    nAbandoned: 0,
    nLost: 0,
    vTotalWei: "612400000000000000",
    uBuyers: 8,
    medHours: 40.2
  },
  completionHours: [31.4, 62.1, 40.2, 28.7, 55.9, 37.3, 44.8, 39.6, 71.2, 33.5],
  tier: {level: 2, label: "Mapan", capWei: "1000000000000000000"},
  completedCount: 10,
  abandonedCount: 0,
  orders: []
};

/**
 * Jastiper dengan konsentrasi pembeli. Memicu peringatan deterministik
 * §13.4 (`uBuyers * 2 < nCompleted`) — tanpa AI sama sekali.
 */
export const PROFIL_YUNI: JastiperProfile = {
  address: ALAMAT.yuni,
  trust: {
    version: "JEJAK-TRUST v1.0",
    trust: "61.75",
    trustBp: 6175,
    components: {comp: 8571, disp: 5000, vol: 5000, spd: 5000, div: 2857},
    raw: {
      nAccepted: 8,
      nCompleted: 7,
      nAbandoned: 1,
      nLost: 1,
      vTotalWei: "284700000000000000",
      uBuyers: 3,
      medHours: 96.4
    },
    warnings: [
      {
        code: "konsentrasi-pembeli",
        message:
          "Sebagian besar transaksi jastiper ini berasal dari sedikit pembeli yang sama. Pertimbangkan lagi."
      }
    ]
  },
  input: {
    nAccepted: 8,
    nCompleted: 7,
    nAbandoned: 1,
    nLost: 1,
    vTotalWei: "284700000000000000",
    uBuyers: 3,
    medHours: 96.4
  },
  completionHours: [88.2, 96.4, 142.7, 74.1, 110.5, 91.8, 63.3],
  tier: {level: 0, label: "Baru", capWei: "50000000000000000"},
  completedCount: 7,
  abandonedCount: 1,
  orders: []
};

/** Jastiper baru. Skor SENGAJA tidak ditampilkan di bawah 3 order (§13). */
export const PROFIL_HAFIZ: JastiperProfile = {
  address: ALAMAT.hafiz,
  trust: {
    version: "JEJAK-TRUST v1.0",
    trust: null,
    trustBp: null,
    reason: "belum-cukup-data",
    components: {comp: 0, disp: 0, vol: 0, spd: 0, div: 0},
    raw: {
      nAccepted: 2,
      nCompleted: 1,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: "47000000000000000",
      uBuyers: 1,
      medHours: 52.8
    },
    warnings: []
  },
  input: {
    nAccepted: 2,
    nCompleted: 1,
    nAbandoned: 0,
    nLost: 0,
    vTotalWei: "47000000000000000",
    uBuyers: 1,
    medHours: 52.8
  },
  completionHours: [52.8],
  tier: {level: 0, label: "Baru", capWei: "50000000000000000"},
  completedCount: 1,
  abandonedCount: 0,
  orders: []
};

const PROFIL: Record<string, JastiperProfile> = {
  [ALAMAT.ranti]: PROFIL_RANTI,
  [ALAMAT.yuni]: PROFIL_YUNI,
  [ALAMAT.hafiz]: PROFIL_HAFIZ
};

export function profilDemo(alamat: string, now?: number): JastiperProfile {
  const dasar = PROFIL[alamat.toLowerCase()];
  const semua = orderDemo(now);

  if (!dasar) {
    // Alamat yang belum pernah jadi jastiper: rekam jejak kosong, bukan galat.
    return {
      address: alamat,
      trust: {
        version: "JEJAK-TRUST v1.0",
        trust: null,
        trustBp: null,
        reason: "belum-cukup-data",
        components: {comp: 0, disp: 0, vol: 0, spd: 0, div: 0},
        raw: {
          nAccepted: 0,
          nCompleted: 0,
          nAbandoned: 0,
          nLost: 0,
          vTotalWei: "0",
          uBuyers: 0,
          medHours: 0
        },
        warnings: []
      },
      input: {
        nAccepted: 0,
        nCompleted: 0,
        nAbandoned: 0,
        nLost: 0,
        vTotalWei: "0",
        uBuyers: 0,
        medHours: 0
      },
      completionHours: [],
      tier: {level: 0, label: "Baru", capWei: "50000000000000000"},
      completedCount: 0,
      abandonedCount: 0,
      orders: []
    };
  }

  return {...dasar, orders: semua.filter((o) => o.jastiper?.toLowerCase() === alamat.toLowerCase())};
}

export function daftarJastiperDemo(): JastiperRingkas[] {
  return [PROFIL_RANTI, PROFIL_YUNI, PROFIL_HAFIZ].map((p) => ({
    address: p.address,
    trust: p.trust.trust,
    nCompleted: p.input.nCompleted,
    uBuyers: p.input.uBuyers,
    tier: p.tier.level
  }));
}

export function detailDemo(id: number, now?: number): OrderDetail | null {
  const o = orderDemo(now).find((x) => x.id === id);
  if (!o) return null;

  return {
    order: o,
    riwayat: [],
    bukti: o.proofHash ? {proofHash: o.proofHash, struk: {hash: o.proofHash}, barang: null} : null,
    verifikasi:
      o.verifiedWei !== null
        ? {
            putusan: "cair",
            verifiedWei: o.verifiedWei,
            mataUang: "JPY",
            nominalAsing: "58400",
            alasan:
              "Struk terbaca: toko Matsumoto Kiyoshi, tanggal cocok dengan periode order. Nama produk pada struk cocok dengan deskripsi order. Nominal dikonversi memakai kurs snapshot order."
          }
        : null
  };
}
