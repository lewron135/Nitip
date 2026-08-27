"use client";

/**
 * Adegan gulir — satu order, dari uang dikunci sampai jadi reputasi.
 *
 * KENAPA ADEGAN INI ADA. Alur JEJAK punya satu bagian yang selalu perlu
 * dijelaskan dua kali di depan orang: kenapa pencairannya dua tahap (§6.6).
 * Kalimat tidak menyelesaikannya; gambar yang bergerak menyelesaikannya.
 * Setiap beat di sini memindahkan satu hal dan menjelaskan satu hal.
 *
 * KENAPA SVG, BUKAN VIDEO. Rangkaian gambar atau berkas video akan
 * menambah beban unduh besar untuk isi yang seluruhnya berupa bentuk dan
 * angka. SVG yang di-scrub memberi rasa yang sama, tetap tajam di layar
 * mana pun, dan setiap angka di dalamnya adalah angka produk yang benar.
 *
 * GERAK YANG DIHORMATI. Dengan `prefers-reduced-motion`, seluruh mesin
 * gulir dimatikan dan kelima beat dirender sebagai daftar biasa. Bukan
 * versi yang lebih miskin, hanya versi yang diam.
 */

import {useEffect, useRef} from "react";
import {useReducedMotion} from "motion/react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useI18n} from "@/lib/i18n";

gsap.registerPlugin(ScrollTrigger);

const JUMLAH_BEAT = 5;

