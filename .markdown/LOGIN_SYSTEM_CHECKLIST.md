# Login System Checklist (Role-Based Access Control)

เอกสารนี้ใช้สำหรับตรวจสอบความพร้อมของระบบ Login และการจัดการสิทธิ์ (Authorization) โดยแยกตามประเภทผู้ใช้งาน (Actor) และ Use Cases ที่อ้างอิงจาก `VEHICLE_NFT_DEV_CHECKLIST.md`

---

## 0. Core Authentication Infrastructure
- [x] **Wallet Connection**: พัฒนาระบบเชื่อมต่อ Web3 Wallet (Metamask, etc.)
- [x] **Signature Verification**: ระบบตรวจสอบ Digital Signature เพื่อยืนยันตัวตนเจ้าของ Wallet (Login via Signature)
- [x] **Role Resolution**: ระบบตรวจสอบสิทธิ์จาก Smart Contract / Database ว่า Wallet Address นี้คือ Role อะไร
- [x] **Session Management**: การจัดการ JWT หรือ Session หลังยืนยันตัวตนสำเร็จ
- [x] **Route Protection**: ป้องกันการเข้าถึง Page/Component ที่ไม่ได้รับอนุญาต (Private Routes)

---

## 1. Manufacturer (โรงงานผลิต)
**Role:** `MANUFACTURER`
**Access Level:** Write (Minting / Warranty), Read (Own Production)

### Checklist
- [x] **Login**: ตรวจสอบว่าเป็น Address ของ Manufacturer ที่ลงทะเบียนไว้ (Whitelist)
- [x] **Dashboard Access**: เข้าถึงหน้า "Production Dashboard"
- [x] **Use Case Authorization**:
  - [x] **Mint NFT (1A)**: มีสิทธิ์เรียกฟังก์ชัน Mint และ Sign Transaction ได้
  - [x] **Warranty Setup (1B)**: มีสิทธิ์กำหนดเงื่อนไขรับประกัน (Warranty Terms)
  - [x] **Edit/Delete**: *ไม่มีสิทธิ์* แก้ไขข้อมูลรถหลังจาก Mint แล้ว (ตามหลัก Blockchain)

---

## 2. Dealer (ดีลเลอร์ / ร้านขายรถ)
**Role:** `DEALER`
**Access Level:** Write (Transfer / Sales / Trade-in), Read (Inventory)

### Checklist
- [x] **Login**: ตรวจสอบว่าเป็น Address ของ Dealer ที่ได้รับอนุญาต
- [x] **Dashboard Access**: เข้าถึงหน้า "Dealer Inventory Management"
- [x] **Use Case Authorization**:
  - [x] **Inventory Receipt (2A)**: มีสิทธิ์กดรับโอนรถ (Accept Transfer) จาก Manufacturer
  - [x] **First Owner Registration (2B)**: มีสิทธิ์สร้างสัญญาซื้อขาย และโอนรถให้ Consumer
  - [x] **Trade-in / Buyback (2C)**: มีสิทธิ์ประเมินราคาและรับโอนรถจาก Consumer
  - [x] **History Disclosure (2D)**: มีสิทธิ์สร้างและ Sign เอกสารเปิดเผยประวัติรถ (Disclosure Form)

---

## 3. Consumer (ผู้บริโภค / เจ้าของรถ)
**Role:** `CONSUMER` (General User)
**Access Level:** Owner (Manage Own Assets), Public (Read Limited Data)

### Checklist
- [x] **Login**: รองรับ Public Address ทั่วไป (ไม่ต้อง Whitelist ล่วงหน้า แต่ต้องมีรถในครอบครองถึงจะเห็น Dashboard เจ้าของ)
- [x] **Dashboard Access**: เข้าถึงหน้า "My Garage" (แสดงรายการรถที่ตนเองถือครอง)
- [x] **Use Case Authorization**:
  - [x] **Ownership Transfer (3A)**: 
    - [x] เห็นปุ่ม "Transfer Ownership" เฉพาะรถที่ตัวเองเป็น `currentOwner`
    - [x] สามารถอัปโหลดหลักฐานการโอนเงิน (Payment Proof)
  - [x] **Consent Management (3B)**: มีสิทธิ์กด "อนุญาต/ยกเลิก" ให้คนอื่นดูข้อมูลรถตนเอง
  - [x] **Data Sharing (3C)**: มีสิทธิ์กดแชร์ข้อมูลให้ประกัน/ไฟแนนซ์

---

## 4. Department of Land Transport (DLT - กรมขนส่งฯ)
**Role:** `DLT_OFFICER` / `DLT_SYSTEM`
**Access Level:** Official Authority (Registration / Tax / Flags)

