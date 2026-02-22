// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VehicleNFT.sol";

/**
 * @title VehicleLien
 * @notice ไฟแนนซ์/สินเชื่อ – ภาระผูกพัน (Lien) + Escrow สำหรับ P2P
 *
 * On-chain data:
 *   Lien: lender, lienStatus, transferLocked, loanContractHash,
 *         startedAt, releaseConditionHash
 *   Escrow: buyer, seller, conditionsMask, depositAsset, depositAmount, state
 *
 * Off-chain data (DB):
 *   loanAccountNo, principal, interestRate, termMonths, contractDoc,
 *   borrowerKYC, escrow deal terms ฯลฯ
 */
contract VehicleLien is AccessControl, ReentrancyGuard {
    // ─── Roles ───────────────────────────────────────────────
    bytes32 public constant FINANCE_ROLE = keccak256("FINANCE_ROLE");

    // ─── Enums ───────────────────────────────────────────────
    enum LienStatus  { None, Active, Released, Defaulted }
    enum EscrowState { Created, Funded, Released, Cancelled }

    // ─── Structs ─────────────────────────────────────────────
    struct Lien {
        address   lender;
        LienStatus status;
        bytes32   loanContractHash;
        uint64    startedAt;
        bytes32   releaseConditionHash;
    }

    struct Escrow {
        bytes32     escrowId;
        uint256     tokenId;
        address     buyer;
        address     seller;
        uint64      conditionsMask;   // bitmask: 1=payment_confirmed, 2=lien_released
        address     depositAsset;     // ERC20 address, หรือ address(0) = native coin
        uint256     depositAmount;
        EscrowState state;
    }

    // ─── Condition Bitmask ───────────────────────────────────
    uint64 public constant COND_PAYMENT_CONFIRMED = 1 << 0;
    uint64 public constant COND_LIEN_RELEASED     = 1 << 1;

    // ─── State ───────────────────────────────────────────────
    VehicleNFT public vehicleNFT;

    mapping(uint256 => Lien)    public liens;
    mapping(bytes32 => Escrow)  public escrows;

    /// ติดตาม conditions ที่ fulfill แล้ว
    mapping(bytes32 => uint64)  public fulfilledConditions;

    // ─── Events ──────────────────────────────────────────────
    event LienCreated(
        uint256 indexed tokenId,
        address indexed lender,
        bytes32 loanContractHash,
        uint64  startedAt
    );

    event LienStatusChanged(
        uint256 indexed tokenId,
        LienStatus newStatus
    );

    event EscrowCreated(
        bytes32 indexed escrowId,
        uint256 indexed tokenId,
        address buyer,
        address seller,
        uint64  conditionsMask,
        address depositAsset,
        uint256 depositAmount
    );

    event EscrowFunded(bytes32 indexed escrowId, uint256 amount);

    event EscrowReleased(bytes32 indexed escrowId, uint256 tokenId);

    event EscrowCancelled(bytes32 indexed escrowId);

    event ConditionFulfilled(bytes32 indexed escrowId, uint64 condition);

    // ─── Constructor ─────────────────────────────────────────
    constructor(address _vehicleNFT) {
        vehicleNFT = VehicleNFT(_vehicleNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ─── Lien Management ─────────────────────────────────────
    /**
     * @notice สร้างภาระผูกพัน + ล็อกการโอน
     */
    function createLien(
        uint256 tokenId,
        bytes32 loanContractHash,
        bytes32 releaseConditionHash
    ) external onlyRole(FINANCE_ROLE) {
        require(liens[tokenId].status == LienStatus.None, "Lien already exists");

        liens[tokenId] = Lien({
            lender: msg.sender,
            status: LienStatus.Active,
            loanContractHash: loanContractHash,
            startedAt: uint64(block.timestamp),
            releaseConditionHash: releaseConditionHash
        });

        vehicleNFT.setTransferLock(tokenId, true);

        emit LienCreated(tokenId, msg.sender, loanContractHash, uint64(block.timestamp));
    }

    /**
     * @notice ปลดภาระผูกพัน + ปลดล็อกการโอน
     */
    function releaseLien(uint256 tokenId) external {
        Lien storage lien = liens[tokenId];
        require(lien.status == LienStatus.Active, "No active lien");
        require(
            msg.sender == lien.lender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not lender"
        );

        lien.status = LienStatus.Released;
        vehicleNFT.setTransferLock(tokenId, false);

        emit LienStatusChanged(tokenId, LienStatus.Released);
    }

    /**
     * @notice ตั้งสถานะ defaulted
     */
    function markDefault(uint256 tokenId) external {
        Lien storage lien = liens[tokenId];
        require(lien.status == LienStatus.Active, "No active lien");
        require(
            msg.sender == lien.lender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not lender"
        );

        lien.status = LienStatus.Defaulted;
        emit LienStatusChanged(tokenId, LienStatus.Defaulted);
    }

    // ─── Escrow (P2P with conditions) ────────────────────────
    /**
     * @notice สร้าง escrow สำหรับการซื้อขายแบบมีเงื่อนไข
     */
    function createEscrow(
        bytes32 escrowId,
        uint256 tokenId,
        address buyer,
        uint64  conditionsMask,
        address depositAsset,
        uint256 depositAmount
    ) external {
        address seller = vehicleNFT.ownerOf(tokenId);
        require(msg.sender == seller, "Not vehicle owner");
        require(escrows[escrowId].tokenId == 0, "Escrow ID exists");

        escrows[escrowId] = Escrow({
            escrowId: escrowId,
            tokenId: tokenId,
            buyer: buyer,
            seller: seller,
            conditionsMask: conditionsMask,
            depositAsset: depositAsset,
            depositAmount: depositAmount,
            state: EscrowState.Created
        });

        emit EscrowCreated(
            escrowId, tokenId, buyer, seller,
            conditionsMask, depositAsset, depositAmount
        );
    }

    /**
     * @notice ผู้ซื้อวางเงินเข้า escrow (native coin)
     */
    function fundEscrowNative(bytes32 escrowId) external payable nonReentrant {
        Escrow storage esc = escrows[escrowId];
        require(esc.state == EscrowState.Created, "Not in created state");
        require(msg.sender == esc.buyer, "Not buyer");
        require(esc.depositAsset == address(0), "Use ERC20 fund");
        require(msg.value == esc.depositAmount, "Wrong amount");

        esc.state = EscrowState.Funded;
        emit EscrowFunded(escrowId, msg.value);
    }

    /**
     * @notice ผู้ซื้อวางเงินเข้า escrow (ERC20)
     */
    function fundEscrowERC20(bytes32 escrowId) external nonReentrant {
        Escrow storage esc = escrows[escrowId];
        require(esc.state == EscrowState.Created, "Not in created state");
        require(msg.sender == esc.buyer, "Not buyer");
        require(esc.depositAsset != address(0), "Use native fund");

        IERC20(esc.depositAsset).transferFrom(msg.sender, address(this), esc.depositAmount);

        esc.state = EscrowState.Funded;
        emit EscrowFunded(escrowId, esc.depositAmount);
    }

    /**
     * @notice Fulfill เงื่อนไข (เรียกโดย finance หรือ seller)
     */
    function fulfillCondition(bytes32 escrowId, uint64 condition) external {
        Escrow storage esc = escrows[escrowId];
        require(esc.state == EscrowState.Funded, "Not funded");

        // ใครมีสิทธิ์ fulfill?
        require(
            msg.sender == esc.seller ||
            msg.sender == esc.buyer ||
            hasRole(FINANCE_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );

        fulfilledConditions[escrowId] |= condition;
        emit ConditionFulfilled(escrowId, condition);

        // ตรวจว่าครบทุก condition หรือยัง → auto release
        if ((fulfilledConditions[escrowId] & esc.conditionsMask) == esc.conditionsMask) {
            _releaseEscrow(escrowId);
        }
    }

    /**
     * @notice ยกเลิก escrow (คืนเงินผู้ซื้อ)
     */
    function cancelEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage esc = escrows[escrowId];
        require(
            esc.state == EscrowState.Created || esc.state == EscrowState.Funded,
            "Cannot cancel"
        );
        require(
            msg.sender == esc.seller || msg.sender == esc.buyer,
            "Not party"
        );

        if (esc.state == EscrowState.Funded) {
            // คืนเงินผู้ซื้อ
            if (esc.depositAsset == address(0)) {
                payable(esc.buyer).transfer(esc.depositAmount);
            } else {
                IERC20(esc.depositAsset).transfer(esc.buyer, esc.depositAmount);
            }
        }

        esc.state = EscrowState.Cancelled;
        emit EscrowCancelled(escrowId);
    }

    // ─── Internal ────────────────────────────────────────────
    function _releaseEscrow(bytes32 escrowId) internal nonReentrant {
        Escrow storage esc = escrows[escrowId];
        esc.state = EscrowState.Released;

        // โอนเงินให้ seller
        if (esc.depositAsset == address(0)) {
            payable(esc.seller).transfer(esc.depositAmount);
        } else {
            IERC20(esc.depositAsset).transfer(esc.seller, esc.depositAmount);
        }

        emit EscrowReleased(escrowId, esc.tokenId);
    }

    // ─── View ────────────────────────────────────────────────
    function getLien(uint256 tokenId) external view returns (Lien memory) {
        return liens[tokenId];
    }

    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function isLienActive(uint256 tokenId) external view returns (bool) {
        return liens[tokenId].status == LienStatus.Active;
    }
}
