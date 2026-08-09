// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseTest} from "./Base.t.sol";
import {JejakEscrow} from "../src/JejakEscrow.sol";

/**
 * @title  InvariantsTest
 * @notice Lima pernyataan yang harus SELALU benar, apa pun yang terjadi (§12.3).
 *
 *         INV-1  Jumlah seluruh pembayaran keluar untuk satu order == T, persis.
 *         INV-2  V <= C, dipaksa kontrak, selalu, tanpa pengecualian.
 *         INV-3  Setelah state final, saldo internal order == 0.
 *         INV-4  Arbiter tidak pernah bisa memindahkan lebih dari sisa order itu.
 *         INV-5  Tidak ada fungsi yang bisa memindahkan dana antar-order.
 *
 *         INV-2 adalah yang paling penting: dialah satu-satunya alasan kalimat
 *         "kalau backend AI kami dibajak, kerugian maksimum tetap plafon
 *         pembeli" boleh diucapkan di panggung. Kalimat itu hanya boleh
 *         diucapkan setelah tes ini hijau.
 */
contract InvariantsTest is BaseTest {
    /// Jastiper dinaikkan ke tier tertinggi sekali di awal, supaya fuzz bisa
    /// mencoba nilai besar tanpa tersandung pemeriksaan plafon tier.
    function setUp() public override {
        super.setUp();
        _promote(jastiper, 30);
        assertEq(escrow.tierOf(jastiper), 3);
        assertEq(escrow.tierCap(jastiper), escrow.TIER3_CAP());
    }

    // ═══════════════════════════════════════════════════════════════════
    // INV-1 — untuk setiap wei yang masuk, ada tepat satu wei yang keluar
    // ═══════════════════════════════════════════════════════════════════
    function test_INV1_totalOutEqualsTotalIn_allPaths(
        uint128 cap,
        uint128 fee,
        uint128 verified,
        uint128 splitSeed,
        uint8 pathSel
    ) public {
        cap = uint128(bound(cap, 1e12, 5 ether));
        fee = uint128(bound(fee, 1e12, 1 ether));
        verified = uint128(bound(verified, 1, cap));
        uint128 total = cap + fee;
        vm.assume(uint256(total) <= escrow.TIER3_CAP());

        uint256 pBuyer0 = escrow.pendingWithdrawals(buyer);
        uint256 pJastiper0 = escrow.pendingWithdrawals(jastiper);

        uint256 id = _createOrder(buyer, cap, fee);
        uint8 path = pathSel % 7;

        if (path == 0) {
            // D-01
            _accept(id, jastiper);
            _proof(id, jastiper);
            _release(id, verified);
            vm.prank(buyer);
            escrow.confirmReceipt(id);
        } else if (path == 1) {
            // D-02
            _accept(id, jastiper);
            _proof(id, jastiper);
            _release(id, verified);
            vm.warp(block.timestamp + escrow.DISPUTE_WINDOW());
            escrow.autoReleaseFee(id);
        } else if (path == 2) {
            // D-03
            vm.prank(buyer);
            escrow.cancelByBuyer(id);
        } else if (path == 3) {
            // D-04
            vm.warp(escrow.getOrder(id).acceptDeadline);
            escrow.expireUnaccepted(id);
        } else if (path == 4) {
            // D-05
            _accept(id, jastiper);
            vm.warp(block.timestamp + escrow.PROOF_WINDOW() + 1);
            escrow.abandonByTimeout(id);
        } else if (path == 5) {
            // D-06 — arbiter membagi seluruh T dengan pembagian acak
            _accept(id, jastiper);
            _proof(id, jastiper);
            vm.prank(buyer);
            escrow.raiseDispute(id);
            uint128 keBuyer = uint128(bound(splitSeed, 0, total));
            vm.prank(arbiter);
            escrow.resolveDispute(id, keBuyer, total - keBuyer, REASON_HASH);
        } else {
            // D-09 — arbiter membagi sisa setelah modal cair
            _accept(id, jastiper);
            _proof(id, jastiper);
            _release(id, verified);
            vm.prank(buyer);
            escrow.raiseDispute(id);
            uint128 sisa = uint128(escrow.remainingWei(id));
            uint128 keBuyer = uint128(bound(splitSeed, 0, sisa));
            vm.prank(arbiter);
            escrow.resolveDispute(id, keBuyer, sisa - keBuyer, REASON_HASH);
        }

        uint256 keluar = (escrow.pendingWithdrawals(buyer) - pBuyer0)
            + (escrow.pendingWithdrawals(jastiper) - pJastiper0);

        assertEq(keluar, total, "INV-1: keluar harus sama persis dengan masuk");
        assertTrue(escrow.isFinal(_status(id)), "harus berakhir di state final");
        assertEq(escrow.remainingWei(id), 0, "INV-3: sisa harus nol");
    }

    // ═══════════════════════════════════════════════════════════════════
    // INV-2 — PAGAR KERAS. AI tidak pernah bisa mencairkan di atas plafon.
    // ═══════════════════════════════════════════════════════════════════
    function test_INV2_verifiedNeverExceedsCap(uint128 cap, uint128 fee, uint128 attempt) public {
        cap = uint128(bound(cap, 1e15, 5 ether));
        fee = uint128(bound(fee, 1e15, 1 ether));

        uint256 pJastiper0 = escrow.pendingWithdrawals(jastiper);

        uint256 id = _createOrder(buyer, cap, fee);
        _accept(id, jastiper);
        _proof(id, jastiper);

        if (attempt > cap) {
            // Inilah skenario "backend dibajak": penyerang mengirim nominal
            // sembarang. Kontrak menolaknya, apa pun angkanya.
            vm.prank(verifier);
            vm.expectRevert("JEJAK: melebihi plafon");
            escrow.releaseCapital(id, attempt);

            assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.PROOFED), "state tidak boleh geser");
            assertEq(escrow.getOrder(id).verifiedWei, 0);
        } else if (attempt == 0) {
            vm.prank(verifier);
            vm.expectRevert("JEJAK: verifiedWei nol");
            escrow.releaseCapital(id, attempt);
        } else {
            _release(id, attempt);
            assertLe(escrow.getOrder(id).verifiedWei, cap, "INV-2 dilanggar");
            assertEq(escrow.pendingWithdrawals(jastiper) - pJastiper0, attempt);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // INV-3 — keempat state final wajib menyisakan nol
    // ═══════════════════════════════════════════════════════════════════
    function test_INV3_finalStateHasZeroBalance() public {
        // COMPLETED
        uint256 a = _runToCapitalPaid(0.03 ether);
        vm.prank(buyer);
        escrow.confirmReceipt(a);
        assertEq(uint8(_status(a)), uint8(JejakEscrow.Status.COMPLETED));
        assertEq(escrow.remainingWei(a), 0);

        // REFUNDED
        uint256 b = _createOrder();
        vm.prank(buyer);
        escrow.cancelByBuyer(b);
        assertEq(uint8(_status(b)), uint8(JejakEscrow.Status.REFUNDED));
        assertEq(escrow.remainingWei(b), 0);

        // ABANDONED
        uint256 c = _createOrder();
        _accept(c, jastiper);
        vm.warp(block.timestamp + escrow.PROOF_WINDOW() + 1);
        escrow.abandonByTimeout(c);
        assertEq(uint8(_status(c)), uint8(JejakEscrow.Status.ABANDONED));
        assertEq(escrow.remainingWei(c), 0);

        // RESOLVED
        uint256 d = _createOrder();
        _accept(d, jastiper);
        _proof(d, jastiper);
        vm.prank(buyer);
        escrow.raiseDispute(d);
        vm.prank(arbiter);
        escrow.resolveDispute(d, CAP, FEE, REASON_HASH);
        assertEq(uint8(_status(d)), uint8(JejakEscrow.Status.RESOLVED));
        assertEq(escrow.remainingWei(d), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // INV-4 — kuasa arbiter berhenti di batas sisa dana order itu
    // ═══════════════════════════════════════════════════════════════════
    function test_INV4_arbiterCannotExceedRemaining(uint128 keBuyer, uint128 keJastiper) public {
        uint256 id = _createOrder();
        _accept(id, jastiper);
        _proof(id, jastiper);
        vm.prank(buyer);
        escrow.raiseDispute(id);

        uint256 sisa = escrow.remainingWei(id);
        // Hanya pembagian yang jumlahnya PERSIS sisa yang diterima.
        vm.assume(uint256(keBuyer) + uint256(keJastiper) != sisa);

        vm.prank(arbiter);
        vm.expectRevert("JEJAK: pembagian tidak sama dengan sisa");
        escrow.resolveDispute(id, keBuyer, keJastiper, REASON_HASH);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.DISPUTED), "state tidak boleh geser");
    }

    // ═══════════════════════════════════════════════════════════════════
    // INV-5 — dana satu order tidak pernah bisa menyentuh order lain
    // ═══════════════════════════════════════════════════════════════════
    function test_INV5_noCrossOrderFundMovement() public {
        uint256 a = _createOrder();
        uint256 b = _createOrder();

        _accept(a, jastiper);
        _proof(a, jastiper);
        vm.prank(buyer);
        escrow.raiseDispute(a);

        uint256 pBuyerB = escrow.remainingWei(b);
        assertEq(pBuyerB, TOTAL);

        // Arbiter memihak jastiper sepenuhnya di order A.
        vm.prank(arbiter);
        escrow.resolveDispute(a, 0, TOTAL, REASON_HASH);

        // Order B tidak tersentuh sedikit pun.
        assertEq(escrow.remainingWei(b), TOTAL, "order B ikut berubah: INV-5 dilanggar");
        assertEq(uint8(_status(b)), uint8(JejakEscrow.Status.CREATED));

        // Dan arbiter tidak bisa menyentuh B karena B tidak bersengketa.
        vm.prank(arbiter);
        vm.expectRevert("JEJAK: status bukan DISPUTED");
        escrow.resolveDispute(b, TOTAL, 0, REASON_HASH);

        // Pembeli B tetap bisa membatalkan dan menerima haknya utuh.
        uint256 pending0 = escrow.pendingWithdrawals(buyer);
        vm.prank(buyer);
        escrow.cancelByBuyer(b);
        assertEq(escrow.pendingWithdrawals(buyer) - pending0, TOTAL);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Pemeriksaan menyeluruh: setelah semua pihak menarik, kontrak kosong
    // ═══════════════════════════════════════════════════════════════════
    function test_INV1_contractDrainsToZeroAfterEveryoneWithdraws() public {
        uint256 id = _runToCapitalPaid(0.031 ether);
        vm.prank(buyer);
        escrow.confirmReceipt(id);

        // Tarik semua pihak, termasuk 30 pembeli dari promosi tier.
        _withdraw(buyer);
        _withdraw(jastiper);
        for (uint32 i = 0; i < 30; i++) {
            address b = address(uint160(uint256(keccak256(abi.encode("pembeli", i)))));
            _withdraw(b);
        }

        assertEq(address(escrow).balance, 0, "masih ada wei tanpa pemilik di kontrak");
    }
}
