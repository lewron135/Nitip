/**
 * Indexer JEJAK — daemon yang terus menyusul rantai.
 *
 *   npm run indexer
 *
 * Yang dia lakukan: backfill dari DEPLOY_BLOCK sampai blok terbaru, lalu
 * mengulang setiap `INDEXER_POLL_SECONDS` detik. Tidak ada websocket, tidak
 * ada langganan. Polling terlihat primitif, dan memang, tapi ia bertahan
 * terhadap RPC yang memutus koneksi diam-diam — dan RPC yang memutus
 * koneksi diam-diam persis yang kalian dapat di tier gratis saat demo.
 *
 * Sebelum memulai, dia menjalankan uji `eth_getLogs`. Kalau uji itu gagal,
 * dia BERHENTI dan menyuruh kalian mengganti RPC (§14.5). Indexer yang jalan
 * di atas endpoint tanpa `eth_getLogs` hanya akan diam tanpa galat, dan
 * kalian baru sadar saat profil jastiper kosong di depan juri.
 */

import {publicClient} from "../shared/chain.js";
import {cekEthGetLogs} from "../shared/chain.js";
import {assertSiapJalan, env} from "../shared/env.js";
import {susulSampai} from "./backfill.js";
import {IndexerDb} from "./db.js";

let berhenti = false;

async function main(): Promise<void> {
  assertSiapJalan();

  console.log("┌─────────────────────────────────────────────");
  console.log("│ Indexer JEJAK");
  console.log("│   chainId      :", env.chainId);
  console.log("│   kontrak      :", env.contractAddress);
  console.log("│   DEPLOY_BLOCK :", env.deployBlock.toString());
  console.log("│   RPC          :", _samarkan(env.rpcUrl));
  console.log("│   RPC cadangan :", env.rpcUrlBackup ? _samarkan(env.rpcUrlBackup) : "TIDAK ADA (§14.5 RPC-5)");
  console.log("│   basis data   :", env.dbPath);
  console.log("└─────────────────────────────────────────────");

  const uji = await cekEthGetLogs();
  console.log(uji.ok ? "✓ " + uji.pesan : "✗ " + uji.pesan);
  if (!uji.ok) process.exit(1);

  const db = new IndexerDb();

  console.log(`Mulai dari blok ${(db.lastIndexedBlock() + 1n).toString()}\n`);

  while (!berhenti) {
    try {
      const terbaru = await publicClient.getBlockNumber();
      const posisi = db.lastIndexedBlock();

      if (terbaru > posisi) {
        const jumlah = await susulSampai(db, terbaru);
        if (jumlah > 0) {
          console.log(`[${_jam()}] +${jumlah} event · posisi blok ${terbaru} · total ${db.jumlahEvent()}`);
        }
      }
    } catch (e) {
      // Satu putaran gagal bukan alasan mati. Kegagalan RPC sesaat adalah
      // hal biasa di tier gratis; yang tidak boleh adalah proses berhenti
      // dan tidak ada yang menyadarinya sampai demo.
      console.error(`[${_jam()}] putaran gagal:`, e instanceof Error ? e.message : e);
    }

    await tidur(env.pollSeconds * 1000);
  }

  db.close();
  console.log("Indexer berhenti dengan rapi.");
}

function tidur(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function _jam(): string {
  return new Date().toISOString().slice(11, 19);
}

/** Jangan pernah mencetak kunci API yang menempel di URL RPC ke log. */
function _samarkan(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 12 ? u.pathname.slice(0, 8) + "…" : u.pathname;
    return `${u.protocol}//${u.host}${path}`;
  } catch {
    return "(url tidak sah)";
  }
}

for (const sinyal of ["SIGINT", "SIGTERM"] as const) {
  process.on(sinyal, () => {
    console.log(`\n${sinyal} diterima, menutup…`);
    berhenti = true;
  });
}

await main();
