/**
 * Penyimpanan bukti — KD-07 (§11.7).
 *
 * Pembagian tugasnya:
 *
 *   keccak256(berkas)   → ON-CHAIN, di dalam event ProofSubmitted
 *   berkas fotonya      → IPFS (Pinata), dengan fallback jujur ke disk lokal
 *   ringkasan hasil AI  → DB + hash-nya on-chain
 *
 * Yang penting dipahami, dan yang harus diucapkan apa adanya kalau ditanya:
 * kalau Pinata tidak dipakai dan server kami mati, FOTONYA HILANG. Yang tidak
 * hilang adalah hash-nya di rantai — sehingga tidak ada pihak yang bisa
 * menyodorkan foto berbeda belakangan dan mengaku itu bukti aslinya.
 *
 * Itu klaim yang lebih kecil daripada "bukti kami permanen", dan itulah
 * sebabnya klaim ini bisa dipertahankan.
 */

import {keccak256, toHex} from "viem";
import {mkdirSync, writeFileSync, existsSync, readFileSync} from "node:fs";
import {join} from "node:path";
import {env, ROOT} from "../shared/env.js";

const DIR_UPLOAD = join(ROOT, "services/verifier/uploads");

export interface BuktiTersimpan {
  hash: `0x${string}`;
  namaBerkas: string;
  mediaType: string;
  ukuranByte: number;
  /** CID IPFS kalau berhasil diunggah, `null` kalau jatuh ke disk lokal. */
  cid: string | null;
  /** URL yang bisa dibuka orang luar. Untuk disk lokal, ini URL server kami. */
  url: string;
  penyimpanan: "ipfs" | "lokal";
}

/**
 * Hash bukti = keccak256 atas ISI BERKAS MENTAH, bukan atas base64-nya,
 * bukan atas nama berkasnya. Ini harus sama persis dengan yang dihitung
 * frontend sebelum memanggil `submitProof`, kalau tidak hash on-chain dan
 * hash berkas tidak akan pernah cocok — dan itu jenis bug yang butuh
 * setengah hari untuk ditemukan.
 */
export function hashBukti(isi: Uint8Array): `0x${string}` {
  return keccak256(toHex(isi));
}

export async function simpanBukti(
  isiBase64: string,
  namaBerkas: string,
  mediaType: string
): Promise<BuktiTersimpan> {
  const isi = Buffer.from(isiBase64, "base64");
  const hash = hashBukti(new Uint8Array(isi));

  // Nama berkas selalu diturunkan dari hash, tidak pernah dari nama kiriman.
  // Nama kiriman adalah masukan tidak tepercaya; memakainya apa adanya
  // membuka jalan path traversal (`../../.env`).
  const ekstensi = _ekstensiAman(mediaType);
  const namaAman = `${hash.slice(2)}${ekstensi}`;

  mkdirSync(DIR_UPLOAD, {recursive: true});
  writeFileSync(join(DIR_UPLOAD, namaAman), isi);

  let cid: string | null = null;
  if (env.pinataJwt) {
    try {
      cid = await _unggahPinata(isi, namaAman, mediaType);
    } catch (e) {
      console.warn("[storage] Pinata gagal, memakai disk lokal:", e instanceof Error ? e.message : e);
    }
  }

  return {
    hash,
    namaBerkas: namaAman,
    mediaType,
    ukuranByte: isi.byteLength,
    cid,
    url: cid ? `${env.pinataGateway}/ipfs/${cid}` : `/bukti/${namaAman}`,
    penyimpanan: cid ? "ipfs" : "lokal"
  };
}

export function bacaBuktiLokal(namaBerkas: string): Buffer | null {
  // Tolak apa pun yang bukan nama berkas polos.
  if (!/^[0-9a-f]{64}\.(jpg|png|webp|bin)$/.test(namaBerkas)) return null;
  const path = join(DIR_UPLOAD, namaBerkas);
  if (!existsSync(path)) return null;
  return readFileSync(path);
}

function _ekstensiAman(mediaType: string): string {
  if (mediaType === "image/jpeg") return ".jpg";
  if (mediaType === "image/png") return ".png";
  if (mediaType === "image/webp") return ".webp";
  return ".bin";
}

async function _unggahPinata(isi: Buffer, nama: string, mediaType: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(isi)], {type: mediaType}), nama);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {Authorization: `Bearer ${env.pinataJwt}`},
    body: form
  });

  if (!res.ok) throw new Error(`Pinata ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as {IpfsHash: string};
  return json.IpfsHash;
}
