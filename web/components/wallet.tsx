"use client";

/**
 * Wallet dan transaksi.
 *
 * Antarmuka wallet ditulis sendiri, bukan memakai modal pihak ketiga.
 * Alasannya bukan selera: satu-satunya cara menegakkan aturan sudut dan
 * warna di globals.css adalah kalau tidak ada komponen di layar yang
 * membawa sistem desainnya sendiri.
 *
 * Semua penulisan ke rantai lewat sini, supaya keempat keadaan transaksi
 * (menunggu tanda tangan, terkirim, terkonfirmasi, gagal) tidak ditulis
 * ulang dengan cara berbeda di setiap halaman.
 */

import {useEffect, useRef, useState} from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt
} from "wagmi";
import type {Abi} from "viem";
import {WalletIcon, SignOutIcon, SpinnerGapIcon, CheckCircleIcon} from "@phosphor-icons/react";
import {chain, escrowContract} from "@/lib/chain";
import {shortAddress} from "@/lib/format";
import {useI18n} from "@/lib/i18n";
import {useHydrated} from "@/lib/use-hydrated";
import {ExplorerLink} from "./ui";

// ════════════════════════════════════════════════════════════════════════
//  Tombol hubungkan
// ════════════════════════════════════════════════════════════════════════

export function ConnectButton({compact = false}: {compact?: boolean}) {
  const {t} = useI18n();
  const {address, isConnected, chainId} = useAccount();
  const {connectors, connect, isPending} = useConnect();
  const {disconnect} = useDisconnect();
  const {switchChain} = useSwitchChain();

  // Render pertama di klien harus sama dengan render server. Status wallet
  // hanya ada di klien, jadi ia dipasang setelah hidrasi selesai.
  const siap = useHydrated();

  if (!siap) {
    return (
      <button type="button" className="btn btn-secondary" disabled>
        {t.nav.hubungkan}
      </button>
    );
  }

  if (isConnected && chainId !== chain.id) {
    return (
      <button
        type="button"
        onClick={() => switchChain({chainId: chain.id})}
        className="btn bg-wait-soft text-wait border border-wait/40 hover:brightness-95"
      >
        {t.nav.jaringanSalah}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-1">
        <span className="num hidden rounded-control border border-hairline px-3 py-2 text-[0.8125rem] text-ink-2 sm:inline">
          {shortAddress(address)}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="btn btn-quiet"
          aria-label={t.nav.putuskan}
        >
          <SignOutIcon size={16} />
          {!compact ? <span className="hidden sm:inline">{t.nav.putuskan}</span> : null}
        </button>
      </div>
    );
  }

  const tersedia = connectors.filter((c) => c.type !== "injected" || c.id === "injected");
  const utama = tersedia[0];

  if (!utama) {
    return (
      <span className="text-[0.8125rem] text-ink-3">{t.wallet.tidakAdaWallet}</span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => connect({connector: utama})}
      disabled={isPending}
      className="btn btn-primary"
    >
      <WalletIcon size={16} weight="bold" />
      {isPending ? t.wallet.memproses : t.nav.hubungkan}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Tombol transaksi
// ════════════════════════════════════════════════════════════════════════

export type TxState = "idle" | "signing" | "mining" | "done" | "error";

/**
 * Satu tombol yang memegang seluruh siklus hidup transaksi.
 *
 * Yang membuat ini layak jadi komponen sendiri adalah keadaan `mining`:
 * transaksi sudah terkirim tapi belum masuk blok. Tanpa keadaan itu di
 * layar, pengguna menekan tombol dua kali dan membayar gas dua kali.
 */
export function TxButton({
  fungsi,
  args,
  value,
  label,
  variant = "primary",
  disabled,
  helper,
  onSuccess
}: {
  fungsi: string;
  args?: readonly unknown[];
  value?: bigint;
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  helper?: string;
  onSuccess?: () => void;
}) {
  const {t} = useI18n();
  const {isConnected, chainId} = useAccount();
  const {switchChain} = useSwitchChain();
  const {writeContractAsync} = useWriteContract();

  const [menandatangani, setMenandatangani] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [galatKirim, setGalatKirim] = useState<string | null>(null);

  const {isSuccess, isError: gagalReceipt} = useWaitForTransactionReceipt({hash});

  /**
   * Keadaan DITURUNKAN, bukan disimpan. Menyimpannya berarti membuat salinan
   * kebenaran yang sudah dipegang wagmi, lalu menjaga salinan itu tetap
   * sinkron lewat efek — dan efek yang memanggil setState memicu render
   * berjenjang tepat saat halaman paling sibuk.
   */
  const state: TxState =
    galatKirim || gagalReceipt
      ? "error"
      : isSuccess
        ? "done"
        : hash
          ? "mining"
          : menandatangani
            ? "signing"
            : "idle";

  const pesan = galatKirim ?? (gagalReceipt ? t.wallet.gagal : null);

  // Satu-satunya efek yang tersisa memberi tahu dunia luar, dan tidak
  // menyentuh state komponen ini sama sekali.
  const sudahLapor = useRef(false);
  useEffect(() => {
    if (isSuccess && !sudahLapor.current) {
      sudahLapor.current = true;
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  const jaringanSalah = isConnected && chainId !== chain.id;

  async function jalankan() {
    setGalatKirim(null);
    setMenandatangani(true);
    try {
      const h = await writeContractAsync({
        address: escrowContract.address,
        abi: escrowContract.abi as Abi,
        functionName: fungsi,
        args: args as readonly unknown[] | undefined,
        value
      });
      setHash(h);
    } catch (e) {
      // Penolakan pengguna bukan kegagalan sistem, dan tidak boleh
      // ditampilkan dengan nada yang sama seperti transaksi yang gagal.
      const teks = e instanceof Error ? e.message : String(e);
      setGalatKirim(
        /user rejected|denied|rejected the request/i.test(teks) ? t.wallet.ditolak : ringkasGalat(teks)
      );
    } finally {
      setMenandatangani(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <ConnectButton />
        <p className="text-xs leading-relaxed text-ink-3">{t.wallet.hubungkanJelas}</p>
      </div>
    );
  }

  if (jaringanSalah) {
    return (
      <button
        type="button"
        onClick={() => switchChain({chainId: chain.id})}
        className="btn bg-wait-soft text-wait border border-wait/40"
      >
        {t.wallet.pindahJaringan}
      </button>
    );
  }

  const sibuk = state === "signing" || state === "mining";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={jalankan}
        disabled={disabled || sibuk || state === "done"}
        className={`btn ${variant === "primary" ? "btn-primary" : "btn-secondary"}`}
      >
        {sibuk ? <SpinnerGapIcon size={16} className="animate-spin" /> : null}
        {state === "done" ? <CheckCircleIcon size={16} weight="fill" /> : null}
        {state === "signing"
          ? t.wallet.memproses
          : state === "mining"
            ? t.wallet.dikirim
            : state === "done"
              ? t.wallet.berhasil
              : label}
      </button>

      {helper && state === "idle" ? (
        <p className="text-xs leading-relaxed text-ink-3">{helper}</p>
      ) : null}

      {hash ? (
        <div className="text-xs">
          <ExplorerLink hash={hash} kind="tx" />
        </div>
      ) : null}

      {pesan ? <p className="text-xs leading-relaxed text-dispute">{pesan}</p> : null}
    </div>
  );
}

/**
 * Pesan galat dari node bisa sepanjang ratusan baris. Yang berguna bagi
 * pengguna hampir selalu ada di baris `require` kontrak, dan pesan kontrak
 * di JejakEscrow sengaja ditulis dalam bahasa manusia ("JEJAK: ...").
 */
function ringkasGalat(teks: string): string {
  const kontrak = teks.match(/JEJAK: [^"'\n]+/);
  if (kontrak) return kontrak[0];

  const alasan = teks.match(/reason:\s*([^\n]+)/i);
  if (alasan) return alasan[1].trim();

  return teks.split("\n")[0].slice(0, 160);
}
