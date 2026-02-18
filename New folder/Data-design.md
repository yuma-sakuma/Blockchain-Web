# โครงสร้างข้อมูลกลาง (ใช้ร่วมทุก use case)

## 1. ตัวตนรถ (Vehicle Identity)

### On-chain (NFT / Vehicle Registry Contract)
- `tokenId`: `uint256`
- `vinNumber`: `string`
- `manufacturerId`: `address` (บัญชีโรงงาน/ผู้ผลิตที่ whitelist)
- `manufacturedAt`: `uint64` (unix seconds)
- `modelHash`: `bytes32` (hash(modelJson))
- `specHash`: `bytes32` (hash ของ JSON spec ฉบับเต็มที่อยู่ off-chain)

### Off-chain (DB)
- `vinNumber`: `string` (เก็บในระบบที่เข้าถึงได้เฉพาะสิทธิ์)
- `modelJson`: `{ model: string, year: int16 }`
- `specJson`: `object` (สี, แบต, option ฯลฯ)

---

## 2. Event Log (Event-sourcing)

### On-chain (Event เท่านั้น หรือเก็บเป็น array ก็ได้ แต่ “event” ประหยัด gas)
- `eventType`: `uint32` (หรือ enum)
- `actor`: `address`
- `occurredAt`: `uint64`
- `payloadHash`: `bytes32` (hash ของ payload ที่อยู่ off-chain)
- `evidenceHash`: `bytes32` (hash เอกสาร/รูป/ใบเสร็จ/รายงาน ฯลฯ)

### Off-chain (DB เก็บรายละเอียด)
- `eventId`: `uuid`
- `tokenId`: `uint256`
- `type`: `string`
- `payload`: `object`
- `evidence`: `{ cid/url, hash, mime, size }[]`
- `actorRole`: `enum('MANUFACTURER','DEALER','DLT','FINANCE','INSURER','WORKSHOP','INSPECT','OWNER')`
- `createdAt`: `datetime`

---

## 3. สิทธิ์การอ่าน/เขียน (Consent / Permission)

### On-chain (เอา “rule ที่บังคับใช้” ขึ้นเชน)
- `writerRoleAllowed`: `mapping(uint32 role => bool)` (หรือ allowlist address)
- `writerAllowlist`: `mapping(address => bool)` (เช่น อู่/ตรอ. ที่ผ่านการรับรอง)

### Off-chain
- `grants`: `[{ granteeDid/email, scope, expiresAt }]`
- `pii`: `object` (ชื่อ/ที่อยู่/โทร)

---

# 1) ผู้ผลิตรถ (โรงงานผลิต) – Use cases

## A) Mint NFT ตั้งแต่ผลิตเสร็จ (Mint Vehicle-NFT at Production Exit)
สร้าง NFT ด้วย VIN/รุ่น/สเปก/วันผลิต/โรงงาน + ลายเซ็นผู้ผลิต

### On-chain data
- `tokenId`: `uint256`
- `vinHash`: `bytes32`
- `manufacturerId`: `address`
- `manufacturedAt`: `uint64`
- `modelHash`: `bytes32`
- `specHash`: `bytes32`
- `mintTxHash`: `bytes32` (บันทึกใน off-chain ก็ได้ แต่อ่านจาก chain ได้อยู่แล้ว)
> **เหตุผล:** ต้องพิสูจน์ “รถคันนี้เกิดจากผู้ผลิตจริง” และป้องกันสวม VIN

### Off-chain data
- `vinPlain`: `string` (encrypt at rest)
- `modelJson`: `object` + `canonicalHash`: `bytes32`
- `specJson`: `object` + `canonicalHash`: `bytes32`
- `manufacturerSignature`: `string/bytes` (ถ้าเซ็นเอกสารภายนอก)

---

# 2) ร้านขายรถ / ดีลเลอร์ – Use cases รวมรถมือสองด้วย

## Receive Inventory (Transfer Manufacturer → Dealer)
รับโอน NFT เข้าสต็อกดีลเลอร์

