# MASTERPLAN — JEJAK

**Escrow Jastip dengan Reputasi Portabel**

*Indonesia Web3 Hackathon 2026 · Track: Finance & Commerce · BNB Smart Chain Testnet*

**Disusun:** 2 Agustus 2026 · **Tim:** 3 orang + Claude · **Target submission:** akhir September 2026

---

## 1. Ringkasan Eksekutif

**Satu kalimat:** JEJAK adalah escrow untuk transaksi jastip yang, sebagai hasil sampingannya, memproduksi rekam jejak jastiper yang tidak bisa dipalsukan dan tidak bisa disandera platform mana pun.

**Yang membedakan dari tim lain:** mayoritas peserta akan membangun escrow yang memakai AI untuk mencairkan dana — itu pola yang persis diajarkan di Sesi 3–6. Kami membangun **mesin reputasi yang kebetulan berbentuk escrow**. Produknya bukan perlindungan transaksi; produknya adalah bukti kepercayaan yang bisa dibawa ke mana-mana.

**Kenapa harus blockchain:** platform terpusat secara struktural tidak bisa menjanjikan "reputasimu bukan milik kami" — karena lock-in itulah satu-satunya alat tawar mereka. Tokopedia tidak akan pernah membuat rating penjualnya bisa dibawa ke Shopee.

**Peran AI:** tiga tugas berat yang menentukan uang berpindah berapa — bukan chatbot tempelan.

---

## 2. Masalah

### 2.1 Kondisi hari ini

Jastip (jasa titip beli barang dari luar negeri) berjalan sepenuhnya di DM Instagram dan WhatsApp. Pembeli mentransfer buta ke rekening pribadi jastiper, lalu menunggu. Kalau barang tidak sesuai, harganya digelembungkan, atau jastipernya menghilang — tidak ada perlindungan apa pun.

### 2.2 Kenapa sampai sekarang tidak ada platformnya

Ini pertanyaan yang lebih penting, dan jawabannya menentukan seluruh desain produk kami.

Platform jastip pernah ada dan mati. Jastiper menolak masuk platform karena tiga hal yang sama berulang:

1. **Dipotong komisi** di margin yang sudah tipis.
2. **Daftar pelanggan diambil alih** platform.
3. **Reputasi yang dibangun bertahun-tahun jadi milik platform.** Begitu keluar atau di-suspend, kembali nol.

Karena itu mereka bertahan di Instagram meski tahu itu rawan. Kesimpulannya: **masalah utamanya bukan "pembeli tidak terlindungi".**

### 2.3 Masalah yang sebenarnya

> **Reputasi jastiper tidak bisa dibuktikan kepada orang asing, dan tidak ada tempat menaruhnya yang tidak akan menyanderanya.**

Bukti kepercayaan yang beredar sekarang:

| Bentuk bukti | Biaya memalsukan |
|---|---|
| Screenshot testimoni | ~30 detik di aplikasi edit |
| Jumlah follower | Bisa dibeli per seribu |
| Lama akun aktif | Beli akun lama |
| Endorsement teman | Gratis |

Tidak ada satu pun angka yang bisa diverifikasi. Akibatnya dua sisi sama-sama rugi: jastiper jujur dengan 500 transaksi mulus tidak punya cara membuktikannya kepada pembeli baru, dan pembeli baru tidak punya cara membedakannya dari akun yang dibuat minggu lalu.

### 2.4 Kenapa harus blockchain

Dua argumen, disusun dari yang paling kuat:

**Argumen 1 — Tidak ada tuan rumah yang bisa dipercaya.**
Registry reputasi ini harus dipercaya oleh pihak-pihak yang berkompetisi memperebutkan jastiper yang sama. Setiap calon tuan rumah, cepat atau lambat, punya insentif memonetisasi lock-in-nya. Janji "reputasimu bukan di server kami" hanya bisa diucapkan kalau memang tidak ada server yang memegangnya.

**Argumen 2 — Skor reputasinya bukan klaim, tapi hasil hitungan ulang.**
Skor tidak kami simpan sebagai angka. Skor adalah **turunan dari event on-chain publik** yang siapa pun bisa hitung ulang sendiri dengan indexer mereka. Kami tidak bisa memanipulasinya bahkan kalau mau, dan itu bisa dibuktikan langsung di depan juri.

