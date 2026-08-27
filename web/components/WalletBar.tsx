"use client";

import {ConnectButton} from "@rainbow-me/rainbowkit";

/**
 * Tombol connect RainbowKit apa adanya. Sudah menangani sendiri:
 *  - alamat tampil begitu tersambung (§18.2 Minggu 1)
 *  - status "Wrong network" bawaan ketika chain aktif != wagmiConfig.chains
 * NetworkBanner (di layout) menambah sinyal yang lebih mencolok untuk demo,
 * tapi tombol ini tetap jalan sendiri tanpa itu.
 */
export function WalletBar() {
  return <ConnectButton showBalance={false} chainStatus="icon" accountStatus={{smallScreen: "avatar", largeScreen: "full"}} />;
}
