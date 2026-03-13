# Vehicle-NFT: Use Cases & Business Logic

> **"Vehicle-NFT: เล่มเขียว + ประวัติรถ + สิทธิ์การโอน/การอ่านข้อมูล แบบตรวจสอบได้ตลอดอายุรถ (Event-Sourcing)"**

---

## สารบัญ

- [1. แนวคิดหลัก](#1-แนวคิดหลัก)
- [2. ปัญหาที่แก้ (Background & Painpoints)](#2-ปัญหาที่แก้)
- [3. เป้าหมาย (Objectives)](#3-เป้าหมาย)
- [4. ผู้มีส่วนได้ส่วนเสีย & Role Mapping](#4-ผู้มีส่วนได้ส่วนเสียและ-role-mapping)
- [5. โครงสร้างข้อมูลของ Vehicle-NFT](#5-โครงสร้างข้อมูลของ-vehicle-nft)
- [UC-1: ผู้ผลิตรถ (Manufacturer)](#uc-1-ผู้ผลิตรถ-manufacturer)
- [UC-2: ดีลเลอร์ (Dealer)](#uc-2-ดีลเลอร์-dealer)
- [UC-3: ผู้บริโภค / เจ้าของรถ (Consumer / Owner)](#uc-3-ผู้บริโภค--เจ้าของรถ)
- [UC-4: กรมการขนส่งทางบก (DLT)](#uc-4-กรมการขนส่งทางบก-dlt)
- [UC-5: ไฟแนนซ์ / การเงิน (Finance)](#uc-5-ไฟแนนซ์--การเงิน)
- [UC-6: ประกันภัย (Insurance)](#uc-6-ประกันภัย-insurance)
- [UC-7: อู่ซ่อมรถ / ศูนย์บริการ (Workshop)](#uc-7-อู่ซ่อมรถ--ศูนย์บริการ)
- [UC-8: ตรวจสภาพรถ – ตรอ. (Inspection)](#uc-8-ตรวจสภาพรถ--ตรอ)
- [9. Timeline ตัวอย่าง (End-to-End)](#9-timeline-ตัวอย่าง)

---

## 1. แนวคิดหลัก

```
รถ 1 คัน  =  NFT 1 ตัว  (ผูกกับ VIN → tokenId)
```

**หลัก Event-Sourcing:**
- ทุกเหตุการณ์สำคัญ **"ไม่ลบอดีต"** แต่ **เพิ่ม Event ใหม่** (เหมือนสมุดพกที่เขียนเพิ่มไปเรื่อย ๆ)
- ข้อมูลแบ่ง 3 ชั้น:

| ชั้น | ลักษณะ | ตัวอย่าง |
|------|---------|----------|
| **Core Metadata** | เปลี่ยนน้อย/ไม่เปลี่ยน | VIN, รุ่น, สเปก, โรงงาน, วันผลิต, ลายเซ็นผู้ผลิต |
| **State Snapshot** | เปลี่ยนบ่อย | เจ้าของปัจจุบัน, ทะเบียน, ภาษี, ธง, lien, consent |
| **Event Log** | เพิ่มอย่างเดียว | ไทม์ไลน์ทั้งหมด ตรวจสอบย้อนกลับได้ |

---

## 2. ปัญหาที่แก้

### 2.1 ฝั่งผู้ซื้อ / ผู้บริโภค
- **รถมือสอง "ย้อมแมว"**: ไมล์ถูกกรอ / ชนหนักไม่บอก / เคยน้ำท่วม ตรวจสอบยาก
- **ประวัติรถไม่ครบ**: ข้อมูลกระจายอยู่หลายที่ (ศูนย์ / อู่อิสระ / ประกัน / ตรอ.)
- **ความเป็นส่วนตัว vs ความโปร่งใส**: ขาดระบบ "เปิดเท่าที่จำเป็น" แบบมีระยะเวลาและเพิกถอนได้
- **การโอน P2P มีความเสี่ยง**: จ่ายแล้วไม่โอน / โอนแล้วไม่จ่าย

### 2.2 ฝั่งดีลเลอร์
- **ประเมินราคาไม่แม่น**: ข้อมูลไม่น่าเชื่อถือ
- **ภาระความรับผิดหลังขาย**: ไม่มีหลักฐานการเปิดเผยข้อมูลที่ตรวจสอบย้อนหลังได้
- **จัดการสต็อกและโอนหลายทอดช้า**: เอกสารซ้ำซ้อน ตรวจสอบยาก

### 2.3 ฝั่งผู้ผลิต
- **ยืนยันรถแท้/สเปกแท้ยาก**: VIN ปลอม / สลับชิ้นส่วน / แต่งสเปก
- **Warranty fraud**: เอกสารเคลม/รายงานอาการ/ประวัติซ่อมปลอม

### 2.4 ฝั่งไฟแนนซ์
- **รถติดไฟแนนซ์แต่ถูกโอนขายได้**: ช่องโหว่เอกสาร
- **ข้อมูลรถไม่โปร่งใส**: ประเมินหลักประกันผิด
- **กระบวนการยึดรถ/ปลดภาระ**: เอกสารเยอะ พิสูจน์ยาก

### 2.5 ฝั่งประกันภัย
- **Fraud เคลมปลอม**: รูปใช้ซ้ำ / เอกสารแก้ไขทีหลัง
- **ประวัติซ่อม/ชนหนักไม่ต่อเนื่อง**: underwriting ไม่แม่น
- **รถซากกลับมาวิ่ง**: ขาดธงสถานะที่แก้ย้อนหลังไม่ได้

### 2.6 ฝั่งอู่ซ่อม
- **ประวัติซ่อมปลอมได้**: ใบงานหาย / แก้ไขย้อนหลัง
- **กรอไมล์**: ขาด odometer snapshot
- **สิทธิ์เขียนข้อมูล**: ถ้าใครก็เขียนได้ → ข้อมูลมั่ว / ถ้าเขียนไม่ได้เลย → ขาดประวัติ

### 2.7 ฝั่ง ตรอ.
- **ใบตรวจปลอม**: กระดาษ/ไฟล์ปลอมง่าย
- **เชื่อมโยงการต่อภาษีไม่เป็นระบบ**: ต้องการ gate ที่ตรวจสอบได้จริง

### 2.8 ฝั่งกรมขนส่ง (DLT)
- **เอกสารปลอมได้**: เล่มเขียว / ทะเบียน / ป้าย
- **สถานะรถ sync ไม่ทัน**: โอนก่อนอายัด

---

## 3. เป้าหมาย

| # | เป้าหมาย | แก้ปัญหา |
|---|----------|----------|
| 3.1 | ตัวตนรถเชื่อถือได้ตั้งแต่เกิด (Mint NFT) | VIN ปลอม, สวมรุ่น |
| 3.2 | ประวัติรถเป็นไทม์ไลน์เดียว (Single Source of Truth) | ข้อมูลกระจัดกระจาย |
| 3.3 | ป้องกันกรอไมล์ + ซ่อมหนักไม่บอก (Odometer + Severity Flag) | ย้อมแมว |
| 3.4 | การโอนเจ้าของผูกกับการจ่ายเงินจริง (Escrow / Proof) | โกง P2P |
| 3.5 | รถติดไฟแนนซ์โอนไม่ได้ (Lien/Lock) | ขายหนีไฟแนนซ์ |
| 3.6 | Consent ข้อมูลแบบกำหนดขอบเขต/ระยะเวลา | Privacy vs Transparency |
| 3.7 | Disclosure Record มีหลักฐานลงนาม | ข้อพิพาทหลังขาย |
| 3.8 | เคลมต้องแนบ Evidence Hash | เคลมปลอม / เอกสารแก้ไขย้อน |
| 3.9 | ผลตรวจสภาพเป็น gate ต่อภาษี | ใบตรวจปลอม |
| 3.10 | ธงสถานะรถ real-time + ล็อกโอนอัตโนมัติ | โอนรถผิดกฎหมาย |

---

## 4. ผู้มีส่วนได้ส่วนเสียและ Role Mapping

| ผู้มีส่วนได้ส่วนเสีย | On-chain Role | Contract หลัก |
|---|---|---|
| ผู้ดูแลระบบ | `DEFAULT_ADMIN_ROLE` | ทุก contract |
| ผู้ผลิตรถ (โรงงาน) | `MANUFACTURER_ROLE` | VehicleNFT |
| ดีลเลอร์ / เต็นท์รถ | `DEALER_ROLE` | VehicleLifecycle |
| เจ้าของรถ / ผู้บริโภค | ownerOf(tokenId) | VehicleNFT, VehicleLifecycle, VehicleConsent |
| กรมการขนส่ง (DLT) | `DLT_OFFICER_ROLE` | VehicleRegistry |
| สถาบันการเงิน | `FINANCE_ROLE` | VehicleLien |
| บริษัทประกัน | `INSURER_ROLE` | VehicleLifecycle |
| อู่ซ่อม / ศูนย์บริการ | `WORKSHOP_ROLE` | VehicleLifecycle |
| สถานตรวจสภาพ (ตรอ.) | `INSPECTOR_ROLE` | VehicleRegistry |

---

## 5. โครงสร้างข้อมูลของ Vehicle-NFT

### A) Core Metadata (เปลี่ยนน้อย)

| Field | ที่เก็บ | ตัวอย่าง |
|-------|--------|----------|
| tokenId | On-chain (VehicleNFT) + DB (Vehicle entity) | `88421` |
| vinHash | On-chain | `keccak256("MM8ABCD1234567890")` |
| vinNumber | Off-chain only (encrypt at rest) | `MM8ABCD1234567890` |
| modelHash | On-chain | `keccak256(modelJson)` |
| modelJson | Off-chain only | `{model:"KDT E-Car", year:2026}` |
| specHash | On-chain | `keccak256(specJson)` |
| specJson | Off-chain only | `{color:"White", batteryKwh:60, ecu:"ECU-X9"}` |
| manufacturerId | On-chain | wallet address ของโรงงาน |
| manufacturedAt | On-chain | unix timestamp |
| manufacturerSignature | Off-chain only | ลายเซ็นดิจิทัลของโรงงาน |

### B) State Snapshot (เปลี่ยนบ่อย – cache ใน DB)

| Field | ที่เก็บ | ค่าเริ่มต้น |
|-------|--------|------------|
| currentOwnerAddress | DB (cache จาก ownerOf) | manufacturer |
| ownerCount | DB | `0` |
| registrationStatus | On-chain (VehicleRegistry) + DB | `UNREGISTERED` |
| transferLocked | On-chain (VehicleNFT) + DB | `false` |
| activeFlags | On-chain (bitmask) + DB (array) | `[]` |
| lienStatus | On-chain (VehicleLien) + DB | `NONE` |

### C) Event Log (เพิ่มอย่างเดียว)

| Field | ที่เก็บ |
|-------|--------|
| events[] | On-chain (Solidity Events) + DB (EventLog entity) |
| ทุก event มี: | timestamp, actor, type, payloadHash, evidenceHash |

---

## UC-1: ผู้ผลิตรถ (Manufacturer)

### UC-1A: Mint Vehicle-NFT at Production Exit

> สร้าง NFT ด้วย VIN/รุ่น/สเปก/วันผลิต/โรงงาน + ลายเซ็นผู้ผลิต

**Contract:** `VehicleNFT.mintVehicle()`

#### Preconditions (เงื่อนไขก่อนทำ)

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | ผู้เรียกต้องมี `MANUFACTURER_ROLE` | `onlyRole(MANUFACTURER_ROLE)` | revert "AccessControl..." |
| 2 | VIN hash ต้องไม่เคยถูกใช้ | `require(!_usedVins[vinHash])` | revert "VIN already registered" |
| 3 | vinHash, modelHash, specHash ต้องไม่เป็น zero bytes | Backend validation | reject request |

#### Parameters

```
to:             address     – wallet ที่รับ NFT (อาจเป็น manufacturer เองหรือ dealer)
vinHash:        bytes32     – keccak256(VIN)
manufacturedAt: uint64      – unix timestamp วันผลิต
modelHash:      bytes32     – keccak256(canonicalize(modelJson))
specHash:       bytes32     – keccak256(canonicalize(specJson))
```

#### Logic Flow

```
1. ตรวจ MANUFACTURER_ROLE                          ← AccessControl
2. ตรวจ _usedVins[vinHash] == false                ← ป้องกัน VIN ซ้ำ
3. tokenId = _nextTokenId++                         ← สร้าง ID อัตโนมัติ
4. _safeMint(to, tokenId)                           ← สร้าง ERC-721 NFT
5. เก็บ VehicleIdentity struct ใน vehicles[tokenId]
6. _usedVins[vinHash] = true                        ← mark VIN ว่าใช้แล้ว
7. emit VehicleMinted(tokenId, vinHash, msg.sender, manufacturedAt, modelHash, specHash)
```

#### Postconditions (สถานะหลังทำ)

| สถานะ | ค่า |
|-------|-----|
| NFT owner | = `to` parameter |
| vehicles[tokenId] | = VehicleIdentity struct |
| _usedVins[vinHash] | = `true` |
| transferLocked | = `false` (default) |
| registrationStatus | = ยังไม่จดทะเบียน |
| flags | = 0 (ไม่มี flag ใด ๆ) |

#### Off-chain (Backend ทำหลัง Event)

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **Vehicle** | `INSERT` | tokenId, vinNumber(encrypt), vinHash, manufacturerAddress, manufacturedAt, modelJson, modelHash, specJson, specHash, manufacturerSignature, mintTxHash |
| **EventLog** | `INSERT` | type=`VEHICLE_MINTED`, actor=manufacturer, payload=full details |

#### State Change Diagram

```
Before:                          After:
┌─────────────────┐              ┌─────────────────┐
│ NFT ไม่มี       │    mint()    │ tokenId = 88421 │
│ VIN ว่าง        │ ──────────→  │ owner = Factory │
│                 │              │ registered = ✗   │
│                 │              │ flags = none     │
│                 │              │ lien = none      │
└─────────────────┘              └─────────────────┘
```

---

### UC-1B: Warranty Start / Warranty Terms

> กำหนดวันเริ่มประกันศูนย์ + เงื่อนไข + ระยะไมล์

**Contract:** `VehicleLifecycle.logEvent()` (Generic Event)

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย |
|---|---------|-----------|
| 1 | NFT ต้องมีอยู่ (tokenId valid) | `vehicleExists(tokenId)` |
| 2 | ผู้เรียกเป็น manufacturer หรือ admin | Backend / contract logic |

#### Logic Flow

```
1. Manufacturer เรียก logEvent() กับ eventType สำหรับ WARRANTY_DEFINED
2. emit GenericEvent(tokenId, eventType=200, actor, occurredAt, payloadHash, bytes32(0))
3. Backend จับ event → เก็บ warranty terms ใน DB
```

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **EventLog** | `INSERT` | type=`WARRANTY_DEFINED`, payload={startPolicy, terms, years, mileageKm, coverage[]} |

> **หมายเหตุ:** วันเริ่มประกันจริงอาจตั้งเป็น `at_first_registration` แล้วค่อย activate เมื่อ DLT จดทะเบียน

---

## UC-2: ดีลเลอร์ (Dealer)

### UC-2A: Receive Inventory (Manufacturer → Dealer)

> รับโอน NFT เข้าสต็อกดีลเลอร์

**Contracts:**
1. `VehicleNFT.transferFrom()` – โอน NFT
2. `VehicleLifecycle.recordTransfer()` – บันทึก event

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | ผู้โอนเป็น owner ปัจจุบัน (manufacturer) | `ERC721._update()` | revert |
| 2 | `transferLocked` == false | `VehicleNFT._update()` | revert "Transfer is locked" |
| 3 | ผู้เรียก recordTransfer ต้องเป็น owner หรือ DEALER_ROLE | `VehicleLifecycle.recordTransfer()` | revert "Not authorized" |

#### Parameters (recordTransfer)

```
tokenId:          uint256   – รถคันไหน
to:               address   – wallet ดีลเลอร์
reason:           uint8     – 0 (INVENTORY_TRANSFER)
saleContractHash: bytes32   – hash ใบส่งมอบ/ใบกำกับ
buyerOwnerId:     bytes32   – bytes32(0) (ดีลเลอร์ ไม่ใช่ผู้บริโภค)
paymentRefHash:   bytes32   – bytes32(0) (ยังไม่มีการจ่ายเงิน)
```

#### Logic Flow

```
1. Manufacturer เรียก VehicleNFT.transferFrom(manufacturer, dealer, tokenId)
   ├─ ตรวจ transferLocked == false                    ✓
   ├─ ตรวจ owner == manufacturer                      ✓
   └─ โอน NFT → dealer

2. เรียก VehicleLifecycle.recordTransfer(tokenId, dealer, 0, docHash, 0x0, 0x0)
   ├─ ตรวจ msg.sender == owner หรือ DEALER_ROLE       ✓
   └─ emit OwnershipTransferred(tokenId, manufacturer, dealer, 0, ...)
```

#### Postconditions

| สถานะ | ก่อน | หลัง |
|-------|------|------|
| NFT owner | Manufacturer | Dealer |
| ownerCount | 0 | 0 (ดีลเลอร์ไม่นับเป็นเจ้าของใช้งาน) |
| transferLocked | false | false |

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **OwnershipTransfer** | `INSERT` | fromAddress, toAddress, reason=INVENTORY_TRANSFER, docHash, dealerBranchId, inventoryLotNo, vehicleConditionAtReceive |
| **Vehicle** | `UPDATE` | currentOwnerAddress = dealer |
| **EventLog** | `INSERT` | type=`INVENTORY_TRANSFER` |

---

### UC-2B: First Owner Registration Workflow

> ขายรถให้ลูกค้า + โอน NFT

**Contracts:**
1. `VehicleLifecycle.recordTransfer()` – reason=1 (FIRST_SALE)
2. `VehicleNFT.transferFrom()` – โอน NFT
3. (จากนั้น DLT จดทะเบียน → ดู UC-4A)

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย |
|---|---------|-----------|
| 1 | NFT owner == dealer | ERC721 |
| 2 | transferLocked == false | VehicleNFT._update() |
| 3 | ผู้เรียกมี DEALER_ROLE หรือเป็น owner | VehicleLifecycle |

#### Parameters (recordTransfer)

```
tokenId:          uint256
to:               address   – wallet ผู้ซื้อคนแรก
reason:           uint8     – 1 (FIRST_SALE)
saleContractHash: bytes32   – hash สัญญาซื้อขาย
buyerOwnerId:     bytes32   – keccak256(buyerDID)
paymentRefHash:   bytes32   – hash หลักฐานจ่ายเงิน
```

#### Logic Flow

```
1. Dealer เรียก recordTransfer() → emit OwnershipTransferred
2. Dealer เรียก VehicleNFT.transferFrom(dealer, buyer, tokenId)
3. Backend จับ event → อัปเดต Vehicle entity
4. ขั้นตอนถัดไป: DLT จดทะเบียน (UC-4A)
```

#### Postconditions

| สถานะ | ก่อน | หลัง |
|-------|------|------|
| NFT owner | Dealer | Buyer (ผู้ซื้อคนแรก) |
| ownerCount | 0 | 1 |
| registrationStatus | UNREGISTERED | ยังคง UNREGISTERED (รอ DLT) |

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **OwnershipTransfer** | `INSERT` | reason=FIRST_SALE, saleContractHash, buyerOwnerIdHash, salePrice, paymentMethod, contractDocUrl, deliveryChecklistUrl |
| **Vehicle** | `UPDATE` | currentOwnerAddress=buyer, ownerCount=1 |
| **EventLog** | `INSERT` | type=`FIRST_SALE` |

---

### UC-2C: Trade-in / Buyback

> รับซื้อรถเก่า: ตรวจประวัติ NFT เพื่อตีราคาโปร่งใส

**Contracts:**
1. `VehicleLifecycle.logEvent()` – บันทึกผลประเมิน
2. `VehicleLifecycle.recordTransfer()` – reason=3 (TRADE_IN)
3. `VehicleNFT.transferFrom()` – โอนกลับ dealer

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย |
|---|---------|-----------|
| 1 | NFT owner == seller (เจ้าของปัจจุบัน) | ERC721 |
| 2 | transferLocked == false | VehicleNFT._update() |
| 3 | lien.status != Active (ไม่ติดไฟแนนซ์) หรือ ปลดก่อน | VehicleNFT (transfer lock) |

#### Logic Flow

```
1. Dealer อ่านประวัติรถจาก on-chain events + off-chain DB
   ├─ odometer trend (ไมล์ไล่ขึ้นปกติ?)
   ├─ accident flags (เคยชนหนัก?)
   ├─ claims summary (เคลมกี่ครั้ง?)
   └─ maintenance history

2. Dealer บันทึกผลประเมิน → logEvent(tokenId, eventType=TRADE_IN_EVALUATED, ...)

3. ถ้าตกลงซื้อ:
   a. recordTransfer(tokenId, dealer, 3, docHash, 0x0, 0x0)   → emit OwnershipTransferred
   b. VehicleNFT.transferFrom(seller, dealer, tokenId)         → โอน NFT
```

#### Postconditions

| สถานะ | ก่อน | หลัง |
|-------|------|------|
| NFT owner | เจ้าของเดิม | Dealer |
| ownerCount | N | N (หรือ N+1 แล้วแต่กติกา) |

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **TradeInEvaluation** | `INSERT` | evaluatorAddress, evaluationHash, mileageAtEval, score, offerPrice, notes, signalsUsed, photos, accepted |
| **OwnershipTransfer** | `INSERT` | reason=TRADE_IN |
| **EventLog** | `INSERT` | type=`TRADE_IN` |

---

### UC-2D: Disclosure Record

> บันทึกการเปิดเผยข้อมูลสำคัญ (ป้องกันย้อมแมว)

**Contract:** `VehicleLifecycle.recordDisclosure()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | NFT ต้องมีอยู่ | `vehicleExists(tokenId)` | revert |
| 2 | ผู้เรียกเป็น owner หรือ DEALER_ROLE | contract logic | revert "Not seller" |

#### Parameters

```
tokenId:            uint256
buyerOwnerId:       bytes32   – keccak256(buyerDID)
disclosedItemsMask: uint64    – bitmask: bit0=flood, bit1=structural, bit2=majorAccident
ackHash:            bytes32   – hash(เอกสารที่ผู้ซื้อเซ็นยอมรับ)
```

#### Disclosed Items Bitmask

```
bit 0  (1)  = เคยน้ำท่วม (flood)
bit 1  (2)  = ซ่อมโครงสร้าง (structural repair)
bit 2  (4)  = ชนหนัก (major accident)
bit 3  (8)  = เคยเป็นรถเช่า (ex-rental)
bit 4  (16) = เคยติดไฟแนนซ์ (ex-lien)
bit 5  (32) = เปลี่ยนเครื่อง/แบต (major part replaced)
```

#### Logic Flow

```
1. ตรวจ msg.sender == ownerOf(tokenId) หรือ DEALER_ROLE
2. emit DisclosureRecorded(tokenId, seller, buyerOwnerId, disclosedItemsMask, ackHash, timestamp)
3. Backend จับ event → สร้าง Disclosure entity
```

#### Postconditions

- Event log มีหลักฐานว่า **"ผู้ซื้อรับทราบข้อมูลสำคัญแล้ว"**
- ลดข้อพิพาทหลังขาย (ย้อนดูบน chain ได้เสมอ)

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **Disclosure** | `INSERT` | sellerAddress, buyerOwnerIdHash, disclosedItemsMask, ackHash, signedAt, disclosureDocUrl, fullDisclosureText, buyerSignatureImageUrl, witness |
| **EventLog** | `INSERT` | type=`DISCLOSURE` |

---

## UC-3: ผู้บริโภค / เจ้าของรถ

### UC-3A: View Vehicle History (Read-only)

> ดูประวัติรถ: เจ้าของกี่มือ, เคยชนไหม, เคยน้ำท่วมไหม, ไมล์ไล่ขึ้นปกติไหม

**ไม่เกิด state change** – เป็นการอ่านข้อมูลตามสิทธิ์

#### Logic Flow

```
1. ผู้ใช้ส่ง tokenId ไปที่ Backend API
2. Backend ตรวจสิทธิ์:
   ├─ Public data (ใครก็อ่านได้):
   │   ├─ ownerCount
   │   ├─ flags summary (stolen, flood, totalLoss, ...)
   │   ├─ odometer trend (ไมล์ไล่ขึ้น / สงสัย rollback)
   │   └─ สรุปการเข้าศูนย์/ตรวจสภาพ
   │
   ├─ Limited data (ต้องมี consent):
   │   ├─ maintenance list (รายการซ่อม)
   │   ├─ claims summary (สรุปเคลม)
   │   └─ insurance status
   │
   └─ Private data (ต้องมี consent + scope PII):
       ├─ ชื่อเจ้าของ
       ├─ ที่อยู่/เบอร์โทร
       └─ เอกสารละเอียด

3. Backend เรียก VehicleConsent.isGrantValid(tokenId, grantHash)
   ├─ valid = true → คืนข้อมูลตาม scopeMask
   └─ valid = false → คืนเฉพาะ public data
```

#### Consent Scope Bitmask (VehicleConsent.sol)

```
bit 0  (1)    SCOPE_VEHICLE_IDENTITY     ข้อมูลตัวตนรถ
bit 1  (2)    SCOPE_MAINTENANCE_FULL     ประวัติซ่อมเต็ม
bit 2  (4)    SCOPE_MAINTENANCE_SUMMARY  สรุปประวัติซ่อม
bit 3  (8)    SCOPE_CLAIMS_FULL          ประวัติเคลมเต็ม
bit 4  (16)   SCOPE_CLAIMS_SUMMARY       สรุปเคลม
bit 5  (32)   SCOPE_OWNERSHIP_HISTORY    ประวัติเจ้าของ
bit 6  (64)   SCOPE_INSPECTION_HISTORY   ประวัติตรวจสภาพ
bit 7  (128)  SCOPE_ODOMETER_TREND       แนวโน้มเลขไมล์
bit 8  (256)  SCOPE_PII                  ข้อมูลส่วนบุคคล
```

---

### UC-3B: Consent Management

> เลือกเปิดเผยข้อมูลให้ใครเห็นแค่ไหน

**Contract:** `VehicleConsent.grantConsent()` / `revokeConsent()`

#### Preconditions (Grant)

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | ผู้เรียกเป็น ownerOf(tokenId) | `require(ownerOf == msg.sender)` | revert "Not vehicle owner" |
| 2 | expiresAt > block.timestamp | `require(expiresAt > block.timestamp)` | revert "Already expired" |
| 3 | scopeMask > 0 | `require(scopeMask > 0)` | revert "Empty scope" |
| 4 | Grant ยังไม่เคยมี (nonce ซ้ำ) | `require(grants[..].nonce == 0)` | revert "Grant already exists" |

#### Parameters (grantConsent)

```
tokenId:    uint256
granteeDid: bytes32   – keccak256(DID ของผู้รับสิทธิ์)
scopeMask:  uint64    – bitmask สิทธิ์ (ดูตาราง scope ด้านบน)
expiresAt:  uint64    – unix timestamp หมดอายุ
singleUse:  bool      – ใช้ได้ครั้งเดียว?
nonce:      uint64    – ป้องกัน replay attack
```

#### Logic Flow (Grant)

```
1. ตรวจ ownerOf(tokenId) == msg.sender
2. ตรวจ expiresAt > now, scopeMask > 0
3. grantHash = keccak256(tokenId, granteeDid, scopeMask, expiresAt, singleUse, nonce)
4. ตรวจ grant นี้ยังไม่มี
5. เก็บ Grant struct ใน grants[tokenId][grantHash]
6. emit ConsentGranted(tokenId, owner, granteeDid, scopeMask, expiresAt, nonce, singleUse, grantHash)
```

#### Logic Flow (Verify – เรียกโดย Backend)

```
1. Backend เรียก VehicleConsent.verifyConsent(tokenId, grantHash)
2. Contract ตรวจ:
   ├─ nonce != 0 (grant มีอยู่จริง)
   ├─ revoked == false (ไม่ถูกถอน)
   ├─ block.timestamp <= expiresAt (ยังไม่หมดอายุ)
   └─ ถ้า singleUse → used == false (ยังไม่เคยใช้)
3. ถ้า singleUse → mark used = true
4. emit ConsentUsed(tokenId, grantHash, accessor)
5. return (valid=true, scopeMask)
```

#### Logic Flow (Revoke)

```
1. ตรวจ ownerOf(tokenId) == msg.sender
2. ตรวจ grant ยังไม่ถูก revoke
3. grants[tokenId][grantHash].revoked = true
4. emit ConsentRevoked(tokenId, grantHash)
```

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **ConsentGrant** | `INSERT` / `UPDATE` | ownerAddress, granteeDid, granteeVerified, granteeEmail, scopes[], scopeMask, expiresAt, singleUse, nonce, grantHash, revoked, auditLog[] |

---

### UC-3C: Ownership Transfer (P2P)

#### กรณี 1: จ่ายเงินสด + แนบหลักฐาน

**Contracts:**
1. `VehicleLifecycle.recordTransfer()` – reason=2 (RESALE)
2. `VehicleNFT.transferFrom()` – โอน NFT

##### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | NFT owner == seller | ERC721 | revert |
| 2 | transferLocked == false | VehicleNFT._update() | revert "Transfer is locked" |
| 3 | lien.status ไม่ใช่ Active | (locked by VehicleLien) | revert "Transfer is locked" |

##### Logic Flow

```
1. Seller บันทึก recordTransfer():
   ├─ reason = 2 (RESALE)
   ├─ saleContractHash = hash(สัญญา)
   ├─ buyerOwnerId = keccak256(buyerDID)
   └─ paymentRefHash = hash(ใบเสร็จ/หลักฐานจ่ายเงิน)

2. emit OwnershipTransferred(tokenId, seller, buyer, 2, ...)

3. Seller เรียก VehicleNFT.transferFrom(seller, buyer, tokenId)
   ├─ ตรวจ transferLocked == false   ✓
   └─ โอน NFT

4. Backend จับ event → อัปเดต Vehicle entity
```

##### Postconditions

| สถานะ | ก่อน | หลัง |
|-------|------|------|
| NFT owner | Seller | Buyer |
| ownerCount | N | N+1 |
| มีหลักฐานการจ่ายเงิน | ไม่มี | paymentRefHash on-chain |

---

#### กรณี 2: จ่ายเป็น Crypto (Escrow / Atomic)

**Contract:** `VehicleLien.createEscrow()` → `fundEscrow()` → `fulfillCondition()` → auto release

##### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | NFT owner == seller | `require(msg.sender == ownerOf)` | revert "Not vehicle owner" |
| 2 | transferLocked == false | ต้องปลด lien ก่อน (ถ้ามี) | revert |
| 3 | Escrow ID ไม่ซ้ำ | `require(escrows[id].tokenId == 0)` | revert "Escrow ID exists" |
| 4 | Buyer ต้อง approve ERC20 (ถ้าจ่ายเป็น token) | ERC20.approve() | revert ตอน transferFrom |

##### Parameters (createEscrow)

```
escrowId:       bytes32   – ID ที่สร้างจาก off-chain
tokenId:        uint256   – รถคันไหน
buyer:          address   – wallet ผู้ซื้อ
conditionsMask: uint64    – เงื่อนไข (1=payment_confirmed, 2=lien_released)
depositAsset:   address   – ERC20 token address (หรือ address(0) = native coin)
depositAmount:  uint256   – จำนวนเงิน
```

##### Condition Bitmask

```
bit 0  (1)  = COND_PAYMENT_CONFIRMED   ยืนยันการจ่ายเงินแล้ว
bit 1  (2)  = COND_LIEN_RELEASED       ปลดภาระผูกพันแล้ว
```

##### Logic Flow

```
Step 1: Seller สร้าง Escrow
  └─ createEscrow(escrowId, tokenId, buyer, conditionsMask, asset, amount)
     ├─ ตรวจ msg.sender == ownerOf(tokenId)
     ├─ ตรวจ escrowId ไม่ซ้ำ
     ├─ เก็บ Escrow struct
     └─ emit EscrowCreated(...)
     └─ state = Created

Step 2: Buyer วางเงิน
  ├─ กรณี native coin:
  │   └─ fundEscrowNative{value: amount}(escrowId)
  │      ├─ ตรวจ state == Created
  │      ├─ ตรวจ msg.sender == buyer
  │      ├─ ตรวจ msg.value == depositAmount
  │      └─ state = Funded
  │
  └─ กรณี ERC20:
      └─ fundEscrowERC20(escrowId)
         ├─ ตรวจ state == Created
         ├─ ตรวจ msg.sender == buyer
         ├─ ERC20.transferFrom(buyer, contract, amount)
         └─ state = Funded

Step 3: Fulfill เงื่อนไข
  ├─ ถ้าไม่ติดไฟแนนซ์ → fulfillCondition(escrowId, COND_PAYMENT_CONFIRMED)
  │   └─ ครบเงื่อนไข → auto release
  │
  └─ ถ้าติดไฟแนนซ์ → ต้อง 2 conditions:
      a. Finance ปลดภาระ → fulfillCondition(escrowId, COND_LIEN_RELEASED)
      b. ยืนยัน payment → fulfillCondition(escrowId, COND_PAYMENT_CONFIRMED)
      └─ ครบทั้ง 2 → auto release

Step 4: Auto Release
  ├─ fulfilledConditions & conditionsMask == conditionsMask → ✓
  ├─ โอนเงินให้ seller (native หรือ ERC20)
  ├─ state = Released
  └─ emit EscrowReleased(escrowId, tokenId)

Step 5: โอน NFT
  └─ Seller เรียก VehicleNFT.transferFrom(seller, buyer, tokenId)
```

##### State Transitions

```
Created ──fund()──→ Funded ──fulfillCondition()──→ Released
   │                  │
   └──cancel()──→ Cancelled (คืนเงิน ถ้า funded)
                      │
                      └──cancel()──→ Cancelled (คืนเงิน)
```

---

### UC-3D: Insurance & Finance Self-Service

> แชร์ token id ให้ประกัน/ไฟแนนซ์ดึงข้อมูลที่จำเป็น

**Contract:** `VehicleConsent.grantConsent()` – ให้สิทธิ์อ่านเฉพาะ scope ที่จำเป็น

#### Logic Flow

```
1. เจ้าของเรียก grantConsent():
   ├─ granteeDid = keccak256(insurer/finance DID)
   ├─ scopeMask = SCOPE_VEHICLE_IDENTITY | SCOPE_CLAIMS_SUMMARY | SCOPE_ODOMETER_TREND
   ├─ expiresAt = วันหมดอายุ
   └─ singleUse = false (ดึงได้หลายครั้ง)

2. emit ConsentGranted(...)

3. ประกัน/ไฟแนนซ์ เรียก Backend API พร้อม grantHash
4. Backend เรียก VehicleConsent.verifyConsent() → ตรวจ valid + scope
5. คืนข้อมูลตาม scopeMask
```

---

## UC-4: กรมการขนส่งทางบก (DLT)

### UC-4A: On-chain Registration (เล่มเขียวดิจิทัล)

> จดทะเบียนรถ: เปลี่ยนสถานะจาก "ยังไม่จดทะเบียน" → "จดทะเบียนแล้ว"

**Contract:** `VehicleRegistry.registerVehicle()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | ผู้เรียกมี `DLT_OFFICER_ROLE` | `onlyRole(DLT_OFFICER_ROLE)` | revert |
| 2 | NFT ต้องมีอยู่ | `vehicleExists(tokenId)` | revert |
| 3 | ยังไม่เคยจดทะเบียน | `require(!registrations[tokenId].isRegistered)` | revert "Already registered" |

#### Parameters

```
tokenId:             uint256
greenBookNoHash:     bytes32   – keccak256(เลขเล่มเขียว)
registrationDocHash: bytes32   – hash เอกสารจดทะเบียน
```

#### Logic Flow

```
1. ตรวจ DLT_OFFICER_ROLE
2. ตรวจ NFT มีอยู่จริง
3. ตรวจ isRegistered == false
4. เก็บ RegistrationData:
   ├─ isRegistered = true
   ├─ registeredAt = block.timestamp
   ├─ dltOfficer = msg.sender
   ├─ greenBookNoHash
   ├─ registrationDocHash
   └─ status = Registered
5. emit VehicleRegistered(tokenId, officer, greenBookNoHash, docHash)
```

#### Postconditions

| สถานะ | ก่อน | หลัง |
|-------|------|------|
| isRegistered | false | **true** |
| status | Unregistered | **Registered** |
| registeredAt | 0 | **block.timestamp** |

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **Registration** | `INSERT` | status=REGISTERED, registeredAt, dltOfficerAddress, greenBookNo(plain), greenBookNoHash, registrationDocUrl, registrationDocHash, ownerIdentityAtReg(PII) |
| **Vehicle** | `UPDATE` | registrationStatus=REGISTERED |
| **EventLog** | `INSERT` | type=`REGISTRATION` |

---

### UC-4B: Plate Issuance / Plate Change / Plate Lost

> ออกป้าย / เปลี่ยนป้าย / ป้ายหาย

**Contract:** `VehicleRegistry.recordPlateEvent()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย |
|---|---------|-----------|
| 1 | ผู้เรียกมี `DLT_OFFICER_ROLE` | onlyRole |
| 2 | NFT ต้องมีอยู่ | vehicleExists |

#### Parameters

```
tokenId:     uint256
plateNoHash: bytes32          – keccak256(เลขป้าย)
provinceCode: uint16          – รหัสจังหวัด
eventType:   PlateEvent enum  – 0=Issue, 1=Change, 2=Lost
docHash:     bytes32          – hash เอกสาร/ใบแจ้งความ
effectiveAt: uint64           – unix timestamp วันมีผล
```

#### Logic Flow

```
1. ตรวจ role + vehicle exists
2. emit PlateEventRecorded(tokenId, plateNoHash, provinceCode, eventType, docHash, effectiveAt)
3. Backend จับ event → สร้าง PlateRecord entity
```

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **PlateRecord** | `INSERT` | plateNo(plain), plateNoHash, provinceCode, eventType, effectiveAt, plateEventDocHash, policeReportUrl(กรณีหาย), reason |

---

### UC-4C: Tax & Annual Fee Payment

> ชำระภาษีประจำปี / ต่อทะเบียน

**Contract:** `VehicleRegistry.recordTaxPayment()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | ผู้เรียกมี `DLT_OFFICER_ROLE` | onlyRole | revert |
| 2 | NFT ต้องมีอยู่ | vehicleExists | revert |
| 3 | **มีผลตรวจสภาพ "ผ่าน" ล่าสุดภายใน `inspectionMaxAge`** | `require(lastInspectionPassAt > 0 && now - lastInspectionPassAt <= inspectionMaxAge)` | revert **"Inspection expired or not found"** |

> **Business Rule สำคัญ:** ต่อภาษีไม่ได้ถ้าไม่มีผลตรวจสภาพผ่าน!
> `inspectionMaxAge` default = 365 วัน (ตั้งค่าได้โดย admin)

#### Parameters

```
tokenId:     uint256
taxYear:     uint16    – ปีภาษี (พ.ศ.)
validUntil:  uint64    – unix timestamp วันหมดอายุ
receiptHash: bytes32   – hash ใบเสร็จ
```

#### Logic Flow

```
1. ตรวจ DLT_OFFICER_ROLE
2. ตรวจ vehicle exists
3. ตรวจ lastInspectionPassAt[tokenId] > 0              ← เคยตรวจสภาพผ่าน
4. ตรวจ block.timestamp - lastInspectionPassAt <= 365 days  ← ผลตรวจยังไม่หมดอายุ
5. emit TaxPaid(tokenId, taxYear, now, validUntil, receiptHash, Paid)
```

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **TaxPayment** | `INSERT` | taxYear, paidAt, validUntil, status=PAID, receiptHash, receiptUrl, amount, paymentChannel |

---

### UC-4D: Vehicle Status Flags

> ติดธงสถานะ: รถหาย / ถูกอายัด / ชนหนัก / น้ำท่วม / ซาก / ยกเลิกทะเบียน

**Contract:** `VehicleRegistry.setFlag()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย |
|---|---------|-----------|
| 1 | ผู้เรียกมี `DLT_OFFICER_ROLE` | onlyRole |
| 2 | NFT ต้องมีอยู่ | vehicleExists |

#### Flag Bitmask

```solidity
FLAG_STOLEN          = 1 << 0   // bit 0  = รถหาย
FLAG_SEIZED          = 1 << 1   // bit 1  = ถูกอายัด
FLAG_MAJOR_ACCIDENT  = 1 << 2   // bit 2  = ชนหนัก
FLAG_FLOOD           = 1 << 3   // bit 3  = น้ำท่วม
FLAG_TOTAL_LOSS      = 1 << 4   // bit 4  = ซาก (total loss)
FLAG_SCRAPPED        = 1 << 5   // bit 5  = ทำลายแล้ว
FLAG_REG_CANCELLED   = 1 << 6   // bit 6  = ยกเลิกทะเบียน
```

#### Business Rule: Auto Transfer Lock

```
ถ้าตั้ง flag ต่อไปนี้ → ระบบจะ ล็อกการโอนอัตโนมัติ:
  - FLAG_STOLEN      (รถหาย → ห้ามโอน)
  - FLAG_SEIZED      (อายัด → ห้ามโอน)
  - FLAG_TOTAL_LOSS  (ซาก → ห้ามโอน)
```

#### Logic Flow

```
1. ตรวจ DLT_OFFICER_ROLE + vehicle exists
2. ถ้า active = true:  flags[tokenId] |= flagBit     (เปิด bit)
   ถ้า active = false: flags[tokenId] &= ~flagBit    (ปิด bit)
3. emit FlagUpdated(tokenId, newFlags, source, refHash)

4. ถ้า active == true && (flagBit == STOLEN || SEIZED || TOTAL_LOSS):
   └─ เรียก VehicleNFT.setTransferLock(tokenId, true)
      └─ emit TransferLockChanged(tokenId, true, registryAddress)
```

#### Postconditions (ตัวอย่าง: ตั้ง STOLEN)

| สถานะ | ก่อน | หลัง |
|-------|------|------|
| flags | 0 (0b0000000) | 1 (0b0000001) |
| transferLocked | false | **true** |
| สามารถโอน NFT ได้ | ได้ | **ไม่ได้** |

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **VehicleFlagRecord** | `INSERT` | flag=STOLEN, active=true, sourceAddress, refHash, caseDocUrl, details, statusTimeline |
| **Vehicle** | `UPDATE` | activeFlags=[STOLEN], transferLocked=true |

---

### UC-4E: Registration Status Change

> เปลี่ยนสถานะการจดทะเบียน (suspend / cancel)

**Contract:** `VehicleRegistry.setRegistrationStatus()`

#### Business Rule: Cancel → Auto Lock + Flag

```
ถ้าเปลี่ยนเป็น Cancelled:
  1. VehicleNFT.setTransferLock(tokenId, true)   ← ล็อกการโอน
  2. _setFlag(tokenId, FLAG_REG_CANCELLED, true)  ← ติดธง
```

---

## UC-5: ไฟแนนซ์ / การเงิน

### UC-5A: Loan Origination + Create Lien Record

> ขอสินเชื่อ + ติดภาระผูกพันบน NFT → ห้ามโอน

**Contract:** `VehicleLien.createLien()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | ผู้เรียกมี `FINANCE_ROLE` | `onlyRole(FINANCE_ROLE)` | revert |
| 2 | ยังไม่มี lien (status == None) | `require(liens[tokenId].status == None)` | revert "Lien already exists" |

#### Parameters

```
tokenId:              uint256
loanContractHash:     bytes32   – hash สัญญาสินเชื่อ
releaseConditionHash: bytes32   – hash เงื่อนไขปลดล็อก
```

#### Logic Flow

```
1. ตรวจ FINANCE_ROLE
2. ตรวจ liens[tokenId].status == None
3. เก็บ Lien struct:
   ├─ lender = msg.sender
   ├─ status = Active
   ├─ loanContractHash
   ├─ startedAt = block.timestamp
   └─ releaseConditionHash
4. เรียก VehicleNFT.setTransferLock(tokenId, true)   ← ล็อกการโอน!
5. emit LienCreated(tokenId, lender, loanContractHash, startedAt)
```

#### Postconditions

| สถานะ | ก่อน | หลัง |
|-------|------|------|
| lien.status | None | **Active** |
| transferLocked | false | **true** |
| เจ้าของพยายามโอน NFT | สำเร็จ | **revert "Transfer is locked"** |

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **LoanAccount** | `INSERT` | lenderAddress, lienStatus=ACTIVE, loanAccountNo, principal, interestRateBps, termMonths, loanContractHash, contractDocUrl, startedAt, releaseConditionHash, borrowerKycRef |
| **Vehicle** | `UPDATE` | transferLocked=true |

---

### UC-5B: Payoff & Lien Release

> ปิดบัญชี + ปลดภาระ → โอนขายได้ตามปกติ

**Contract:** `VehicleLien.releaseLien()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | lien.status == Active | `require(status == Active)` | revert "No active lien" |
| 2 | ผู้เรียกเป็น lender หรือ admin | `require(msg.sender == lender \|\| admin)` | revert "Not lender" |

#### Logic Flow

```
1. ตรวจ lien.status == Active
2. ตรวจ msg.sender == lender หรือ admin
3. lien.status = Released
4. เรียก VehicleNFT.setTransferLock(tokenId, false)   ← ปลดล็อก!
5. emit LienStatusChanged(tokenId, Released)
```

#### Postconditions

| สถานะ | ก่อน | หลัง |
|-------|------|------|
| lien.status | Active | **Released** |
| transferLocked | true | **false** (ถ้าไม่มี lock อื่น) |
| เจ้าของโอน NFT | ไม่ได้ | **ได้** |

---

### UC-5C: Repossession (ยึด/อายัด)

> ผิดนัด: อัปเดตสถานะยึด

**Contract:** `VehicleLien.markDefault()`

#### Logic Flow

```
1. ตรวจ lien.status == Active
2. ตรวจ msg.sender == lender หรือ admin
3. lien.status = Defaulted
4. emit LienStatusChanged(tokenId, Defaulted)
5. (ไม่ปลด transferLock → ยังโอนไม่ได้)
6. DLT อาจตั้ง FLAG_SEIZED เพิ่ม (UC-4D)
```

---

### UC-5D: Escrow / Conditional Transfer (ขายรถติดไฟแนนซ์)

> โอนแบบมีเงื่อนไข: จ่ายปิดยอด → ปลดภาระ → โอน

**ดู logic ละเอียดใน [UC-3C กรณี 2](#กรณี-2-จ่ายเป็น-crypto-escrow--atomic)**

#### ตัวอย่าง Flow เต็ม (รถติดไฟแนนซ์)

```
conditionsMask = COND_PAYMENT_CONFIRMED | COND_LIEN_RELEASED = 3 (0b11)

1. Seller → createEscrow(escrowId, tokenId, buyer, 3, USDT, 450000)
2. Buyer  → fundEscrowERC20(escrowId)                      state=Funded

3. Buyer  → จ่ายเงินปิดไฟแนนซ์ (off-chain/on-chain)
4. Finance → releaseLien(tokenId)                           lien=Released, lock=false
5. Finance → fulfillCondition(escrowId, COND_LIEN_RELEASED) fulfilled |= 2

6. Seller  → fulfillCondition(escrowId, COND_PAYMENT_CONFIRMED) fulfilled |= 1
   └─ fulfilled (3) & conditionsMask (3) == 3 → AUTO RELEASE
   └─ เงินโอนให้ seller
   └─ state = Released

7. Seller → VehicleNFT.transferFrom(seller, buyer, tokenId) → โอน NFT
```

---

## UC-6: ประกันภัย (Insurance)

### UC-6A: Policy Renewal / Change Coverage

> ทำ/ต่อ/เปลี่ยน/ยกเลิกกรมธรรม์

**Contract:** `VehicleLifecycle.recordInsurancePolicy()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย |
|---|---------|-----------|
| 1 | ผู้เรียกมี `INSURER_ROLE` | onlyRole |
| 2 | NFT ต้องมีอยู่ | vehicleExists |

#### Parameters

```
tokenId:      uint256
policyNoHash: bytes32              – keccak256(เลขกรมธรรม์)
action:       InsuranceAction enum – 0=New, 1=Renew, 2=Change, 3=Cancel
validFrom:    uint64               – unix timestamp เริ่มคุ้มครอง
validTo:      uint64               – unix timestamp สิ้นสุด
coverageHash: bytes32              – hash(รายละเอียดความคุ้มครอง)
```

#### Logic Flow

```
1. ตรวจ INSURER_ROLE + vehicle exists
2. emit InsurancePolicyEvent(tokenId, insurer, policyNoHash, action, validFrom, validTo, coverageHash)
3. Backend จับ event → สร้าง InsurancePolicy entity
```

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **InsurancePolicy** | `INSERT` | insurerAddress, policyNo(plain), policyNoHash, action, validFrom, validTo, coverageDetails(JSON), coverageHash, premiumAmount, deductible, policyDocUrl |

---

### UC-6B: Claim Filing with Evidence Hash

> เปิดเคลม + แนบหลักฐาน (hash ป้องกันปลอม)

**Contract:** `VehicleLifecycle.fileClaim()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย |
|---|---------|-----------|
| 1 | ผู้เรียกมี `INSURER_ROLE` | onlyRole |
| 2 | NFT ต้องมีอยู่ | vehicleExists |

#### Parameters

```
tokenId:        uint256
claimNoHash:    bytes32       – keccak256(เลขเคลม)
evidenceHashes: bytes32[]     – [hash(รูป), hash(ใบแจ้งความ), hash(ใบเสนอราคา)]
severity:       ClaimSeverity – 0=Minor, 1=Major, 2=Structural, 3=TotalLoss
```

#### Logic Flow

```
1. ตรวจ INSURER_ROLE + vehicle exists
2. emit ClaimFiled(tokenId, claimNoHash, now, evidenceHashes, severity)
3. Backend จับ event → สร้าง InsuranceClaim entity
4. ถ้า severity == TotalLoss:
   └─ DLT ต้องตั้ง FLAG_TOTAL_LOSS (UC-4D) → auto lock transfer
```

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **InsuranceClaim** | `INSERT` | claimNo(plain), claimNoHash, filedAt, status=FILED, severity, evidenceFiles[{type,cid,url,hash,mime}], evidenceHashes[], estimateDocUrl, fraudSignals |

---

### UC-6C: Claim Status Update + Total Loss

> อัปเดตสถานะเคลม: Filed → Estimating → Approved → Repairing → Closed

**Contract:** `VehicleLifecycle.updateClaimStatus()`

#### Claim Status Flow

```
Filed ──→ Estimating ──→ Approved ──→ Repairing ──→ Closed
  │                        │
  └──→ Rejected            └──→ (ถ้า total loss)
                                  │
                                  ▼
                           VehicleRegistry.setFlag(
                             tokenId,
                             FLAG_TOTAL_LOSS,
                             true,
                             refHash
                           )
                                  │
                                  ▼
                           transferLocked = true
                           (ห้ามกลับมาเป็นรถปกติ)
```

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **InsuranceClaim** | `UPDATE` | status เปลี่ยนตาม flow |

---

## UC-7: อู่ซ่อมรถ / ศูนย์บริการ

### UC-7A: Owner Consent for Writing

> เจ้าของอนุญาตให้อู่เขียน record **เฉพาะครั้งนั้น**

**Contract:** `VehicleLifecycle.grantWriteConsent()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | ผู้เรียกเป็น ownerOf(tokenId) | `onlyVehicleOwner(tokenId)` | revert "Not vehicle owner" |

#### Write Scope Bitmask

```
bit 0  (1)  = maintenance record (บันทึกซ่อม)
bit 1  (2)  = odometer snapshot (บันทึกไมล์)
bit 2  (4)  = parts replacement (เปลี่ยนอะไหล่)
bit 3  (8)  = accident severity flag (ติดธงความเสียหาย)
```

#### Parameters

```
tokenId:   uint256
workshop:  address   – wallet อู่
scopeMask: uint64    – bitmask สิทธิ์เขียน (เช่น 15 = ทุกอย่าง)
expiresAt: uint64    – unix timestamp หมดอายุ
singleUse: bool      – ใช้ได้ครั้งเดียว?
nonce:     uint64    – ป้องกัน replay
```

#### Logic Flow

```
1. ตรวจ ownerOf(tokenId) == msg.sender
2. writeConsents[tokenId][workshop] = scopeMask
3. emit GenericEvent(tokenId, 100, owner, now, payloadHash, 0x0)
4. Backend → สร้าง ConsentGrant entity
```

---

### UC-7B: Maintenance Log Write

> บันทึกซ่อม: วันที่ / ไมล์ / อาการ / รายการงาน / อะไหล่ / ผู้ทำงาน

**Contract:** `VehicleLifecycle.logMaintenance()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | ผู้เรียกมี `WORKSHOP_ROLE` | `onlyRole(WORKSHOP_ROLE)` | revert |
| 2 | NFT ต้องมีอยู่ | `vehicleExists(tokenId)` | revert |
| 3 | **ต้องมี write consent จากเจ้าของ** | `require(writeConsents[tokenId][msg.sender] > 0)` | revert **"No write consent"** |
| 4 | accidentSeverity ต้อง 0-3 | `require(accidentSeverity <= 3)` | revert "Invalid severity" |

#### Parameters

```
tokenId:              uint256
writeConsentRefHash:  bytes32   – hash ของ consent ที่อ้างอิง
mileageKm:            uint32    – เลขไมล์ ณ เวลาซ่อม
maintenanceHash:      bytes32   – hash(รายละเอียดซ่อมทั้งหมด)
partsHash:            bytes32   – hash(รายการอะไหล่ทั้งหมด)
accidentSeverity:     uint8     – 0=None, 1=Minor, 2=Major, 3=Structural
occurredAt:           uint64    – unix timestamp วันซ่อม
```

#### Accident Severity Levels

```
0 = None        ไม่เกี่ยวกับอุบัติเหตุ (ซ่อมตามปกติ)
1 = Minor       เสียหายเล็กน้อย (ชนเล็กน้อย ไม่กระทบโครงสร้าง)
2 = Major       เสียหายหนัก (ต้องซ่อมตัวถัง/ชิ้นส่วนหลัก)
3 = Structural  เสียหายโครงสร้าง (ซ่อม frame / ตัดต่อ)
```

#### Logic Flow

```
1. ตรวจ WORKSHOP_ROLE
2. ตรวจ vehicle exists
3. ตรวจ writeConsents[tokenId][msg.sender] > 0     ← ต้องมี consent!
4. ตรวจ accidentSeverity <= 3
5. emit MaintenanceLogged(tokenId, workshop, consentHash, mileageKm,
                          maintenanceHash, partsHash, severity, occurredAt)
6. Backend จับ event → สร้าง MaintenanceLog + PartReplacement entities
```

> **Odometer Snapshot:** ทุกครั้งที่ logMaintenance จะมี mileageKm → Backend ตรวจ monotonic
> (ไมล์ใหม่ ≥ ไมล์เก่า ถ้าไม่ → flag "suspectedRollback")

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **MaintenanceLog** | `INSERT` | workshopAddress, writeConsentRefHash, mileageKm, occurredAt, symptoms, jobs[], laborCost, maintenanceHash, partsHash, accidentSeverity, invoiceUrl, invoiceHash, technicianId, photos[] |
| **PartReplacement** | `INSERT` (per part) | partType, partNo, serialNo, qty, unitPrice |
| **EventLog** | `INSERT` | type=`MAINTENANCE` |

---

### UC-7C: Warranty Claim Flow

> ส่งเคลมประกันศูนย์ด้วยเอกสารที่ลงนาม

#### Logic Flow (Multi-step)

```
Step 1: อู่ส่งเคลม
  └─ logEvent(tokenId, WARRANTY_CLAIM_SUBMITTED, ...)
     payload = {workshop, issue, docsHash[], status=pending}

Step 2: ผู้ผลิตอนุมัติ
  └─ logEvent(tokenId, WARRANTY_CLAIM_APPROVED, ...)

Step 3: เปลี่ยนอะไหล่
  └─ logMaintenance(tokenId, ..., partsHash, severity=0, ...)
     + PartReplacement entity

Step 4: ปิดเคลม
  └─ logEvent(tokenId, WARRANTY_CLAIM_CLOSED, ...)
```

---

## UC-8: ตรวจสภาพรถ – ตรอ.

### UC-8A: Inspection Result Recording

> บันทึกผลตรวจ: ผ่าน/ไม่ผ่าน + ค่าเกณฑ์ (ไอเสีย/เบรก/ไฟ/ช่วงล่าง)

**Contract:** `VehicleRegistry.recordInspection()`

#### Preconditions

| # | เงื่อนไข | ตรวจสอบโดย | ถ้าไม่ผ่าน |
|---|---------|-----------|-----------|
| 1 | ผู้เรียกมี `INSPECTOR_ROLE` | `onlyRole(INSPECTOR_ROLE)` | revert |
| 2 | NFT ต้องมีอยู่ | `vehicleExists(tokenId)` | revert |

#### Parameters

```
tokenId:     uint256
result:      uint8     – 0=fail, 1=pass
metricsHash: bytes32   – hash(ผลตรวจละเอียด)
certHash:    bytes32   – hash(ใบรับรอง PDF)
```

#### Logic Flow

```
1. ตรวจ INSPECTOR_ROLE + vehicle exists
2. issuedAt = block.timestamp
3. ถ้า result == 1 (pass):
   └─ lastInspectionPassAt[tokenId] = issuedAt    ← update cache!
4. emit InspectionRecorded(tokenId, station, result, metricsHash, certHash, issuedAt)
```

> **จุดสำคัญ:** `lastInspectionPassAt` เป็น gate สำหรับ UC-4C (Tax Payment)
> ถ้าไม่มีผลตรวจผ่าน → ต่อภาษีไม่ได้!

#### Postconditions (กรณีผ่าน)

| สถานะ | ก่อน | หลัง |
|-------|------|------|
| lastInspectionPassAt | 0 หรือ timestamp เก่า | **block.timestamp** |
| สามารถต่อภาษีได้ | ไม่ได้ (ถ้าหมดอายุ) | **ได้** (ภายใน 365 วัน) |

#### Off-chain Entity

| Entity | Action | ข้อมูล |
|--------|--------|-------|
| **Inspection** | `INSERT` | stationAddress, stationName, vinVerified, result, metrics{emission,brake,lights,suspension}, metricsHash, certHash, certUrl, issuedAt |
| **EventLog** | `INSERT` | type=`INSPECTION` |

---

### UC-8B: Fraud Prevention (ใบตรวจปลอม)

> ใบตรวจต้องมาจาก wallet ที่มี INSPECTOR_ROLE เท่านั้น

#### Logic

```
1. ใบรับรองที่ "ถูกต้อง" ต้อง:
   ├─ มี InspectionRecorded event บน chain
   ├─ emit จาก address ที่มี INSPECTOR_ROLE
   ├─ certHash ตรงกับ hash ของ PDF จริง
   └─ metricsHash ตรงกับ hash ของผลตรวจจริง

2. ถ้าใบตรวจไม่มี event บน chain → ปลอม
3. ถ้า hash ไม่ตรง → เอกสารถูกแก้ไข
```

### UC-8C: DLT Tax Renewal Gate

> ต่อภาษี/ต่อทะเบียน ต้องมีผลตรวจสภาพผ่านล่าสุด

#### Logic (ใน VehicleRegistry.recordTaxPayment)

```
require(
    lastInspectionPassAt[tokenId] > 0 &&
    block.timestamp - lastInspectionPassAt[tokenId] <= inspectionMaxAge
);
```

```
ตัวอย่าง:
  ตรวจสภาพผ่านเมื่อ:     2027-02-01
  inspectionMaxAge:        365 วัน
  ต่อภาษีได้จนถึง:        2028-02-01

  ถ้าต่อภาษีเมื่อ 2028-03-01 → revert "Inspection expired or not found"
```

---

## 9. Timeline ตัวอย่าง

สมมติรถ VIN = `MM8ABCD1234567890` | รุ่น = KDT E-Car 1.8 | ปี 2026

```
วัน           Event                    Actor              State Change
──────────────────────────────────────────────────────────────────────────────
2026-02-03    VEHICLE_MINTED            Factory-A          NFT เกิด, owner=Factory
              (UC-1A)                                      tokenId=88421

2026-02-03    WARRANTY_DEFINED          Factory-A          terms={3yr, 100k km}
              (UC-1B)                                      startPolicy=at_first_reg

2026-02-04    INVENTORY_TRANSFER        Factory→Dealer     owner=Dealer-BKK01
              (UC-2A)

2026-02-05    FIRST_SALE                Dealer→Nattha      owner=Nattha, count=1
              (UC-2B)                                      price=820,000 (off-chain)

2026-02-06    REGISTRATION              DLT-OFF-77         registered=true
              (UC-4A)                                      greenBook=GREENBOOK-0009912
                                                           warranty.startDate=2026-02-06

2026-02-06    PLATE_ISSUE               DLT-OFF-77         plateNo=1กข-1234
              (UC-4B)

2026-06-01    MAINTENANCE               Workshop-01        mileage=12,000 km
              (UC-7B)                                      jobs=[oil_change, tire_rotation]

2026-09-01    MAINTENANCE               Workshop-01        mileage=18,050 km
              (UC-7B)                                      odometer ✓ (18050 > 12000)

2027-01-12    WARRANTY_CLAIM            Workshop-01        issue=ECU failure
              (UC-7C)                                      status=pending

2027-01-12    WARRANTY_APPROVED         Factory-A          approved

2027-01-12    PART_REPLACED             Workshop-01        ECU-X9 → ECU-X9R
              (UC-7B)

2027-02-01    INSPECTION_PASS           ตรอ-ลาดพร้าว        lastInspectionPassAt=2027-02-01
              (UC-8A)

2027-02-10    TAX_PAID                  DLT                taxYear=2027
              (UC-4C)                                      ✓ inspection pass อยู่ภายใน 365 วัน

2027-02-06    INSURANCE_RENEW           Insurer-ABC        1st class, valid 1 ปี
              (UC-6A)

2027-03-18    CLAIM_FILED               Insurer-ABC        rear-end collision
              (UC-6B)                                      severity=Major

2027-03-20    ACCIDENT_REPAIR           Workshop-01        severity=Structural
              (UC-7B)                                      flags.majorAccident = true

2027-03-25    CLAIM_CLOSED              Insurer-ABC        status=Closed

2027-05-01    FLAG: LIEN_CREATED        Finance-FastMoney  lien=Active
              (UC-5A)                                      transferLocked=true ← !!!

2027-07-01    CONSENT_GRANTED           Nattha → Korn      scope=[maintenance, claims]
              (UC-3B)                                      expires=2027-08-01

2027-07-05    VIEW_HISTORY              Korn               read-only (ตาม consent)
              (UC-3A)

2027-08-01    DISCLOSURE_SIGNED         Nattha → Korn      disclosed=[structural_repair]
              (UC-2D)                                      ack signed by Korn

2027-12-10    LIEN_RELEASED             Finance-FastMoney  lien=Released
              (UC-5B)                                      transferLocked=false ← !!!

2027-12-15    ESCROW_CREATED            Nattha → Korn      conditions=[payment]
              (UC-3C)                                      amount=450,000 THB (USDT)

2027-12-15    ESCROW_FUNDED             Korn               state=Funded

2027-12-15    COND_PAYMENT_CONFIRMED    auto               → AUTO RELEASE
              (UC-3C)                                      เงินไป Nattha

2027-12-15    OWNERSHIP_TRANSFERRED     Nattha → Korn      owner=Korn, count=2
              (UC-3C)                                      NFT โอนสำเร็จ
```

---

## สรุป Business Rules ที่บังคับใช้ On-chain

| # | Rule | บังคับใน Contract | เงื่อนไข |
|---|------|------------------|---------|
| 1 | VIN ซ้ำ mint ไม่ได้ | VehicleNFT | `_usedVins[vinHash] == false` |
| 2 | รถถูก lock โอนไม่ได้ | VehicleNFT._update() | `transferLocked == false` |
| 3 | รถหาย/อายัด/ซาก → auto lock | VehicleRegistry.setFlag() | STOLEN/SEIZED/TOTAL_LOSS → setTransferLock(true) |
| 4 | ยกเลิกทะเบียน → auto lock + flag | VehicleRegistry.setRegistrationStatus() | Cancelled → lock + FLAG_REG_CANCELLED |
| 5 | ต่อภาษีต้องมีผลตรวจผ่าน | VehicleRegistry.recordTaxPayment() | `lastInspectionPassAt` ภายใน `inspectionMaxAge` |
| 6 | อู่ต้องมี consent จึงเขียนได้ | VehicleLifecycle.logMaintenance() | `writeConsents[tokenId][workshop] > 0` |
| 7 | ติดไฟแนนซ์ → lock | VehicleLien.createLien() | setTransferLock(true) |
| 8 | ปลดไฟแนนซ์ → unlock | VehicleLien.releaseLien() | setTransferLock(false) |
| 9 | Escrow ครบเงื่อนไข → auto release | VehicleLien.fulfillCondition() | `fulfilled & mask == mask` |
| 10 | ยกเลิก escrow → คืนเงิน buyer | VehicleLien.cancelEscrow() | refund native/ERC20 |
| 11 | Consent หมดอายุ → ใช้ไม่ได้ | VehicleConsent.verifyConsent() | `block.timestamp <= expiresAt` |
| 12 | Consent ใช้ครั้งเดียว → ใช้ซ้ำไม่ได้ | VehicleConsent.verifyConsent() | `singleUse && !used` |
