"use client";

import {useI18n} from "@/lib/i18n";
import {CONTRACT_ADDRESS, CHAIN_ID, chain} from "@/lib/chain";
import {shortAddress} from "@/lib/format";
import {ExplorerLink} from "./ui";

/**
 * Alamat kontrak dipasang di kaki setiap halaman, bukan disembunyikan di
 * satu halaman "tentang". Klaim utama produk ini bisa diperiksa sendiri,
 * dan pemeriksaan itu dimulai dari alamat yang selalu terlihat.
 */
export function SiteFooter() {
  const {t} = useI18n();

  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.9375rem] font-semibold tracking-tight">JEJAK</span>
          <p className="max-w-xs text-[0.8125rem] leading-relaxed text-ink-3">
            {t.kaki.hakCipta}
          </p>
        </div>

        <dl className="flex flex-col gap-3 text-[0.8125rem] sm:flex-row sm:gap-10">
          <div className="flex flex-col gap-1">
            <dt className="mono-label">{t.kaki.jaringan}</dt>
            <dd className="num text-ink-2">
              {chain.name} · {CHAIN_ID}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="mono-label">{t.kaki.kontrak}</dt>
            <dd>
              {CONTRACT_ADDRESS ? (
                <ExplorerLink hash={CONTRACT_ADDRESS} kind="address">
                  {shortAddress(CONTRACT_ADDRESS)}
                </ExplorerLink>
              ) : (
                <span className="num text-ink-3">{t.umum.belumAda}</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
