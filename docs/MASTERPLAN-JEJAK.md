# MASTERPLAN — JEJAK v3.0

**Escrow Jastip dengan Reputasi Portabel**
*Indonesia Web3 Hackathon 2026 · Track: Finance & Commerce · BNB Smart Chain Testnet*

| | |
|---|---|
| **Versi** | 3.0 — **dokumen mandiri.** Tidak butuh v1.0 atau v2.0 untuk dibaca |
| **Disusun** | 9 Agustus 2026 |
| **Baseline timeline** | 9 Agustus 2026 |
| **Tim** | 3 orang + Claude |
| **Repo** | `lewron135/Nitip` → **harus di-rename ke `jejak`** |
| **Riwayat** | v1.0 (2 Agu) narasi produk · v2.0 (9 Agu) audit teknis · **v3.0 gabungan lengkap + latar belakang, rumusan masalah, tujuan, justifikasi** |

---

## DAFTAR ISI

**BAGIAN I — KENAPA (untuk semua orang, termasuk juri)**
1. Latar Belakang
2. Rumusan Masalah
3. Tujuan & Manfaat
4. Batasan Masalah & Asumsi
5. Analisis Solusi yang Sudah Ada
6. Justifikasi Setiap Keputusan Besar
7. Prinsip Desain

**BAGIAN II — APA (produk & desain)**
8. Ringkasan Solusi
9. Hasil Audit v1.0
10. Penilaian Diri Sebagai Juri
11. Keputusan Desain (KD-01…KD-07)

**BAGIAN III — BAGAIMANA (teknis, untuk yang mengerjakan)**
12. Spesifikasi Kontrak
13. Spesifikasi Skor `JEJAK-TRUST v1.0`
14. Stack Teknis & Perintah
15. Rencana Pengujian
16. Requirements (MoSCoW)

**BAGIAN IV — KAPAN & SIAPA (eksekusi)**
17. Timeline
18. Checklist Per Orang
19. Runbook Demo Day
20. Pitch & Tanya-Jawab Juri
21. Risiko
22. Yang Belum Diketahui
23. Aturan Tim

**LAMPIRAN**
A. Glosarium
B. Ringkasan Perubahan v1 → v3
C. Daftar Periksa Submission
D. Daftar Sumber

---

## 0. Cara Pakai Dokumen Ini

**Anggota tim baru / mentor / juri:** baca Bagian I saja (§1–§7). Itu menjawab "kenapa ini ada dan kenapa harus begini".

**Contract Person:** §11 (keputusan desain), §12 (spesifikasi kontrak — ini yang kamu implementasikan, jangan improvisasi), §15 (tes), §18.1 (checklist harianmu).

**Frontend Person:** §12.4 (skema event = sumber data UI), §13.4 (aturan tampilan skor), §14 (stack + perintah), §18.2.

**AI & Pitch Person:** semuanya. §13 adalah kontrak API-mu dengan frontend. §20 adalah senjatamu di panggung.

### Legenda tanda kepercayaan

Setiap klaim faktual di dokumen ini diberi tanda. Ini bukan hiasan — ini yang membedakan dokumen yang bisa dipertahankan di depan juri dari dokumen yang bisa dibongkar.

| Tanda | Arti |
|---|---|
| `[Terverifikasi]` | Dicek ke sumber pada 9 Agustus 2026. Sumber ada di Lampiran D |
| `[Keputusan]` | Pilihan desain tim. Bukan fakta eksternal. Boleh diperdebatkan, tapi harus konsisten |
| `[Asumsi]` | Dipercaya benar tapi belum diuji. Harus divalidasi sebelum dipakai di pitch |
| `[Belum diketahui]` | **Tidak boleh diisi tebakan. Tidak boleh masuk deck.** Harus dicari jawabannya |

**Aturan keras:** kalau ada anggota tim menambahkan angka ke dokumen ini tanpa tanda dan tanpa sumber, angka itu dihapus. Juri hackathon rutin membongkar angka yang tidak bisa dipertanggungjawabkan, dan satu angka karangan menghapus kredibilitas seluruh presentasi.

---

# BAGIAN I — KENAPA

## 1. Latar Belakang

### 1.1 Apa itu jastip

**Jastip** (jasa titip) adalah layanan membelikan barang untuk orang lain dengan imbalan biaya jasa. `[Terverifikasi]` Model usahanya berkembang pesat di Indonesia karena modal awal kecil dan bisa dijalankan hanya bermodal ponsel dan jaringan media sosial.

Bentuknya bermacam-macam:

| Jenis | Contoh | Ciri |
|---|---|---|
| **Jastip luar negeri** | Skincare Korea, obat Jepang, tas Eropa | Barang menyeberang negara; selisih harga & ketersediaan jadi nilai jualnya |
| **Jastip event** | Tiket konser, merchandise, PRJ, bazar | Kelangkaan waktu; risiko penipuan tertinggi |
| **Jastip daerah** | Oleh-oleh khas, produk lokal antar-provinsi | Volume besar, nilai per transaksi kecil |

**Fokus JEJAK adalah jastip luar negeri**, karena di situ nilai transaksi per order paling besar, beban modal jastiper paling berat, dan kerugian saat gagal paling menyakitkan.

### 1.2 Bagaimana jastip berjalan hari ini

Alurnya, dari wawancara awal dan pengamatan publik di Instagram/WhatsApp:

```
1. Jastiper posting: "OPEN JASTIP JEPANG, close 20 Agustus"  → Instagram Story
2. Pembeli DM: "kak mau titip skincare X, budget 1,2jt"
3. Jastiper: "oke, transfer dulu ya ke rekening BCA xxx"
4. Pembeli TRANSFER BUTA ke rekening pribadi orang yang belum pernah ditemuinya
5. ... menunggu, tanpa jaminan apa pun ...
6. (semoga) barang datang
```

**Titik gagalnya ada di langkah 4.** Tidak ada pihak ketiga, tidak ada perjanjian tertulis, tidak ada mekanisme banding. Kalau jastipernya menghilang, satu-satunya jalan pembeli adalah lapor polisi untuk kerugian yang sering kali tidak sebanding dengan biaya dan waktu mengurusnya.

**Dan sebaliknya**, yang sering dilupakan: jastiper juga menanggung risiko berat. Dia **menalangi barang dengan uangnya sendiri** — jastiper yang sedang ramai bisa nombok puluhan juta rupiah sebelum satu rupiah pun masuk. Kalau pembeli membatalkan setelah barang dibeli, barang itu jadi tanggungannya.

### 1.3 Skala masalah — data

**Yang bisa diverifikasi:**

| Data | Angka | Sumber & tanda |
|---|---|---|
| Kerugian penipuan online Indonesia, Nov 2024 – Nov 2025 | **Rp 7,9 triliun** (± USD 474 juta), menurut OJK | `[Terverifikasi]` Jakarta Globe |
| Kerugian penipuan online Indonesia (laporan lain, Feb 2026) | **Rp 9,1 triliun** | `[Terverifikasi]` The Jakarta Post — **periode dan metodologi berbeda dari OJK; jangan campur kedua angka ini** |
| Penipuan belanja online = jenis penipuan **paling sering dilaporkan** | **53.928 kasus**, kerugian **Rp 988 miliar** | `[Terverifikasi]` Databoks/Katadata |
| Kerugian rata-rata per korban penipuan belanja online | **Rp 18,3 juta** | `[Terverifikasi]` Databoks/Katadata |
| Orang dewasa Indonesia yang mengalami penipuan dalam 12 bulan terakhir | **35%**, dan **62%** dari itu adalah penipuan belanja online | `[Terverifikasi]` Global Anti-Scam Alliance 2025 |
| Laporan penipuan jual-beli online (kumulatif 2017–2024) | **>528.000 laporan** | `[Terverifikasi]` Kominfo |
| Contoh kasus jastip: penipuan tiket konser | **60 korban, Rp 200 juta** (2023) | `[Terverifikasi]` pemberitaan |
| Regulasi khusus jastip | **Minim**, menyebabkan kerentanan penipuan dan wanprestasi | `[Terverifikasi]` jurnal hukum (Zaaken/Unja, Vidhisastya) |

**Yang TIDAK diketahui dan tidak boleh dikarang:**

| Data | Status |
|---|---|
| Jumlah pelaku jastip aktif di Indonesia | `[Belum diketahui]` — BPS tidak menerbitkan kategori ini |
| Total nilai transaksi jastip per tahun | `[Belum diketahui]` — tidak ada riset industri publik yang ditemukan |
| Persentase transaksi jastip yang berakhir penipuan | `[Belum diketahui]` |
| Berapa jastiper yang mau pindah dari Instagram | `[Belum diketahui]` — **inilah yang dijawab wawancara Minggu 1** |

> **Instruksi pitch:** angka Rp 18,3 juta per korban adalah angka terkuat kalian, karena itu **kerugian rata-rata satu orang** — bukan angka triliunan yang terasa abstrak. Pakai itu. Jangan pernah mengarang angka "pasar jastip Rp X triliun"; kalau ditanya besar pasarnya, jawab jujur: *"tidak ada data resminya, dan kami tidak mau mengarang. Yang kami punya adalah lima wawancara langsung."* Jawaban itu lebih kuat daripada angka palsu.

### 1.4 Kenapa masalah ini layak dikerjakan sekarang

1. **Kerugiannya nyata dan terukur** — Rp 18,3 juta rata-rata per korban penipuan belanja online. `[Terverifikasi]`
2. **Regulasinya belum menutupi** — jurnal hukum Indonesia secara konsisten menyebut kekosongan perlindungan pada transaksi jastip. `[Terverifikasi]`
3. **Solusi yang ada tidak menyentuh jastip** — rekber dan escrow marketplace sudah matang, tapi jastip tidak terjadi di marketplace (§5).
4. **Ada teknologi yang baru sekarang bisa dipakai** — model AI multimodal yang bisa membaca struk termal berbahasa Jepang dengan andal adalah kemampuan yang baru praktis beberapa tahun terakhir. `[Asumsi]` — dibuktikan sendiri di Minggu 2 dengan 10 struk asli.

---

## 2. Rumusan Masalah

### 2.1 Kondisi saat ini

Jastip berjalan sepenuhnya di DM Instagram dan WhatsApp. Pembeli mentransfer buta ke rekening pribadi jastiper, lalu menunggu. Kalau barang tidak sesuai, harganya digelembungkan, atau jastipernya menghilang — tidak ada perlindungan apa pun.

### 2.2 Pertanyaan yang lebih penting: kenapa sampai sekarang tidak ada platformnya?

**Ini pertanyaan kunci seluruh proyek, dan jawabannya menentukan seluruh desain produk.** Kalau masalahnya sesederhana "pembeli tidak terlindungi", platform jastip sudah pasti ada dan sudah pasti besar — karena membangun escrow itu tidak sulit.

Platform jastip pernah ada dan mati. Jastiper menolak masuk platform karena tiga hal yang sama berulang:

| # | Alasan | Konsekuensi bagi jastiper |
|---|---|---|
| 1 | **Dipotong komisi** | Margin jastip sudah tipis; potongan platform memakannya |
| 2 | **Daftar pelanggan diambil alih platform** | Pelanggan jadi milik platform, bukan miliknya |
| 3 | **Reputasi yang dibangun bertahun-tahun jadi milik platform** | Begitu keluar atau di-suspend, **kembali nol** |

Karena itu mereka bertahan di Instagram meski tahu itu rawan. Instagram tidak memotong komisi, tidak menyembunyikan daftar pelanggannya, dan followers-nya terasa miliknya.

**Kesimpulan yang mengubah segalanya:** masalah utamanya **bukan** "pembeli tidak terlindungi". Kalau itu masalahnya, escrow saja sudah cukup, dan escrow sudah ada di mana-mana (§5). Masalah utamanya ada di sisi jastiper, dan selama sisi itu tidak dijawab, tidak akan ada pasokan di platform mana pun.

### 2.3 Rumusan masalah formal

> **RM-Utama:** Reputasi jastiper tidak bisa dibuktikan kepada orang asing, dan tidak ada tempat menaruhnya yang tidak akan menyanderanya.

Diuraikan menjadi lima rumusan yang bisa dikerjakan:

| ID | Rumusan masalah | Terukur dari |
|---|---|---|
| **RM-1** | Bukti kepercayaan yang beredar sekarang bisa dipalsukan dengan biaya mendekati nol (tabel §2.4) | Biaya memalsukan tiap bentuk bukti |
| **RM-2** | Setiap platform yang mungkin menampung reputasi punya insentif struktural untuk menyanderanya | Tidak ada platform yang pernah membiarkan ratingnya dibawa keluar |
| **RM-3** | Pembeli tidak punya cara membedakan jastiper 500 transaksi mulus dari akun yang dibuat minggu lalu | Kerugian rata-rata Rp 18,3 juta per korban `[Terverifikasi]` |
| **RM-4** | Jastiper menanggung seluruh beban modal talangan tanpa mekanisme pencairan bertahap | Wawancara Minggu 1 `[Belum diketahui]` |
| **RM-5** | Tidak ada mekanisme penyelesaian sengketa yang lebih murah daripada lapor polisi | Regulasi jastip minim `[Terverifikasi]` |

### 2.4 Biaya memalsukan bukti kepercayaan yang ada sekarang

Tabel ini adalah inti RM-1 dan slide paling kuat di pitch:

| Bentuk bukti | Biaya memalsukan | Bisa diverifikasi? |
|---|---|---|
| Screenshot testimoni | ~30 detik di aplikasi edit | Tidak |
| Jumlah follower | Bisa dibeli per seribu | Tidak |
| Lama akun aktif | Beli akun lama | Tidak |
| Endorsement teman | Gratis | Tidak |
| Foto "bukti resi" | Ambil dari akun orang lain | Tidak |

**Akibatnya dua sisi sama-sama rugi:** jastiper jujur dengan 500 transaksi mulus tidak punya cara membuktikannya kepada pembeli baru, dan pembeli baru tidak punya cara membedakannya dari akun yang dibuat minggu lalu. Ini bukan masalah teknologi yang belum ada — ini masalah **tidak ada pihak yang bisa dipercaya untuk menyimpannya.**

### 2.5 Pohon masalah

```
                  Transaksi jastip berisiko tinggi & tidak efisien
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
  Pembeli tidak bisa          Jastiper menanggung          Sengketa tidak punya
  menilai jastiper             seluruh beban modal          jalur penyelesaian
    (RM-1, RM-3)                    (RM-4)                      (RM-5)
        │                            │                            │
        │                            │                            │
  Semua bukti bisa            Tidak ada pencairan          Bukti transaksi tidak
  dipalsukan gratis            bertahap; sekali cair        terstruktur & tidak
        │                      atau tidak sama sekali        bisa diaudit
        │                                                          │
  Tidak ada tempat                                          Semuanya di DM,
  menaruh reputasi                                          bisa dihapus sepihak
  yang tidak menyandera
       (RM-2)  ◀── AKAR MASALAH
```

**Akar masalahnya adalah RM-2.** Selesaikan RM-2, dan RM-1 & RM-3 ikut selesai. Itulah alasan blockchain masuk ke desain ini — bukan karena sedang tren (§6.2).

---

## 3. Tujuan & Manfaat

### 3.1 Tujuan umum

Membangun escrow untuk transaksi jastip yang, sebagai hasil sampingannya, memproduksi rekam jejak jastiper yang **tidak bisa dipalsukan** dan **tidak bisa disandera platform mana pun** — termasuk oleh JEJAK sendiri.

### 3.2 Tujuan khusus

Setiap tujuan dipetakan ke rumusan masalah dan ke cara mengukurnya. Kalau sebuah tujuan tidak bisa diukur, dia bukan tujuan, dia harapan.

