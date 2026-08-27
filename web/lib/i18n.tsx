"use client";

/**
 * Dwibahasa Indonesia / Inggris.
 *
 * Bahasa Indonesia adalah bawaan, karena penggunanya orang Indonesia.
 * Bahasa Inggris ada supaya juri dan mentor luar bisa menelusuri produk
 * ini sendiri, bukan hanya melihatnya dipresentasikan.
 *
 * Kamus Indonesia yang menjadi TIPE ACUAN. Menambah kunci di `id` tanpa
 * menambahkannya di `en` akan gagal saat typecheck, jadi tidak ada teks
 * yang bisa diam-diam hanya ada di satu bahasa.
 */

import {createContext, useContext, useEffect, useMemo, useSyncExternalStore} from "react";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  setLang as simpanLang,
  type Lang
} from "./lang-store";

export type {Lang};

const id = {
  nav: {
    order: "Order",
    jastiper: "Jastiper",
    reputasi: "Rekam jejak",
    hubungkan: "Hubungkan wallet",
    putuskan: "Putuskan",
    jaringanSalah: "Pindah ke BSC Testnet",
    menuBuka: "Buka menu",
    menuTutup: "Tutup menu"
  },

  umum: {
    memuat: "Memuat",
    kosong: "Belum ada apa-apa di sini",
    galat: "Gagal memuat",
    ulangi: "Coba lagi",
    demo: "Data contoh",
    demoJelas: "Indexer tidak terjangkau. Angka di layar ini contoh, bukan data rantai.",
    salin: "Salin",
    tersalin: "Tersalin",
    lihatDiExplorer: "Lihat di BscScan",
    kembali: "Kembali",
    batal: "Batal",
    lanjut: "Lanjut",
    tutup: "Tutup",
    dari: "dari",
    order: "Order",
    pembeli: "Pembeli",
    jastiper: "Jastiper",
    barang: "Barang",
    barangTidakDiingat: "Deskripsi tidak tersimpan di peramban ini",
    plafon: "Plafon modal",
    fee: "Fee jastiper",
    total: "Total dikunci",
    terverifikasi: "Nilai terverifikasi",
    kurs: "Kurs saat order dibuat",
    kursCatatan: "Catatan audit. Kontrak tidak pernah memakai angka rupiah.",
    dibuat: "Dibuat",
    tenggat: "Tenggat",
    lewat: "Lewat",
    sisa: "sisa",
    hashBukti: "Hash bukti",
    hashBarang: "Hash deskripsi barang",
    belumAda: "Belum ada",
    tenggatTerima: "Batas diterima",
    tenggatBukti: "Batas kirim bukti",
    tenggatVerifikasi: "Batas verifikasi",
    tenggatSanggah: "Masa sanggah"
  },

  status: {
    0: "Menunggu jastiper",
    1: "Sedang dibelikan",
    2: "Bukti sedang dibaca",
    3: "Modal cair, masa sanggah",
    4: "Sengketa",
    5: "Tuntas",
    6: "Dana dikembalikan",
    7: "Ditinggalkan",
    8: "Diputus arbiter"
  },

  hero: {
    judul: "Rekam jejak yang tidak bisa disandera siapa pun.",
    sub: "Escrow untuk jastip. Reputasi jastiper lahir dari event on-chain publik, dan siapa pun bisa menghitungnya ulang.",
    ctaUtama: "Lihat rekam jejak",
    ctaKedua: "Buat order",
    kartuJudul: "Order berjalan"
  },

  adegan: {
    label: "Satu order, dari uang dikunci sampai jadi reputasi",
    beat1Judul: "Dana dikunci, bukan ditransfer",
    beat1Isi:
      "Pembeli mengunci plafon modal dan fee di kontrak. Jastiper belum memegang satu wei pun, dan pembeli tidak lagi mengirim ke rekening pribadi orang asing.",
    beat2Judul: "Bukti masuk sebagai hash",
    beat2Isi:
      "Jastiper menalangi dengan uangnya sendiri, lalu mengunggah struk dan foto barang. Yang tercatat di rantai hanya hash-nya, bukan fotonya.",
    beat3Judul: "AI membaca, dan hanya boleh menahan",
    beat3Isi:
      "Verifier membaca struk multibahasa dan mencocokkan barang. Kalau ragu, ia berhenti dan menyerahkan ke arbiter manusia. Ia tidak pernah bisa melonggarkan batas.",
    beat4Judul: "Modal cair lebih dulu",
    beat4Isi:
      "Kontrak mencairkan modal sebesar nominal di struk, dibatasi keras oleh plafon yang dipasang pembeli. Fee jastiper belum ikut cair.",
    beat5Judul: "Fee cair, dan order jadi satu titik",
    beat5Isi:
      "Setelah pembeli konfirmasi atau masa sanggah 72 jam lewat, fee cair. Order tuntas itu menjadi satu titik permanen di rekam jejak jastiper, dan menaikkan plafonnya."
  },

  tier: {
    judul: "Reputasi di sini bukan lencana. Ia plafon kreditmu.",
    sub: "Rekam jejak on-chain seorang jastiper menentukan nilai order maksimum yang boleh dia terima. Batas ini dipaksa di level kontrak, bukan disarankan di antarmuka.",
    kolomTier: "Tier",
    kolomSyarat: "Syarat",
    kolomPlafon: "Plafon per order",
    syarat: ["Belum ada order tuntas", "3 order tuntas", "10 order tuntas", "30 order tuntas"],
    nama: ["Baru", "Pemula", "Mapan", "Terpercaya"],
    catatan:
      "Satu order yang ditinggalkan menurunkan tier satu tingkat. Kontrak menolak order yang melebihi plafon, berapa pun yang dikirim antarmuka."
  },

  jujur: {
    judul: "Yang tidak kami klaim",
    sub: "Setiap batas yang kami sebut lebih dulu berhenti menjadi temuan orang lain.",
    butir: [
      {
        judul: "Kami tidak menyelesaikan sybil",
        isi: "Kami menaikkan biaya memalsukan reputasi, tidak menutupnya. Masalah ini belum selesai di industri mana pun."
      },
      {
        judul: "Kami tidak menjamin barang asli",
        isi: "Foto tidak bisa membuktikan keaslian tas atau skincare. Itu jalur arbitrase manusia, bukan jalur AI."
      },
      {
        judul: "AI kami bisa salah",
        isi: "Karena itu ia tidak pernah memutus sendiri kasus meragukan. Ia menahan, lalu menyerahkannya ke manusia."
      },
      {
        judul: "Modal yang sudah cair tidak bisa ditarik",
        isi: "Kalau jastiper menyerahkan struk asli lalu menghilang, pembeli kehilangan modalnya. Plafon tier membatasi ukurannya, tidak menutup lubangnya."
      },
      {
        judul: "Reputasi terikat wallet",
        isi: "Wallet hilang berarti rekam jejak hilang. Pemulihan akun di luar cakupan versi ini."
      },
      {
        judul: "Kami menambah kerepotan",
        isi: "Pengguna harus punya wallet dan gas. Kami tidak berpura-pura ini lebih mudah daripada transfer bank."
      }
    ]
  },

  hitung: {
    judul: "Jangan percaya skor kami. Hitung sendiri.",
    sub: "Skor tidak disimpan di rantai. Ia diturunkan dari event publik, jadi siapa pun bisa menghitung ulang tanpa menyentuh kode kami. Skrip di bawah ditulis dengan bahasa yang berbeda dan tidak mengimpor satu baris pun TypeScript kami.",
    salinPerintah: "Salin perintah",
    keluaranLabel: "Keluaran yang diharapkan",
    cocok: "Angka yang sama, dihitung dua kali, oleh dua bahasa yang tidak saling kenal."
  },

  kaki: {
    kontrak: "Kontrak",
    jaringan: "Jaringan",
    spesifikasi: "Spesifikasi lengkap",
    hakCipta: "Dibangun untuk Indonesia Web3 Hackathon 2026."
  },

  daftarOrder: {
    judul: "Order",
    sub: "Order yang kamu buat dan order yang kamu kerjakan.",
    buat: "Buat order",
    kosong: "Belum ada order.",
    kosongAjak: "Buat order pertamamu, atau lihat order terbuka sebagai jastiper.",
    saringSemua: "Semua",
    saringBerjalan: "Berjalan",
    saringSelesai: "Selesai",
    sebagaiPembeli: "Sebagai pembeli",
    sebagaiJastiper: "Sebagai jastiper"
  },

  buatOrder: {
    judul: "Buat order",
    sub: "Dana dikunci di kontrak saat order dibuat, bukan dikirim ke siapa pun.",
    labelBarang: "Barang yang dititipkan",
    bantuanBarang:
      "Sedetail mungkin: merek, ukuran, jumlah. Teks ini di-hash ke rantai, dan hash itu yang dicocokkan AI dengan struk.",
    labelPlafon: "Plafon modal (tBNB)",
    bantuanPlafon:
      "Batas atas yang boleh dicairkan untuk harga barang. Kontrak menolak pencairan di atas angka ini, apa pun yang dibaca AI.",
    labelFee: "Fee jastiper (tBNB)",
    bantuanFee: "Upah jasa, disepakati di depan. Cair paling akhir, setelah barang diterima.",
    labelTenggat: "Batas waktu diterima jastiper",
    bantuanTenggat:
      "Kalau tidak ada jastiper yang menerima sampai waktu ini, siapa pun boleh mengembalikan danamu.",
    pilihTenggat: ["3 hari", "7 hari", "14 hari", "30 hari"],
    ringkas: "Yang akan dikunci",
    kirim: "Kunci dana dan buat order",
    mengirim: "Menunggu wallet",
    galatBarang: "Deskripsi barang wajib diisi.",
    galatPlafon: "Plafon modal harus lebih dari nol.",
    galatFee: "Fee jastiper harus lebih dari nol.",
    catatanIngat:
      "Deskripsi barang disimpan di peramban ini saja. Rantai hanya menyimpan hash-nya."
  },

  detailOrder: {
    garisWaktu: "Jalur order",
    bukti: "Bukti",
    buktiKosong: "Jastiper belum mengunggah bukti.",
    keputusan: "Pembacaan AI",
    keputusanKosong: "Belum ada pembacaan.",
    nominalAsing: "Nominal di struk",
    alasan: "Alasan",
    aksi: "Yang bisa kamu lakukan",
    tidakAdaAksi: "Tidak ada aksi untukmu di tahap ini.",
    siapaPun: "Aksi ini terbuka untuk siapa pun",
    siapaPunJelas:
      "Fungsi ini tidak punya pembatas peran. Dana tidak boleh bergantung pada tim JEJAK masih hidup.",
    terima: "Terima order ini",
    unggah: "Unggah bukti",
    konfirmasi: "Konfirmasi barang diterima",
    sengketa: "Ajukan keberatan",
    banding: "Ajukan banding",
    batalkan: "Batalkan order",
    kedaluwarsa: "Kembalikan dana (tenggat lewat)",
    tinggalkan: "Tandai ditinggalkan",
    eskalasi: "Eskalasi ke arbiter",
    cairkanFee: "Cairkan fee otomatis",
    tarik: "Tarik dana",
    tarikJelas: "Dana yang jadi hakmu menunggu di kontrak sampai kamu menariknya sendiri."
  },

  unggahBukti: {
    judul: "Unggah bukti",
    sub: "Server menyimpan berkas dan mengembalikan hash. Kamu yang mengirim hash itu ke rantai dari wallet-mu, bukan server.",
    struk: "Foto struk",
    strukWajib: "Wajib",
    barang: "Foto barang",
    barangOpsional: "Opsional",
    pilihBerkas: "Pilih berkas",
    unggahDulu: "Unggah dan ambil hash",
    kirimKeRantai: "Kirim hash ke rantai",
    hashSiap: "Hash bukti siap dikirim",
    galatStruk: "Foto struk wajib diunggah."
  },

  jastiperHal: {
    judul: "Order terbuka",
    sub: "Order yang belum punya jastiper. Kontrak menolak order yang melebihi plafon tier-mu.",
    plafonmu: "Plafonmu saat ini",
    tiermu: "Tier",
    diLuarPlafon: "Di luar plafonmu",
    diLuarPlafonJelas:
      "Order ini melebihi plafon tier-mu. Selesaikan order yang lebih kecil untuk menaikkannya.",
    kosong: "Tidak ada order terbuka saat ini.",
    daftarJastiper: "Jastiper terdaftar",
    hubungkanDulu: "Hubungkan wallet untuk melihat plafonmu."
  },

  reputasi: {
    judul: "Rekam jejak",
    versi: "JEJAK-TRUST v1.0",
    belumCukup: "Skor belum ditampilkan",
    belumCukupJelas:
      "Skor baru muncul setelah 3 order tuntas. Menampilkan angka di bawah itu akan menyesatkan, jadi kami tidak menampilkannya sama sekali.",
    tuntasDari: "order tuntas dari {n} diterima",
    pembeliBerbeda: "pembeli berbeda",
    pembeliBerbedaJelas: "Metrik anti-farming utama",
    sengketaKalah: "sengketa kalah",
    ditinggalkan: "ditinggalkan",
    totalNilai: "Total nilai pernah dipegang",
    median: "Median waktu penyelesaian",
    komponen: "Komponen skor",
    komponenNama: {
      comp: "Penuntasan",
      disp: "Sengketa",
      vol: "Volume",
      spd: "Kecepatan",
      div: "Keragaman pembeli"
    },
    riwayat: "Order",
    plafonSaatIni: "Plafon per order saat ini",
    hitungSendiri: "Hitung ulang skor ini sendiri"
  },

  wallet: {
    hubungkan: "Hubungkan wallet",
    hubungkanJelas: "Butuh wallet untuk menandatangani. JEJAK tidak pernah menandatangani untukmu.",
    tidakAdaWallet: "Tidak ada wallet terpasang di peramban ini.",
    memproses: "Menunggu tanda tangan",
    dikirim: "Transaksi dikirim",
    berhasil: "Berhasil",
    gagal: "Transaksi gagal",
    ditolak: "Kamu menolak transaksi di wallet.",
    jaringanSalah: "Wallet-mu tidak di BSC Testnet.",
    pindahJaringan: "Pindah jaringan"
  }
};

