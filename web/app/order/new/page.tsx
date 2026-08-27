"use client";

import {useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {InfoIcon} from "@phosphor-icons/react";
import {parseBnb, formatBnb, formatIdr, weiToIdr, nowSeconds} from "@/lib/format";
import {hashItem, ingat} from "@/lib/itembook";
import {useI18n} from "@/lib/i18n";
import {PageHeader, DataRow} from "@/components/ui";
import {TxButton} from "@/components/wallet";

/**
 * Kurs snapshot. CATATAN AUDIT saja (§11.1 KD-01/KD-02) — kontrak menyimpannya
 * tapi tidak pernah memakainya untuk aritmetika apa pun. Kalau backend nanti
 * membuka endpoint kurs, angka ini diganti dari sana.
 */
const IDR_PER_BNB = process.env.NEXT_PUBLIC_IDR_PER_BNB ?? "9842500";

const PILIHAN_TENGGAT = [3, 7, 14, 30];

export default function BuatOrderPage() {
  const {t} = useI18n();
  const router = useRouter();

  const [barang, setBarang] = useState("");
  const [plafon, setPlafon] = useState("");
  const [fee, setFee] = useState("");
  const [hari, setHari] = useState(7);
  const [disentuh, setDisentuh] = useState(false);

  // Parsing dilakukan sekali di sini, dan kegagalannya diperlakukan sebagai
  // galat form, bukan sebagai nilai nol. Nol yang diam-diam lolos ke wallet
  // adalah cara termahal untuk salah ketik.
  const nilai = useMemo(() => {
    let capWei: bigint | null = null;
    let feeWei: bigint | null = null;

    try {
      capWei = plafon.trim() ? parseBnb(plafon) : null;
    } catch {
      capWei = null;
    }
    try {
      feeWei = fee.trim() ? parseBnb(fee) : null;
    } catch {
      feeWei = null;
    }

    return {capWei, feeWei, totalWei: capWei !== null && feeWei !== null ? capWei + feeWei : null};
  }, [plafon, fee]);

  const galat = {
    barang: disentuh && !barang.trim() ? t.buatOrder.galatBarang : null,
    plafon: disentuh && (nilai.capWei === null || nilai.capWei <= 0n) ? t.buatOrder.galatPlafon : null,
    fee: disentuh && (nilai.feeWei === null || nilai.feeWei <= 0n) ? t.buatOrder.galatFee : null
  };

  const sah =
    barang.trim().length > 0 &&
    nilai.capWei !== null &&
    nilai.capWei > 0n &&
    nilai.feeWei !== null &&
    nilai.feeWei > 0n;

  // Deskripsi diingat di peramban ini begitu diketik, bukan saat transaksi
  // berhasil. Menyimpannya belakangan berarti deskripsi hilang setiap kali
  // wallet ditutup di tengah jalan, dan yang tersisa cuma hash.
  useEffect(() => {
    if (barang.trim()) ingat(barang);
  }, [barang]);

  const args = sah
    ? ([
        nilai.capWei,
        nilai.feeWei,
        hashItem(barang),
        BigInt(nowSeconds() + hari * 86400),
        BigInt(IDR_PER_BNB)
      ] as const)
    : undefined;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <PageHeader judul={t.buatOrder.judul} sub={t.buatOrder.sub} />

      <form
        className="flex flex-col gap-7"
        onSubmit={(e) => e.preventDefault()}
        onBlur={() => setDisentuh(true)}
      >
        <div className="field">
          <label htmlFor="barang" className="field-label">
            {t.buatOrder.labelBarang}
          </label>
          <textarea
            id="barang"
            value={barang}
            onChange={(e) => setBarang(e.target.value)}
            rows={3}
            className="field-input resize-y"
            aria-describedby="barang-bantuan"
            aria-invalid={Boolean(galat.barang)}
          />
          <p id="barang-bantuan" className="field-help">
            {t.buatOrder.bantuanBarang}
          </p>
          {galat.barang ? <p className="field-error">{galat.barang}</p> : null}
        </div>

        <div className="grid gap-7 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="plafon" className="field-label">
              {t.buatOrder.labelPlafon}
            </label>
            <input
              id="plafon"
              value={plafon}
              onChange={(e) => setPlafon(e.target.value)}
              inputMode="decimal"
              placeholder="0.12"
              className="field-input num"
              aria-describedby="plafon-bantuan"
              aria-invalid={Boolean(galat.plafon)}
            />
            <p id="plafon-bantuan" className="field-help">
              {t.buatOrder.bantuanPlafon}
            </p>
            {galat.plafon ? <p className="field-error">{galat.plafon}</p> : null}
          </div>

          <div className="field">
            <label htmlFor="fee" className="field-label">
              {t.buatOrder.labelFee}
            </label>
            <input
              id="fee"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              inputMode="decimal"
              placeholder="0.015"
              className="field-input num"
              aria-describedby="fee-bantuan"
              aria-invalid={Boolean(galat.fee)}
            />
            <p id="fee-bantuan" className="field-help">
              {t.buatOrder.bantuanFee}
            </p>
            {galat.fee ? <p className="field-error">{galat.fee}</p> : null}
          </div>
        </div>

        <div className="field">
          <span className="field-label">{t.buatOrder.labelTenggat}</span>
          <div className="flex flex-wrap gap-2">
            {PILIHAN_TENGGAT.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => setHari(d)}
                aria-pressed={hari === d}
                className={`btn text-[0.875rem] ${
                  hari === d ? "btn-primary" : "btn-secondary"
                }`}
              >
                {t.buatOrder.pilihTenggat[i]}
              </button>
            ))}
          </div>
          <p className="field-help">{t.buatOrder.bantuanTenggat}</p>
        </div>

        {/* Ringkasan apa yang akan dikunci. Angka ini yang masuk ke wallet
            sebagai `value`, jadi ia harus terlihat SEBELUM wallet terbuka,
            bukan hanya di dalam wallet. */}
        <section className="panel p-5">
          <h2 className="mono-label mb-2">{t.buatOrder.ringkas}</h2>
          <dl>
            <DataRow label={t.umum.plafon}>
              <span className="num text-[0.9375rem]">
                {nilai.capWei !== null ? formatBnb(nilai.capWei) : "-"}
              </span>
            </DataRow>
            <DataRow label={t.umum.fee}>
              <span className="num text-[0.9375rem]">
                {nilai.feeWei !== null ? formatBnb(nilai.feeWei) : "-"}
              </span>
            </DataRow>
            <DataRow label={t.umum.total} help={t.umum.kursCatatan}>
              {nilai.totalWei !== null ? (
                <span className="inline-flex flex-col items-start gap-0.5 sm:items-end">
                  <span className="num text-lg">{formatBnb(nilai.totalWei)}</span>
                  <span className="num text-xs text-ink-3">
                    ≈ {formatIdr(weiToIdr(nilai.totalWei, IDR_PER_BNB))}
                  </span>
                </span>
              ) : (
                <span className="num text-lg text-ink-3">-</span>
              )}
            </DataRow>
          </dl>
        </section>

        <div className="flex items-start gap-2.5 rounded-control bg-paper-2 px-3.5 py-3">
          <InfoIcon size={15} className="mt-0.5 shrink-0 text-ink-3" />
          <p className="text-xs leading-relaxed text-ink-3">{t.buatOrder.catatanIngat}</p>
        </div>

        <TxButton
          fungsi="createOrder"
          args={args}
          value={nilai.totalWei ?? undefined}
          disabled={!sah}
          label={t.buatOrder.kirim}
          onSuccess={() => router.push("/order")}
        />
      </form>
    </div>
  );
}