**Argumen yang sengaja TIDAK kami pakai:** "pembayaran lintas negara lebih cepat". Ini keliru secara faktual — transaksi jastip mayoritas rupiah ke rekening lokal jastipernya. Barangnya yang menyeberang, bukan uangnya. Klaim itu akan dibongkar juri.

---

## 3. Solusi

### 3.1 Prinsip desain

| # | Prinsip | Konsekuensi |
|---|---|---|
| P1 | Escrow itu mesin, reputasi itu produk | Setiap fitur harus menghasilkan sinyal reputasi |
| P2 | AI hanya boleh menahan, tidak pernah melonggarkan | Batas kontrak tidak bisa dinaikkan AI |
| P3 | Ikuti ekonomi jastip yang sebenarnya | Pencairan dua tahap, bukan sekali cair |
| P4 | On-chain hanya untuk yang kritis | Hash bukti, bukan foto; event, bukan skor |
| P5 | Satu alur mulus > lima fitur setengah jadi | Fitur di luar MVP masuk slide "ke depan" |

### 3.2 Alur end-to-end

```
1. PESAN      Pembeli buat order: barang, harga maksimum, fee jastiper,
              deadline. Dana (harga maks + fee) dikunci di kontrak.

2. TERIMA     Jastiper menerima order. Reputasi on-chain-nya terlihat
              pembeli sebelum ini terjadi.

3. BELI       Jastiper menalangi dengan uangnya sendiri, upload foto
              struk + foto barang.

4. VERIFIKASI AI membaca struk (multibahasa), mencocokkan barang,
              memeriksa keaslian foto.

5. CAIR-1     Kontrak mencairkan MODAL sebesar nominal di struk.
   (MODAL)    Dibatasi keras: tidak boleh melebihi harga maksimum.

6. KIRIM      Barang dikirim/dibawa pulang. Pembeli konfirmasi terima,
              atau masa sanggah lewat tanpa keluhan.

7. CAIR-2     Kontrak mencairkan FEE jastiper. Order tercatat selesai
   (FEE)      → menjadi satu titik di rekam jejaknya.

   SENGKETA   Kalau AI ragu atau pembeli mengajukan keberatan:
              sisa dana beku, kasus naik ke arbiter manusia.
```

### 3.3 Inti inovasi — pencairan dua tahap

Ekonomi jastip yang sebenarnya: **jastiper menalangi duluan dengan uangnya sendiri.** Yang sedang ramai bisa nombok puluhan juta. Itu beban terberat mereka, jauh lebih berat daripada risiko pembeli kabur.

Karena itu pencairan dipisah mengikuti ekonomi tersebut:

| Tahap | Kapan cair | Berapa | Yang dilindungi |
|---|---|---|---|
| **Modal** | Setelah AI memverifikasi struk | Persis nominal struk, dibatasi harga maksimum | Arus kas jastiper |
| **Fee** | Setelah konfirmasi terima / masa sanggah lewat | Fee yang disepakati di depan | Kepastian pembeli |

**Empat masalah yang selesai sekaligus:**

1. **"Dana cair sebelum barang dikirim"** — yang cair duluan hanya modal. Keuntungan jastiper masih tersandera sampai barang sampai.
2. **Markup tersembunyi** — fee jadi eksplisit dan disepakati di depan, bukan disembunyikan di selisih harga. Jastiper jujur diuntungkan karena bisa memasang tarif terang-terangan.
3. **AI jadi benar-benar diperlukan** — nominal pencairan *ditentukan* oleh hasil pembacaan struk. Bukan validasi kosmetik.
4. **Beban modal jastiper berkurang** — ini alasan komersial mereka mau pakai, di luar soal reputasi.

### 3.4 Tiga tugas AI

| # | Tugas | Output | Kenapa tidak bisa non-AI |
|---|---|---|---|
| **AI-1** | Baca struk multibahasa (Jepang, Korea, Mandarin, Thailand, Inggris) | Nominal, merchant, tanggal, item | OCR biasa gagal di struk termal miring, multi-skrip |
| **AI-2** | Cocokkan foto barang dengan pesanan + deteksi foto katalog/generatif | Skor keyakinan + alasan | Butuh pemahaman visual-semantik, bukan hash gambar |
| **AI-3** | Deteksi reputasi palsu dari grafik transaksi on-chain | Tanda klaster mencurigakan | Butuh pengenalan pola pada graf, bukan aturan tetap |

