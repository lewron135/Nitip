#!/usr/bin/env python3
"""
recompute.py — menghitung ulang skor JEJAK-TRUST v1.0 langsung dari rantai.

═══════════════════════════════════════════════════════════════════════
  UNTUK PEMBACA YANG BUKAN BAGIAN DARI TIM JEJAK
═══════════════════════════════════════════════════════════════════════

Skrip ini ada supaya kamu tidak perlu mempercayai kami.

JEJAK menampilkan sebuah angka reputasi untuk setiap jastiper. Klaim kami
adalah: angka itu BUKAN sesuatu yang kami simpan dan bisa kami ubah — ia
diturunkan dari event publik di blockchain, dan siapa pun bisa
menghitungnya ulang sendiri.

Berkas ini adalah pembuktian klaim tersebut. Ia:

  · TIDAK mengimpor satu baris pun kode JEJAK
  · TIDAK memanggil server JEJAK
  · TIDAK punya dependensi pihak ketiga — hanya pustaka standar Python
  · membaca event langsung dari node BNB Smart Chain lewat JSON-RPC
  · menerapkan formula yang dipublikasikan di docs/TRUST-SPEC.md

Kalau angka yang keluar dari sini berbeda dengan angka di layar JEJAK,
yang salah adalah JEJAK — dan kamu baru saja membuktikannya.

  python recompute.py 0xAlamatJastiper

Argumen lain (opsional):
  --rpc URL          endpoint RPC. WAJIB yang mendukung eth_getLogs.
  --contract 0x…     alamat kontrak JejakEscrow.
  --from-block N     blok tempat kontrak di-deploy.
  --page N           besar halaman eth_getLogs (bawaan 4500).
  --json             keluarkan JSON, bukan laporan untuk manusia.

Nilai bawaan dibaca dari berkas `deployment.json` di folder ini kalau ada.

═══════════════════════════════════════════════════════════════════════
  CATATAN TENTANG PENYEDIA RPC — BACA KALAU SKRIP INI GAGAL
═══════════════════════════════════════════════════════════════════════
Endpoint RPC publik resmi BNB Smart Chain MENONAKTIFKAN `eth_getLogs`.
Skrip ini seluruhnya bergantung padanya. Kalau kamu melihat galat
"method not found" atau "limit exceeded", ganti `--rpc` ke penyedia pihak
ketiga (dRPC, PublicNode, Chainstack, Ankr, GetBlock, OnFinality).
Itu bukan kelemahan skrip ini; itu kebijakan endpoint publiknya.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

from keccak import keccak_hex


def paksa_utf8() -> None:
    """
    Konsol Windows bawaan memakai cp1252 dan melempar UnicodeEncodeError pada
    karakter seperti "→" atau "─". Laporan skrip ini memakai keduanya, jadi
    keluarannya dipaksa UTF-8. Dipanggil sekali di awal — bukan hal sepele:
    skrip yang mati karena karakter garis di laptop demo tetap saja mati.
    """
    for aliran in (sys.stdout, sys.stderr):
        try:
            aliran.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
        except (AttributeError, ValueError):
            pass

# ═══════════════════════════════════════════════════════════════════════
#  TANDA TANGAN EVENT
#  Cocokkan string di bawah dengan deklarasi event di
#  contracts/src/JejakEscrow.sol. Kalau sama, skrip ini membaca event yang
#  sama dengan yang dipancarkan kontrak — tidak ada ruang untuk kecurangan.
# ═══════════════════════════════════════════════════════════════════════

TANDA_TANGAN = {
    "OrderAccepted": "OrderAccepted(uint256,address,uint64,uint64)",
    "OrderCompleted": "OrderCompleted(uint256,address,address,uint128,uint64,bool)",
    "OrderAbandoned": "OrderAbandoned(uint256,address,address,uint128)",
    "DisputeResolved": "DisputeResolved(uint256,address,uint128,uint128,bytes32)",
}

TOPIC0 = {nama: keccak_hex(sig) for nama, sig in TANDA_TANGAN.items()}
NAMA_DARI_TOPIC = {topic: nama for nama, topic in TOPIC0.items()}


# ═══════════════════════════════════════════════════════════════════════
#  JSON-RPC — pustaka standar saja
# ═══════════════════════════════════════════════════════════════════════


def rpc(url: str, metode: str, params: list) -> object:
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": metode, "params": params}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        # User-Agent bawaan urllib ("Python-urllib/3.x") ditolak 403 oleh
        # publicnode & drpc — keduanya memblokirnya sebagai trafik bot.
        # Ditemukan saat uji Skenario C terhadap BSC Testnet asli (§14.5
        # RPC-4): `curl` polos lolos, urllib default tidak. Header di bawah
        # meniru browser biasa supaya skrip ini tidak gagal di panggung.
        headers={
            "content-type": "application/json",
            "user-agent": "Mozilla/5.0 (compatible; jejak-verify-independent/1.0)"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        raise SystemExit(f"Tidak bisa menghubungi RPC {url}: {e}")

    if "error" in body:
        pesan = body["error"].get("message", str(body["error"]))
        if "getLogs" in pesan or "not available" in pesan or "not found" in pesan:
            raise SystemExit(
                f"RPC menolak {metode}: {pesan}\n\n"
                "Endpoint ini kemungkinan menonaktifkan eth_getLogs. Ganti --rpc ke\n"
                "penyedia pihak ketiga (dRPC, PublicNode, Chainstack, Ankr)."
            )
        raise SystemExit(f"RPC error pada {metode}: {pesan}")

    return body["result"]


def ambil_log(url: str, kontrak: str, dari: int, sampai: int, ukuran_halaman: int) -> list[dict]:
    """
    eth_getLogs dengan PAGINASI WAJIB.

    Penyedia RPC menolak rentang blok yang lebar dengan galat "-32005 limit
    exceeded". Panduan menyebut batas 5.000 blok; kami memakai 4.500 sebagai
    margin. Meminta "dari blok deploy sampai sekarang" dalam satu panggilan
    akan bekerja sempurna di rantai lokal dan gagal total di testnet.
    """
    semua: list[dict] = []
    mulai = dari
    topics = [list(TOPIC0.values())]

    while mulai <= sampai:
        akhir = min(mulai + ukuran_halaman - 1, sampai)
        hasil = rpc(
            url,
            "eth_getLogs",
            [
                {
                    "address": kontrak,
                    "fromBlock": hex(mulai),
                    "toBlock": hex(akhir),
                    "topics": topics,
                }
            ],
        )
        semua.extend(hasil)  # type: ignore[arg-type]
        mulai = akhir + 1

    return semua


# ═══════════════════════════════════════════════════════════════════════
#  DEKODE LOG
#  Semua field yang kami butuhkan berukuran tetap 32 byte per kata, jadi
#  dekodenya adalah pemotongan string — tidak butuh pustaka ABI.
# ═══════════════════════════════════════════════════════════════════════


def _kata(data: str, indeks: int) -> int:
    """Ambil kata ke-`indeks` (32 byte) dari field `data`, sebagai bilangan bulat."""
    mentah = data[2:] if data.startswith("0x") else data
    potongan = mentah[indeks * 64 : (indeks + 1) * 64]
    return int(potongan, 16) if potongan else 0


def _alamat(topic: str) -> str:
    """Topic beralamat adalah 32 byte dengan alamat di 20 byte terakhir."""
    return "0x" + topic[-40:].lower()


def dekode(log: dict) -> dict | None:
    topics = log["topics"]
    nama = NAMA_DARI_TOPIC.get(topics[0].lower())
    if nama is None:
        return None

    dasar = {
        "nama": nama,
        "orderId": int(topics[1], 16),
        "blockNumber": int(log["blockNumber"], 16),
    }

    if nama == "OrderAccepted":
        # event OrderAccepted(uint256 indexed orderId, address indexed jastiper,
        #                     uint64 acceptedAt, uint64 proofDeadline)
        return {**dasar, "jastiper": _alamat(topics[2]), "acceptedAt": _kata(log["data"], 0)}

    if nama == "OrderCompleted":
        # event OrderCompleted(uint256 indexed orderId, address indexed jastiper,
        #                      address indexed buyer, uint128 totalWei,
        #                      uint64 completedAt, bool autoReleased)
        return {
            **dasar,
            "jastiper": _alamat(topics[2]),
            "buyer": _alamat(topics[3]),
            "totalWei": _kata(log["data"], 0),
            "completedAt": _kata(log["data"], 1),
        }

    if nama == "OrderAbandoned":
        # event OrderAbandoned(uint256 indexed orderId, address indexed jastiper,
        #                      address indexed buyer, uint128 refundWei)
        return {**dasar, "jastiper": _alamat(topics[2])}

    if nama == "DisputeResolved":
        # event DisputeResolved(uint256 indexed orderId, address indexed arbiter,
        #                       uint128 buyerWei, uint128 jastiperWei, bytes32 reasonHash)
        return {
            **dasar,
            "buyerWei": _kata(log["data"], 0),
            "jastiperWei": _kata(log["data"], 1),
        }

    return None


# ═══════════════════════════════════════════════════════════════════════
#  FORMULA — JEJAK-TRUST v1.0  (docs/TRUST-SPEC.md §13.3)
#  Aritmetika bilangan bulat saja. Tidak ada float. Tidak ada logaritma.
#  Setiap pembagian dibulatkan KE BAWAH — `//` di Python pada bilangan
#  non-negatif melakukan persis itu.
# ═══════════════════════════════════════════════════════════════════════

VERSI = "JEJAK-TRUST v1.0"
MIN_TUNTAS_UNTUK_SKOR = 3
E18 = 10**18


def volume_tier(v_total_wei: int) -> int:
    if v_total_wei < E18 // 10:
        return 0
    if v_total_wei < E18 // 2:
        return 2500
    if v_total_wei < 2 * E18:
        return 5000
    if v_total_wei < 10 * E18:
        return 7500
    return 10000


def speed_tier(med_hours: int) -> int:
    if med_hours <= 48:
        return 10000
    if med_hours <= 96:
        return 7500
    if med_hours <= 168:
        return 5000
    if med_hours <= 336:
        return 2500
    return 0


def median_jam(nilai: list[int]) -> int:
    """
    Median dengan definisi yang WAJIB eksplisit (§13.2).

    Pada jumlah data GENAP, ambil ELEMEN YANG LEBIH KECIL dari dua elemen
    tengah — BUKAN rata-ratanya. Merata-ratakan memunculkan pecahan, dan
    pecahan adalah pintu masuk perbedaan antar-bahasa.

        [10, 20, 30, 40] → 20   (bukan 25)
    """
    if not nilai:
        return 0
    urut = sorted(nilai)
    idx = (len(urut) - 1) // 2 if len(urut) % 2 == 1 else len(urut) // 2 - 1
    return urut[idx]


def format_trust(trust_bp: int) -> str:
    """Basis poin → teks dua desimal, tanpa pembagian pecahan."""
    return f"{trust_bp // 100}.{trust_bp % 100:02d}"


def hitung_trust(
    n_accepted: int,
    n_completed: int,
    n_abandoned: int,
    n_lost: int,
    v_total_wei: int,
    u_buyers: int,
    med_hours: int,
) -> dict:
    if n_completed < MIN_TUNTAS_UNTUK_SKOR:
        return {
            "version": VERSI,
            "trust": None,
            "trustBp": None,
            "reason": "belum-cukup-data",
            "components": {"comp": 0, "disp": 0, "vol": 0, "spd": 0, "div": 0},
        }

    comp = (10000 * n_completed) // n_accepted
    disp_mentah = (10000 * (n_lost + n_abandoned)) // n_accepted
    # Penjepit yang sama dengan implementasi TypeScript. Dalam data sehat ini
    # mustahil terpicu; ia ada supaya data rusak menghasilkan 0, bukan negatif.
    disp = min(disp_mentah, 10000)
    vol = volume_tier(v_total_wei)
    spd = speed_tier(med_hours)
    div = (10000 * u_buyers) // n_completed

    trust_bp = (35 * comp + 30 * (10000 - disp) + 15 * vol + 10 * spd + 10 * div) // 100

    return {
        "version": VERSI,
        "trust": format_trust(trust_bp),
        "trustBp": trust_bp,
        "components": {"comp": comp, "disp": disp, "vol": vol, "spd": spd, "div": div},
    }


# ═══════════════════════════════════════════════════════════════════════
#  MERANGKAI EVENT MENJADI MASUKAN FORMULA
#  Definisi di bawah disalin apa adanya dari services/indexer/stats.ts.
#  Kalau salah satu berubah, keduanya berubah di commit yang sama.
# ═══════════════════════════════════════════════════════════════════════

DETIK_PER_JAM = 3600


def rangkai(events: list[dict], jastiper: str) -> dict:
    j = jastiper.lower()

    # "Diterima" = order yang pernah dipancarkan OrderAccepted dengan alamat ini.
    diterima = {e["orderId"]: e for e in events if e["nama"] == "OrderAccepted" and e["jastiper"] == j}

    tuntas = [e for e in events if e["nama"] == "OrderCompleted" and e["jastiper"] == j]
    ditinggalkan = [e for e in events if e["nama"] == "OrderAbandoned" and e["jastiper"] == j]

    # "Kalah sengketa" = putusan yang memberi pembeli LEBIH BANYAK daripada
    # jastiper. Seri TIDAK dihitung kalah. Karena DisputeResolved tidak memuat
    # alamat jastiper, order dicocokkan lewat orderId ke daftar yang pernah
    # diterima alamat ini.
    kalah = [
        e
        for e in events
        if e["nama"] == "DisputeResolved"
        and e["orderId"] in diterima
        and e["buyerWei"] > e["jastiperWei"]
    ]

    v_total = sum(e["totalWei"] for e in tuntas)
    pembeli_unik = {e["buyer"] for e in tuntas}

    # Jam penyelesaian = OrderAccepted.acceptedAt → OrderCompleted.completedAt,
    # DIBULATKAN KE BAWAH ke jam penuh.
    jam: list[int] = []
    for e in tuntas:
        awal = diterima.get(e["orderId"])
        if awal is None:
            continue
        detik = max(0, e["completedAt"] - awal["acceptedAt"])
        jam.append(detik // DETIK_PER_JAM)

    return {
        "nAccepted": len(diterima),
        "nCompleted": len(tuntas),
        "nAbandoned": len(ditinggalkan),
        "nLost": len(kalah),
        "vTotalWei": v_total,
        "uBuyers": len(pembeli_unik),
        "medHours": median_jam(jam),
        "completionHours": sorted(jam),
    }


# ═══════════════════════════════════════════════════════════════════════
#  ANTARMUKA BARIS PERINTAH
# ═══════════════════════════════════════════════════════════════════════


def muat_bawaan() -> dict:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "deployment.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def main() -> int:
    paksa_utf8()
    bawaan = muat_bawaan()

    p = argparse.ArgumentParser(
        description="Hitung ulang skor JEJAK-TRUST langsung dari BNB Smart Chain.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("jastiper", help="Alamat wallet jastiper (0x…).")
    p.add_argument("--rpc", default=bawaan.get("rpc", "https://bsc-testnet-rpc.publicnode.com"))
    p.add_argument("--contract", default=bawaan.get("address"))
    p.add_argument("--from-block", type=int, default=bawaan.get("deployBlock", 0))
    p.add_argument("--to-block", default="latest")
    p.add_argument("--page", type=int, default=4500)
    p.add_argument("--json", action="store_true", help="Keluarkan JSON mentah.")
    args = p.parse_args()

    if not args.contract:
        print("Alamat kontrak belum diketahui. Beri --contract 0x… atau buat deployment.json.", file=sys.stderr)
        return 2

    if not (args.jastiper.startswith("0x") and len(args.jastiper) == 42):
        print(f"Alamat jastiper tidak sah: {args.jastiper}", file=sys.stderr)
        return 2

    sampai = (
        int(rpc(args.rpc, "eth_blockNumber", []), 16)  # type: ignore[arg-type]
        if args.to_block == "latest"
        else int(args.to_block)
    )

    if not args.json:
        print()
        print("  JEJAK — perhitungan ulang independen")
        print("  ────────────────────────────────────────────────────")
        print(f"  RPC        : {args.rpc}")
        print(f"  kontrak    : {args.contract}")
        print(f"  rentang    : blok {args.from_block} → {sampai}")
        print(f"  jastiper   : {args.jastiper}")
        print()
        print("  topic0 diturunkan dari tanda tangan event (bukan disalin):")
        for nama, sig in TANDA_TANGAN.items():
            print(f"    {TOPIC0[nama][:18]}…  {sig}")
        print()

    logs = ambil_log(args.rpc, args.contract, args.from_block, sampai, args.page)
    events = [d for d in (dekode(l) for l in logs) if d is not None]

    masukan = rangkai(events, args.jastiper)
    hasil = hitung_trust(
        masukan["nAccepted"],
        masukan["nCompleted"],
        masukan["nAbandoned"],
        masukan["nLost"],
        masukan["vTotalWei"],
        masukan["uBuyers"],
        masukan["medHours"],
    )

    peringatan = masukan["uBuyers"] * 2 < masukan["nCompleted"]

    if args.json:
        print(json.dumps({"input": masukan, "hasil": hasil, "peringatanKonsentrasi": peringatan}, indent=2))
        return 0

    print(f"  {len(logs)} log terbaca, {len(events)} event relevan.")
    print()
    print("  MASUKAN (semuanya dari event on-chain, nol data dari server JEJAK)")
    print(f"    nAccepted  : {masukan['nAccepted']}")
    print(f"    nCompleted : {masukan['nCompleted']}")
    print(f"    nAbandoned : {masukan['nAbandoned']}")
    print(f"    nLost      : {masukan['nLost']}")
    print(f"    vTotal     : {masukan['vTotalWei']} wei")
    print(f"    uBuyers    : {masukan['uBuyers']}")
    print(f"    medHours   : {masukan['medHours']}   dari {masukan['completionHours']}")
    print()

    if hasil["trust"] is None:
        print("  TRUST      : belum cukup data (n < 3)")
        print()
        print("  Ini bukan galat. JEJAK sengaja tidak menampilkan skor sebelum")
        print("  tiga order tuntas — reputasi dengan dua titik data menyesatkan.")
    else:
        k = hasil["components"]
        print(f"  KOMPONEN   : comp={k['comp']} disp={k['disp']} vol={k['vol']} spd={k['spd']} div={k['div']}")
        print(f"               (35·comp + 30·(10000−disp) + 15·vol + 10·spd + 10·div) / 100")
        print()
        print(f"  TRUST      : {hasil['trust']} / 100   ({hasil['version']})")

    if peringatan:
        print()
        print("  PERINGATAN : sebagian besar transaksi jastiper ini berasal dari")
        print("               sedikit pembeli yang sama (uBuyers × 2 < nCompleted).")

    print()
    print("  ────────────────────────────────────────────────────")
    print("  Angka di atas dihitung tanpa menyentuh satu pun kode atau server")
    print("  JEJAK. Bandingkan dengan yang tampil di halaman profil. Kalau")
    print("  berbeda, yang salah adalah JEJAK.")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
