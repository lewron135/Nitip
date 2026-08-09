// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseTest} from "./Base.t.sol";
import {JejakEscrow} from "../src/JejakEscrow.sol";

/**
 * @title  FundPathsTest
 * @notice Satu tes per baris tabel §12.3 masterplan. Nama fungsinya ditulis
 *         persis seperti di §15 supaya keluaran `forge test` bisa dibaca
 *         sebagai daftar periksa, bukan sebagai daftar nama karangan.
 *
 *         Auditor menilai kontrak escrow dari satu pertanyaan: untuk setiap
 *         wei yang masuk, ada berapa jalan keluar, dan apakah semuanya
 *         tertutup? Berkas ini adalah jawabannya, sembilan jalur, semuanya
 *         berakhir di state final dengan sisa nol.
 */
contract FundPathsTest is BaseTest {
    // ═══════════════════════════════════════════════════════════════════
    // D-01 — Normal: pembeli konfirmasi terima
    //        Pembeli menerima C − V · jastiper menerima V + F
    // ═══════════════════════════════════════════════════════════════════
    function test_D01_normalPath_buyerConfirms_bothPaid() public {
        uint128 verified = 0.03 ether; // AI membaca struk: di bawah plafon 0,04

        uint256 id = _runToCapitalPaid(verified);

        // Modal sudah cair duluan — inilah pencairan dua tahap (§6.6).
        assertEq(escrow.pendingWithdrawals(jastiper), verified, "modal belum cair");
        assertEq(escrow.pendingWithdrawals(buyer), 0, "pembeli tidak boleh dapat apa-apa dulu");
        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.CAPITAL_PAID));

        vm.prank(buyer);
        escrow.confirmReceipt(id);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.COMPLETED));
        assertEq(escrow.pendingWithdrawals(buyer), CAP - verified, "sisa plafon harus kembali");
        assertEq(escrow.pendingWithdrawals(jastiper), verified + FEE, "jastiper: modal + fee");

        // INV-1: jumlah keluar == jumlah masuk, persis.
        assertEq(escrow.pendingWithdrawals(buyer) + escrow.pendingWithdrawals(jastiper), TOTAL);
        // INV-3: state final, sisa nol.
        assertEq(escrow.remainingWei(id), 0);

        // Rekam jejak bertambah tepat satu — bahan baku skor §13.
        assertEq(escrow.completedCount(jastiper), 1);
        assertEq(escrow.abandonedCount(jastiper), 0);

        // Pull payment benar-benar bisa ditarik.
        uint256 before = jastiper.balance;
        _withdraw(jastiper);
        assertEq(jastiper.balance - before, verified + FEE);
        assertEq(escrow.pendingWithdrawals(jastiper), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // D-02 — Auto-release: masa sanggah 72 jam lewat, SIAPA PUN boleh memicu
    // ═══════════════════════════════════════════════════════════════════
    function test_D02_autoRelease_afterDisputeWindow() public {
        uint128 verified = 0.025 ether;
        uint256 id = _runToCapitalPaid(verified);

        // Belum waktunya: harus ditolak.
        vm.expectRevert("JEJAK: masa sanggah belum lewat");
        escrow.autoReleaseFee(id);

        vm.warp(block.timestamp + escrow.DISPUTE_WINDOW());

        // Dipanggil orang asing — membuktikan fee jastiper tidak bergantung
        // pada kerelaan pembeli menekan tombol, maupun pada JEJAK masih hidup.
        vm.prank(stranger);
        escrow.autoReleaseFee(id);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.COMPLETED));
        assertEq(escrow.pendingWithdrawals(buyer), CAP - verified);
        assertEq(escrow.pendingWithdrawals(jastiper), verified + FEE);
        assertEq(escrow.remainingWei(id), 0);
        assertEq(escrow.completedCount(jastiper), 1);
    }

    // ═══════════════════════════════════════════════════════════════════
    // D-03 — Pembeli membatalkan sebelum ada jastiper: refund penuh
    // ═══════════════════════════════════════════════════════════════════
    function test_D03_cancelByBuyer_fullRefund() public {
        uint256 id = _createOrder();

        vm.prank(buyer);
        escrow.cancelByBuyer(id);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.REFUNDED));
        assertEq(escrow.pendingWithdrawals(buyer), TOTAL, "refund harus penuh, tanpa potongan");
        assertEq(escrow.remainingWei(id), 0);

        // Sudah final: tidak ada transisi keluar.
        vm.prank(buyer);
        vm.expectRevert("JEJAK: status bukan CREATED");
        escrow.cancelByBuyer(id);
    }

    function test_D03_cancelByBuyer_onlyBeforeAccepted() public {
        uint256 id = _createOrder();
        _accept(id, jastiper);

        vm.prank(buyer);
        vm.expectRevert("JEJAK: status bukan CREATED");
        escrow.cancelByBuyer(id);
    }

    // ═══════════════════════════════════════════════════════════════════
    // D-04 — Kedaluwarsa tanpa jastiper: refund penuh, dipicu siapa pun
    // ═══════════════════════════════════════════════════════════════════
    function test_D04_expireUnaccepted_fullRefund() public {
        uint256 id = _createOrder();

        vm.expectRevert("JEJAK: belum kedaluwarsa");
        escrow.expireUnaccepted(id);

        vm.warp(escrow.getOrder(id).acceptDeadline);

        vm.prank(stranger);
        escrow.expireUnaccepted(id);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.REFUNDED));
        assertEq(escrow.pendingWithdrawals(buyer), TOTAL);
        assertEq(escrow.remainingWei(id), 0);

        // Setelah kedaluwarsa, jastiper tidak bisa lagi mengambilnya.
        vm.prank(jastiper);
        vm.expectRevert("JEJAK: status bukan CREATED");
        escrow.acceptOrder(id);
    }

    // ═══════════════════════════════════════════════════════════════════
    // D-05 — Jastiper kabur setelah menerima: refund penuh + penalti tier
    // ═══════════════════════════════════════════════════════════════════
    function test_D05_abandonByTimeout_refundAndPenalty() public {
        // Naikkan dulu ke T1 supaya penurunan tier-nya terlihat.
        _promote(jastiper, 3);
        assertEq(escrow.tierOf(jastiper), 1);
        assertEq(escrow.tierCap(jastiper), escrow.TIER1_CAP());

        uint256 id = _createOrder();
        _accept(id, jastiper);

        vm.expectRevert("JEJAK: belum lewat batas bukti");
        escrow.abandonByTimeout(id);

        vm.warp(block.timestamp + escrow.PROOF_WINDOW() + 1);

        vm.prank(stranger);
        escrow.abandonByTimeout(id);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.ABANDONED));
        assertEq(escrow.pendingWithdrawals(buyer), TOTAL, "pembeli harus utuh");
        assertEq(escrow.remainingWei(id), 0);

        // Penalti: sekali kabur, plafon mengecil — dan itu melekat di alamat.
        assertEq(escrow.abandonedCount(jastiper), 1);
        assertEq(escrow.tierOf(jastiper), 0, "harus turun satu tier");
        assertEq(escrow.tierCap(jastiper), escrow.TIER0_CAP());

        // Bukti sesudahnya tidak bisa dikirim lagi.
        vm.prank(jastiper);
        vm.expectRevert("JEJAK: status bukan ACCEPTED");
        escrow.submitProof(id, PROOF_HASH);
    }

    // ═══════════════════════════════════════════════════════════════════
    // D-06 — Sengketa SEBELUM modal cair: arbiter membagi seluruh T
    // ═══════════════════════════════════════════════════════════════════
    function test_D06_disputeBeforeCapital_arbiterSplits() public {
        uint256 id = _createOrder();
        _accept(id, jastiper);
        _proof(id, jastiper);

        vm.prank(buyer);
        escrow.raiseDispute(id);
        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.DISPUTED));

        // Belum ada modal yang cair, jadi sisa dana = seluruh order.
        assertEq(escrow.remainingWei(id), TOTAL);

        // Pembagian yang tidak sama dengan sisa ditolak — INV-1 & INV-4.
        vm.prank(arbiter);
        vm.expectRevert("JEJAK: pembagian tidak sama dengan sisa");
        escrow.resolveDispute(id, TOTAL, 1, REASON_HASH);

        uint128 kePembeli = CAP;
        uint128 keJastiper = FEE;

        vm.prank(arbiter);
        escrow.resolveDispute(id, kePembeli, keJastiper, REASON_HASH);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.RESOLVED));
        assertEq(escrow.pendingWithdrawals(buyer), kePembeli);
        assertEq(escrow.pendingWithdrawals(jastiper), keJastiper);
        assertEq(escrow.remainingWei(id), 0);

        // Order yang diputus arbiter TIDAK menambah rekam jejak tuntas.
        assertEq(escrow.completedCount(jastiper), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // D-07 — Verifier mati / AI macet > 24 jam: siapa pun mengeskalasi
    // ═══════════════════════════════════════════════════════════════════
    function test_D07_verifierStale_escalatesToArbiter() public {
        uint256 id = _createOrder();
        _accept(id, jastiper);
        _proof(id, jastiper);

        vm.expectRevert("JEJAK: verifikasi belum basi");
        escrow.escalateStaleVerification(id);

        vm.warp(block.timestamp + escrow.VERIFY_WINDOW() + 1);

        // Setelah basi, verifier kehilangan haknya memutus sendiri.
        vm.prank(verifier);
        vm.expectRevert("JEJAK: lewat batas verifikasi");
        escrow.releaseCapital(id, 0.01 ether);

        // Jalur satu-satunya terbuka untuk siapa saja — order tidak macet.
        vm.expectEmit(true, true, false, true);
        emit JejakEscrow.DisputeRaised(id, stranger, 2);
        vm.prank(stranger);
        escrow.escalateStaleVerification(id);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.DISPUTED));
        assertEq(escrow.remainingWei(id), TOTAL);

        vm.prank(arbiter);
        escrow.resolveDispute(id, TOTAL, 0, REASON_HASH);
        assertEq(escrow.pendingWithdrawals(buyer), TOTAL);
        assertEq(escrow.remainingWei(id), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // D-08 — Jastiper banding atas hasil baca AI
    // ═══════════════════════════════════════════════════════════════════
    function test_D08_jastiperAppeal_escalatesToArbiter() public {
        uint256 id = _createOrder();
        _accept(id, jastiper);
        _proof(id, jastiper);

        // Hanya jastiper yang boleh banding di jalur ini.
        vm.prank(stranger);
        vm.expectRevert("JEJAK: bukan jastiper");
        escrow.raiseVerificationAppeal(id);

        vm.expectEmit(true, true, false, true);
        emit JejakEscrow.DisputeRaised(id, jastiper, 0);
        vm.prank(jastiper);
        escrow.raiseVerificationAppeal(id);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.DISPUTED));

        // Setelah banding, verifier tidak bisa lagi mencairkan diam-diam.
        vm.prank(verifier);
        vm.expectRevert("JEJAK: status bukan PROOFED");
        escrow.releaseCapital(id, 0.02 ether);

        // Arbiter memihak jastiper sepenuhnya.
        vm.prank(arbiter);
        escrow.resolveDispute(id, 0, TOTAL, REASON_HASH);
        assertEq(escrow.pendingWithdrawals(jastiper), TOTAL);
        assertEq(escrow.remainingWei(id), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // D-09 — Sengketa SETELAH modal cair: hanya sisa (F + C−V) yang disengketakan
    // ═══════════════════════════════════════════════════════════════════
    function test_D09_disputeAfterCapital_onlyFeeContested() public {
        uint128 verified = 0.03 ether;
        uint256 id = _runToCapitalPaid(verified);

        // Modal yang sudah cair TIDAK bisa ditarik kembali — ini lubang yang
        // kami sebut sendiri di §8.5, dan tes ini yang membuktikannya nyata.
        uint256 sisa = escrow.remainingWei(id);
        assertEq(sisa, uint256(TOTAL) - verified, "sisa = F + (C - V)");

        // Jastiper tidak boleh menyengketakan setelah modalnya cair.
        vm.prank(jastiper);
        vm.expectRevert("JEJAK: hanya pembeli setelah modal cair");
        escrow.raiseDispute(id);

        vm.prank(buyer);
        escrow.raiseDispute(id);
        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.DISPUTED));

        // Arbiter tidak bisa mengembalikan modal yang sudah berpindah:
        // meminta lebih dari sisa akan ditolak kontrak, bukan ditolak kebijakan.
        vm.prank(arbiter);
        vm.expectRevert("JEJAK: pembagian tidak sama dengan sisa");
        escrow.resolveDispute(id, TOTAL, 0, REASON_HASH);

        vm.prank(arbiter);
        escrow.resolveDispute(id, uint128(sisa), 0, REASON_HASH);

        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.RESOLVED));
        assertEq(escrow.pendingWithdrawals(buyer), sisa);
        assertEq(escrow.pendingWithdrawals(jastiper), verified, "modal tetap di tangan jastiper");
        assertEq(
            escrow.pendingWithdrawals(buyer) + escrow.pendingWithdrawals(jastiper), TOTAL, "INV-1"
        );
        assertEq(escrow.remainingWei(id), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Masa sanggah sebagai batas keras
    // ═══════════════════════════════════════════════════════════════════
    function test_D09_cannotDisputeAfterDisputeWindowClosed() public {
        uint256 id = _runToCapitalPaid(0.02 ether);

        vm.warp(block.timestamp + escrow.DISPUTE_WINDOW());

        vm.prank(buyer);
        vm.expectRevert("JEJAK: masa sanggah sudah lewat");
        escrow.raiseDispute(id);
    }
}