**AI-3 adalah bonus yang hanya mungkin karena on-chain.** Begitu reputasi punya nilai, orang akan memfarmnya: bikin lima wallet, transaksi bohongan sesama sendiri, kumpulkan skor. Data grafik untuk mendeteksi itu **hanya ada karena transaksinya publik.** Kalau di database sendiri, tidak akan ada apa pun untuk dianalisis.

**Pagar keras:** AI dipanggil dari backend yang punya peran `VERIFIER` di kontrak. Tapi kontrak memaksa `nominalCair <= hargaMaksimum` dan `nominalCair <= danaTerkunci - fee`. Kalau backend AI dibajak seluruhnya, kerugian maksimal tetap terkunci di angka yang ditetapkan pembeli.

### 3.5 Yang TIDAK kami klaim

Menyebut batas ini di pitch justru menaikkan kredibilitas:

- **Kami tidak menyelesaikan sybil resistance.** Kami menaikkan biaya pemalsuan reputasi, tidak menutupnya. Masalah ini belum selesai di industri.
- **Kami tidak menjamin barang asli.** Foto tidak bisa membuktikan keaslian tas atau skincare. Itu jalur arbitrase manusia.
- **AI kami bisa salah.** Karena itu AI tidak pernah memutus sendiri kasus yang meragukan — dia menahan dan menyerahkan ke manusia.
- **Cold start nyata.** Reputasi baru berguna kalau sudah banyak. Demo kami menunjukkan sistem dengan sedikit transaksi.

---

## 4. Pemetaan ke Kriteria Lomba

### 4.1 Persyaratan panitia

| Kriteria | Status | Bukti di produk |
|---|---|---|
| Tema wajib AI × Web3 | ✅ | AI menentukan nominal pencairan, bukan sekadar menampilkan teks |
| Track yang dipilih | ✅ | **Finance & Commerce** (utama), Consumer Apps (sekunder) |
| Jaringan BNB Smart Chain Testnet | ✅ | Satu kontrak `JastipEscrow` di BSC Testnet, tBNB dari faucet |
| Pola yang diajarkan (escrow → AI oracle → cair) | ✅ | Persis arsitektur kami |
| Bukan judi / prediction market | ✅ | Escrow atas pekerjaan nyata; tidak ada yang menang karena pihak lain kalah |
| Blockchain bukan tempelan | ✅ | Registry reputasi tidak punya tuan rumah yang mungkin (§2.4) |
| AI bukan tempelan | ✅ | Tiga tugas berat, satu di antaranya hanya mungkin karena on-chain |
| Scope tidak berlebihan | ✅ | Satu kontrak, tanpa kontrak saling panggil |
| Tidak menyimpan data besar/pribadi on-chain | ✅ | Hanya hash bukti; foto di penyimpanan off-chain |
| Tidak ada private key di repo | ✅ | Aturan tim, `.env` di `.gitignore` sejak commit pertama |

### 4.2 Materi workshop yang terpakai

| Sesi | Materi | Dipakai untuk |
|---|---|---|
| 1–2 | Environment, Solidity dasar | Fondasi Contract Person |
| 3–4 | Foundry, Token, Bounty Board, Security | Kontrak escrow + pengujian |
| **5** | **Reading the Chain + Indexing** | **Mesin reputasi — inti produk kami** |
| **6** | **API + AI Auto-verify** | **Pipeline verifikasi AI** |
| 7 | Frontend dApp UI | Antarmuka pembeli & jastiper |
| 8 | AI Integration + Scope Ideas | Validasi scope ke mentor |
| 9 | Pitch | Demo Day |

Sesi 5 dan 6 bukan sekadar relevan — keduanya adalah tulang punggung produk ini.

### 4.3 Yang wajib dikonfirmasi di grup peserta (SEGERA)

| # | Pertanyaan | Kenapa mendesak |
|---|---|---|
| 1 | **Eligibility tim dengan anggota di luar negeri** | Hadiah USD 5.000 kemungkinan butuh KYC/domisili. Bisa membatalkan kelayakan menang. **Prioritas tertinggi.** |
| 2 | Tanggal submission pasti | Asumsi kami akhir September, belum resmi |
| 3 | Format & tanggal Demo Day | Menentukan persiapan pitch |
| 4 | Kriteria penilaian juri | Menentukan bobot demo vs dokumen |
| 5 | Batas penggunaan AI generatif dalam pengerjaan | Menghindari diskualifikasi |

