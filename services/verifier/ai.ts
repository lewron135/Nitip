/**
 * AI-1 & AI-2 — lapisan yang membuat AI di sini bukan tempelan.
 *
 * §6.3 masterplan: keluaran AI kami BUKAN teks yang ditampilkan. Keluarannya
 * adalah ANGKA YANG MENJADI JUMLAH TRANSFER. Kalau AI salah baca, uang salah
 * pindah. Itu bedanya dengan chatbot yang ditempel di pojok layar.
 *
 * Karena taruhannya uang, ada tiga pagar yang ditegakkan di berkas ini:
 *
 *   P2 — AI HANYA BOLEH MENAHAN, TIDAK PERNAH MELONGGARKAN.
 *        Keyakinan di bawah ambang → tidak mencairkan, naik ke arbiter.
 *        Tidak ada jalur di kode ini yang membuat AI menaikkan batas apa pun.
 *
 *   MOCK — tanpa AI_API_KEY, modul ini jalan dari fixture. Bukan kemewahan:
 *        seluruh alur demo harus bisa dilatih tanpa jaringan, dan `DEMO_MODE`
 *        (§19) WAJIB diuji, bukan diasumsikan.
 *
 *   Batas kerugian tetap dipaksa KONTRAK, bukan di sini. Apa pun yang terjadi
 *        pada berkas ini — bug, halusinasi, backend dibajak seluruhnya —
 *        `require(verifiedWei <= capWei)` di JejakEscrow.sol tetap berlaku.
 */

import Anthropic from "@anthropic-ai/sdk";
import {readFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {env, ROOT} from "../shared/env.js";
import {mataUangDikenal, type KodeMataUang} from "./fx.js";

const DIR_FIXTURE = join(ROOT, "services/verifier/fixtures");

// ════════════════════════════════════════════════════════════════════════
//  BENTUK KELUARAN
// ════════════════════════════════════════════════════════════════════════

export interface HasilBacaStruk {
  merchant: string | null;
  tanggal: string | null;
  mataUang: string | null;
  /** Nominal TOTAL yang dibayar. Bukan subtotal, bukan pajak, bukan diskon. */
  nominal: number | null;
  item: {nama: string; jumlah: number | null; harga: number | null}[];
  /** 0–1. Di bawah ambang → tidak mencairkan (P2). */
  keyakinan: number;
  catatan: string;
  sumber: "ai" | "mock";
}

export interface HasilCocokBarang {
  /** 0–1, seberapa cocok foto dengan deskripsi order. */
  kecocokan: number;
  /** Benar kalau foto terindikasi diambil dari katalog toko / dihasilkan mesin. */
  dicurigaiKatalog: boolean;
  alasan: string;
  sumber: "ai" | "mock";
}

// ════════════════════════════════════════════════════════════════════════
//  KLIEN
// ════════════════════════════════════════════════════════════════════════

let klien: Anthropic | null = null;

function anthropic(): Anthropic | null {
  if (!env.aiApiKey) return null;
  if (!klien) klien = new Anthropic({apiKey: env.aiApiKey});
  return klien;
}

export function modeAi(): "ai" | "mock" {
  if (env.demoMode) return "mock";
  return env.aiApiKey ? "ai" : "mock";
}

// ════════════════════════════════════════════════════════════════════════
//  AI-1 — MEMBACA STRUK MULTIBAHASA
// ════════════════════════════════════════════════════════════════════════

const SKEMA_STRUK = {
  type: "object",
  properties: {
    merchant: {type: ["string", "null"], description: "Nama toko pada struk, apa adanya."},
    tanggal: {type: ["string", "null"], description: "Tanggal transaksi, format YYYY-MM-DD."},
    mataUang: {
      type: ["string", "null"],
      description: "Kode ISO-4217: JPY, KRW, CNY, THB, USD, SGD, EUR, IDR."
    },
    nominal: {
      type: ["number", "null"],
      description:
        "TOTAL AKHIR yang dibayar pembeli, setelah pajak dan diskon. Bukan subtotal. Bukan baris pajak. Bukan kembalian."
    },
    item: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nama: {type: "string"},
          jumlah: {type: ["number", "null"]},
          harga: {type: ["number", "null"]}
        },
        required: ["nama", "jumlah", "harga"],
        additionalProperties: false
      }
    },
    keyakinan: {
      type: "number",
      description:
        "0 sampai 1. Turunkan kalau struk buram, terpotong, miring, atau kalau ada lebih dari satu angka yang mungkin adalah total."
    },
    catatan: {type: "string", description: "Satu kalimat: apa yang membuatmu ragu, kalau ada."}
  },
  required: ["merchant", "tanggal", "mataUang", "nominal", "item", "keyakinan", "catatan"],
  additionalProperties: false
} as const;

