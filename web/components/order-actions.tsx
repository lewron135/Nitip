"use client";

/**
 * Aksi yang tersedia untuk satu order.
 *
 * Aturan yang dipegang berkas ini: ANTARMUKA TIDAK PERNAH MENEBAK. Tombol
 * hanya muncul kalau kontrak memang akan menerimanya pada status dan peran
 * saat itu (§11.3). Menampilkan tombol yang pasti ditolak berarti menyuruh
 * pengguna membayar gas untuk belajar bahwa mereka tidak boleh menekannya.
 *
 * Lima fungsi di sini sengaja terbuka untuk SIAPA PUN (§12.3, prinsip P6):
 * `expireUnaccepted`, `abandonByTimeout`, `escalateStaleVerification`,
 * `autoReleaseFee`, dan `withdraw`. Semuanya diberi penjelasan di layar,
 * karena "kenapa saya boleh menekan ini padahal bukan order saya" adalah
 * pertanyaan yang bagus dan jawabannya adalah inti desain produk ini.
 */

import {useState} from "react";
import {useAccount, useReadContract} from "wagmi";
import {UploadSimpleIcon, UsersThreeIcon} from "@phosphor-icons/react";
import type {Order} from "@/lib/types";
import {Status} from "@/lib/status";
import {escrowContract} from "@/lib/chain";
import {nowSeconds, formatBnb} from "@/lib/format";
import {bacaBerkas, unggahBukti} from "@/lib/api";
import {useI18n} from "@/lib/i18n";
import {TxButton} from "./wallet";

export function OrderActions({order, onChange}: {order: Order; onChange?: () => void}) {
  const {t} = useI18n();
  const {address} = useAccount();

  const saya = address?.toLowerCase();
  const akuPembeli = Boolean(saya && saya === order.buyer.toLowerCase());
  const akuJastiper = Boolean(saya && saya === order.jastiper?.toLowerCase());
  const sekarang = nowSeconds();

  const aksi: React.ReactNode[] = [];

  // ── CREATED ───────────────────────────────────────────────────────
  if (order.status === Status.CREATED) {
    if (akuPembeli) {
      aksi.push(
        <TxButton
          key="batal"
          fungsi="cancelByBuyer"
          args={[BigInt(order.id)]}
          variant="secondary"
          label={t.detailOrder.batalkan}
          onSuccess={onChange}
        />
      );
    } else if (saya) {
      aksi.push(
        <TxButton
          key="terima"
          fungsi="acceptOrder"
          args={[BigInt(order.id)]}
          label={t.detailOrder.terima}
          onSuccess={onChange}
        />
      );
    }

    if (sekarang > order.acceptDeadline) {
      aksi.push(
        <Permissionless key="kedaluwarsa">
          <TxButton
            fungsi="expireUnaccepted"
            args={[BigInt(order.id)]}
            variant="secondary"
            label={t.detailOrder.kedaluwarsa}
            onSuccess={onChange}
          />
        </Permissionless>
      );
    }
  }

  // ── ACCEPTED ──────────────────────────────────────────────────────
  if (order.status === Status.ACCEPTED) {
    if (akuJastiper) {
      aksi.push(<ProofUpload key="bukti" order={order} onChange={onChange} />);
    }

    if (order.proofDeadline && sekarang > order.proofDeadline) {
      aksi.push(
        <Permissionless key="tinggal">
          <TxButton
            fungsi="abandonByTimeout"
            args={[BigInt(order.id)]}
            variant="secondary"
            label={t.detailOrder.tinggalkan}
            onSuccess={onChange}
          />
        </Permissionless>
      );
    }
  }

  // ── PROOFED ───────────────────────────────────────────────────────
  if (order.status === Status.PROOFED) {
    if (akuJastiper) {
      aksi.push(
        <TxButton
          key="banding"
          fungsi="raiseVerificationAppeal"
          args={[BigInt(order.id)]}
          variant="secondary"
          label={t.detailOrder.banding}
          onSuccess={onChange}
        />
      );
    }

    if (order.verifyDeadline && sekarang > order.verifyDeadline) {
      aksi.push(
        <Permissionless key="eskalasi">
          <TxButton
            fungsi="escalateStaleVerification"
            args={[BigInt(order.id)]}
            variant="secondary"
            label={t.detailOrder.eskalasi}
            onSuccess={onChange}
          />
        </Permissionless>
      );
    }
  }

  // ── CAPITAL_PAID ──────────────────────────────────────────────────
  if (order.status === Status.CAPITAL_PAID) {
    if (akuPembeli) {
      aksi.push(
        <TxButton
          key="konfirmasi"
          fungsi="confirmReceipt"
          args={[BigInt(order.id)]}
          label={t.detailOrder.konfirmasi}
          onSuccess={onChange}
        />,
        <TxButton
          key="sengketa"
          fungsi="raiseDispute"
          args={[BigInt(order.id)]}
          variant="secondary"
          label={t.detailOrder.sengketa}
          onSuccess={onChange}
        />
      );
    }

    if (order.disputeWindowEnd && sekarang > order.disputeWindowEnd) {
      aksi.push(
        <Permissionless key="fee">
          <TxButton
            fungsi="autoReleaseFee"
            args={[BigInt(order.id)]}
            variant="secondary"
            label={t.detailOrder.cairkanFee}
            onSuccess={onChange}
          />
        </Permissionless>
      );
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="mono-label">{t.detailOrder.aksi}</h2>

      {aksi.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-3">{t.detailOrder.tidakAdaAksi}</p>
      ) : (
        <div className="flex flex-col gap-5">{aksi}</div>
      )}

      <Withdraw />
    </section>
  );
}

