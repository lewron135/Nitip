/**
 * Tabel milik verifier, menumpang di basis data indexer yang sama.
 *
 * Dua tabel, dan keduanya sengaja OFF-CHAIN:
 *
 *   proof_bundles      berkas bukti + hash-nya
 *   verifications      alasan keputusan AI, lengkap
 *
 * Prinsip P4 — on-chain hanya untuk yang kritis. Yang masuk rantai cuma
 * `proofHash`. Alasan AI setebal dua paragraf tidak punya urusan di blok;
 * yang penting adalah alasan itu ADA, bisa dibaca arbiter, dan terikat pada
 * hash yang tidak bisa diganti belakangan.
 */

import {readFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {ROOT} from "../shared/env.js";
import type {IndexerDb} from "../indexer/db.js";
import type {KeputusanVerifikasi} from "./decision.js";
import type {BuktiTersimpan} from "./storage.js";

const DIR_UPLOAD = join(ROOT, "services/verifier/uploads");

const SKEMA = `
CREATE TABLE IF NOT EXISTS proof_bundles (
  order_id       INTEGER PRIMARY KEY,
  proof_hash     TEXT NOT NULL,
  struk_json     TEXT NOT NULL,
  barang_json    TEXT,
  deskripsi      TEXT,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verifications (
  order_id       INTEGER PRIMARY KEY,
  putusan        TEXT NOT NULL,
  alasan         TEXT NOT NULL,
  penjelasan     TEXT NOT NULL,
  verified_wei   TEXT,
  struk_json     TEXT NOT NULL,
  barang_json    TEXT,
  konversi_json  TEXT,
  tx_hash        TEXT,
  galat_tx       TEXT,
  created_at     INTEGER NOT NULL
);
`;

export function siapkanTabelVerifier(db: IndexerDb): void {
  db.db.exec(SKEMA);
}

// ─────────────────────────── bukti ───────────────────────────────────

export function simpanBundel(
  db: IndexerDb,
  orderId: number,
  proofHash: string,
  struk: BuktiTersimpan,
  barang: BuktiTersimpan | null,
  deskripsi?: string
): void {
  db.db
    .prepare(
      `INSERT INTO proof_bundles (order_id, proof_hash, struk_json, barang_json, deskripsi, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(order_id) DO UPDATE SET
         proof_hash = excluded.proof_hash,
         struk_json = excluded.struk_json,
         barang_json = excluded.barang_json,
         deskripsi = excluded.deskripsi,
         created_at = excluded.created_at`
    )
    .run(
      orderId,
      proofHash,
      JSON.stringify(struk),
      barang ? JSON.stringify(barang) : null,
      deskripsi ?? null,
      Math.floor(Date.now() / 1000)
    );
}

export interface BundelBukti {
  orderId: number;
  proofHash: string;
  deskripsi: string | null;
  struk: BuktiTersimpan & {base64: string};
  barang: (BuktiTersimpan & {base64: string}) | null;
}

export function bundelOrder(db: IndexerDb, orderId: number): BundelBukti | null {
  const row = db.db.prepare("SELECT * FROM proof_bundles WHERE order_id = ?").get(orderId) as
    | {
        order_id: number;
        proof_hash: string;
        struk_json: string;
        barang_json: string | null;
        deskripsi: string | null;
      }
    | undefined;

  if (!row) return null;

  const struk = JSON.parse(row.struk_json) as BuktiTersimpan;
  const barang = row.barang_json ? (JSON.parse(row.barang_json) as BuktiTersimpan) : null;

  return {
    orderId: row.order_id,
    proofHash: row.proof_hash,
    deskripsi: row.deskripsi,
    struk: {...struk, base64: _base64(struk.namaBerkas)},
    barang: barang ? {...barang, base64: _base64(barang.namaBerkas)} : null
  };
}

function _base64(nama: string): string {
  const path = join(DIR_UPLOAD, nama);
  if (!existsSync(path)) return "";
  return readFileSync(path).toString("base64");
}

// ─────────────────────── keputusan verifikasi ────────────────────────

export function simpanKeputusan(
  db: IndexerDb,
  orderId: number,
  k: KeputusanVerifikasi,
  txHash: string | null,
  galatTx: string | null
): void {
  db.db
    .prepare(
      `INSERT INTO verifications
         (order_id, putusan, alasan, penjelasan, verified_wei, struk_json, barang_json, konversi_json, tx_hash, galat_tx, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(order_id) DO UPDATE SET
         putusan = excluded.putusan, alasan = excluded.alasan, penjelasan = excluded.penjelasan,
         verified_wei = excluded.verified_wei, struk_json = excluded.struk_json,
         barang_json = excluded.barang_json, konversi_json = excluded.konversi_json,
         tx_hash = excluded.tx_hash, galat_tx = excluded.galat_tx, created_at = excluded.created_at`
    )
    .run(
      orderId,
      k.putusan,
      k.alasan,
      k.penjelasan,
      k.verifiedWei?.toString() ?? null,
      JSON.stringify(k.struk),
      k.barang ? JSON.stringify(k.barang) : null,
      k.konversi ? JSON.stringify({...k.konversi, wei: k.konversi.wei.toString()}) : null,
      txHash,
      galatTx,
      Math.floor(Date.now() / 1000)
    );
}

export function keputusanOrder(db: IndexerDb, orderId: number) {
  const row = db.db.prepare("SELECT * FROM verifications WHERE order_id = ?").get(orderId) as
    | Record<string, string | number | null>
    | undefined;
  if (!row) return null;

  return {
    orderId,
    putusan: row.putusan,
    alasan: row.alasan,
    penjelasan: row.penjelasan,
    verifiedWei: row.verified_wei,
    struk: JSON.parse(String(row.struk_json)),
    barang: row.barang_json ? JSON.parse(String(row.barang_json)) : null,
    konversi: row.konversi_json ? JSON.parse(String(row.konversi_json)) : null,
    txHash: row.tx_hash,
    galatTx: row.galat_tx,
    createdAt: row.created_at
  };
}
