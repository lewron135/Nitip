"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useI18n, type Lang} from "@/lib/i18n";
import {ConnectButton} from "./wallet";

/**
 * Navigasi. Satu baris di desktop, tinggi 64px, tidak pernah dua baris.
 * Bar navigasi setinggi 15% layar adalah ruang yang dicuri dari isi.
 */
export function SiteHeader() {
  const {t} = useI18n();
  const path = usePathname();

  const tautan = [
    {href: "/order", label: t.nav.order},
    {href: "/jastiper", label: t.nav.jastiper}
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="mr-1 text-[0.9375rem] font-semibold tracking-tight text-ink sm:mr-3"
        >
          JEJAK
        </Link>

        <nav className="flex items-center gap-0.5">
          {tautan.map((l) => {
            const aktif = path === l.href || path.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={aktif ? "page" : undefined}
                className={`rounded-control px-2.5 py-2 text-[0.875rem] transition-colors sm:px-3 ${
                  aktif ? "text-ink" : "text-ink-3 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LangToggle />
          <ConnectButton compact />
        </div>
      </div>
    </header>
  );
}

/**
 * Pemilih bahasa. Dua tombol yang terlihat sekaligus, bukan dropdown:
 * dengan hanya dua pilihan, dropdown menambah satu ketukan tanpa menghemat
 * ruang, dan menyembunyikan fakta bahwa versi Inggrisnya ada.
 */
export function LangToggle() {
  const {lang, setLang} = useI18n();

  return (
    <div
      role="group"
      aria-label="Bahasa / Language"
      className="flex items-center rounded-control border border-hairline p-0.5"
    >
      {(["id", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`num rounded-[5px] px-2 py-1 text-[0.6875rem] uppercase tracking-wider transition-colors ${
            lang === l ? "bg-ink text-paper" : "text-ink-3 hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