const INSTRUKSI_STRUK = `Kamu membaca foto struk belanja dari luar negeri untuk sebuah sistem escrow.
Angka yang kamu keluarkan akan menjadi jumlah uang yang benar-benar berpindah tangan.

Yang sulit dan harus kamu tangani:
- Struk termal sering miring, pudar, terpotong, atau difoto dengan tangan gemetar.
- Bahasanya bisa Jepang, Korea, Mandarin, Thailand, atau Inggris — sering bercampur.
- Satu struk memuat banyak angka: subtotal, pajak, diskon, poin, kembalian, dan total.
  Yang diminta HANYA total akhir yang benar-benar dibayar.
- Yen dan Won tidak memakai desimal. Jangan menambahkan koma desimal yang tidak ada.
- Kalau kamu melihat dua angka yang sama-sama masuk akal sebagai total, JANGAN menebak.
  Turunkan keyakinan di bawah 0,5 dan jelaskan keraguanmu di catatan.

Menurunkan keyakinan tidak merugikan siapa pun: kasus yang ragu diteruskan ke arbiter manusia.
Menebak angka yang salah memindahkan uang orang ke tempat yang salah.`;

export async function bacaStruk(gambarBase64: string, mediaType: string): Promise<HasilBacaStruk> {
  if (modeAi() === "mock") return _mockStruk();

  const client = anthropic()!;

  // `output_config.format` (structured outputs) sudah GA di API, tapi tipenya
  // belum ada di @anthropic-ai/sdk 0.71.2. Cast-nya sengaja dilokalkan ke satu
  // baris di bawah, bukan disebar sebagai `any`, supaya sisa objek tetap
  // diperiksa compiler. Hapus cast ini begitu SDK diperbarui.
  const params = {
    model: env.aiModel,
    max_tokens: 16000,
    system: INSTRUKSI_STRUK,
    output_config: {format: {type: "json_schema", schema: SKEMA_STRUK}},
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {type: "base64", media_type: mediaType, data: gambarBase64}
          },
          {type: "text", text: "Baca struk ini. Keluarkan JSON sesuai skema."}
        ]
      }
    ]
  };

  const response = await client.beta.messages.create(
    params as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming
  );

  // Penolakan keamanan bukan galat HTTP — ia datang sebagai respons sukses
  // dengan stop_reason "refusal" dan `content` kosong. Kode yang langsung
  // membaca content[0] akan pecah di sini, bukan di tempat yang jelas.
  if (response.stop_reason === "refusal") {
    return {
      merchant: null,
      tanggal: null,
      mataUang: null,
      nominal: null,
      item: [],
      keyakinan: 0,
      catatan: "Permintaan ditolak oleh pengaman model. Kasus diteruskan ke arbiter.",
      sumber: "ai"
    };
  }

  const teks = response.content.find((b) => b.type === "text");
  if (!teks || teks.type !== "text") {
    throw new Error("Respons AI-1 tidak berisi blok teks.");
  }

  const hasil = JSON.parse(teks.text) as Omit<HasilBacaStruk, "sumber">;
  return {...hasil, sumber: "ai"};
}

// ════════════════════════════════════════════════════════════════════════
//  AI-2 — MENCOCOKKAN FOTO BARANG & MENDETEKSI FOTO KATALOG
// ════════════════════════════════════════════════════════════════════════

const SKEMA_BARANG = {
  type: "object",
  properties: {
    kecocokan: {type: "number", description: "0 sampai 1, seberapa cocok foto dengan deskripsi."},
    dicurigaiKatalog: {
      type: "boolean",
      description:
        "true kalau foto tampak seperti foto produk resmi, tangkapan layar marketplace, atau gambar hasil model generatif — bukan foto yang diambil sendiri."
    },
    alasan: {type: "string", description: "Satu sampai dua kalimat, sebutkan cirinya."}
  },
  required: ["kecocokan", "dicurigaiKatalog", "alasan"],
  additionalProperties: false
} as const;

