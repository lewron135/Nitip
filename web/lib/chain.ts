/**
 * Konfigurasi rantai untuk frontend.
 *
 * §18.2 masterplan menandai tiga perangkap yang sudah menunggu di sini,
 * dan ketiganya sudah ditutup di berkas ini:
 *
 *   1. "wagmi v2 mewajibkan @tanstack/react-query sebagai provider."
 *      → dipasang di components/providers.tsx
 *
 *   2. "Nilai uint128 dari viem datang sebagai BigInt. Number() pada angka
 *      wei kehilangan presisi."
 *      → seluruh nilai wei diperlakukan sebagai bigint; lihat lib/format.ts
 *
 *   3. "Jangan salin ABI manual."
 *      → lib/abi.ts dihasilkan scripts/export-abi.mjs, tidak pernah diketik
 */

import {createConfig, http} from "wagmi";
import {bsc, bscTestnet} from "wagmi/chains";
import {injected, walletConnect} from "wagmi/connectors";
import {defineChain} from "viem";
import {jejakEscrowAbi} from "./abi";

/** Rantai lokal untuk latihan seluruh alur tanpa menyentuh testnet. */
export const anvil = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: {name: "Ether", symbol: "ETH", decimals: 18},
  rpcUrls: {default: {http: ["http://127.0.0.1:8545"]}}
});

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 97);

export const chain = CHAIN_ID === 97 ? bscTestnet : CHAIN_ID === 56 ? bsc : anvil;

const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (CHAIN_ID === 31337 ? "http://127.0.0.1:8545" : "https://bsc-testnet-rpc.publicnode.com");

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID?.trim();

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    injected(),
    // WalletConnect hanya dipasang kalau project id-nya benar-benar ada.
    // Memasangnya dengan id karangan membuat modal wallet gagal DI TENGAH
    // DEMO, dengan galat yang tidak menyebut penyebabnya.
    ...(wcProjectId ? [walletConnect({projectId: wcProjectId, showQrModal: true})] : [])
  ],
  transports: {[chain.id]: http(rpcUrl)},
  ssr: true
});

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "") as `0x${string}`;

export const escrowContract = {
  address: CONTRACT_ADDRESS,
  abi: jejakEscrowAbi
} as const;

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export function explorerTx(hash: string): string {
  if (CHAIN_ID === 97) return `https://testnet.bscscan.com/tx/${hash}`;
  if (CHAIN_ID === 56) return `https://bscscan.com/tx/${hash}`;
  return `#${hash}`;
}

export function explorerAddress(addr: string): string {
  if (CHAIN_ID === 97) return `https://testnet.bscscan.com/address/${addr}`;
  if (CHAIN_ID === 56) return `https://bscscan.com/address/${addr}`;
  return `#${addr}`;
}