| ID | Tujuan khusus | Menjawab | Ukuran keberhasilan |
|---|---|---|---|
| **T-1** | Menghasilkan rekam jejak jastiper yang diturunkan dari event on-chain publik, bukan dari klaim | RM-1, RM-2 | Skrip pihak ketiga menghasilkan angka identik dengan tampilan JEJAK (Skenario C) |
| **T-2** | Membuat skor reputasi bisa dihitung ulang siapa pun tanpa akses ke server JEJAK | RM-2 | Implementasi Python & TypeScript cocok pada ≥20 kasus uji |
| **T-3** | Memisahkan pencairan modal dan fee mengikuti ekonomi jastip yang sebenarnya | RM-4 | Modal cair setelah struk terverifikasi; fee tertahan sampai barang diterima |
| **T-4** | Membuat AI menentukan **nominal** pencairan, bukan sekadar menampilkan teks | Tema lomba | Nominal transfer = hasil baca AI atas struk |
| **T-5** | Membatasi kerugian maksimum meski backend AI dibajak seluruhnya | RM-3, keamanan | Tes fuzz membuktikan `verifiedWei ≤ capWei` selalu |
| **T-6** | Menyediakan jalur sengketa yang lebih murah daripada jalur hukum | RM-5 | Arbiter memutus dari bukti terstruktur; putusan jadi event publik |
| **T-7** | Membatasi eksposur pembeli terhadap jastiper yang belum punya rekam jejak | RM-3 | Plafon nilai order per tier, dipaksa di level kontrak |

### 3.3 Manfaat per pemangku kepentingan

| Pihak | Manfaat konkret | Kenapa dia mau pakai |
|---|---|---|
| **Pembeli** (Sinta, 26, Jakarta) | Bisa menilai jastiper asing dari rekam jejak yang tidak bisa dipalsukan; dananya tidak langsung pindah | Tidak perlu lagi "transfer buta" |
| **Jastiper** (Rani, 30, di Osaka) | **Modal balik lebih cepat** (cair begitu struk terverifikasi) + rekam jejak yang dia bawa ke mana pun | **Modal cepat balik adalah alasan dia MULAI. Reputasi adalah alasan dia BERTAHAN.** Urutan ini penting |
| **Arbiter** (moderator komunitas) | Bukti terstruktur (hash foto, hasil baca AI, jejak waktu) untuk memutuskan | Tidak memutuskan dalam gelap |
| **Platform lain / komunitas** | Bisa membaca reputasi JEJAK tanpa izin siapa pun | Registry jadi barang publik, bukan aset satu perusahaan |
| **Regulator / peneliti** | Data sengketa jastip yang bisa diaudit | Kekosongan data hari ini `[Terverifikasi]` |

### 3.4 Kriteria keberhasilan proyek

Dipisah tegas antara "berhasil sebagai proyek hackathon" dan "berhasil sebagai produk" — dua hal berbeda dan tim sering mencampurnya.

**Berhasil sebagai proyek hackathon (yang dikejar 7 minggu ke depan):**

- [ ] Tiga skenario demo (§19.2) jalan tanpa intervensi manual
- [ ] Kontrak ter-deploy & terverifikasi di BscScan
- [ ] Skor bisa dihitung ulang skrip independen berbahasa berbeda
- [ ] Cakupan tes jalur dana ≥80%
- [ ] Pitch 3 menit dilatih ≥5 kali dengan stopwatch

**Berhasil sebagai produk (di luar cakupan hackathon, tapi harus punya jawabannya kalau ditanya):**

- [ ] ≥1 jastiper sungguhan menyelesaikan ≥1 transaksi sungguhan
- [ ] ≥1 jastiper memasang tautan profil JEJAK di bio Instagram-nya atas kemauan sendiri
- [ ] Ada pihak di luar tim yang menjalankan skrip perhitungan ulang

---

## 4. Batasan Masalah & Asumsi

### 4.1 Batasan masalah

Yang **dikerjakan**:

- Transaksi jastip **luar negeri**, satu pembeli ↔ satu jastiper, satu order satu barang
- Escrow di **BNB Smart Chain Testnet** dengan tBNB native
- Verifikasi struk & foto barang oleh AI
- Rekam jejak jastiper dari event on-chain
- Sengketa oleh satu arbiter manusia

Yang **tidak dikerjakan sama sekali** (dan disebut di pitch supaya tidak dikira lupa):

| Di luar cakupan | Alasan |
|---|---|
| Pembayaran fiat / on-ramp rupiah | Butuh lisensi & integrasi bank; nol nilai untuk membuktikan tesis |
| Aplikasi mobile native | Web responsif cukup untuk demo |
| Sistem chat internal | Jastip sudah punya WhatsApp; menggantinya bukan masalah kami |
| Integrasi kurir / pelacakan resi | Bergantung API pihak ketiga; risiko demo |
| Antarmuka multi-bahasa | UI bahasa Indonesia saja. (Yang multibahasa adalah **struk** yang dibaca AI, bukan UI) |
| Akun tanpa wallet (account abstraction) | Satu lapisan penuh; tidak menambah apa pun pada tesis |
| Mainnet | Aturan lomba + risiko dana nyata |
| Proxy upgradeable | Permukaan serangan tanpa manfaat di hackathon |
| Arbiter multi-signature | Roadmap, bukan MVP |
| Pemulihan wallet yang hilang | Satu produk tersendiri |

### 4.2 Asumsi yang dipakai

Setiap asumsi punya cara pembatalannya. Kalau salah satu terbukti salah, bagian desain yang bergantung padanya ikut berubah.

| ID | Asumsi | Kalau salah, yang berubah | Cara memvalidasi |
|---|---|---|---|
| A-1 | Jastiper menganggap reputasi portabel bernilai | **Seluruh proyek dihentikan** | Wawancara 5 jastiper, Minggu 1 |
| A-2 | Beban modal talangan adalah keluhan nomor satu jastiper | Urutan narasi go-to-market berubah | Wawancara yang sama |
| A-3 | AI multimodal bisa membaca struk termal asing dengan andal | AI-1 turun jadi "bantu manusia", bukan penentu nominal | Uji 10 struk asli, Minggu 2 |
| A-4 | Pembeli mau memakai wallet kripto | Butuh account abstraction (di luar cakupan) | **Diakui sebagai batasan, tidak diselesaikan** |
| A-5 | Submission akhir September | Timeline mundur | Konfirmasi panitia `[Belum diketahui]` |
| A-6 | RPC pihak ketiga gratis cukup untuk demo | Butuh RPC berbayar | Uji Minggu 1 (§14.5) |

---

## 5. Analisis Solusi yang Sudah Ada

**Bagian ini wajib ada.** Juri akan bertanya *"escrow kan sudah ada, rekber sudah ada, kenapa bikin lagi?"* — dan jawaban yang tidak siap akan terdengar seperti tim yang tidak riset.

### 5.1 Yang sudah ada di pasar

| Solusi | Apa yang sudah dipecahkan | Kenapa tidak menyelesaikan RM kalian |
|---|---|---|
| **Rekber Shopee / Tokopedia** `[Terverifikasi]` — escrow marketplace, diawasi OJK, dana ditahan sampai pembeli konfirmasi | Perlindungan dana pembeli, sudah matang dan legal | **Jastip tidak terjadi di marketplace.** Barangnya belum ada saat order dibuat, harganya belum pasti, dan jastipernya tidak mau masuk (§2.2). Reputasi penjual tetap milik platform → RM-2 tidak tersentuh |
| **Rekber pihak ketiga** (mis. RekberPay) `[Terverifikasi]` | Escrow untuk transaksi di luar marketplace | Manual, berbayar per transaksi, dan reputasinya tetap ada di satu perusahaan → RM-2 tidak tersentuh |
| **Komunitas & grup "blacklist jastiper"** | Peringatan sosial | Berbasis kabar; tidak bisa diverifikasi; bisa dipakai untuk memfitnah pesaing |
| **Lapor polisi / jalur hukum** | Pemulihan setelah kejadian | Biaya & waktu sering melebihi kerugian; regulasi jastip minim `[Terverifikasi]` |
| **Rating Instagram / testimoni** | Sinyal sosial | Semua bisa dipalsukan gratis (§2.4) → RM-1 |
| **Platform jastip khusus (yang pernah ada)** | Mencoba menyatukan semuanya | **Mati**, karena tiga alasan di §2.2 |

### 5.2 Celah yang tersisa

Digambarkan sebagai dua sumbu — inilah kuadran yang kosong:

```
                 Reputasi milik pengguna
                          ▲
                          │
       Instagram          │        ◀── JEJAK ada di sini
       (reputasi          │            (kuadran kosong)
        "milik" tapi      │
        palsu semua)      │
                          │
  ────────────────────────┼────────────────────────▶
   Bukti tidak            │            Bukti bisa
   bisa diverifikasi      │            diverifikasi
                          │
                          │   Rekber / Shopee / Tokopedia
                          │   (bukti kuat, tapi reputasi
                          │    disandera platform)
                          ▼
                Reputasi milik platform
```

**Kalimat untuk pitch:** *"Escrow sudah ada dan bagus — Shopee, Tokopedia, rekber, semuanya jalan dan diawasi OJK. Yang tidak ada adalah escrow yang reputasinya bukan milik penyelenggaranya. Dan itu bukan karena tidak ada yang kepikiran; itu karena tidak ada perusahaan yang mau melepaskan satu-satunya alat tawarnya."*

### 5.3 Kenapa kami tidak akan menang melawan Shopee — dan kenapa itu tidak apa-apa

Jujur di depan: JEJAK tidak bersaing dengan marketplace pada perlindungan transaksi. Marketplace lebih baik di situ, punya lisensi, punya CS, punya modal. JEJAK bersaing pada satu hal yang **secara struktural tidak bisa** ditawarkan marketplace: janji bahwa rekam jejakmu bukan milik kami.

---

## 6. Justifikasi Setiap Keputusan Besar

Bagian ini menjawab semua "kenapa begitu" — dan setiap jawaban di sini harus bisa diucapkan ulang oleh ketiga anggota tim tanpa membaca.

### 6.1 Kenapa escrow, bukan asuransi atau rating saja?

| Alternatif | Kenapa ditolak |
|---|---|
| **Rating/reputasi saja, tanpa escrow** | Tidak ada yang memaksa transaksi tercatat. Orang akan pakai ratingnya, lalu transaksi di DM seperti biasa → tidak ada data yang terbentuk. **Escrow adalah mesin yang memproduksi data reputasi.** Tanpa itu, reputasinya tidak punya bahan baku |
| **Asuransi (ganti rugi setelah kejadian)** | Butuh modal pool, penentuan klaim yang bisa disalahgunakan, dan tetap tidak menghasilkan rekam jejak |
| **Escrow saja, tanpa reputasi** | Sudah ada dan sudah lebih baik dari yang bisa kami buat (§5). Tidak ada alasan tim ini menang |

**Kesimpulan:** escrow adalah alat, bukan produk. Produknya reputasi. Ini yang dirumuskan sebagai prinsip P1 (§7).

### 6.2 Kenapa harus blockchain?

Dua argumen, disusun dari yang paling kuat. **Hafalkan urutannya** — argumen 1 yang menang, argumen 2 yang membuktikan.

**Argumen 1 — Tidak ada tuan rumah yang bisa dipercaya.**

Registry reputasi ini harus dipercaya oleh pihak-pihak yang **berkompetisi memperebutkan jastiper yang sama**. Setiap calon tuan rumah — Tokopedia, Shopee, komunitas jastip, atau JEJAK sendiri — cepat atau lambat punya insentif memonetisasi lock-in-nya. Itu bukan tuduhan moral, itu ekonomi: lock-in sering kali satu-satunya alat tawar sebuah platform terhadap pemasoknya. Tokopedia tidak akan pernah membuat rating penjualnya bisa dibawa ke Shopee, dan tidak masuk akal mengharapkan sebaliknya.

Janji "reputasimu bukan di server kami" hanya bisa diucapkan dengan jujur kalau **memang tidak ada server yang memegangnya.**

**Argumen 2 — Skornya bukan klaim, tapi hasil hitungan ulang.**

Skor tidak disimpan sebagai angka. Skor adalah **turunan dari event on-chain publik** yang siapa pun bisa hitung ulang dengan indexer mereka sendiri. Kami tidak bisa memanipulasinya bahkan kalau mau — dan itu bisa dibuktikan langsung di depan juri dalam 45 detik (Skenario C).

**Argumen yang sengaja TIDAK dipakai — dan alasannya:**

| Argumen buruk | Kenapa ditolak |
|---|---|
| *"Pembayaran lintas negara lebih cepat/murah"* | **Keliru secara faktual.** Transaksi jastip mayoritas rupiah ke rekening lokal jastipernya. **Barangnya yang menyeberang, bukan uangnya.** Juri akan membongkar klaim ini |
| *"Transparan dan tidak bisa diubah"* | Terlalu umum; bisa diucapkan proyek mana pun; bukan argumen |
| *"Desentralisasi"* sebagai nilai | Bukan manfaat bagi pengguna. Manfaatnya adalah tidak ada penyandera. Sebut manfaatnya, bukan sifat teknisnya |
| *"Biaya lebih murah dari bank"* | Kami menambah kebutuhan gas dan wallet; ini justru **lebih repot**, bukan lebih murah. Mengaku ini menaikkan kredibilitas |

### 6.3 Kenapa harus AI?

Tema lomba mewajibkan AI × Web3, tapi jawaban "karena diwajibkan" akan membunuh nilai kalian. Tiga tugas berikut adalah tugas yang **menentukan berapa uang berpindah** — bukan chatbot tempelan.

| # | Tugas AI | Output | Kenapa tidak bisa non-AI |
|---|---|---|---|
| **AI-1** | Baca struk multibahasa (Jepang, Korea, Mandarin, Thailand, Inggris) | Nominal, merchant, tanggal, daftar item, tingkat keyakinan | OCR biasa gagal di struk termal yang miring, pudar, dan multi-skrip. Dan yang dibutuhkan bukan teks, tapi **pemahaman mana angka yang total dan mana subtotal/pajak/diskon** |
| **AI-2** | Cocokkan foto barang dengan deskripsi pesanan + deteksi foto katalog/generatif | Skor keyakinan + alasan | Butuh pemahaman visual-semantik. Hash gambar hanya mendeteksi duplikat persis, bukan "ini foto katalog toko" |
| **AI-3** | Deteksi reputasi palsu dari pola graf transaksi on-chain | Tanda klaster mencurigakan | Butuh pengenalan pola pada graf, bukan aturan tetap |

**AI-3 adalah bonus yang hanya mungkin karena on-chain.** Begitu reputasi punya nilai, orang akan memfarmnya: bikin lima wallet, transaksi bohongan sesama sendiri, kumpulkan skor. Data graf untuk mendeteksi itu **hanya ada karena transaksinya publik**. Kalau reputasinya di database sendiri, tidak akan ada apa pun untuk dianalisis pihak luar.

**Batas kejujuran soal AI-3:** dengan volume transaksi sekelas demo, AI-3 tidak punya bahan. Karena itu MVP memakai **metrik keragaman pembeli yang deterministik** (§13.4), dan AI-3 didemokan di dataset benih yang **dilabeli jelas di layar sebagai data benih**. Jangan pernah menampilkan data benih tanpa label.

### 6.4 Kenapa BNB Smart Chain Testnet?

| Alasan | Keterangan |
|---|---|
| **Diwajibkan lomba** | Alasan utama dan cukup |
| Kompatibel EVM | Solidity + Foundry + wagmi/viem jalan tanpa penyesuaian |
| Biaya gas rendah | Alur kami butuh 4–6 transaksi per order; di chain mahal ini tidak masuk akal |
| tBNB gratis dari faucet | `[Terverifikasi]` — dengan syarat, lihat §14.5 |

**Yang harus diwaspadai:** RPC publik resmi BSC **menonaktifkan `eth_getLogs`** `[Terverifikasi]` — dan seluruh produk kami adalah indexer pembaca event. Ini risiko nomor satu proyek, ditangani di §14.5.

### 6.5 Kenapa track Finance & Commerce?

Escrow atas pekerjaan nyata, dengan aliran dana yang jelas dan pihak yang jelas. Track sekunder: Consumer Apps. **Bukan** judi/prediction market — tidak ada pihak yang menang karena pihak lain kalah; yang ada adalah jasa yang dibayar setelah dibuktikan.

### 6.6 Kenapa pencairan dua tahap?

Ini wawasan produk yang paling membedakan JEJAK, dan asalnya dari memahami ekonomi jastip yang sebenarnya: **jastiper menalangi duluan dengan uangnya sendiri.**

| Tahap | Kapan cair | Berapa | Yang dilindungi |
|---|---|---|---|
| **Modal** | Setelah AI memverifikasi struk | Persis nominal struk, dibatasi plafon | **Arus kas jastiper** |
| **Fee** | Setelah konfirmasi terima / masa sanggah lewat | Fee yang disepakati di depan | **Kepastian pembeli** |

