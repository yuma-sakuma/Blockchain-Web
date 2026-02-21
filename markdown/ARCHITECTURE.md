# Vehicle Lifecycle Management – Blockchain Architecture

ระบบจัดการวงจรชีวิตรถยนต์บน Blockchain ตั้งแต่ผลิตจนถึงปลดระวาง
โดยแบ่งข้อมูลเป็น **On-chain** (Smart Contract) และ **Off-chain** (Database / IPFS)

---

## สารบัญ

1. [หลักการออกแบบ](#1-หลักการออกแบบ)
2. [โครงสร้างไฟล์](#2-โครงสร้างไฟล์)
3. [Smart Contracts (On-chain)](#3-smart-contracts-on-chain)
4. [TypeORM Entities (Off-chain)](#4-typeorm-entities-off-chain)
5. [ตาราง On-chain vs Off-chain แยกตาม Use Case](#5-ตาราง-on-chain-vs-off-chain-แยกตาม-use-case)
6. [Enum Reference](#6-enum-reference)
7. [ความสัมพันธ์ระหว่าง Entity (ER Diagram)](#7-ความสัมพันธ์ระหว่าง-entity)
8. [Flow การทำงานหลัก](#8-flow-การทำงานหลัก)

---

## 1. หลักการออกแบบ

### ทำไมต้องแบ่ง On-chain / Off-chain?

| เกณฑ์ | On-chain (Blockchain) | Off-chain (Database) |
|---|---|---|
| **จุดแข็ง** | ตรวจสอบได้ (immutable), โปร่งใส, บังคับ business rule | ยืดหยุ่น, ค้นหาเร็ว, เก็บข้อมูลใหญ่ได้, ลบ/แก้ไขได้ |
| **ค่าใช้จ่าย** | แพง (gas fee ทุก transaction) | ถูก |
| **ความเป็นส่วนตัว** | ทุกคนอ่านได้ | ควบคุมสิทธิ์ได้ |

### กฎในการตัดสินใจ

```
ขึ้น On-chain เมื่อ:
  ✓ ต้องพิสูจน์ตัวตน/ความเป็นเจ้าของ (NFT, ownership)
  ✓ ต้องป้องกันการปลอมแปลง (hash ของเอกสาร/ข้อมูล)
  ✓ ต้องบังคับ business rule (transfer lock, lien, consent)
  ✓ ต้องโปร่งใส/ตรวจสอบย้อนกลับ (event log)

เก็บ Off-chain เมื่อ:
  ✗ ข้อมูลส่วนบุคคล (PII) – ชื่อ, ที่อยู่, เบอร์โทร
  ✗ ข้อมูลขนาดใหญ่ – รูปภาพ, PDF, วิดีโอ
  ✗ ข้อมูลที่ต้องค้นหา/กรอง/จัดเรียงบ่อย
  ✗ ราคา/จำนวนเงินที่ไม่ต้องการเปิดเผย
```

### การเชื่อมต่อ On-chain ↔ Off-chain

```
┌─────────────┐     hash(data)      ┌─────────────┐
│  Off-chain  │ ──────────────────→ │  On-chain   │
│  (Database) │                     │  (Contract) │
│             │ ←── txHash ──────── │             │
│  เก็บข้อมูล  │                     │  เก็บ hash  │
│  ฉบับเต็ม    │                     │  + metadata │
└─────────────┘                     └─────────────┘

วิธี verify:
1. ดึงข้อมูลจาก Off-chain
2. hash ข้อมูลนั้น
3. เทียบกับ hash ที่เก็บบน On-chain
4. ถ้าตรงกัน = ข้อมูลไม่ถูกแก้ไข ✓
```

---

## 2. โครงสร้างไฟล์

```
project/
├── contracts/                          # ── Smart Contracts (On-chain) ──
│   ├── VehicleNFT.sol                  #   Core ERC-721 + Vehicle Identity
│   ├── VehicleRegistry.sol             #   กรมขนส่ง: จดทะเบียน/ป้าย/ภาษี/ธง
│   ├── VehicleLifecycle.sol            #   ซ่อม/ประกัน/เคลม/โอน/disclosure
│   ├── VehicleConsent.sol              #   สิทธิ์อ่านข้อมูล
│   └── VehicleLien.sol                 #   ไฟแนนซ์ Lien + Escrow
│
└── src/entities/                       # ── TypeORM Entities (Off-chain) ──
    ├── enums/index.ts                  #   Enum ทั้งหมด (15 enums)
    ├── vehicle.entity.ts               #   ตัวตนรถ (หลัก)
    ├── event-log.entity.ts             #   Event sourcing log
    ├── consent-grant.entity.ts         #   สิทธิ์เข้าถึงข้อมูล
    ├── registration.entity.ts          #   เล่มเขียวดิจิทัล
    ├── plate-record.entity.ts          #   ป้ายทะเบียน
    ├── tax-payment.entity.ts           #   ภาษี/ต่อทะเบียน
    ├── vehicle-flag.entity.ts          #   ธงสถานะ
    ├── inspection.entity.ts            #   ผลตรวจสภาพ (ตรอ.)
    ├── maintenance-log.entity.ts       #   ประวัติซ่อม
    ├── part-replacement.entity.ts      #   เปลี่ยนอะไหล่
    ├── insurance-policy.entity.ts      #   กรมธรรม์ประกัน
    ├── insurance-claim.entity.ts       #   เคลมประกัน
    ├── loan-account.entity.ts          #   สินเชื่อ/เช่าซื้อ
    ├── ownership-transfer.entity.ts    #   โอนกรรมสิทธิ์
    ├── disclosure.entity.ts            #   เปิดเผยข้อมูล (ป้องกันย้อมแมว)
    ├── trade-in-evaluation.entity.ts   #   ประเมินรถ Trade-in
    └── index.ts                        #   Re-export ทั้งหมด
```

---

## 3. Smart Contracts (On-chain)

### 3.1 VehicleNFT.sol – ตัวตนรถ

**หน้าที่:** ERC-721 NFT แทนรถแต่ละคัน + ควบคุมการโอน

**Roles:**

| Role | สิทธิ์ | ใครได้ |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | จัดการ role ทั้งหมด | ผู้ดูแลระบบ |
| `MANUFACTURER_ROLE` | mint รถใหม่ | โรงงานผลิต |
| `REGISTRY_ROLE` | ตั้ง/ปลด transfer lock | VehicleRegistry contract |
| `LIEN_ROLE` | ตั้ง/ปลด transfer lock | VehicleLien contract |

**ข้อมูลที่เก็บ (per tokenId):**

```solidity
struct VehicleIdentity {
    bytes32 vinHash;          // keccak256(VIN) – ป้องกันสวม VIN
    address manufacturerId;   // wallet ผู้ผลิต
    uint64  manufacturedAt;   // unix timestamp วันผลิต
    bytes32 modelHash;        // hash(modelJson)
    bytes32 specHash;         // hash(specJson)
}

mapping(uint256 => bool) transferLocked;  // ล็อกการโอน
mapping(bytes32 => bool) _usedVins;       // ป้องกัน VIN ซ้ำ
```

**Functions:**

| Function | ใครเรียก | ทำอะไร |
|---|---|---|
| `mintVehicle()` | MANUFACTURER | สร้าง NFT รถใหม่ |
| `setTransferLock()` | REGISTRY / LIEN | ล็อก/ปลดล็อกการโอน |
| `getVehicle()` | ใครก็ได้ | ดูข้อมูลรถ |
| `isVinUsed()` | ใครก็ได้ | เช็ค VIN ซ้ำ |

**การป้องกัน:**
- ทุกการ transfer จะเช็ค `transferLocked` ผ่าน `_update()` override
- VIN ที่ mint แล้วจะ mint ซ้ำไม่ได้

---

### 3.2 VehicleRegistry.sol – กรมการขนส่ง (DLT)

**หน้าที่:** จดทะเบียน, จัดการป้าย, ภาษี, ธงสถานะ, ผลตรวจสภาพ

**Roles:**

| Role | ใครได้ |
|---|---|
| `DLT_OFFICER_ROLE` | เจ้าหน้าที่กรมขนส่ง |
| `INSPECTOR_ROLE` | สถานตรวจสภาพ (ตรอ.) |

**ข้อมูลที่เก็บ:**

```solidity
// จดทะเบียน
struct RegistrationData {
    bool      isRegistered;
    uint64    registeredAt;
    address   dltOfficer;
    bytes32   greenBookNoHash;    // hash เลขเล่มเขียว
    bytes32   registrationDocHash;
    RegStatus status;             // Unregistered/Registered/Suspended/Cancelled
}

// ธงสถานะ (bitmask)
mapping(uint256 => uint64) flags;
// bit 0 = STOLEN      (รถหาย)
// bit 1 = SEIZED       (ถูกอายัด)
// bit 2 = MAJOR_ACCIDENT (ชนหนัก)
// bit 3 = FLOOD        (น้ำท่วม)
// bit 4 = TOTAL_LOSS   (ซาก)
// bit 5 = SCRAPPED     (ทำลายแล้ว)
// bit 6 = REG_CANCELLED (ยกเลิกทะเบียน)

// cache ผลตรวจสภาพ
mapping(uint256 => uint64) lastInspectionPassAt;
```

**Events (บันทึกเป็น event เพื่อประหยัด gas):**

| Event | เมื่อไหร่ |
|---|---|
| `VehicleRegistered` | จดทะเบียนครั้งแรก |
| `RegistrationStatusChanged` | เปลี่ยนสถานะ (suspend/cancel) |
| `PlateEventRecorded` | ออกป้าย/เปลี่ยนป้าย/ป้ายหาย |
| `TaxPaid` | ชำระภาษีประจำปี |
| `FlagUpdated` | ตั้ง/ปิดธงสถานะ |
| `InspectionRecorded` | บันทึกผลตรวจสภาพ |

**Business Rules ที่บังคับ:**
- `recordTaxPayment()` → ต้องมีผลตรวจสภาพผ่านภายใน `inspectionMaxAge` (default 365 วัน)
- `setFlag(STOLEN/SEIZED/TOTAL_LOSS)` → auto lock transfer
- `setRegistrationStatus(Cancelled)` → auto lock transfer + ติด flag

---

### 3.3 VehicleLifecycle.sol – บันทึกเหตุการณ์ตลอดชีวิตรถ

**หน้าที่:** บันทึกซ่อม, ประกัน, เคลม, โอนกรรมสิทธิ์, disclosure, consent เขียน

**Roles:**

| Role | ใครได้ |
|---|---|
| `DEALER_ROLE` | ดีลเลอร์/ร้านขาย |
| `WORKSHOP_ROLE` | อู่ซ่อม/ศูนย์บริการ |
| `INSURER_ROLE` | บริษัทประกัน |

**Functions หลัก:**

| Function | ใครเรียก | ทำอะไร |
|---|---|---|
| `grantWriteConsent()` | เจ้าของรถ | อนุญาตให้อู่เขียน record |
| `revokeWriteConsent()` | เจ้าของรถ | ถอนสิทธิ์เขียน |
| `logMaintenance()` | WORKSHOP | บันทึกซ่อม (ต้องมี consent) |
| `recordTransfer()` | เจ้าของ/DEALER | บันทึกการโอนกรรมสิทธิ์ |
| `recordDisclosure()` | เจ้าของ/DEALER | เปิดเผยข้อมูลก่อนขาย |
| `recordInsurancePolicy()` | INSURER | บันทึกกรมธรรม์ |
| `fileClaim()` | INSURER | เปิดเคลม |
| `updateClaimStatus()` | INSURER | อัปเดตสถานะเคลม |
| `logEvent()` | ใครก็ได้ | บันทึก event ทั่วไป |

**Events ที่ emit:**

```
OwnershipTransferred   → from, to, reason, saleContractHash, buyerOwnerId
DisclosureRecorded     → seller, buyerOwnerId, disclosedItemsMask, ackHash
MaintenanceLogged      → workshop, mileageKm, maintenanceHash, accidentSeverity
InsurancePolicyEvent   → insurer, policyNoHash, action, validFrom, validTo
ClaimFiled             → claimNoHash, evidenceHashes[], severity
ClaimStatusUpdated     → claimNoHash, newStatus
GenericEvent           → eventType, actor, payloadHash, evidenceHash
```

---

### 3.4 VehicleConsent.sol – สิทธิ์อ่านข้อมูล

**หน้าที่:** เจ้าของรถจัดการว่าใครดูข้อมูลอะไรได้บ้าง

**Scope Bitmask:**

```
bit 0 = VEHICLE_IDENTITY      ข้อมูลตัวตนรถ
bit 1 = MAINTENANCE_FULL      ประวัติซ่อมเต็ม
bit 2 = MAINTENANCE_SUMMARY   สรุปประวัติซ่อม
bit 3 = CLAIMS_FULL           ประวัติเคลมเต็ม
bit 4 = CLAIMS_SUMMARY        สรุปเคลม
bit 5 = OWNERSHIP_HISTORY     ประวัติเจ้าของ
bit 6 = INSPECTION_HISTORY    ประวัติตรวจสภาพ
bit 7 = ODOMETER_TREND        แนวโน้มเลขไมล์
bit 8 = PII                   ข้อมูลส่วนบุคคล
```

**ข้อมูลที่เก็บ (per grant):**

```solidity
struct Grant {
    bytes32 granteeDid;     // keccak256(DID) ผู้ได้รับสิทธิ์
    uint64  scopeMask;      // bitmask สิทธิ์
    uint64  expiresAt;      // หมดอายุเมื่อไหร่
    uint64  nonce;          // ป้องกัน replay attack
    bool    singleUse;      // ใช้ได้ครั้งเดียว
    bool    used;           // ใช้แล้วหรือยัง
    bool    revoked;        // ถูกถอนแล้ว
}
```

**Functions:**

| Function | ทำอะไร |
|---|---|
| `grantConsent()` | ให้สิทธิ์อ่าน |
| `revokeConsent()` | ถอนสิทธิ์ |
| `verifyConsent()` | ตรวจสอบสิทธิ์ (เรียกจาก backend) |
| `isGrantValid()` | เช็คว่ายัง valid ไหม (view) |

---

### 3.5 VehicleLien.sol – ไฟแนนซ์ + Escrow

**หน้าที่:** จัดการภาระผูกพัน (Lien) และ Escrow สำหรับซื้อขาย P2P

**Lien (ภาระผูกพัน):**

```solidity
struct Lien {
    address    lender;               // ผู้ให้สินเชื่อ
    LienStatus status;               // None/Active/Released/Defaulted
    bytes32    loanContractHash;     // hash สัญญา
    uint64     startedAt;
    bytes32    releaseConditionHash; // เงื่อนไขปลดล็อก
}
```

| Function | ทำอะไร |
|---|---|
| `createLien()` | สร้างภาระผูกพัน + auto lock transfer |
| `releaseLien()` | ปลดภาระ + auto unlock transfer |
| `markDefault()` | ตั้งสถานะค้างชำระ |

**Escrow (ซื้อขาย P2P แบบมีเงื่อนไข):**

```solidity
struct Escrow {
    bytes32     escrowId;
    uint256     tokenId;
    address     buyer;
    address     seller;
    uint64      conditionsMask;   // 1=payment_confirmed, 2=lien_released
    address     depositAsset;     // ERC20 หรือ address(0) = native coin
    uint256     depositAmount;
    EscrowState state;            // Created/Funded/Released/Cancelled
}
```

**Flow:**
```
1. Seller สร้าง Escrow       → createEscrow()
2. Buyer วางเงิน             → fundEscrowNative() / fundEscrowERC20()
3. Fulfill เงื่อนไข           → fulfillCondition()
4. ครบเงื่อนไข → Auto Release → เงินไปที่ seller
   หรือ ยกเลิก               → cancelEscrow() → คืนเงิน buyer
```

---

## 4. TypeORM Entities (Off-chain)

### 4.1 Vehicle – ตัวตนรถ (ตารางหลัก)

**ตาราง:** `vehicles`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `tokenId` | bigint (PK) | ตรงกับ NFT tokenId | ✅ |
| `vinNumber` | varchar(17) | VIN เต็ม (encrypt at rest) | ❌ เก็บแค่ hash |
| `vinHash` | varchar(66) | keccak256(VIN) | ✅ |
| `manufacturerAddress` | varchar(42) | wallet ผู้ผลิต | ✅ |
| `manufacturedAt` | bigint | unix timestamp | ✅ |
| `modelJson` | jsonb | `{model, year}` | ❌ เก็บแค่ hash |
| `modelHash` | varchar(66) | hash(modelJson) | ✅ |
| `specJson` | jsonb | สเปกเต็ม (สี, แบต, options) | ❌ เก็บแค่ hash |
| `specHash` | varchar(66) | hash(specJson) | ✅ |
| `manufacturerSignature` | text | ลายเซ็นผู้ผลิต | ❌ |
| `mintTxHash` | varchar(66) | tx hash ตอน mint | อ่านจาก chain ได้ |
| `registrationStatus` | enum | สถานะจดทะเบียน (cache) | ✅ |
| `transferLocked` | boolean | ล็อกการโอน (cache) | ✅ |
| `activeFlags` | simple-array | ธงสถานะที่ active | ✅ (bitmask) |
| `currentOwnerAddress` | varchar(42) | เจ้าของปัจจุบัน | ✅ (ownerOf) |
| `ownerCount` | int | จำนวนเจ้าของ | ❌ (นับจาก events) |

**Relations:** → EventLog, ConsentGrant, Registration, PlateRecord, TaxPayment, Inspection, MaintenanceLog, InsurancePolicy, InsuranceClaim, LoanAccount, OwnershipTransfer, Disclosure, TradeInEvaluation, VehicleFlagRecord

---

### 4.2 EventLog – บันทึกเหตุการณ์ (Event Sourcing)

**ตาราง:** `event_logs`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `eventId` | uuid (PK) | ID ของ event | ❌ |
| `tokenId` | bigint (FK) | รถคันไหน | ✅ |
| `type` | enum EventType | ประเภท event | ✅ (uint32) |
| `actorAddress` | varchar(42) | ใครทำ | ✅ |
| `actorRole` | enum ActorRole | บทบาท | ❌ |
| `occurredAt` | bigint | เวลาเกิด event | ✅ |
| `payload` | jsonb | ข้อมูลละเอียด | ❌ เก็บแค่ hash |
| `payloadHash` | varchar(66) | hash(payload) | ✅ |
| `evidence` | jsonb | หลักฐาน `[{cid, url, hash, mime, size}]` | ❌ เก็บแค่ hash |
| `evidenceHash` | varchar(66) | hash รวมหลักฐาน | ✅ |
| `txHash` | varchar(66) | tx hash ที่บันทึก | อ่านจาก chain |

---

### 4.3 ConsentGrant – สิทธิ์เข้าถึงข้อมูล

**ตาราง:** `consent_grants`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `ownerAddress` | varchar(42) | เจ้าของที่ให้สิทธิ์ | ✅ (implicit) |
| `granteeDid` | varchar(255) | DID ผู้รับสิทธิ์ | ❌ เก็บแค่ hash |
| `granteeVerified` | boolean | ยืนยัน DID แล้ว | ❌ |
| `granteeEmail` | varchar(255) | email | ❌ |
| `scopes` | simple-array | scope ที่อ่านได้ | ❌ (ใช้ bitmask) |
| `scopeMask` | bigint | bitmask สิทธิ์ | ✅ |
| `expiresAt` | bigint | หมดอายุ | ✅ |
| `singleUse` | boolean | ใช้ครั้งเดียว | ✅ |
| `nonce` | bigint | ป้องกัน replay | ✅ |
| `grantHash` | varchar(66) | hash(policy) | ✅ |
| `revoked` | boolean | ถูกถอนแล้ว | ✅ |
| `auditLog` | jsonb | ประวัติการเข้าถึง | ❌ |

---

### 4.4 Registration – เล่มเขียวดิจิทัล

**ตาราง:** `registrations`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `status` | enum | สถานะจดทะเบียน | ✅ |
| `registeredAt` | bigint | วันจดทะเบียน | ✅ |
| `dltOfficerAddress` | varchar(42) | เจ้าหน้าที่ | ✅ |
| `greenBookNo` | varchar(50) | เลขเล่มเขียว (plain) | ❌ |
| `greenBookNoHash` | varchar(66) | hash(เลขเล่ม) | ✅ |
| `registrationDocUrl` | text | CID/URL เอกสาร | ❌ |
| `registrationDocHash` | varchar(66) | hash เอกสาร | ✅ |
| `ownerIdentityAtReg` | jsonb | PII เจ้าของ | ❌ |

---

### 4.5 PlateRecord – ประวัติป้ายทะเบียน

**ตาราง:** `plate_records`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `plateNo` | varchar(20) | เลขป้าย (plain) | ❌ |
| `plateNoHash` | varchar(66) | hash(เลขป้าย) | ✅ |
| `provinceCode` | smallint | รหัสจังหวัด | ✅ |
| `eventType` | enum | Issue/Change/Lost | ✅ |
| `effectiveAt` | bigint | วันมีผล | ✅ |
| `plateEventDocHash` | varchar(66) | hash เอกสาร | ✅ |
| `policeReportUrl` | text | ใบแจ้งความ (กรณีหาย) | ❌ |
| `reason` | text | เหตุผล | ❌ |

---

### 4.6 TaxPayment – ภาษีประจำปี

**ตาราง:** `tax_payments`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `taxYear` | smallint | ปีภาษี (พ.ศ.) | ✅ |
| `paidAt` | bigint | วันชำระ | ✅ |
| `validUntil` | bigint | หมดอายุ | ✅ |
| `status` | enum | Paid/Unpaid/Overdue | ✅ |
| `receiptHash` | varchar(66) | hash ใบเสร็จ | ✅ |
| `receiptUrl` | text | CID/URL ใบเสร็จ | ❌ |
| `amount` | bigint | จำนวนเงิน (สตางค์) | ❌ |
| `paymentChannel` | enum | ช่องทาง | ❌ |

---

### 4.7 VehicleFlagRecord – ธงสถานะ

**ตาราง:** `vehicle_flags`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `flag` | enum VehicleFlag | ประเภท flag | ✅ (bitmask) |
| `active` | boolean | เปิด/ปิด | ✅ |
| `sourceAddress` | varchar(42) | แหล่งที่มา | ✅ |
| `refHash` | varchar(66) | hash เอกสารอ้างอิง | ✅ |
| `caseDocUrl` | text | CID/URL เอกสาร | ❌ |
| `details` | jsonb | รายละเอียด | ❌ |
| `statusTimeline` | jsonb | ไทม์ไลน์สถานะ | ❌ |

---

### 4.8 Inspection – ผลตรวจสภาพ (ตรอ.)

**ตาราง:** `inspections`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `stationAddress` | varchar(42) | wallet สถานตรวจ | ✅ |
| `stationName` | varchar(100) | ชื่อสถานตรวจ | ❌ |
| `vinVerified` | boolean | ยืนยัน VIN | ✅ (implicit) |
| `result` | enum | Pass/Fail | ✅ |
| `metrics` | jsonb | ค่าเกณฑ์ (ไอเสีย/เบรก/ไฟ/ช่วงล่าง) | ❌ เก็บแค่ hash |
| `metricsHash` | varchar(66) | hash(metrics) | ✅ |
| `certHash` | varchar(66) | hash ใบรับรอง | ✅ |
| `certUrl` | text | CID/URL ใบรับรอง PDF | ❌ |
| `issuedAt` | bigint | วันออกใบรับรอง | ✅ |

---

### 4.9 MaintenanceLog – ประวัติซ่อม

**ตาราง:** `maintenance_logs`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `workshopAddress` | varchar(42) | wallet อู่ | ✅ |
| `writeConsentRefHash` | varchar(66) | hash consent อ้างอิง | ✅ |
| `mileageKm` | int | เลขไมล์ | ✅ |
| `occurredAt` | bigint | วันที่ซ่อม | ✅ |
| `symptoms` | text | อาการ | ❌ |
| `jobs` | simple-array | รายการงาน | ❌ |
| `laborCost` | bigint | ค่าแรง | ❌ |
| `maintenanceHash` | varchar(66) | hash(details) | ✅ |
| `partsHash` | varchar(66) | hash(parts) | ✅ |
| `accidentSeverity` | enum | None/Minor/Major/Structural | ✅ |
| `invoiceUrl` | text | ใบแจ้งหนี้ | ❌ |
| `technicianId` | varchar(50) | รหัสช่าง | ❌ |
| `photos` | jsonb | รูปก่อน/หลัง | ❌ |

**Relations:** → PartReplacement[]

---

### 4.10 PartReplacement – เปลี่ยนอะไหล่

**ตาราง:** `part_replacements`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `maintenanceLogId` | uuid (FK) | | ❌ |
| `partType` | varchar(100) | ประเภท (แบต EV, ถุงลม, ECU) | ❌ |
| `partNo` | varchar(50) | Part Number | ❌ |
| `serialNo` | varchar(100) | Serial Number | ❌ |
| `qty` | smallint | จำนวน | ❌ |
| `unitPrice` | bigint | ราคา/ชิ้น | ❌ |

> hash รวมของ parts อยู่ใน `MaintenanceLog.partsHash` บน chain

---

### 4.11 InsurancePolicy – กรมธรรม์ประกัน

**ตาราง:** `insurance_policies`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `insurerAddress` | varchar(42) | wallet บริษัทประกัน | ✅ |
| `policyNo` | varchar(50) | เลขกรมธรรม์ (plain) | ❌ |
| `policyNoHash` | varchar(66) | hash(เลขกรมธรรม์) | ✅ |
| `action` | enum | New/Renew/Change/Cancel | ✅ |
| `validFrom` | bigint | เริ่มคุ้มครอง | ✅ |
| `validTo` | bigint | สิ้นสุดคุ้มครอง | ✅ |
| `coverageDetails` | jsonb | รายละเอียดความคุ้มครอง | ❌ เก็บแค่ hash |
| `coverageHash` | varchar(66) | hash(coverage) | ✅ |
| `premiumAmount` | bigint | เบี้ยประกัน | ❌ |
| `deductible` | bigint | ค่าเสียหายส่วนแรก | ❌ |
| `policyDocUrl` | text | CID/URL เอกสาร | ❌ |

---

### 4.12 InsuranceClaim – เคลมประกัน

**ตาราง:** `insurance_claims`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `claimNo` | varchar(50) | เลขเคลม (plain) | ❌ |
| `claimNoHash` | varchar(66) | hash(เลขเคลม) | ✅ |
| `filedAt` | bigint | วันเปิดเคลม | ✅ |
| `status` | enum ClaimStatus | สถานะ | ✅ |
| `severity` | enum ClaimSeverity | ความรุนแรง | ✅ |
| `evidenceFiles` | jsonb | หลักฐาน `[{type, cid, hash, mime}]` | ❌ เก็บแค่ hashes |
| `evidenceHashes` | simple-array | hash ของหลักฐาน | ✅ |
| `estimateDocUrl` | text | ใบเสนอราคาซ่อม | ❌ |
| `fraudSignals` | jsonb | สัญญาณทุจริต (internal) | ❌ |

---

### 4.13 LoanAccount – สินเชื่อ/เช่าซื้อ

**ตาราง:** `loan_accounts`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `lenderAddress` | varchar(42) | wallet ผู้ให้สินเชื่อ | ✅ |
| `lienStatus` | enum | None/Active/Released/Defaulted | ✅ |
| `loanAccountNo` | varchar(50) | เลขบัญชี | ❌ |
| `principal` | bigint | เงินต้น | ❌ |
| `interestRateBps` | smallint | ดอกเบี้ย (basis points) | ❌ |
| `termMonths` | smallint | จำนวนเดือน | ❌ |
| `loanContractHash` | varchar(66) | hash สัญญา | ✅ |
| `contractDocUrl` | text | CID/URL สัญญา | ❌ |
| `startedAt` | bigint | วันเริ่ม | ✅ |
| `releaseConditionHash` | varchar(66) | hash เงื่อนไขปลดล็อก | ✅ |
| `borrowerKycRef` | varchar(100) | อ้างอิง KYC | ❌ |

---

### 4.14 OwnershipTransfer – โอนกรรมสิทธิ์

**ตาราง:** `ownership_transfers`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `fromAddress` | varchar(42) | ผู้โอน | ✅ |
| `toAddress` | varchar(42) | ผู้รับโอน | ✅ |
| `reason` | enum TransferReason | เหตุผล | ✅ |
| `transferredAt` | bigint | วันโอน | ✅ |
| `saleContractHash` | varchar(66) | hash สัญญา | ✅ |
| `buyerOwnerIdHash` | varchar(66) | hash(buyerDID) | ✅ |
| `docHash` | varchar(66) | hash เอกสาร | ✅ |
| `paymentRefHash` | varchar(66) | hash หลักฐานจ่ายเงิน | ✅ |
| `buyerProfile` | jsonb | PII ผู้ซื้อ | ❌ |
| `sellerProfile` | jsonb | PII ผู้ขาย | ❌ |
| `salePrice` | bigint | ราคา | ❌ |
| `currency` | varchar(10) | สกุลเงิน | ❌ |
| `paymentMethod` | enum | Cash/Bank/Crypto | ❌ |
| `contractDocUrl` | text | CID/URL สัญญา | ❌ |
| `deliveryChecklistUrl` | text | CID/URL checklist | ❌ |
| `receiptUrl` | text | CID/URL ใบเสร็จ | ❌ |
| `escrowContract` | varchar(42) | address escrow | ✅ (ถ้ามี) |
| `paymentTxHash` | varchar(66) | tx hash ชำระเงิน | ✅ (ถ้า crypto) |
| `dealerBranchId` | varchar(50) | สาขาดีลเลอร์ | ❌ |
| `inventoryLotNo` | varchar(50) | เลข lot | ❌ |
| `vehicleConditionAtReceive` | jsonb | สภาพตอนรับ | ❌ |

---

### 4.15 Disclosure – เปิดเผยข้อมูล (ป้องกันย้อมแมว)

**ตาราง:** `disclosures`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `sellerAddress` | varchar(42) | ผู้ขาย | ✅ |
| `buyerOwnerIdHash` | varchar(66) | hash(buyerDID) | ✅ |
| `disclosedItemsMask` | bigint | bitmask (flood, structural, accident) | ✅ |
| `ackHash` | varchar(66) | hash เอกสารยอมรับ | ✅ |
| `signedAt` | bigint | วันลงนาม | ✅ |
| `disclosureDocUrl` | text | CID/URL เอกสาร | ❌ |
| `fullDisclosureText` | text | ข้อความเต็ม | ❌ |
| `buyerSignatureImageUrl` | text | CID/URL ลายเซ็น | ❌ |
| `witness` | jsonb | ข้อมูลพยาน | ❌ |

---

### 4.16 TradeInEvaluation – ประเมินรถ Trade-in

**ตาราง:** `trade_in_evaluations`

| Column | Type | คำอธิบาย | มี On-chain? |
|---|---|---|---|
| `id` | uuid (PK) | | ❌ |
| `tokenId` | bigint (FK) | | ✅ |
| `evaluatorAddress` | varchar(42) | wallet ผู้ประเมิน | ✅ (implicit) |
| `evaluationHash` | varchar(66) | hash รายงาน | ✅ |
| `mileageAtEval` | int | ไมล์ ณ ตอนประเมิน | ✅ (optional) |
| `score` | smallint | คะแนน (0-100) | ❌ |
| `offerPrice` | bigint | ราคาเสนอ | ❌ |
| `notes` | text | หมายเหตุ | ❌ |
| `signalsUsed` | simple-array | ข้อมูลที่ใช้ตัดสินใจ | ❌ |
| `photos` | jsonb | รูปถ่าย | ❌ |
| `accepted` | boolean | ตกลงซื้อหรือไม่ | ❌ |

---

## 5. ตาราง On-chain vs Off-chain แยกตาม Use Case

### ผู้ผลิต (Manufacturer)

| ข้อมูล | On-chain | Off-chain |
|---|---|---|
| tokenId, vinHash | ✅ | ✅ (cache) |
| VIN เต็ม | ❌ | ✅ (encrypt) |
| modelHash, specHash | ✅ | ✅ (cache) |
| modelJson, specJson | ❌ | ✅ |
| manufacturerSignature | ❌ | ✅ |

### ดีลเลอร์ (Dealer)

| ข้อมูล | On-chain | Off-chain |
|---|---|---|
| Transfer from/to/reason | ✅ | ✅ |
| เอกสารส่งมอบ | hash เท่านั้น | ✅ เต็ม |
| ราคาขาย, PII ผู้ซื้อ | ❌ | ✅ |
| สภาพรถตอนรับ | ❌ | ✅ |
| Disclosure (ย้อมแมว) | bitmask + hash | ✅ เต็ม |
| Trade-in evaluation | hash เท่านั้น | ✅ เต็ม |

### เจ้าของรถ (Owner)

| ข้อมูล | On-chain | Off-chain |
|---|---|---|
| ดูประวัติรถ (read) | อ่าน events | ✅ API |
| โอน P2P | ERC-721 transfer | ✅ เอกสาร |
| Escrow (crypto) | ✅ เต็ม | ✅ ข้อตกลง |
| Consent (สิทธิ์อ่าน) | scope + expiry | ✅ audit log |

### กรมขนส่ง (DLT)

| ข้อมูล | On-chain | Off-chain |
|---|---|---|
| จดทะเบียน (เล่มเขียว) | hash, status, officer | ✅ เลขเล่มเต็ม, PII |
| ป้ายทะเบียน | hash, provinceCode, type | ✅ เลขป้ายเต็ม |
| ภาษี | year, paidAt, validUntil, hash | ✅ จำนวนเงิน, ช่องทาง |
| ธงสถานะ | bitmask, source, refHash | ✅ เอกสาร, timeline |

### ตรอ. (Inspection)

| ข้อมูล | On-chain | Off-chain |
|---|---|---|
| ผล pass/fail | ✅ | ✅ |
| ค่าเกณฑ์ละเอียด | hash เท่านั้น | ✅ เต็ม |
| ใบรับรอง PDF | hash เท่านั้น | ✅ CID/URL |

### ไฟแนนซ์ (Finance)

| ข้อมูล | On-chain | Off-chain |
|---|---|---|
| Lien status, lender | ✅ | ✅ |
| Transfer lock | ✅ (enforce) | ✅ (cache) |
| เลขบัญชี, เงินต้น, ดอกเบี้ย | ❌ | ✅ |
| สัญญา | hash เท่านั้น | ✅ เต็ม |

### ประกันภัย (Insurance)

| ข้อมูล | On-chain | Off-chain |
|---|---|---|
| เลขกรมธรรม์ | hash เท่านั้น | ✅ เต็ม |
| validFrom/To, action | ✅ | ✅ |
| ความคุ้มครอง, เบี้ย | hash / ❌ | ✅ |
| เคลม status, severity | ✅ | ✅ |
| หลักฐานเคลม | hashes[] | ✅ CID/URL |
| Fraud signals | ❌ | ✅ (internal) |

### อู่ซ่อม (Workshop)

| ข้อมูล | On-chain | Off-chain |
|---|---|---|
| workshop address, consent | ✅ | ✅ |
| mileageKm | ✅ | ✅ |
| maintenance/parts hash | ✅ | ✅ |
| accidentSeverity | ✅ | ✅ |
| รายการงาน, ค่าแรง, อะไหล่ | ❌ | ✅ |
| รูปก่อน/หลัง | ❌ | ✅ |

---

## 6. Enum Reference

| Enum | ค่า | ใช้กับ |
|---|---|---|
| `ActorRole` | MANUFACTURER, DEALER, DLT, FINANCE, INSURER, WORKSHOP, INSPECT, OWNER | EventLog |
| `EventType` | VEHICLE_MINTED, INVENTORY_TRANSFER, FIRST_SALE, OWNERSHIP_TRANSFER, TRADE_IN, DISCLOSURE, REGISTRATION, PLATE_*, TAX_PAYMENT, FLAG_UPDATE, INSPECTION, MAINTENANCE, PART_REPLACEMENT, ACCIDENT_REPAIR, INSURANCE_*, CLAIM_*, LIEN_*, CONSENT_* | EventLog |
| `RegistrationStatus` | UNREGISTERED, REGISTERED, SUSPENDED, CANCELLED | Vehicle, Registration |
| `PlateEventType` | ISSUE, CHANGE, LOST | PlateRecord |
| `TaxStatus` | PAID, UNPAID, OVERDUE | TaxPayment |
| `VehicleFlag` | STOLEN, SEIZED, MAJOR_ACCIDENT, FLOOD, TOTAL_LOSS, SCRAPPED, REG_CANCELLED | Vehicle, VehicleFlagRecord |
| `InspectionResult` | PASS, FAIL | Inspection |
| `AccidentSeverity` | NONE, MINOR, MAJOR, STRUCTURAL | MaintenanceLog |
| `InsuranceAction` | NEW, RENEW, CHANGE, CANCEL | InsurancePolicy |
| `ClaimStatus` | FILED, ESTIMATING, APPROVED, REPAIRING, CLOSED, REJECTED | InsuranceClaim |
| `ClaimSeverity` | MINOR, MAJOR, STRUCTURAL, TOTAL_LOSS | InsuranceClaim |
| `LienStatus` | NONE, ACTIVE, RELEASED, DEFAULTED | LoanAccount |
| `EscrowState` | CREATED, FUNDED, RELEASED, CANCELLED | (on-chain only) |
| `PaymentMethod` | CASH, BANK, CRYPTO | TaxPayment, OwnershipTransfer |
| `TransferReason` | INVENTORY_TRANSFER, FIRST_SALE, RESALE, TRADE_IN, LIEN_DEFAULT, INHERITANCE | OwnershipTransfer |
| `ConsentScope` | VEHICLE_IDENTITY, MAINTENANCE_FULL, MAINTENANCE_SUMMARY, CLAIMS_FULL, CLAIMS_SUMMARY, OWNERSHIP_HISTORY, INSPECTION_HISTORY, ODOMETER_TREND, PII | ConsentGrant |

---

## 7. ความสัมพันธ์ระหว่าง Entity

```
                          ┌──────────────────┐
                          │     Vehicle      │
                          │   (vehicles)     │
                          │   PK: tokenId    │
                          └────────┬─────────┘
                                   │ 1
            ┌──────────┬───────────┼───────────┬──────────┐
            │          │           │           │          │
         has many   has many   has many    has many   has many
            │          │           │           │          │
            ▼          ▼           ▼           ▼          ▼
     ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
     │EventLog  ││Registra- ││Ownership ││Mainten-  ││Insurance │
     │          ││tion      ││Transfer  ││anceLog   ││Policy    │
     └──────────┘└──────────┘└──────────┘└────┬─────┘└──────────┘
                                              │ 1
                                           has many
                                              │
                                              ▼
                                        ┌──────────┐
                                        │  Part    │
                                        │Replacem. │
                                        └──────────┘

     Vehicle ─1:N─→ ConsentGrant
     Vehicle ─1:N─→ PlateRecord
     Vehicle ─1:N─→ TaxPayment
     Vehicle ─1:N─→ VehicleFlagRecord
     Vehicle ─1:N─→ Inspection
     Vehicle ─1:N─→ InsuranceClaim
     Vehicle ─1:N─→ LoanAccount
     Vehicle ─1:N─→ Disclosure
     Vehicle ─1:N─→ TradeInEvaluation
```

**Smart Contract Dependencies:**

```
     ┌──────────────┐
     │  VehicleNFT  │ ◄──── ทุก contract อ้างอิง
     │  (ERC-721)   │
     └──────┬───────┘
            │
     ┌──────┴──────┬────────────────┬────────────────┐
     │             │                │                │
     ▼             ▼                ▼                ▼
┌──────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────┐
│ Vehicle  │ │  Vehicle  │ │   Vehicle    │ │  Vehicle   │
│ Registry │ │ Lifecycle │ │   Consent    │ │    Lien    │
│ (DLT)   │ │ (Events)  │ │ (Read Perm)  │ │ (Finance)  │
└──────────┘ └───────────┘ └──────────────┘ └────────────┘
  ↕ setTransferLock           (standalone)    ↕ setTransferLock
```

---

## 8. Flow การทำงานหลัก

### 8.1 Mint รถใหม่ (ผู้ผลิต)

```
1. ผู้ผลิต → VehicleNFT.mintVehicle(to, vinHash, manufacturedAt, modelHash, specHash)
2. Contract ตรวจ: VIN ซ้ำไหม? ผู้เรียกมี MANUFACTURER_ROLE?
3. Mint ERC-721 NFT → tokenId
4. emit VehicleMinted event
5. Backend จับ event → สร้าง Vehicle entity ใน DB
6. เก็บ vinPlain, modelJson, specJson ใน DB (off-chain)
```

### 8.2 จดทะเบียน (กรมขนส่ง)

```
1. DLT → VehicleRegistry.registerVehicle(tokenId, greenBookNoHash, docHash)
2. ตรวจ: ยังไม่เคยจดทะเบียน? มี DLT_OFFICER_ROLE?
3. บันทึก RegistrationData
4. emit VehicleRegistered
5. Backend → สร้าง Registration entity + อัปเดต Vehicle.registrationStatus
```

### 8.3 ซ่อมรถ (อู่)

```
1. เจ้าของ → VehicleLifecycle.grantWriteConsent(tokenId, workshop, scopeMask, ...)
2. อู่ → VehicleLifecycle.logMaintenance(tokenId, consentHash, mileage, ...)
3. Contract ตรวจ: มี consent? มี WORKSHOP_ROLE?
4. emit MaintenanceLogged
5. Backend → สร้าง MaintenanceLog + PartReplacement entities
```

### 8.4 ซื้อขายมือสอง P2P (Escrow)

```
1. Seller → VehicleLien.createEscrow(escrowId, tokenId, buyer, conditions, asset, amount)
2. Buyer  → VehicleLien.fundEscrowNative{value}(escrowId)
3. Finance → VehicleLien.releaseLien(tokenId)          // ถ้าติดไฟแนนซ์
4. Seller  → VehicleLien.fulfillCondition(escrowId, COND_LIEN_RELEASED)
5. ระบบ   → fulfillCondition(escrowId, COND_PAYMENT_CONFIRMED)
6. ครบเงื่อนไข → Auto release → เงินไป seller
7. Seller → VehicleNFT.transferFrom(seller, buyer, tokenId)
8. Backend → สร้าง OwnershipTransfer entity
```

### 8.5 เปิดเคลมประกัน

```
1. Insurer → VehicleLifecycle.fileClaim(tokenId, claimNoHash, evidenceHashes, severity)
2. emit ClaimFiled
3. Backend → สร้าง InsuranceClaim entity + เก็บรูป/เอกสาร
4. อัปเดตสถานะ → VehicleLifecycle.updateClaimStatus(tokenId, hash, newStatus)
5. ถ้า TotalLoss → VehicleRegistry.setFlag(tokenId, FLAG_TOTAL_LOSS, true, refHash)
```

---

> **หมายเหตุ:** ไฟแนนซ์ (Use Case 6) ออกแบบไว้แล้วในระดับ schema
> สามารถ deploy ได้ทันทีหรือเพิ่มเติม business logic ภายหลัง
