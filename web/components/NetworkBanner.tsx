"use client";

import {useAccount, useChainId, useSwitchChain} from "wagmi";
import {CHAIN_ID, chain} from "@/lib/chain";

/**
 * Pita peringatan penuh-lebar, terpisah dari status bawaan RainbowKit,
 * supaya "jaringan salah" tidak bisa terlewat saat demo (§18.2 Minggu 1:
 * "Deteksi jaringan salah + tombol pindah ke BSC Testnet").
 */
export function NetworkBanner() {
  const {isConnected} = useAccount();
  const connectedChainId = useChainId();
  const {switchChain, isPending} = useSwitchChain();

  if (!isConnected || connectedChainId === CHAIN_ID) return null;

  return (
    <div
      role="alert"
      className="flex w-full items-center justify-center gap-3 px-6 py-2.5 text-sm"
      style={{background: "var(--color-dispute-soft)", color: "var(--color-dispute)"}}
    >
      <span>Wallet tersambung ke jaringan yang salah.</span>
      <button
        type="button"
        className="btn btn-secondary"
        style={{borderColor: "var(--color-dispute)", color: "var(--color-dispute)", padding: "0.25rem 0.75rem"}}
        onClick={() => switchChain({chainId: CHAIN_ID})}
        disabled={isPending}
      >
        {isPending ? "Memindahkan…" : `Pindah ke ${chain.name}`}
      </button>
    </div>
  );
}