/** Pembungkus untuk fungsi tanpa pembatas peran, dengan alasannya. */
function Permissionless({children}: {children: React.ReactNode}) {
  const {t} = useI18n();

  return (
    <div className="flex flex-col gap-2.5 rounded-panel border border-hairline bg-paper-2 p-4">
      <div className="flex items-center gap-2">
        <UsersThreeIcon size={15} className="text-ink-3" />
        <span className="mono-label">{t.detailOrder.siapaPun}</span>
      </div>
      <p className="text-xs leading-relaxed text-ink-3">{t.detailOrder.siapaPunJelas}</p>
      <div className="pt-1">{children}</div>
    </div>
  );
}

/**
 * Penarikan dana. Kontrak memakai pola pull payment (C-02): dana tidak
 * pernah didorong ke siapa pun di tengah alur, ia menunggu di kontrak
 * sampai pemiliknya menariknya sendiri.
 */
function Withdraw() {
  const {t} = useI18n();
  const {address} = useAccount();

  const {data: tertunda, refetch} = useReadContract({
    ...escrowContract,
    functionName: "pendingWithdrawals",
    args: address ? [address] : undefined,
    query: {enabled: Boolean(address)}
  });

  const jumlah = (tertunda as bigint | undefined) ?? 0n;
  if (!address || jumlah === 0n) return null;

  return (
    <div className="flex flex-col gap-3 rounded-panel border border-settle/30 bg-settle-soft p-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="mono-label !text-settle">{t.detailOrder.tarik}</span>
        <span className="num text-lg text-settle">{formatBnb(jumlah)}</span>
      </div>
      <p className="text-xs leading-relaxed text-settle/80">{t.detailOrder.tarikJelas}</p>
      <TxButton fungsi="withdraw" label={t.detailOrder.tarik} onSuccess={() => refetch()} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  UNGGAH BUKTI
//  Dua langkah, dan urutannya tidak boleh dibalik: berkas naik ke server
//  DULU untuk mendapat hash, lalu jastiper sendiri yang mengirim hash itu
//  ke rantai. Server tidak pernah menandatangani apa pun atas nama siapa pun.
// ════════════════════════════════════════════════════════════════════════

function ProofUpload({order, onChange}: {order: Order; onChange?: () => void}) {
  const {t} = useI18n();

  const [struk, setStruk] = useState<File | null>(null);
  const [barang, setBarang] = useState<File | null>(null);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function kirim() {
    if (!struk) {
      setGalat(t.unggahBukti.galatStruk);
      return;
    }

    setSibuk(true);
    setGalat(null);
    try {
      const hasil = await unggahBukti(order.id, {
        struk: await bacaBerkas(struk),
        barang: barang ? await bacaBerkas(barang) : null
      });
      setHash(hasil.proofHash);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-panel border border-hairline p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[0.9375rem] font-medium">{t.unggahBukti.judul}</h3>
        <p className="text-xs leading-relaxed text-ink-3">{t.unggahBukti.sub}</p>
      </div>

      <FilePicker
        id="struk"
        label={t.unggahBukti.struk}
        badge={t.unggahBukti.strukWajib}
        file={struk}
        onPick={setStruk}
      />
      <FilePicker
        id="barang"
        label={t.unggahBukti.barang}
        badge={t.unggahBukti.barangOpsional}
        file={barang}
        onPick={setBarang}
      />

      {galat ? <p className="field-error">{galat}</p> : null}

      {hash ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 rounded-control bg-paper-2 p-3">
            <span className="mono-label">{t.unggahBukti.hashSiap}</span>
            <span className="num break-all text-xs text-ink-2">{hash}</span>
          </div>
          <TxButton
            fungsi="submitProof"
            args={[BigInt(order.id), hash]}
            label={t.unggahBukti.kirimKeRantai}
            onSuccess={onChange}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={kirim}
          disabled={!struk || sibuk}
          className="btn btn-secondary self-start"
        >
          <UploadSimpleIcon size={16} />
          {sibuk ? t.umum.memuat : t.unggahBukti.unggahDulu}
        </button>
      )}
    </div>
  );
}

function FilePicker({
  id,
  label,
  badge,
  file,
  onPick
}: {
  id: string;
  label: string;
  badge: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const {t} = useI18n();

  return (
    <div className="field">
      <label htmlFor={id} className="field-label flex items-center gap-2">
        {label}
        <span className="num text-[0.625rem] uppercase tracking-wider text-ink-3">{badge}</span>
      </label>

      <div className="flex items-center gap-3">
        <input
          id={id}
          type="file"
          accept="image/*"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
        <label htmlFor={id} className="btn btn-secondary cursor-pointer text-[0.875rem]">
          {t.unggahBukti.pilihBerkas}
        </label>
        {file ? (
          <span className="truncate text-xs text-ink-2" title={file.name}>
            {file.name}
          </span>
        ) : null}
      </div>
    </div>
  );
}
