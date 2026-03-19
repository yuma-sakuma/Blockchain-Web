# 🔗 Use Cases: Integration & Data Mapping

> เอกสารนี้อธิบายการเชื่อมต่อระหว่างข้อมูลบน Blockchain (On-chain) กับระบบจัดเก็บภายนอก (Off-chain)  
> และการ Sync ข้อมูลกับหน่วยงานภายนอก

---

## 1. 🗺️ Data Architecture Mapping

เน้นการจับคู่ระหว่างข้อมูลสั้นๆ บนโซ่ กับข้อมูลรายละเอียดสูงนอกโซ่

| ข้อมูล (Data Item) | On-chain (Blockchain) | Off-chain (Backend / IPFS) |
|---|---|---|
| **ตัวตนรถ** | Token ID (Uint256) | Model Name, Color, Engine Specs |
| **เลขตัวถัง** | VIN Hash (Keccak256) | VIN Plain Text (สำหรับค้นหา) |
| **เจ้าของรถ** | Owner Address (Address) | Wallet Address (ไม่มีการเก็บชื่อจริง) |
| **เอกสารรถ** | Document Hash (CIDs) | PDF Files, JPEG Photos (IPFS/Cloud) |
| **ผลตรวจสภาพ** | Result Hash + Pass/Fail | Full Metrics Data (ค่ามลพิษ, แรงเบรก) |
| **ประวัติซ่อม** | Service Type + Odometer | Spare Parts List, Workshop Receipt |

---

## 2. 🔄 Synchronization Flow (Event Indexing)

อธิบายว่า Backend ติดตามเหตุการณ์บน Blockchain อย่างไร

- **Use Case: Real-time Update**
    - **Trigger**: เกิด Event `VehicleMinted` หรือ `Transfer` บน Smart Contract
    - **Action**: Backend Listener (เช่น Ethers.js) ตรวจพบ Event
    - **Process**: ดึงข้อมูลจาก Event และเรียก API ภายนอกเพื่ออัปเดตฐานข้อมูล SQL ของเรา
    - **Outcome**: หน้า UI แสดงข้อมูลล่าสุดโดยไม่ต้องขอให้ผู้ใช้ Refresh ตลอดเวลา

---

## 🌍 3. External System Connectivity

การเชื่อมต่อกับระบบภายนอกโครงการ

- **DLT Gateway Integration**:
    - ตรวจสอบความถูกต้องของเลขทะเบียนรถจากฐานข้อมูลจริงของกรมขนส่งก่อนอนุญาตให้จดทะเบียนบนโซ่
- **InsurTech API**:
    - เชื่อมต่อกับระบบของบริษัทประกันภัยเพื่อดึงข้อมูลกรมธรรม์ปัจจุบันมาแสดงผลคู่กับ NFT
- **SMS/Email Gateway**:
    - ส่ง OTP หรือการแจ้งเตือนความปลอดภัยเมื่อมีการโอนย้ายทรัพย์สิน (NFT)

---

## 📦 4. Distributed Storage (IPFS) Use Cases

- **Large Media Handling**: การเก็บรูปรูปรถ 360 องศา หรือวิดีโอตรวจสภาพ โดยบันทึกเพียง CID ลงบน Blockchain เพื่อประหยัด Gas
- **Data Integrity**: การยืนยันว่าไฟล์ PDF สัญญาซื้อขายไม่ถูกแก้ไข โดยเทียบ Hash บนโซ่กับไฟล์จริงบน IPFS
