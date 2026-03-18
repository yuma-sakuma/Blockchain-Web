# 🛑 Checklist: การพังทลายของสถาปัตยกรรมระดับเครือข่าย (Architectural Flaws)

> จาก Blockchain_Master_Audit_Report.md — หัวข้อที่ 1

---

## 1. God Mode Wallet (ศูนย์รวมอำนาจเบ็ดเสร็จ)

**ปัญหา:** Backend ใช้ `ADMIN_PRIVATE_KEY` ตัวเดียว Grant Role ทุกอย่างให้ตัวเอง ทำให้ทุก Transaction เกิดจากกระเป๋าเดียว → Decentralization ถูกทำลาย

- [x] ถอดสิทธิ์ God Mode ของ `ADMIN_PRIVATE_KEY` ออกจากการเป็นผู้ส่ง Transaction ทุกรายการ
- [x] ออกแบบระบบ Role-based Wallet ให้แต่ละบทบาท (Manufacturer, Dealer, DLT Officer, Workshop) ใช้กระเป๋าของตัวเองในการส่ง Transaction
- [x] แก้ไข `blockchain.service.ts` ให้ `grantRole()` มอบสิทธิ์ให้ Wallet ของผู้ใช้จริง แทนที่จะมอบให้ Admin ทั้งหมด
- [x] ปรับ Deploy Script ให้ Grant Role ให้แต่ละ Wallet Address ตาม Role ที่กำหนดตอน Deploy
- [x] ทดสอบว่าแต่ละ Role สามารถส่ง Transaction ด้วยกระเป๋าของตัวเองได้ถูกต้อง

---

## 2. Authentication คือภาพลวงตา (Fake Signatures)

**ปัญหา:** Frontend ให้ Sign ผ่าน Metamask แต่ Backend รับแค่ `{"actor": "DEALER:0x..."}` โดยไม่มีการ Verify Signature → ใครก็ยิง API ปลอมได้

- [x] ออกแบบระบบ Authentication ด้วย EIP-191 Signing บน Frontend
- [x] สร้าง Middleware/Guard บน Backend สำหรับ Verify Signature ด้วย `ethers.verifyMessage()`
- [x] เพิ่ม Nonce/Timestamp ใน Signed Message เพื่อป้องกัน Replay Attack (5 นาที max age)
- [x] ลบระบบ `actor` field แบบเดิมที่ไม่มีการ Verify ออก (ใช้ verified signer แทน)
- [x] เพิ่ม Auth Guard (`@UseGuards(SignatureGuard)`) ที่ `event.controller.ts` ให้ตรวจสอบทุก Endpoint
- [x] ทดสอบว่า Request ที่ไม่มี Valid Signature จะถูก Reject (ทดสอบด้วย Postman/cURL/Jest)

---

## 3. ปัญหา "โอนมือนกกระจอก" (NFT ไม่ได้ถูกเปลี่ยน Owner จริง)

**ปัญหา:** การโอนรถ (`OWNERSHIP_TRANSFERRED`) แค่บันทึก Record แต่ไม่เรียก `VehicleNFT.transferFrom()` → NFT ทุกคันกองอยู่ที่ Admin ตลอด

- [x] แก้ไข `event.service.ts` เคส `OWNERSHIP_TRANSFERRED` ให้เรียก `VehicleNFT.transferFrom(from, to, tokenId)` จริง
- [x] ตรวจสอบว่า `from` address มี Approval หรือเป็น Owner ก่อนทำ Transfer
- [x] ปรับ Frontend ให้ผู้ขาย (from) ต้อง Sign Approve Transaction ก่อนโอน
- [x] ปรับ Frontend ให้ผู้ซื้อ (to) ต้อง Sign Accept Transaction
- [x] ทดสอบว่าหลังโอนเสร็จ `ownerOf(tokenId)` ชี้ไปที่ Wallet ผู้ซื้อจริง
- [x] ทดสอบว่า NFT ไม่ได้ค้างอยู่ที่ Admin Wallet อีกต่อไป

---

## 4. หลงทางเรื่อง Privacy (สับสน Read vs Write Consent)

**ปัญหา:** การให้ Consent แทนที่จะเรียก `VehicleConsent.sol` (Read) ระบบกลับเปิดสิทธิ์ Write ใน `VehicleLifecycle.sol` ให้อู่ซ่อมทั้งหมด → ไม่สามารถ Control Privacy ได้

- [x] แยก Flow การให้สิทธิ์ Read Consent → เรียก `VehicleConsent.sol` (ดูประวัติรถ)
- [x] แยก Flow การให้สิทธิ์ Write Consent → เรียก `VehicleLifecycle.sol` (เพิ่มประวัติซ่อม)
- [x] แก้ไข Backend ให้แยก API Endpoint สำหรับ Read vs Write Consent
- [x] แก้ไข Frontend ให้เจ้าของรถเลือกให้สิทธิ์ Read หรือ Write แยกกันได้
- [x] ตรวจสอบว่าอู่ซ่อมที่ได้รับ Read Consent ไม่สามารถ Write ข้อมูลได้
- [x] ตรวจสอบว่าอู่ซ่อมที่ได้รับ Write Consent สามารถเพิ่มประวัติซ่อมได้ถูกต้อง

---

## 5. ระบบ Escrow ตกเกณฑ์ภาพมโน

**ปัญหา:** `VehicleLien.sol` มี `createEscrow`, `fundEscrowNative` พร้อมแล้ว แต่ Frontend/Backend ไม่มี API หรือ UI เชื่อมต่อเลย → เป็นแค่ Contract ลอยๆ

- [x] สร้าง API Endpoint บน Backend สำหรับ Escrow flow (`ESCROW_CREATED`, `ESCROW_FUNDED`, `ESCROW_RELEASED`, `ESCROW_CANCELLED`)
- [x] เชื่อมต่อ Backend API กับ Smart Contract `VehicleLien.sol` (`createEscrow`, `fundEscrowNative`, `fulfillCondition`, `cancelEscrow`)
- [x] สร้างหน้า UI บน Frontend สำหรับ Buyer/Seller ใช้ฝากเงิน/ปล่อยเงิน (Direct TX routing ใน store)
- [x] เชื่อม Frontend กับ Role Wallet ให้ผู้ซื้อ Sign Transaction ฝากเงินเข้า Escrow ด้วยตัวเอง
- [x] แสดงสถานะ Escrow (Created → Funded → Released/Cancelled) บนหน้า UI (Event Type routing)
- [x] ทดสอบ Flow ครบวงจร: สร้าง Escrow → ฝากเงิน → ปล่อยเงิน/ยกเลิก