**Empat masalah selesai sekaligus:**

1. **"Dana cair sebelum barang dikirim"** — yang cair duluan hanya modal. Keuntungan jastiper masih tersandera sampai barang sampai.
2. **Markup tersembunyi hilang** — fee jadi eksplisit dan disepakati di depan, bukan disembunyikan di selisih harga. **Jastiper jujur diuntungkan** karena bisa memasang tarif terang-terangan.
3. **AI jadi benar-benar diperlukan** — nominal pencairan *ditentukan* oleh hasil pembacaan struk. Bukan validasi kosmetik.
4. **Beban modal jastiper berkurang** — ini alasan komersial mereka mau pakai, di luar soal reputasi.

**Konsekuensi yang harus diakui:** setelah modal cair, modal itu tidak bisa ditarik kembali. Ini lubang nyata, dan cara menanganinya ada di §6.7.

### 6.7 Kenapa reputasi dipakai sebagai plafon kredit?

Ini penambahan terbesar v3 terhadap desain awal, dan lahir dari satu pertanyaan audit: *"kalau jastiper menyerahkan struk asli lalu menghilang membawa modal, apa yang terjadi?"*

Jawaban desain awal: pembeli kehilangan modalnya, arbiter hanya bisa membagi fee. Itu jawaban yang buruk.

**Jawaban v3:** kontrak menyimpan penghitung mentah `completedCount` per jastiper dan memakainya untuk **membatasi nilai order yang boleh dia terima.**

| Tier | Syarat | Plafon nilai order |
|---|---|---|
| T0 — Baru | `completedCount == 0` | 0,05 tBNB |
| T1 — Pemula | `>= 3` | 0,20 tBNB |
| T2 — Mapan | `>= 10` | 1,00 tBNB |
| T3 — Terpercaya | `>= 30` | tanpa plafon (MVP: 10 tBNB) |

**Kenapa ini penting jauh melampaui keamanan:** ini mengubah reputasi dari lencana kosmetik menjadi **plafon kredit**. Untuk bisa mencuri besar, penyerang harus lebih dulu menyelesaikan puluhan order jujur dengan pembeli yang berbeda-beda — dan itu berbiaya, lambat, serta meninggalkan jejak graf yang bisa dianalisis.

**Ini juga menjawab "kenapa jastiper peduli pada skornya":** karena skornya adalah plafon transaksinya. Reputasi berhenti jadi hiasan dan jadi alat produksi.

### 6.8 Kenapa satu kontrak, bukan arsitektur modular?

| Alasan | Keterangan |
|---|---|
| Batas cakupan dari panitia | Disebut eksplisit di materi lomba |
| Permukaan serangan lebih kecil | Tidak ada panggilan antar-kontrak = tidak ada kelas bug antar-kontrak |
| Tim punya satu orang yang baru belajar Solidity | Realisme, bukan idealisme |
| Tidak ada kebutuhan nyata | Modularitas menyelesaikan masalah skala yang belum kami punya |

### 6.9 Kenapa tBNB native, bukan token ERC-20?

Alur `approve` + `transferFrom` menambah satu transaksi dan satu kelas bug untuk nol nilai demo. Kontrak ditulis agar aset-agnostik secara struktur (semua transfer lewat satu fungsi internal `_pay`), sehingga migrasi ke stablecoin di BSC adalah perubahan satu lapis. `[Keputusan]`

**Jawaban untuk juri soal volatilitas ada di §20.2 Q6.**

---

## 7. Prinsip Desain

Tujuh prinsip. Setiap kali ada perdebatan fitur, kembali ke sini — bukan ke selera.

| # | Prinsip | Konsekuensi praktis |
|---|---|---|
| **P1** | **Escrow itu mesin, reputasi itu produk** | Setiap fitur harus menghasilkan sinyal reputasi. Fitur yang tidak, dipotong |
| **P2** | **AI hanya boleh menahan, tidak pernah melonggarkan** | Batas kontrak tidak bisa dinaikkan AI. AI yang ragu → berhenti, bukan lanjut |
| **P3** | **Ikuti ekonomi jastip yang sebenarnya** | Pencairan dua tahap, bukan sekali cair |
| **P4** | **On-chain hanya untuk yang kritis** | Hash bukti, bukan foto. Event, bukan skor. Penghitung mentah, bukan penilaian |
| **P5** | **Satu alur mulus > lima fitur setengah jadi** | Fitur di luar MVP masuk slide "ke depan", bukan ke kode |
| **P6** | **Dana tidak boleh bergantung pada JEJAK masih hidup** | Fungsi kedaluwarsa & refund terbuka untuk siapa saja, tanpa izin |
| **P7** | **Batasan disebut sendiri sebelum ditemukan orang** | Setiap kelemahan yang kami sebut duluan berubah dari temuan jadi bukti ketelitian |

---

# BAGIAN II — APA

## 8. Ringkasan Solusi

### 8.1 Satu kalimat

JEJAK adalah escrow untuk transaksi jastip yang, sebagai hasil sampingannya, memproduksi rekam jejak jastiper yang tidak bisa dipalsukan dan tidak bisa disandera platform mana pun.

### 8.2 Yang membedakan dari peserta lain

Mayoritas peserta akan membangun escrow yang memakai AI untuk mencairkan dana — itu pola yang persis diajarkan di Sesi 3–6. Kami membangun **mesin reputasi yang kebetulan berbentuk escrow.** Produknya bukan perlindungan transaksi; produknya adalah bukti kepercayaan yang bisa dibawa ke mana-mana.

**Dan satu kalimat lagi yang wajib masuk pitch:**

> Reputasi di JEJAK bukan cuma lencana. **Ia adalah plafon kreditmu.** Rekam jejak on-chain seorang jastiper menentukan nilai order maksimum yang boleh dia terima, dipaksa di level kontrak.

### 8.3 Alur end-to-end

```
1. PESAN      Pembeli buat order: barang, plafon harga, fee jastiper,
              deadline. Dana (plafon + fee) dikunci di kontrak.

2. TERIMA     Jastiper menerima order. Reputasi on-chain-nya terlihat
              pembeli sebelum ini terjadi. Kontrak menolak kalau nilai
              order melebihi plafon tier-nya.               ← BARU (§6.7)

3. BELI       Jastiper menalangi dengan uangnya sendiri, unggah foto
              struk + foto barang. Hash-nya tercatat on-chain.

4. VERIFIKASI AI membaca struk (multibahasa), mencocokkan barang,
              memeriksa keaslian foto. Ragu → berhenti, naik ke arbiter.

5. CAIR-1     Kontrak mencairkan MODAL sebesar nominal di struk.
   (MODAL)    Dibatasi keras: tidak boleh melebihi plafon.

6. KIRIM      Barang dikirim/dibawa pulang. Pembeli konfirmasi terima,
              atau masa sanggah 72 jam lewat tanpa keluhan.

7. CAIR-2     Kontrak mencairkan FEE jastiper. Order tercatat selesai
   (FEE)      → menjadi satu titik di rekam jejaknya, dan menaikkan
              plafon tier-nya.

   SENGKETA   Kalau AI ragu, verifier macet, jastiper banding, atau
              pembeli mengajukan keberatan: sisa dana beku, kasus naik
              ke arbiter manusia.
```

### 8.4 Arsitektur

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend   │────▶│   Backend    │────▶│   Layanan AI    │
│  Next.js    │     │   Node/API   │     │  (LLM + vision) │
│  wagmi/viem │     │              │     │                 │
└──────┬──────┘     └──────┬───────┘     └─────────────────┘
       │                   │
       │ wallet            │ peran VERIFIER
       ▼                   ▼
┌─────────────────────────────────────────────┐
│      JejakEscrow.sol — BSC Testnet          │
│  createOrder · acceptOrder · submitProof ·  │
│  releaseCapital · confirmReceipt ·          │
│  raiseDispute · resolveDispute · withdraw   │
└──────────────┬──────────────────────────────┘
               │ events
               ├──────────────────────┐
               ▼                      ▼
       ┌───────────────┐      ┌────────────────────────┐
       │    Indexer    │      │  verify-independent/   │
       │  event → DB   │      │  recompute.py (Python) │
       └───────┬───────┘      │  NOL dependensi ke     │
               ▼              │  kode kami — SKENARIO C│
     ┌──────────────────┐     └────────────────────────┘
     │ Halaman Reputasi │
     │    (publik)      │
     └──────────────────┘
```

**Skor reputasi tidak disimpan on-chain.** Ia diturunkan dari event: jumlah order tuntas, total nilai yang pernah dipegang, rasio sengketa, keragaman pembeli, rata-rata waktu penyelesaian. Siapa pun bisa menghitung ulang (§13).

### 8.5 Yang TIDAK kami klaim

Menyebut batas ini di pitch justru menaikkan kredibilitas (P7):

- **Kami tidak menyelesaikan sybil resistance.** Kami menaikkan biaya pemalsuan reputasi, tidak menutupnya. Masalah ini belum selesai di industri.
- **Kami tidak menjamin barang asli.** Foto tidak bisa membuktikan keaslian tas atau skincare. Itu jalur arbitrase manusia.
- **AI kami bisa salah.** Karena itu AI tidak pernah memutus sendiri kasus meragukan — dia menahan dan menyerahkan ke manusia.
- **Modal yang sudah cair tidak bisa ditarik kembali.** Kalau jastiper menyerahkan struk asli lalu menghilang, pembeli kehilangan modalnya. Kami membatasi ukurannya lewat plafon tier, tidak menutup lubangnya.
- **Reputasi terikat wallet.** Wallet hilang = reputasi hilang. Pemulihan akun di luar cakupan.
- **Cold start nyata.** Reputasi baru berguna kalau sudah banyak. Demo kami menunjukkan sistem dengan sedikit transaksi, dan kami **tidak menampilkan skor sama sekali** sebelum tiga order tuntas.
- **Kami menambah kerepotan, bukan mengurangi.** Pengguna harus punya wallet dan gas. Kami tidak berpura-pura ini lebih mudah daripada transfer bank.

---

## 9. Hasil Audit v1.0

Dokumen v1.0 dinilai dari dua sudut: **juri hackathon** (apakah ini menang?) dan **auditor teknis** (apakah ini bisa dibangun dan tidak bocor?).

**Penilaian singkat:** narasinya di 10% teratas; riset "kenapa platform jastip mati" adalah aset terbesar tim. Tapi v1.0 adalah pitch deck yang menyamar sebagai spesifikasi teknis — tidak ada satu pun formula, signature fungsi, atau jalur dana yang cukup detail untuk dikoding tanpa menebak.

### 9.1 Temuan KRITIS

| ID | Temuan | Kenapa fatal | Diperbaiki di |
|---|---|---|---|
| **K-01** | **RPC publik BSC tidak mendukung `eth_getLogs`.** `[Terverifikasi]` Endpoint resmi menonaktifkannya; ada pula batas rentang blok (galat `-32005`) yang memaksa paginasi ≤5.000 blok | **Seluruh produk kalian adalah indexer pembaca event.** Skenario C akan **gagal di panggung** kalau skripnya memakai RPC resmi | §14.5 |
| **K-02** | **Tidak ada lapisan mata uang / FX.** Order Rupiah, escrow tBNB, struk Yen — nol spesifikasi konversi | Juri teknis menanyakan ini dalam 10 detik. Tanpa jawaban, seluruh angka demo adalah sulap | §11.1 |
| **K-03** | **Formula skor tidak pernah didefinisikan** | Klaim inti "siapa pun bisa menghitung ulang" **tidak bisa dibuktikan** tanpa spesifikasi. Skenario C jadi teater | §13 |
| **K-04** | **Jalur dana tidak lengkap.** Tidak ada batal, kedaluwarsa, jastiper kabur, banding AI | Dana bisa terkunci selamanya. Temuan audit paling dasar | §12.3 |
| **K-05** | **Modal cair sebelum barang dikirim = kerugian tidak bisa ditarik balik** | Lubang ekonomi terbesar produk | §6.7 + §11.4 |
| **K-06** | **Faucet tBNB resmi mensyaratkan saldo BNB mainnet ~0,002 BNB** `[Terverifikasi]` | Tanpa itu, **tidak bisa deploy sama sekali.** Blocker hari pertama | §17 Minggu 0 |

### 9.2 Temuan MAYOR

| ID | Temuan | Diperbaiki di |
|---|---|---|
| M-01 | Arbiter satu alamat terpusat, tanpa pembelaan | §11.5 |
| M-02 | Wallet tidak terikat identitas — reputasi portabel jadi tidak berarti | §11.6 |
| M-03 | "Penyimpanan foto off-chain" tidak dispesifikasikan | §11.7 |
| M-04 | AI-3 mustahil didemokan (butuh volume transaksi) | §13.4 |
| M-05 | Skenario C dijadwalkan Minggu 5 padahal paling menentukan DAN paling mudah | §17 — dipindah ke Minggu 2 |
| M-06 | Tidak ada penanganan kegagalan verifier → order macet permanen | §12.3 D-07 |
| M-07 | Tidak ada perlindungan replay pada panggilan verifier | §12.3 + state machine |
| M-08 | Contract Person mulai dari nol, target Minggu 2 menulis kontrak penuh — tidak realistis | §17 + §18.1 |
| M-09 | Tidak ada spesifikasi event, padahal indexer & frontend bergantung padanya | §12.4 |
| M-10 | "Cakupan tes ≥80%" tanpa daftar kasus uji | §15 |

### 9.3 Temuan MINOR

| ID | Temuan | Perbaikan |
|---|---|---|
| T-01 | Repo bernama `Nitip`, produk bernama `JEJAK`. Juri melihat repo | Rename hari ini |
| T-02 | Repo 1 commit tanpa `.gitignore` — aturan "jangan commit `.env`" belum dipaksa mesin | `.gitignore` + `gitleaks` di CI |
| T-03 | Tidak ada CI | §14.6 |
| T-04 | Tidak ada README/LICENSE. Juri membaca README duluan | Ditulis Minggu 2, bukan Minggu 8 |
| T-05 | Siapa membayar gas tidak dijelaskan | §11.8 |
| T-06 | "Multi-bahasa di luar cakupan" padahal persona penggunanya orang Indonesia | UI bahasa Indonesia sejak awal; yang di luar cakupan adalah *multi*-bahasa UI |

### 9.4 Yang sudah bagus — JANGAN diubah

Ini instruksi, bukan basa-basi. Ada godaan nyata untuk "memperbaiki" bagian ini sampai rusak:

1. **§2.2 — "kenapa platform jastip sampai sekarang tidak ada".** Pertahankan utuh.
2. **Argumen "tidak ada tuan rumah yang bisa dipercaya"** (§6.2).
3. **Penolakan eksplisit atas argumen "pembayaran lintas negara lebih cepat"** (§6.2).
4. **Daftar "yang tidak kami klaim"** (§8.5) — perluas, jangan persingkat.
5. **Pencairan dua tahap mengikuti ekonomi jastip** (§6.6).

---

## 10. Penilaian Diri Sebagai Juri

Rubrik di bawah adalah rubrik hackathon Web3 pada umumnya. **Rubrik resmi lomba `[Belum diketahui]` — konfirmasi ke panitia (§22).**

| Kriteria | Bobot khas | Skor v1.0 | Target v3 | Yang mengubah |
|---|---|---|---|---|
| Inovasi / orisinalitas | 20% | 9/10 | 9/10 | Sudah kuat; jangan diutak-atik |
| Blockchain bukan tempelan | 20% | 9/10 | 9/10 | Skenario C membuktikannya, asal K-01 diperbaiki |
| AI bukan tempelan | 20% | 7/10 | 9/10 | Tegaskan output AI = **angka yang jadi jumlah transfer** |
| Eksekusi teknis | 20% | 4/10 | 8/10 | K-02, K-03, K-04, M-09 |
| Pitch & demo | 10% | 8/10 | 9/10 | Skenario C dimajukan; runbook kegagalan |
| Kelengkapan / dokumentasi | 10% | 5/10 | 9/10 | README, spec skor, spec event, CI, latar belakang |
| **Total tertimbang** | | **7,2/10** | **8,8/10** | |

**Pembacaan jujur:** v1.0 kalah bukan karena idenya, tapi karena tim dengan ide lebih biasa tapi demo mulus dan repo rapi akan mengalahkan kalian. Selisih 1,6 poin itu **seluruhnya di eksekusi dan kelengkapan** — dua hal yang sepenuhnya dalam kendali kalian dan tidak butuh ide baru.

### 10.1 Persyaratan panitia

| Kriteria | Status | Bukti di produk |
|---|---|---|
| Tema wajib AI × Web3 | ✅ | AI menentukan nominal pencairan, bukan menampilkan teks |
| Track yang dipilih | ✅ | Finance & Commerce (utama), Consumer Apps (sekunder) |
| BNB Smart Chain Testnet | ✅ | Satu kontrak di chainId 97, tBNB dari faucet |
| Pola yang diajarkan (escrow → AI oracle → cair) | ✅ | Persis arsitektur kami |
| Bukan judi / prediction market | ✅ | Escrow atas pekerjaan nyata |
| Blockchain bukan tempelan | ✅ | §6.2 + Skenario C |
| AI bukan tempelan | ✅ | Tiga tugas berat, satu hanya mungkin karena on-chain |
| Scope tidak berlebihan | ✅ | Satu kontrak, tanpa kontrak saling panggil |
| Tidak menyimpan data besar/pribadi on-chain | ✅ | Hanya hash bukti |
| Tidak ada private key di repo | ✅ | `.gitignore` + `gitleaks` di CI sejak commit pertama |

### 10.2 Materi workshop yang terpakai

| Sesi | Materi | Dipakai untuk |
|---|---|---|
| 1–2 | Environment, Solidity dasar | Fondasi Contract Person |
| 3–4 | Foundry, Token, Bounty Board, Security | Kontrak escrow + pengujian |
| **5** | **Reading the Chain + Indexing** | **Mesin reputasi — inti produk** |
| **6** | **API + AI Auto-verify** | **Pipeline verifikasi AI** |
| 7 | Frontend dApp UI | Antarmuka pembeli & jastiper |
| 8 | AI Integration + Scope Ideas | Validasi scope ke mentor |
| 9 | Pitch | Demo Day |

Sesi 5 dan 6 bukan sekadar relevan — keduanya tulang punggung produk ini.

---

## 11. Keputusan Desain

Semua bertanda `[Keputusan]`. Setiap pilihan menyertakan alasan dan konsekuensi yang diterima.

### 11.1 KD-01 & KD-02 — Satuan uang dan FX (memperbaiki K-02)

**KD-01 — Semua matematika kontrak dalam wei tBNB. IDR dan JPY hanya lapisan tampilan.**

| Lapisan | Satuan | Yang menghitung |
|---|---|---|
| Kontrak | `wei` (tBNB) — **satu-satunya** satuan di matematika kontrak | Kontrak |
| Backend verifier | Konversi JPY → IDR → wei | Backend, pakai kurs snapshot |
| Frontend | Tampilkan IDR untuk manusia, kirim wei ke kontrak | Frontend |

**KD-02 — Kurs di-snapshot saat order dibuat, bukan saat pencairan.**

`createOrder` menyimpan `idrPerBnbSnapshot` **hanya sebagai catatan audit** — tidak pernah dipakai aritmetika kontrak. Backend memakai angka yang sama untuk mengonversi nominal struk. Pembeli dan jastiper tahu kursnya sejak awal; tidak ada kejutan FX di tengah jalan.

Konsekuensi diterima: kalau harga BNB bergerak antara order dibuat dan struk diverifikasi, nilai IDR escrow ikut bergerak. Di testnet dan demo 3 menit ini tidak relevan. Jawaban juri di §20.2 Q6.

### 11.2 KD-03 — tBNB native, bukan ERC-20

Alasan di §6.9.

### 11.3 State machine

Setiap order **wajib** di tepat satu state. Tidak ada transisi di luar diagram ini.

```
                    createOrder()
                          │
                          ▼
                    ┌───────────┐  cancelByBuyer()          ┌───────────┐
                    │  CREATED  │──────────────────────────▶│ REFUNDED  │
                    │           │  expireUnaccepted()       │ (final)   │
                    └─────┬─────┘──────────────────────────▶└───────────┘
                          │ acceptOrder()
                          ▼
                    ┌───────────┐  abandonByTimeout()       ┌───────────┐
                    │ ACCEPTED  │──────────────────────────▶│ ABANDONED │
                    │           │                           │ (final)   │
                    └─────┬─────┘                           └───────────┘
                          │ submitProof()
                          ▼
                    ┌───────────┐  raiseVerificationAppeal()
                    │  PROOFED  │────────────┐
                    └─────┬─────┘            │  escalateStaleVerification()
                          │ releaseCapital() │
                          │ (VERIFIER)       │
                          ▼                  ▼
                  ┌──────────────┐     ┌───────────┐
                  │ CAPITAL_PAID │────▶│ DISPUTED  │
                  └──────┬───────┘     └─────┬─────┘
                         │                   │ resolveDispute() (ARBITER)
      confirmReceipt()   │                   ▼
      atau               │             ┌───────────┐
      autoReleaseFee()   │             │ RESOLVED  │
                         ▼             │ (final)   │
                   ┌───────────┐       └───────────┘
                   │ COMPLETED │
                   │ (final)   │
                   └───────────┘
