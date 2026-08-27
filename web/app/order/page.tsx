"use client";

import Link from "next/link";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useAccount} from "wagmi";
import {PlusIcon} from "@phosphor-icons/react";
import {daftarOrder} from "@/lib/api";
import {isFinal} from "@/lib/status";
import {useI18n} from "@/lib/i18n";
import {OrderCard} from "@/components/order-card";
import {DemoBadge, Empty, ErrorNote, PageHeader, SkeletonRows} from "@/components/ui";

type Saring = "semua" | "berjalan" | "selesai";

export default function OrderListPage() {
  const {t} = useI18n();
  const {address} = useAccount();
  const [saring, setSaring] = useState<Saring>("semua");

  const {data, isPending, isError, refetch} = useQuery({
    queryKey: ["orders", address ?? "publik"],
    queryFn: () => daftarOrder(address)
  });

  const orders = (data?.data ?? []).filter((o) => {
    if (saring === "berjalan") return !isFinal(o.status);
    if (saring === "selesai") return isFinal(o.status);
    return true;
  });

  const tab: {nilai: Saring; label: string}[] = [
    {nilai: "semua", label: t.daftarOrder.saringSemua},
    {nilai: "berjalan", label: t.daftarOrder.saringBerjalan},
    {nilai: "selesai", label: t.daftarOrder.saringSelesai}
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        judul={t.daftarOrder.judul}
        sub={t.daftarOrder.sub}
        aksi={
          <Link href="/order/new" className="btn btn-primary">
            <PlusIcon size={16} weight="bold" />
            {t.daftarOrder.buat}
          </Link>
        }
      />

      <div className="mb-6 flex items-center gap-1 border-b border-hairline">
        {tab.map((x) => (
          <button
            key={x.nilai}
            type="button"
            onClick={() => setSaring(x.nilai)}
            aria-pressed={saring === x.nilai}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[0.875rem] transition-colors ${
              saring === x.nilai
                ? "border-ink text-ink"
                : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {data?.demo ? <DemoBadge className="mb-5" /> : null}

      {isPending ? (
        <SkeletonRows rows={4} />
      ) : isError ? (
        <ErrorNote pesan={t.umum.galat} ulangi={() => refetch()} />
      ) : orders.length === 0 ? (
        <Empty
          judul={t.daftarOrder.kosong}
          isi={t.daftarOrder.kosongAjak}
          aksi={
            <Link href="/order/new" className="btn btn-secondary">
              {t.daftarOrder.buat}
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} demo={data?.demo} />
          ))}
        </div>
      )}
    </div>
  );
}
