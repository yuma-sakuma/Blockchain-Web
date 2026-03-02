// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VehicleNFT.sol";

/**
 * @title VehicleConsent
 * @notice จัดการสิทธิ์การอ่านข้อมูล (Consent / Permission)
 *
 * On-chain data:
 *   - grantTo (hash DID), scopeMask, expiresAt, nonce, grantHash
 *   - writerRoleAllowed, writerAllowlist
 *
 * Off-chain data (DB):
 *   - granteeIdentity (DID, email), scope[], auditLog[]
 *   - PII (ชื่อ/ที่อยู่/โทร)
 */
contract VehicleConsent {
    // ─── Structs ─────────────────────────────────────────────
    struct Grant {
        bytes32 granteeDid;     // keccak256(DID)
        uint64  scopeMask;      // bitmask ของสิทธิ์อ่าน
        uint64  expiresAt;      // unix timestamp หมดอายุ
        uint64  nonce;          // ป้องกัน replay
        bool    singleUse;      // ใช้ได้ครั้งเดียว
        bool    used;           // ใช้แล้วหรือยัง (สำหรับ singleUse)
        bool    revoked;        // ถูก revoke
    }

    // ─── Scope Bitmask Constants ─────────────────────────────
    uint64 public constant SCOPE_VEHICLE_IDENTITY    = 1 << 0;
    uint64 public constant SCOPE_MAINTENANCE_FULL    = 1 << 1;
    uint64 public constant SCOPE_MAINTENANCE_SUMMARY = 1 << 2;
    uint64 public constant SCOPE_CLAIMS_FULL         = 1 << 3;
    uint64 public constant SCOPE_CLAIMS_SUMMARY      = 1 << 4;
    uint64 public constant SCOPE_OWNERSHIP_HISTORY   = 1 << 5;
    uint64 public constant SCOPE_INSPECTION_HISTORY  = 1 << 6;
    uint64 public constant SCOPE_ODOMETER_TREND      = 1 << 7;
    uint64 public constant SCOPE_PII                 = 1 << 8;

    // ─── State ───────────────────────────────────────────────
    VehicleNFT public vehicleNFT;

    /// tokenId → grantHash → Grant
    mapping(uint256 => mapping(bytes32 => Grant)) public grants;

    /// tokenId → granted DID hashes (for enumeration)
    mapping(uint256 => bytes32[]) private _grantKeys;

    // ─── Events ──────────────────────────────────────────────
    event ConsentGranted(
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 granteeDid,
        uint64  scopeMask,
        uint64  expiresAt,
        uint64  nonce,
        bool    singleUse,
        bytes32 grantHash
    );

    event ConsentRevoked(
        uint256 indexed tokenId,
        bytes32 grantHash
    );

    event ConsentUsed(
        uint256 indexed tokenId,
        bytes32 grantHash,
        address accessor
    );

    // ─── Constructor ─────────────────────────────────────────
    constructor(address _vehicleNFT) {
        vehicleNFT = VehicleNFT(_vehicleNFT);
    }

    // ─── Grant ───────────────────────────────────────────────
    /**
     * @notice เจ้าของรถให้สิทธิ์อ่านข้อมูลแก่บุคคล/องค์กร
     */
    function grantConsent(
        uint256 tokenId,
        bytes32 granteeDid,
        uint64  scopeMask,
        uint64  expiresAt,
        bool    singleUse,
        uint64  nonce
    ) external returns (bytes32 grantHash) {
        require(vehicleNFT.ownerOf(tokenId) == msg.sender, "Not vehicle owner");
        require(expiresAt > block.timestamp, "Already expired");
        require(scopeMask > 0, "Empty scope");

        grantHash = keccak256(abi.encode(
            tokenId, granteeDid, scopeMask, expiresAt, singleUse, nonce
        ));

        require(grants[tokenId][grantHash].nonce == 0, "Grant already exists");

        grants[tokenId][grantHash] = Grant({
            granteeDid: granteeDid,
            scopeMask: scopeMask,
            expiresAt: expiresAt,
            nonce: nonce,
            singleUse: singleUse,
            used: false,
            revoked: false
        });

        _grantKeys[tokenId].push(grantHash);

        emit ConsentGranted(
            tokenId, msg.sender, granteeDid, scopeMask,
            expiresAt, nonce, singleUse, grantHash
        );
    }

    // ─── Revoke ──────────────────────────────────────────────
    /**
     * @notice ถอนสิทธิ์
     */
    function revokeConsent(uint256 tokenId, bytes32 grantHash) external {
        require(vehicleNFT.ownerOf(tokenId) == msg.sender, "Not vehicle owner");
        require(!grants[tokenId][grantHash].revoked, "Already revoked");

        grants[tokenId][grantHash].revoked = true;
        emit ConsentRevoked(tokenId, grantHash);
    }

    // ─── Verify (called by backend / other contracts) ────────
    /**
     * @notice ตรวจสอบว่า grant ยัง valid อยู่ไหม
     * @return valid   true ถ้าใช้ได้
     * @return scope   scopeMask ของ grant
     */
    function verifyConsent(
        uint256 tokenId,
        bytes32 grantHash
    ) external returns (bool valid, uint64 scope) {
        Grant storage g = grants[tokenId][grantHash];

        if (g.nonce == 0 || g.revoked) return (false, 0);
        if (block.timestamp > g.expiresAt) return (false, 0);
        if (g.singleUse && g.used) return (false, 0);

        // Mark used
        if (g.singleUse) {
            g.used = true;
        }

        emit ConsentUsed(tokenId, grantHash, msg.sender);
        return (true, g.scopeMask);
    }

    // ─── View ────────────────────────────────────────────────
    function getGrant(uint256 tokenId, bytes32 grantHash) external view returns (Grant memory) {
        return grants[tokenId][grantHash];
    }

    function isGrantValid(uint256 tokenId, bytes32 grantHash) external view returns (bool) {
        Grant storage g = grants[tokenId][grantHash];
        if (g.nonce == 0 || g.revoked) return false;
        if (block.timestamp > g.expiresAt) return false;
        if (g.singleUse && g.used) return false;
        return true;
    }
}
