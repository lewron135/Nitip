# Evaluasi AI-1 (`bacaStruk`) — bukan training

Ini **evaluasi**, bukan training. Tidak ada bobot model yang diubah di sini — yang
terjadi adalah memanggil `bacaStruk` (Claude, zero-shot, kode produksi yang sama
persis dipakai `services/verifier/api.ts`) atas sampel struk dari dataset publik
**[SROIE v2](https://www.kaggle.com/datasets/urbikn/sroie-datasetv2)** (ICDAR 2019),
lalu membandingkan hasilnya ke label ground-truth yang disediakan dataset itu.

Kalau ditanya juri: "kami tidak melatih model, kami mengukur seberapa akurat model
yang sudah jadi membaca struk — dan angkanya bisa dihitung ulang siapa pun dari
`results/hasil-eval.json`."

## Kenapa SROIE bukan tes sempurna untuk JEJAK

SROIE isinya struk scan rapi berbahasa Inggris. Kasus tersulit JEJAK — struk termal
miring/pudar berbahasa Jepang/Korea/Mandarin/Thailand (lihat `INSTRUKSI_STRUK` di
`services/verifier/ai.ts`) — tidak terwakili di sini. Evaluasi ini memvalidasi
**pipeline**-nya (skema JSON, ekstraksi total/tanggal/merchant, kalibrasi
`keyakinan`), bukan ketahanan terhadap struk multibahasa yang buram.

## Cara jalanin

Butuh dataset SROIE v2 sudah diekstrak ke `Data/SROIE2019/` di akar repo (folder ini
sengaja di-`.gitignore`, ~1GB, jangan dicommit), dan `AI_API_KEY` sudah terisi di
`.env` (lihat root README).

```bash
cd services
npx tsx eval/run-eval.ts            # default 10 sampel
npx tsx eval/run-eval.ts 30          # atau jumlah sampel sendiri
```

Setiap struk yang sudah pernah dites di-cache di `eval/results/respons-ai/<nama>.json` —
jalanin ulang script-nya (tambah sampel, ubah kode) TIDAK memanggil API lagi untuk
struk yang sudah ada cache-nya. Hapus filenya kalau memang mau baca ulang.

**Catatan mode mock:** tanpa `AI_API_KEY` (atau `DEMO_MODE=true`), `bacaStruk` balik
ke fixture statis yang SAMA untuk setiap gambar — jalan tanpa error, tapi angka
akurasinya tidak berarti apa-apa (bukan benar-benar membaca strukmu). Evaluasi ini
cuma valid kalau `sumber` di hasilnya `"ai"`, bukan `"mock"`.

## Isi folder

- `run-eval.ts` — jalanin `bacaStruk` atas sampel, bandingkan ke label, tulis hasil.
- `results/hasil-eval.json` — hasil mentah per struk (bukti yang bisa dihitung ulang).
- `results/respons-ai/` — cache respons AI per struk, biar rerun tidak boros token.
- `analisis.ipynb` — notebook baca `hasil-eval.json`, hitung akurasi, bikin grafik.
  Notebook ini **tidak memanggil AI** — murni baca hasil yang sudah ada, jadi
  buka-tutup ulang untuk edit grafik itu gratis, nol token.

## Biaya

Perkiraan biaya per struk dengan `claude-sonnet-5` ada di ringkasan output script
(lihat kolom `perkiraanBiayaUsd`). Ini estimasi dari ukuran gambar setelah di-resize
`perkecilUntukAi`, bukan angka meteran asli dari Anthropic — untuk angka pasti, cek
usage di [console.anthropic.com](https://console.anthropic.com/settings/usage).
