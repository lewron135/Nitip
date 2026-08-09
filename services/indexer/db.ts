/**
 * Basis data indexer.
 *
 * CATATAN PENYIMPANGAN DARI MASTERPLAN — dibaca dulu sebelum protes.
 * §14.1 menyebut `better-sqlite3`. Kami memakai `node:sqlite` bawaan Node
 * (≥22.5) karena `better-sqlite3` adalah modul native yang butuh toolchain
 * kompilasi C++ di Windows. Untuk tim tiga orang dengan tenggat tujuh
 * minggu, "npm install gagal di laptop satu orang" adalah kerugian yang
 * jauh lebih besar daripada manfaat pustaka pihak ketiga. API-nya nyaris
 * sama; kalau kalian mau kembali, yang berubah hanya berkas ini.
 *
 * ATURAN NILAI WEI: SELALU DISIMPAN SEBAGAI TEXT.
 * SQLite hanya punya bilangan bulat 64 bit. Satu tBNB = 1e18 wei masih muat,
 * tapi penjumlahan lintas order tidak dijamin muat, dan JavaScript `number`
 * kehilangan presisi di atas 2^53. Menyimpan wei sebagai angka adalah cara
 * paling halus untuk membuat skor yang "hampir benar" — dan skor yang hampir
 * benar akan berbeda dengan hasil `recompute.py` di panggung.
 */

import {DatabaseSync} from "node:sqlite";
import {mkdirSync} from "node:fs";
import {dirname} from "node:path";
import {env} from "../shared/env.js";

export interface OrderRow {
  id: number;
  buyer: string;
  jastiper: string | null;
  cap_wei: string;
  fee_wei: string;
  verified_wei: string;
  total_wei: string | null;
  status: number;
  item_hash: string;
  proof_hash: string | null;
  idr_per_bnb: string;
  created_at: number;
  accept_deadline: number;
  accepted_at: number | null;
  proof_deadline: number | null;
  verify_deadline: number | null;
  dispute_window_end: number | null;
  completed_at: number | null;
  auto_released: number | null;
  refund_reason: number | null;
  dispute_stage: number | null;
  arbiter_buyer_wei: string | null;
  arbiter_jastiper_wei: string | null;
  last_block: number;
}

export interface EventRow {
  block_number: number;
  block_time: number;
  tx_hash: string;
  log_index: number;
  name: string;
  order_id: number | null;
  actor: string | null;
  data_json: string;
}

const SKEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Salinan mentah setiap log yang pernah dibaca. Sengaja disimpan utuh:
-- kalau formula skor berubah, kami bisa menghitung ulang dari sini tanpa
-- menyentuh rantai lagi. Ini juga yang membuat indexer bisa diaudit.
CREATE TABLE IF NOT EXISTS events (
  block_number INTEGER NOT NULL,
  block_time   INTEGER NOT NULL,
  tx_hash      TEXT    NOT NULL,
  log_index    INTEGER NOT NULL,
  name         TEXT    NOT NULL,
  order_id     INTEGER,
  actor        TEXT,
  data_json    TEXT    NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_events_order ON events(order_id);
CREATE INDEX IF NOT EXISTS idx_events_name  ON events(name);
CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number);