export function ScrollScene() {
  const {t} = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const beats = [
    {judul: t.adegan.beat1Judul, isi: t.adegan.beat1Isi},
    {judul: t.adegan.beat2Judul, isi: t.adegan.beat2Isi},
    {judul: t.adegan.beat3Judul, isi: t.adegan.beat3Isi},
    {judul: t.adegan.beat4Judul, isi: t.adegan.beat4Isi},
    {judul: t.adegan.beat5Judul, isi: t.adegan.beat5Isi}
  ];

  useEffect(() => {
    if (reduce || !root.current) return;

    const ctx = gsap.context(() => {
      // Keadaan awal. Ditulis eksplisit supaya adegan benar bahkan kalau
      // pengguna memuat halaman di tengah bagian ini.
      gsap.set(".beat", {opacity: 0, y: 18});
      gsap.set(".beat-0", {opacity: 1, y: 0});
      gsap.set(["#money", "#receipt", "#capital", "#fee"], {opacity: 0});
      gsap.set("#lock", {opacity: 0, scale: 0.9, transformOrigin: "center"});
      gsap.set("#hash-line", {opacity: 0});
      gsap.set("#scan", {opacity: 0});
      gsap.set("#capline", {opacity: 0});
      gsap.set("#ledger-new", {opacity: 0, scale: 0.6, transformOrigin: "center"});
      gsap.set("#tier-fill", {scaleX: 0.55, transformOrigin: "left center"});
      gsap.set("#verdict", {opacity: 0});

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          // Jarak gulir per beat dibuat lebih pendek di ponsel: menahan
          // layar terlalu lama di perangkat kecil terasa seperti macet,
          // bukan seperti cerita.
          end: () => `+=${window.innerWidth < 768 ? 2400 : 3400}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      // Pergantian teks. Setiap beat menempati satu satuan waktu timeline.
      for (let i = 0; i < JUMLAH_BEAT; i++) {
        if (i > 0) tl.to(`.beat-${i}`, {opacity: 1, y: 0, duration: 0.35}, i);
        if (i < JUMLAH_BEAT - 1)
          tl.to(`.beat-${i}`, {opacity: 0, y: -18, duration: 0.35}, i + 0.62);
      }

      // ── Beat 1 · dana dikunci ───────────────────────────────────────
      tl.to("#money", {opacity: 1, duration: 0.2}, 0.1)
        .to("#money", {x: 156, duration: 0.5, ease: "power2.inOut"}, 0.2)
        .to("#money", {opacity: 0, duration: 0.15}, 0.68)
        .to("#lock", {opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)"}, 0.7)
        .to("#vault-fill", {scaleY: 1, duration: 0.4, ease: "power2.out"}, 0.65);

      // ── Beat 2 · bukti masuk sebagai hash ───────────────────────────
      tl.to("#receipt", {opacity: 1, duration: 0.2}, 1.1)
        .to("#receipt", {x: -152, duration: 0.5, ease: "power2.inOut"}, 1.2)
        .to("#receipt", {opacity: 0, duration: 0.15}, 1.68)
        .to("#hash-line", {opacity: 1, duration: 0.3}, 1.7);

      // ── Beat 3 · AI membaca, hanya boleh menahan ────────────────────
      tl.to("#scan", {opacity: 1, duration: 0.15}, 2.1)
        .fromTo(
          "#scan",
          {y: -34},
          {y: 34, duration: 0.6, ease: "none", repeat: 1, yoyo: true},
          2.15
        )
        .to("#scan", {opacity: 0, duration: 0.15}, 2.72)
        .to("#verdict", {opacity: 1, duration: 0.25}, 2.7);

      // ── Beat 4 · modal cair, dibatasi plafon ────────────────────────
      tl.to("#capline", {opacity: 1, duration: 0.25}, 3.05)
        .to("#capital", {opacity: 1, duration: 0.2}, 3.2)
        .to("#capital", {x: 152, duration: 0.5, ease: "power2.inOut"}, 3.28)
        .to("#capital", {opacity: 0, duration: 0.15}, 3.75)
        .to("#vault-fill", {scaleY: 0.28, duration: 0.45, ease: "power2.out"}, 3.3);

      // ── Beat 5 · fee cair, order jadi satu titik ────────────────────
      tl.to("#capline", {opacity: 0, duration: 0.2}, 4.05)
        .to("#fee", {opacity: 1, duration: 0.2}, 4.12)
        .to("#fee", {x: 152, duration: 0.45, ease: "power2.inOut"}, 4.2)
        .to("#fee", {opacity: 0, duration: 0.15}, 4.62)
        .to("#vault-fill", {scaleY: 0, duration: 0.35}, 4.25)
        .to("#lock", {opacity: 0.25, duration: 0.3}, 4.3)
        .to("#ledger-new", {opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.4)"}, 4.55)
        .to("#tier-fill", {scaleX: 0.78, duration: 0.4, ease: "power2.out"}, 4.6);
    }, root);

    return () => ctx.revert();
    // Timeline hanya bergantung pada JUMLAH beat, yang tetap. Isi teksnya
    // ditangani efek di bawah.
  }, [reduce]);

  // Mengganti bahasa mengubah panjang teks, dan panjang teks mengubah tinggi
  // elemen. Tanpa menghitung ulang, titik mulai dan berhenti pin akan meleset
  // dari posisi barunya.
  useEffect(() => {
    if (reduce) return;
    ScrollTrigger.refresh();
  }, [reduce, t]);

  // ── Versi diam ────────────────────────────────────────────────────
  if (reduce) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-10 max-w-lg text-xl font-semibold sm:text-2xl">{t.adegan.label}</h2>
        <ol className="flex flex-col">
          {beats.map((b, i) => (
            <li key={i} className="flex gap-5 border-t border-hairline py-6">
              <span className="num shrink-0 pt-0.5 text-xs text-ink-3">{i + 1}</span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[0.9375rem] font-medium">{b.judul}</h3>
                <p className="max-w-xl text-sm leading-relaxed text-ink-2">{b.isi}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section ref={root} className="relative min-h-[100dvh] overflow-hidden">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-center gap-8 px-4 py-16 sm:px-6 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16">
        {/* Teks. Kelima beat ditumpuk di posisi yang sama supaya
            pergantiannya terasa sebagai satu narasi, bukan sebagai lima
            blok yang lewat. */}
        <div className="order-2 lg:order-1">
          <p className="mono-label mb-5">{t.adegan.label}</p>

          <div className="relative min-h-[13rem] sm:min-h-[11rem]">
            {beats.map((b, i) => (
              <div key={i} className={`beat beat-${i} absolute inset-0 flex flex-col gap-3`}>
                <span className="num text-xs text-voltage">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="max-w-md text-xl font-semibold leading-snug sm:text-2xl">
                  {b.judul}
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-ink-2">{b.isi}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <SceneSvg />
        </div>
      </div>
    </section>
  );
}

/**
 * Panggung. Semua koordinat tetap dan semua gerak lewat transform, jadi
 * tidak ada satu pun frame yang memicu perhitungan tata letak ulang.
 */
function SceneSvg() {
  const {t} = useI18n();

  return (
    <svg
      viewBox="0 0 440 300"
      className="w-full"
      role="img"
      aria-label={t.adegan.label}
      fill="none"
    >
      <g className="[&_text]:fill-[var(--color-ink-3)] [&_text]:text-[9px] [&_text]:[font-family:var(--font-mono)] [&_text]:tracking-wider">
        {/* ── Simpul ──────────────────────────────────────────────── */}
        <rect
          x="16"
          y="104"
          width="96"
          height="52"
          rx="8"
          className="fill-[var(--color-paper-2)] stroke-[var(--color-hairline)]"
          strokeWidth="1"
        />
        <text x="64" y="134" textAnchor="middle">
          {t.umum.pembeli.toUpperCase()}
        </text>

        <rect
          x="328"
          y="104"
          width="96"
          height="52"
          rx="8"
          className="fill-[var(--color-paper-2)] stroke-[var(--color-hairline)]"
          strokeWidth="1"
        />
        <text x="376" y="134" textAnchor="middle">
          {t.umum.jastiper.toUpperCase()}
        </text>

        {/* ── Kontrak ─────────────────────────────────────────────── */}
        <rect
          x="172"
          y="86"
          width="96"
          height="88"
          rx="10"
          className="fill-[var(--color-paper)] stroke-[var(--color-ink-3)]"
          strokeWidth="1.25"
        />
        {/* Isi brankas. Diskalakan dari bawah supaya terbaca sebagai
            permukaan cairan yang naik dan turun, bukan sebagai kotak. */}
        <rect
          id="vault-fill"
          x="173"
          y="87"
          width="94"
          height="86"
          rx="9"
          className="fill-[var(--color-voltage)]"
          opacity="0.14"
          style={{transform: "scaleY(0)", transformOrigin: "220px 173px"}}
        />
        <text x="220" y="196" textAnchor="middle">
          JEJAKESCROW.SOL
        </text>

        {/* Gembok */}
        <g id="lock" style={{transformOrigin: "220px 74px"}}>
          <rect
            x="212"
            y="70"
            width="16"
            height="12"
            rx="2.5"
            className="fill-[var(--color-voltage)]"
          />
          <path
            d="M215.5 70v-3.5a4.5 4.5 0 019 0V70"
            className="stroke-[var(--color-voltage)]"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* ── Garis alur ──────────────────────────────────────────── */}
        <path
          d="M112 130h60M268 130h60"
          className="stroke-[var(--color-hairline)]"
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        {/* ── Muatan yang bergerak ────────────────────────────────── */}
        <g id="money">
          <rect
            x="52"
            y="122"
            width="28"
            height="16"
            rx="3"
            className="fill-[var(--color-voltage)]"
          />
          <text x="66" y="133" textAnchor="middle" className="!fill-[var(--color-voltage-ink)]">
            tBNB
          </text>
        </g>

        <g id="receipt">
          <rect
            x="356"
            y="114"
            width="22"
            height="28"
            rx="2.5"
            className="fill-[var(--color-paper)] stroke-[var(--color-ink-2)]"
            strokeWidth="1"
          />
          <path
            d="M360 121h14M360 126h14M360 131h9"
            className="stroke-[var(--color-ink-3)]"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        <g id="capital">
          <rect
            x="206"
            y="122"
            width="28"
            height="16"
            rx="3"
            className="fill-[var(--color-settle)]"
          />
          <text x="220" y="133" textAnchor="middle" className="!fill-[var(--color-paper)]">
            MODAL
          </text>
        </g>

        <g id="fee">
          <rect
            x="210"
            y="124"
            width="20"
            height="12"
            rx="2.5"
            className="fill-[var(--color-settle)]"
          />
          <text x="220" y="133" textAnchor="middle" className="!fill-[var(--color-paper)]">
            FEE
          </text>
        </g>

        {/* ── Pemindaian AI ───────────────────────────────────────── */}
        <g id="scan">
          <path
            d="M176 130h88"
            className="stroke-[var(--color-voltage)]"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        <g id="verdict">
          <text x="220" y="210" textAnchor="middle" className="!fill-[var(--color-settle)]">
            STRUK COCOK
          </text>
        </g>

        {/* ── Plafon ──────────────────────────────────────────────── */}
        <g id="capline">
          <path
            d="M172 100h96"
            className="stroke-[var(--color-wait)]"
            strokeWidth="1.25"
            strokeDasharray="4 3"
          />
          <text x="274" y="99" className="!fill-[var(--color-wait)]">
            PLAFON
          </text>
        </g>

        {/* ── Hash bukti ──────────────────────────────────────────── */}
        <g id="hash-line">
          <text x="220" y="210" textAnchor="middle">
            0x5a90c3e7…e2b45c80
          </text>
        </g>

        {/* ── Rekam jejak ─────────────────────────────────────────── */}
        <text x="16" y="242">
          REKAM JEJAK
        </text>
        {Array.from({length: 9}).map((_, i) => (
          <rect
            key={i}
            x={16 + i * 17}
            y="252"
            width="12"
            height="12"
            rx="2.5"
            className="fill-[var(--color-settle)]"
            opacity="0.42"
          />
        ))}
        <rect
          id="ledger-new"
          x={16 + 9 * 17}
          y="252"
          width="12"
          height="12"
          rx="2.5"
          className="fill-[var(--color-settle)]"
          style={{transformOrigin: `${16 + 9 * 17 + 6}px 258px`}}
        />

        {/* ── Plafon tier ─────────────────────────────────────────── */}
        <text x="290" y="242" textAnchor="end">
          PLAFON TIER
        </text>
        <rect
          x="290"
          y="254"
          width="134"
          height="8"
          rx="4"
          className="fill-[var(--color-paper-3)]"
        />
        <rect
          id="tier-fill"
          x="290"
          y="254"
          width="134"
          height="8"
          rx="4"
          className="fill-[var(--color-voltage)]"
          style={{transformOrigin: "290px 258px"}}
        />
      </g>
    </svg>
  );
}
