"use client";

import Link from "next/link";
import {ArrowRightIcon} from "@phosphor-icons/react";
import type {Order} from "@/lib/types";
import {Status} from "@/lib/status";
import {formatBnb, formatIdr, weiToIdr, shortHash, timeLeft} from "@/lib/format";
import {deskripsiUntuk} from "@/lib/itembook";
import {BARANG_DEMO} from "@/lib/fixtures";
import {useI18n} from "@/lib/i18n";
import {StatusChip} from "./ui";

/**
 * Satu order sebagai baris yang bisa dipindai.
 *
 * Yang dibaca pengguna lebih dulu adalah STATUS dan SISA WAKTU, bukan
 * nomor order. Urutan visual di sini mengikuti urutan itu, bukan urutan
 * field di struct kontrak.
 */
export function OrderCard({order, demo = false}: {order: Order; demo?: boolean}) {
  const {t} = useI18n();

  const deskripsi = deskripsiUntuk(order.itemHash) ?? (demo ? BARANG_DEMO[order.id] : null);
  const tenggat = tenggatAktif(order, t.umum);

  return (
    <Link
      href={`/order/${order.id}`}
      className="panel group flex flex-col gap-4 p-4 transition-colors hover:border-ink-3 sm:flex-row sm:items-center sm:gap-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusChip status={order.status} />
          <span className="num text-xs text-ink-3">#{order.id}</span>
        </div>

        <p
          className={`truncate text-[0.9375rem] ${
            deskripsi ? "text-ink" : "num text-[0.8125rem] text-ink-3"
          }`}
          title={deskripsi ?? order.itemHash}
        >
          {deskripsi ?? shortHash(order.itemHash)}
        </p>

        {tenggat ? (
          <p className="text-xs text-ink-3">
            <span className="text-ink-2">{tenggat.label}</span>{" "}
            <span className="num">
              {tenggat.sisa.lewat
                ? t.umum.lewat.toLowerCase()
                : `${tenggat.sisa.teks} ${t.umum.sisa}`}
            </span>
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <div className="flex flex-col items-start gap-0.5 sm:items-end">
          <span className="num text-[0.9375rem]">{formatBnb(order.totalWei)}</span>
          {order.idrPerBnbSnapshot && order.idrPerBnbSnapshot !== "0" ? (
            <span className="num text-xs text-ink-3">
              ≈ {formatIdr(weiToIdr(order.totalWei, order.idrPerBnbSnapshot))}
            </span>
          ) : null}
        </div>

        <ArrowRightIcon
          size={16}
          className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

/**
 * Tenggat mana yang sedang relevan tergantung status. Menampilkan semua
 * tenggat sekaligus membuat pengguna harus memilih sendiri mana yang
 * penting, dan itu tugas antarmuka, bukan tugas mereka.
 */
export function tenggatAktif(
  o: Order,
  label: {
    tenggatTerima: string;
    tenggatBukti: string;
    tenggatVerifikasi: string;
    tenggatSanggah: string;
  }
) {
  switch (o.status) {
    case Status.CREATED:
      return {label: label.tenggatTerima, sisa: timeLeft(o.acceptDeadline)};
    case Status.ACCEPTED:
      return o.proofDeadline ? {label: label.tenggatBukti, sisa: timeLeft(o.proofDeadline)} : null;
    case Status.PROOFED:
      return o.verifyDeadline
        ? {label: label.tenggatVerifikasi, sisa: timeLeft(o.verifyDeadline)}
        : null;
    case Status.CAPITAL_PAID:
      return o.disputeWindowEnd
        ? {label: label.tenggatSanggah, sisa: timeLeft(o.disputeWindowEnd)}
        : null;
    default:
      return null;
  }
}