### On-chain data
- `from`: `address` (manufacturer wallet)
- `to`: `address` (dealer wallet)
- `transferReason`: `enum uint8` (e.g. inventory_transfer)
- `docHash`: `bytes32` (hash ใบส่งมอบ/ใบกำกับ)

### Off-chain data
- `deliveryDoc`: `{cid/url, hash: bytes32}`
- `dealerBranchId`: `string`
- `inventoryLotNo`: `string`
- `vehicleConditionAtReceive`: `object` (รูป/สภาพตอนรับ)

## First Owner Registration Workflow
โอน NFT ให้เจ้าของ

### On-chain data (Sale/Delivery)
- `saleContractHash`: `bytes32`
- `buyerOwnerId`: `bytes32` (ไม่ใช้ PII; ใช้ DID hash เช่น keccak256(thaid_did))
- `deliveryAt`: `uint64`
- `paymentRefHash`: `bytes32` (ถ้าโอนเมื่อจ่าย)

### Off-chain data
- `buyerProfile`: `object` (PII เก็บนอกเชน)
- `salePrice`: `uint64` (หน่วยบาท/สตางค์ หรือไม่เก็บเลยก็ได้)
- `paymentMethod`: `enum('cash','bank','crypto')`
- `contractDocCID/hash`
- `deliveryChecklistCID/hash`

## Trade-in / Buyback
รับซื้อรถเก่า: ตรวจประวัติ NFT เพื่อตีราคาแบบโปร่งใส

### On-chain data
- `evaluationHash`: `bytes32` (hash รายงานประเมิน)
- `mileageAtEval`: `uint32` (optional)
- `transfer back to dealer`: ERC721 Transfer (ถ้าซื้อคืนจริง)

### Off-chain data
- `evaluation`: `{score:int16, offerPrice:uint64, notes:string}`
- `signalsUsed`: `string[]` (odometer trend, flags, claims summary)
- `photosCID/hash[]`

## Disclosure Record
บันทึกการเปิดเผยข้อมูลสำคัญ (รถเคยชนหนัก/น้ำท่วม) ลดปัญหาย้อมแมว

### On-chain data
- `seller`: `address`
- `buyerOwnerId`: `bytes32`
- `disclosedItemsMask`: `uint64` (bitmask เช่น flood, structural, majorAccident)
- `ackHash`: `bytes32` (hash เอกสารยอมรับของผู้ซื้อ)
- `signedAt`: `uint64`

### Off-chain data
- `disclosureDocCID/hash`
- `fullDisclosureText`: `string`
- `buyerSignatureImageCID/hash` (ถ้าต้องการ)
- `witness`: `object` (ถ้ามี)

---

# 3) ผู้บริโภค (เจ้าของรถ/ผู้ซื้อ-ผู้ขาย) – Use cases

## A) ซื้อรถใหม่/มือสองอย่างโปร่งใส

### View Vehicle History (Read-only)
ดูประวัติ: เจ้าของกี่มือ, เคยชนไหม, เคยน้ำท่วมไหม, ไมล์ไล่ขึ้นปกติไหม
- **On-chain data:** อ่านจาก events + flags + ownerCount + lien/lock + registration/tax (ไม่ต้องมี write)
- **Off-chain data (สิ่งที่แสดงตามสิทธิ์):**
    - `publicSummary`: `object` (ownerCount, flags summary, odometer trend)
    - `limitedDetails`: `object` (maintenance list, claims summary)
    - `privatePII`: `object` (ชื่อ/ที่อยู่)

### Ownership Transfer (P2P)
ซื้อขายมือสอง: ทำสัญญา/ชำระเงิน/โอน NFT แบบปลอดภัย

**กรณีเงินสดแนบหลักฐาน**
- **On-chain:**
    - `paymentProofHash`: `bytes32`
    - `transferTx`: ERC721 transferFrom(seller,buyer,tokenId) (ต้องผ่าน lock/lien)
- **Off-chain:**
    - `receiptCID/hash`
    - `amount`: `uint64`, `currency`: `enum('THB')`
    - `payer/payeer info` (PII)

