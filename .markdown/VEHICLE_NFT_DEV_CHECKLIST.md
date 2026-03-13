# Vehicle NFT System Development Checklist

เอกสารนี้รวบรวม Use Cases, Event Logs และ Logic สำหรับการพัฒนาระบบ Vehicle NFT โดยใช้รูปแบบ **Event Sourcing** ("ไม่ลบอดีต → เพิ่มเหตุการณ์ใหม่")

---

## 0. Core Data Structures (โครงสร้างข้อมูลหลัก)

### **A. Vehicle NFT State (Snapshot)**
- [x] **Core Metadata (เปลี่ยนน้อย)**
  - `tokenId`: Unique Identifier
  - `vin`: Vehicle Identification Number
  - `makeModelTrim`: ยี่ห้อ รุ่น และรุ่นย่อย (e.g., KDT E-Car / 1.8 / Premium)
  - `spec`: ข้อมูลจำเพาะ (สี, เครื่อง, แบต, options)
  - `production`: { manufacturedAt, plantId, batchNo }
  - `manufacturerSignature`: ลายเซ็นดิจิทัลรับรองจากโรงงาน

- [x] **State Snapshot (สถานะปัจจุบัน - คำนวณจาก Event ล่าสุด)**
  - **Ownership**:
    - `currentOwner`: (Manufacturer / Dealer / Person)
    - `ownerCount`: จำนวนครั้งที่เปลี่ยนมือ
  - **Registration (DLT)**:
    - `isRegistered`: boolean
    - `plateNo`: เลขทะเบียนปัจจุบัน
    - `taxStatus`: paid/unpaid + validUntil
    - `bookNo`: เลขเล่มทะเบียน
  - **Warranty**:
    - `startDate`: วันเริ่มประกัน
    - `terms`: เงื่อนไข (ปี, ระยะทาง)
  - **Flags (สถานะพิเศษ)**:
    - `stolen`: รถหาย
    - `seized`: ถูกอายัด
    - `majorAccident`: ชนหนัก
    - `flood`: น้ำท่วม
    - `totalLoss`: ขายซาก/ห้ามใช้
    - `scrapped`: ทำลายซาก
  - **Lien (ภาระผูกพัน/ไฟแนนซ์)**:
    - `status`: none / active / released
    - `transferLocked`: boolean (ห้ามโอน)
  - **Consent**:
    - `writersAllowed`: รายชื่อ entity ที่ได้รับอนุญาตให้เขียนข้อมูล
    - `readPermissions`: ระดับการเปิดเผยข้อมูล (public / limited / private)

### **B. Event Log Structure**
- [x] **Common Fields**: `timestamp`, `actor` (ผู้กระทำ), `type` (ชนิด event), `payload` (ข้อมูล), `signature` (ลายเซ็นรับรอง)

---

## 1. Manufacturer (โรงงานผลิต)

### **1A. Mint NFT (Production Exit)**
- [x] **Action**: Create new NFT record.
- [x] **Event**: `MANUFACTURER_MINTED`
  - **Payload**: VIN, Model Info, Spec, Production Data, Mfg Signature.
- [x] **State Change**:
  - สร้าง `tokenId`
  - `currentOwner` = Manufacturer
  - `isRegistered` = false
  - Flags = false ทั้งหมด

### **1B. Warranty Setup**
- [x] **Action**: Define warranty terms defined at production (starts usually at registration).
- [x] **Event**: `WARRANTY_DEFINED`
  - **Payload**: `startPolicy` (e.g., at_first_registration), `terms` (years, km, coverage).
- [x] **State Change**:
  - `warranty.terms` ได้รับการตั้งค่า (startDate รอ trigger)

---

## 2. Dealer (ดีลเลอร์ / ร้านขายรถ)

### **2A. Inventory Receipt**
- [x] **Action**: Accept transfer from Manufacturer.
- [x] **Event**: `OWNERSHIP_TRANSFERRED`
  - **Payload**: `from` (Manufacturer), `to` (Dealer), `reason` (inventory_transfer).
- [x] **State Change**: `currentOwner` = Dealer

