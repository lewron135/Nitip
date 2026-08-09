/**
 * Menuliskan seluruh kasus uji beserta hasil TypeScript-nya ke berkas, supaya
 * implementasi Python bisa menghitung ulang dan membandingkan.
 *
 * Ini mitigasi R-12: "implementasi skor TS dan Python beda hasil — TINGGI,
 * merusak Skenario C di panggung." Selisih satu basis poin saja sudah cukup
 * untuk membuat momen penentu pitch kalian berubah jadi momen canggung.
 *
 *   cd services && npm run crosscheck:emit
 *   cd ../verify-independent && python crosscheck.py
 */

import {writeFileSync, mkdirSync} from "node:fs";
import {dirname, join} from "node:path";
import {ROOT} from "../shared/env.js";
import {TRUST_CASES} from "./cases.js";
import {computeTrust, TRUST_VERSION} from "./trust.js";

const keluaran = {
  version: TRUST_VERSION,
  dibuat: new Date().toISOString(),
  catatan:
    "Dihasilkan oleh services/scoring/crosscheck.ts. Berkas ini adalah kontrak " +
    "antara implementasi TypeScript dan Python. Jangan disunting tangan.",
  kasus: TRUST_CASES.map((c) => {
    const hasil = computeTrust(c.input);
    return {
      name: c.name,
      why: c.why,
      input: {
        nAccepted: c.input.nAccepted,
        nCompleted: c.input.nCompleted,
        nAbandoned: c.input.nAbandoned,
        nLost: c.input.nLost,
        vTotalWei: c.input.vTotalWei.toString(),
        uBuyers: c.input.uBuyers,
        medHours: c.input.medHours
      },
      ts: {
        trust: hasil.trust,
        trustBp: hasil.trustBp,
        components: hasil.components,
        peringatanKonsentrasi: hasil.warnings.length > 0
      }
    };
  })
};

const path = join(ROOT, "verify-independent", "crosscheck-cases.json");
mkdirSync(dirname(path), {recursive: true});
writeFileSync(path, JSON.stringify(keluaran, null, 2) + "\n", "utf8");

console.log(`${keluaran.kasus.length} kasus ditulis ke verify-independent/crosscheck-cases.json`);
console.log("Sekarang: cd ../verify-independent && python crosscheck.py");