```

**Aturan wajib:** state final tidak punya transisi keluar; setiap fungsi memeriksa state di baris pertama; satu order tidak bisa masuk `DISPUTED` dua kali; `releaseCapital` hanya bisa dipanggil sekali — dijaga state, bukan flag terpisah (M-07).

### 11.4 KD-04 — Plafon order berbasis rekam jejak (memperbaiki K-05)

Konsep dan tabel tier ada di §6.7. Implementasinya:

```solidity
mapping(address => uint32) public completedCount;   // penghitung MENTAH, bukan skor
mapping(address => uint32) public abandonedCount;
```

Tidak melanggar P4: yang disimpan adalah **penghitung peristiwa mentah**, bukan skor. Skor tetap dihitung ulang dari event oleh siapa pun (§13). Jastiper dengan `abandonedCount > 0` turun satu tier.

Dipaksa di `acceptOrder`:

```solidity
require(order.capWei + order.feeWei <= _tierCap(msg.sender), "JEJAK: melebihi plafon tier");
```

### 11.5 KD-05 — Kuasa arbiter dibatasi (memperbaiki M-01)

Yang **tidak bisa** dilakukan arbiter, dipaksa di level kontrak:

- Memindahkan dana melebihi sisa dana order tersebut
- Menyentuh order yang tidak berstatus `DISPUTED`
- Mengubah `capWei`, `feeWei`, atau pihak dalam order
- Memanggil `releaseCapital`
- Menaikkan plafon tier siapa pun

Setiap putusan memancarkan `DisputeResolved(orderId, buyerWei, jastiperWei, reasonHash)` — sehingga **rekam jejak arbiter sendiri bisa dihitung ulang publik**: berapa kasus, berapa lama, condong ke mana.

### 11.6 KD-06 — Binding wallet ↔ identitas (memperbaiki M-02)

1. Jastiper menandatangani pesan (di luar rantai, gratis, EIP-191):
   `JEJAK identity claim | wallet: 0xABC… | instagram: @rani.jastip | nonce: <acak> | 2026-09-01`
2. Profil JEJAK menampilkan *"Wallet ini mengklaim @rani.jastip"* + tombol verifikasi tanda tangan di browser pengguna.
3. Jastiper menempelkan tautan profil JEJAK di bio Instagram-nya. **Arah kedua inilah yang mengunci binding** — hanya pemilik akun IG yang bisa menaruh tautan di sana.

**Batas jujur:** ini membuktikan satu pihak menguasai kedua akun pada satu titik waktu. Bukan identitas hukum, dan tidak menahan akun IG yang dijual.

### 11.7 KD-07 — Penyimpanan bukti (memperbaiki M-03)

| Yang disimpan | Di mana | Kenapa |
|---|---|---|
| `keccak256(file)` | On-chain, di `ProofSubmitted` | Bukti tidak bisa diganti belakangan |
| Berkas foto | IPFS (Pinata free tier), CID off-chain | Tidak bergantung server JEJAK |
| Ringkasan hasil AI | Off-chain (DB) + `keccak256` on-chain | Alasan keputusan bisa diaudit |

**Kalau Pinata merepotkan di Minggu 4, potong ke penyimpanan lokal + hash on-chain** dan katakan apa adanya: *"foto ada di server kami; kalau server mati fotonya hilang. Yang tidak hilang adalah hash-nya di rantai — jadi tidak ada yang bisa menyodorkan foto berbeda belakangan dan mengaku itu bukti aslinya."*

### 11.8 Siapa membayar gas (memperbaiki T-05)

| Aksi | Pembayar |
|---|---|
| `createOrder`, `confirmReceipt` | Pembeli |
| `acceptOrder`, `submitProof` | Jastiper |
| `releaseCapital` | JEJAK (verifier) |
| `resolveDispute` | JEJAK (arbiter) |

Jawaban juri soal onboarding non-kripto: *"di produksi ini dibayar lewat paymaster ERC-4337 sehingga pengguna tidak perlu memegang gas. Kami tidak mengerjakannya di MVP karena itu satu lapisan penuh yang tidak menambah apa pun pada tesis kami."*

---

# BAGIAN III — BAGAIMANA

## 12. Spesifikasi Kontrak

### 12.1 Aturan tidak bisa ditawar

| # | Aturan | Alasan |
|---|---|---|
| C-01 | **Satu kontrak.** Tidak ada kontrak saling panggil | §6.8 |
| C-02 | **Pola pull payment.** Dana masuk `pendingWithdrawals`, penerima menarik sendiri | Menghilangkan seluruh kelas bug reentrancy dan `transfer` gagal |
| C-03 | **Checks-Effects-Interactions** di setiap fungsi | Standar |
| C-04 | `ReentrancyGuard` di `withdraw()` | Sabuk pengaman kedua |
| C-05 | Tanpa `selfdestruct`, `delegatecall`, proxy upgradeable | Permukaan serangan tanpa manfaat |
| C-06 | Tanpa loop tak terbatas / iterasi array yang tumbuh | Batas gas |
| C-07 | Solidity `^0.8.20`; `unchecked` hanya dengan komentar alasan | Overflow otomatis dicek |
| C-08 | Setiap `require` berpesan berawalan `JEJAK:` | Debug demo jadi manusiawi |

### 12.2 Struktur penyimpanan

```solidity
enum Status {
    CREATED,        // 0
    ACCEPTED,       // 1
    PROOFED,        // 2
    CAPITAL_PAID,   // 3
    DISPUTED,       // 4
    COMPLETED,      // 5 final
    REFUNDED,       // 6 final
    ABANDONED,      // 7 final
    RESOLVED        // 8 final
}

struct Order {
    address buyer;
    address jastiper;
    uint128 capWei;             // plafon modal
    uint128 feeWei;             // fee jastiper
    uint128 verifiedWei;        // hasil baca AI; 0 sebelum verifikasi
    uint64  createdAt;
    uint64  acceptDeadline;     // CREATED kedaluwarsa setelah ini
    uint64  proofDeadline;      // diisi saat acceptOrder = now + 7 hari
    uint64  verifyDeadline;     // diisi saat submitProof = now + 24 jam
    uint64  disputeWindowEnd;   // diisi saat releaseCapital = now + 72 jam
    Status  status;
    bytes32 itemHash;           // keccak256 deskripsi barang
    bytes32 proofHash;          // keccak256 berkas bukti
    uint256 idrPerBnbSnapshot;  // AUDIT SAJA, tidak pernah dipakai matematika
}

mapping(uint256 => Order)   public orders;
mapping(address => uint256) public pendingWithdrawals;
mapping(address => uint32)  public completedCount;
mapping(address => uint32)  public abandonedCount;
uint256 public nextOrderId;

address public verifier;   // backend AI
address public arbiter;    // moderator manusia
address public owner;      // hanya ganti verifier/arbiter. TIDAK BISA menyentuh dana.
```

**Catatan audit:** `owner` sengaja tanpa kuasa atas dana. **Tulis ini sebagai komentar di kontrak** — auditor dan juri membaca komentar.

### 12.3 Sembilan jalur dana (memperbaiki K-04)

Auditor menilai kontrak dari satu pertanyaan: **untuk setiap wei yang masuk, ada berapa jalan keluar, dan apakah semuanya tertutup?**

Notasi: `C` = capWei · `F` = feeWei · `V` = verifiedWei (`V ≤ C`) · `T` = `C + F`

| # | Jalur | Pemicu | Siapa | Pembeli terima | Jastiper terima | State akhir |
|---|---|---|---|---|---|---|
| D-01 | **Normal** | Konfirmasi terima | Pembeli | `C − V` | `V + F` | `COMPLETED` |
| D-02 | **Auto-release** | Masa sanggah 72 jam lewat | Siapa pun | `C − V` | `V + F` | `COMPLETED` |
| D-03 | **Batal sebelum diterima** | Belum ada jastiper | Pembeli | `T` | 0 | `REFUNDED` |
| D-04 | **Kedaluwarsa tanpa jastiper** | `deadline` lewat di `CREATED` | Siapa pun | `T` | 0 | `REFUNDED` |
| D-05 | **Jastiper kabur** | `ACCEPTED` > `proofDeadline` | Siapa pun | `T` | 0 | `ABANDONED` + penalti |
| D-06 | **Sengketa sebelum modal cair** | Diajukan salah satu pihak | Keduanya | ditentukan arbiter, ≤ `T` | sisa | `RESOLVED` |
| D-07 | **Verifier mati / AI macet** | `PROOFED` > `verifyDeadline` (24 jam) | Siapa pun | naik ke arbiter | — | `DISPUTED` |
| D-08 | **Banding jastiper atas hasil baca AI** | Jastiper tidak setuju `V` | Jastiper, di `PROOFED` | naik ke arbiter | — | `DISPUTED` |
| D-09 | **Sengketa setelah modal cair** | Barang tidak sampai | Pembeli, sebelum fee cair | ≤ `F + (C−V)` | ≤ `F` | `RESOLVED` |

**Invarian yang wajib dijaga dan wajib dites:**

```
INV-1  Jumlah seluruh pembayaran keluar untuk satu order == T, persis. Tidak ada sisa.
INV-2  V <= C, dipaksa kontrak, selalu, tanpa pengecualian.
INV-3  Setelah state final, saldo internal order == 0.
INV-4  Arbiter tidak pernah bisa memindahkan lebih dari sisa dana order tersebut.
INV-5  Tidak ada fungsi yang bisa memindahkan dana antar-order.
```

### 12.4 Antarmuka fungsi

```solidity
// ————— PEMBELI —————
function createOrder(
    uint128 capWei, uint128 feeWei, bytes32 itemHash,
    uint64 acceptDeadline, uint256 idrPerBnbSnapshot
) external payable returns (uint256 orderId);
// require: msg.value == capWei + feeWei
// require: acceptDeadline > block.timestamp
// require: capWei > 0 && feeWei > 0

function cancelByBuyer(uint256 orderId) external;      // D-03, hanya CREATED
function confirmReceipt(uint256 orderId) external;     // D-01, hanya CAPITAL_PAID
function raiseDispute(uint256 orderId) external;       // D-06/D-09, sebelum fee cair

// ————— JASTIPER —————
function acceptOrder(uint256 orderId) external;
// require: status == CREATED && block.timestamp < acceptDeadline
// require: capWei + feeWei <= _tierCap(msg.sender)            ← KD-04

function submitProof(uint256 orderId, bytes32 proofHash) external;
function raiseVerificationAppeal(uint256 orderId) external;    // D-08

// ————— VERIFIER (backend AI) —————
function releaseCapital(uint256 orderId, uint128 verifiedWei) external;
// require: msg.sender == verifier
// require: status == PROOFED                                  ← anti-replay (M-07)
// require: verifiedWei <= order.capWei                        ← INV-2, PAGAR KERAS

// ————— TANPA IZIN (sengaja terbuka untuk siapa saja) —————
function expireUnaccepted(uint256 orderId) external;           // D-04
function abandonByTimeout(uint256 orderId) external;           // D-05
function escalateStaleVerification(uint256 orderId) external;  // D-07
function autoReleaseFee(uint256 orderId) external;             // D-02
function withdraw() external;                                   // pull payment, nonReentrant

