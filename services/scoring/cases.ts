/**
 * Kasus uji bersama untuk JEJAK-TRUST v1.0.
 *
 * Daftar ini adalah SATU-SATUNYA sumber kasus untuk dua hal sekaligus:
 *   · tes unit TypeScript          (scoring/trust.test.ts)
 *   · uji silang TypeScript ↔ Python (scoring/crosscheck.ts → verify-independent)
 *
 * §18.3 Minggu 4 mewajibkan ≥20 kasus, dan menyebut delapan yang WAJIB ada:
 * n=0, n=2, n=3, semua sengketa kalah, satu pembeli saja, jumlah data genap,
 * jumlah data ganjil, dan maksimum sempurna. Kedelapan-delapannya ditandai
 * `[WAJIB]` di bawah supaya tidak ada yang tidak sengaja menghapusnya.
 *
 * R-12 di daftar risiko berbunyi: "implementasi skor TS dan Python beda hasil
 * — TINGGI, merusak Skenario C di panggung." Berkas ini adalah mitigasinya.
 */

import type {TrustInput} from "./trust.js";

export interface TrustCase {
  name: string;
  /** Kenapa kasus ini ada. Kasus tanpa alasan adalah kasus yang akan dihapus orang. */
  why: string;
  input: TrustInput;
  /** Diisi hanya kalau angkanya dihitung tangan di masterplan. */
  expectedTrust?: string | null;
}

const e18 = 1_000_000_000_000_000_000n;

