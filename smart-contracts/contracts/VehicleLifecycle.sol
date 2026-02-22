// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./VehicleNFT.sol";

/**
 * @title VehicleLifecycle
 * @notice บันทึก event ตลอดชีวิตรถ:
 *         ซ่อมบำรุง, เปลี่ยนอะไหล่, ประกันภัย, เคลม, การโอน, disclosure
 *
 * On-chain: เฉพาะ hash + metadata ที่ต้อง verify
 * Off-chain: รายละเอียดทั้งหมดใน DB / IPFS
 */
contract VehicleLifecycle is AccessControl {
    // ─── Roles ───────────────────────────────────────────────
    bytes32 public constant DEALER_ROLE    = keccak256("DEALER_ROLE");
    bytes32 public constant WORKSHOP_ROLE  = keccak256("WORKSHOP_ROLE");
    bytes32 public constant INSURER_ROLE   = keccak256("INSURER_ROLE");

    // ─── Enums ───────────────────────────────────────────────
    enum AccidentSeverity { None, Minor, Major, Structural }
    enum InsuranceAction  { New, Renew, Change, Cancel }
    enum ClaimStatus      { Filed, Estimating, Approved, Repairing, Closed, Rejected }
    enum ClaimSeverity    { Minor, Major, Structural, TotalLoss }

    // ─── State ───────────────────────────────────────────────
    VehicleNFT public vehicleNFT;

    /// tokenId → consent address → scope mask (delegated write)
    mapping(uint256 => mapping(address => uint64)) public writeConsents;

    // ─── Events ──────────────────────────────────────────────

    // Ownership / Transfer
    event OwnershipTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint8   reason,           // TransferReason enum value
        bytes32 saleContractHash,
        bytes32 buyerOwnerId,     // keccak256(DID)
        uint64  deliveryAt,
        bytes32 paymentRefHash
    );

    // Disclosure (ย้อมแมว prevention)
    event DisclosureRecorded(
        uint256 indexed tokenId,
        address seller,
        bytes32 buyerOwnerId,
        uint64  disclosedItemsMask,
        bytes32 ackHash,
        uint64  signedAt
    );

    // Maintenance
    event MaintenanceLogged(
        uint256 indexed tokenId,
        address indexed workshop,
        bytes32 writeConsentRefHash,
        uint32  mileageKm,
        bytes32 maintenanceHash,
        bytes32 partsHash,
        uint8   accidentSeverity,
        uint64  occurredAt
    );

    // Insurance Policy
    event InsurancePolicyEvent(
        uint256 indexed tokenId,
        address indexed insurer,
        bytes32 policyNoHash,
        InsuranceAction action,
        uint64  validFrom,
        uint64  validTo,
        bytes32 coverageHash
    );

    // Insurance Claim
    event ClaimFiled(
        uint256 indexed tokenId,
        bytes32 claimNoHash,
        uint64  filedAt,
        bytes32[] evidenceHashes,
        ClaimSeverity severity
    );

    event ClaimStatusUpdated(
        uint256 indexed tokenId,
        bytes32 claimNoHash,
        ClaimStatus newStatus
    );

    // Generic event (catch-all สำหรับ event อื่น ๆ)
    event GenericEvent(
        uint256 indexed tokenId,
        uint32  eventType,
        address actor,
        uint64  occurredAt,
        bytes32 payloadHash,
        bytes32 evidenceHash
    );

    // ─── Constructor ─────────────────────────────────────────
    constructor(address _vehicleNFT) {
        vehicleNFT = VehicleNFT(_vehicleNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ─── Modifiers ───────────────────────────────────────────
    modifier vehicleExists(uint256 tokenId) {
        require(vehicleNFT.ownerOf(tokenId) != address(0), "Vehicle does not exist");
        _;
    }

    modifier onlyVehicleOwner(uint256 tokenId) {
        require(vehicleNFT.ownerOf(tokenId) == msg.sender, "Not vehicle owner");
        _;
    }

    // ─── Consent (Owner → Workshop) ──────────────────────────
    /**
     * @notice เจ้าของอนุญาตให้อู่เขียน record
     * @param scopeMask  bitmask สิทธิ์: 1=maintenance, 2=odometer, 4=parts, 8=accident_flag
     */
    function grantWriteConsent(
        uint256 tokenId,
        address workshop,
        uint64  scopeMask,
        uint64  expiresAt,
        bool    singleUse,
        uint64  nonce
    ) external onlyVehicleOwner(tokenId) {
        // encode expiry + singleUse + nonce into scope
        writeConsents[tokenId][workshop] = scopeMask;
        // emit for off-chain indexing
        emit GenericEvent(
            tokenId,
            100, // CONSENT_GRANTED type
            msg.sender,
            uint64(block.timestamp),
            keccak256(abi.encode(workshop, scopeMask, expiresAt, singleUse, nonce)),
            bytes32(0)
        );
    }

    function revokeWriteConsent(uint256 tokenId, address workshop)
        external onlyVehicleOwner(tokenId)
    {
        delete writeConsents[tokenId][workshop];
        emit GenericEvent(
            tokenId,
            101, // CONSENT_REVOKED type
            msg.sender,
            uint64(block.timestamp),
            keccak256(abi.encode(workshop)),
            bytes32(0)
        );
    }

    // ─── Maintenance Log ─────────────────────────────────────
    /**
     * @notice อู่บันทึกประวัติซ่อม (ต้องมี consent จากเจ้าของ)
     */
    function logMaintenance(
        uint256 tokenId,
        bytes32 writeConsentRefHash,
        uint32  mileageKm,
        bytes32 maintenanceHash,
        bytes32 partsHash,
        uint8   accidentSeverity,
        uint64  occurredAt
    ) external onlyRole(WORKSHOP_ROLE) vehicleExists(tokenId) {
        require(writeConsents[tokenId][msg.sender] > 0, "No write consent");
        require(accidentSeverity <= 3, "Invalid severity");

        emit MaintenanceLogged(
            tokenId,
            msg.sender,
            writeConsentRefHash,
            mileageKm,
            maintenanceHash,
            partsHash,
            accidentSeverity,
            occurredAt
        );
    }

    // ─── Ownership Transfer ──────────────────────────────────
    /**
     * @notice บันทึก event การโอนกรรมสิทธิ์ (เรียกพร้อมกับ ERC721 transfer)
     * @param reason  0=inventory_transfer, 1=first_sale, 2=resale, 3=trade_in
     */
    function recordTransfer(
        uint256 tokenId,
        address to,
        uint8   reason,
        bytes32 saleContractHash,
        bytes32 buyerOwnerId,
        bytes32 paymentRefHash
    ) external vehicleExists(tokenId) {
        address from = vehicleNFT.ownerOf(tokenId);
        require(
            msg.sender == from ||
            hasRole(DEALER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );

        emit OwnershipTransferred(
            tokenId,
            from,
            to,
            reason,
            saleContractHash,
            buyerOwnerId,
            uint64(block.timestamp),
            paymentRefHash
        );
    }

    // ─── Disclosure ──────────────────────────────────────────
    /**
     * @notice บันทึกการเปิดเผยข้อมูลสำคัญก่อนขาย
     */
    function recordDisclosure(
        uint256 tokenId,
        bytes32 buyerOwnerId,
        uint64  disclosedItemsMask,
        bytes32 ackHash
    ) external vehicleExists(tokenId) {
        address owner = vehicleNFT.ownerOf(tokenId);
        require(
            msg.sender == owner || hasRole(DEALER_ROLE, msg.sender),
            "Not seller"
        );

        emit DisclosureRecorded(
            tokenId,
            msg.sender,
            buyerOwnerId,
            disclosedItemsMask,
            ackHash,
            uint64(block.timestamp)
        );
    }

    // ─── Insurance Policy ────────────────────────────────────
    /**
     * @notice บันทึก event กรมธรรม์ประกันภัย
     */
    function recordInsurancePolicy(
        uint256         tokenId,
        bytes32         policyNoHash,
        InsuranceAction action,
        uint64          validFrom,
        uint64          validTo,
        bytes32         coverageHash
    ) external onlyRole(INSURER_ROLE) vehicleExists(tokenId) {
        emit InsurancePolicyEvent(
            tokenId,
            msg.sender,
            policyNoHash,
            action,
            validFrom,
            validTo,
            coverageHash
        );
    }

    // ─── Insurance Claim ─────────────────────────────────────
    /**
     * @notice เปิดเคลมประกัน
     */
    function fileClaim(
        uint256       tokenId,
        bytes32       claimNoHash,
        bytes32[]     calldata evidenceHashes,
        ClaimSeverity severity
    ) external onlyRole(INSURER_ROLE) vehicleExists(tokenId) {
        emit ClaimFiled(
            tokenId,
            claimNoHash,
            uint64(block.timestamp),
            evidenceHashes,
            severity
        );
    }

    /**
     * @notice อัปเดตสถานะเคลม
     */
    function updateClaimStatus(
        uint256     tokenId,
        bytes32     claimNoHash,
        ClaimStatus newStatus
    ) external onlyRole(INSURER_ROLE) vehicleExists(tokenId) {
        emit ClaimStatusUpdated(tokenId, claimNoHash, newStatus);
    }

    // ─── Generic Event ───────────────────────────────────────
    /**
     * @notice บันทึก event ทั่วไป (สำหรับ event type ที่ไม่มี function เฉพาะ)
     */
    function logEvent(
        uint256 tokenId,
        uint32  eventType,
        uint64  occurredAt,
        bytes32 payloadHash,
        bytes32 evidenceHash
    ) external vehicleExists(tokenId) {
        emit GenericEvent(tokenId, eventType, msg.sender, occurredAt, payloadHash, evidenceHash);
    }
}
