import {describe, expect, it} from "vitest";
import {
  computeTrust,
  formatTrust,
  medianHours,
  speedTier,
  tierCapWei,
  tierOf,
  trustWarnings,
  volumeTier,
  MIN_COMPLETED_FOR_SCORE,
  TRUST_VERSION
} from "./trust.js";
import {TRUST_CASES} from "./cases.js";

const e18 = 1_000_000_000_000_000_000n;

describe("JEJAK-TRUST v1.0 — kasus hitung tangan §13.3", () => {
  it("menghasilkan 90.50 pada uji kewarasan masterplan", () => {
    const hasil = computeTrust({
      nAccepted: 10,
      nCompleted: 10,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: (6n * e18) / 10n,
      uBuyers: 8,
      medHours: 40
    });

    // Komponen dicek satu per satu supaya kalau angkanya meleset, kita tahu
    // komponen MANA yang salah — bukan cuma tahu totalnya salah.
    expect(hasil.components).toEqual({comp: 10000, disp: 0, vol: 5000, spd: 10000, div: 8000});
    expect(hasil.trustBp).toBe(9050);
    expect(hasil.trust).toBe("90.50");
    expect(hasil.version).toBe(TRUST_VERSION);
  });
});

describe("gerbang cold start (N-13)", () => {
  it.each([0, 1, 2])("nCompleted = %i → null, bukan angka", (n) => {
    const hasil = computeTrust({
      nAccepted: Math.max(n, 1),
      nCompleted: n,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18,
      uBuyers: n,
      medHours: 10
    });
    expect(hasil.trust).toBeNull();
    expect(hasil.trustBp).toBeNull();
    expect(hasil.reason).toBe("belum-cukup-data");
  });

  it(`nCompleted = ${MIN_COMPLETED_FOR_SCORE} → skor tampil`, () => {
    const hasil = computeTrust({
      nAccepted: 3,
      nCompleted: 3,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: e18,
      uBuyers: 3,
      medHours: 10
    });
    expect(hasil.trust).not.toBeNull();
  });

  it("angka mentah tetap tersedia meski skornya null", () => {
    const hasil = computeTrust({
      nAccepted: 2,
      nCompleted: 1,
      nAbandoned: 1,
      nLost: 0,
      vTotalWei: 123n,
      uBuyers: 1,
      medHours: 7
    });
    expect(hasil.trust).toBeNull();
    expect(hasil.raw).toEqual({
      nAccepted: 2,
      nCompleted: 1,
      nAbandoned: 1,
      nLost: 0,
      vTotalWei: "123",
      uBuyers: 1,
      medHours: 7
    });
  });
});

describe("batas atas dan bawah", () => {
  it("maksimum sempurna tepat 100.00", () => {
    const hasil = computeTrust({
      nAccepted: 40,
      nCompleted: 40,
      nAbandoned: 0,
      nLost: 0,
      vTotalWei: 12n * e18,
      uBuyers: 40,
      medHours: 1
    });
    expect(hasil.trustBp).toBe(10000);
    expect(hasil.trust).toBe("100.00");
  });

  it("terburuk yang mungkin tetap >= 0 dan tidak pernah negatif", () => {
    const hasil = computeTrust({
      nAccepted: 100,
      nCompleted: 3,
      nAbandoned: 97,
      nLost: 0,
      vTotalWei: 0n,
      uBuyers: 1,
      medHours: 5000
    });
    expect(hasil.trustBp).toBeGreaterThanOrEqual(0);
    expect(hasil.trustBp).toBeLessThan(2000);
  });
});

describe("volumeTier §13.3a — tabel, bukan logaritma", () => {
  it.each([
    [0n, 0],
    [e18 / 10n - 1n, 0],
    [e18 / 10n, 2500],
    [e18 / 2n - 1n, 2500],
    [e18 / 2n, 5000],
    [2n * e18 - 1n, 5000],
    [2n * e18, 7500],
    [10n * e18 - 1n, 7500],
    [10n * e18, 10000],
    [1000n * e18, 10000]
  ])("vTotal %s wei → %i", (wei, nilai) => {
    expect(volumeTier(wei)).toBe(nilai);
  });
});

describe("speedTier §13.3b", () => {
  it.each([
    [0, 10000],
    [48, 10000],
    [49, 7500],
    [96, 7500],
    [97, 5000],
    [168, 5000],
    [169, 2500],
    [336, 2500],
    [337, 0]
  ])("medHours %i → %i", (jam, nilai) => {
    expect(speedTier(jam)).toBe(nilai);
  });
});

describe("median §13.2 — elemen tengah BAWAH pada jumlah genap", () => {
  it("jumlah genap tidak dirata-ratakan", () => {
    expect(medianHours([10, 20, 30, 40])).toBe(20); // bukan 25
    expect(medianHours([1, 2])).toBe(1); // bukan 1,5
  });

  it("jumlah ganjil mengambil elemen tengah", () => {
    expect(medianHours([10, 20, 30])).toBe(20);
    expect(medianHours([5])).toBe(5);
  });

  it("tidak bergantung pada urutan masukan", () => {
    expect(medianHours([40, 10, 30, 20])).toBe(20);
    expect(medianHours([30, 40, 20, 10])).toBe(20);
  });

  it("tidak mengubah array aslinya", () => {
    const asli = [3, 1, 2];
    medianHours(asli);
    expect(asli).toEqual([3, 1, 2]);
  });

  it("array kosong → 0", () => {
    expect(medianHours([])).toBe(0);
  });
});

