/**
 * Evaluasi AI-1 (`bacaStruk`) atas sampel SROIE v2 — lihat README.md di folder ini
 * untuk penjelasan kenapa ini EVALUASI, bukan training.
 *
 * Memanggil kode produksi yang sama persis dengan `services/verifier/api.ts`
 * (bukan re-implementasi) — supaya angka yang keluar benar-benar mencerminkan
 * apa yang jalan di verifier, bukan jalur terpisah yang bisa diam-diam berbeda.
 *
 *   npx tsx eval/run-eval.ts [jumlahSampel]
 */

import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import sharp from "sharp";
import {ROOT} from "../shared/env.js";
import {bacaStruk, modeAi, type HasilBacaStruk} from "../verifier/ai.js";
import {perkecilUntukAi} from "../verifier/gambar.js";

const DIR_DATASET = join(ROOT, "Data/SROIE2019/test");
const DIR_HASIL = join(import.meta.dirname, "results");
const DIR_CACHE = join(DIR_HASIL, "respons-ai");

// Perkiraan harga claude-sonnet-5 (lihat services/eval/README.md § Biaya).
const HARGA_INPUT_PER_MTOK = 2;
const HARGA_OUTPUT_PER_MTOK = 10;

interface GroundTruth {
  company: string;
  date: string;
  address: string;
  total: string;
}

interface HasilSatuStruk {
  file: string;
  groundTruth: GroundTruth;
  prediksi: HasilBacaStruk;
  cocokTotal: boolean;
  cocokTanggal: boolean;
  cocokMerchant: boolean;
  perkiraanBiayaUsd: number;
}