const INSTRUKSI_BARANG = `Kamu memeriksa foto barang yang diunggah seorang jastiper sebagai bukti pembelian.

Dua pertanyaan:
1. Apakah barang di foto cocok dengan deskripsi pesanan pembeli?
2. Apakah foto ini diambil sendiri, atau diambil dari katalog toko / marketplace / dibuat model generatif?

Ciri foto katalog atau generatif yang perlu kamu perhatikan:
latar putih sempurna tanpa bayangan alami, pencahayaan studio yang terlalu rata,
watermark atau elemen antarmuka marketplace, kemasan yang terlalu mulus tanpa cacat sama sekali,
teks pada kemasan yang tidak terbaca atau tidak konsisten, refleksi yang tidak masuk akal secara fisik.

Foto yang diambil sendiri biasanya punya bayangan alami, latar rumah atau meja, sedikit blur, dan sudut yang tidak sempurna.

Kamu TIDAK bisa membuktikan barangnya asli atau palsu dari foto — jangan berpura-pura bisa.
Yang kamu nilai hanya: cocok dengan deskripsi, dan tampak difoto sendiri.`;

export async function cocokkanBarang(
  gambarBase64: string,
  mediaType: string,
  deskripsiOrder: string
): Promise<HasilCocokBarang> {
  if (modeAi() === "mock") return _mockBarang();

  const client = anthropic()!;

  // Lihat catatan cast di `bacaStruk` di atas — alasannya sama persis.
  const params = {
    model: env.aiModel,
    max_tokens: 16000,
    system: INSTRUKSI_BARANG,
    output_config: {format: {type: "json_schema", schema: SKEMA_BARANG}},
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {type: "base64", media_type: mediaType, data: gambarBase64}
          },
          {type: "text", text: `Deskripsi pesanan pembeli:\n${deskripsiOrder}`}
        ]
      }
    ]
  };

  const response = await client.beta.messages.create(
    params as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming
  );

  if (response.stop_reason === "refusal") {
    return {
      kecocokan: 0,
      dicurigaiKatalog: true,
      alasan: "Permintaan ditolak oleh pengaman model. Kasus diteruskan ke arbiter.",
      sumber: "ai"
    };
  }

  const teks = response.content.find((b) => b.type === "text");
  if (!teks || teks.type !== "text") throw new Error("Respons AI-2 tidak berisi blok teks.");

  const hasil = JSON.parse(teks.text) as Omit<HasilCocokBarang, "sumber">;
  return {...hasil, sumber: "ai"};
}

// ════════════════════════════════════════════════════════════════════════
//  FIXTURE — jalur yang dipakai saat DEMO_MODE atau tanpa AI_API_KEY
// ════════════════════════════════════════════════════════════════════════

function _bacaFixture<T>(nama: string, bawaan: T): T {
  const path = join(DIR_FIXTURE, nama);
  if (!existsSync(path)) return bawaan;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return bawaan;
  }
}

function _mockStruk(): HasilBacaStruk {
  return _bacaFixture<HasilBacaStruk>("struk-jepang.json", {
    merchant: "マツモトキヨシ 新宿東口店",
    tanggal: "2026-08-14",
    mataUang: "JPY",
    nominal: 11000,
    item: [{nama: "スキンケアセット X 50ml", jumlah: 1, harga: 10000}],
    keyakinan: 0.94,
    catatan: "Struk terbaca jelas. Total ¥11.000 termasuk pajak 10%.",
    sumber: "mock"
  });
}

function _mockBarang(): HasilCocokBarang {
  return _bacaFixture<HasilCocokBarang>("barang-cocok.json", {
    kecocokan: 0.91,
    dicurigaiKatalog: false,
    alasan:
      "Foto diambil di atas meja kayu dengan bayangan alami dan sedikit blur di tepi. Kemasan cocok dengan deskripsi.",
    sumber: "mock"
  });
}

/** Fixture Skenario B — foto katalog yang harus ditolak. */
export function mockBarangKatalog(): HasilCocokBarang {
  return _bacaFixture<HasilCocokBarang>("barang-katalog.json", {
    kecocokan: 0.72,
    dicurigaiKatalog: true,
    alasan:
      "Latar putih sempurna tanpa bayangan, pencahayaan studio rata, dan ada sisa elemen antarmuka marketplace di sudut kanan bawah. Ini foto katalog, bukan foto barang di tangan.",
    sumber: "mock"
  });
}

/** Fixture struk yang membuat AI ragu — untuk melatih jalur eskalasi. */
export function mockStrukRagu(): HasilBacaStruk {
  return _bacaFixture<HasilBacaStruk>("struk-ragu.json", {
    merchant: null,
    tanggal: null,
    mataUang: "JPY",
    nominal: null,
    item: [],
    keyakinan: 0.31,
    catatan:
      "Struk terpotong di bagian bawah dan ada dua angka yang sama-sama mungkin total (¥8.800 dan ¥11.000). Tidak menebak.",
    sumber: "mock"
  });
}
