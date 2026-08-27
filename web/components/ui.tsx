"use client";

/**
 * Bagian antarmuka yang dipakai berulang.
 *
 * Semuanya menuruti tiga kunci di globals.css: satu aksen, satu sistem
 * sudut, satu tema per halaman. Tidak ada satu pun warna mentah di sini —
 * semuanya token, supaya mode gelap benar tanpa varian `dark:` di mana-mana.
 */

import {useEffect, useState} from "react";
import {CheckIcon, CopyIcon, WarningIcon, ArrowSquareOutIcon} from "@phosphor-icons/react";
import {Status, statusFamily, CHIP_CLASS} from "@/lib/status";
import {formatBnb, formatIdr, weiToIdr, shortHash} from "@/lib/format";
import {useI18n} from "@/lib/i18n";
import {explorerAddress, explorerTx} from "@/lib/chain";

// ════════════════════════════════════════════════════════════════════════
//  Status
// ════════════════════════════════════════════════════════════════════════

export function StatusChip({status}: {status: Status | number}) {
  const {t} = useI18n();
  const keluarga = statusFamily(status);
  const label = t.status[status as keyof typeof t.status] ?? String(status);

  return <span className={`chip ${CHIP_CLASS[keluarga]}`}>{label}</span>;
}

// ════════════════════════════════════════════════════════════════════════
//  Lencana data contoh
//  Wajib muncul di setiap layar yang menampilkan fixture (N-14 / §13.4).
// ════════════════════════════════════════════════════════════════════════

export function DemoBadge({className = ""}: {className?: string}) {
  const {t} = useI18n();

  return (
    <div
      className={`flex items-start gap-2.5 rounded-control border border-wait/35 bg-wait-soft px-3.5 py-2.5 ${className}`}
    >
      <WarningIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-wait" />
      <p className="text-[0.8125rem] leading-relaxed text-wait">
        <span className="mono-label !text-wait">{t.umum.demo}</span>
        <span className="mx-1.5 opacity-40">/</span>
        {t.umum.demoJelas}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Uang
//  tBNB selalu jadi angka utama; rupiah selalu jadi catatan di bawahnya.
//  Urutan ini bukan selera: kontrak hanya mengerti wei, dan rupiah cuma
//  snapshot kurs (§11.1). Menampilkan rupiah lebih besar akan berbohong
//  tentang apa yang sebenarnya dijamin.
// ════════════════════════════════════════════════════════════════════════

export function Money({
  wei,
  idrPerBnb,
  size = "base"
}: {
  wei: string | bigint;
  idrPerBnb?: string | null;
  size?: "base" | "lg";
}) {
  const utama = size === "lg" ? "text-2xl" : "text-[0.9375rem]";

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={`num ${utama} text-ink`}>{formatBnb(wei)}</span>
      {idrPerBnb && idrPerBnb !== "0" ? (
        <span className="num text-xs text-ink-3">≈ {formatIdr(weiToIdr(wei, idrPerBnb))}</span>
      ) : null}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Baris data
//  Dikelompokkan dengan garis rambut, bukan dibungkus kartu di dalam kartu.
// ════════════════════════════════════════════════════════════════════════

export function DataRow({
  label,
  children,
  help
}: {
  label: string;
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-[0.8125rem] text-ink-2">{label}</dt>
      <dd className="flex flex-col items-start gap-0.5 sm:items-end">
        {children}
        {help ? <span className="max-w-xs text-xs leading-relaxed text-ink-3">{help}</span> : null}
      </dd>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Salin
// ════════════════════════════════════════════════════════════════════════

export function Copyable({
  value,
  display,
  className = ""
}: {
  value: string;
  display?: string;
  className?: string;
}) {
  const {t} = useI18n();
  const [sudah, setSudah] = useState(false);

  useEffect(() => {
    if (!sudah) return;
    const jam = setTimeout(() => setSudah(false), 1600);
    return () => clearTimeout(jam);
  }, [sudah]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setSudah(true);
        } catch {
          // Papan klip diblokir. Nilainya tetap terlihat untuk disalin manual.
        }
      }}
      aria-label={sudah ? t.umum.tersalin : t.umum.salin}
      className={`group inline-flex items-center gap-1.5 text-ink-2 transition-colors hover:text-ink ${className}`}
    >
      <span className="num text-[0.8125rem]">{display ?? value}</span>
      {sudah ? (
        <CheckIcon size={13} weight="bold" className="text-settle" />
      ) : (
        <CopyIcon size={13} className="opacity-45 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

export function ExplorerLink({
  hash,
  kind = "tx",
  children
}: {
  hash: string;
  kind?: "tx" | "address";
  children?: React.ReactNode;
}) {
  const {t} = useI18n();

  return (
    <a
      href={kind === "tx" ? explorerTx(hash) : explorerAddress(hash)}
      target="_blank"
      rel="noopener noreferrer"
      title={t.umum.lihatDiExplorer}
      className="inline-flex items-center gap-1.5 text-voltage transition-opacity hover:opacity-75"
    >
      <span className="num text-[0.8125rem]">{children ?? shortHash(hash)}</span>
      <ArrowSquareOutIcon size={13} />
    </a>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Keadaan kosong, memuat, galat
//  Ketiganya ada sejak awal. Antarmuka yang hanya punya keadaan berhasil
//  akan pecah persis di saat paling tidak menguntungkan.
// ════════════════════════════════════════════════════════════════════════

export function Empty({
  judul,
  isi,
  aksi
}: {
  judul: string;
  isi?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-[0.9375rem] font-medium text-ink">{judul}</p>
      {isi ? <p className="max-w-sm text-sm leading-relaxed text-ink-3">{isi}</p> : null}
      {aksi ? <div className="mt-2">{aksi}</div> : null}
    </div>
  );
}

/**
 * Rangka pemuatan mengikuti bentuk akhir isinya. Lingkaran berputar tidak
 * memberi tahu apa pun tentang apa yang sedang datang.
 */
export function Skeleton({className = ""}: {className?: string}) {
  return (
    <div
      className={`animate-pulse rounded-control bg-paper-3 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonRows({rows = 3}: {rows?: number}) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {Array.from({length: rows}).map((_, i) => (
        <div key={i} className="panel flex items-center gap-4 p-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ErrorNote({pesan, ulangi}: {pesan: string; ulangi?: () => void}) {
  const {t} = useI18n();

  return (
    <div className="flex flex-col items-start gap-3 rounded-panel border border-dispute/30 bg-dispute-soft p-4">
      <p className="text-sm leading-relaxed text-dispute">{pesan}</p>
      {ulangi ? (
        <button type="button" onClick={ulangi} className="btn btn-secondary text-[0.8125rem]">
          {t.umum.ulangi}
        </button>
      ) : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Judul bagian
// ════════════════════════════════════════════════════════════════════════

export function PageHeader({
  judul,
  sub,
  aksi
}: {
  judul: string;
  sub?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{judul}</h1>
        {sub ? <p className="max-w-xl text-sm leading-relaxed text-ink-2">{sub}</p> : null}
      </div>
      {aksi ? <div className="shrink-0">{aksi}</div> : null}
    </header>
  );
}
