"use client";

import {use} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {ArrowLeftIcon, CheckIcon, WarningOctagonIcon} from "@phosphor-icons/react";
import {ambilOrder} from "@/lib/api";
import {Status, JALUR_NORMAL, langkahKe} from "@/lib/status";
import {
  formatBnb,
  formatIdr,
  weiToIdr,
  formatTimestamp,
  hashKosong,
  shortAddress
} from "@/lib/format";
import {deskripsiUntuk} from "@/lib/itembook";
import {BARANG_DEMO} from "@/lib/fixtures";
import {useI18n, localeOf} from "@/lib/i18n";
import {
  Copyable,
  DataRow,
  DemoBadge,
  Empty,
  ErrorNote,
  ExplorerLink,
  Skeleton,
  StatusChip
} from "@/components/ui";
import {OrderActions} from "@/components/order-actions";
import {tenggatAktif} from "@/components/order-card";

export default function OrderDetailPage({params}: {params: Promise<{id: string}>}) {
  const {id} = use(params);
  const {t, lang} = useI18n();
  const nomor = Number(id);

  const {data, isPending, isError, refetch} = useQuery({
    queryKey: ["order", nomor],
    queryFn: () => ambilOrder(nomor),
    enabled: Number.isFinite(nomor)
  });

  const detail = data?.data ?? null;
  const demo = data?.demo ?? false;

  if (isPending) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <ErrorNote pesan={t.umum.galat} ulangi={() => refetch()} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Empty
          judul={t.umum.kosong}
          aksi={
            <Link href="/order" className="btn btn-secondary">
              {t.umum.kembali}
            </Link>
          }
        />
      </div>
    );
  }

  const o = detail.order;
  const deskripsi = deskripsiUntuk(o.itemHash) ?? (demo ? BARANG_DEMO[o.id] : null);
  const tenggat = tenggatAktif(o, t.umum);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-5">
        <Link
          href="/order"
          className="inline-flex w-fit items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeftIcon size={14} />
          {t.umum.kembali}
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={o.status} />
          <span className="num text-sm text-ink-3">
            {t.umum.order} #{o.id}
          </span>
        </div>

        <h1
          className={
            deskripsi
              ? "text-xl font-semibold leading-snug sm:text-2xl"
              : "num text-sm break-all text-ink-3"
          }
        >
          {deskripsi ?? o.itemHash}
        </h1>

        {!deskripsi ? (
          <p className="text-xs leading-relaxed text-ink-3">{t.umum.barangTidakDiingat}</p>
        ) : null}

        {tenggat ? (
          <p className="text-sm text-ink-2">
            {tenggat.label}:{" "}
            <span className={`num ${tenggat.sisa.lewat ? "text-wait" : ""}`}>
              {tenggat.sisa.lewat ? t.umum.lewat : `${tenggat.sisa.teks} ${t.umum.sisa}`}
            </span>
          </p>
        ) : null}
      </div>

      {demo ? <DemoBadge /> : null}

      <Timeline status={o.status} />

      {/* ── Dana ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mono-label mb-2">{t.umum.total}</h2>
        <dl>
          <DataRow label={t.umum.plafon}>
            <Money wei={o.capWei} kurs={o.idrPerBnbSnapshot} />
          </DataRow>
          <DataRow label={t.umum.fee}>
            <Money wei={o.feeWei} kurs={o.idrPerBnbSnapshot} />
          </DataRow>
          {o.verifiedWei && o.verifiedWei !== "0" ? (
            <DataRow label={t.umum.terverifikasi}>
              <Money wei={o.verifiedWei} kurs={o.idrPerBnbSnapshot} />
            </DataRow>
          ) : null}
          <DataRow label={t.umum.kurs} help={t.umum.kursCatatan}>
            <span className="num text-[0.9375rem]">
              {formatIdr(o.idrPerBnbSnapshot)} / tBNB
            </span>
          </DataRow>
        </dl>
      </section>

      {/* ── Pihak dan jejak ─────────────────────────────────────────── */}
      <section>
        <h2 className="mono-label mb-2">{t.umum.order}</h2>
        <dl>
          <DataRow label={t.umum.pembeli}>
            <ExplorerLink hash={o.buyer} kind="address">
              {shortAddress(o.buyer)}
            </ExplorerLink>
          </DataRow>
          <DataRow label={t.umum.jastiper}>
            {o.jastiper ? (
              <Link
                href={`/jastiper/${o.jastiper}`}
                className="num text-[0.8125rem] text-voltage hover:opacity-75"
              >
                {shortAddress(o.jastiper)}
              </Link>
            ) : (
              <span className="text-[0.8125rem] text-ink-3">{t.umum.belumAda}</span>
            )}
          </DataRow>
          <DataRow label={t.umum.dibuat}>
            <span className="num text-[0.8125rem]">
              {formatTimestamp(o.createdAt, localeOf(lang))}
            </span>
          </DataRow>
          <DataRow label={t.umum.hashBarang}>
            <Copyable value={o.itemHash} display={`${o.itemHash.slice(0, 18)}…`} />
          </DataRow>
          <DataRow label={t.umum.hashBukti}>
            {hashKosong(o.proofHash) ? (
              <span className="text-[0.8125rem] text-ink-3">{t.umum.belumAda}</span>
            ) : (
              <Copyable value={o.proofHash!} display={`${o.proofHash!.slice(0, 18)}…`} />
            )}
          </DataRow>
        </dl>
      </section>

      {/* ── Pembacaan AI ────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="mono-label">{t.detailOrder.keputusan}</h2>

        {detail.verifikasi ? (
          <div className="panel flex flex-col gap-3 p-4">
            {detail.verifikasi.nominalAsing ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[0.8125rem] text-ink-2">{t.detailOrder.nominalAsing}</span>
                <span className="num text-[0.9375rem]">
                  {detail.verifikasi.nominalAsing} {detail.verifikasi.mataUang ?? ""}
                </span>
              </div>
            ) : null}

            {detail.verifikasi.alasan ? (
              <div className="flex flex-col gap-1">
                <span className="mono-label">{t.detailOrder.alasan}</span>
                <p className="text-sm leading-relaxed text-ink-2">{detail.verifikasi.alasan}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink-3">{t.detailOrder.keputusanKosong}</p>
        )}
      </section>

      <OrderActions order={o} onChange={() => refetch()} />
    </div>
  );
}

function Money({wei, kurs}: {wei: string; kurs?: string | null}) {
  return (
    <span className="inline-flex flex-col items-start gap-0.5 sm:items-end">
      <span className="num text-[0.9375rem]">{formatBnb(wei)}</span>
      {kurs && kurs !== "0" ? (
        <span className="num text-xs text-ink-3">≈ {formatIdr(weiToIdr(wei, kurs))}</span>
      ) : null}
    </span>
  );
}

/**
 * Jalur order.
 *
 * Status cabang (sengketa, refund, ditinggalkan, diputus arbiter) TIDAK
 * ditampilkan sebagai langkah berikutnya, karena mereka bukan langkah
 * berikutnya — mereka keluar dari jalur. Menggambarnya sebagai bagian dari
 * garis lurus akan menyiratkan order masih akan tuntas, dan itu bohong.
 */
function Timeline({status}: {status: Status}) {
  const {t} = useI18n();
  const posisi = langkahKe(status);
  const cabang = posisi === -1;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="mono-label">{t.detailOrder.garisWaktu}</h2>

      <ol className="flex flex-col">
        {JALUR_NORMAL.map((s, i) => {
          const lewat = !cabang && i < posisi;
          const kini = !cabang && i === posisi;

          return (
            <li key={s} className="flex items-start gap-3.5">
              <div className="flex flex-col items-center self-stretch">
                <span
                  className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    lewat
                      ? "border-settle bg-settle text-paper"
                      : kini
                        ? "border-voltage bg-voltage"
                        : "border-hairline bg-paper"
                  }`}
                >
                  {lewat ? <CheckIcon size={9} weight="bold" /> : null}
                </span>
                {i < JALUR_NORMAL.length - 1 ? (
                  <span
                    className={`w-px flex-1 ${lewat ? "bg-settle" : "bg-hairline"}`}
                    style={{minHeight: "1.5rem"}}
                  />
                ) : null}
              </div>

              <span
                className={`pb-5 text-[0.875rem] ${
                  kini ? "font-medium text-ink" : lewat ? "text-ink-2" : "text-ink-3"
                }`}
              >
                {t.status[s as keyof typeof t.status]}
              </span>
            </li>
          );
        })}
      </ol>

      {cabang ? (
        <div className="flex items-start gap-2.5 rounded-panel border border-dispute/30 bg-dispute-soft p-4">
          <WarningOctagonIcon size={16} weight="fill" className="mt-0.5 shrink-0 text-dispute" />
          <p className="text-sm leading-relaxed text-dispute">
            {t.status[status as keyof typeof t.status]}
          </p>
        </div>
      ) : null}
    </section>
  );
}
