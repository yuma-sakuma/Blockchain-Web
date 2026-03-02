// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VehicleNFT
 * @notice Core ERC-721 contract – ตัวตนรถ (Vehicle Identity)
 *
 * On-chain data (ต่อ tokenId):
 *   - vinHash, manufacturerId, manufacturedAt, modelHash, specHash
 *   - transferLocked flag (ควบคุมโดย VehicleRegistry / VehicleLien)
 *
 * Off-chain data (DB):
 *   - vinPlain, modelJson, specJson, manufacturerSignature
 */
contract VehicleNFT is ERC721, AccessControl, ReentrancyGuard {
    // ─── Roles ───────────────────────────────────────────────
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant REGISTRY_ROLE     = keccak256("REGISTRY_ROLE");
    bytes32 public constant LIEN_ROLE         = keccak256("LIEN_ROLE");

    // ─── Structs ─────────────────────────────────────────────
    struct VehicleIdentity {
        bytes32 vinHash;
        address manufacturerId;
        uint64  manufacturedAt;
        bytes32 modelHash;
        bytes32 specHash;
    }

    // ─── State ───────────────────────────────────────────────
    uint256 private _nextTokenId;

    /// tokenId → identity
    mapping(uint256 => VehicleIdentity) public vehicles;

    /// ป้องกัน VIN ซ้ำ
    mapping(bytes32 => bool) private _usedVins;

    /// ล็อกการโอน (ตั้งโดย Registry หรือ Lien)
    mapping(uint256 => bool) public transferLocked;

    // ─── Events ──────────────────────────────────────────────
    event VehicleMinted(
        uint256 indexed tokenId,
        bytes32 vinHash,
        address indexed manufacturer,
        uint64  manufacturedAt,
        bytes32 modelHash,
        bytes32 specHash
    );

    event TransferLockChanged(uint256 indexed tokenId, bool locked, address changedBy);

    // ─── Constructor ─────────────────────────────────────────
    constructor() ERC721("VehicleNFT", "VNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ─── Mint ────────────────────────────────────────────────
    /**
     * @notice Mint รถใหม่จากโรงงาน
     * @param to          address ที่รับ NFT (อาจเป็น manufacturer เอง)
     * @param vinHash     keccak256(VIN)
     * @param manufacturedAt  unix timestamp วันผลิต
     * @param modelHash   hash ของ model JSON
     * @param specHash    hash ของ spec JSON
     */
    function mintVehicle(
        address to,
        bytes32 vinHash,
        uint64  manufacturedAt,
        bytes32 modelHash,
        bytes32 specHash
    ) external onlyRole(MANUFACTURER_ROLE) returns (uint256 tokenId) {
        require(!_usedVins[vinHash], "VIN already registered");

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        vehicles[tokenId] = VehicleIdentity({
            vinHash: vinHash,
            manufacturerId: msg.sender,
            manufacturedAt: manufacturedAt,
            modelHash: modelHash,
            specHash: specHash
        });

        _usedVins[vinHash] = true;

        emit VehicleMinted(tokenId, vinHash, msg.sender, manufacturedAt, modelHash, specHash);
    }

    // ─── Transfer Lock ───────────────────────────────────────
    /**
     * @notice ตั้ง/ปลด transfer lock (เรียกจาก Registry หรือ Lien contract)
     */
    function setTransferLock(uint256 tokenId, bool locked)
        external
    {
        require(
            hasRole(REGISTRY_ROLE, msg.sender) || hasRole(LIEN_ROLE, msg.sender),
            "Not authorized to change lock"
        );
        transferLocked[tokenId] = locked;
        emit TransferLockChanged(tokenId, locked, msg.sender);
    }

    // ─── Transfer Override ───────────────────────────────────
    /**
     * @dev ตรวจสอบ transferLocked ก่อนทุกการโอน
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        // อนุญาต mint (from == 0) โดยไม่ต้องเช็ค lock
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            require(!transferLocked[tokenId], "Transfer is locked");
        }
        return super._update(to, tokenId, auth);
    }

    // ─── View ────────────────────────────────────────────────
    function getVehicle(uint256 tokenId) external view returns (VehicleIdentity memory) {
        require(_ownerOf(tokenId) != address(0), "Vehicle does not exist");
        return vehicles[tokenId];
    }

    function isVinUsed(bytes32 vinHash) external view returns (bool) {
        return _usedVins[vinHash];
    }

    // ─── ERC-165 ─────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
