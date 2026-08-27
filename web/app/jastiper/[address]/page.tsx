"use client";

/**
 * Halaman rekam jejak — produk sebenarnya dari JEJAK.
 *
 * §13.4 memasang aturan tampilan yang TIDAK BOLEH dilanggar di halaman ini:
 *
 *   1. `TRUST` tidak pernah tampil sendirian. Empat angka mentah wajib ikut,
 *      karena angka mentah tidak bisa disembunyikan di balik pembobotan.
 *   2. Skor `null` (di bawah 3 order tuntas) ditampilkan sebagai TEKS, tidak
 *      pernah sebagai 0. Nol berarti "buruk"; null berarti "belum tahu", dan
 *      menukar keduanya memfitnah jastiper baru.
 *   3. Peringatan konsentrasi pembeli muncul otomatis, deterministik, tanpa
 *      AI sama sekali.
 */

import {use} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {WarningIcon, ArrowLeftIcon} from "@phosphor-icons/react";
import {ambilJastiper} from "@/lib/api";
import {MIN_COMPLETED_FOR_SCORE} from "@/lib/status";
import {formatBnb, formatHours, shortAddress} from "@/lib/format";
import {useI18n} from "@/lib/i18n";
import {OrderCard} from "@/components/order-card";
import {
  Copyable,
  DataRow,
  DemoBadge,
  ErrorNote,
  ExplorerLink,
  Skeleton
} from "@/components/ui";

export default function ReputasiPage({params}: {params: Promise<{address: string}>}) {
  const {address} = use(params);
  const {t} = useI18n();

  const {data, isPending, isError, refetch} = useQuery({
    queryKey: ["jastiper", address],
    queryFn: () => ambilJastiper(address)
  });

  if (isPending) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-12 sm:px-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <ErrorNote pesan={t.umum.galat} ulangi={() => refetch()} />
      </div>
    );
  }

  const p = data.data;
  const r = p.trust.raw;
  const adaSkor = p.trust.trust !== null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/jastiper"
          className="inline-flex w-fit items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeftIcon size={14} />
          {t.umum.kembali}
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold sm:text-2xl">{t.reputasi.judul}</h1>
          <ExplorerLink hash={p.address} kind="address">
            {shortAddress(p.address)}
          </ExplorerLink>
        </div>
      </div>

      {data.demo ? <DemoBadge /> : null}

      {/* ── Skor, dengan angka mentahnya ────────────────────────────── */}
      <section className="panel flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1.5">
          <span className="mono-label">{t.reputasi.versi}</span>

          {adaSkor ? (
            <div className="flex items-baseline gap-2">
              <span className="num text-5xl leading-none tracking-tight">{p.trust.trust}</span>
              <span className="num text-lg text-ink-3">/ 100</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-xl font-medium text-ink-2">{t.reputasi.belumCukup}</span>
              <p className="max-w-md text-sm leading-relaxed text-ink-3">
                {t.reputasi.belumCukupJelas}
              </p>
              <p className="num text-xs text-ink-3">
                {r.nCompleted} / {MIN_COMPLETED_FOR_SCORE}
              </p>
            </div>
          )}
        </div>

        {/* Empat angka mentah. Wajib, dan tidak pernah dilipat ke balik
            tombol "lihat detail" — yang disembunyikan berhenti menjadi bukti. */}
        <dl className="border-t border-hairline pt-2">
          <DataRow label={t.reputasi.riwayat}>
            <span className="num text-[0.9375rem]">
              {r.nCompleted} {t.reputasi.tuntasDari.replace("{n}", String(r.nAccepted))}
            </span>
          </DataRow>

          <DataRow label={t.reputasi.pembeliBerbeda} help={t.reputasi.pembeliBerbedaJelas}>
            <span className="num text-[0.9375rem]">{r.uBuyers}</span>
          </DataRow>

          <DataRow label={`${t.reputasi.sengketaKalah} / ${t.reputasi.ditinggalkan}`}>
            <span className="num text-[0.9375rem]">
              {r.nLost} / {r.nAbandoned}
            </span>
          </DataRow>

          <DataRow label={t.reputasi.totalNilai}>
            <span className="num text-[0.9375rem]">{formatBnb(r.vTotalWei)}</span>
          </DataRow>

          <DataRow label={t.reputasi.median}>
            <span className="num text-[0.9375rem]">{formatHours(r.medHours)}</span>
          </DataRow>

          <DataRow label={t.reputasi.plafonSaatIni}>
            <span className="num text-[0.9375rem]">
              {formatBnb(p.tier.capWei)}{" "}
              <span className="text-ink-3">
                · T{p.tier.level} {t.tier.nama[p.tier.level]}
              </span>
            </span>
          </DataRow>
        </dl>

        {/* Peringatan deterministik (§13.4). Tanpa AI, tanpa ambang rahasia. */}
        {p.trust.warnings.map((w) => (
          <div
            key={w.code}
            className="flex items-start gap-2.5 rounded-control border border-wait/35 bg-wait-soft px-3.5 py-3"
          >
            <WarningIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-wait" />
            <p className="text-[0.8125rem] leading-relaxed text-wait">{w.message}</p>
          </div>
        ))}
      </section>

      {/* ── Komponen skor ───────────────────────────────────────────── */}
      {adaSkor ? (
        <section className="flex flex-col gap-4">
          <h2 className="mono-label">{t.reputasi.komponen}</h2>

          <div className="flex flex-col gap-3">
            {(
              Object.keys(p.trust.components) as (keyof typeof p.trust.components)[]
            ).map((k) => {
              const nilai = p.trust.components[k];
              return (
                <div key={k} className="flex items-center gap-4">
                  <span className="w-32 shrink-0 text-[0.8125rem] text-ink-2">
                    {t.reputasi.komponenNama[k]}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3">
                    <div
                      className="h-full rounded-full bg-voltage"
                      style={{width: `${nilai / 100}%`}}
                    />
                  </div>
                  <span className="num w-12 shrink-0 text-right text-xs text-ink-3">
                    {(nilai / 100).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Hitung ulang sendiri ────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="mono-label">{t.reputasi.hitungSendiri}</h2>
        <div className="panel flex items-center justify-between gap-4 p-4">
          <Copyable
            value={`python recompute.py ${p.address}`}
            display={`python recompute.py ${shortAddress(p.address)}`}
          />
        </div>
      </section>

      {/* ── Order ───────────────────────────────────────────────────── */}
      {p.orders.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="mono-label">{t.reputasi.riwayat}</h2>
          <div className="flex flex-col gap-3">
            {p.orders.map((o) => (
              <OrderCard key={o.id} order={o} demo={data.demo} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