// ————— ARBITER —————
function resolveDispute(uint256 orderId, uint128 buyerWei, uint128 jastiperWei, bytes32 reasonHash) external;
// require: msg.sender == arbiter && status == DISPUTED
// require: buyerWei + jastiperWei == _remainingWei(orderId)    ← INV-1 + INV-4

// ————— OWNER (kuasa minimal, sengaja) —————
function setVerifier(address) external;
function setArbiter(address) external;
// TIDAK ADA fungsi owner yang menyentuh dana. Disengaja & didokumentasikan.
```

**Fungsi tanpa izin sengaja terbuka (P6).** Kalau hanya JEJAK yang bisa memanggilnya, JEJAK bisa menyandera dana dengan cara diam. Terbuka = dana tidak pernah bergantung pada kami masih hidup. **Ini poin pitch, sebutkan.**

### 12.5 Skema event (memperbaiki M-09)

**Ini kontrak antarmuka antara Contract Person dan AI/Indexer Person.** Berubah = kedua pihak diberi tahu di grup, hari itu juga.

```solidity
event OrderCreated(uint256 indexed orderId, address indexed buyer,
    uint128 capWei, uint128 feeWei, bytes32 itemHash,
    uint64 acceptDeadline, uint256 idrPerBnbSnapshot);

event OrderAccepted(uint256 indexed orderId, address indexed jastiper,
    uint64 acceptedAt, uint64 proofDeadline);

event ProofSubmitted(uint256 indexed orderId, address indexed jastiper,
    bytes32 proofHash, uint64 verifyDeadline);

event CapitalReleased(uint256 indexed orderId, address indexed jastiper,
    uint128 verifiedWei, uint128 capWei, uint64 disputeWindowEnd);

event OrderCompleted(uint256 indexed orderId, address indexed jastiper,
    address indexed buyer, uint128 totalWei, uint64 completedAt, bool autoReleased);

event OrderRefunded(uint256 indexed orderId, address indexed buyer,
    uint128 amountWei, uint8 reason);   // 0=batal pembeli, 1=kedaluwarsa

event OrderAbandoned(uint256 indexed orderId, address indexed jastiper,
    address indexed buyer, uint128 refundWei);

event DisputeRaised(uint256 indexed orderId, address indexed raisedBy, uint8 stage);
// stage: 0=sebelum modal cair, 1=setelah modal cair, 2=eskalasi verifier macet

event DisputeResolved(uint256 indexed orderId, address indexed arbiter,
    uint128 buyerWei, uint128 jastiperWei, bytes32 reasonHash);

event Withdrawal(address indexed who, uint256 amountWei);
```

**Aturan `indexed`:** `orderId`, `buyer`, `jastiper`, `arbiter` selalu `indexed`. Solidity membatasi 3 per event; `OrderCompleted` sudah pakai ketiganya.

**Cek silang — setiap masukan formula §13 harus punya sumber event:**

| Masukan | Event sumber | Ada? |
|---|---|---|
| `nAccepted` | `OrderAccepted` | ✓ |
| `nCompleted` | `OrderCompleted` | ✓ |
| `nAbandoned` | `OrderAbandoned` | ✓ |
| `nLost` | `DisputeResolved` (`buyerWei > jastiperWei`) | ✓ kedua field di event yang sama, tanpa join |
| `vTotal` | `OrderCompleted.totalWei` | ✓ |
| `uBuyers` | `OrderCompleted.buyer` | ✓ |
| `medHours` | `OrderAccepted.acceptedAt` → `OrderCompleted.completedAt` | ✓ |

Tidak ada masukan yang menggantung. ✓

---

## 13. Spesifikasi Skor — `JEJAK-TRUST v1.0`

Ini **spesifikasi yang dipublikasikan**. Klaim "siapa pun bisa menghitung ulang" hanya bermakna kalau dokumen ini ada. Salin ke `docs/TRUST-SPEC.md`.

### 13.1 Prinsip

1. Hanya event on-chain publik yang jadi masukan. Tidak ada data dari server JEJAK.
2. **Aritmetika bilangan bulat saja.** Tidak ada floating point — hasil harus identik di Python, JavaScript, dan Go.
3. Setiap pembagian dibulatkan ke bawah (`floor`), dinyatakan eksplisit.
4. Versi formula ditulis di setiap tampilan skor. Perubahan formula = versi baru; formula lama tetap bisa dihitung.

### 13.2 Masukan

| Simbol | Definisi | Sumber |
|---|---|---|
| `nAccepted` | Order yang pernah diterima jastiper | `OrderAccepted` |
| `nCompleted` | Order tuntas | `OrderCompleted` |
| `nAbandoned` | Order ditinggalkan | `OrderAbandoned` |
| `nLost` | Sengketa diputus memihak pembeli | `DisputeResolved` dgn `buyerWei > jastiperWei` |
| `vTotal` | Total nilai (wei) di order tuntas | `OrderCompleted.totalWei` |
| `uBuyers` | Jumlah alamat pembeli **unik** di order tuntas | `OrderCompleted.buyer` |
| `medHours` | Median jam `OrderAccepted` → `OrderCompleted` | selisih `blockTimestamp` |

**Definisi median — wajib eksplisit, ini sumber ketidakcocokan antar-implementasi:** urutkan menaik; kalau jumlah datanya genap, ambil **elemen yang lebih kecil dari dua elemen tengah**. Bukan rata-rata keduanya.

### 13.3 Formula

```
JIKA nCompleted < 3:
    TRUST = null   // tampilkan "Belum cukup data (n<3)", JANGAN tampilkan angka
    BERHENTI

comp  = floor(10000 * nCompleted / nAccepted)
disp  = floor(10000 * (nLost + nAbandoned) / nAccepted)
vol   = volumeTier(vTotal)      // tabel 13.3a
spd   = speedTier(medHours)     // tabel 13.3b
div   = floor(10000 * uBuyers / nCompleted)

TRUST_bp = floor( (35*comp + 30*(10000 - disp) + 15*vol + 10*spd + 10*div) / 100 )
TRUST    = TRUST_bp / 100       // 0.00 – 100.00, dua desimal
```

Bobot berjumlah 35+30+15+10+10 = **100**. ✓

**13.3a — `volumeTier(vTotal)`** (tabel, bukan logaritma — logaritma memunculkan selisih floating point antar bahasa)

| `vTotal` (wei) | Nilai |
|---|---|
| `< 0,1e18` | 0 |
| `< 0,5e18` | 2500 |
| `< 2e18` | 5000 |
| `< 10e18` | 7500 |
| `>= 10e18` | 10000 |

**13.3b — `speedTier(medHours)`**

| `medHours` | Nilai |
|---|---|
| `<= 48` | 10000 |
| `<= 96` | 7500 |
| `<= 168` | 5000 |
| `<= 336` | 2500 |
| `> 336` | 0 |

**Uji kewarasan (sudah diverifikasi — implementasi wajib menghasilkan angka ini):**

`nAccepted=10, nCompleted=10, nLost=0, nAbandoned=0, vTotal=0,6e18, medHours=40, uBuyers=8`

```
comp = floor(10000*10/10) = 10000
disp = floor(10000*0/10)  = 0
vol  = 5000      (0,6e18 masuk rentang < 2e18)
spd  = 10000     (40 <= 48)
div  = floor(10000*8/10)  = 8000

TRUST_bp = floor((350000 + 300000 + 75000 + 100000 + 80000) / 100) = 9050
TRUST    = 90.50
```

**Kasus batas yang wajib diuji:** `n=0` → null · `n=2` → null · `n=3` → tampil · semua sengketa kalah → skor rendah · satu pembeli saja → `div` rendah · jumlah data genap & ganjil untuk median · maksimum sempurna → tepat `100.00`.

### 13.4 Aturan tampilan wajib (memperbaiki M-04)

Halaman profil **tidak boleh** menampilkan `TRUST` sendirian. Empat angka mentah ini wajib tampil bersamanya, karena angka mentah tidak bisa disembunyikan di balik pembobotan:

```
TRUST 90.50 / 100   (JEJAK-TRUST v1.0)
├─ 10 order tuntas dari 10 diterima
├─ 8 pembeli berbeda            ← metrik anti-farming utama
├─ 0 sengketa kalah, 0 ditinggalkan
└─ total nilai dipegang: 0,6 tBNB · median penyelesaian 40 jam
```

**Peringatan otomatis (deterministik, tanpa AI):** kalau `uBuyers * 2 < nCompleted`, tampilkan:

> ⚠ Sebagian besar transaksi jastiper ini berasal dari sedikit pembeli yang sama. Pertimbangkan lagi.

Ini menutup kebutuhan MVP untuk deteksi sybil tanpa AI sama sekali. **AI-3 tetap ada sebagai lapisan "Should"**, didemokan di dataset benih yang **dilabeli jelas di layar** (N-14).

---

## 14. Stack Teknis & Perintah

### 14.1 Daftar stack

| Lapisan | Pilihan | Versi | Catatan |
|---|---|---|---|
| Bahasa kontrak | Solidity | `^0.8.20` | `[Keputusan]` |
| Toolchain kontrak | Foundry (`forge`, `cast`, `anvil`) | terbaru via `foundryup` | Catat versi persis di README |
| Pustaka kontrak | OpenZeppelin Contracts | v5.x | **Hanya `ReentrancyGuard`.** Jangan tarik lebih dari yang dipakai |
| Jaringan | BNB Smart Chain Testnet | **chainId 97** (`0x61`) | `[Terverifikasi]` |
| Explorer | BscScan Testnet | — | Butuh API key untuk verifikasi kontrak |
| Frontend | Next.js (App Router) + TypeScript | 14/15 | `[Keputusan]` |
| Wallet | wagmi + viem + RainbowKit | wagmi 2.x · viem 2.x · RainbowKit 2.2.11 | `[Terverifikasi]` — wagmi v2 mewajibkan `@tanstack/react-query` sebagai peer dep |
| Styling | Tailwind CSS | 3.x/4.x | `[Keputusan]` |
| Backend + indexer | Node.js + TypeScript, Express/Fastify | Node 20 LTS+ | Satu proses, dua modul |
| DB | SQLite (`better-sqlite3`) | — | Cukup; nol biaya operasional |
| AI | LLM multimodal (vision) via API | — | Kunci di `.env` |
| Penyimpanan berkas | IPFS via Pinata (free tier) | — | Fallback: disk lokal (§11.7) |
| RPC | **Penyedia pihak ketiga** | — | **Wajib, bukan opsional — §14.5** |
| Skrip verifikasi | Python 3 + `web3` | — | **Sengaja beda bahasa** (§14.2) |
| CI | GitHub Actions | — | `forge test` + `gitleaks` |

### 14.2 Struktur repo

```
jejak/
├── .github/workflows/ci.yml
├── .gitignore                    ← commit PERTAMA, sebelum apa pun
├── README.md                     ← ditulis Minggu 2, bukan Minggu 8
├── docs/
│   ├── TRUST-SPEC.md             ← salinan §13, dokumen publik
│   ├── FUND-PATHS.md             ← salinan §12.3
│   ├── DEMO-RUNBOOK.md           ← salinan §19
│   ├── interviews.md             ← hasil wawancara 5 jastiper
│   └── rpc-notes.md              ← hasil uji RPC (§14.5)
├── contracts/
│   ├── foundry.toml
│   ├── src/JejakEscrow.sol
│   ├── test/{FundPaths,Invariants,AccessControl}.t.sol
│   ├── script/Deploy.s.sol
│   └── deployments/bsc-testnet.json   ← alamat + DEPLOY_BLOCK + ABI
├── web/
│   ├── app/{page.tsx, order/[id]/page.tsx, jastiper/[address]/page.tsx}
│   ├── lib/{wagmi.ts,contract.ts,abi.ts}
│   └── components/
├── services/
│   ├── indexer/{index.ts,db.ts,backfill.ts}
│   ├── verifier/{api.ts,receipt.ts,image.ts,fx.ts}
│   └── scoring/trust.ts          ← implementasi §13
├── verify-independent/           ← SKENARIO C — sengaja terpisah
│   ├── README.md                 ← ditulis untuk ORANG LUAR
│   ├── recompute.py              ← Python, NOL dependensi ke kode kami
│   └── requirements.txt
└── pitch/{deck.pdf, script.md, demo-backup.mp4}
```

**`verify-independent/` ditulis Python sementara sisanya TypeScript. Ini disengaja.** Kalau juri melihat skrip verifikasi mengimpor `services/scoring/trust.ts`, seluruh Skenario C runtuh — itu bukan verifikasi independen, itu memanggil kode yang sama dua kali. Perbedaan bahasa membuat independensinya terlihat mata telanjang dari 5 meter.

### 14.3 Perintah persis

**Kontrak:**

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge --version                    # catat di README

mkdir -p contracts && cd contracts
forge init --no-git .
forge install OpenZeppelin/openzeppelin-contracts --no-commit

forge build
forge test -vvv
forge test --gas-report
forge coverage                     # target >= 80% jalur dana

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BSC_TESTNET_RPC --private-key $DEPLOYER_PK \
  --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY -vvvv

cast block-number --rpc-url $BSC_TESTNET_RPC   # CATAT. Indexer butuh ini.
```

**Frontend:**

```bash
npx create-next-app@latest web --typescript --tailwind --app --eslint
cd web
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
npm run dev
```

**Backend/indexer:**

```bash
mkdir -p services && cd services
npm init -y
npm install typescript tsx viem better-sqlite3 express dotenv
npm install -D @types/node @types/express
npx tsc --init
```

**Skrip verifikasi independen:**

```bash
cd verify-independent
python -m venv .venv && source .venv/bin/activate
pip install web3 requests            # TIDAK ADA dependensi ke kode JEJAK
python recompute.py 0xAlamatJastiper
```

### 14.4 Variabel lingkungan

`.env.example` **di-commit**. `.env` **tidak pernah**.

```bash
# —— rantai ——
BSC_TESTNET_RPC=https://…            # penyedia pihak ketiga, §14.5
BSC_TESTNET_RPC_BACKUP=https://…     # cadangan, WAJIB
BSC_TESTNET_CHAIN_ID=97
CONTRACT_ADDRESS=0x…
DEPLOY_BLOCK=                        # WAJIB. Indexer mulai dari blok ini.

# —— kunci (WALLET KHUSUS TESTNET SAJA) ——
DEPLOYER_PK=
VERIFIER_PK=
ARBITER_PK=

# —— layanan ——
BSCSCAN_API_KEY=
AI_API_KEY=
PINATA_JWT=

# —— demo ——
DEMO_MODE=false                      # true = respons AI dari cache (§19)
```

`.gitignore` (commit pertama, sebelum baris kode apa pun):

```
.env
.env.*
!.env.example
node_modules/
out/
cache/
broadcast/
.venv/
*.db
*.sqlite
```

### 14.5 RPC dan `eth_getLogs` — RISIKO NOMOR SATU

`[Terverifikasi]` Dokumentasi BNB Chain menyatakan `eth_getLogs` **dinonaktifkan** di endpoint RPC publik resmi dan mengarahkan ke penyedia pihak ketiga. Ada juga batas rentang blok yang memunculkan galat `-32005 limit exceeded`; panduan menyarankan ≤5.000 blok per permintaan.

**Kenapa ini membunuh kalian secara spesifik:** Skenario C adalah *"tutup frontend kami, jalankan skrip independen yang membaca langsung dari BSC Testnet"*. Skrip itu memanggil `eth_getLogs`. Kalau di panggung skripnya menunjuk ke endpoint resmi, ia **gagal di depan juri**, pada momen yang kalian sendiri sebut penentu.

| # | Aturan | Penanggung jawab |
|---|---|---|
| RPC-1 | Daftar RPC pihak ketiga yang mendukung `eth_getLogs`. Kandidat: dRPC, PublicNode, Chainstack, GetBlock, OnFinality, Ankr. **Daftar dua: utama + cadangan** | AI & Pitch |
| RPC-2 | Paginasi `eth_getLogs` maksimum **4.500 blok**, dengan retry backoff | AI & Pitch |
| RPC-3 | `DEPLOY_BLOCK` dicatat di `.env` dan `deployments/bsc-testnet.json`. **Jangan pernah backfill dari blok 0** | Contract |
| RPC-4 | Skrip Skenario C **wajib diuji dari jaringan berbeda** (hotspot HP, bukan Wi-Fi rumah) sebelum Minggu 6. Batas rate berbasis IP | AI & Pitch |
| RPC-5 | Pergantian ke endpoint cadangan **dilatih**, bukan diimprovisasi saat panik | Semua |