### **2B. First Owner Registration**
- [x] **Action**: Sell new car to consumer.
- [x] **Event**: `SALE_CONTRACT_CREATED`
  - **Payload**: Buyer info, Price, Payment Method, Contract Hash.
- [x] **Event**: `OWNERSHIP_TRANSFERRED`
  - **Payload**: `from` (Dealer), `to` (Consumer), `reason` (first_owner_delivery).
- [x] **State Change**: `currentOwner` = Consumer, `ownerCount` = 1

### **2C. Trade-in / Buyback**
- [x] **Action**: Dealer assesses used car and buys it back.
- [x] **Event**: `TRADEIN_EVALUATED`
  - **Payload**: Mileage check, Evaluation Score, Price Offer.
- [x] **Event**: `OWNERSHIP_TRANSFERRED`
  - **Payload**: `from` (Consumer), `to` (Dealer), `reason` (trade_in_buyback).
- [x] **State Change**: `currentOwner` = Dealer, `ownerCount` + 1 (optional logic)

### **2D. History Disclosure**
- [x] **Action**: Disclose sensitive history (flood, accident) to buyer before sale.
- [x] **Event**: `DISCLOSURE_SIGNED`
  - **Payload**: List of disclosed items, Buyer acknowledgement hash.
- [x] **Verification**: Ensure this event exists before allowing sale of flagged vehicles.

---

## 3. Consumer (ผู้บริโภค / เจ้าของรถ)

### **3A. Ownership Transfer (P2P)**
- [x] **Scenario 1: Cash + Proof**
  - **Event**: `PAYMENT_PROOF_SUBMITTED` (Buyer uploads receipt).
  - **Event**: `OWNERSHIP_TRANSFERRED` (Seller confirms & transfers).
- [x] **Scenario 2: Crypto Atomic Swap** (Optional for Prototype)
  - **Event**: `ESCROW_CREATED`, `PAYMENT_CONFIRMED`.
  - **Event**: `OWNERSHIP_TRANSFERRED` (Auto-trigger via Smart Contract).

### **3B. View History & Consent**
- [x] **Action**: Manage who can see what data.
- [x] **Event**: `CONSENT_UPDATED`
  - **Payload**: `grantTo` (User/Entity), `permissions` (scope), `expiresAt`.
- [x] **Logic**: API filters data based on active consent before returning to requestor.

### **3C. Insurance/Finance Data Sharing**
- [x] **Event**: `ACCESS_GRANTED`
  - **Payload**: Grant specific scope (e.g., mileage, claims) to Insurer/Bank.

---

## 4. Department of Land Transport (DLT - กรมขนส่งฯ)

### **4A. Registration (Digital Green Book)**
- [x] **Action**: Register new vehicle.
- [x] **Event**: `DLT_REGISTRATION_UPDATED`
  - **Payload**: DLT Officer ID, Reg Date, Book No.
- [x] **State Change**: `isRegistered` = true, `warranty.startDate` triggers (if policy matches).

### **4B. License Plate Operations**
- [x] **Event**: `PLATE_EVENT_RECORDED`
  - **Type**: `issue` / `change` / `lost`
  - **Payload**: Plate Number, Province, Reason/Police Report Hash.
- [x] **State Change**: Update `plateNo`.

### **4C. Tax Payment**
- [x] **Event**: `TAX_STATUS_UPDATED`
  - **Payload**: Tax Year, Paid Date, Valid Until.
- [x] **State Change**: `taxStatus` = paid, update Expiry Date.
- [x] **Constraint**: Check `INSPECTION_RESULT_RECORDED` (pass) before accepting tax payment for cars > 7 years (or criteria).

### **4D. Status Flags (Regulatory)**
- [x] **Event**: `FLAG_UPDATED`
  - **Payload**: Flag Type (stolen, seized, etc.), Value (true), Police Report Hash.
- [x] **State Change**: Update specific flag, optionally set `transferLocked` = true.

---

## 5. Finance (ไฟแนนซ์ / สถาบันการเงิน)

