#!/usr/bin/env python3
"""
crosscheck.py — membandingkan implementasi skor TypeScript dan Python.

Ini pemeriksaan yang mencegah Skenario C runtuh di panggung (risiko R-12).
Dua implementasi yang "kurang lebih sama" tidak cukup: kalau JEJAK menampilkan
90.50 dan skrip independen mencetak 90.49, seluruh klaim "siapa pun bisa
menghitung ulang" berubah dari bukti menjadi kecanggungan.

  cd services && npm run crosscheck:emit     # menulis crosscheck-cases.json
  cd ../verify-independent && python crosscheck.py

Keluar dengan kode 1 kalau ada satu kasus pun yang berbeda, sehingga CI
menggagalkan build — bukan hanya mencetak peringatan yang tidak ada yang baca.
"""

from __future__ import annotations

import json
import os
import sys

from recompute import hitung_trust, paksa_utf8

# Konsol Windows bawaan memakai cp1252 dan akan melempar UnicodeEncodeError
# pada karakter seperti "↔". Dipaksa UTF-8 supaya skrip ini jalan sama di
# mana pun — termasuk di laptop yang dipakai demo.
paksa_utf8()

BERKAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "crosscheck-cases.json")


def main() -> int:
    if not os.path.exists(BERKAS):
        print(f"Berkas kasus tidak ada: {BERKAS}", file=sys.stderr)
        print("Jalankan dulu:  cd services && npm run crosscheck:emit", file=sys.stderr)
        return 2

    with open(BERKAS, encoding="utf-8") as f:
        data = json.load(f)

    kasus = data["kasus"]
    print()
    print(f"  Uji silang TypeScript ↔ Python — {data['version']}")
    print(f"  {len(kasus)} kasus, dihasilkan {data['dibuat'][:19]}")
    print("  " + "─" * 66)
    print()

    gagal = 0

    for k in kasus:
        i = k["input"]
        py = hitung_trust(
            i["nAccepted"],
            i["nCompleted"],
            i["nAbandoned"],
            i["nLost"],
            int(i["vTotalWei"]),
            i["uBuyers"],
            i["medHours"],
        )
        ts = k["ts"]

        cocok_trust = py["trust"] == ts["trust"]
        cocok_bp = py["trustBp"] == ts["trustBp"]
        cocok_komponen = py["components"] == ts["components"]
        cocok = cocok_trust and cocok_bp and cocok_komponen

        tanda = "OK  " if cocok else "BEDA"
        nilai = py["trust"] if py["trust"] is not None else "null"
        print(f"  [{tanda}] {k['name']:<38} {nilai:>7}")

        if not cocok:
            gagal += 1
            print(f"         TS     : trust={ts['trust']} bp={ts['trustBp']} {ts['components']}")
            print(f"         Python : trust={py['trust']} bp={py['trustBp']} {py['components']}")
            print(f"         Alasan kasus ini ada: {k['why']}")

    print()
    print("  " + "─" * 66)

    if gagal:
        print(f"  {gagal} dari {len(kasus)} kasus BERBEDA.")
        print()
        print("  Jangan menaikkan ini ke panggung. Perbaiki dulu:")
        print("    · services/scoring/trust.ts")
        print("    · verify-independent/recompute.py")
        print("  Keduanya harus berubah di commit yang sama.")
        print()
        return 1

    print(f"  Seluruh {len(kasus)} kasus IDENTIK di kedua implementasi.")
    print()
    print("  Kalimat yang boleh diucapkan setelah baris ini hijau:")
    print('    "Skornya bukan klaim kami. Ini hasil hitungan ulang yang')
    print('     bisa dilakukan siapa pun, dengan bahasa pemrograman berbeda,')
    print('     tanpa menyentuh satu baris pun kode kami."')
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
