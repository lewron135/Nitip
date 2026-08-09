"""
keccak.py — Keccak-256 murni Python, tanpa dependensi apa pun.

KENAPA BERKAS INI ADA
─────────────────────
`hashlib` bawaan Python punya `sha3_256`, tapi ITU BUKAN keccak256 yang
dipakai Ethereum. Keduanya identik kecuali satu byte padding (0x06 untuk
SHA-3 yang distandardisasi NIST, 0x01 untuk Keccak asli), dan satu byte itu
membuat seluruh hash berbeda.

Kami butuh keccak256 untuk satu hal: menurunkan `topic0` setiap event dari
STRING TANDA TANGANNYA. Itu penting untuk Skenario C. Kalau topic0 ditulis
sebagai konstanta heksadesimal, pembaca harus percaya begitu saja bahwa
angka itu benar. Dengan menurunkannya di depan mata, siapa pun bisa
mencocokkan string `"OrderCompleted(uint256,address,address,uint128,uint64,bool)"`
di sini dengan deklarasi event di JejakEscrow.sol, dan melihat sendiri
bahwa skrip ini membaca event yang sama.

Implementasinya adalah Keccak-f[1600] standar. Diverifikasi terhadap vektor
uji yang diketahui di bagian bawah berkas — jalankan `python keccak.py`.
"""

_MASK64 = (1 << 64) - 1

_RC = [
    0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
    0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
    0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
    0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
    0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
    0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
]

# Offset rotasi langkah rho, r[x][y].
_R = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14],
]


def _rol(value: int, shift: int) -> int:
    shift %= 64
    return ((value << shift) | (value >> (64 - shift))) & _MASK64


def _keccak_f(state: list[int]) -> list[int]:
    for rnd in range(24):
        # theta
        c = [state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20] for x in range(5)]
        d = [c[(x - 1) % 5] ^ _rol(c[(x + 1) % 5], 1) for x in range(5)]
        for x in range(5):
            for y in range(5):
                state[x + 5 * y] ^= d[x]

        # rho + pi
        b = [0] * 25
        for x in range(5):
            for y in range(5):
                b[y + 5 * ((2 * x + 3 * y) % 5)] = _rol(state[x + 5 * y], _R[x][y])

        # chi
        for x in range(5):
            for y in range(5):
                state[x + 5 * y] = b[x + 5 * y] ^ ((~b[(x + 1) % 5 + 5 * y]) & _MASK64 & b[(x + 2) % 5 + 5 * y])

        # iota
        state[0] ^= _RC[rnd]

    return state


def keccak256(data: bytes) -> bytes:
    """Keccak-256 sebagaimana dipakai Ethereum (padding 0x01, bukan 0x06)."""
    rate = 136  # 1088 bit untuk keluaran 256 bit
    state = [0] * 25

    # Padding pad10*1 versi Keccak asli.
    padded = bytearray(data)
    padded.append(0x01)
    while len(padded) % rate != 0:
        padded.append(0x00)
    padded[-1] |= 0x80

    for blok in range(0, len(padded), rate):
        potongan = padded[blok:blok + rate]
        for i in range(rate // 8):
            state[i] ^= int.from_bytes(potongan[i * 8:(i + 1) * 8], "little")
        state = _keccak_f(state)

    keluaran = bytearray()
    while len(keluaran) < 32:
        for i in range(rate // 8):
            keluaran += state[i].to_bytes(8, "little")
            if len(keluaran) >= 32:
                break
        if len(keluaran) < 32:
            state = _keccak_f(state)

    return bytes(keluaran[:32])


def keccak_hex(teks: str) -> str:
    """Hash sebuah string ASCII, kembalikan bentuk `0x…` — inilah topic0 event."""
    return "0x" + keccak256(teks.encode("utf-8")).hex()


# ─────────────────────────────────────────────────────────────────────
#  Uji mandiri. Kalau ini gagal, JANGAN percaya angka apa pun dari skrip
#  ini — dan jangan naik panggung dengan skrip yang belum dijalankan.
# ─────────────────────────────────────────────────────────────────────

_VEKTOR_UJI = [
    (b"", "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"),
    (b"abc", "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45"),
    (
        b"The quick brown fox jumps over the lazy dog",
        "4d741b6f1eb29cb2a9b9911c82f56fa8d73b04959d3d9d222895df6c0b28aa15",
    ),
    # Tanda tangan event Transfer ERC-20 — topic0 paling terkenal di Ethereum,
    # jadi siapa pun bisa mencocokkannya dengan explorer mana pun.
    (
        b"Transfer(address,address,uint256)",
        "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    ),
]


def uji_mandiri() -> bool:
    semua_lulus = True
    for masukan, diharapkan in _VEKTOR_UJI:
        hasil = keccak256(masukan).hex()
        lulus = hasil == diharapkan
        semua_lulus = semua_lulus and lulus
        tanda = "OK  " if lulus else "GAGAL"
        label = masukan.decode("utf-8", "replace") or "(string kosong)"
        print(f"  [{tanda}] keccak256({label[:45]!r}) = {hasil[:16]}…")
        if not lulus:
            print(f"          diharapkan {diharapkan[:16]}…")
    return semua_lulus


if __name__ == "__main__":
    import sys

    print("Uji mandiri keccak256:")
    ok = uji_mandiri()
    print()
    print("Semua vektor uji lulus." if ok else "ADA VEKTOR UJI YANG GAGAL.")
    sys.exit(0 if ok else 1)