export const TRUST_CASES: TrustCase[] = [
  {
    name: "masterplan-13.3-uji-kewarasan",
    why: "Angka yang dihitung tangan di §13.3. Kalau ini bukan 90.50, ada yang salah membaca spesifikasi.",
    input: {
      nAccepted: 10,
      nCompleted: 10,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: (6n * e18) / 10n, // 0,6 tBNB
      uBuyers: 8,
      medHours: 40
    },
    expectedTrust: "90.50"
  },
  {
    name: "n0-belum-ada-apa-apa",
    why: "[WAJIB] n=0. Jastiper yang baru membuat wallet. Harus null, bukan 0.00.",
    input: {nAccepted: 0, nCompleted: 0, nAbandoned: 0, nLost: 0, vTotalWei: 0n, uBuyers: 0, medHours: 0},
    expectedTrust: null
  },
  {
    name: "n2-tepat-di-bawah-ambang",
    why: "[WAJIB] n=2. Satu order lagi menuju ambang. Masih harus null (N-13).",
    input: {
      nAccepted: 2,
      nCompleted: 2,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18 / 5n,
      uBuyers: 2,
      medHours: 30
    },
    expectedTrust: null
  },
  {
    name: "n3-ambang-tepat-terlewati",
    why: "[WAJIB] n=3. Order ketiga tuntas: skor pertama kali boleh tampil.",
    input: {
      nAccepted: 3,
      nCompleted: 3,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: (3n * e18) / 10n,
      uBuyers: 3,
      medHours: 24
    }
  },
  {
    name: "maksimum-sempurna",
    why: "[WAJIB] Batas atas. Semua komponen 10000 → harus tepat 100.00, bukan 99.99 atau 100.01.",
    input: {
      nAccepted: 40,
      nCompleted: 40,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: 12n * e18,
      uBuyers: 40,
      medHours: 12
    },
    expectedTrust: "100.00"
  },
  {
    name: "semua-sengketa-kalah",
    why: "[WAJIB] Jastiper yang kalah di setiap sengketa. Skor harus jatuh, bukan sekadar turun sedikit.",
    input: {
      nAccepted: 10,
      nCompleted: 3,
      nAbandoned: 0,
      nLost: 7,
      vTotalWei: e18 / 10n,
      uBuyers: 3,
      medHours: 200
    }
  },
  {
    name: "satu-pembeli-saja",
    why: "[WAJIB] Sepuluh order, satu pembeli. Ini bentuk paling murni dari reputasi yang difarming.",
    input: {
      nAccepted: 10,
      nCompleted: 10,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18,
      uBuyers: 1,
      medHours: 20
    }
  },
  {
    name: "median-jumlah-genap",
    why: "[WAJIB] Empat data → ambil tengah bawah, bukan rata-rata. Sumber ketidakcocokan nomor satu.",
    input: {
      nAccepted: 4,
      nCompleted: 4,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: (4n * e18) / 10n,
      uBuyers: 4,
      medHours: 20 // medianHours([10,20,30,40]) = 20
    }
  },
  {
    name: "median-jumlah-ganjil",
    why: "[WAJIB] Lima data → elemen tengah sungguhan.",
    input: {
      nAccepted: 5,
      nCompleted: 5,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18 / 2n,
      uBuyers: 4,
      medHours: 30 // medianHours([10,20,30,40,50]) = 30
    }
  },
  {
    name: "batas-volume-tepat-0.1",
    why: "Batas bawah volumeTier. `< 0,1e18` bernilai 0; tepat 0,1e18 bernilai 2500.",
    input: {
      nAccepted: 5,
      nCompleted: 5,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18 / 10n,
      uBuyers: 5,
      medHours: 40
    }
  },
  {
    name: "batas-volume-tepat-di-bawah-0.1",
    why: "Satu wei di bawah batas. Off-by-one di tabel tier ketahuan di sini, bukan di panggung.",
    input: {
      nAccepted: 5,
      nCompleted: 5,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18 / 10n - 1n,
      uBuyers: 5,
      medHours: 40
    }
  },
  {
    name: "batas-volume-tepat-10",
    why: "Batas atas volumeTier: >= 10e18 bernilai penuh.",
    input: {
      nAccepted: 5,
      nCompleted: 5,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: 10n * e18,
      uBuyers: 5,
      medHours: 40
    }
  },
  {
    name: "batas-kecepatan-48-jam",
    why: "speedTier: `<= 48` masih nilai penuh.",
    input: {
      nAccepted: 6,
      nCompleted: 6,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18 / 2n,
      uBuyers: 6,
      medHours: 48
    }
  },
  {
    name: "batas-kecepatan-49-jam",
    why: "Satu jam lewat batas → turun satu tingkat. Membuktikan perbandingannya `<=`, bukan `<`.",
    input: {
      nAccepted: 6,
      nCompleted: 6,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18 / 2n,
      uBuyers: 6,
      medHours: 49
    }
  },
  {
    name: "batas-kecepatan-336-jam",
    why: "Tepat 14 hari — masih 2500.",
    input: {
      nAccepted: 6,
      nCompleted: 6,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18 / 2n,
      uBuyers: 6,
      medHours: 336
    }
  },
  {
    name: "kecepatan-sangat-lambat",
    why: "> 336 jam → 0. Jastiper yang selalu telat tidak boleh dapat poin kecepatan.",
    input: {
      nAccepted: 6,
      nCompleted: 6,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18 / 2n,
      uBuyers: 6,
      medHours: 1000
    }
  },
  {
    name: "pembulatan-ke-bawah-comp",
    why: "7/9 tidak bulat. Menguji floor, bukan pembulatan ke terdekat.",
    input: {
      nAccepted: 9,
      nCompleted: 7,
      nAbandoned: 1,
      nLost: 1,
      vTotalWei: (7n * e18) / 10n,
      uBuyers: 5,
      medHours: 55
    }
  },
  {
    name: "pembulatan-ke-bawah-div",
    why: "1/3 = 3333,33… → 3333. Kalau salah satu bahasa membulatkan ke 3334, ketahuan di sini.",
    input: {
      nAccepted: 3,
      nCompleted: 3,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: (3n * e18) / 10n,
      uBuyers: 1,
      medHours: 24
    }
  },
  {
    name: "kabur-sekali",
    why: "Satu order ditinggalkan menaikkan disp dan menurunkan comp sekaligus.",
    input: {
      nAccepted: 11,
      nCompleted: 10,
      nAbandoned: 1,
      nLost: 0,
      vTotalWei: (6n * e18) / 10n,
      uBuyers: 8,
      medHours: 40
    }
  },
  {
    name: "campuran-kabur-dan-kalah",
    why: "Keduanya masuk ke pembilang `disp` yang sama. Menguji penjumlahannya, bukan hanya salah satu.",
    input: {
      nAccepted: 20,
      nCompleted: 15,
      nAbandoned: 2,
      nLost: 3,
      vTotalWei: 3n * e18,
      uBuyers: 12,
      medHours: 60
    }
  },
  {
    name: "volume-besar-tapi-satu-pembeli",
    why: "Skenario farming yang mahal: nilainya besar, keragamannya nol. Spanduk peringatan harus menyala.",
    input: {
      nAccepted: 30,
      nCompleted: 30,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: 25n * e18,
      uBuyers: 2,
      medHours: 10
    }
  },
  {
    name: "spanduk-tepat-di-batas",
    why: "uBuyers*2 == nCompleted → spanduk TIDAK menyala. Perbandingannya `<`, bukan `<=`.",
    input: {
      nAccepted: 10,
      nCompleted: 10,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18,
      uBuyers: 5,
      medHours: 40
    }
  },
  {
    name: "spanduk-satu-langkah-di-bawah-batas",
    why: "uBuyers*2 < nCompleted → spanduk menyala. Pasangan dari kasus di atas.",
    input: {
      nAccepted: 10,
      nCompleted: 10,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18,
      uBuyers: 4,
      medHours: 40
    }
  },
  {
    name: "diterima-banyak-tuntas-sedikit",
    why: "Jastiper yang gemar mengambil order lalu tidak menyelesaikannya. comp harus anjlok.",
    input: {
      nAccepted: 50,
      nCompleted: 5,
      nAbandoned: 20,
      nLost: 5,
      vTotalWei: e18 / 4n,
      uBuyers: 5,
      medHours: 300
    }
  },
  {
    name: "volume-nol-tapi-tuntas",
    why: "Order bernilai sangat kecil: vol = 0 tapi skor tetap harus terhitung.",
    input: {
      nAccepted: 5,
      nCompleted: 5,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: 1000n,
      uBuyers: 5,
      medHours: 5
    }
  },
  {
    name: "angka-besar-tidak-realistis",
    why: "Menguji bahwa tidak ada yang meluap atau berubah jadi float di angka besar.",
    input: {
      nAccepted: 100000,
      nCompleted: 99999,
      nAbandoned: 1,
      nLost: 0,
      vTotalWei: 1_000_000n * e18,
      uBuyers: 65432,
      medHours: 47
    }
  }
];