/**
 * Tipe acuan. `en` wajib punya BENTUK yang sama persis.
 *
 * Sengaja tanpa `as const`: dengan `as const`, setiap teks Indonesia
 * menjadi tipe literalnya sendiri, dan terjemahan Inggris apa pun ditolak
 * karena bukan literal yang sama. Yang ditegakkan di sini himpunan
 * kuncinya, bukan isinya.
 */
type Kamus = typeof id;

const en: Kamus = {
  nav: {
    order: "Orders",
    jastiper: "Shoppers",
    reputasi: "Track record",
    hubungkan: "Connect wallet",
    putuskan: "Disconnect",
    jaringanSalah: "Switch to BSC Testnet",
    menuBuka: "Open menu",
    menuTutup: "Close menu"
  },

  umum: {
    memuat: "Loading",
    kosong: "Nothing here yet",
    galat: "Could not load",
    ulangi: "Try again",
    demo: "Sample data",
    demoJelas: "The indexer is unreachable. These numbers are samples, not chain data.",
    salin: "Copy",
    tersalin: "Copied",
    lihatDiExplorer: "View on BscScan",
    kembali: "Back",
    batal: "Cancel",
    lanjut: "Continue",
    tutup: "Close",
    dari: "of",
    order: "Order",
    pembeli: "Buyer",
    jastiper: "Shopper",
    barang: "Item",
    barangTidakDiingat: "Description is not stored in this browser",
    plafon: "Capital cap",
    fee: "Shopper fee",
    total: "Total locked",
    terverifikasi: "Verified amount",
    kurs: "Rate when the order was created",
    kursCatatan: "Audit note. The contract never uses the rupiah figure.",
    dibuat: "Created",
    tenggat: "Deadline",
    lewat: "Passed",
    sisa: "left",
    hashBukti: "Proof hash",
    hashBarang: "Item description hash",
    belumAda: "Not yet",
    tenggatTerima: "Accept by",
    tenggatBukti: "Proof due",
    tenggatVerifikasi: "Verification due",
    tenggatSanggah: "Dispute window"
  },

  status: {
    0: "Waiting for a shopper",
    1: "Being bought",
    2: "Proof under review",
    3: "Capital released, dispute window",
    4: "Disputed",
    5: "Completed",
    6: "Refunded",
    7: "Abandoned",
    8: "Settled by arbiter"
  },

  hero: {
    judul: "A track record no platform can hold hostage.",
    sub: "Escrow for personal-shopping orders. A shopper's reputation comes from public on-chain events, and anyone can recompute it.",
    ctaUtama: "See a track record",
    ctaKedua: "Create an order",
    kartuJudul: "Order in progress"
  },

  adegan: {
    label: "One order, from locked money to reputation",
    beat1Judul: "Funds are locked, not transferred",
    beat1Isi:
      "The buyer locks the capital cap and the fee in the contract. The shopper holds nothing yet, and the buyer is no longer wiring money to a stranger's personal account.",
    beat2Judul: "Proof arrives as a hash",
    beat2Isi:
      "The shopper fronts the money, then uploads the receipt and a photo of the item. Only the hash goes on chain, never the photo.",
    beat3Judul: "AI reads it, and may only withhold",
    beat3Isi:
      "The verifier reads receipts in any language and matches the item. When unsure it stops and hands the case to a human arbiter. It can never loosen a limit.",
    beat4Judul: "Capital is released first",
    beat4Isi:
      "The contract releases capital up to the amount on the receipt, hard-capped by the limit the buyer set. The shopper's fee stays locked.",
    beat5Judul: "The fee clears, and the order becomes a data point",
    beat5Isi:
      "Once the buyer confirms or the 72-hour window lapses, the fee clears. That completed order becomes a permanent point in the shopper's record and raises their limit."
  },

  tier: {
    judul: "Reputation here is not a badge. It is your credit limit.",
    sub: "A shopper's on-chain record sets the largest order they are allowed to accept. The contract enforces that ceiling; the interface only reports it.",
    kolomTier: "Tier",
    kolomSyarat: "Requirement",
    kolomPlafon: "Limit per order",
    syarat: ["No completed orders", "3 completed orders", "10 completed orders", "30 completed orders"],
    nama: ["New", "Starter", "Established", "Trusted"],
    catatan:
      "One abandoned order drops the tier by one. The contract rejects orders above the limit no matter what the interface sends."
  },

  jujur: {
    judul: "What we do not claim",
    sub: "Every limit we name first stops being someone else's discovery.",
    butir: [
      {
        judul: "We have not solved sybil",
        isi: "We raise the cost of faking a reputation. We do not close it. Nobody in the industry has."
      },
      {
        judul: "We do not guarantee authenticity",
        isi: "A photo cannot prove a bag or a serum is genuine. That is the human arbitration path, not the AI path."
      },
      {
        judul: "Our AI can be wrong",
        isi: "That is why it never decides a doubtful case alone. It withholds, then hands the case to a person."
      },
      {
        judul: "Released capital cannot be clawed back",
        isi: "If a shopper submits a real receipt and then disappears, the buyer loses that capital. Tier limits bound the size; they do not close the hole."
      },
      {
        judul: "Reputation is bound to a wallet",
        isi: "Lose the wallet and the record goes with it. Account recovery is out of scope for this version."
      },
      {
        judul: "We add friction, not remove it",
        isi: "Users need a wallet and gas. We are not pretending this is easier than a bank transfer."
      }
    ]
  },

  hitung: {
    judul: "Do not trust our score. Recompute it.",
    sub: "The score is not stored on chain. It is derived from public events, so anyone can recompute it without touching our code. The script below is written in a different language and imports none of our TypeScript.",
    salinPerintah: "Copy command",
    keluaranLabel: "Expected output",
    cocok: "The same number, computed twice, by two languages that share no code."
  },

  kaki: {
    kontrak: "Contract",
    jaringan: "Network",
    spesifikasi: "Full specification",
    hakCipta: "Built for the Indonesia Web3 Hackathon 2026."
  },

  daftarOrder: {
    judul: "Orders",
    sub: "Orders you created and orders you are working on.",
    buat: "Create order",
    kosong: "No orders yet.",
    kosongAjak: "Create your first order, or browse open orders as a shopper.",
    saringSemua: "All",
    saringBerjalan: "Active",
    saringSelesai: "Closed",
    sebagaiPembeli: "As buyer",
    sebagaiJastiper: "As shopper"
  },

  buatOrder: {
    judul: "Create order",
    sub: "Funds are locked in the contract when the order is created, not sent to anyone.",
    labelBarang: "What you want bought",
    bantuanBarang:
      "Be specific: brand, size, quantity. This text is hashed on chain, and that hash is what the AI matches against the receipt.",
    labelPlafon: "Capital cap (tBNB)",
    bantuanPlafon:
      "The ceiling that may be released for the item price. The contract refuses anything above it, whatever the AI reads.",
    labelFee: "Shopper fee (tBNB)",
    bantuanFee: "The service fee, agreed up front. It clears last, after the item arrives.",
    labelTenggat: "Deadline for a shopper to accept",
    bantuanTenggat: "If nobody accepts by then, anyone can return your funds to you.",
    pilihTenggat: ["3 days", "7 days", "14 days", "30 days"],
    ringkas: "What gets locked",
    kirim: "Lock funds and create order",
    mengirim: "Waiting for wallet",
    galatBarang: "An item description is required.",
    galatPlafon: "The capital cap must be greater than zero.",
    galatFee: "The shopper fee must be greater than zero.",
    catatanIngat: "The item description stays in this browser only. The chain stores just its hash."
  },

  detailOrder: {
    garisWaktu: "Order path",
    bukti: "Proof",
    buktiKosong: "The shopper has not uploaded proof yet.",
    keputusan: "AI reading",
    keputusanKosong: "No reading yet.",
    nominalAsing: "Amount on the receipt",
    alasan: "Reasoning",
    aksi: "What you can do",
    tidakAdaAksi: "Nothing for you to do at this stage.",
    siapaPun: "Anyone may call this",
    siapaPunJelas:
      "This function has no role check. Funds must never depend on the JEJAK team staying alive.",
    terima: "Accept this order",
    unggah: "Upload proof",
    konfirmasi: "Confirm the item arrived",
    sengketa: "Raise an objection",
    banding: "Appeal",
    batalkan: "Cancel order",
    kedaluwarsa: "Return funds (deadline passed)",
    tinggalkan: "Mark as abandoned",
    eskalasi: "Escalate to arbiter",
    cairkanFee: "Release fee automatically",
    tarik: "Withdraw",
    tarikJelas: "Funds owed to you wait in the contract until you withdraw them yourself."
  },

  unggahBukti: {
    judul: "Upload proof",
    sub: "The server stores the files and returns a hash. You send that hash to the chain from your own wallet, not the server.",
    struk: "Receipt photo",
    strukWajib: "Required",
    barang: "Item photo",
    barangOpsional: "Optional",
    pilihBerkas: "Choose file",
    unggahDulu: "Upload and get hash",
    kirimKeRantai: "Send hash to chain",
    hashSiap: "Proof hash ready to send",
    galatStruk: "A receipt photo is required."
  },

  jastiperHal: {
    judul: "Open orders",
    sub: "Orders without a shopper yet. The contract refuses any order above your tier limit.",
    plafonmu: "Your current limit",
    tiermu: "Tier",
    diLuarPlafon: "Above your limit",
    diLuarPlafonJelas:
      "This order exceeds your tier limit. Complete smaller orders to raise it.",
    kosong: "No open orders right now.",
    daftarJastiper: "Registered shoppers",
    hubungkanDulu: "Connect a wallet to see your limit."
  },

  reputasi: {
    judul: "Track record",
    versi: "JEJAK-TRUST v1.0",
    belumCukup: "Score not shown yet",
    belumCukupJelas:
      "The score appears after 3 completed orders. Showing a number below that would mislead, so we show none at all.",
    tuntasDari: "orders completed of {n} accepted",
    pembeliBerbeda: "distinct buyers",
    pembeliBerbedaJelas: "The main anti-farming metric",
    sengketaKalah: "disputes lost",
    ditinggalkan: "abandoned",
    totalNilai: "Total value ever held",
    median: "Median time to completion",
    komponen: "Score components",
    komponenNama: {
      comp: "Completion",
      disp: "Disputes",
      vol: "Volume",
      spd: "Speed",
      div: "Buyer diversity"
    },
    riwayat: "Orders",
    plafonSaatIni: "Current limit per order",
    hitungSendiri: "Recompute this score yourself"
  },

  wallet: {
    hubungkan: "Connect wallet",
    hubungkanJelas: "Signing needs a wallet. JEJAK never signs on your behalf.",
    tidakAdaWallet: "No wallet is installed in this browser.",
    memproses: "Waiting for signature",
    dikirim: "Transaction sent",
    berhasil: "Confirmed",
    gagal: "Transaction failed",
    ditolak: "You rejected the transaction in your wallet.",
    jaringanSalah: "Your wallet is not on BSC Testnet.",
    pindahJaringan: "Switch network"
  }
};

const KAMUS: Record<Lang, Kamus> = {id, en};

interface Nilai {
  lang: Lang;
  t: Kamus;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const Ctx = createContext<Nilai | null>(null);

export function I18nProvider({children}: {children: React.ReactNode}) {
  // Bahasa dibaca dari penyimpanan sebagai sumber di luar React. Server
  // selalu mengembalikan "id", jadi render pertama di klien cocok dan
  // tidak ada hidrasi yang bentrok.
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const nilai = useMemo<Nilai>(
    () => ({
      lang,
      t: KAMUS[lang],
      setLang: simpanLang,
      toggle: () => simpanLang(lang === "id" ? "en" : "id")
    }),
    [lang]
  );

  return <Ctx.Provider value={nilai}>{children}</Ctx.Provider>;
}

export function useI18n(): Nilai {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n dipakai di luar <I18nProvider>.");
  return v;
}

/** Locale untuk `toLocaleString`, mengikuti bahasa aktif. */
export function localeOf(lang: Lang): string {
  return lang === "id" ? "id-ID" : "en-GB";
}