**กรณี crypto (Escrow/Atomic)**
- **On-chain:**
    - `escrowContract`: `address`
    - `asset`: `address` (ERC20 token address; หรือ 0x0 = native coin)
    - `amount`: `uint256`
    - `condition`: `enum` (payment_confirmed, lien_released)
    - `paymentTxHash`: `bytes32`
    - *จาก escrow เรียก transfer เมื่อเงื่อนไขครบ*
- **Off-chain:**
    - `dealTermsDocCID/hash`
    - `oracle/ref` (ถ้ามี)

### Consent Management
เลือกเปิดเผยข้อมูลให้ใครเห็นแค่ไหน (เช่น ซ่อนข้อมูลส่วนบุคคล แต่โชว์ประวัติรถ)

#### On-chain data (ถ้าต้อง enforce)
- `grantTo`: `bytes32` (hash ของ DID/Account)
- `scopeMask`: `uint64` (bitmask ของสิทธิ์อ่าน)
- `expiresAt`: `uint64`
- `grantNonce`: `uint64`
- `grantHash`: `bytes32` (hash policy รายละเอียด)

#### Off-chain data
- `granteeIdentity`: `{did:string, verified:boolean}`
- `scope`: `string[]` (vehicle_identity, maintenance_full, claims_full, pii=false)
- `auditLog`: `[]`

## B) การใช้งานหลังซื้อ

### Insurance & Finance Self-Service
แชร์ token id ให้ประกัน/ไฟแนนซ์ดึงข้อมูลที่จำเป็น

- **On-chain data:**
    - ไม่ควรแชร์ PII บนเชน
    - ใช้ ACCESS_GRANTED แบบ scopeMask/expiry เหมือน consent
- **Off-chain:**
    - API gateway ออก accessToken (JWT) ให้ insurer/finance ตาม scope
    - `audit`: who accessed what when

---

# 4) กรมการขนส่งทางบก (DLT) – Use cases

## A) จดทะเบียน-เล่มเขียว-ภาษี-การโอน

### On-chain Registration (เล่มเขียวดิจิทัล)
เมื่อขายครั้งแรก: เปลี่ยนสถานะจาก “ยังไม่จดทะเบียน” → “จดทะเบียนแล้ว”

#### On-chain data
- `isRegistered`: `bool`
- `registeredAt`: `uint64`
- `dltOfficer`: `address` (บัญชีเจ้าหน้าที่/หน่วยงาน)
- `greenBookNoHash`: `bytes32` (hash เลขเล่ม/เลขอ้างอิง)
- `registrationDocHash`: `bytes32`
- `registrationStatus`: `enum uint8` (registered/suspended/cancelled)

#### Off-chain data
- `greenBookNoPlain`: `string`
- `registrationDocCID/hash`
- `ownerIdentityAtReg`: `object` (PII)

### Plate Issuance / Plate Change
ออกป้าย/เปลี่ยนป้าย/ป้ายหาย (ผูกกับ NFT แต่มีสถานะ “ทะเบียน/ป้าย” แยก record)

#### On-chain data
- `plateNoHash`: `bytes32`
- `provinceCode`: `uint16` (หรือ hash)
- `plateEventType`: `enum uint8` (issue/change/lost)
- `plateEventDocHash`: `bytes32`
- `effectiveAt`: `uint64`

#### Off-chain data
- `plateNoPlain`: `string`
- `policeReportCID/hash` (กรณีป้ายหาย)
- `reason`: `string`

### Tax & Annual Fee Payment Status
อัปเดตสถานะชำระภาษีประจำปี, ต่อทะเบียน (บันทึกเป็น event)

#### On-chain data
- `taxYear`: `uint16`
- `paidAt`: `uint64`
- `validUntil`: `uint64`
- `receiptHash`: `bytes32`
- `status`: `enum uint8` (paid/unpaid/overdue)

#### Off-chain data
- `receiptCID/hash`
- `amount`: `uint64`
- `paymentChannel`: `enum`

