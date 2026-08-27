"use client";

import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {useAccount, useReadContract} from "wagmi";
import {LockSimpleIcon} from "@phosphor-icons/react";
import {daftarOrder, daftarJastiper} from "@/lib/api";
import {Status} from "@/lib/status";
import {escrowContract} from "@/lib/chain";
import {formatBnb, shortAddress} from "@/lib/format";
import {useI18n} from "@/lib/i18n";
import {OrderCard} from "@/components/order-card";
import {DemoBadge, Empty, ErrorNote, PageHeader, SkeletonRows} from "@/components/ui";
import {ConnectButton} from "@/components/wallet";

export default function JastiperPage() {
  const {t} = useI18n();
  const {address, isConnected} = useAccount();

  const orders = useQuery({queryKey: ["orders", "publik"], queryFn: () => daftarOrder()});
  const jastiper = useQuery({queryKey: ["jastiper"], queryFn: () => daftarJastiper()});

  // Plafon dibaca LANGSUNG dari kontrak, bukan dari indexer. Angka inilah
  // yang akan dipakai kontrak untuk menerima atau menolak `acceptOrder`,
  // jadi ia harus datang dari sumber yang sama.
  const {data: capWei} = useReadContract({
    ...escrowContract,
    functionName: "tierCap",
    args: address ? [address] : undefined,
    query: {enabled: Boolean(address)}
  });

  const {data: tier} = useReadContract({
    ...escrowContract,
    functionName: "tierOf",
    args: address ? [address] : undefined,
    query: {enabled: Boolean(address)}
  });

  const plafon = (capWei as bigint | undefined) ?? null;
  const terbuka = (orders.data?.data ?? []).filter(
    (o) => o.status === Status.CREATED && o.buyer.toLowerCase() !== address?.toLowerCase()
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader judul={t.jastiperHal.judul} sub={t.jastiperHal.sub} />

      {/* ── Plafonmu ────────────────────────────────────────────────── */}
      <section className="panel mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        {isConnected && plafon !== null ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="mono-label">{t.jastiperHal.plafonmu}</span>
              <span className="num text-2xl">{formatBnb(plafon)}</span>
            </div>
            <div className="flex flex-col gap-1 sm:items-end">
              <span className="mono-label">{t.jastiperHal.tiermu}</span>
              <span className="text-[0.9375rem]">
                T{String(tier ?? 0)} · {t.tier.nama[Number(tier ?? 0)]}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-ink-2">{t.jastiperHal.hubungkanDulu}</p>
            <ConnectButton />
          </div>
        )}
      </section>

      {orders.data?.demo ? <DemoBadge className="mb-5" /> : null}

      {orders.isPending ? (
        <SkeletonRows rows={3} />
      ) : orders.isError ? (
        <ErrorNote pesan={t.umum.galat} ulangi={() => orders.refetch()} />
      ) : terbuka.length === 0 ? (
        <Empty judul={t.jastiperHal.kosong} />
      ) : (
        <div className="flex flex-col gap-3">
          {terbuka.map((o) => {
            const diLuar = plafon !== null && BigInt(o.totalWei) > plafon;

            return (
              <div key={o.id} className="flex flex-col gap-2">
                <OrderCard order={o} demo={orders.data?.demo} />
                {diLuar ? (
                  <div className="flex items-start gap-2.5 rounded-control bg-wait-soft px-3.5 py-2.5">
                    <LockSimpleIcon size={14} weight="bold" className="mt-0.5 shrink-0 text-wait" />
                    <p className="text-xs leading-relaxed text-wait">
                      <span className="font-medium">{t.jastiperHal.diLuarPlafon}.</span>{" "}
                      {t.jastiperHal.diLuarPlafonJelas}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Jastiper terdaftar ──────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="mono-label mb-4">{t.jastiperHal.daftarJastiper}</h2>

        {jastiper.isPending ? (
          <SkeletonRows rows={2} />
        ) : (
          <div className="flex flex-col">
            {(jastiper.data?.data ?? []).map((j) => (
              <Link
                key={j.address}
                href={`/jastiper/${j.address}`}
                className="flex items-center justify-between gap-4 border-b border-hairline py-4 transition-colors last:border-b-0 hover:bg-paper-2"
              >
                <div className="flex flex-col gap-1">
                  <span className="num text-[0.875rem]">{shortAddress(j.address)}</span>
                  <span className="text-xs text-ink-3">
                    <span className="num">{j.nCompleted}</span>{" "}
                    {t.reputasi.tuntasDari.replace("{n}", String(j.nCompleted))} ·{" "}
                    <span className="num">{j.uBuyers}</span> {t.reputasi.pembeliBerbeda}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="num text-[0.9375rem]">
                    {j.trust ?? t.reputasi.belumCukup}
                  </span>
                  <span className="text-xs text-ink-3">
                    T{j.tier} · {t.tier.nama[j.tier]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
