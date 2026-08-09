#!/usr/bin/env node
/**
 * export-abi.mjs — menyebarkan ABI hasil kompilasi ke seluruh repo.
 *
 * KENAPA BERKAS INI ADA
 * ─────────────────────
 * §18.2 masterplan menulisnya sebagai perangkap yang sudah menunggu:
 * "Jangan salin ABI manual. ABI usang = seharian debug."
 *
 * Jadi ABI tidak pernah disalin manusia. Ia dihasilkan dari artefak
 * `forge build`, dan berkas hasilnya diberi kepala peringatan supaya
 * tidak ada yang tergoda menyuntingnya.
 *
 * DIJALANKAN KAPAN
 * ────────────────
 *   setiap kali `forge build` menghasilkan ABI baru, dan WAJIB setelah deploy.
 *
 *   node scripts/export-abi.mjs
 *
 * YANG DIHASILKAN
 * ───────────────
 *   contracts/deployments/JejakEscrow.abi.json   sumber tunggal, di-commit
 *   web/lib/abi.ts                               untuk wagmi/viem (as const)
 *   services/shared/abi.ts                       untuk indexer & verifier
 *   web/lib/deployment.ts                        alamat + DEPLOY_BLOCK
 */

import {readFileSync, writeFileSync, existsSync, mkdirSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ARTIFACT = join(root, "contracts/out/JejakEscrow.sol/JejakEscrow.json");
const DEPLOY_DIR = join(root, "contracts/deployments");

const KEPALA = `// BERKAS INI DIHASILKAN OTOMATIS — JANGAN DISUNTING TANGAN.
// Sumber : contracts/out/JejakEscrow.sol/JejakEscrow.json
// Ulangi : node scripts/export-abi.mjs
//
// Kalau kamu tergoda menyunting berkas ini karena "cuma satu field",
// baca §18.2 masterplan dulu. ABI yang disalin tangan adalah cara
// paling umum kehilangan satu hari penuh menjelang deadline.
`;

function baca(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function tulis(path, isi) {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, isi, "utf8");
  console.log("  ✓", path.replace(root + "\\", "").replace(root + "/", ""));
}

// ─────────────────────────────────────────────────────────────────────
// 1. ABI dari artefak Foundry
// ─────────────────────────────────────────────────────────────────────
const artifact = baca(ARTIFACT);
if (!artifact) {
  console.error("✗ Artefak tidak ditemukan:", ARTIFACT);
  console.error("  Jalankan dulu:  cd contracts && forge build");
  process.exit(1);
}

const abi = artifact.abi;
console.log(`ABI JejakEscrow: ${abi.length} entri`);

tulis(join(DEPLOY_DIR, "JejakEscrow.abi.json"), JSON.stringify(abi, null, 2) + "\n");

const abiTs = `${KEPALA}
export const jejakEscrowAbi = ${JSON.stringify(abi, null, 2)} as const;

export type JejakEscrowAbi = typeof jejakEscrowAbi;
`;

tulis(join(root, "web/lib/abi.ts"), abiTs);
tulis(join(root, "services/shared/abi.ts"), abiTs);

// ─────────────────────────────────────────────────────────────────────
// 2. Alamat + DEPLOY_BLOCK dari berkas deployment yang ada
// ─────────────────────────────────────────────────────────────────────
const jaringan = ["bsc-testnet", "anvil", "bsc-mainnet"];
const deployments = {};

for (const n of jaringan) {
  const d = baca(join(DEPLOY_DIR, `${n}.json`));
  if (d) {
    deployments[n] = d;
    console.log(`  · ${n}: ${d.address} @ blok ${d.deployBlock}`);
  }
}

if (Object.keys(deployments).length === 0) {
  console.log("  · belum ada deployment — lewati pembuatan deployment.ts");
} else {
  const deployTs = `${KEPALA}
/** Isi contracts/deployments/*.json, dibekukan saat build. */
export const deployments = ${JSON.stringify(deployments, null, 2)} as const;

export type NetworkName = keyof typeof deployments;

export function deploymentFor(chainId: number) {
  return Object.values(deployments).find((d) => d.chainId === chainId);
}
`;
  tulis(join(root, "web/lib/deployment.ts"), deployTs);
  tulis(join(root, "services/shared/deployment.ts"), deployTs);
}

console.log("Selesai.");