### Vehicle Status Flags
ติดธงสถานะ: รถหาย/ถูกอายัด, รถชนหนัก, รถน้ำท่วม, รถยกเลิกทะเบียน, ซาก

#### On-chain data
- `flags`: `uint64` (bitset: stolen,seized,majorAccident,flood,totalLoss,scrapped,regCancelled)
- `flagSource`: `address`
- `refHash`: `bytes32` (รายงานตำรวจ/คำสั่งศาล/ผลประเมิน)
- `transferLocked`: `bool` (คุมการโอนแบบบังคับใช้)

#### Off-chain data
- `caseDocCID/hash`
- `details`: `object`
- `statusTimeline`: `[]`

---

# 5) ตรวจสภาพรถ (ตรอ.) – Use cases

## Inspection Appointment & Identity Verify
ยืนยันสถานประกอบการ + ยืนยันรถตาม VIN

### On-chain data
- `station`: `address`
- `vinVerified`: `bool` (หรือ just implicit)
- `result`: `enum uint8` (pass/fail)
- `metricsHash`: `bytes32` (ผลตรวจละเอียด)
- `certHash`: `bytes32` (hash PDF ใบรับรอง)
- `issuedAt`: `uint64`

### Off-chain data
- metrics รายละเอียด (ไอเสีย/เบรก/ไฟ/ช่วงล่าง) เป็น `object`
- cert PDF CID/hash

## Inspection Result Recording
บันทึกผลตรวจ: ผ่าน/ไม่ผ่าน + ค่าเกณฑ์ (ไอเสีย/เบรก/ไฟ/ช่วงล่าง)

### On-chain rule/data
- DLT contract เมื่อจะ emit `TAX_STATUS_UPDATED` ต้อง check:
    - มี `INSPECTION_RESULT(result=pass)` ล่าสุดภายในช่วงที่กำหนด
- datatype ที่เกี่ยว:
    - `lastInspectionPassAt`: `uint64` (คำนวณจาก event หรือ cache state)
    - `maxAgeSeconds`: `uint64`

### Off-chain
- DLT workflow logs (optional)

---

# Optional Feature (just design for now)

## 6) ไฟแนนซ์/การเงิน – Use cases

### A) สินเชื่อ-เช่าซื้อผูกกับ NFT (Lien / Lock)

#### Loan Origination with Vehicle-NFT
ขอสินเชื่อโดยใช้ NFT เป็นหลักประกัน/ทรัพย์อ้างอิง

**On-chain data**
- `lender`: `address`
- `lienStatus`: `enum uint8` (none/active/released/defaulted)
- `transferLocked`: `bool`
- `loanContractHash`: `bytes32`
- `startedAt`: `uint64`
- `releaseConditionHash`: `bytes32` (เงื่อนไขปลดล็อก)

**Off-chain data**
- `loanAccountNo`: `string`
- `principal`: `uint64`, `interestRateBps`: `uint16`, `termMonths`: `uint16`
- `contractDocCID/hash`
- `borrowerKYCRef`: `string`

#### Create Lien Record (ติดภาระผูกพัน)
เพิ่มสถานะ “ติดไฟแนนซ์” บน NFT ทำให้ “โอนกรรมสิทธิ์ไม่ได้” หรือโอนได้แบบมีเงื่อนไข
(โอนแบบมีเงื่อนไข: เงินเข้าครบ → ปลดล็อก → โอนได้)

**On-chain data**
- `escrowId`: `bytes32`
- `buyer`: `address`, `seller`: `address`
- `conditionsMask`: `uint64` (payment_confirmed + lien_released)
- `depositAsset`: `address`, `depositAmount`: `uint256`
- `state`: `enum` (created/funded/released/cancelled)
- *เมื่อครบเงื่อนไข → trigger transfer*

**Off-chain data**
- ข้อตกลง 3 ฝ่าย (buyer/seller/lender) CID/hash
- ช่องทางติดต่อ/ตารางนัดโอน ฯลฯ

## 7) ประกันภัย – Use cases

### A) ทำกรมธรรม์ผูกกับรถ