---

## 5. Product Requirements

### 5.1 Pengguna

| Persona | Kebutuhan utama | Ketakutan |
|---|---|---|
| **Pembeli** (Sinta, 26, Jakarta) | Yakin uangnya aman ke jastiper yang belum dikenal | Ditipu, barang tidak sesuai |
| **Jastiper** (Rani, 30, di Osaka) | Modal cepat balik; bisa membuktikan rekam jejaknya | Nombok, dan reputasi hangus kalau pindah platform |
| **Arbiter** (moderator komunitas) | Bukti lengkap dan ringkas untuk memutuskan | Memutuskan tanpa data cukup |

### 5.2 Functional Requirements

Prioritas: **M** = Must (masuk MVP) · **S** = Should · **C** = Could (slide "ke depan")

| ID | Requirement | Prioritas |
|---|---|---|
| F-01 | Pembeli membuat order: deskripsi barang, harga maksimum, fee, deadline | M |
| F-02 | Dana (harga maks + fee) terkunci di kontrak saat order dibuat | M |
| F-03 | Jastiper menerima order; kontrak mencatat penugasan | M |
| F-04 | Jastiper mengunggah bukti (foto struk + foto barang); hash tercatat on-chain | M |
| F-05 | AI membaca struk multibahasa dan mengeluarkan nominal terverifikasi | M |
| F-06 | AI mencocokkan foto barang dengan deskripsi pesanan | M |
| F-07 | Kontrak mencairkan modal sebesar nominal terverifikasi, dibatasi harga maksimum | M |
| F-08 | Pembeli mengonfirmasi penerimaan barang | M |
| F-09 | Kontrak mencairkan fee setelah konfirmasi atau masa sanggah lewat | M |
| F-10 | Pembeli/jastiper dapat mengajukan sengketa sebelum fee cair | M |
| F-11 | Arbiter memutuskan pembagian dana pada kasus sengketa | M |
| F-12 | Indexer membaca event dan menghitung rekam jejak jastiper | M |
| F-13 | Halaman profil publik jastiper menampilkan rekam jejak terverifikasi | M |
| F-14 | Skor dapat dihitung ulang oleh pihak ketiga dari event on-chain | M |
| F-15 | AI mendeteksi foto yang diambil dari katalog toko atau hasil generatif | S |
| F-16 | AI menandai klaster wallet dengan pola transaksi mencurigakan | S |
| F-17 | Auto-release fee setelah masa sanggah berakhir tanpa keberatan | S |
| F-18 | Badge reputasi yang bisa disematkan di bio Instagram | C |
| F-19 | Pinjaman modal kerja dengan jaminan order terkunci | C |
| F-20 | Notifikasi status order ke pengguna | C |

### 5.3 Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| N-01 | Satu kontrak escrow, tanpa kontrak saling memanggil | Wajib |
| N-02 | Foto tidak pernah tersimpan on-chain, hanya hash-nya | Wajib |
| N-03 | Data pribadi tidak pernah tersimpan on-chain | Wajib |
| N-04 | AI tidak dapat mencairkan melebihi harga maksimum, dipaksa di level kontrak | Wajib |
| N-05 | Panggilan AI hanya saat verifikasi, tidak terus-menerus (batas rate) | Wajib |
| N-06 | Demo end-to-end selesai dalam < 3 menit | Wajib |
| N-07 | Ada video demo cadangan kalau demo langsung gagal | Wajib |
| N-08 | Semua rahasia di `.env`, tidak pernah masuk Git | Wajib |
| N-09 | Cakupan pengujian kontrak untuk semua jalur dana | ≥ 80% |

### 5.4 Di luar cakupan (eksplisit)

Tidak dikerjakan sama sekali: pembayaran fiat / on-ramp, aplikasi mobile native, sistem chat internal, integrasi kurir, multi-bahasa antarmuka, akun tanpa wallet, mainnet.

---

## 6. MVP — Definisi "Selesai"

MVP dianggap selesai kalau **tiga skenario ini jalan mulus tanpa intervensi manual.**

### Skenario A — Jalur normal (90 detik)