### **5A. Loan & Lien (ติดไฟแนนซ์)**
- [x] **Event**: `LIEN_CREATED`
  - **Payload**: Lender ID, Contract Hash, Rules (`transferLocked` = true).
- [x] **State Change**: `lien.status` = active, `transferLocked` = true.

### **5B. Repossession (ยึดรถ)**
- [x] **Event**: `REPOSSESSION_RECORDED`
  - **Payload**: Legal Notice Hash, Actions (Seized).
- [x] **State Change**: `flags.seized` = true, `transferLocked` = true.

### **5C. Payoff & Release**
- [x] **Event**: `LIEN_RELEASED`
  - **Payload**: Receipt Hash.
- [x] **State Change**: `lien.status` = released, `transferLocked` = false.

### **5D. Conditional Transfer (Escrow)**
- [x] **Event**: `CONDITIONAL_TRANSFER_CREATED` (Optional for Prototype)
  - **Logic**: Lock transfer until `lien_released` and `payment_confirmed`.

---

## 6. Insurance (ประกันภัย)

### **6A. Policy Management**
- [x] **Event**: `INSURANCE_POLICY_UPDATED`
  - **Payload**: Policy No, Validity Period, Coverage Level.

### **6B. Claims & Accidents**
- [x] **Event**: `CLAIM_FILED`: Init claim with evidence hashes (photos/police report).
- [x] **Event**: `WORKSHOP_ESTIMATE_SUBMITTED`: Garage submits costs.
- [x] **Event**: `CLAIM_STATUS_CHANGED`: Approved/Repairing/Closed.
- [x] **Event**: `ACCIDENT_REPAIR_FLAGGED`:
  - **Payload**: Severity (minor/major/structural).
  - **State Change**: Update `flags.majorAccident` if severity is high.
- [x] **Event**: `TOTAL_LOSS_DECLARED`:
  - **State Change**: `flags.totalLoss` = true.

---

## 7. Service Center / Garage (อู่ซ่อม / ศูนย์บริการ)

### **7A. Service Records**
- [x] **Event**: `MAINTENANCE_RECORDED`
  - **Payload**: Jobs done, Parts used, Cost.
- [x] **Constraint**: Requires `WRITE_CONSENT_GRANTED` from owner.

### **7B. Odometer Integrity**
- [x] **Event**: `ODOMETER_SNAPSHOT`
  - **Payload**: Mileage Reading.
- [x] **App Logic**: Validate new mileage >= old mileage (Monotonic check). Alert `suspectedRollback` if fails.

### **7C. Critical Parts**
- [x] **Event**: `CRITICAL_PART_REPLACED`
  - **Payload**: Old Part SN, New Part SN (e.g., Battery, ECU).
- [x] **State Change**: Update `spec` details for specific components.

---

## 8. Inspection Center (ตรอ.)

### **8A. Inspection Process**
- [x] **Event**: `INSPECTION_CHECKIN_VERIFIED`: Verify VIN & Physical car.
- [x] **Event**: `INSPECTION_RESULT_RECORDED`
  - **Payload**: Result (pass/fail), Metrics (emissions, brake).
- [x] **Event**: `INSPECTION_CERT_ISSUED`: Issue digital cert with signature.

### **8B. Integration with DLT**
- [x] **Logic**: DLT Tax Renewal system queries for valid `INSPECTION_RESULT_RECORDED` (pass) event within valid window.

---

## Summary System Timeline (Lifecycle Example)
1. **Production**: Factory mints NFT → Owner = Factory.
2. **Logistics**: Dealer receives NFT → Owner = Dealer.
3. **Sales**: First Sale → Owner = Consumer, DLT Registers (Green Book), Warranty Starts.
4. **Usage**:
   - Garage records Maintenance & Mileage.
   - Insurance records Claims/Accidents.
   - Finance locks transfer if under loan.
5. **Regulations**: Inspection (Tor-Ror-Or) Pass → DLT renews Tax.
6. **Resale**:
   - Owner grants consent for history view.
   - Seller discloses defects (if any).
   - Buyer pays (Cash/Crypto) → Ownership Transfer.
