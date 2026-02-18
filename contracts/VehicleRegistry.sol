// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./VehicleNFT.sol";

/**
 * @title VehicleRegistry
 * @notice กรมการขนส่งทางบก (DLT) – จดทะเบียน, ป้ายทะเบียน, ภาษี, ธงสถานะ
 *
 * On-chain data:
 *   - Registration: isRegistered, registeredAt, dltOfficer, greenBookNoHash, docHash, status
 *   - Plate: plateNoHash, provinceCode, eventType, docHash, effectiveAt
 *   - Tax: taxYear, paidAt, validUntil, receiptHash, status
 *   - Flags: bitmask (stolen/seized/flood/totalLoss/scrapped/...)
 *
 * Off-chain data (DB):
 *   - greenBookNoPlain, plateNoPlain, ownerPII, เอกสาร CID/URL, amount ฯลฯ
 */
contract VehicleRegistry is AccessControl {
    // ─── Roles ───────────────────────────────────────────────
    bytes32 public constant DLT_OFFICER_ROLE    = keccak256("DLT_OFFICER_ROLE");
    bytes32 public constant INSPECTOR_ROLE      = keccak256("INSPECTOR_ROLE");

    // ─── Flag Bitmask Constants ──────────────────────────────
    uint64 public constant FLAG_STOLEN          = 1 << 0;
    uint64 public constant FLAG_SEIZED          = 1 << 1;
    uint64 public constant FLAG_MAJOR_ACCIDENT  = 1 << 2;
    uint64 public constant FLAG_FLOOD           = 1 << 3;
    uint64 public constant FLAG_TOTAL_LOSS      = 1 << 4;
    uint64 public constant FLAG_SCRAPPED        = 1 << 5;
    uint64 public constant FLAG_REG_CANCELLED   = 1 << 6;

    // ─── Enums ───────────────────────────────────────────────
    enum RegStatus   { Unregistered, Registered, Suspended, Cancelled }
    enum PlateEvent  { Issue, Change, Lost }
    enum TaxStatus   { Paid, Unpaid, Overdue }

    // ─── Structs ─────────────────────────────────────────────
    struct RegistrationData {
        bool      isRegistered;
        uint64    registeredAt;
        address   dltOfficer;
        bytes32   greenBookNoHash;
        bytes32   registrationDocHash;
        RegStatus status;
    }

    // ─── State ───────────────────────────────────────────────
    VehicleNFT public vehicleNFT;

    mapping(uint256 => RegistrationData) public registrations;
    mapping(uint256 => uint64)           public flags;

    /// cache ผลตรวจสภาพล่าสุดที่ผ่าน (ใช้ validate ก่อนต่อภาษี)
    mapping(uint256 => uint64) public lastInspectionPassAt;
    /// อายุสูงสุดของผลตรวจสภาพ (seconds) – ตั้งค่าได้โดย admin
    uint64 public inspectionMaxAge = 365 days;

    // ─── Events ──────────────────────────────────────────────
    event VehicleRegistered(
        uint256 indexed tokenId,
        address dltOfficer,
        bytes32 greenBookNoHash,
        bytes32 registrationDocHash
    );

    event RegistrationStatusChanged(uint256 indexed tokenId, RegStatus newStatus);

    event PlateEventRecorded(
        uint256 indexed tokenId,
        bytes32 plateNoHash,
        uint16  provinceCode,
        PlateEvent eventType,
        bytes32 docHash,
        uint64  effectiveAt
    );

    event TaxPaid(
        uint256 indexed tokenId,
        uint16  taxYear,
        uint64  paidAt,
        uint64  validUntil,
        bytes32 receiptHash,
        TaxStatus status
    );

    event FlagUpdated(
        uint256 indexed tokenId,
        uint64  newFlags,
        address source,
        bytes32 refHash
    );

    event InspectionRecorded(
        uint256 indexed tokenId,
        address station,
        uint8   result,      // 0 = fail, 1 = pass
        bytes32 metricsHash,
        bytes32 certHash,
        uint64  issuedAt
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

    // ─── Registration ────────────────────────────────────────
    /**
     * @notice จดทะเบียนรถ (ครั้งแรก)
     */
    function registerVehicle(
        uint256 tokenId,
        bytes32 greenBookNoHash,
        bytes32 registrationDocHash
    ) external onlyRole(DLT_OFFICER_ROLE) vehicleExists(tokenId) {
        require(!registrations[tokenId].isRegistered, "Already registered");

        registrations[tokenId] = RegistrationData({
            isRegistered: true,
            registeredAt: uint64(block.timestamp),
            dltOfficer: msg.sender,
            greenBookNoHash: greenBookNoHash,
            registrationDocHash: registrationDocHash,
            status: RegStatus.Registered
        });

        emit VehicleRegistered(tokenId, msg.sender, greenBookNoHash, registrationDocHash);
    }

    /**
     * @notice เปลี่ยนสถานะการจดทะเบียน (suspend/cancel/re-register)
     */
    function setRegistrationStatus(uint256 tokenId, RegStatus newStatus)
        external onlyRole(DLT_OFFICER_ROLE) vehicleExists(tokenId)
    {
        registrations[tokenId].status = newStatus;
        emit RegistrationStatusChanged(tokenId, newStatus);

        // ถ้ายกเลิก → ล็อกการโอน + ติด flag
        if (newStatus == RegStatus.Cancelled) {
            vehicleNFT.setTransferLock(tokenId, true);
            _setFlag(tokenId, FLAG_REG_CANCELLED, true, bytes32(0));
        }
    }

    // ─── Plate ───────────────────────────────────────────────
    /**
     * @notice บันทึก event ป้ายทะเบียน (ออก/เปลี่ยน/หาย)
     */
    function recordPlateEvent(
        uint256    tokenId,
        bytes32    plateNoHash,
        uint16     provinceCode,
        PlateEvent eventType,
        bytes32    docHash,
        uint64     effectiveAt
    ) external onlyRole(DLT_OFFICER_ROLE) vehicleExists(tokenId) {
        emit PlateEventRecorded(tokenId, plateNoHash, provinceCode, eventType, docHash, effectiveAt);
    }

    // ─── Tax ─────────────────────────────────────────────────
    /**
     * @notice บันทึกการชำระภาษีประจำปี
     * @dev ต้องมีผลตรวจสภาพผ่านภายใน inspectionMaxAge
     */
    function recordTaxPayment(
        uint256 tokenId,
        uint16  taxYear,
        uint64  validUntil,
        bytes32 receiptHash
    ) external onlyRole(DLT_OFFICER_ROLE) vehicleExists(tokenId) {
        require(
            lastInspectionPassAt[tokenId] > 0 &&
            block.timestamp - lastInspectionPassAt[tokenId] <= inspectionMaxAge,
            "Inspection expired or not found"
        );

        emit TaxPaid(tokenId, taxYear, uint64(block.timestamp), validUntil, receiptHash, TaxStatus.Paid);
    }

    // ─── Flags ───────────────────────────────────────────────
    /**
     * @notice ตั้ง/ปิด flag เช่น stolen, seized, flood, totalLoss
     */
    function setFlag(
        uint256 tokenId,
        uint64  flagBit,
        bool    active,
        bytes32 refHash
    ) external onlyRole(DLT_OFFICER_ROLE) vehicleExists(tokenId) {
        _setFlag(tokenId, flagBit, active, refHash);

        // ถ้าตั้ง stolen/seized/totalLoss → ล็อกการโอนอัตโนมัติ
        if (active && (flagBit == FLAG_STOLEN || flagBit == FLAG_SEIZED || flagBit == FLAG_TOTAL_LOSS)) {
            vehicleNFT.setTransferLock(tokenId, true);
        }
    }

    function _setFlag(uint256 tokenId, uint64 flagBit, bool active, bytes32 refHash) internal {
        if (active) {
            flags[tokenId] |= flagBit;
        } else {
            flags[tokenId] &= ~flagBit;
        }
        emit FlagUpdated(tokenId, flags[tokenId], msg.sender, refHash);
    }

    // ─── Inspection ──────────────────────────────────────────
    /**
     * @notice บันทึกผลตรวจสภาพ (ตรอ.)
     */
    function recordInspection(
        uint256 tokenId,
        uint8   result,       // 0 = fail, 1 = pass
        bytes32 metricsHash,
        bytes32 certHash
    ) external onlyRole(INSPECTOR_ROLE) vehicleExists(tokenId) {
        uint64 issuedAt = uint64(block.timestamp);

        if (result == 1) {
            lastInspectionPassAt[tokenId] = issuedAt;
        }

        emit InspectionRecorded(tokenId, msg.sender, result, metricsHash, certHash, issuedAt);
    }

    // ─── Admin ───────────────────────────────────────────────
    function setInspectionMaxAge(uint64 _maxAge) external onlyRole(DEFAULT_ADMIN_ROLE) {
        inspectionMaxAge = _maxAge;
    }

    // ─── View ────────────────────────────────────────────────
    function getRegistration(uint256 tokenId) external view returns (RegistrationData memory) {
        return registrations[tokenId];
    }

    function getFlags(uint256 tokenId) external view returns (uint64) {
        return flags[tokenId];
    }

    function hasFlag(uint256 tokenId, uint64 flagBit) external view returns (bool) {
        return (flags[tokenId] & flagBit) != 0;
    }
}
