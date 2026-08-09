// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseTest} from "./Base.t.sol";
import {JejakEscrow} from "../src/JejakEscrow.sol";

/**
 * @notice Kontrak penyerang untuk `test_withdrawIsReentrancySafe`.
 *         Saat menerima BNB dari `withdraw()`, dia langsung memanggil
 *         `withdraw()` lagi. Kalau kontrak kami lengah, dia akan menguras
 *         seluruh saldo escrow — bukan hanya haknya sendiri.
 */
contract ReentrantWithdrawer {
    JejakEscrow public immutable escrow;

    bool public reentryAttempted;
    bool public reentryReverted;
    uint256 public received;

    constructor(JejakEscrow escrow_) {
        escrow = escrow_;
    }

    function acceptOrder(uint256 orderId) external {
        escrow.acceptOrder(orderId);
    }

    function submitProof(uint256 orderId, bytes32 proofHash) external {
        escrow.submitProof(orderId, proofHash);
    }

    function attack() external {
        escrow.withdraw();
    }

    receive() external payable {
        received += msg.value;

        if (!reentryAttempted) {
            reentryAttempted = true;
            // Ditangkap sendiri supaya panggilan luar tetap selesai dan tesnya
            // bisa memeriksa berapa yang benar-benar berhasil ditarik.
            try escrow.withdraw() {
                reentryReverted = false;
            } catch {
                reentryReverted = true;
            }
        }
    }
}

/**
 * @title  AccessControlTest
 * @notice Delapan kasus §15. Yang paling sering ditunjukkan ke juri adalah
 *         `test_ownerCannotTouchFunds` — karena seluruh tesis produk ini
 *         bergantung pada pernyataan "reputasi dan dana kalian tidak kami
 *         pegang", dan pernyataan itu harus bisa dibuktikan kode, bukan
 *         dibuktikan janji.
 */
