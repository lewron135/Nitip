// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {JejakEscrow} from "../src/JejakEscrow.sol";

/**
 * @title  BaseTest
 * @notice Perkakas bersama untuk ketiga berkas tes. Tidak berisi satu pun
 *         `test_*` — supaya `forge test` hanya melaporkan kasus yang benar
 *         benar ada di daftar §15 masterplan, tanpa tambahan.
 */
abstract contract BaseTest is Test {
    JejakEscrow internal escrow;

    address internal owner = makeAddr("owner");
    address internal verifier = makeAddr("verifier");
    address internal arbiter = makeAddr("arbiter");
    address internal buyer = makeAddr("buyer");
    address internal jastiper = makeAddr("jastiper");
    address internal stranger = makeAddr("stranger");

    /// Nilai order bawaan: 0,04 + 0,008 = 0,048 tBNB, muat di plafon T0 (0,05).
    uint128 internal constant CAP = 0.04 ether;
    uint128 internal constant FEE = 0.008 ether;
    uint128 internal constant TOTAL = CAP + FEE;

    bytes32 internal constant ITEM_HASH = keccak256("Skincare X 50ml, edisi Jepang");
    bytes32 internal constant PROOF_HASH = keccak256("ipfs://bukti-struk-dan-barang");
    bytes32 internal constant REASON_HASH = keccak256("barang tidak sesuai deskripsi");

    /// Kurs contoh: 1 BNB = Rp 9.500.000. Catatan audit saja (KD-02).
    uint256 internal constant IDR_PER_BNB = 9_500_000;

    function setUp() public virtual {
        vm.prank(owner);
        escrow = new JejakEscrow(verifier, arbiter);

        vm.deal(buyer, 100 ether);
        vm.deal(jastiper, 10 ether);
        vm.deal(stranger, 10 ether);
    }

    // ───────────────────────── pembantu alur ─────────────────────────

    function _createOrder(address buyer_, uint128 cap, uint128 fee) internal returns (uint256 id) {
        vm.prank(buyer_);
        id = escrow.createOrder{value: uint256(cap) + uint256(fee)}(
            cap, fee, ITEM_HASH, uint64(block.timestamp + 3 days), IDR_PER_BNB
        );
    }

    function _createOrder() internal returns (uint256) {
        return _createOrder(buyer, CAP, FEE);
    }

    function _accept(uint256 id, address jastiper_) internal {
        vm.prank(jastiper_);
        escrow.acceptOrder(id);
    }

    function _proof(uint256 id, address jastiper_) internal {
        vm.prank(jastiper_);
        escrow.submitProof(id, PROOF_HASH);
    }

    function _release(uint256 id, uint128 verifiedWei) internal {
        vm.prank(verifier);
        escrow.releaseCapital(id, verifiedWei);
    }

    /// Order berjalan sampai state CAPITAL_PAID dengan nominal AI `verifiedWei`.
    function _runToCapitalPaid(uint128 verifiedWei) internal returns (uint256 id) {
        id = _createOrder();
        _accept(id, jastiper);
        _proof(id, jastiper);
        _release(id, verifiedWei);
    }

    /**
     * @dev Menaikkan tier jastiper dengan cara yang jujur: menjalankan `n`
     *      order kecil sampai tuntas. Sengaja TIDAK memakai `vm.store` untuk
     *      menyuntik `completedCount`, karena tes yang menyuntik penghitung
     *      tidak membuktikan bahwa penghitungnya benar-benar naik lewat
     *      jalur normal.
     *
     *      Nilainya sangat kecil (0,002 tBNB) supaya seluruh promosi muat di
     *      plafon T0 dan tidak pernah tersandung pemeriksaannya sendiri.
     */
    function _promote(address jastiper_, uint32 n) internal {
        for (uint32 i = 0; i < n; i++) {
            address b = address(uint160(uint256(keccak256(abi.encode("pembeli", i)))));
            vm.deal(b, 1 ether);

            uint256 id = _createOrder(b, 0.001 ether, 0.001 ether);
            _accept(id, jastiper_);
            _proof(id, jastiper_);
            _release(id, 0.001 ether);

            vm.prank(b);
            escrow.confirmReceipt(id);
        }
    }

    // ──────────────────────── pembantu asersi ────────────────────────

    function _status(uint256 id) internal view returns (JejakEscrow.Status) {
        return escrow.getOrder(id).status;
    }

    /// Total yang bisa ditarik oleh semua pihak yang mungkin terlibat.
    function _sumPending(uint256 extraCount, address[] memory extra) internal view returns (uint256 s) {
        s = escrow.pendingWithdrawals(buyer) + escrow.pendingWithdrawals(jastiper)
            + escrow.pendingWithdrawals(arbiter) + escrow.pendingWithdrawals(owner)
            + escrow.pendingWithdrawals(verifier) + escrow.pendingWithdrawals(stranger);
        for (uint256 i = 0; i < extraCount; i++) {
            s += escrow.pendingWithdrawals(extra[i]);
        }
    }

    function _withdraw(address who) internal returns (uint256 amount) {
        amount = escrow.pendingWithdrawals(who);
        if (amount == 0) return 0;
        vm.prank(who);
        escrow.withdraw();
    }
}
