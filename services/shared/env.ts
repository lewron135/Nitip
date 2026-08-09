/**
 * Pembacaan konfigurasi terpusat.
 *
 * Satu tempat, satu kali baca, dengan galat yang menyebut NAMA variabelnya.
 * Alasannya praktis: setengah dari waktu yang hilang di malam sebelum demo
 * habis untuk mencari variabel lingkungan yang tidak terisi, dan pesan galat
 * `undefined is not a function` tidak pernah menolong siapa pun jam 2 pagi.
 */

import {config} from "dotenv";
import {existsSync, readFileSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// .env selalu dibaca dari akar repo, bukan dari folder tempat perintah
// dijalankan — supaya `npm run indexer` dari mana pun tetap sama hasilnya.
config({path: join(ROOT, ".env"), quiet: true});

function str(nama: string, bawaan?: string): string {
  const v = process.env[nama]?.trim();
  if (v) return v;
  if (bawaan !== undefined) return bawaan;
  throw new Error(
    `Variabel lingkungan ${nama} belum diisi.\n` +
      `  Perbaiki: salin .env.example ke .env lalu isi ${nama}.\n` +
      `  Lihat §14.4 masterplan untuk arti tiap variabel.`
  );
}

function num(nama: string, bawaan?: number): number {
  const raw = process.env[nama]?.trim();
  if (!raw) {
    if (bawaan !== undefined) return bawaan;
    throw new Error(`Variabel lingkungan ${nama} belum diisi (harus angka).`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Variabel ${nama} bukan angka: "${raw}"`);
  return n;
}

function bool(nama: string, bawaan = false): boolean {
  const raw = process.env[nama]?.trim().toLowerCase();
  if (!raw) return bawaan;
  return raw === "true" || raw === "1" || raw === "yes";
}

/** Kunci privat boleh ditulis dengan atau tanpa awalan `0x`. */
function pk(nama: string): `0x${string}` | undefined {
  const raw = process.env[nama]?.trim();
  if (!raw) return undefined;
  const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`Variabel ${nama} bukan kunci privat 32 byte yang sah.`);
  }
  return hex as `0x${string}`;
}

/**
 * Alamat kontrak dan DEPLOY_BLOCK dibaca dari berkas deployment kalau ada,
 * dan .env hanya dipakai sebagai penimpa. Sumber kebenarannya tetap
 * `contracts/deployments/*.json` yang di-commit — bukan salinan di .env
 * seseorang yang mungkin tertinggal dua hari.
 */
function bacaDeployment(chainId: number): {address?: string; deployBlock?: number} {
  const nama = chainId === 97 ? "bsc-testnet" : chainId === 56 ? "bsc-mainnet" : "anvil";
  const path = join(ROOT, "contracts/deployments", `${nama}.json`);
  if (!existsSync(path)) return {};
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    return {address: j.address, deployBlock: j.deployBlock};
  } catch {
    return {};
  }
}

const chainId = num("BSC_TESTNET_CHAIN_ID", 97);
const deployment = bacaDeployment(chainId);

export const env = {
  chainId,

  rpcUrl: str("BSC_TESTNET_RPC", "https://bsc-testnet-rpc.publicnode.com"),
  rpcUrlBackup: process.env.BSC_TESTNET_RPC_BACKUP?.trim() || undefined,

  contractAddress: (process.env.CONTRACT_ADDRESS?.trim() || deployment.address || "") as `0x${string}`,

  /**
   * RPC-3 §14.5 — JANGAN PERNAH backfill dari blok 0. Penyedia RPC akan
   * memutus koneksi dan indexer kalian akan terlihat "hang" tanpa alasan.
   */
  deployBlock: BigInt(process.env.DEPLOY_BLOCK?.trim() || deployment.deployBlock || 0),

  /**
   * RPC-2 §14.5 — batas rentang `eth_getLogs`. Panduan penyedia menyebut
   * ≤5.000 blok sebelum galat `-32005 limit exceeded`; kami memakai 4.500
   * sebagai margin, bukan mepet di batas.
   */
  logPageSize: BigInt(num("LOG_PAGE_SIZE", 4500)),

  dbPath: join(ROOT, str("INDEXER_DB_PATH", "./services/data/jejak.db").replace(/^\.\//, "")),
  pollSeconds: num("INDEXER_POLL_SECONDS", 15),

  verifierPort: num("VERIFIER_PORT", 8787),
  verifierPk: pk("VERIFIER_PK"),
  arbiterPk: pk("ARBITER_PK"),

  aiApiKey: process.env.AI_API_KEY?.trim() || undefined,
  aiModel: str("AI_MODEL", "claude-opus-5"),
  aiConfidenceThreshold: num("AI_CONFIDENCE_THRESHOLD", 0.8),

  pinataJwt: process.env.PINATA_JWT?.trim() || undefined,
  pinataGateway: str("PINATA_GATEWAY", "https://gateway.pinata.cloud"),

  demoMode: bool("DEMO_MODE", false)
} as const;

/** Dipanggil saat start supaya kesalahan muncul sekarang, bukan di tengah demo. */
export function assertSiapJalan(butuhKontrak = true): void {
  const masalah: string[] = [];

  if (butuhKontrak && !env.contractAddress) {
    masalah.push(
      "CONTRACT_ADDRESS kosong dan tidak ada contracts/deployments/*.json.\n" +
        "    → deploy dulu, lalu `node scripts/record-deployment.mjs <chainId>`"
    );
  }
  if (butuhKontrak && env.deployBlock === 0n && env.chainId !== 31337) {
    masalah.push(
      "DEPLOY_BLOCK = 0 di jaringan sungguhan.\n" +
        "    → §14.5 RPC-3: backfill dari blok 0 akan ditolak penyedia RPC"
    );
  }
  if (!env.rpcUrlBackup) {
    console.warn(
      "[peringatan] BSC_TESTNET_RPC_BACKUP kosong. §14.5 RPC-5 mewajibkan RPC\n" +
        "             cadangan, dan pergantiannya dilatih — bukan diimprovisasi saat panik."
    );
  }

  if (masalah.length > 0) {
    throw new Error("Konfigurasi belum siap:\n  · " + masalah.join("\n  · "));
  }
}