describe("spanduk peringatan keragaman pembeli (F-27)", () => {
  const dasar = {nAccepted: 10, nCompleted: 10, nAbandoned: 0, nLost: 0, vTotalWei: e18, medHours: 40};

  it("uBuyers*2 == nCompleted → TIDAK menyala", () => {
    expect(trustWarnings({...dasar, uBuyers: 5})).toHaveLength(0);
  });

  it("uBuyers*2 < nCompleted → menyala", () => {
    const w = trustWarnings({...dasar, uBuyers: 4});
    expect(w).toHaveLength(1);
    expect(w[0]!.code).toBe("konsentrasi-pembeli");
  });

  it("peringatan tetap muncul walau skornya belum boleh tampil", () => {
    const hasil = computeTrust({...dasar, nCompleted: 2, uBuyers: 0});
    expect(hasil.trust).toBeNull();
    expect(hasil.warnings).toHaveLength(1);
  });
});

describe("formatTrust — dua desimal tanpa floating point", () => {
  it.each([
    [0, "0.00"],
    [5, "0.05"],
    [50, "0.50"],
    [905, "9.05"],
    [9050, "90.50"],
    [9999, "99.99"],
    [10000, "100.00"]
  ])("bp %i → %s", (bp, teks) => {
    expect(formatTrust(bp)).toBe(teks);
  });
});

describe("tier plafon — cermin dari kontrak", () => {
  it.each([
    [0, 0, 0, 50_000_000_000_000_000n],
    [2, 0, 0, 50_000_000_000_000_000n],
    [3, 0, 1, 200_000_000_000_000_000n],
    [9, 0, 1, 200_000_000_000_000_000n],
    [10, 0, 2, 1_000_000_000_000_000_000n],
    [29, 0, 2, 1_000_000_000_000_000_000n],
    [30, 0, 3, 10_000_000_000_000_000_000n],
    [999, 0, 3, 10_000_000_000_000_000_000n]
  ])("completed=%i abandoned=%i → tier %i", (done, bad, tier, cap) => {
    expect(tierOf(done, bad)).toBe(tier);
    expect(tierCapWei(done, bad)).toBe(cap);
  });

  it("satu kali kabur menurunkan tepat satu tier", () => {
    expect(tierOf(30, 1)).toBe(2);
    expect(tierOf(10, 1)).toBe(1);
    expect(tierOf(3, 1)).toBe(0);
  });

  it("tier 0 tidak bisa turun lebih jauh", () => {
    expect(tierOf(0, 5)).toBe(0);
    expect(tierCapWei(0, 5)).toBe(50_000_000_000_000_000n);
  });
});

describe("masukan tidak sah ditolak, bukan didiamkan", () => {
  const dasar = {nAccepted: 5, nCompleted: 5, nAbandoned: 0, nLost: 0, vTotalWei: e18, uBuyers: 5, medHours: 10};

  it("angka negatif", () => {
    expect(() => computeTrust({...dasar, nLost: -1})).toThrow(/negatif/);
    expect(() => computeTrust({...dasar, vTotalWei: -1n})).toThrow(/negatif/);
  });

  it("medHours pecahan", () => {
    expect(() => computeTrust({...dasar, medHours: 10.5})).toThrow(/bilangan bulat/);
  });

  it("data tidak konsisten: tuntas tanpa pernah diterima", () => {
    expect(() => computeTrust({...dasar, nAccepted: 0, nCompleted: 3})).toThrow(/tidak konsisten/);
  });
});

describe("seluruh daftar kasus uji silang", () => {
  it(`berisi minimal 20 kasus (syarat §18.3), saat ini ${TRUST_CASES.length}`, () => {
    expect(TRUST_CASES.length).toBeGreaterThanOrEqual(20);
  });

  it("tidak ada nama kasus yang kembar", () => {
    const nama = TRUST_CASES.map((c) => c.name);
    expect(new Set(nama).size).toBe(nama.length);
  });

  it("setiap kasus punya alasan tertulis", () => {
    for (const c of TRUST_CASES) {
      expect(c.why.length, `kasus "${c.name}" tanpa alasan`).toBeGreaterThan(10);
    }
  });

  it("delapan kasus WAJIB §18.3 semuanya ada", () => {
    const wajib = TRUST_CASES.filter((c) => c.why.startsWith("[WAJIB]"));
    expect(wajib.length).toBe(8);
  });

  it("setiap kasus terhitung tanpa melempar galat", () => {
    for (const c of TRUST_CASES) {
      const hasil = computeTrust(c.input);
      if (c.expectedTrust !== undefined) {
        expect(hasil.trust, `kasus "${c.name}"`).toBe(c.expectedTrust);
      }
      if (hasil.trustBp !== null) {
        expect(hasil.trustBp).toBeGreaterThanOrEqual(0);
        expect(hasil.trustBp).toBeLessThanOrEqual(10000);
      }
    }
  });
});
