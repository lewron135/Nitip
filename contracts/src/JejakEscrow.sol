// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  JejakEscrow
 * @notice Escrow untuk transaksi jastip (jasa titip) yang, sebagai hasil
 *         sampingannya, memproduksi rekam jejak jastiper dari event publik.
 *
 * @dev    Peta ke MASTERPLAN v3.0 (docs/MASTERPLAN-JEJAK.md):
 *           §12.1 aturan tidak bisa ditawar (C-01…C-08)
 *           §12.2 struktur penyimpanan
 *           §12.3 sembilan jalur dana (D-01…D-09) + lima invarian
 *           §12.4 antarmuka fungsi
 *           §12.5 skema event  ← KONTRAK ANTARMUKA dengan indexer & frontend
 *           §11.3 state machine
 *           §11.4 plafon order berbasis rekam jejak (KD-04)
 *           §11.5 kuasa arbiter dibatasi (KD-05)
 *
 *         PRINSIP YANG DIPAKSA DI KODE INI, bukan dijanjikan di slide:
 *
 *         1. `owner` TIDAK PUNYA KUASA ATAS DANA. Satu-satunya yang bisa dia
 *            lakukan adalah mengganti alamat verifier dan arbiter. Tidak ada
 *            fungsi penarikan darurat, tidak ada jeda, tidak ada selfdestruct,
 *            tidak ada proxy. Ini disengaja dan diuji di
 *            test/AccessControl.t.sol:test_ownerCannotTouchFunds.
 *
 *         2. AI (verifier) HANYA BISA MENAHAN, TIDAK PERNAH MELONGGARKAN
 *            (prinsip P2). `releaseCapital` menolak nominal di atas plafon
 *            yang ditetapkan pembeli — berapa pun yang dikirim backend.
 *            Kalau backend dibajak seluruhnya, kerugian maksimum tetap
 *            `capWei`. Dibuktikan tes fuzz, bukan janji.
 *
 *         3. DANA TIDAK BERGANTUNG PADA JEJAK MASIH HIDUP (prinsip P6).
 *            `expireUnaccepted`, `abandonByTimeout`, `escalateStaleVerification`,
 *            `autoReleaseFee`, dan `withdraw` sengaja TANPA IZIN — siapa pun
 *            boleh memanggilnya. Kalau hanya kami yang bisa, kami bisa
 *            menyandera dana dengan cara diam.
 *
 *         4. POLA PULL PAYMENT (C-02). Kontrak tidak pernah mengirim BNB
 *            di tengah alur; dana dikreditkan ke `pendingWithdrawals` dan
 *            penerimanya menarik sendiri. Ini menghapus seluruh kelas bug
 *            reentrancy dan kegagalan `transfer` ke kontrak.
 *
 * @custom:security-contact keegan1168@gmail.com
 */