**Uji kewarasan wajib, Minggu 1, sebelum menulis satu baris pun indexer:**

```bash
cast logs --from-block $DEPLOY_BLOCK --to-block latest \
  --address $CONTRACT_ADDRESS --rpc-url $BSC_TESTNET_RPC
```

Kalau perintah ini gagal, **berhenti dan ganti RPC dulu.**

### 14.6 CI

```yaml
name: ci
on: [push, pull_request]
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge build --sizes
        working-directory: contracts
      - run: forge test -vvv
        working-directory: contracts
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
```

---

## 15. Rencana Pengujian

`forge coverage` ≥80% adalah **lantai, bukan target**. Yang dinilai auditor adalah apakah 22 kasus ini ada dan lulus. Nama ditulis persis begini supaya keluaran `forge test` bisa dibaca sebagai daftar periksa.

**Jalur dana (`FundPaths.t.sol`) — satu tes per baris §12.3:**

```
test_D01_normalPath_buyerConfirms_bothPaid
test_D02_autoRelease_afterDisputeWindow
test_D03_cancelByBuyer_fullRefund
test_D04_expireUnaccepted_fullRefund
test_D05_abandonByTimeout_refundAndPenalty
test_D06_disputeBeforeCapital_arbiterSplits
test_D07_verifierStale_escalatesToArbiter
test_D08_jastiperAppeal_escalatesToArbiter
test_D09_disputeAfterCapital_onlyFeeContested
```

**Invarian (`Invariants.t.sol`):**

```
test_INV1_totalOutEqualsTotalIn_allPaths          (fuzz)
test_INV2_verifiedNeverExceedsCap                 (fuzz)
test_INV3_finalStateHasZeroBalance
test_INV4_arbiterCannotExceedRemaining            (fuzz)
test_INV5_noCrossOrderFundMovement
```

**Kontrol akses (`AccessControl.t.sol`):**

```
test_onlyVerifierCanReleaseCapital
test_onlyArbiterCanResolve
test_ownerCannotTouchFunds                        ← tes yang ditunjukkan ke juri
test_cannotReleaseCapitalTwice                    ← M-07
test_cannotAcceptAboveTierCap                     ← KD-04
test_cannotDisputeAfterFinalState
test_withdrawIsReentrancySafe                     ← kontrak penyerang
test_strangerCanCallPermissionlessExpiry          ← membuktikan dana tidak disandera JEJAK
```

**Fuzz wajib untuk INV-2** (ini pagar keras yang jadi klaim pitch):

```solidity
function testFuzz_INV2_verifiedNeverExceedsCap(uint128 cap, uint128 fee, uint128 attempt) public {
    cap = uint128(bound(cap, 1e15, 10e18));
    fee = uint128(bound(fee, 1e15, 1e18));
    // ... buat order, terima, kirim bukti ...
    if (attempt > cap) {
        vm.expectRevert("JEJAK: melebihi plafon");
        escrow.releaseCapital(id, attempt);
    }
}
```

**Kalimat pitch yang hanya boleh diucapkan setelah tes ini hijau:**

> "Kalau backend AI kami dibajak seluruhnya dan penyerang memanggil `releaseCapital` dengan angka berapa pun, kerugian maksimumnya tetap plafon yang ditetapkan pembeli. Bukan janji — ini tes fuzz yang jalan di CI kami."

---

## 16. Requirements

**M** = Must (MVP) · **S** = Should · **C** = Could (slide "ke depan")

| ID | Requirement | Prio | Menjawab |
|---|---|---|---|
| F-01 | Pembeli membuat order (barang, plafon, fee, deadline) | M | RM-3 |
| F-02 | Dana (`cap + fee`) terkunci saat order dibuat | M | RM-3 |
| F-03 | Jastiper menerima order | M | — |
| F-04 | Bukti diunggah, hash tercatat on-chain | M | RM-5 |
| F-05 | AI membaca struk multibahasa → nominal terverifikasi | M | T-4 |
| F-06 | AI mencocokkan foto barang dengan deskripsi | M | T-4 |
| F-07 | Modal cair sebesar nominal terverifikasi, dibatasi plafon | M | RM-4, T-3 |
| F-08 | Pembeli mengonfirmasi terima | M | — |
| F-09 | Fee cair setelah konfirmasi/masa sanggah | M | T-3 |
| F-10 | Sengketa bisa diajukan sebelum fee cair | M | RM-5 |
| F-11 | Arbiter memutuskan pembagian | M | RM-5, T-6 |
| F-12 | Indexer membaca event, menghitung rekam jejak | M | T-1 |
| F-13 | Halaman profil publik jastiper | M | RM-1 |
| F-14 | Skor bisa dihitung ulang pihak ketiga | M | T-2 |
| F-15 | AI mendeteksi foto katalog/generatif | S | — |
| F-16 | AI menandai klaster wallet mencurigakan | S | Diturunkan; F-27 menggantikan untuk MVP |
| F-17 | Auto-release fee setelah masa sanggah | M | INV-1 |
| F-18 | Badge reputasi untuk bio Instagram | C | — |
| F-19 | Pinjaman modal kerja berjaminan order | C | — |
| F-20 | Notifikasi status order | C | — |
| **F-21** | **Batal sebelum diterima → refund penuh** | **M** | K-04 |
| **F-22** | **Kedaluwarsa tanpa jastiper → refund penuh** | **M** | K-04 |
| **F-23** | **Jastiper kabur setelah menerima → refund + penalti** | **M** | K-04 |
| **F-24** | **Verifier macet > 24 jam → eskalasi ke arbiter** | **M** | M-06 |
| **F-25** | **Jastiper bisa banding atas hasil baca AI** | **M** | K-04 |
| **F-26** | **Plafon nilai order berbasis tier, dipaksa kontrak** | **M** | K-05, T-7 |
| **F-27** | **Metrik keragaman pembeli + spanduk peringatan** | **M** | M-04 |
| **F-28** | **Binding wallet ↔ Instagram bertanda tangan** | **S** | M-02 |

**Non-functional:**

| ID | Requirement | Target |
|---|---|---|
| N-01 | Satu kontrak, tanpa kontrak saling panggil | Wajib |
| N-02 | Foto tidak pernah on-chain, hanya hash | Wajib |
| N-03 | Data pribadi tidak pernah on-chain | Wajib |
| N-04 | AI tidak bisa mencairkan melebihi plafon, dipaksa kontrak | Wajib |
| N-05 | Panggilan AI hanya saat verifikasi (batas rate) | Wajib |
| N-06 | Demo end-to-end < 3 menit | Wajib |
| N-07 | Video demo cadangan | Wajib |
| N-08 | Semua rahasia di `.env` | Wajib |
| N-09 | Cakupan tes jalur dana | ≥80% |
| N-10 | Semua matematika kontrak dalam wei; IDR hanya tampilan | Wajib |
| N-11 | Indexer memakai RPC yang mendukung `eth_getLogs`, paginasi ≤4.500 blok | Wajib |
| N-12 | Skrip Skenario C nol dependensi ke kode JEJAK, bahasa berbeda | Wajib |
| N-13 | Skor tidak ditampilkan kalau `nCompleted < 3` | Wajib |
| N-14 | Data benih apa pun dilabeli di layar sebagai data benih | Wajib |

---

# BAGIAN IV — KAPAN & SIAPA

## 17. Timeline

**Baseline 9 Agustus.** Per tanggal ini repo berisi 1 commit tanpa kode. **7 minggu tersisa** dengan asumsi submission akhir September `[Belum diketahui]`.

Perubahan struktural: **Skenario C dimajukan dari Minggu 5 ke Minggu 2.** Itu skenario paling menentukan sekaligus paling murah (satu skrip ~150 baris). Menaruhnya di akhir berarti mengambil risiko terbesar paling telat — kesalahan urutan paling mahal di v1.0.

### Minggu 0 — HARI INI, 9 Agustus (blocker)

| # | Tugas | Siapa | Selesai kalau |
|---|---|---|---|
| 0.1 | **Cek: ada yang punya ≥0,01 BNB mainnet?** Faucet resmi butuh ~0,002 BNB mainnet `[Terverifikasi]` | Semua, jawab di grup | Ada jawaban ya/tidak |
| 0.2 | Kalau tidak: beli BNB kecil ATAU pakai faucet alternatif tanpa syarat saldo | Tercepat | tBNB masuk wallet testnet |
| 0.3 | Rename repo `Nitip` → `jejak` | Pemilik repo | URL berubah |
| 0.4 | Commit `.gitignore` **sebelum** kode apa pun | Pemilik repo | Ada di `main` |
| 0.5 | **Konfirmasi eligibility tim lintas negara ke panitia** | Siapa pun | Jawaban tertulis |
| 0.6 | Tanyakan 6 pertanyaan lain di §22 | Sama | Jawaban tertulis |
| 0.7 | **Kirim pesan ke 5 jastiper** | AI & Pitch | 5 pesan terkirim |

> **Gerbang keputusan, 13 Agustus:** kalau dari 5 jastiper tidak ada satu pun yang tertarik pada "rekam jejak yang kamu bawa sendiri", hentikan JEJAK (A-1). Empat hari, bukan seminggu — waktunya sudah terpakai.

### Minggu 1 · 9–16 Agustus — Fondasi

| Siapa | Target | Definisi selesai |
|---|---|---|
| Semua | Sesi 1–2 (rekaman). MetaMask + tBNB | Saldo terlihat di MetaMask |
| Semua | **Deploy `Hello.sol` ke BSC Testnet, terverifikasi** | Tautan BscScan di grup |
| Contract | Sesi 3–4. `JejakEscrow.sol` **rangka** (enum, struct, event, signature kosong) — **berpasangan** (M-08) | `forge build` lulus |
| Frontend | `create-next-app`, RainbowKit tersambung chainId 97 | Tombol connect jalan |
| AI & Pitch | **Uji `eth_getLogs` di ≥2 penyedia RPC** (§14.5) | `cast logs` berhasil di 2 endpoint |
| AI & Pitch | Wawancara 5 jastiper → `docs/interviews.md` | 5 catatan di repo |

### Minggu 2 · 17–23 Agustus — Testnet + Skenario C lebih awal

| Siapa | Target | Definisi selesai |
|---|---|---|
| Contract | **`JejakEscrow.sol` v1 lengkap di anvil.** Semua 9 jalur dana | `forge test` hijau D-01…D-09 |
| Contract | **Deploy + verifikasi. Catat `DEPLOY_BLOCK`** | `deployments/bsc-testnet.json` di-commit |
| Frontend | Buat order dari UI, dana terkunci, terbukti di BscScan | Screenshot di grup |
| AI & Pitch | Indexer membaca `OrderCreated` + `OrderAccepted` ke SQLite | `SELECT count(*)` > 0 |
| AI & Pitch | **`recompute.py` jalan — SKENARIO C HIDUP DI MINGGU 2** | Angka sama dengan API |
| AI & Pitch | Prototipe baca struk di **10 struk asing sungguhan** (A-3) | 8 dari 10 nominal benar |
| Semua | README v1 | Ada di `main` |

### Minggu 3 · 24–30 Agustus — Integrasi jalur normal

| Siapa | Target |
|---|---|
| Semua | **Skenario A jalan end-to-end.** Tonggak terpenting |
| Contract | INV-1…INV-5 hijau termasuk fuzz |
| Frontend | Halaman status order, kesembilan state punya tampilan |
| AI & Pitch | Verifier jadi API; `DEMO_MODE` berfungsi |
| Semua | Sesi 8 (25 Agu) — **bawa dokumen ini ke mentor. Minta serangan, bukan pujian** |
| Semua | Sesi 9 (30 Agu) — materi pitch |

> **Gerbang keputusan, 30 Agustus:** kalau Skenario A belum jalan, potong F-15, F-16, F-28 tanpa diskusi.

### Minggu 4 · 31 Agustus–6 September — Lapisan reputasi

| Siapa | Target |
|---|---|
| AI & Pitch | `services/scoring/trust.ts` implementasi §13 **persis** |
| AI & Pitch | **Uji silang TS vs Python identik pada ≥20 kasus** |
| Frontend | Profil jastiper: TRUST + 4 angka mentah + spanduk (F-27) |
| Contract | Alur sengketa + arbitrase, tes hijau |
| Contract | Plafon tier (F-26) terpasang & teruji |

### Minggu 5 · 7–13 September — Jalur kecurangan

| Siapa | Target |
|---|---|
| AI & Pitch | Deteksi foto katalog/generatif (F-15). **Skenario B jalan** |
| AI & Pitch | Dataset benih AI-3, **berlabel di layar** (N-14) |
| Frontend | Poles UI, semua state galat tertangani |
| Contract | Audit mandiri terhadap §12.3 & §15 |
| Semua | **Latihan pitch pertama dengan stopwatch** |

### Minggu 6 · 14–20 September — Beku & rekam

| Siapa | Target |
|---|---|
| Semua | **Feature freeze 14 September.** Setelah ini hanya perbaikan bug |
| AI & Pitch | **Rekam video demo cadangan.** Deck selesai |
| AI & Pitch | Uji Skenario C **dari jaringan lain** (RPC-4) |
| Semua | Latihan pitch ×5 dengan stopwatch, direkam, ditonton ulang |

### Minggu 7 · 21–30 September — Penyangga & submission

| Siapa | Target |
|---|---|
| Semua | README final, dokumentasi, submission (Lampiran C) |
| Semua | Gladi bersih Demo Day dengan runbook §19 |
| Semua | **Penyangga.** Kalau deadline lebih awal, minggu inilah yang dikorbankan |

---

## 18. Checklist Per Orang

### 18.0 Semua orang — hari ini

```
[ ] Instal MetaMask, buat wallet BARU khusus testnet (jangan wallet berisi aset)
[ ] Tambah jaringan: Chain ID 97, simbol tBNB, RPC dari §14.5, explorer testnet.bscscan.com
[ ] Dapatkan tBNB (cek syarat saldo mainnet dulu — §17 tugas 0.1)
[ ] Daftar BscScan, buat API key, taruh di .env sendiri
[ ] Kloning repo, pastikan .gitignore ada SEBELUM membuat .env
[ ] Baca Bagian I dokumen ini sampai habis — itu yang akan ditanya juri
[ ] Tanyakan yang tidak jelas di grup HARI INI, bukan minggu depan
```

### 18.1 Contract Person

**Minggu 1 — mengejar ketertinggalan (berpasangan, jangan sendirian):**

```
[ ] Sesi 1–2 rekaman
[ ] CryptoZombies bab 1–3 ATAU Speedrun Ethereum challenge 0
[ ] Tulis, deploy, verifikasi Hello.sol di BSC Testnet — dari nol, sendiri
[ ] forge init pada contracts/, OpenZeppelin terpasang
[ ] Salin enum Status, struct Order, dan seluruh event dari §12.2 & §12.5 APA ADANYA
[ ] Tulis semua signature §12.4 dengan body kosong. forge build harus lulus.
```

**Minggu 2 — kontrak sungguhan:**

```
[ ] createOrder + cancelByBuyer + expireUnaccepted            (D-03, D-04)
[ ] acceptOrder dengan pemeriksaan plafon tier                (F-26)
[ ] submitProof
[ ] releaseCapital dengan require verifiedWei <= capWei   ← BARIS TERPENTING DI SELURUH REPO
[ ] confirmReceipt + autoReleaseFee                           (D-01, D-02)
[ ] abandonByTimeout                                          (D-05)
[ ] raiseDispute + raiseVerificationAppeal + escalateStaleVerification (D-06…D-09)
[ ] resolveDispute dengan require jumlahnya == sisa dana      (INV-1, INV-4)
[ ] withdraw() dengan ReentrancyGuard                         (C-02, C-04)
[ ] 9 tes jalur dana hijau
[ ] Deploy + verifikasi di BscScan
[ ] Commit deployments/bsc-testnet.json: alamat, DEPLOY_BLOCK, ABI, hash commit
[ ] KIRIM ABI DAN ALAMAT KE DUA ORANG LAIN DI HARI YANG SAMA
```