#### Policy Renewal / Change Coverage
ต่ออายุ/เปลี่ยนชั้นประกัน/เปลี่ยนผู้ขับขี่หลัก (เก็บเป็น record อ้างอิง)

**On-chain data**
- `insurer`: `address`
- `policyNoHash`: `bytes32`
- `action`: `enum uint8` (new/renew/change/cancel)
- `validFrom`: `uint64`, `validTo`: `uint64`
- `coverageHash`: `bytes32`

**Off-chain data**
- รายละเอียดกรมธรรม์เต็ม (ผู้ขับขี่หลัก, ความคุ้มครอง) CID/hash
- `premium amount`, `deductibles` ฯลฯ

### B) เคลม/อุบัติเหตุ/ตรวจทุจริต

#### Claim Filing with Evidence Hash
เปิดเคลม โดยแนบรูป/รายงานตำรวจ/ใบเสนอราคา (เก็บ hash ป้องกันปลอม)

**On-chain data**
- `claimNoHash`: `bytes32`
- `filedAt`: `uint64`
- `evidenceHashes`: `bytes32[]` (รูป/ตำรวจ/ใบเสนอราคา)
- `claimStatus`: `enum uint8` (filed, estimating, approved, repairing, closed, rejected)
- `severity`: `enum uint8` (minor/major/structural/total_loss)
- *ถ้า total loss → set `flags.totalLoss = true` + (optional) `transferLocked`*

**Off-chain data**
- รูป/วิดีโอ CID/hash, รายงานตำรวจ CID/hash
- estimate รายการซ่อม CID/hash
- `fraud signals` (internal)

#### Total Loss / Salvage
ถ้าซาก: ติดธง “total loss” + เปลี่ยนสถานะการใช้งานของ NFT (ห้ามกลับมาเป็นรถปกติ)

## 8) อู่ซ่อมรถ / ศูนย์บริการ – Use cases

### A) บันทึกประวัติซ่อมแบบตรวจสอบได้

#### Maintenance Log Write
บันทึก: วันที่/ไมล์/อาการ/รายการงาน/ค่าแรง/อะไหล่/ผู้ทำงาน

**On-chain data (สำคัญ: บังคับ “ใครเขียนได้”)**
- `workshop`: `address`
- `writeConsentRefHash`: `bytes32` (อ้างอิงถึง consent)
- `mileageKm`: `uint32`
- `maintenanceHash`: `bytes32`
- `partsHash`: `bytes32`
- `accidentSeverity`: `enum uint8` (0 none,1 minor,2 major,3 structural)
- `occurredAt`: `uint64`

**Off-chain data**
- `jobs`: `string[]`, `symptoms`: `string`, `laborCost`: `uint64`
- `parts`: `[{ partType:string, partNo:string, serialNo?:string, qty:uint16 }]`
- `invoiceCID/hash`
- `technicianId`: `string`
- รูปก่อน/หลังซ่อม CID/hash

#### Parts Replacement Record
บันทึกการเปลี่ยนอะไหล่สำคัญ (แบต EV, ถุงลม, ECU ฯลฯ อ้างอิงจากเลขประจำหน่วย Part Number)

#### Accident Repair Severity Flag
ถ้างานโครงสร้างหนัก: ติดธงระดับความเสียหาย (minor/major/structural)

### B) สิทธิ์และความยินยอม

#### Owner Consent for Writing
เจ้าของอนุญาตให้อู่เขียน record เฉพาะครั้งนั้น (ลดการใส่ข้อมูลมั่ว)

**On-chain data**
- `owner`: `address`
- `workshop`: `address`
- `scopeMask`: `uint64` (maintenance, odometer, parts, accident_flag)
- `expiresAt`: `uint64`
- `singleUse`: `bool`
- `nonce`: `uint64`

**Off-chain data**
- consent detail + audit
- เอกสารเคลมประกันศูนย์ CID/hash
- manufacturer approval record

#### Warranty Claim Flow
ส่งเคลมประกันศูนย์/ประกันภัยด้วยเอกสารที่ลงนามและตรวจสอบย้อนกลับได้
