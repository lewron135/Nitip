"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {motion, useReducedMotion} from "motion/react";
import type {Order} from "@/lib/types";
import {daftarOrder} from "@/lib/api";
import {useI18n} from "@/lib/i18n";
import {OrderCard} from "@/components/order-card";
import {DemoBadge, SkeletonRows} from "@/components/ui";
import {ALAMAT} from "@/lib/fixtures";

/**
 * Hero.
 *
 * Panel kanan BUKAN gambar produk palsu — ia komponen `OrderCard` yang
 * sama persis dengan yang dipakai di dalam aplikasi, memuat order sungguhan
 * dari indexer. Kalau indexer tidak terjangkau ia jatuh ke data contoh dan
 * memasang lencananya sendiri. Menempelkan tangkapan layar di sini akan
 * lebih mudah, dan akan menjadi hal pertama yang ketahuan bohong.
 */
export function Hero() {
  const {t} = useI18n();
  const reduce = useReducedMotion();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let batal = false;
    daftarOrder().then((h) => {
      if (batal) return;
      setOrders(h.data.slice(0, 3));
      setDemo(h.demo);
    });
    return () => {
      batal = true;
    };
  }, []);

  const masuk = reduce
    ? {}
    : {
        initial: {opacity: 0, y: 16},
        animate: {opacity: 1, y: 0},
        transition: {duration: 0.7, ease: [0.16, 1, 0.3, 1] as const}
      };

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16">
      <motion.div {...masuk} className="flex flex-col items-start gap-6">
        <h1 className="max-w-xl text-[2.25rem] font-semibold leading-[1.08] sm:text-5xl lg:text-[3.25rem]">
          {t.hero.judul}
        </h1>

        <p className="max-w-md text-base leading-relaxed text-ink-2">{t.hero.sub}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/jastiper/${ALAMAT.ranti}`} className="btn btn-primary">
            {t.hero.ctaUtama}
          </Link>
          <Link href="/order/new" className="btn btn-secondary">
            {t.hero.ctaKedua}
          </Link>
        </div>
      </motion.div>

      <motion.div
        {...(reduce
          ? {}
          : {
              initial: {opacity: 0, y: 24},
              animate: {opacity: 1, y: 0},
              transition: {duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const}
            })}
        className="flex flex-col gap-3"
      >
        <p className="mono-label">{t.hero.kartuJudul}</p>

        {orders === null ? (
          <SkeletonRows rows={3} />
        ) : (
          <>
            {demo ? <DemoBadge /> : null}
            <div className="flex flex-col gap-3">
              {orders.map((o) => (
                <OrderCard key={o.id} order={o} demo={demo} />
              ))}
            </div>
          </>
        )}
      </motion.div>
    </section>
  );
}