-- Bentuk order yang sudah dirangkai dari event. Ini kenyamanan untuk
-- frontend, BUKAN sumber kebenaran. Sumber kebenarannya tetap rantai.
CREATE TABLE IF NOT EXISTS orders (
  id                   INTEGER PRIMARY KEY,
  buyer                TEXT    NOT NULL,
  jastiper             TEXT,
  cap_wei              TEXT    NOT NULL,
  fee_wei              TEXT    NOT NULL,
  verified_wei         TEXT    NOT NULL DEFAULT '0',
  total_wei            TEXT,
  status               INTEGER NOT NULL,
  item_hash            TEXT    NOT NULL,
  proof_hash           TEXT,
  idr_per_bnb          TEXT    NOT NULL DEFAULT '0',
  created_at           INTEGER NOT NULL,
  accept_deadline      INTEGER NOT NULL,
  accepted_at          INTEGER,
  proof_deadline       INTEGER,
  verify_deadline      INTEGER,
  dispute_window_end   INTEGER,
  completed_at         INTEGER,
  auto_released        INTEGER,
  refund_reason        INTEGER,
  dispute_stage        INTEGER,
  arbiter_buyer_wei    TEXT,
  arbiter_jastiper_wei TEXT,
  last_block           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orders_jastiper ON orders(jastiper);
CREATE INDEX IF NOT EXISTS idx_orders_buyer    ON orders(buyer);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
`;

export class IndexerDb {
  readonly db: DatabaseSync;

  constructor(path: string = env.dbPath) {
    mkdirSync(dirname(path), {recursive: true});
    this.db = new DatabaseSync(path);
    this.db.exec(SKEMA);
  }

  close(): void {
    this.db.close();
  }

  // ─────────────────────────── posisi baca ───────────────────────────

  /**
   * Blok terakhir yang SUDAH selesai diproses. Titik lanjut selalu
   * `lastIndexedBlock + 1`, tidak pernah blok yang sama dua kali — dan
   * tidak pernah melompat, karena satu blok terlewat berarti satu order
   * yang tidak akan pernah muncul di profil siapa pun.
   */
  lastIndexedBlock(): bigint {
    const row = this.db.prepare("SELECT value FROM meta WHERE key = 'lastIndexedBlock'").get() as
      | {value: string}
      | undefined;
    if (!row) return env.deployBlock > 0n ? env.deployBlock - 1n : 0n;
    return BigInt(row.value);
  }

  setLastIndexedBlock(n: bigint): void {
    this.db
      .prepare("INSERT INTO meta(key, value) VALUES('lastIndexedBlock', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(n.toString());
  }

  // ──────────────────────────── penulisan ────────────────────────────

  simpanEvent(e: EventRow): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO events
           (block_number, block_time, tx_hash, log_index, name, order_id, actor, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(e.block_number, e.block_time, e.tx_hash, e.log_index, e.name, e.order_id, e.actor, e.data_json);
  }

  upsertOrderBaru(o: {
    id: number;
    buyer: string;
    capWei: string;
    feeWei: string;
    itemHash: string;
    acceptDeadline: number;
    idrPerBnb: string;
    createdAt: number;
    block: number;
  }): void {
    this.db
      .prepare(
        `INSERT INTO orders
           (id, buyer, cap_wei, fee_wei, item_hash, accept_deadline, idr_per_bnb, created_at, status, last_block)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT(id) DO NOTHING`
      )
      .run(o.id, o.buyer, o.capWei, o.feeWei, o.itemHash, o.acceptDeadline, o.idrPerBnb, o.createdAt, o.block);
  }

  patchOrder(id: number, kolom: Record<string, string | number | null>, block: number): void {
    const keys = Object.keys(kolom);
    if (keys.length === 0) return;
    const set = keys.map((k) => `${k} = ?`).join(", ");
    const nilai = keys.map((k) => kolom[k] ?? null);
    this.db
      .prepare(`UPDATE orders SET ${set}, last_block = ? WHERE id = ?`)
      .run(...(nilai as (string | number | null)[]), block, id);
  }

  // ──────────────────────────── pembacaan ────────────────────────────

  order(id: number): OrderRow | undefined {
    return this.db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as unknown as OrderRow | undefined;
  }

  daftarOrder(batas = 100): OrderRow[] {
    return this.db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT ?").all(batas) as unknown as OrderRow[];
  }

  orderMilik(alamat: string, batas = 100): OrderRow[] {
    const a = alamat.toLowerCase();
    return this.db
      .prepare(
        "SELECT * FROM orders WHERE lower(buyer) = ? OR lower(jastiper) = ? ORDER BY id DESC LIMIT ?"
      )
      .all(a, a, batas) as unknown as OrderRow[];
  }

  orderBersengketa(): OrderRow[] {
    return this.db.prepare("SELECT * FROM orders WHERE status = 4 ORDER BY id ASC").all() as unknown as OrderRow[];
  }

  eventOrder(orderId: number): EventRow[] {
    return this.db
      .prepare("SELECT * FROM events WHERE order_id = ? ORDER BY block_number ASC, log_index ASC")
      .all(orderId) as unknown as EventRow[];
  }

  jumlahEvent(): number {
    const r = this.db.prepare("SELECT COUNT(*) AS n FROM events").get() as {n: number};
    return r.n;
  }

  /** Semua alamat jastiper yang pernah menerima order — untuk halaman daftar. */
  daftarJastiper(): string[] {
    const rows = this.db
      .prepare("SELECT DISTINCT jastiper FROM orders WHERE jastiper IS NOT NULL")
      .all() as {jastiper: string}[];
    return rows.map((r) => r.jastiper);
  }
}
