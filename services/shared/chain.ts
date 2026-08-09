/**
 * Klien rantai dengan RPC cadangan yang benar-benar dipakai, bukan dicatat.
 *
 * §14.5 adalah bagian masterplan yang menyebut dirinya sendiri "RISIKO NOMOR
 * SATU": RPC publik resmi BSC MENONAKTIFKAN `eth_getLogs`, dan seluruh
 * produk ini adalah pembaca event. Kalau di panggung skrip Skenario C
 * menunjuk endpoint resmi, dia gagal di depan juri.
 *
 * `fallback()` viem mengurus pergantian otomatis. Yang tidak bisa diurus
 * pustaka mana pun adalah kalian belum pernah mengujinya — jadi jalankan
 * `npm run rpc:check` sebelum percaya berkas ini.
 */

import {createPublicClient, createWalletClient, defineChain, fallback, http} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {bsc, bscTestnet} from "viem/chains";
import {env} from "./env.js";

/** Anvil lokal — dipakai untuk latihan seluruh alur tanpa menyentuh testnet. */
export const anvilChain = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: {name: "Ether", symbol: "ETH", decimals: 18},
  rpcUrls: {default: {http: ["http://127.0.0.1:8545"]}}
});

export function chainFor(chainId: number) {
  if (chainId === 97) return bscTestnet;
  if (chainId === 56) return bsc;
  return anvilChain;
}

export const chain = chainFor(env.chainId);

const transports = [http(env.rpcUrl, {retryCount: 3, retryDelay: 400, timeout: 20_000})];
if (env.rpcUrlBackup) {
  transports.push(http(env.rpcUrlBackup, {retryCount: 3, retryDelay: 400, timeout: 20_000}));
}

export const publicClient = createPublicClient({
  chain,
  // `rank: false` menjaga urutan tetap: utama dulu, cadangan hanya kalau
  // yang utama gagal. Peringkat otomatis terdengar pintar, tapi membuat
  // perilaku saat demo jadi tidak bisa ditebak — dan yang kami butuhkan
  // saat demo justru bisa ditebak.
  transport: fallback(transports, {rank: false, retryCount: 2})
});

export function walletFor(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    client: createWalletClient({account, chain, transport: fallback(transports, {rank: false})})
  };
}

/**
 * Uji kewarasan §14.5 yang WAJIB lulus sebelum satu baris indexer pun
 * dipercaya. Ini versi program dari perintah `cast logs` di masterplan.
 */
export async function cekEthGetLogs(): Promise<{ok: boolean; pesan: string}> {
  try {
    const terbaru = await publicClient.getBlockNumber();
    const dari = terbaru > 100n ? terbaru - 100n : 0n;

    await publicClient.getLogs({fromBlock: dari, toBlock: terbaru});

    return {
      ok: true,
      pesan: `eth_getLogs jalan. Blok terbaru ${terbaru}, diuji pada rentang ${dari}–${terbaru}.`
    };
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      pesan:
        `eth_getLogs GAGAL: ${pesan}\n\n` +
        `Berhenti di sini dan ganti RPC dulu (§14.5). Jangan menulis indexer\n` +
        `di atas endpoint yang tidak mendukung pembacaan event — Skenario C\n` +
        `akan mati di panggung, bukan di sini.`
    };
  }
}
