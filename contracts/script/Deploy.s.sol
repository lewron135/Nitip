// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {JejakEscrow} from "../src/JejakEscrow.sol";

/**
 * @title  Deploy
 * @notice Men-deploy JejakEscrow dan MENCATAT `DEPLOY_BLOCK`.
 *
 * @dev    Blok deploy bukan catatan kaki: indexer memulai backfill dari sana,
 *         dan RPC pihak ketiga akan menolak permintaan yang mengular dari
 *         blok 0 (RPC-3 §14.5). Kalau angka ini hilang, indexer kalian tidak
 *         punya titik mulai dan Skenario C ikut mati. Karena itu skrip ini
 *         menuliskannya ke berkas, bukan mengandalkan seseorang menyalinnya
 *         dari terminal.
 *
 *         Jalankan:
 *           forge script script/Deploy.s.sol:Deploy \
 *             --rpc-url $BSC_TESTNET_RPC --private-key $DEPLOYER_PK \
 *             --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY -vvvv
 *
 *         Lalu WAJIB:
 *           node ../scripts/export-abi.mjs      # ABI ke web/ dan services/
 *           git add deployments/ && git commit
 *           kirim alamat + DEPLOY_BLOCK ke dua orang lain HARI ITU JUGA
 */
contract Deploy is Script {
    function run() external returns (JejakEscrow escrow) {
        address verifier = vm.envAddress("VERIFIER_ADDRESS");
        address arbiter = vm.envAddress("ARBITER_ADDRESS");

        vm.startBroadcast();
        escrow = new JejakEscrow(verifier, arbiter);
        vm.stopBroadcast();

        console.log("=========================================");
        console.log("JejakEscrow ter-deploy");
        console.log("  alamat      :", address(escrow));
        console.log("  chainId     :", block.chainid);
        console.log("  DEPLOY_BLOCK:", block.number);
        console.log("  verifier    :", verifier);
        console.log("  arbiter     :", arbiter);
        console.log("  owner       :", escrow.owner());
        console.log("=========================================");
        console.log("Salin DEPLOY_BLOCK di atas ke .env kalian SEKARANG.");

        _write(address(escrow), verifier, arbiter, escrow.owner());
    }

    function _write(address escrow, address verifier, address arbiter, address owner) internal {
        string memory namaJaringan = _networkName(block.chainid);
        string memory obj = "deployment";

        vm.serializeAddress(obj, "address", escrow);
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeUint(obj, "deployBlock", block.number);
        vm.serializeUint(obj, "deployedAt", block.timestamp);
        vm.serializeAddress(obj, "verifier", verifier);
        vm.serializeAddress(obj, "arbiter", arbiter);
        vm.serializeString(obj, "network", namaJaringan);
        string memory json = vm.serializeAddress(obj, "owner", owner);

        string memory path = string.concat("./deployments/", namaJaringan, ".json");
        vm.writeJson(json, path);

        console.log("Ditulis ke contracts/deployments/%s.json", namaJaringan);
    }

    function _networkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 97) return "bsc-testnet";
        if (chainId == 56) return "bsc-mainnet";
        if (chainId == 31337) return "anvil";
        return "unknown";
    }
}