**Minggu 3–5:**

```
[ ] 5 tes invarian hijau, 2 di antaranya fuzz
[ ] 8 tes kontrol akses hijau
[ ] forge coverage >= 80% pada src/
[ ] forge test --gas-report; pastikan tidak ada fungsi > 500k gas
[ ] Audit mandiri: baca tiap fungsi sambil bertanya "kalau ini dipanggil dua kali?"
[ ] Audit mandiri: untuk tiap state, daftar fungsi mana yang BOLEH dipanggil. Cocokkan dengan kode.
[ ] Komentar NatSpec di setiap fungsi eksternal — juri membaca kode
[ ] Komentar eksplisit di deklarasi owner: "owner tidak punya kuasa atas dana"
```

**Aturan pribadi:** setiap kali kamu mengubah event apa pun, kirim pesan ke grup **di hari yang sama**. Indexer dan frontend akan patah diam-diam kalau tidak.

### 18.2 Frontend & Wallet Person

**Minggu 1:**

```
[ ] create-next-app + Tailwind
[ ] npm i @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
[ ] lib/wagmi.ts dengan chain bscTestnet (chainId 97) dari viem/chains
[ ] Tombol connect jalan, alamat tampil
[ ] Deteksi jaringan salah + tombol "pindah ke BSC Testnet"
```

**Minggu 2–3:**

```
[ ] lib/abi.ts diimpor dari contracts/deployments/bsc-testnet.json (JANGAN salin manual)
[ ] Form buat order: barang, plafon (IDR), fee (IDR), deadline
    → konversi IDR ke wei di frontend, kirim wei ke kontrak        (KD-01)
    → tampilkan kurs snapshot yang dipakai, jangan disembunyikan
[ ] Status transaksi: idle / menunggu tanda tangan / pending / sukses / revert
    → tampilkan pesan revert "JEJAK: ..." apa adanya ke pengguna
[ ] Halaman status order menampilkan kesembilan state dengan jelas
[ ] Alur unggah bukti (jastiper)
[ ] Tombol konfirmasi terima (pembeli)
```

**Minggu 4–5 — halaman yang paling dilihat juri:**

```
[ ] /jastiper/[address] — profil publik
[ ] Tampilkan TRUST + versi formula "JEJAK-TRUST v1.0"
[ ] Tampilkan 4 angka mentah §13.4 — WAJIB, jangan skor sendirian
[ ] Kalau nCompleted < 3: "Belum cukup data (n<3)", JANGAN tampilkan angka  (N-13)
[ ] Spanduk peringatan kalau uBuyers*2 < nCompleted                          (F-27)
[ ] Tautan ke verify-independent/README.md — "hitung sendiri angka ini"
[ ] Data benih diberi label kuning di layar                                   (N-14)
[ ] Tampilan mobile rapi — juri lihat dari laptop, tapi jastiper pakai HP
```

**Perangkap yang sudah menunggu:**

- Nilai `uint128` dari viem datang sebagai `BigInt`. `Number()` pada angka wei kehilangan presisi. Pakai `formatEther`/`parseEther`.
- wagmi v2 mewajibkan `@tanstack/react-query` sebagai provider. `[Terverifikasi]`
- Jangan salin ABI manual. ABI usang = seharian debug.

### 18.3 AI & Pitch Person

Peran paling berat. Kalau harus memotong tugas orang lain untuk membantumu, potong dari Frontend, **bukan** dari Contract.

**Minggu 1 — buktikan infrastrukturnya jalan sebelum membangun di atasnya:**

```
[ ] Uji cast logs di >= 2 penyedia RPC pihak ketiga  (RPC-1)  ← LAKUKAN PALING DULU
[ ] Catat hasilnya di docs/rpc-notes.md
[ ] Wawancara 5 jastiper → docs/interviews.md
[ ] Kumpulkan 10 struk asing sungguhan
```

**Pertanyaan wawancara — tanyakan persis ini, jangan diimprovisasi:**

```
1. Sebulan terakhir, berapa order jastip yang kamu pegang?
2. Berapa uang kamu sendiri yang pernah nombok di satu waktu? (validasi A-2)
3. Pernah ada pembeli batal setelah barang dibeli? Berapa kali? Kamu apakan barangnya?
4. Kalau pembeli baru nanya "kak amanah nggak?", kamu jawab apa? Kirim bukti apa?
5. Pernah dituduh menipu padahal tidak? Bagaimana kamu membuktikannya?
6. KUNCI (validasi A-1): "Kalau ada cara membuktikan rekam jejakmu ke pembeli baru,
   dan bukti itu milikmu bukan milik kami — kamu mau pakai?"
7. Kalau modalmu bisa balik begitu struk diverifikasi, bukan nunggu barang sampai,
   seberapa besar itu ngebantu? (validasi A-2)
8. Kenapa kamu tidak pakai platform jastip? (validasi §2.2)
```

**Minggu 2 — indexer + Skenario C:**

```
[ ] Indexer: paginasi 4.500 blok, mulai DEPLOY_BLOCK, retry backoff   (RPC-2, RPC-3)
[ ] Skema SQLite: orders, events, jastiper_stats
[ ] Backfill DEPLOY_BLOCK → latest, selesai tanpa galat
[ ] verify-independent/recompute.py — Python, TANPA impor dari kode kita (N-12)
[ ] Skrip mencetak nAccepted, nCompleted, uBuyers, TRUST — cocok dengan API
[ ] README di verify-independent/ ditulis untuk ORANG LUAR, bukan untuk tim
```

**Minggu 2–3 — pipeline verifikasi:**

```
[ ] AI-1 baca struk → JSON {merchant, tanggal, mataUang, nominal, item[], keyakinan}
[ ] Kalau keyakinan < ambang: JANGAN cairkan → arbiter                      (P2)
[ ] Modul FX: JPY/KRW/CNY/THB/USD → IDR → wei pakai kurs snapshot order     (KD-02)
[ ] AI-2 cocokkan foto barang dengan deskripsi → skor + alasan
[ ] Endpoint POST /verify/:orderId → panggil releaseCapital sebagai VERIFIER
[ ] DEMO_MODE=true membaca respons AI dari cache berkas — DIUJI, bukan diasumsikan
[ ] Batas rate: satu panggilan AI per verifikasi, hasil di-cache             (N-05)
```

**Minggu 4 — skoring:**

```
[ ] services/scoring/trust.ts implementasi §13 PERSIS, integer saja
[ ] Median: elemen yang lebih kecil dari dua tengah pada jumlah genap
[ ] Uji silang TS vs Python >= 20 kasus, termasuk: n=0, n=2, n=3, semua sengketa kalah,
    satu pembeli saja, jumlah data genap, jumlah data ganjil, maksimum sempurna
[ ] Kasus hitung tangan §13.3 keluar 90.50 di KEDUA implementasi
[ ] Publikasikan docs/TRUST-SPEC.md
```

**Minggu 5–6 — pitch:**

```
[ ] Naskah pitch (§20) DIHAFAL, bukan dibaca
[ ] Deck maksimum 8 slide, 1 slide = 1 gagasan
[ ] Video demo cadangan direkam DUA KALI, dua sudut layar berbeda
[ ] Tangkapan layar tiap langkah demo → deck darurat kalau video pun gagal
[ ] Latihan tanya-jawab: minta 3 orang di luar tim menyerang pakai §20.2
```

---

## 19. Runbook Demo Day

**Dicetak di kertas** dan dipegang saat tampil. Bukan dibaca dari laptop yang sedang dipakai demo.

### 19.1 H-1

```
[ ] Wallet pembeli terisi >= 0,5 tBNB
[ ] Wallet jastiper >= 0,1 tBNB (gas)
[ ] Wallet verifier >= 0,1 tBNB
[ ] Wallet arbiter >= 0,05 tBNB
[ ] Riwayat jastiper demo punya >= 3 order tuntas (kalau tidak, TRUST tidak tampil — N-13)
[ ] Order demo Skenario A SUDAH DIBUAT, tinggal diterima
[ ] Cache DEMO_MODE terisi respons AI untuk struk demo
[ ] Skrip Skenario C diuji dari HOTSPOT HP, bukan Wi-Fi venue        (RPC-4)
[ ] RPC cadangan diuji; cara menggantinya dilatih
[ ] Video cadangan ada di laptop DAN flash disk DAN cloud
[ ] Deck darurat berisi tangkapan layar siap
```

### 19.2 Tiga skenario demo

**Skenario A — jalur normal (90 detik).** Pembeli buat order "Skincare X, plafon Rp 1.200.000, fee Rp 150.000" → dana terkunci, tampil di BscScan → jastiper terima (profilnya menampilkan rekam jejak on-chain) → unggah foto struk Jepang → AI baca ¥11.000 → di bawah plafon → **modal cair otomatis**, fee masih terkunci → pembeli konfirmasi → **fee cair** → rekam jejak jastiper bertambah satu, terlihat langsung.

**Skenario B — jalur kecurangan (45 detik).** Order baru, jastiper unggah **foto barang dari katalog toko** → AI menandainya, pencairan **ditahan** → kasus masuk antrean arbiter dengan ringkasan bukti dari AI → arbiter memutuskan, putusan tercatat sebagai event.

**Skenario C — yang tidak bisa dilakukan platform lain (45 detik).** Buka profil jastiper → **tutup frontend kami** → jalankan `python recompute.py` yang membaca langsung dari BSC Testnet → angka identik → kalimat penutup.

> **Skenario C adalah momen yang memenangkan pitch. Kalau waktu mepet, kerjakan C sebelum B.**

### 19.3 Urutan 3 menit

| Waktu | Yang dilakukan | Kalau gagal |
|---|---|---|
| 0:00–0:30 | Masalah. Tanpa layar. Lihat juri, bukan laptop | — |
| 0:30–1:00 | Buka profil jastiper. Rekam jejak + 4 angka mentah | Screenshot |
| 1:00–2:00 | **Skenario A** | `DEMO_MODE=true`, lalu video |
| 2:00–2:30 | **Skenario C** | RPC cadangan, lalu video |
| 2:30–3:00 | Penutup (§20.1) | — |

### 19.4 Aturan saat gagal

1. **Jangan pernah men-debug di panggung.** Satu percobaan ulang, lalu pindah ke video. Titik.
2. Kalimat transisi yang sudah dilatih: *"jaringan testnet-nya lagi lambat, ini rekaman dari sesi yang sama tadi pagi"* — lalu lanjut tanpa jeda. **Jangan minta maaf berulang kali**; itu menghabiskan waktu dan kepercayaan diri.
3. Satu orang pegang laptop, satu orang bicara. **Jangan pernah orang yang sama.**
4. Kalau internet venue mati: hotspot HP sudah menyala dari awal, bukan dinyalakan saat panik.

---

## 20. Pitch & Tanya-Jawab Juri

### 20.1 Kerangka 3 menit

| Waktu | Bagian | Isi |
|---|---|---|
| 0:00–0:30 | **Masalah** | Jastip jalan di DM. Testimoni bisa diedit 30 detik. Rata-rata korban penipuan belanja online rugi **Rp 18,3 juta** `[Terverifikasi]`. Jastiper jujur dengan 500 transaksi mulus tidak bisa membuktikan apa pun |
| 0:30–1:00 | **Pertanyaan yang benar** | Kenapa belum ada platformnya? Karena setiap platform menyandera reputasi. Jastiper tahu itu — makanya mereka bertahan di Instagram |
| 1:00–2:00 | **Skenario A** | Order → struk Jepang dibaca AI → **AI menentukan nominal transfer** → modal cair → konfirmasi → fee cair. **Sisipkan:** "dan reputasinya bukan cuma lencana — jastiper baru hanya boleh menerima order kecil; plafonnya naik seiring rekam jejaknya, dipaksa kontrak" |
| 2:00–2:30 | **Skenario C** | Tutup frontend, hitung ulang dari rantai, angka sama persis |
| 2:30–3:00 | **Penutup** | Di bawah |

**Penutup — hafalkan kata per kata:**

> "Kami tidak bisa memanipulasi angka ini bahkan kalau kami mau. Dan kalau JEJAK mati besok, reputasi ini tetap milik dia. Itu janji yang tidak bisa diucapkan platform mana pun — termasuk kami, kalau kami menyimpannya di server sendiri."

### 20.2 Sebelas pertanyaan juri + jawaban

Latih dengan orang di luar tim. Bagian ini paling sering menentukan hasil.

**Q1 — "Kenapa harus blockchain? Bisa jadi database biasa."**
> "Registry ini harus dipercaya oleh pihak-pihak yang berebut jastiper yang sama. Setiap calon tuan rumah punya insentif memonetisasi lock-in-nya — termasuk kami. Janji 'reputasimu bukan di server kami' hanya bisa diucapkan kalau memang tidak ada server yang memegangnya. Kami membuktikannya di Skenario C, bukan mengklaimnya."

**Q2 — "Escrow kan sudah ada. Rekber, Shopee, Tokopedia."**
> "Betul, dan lebih baik dari yang bisa kami buat — mereka punya lisensi, CS, dan diawasi OJK. Tapi jastip tidak terjadi di marketplace: barangnya belum ada saat order dibuat dan harganya belum pasti. Dan yang lebih penting, reputasi penjual di sana tetap milik platform. Kami tidak bersaing pada perlindungan transaksi. Kami bersaing pada satu hal yang secara struktural tidak bisa mereka tawarkan."

**Q3 — "AI-nya cuma OCR, kan?"**
> "OCR mengeluarkan teks. AI kami mengeluarkan **angka yang jadi jumlah transfer**. Nominal yang dibaca dari struk Jepang itulah yang dicairkan kontrak. Kalau AI-nya salah baca, uangnya salah pindah. Itu bedanya dengan AI yang cuma menampilkan label."

**Q4 — "Kalau AI-nya dibajak?"**
> "Kerugian maksimum tetap plafon yang ditetapkan pembeli. Kontrak menolak nominal di atas plafon, apa pun yang dikirim backend. Kami punya tes fuzz yang mencobanya dengan nilai acak. Bukan janji — ada di CI."

**Q5 — "Arbiternya kalian sendiri. Jadi kalian tetap pihak terpusat."**
> "Memang, dan kami tidak menyembunyikannya. Bedanya: dia hanya bisa membagi uang yang sudah terkunci di order yang sedang bersengketa itu, tidak bisa menyentuh order lain, dan setiap putusannya jadi event publik. Jadi arbiter yang berat sebelah bisa dibuktikan berat sebelah oleh siapa pun, dengan skrip yang sama yang menghitung skor jastiper. Ke depan ini jadi komite 3-dari-5. Untuk hari ini yang penting adalah kuasanya dibatasi kode, bukan dibatasi janji."

**Q6 — "Order dalam Rupiah, escrow dalam BNB, struk dalam Yen. Konversinya bagaimana?"**
> "Semua matematika kontrak dalam wei — satu satuan, tidak pernah ada konversi di dalam kontrak. Rupiah dan Yen hanya lapisan tampilan. Kurs di-snapshot saat order dibuat dan dicatat on-chain sebagai catatan audit, jadi pembeli dan jastiper tahu kursnya sejak awal. Di produksi ini escrow stablecoin; di testnet kami pakai tBNB native karena alur approve ERC-20 menambah satu kelas bug tanpa menambah apa pun pada tesis kami."

**Q7 — "Kalau jastiper kasih struk asli lalu kabur bawa modal?"**
> "Itu lubang yang tidak kami tutup, dan kami sebut sendiri di slide batasan. Yang kami lakukan adalah membatasi ukurannya: jastiper baru hanya boleh menerima order kecil, plafonnya naik mengikuti rekam jejak yang dipaksa kontrak. Untuk mencuri besar, dia harus lebih dulu menyelesaikan puluhan order jujur dengan pembeli berbeda-beda. Kami menaikkan biayanya, tidak menutupnya."

**Q8 — "Reputasinya terikat wallet. Kalau wallet-nya hilang?"**
> "Hilang. Kami tidak menyelesaikan pemulihan akun — itu satu produk sendiri. Yang kami lakukan adalah binding dua arah ke akun Instagram lewat pesan bertanda tangan, sehingga klaim kepemilikannya bisa diverifikasi siapa pun. Kami sebut ini sebagai batasan, bukan fitur."

