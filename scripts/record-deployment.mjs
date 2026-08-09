#!/usr/bin/env node
/**
 * record-deployment.mjs — mengoreksi DEPLOY_BLOCK dari receipt yang sebenarnya.
 *
 * KENAPA BERKAS INI ADA
 * ─────────────────────
 * `forge script` menjalankan simulasi SEBELUM transaksinya masuk blok, jadi
 * `block.number` di dalam skrip Solidity adalah blok terakhir saat simulasi,
 * bukan blok tempat kontrak benar-benar mendarat. Di anvil selisihnya 1; di
 * jaringan sibuk bisa lebih.
 *
 * Kelihatannya sepele. Tidak. §14.5 RPC-3 mewajibkan indexer memulai backfill
 * dari DEPLOY_BLOCK, dan RPC pihak ketiga menolak rentang blok yang terlalu
 * lebar. DEPLOY_BLOCK yang meleset ke belakang membuat backfill mengular
 * lebih jauh dari perlu; yang meleset ke depan membuat kalian KEHILANGAN
 * event pertama — dan event pertama adalah `OrderCreated`.
 *
 * Karena itu angkanya diambil dari receipt, bukan dari tebakan simulasi.
 *
 *   node scripts/record-deployment.mjs [chainId]     # bawaan: 97
 */

import {readFileSync, writeFileSync, existsSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const NAMA_JARINGAN = {97: "bsc-testnet", 56: "bsc-mainnet", 31337: "anvil"};

const chainId = Number(process.argv[2] ?? 97);
const network = NAMA_JARINGAN[chainId] ?? "unknown";

const broadcastPath = join(root, "contracts/broadcast/Deploy.s.sol", String(chainId), "run-latest.json");
const deploymentPath = join(root, "contracts/deployments", `${network}.json`);

if (!existsSync(broadcastPath)) {
  console.error("✗ Berkas broadcast tidak ada:", broadcastPath);
  console.error("  Sudah menjalankan `forge script ... --broadcast` untuk chainId", chainId, "?");
  process.exit(1);
}

const broadcast = JSON.parse(readFileSync(broadcastPath, "utf8"));

const tx = broadcast.transactions?.find(
  (t) => t.transactionType === "CREATE" && t.contractName === "JejakEscrow"
);
if (!tx) {
  console.error("✗ Tidak menemukan transaksi CREATE untuk JejakEscrow di broadcast.");
  process.exit(1);
}

const receipt = broadcast.receipts?.find((r) => r.transactionHash === tx.hash);
if (!receipt) {
  console.error("✗ Receipt untuk", tx.hash, "tidak ada. Transaksinya sudah dikonfirmasi?");
  process.exit(1);
}

const deployBlock = Number(BigInt(receipt.blockNumber));

const sebelumnya = existsSync(deploymentPath) ? JSON.parse(readFileSync(deploymentPath, "utf8")) : {};

const hasil = {
  ...sebelumnya,
  network,
  chainId,
  address: tx.contractAddress,
  deployBlock,
  deployTxHash: tx.hash,
  deployedAt: Number(broadcast.timestamp ?? Math.floor(Date.now() / 1000)),
  commit: sebelumnya.commit ?? null
};

writeFileSync(deploymentPath, JSON.stringify(hasil, null, 2) + "\n", "utf8");

console.log("Deployment dicatat:", deploymentPath);
console.log("  alamat       :", hasil.address);
console.log("  DEPLOY_BLOCK :", deployBlock, sebelumnya.deployBlock !== deployBlock ? `(dikoreksi dari ${sebelumnya.deployBlock})` : "");
console.log("  tx           :", hasil.deployTxHash);
console.log("");
console.log("Sekarang lakukan tiga hal ini, hari ini juga (§18.1):");
console.log("  1. salin DEPLOY_BLOCK ke .env kalian");
console.log("  2. node scripts/export-abi.mjs");
console.log("  3. kirim alamat + DEPLOY_BLOCK + ABI ke dua orang lain di tim");