contract JejakEscrow is ReentrancyGuard {
    // ═══════════════════════════════════════════════════════════════════
    //                              TIPE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice State machine §11.3. Setiap order wajib berada di tepat satu
    ///         state. State final tidak punya transisi keluar.
    enum Status {
        CREATED, //       0  dana terkunci, menunggu jastiper
        ACCEPTED, //      1  jastiper mengambil order
        PROOFED, //       2  bukti dikirim, menunggu verifikasi AI
        CAPITAL_PAID, //  3  modal cair, fee masih tertahan
        DISPUTED, //      4  beku, menunggu arbiter
        COMPLETED, //     5  final — jalur normal
        REFUNDED, //      6  final — batal / kedaluwarsa
        ABANDONED, //     7  final — jastiper kabur
        RESOLVED //       8  final — diputus arbiter
    }

    /// @notice §12.2. Urutan field sengaja dipertahankan persis seperti
    ///         masterplan supaya dokumen dan kode bisa dibaca berdampingan.
    struct Order {
        address buyer;
        address jastiper;
        uint128 capWei; //            plafon modal yang boleh dicairkan
        uint128 feeWei; //            fee jastiper, disepakati di depan
        uint128 verifiedWei; //       hasil baca AI; 0 sebelum verifikasi
        uint64 createdAt;
        uint64 acceptDeadline; //     CREATED kedaluwarsa setelah ini
        uint64 proofDeadline; //      diisi saat acceptOrder  = now + 7 hari
        uint64 verifyDeadline; //     diisi saat submitProof   = now + 24 jam
        uint64 disputeWindowEnd; //   diisi saat releaseCapital = now + 72 jam
        Status status;
        bytes32 itemHash; //          keccak256 deskripsi barang
        bytes32 proofHash; //         keccak256 berkas bukti (struk + foto)
        uint256 idrPerBnbSnapshot; // AUDIT SAJA — tidak pernah dipakai matematika
    }

    // ═══════════════════════════════════════════════════════════════════
    //                            KONSTANTA
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Jastiper punya 7 hari untuk mengirim bukti setelah menerima
    ///         order. Lewat itu siapa pun boleh menarik dana pembeli (D-05).
    uint64 public constant PROOF_WINDOW = 7 days;

    /// @notice Verifier punya 24 jam untuk membaca bukti. Lewat itu order
    ///         tidak macet: siapa pun boleh mengeskalasinya ke arbiter (D-07).
    uint64 public constant VERIFY_WINDOW = 24 hours;

    /// @notice Masa sanggah pembeli setelah modal cair. Lewat itu fee cair
    ///         otomatis dan siapa pun boleh memicunya (D-02).
    uint64 public constant DISPUTE_WINDOW = 72 hours;

    /// @notice Batas atas `acceptDeadline` supaya dana pembeli tidak bisa
    ///         terkunci bertahun-tahun karena salah ketik.
    uint64 public constant MAX_ACCEPT_WINDOW = 30 days;

    /// @notice Plafon nilai order per tier (§6.7 / KD-04). Reputasi di sini
    ///         BUKAN lencana — ia adalah plafon kredit, dipaksa kontrak.
    uint256 public constant TIER0_CAP = 0.05 ether; // baru       (completed == 0)
    uint256 public constant TIER1_CAP = 0.20 ether; // pemula     (completed >= 3)
    uint256 public constant TIER2_CAP = 1.00 ether; // mapan      (completed >= 10)
    uint256 public constant TIER3_CAP = 10.00 ether; // terpercaya (completed >= 30)

    uint32 public constant TIER1_MIN = 3;
    uint32 public constant TIER2_MIN = 10;
    uint32 public constant TIER3_MIN = 30;

    // ═══════════════════════════════════════════════════════════════════
    //                          PENYIMPANAN
    // ═══════════════════════════════════════════════════════════════════

    mapping(uint256 => Order) public orders;

    /// @notice Pola pull payment (C-02). Semua pembayaran singgah di sini.
    mapping(address => uint256) public pendingWithdrawals;

    /// @notice PENGHITUNG MENTAH, bukan skor (prinsip P4). Skor JEJAK-TRUST
    ///         tetap dihitung ulang dari event oleh siapa pun (§13); yang
    ///         on-chain hanya angka yang dibutuhkan kontrak untuk plafon.
    mapping(address => uint32) public completedCount;
    mapping(address => uint32) public abandonedCount;

    uint256 public nextOrderId;

    /// @notice Backend AI. Satu-satunya yang boleh memanggil `releaseCapital`,
    ///         dan bahkan dia dibatasi keras oleh `capWei`.
    address public verifier;

    /// @notice Arbiter manusia. Hanya bisa membagi sisa dana order yang
    ///         sedang berstatus DISPUTED. Tidak bisa menyentuh order lain,
    ///         tidak bisa mengubah pihak, tidak bisa menaikkan plafon (KD-05).
    address public arbiter;

    /// @notice PEMILIK KONTRAK TIDAK PUNYA KUASA ATAS DANA. Dia hanya bisa
    ///         mengganti alamat `verifier` dan `arbiter`. Tidak ada fungsi
    ///         di kontrak ini yang memungkinkan owner memindahkan satu wei
    ///         pun. Ini keputusan desain, bukan kelalaian — dan diuji.
    address public owner;

    // ═══════════════════════════════════════════════════════════════════
    //                             EVENT  (§12.5)
    //     Ini kontrak antarmuka antara kontrak, indexer, dan frontend.
    //     Setiap perubahan di sini WAJIB diumumkan ke grup hari itu juga.
    // ═══════════════════════════════════════════════════════════════════

    event OrderCreated(
        uint256 indexed orderId,
        address indexed buyer,
        uint128 capWei,
        uint128 feeWei,
        bytes32 itemHash,
        uint64 acceptDeadline,
        uint256 idrPerBnbSnapshot
    );

    event OrderAccepted(
        uint256 indexed orderId, address indexed jastiper, uint64 acceptedAt, uint64 proofDeadline
    );

    event ProofSubmitted(
        uint256 indexed orderId, address indexed jastiper, bytes32 proofHash, uint64 verifyDeadline
    );

    event CapitalReleased(
        uint256 indexed orderId,
        address indexed jastiper,
        uint128 verifiedWei,
        uint128 capWei,
        uint64 disputeWindowEnd
    );

    event OrderCompleted(
        uint256 indexed orderId,
        address indexed jastiper,
        address indexed buyer,
        uint128 totalWei,
        uint64 completedAt,
        bool autoReleased
    );

    /// @param reason 0 = dibatalkan pembeli (D-03) · 1 = kedaluwarsa (D-04)
    event OrderRefunded(uint256 indexed orderId, address indexed buyer, uint128 amountWei, uint8 reason);

    event OrderAbandoned(
        uint256 indexed orderId, address indexed jastiper, address indexed buyer, uint128 refundWei
    );

    /// @param stage 0 = sebelum modal cair · 1 = setelah modal cair
    ///              2 = eskalasi karena verifier macet
    event DisputeRaised(uint256 indexed orderId, address indexed raisedBy, uint8 stage);

    event DisputeResolved(
        uint256 indexed orderId,
        address indexed arbiter,
        uint128 buyerWei,
        uint128 jastiperWei,
        bytes32 reasonHash
    );

    event Withdrawal(address indexed who, uint256 amountWei);

    event VerifierChanged(address indexed previous, address indexed current);
    event ArbiterChanged(address indexed previous, address indexed current);

    // ═══════════════════════════════════════════════════════════════════
    //                            PEMBATAS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "JEJAK: bukan owner");
        _;
    }

    modifier onlyVerifier() {
        require(msg.sender == verifier, "JEJAK: bukan verifier");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "JEJAK: bukan arbiter");
        _;
    }

    /// @dev Menjaga agar tidak ada fungsi yang menyentuh order yang belum ada.
    modifier orderExists(uint256 orderId) {
        require(orderId < nextOrderId, "JEJAK: order tidak ada");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════

    constructor(address verifier_, address arbiter_) {
        require(verifier_ != address(0), "JEJAK: verifier nol");
        require(arbiter_ != address(0), "JEJAK: arbiter nol");
        owner = msg.sender;
        verifier = verifier_;
        arbiter = arbiter_;
        emit VerifierChanged(address(0), verifier_);
        emit ArbiterChanged(address(0), arbiter_);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                             PEMBELI
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Membuat order jastip dan mengunci `capWei + feeWei` di kontrak.
     * @dev    Satuan SELALU wei (KD-01). Rupiah dan Yen hanya lapisan tampilan
     *         di frontend; kontrak tidak pernah melakukan konversi apa pun.
     * @param capWei             plafon modal — batas keras yang tidak bisa
     *                           dilampaui AI, berapa pun hasil bacaannya.
     * @param feeWei             fee jastiper, eksplisit di depan (§6.6).
     * @param itemHash           keccak256 deskripsi barang.
     * @param acceptDeadline     timestamp; setelah ini order kedaluwarsa.
     * @param idrPerBnbSnapshot  kurs saat order dibuat. CATATAN AUDIT SAJA —
     *                           tidak pernah masuk aritmetika kontrak (KD-02).
     */
    function createOrder(
        uint128 capWei,
        uint128 feeWei,
        bytes32 itemHash,
        uint64 acceptDeadline,
        uint256 idrPerBnbSnapshot
    ) external payable returns (uint256 orderId) {
        require(capWei > 0, "JEJAK: capWei nol");
        require(feeWei > 0, "JEJAK: feeWei nol");
        require(itemHash != bytes32(0), "JEJAK: itemHash nol");
        require(msg.value == uint256(capWei) + uint256(feeWei), "JEJAK: nilai kiriman tidak cocok");
        require(acceptDeadline > block.timestamp, "JEJAK: deadline sudah lewat");
        require(
            acceptDeadline <= block.timestamp + MAX_ACCEPT_WINDOW, "JEJAK: deadline terlalu jauh"
        );

        orderId = nextOrderId++;

        Order storage o = orders[orderId];
        o.buyer = msg.sender;
        o.capWei = capWei;
        o.feeWei = feeWei;
        o.createdAt = uint64(block.timestamp);
        o.acceptDeadline = acceptDeadline;
        o.status = Status.CREATED;
        o.itemHash = itemHash;
        o.idrPerBnbSnapshot = idrPerBnbSnapshot;

        emit OrderCreated(orderId, msg.sender, capWei, feeWei, itemHash, acceptDeadline, idrPerBnbSnapshot);
    }

    /// @notice D-03 — pembeli membatalkan selama belum ada jastiper yang ambil.
    ///         Refund penuh, tanpa potongan.
    function cancelByBuyer(uint256 orderId) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(o.status == Status.CREATED, "JEJAK: status bukan CREATED");
        require(msg.sender == o.buyer, "JEJAK: bukan pembeli");

        uint128 total = _totalWei(o);
        o.status = Status.REFUNDED;
        _credit(o.buyer, total);

        emit OrderRefunded(orderId, o.buyer, total, 0);
    }

    /// @notice D-01 — pembeli mengonfirmasi barang diterima. Fee cair,
    ///         sisa plafon yang tidak terpakai kembali ke pembeli.
    function confirmReceipt(uint256 orderId) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(o.status == Status.CAPITAL_PAID, "JEJAK: status bukan CAPITAL_PAID");
        require(msg.sender == o.buyer, "JEJAK: bukan pembeli");
        _completeOrder(orderId, o, false);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                            JASTIPER
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Jastiper mengambil order.
     * @dev    KD-04 / F-26 — inilah tempat reputasi berhenti jadi hiasan dan
     *         menjadi plafon kredit. Nilai order tidak boleh melebihi plafon
     *         tier jastiper, dan tier itu diturunkan dari penghitung mentah
     *         on-chain, bukan dari klaim siapa pun.
     */
    function acceptOrder(uint256 orderId) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(o.status == Status.CREATED, "JEJAK: status bukan CREATED");
        require(block.timestamp < o.acceptDeadline, "JEJAK: order kedaluwarsa");
        require(msg.sender != o.buyer, "JEJAK: pembeli tidak boleh jadi jastiper");
        require(uint256(_totalWei(o)) <= tierCap(msg.sender), "JEJAK: melebihi plafon tier");

        o.jastiper = msg.sender;
        o.status = Status.ACCEPTED;
        o.proofDeadline = uint64(block.timestamp) + PROOF_WINDOW;

        emit OrderAccepted(orderId, msg.sender, uint64(block.timestamp), o.proofDeadline);
    }

    /**
     * @notice Jastiper mengirim hash bukti (foto struk + foto barang).
     * @dev    Yang on-chain hanya hash (prinsip P4 / N-02). Berkasnya di IPFS
     *         atau disk (§11.7). Hash yang tercatat membuat tidak ada pihak
     *         yang bisa menyodorkan foto berbeda belakangan dan mengaku itu
     *         bukti aslinya.
     */
    function submitProof(uint256 orderId, bytes32 proofHash) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(o.status == Status.ACCEPTED, "JEJAK: status bukan ACCEPTED");
        require(msg.sender == o.jastiper, "JEJAK: bukan jastiper");
        require(block.timestamp <= o.proofDeadline, "JEJAK: lewat batas kirim bukti");
        require(proofHash != bytes32(0), "JEJAK: proofHash nol");

        o.proofHash = proofHash;
        o.status = Status.PROOFED;
        o.verifyDeadline = uint64(block.timestamp) + VERIFY_WINDOW;

        emit ProofSubmitted(orderId, msg.sender, proofHash, o.verifyDeadline);
    }

    /**
     * @notice D-08 — jastiper tidak setuju dengan hasil baca AI dan minta
     *         kasusnya diputus manusia.
     * @dev    Dipanggil di state PROOFED, yaitu SEBELUM `releaseCapital`.
     *         Backend menampilkan hasil bacaan AI ke jastiper lebih dulu;
     *         kalau dia keberatan, dia menutup jalur otomatis di sini
     *         sehingga uang tidak berpindah berdasarkan angka yang dia
     *         anggap salah. Ini konsekuensi prinsip P2.
     */
    function raiseVerificationAppeal(uint256 orderId) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(o.status == Status.PROOFED, "JEJAK: status bukan PROOFED");
        require(msg.sender == o.jastiper, "JEJAK: bukan jastiper");

        o.status = Status.DISPUTED;
        emit DisputeRaised(orderId, msg.sender, 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     VERIFIER  (backend AI)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Mencairkan MODAL sebesar nominal yang dibaca AI dari struk.
     *
     * @dev    BARIS TERPENTING DI SELURUH REPO ADA DI SINI:
     *
     *             require(verifiedWei <= o.capWei, ...)
     *
     *         Itu satu-satunya alasan kami berani mengucapkan kalimat ini di
     *         panggung: "kalau backend AI kami dibajak seluruhnya dan penyerang
     *         memanggil fungsi ini dengan angka berapa pun, kerugian maksimum
     *         tetap plafon yang ditetapkan pembeli."
     *
     *         Anti-replay (M-07): dijaga oleh state, bukan oleh flag terpisah.
     *         Setelah panggilan pertama status menjadi CAPITAL_PAID, sehingga
     *         panggilan kedua gagal di baris pertama.
     *
     *         Batas waktu: setelah `verifyDeadline` lewat, verifier tidak lagi
     *         boleh memutuskan sendiri. Jalur satu-satunya adalah eskalasi ke
     *         arbiter lewat `escalateStaleVerification` yang terbuka untuk
     *         siapa saja. Verifier yang lambat tidak boleh menyandera order.
     */
    function releaseCapital(uint256 orderId, uint128 verifiedWei)
        external
        onlyVerifier
        orderExists(orderId)
    {
        Order storage o = orders[orderId];
        require(o.status == Status.PROOFED, "JEJAK: status bukan PROOFED");
        require(block.timestamp <= o.verifyDeadline, "JEJAK: lewat batas verifikasi");
        require(verifiedWei > 0, "JEJAK: verifiedWei nol");
        require(verifiedWei <= o.capWei, "JEJAK: melebihi plafon");

        o.verifiedWei = verifiedWei;
        o.status = Status.CAPITAL_PAID;
        o.disputeWindowEnd = uint64(block.timestamp) + DISPUTE_WINDOW;

        _credit(o.jastiper, verifiedWei);

        emit CapitalReleased(orderId, o.jastiper, verifiedWei, o.capWei, o.disputeWindowEnd);
    }

    // ═══════════════════════════════════════════════════════════════════
    //          TANPA IZIN — sengaja terbuka untuk siapa saja (P6)
    //
    //   Kalau hanya JEJAK yang bisa memanggil fungsi-fungsi di bawah ini,
    //   JEJAK bisa menyandera dana dengan cara diam: tinggal tidak
    //   memanggilnya. Karena itu semuanya `external` tanpa pembatas.
    //   Dana tidak boleh bergantung pada JEJAK masih hidup.
    // ═══════════════════════════════════════════════════════════════════

    /// @notice D-04 — order kedaluwarsa tanpa ada jastiper yang mengambil.
    function expireUnaccepted(uint256 orderId) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(o.status == Status.CREATED, "JEJAK: status bukan CREATED");
        require(block.timestamp >= o.acceptDeadline, "JEJAK: belum kedaluwarsa");

        uint128 total = _totalWei(o);
        o.status = Status.REFUNDED;
        _credit(o.buyer, total);

        emit OrderRefunded(orderId, o.buyer, total, 1);
    }

    /// @notice D-05 — jastiper menerima order lalu menghilang tanpa mengirim
    ///         bukti sampai `proofDeadline`. Pembeli dapat refund penuh dan
    ///         jastiper kena penalti `abandonedCount` yang menurunkan tier-nya.
    function abandonByTimeout(uint256 orderId) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(o.status == Status.ACCEPTED, "JEJAK: status bukan ACCEPTED");
        require(block.timestamp > o.proofDeadline, "JEJAK: belum lewat batas bukti");

        uint128 total = _totalWei(o);
        o.status = Status.ABANDONED;
        // Penghitung mentah — dipakai `tierCap`, bukan sebagai skor (P4).
        unchecked {
            // Tidak mungkin meluap: satu order menaikkan tepat satu, dan
            // membuat 2^32 order membutuhkan gas yang tidak terhingga.
            abandonedCount[o.jastiper] += 1;
        }
        _credit(o.buyer, total);

        emit OrderAbandoned(orderId, o.jastiper, o.buyer, total);
    }

    /// @notice D-07 — verifier mati atau AI macet lebih dari 24 jam.
    ///         Order tidak boleh menggantung: siapa pun boleh mendorongnya
    ///         ke meja arbiter.
    function escalateStaleVerification(uint256 orderId) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(o.status == Status.PROOFED, "JEJAK: status bukan PROOFED");
        require(block.timestamp > o.verifyDeadline, "JEJAK: verifikasi belum basi");

        o.status = Status.DISPUTED;
        emit DisputeRaised(orderId, msg.sender, 2);
    }

    /// @notice D-02 — masa sanggah 72 jam lewat tanpa keberatan pembeli.
    ///         Fee cair otomatis. Siapa pun boleh memicunya, termasuk jastiper
    ///         sendiri, sehingga fee-nya tidak bergantung pada kerelaan pembeli
    ///         menekan tombol.
    function autoReleaseFee(uint256 orderId) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(o.status == Status.CAPITAL_PAID, "JEJAK: status bukan CAPITAL_PAID");
        require(block.timestamp >= o.disputeWindowEnd, "JEJAK: masa sanggah belum lewat");
        _completeOrder(orderId, o, true);
    }

    /**
     * @notice Menarik seluruh dana yang menjadi hak pemanggil (pola pull).
     * @dev    C-02 + C-04. Checks-Effects-Interactions dijalankan penuh:
     *         saldo dinolkan SEBELUM panggilan eksternal, lalu `nonReentrant`
     *         dipasang sebagai sabuk pengaman kedua.
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "JEJAK: tidak ada dana");

        pendingWithdrawals[msg.sender] = 0;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "JEJAK: transfer gagal");

        emit Withdrawal(msg.sender, amount);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                      SENGKETA & ARBITRASE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice D-06 / D-09 — mengajukan sengketa.
     * @dev    Di PROOFED (sebelum modal cair) boleh diajukan pembeli maupun
     *         jastiper. Di CAPITAL_PAID (setelah modal cair) hanya pembeli,
     *         dan hanya selama masa sanggah 72 jam belum lewat — setelah itu
     *         fee sudah menjadi hak jastiper dan tidak bisa ditarik mundur.
     */
    function raiseDispute(uint256 orderId) external orderExists(orderId) {
        Order storage o = orders[orderId];
        require(
            o.status == Status.PROOFED || o.status == Status.CAPITAL_PAID,
            "JEJAK: status tidak bisa disengketakan"
        );

        uint8 stage;
        if (o.status == Status.PROOFED) {
            require(msg.sender == o.buyer || msg.sender == o.jastiper, "JEJAK: bukan pihak order");
            stage = 0;
        } else {
            require(msg.sender == o.buyer, "JEJAK: hanya pembeli setelah modal cair");
            require(block.timestamp < o.disputeWindowEnd, "JEJAK: masa sanggah sudah lewat");
            stage = 1;
        }

        o.status = Status.DISPUTED;
        emit DisputeRaised(orderId, msg.sender, stage);
    }

    /**
     * @notice Arbiter membagi SISA dana order yang sedang bersengketa.
     *
     * @dev    KD-05 — kuasa arbiter dibatasi kode, bukan dibatasi janji.
     *         Yang TIDAK bisa dia lakukan, dan alasannya ada di sini:
     *
     *           · memindahkan lebih dari sisa dana order ini
     *               → `require(buyerWei + jastiperWei == _remainingWei(...))`
     *           · menyentuh order yang tidak berstatus DISPUTED
     *               → `require(o.status == Status.DISPUTED)`
     *           · memindahkan dana antar-order  (INV-5)
     *               → seluruh aritmetika memakai satu `Order storage o`
     *           · mengubah capWei, feeWei, atau pihak dalam order
     *               → tidak ada penulisan ke field itu di fungsi mana pun
     *           · memanggil `releaseCapital`
     *               → `onlyVerifier`
     *           · menaikkan plafon tier siapa pun
     *               → `completedCount` hanya naik lewat `_completeOrder`
     *
     *         Putusannya memancarkan event publik, sehingga rekam jejak
     *         arbiter sendiri bisa dihitung ulang siapa pun: berapa kasus,
     *         berapa lama, condong ke mana.
     *
     * @param reasonHash keccak256 dari alasan putusan yang dipublikasikan
     *                   off-chain. Arbiter yang tidak bisa menunjukkan
     *                   alasannya bisa dibuktikan tidak bisa.
     */
    function resolveDispute(uint256 orderId, uint128 buyerWei, uint128 jastiperWei, bytes32 reasonHash)
        external
        onlyArbiter
        orderExists(orderId)
    {
        Order storage o = orders[orderId];
        require(o.status == Status.DISPUTED, "JEJAK: status bukan DISPUTED");
        require(
            uint256(buyerWei) + uint256(jastiperWei) == _remainingWei(o),
            "JEJAK: pembagian tidak sama dengan sisa"
        );

        o.status = Status.RESOLVED;

        if (buyerWei > 0) _credit(o.buyer, buyerWei);
        if (jastiperWei > 0) _credit(o.jastiper, jastiperWei);

        emit DisputeResolved(orderId, msg.sender, buyerWei, jastiperWei, reasonHash);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                    OWNER — kuasa minimal, disengaja
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Mengganti alamat backend AI. Tidak menyentuh dana apa pun,
    ///         dan tidak bisa mengubah order yang sedang berjalan.
    function setVerifier(address newVerifier) external onlyOwner {
        require(newVerifier != address(0), "JEJAK: verifier nol");
        emit VerifierChanged(verifier, newVerifier);
        verifier = newVerifier;
    }

    /// @notice Mengganti alamat arbiter. Sama: tidak menyentuh dana.
    function setArbiter(address newArbiter) external onlyOwner {
        require(newArbiter != address(0), "JEJAK: arbiter nol");
        emit ArbiterChanged(arbiter, newArbiter);
        arbiter = newArbiter;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          PEMBACAAN
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Seluruh isi order dalam satu panggilan (frontend & tes).
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    /// @notice Sisa dana order yang belum dibayarkan ke siapa pun.
    /// @dev    Setelah state final nilainya WAJIB 0 — itulah INV-3, dan
    ///         di sini dijamin secara struktur, bukan dengan pembukuan
    ///         terpisah yang bisa melenceng.
    function remainingWei(uint256 orderId) external view returns (uint256) {
        return _remainingWei(orders[orderId]);
    }

    /// @notice Tier jastiper: 0 = baru · 1 = pemula · 2 = mapan · 3 = terpercaya.
    /// @dev    Diturunkan dari penghitung mentah on-chain. Jastiper yang pernah
    ///         meninggalkan order turun satu tier — sekali kabur, plafonmu
    ///         mengecil, dan itu berlaku selamanya di alamat itu.
    function tierOf(address jastiper) public view returns (uint8) {
        uint32 done = completedCount[jastiper];

        uint8 tier;
        if (done >= TIER3_MIN) tier = 3;
        else if (done >= TIER2_MIN) tier = 2;
        else if (done >= TIER1_MIN) tier = 1;
        else tier = 0;

        if (abandonedCount[jastiper] > 0 && tier > 0) {
            tier -= 1;
        }
        return tier;
    }

    /// @notice Plafon nilai order (cap + fee) yang boleh diterima alamat ini.
    function tierCap(address jastiper) public view returns (uint256) {
        uint8 tier = tierOf(jastiper);
        if (tier == 3) return TIER3_CAP;
        if (tier == 2) return TIER2_CAP;
        if (tier == 1) return TIER1_CAP;
        return TIER0_CAP;
    }

    /// @notice Apakah status ini final (tidak punya transisi keluar)?
    function isFinal(Status s) public pure returns (bool) {
        return s == Status.COMPLETED || s == Status.REFUNDED || s == Status.ABANDONED
            || s == Status.RESOLVED;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                            INTERNAL
    // ═══════════════════════════════════════════════════════════════════

    function _totalWei(Order storage o) internal view returns (uint128) {
        // Aman: keduanya uint128 dan dijumlahkan ke uint128 hanya karena
        // `createOrder` menerima msg.value == cap + fee sebagai uint256,
        // sehingga jumlahnya pasti muat di uint256; di sini kami tetap
        // menjumlahkan lewat uint256 agar overflow tetap dicek compiler.
        return uint128(uint256(o.capWei) + uint256(o.feeWei));
    }

    /// @dev Sisa dana order. Setelah final selalu 0 — dijamin struktur:
    ///      setiap transisi ke state final membayarkan tepat sisa itu.
    function _remainingWei(Order storage o) internal view returns (uint256) {
        if (isFinal(o.status)) return 0;
        return uint256(o.capWei) + uint256(o.feeWei) - uint256(o.verifiedWei);
    }

    /// @dev Jalur D-01 dan D-02 bertemu di sini supaya pembagian uangnya
    ///      ditulis satu kali saja — dua tempat berarti dua peluang beda.
    function _completeOrder(uint256 orderId, Order storage o, bool autoReleased) internal {
        uint128 total = _totalWei(o);
        uint128 sisaPlafon = o.capWei - o.verifiedWei; // aman: verifiedWei <= capWei (INV-2)
        uint128 kePembeli = sisaPlafon;
        uint128 keJastiper = o.feeWei;

        o.status = Status.COMPLETED;
        unchecked {
            // Lihat alasan tidak-meluap di `abandonByTimeout`.
            completedCount[o.jastiper] += 1;
        }

        if (kePembeli > 0) _credit(o.buyer, kePembeli);
        _credit(o.jastiper, keJastiper);

        emit OrderCompleted(orderId, o.jastiper, o.buyer, total, uint64(block.timestamp), autoReleased);
    }

    /// @dev Satu-satunya tempat dana berpindah kepemilikan di kontrak ini.
    ///      Kontrak sengaja ditulis aset-agnostik: mengganti tBNB native
    ///      dengan stablecoin BSC adalah perubahan pada fungsi ini saja (§6.9).
    function _credit(address to, uint256 amountWei) internal {
        pendingWithdrawals[to] += amountWei;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Tidak ada `receive()` maupun `fallback()`. BNB hanya bisa masuk
    //  lewat `createOrder`, sehingga tidak ada wei tanpa pemilik di dalam
    //  kontrak. (Pengiriman paksa lewat selfdestruct tetap mungkin secara
    //  teori, tapi dana itu tidak akan pernah masuk pembukuan order mana
    //  pun dan tidak mengganggu invarian.)
    // ═══════════════════════════════════════════════════════════════════
}
