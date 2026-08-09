/**
 * seed-demo.ts — membangun dataset demo di anvil yang menghasilkan
 * TRUST **90.50** persis seperti uji kewarasan §13.3 masterplan.
 *
 * KENAPA ANGKA ITU YANG DIKEJAR
 * ─────────────────────────────
 * §13.3 memuat satu kasus yang dihitung TANGAN:
 *
 *     nAccepted=10, nCompleted=10, nLost=0, nAbandoned=0,
 *     vTotal=0,6e18, medHours=40, uBuyers=8   →   TRUST = 90.50
 *
 * Skrip ini menyusun sepuluh order sungguhan di rantai lokal yang, setelah
 * dibaca indexer, menghasilkan tepat masukan itu. Artinya kalian bisa
 * melatih Skenario C sepenuhnya offline: jalankan `recompute.py` terhadap
 * anvil, dan angkanya harus 90.50. Kalau tidak, ada yang salah di indexer,
 * di scoring, atau di skrip Python — dan kalian menemukannya sekarang,
 * bukan di panggung.
 *
 * Nilai order disusun supaya patuh pada plafon tier di setiap langkah:
 *   order  1–3 : 0,04 tBNB   (muat di plafon T0 = 0,05)
 *   order  4–9 : 0,07 tBNB   (muat di plafon T1 = 0,20 setelah 3 tuntas)
 *   order 10   : 0,06 tBNB
 *   total      : 0,60 tBNB   ✓
 *
 * Durasi penyelesaian dipilih supaya median (elemen tengah BAWAH dari 10 data)
 * jatuh tepat di 40 jam.
 *
 *   npm run seed:demo
 */

import {createPublicClient, createWalletClient, http, parseEther, keccak256, toHex} from "viem";
import {privateKeyToAccount, mnemonicToAccount} from "viem/accounts";
import {jejakEscrowAbi} from "../shared/abi.js";
import {anvilChain} from "../shared/chain.js";

const RPC = process.env.ANVIL_RPC ?? "http://127.0.0.1:8545";

/** Mnemonic bawaan anvil. Aman ditulis di repo: ini kunci publik yang semua orang punya. */
const MNEMONIC = "test test test test test test test test test test test junk";

const KUNCI = {
  deployer: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  jastiper: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  verifier: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  arbiter: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
} as const;

const transport = http(RPC);
const publicClient = createPublicClient({chain: anvilChain, transport});

function dompet(pk: `0x${string}`) {
  const account = privateKeyToAccount(pk);
  return {account, client: createWalletClient({account, chain: anvilChain, transport})};
}

/** Delapan pembeli unik, diturunkan dari mnemonic anvil dan didanai lewat RPC. */
function pembeli(i: number) {
  const account = mnemonicToAccount(MNEMONIC, {addressIndex: 10 + i});
  return {account, client: createWalletClient({account, chain: anvilChain, transport})};
}

async function majuWaktu(detik: number) {
  await fetch(RPC, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "evm_increaseTime", params: [detik]})
  });
  await fetch(RPC, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "evm_mine", params: []})
  });
}

async function danai(alamat: string) {
  await fetch(RPC, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "anvil_setBalance",
      params: [alamat, "0x21e19e0c9bab2400000"] // 10.000 ETH
    })
  });
}

const IDR_PER_BNB = 9_500_000n;
const JAM = 3600;

/** Sepuluh order. Median dari daftar jam ini adalah 40 (elemen tengah bawah). */
const RENCANA = [
  {capEth: "0.035", feeEth: "0.005", jam: 20, buyer: 0, barang: "Skincare set X 50ml (Jepang)"},
  {capEth: "0.035", feeEth: "0.005", jam: 24, buyer: 1, barang: "Obat flu OTC 12 tablet (Jepang)"},
  {capEth: "0.035", feeEth: "0.005", jam: 30, buyer: 2, barang: "Matcha ceremonial grade 40g"},
  {capEth: "0.060", feeEth: "0.010", jam: 36, buyer: 3, barang: "Sunscreen SPF50 travel pack"},
  {capEth: "0.060", feeEth: "0.010", jam: 40, buyer: 4, barang: "Cushion foundation No.21 (Korea)"},
  {capEth: "0.060", feeEth: "0.010", jam: 44, buyer: 5, barang: "Serum ampoule 30ml (Korea)"},
  {capEth: "0.060", feeEth: "0.010", jam: 48, buyer: 6, barang: "Kit Kat edisi regional 5 rasa"},
  {capEth: "0.060", feeEth: "0.010", jam: 52, buyer: 7, barang: "Tumbler stainless 500ml"},
  {capEth: "0.060", feeEth: "0.010", jam: 60, buyer: 0, barang: "Hair treatment mask 200g"},
  {capEth: "0.050", feeEth: "0.010", jam: 72, buyer: 1, barang: "Face mask sheet 30 lembar"}
];

