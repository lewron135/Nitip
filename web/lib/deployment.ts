// BERKAS INI DIHASILKAN OTOMATIS — JANGAN DISUNTING TANGAN.
// Sumber : contracts/out/JejakEscrow.sol/JejakEscrow.json
// Ulangi : node scripts/export-abi.mjs
//
// Kalau kamu tergoda menyunting berkas ini karena "cuma satu field",
// baca §18.2 masterplan dulu. ABI yang disalin tangan adalah cara
// paling umum kehilangan satu hari penuh menjelang deadline.

/** Isi contracts/deployments/*.json, dibekukan saat build. */
export const deployments = {
  "anvil": {
    "address": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    "arbiter": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "chainId": 31337,
    "deployBlock": 1,
    "deployedAt": 1786288172846,
    "network": "anvil",
    "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "verifier": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "deployTxHash": "0x168cd84d5fd726ab2357257ee7a792f1ce1653b5bd5324f2e1577669bb2f09b5",
    "commit": null
  }
} as const;

export type NetworkName = keyof typeof deployments;

export function deploymentFor(chainId: number) {
  return Object.values(deployments).find((d) => d.chainId === chainId);
}