### Checklist
- [x] **Login**: ตรวจสอบว่าเป็น Address ของ DLT Official
- [x] **Dashboard Access**: เข้าถึงหน้า "Registry Office Portal"
- [x] **Use Case Authorization**:
  - [x] **Registration (4A)**: มีสิทธิ์บันทึกข้อมูลเล่มทะเบียน (Green Book) และเปลี่ยนสถานะ `isRegistered`
  - [x] **License Plate (4B)**: มีสิทธิ์แก้ไขข้อมูลป้ายทะเบียน (Issue / Change / Mark Lost)
  - [x] **Tax Payment (4C)**: มีสิทธิ์บันทึกการต่อภาษี (ตรวจสอบผล Inspection ก่อนได้)
  - [x] **Regulatory Flags (4D)**: มีสิทธิ์ปักธงแจ้งสถานะพิเศษ (ยึดใบขับขี่ / อายัดทางกฎหมาย)

---

## 5. Finance (ไฟแนนซ์)
**Role:** `LENDER`
**Access Level:** Financial Claims (Lien / Seize)

### Checklist
- [x] **Login**: ตรวจสอบว่าเป็น Address ของสถาบันการเงินพันธมิตร
- [x] **Dashboard Access**: เข้าถึงหน้า "Loan & Lien Management"
- [x] **Use Case Authorization**:
  - [x] **Loan Setup (5A)**: มีสิทธิ์สร้าง Lien (ภาระผูกพัน) บน TokenId
  - [x] **Repossession (5B)**: มีสิทธิ์เปลี่ยนสถานะรถเป็น "Seized" (ยึด) กรณีผิดนัดชำระตามสัญญา
  - [x] **Release Lien (5C)**: มีสิทธิ์ปลดล็อคสถานะเมื่อชำระหนี้ครบ

---

## 6. Insurance (ประกันภัย)
**Role:** `INSURER`
**Access Level:** Policy & Claims

### Checklist
- [x] **Login**: ตรวจสอบว่าเป็น Address ของบริษัทประกันภัย
- [x] **Dashboard Access**: เข้าถึงหน้า "Insurance Policy Manager"
- [x] **Use Case Authorization**:
  - [x] **Policy Mgmt (6A)**: มีสิทธิ์อัปเดตข้อมูลกรมธรรม์
  - [x] **Claims Processing (6B)**: 
    - [x] มีสิทธิ์บันทึกการเคลม (Claim Filed)
    - [x] มีสิทธิ์เปลี่ยนสถานะ Claim
    - [x] มีสิทธิ์ระบุระดับความเสียหาย (Accident Severity / Total Loss)

---

## 7. Service Center (อู่ซ่อม / ศูนย์บริการ)
**Role:** `SERVICE_PROVIDER`
**Access Level:** Maintenance Records

### Checklist
- [x] **Login**: ตรวจสอบว่าเป็น Address ของศูนย์บริการที่ได้รับรอง
- [x] **Dashboard Access**: เข้าถึงหน้า "Workshop Job Cards"
- [x] **Use Case Authorization**:
  - [x] **Record Maintenance (7A)**: 
    - [x] ต้องได้รับ Consent จากเจ้าของรถก่อนบันทึก (Check Consent)
    - [x] สามารถบันทึกรายการซ่อมและอะไหล่
  - [x] **Odometer (7B)**: มีสิทธิ์บันทึกเลขไมล์ (System validates monotonic increase)
  - [x] **Critical Parts (7C)**: มีสิทธิ์อัปเดต Serial Number ของอะไหล่สำคัญ

---

## 8. Inspection Center (ตรอ.)
**Role:** `INSPECTOR`
**Access Level:** Vehicle Check & Certification

### Checklist
- [x] **Login**: ตรวจสอบว่าเป็น Address ของ ตรอ.
- [x] **Dashboard Access**: เข้าถึงหน้า "Inspection Station"
- [x] **Use Case Authorization**:
  - [x] **Perform Inspection (8A)**: 
    - [x] มีสิทธิ์บันทึกผลตรวจสภาพ (Pass/Fail)
    - [x] ออกใบรับรองอิเล็กทรอนิกส์ (Inspection Cert)
  - [x] **Verify Physical Car**: มีขั้นตอนยืนยัน VIN ที่ตัวถังรถจริง

---

## 9. Security & Validation Rules (System-wide)
- [x] **Check Ownership**: ทุกการกระทำที่เกี่ยวกับ "ทรัพย์สิน" ต้องเช็คว่า `msg.sender == currentOwner`
- [x] **Check Consent**: ทุกการกระทำที่ "อ่าน/เขียนข้อมูลส่วนตัว" โดย Third Party (U7, U6) ต้องเช็ค Consent
- [x] **Check Lien**: การโอนรถต้องเช็คว่า `transferLocked == false` (ไม่มีภาระไฟแนนซ์)
