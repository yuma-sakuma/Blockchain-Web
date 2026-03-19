# 🔄 Use Cases: End-to-End Workflows

> เอกสารนี้แสดงกระบวนการทำงานแบบข้ามบทบาท (Cross-Role) และข้ามเลเยอร์ (Frontend ↔ Backend ↔ Smart Contract)  
> เพื่อให้เห็นภาพรวมการทำงานจริงของระบบ Blockchain VIN

---

## 1. 🏭 กระบวนการผลิตและส่งมอบรถใหม่ (Manufacturer → Dealer)

| ขั้นตอน | บทบาท | เลเยอร์ | การทำงาน |
|:---:|---|---|---|
| 1 | Manufacturer | Frontend | กรอกข้อมูลรถ (VIN, รุ่น, สเปค) ลงในฟอร์ม |
| 2 | System | Backend | ตรวจสอบ VIN ซ้ำใน DB และเตรียม Metadata JSON อัปโหลดขึ้น Storage |
| 3 | Manufacturer | Smart Contract | เรียกฟังก์ชัน `mintVehicle` เพื่อสร้าง NFT พร้อมผูก Metadata Hash |
| 4 | Manufacturer | Smart Contract | เรียก `safeTransferFrom` โอนสิทธิ์ NFT ไปยัง Wallet ของ Dealer |
| 5 | System | Backend | ตรวจพบ Event การโอน และอัปเดตสถานะ Inventory ของ Dealer ใน DB |

---

## 2. 🤝 การซื้อขายรถมือสอง (P2P Sale with Escrow)

| ขั้นตอน | บทบาท | เลเยอร์ | การทำงาน |
|:---:|---|---|---|
| 1 | Seller (Consumer) | Frontend | ลงประกาศขายรถและสร้างเงื่อนไขราคาผ่าน UI |
| 2 | Seller | Smart Contract | สร้าง Escrow Contract และระบุ Wallet ของผู้ซื้อและเงื่อนไขการโอน |
| 3 | Buyer (Consumer) | Smart Contract | โอนเงินมัดจำ (Native/ERC-20) เข้าสู่ Escrow Contract |
| 4 | Lender (Finance) | Smart Contract | (ถ้ามีหนี้) เรียก `releaseLien` เมื่อได้รับเงินส่วนต่างเพื่อปลดล็อกรถ |
| 5 | Buyer/Seller | Smart Contract | ยืนยันการรับรถ (Fulfill) -> NFT โอนหาผู้ซื้อ และเงินโอนหาผู้ขายอัตโนมัติ |

---

## 🛠️ 3. การซ่อมบำรุงและเคลมประกัน (Insurance & Repair)

| ขั้นตอน | บทบาท | เลเยอร์ | การทำงาน |
|:---:|---|---|---|
| 1 | Consumer | Smart Contract | เรียก `grantWriteConsent` ให้อู่ซ่อมรถมีสิทธิ์เขียนประวัติชั่วคราว |
| 2 | Insurer | Smart Contract | เรียก `recordInsurancePolicy` และบันทึกสถานะเคลม (Claim Filed) |
| 3 | Workshop | Smart Contract | บันทึกประวัติซ่อมและเลขไมล์ผ่าน `logMaintenance` (อาศัย Consent) |
| 4 | Workshop | Backend | อัปโหลดรูปภาพความเสียหายและใบเสร็จ (Digital Evidence) เก็บไว้ใน Storage |
| 5 | Consumer | Smart Contract | เรียก `revokeWriteConsent` เมื่อซ่อมเสร็จเพื่อปิดสิทธิ์การเข้าถึง |

---

## 🏛️ 4. การจดทะเบียนและชำระภาษี (DLT Operations)

| ขั้นตอน | บทบาท | เลเยอร์ | การทำงาน |
|:---:|---|---|---|
| 1 | DLT Officer | Backend | ค้นหาข้อมูล VIN และประวัติการตรวจสภาพจาก Inspector |
| 2 | DLT Officer | Smart Contract | เรียก `registerVehicle` เพื่อบันทึกเลขทะเบียนและเล่มทะเบียน (Green Book) |
| 3 | Consumer | Frontend | ชำระภาษีประจำปีผ่านระบบออนไลน์ |
| 4 | DLT Officer | Smart Contract | เรียก `recordTaxPayment` เพื่ออัปเดตวันหมดอายุภาษีบน Blockchain |
| 5 | System | Backend | ส่ง Notification แจ้งเตือนเจ้าของรถเมื่อภาษีได้รับการอัปเดต |