1. Pembeli membuat order: "Skincare X, maks Rp 1.200.000, fee Rp 150.000"
2. Dana terkunci — tampil di BscScan
3. Jastiper menerima; profilnya menampilkan rekam jejak on-chain
4. Jastiper mengunggah foto struk berbahasa Jepang
5. AI membaca: nominal ¥11.000 ≈ Rp 1.150.000 → di bawah plafon
6. **Modal cair otomatis.** Fee masih terkunci
7. Pembeli mengonfirmasi terima → **fee cair**
8. Rekam jejak jastiper bertambah satu, terlihat langsung di profilnya

### Skenario B — Jalur kecurangan (45 detik)

1. Order baru, jastiper mengunggah **foto barang yang diambil dari katalog toko**
2. AI menandainya, pencairan **ditahan**
3. Kasus masuk antrean arbiter dengan ringkasan bukti dari AI
4. Arbiter memutuskan; keputusannya tercatat sebagai event

### Skenario C — Yang tidak bisa dilakukan platform lain (45 detik)

1. Buka profil jastiper — tampil rekam jejak terverifikasi
2. **Tutup frontend kami.** Jalankan skrip independen yang membaca langsung dari BSC Testnet
3. Skrip menghasilkan angka yang sama persis
4. Kalimat penutup: *"Kami tidak bisa memanipulasi angka ini bahkan kalau kami mau. Dan kalau JEJAK mati besok, reputasi ini tetap milik dia."*

> **Skenario C adalah momen yang memenangkan pitch.** Kalau waktu mepet, kerjakan C sebelum B.

### Definition of Done

- [ ] Kontrak ter-deploy di BSC Testnet, terverifikasi di BscScan
- [ ] Ketiga skenario berjalan dari frontend tanpa perintah manual di terminal
- [ ] Skor reputasi bisa dihitung ulang oleh skrip terpisah
- [ ] Video demo cadangan sudah direkam
- [ ] README berisi alamat kontrak, cara menjalankan, dan arsitektur
- [ ] Pitch 3 menit sudah dilatih minimal 5 kali

---

## 7. Arsitektur Teknis

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend   │────▶│   Backend    │────▶│   Layanan AI    │
│  Next.js    │     │   Node/API   │     │  (LLM + vision) │
│  wagmi/viem │     │              │     │                 │
└──────┬──────┘     └──────┬───────┘     └─────────────────┘
       │                   │
       │ wallet            │ peran VERIFIER
       ▼                   ▼
┌─────────────────────────────────────┐
│   JastipEscrow.sol — BSC Testnet    │
│   createOrder · acceptOrder ·       │
│   submitProof · releaseCapital ·    │
│   confirmReceipt · raiseDispute ·   │
│   resolveDispute                    │
└──────────────┬──────────────────────┘
               │ events
               ▼
       ┌───────────────┐     ┌──────────────────┐
       │    Indexer    │────▶│ Halaman Reputasi │
       │  event → DB   │     │  (publik)        │
       └───────────────┘     └──────────────────┘
