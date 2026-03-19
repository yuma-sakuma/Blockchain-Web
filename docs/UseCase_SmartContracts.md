# ⛓️ Use Cases: Smart Contracts Layer

> เอกสารนี้รวบรวม Use Cases ที่ทำงานในระดับ **Smart Contract (On-chain)**  
> เน้นการทำ Transaction, การเปลี่ยนแปลง State ของ Blockchain และ Logic เชิงธุรกิจที่บังคับใช้โดย Code

| ID | Use Case | บทบาท (Role) | รายละเอียดทางเทคนิค (Smart Contract) |
|---|----------|-------------|-----------------------------------|
| A-01 | จัดการ Role ของผู้ใช้ | Admin | ใช้ `AccessControl` เพื่อ `grantRole` / `revokeRole` |
| A-02 | กำหนดค่าพารามิเตอร์ระบบ | Admin | บันทึกค่า configuration เช่น `inspectionMaxAge` ลงใน State |
| A-04 | จัดการ Smart Contract | Admin | การ Deploy, Upgrade หรือ Pause contract |
| A-07 | จัดการ Lien กรณีพิเศษ | Admin | การปลดภาระผูกพันหรือตั้ง Default โดยแอดมิน |
| M-01 | Mint Vehicle NFT | Manufacturer | เรียก `mintVehicle` เพื่อสร้าง NFT พร้อม VIN Hash และ Metadata Hash |
| M-06 | โอนรถไปยัง Dealer | Manufacturer | เรียก `safeTransferFrom` เพื่อย้ายสิทธิ์ครอบครอง NFT |
| D-03 | ขายรถ (First Sale) | Dealer | บันทึกการโอนสิทธิ์ NFT จาก Dealer ไปยังผู้ซื้อ |
| D-04 | บันทึก Disclosure | Dealer | บันทึก `DisclosureRecorded` event พร้อม Ack Hash บน Blockchain |
| D-05 | โอนรถระหว่าง Dealer | Dealer | การโอน NFT ระหว่างตัวแทนจำหน่าย |
| C-04 | ให้สิทธิ์เขียนข้อมูล (Grant Consent) | Consumer | เรียก `grantWriteConsent` เพื่ออนุญาตอู่บันทึกข้อมูล |
| C-05 | เพิกถอนสิทธิ์ (Revoke Consent) | Consumer | เรียก `revokeWriteConsent` เพื่อยกเลิกสิทธิ์อู่ |
| C-06 | ขายรถ / โอนกรรมสิทธิ์ | Consumer | การโอน NFT ระหว่างบุคคล (P2P Transfer) |
| C-08 | สร้าง Escrow | Consumer | Deploy หรือเรียกใช้ Escrow contract สำหรับการซื้อขาย |
| C-09 | วางเงินเข้า Escrow | Consumer | ส่ง Native Currency หรือ ERC-20 เข้าสู่ Escrow contract |
| C-10 | ยกเลิก Escrow | Consumer | เรียกฟังก์ชันยกเลิกและคืนเงินในกรณีที่เงื่อนไขระบุไว้ |
| C-11 | Fulfill เงื่อนไข Escrow | Consumer | ยืนยันการปฏิบัติตามเงื่อนไขในสัญญา Escrow |
| DLT-01 | จดทะเบียนรถ | DLT Officer | เรียก `registerVehicle` เพื่อผูกข้อมูลทะเบียนกับ Token ID |
| DLT-02 | เปลี่ยนสถานะทะเบียน | DLT Officer | อัปเดต `RegStatus` (Suspend / Cancel / Re-register) |
| DLT-03 | ออก/เปลี่ยน/หาย ป้ายทะเบียน | DLT Officer | เรียก `recordPlateEvent` เพื่อบันทึกประวัติป้ายทะเบียน |
| DLT-06 | บันทึกการชำระภาษี | DLT Officer | เรียก `recordTaxPayment` เพื่อบันทึกปีที่ชำระและวันหมดอายุ |
| DLT-07 | ตั้ง/ปลด Flag | DLT Officer | เรียก `setFlag` (Stolen, Seized, Flood, Total Loss, ฯลฯ) |
| DLT-12 | ล็อก/ปลดล็อกการโอน | DLT Officer | ระบบ Auto-lock/Unlock `transferLocked` ตามสถานะ Flag |
| F-01 | สร้างภาระผูกพัน (Lien) | Finance | เรียก `createLien` เพื่อล็อกการโอน NFT และบันทึกสัญญา |
| F-02 | ปลดภาระผูกพัน (Release) | Finance | เรียก `releaseLien` เพื่อปลดล็อกรถเมื่อชำระครบ |
| F-03 | ตั้งสถานะ Default | Finance | อัปเดตสถานะเป็น `Defaulted` กรณีผู้กู้ผิดนัดชำระ |
| F-04 | Fulfill Escrow (Lien) | Finance | ยืนยันการปลด Lien ใน Escrow เพื่อให้โอนรถได้ |
| I-01 | บันทึกกรมธรรม์ประกันภัย | Insurer | เรียก `recordInsurancePolicy` บันทึกเลขกรมธรรม์และวันคุ้มครอง |
| I-05 | เปิดเคลมประกัน | Insurer | เรียก `fileClaim` บันทึกความรุนแรงและหลักฐานเบื้องต้น |
| I-06 | อัปเดตสถานะเคลม | Insurer | เปลี่ยน `ClaimStatus` ให้สอดคล้องกับหน้างานจริง |
| S-01 | บันทึกประวัติซ่อมบำรุง | Workshop | เรียก `logMaintenance` (ต้องมี Consent ที่ยังไม่หมดอายุ) |
| S-04 | บันทึกเลขไมล์ (Odometer) | Workshop | บันทึกระยะทางสะสมลงในประวัติรถบน Blockchain |
| INS-01 | บันทึกผลตรวจสภาพ | Inspector | เรียก `recordInspection` (Pass/Fail) เพื่อใช้ต่อภาษี |
