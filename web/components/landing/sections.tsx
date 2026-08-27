"use client";

import {motion, useReducedMotion} from "motion/react";
import {useEffect, useState} from "react";
import {CheckIcon, CopyIcon} from "@phosphor-icons/react";
import {useI18n} from "@/lib/i18n";
import {TIER_CAP_WEI} from "@/lib/status";
import {formatWei} from "@/lib/format";
import {ALAMAT} from "@/lib/fixtures";

/** Muncul saat masuk viewport. Ringan, sekali jalan, tanpa pin. */
function Reveal({children, delay = 0}: {children: React.ReactNode; delay?: number}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, amount: 0.25}}
      transition={{duration: 0.6, delay, ease: [0.16, 1, 0.3, 1]}}
    >
      {children}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  TIER  —  reputasi sebagai plafon kredit
// ════════════════════════════════════════════════════════════════════════

export function Tiers() {
  const {t} = useI18n();
  const reduce = useReducedMotion();

  // Lebar batang relatif terhadap plafon tertinggi, dalam skala logaritmik.
  // Skala linier membuat tiga tier pertama tidak terlihat sama sekali, dan
  // bagian yang perlu dipahami justru lompatan antar-tingkatnya.
  const lebar = TIER_CAP_WEI.map((w) => {
    const bnb = Number(formatWei(w, 4));
    return 12 + (Math.log10(bnb / 0.05) / Math.log10(200)) * 88;
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal>
        <h2 className="max-w-2xl text-2xl font-semibold leading-tight sm:text-[2rem]">
          {t.tier.judul}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-2">{t.tier.sub}</p>
      </Reveal>

      <div className="mt-12 flex flex-col">
        {TIER_CAP_WEI.map((cap, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2 border-t border-hairline py-5 sm:grid-cols-[7rem_1fr_auto] sm:gap-x-8">
              <div className="flex flex-col gap-0.5">
                <span className="num text-xs text-ink-3">T{i}</span>
                <span className="text-[0.9375rem] font-medium">{t.tier.nama[i]}</span>
              </div>

              <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-paper-3">
                  <motion.div
                    className="h-full rounded-full bg-voltage"
                    initial={reduce ? false : {scaleX: 0}}
                    whileInView={{scaleX: 1}}
                    viewport={{once: true, amount: 0.6}}
                    transition={{duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1]}}
                    style={{width: `${lebar[i]}%`, transformOrigin: "left center"}}
                  />
                </div>
                <span className="text-xs text-ink-3">{t.tier.syarat[i]}</span>
              </div>

              <span className="num self-start text-[0.9375rem] sm:self-center sm:text-right">
                {formatWei(cap)} tBNB
              </span>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-8 max-w-xl border-l-2 border-hairline pl-4 text-sm leading-relaxed text-ink-3">
          {t.tier.catatan}
        </p>
      </Reveal>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  YANG TIDAK KAMI KLAIM
//  §8.5 / prinsip P7. Bagian ini sengaja tidak dipermanis: setiap batas
//  yang kami sebut lebih dulu berhenti menjadi temuan orang lain.
// ════════════════════════════════════════════════════════════════════════

export function Honest() {
  const {t} = useI18n();

  return (
    <section className="border-y border-hairline bg-paper-2">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-2xl font-semibold leading-tight sm:text-[2rem]">
            {t.jujur.judul}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-2">{t.jujur.sub}</p>
        </Reveal>

        <div className="mt-12 grid gap-x-12 gap-y-9 sm:grid-cols-2">
          {t.jujur.butir.map((b, i) => (
            <Reveal key={i} delay={(i % 2) * 0.05}>
              <div className="flex flex-col gap-2">
                <h3 className="text-[0.9375rem] font-medium">{b.judul}</h3>
                <p className="max-w-sm text-sm leading-relaxed text-ink-2">{b.isi}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  HITUNG SENDIRI
//  Klaim terbesar produk ini adalah "skor kami bisa kamu hitung ulang".
//  Bagian ini memberikan perintah persisnya, bukan meyakinkan pembaca.
// ════════════════════════════════════════════════════════════════════════

export function Recompute() {
  const {t} = useI18n();
  const [sudah, setSudah] = useState(false);

  const perintah = `python recompute.py ${ALAMAT.ranti}`;

  useEffect(() => {
    if (!sudah) return;
    const jam = setTimeout(() => setSudah(false), 1600);
    return () => clearTimeout(jam);
  }, [sudah]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal>
        <h2 className="max-w-2xl text-2xl font-semibold leading-tight sm:text-[2rem]">
          {t.hitung.judul}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-2">{t.hitung.sub}</p>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="panel flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="mono-label">verify-independent/</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(perintah);
                    setSudah(true);
                  } catch {
                    // Papan klip diblokir. Perintahnya tetap terlihat.
                  }
                }}
                className="btn btn-quiet text-xs"
              >
                {sudah ? <CheckIcon size={13} weight="bold" /> : <CopyIcon size={13} />}
                {sudah ? t.umum.tersalin : t.hitung.salinPerintah}
              </button>
            </div>

            <pre className="num overflow-x-auto rounded-control bg-paper-2 p-4 text-[0.8125rem] leading-relaxed text-ink">
              <code>{perintah}</code>
            </pre>
          </div>

          <div className="panel flex flex-col gap-3 p-5">
            <span className="mono-label">{t.hitung.keluaranLabel}</span>

            <pre className="num overflow-x-auto rounded-control bg-paper-2 p-4 text-[0.8125rem] leading-relaxed text-ink-2">
              <code>{`JEJAK-TRUST v1.0
trust      90.50
completed  10 / 10 accepted
buyers     8 distinct
disputes   0 lost, 0 abandoned
volume     0.6124 tBNB
median     40.2 h`}</code>
            </pre>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.14}>
        <p className="mt-6 max-w-xl border-l-2 border-voltage pl-4 text-sm leading-relaxed text-ink-2">
          {t.hitung.cocok}
        </p>
      </Reveal>
    </section>
  );
}