function main(): void {
  const jumlahSampel = Number(process.argv[2] ?? 10);

  if (!existsSync(DIR_DATASET)) {
    throw new Error(
      `Dataset tidak ditemukan di ${DIR_DATASET}.\n` +
        "  → Ekstrak SROIE v2 (https://www.kaggle.com/datasets/urbikn/sroie-datasetv2) ke Data/SROIE2019/ di akar repo."
    );
  }

  mkdirSync(DIR_CACHE, {recursive: true});

  const namaBerkas = readdirSync(join(DIR_DATASET, "img"))
    .filter((f) => f.endsWith(".jpg"))
    .sort()
    .slice(0, jumlahSampel);

  console.log(`[eval] mode AI: ${modeAi()}${modeAi() === "mock" ? "  (⚠ hasil TIDAK berarti — lihat README § mode mock)" : ""}`);
  console.log(`[eval] menguji ${namaBerkas.length} struk dari SROIE test set...\n`);

  run(namaBerkas).catch((e) => {
    console.error("[eval] gagal:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

async function run(namaBerkas: string[]): Promise<HasilSatuStruk[]> {
  const semuaHasil: HasilSatuStruk[] = [];

  for (const nama of namaBerkas) {
    const basename = nama.replace(/\.jpg$/, "");
    const pathCache = join(DIR_CACHE, `${basename}.json`);
    const groundTruth = bacaGroundTruth(basename);

    let prediksi: HasilBacaStruk;
    let perkiraanBiayaUsd = 0;

    if (existsSync(pathCache)) {
      prediksi = JSON.parse(readFileSync(pathCache, "utf8"));
      console.log(`  [cache] ${nama}`);
    } else {
      const isi = readFileSync(join(DIR_DATASET, "img", nama));
      const base64 = isi.toString("base64");
      const untukAi = await perkecilUntukAi(base64, "image/jpeg");

      prediksi = await bacaStruk(untukAi.base64, untukAi.mediaType);
      perkiraanBiayaUsd = await hitungPerkiraanBiaya(untukAi.base64, prediksi);

      writeFileSync(pathCache, JSON.stringify(prediksi, null, 2));
      console.log(`  [ai]    ${nama}  →  keyakinan ${prediksi.keyakinan}`);
    }

    semuaHasil.push({
      file: nama,
      groundTruth,
      prediksi,
      cocokTotal: cocokkanTotal(groundTruth.total, prediksi.nominal),
      cocokTanggal: cocokkanTanggal(groundTruth.date, prediksi.tanggal),
      cocokMerchant: cocokkanMerchant(groundTruth.company, prediksi.merchant),
      perkiraanBiayaUsd
    });
  }

  writeFileSync(join(DIR_HASIL, "hasil-eval.json"), JSON.stringify(semuaHasil, null, 2));
  cetakRingkasan(semuaHasil);
  return semuaHasil;
}

function bacaGroundTruth(basename: string): GroundTruth {
  const path = join(DIR_DATASET, "entities", `${basename}.txt`);
  return JSON.parse(readFileSync(path, "utf8"));
}

/** SROIE nulis total sebagai string ("193.00"), kadang ada koma ribuan. */
function cocokkanTotal(totalAsli: string, nominalPrediksi: number | null): boolean {
  if (nominalPrediksi === null) return false;
  const angkaAsli = Number(totalAsli.replace(/,/g, ""));
  if (!Number.isFinite(angkaAsli)) return false;
  return Math.abs(angkaAsli - nominalPrediksi) < 0.01;
}

/** SROIE umumnya DD/MM/YYYY; bacaStruk mengeluarkan YYYY-MM-DD. */
function cocokkanTanggal(tanggalAsli: string, tanggalPrediksi: string | null): boolean {
  if (!tanggalPrediksi) return false;
  const cocok = tanggalAsli.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!cocok) return tanggalAsli === tanggalPrediksi; // format tak dikenal, bandingkan mentah
  const [, dd, mm, yyyy] = cocok as [string, string, string, string];
  const dinormalisasi = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  return dinormalisasi === tanggalPrediksi;
}

/**
 * Perbandingan longgar: nama merchant hasil OCR/AI jarang identik persis-huruf
 * dengan label (spasi ekstra, tanda baca, "SDN BHD" vs "SDN. BHD."). Yang
 * dinilai adalah salah satu memuat yang lain setelah dinormalisasi, bukan
 * kesamaan string 100%.
 */
function cocokkanMerchant(companyAsli: string, merchantPrediksi: string | null): boolean {
  if (!merchantPrediksi) return false;
  const normalisasi = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const a = normalisasi(companyAsli);
  const b = normalisasi(merchantPrediksi);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

/** Perkiraan kasar (bukan meteran asli) — lihat README § Biaya. */
async function hitungPerkiraanBiaya(base64Gambar: string, hasil: HasilBacaStruk): Promise<number> {
  if (hasil.sumber === "mock") return 0;

  const meta = await sharp(Buffer.from(base64Gambar, "base64")).metadata();
  const tokenGambar = ((meta.width ?? 0) * (meta.height ?? 0)) / 750;
  const tokenInput = tokenGambar + 500; // + system prompt & skema JSON
  const tokenOutput = JSON.stringify(hasil).length / 4;

  return (tokenInput * HARGA_INPUT_PER_MTOK + tokenOutput * HARGA_OUTPUT_PER_MTOK) / 1_000_000;
}

function cetakRingkasan(hasil: HasilSatuStruk[]): void {
  const n = hasil.length;
  const cocokTotal = hasil.filter((h) => h.cocokTotal).length;
  const cocokTanggal = hasil.filter((h) => h.cocokTanggal).length;
  const cocokMerchant = hasil.filter((h) => h.cocokMerchant).length;
  const rataKeyakinan = hasil.reduce((a, h) => a + h.prediksi.keyakinan, 0) / n;
  const totalBiaya = hasil.reduce((a, h) => a + h.perkiraanBiayaUsd, 0);

  console.log("\n── Ringkasan ──────────────────────────────────────────");
  console.log(`  Struk diuji         : ${n}`);
  console.log(`  Total cocok         : ${cocokTotal}/${n}  (${((cocokTotal / n) * 100).toFixed(1)}%)`);
  console.log(`  Tanggal cocok       : ${cocokTanggal}/${n}  (${((cocokTanggal / n) * 100).toFixed(1)}%)`);
  console.log(`  Merchant cocok      : ${cocokMerchant}/${n}  (${((cocokMerchant / n) * 100).toFixed(1)}%)`);
  console.log(`  Rata-rata keyakinan : ${rataKeyakinan.toFixed(3)}`);
  console.log(`  Perkiraan biaya     : $${totalBiaya.toFixed(4)} (yang benar-benar manggil API, bukan dari cache)`);
  console.log(`  Hasil lengkap       : services/eval/results/hasil-eval.json`);
}

main();
