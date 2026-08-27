# JEJAK

**Escrow jastip dengan reputasi portabel.** Indonesia Web3 Hackathon 2026 — Finance & Commerce.

Escrow untuk transaksi jasa titip (jastip) yang, sebagai hasil sampingannya, memproduksi rekam jejak
jastiper yang tidak bisa dipalsukan dan tidak bisa disandera platform mana pun — termasuk oleh JEJAK
sendiri.

> Spesifikasi lengkap (rumusan masalah, keputusan desain, state machine, formula skor) ada di
> [`docs/MASTERPLAN-JEJAK.md`](docs/MASTERPLAN-JEJAK.md). README ini ringkasannya.

---

## Kenapa

Jastip berjalan di DM Instagram/WhatsApp: pembeli transfer buta ke rekening pribadi orang asing, lalu
menunggu tanpa jaminan apa pun. Escrow marketplace sudah ada, tapi jastip tidak terjadi di marketplace —
dan jastiper menolak masuk platform karena reputasi yang mereka bangun bertahun-tahun jadi disandera
platform itu begitu mereka keluar.

JEJAK memisahkan dua hal itu: escrow menahan dana, dan reputasi diturunkan dari event on-chain publik
yang siapa pun bisa hitung ulang — jadi tidak ada pihak yang bisa menyanderanya, JEJAK sekalipun.

## Arsitektur

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend   │────▶│   Backend    │────▶│   Layanan AI    │
│  Next.js    │     │   Node/API   │     │  (LLM + vision) │
│  wagmi/viem │     │              │     │                 │
└──────┬──────┘     └──────┬───────┘     └─────────────────┘
       │ wallet            │ peran VERIFIER
       ▼                   ▼
┌─────────────────────────────────────────────┐
│      JejakEscrow.sol — BSC Testnet          │
└──────────────┬──────────────────────────────┘
               │ events
               ├──────────────────────┐
               ▼                      ▼
       ┌───────────────┐      ┌────────────────────────┐
       │    Indexer    │      │  verify-independent/   │
       │  event → DB   │      │  recompute.py (Python) │
       └───────────────┘      │  nol dependensi ke kode │
                               │  kami — verifikasi lepas│
                               └────────────────────────┘
```

Skor reputasi **tidak disimpan on-chain**. Ia diturunkan dari event (`JEJAK-TRUST v1.0`,
lihat `docs/MASTERPLAN-JEJAK.md` §13) dan bisa dihitung ulang siapa pun — dibuktikan dengan
`verify-independent/`, implementasi Python yang sengaja terpisah dari kode TypeScript kami.

## Struktur repo

| Folder | Isi |
|---|---|
| `contracts/` | Kontrak `JejakEscrow.sol` (Foundry) — satu-satunya kontrak |
| `services/` | Indexer, verifier API (AI), dan mesin skor `JEJAK-TRUST` (Node/TypeScript) |
| `web/` | Frontend (Next.js + wagmi/viem/RainbowKit) |
| `verify-independent/` | Verifikasi skor independen (Python, nol dependensi ke kode kami) |
| `scripts/` | Sinkronisasi ABI & catatan deployment antar-package |
| `docs/` | `MASTERPLAN-JEJAK.md` — spesifikasi lengkap |

## Mulai cepat

Butuh Foundry, Node.js ≥22.5, dan Python 3.

```bash
git clone <repo-url> && cd Nitip
cp .env.example .env        # isi nilainya — lihat docs/MASTERPLAN-JEJAK.md §14.4
```

**Kontrak:**
```bash
cd contracts
forge install
forge build
forge test
```

**Backend (indexer + verifier API):**
```bash
cd services
npm install
npm run verifier    # API di :8787
npm run indexer     # baca event on-chain ke SQLite
```

**Frontend:**
```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

**Verifikasi skor independen:**
```bash
cd verify-independent
python -m venv .venv && source .venv/bin/activate
pip install web3 requests
python recompute.py 0xAlamatJastiper
```

## Perintah penting

| Perintah | Di mana | Fungsi |
|---|---|---|
| `forge test -vvv` | `contracts/` | Jalankan semua tes kontrak |
| `forge coverage` | `contracts/` | Cakupan tes jalur dana (lantai 80%) |
| `npm test` | `services/` | Tes unit indexer/verifier/scoring (vitest) |
| `npm run typecheck` | `services/` | Cek tipe tanpa build |
| `npm run lint` | `web/` | Lint frontend |
| `node scripts/export-abi.mjs` | root | Sinkron ulang ABI ke `services/` & `web/` setelah deploy |

Daftar perintah lengkap (deploy, cast, RPC sanity check, dst.) ada di
`docs/MASTERPLAN-JEJAK.md` §14.3–§14.5.

## Kontrak ter-deploy

| Jaringan | Chain ID | Alamat |
|---|---|---|
| BSC Testnet | `97` | [`0x66e802417789b4dE7F75DcB70F36434c6112e9d3`](https://testnet.bscscan.com/address/0x66e802417789b4dE7F75DcB70F36434c6112e9d3) |

Sumber kebenaran: `contracts/deployments/bsc-testnet.json` — jangan salin alamat secara manual, pakai
`scripts/export-abi.mjs` / `scripts/record-deployment.mjs`.

## Status

- [x] Kontrak `JejakEscrow.sol` — state machine, jalur dana, invariant fuzz test
- [x] Deploy ke BSC Testnet
- [x] Indexer, verifier API (dengan AI, ada mock mode), mesin skor
- [x] Verifikasi skor independen (Python)
- [ ] Frontend — masih scaffold, belum ada alur pesan/terima order
- [ ] CI (`forge test` + `gitleaks`)

## Dokumentasi lengkap

Semua keputusan desain, justifikasi, spesifikasi kontrak, formula skor, dan rencana pengujian ada di
[`docs/MASTERPLAN-JEJAK.md`](docs/MASTERPLAN-JEJAK.md).