**Q9 — "Cold start. Reputasi baru berguna kalau sudah banyak."**
> "Betul, dan makanya modal cepat balik adalah alasan mereka **mulai** — bukan reputasi. Reputasi adalah alasan mereka **bertahan**. Demo kami menunjukkan sistem dengan sedikit transaksi, dan kami tidak menampilkan skor sama sekali sebelum tiga order tuntas."

**Q10 — "Berapa besar pasar jastip?"**
> `[Belum diketahui]` — **jangan mengarang.** Jawab: *"tidak ada data resminya; BPS tidak menerbitkan kategori ini dan kami tidak menemukan riset industri publik. Yang kami punya adalah angka penipuan belanja online — Rp 18,3 juta rata-rata per korban menurut data OJK — dan lima wawancara langsung dengan jastiper."*

**Q11 (pertanyaan hadiah) — "Apa yang tidak berhasil kalian selesaikan?"**
> Jawab dari §8.5: sybil belum selesai, keaslian barang tidak bisa dibuktikan foto, modal yang sudah cair tidak bisa ditarik balik, pemulihan wallet di luar cakupan, dan kami menambah kerepotan wallet & gas bagi pengguna. **Tim yang menjawab ini dengan lancar hampir selalu dinilai lebih tinggi daripada tim yang bilang "semuanya berhasil".**

---

## 21. Risiko

| # | Risiko | Dampak | Mitigasi | Pemilik |
|---|---|---|---|---|
| R-01 | Tim lintas negara tidak eligible | Fatal | Konfirmasi HARI INI (§17 tugas 0.5) | Siapa pun |
| R-02 | **Faucet butuh saldo BNB mainnet, tidak ada yang punya** | **Fatal, blocker hari 1** | §17 tugas 0.1–0.2 | Semua |
| R-03 | **RPC publik tidak mendukung `eth_getLogs` → Skenario C mati** | **Fatal** | §14.5, diuji Minggu 1 | AI & Pitch |
| R-04 | Contract Person tidak menyusul materi | Tinggi | Rangka berpasangan Minggu 1; gerbang 13 Agustus | Contract |
| R-05 | AI salah baca struk | Sedang | Ambang keyakinan → arbiter. Tidak pernah full-auto | AI & Pitch |
| R-06 | Batas rate API AI saat demo | Sedang | `DEMO_MODE` cache, diuji Minggu 3 | AI & Pitch |
| R-07 | Demo langsung gagal | Tinggi | Video cadangan + deck tangkapan layar (§19) | Semua |
| R-08 | Jastiper ternyata tidak butuh (A-1 salah) | Fatal | Wawancara Minggu 1, gerbang 13 Agustus | AI & Pitch |
| R-09 | Scope membengkak | Tinggi | MoSCoW dikunci; dua gerbang keputusan | Semua |
| R-10 | Juri menolak argumen "tidak ada tuan rumah" | Sedang | Skenario C sebagai bukti; §20.2 Q1 dilatih | AI & Pitch |
| R-11 | Kebocoran private key | Fatal | Wallet testnet, `.gitignore` commit pertama, `gitleaks` di CI | Semua |
| R-12 | **Implementasi skor TS dan Python beda hasil** | **Tinggi — merusak Skenario C di panggung** | Uji silang ≥20 kasus, Minggu 4 | AI & Pitch |
| R-13 | Event berubah tanpa pemberitahuan → indexer/frontend patah diam-diam | Sedang | §12.5 adalah kontrak antar-orang; perubahan diumumkan hari itu juga | Contract |
| R-14 | Deadline lebih awal dari asumsi | Tinggi | Minggu 7 penyangga; feature freeze 14 Sept tidak bergeser | Semua |
| R-15 | Wi-Fi venue mati saat demo | Sedang | Hotspot HP menyala dari awal; Skenario C diuji di jaringan lain | Semua |
| R-16 | **AI tidak cukup andal membaca struk (A-3 salah)** | Tinggi | Uji 10 struk Minggu 2; kalau <8 benar, turunkan AI-1 jadi "bantu manusia" dan ubah narasi | AI & Pitch |

---

## 22. Yang Belum Diketahui

**Jangan mengarang jawaban. Jangan menaruh tebakan di deck.**

| # | Pertanyaan | Kenapa mendesak | Status |
|---|---|---|---|
| 1 | Eligibility tim dengan anggota di luar negeri | Bisa membatalkan kelayakan menang. **Prioritas tertinggi** | `[Belum diketahui]` |
| 2 | Tanggal submission resmi | Seluruh timeline berdiri di atas asumsi akhir September (A-5) | `[Belum diketahui]` |
| 3 | Format & tanggal Demo Day (daring/luring, durasi, ada tanya-jawab?) | Menentukan runbook §19 | `[Belum diketahui]` |
| 4 | **Rubrik penilaian juri dan bobotnya** | §10 memakai rubrik umum, bukan rubrik lomba | `[Belum diketahui]` |
| 5 | Batas penggunaan AI generatif dalam pengerjaan | Risiko diskualifikasi | `[Belum diketahui]` |
| 6 | Kode wajib open source? Lisensi apa? | Menentukan LICENSE | `[Belum diketahui]` |
| 7 | Boleh pakai RPC pihak ketiga / tier gratis? | §14.5 bergantung pada ini | `[Belum diketahui]` |
| 8 | Jumlah pelaku & nilai transaksi jastip di Indonesia | Tidak ada data publik; **jangan dikarang** (§20.2 Q10) | `[Belum diketahui]` |

**Aturan:** setiap kali salah satu terjawab, perbarui dokumen ini dan sebutkan di grup. Dokumen berisi tebakan tak berlabel lebih berbahaya daripada dokumen yang mengaku tidak tahu.

---

## 23. Aturan Tim

1. **Pakai wallet khusus testnet.** Jangan pernah wallet berisi aset nyata.
2. **Jangan pernah commit private key atau `.env`.** `.gitignore` masuk **sebelum** baris kode pertama, dan `gitleaks` jalan di CI supaya aturannya dipaksa mesin, bukan diingat manusia.
3. **Aktif bertanya di grup peserta.** Mentoring sudah termasuk program dan paling sering tidak dimanfaatkan. **Bawa dokumen ini ke mentor di Sesi 8 dan minta mereka menyerangnya, bukan memujinya.**
4. **Setiap angka yang masuk dokumen ini wajib bertanda dan bersumber.** Angka tanpa tanda dihapus.
5. **Perubahan pada event kontrak diumumkan di grup hari itu juga.**

---

# LAMPIRAN

## Lampiran A — Glosarium

Untuk anggota tim yang belum familiar, dan untuk menjaga semua orang memakai istilah yang sama.

| Istilah | Arti |
|---|---|
| **Jastip / jasa titip** | Layanan membelikan barang untuk orang lain dengan imbalan fee |
| **Jastiper** | Orang yang menjalankan jasa titip |
| **Nombok / menalangi** | Membayar dulu dengan uang sendiri sebelum diganti pembeli |
| **Rekber** | Rekening bersama; istilah Indonesia untuk escrow |
| **Escrow** | Pihak/mekanisme ketiga yang menahan dana sampai syarat terpenuhi |
| **Smart contract** | Program di blockchain yang mengeksekusi aturan secara otomatis |
| **On-chain / off-chain** | Tersimpan di blockchain / di luar blockchain |
| **Event** | Catatan yang dipancarkan smart contract; jadi bahan baku indexer |
| **Indexer** | Program yang membaca event blockchain dan menyusunnya jadi data siap pakai |
| **`eth_getLogs`** | Perintah RPC untuk mengambil event. **Dinonaktifkan di RPC publik BSC** (§14.5) |
| **RPC** | Titik akses untuk berbicara dengan node blockchain |
| **wei** | Satuan terkecil BNB (1 BNB = 10¹⁸ wei) |
| **tBNB** | BNB testnet, tidak bernilai uang nyata |
| **Gas** | Biaya menjalankan transaksi di blockchain |
| **Faucet** | Layanan yang membagikan token testnet gratis |
| **keccak256 / hash** | Sidik jari digital sebuah berkas; berubah total kalau berkasnya diubah sedikit saja |
| **Reentrancy** | Serangan di mana kontrak dipanggil ulang sebelum selesai; kelas bug paling terkenal di Solidity |
| **Pull payment** | Pola di mana penerima menarik dananya sendiri, bukan dikirim otomatis |
| **Fuzz test** | Tes yang mencoba ribuan nilai acak untuk mencari yang memecahkan asumsi |
| **Invarian** | Pernyataan yang harus SELALU benar, apa pun yang terjadi |
| **Sybil attack** | Membuat banyak identitas palsu untuk memanipulasi sistem reputasi |
| **Oracle** | Jembatan yang membawa data dunia nyata ke blockchain. Di sini: backend AI |
| **Cold start** | Masalah produk yang baru berguna setelah banyak penggunanya |
| **MoSCoW** | Metode prioritas: Must / Should / Could / Won't |
| **BscScan** | Explorer untuk melihat transaksi dan kontrak di BNB Chain |

## Lampiran B — Ringkasan Perubahan v1.0 → v3.0

| Area | v1.0 | v3.0 |
|---|---|---|
| **Latar belakang & data** | Tidak ada | §1 dengan data OJK/Kominfo/GASA bertanda dan bersumber |
| **Rumusan masalah** | Naratif | §2 — RM-1…RM-5 formal + pohon masalah + akar masalah |
| **Tujuan & manfaat** | Tersirat | §3 — T-1…T-7 terukur, dipetakan ke RM; manfaat per pemangku kepentingan |
| **Batasan & asumsi** | Sebagian | §4 — batasan eksplisit + A-1…A-6 dengan cara pembatalannya |
| **Analisis kompetitor** | Tidak ada | §5 — rekber/Shopee/Tokopedia dianalisis, celah dipetakan |
| **Justifikasi keputusan** | Sebagian | §6 — sembilan "kenapa" dijawab, termasuk argumen yang sengaja ditolak |
| **Prinsip desain** | 5 | 7 (P6 dana tidak bergantung JEJAK; P7 sebut batasan duluan) |
| Satuan uang | Tidak dispesifikasikan | Semua wei; IDR/JPY tampilan; kurs di-snapshot (KD-01, KD-02) |
| Jalur dana | 4 (implisit) | 9, lengkap dengan state machine tertutup |
| Formula skor | Tidak ada | `JEJAK-TRUST v1.0`, integer, terverifikasi hitungannya |
| Anti-sybil MVP | AI-3 (tidak bisa didemokan) | Metrik keragaman pembeli deterministik + spanduk peringatan |
| Batas kerugian | Tidak ada | Plafon order berbasis tier, dipaksa kontrak (KD-04) |
| Arbiter | Satu alamat, tanpa pembelaan | Kuasa dibatasi kontrak + rekam jejak arbiter publik (KD-05) |
| Identitas | Tidak dibahas | Binding dua arah bertanda tangan (KD-06) |
| Penyimpanan bukti | "off-chain" | IPFS/Pinata + fallback jujur (KD-07) |
| Event | Nama saja | Signature lengkap + aturan `indexed` + cek silang ke formula |
| Tes | "≥80%" | 22 kasus dinamai + 5 invarian + 2 fuzz |
| RPC | Tidak dibahas | Wajib pihak ketiga, paginasi 4.500 blok, diuji lintas jaringan |
| Skenario C | Minggu 5 | **Minggu 2** |
| Timeline | Baseline 2 Agustus | Baseline 9 Agustus, 7 minggu |
| Tanya-jawab juri | Tidak ada | 11 pertanyaan dengan jawaban tertulis |
| Glosarium | Tidak ada | Lampiran A |

## Lampiran C — Daftar Periksa Submission

```
KODE
[ ] Kontrak ter-deploy di BSC Testnet
[ ] Kontrak terverifikasi di BscScan (kode sumber terbaca publik)
[ ] Repo publik, bernama jejak
[ ] Tidak ada .env / private key di seluruh riwayat Git (cek: gitleaks detect)
[ ] CI hijau

DOKUMENTASI
[ ] README: apa ini, masalah yang diselesaikan, alamat kontrak, cara menjalankan, arsitektur
[ ] docs/TRUST-SPEC.md dipublikasikan
[ ] docs/FUND-PATHS.md dipublikasikan
[ ] verify-independent/README.md ditulis untuk orang luar
[ ] LICENSE (setelah §22 no.6 terjawab)

DEMO
[ ] Skenario A jalan tanpa perintah manual di terminal
[ ] Skenario B jalan
[ ] Skenario C jalan, diuji dari jaringan berbeda
[ ] Video demo cadangan terekam
[ ] Deck darurat berisi tangkapan layar

PITCH
[ ] Deck <= 8 slide
[ ] Naskah 3 menit dihafal
[ ] Latihan >= 5 kali dengan stopwatch
[ ] Tanya-jawab §20.2 dilatih dengan orang di luar tim

INTEGRITAS
[ ] Setiap angka di deck punya sumber
[ ] Data benih berlabel di layar
[ ] Slide "yang tidak kami klaim" ada di deck
```

## Lampiran D — Daftar Sumber

Semua klaim bertanda `[Terverifikasi]` di dokumen ini berasal dari sumber berikut, dicek 9 Agustus 2026.

**Data penipuan & kerugian:**
- OJK via Jakarta Globe — kerugian penipuan online Rp 7,9 triliun (Nov 2024–Nov 2025): https://jakartaglobe.id/news/online-scams-drain-474-million-from-indonesians-in-a-year-ojk-says
- The Jakarta Post — laporan Rp 9,1 triliun (Feb 2026), **periode & metodologi berbeda**: https://www.thejakartapost.com/indonesia/2026/02/28/indonesia-lost-rp-9-1-trillion-to-online-fraud-report-suggests.html
- Databoks/Katadata — penipuan belanja online jenis terbanyak, 53.928 kasus, Rp 988 miliar, rata-rata Rp 18,3 juta/korban: https://databoks.katadata.co.id/en/finance/statistics/68f74ef7e7454/online-shopping-fraud-the-most-common-scam-in-indonesia

**Jastip & perlindungan hukum:**
- Zaaken: Journal of Civil and Business Law (Universitas Jambi) — risiko & celah perlindungan hukum jastip: https://online-journal.unja.ac.id/Zaaken/article/view/36987
- Kompas.id — jastiper melawan penipuan tiket konser: https://www.kompas.id/artikel/en-saat-jastipers-melawan-pelaku-penipuan-tiket-konser
- Binus IBM — peran jastip dalam perdagangan konsumen lintas negara: https://bbs.binus.ac.id/ibm/2026/06/peran-jasa-titip-jastip-dalam-perdagangan-konsumen-lintas-negara/

**Escrow / rekber yang sudah ada:**
- Repositori UMM — perlindungan hukum konsumen pengguna escrow di Shopee/Tokopedia/Bukalapak: https://eprints.umm.ac.id/id/eprint/18275/1/Perdana%20Muttaqin%20Arief%20-%20Consumer%20Legal%20Protection%20Escrow.pdf

**Teknis — BNB Chain:**
- BNB Chain JSON-RPC docs — `eth_getLogs` dinonaktifkan di endpoint publik: https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/
- Chainstack — batasan `eth_getLogs` dan paginasi: https://docs.chainstack.com/docs/understanding-eth-getlogs-limitations
- BNB Chain testnet faucet — syarat saldo mainnet: https://www.bnbchain.org/en/testnet-faucet
- chainid.network — BNB Smart Chain Testnet chainId 97: https://chainid.network/chain/97/

**Teknis — frontend:**
- RainbowKit npm (v2.2.11) & panduan upgrade wagmi v2: https://www.npmjs.com/package/@rainbow-me/rainbowkit · https://rainbowkit.com/guides/rainbowkit-wagmi-v2

---

*Dokumen v3.0 disusun 9 Agustus 2026. Menggabungkan MASTERPLAN v1.0 (narasi produk) dan audit v2.0 (teknis), ditambah latar belakang, rumusan masalah formal, tujuan terukur, analisis kompetitor, dan justifikasi setiap keputusan besar. Fakta bertanda `[Terverifikasi]` dicek ke sumber di Lampiran D. Butir bertanda `[Belum diketahui]` wajib dikonfirmasi dan tidak boleh diisi tebakan.*