```

**Stack:** Solidity + Foundry · BSC Testnet (tBNB) · Next.js + wagmi/viem + RainbowKit · Node.js untuk backend & indexer · LLM multimodal untuk verifikasi · penyimpanan foto off-chain.

**Event yang dipancarkan** (ini bahan baku reputasi):
`OrderCreated` · `OrderAccepted` · `ProofSubmitted` · `CapitalReleased` · `OrderCompleted` · `DisputeRaised` · `DisputeResolved`

**Skor reputasi tidak disimpan on-chain.** Ia diturunkan dari event di atas: jumlah order tuntas, total nilai yang pernah dipegang, rasio sengketa, rata-rata waktu penyelesaian. Siapa pun bisa menghitung ulang.

---

## 8. Pembagian Tugas

Tiga orang, masing-masing berpasangan dengan Claude.

### 8.1 Contract Person — kontrak & keamanan

**Tanggung jawab:** menulis, menguji, dan men-deploy `JastipEscrow.sol`. Menjaga logika dana dan memastikan tidak ada jalur yang bisa dikuras.

**Deliverable:** kontrak ter-deploy dan terverifikasi · test suite Foundry ≥ 80% jalur dana · dokumen alamat kontrak dan ABI.

**Di mana Claude membantu:** menyusun rangka kontrak dan test suite, menjelaskan pola security (reentrancy, access control, checks-effects-interactions), meninjau kode sebelum deploy, menerjemahkan error Foundry.

**Catatan khusus:** posisi start dari nol. Minggu pertama adalah minggu mengejar Sesi 1–4, bukan minggu produksi. Ini sudah diperhitungkan di timeline.

### 8.2 Frontend & Wallet Person — antarmuka

**Tanggung jawab:** UI pembeli dan jastiper, koneksi wallet, pemanggilan kontrak, tampilan status transaksi, dan halaman profil reputasi.

**Deliverable:** alur buat order · alur unggah bukti · halaman status order · **halaman profil reputasi publik** (ini yang akan paling banyak dilihat juri).

**Di mana Claude membantu:** kerangka komponen, integrasi wagmi/viem, penanganan status transaksi (pending/success/revert), perbaikan bug render.

### 8.3 AI & Pitch Person — verifikasi, indexer, narasi

**Tanggung jawab:** pipeline verifikasi AI, indexer pembaca event, dan seluruh narasi presentasi. Peran paling berat, sesuai kekuatan tim.

**Deliverable:** layanan AI dengan tiga tugas · indexer + API skor reputasi · **skrip perhitungan ulang independen** (bahan Skenario C) · deck dan naskah pitch · video demo cadangan.

**Di mana Claude membantu:** desain prompt untuk pembacaan struk, penanganan hasil AI yang tidak pasti, struktur indexer, dan menyusun serta mengasah naskah pitch.

### 8.4 Tugas bersama

| Tugas | Kapan | Siapa |
|---|---|---|
| Konfirmasi eligibility tim lintas negara | **Minggu ini** | Siapa pun tercepat |
| Wawancara 5 jastiper | Minggu 1 | AI & Pitch memimpin |
| Ikut Sesi 5–9 | Sesuai jadwal | Semua |
| Konsultasi ide ke mentor Dev Web3 Jogja | Minggu 2–3 | Semua |
| Latihan pitch | Minggu 7–8 | Semua |

---

## 9. Timeline

Hari ini 2 Agustus. Submission diasumsikan akhir September (**belum terkonfirmasi**).

### Minggu 1 · 2–9 Agustus — Fondasi & validasi

| Siapa | Target |
|---|---|
| Semua | Nonton rekaman Sesi 1–2. Pasang MetaMask, ambil tBNB, **deploy satu kontrak sederhana ke BSC Testnet** |
| Semua | Ikut Sesi 5 (2 Agu) dan Sesi 6 (9 Agu) |
| AI & Pitch | **Wawancara 5 jastiper.** Satu pertanyaan kunci: *"Kalau ada cara membuktikan rekam jejakmu ke pembeli baru, dan bukti itu milikmu bukan milik kami, kamu mau pakai?"* |
| Siapa pun | **Konfirmasi eligibility tim lintas negara di grup** |

> **Gerbang keputusan (9 Agustus):** kalau jastiper bilang tidak butuh, hentikan ide ini dan pindah. Lebih murah berhenti sekarang daripada minggu keempat.

### Minggu 2 · 10–16 Agustus — Kerangka

| Siapa | Target |
|---|---|
| Contract | Kejar Sesi 3–4. Tulis `JastipEscrow.sol` v1, jalan di anvil (lokal) |
| Frontend | Ikut Sesi 7 (16 Agu). Kerangka UI, koneksi wallet jalan |
| AI & Pitch | Prototipe pembacaan struk berjalan di 10 struk asing sungguhan |
| Semua | Konsultasi ide ke mentor di grup peserta |

### Minggu 3 · 17–23 Agustus — Ke testnet

| Siapa | Target |
|---|---|
| Contract | **Deploy ke BSC Testnet.** Test suite untuk semua jalur dana |
| Frontend | Buat order + kunci dana dari UI, terbukti di BscScan |
| AI & Pitch | Layanan AI jadi API. Indexer mulai membaca event |

### Minggu 4 · 24–30 Agustus — Integrasi

| Siapa | Target |
|---|---|
| Semua | **Skenario A jalan end-to-end.** Ini tonggak terpenting |
| Semua | Ikut Sesi 8 (25 Agu) — validasi scope ke mentor |
| Semua | Ikut Sesi 9 (30 Agu) — materi pitch |

> **Gerbang keputusan (30 Agustus):** kalau Skenario A belum jalan, potong F-15 dan F-16 tanpa ragu.

### Minggu 5 · 31 Agustus–6 September — Lapisan reputasi

| Siapa | Target |
|---|---|
| AI & Pitch | Halaman reputasi jalan. **Skrip perhitungan ulang independen selesai (Skenario C)** |
| Frontend | Profil publik jastiper rapi |
| Contract | Alur sengketa + arbitrase |

### Minggu 6 · 7–13 September — Jalur kecurangan & poles

| Siapa | Target |
|---|---|
| AI & Pitch | Deteksi foto katalog/generatif (F-15). **Skenario B jalan** |
| Frontend | Poles UI, tangani semua status error |
| Contract | Audit mandiri, perbaikan temuan |

### Minggu 7 · 14–20 September — Beku & rekam

| Siapa | Target |
|---|---|
| Semua | **Feature freeze 14 September.** Setelah ini hanya perbaikan bug |
| AI & Pitch | **Rekam video demo cadangan.** Deck selesai |
| Semua | Latihan pitch minimal 5 kali dengan stopwatch |

### Minggu 8 · 21–30 September — Penyangga & submission

| Siapa | Target |
|---|---|
| Semua | README, dokumentasi, submission |
| Semua | Gladi bersih Demo Day |

> Minggu 8 sengaja dikosongkan sebagai penyangga. Kalau deadline ternyata lebih awal dari asumsi, jadwal ini masih selamat.

---

## 10. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R-01 | **Tim lintas negara tidak eligible menang** | Fatal | Konfirmasi minggu ini. Kalau bermasalah, atur ulang struktur tim sekarang |
| R-02 | Contract Person tidak menyusul materi | Tinggi | Speedrun Ethereum / CryptoZombies. Gerbang keputusan 9 Agustus |
| R-03 | AI salah baca struk | Sedang | Tidak pernah full-auto. Ragu → arbiter manusia |
| R-04 | Batas rate API AI | Sedang | AI dipanggil sekali per verifikasi. Siapkan hasil cache untuk demo |
| R-05 | Demo langsung gagal | Tinggi | Video cadangan wajib direkam Minggu 7 |
| R-06 | Jastiper ternyata tidak butuh | Fatal | Wawancara di Minggu 1, sebelum menulis kode produksi |
| R-07 | Scope membengkak | Tinggi | MoSCoW dikunci. Dua gerbang keputusan di 9 & 30 Agustus |
| R-08 | Juri menolak argumen "tidak ada tuan rumah" | Sedang | Siapkan Skenario C sebagai bukti, bukan argumen retorika |
| R-09 | Kebocoran private key | Fatal | Wallet khusus testnet. `.env` di `.gitignore` sejak commit pertama |

---

## 11. Naskah Pitch — kerangka 3 menit

| Waktu | Bagian | Isi |
|---|---|---|
| 0:00–0:30 | **Masalah** | Jastip jalan di DM. Testimoni bisa diedit 30 detik. Jastiper jujur tidak bisa membuktikan apa pun |
| 0:30–1:00 | **Pertanyaan yang benar** | Kenapa belum ada platformnya? Karena setiap platform menyandera reputasi. Jastiper tahu itu |
| 1:00–2:00 | **Demo Skenario A** | Order → struk Jepang dibaca AI → modal cair → konfirmasi → fee cair |
| 2:00–2:30 | **Demo Skenario C** | Tutup frontend, hitung ulang dari chain, angka sama |
| 2:30–3:00 | **Penutup** | *"Kami tidak bisa memanipulasi angka ini bahkan kalau kami mau. Dan kalau JEJAK mati besok, reputasi ini tetap milik dia. Itu janji yang tidak bisa diucapkan platform mana pun."* |

**Kalimat pembuka cadangan kalau ditanya "kenapa blockchain":**
> "Bukan karena lebih cepat atau lebih murah. Karena registry ini harus dipercaya oleh pihak-pihak yang berebut jastiper yang sama, dan setiap tuan rumah yang mungkin punya insentif memonetisasi lock-in-nya. Termasuk kami."

---

## 12. Tiga Aturan Tim

1. Pakai wallet khusus testnet. Jangan pernah wallet berisi aset nyata.
2. Jangan pernah commit private key atau `.env` ke Git.
3. Aktif bertanya di grup peserta. Mentoring sudah termasuk program dan paling sering tidak dimanfaatkan.

---

*Dokumen ini disusun berdasarkan briefing tim, halaman resmi acara, dan hasil riset gap. Detail seperti tanggal submission dan Demo Day wajib dikonfirmasi ulang di grup peserta.*