async function main() {
  const alamatKontrak = process.env.CONTRACT_ADDRESS as `0x${string}` | undefined;
  if (!alamatKontrak) {
    console.error("CONTRACT_ADDRESS belum diisi. Deploy dulu ke anvil, lalu:");
    console.error("  CONTRACT_ADDRESS=0x... npm run seed:demo");
    process.exit(1);
  }

  const jastiper = dompet(KUNCI.jastiper);
  const verifier = dompet(KUNCI.verifier);

  console.log("Menyemai dataset demo JEJAK di", RPC);
  console.log("  kontrak :", alamatKontrak);
  console.log("  jastiper:", jastiper.account.address);
  console.log("");

  // Danai kedelapan pembeli.
  for (let i = 0; i < 8; i++) await danai(pembeli(i).account.address);

  let totalWei = 0n;
  const jamTerkumpul: number[] = [];

  for (const [i, r] of RENCANA.entries()) {
    const b = pembeli(r.buyer);
    const capWei = parseEther(r.capEth);
    const feeWei = parseEther(r.feeEth);
    const total = capWei + feeWei;

    const blok = await publicClient.getBlock();
    const deadline = blok.timestamp + 3n * 86400n;

    // 1. PESAN
    let hash = await b.client.writeContract({
      address: alamatKontrak,
      abi: jejakEscrowAbi,
      functionName: "createOrder",
      args: [capWei, feeWei, keccak256(toHex(r.barang)), deadline, IDR_PER_BNB],
      value: total,
      account: b.account,
      chain: anvilChain
    });
    const rcpt = await publicClient.waitForTransactionReceipt({hash});
    const orderId = BigInt(rcpt.logs[0]!.topics[1]!);

    // 2. TERIMA
    hash = await jastiper.client.writeContract({
      address: alamatKontrak,
      abi: jejakEscrowAbi,
      functionName: "acceptOrder",
      args: [orderId],
      account: jastiper.account,
      chain: anvilChain
    });
    await publicClient.waitForTransactionReceipt({hash});

    // Waktu berjalan: inilah yang menentukan medHours.
    await majuWaktu(r.jam * JAM);

    // 3. BELI (kirim bukti)
    hash = await jastiper.client.writeContract({
      address: alamatKontrak,
      abi: jejakEscrowAbi,
      functionName: "submitProof",
      args: [orderId, keccak256(toHex(`bukti-demo-${i}`))],
      account: jastiper.account,
      chain: anvilChain
    });
    await publicClient.waitForTransactionReceipt({hash});

    // 4–5. VERIFIKASI & CAIR-1 (modal)
    hash = await verifier.client.writeContract({
      address: alamatKontrak,
      abi: jejakEscrowAbi,
      functionName: "releaseCapital",
      args: [orderId, capWei],
      account: verifier.account,
      chain: anvilChain
    });
    await publicClient.waitForTransactionReceipt({hash});

    // 6–7. TERIMA & CAIR-2 (fee)
    hash = await b.client.writeContract({
      address: alamatKontrak,
      abi: jejakEscrowAbi,
      functionName: "confirmReceipt",
      args: [orderId],
      account: b.account,
      chain: anvilChain
    });
    await publicClient.waitForTransactionReceipt({hash});

    totalWei += total;
    jamTerkumpul.push(r.jam);
    console.log(
      `  order #${orderId}  ${r.capEth}+${r.feeEth} tBNB  ${r.jam} jam  pembeli #${r.buyer}  ✓ tuntas`
    );
  }

  // ── Order tambahan untuk melatih skenario demo ────────────────────
  console.log("");
  console.log("Menyiapkan order untuk skenario demo:");

  const b0 = pembeli(0);
  const blok = await publicClient.getBlock();
  const deadline = blok.timestamp + 3n * 86400n;

  const hashA = await b0.client.writeContract({
    address: alamatKontrak,
    abi: jejakEscrowAbi,
    functionName: "createOrder",
    args: [parseEther("0.12"), parseEther("0.015"), keccak256(toHex("Skincare X 50ml — SKENARIO A")), deadline, IDR_PER_BNB],
    value: parseEther("0.135"),
    account: b0.account,
    chain: anvilChain
  });
  const rA = await publicClient.waitForTransactionReceipt({hash: hashA});
  console.log(`  Skenario A: order #${BigInt(rA.logs[0]!.topics[1]!)} siap diterima jastiper`);

  const hashB = await b0.client.writeContract({
    address: alamatKontrak,
    abi: jejakEscrowAbi,
    functionName: "createOrder",
    args: [parseEther("0.10"), parseEther("0.012"), keccak256(toHex("Tas kulit — SKENARIO B (foto katalog)")), deadline, IDR_PER_BNB],
    value: parseEther("0.112"),
    account: b0.account,
    chain: anvilChain
  });
  const rB = await publicClient.waitForTransactionReceipt({hash: hashB});
  console.log(`  Skenario B: order #${BigInt(rB.logs[0]!.topics[1]!)} siap diterima jastiper`);

  // ── Ringkasan: inilah yang harus dihitung ulang recompute.py ──────
  const urut = [...jamTerkumpul].sort((a, b) => a - b);
  const median = urut[urut.length / 2 - 1];

  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("Masukan JEJAK-TRUST yang terbentuk:");
  console.log("  nAccepted  :", RENCANA.length);
  console.log("  nCompleted :", RENCANA.length);
  console.log("  nAbandoned : 0");
  console.log("  nLost      : 0");
  console.log("  vTotal     :", totalWei.toString(), `wei (${Number(totalWei) / 1e18} tBNB)`);
  console.log("  uBuyers    : 8");
  console.log("  medHours   :", median);
  console.log("");
  console.log("  TRUST yang diharapkan: 90.50  (uji kewarasan §13.3)");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("Sekarang jalankan:");
  console.log("  cd services && npm run indexer:backfill");
  console.log(`  cd verify-independent && python recompute.py ${jastiper.account.address} \\`);
  console.log(`      --rpc ${RPC} --contract ${alamatKontrak} --from-block 0`);
  console.log("");
  console.log("Kalau kedua angkanya 90.50, Skenario C hidup.");
}

await main();