contract AccessControlTest is BaseTest {
    // ═══════════════════════════════════════════════════════════════════
    function test_onlyVerifierCanReleaseCapital() public {
        uint256 id = _createOrder();
        _accept(id, jastiper);
        _proof(id, jastiper);

        address[4] memory penyusup = [owner, arbiter, buyer, jastiper];
        for (uint256 i = 0; i < penyusup.length; i++) {
            vm.prank(penyusup[i]);
            vm.expectRevert("JEJAK: bukan verifier");
            escrow.releaseCapital(id, 0.01 ether);
        }

        _release(id, 0.01 ether);
        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.CAPITAL_PAID));
    }

    // ═══════════════════════════════════════════════════════════════════
    function test_onlyArbiterCanResolve() public {
        uint256 id = _createOrder();
        _accept(id, jastiper);
        _proof(id, jastiper);
        vm.prank(buyer);
        escrow.raiseDispute(id);

        address[4] memory penyusup = [owner, verifier, buyer, jastiper];
        for (uint256 i = 0; i < penyusup.length; i++) {
            vm.prank(penyusup[i]);
            vm.expectRevert("JEJAK: bukan arbiter");
            escrow.resolveDispute(id, CAP, FEE, REASON_HASH);
        }

        vm.prank(arbiter);
        escrow.resolveDispute(id, CAP, FEE, REASON_HASH);
        assertEq(uint8(_status(id)), uint8(JejakEscrow.Status.RESOLVED));
    }

    // ═══════════════════════════════════════════════════════════════════
    // Tes yang ditunjukkan ke juri.
    // ═══════════════════════════════════════════════════════════════════
    function test_ownerCannotTouchFunds() public {
        uint256 id = _runToCapitalPaid(0.03 ether);
        uint256 saldoEscrow = address(escrow).balance;

        // Yang BOLEH dilakukan owner: mengganti dua alamat peran. Itu saja.
        address verifierBaru = makeAddr("verifier-baru");
        vm.prank(owner);
        escrow.setVerifier(verifierBaru);
        assertEq(escrow.verifier(), verifierBaru);

        vm.prank(owner);
        escrow.setArbiter(makeAddr("arbiter-baru"));

        // Yang TIDAK bisa dilakukan owner — semuanya ditolak kontrak:
        vm.startPrank(owner);

        vm.expectRevert("JEJAK: bukan verifier");
        escrow.releaseCapital(id, 0.03 ether);

        vm.expectRevert("JEJAK: bukan arbiter");
        escrow.resolveDispute(id, 0, 0, REASON_HASH);

        vm.expectRevert("JEJAK: bukan pembeli");
        escrow.confirmReceipt(id);

        vm.expectRevert("JEJAK: status bukan CREATED");
        escrow.cancelByBuyer(id);

        vm.expectRevert("JEJAK: tidak ada dana");
        escrow.withdraw();

        vm.stopPrank();

        // Saldo kontrak tidak bergeser satu wei pun.
        assertEq(address(escrow).balance, saldoEscrow, "owner berhasil menggeser dana");
        assertEq(escrow.pendingWithdrawals(owner), 0);

        // Dan owner tidak bisa mencairkan dengan cara memasang dirinya sebagai
        // verifier, karena batas plafon tetap berlaku untuk siapa pun.
        vm.prank(owner);
        escrow.setVerifier(owner);
        vm.prank(owner);
        vm.expectRevert("JEJAK: status bukan PROOFED");
        escrow.releaseCapital(id, CAP);
    }

    // ═══════════════════════════════════════════════════════════════════
    // M-07 — anti-replay dijaga state, bukan flag terpisah
    // ═══════════════════════════════════════════════════════════════════
    function test_cannotReleaseCapitalTwice() public {
        uint256 id = _createOrder();
        _accept(id, jastiper);
        _proof(id, jastiper);

        _release(id, 0.02 ether);
        assertEq(escrow.pendingWithdrawals(jastiper), 0.02 ether);

        vm.prank(verifier);
        vm.expectRevert("JEJAK: status bukan PROOFED");
        escrow.releaseCapital(id, 0.02 ether);

        assertEq(escrow.pendingWithdrawals(jastiper), 0.02 ether, "modal cair dua kali");
    }

    // ═══════════════════════════════════════════════════════════════════
    // KD-04 / F-26 — reputasi sebagai plafon kredit, dipaksa kontrak
    // ═══════════════════════════════════════════════════════════════════
    function test_cannotAcceptAboveTierCap() public {
        // Jastiper baru: plafon 0,05 tBNB.
        assertEq(escrow.tierOf(jastiper), 0);
        assertEq(escrow.tierCap(jastiper), 0.05 ether);

        uint256 terlaluBesar = _createOrder(buyer, 0.1 ether, 0.01 ether);
        vm.prank(jastiper);
        vm.expectRevert("JEJAK: melebihi plafon tier");
        escrow.acceptOrder(terlaluBesar);

        // Tepat di batas: diterima.
        uint256 pasBatas = _createOrder(buyer, 0.045 ether, 0.005 ether);
        _accept(pasBatas, jastiper);
        assertEq(uint8(_status(pasBatas)), uint8(JejakEscrow.Status.ACCEPTED));

        // Naik tier lewat rekam jejak, bukan lewat izin siapa pun.
        _promote(jastiper, 3);
        assertEq(escrow.tierOf(jastiper), 1);
        assertEq(escrow.tierCap(jastiper), 0.2 ether);

        uint256 sekarangBoleh = _createOrder(buyer, 0.15 ether, 0.02 ether);
        _accept(sekarangBoleh, jastiper);
        assertEq(uint8(_status(sekarangBoleh)), uint8(JejakEscrow.Status.ACCEPTED));

        // Tapi tetap tidak boleh melompat ke plafon tier di atasnya.
        uint256 masihTerlaluBesar = _createOrder(buyer, 0.5 ether, 0.05 ether);
        vm.prank(jastiper);
        vm.expectRevert("JEJAK: melebihi plafon tier");
        escrow.acceptOrder(masihTerlaluBesar);
    }

    function test_tierLaddersMatchMasterplan() public {
        address j = makeAddr("pendaki");
        assertEq(escrow.tierCap(j), 0.05 ether);
        _promote(j, 3);
        assertEq(escrow.tierCap(j), 0.20 ether);
        _promote(j, 7); // total 10
        assertEq(escrow.tierCap(j), 1.00 ether);
        _promote(j, 20); // total 30
        assertEq(escrow.tierCap(j), 10.00 ether);
        assertEq(escrow.tierOf(j), 3);
    }

    // ═══════════════════════════════════════════════════════════════════
    function test_cannotDisputeAfterFinalState() public {
        uint256 id = _runToCapitalPaid(0.03 ether);
        vm.prank(buyer);
        escrow.confirmReceipt(id);

        vm.prank(buyer);
        vm.expectRevert("JEJAK: status tidak bisa disengketakan");
        escrow.raiseDispute(id);

        vm.prank(jastiper);
        vm.expectRevert("JEJAK: status bukan PROOFED");
        escrow.raiseVerificationAppeal(id);

        vm.expectRevert("JEJAK: status bukan PROOFED");
        escrow.escalateStaleVerification(id);

        vm.expectRevert("JEJAK: status bukan CAPITAL_PAID");
        escrow.autoReleaseFee(id);

        vm.expectRevert("JEJAK: status bukan ACCEPTED");
        escrow.abandonByTimeout(id);
    }

    // ═══════════════════════════════════════════════════════════════════
    // C-02 + C-04 — pull payment + ReentrancyGuard
    // ═══════════════════════════════════════════════════════════════════
    function test_withdrawIsReentrancySafe() public {
        ReentrantWithdrawer penyerang = new ReentrantWithdrawer(escrow);

        // Order lain milik pihak lain — inilah yang mau dikuras penyerang.
        uint256 lain = _createOrder();

        uint256 id = _createOrder();
        penyerang.acceptOrder(id);
        penyerang.submitProof(id, PROOF_HASH);
        _release(id, 0.03 ether);
        vm.prank(buyer);
        escrow.confirmReceipt(id);

        uint256 hak = escrow.pendingWithdrawals(address(penyerang));
        assertEq(hak, 0.03 ether + FEE);

        uint256 saldoSebelum = address(escrow).balance;

        penyerang.attack();

        assertTrue(penyerang.reentryAttempted(), "penyerang tidak sempat mencoba masuk lagi");
        assertTrue(penyerang.reentryReverted(), "panggilan ulang TIDAK ditolak: reentrancy terbuka");
        assertEq(penyerang.received(), hak, "penyerang menarik lebih dari haknya");
        assertEq(escrow.pendingWithdrawals(address(penyerang)), 0);
        assertEq(address(escrow).balance, saldoSebelum - hak, "saldo escrow bocor");

        // Dana order pihak lain tetap utuh.
        assertEq(escrow.remainingWei(lain), TOTAL);
    }

    // ═══════════════════════════════════════════════════════════════════
    // P6 — membuktikan dana tidak disandera JEJAK
    // ═══════════════════════════════════════════════════════════════════
    function test_strangerCanCallPermissionlessExpiry() public {
        // 1. Kedaluwarsa tanpa jastiper.
        uint256 a = _createOrder();
        vm.warp(escrow.getOrder(a).acceptDeadline);
        vm.prank(stranger);
        escrow.expireUnaccepted(a);
        assertEq(escrow.pendingWithdrawals(buyer), TOTAL);

        // 2. Jastiper kabur.
        uint256 b = _createOrder();
        _accept(b, jastiper);
        vm.warp(block.timestamp + escrow.PROOF_WINDOW() + 1);
        vm.prank(stranger);
        escrow.abandonByTimeout(b);

        // 3. Verifier mati.
        uint256 c = _createOrder();
        _accept(c, jastiper);
        _proof(c, jastiper);
        vm.warp(block.timestamp + escrow.VERIFY_WINDOW() + 1);
        vm.prank(stranger);
        escrow.escalateStaleVerification(c);
        assertEq(uint8(_status(c)), uint8(JejakEscrow.Status.DISPUTED));

        // 4. Fee otomatis cair.
        uint256 d = _runToCapitalPaid(0.03 ether);
        vm.warp(block.timestamp + escrow.DISPUTE_WINDOW());
        vm.prank(stranger);
        escrow.autoReleaseFee(d);
        assertEq(uint8(_status(d)), uint8(JejakEscrow.Status.COMPLETED));

        // Orang asing itu sendiri tidak mendapat apa pun dari semuanya.
        assertEq(escrow.pendingWithdrawals(stranger), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Penjaga masukan `createOrder`
    // ═══════════════════════════════════════════════════════════════════
    function test_createOrderRejectsBadInput() public {
        uint64 dl = uint64(block.timestamp + 1 days);

        vm.startPrank(buyer);

        vm.expectRevert("JEJAK: capWei nol");
        escrow.createOrder{value: FEE}(0, FEE, ITEM_HASH, dl, IDR_PER_BNB);

        vm.expectRevert("JEJAK: feeWei nol");
        escrow.createOrder{value: CAP}(CAP, 0, ITEM_HASH, dl, IDR_PER_BNB);

        vm.expectRevert("JEJAK: itemHash nol");
        escrow.createOrder{value: TOTAL}(CAP, FEE, bytes32(0), dl, IDR_PER_BNB);

        vm.expectRevert("JEJAK: nilai kiriman tidak cocok");
        escrow.createOrder{value: TOTAL - 1}(CAP, FEE, ITEM_HASH, dl, IDR_PER_BNB);

        vm.expectRevert("JEJAK: deadline sudah lewat");
        escrow.createOrder{value: TOTAL}(CAP, FEE, ITEM_HASH, uint64(block.timestamp), IDR_PER_BNB);

        vm.expectRevert("JEJAK: deadline terlalu jauh");
        escrow.createOrder{value: TOTAL}(
            CAP, FEE, ITEM_HASH, uint64(block.timestamp + 31 days), IDR_PER_BNB
        );

        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert("JEJAK: order tidak ada");
        escrow.cancelByBuyer(999);
    }

    function test_buyerCannotBeOwnJastiper() public {
        uint256 id = _createOrder();
        vm.prank(buyer);
        vm.expectRevert("JEJAK: pembeli tidak boleh jadi jastiper");
        escrow.acceptOrder(id);
    }

    function test_onlyOwnerCanRotateRoles() public {
        vm.prank(stranger);
        vm.expectRevert("JEJAK: bukan owner");
        escrow.setVerifier(stranger);

        vm.prank(stranger);
        vm.expectRevert("JEJAK: bukan owner");
        escrow.setArbiter(stranger);

        vm.prank(owner);
        vm.expectRevert("JEJAK: verifier nol");
        escrow.setVerifier(address(0));
    }
}
