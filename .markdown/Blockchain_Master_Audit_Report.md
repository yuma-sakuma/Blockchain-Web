# รายงานการตรวจสอบและแผนผังแก้ปัญหาระบบฉบับสมบูรณ์ (The Ultimate Master Audit & Action Plan)
**Project:** Blockchain-Web Integration (FE ↔ BE ↔ BC)
**Document Version:** Final Consolidated (รวมรายงาน Audit ทั้งหมด 5 ฉบับเข้าด้วยกัน)

เอกสารฉบับนี้คือการควบรวมผลการตรวจสอบระบบแบบเจาะลึก 360 องศา ครอบคลุมทั้ง **1) ความปลอดภัยของสถาปัตยกรรม (Architecture)**, **2) การประมวลผลคำสั่งเชิงลึก (Line-by-Line Execution)**, **3) การเชื่อมต่อ Frontend/Backend (State/Desync)**, และ **4) ตรรกะทางธุรกิจรายฟีเจอร์ (Business Logic Gaps)** 

---

## 🎯 บทสรุปผู้บริหาร (Executive Summary)
ระบบมีการเชื่อมต่อ Frontend, Backend (NestJS), และ Blockchain (Ganache ผ่าน ethers.js) เข้าหากันได้จริง แต่โครงสร้างภายในเต็มไปด้วยข้อบกพร่องร้ายแรง อาศัยการทำ Centralization บิดเบือนหลักการ Web3, มีการใช้ข้อมูลจำลอง (Mock Data) สวมรอยบน Blockchain, การจัดการหน้าจอแบบลวงตา (Optimistic UI) และการบันทึกฐานข้อมูลก่อนที่ Blockchain จะยืนยัน ส่งผลให้หากนำระบบนี้ขึ้น Production จะเกิดเหตุการณ์ข้อมูลไม่ตรงกัน (Data Desynchronization) และถูกแฮก/สวมรอยได้ทันที

---

## 🛑 1. การพังทลายของสถาปัตยกรรมระดับเครือข่าย (Architectural Flaws)

1. **God Mode Wallet (ศูนย์รวมอำนาจเบ็ดเสร็จ):**
   - Backend เอา `ADMIN_PRIVATE_KEY` ไปผูกผูกสิทธิ์ (Grant Role) ทุกอย่างบนโลกให้ตัวเอง (`DLT_OFFICER_ROLE`, `WORKSHOP_ROLE`, ฯลฯ) ทำให้ทุกการดำเนินการบน Blockchain เกิดจากกระเป๋าเดี่ยว ระบบ Decentralization จึงถูกทำลายโดยสมบูรณ์
2. **Authentication คือภาพลวงตา (Fake Signatures):**
   - Frontend มีการ Sign Metamask แต่พอส่ง API ไปให้ Backend กลับระบุแค่ `{"actor": "DEALER:0x..."}` โดยไม่มีระบบยืนยันตัวตน (JWT, EIP-712 Verification) ใครก็สามารถเอา Postman ยิงข้อมูลขยะเข้า Backend เพื่อให้ฝังลงเชนฟรีๆ ได้
3. **ปัญหา "โอนมือนกกระจอก" (NFT ไม่ได้ถูกเปลี่ยน Owner จริง):**
   - การโอนรถ (`OWNERSHIP_TRANSFERRED`) ทำแค่บันทึก Record ปล่าวๆ แต่โปรแกรมเมอร์เลี่ยงที่จะครอบครอง Private key เลยไม่ยอมรันคำสั่ง `VehicleNFT.transferFrom()` NFT ของรถทุกคันจึงกองรวมกันที่ Admin ตลอดกาล กลายเป็นเพียงภาพลวงตา
4. **หลงทางเรื่อง Privacy (สับสน Read vs Write Consent):**
   - เมื่อเจ้าของรถให้สิทธิ์ Consent แทนที่จะเรียก `VehicleConsent.sol` (สำหรับอ่าน) ระบบกลับโยนทุกอย่างไปเปิดสิทธิ์ Write ใน `VehicleLifecycle.sol` ให้อู่ซ่อมทั้งหมด ไม่สามารถแยกแยะการ Control Privacy ได้
5. **ระบบ Escrow ตกเกณฑ์ภาพมโน:**
   - คอนแทรค `VehicleLien.sol` ร่างระบบโอนคริปโตซื้อรถแบบ P2P ไว้ดีมาก (`createEscrow`, `fundEscrowNative`) แต่ฝั่ง Frontend/Backend ดันไม่มีการเชื่อมต่อหรือสร้างเส้นทาง API รองรับเลยแม้แต่บรรทัดเดียว เป็นแค่การโอนลอยๆ

---

## 🚨 2. ปัญหา Data Desync, กฎ Strict Await และขยะ Mockup

นี่คือหมวดหมู่ของพฤติกรรม "ลักไก่" ที่ทำให้ระบบทำงานไม่สัมพันธ์กับความเป็นจริงบน Blockchain

### 2.1 Backend/Frontend ใช้ Mock Hash กลวงๆ
- **Backend:** แทบทุกโค้ดที่มีการส่ง Hash โปรแกรมเมอร์ใช้การ Hardcode ทื่อๆ เช่น `ethers.id('reg-doc-hash')`, `ethers.id('tax-receipt-hash')` ถ้านำไปรันจริง รถทุกคันบนโลกจะมี Hash ธุรกรรมเอกสารเหมือนกันหมด! (ต้องแก้เป็นการ Hash จาก Object จริง)
- **Frontend:** หน้า UI (`FinancePage.tsx`, `DealerPage.tsx`) มีการสุ่มค่า `contractHash: "L-CTR-" + Date.now()` และ `Math.random()` ปั้นขึ้นไปเป็นขยะส่งให้ Backend 

### 2.2 การลักไก่ Save DB ตัดหน้า Blockchain (Silent Failure)
- **ปัญหา:** ในไฟล `event.service.ts` จำนวนกว่า 15 เคส มีการใช้รูปแบบการรันคำสั่ง `await repository.save(entity)` **แซงหน้า** บล็อก `try { await tx.wait() }`
- **ผลกระทบ:** Database ถูกบันทึกไปแล้ว! แต่ถ้าตอนหลัง Blockchain สั่ง Revert หรือ Gas หมด... โค้ด Backend ยังเอา `catch(err)` ครอบกลืน Error ทิ้ง ทำให้เกิดภาวะ **"ฐานข้อมูลบอกสำเร็จ เชนบอกไม่มีอยู่จริง"**
- **📍 พิกัด 15 จุดร้ายแรงที่ต้องย้าย `save()` ไปไว้หลังสุด:**
  - `OWNERSHIP_TRANSFERRED` (Line 174, 177)
  - `DLT_REGISTRATION_UPDATED` (Line 234, 237)
  - `PLATE_EVENT_RECORDED` (Line 310, 313, 344)
  - `TAX_STATUS_UPDATED` (Line 359, 375)
  - รหัสธง, ไฟแนนซ์, ริบรถ: `FLAG_UPDATED`, `LIEN_CREATED`, `LIEN_RELEASED`, `REPOSSESSION_RECORDED` (Line 396, 435, 466, 501)
  - การจัดการ Consent ทุกชนิด (Line 547, 550, 581, 595, 624)
  - ประกันภัย, คลอดใบเคลม (Line 646, 680, 698, 730)
  - ตรอ. ตรวจสภาพ และ ประวัติซ่อม (Line 749, 780, 799, 833)
- **กฎเหล็ก (Strict Stop):** หาก Blockchain พังใน `try..catch` ต้องใส่ `throw err;` เข้าไป เพื่อหยุดการรันบรรทัดสุดท้าย (`eventLogRepository.save(event)`) และระงับขยะเข้า DB ไม่ให้เกิดขึ้นเด็ดขาด!

### 2.3 กฏการห้ามใช้ Optimistic UI เด็ดขาด (Strict `await` on Frontend)
- **ปัญหา:** ใน `store/index.tsx` (Line 317) ระบบรีบทำ `setEvents`, `setVehicles` ทันทีที่กดปุ่ม เพื่อลวงตาผู้ใช้ว่างานจบแล้ว แต่รันเชนไว้ Background ซึ่งผิดหลัก Web3 อย่างร้ายแรง
- **การแก้ (Strict Sequence):** ต้องใช้ Loading State (`isGlobalLoading`) สั่งหมุนรอ UI ให้ `await createEvent` ขานรับ `TxHash` แห่งความสำเร็จ 100% กลับมาก่อน จึงจะนำลงมายัดใส่ Component State ได้

### 2.4 ปัญหา Nonce ชนกันเมื่อโหลดหนัก
- Backend ไม่ยอมเรียกใช้งาน `await this.blockchainService.withTxLock(...)` มาครอบคำสั่งการยิง Smart Contract ทำให้คำสั่งที่เข้ามาพร้อมกันผ่าน Admin Wallet ตัวเดียวกันจะแย่ง Nonce ชนกันจนกราวรูดดิ่งลงเหว

### 2.5 `txHash` หายวับไปจากหน้าย่อยของ Frontend
- ตารางต่างๆ บน UI (เช่น หน้า Lien, ประกัน, ตรวจสภาพ) แสดงแค่ผลลัพธ์ (Paid/Valid) แต่ลืมลากตัวแปร `txHash` เข้ามา Map วาดลง UI ผู้ใช้จึงเช็คความโปร่งใสรายหมวดไม่ได้ ต้องไปคุ้ยจาก Timeline รวมเอาเอง

---

## ⚙️ 3. ข้อผิดพลาดทางตรรกะรายหมวด (Business Logic Gaps & Deadends)

ตรรกะในฟีเจอร์ย่อยถูกทำค้างเป็น **No-Op Switch Case เปล่าๆ** ทำให้ทำงานไม่สุด:

### 3.1 ไฟแนนซ์และการซื้อขาย P2P
- **จ่ายค่างวดจมหายทิ้งสูญ:** เคส `INSTALLMENT_MILESTONE_RECORDED` วิ่งเข้าแบบ No-Op บันทึกหายไปเฉยๆ
- **อายัดรถ (Repossession):** ขาดฟิลด์การเชื่อมให้ `transferLocked = true` อย่างเป็นทางการ

### 3.2 กรมขนส่งง (DLT Registry)
- **อายัดและสวมรอยรถชนหนัก:** รถมีสถานะพังยับ `total_loss` แต่ Backend ลืมสั่ง `setFlag` ปักธงซากรถบนยานแม่ `VehicleRegistry` รถเลยสามารถโอนซื้อขายลักไก่ต่อไปได้
- **การต่อภาษี (DLT Tax):** ตอนเช็คอายุข้ามปี หากขาดใบตรวจสภาพ Backend โชว์แค่ `console.warn` แล้วเซฟข้ามไปหน้าตาเฉย! (ต้องบังคับ Throw exception ทิ้ง)

### 3.3 อู่ซ่อมรถ และระบบประกันภัย
- **กรอไมล์แบบอิสระ (Odometer Rollback):** ฝั่ง Backend ไม่ทำ Monotonic Checking ดักการถอยเลขไมล์ และปล่อยเคส `ODOMETER_SNAPSHOT` เป็นตอไม้ตาย (No-Op) กรอไมล์สบายเฉิบ
- **ตีราคาซ่อมตกหลุมดำ:** การส่งใบประเมินซ่อม `WORKSHOP_ESTIMATE_SUBMITTED` และไฟเขียวประกัน `INSURER_APPROVED_ESTIMATE` เป็นเคสว่างเปล่า ไร้ท่อข้อมูลขับเคลื่อน
- **เปลี่ยนอะไหล่และอายุประกัน:** `CRITICAL_PART_REPLACED` และ `WARRANTY_DEFINED` ข้อมูลระเหยไปในอากาศ ไม่มีการอัปเดตไฟล์ `specJson` ใดๆ ทั้งสิ้น

### 3.4 ฝั่ง Dealer (เต็นท์รถ/โชว์รูม)
- **ใบรับสภาพและเทิร์นรถ:** ทั้งการรับทราบรอยแผล (`DISCLOSURE_SIGNED`) และการตีราคารถเทิร์น (`TRADEIN_EVALUATED`) ล้วนเดินเข้าเส้นทาง No-Op ศูนย์เปล่า

---

---

## 📁 4. การสูญหายของระบบไฟล์ (The Missing File Upload Infrastructure)

จากการตรวจสอบแบบ 360 องศา พบข้อบกพร่องที่ใหญ่ที่สุดของโปรเจกต์นี้ คือ **"ไม่มีระบบอัปโหลดไฟล์/หลักฐานใดๆ อยู่เลย"** ทั้งในระดับ UI, Backend, และ Blockchain

1. **Frontend ไร้ปุ่มอัปโหลด:** ไม่มี `<input type="file" />` หรือ Component สำหรับแนบไฟล์ในหน้าใดๆ เลยแม้แต่หน้าเดียว (เช่น หน้าแจ้งเคลมประกัน `CLAIM_FILED`, หน้าเพิ่มประวัติซ่อมบำรุง `MAINTENANCE_RECORDED`, หรือหน้าต่อภาษี/ตรอ.)
2. **Backend ขาดตัวรับไฟล์:** ไม่มีระบบ Multer หรือ `FileInterceptor` สำหรับรับ Streaming File ไม่มีโค้ดส่วนไหนเกี่ยวข้องกับการเชื่อมต่อ IPFS หรือ AWS S3 เลย
3. **การหลอกลวง Blockchain (Hardcoded Hash):** เมื่อไม่มีไฟล์โปรแกรมเมอร์จึงใช้วิธีฝังค่าตายตัวลงไปตรงๆ เช่น `ethers.id('cert-hash')`, `ethers.id('repossession-ref-hash')`, `ethers.id('plate-doc-hash')` ซึ่ง **ผิดหลักการ Evidence-Sourcing อย่างรุนแรง**

**วิธีแก้ไขเชิงระบบ:**
- แทรกระบบ IPFS หรือ S3 Bucket: เมื่อผู้ใช้กด Submit ต้องโยน File ไปเก็บที่ Off-chain Storage ก่อน
- Return ค่า `CID` หรือ `URL` กลับมา พร้อมคำนวณ SHA-256 Hash ของไฟล์นั้น
- นำ Hash ที่คำนวณได้จริง เข้าไปแทนที่ Mock String ใน Smart Contract (`evidenceHashes` ต้องไม่ใช่ Array ว่าง)

---

## ⚠️ 5. ช่องโหว่ระดับหน้าจอและช่องทางการเจาะระบบ (Frontend Vulnerabilities & Spoofing)

จากการไล่ตรวจสอบเจาะลึกทีละไฟล์ในโฟลเดอร์ `frontend/src/pages/` พบการเขียนโค้ดที่หละหลวมและเกิดช่องโหว่ (Spoofing) ขั้นวิกฤติ:

1. **สวมรอยกระเป๋าผู้ใช้ได้เต็มรูปแบบ (Address Spoofing) - `ConsumerPage.tsx` และ `DealerPage.tsx`:**
   - คำสั่งโอนรถ (`handleSellToCustomer`) ใช้เพียงโค้ด `prompt("Buyer Identity (Wallet Address):")` แล้วนำค่า String ไปประกอบเป็น `CONSUMER:0x...` ดื้อๆ โดย **ไม่มีการบังคับให้ผู้ซื้อและผู้ขายกด Sign Transaction (EIP-712)** ด้วย Metamask จริง แปลว่าแค่คุณรู้ Address ของฉัน คุณก็สามารถยัดเยียดรถหรือขโมยรถจากระบบได้ทันที
   - การประเมินราคารถเทิร์น (`handleEvaluateTradeIn`) มีช่องโหว่ที่ประเมินโดย Hardcode ตัวเลข `500000` ทิ้งไว้ในโค้ดฝั่ง Client (React) 

2. **ระบบประกันภัยและการเคลมหลอกลวง (Fake Claims) - `InsurancePage.tsx`:**
   - การตั้งรหัสใบรับรองถูกเจนด้วย `Math.random()` อย่างหละหลวม เช่น `approvalCode: "APP-" + Math.floor(Math.random()*10000)` ซึ่งสามารถถูกสุ่มเจาะ (Brute-forced) และคาดเดาได้ง่ายมาก ถือว่าไม่มีน้ำหนักทางกฎหมาย
   - หลักฐาน (Proof) ถูก Hardcode ค่าตายตัว: `evidenceHashes: ["HASH_ACCIDENT_PHOTO_01", "HASH_POLICE_REPORT"]` ทำให้ใครก็เคลมเงินทิพย์ได้เสมอ

3. **กรอไมล์เถื่อนหน้าร้าน (Odometer Tampering) - `ServicePage.tsx`:**
   - ในฟังก์ชัน `handleRecordService` มีการเช็คการห้ามถอยเลขไมล์ `if (mileage < currentMileage)` แค่บน **Client-side (React)** และดักด้วยคำสั่ง `alert()`! ขอย้ำว่า Hacker เพียงแค่ปิดระบบหน้าเว็บ แล้วใช้ Postman/cURL ยิง API ตรงไปที่เครื่อง Backend ยอดไมล์จะถูกกรอกลับทันที (ยืนยันข้อบกพร่องข้อ 2.2 โค้ด Backend ขาด Validation เด็ดขาด)
   - การเปลี่ยนอะไหล่ (`handleRegisterPart`) นำ Object ไปดึงของเก่าแบบผิดประเภท `oldPartNo: (targetVehicle.spec as any)[partType.toLowerCase()]` 

4. **สวมรอยกรมขนส่งทางบก (State Tampering) - `DLTPage.tsx`:**
   - อาศัยเพียง `Math.random()` ในการสร้างป้ายทะเบียนรถ และเจนรหัสอ้างอิงการเปลี่ยนสีรถด้วย `refNo: 'REQ-' + Date.now()` ซึ่งไม่ผ่านกระบวนการ Cryptographic 

---

## 🎯 6. แผนงานผ่าตัดระบบ 4 ระยะ (The Ultimate Action Plan)

ขอแนะนำนำงานเหล่านี้ แตกเป็น Ticket แจกจ่ายให้ทีมพัฒนาโดยด่วน (Strict Execution):

### Phase 1: File Storage & Data Integrity (ล้าง Mockup & สร้างท่ออัปโหลด)
- [ ] **T-DATA-01 (FE/BE):** สร้างระบบ Upload API พร้อม Multer Interceptor ใน Backend ยิงไฟล์เก็บลง IPFS/S3 และคำนวณ Cryptographic Hash ของไฟล์
- [ ] **T-DATA-02 (FE):** ติดตั้ง Component อัปโหลดไฟล์ในหน้าต่างประเมินราคารถ, สภาพรถก่อนซ่อม, แจ้งเคลม, ตรอ., และยืนยันการโอนเงิน (Payment Slip)
- [ ] **T-DATA-03 (BE):** ล่าประหารโค้ด `ethers.id('mock')` และ Date.now(), Math.random() ทิ้ง เปลี่ยนให้รับค่า `evidenceHash` จากการอัปโหลดไฟล์จริง

### Phase 2: Authentication & Decentralization (งานซ่อมแกนสถาปัตยกรรมหลัก)
- [ ] **T-ARCH-01 (FE/BE):** ทำ Meta-Transactions (EIP-712) บังคับให้ Frontend ใช้ Metamask Sign Message และให้ Backend ทำ `ethers.verifyMessage` ป้องกันการสวมรอย API 
- [ ] **T-ARCH-02 (BE):** ถอดสิทธิ์ God Mode ของ `ADMIN_PRIVATE_KEY` ยึดกระเป๋าคืน แล้วใช้ Wallet ของผู้ใช้/ดีลเลอร์ เป็นผู้ส่งผ่านระบบ
- [ ] **T-ARCH-03 (BE):** เส้นทางโอนรถ `OWNERSHIP_TRANSFERRED` ต้องรันคู่ขนานกัน: 1) `VehicleNFT.transferFrom()` ดึงเหรียญไปให้เจ้าของจริง และ 2) `recordTransfer()`
- [ ] **T-ARCH-04 (BE):** แยกบิล Consent! สำหรับ Read ให้ชี้ไปที่ `VehicleConsent.sol` ส่วน Write ชี้ไปที่ `VehicleLifecycle.sol`
- [ ] **T-ARCH-05 (BE):** ใส่บล็อก `await this.blockchainService.withTxLock(async () => { ... })` ครอบทุกคำสั่งยิงเชน ป้องกัน Nonce ชน
- [ ] **T-ARCH-06 (BE):** รื้อโครงสร้าง 15 พิกัดใน `event.service.ts` ลำดับคำสั่งใหม่แบบ Strict: ให้ `await tx.wait()` รันจนจบสมบูรณ์ก่อน ค่อยดันลง `await repository.save()` เพื่อป้องกัน Data Desync
- [ ] **T-ARCH-07 (BE):** ใช้คำสั่ง `throw err;` เข้าไปช็อตวงจร `try..catch` ทิ้ง เพื่อหยุดการยัด Database ขยะ เมื่อธุรกรรมบน Blockchain ล้มเหลว

### Phase 3: Business Logic & Anti-Fraud Execution (เติมเต็มหลุมดำ)
- [ ] **T-LOGIC-01 (Anti-Rollback):** สร้างระบบดัก Odometer ใน Backend ห้ามไมล์ใหม่น้อยกว่าไมล์เดิมเด็ดขาด หากพบลักไก่ให้ throw exception ทันที (แก้ Switch case `ODOMETER_SNAPSHOT`)
- [ ] **T-LOGIC-02 (Total Loss Death Flag):** อัปเดตตรรกะแจ้งเคลม หากพบว่า Severity เป็น `TOTAL_LOSS` ต้องรัน `setFlag(TOTAL_LOSS)` บังคับเป็นซากทันที
- [ ] **T-LOGIC-03 (Insurance Pipeline):** เชื่อมเส้นทาง `WORKSHOP_ESTIMATE_SUBMITTED` -> `INSURER_APPROVED_ESTIMATE` ตีราคากลางทางและดึงสัญญาอนุมัติซ่อมเข้าด้วยกัน
- [ ] **T-LOGIC-04 (Parts Replacement):** เดินสายไฟให้กับเคส `CRITICAL_PART_REPLACED` และ `WARRANTY_DEFINED` ให้อัปเดตก้อน `specJson` ทันทีที่มีการสลับอะไหล่แท้/เทียบ
- [ ] **T-LOGIC-05 (Dealer Protection):** ปลุกชีพเคส `DISCLOSURE_SIGNED` เพื่อเซ็นรับทราบแผลชนหนักรถมือสอง และ `TRADEIN_EVALUATED` สำหรับเก็บประวัติตีราคาเทิร์นรถเก่า

### Phase 4: Frontend P2P Escrow & Strict State
- [ ] **T-FE-01 (Escrow):** ขุดชีพจรฟีเจอร์ Smart Contract P2P `VehicleLien.createEscrow()` เชื่อมต่อ API ล็อคโอนรถจนกว่าเงิน Crypto จะถูกจ่ายจริง
- [ ] **T-FE-02 (Strict Sequence):** ประหาร Optimistic UI ใน `store/index.tsx` สร้าง `<LoadingOverlay>` ยืนเฝ้าการรอ `await createEvent` หากล้มเหลวให้พ่น Error แจ้งผู้ใช้ ห้ามอัปเดตหน้าจอโชว์โกหกเด็ดขาด
- [ ] **T-FE-03 (Transparency UI):** คืนชีพ `txHash` แกะค่าจาก API มาหยอดลง Object ของหน้า Lien, ป้ายวงกลมขขนส่ง, และประกันหน้าบ้าน เพื่อให้กดดู Tx เด้งออกไปหา Explorer ได้

*นี่คือแผนภูมินำทาง (Blueprint) ฉบับสมบูรณ์ที่สุด ที่เจาะลึกทะลวงปัญหาของระบบในทุกซอกหลืบตั้งแต่วิถีการไหลของไฟล์ ท่อเชื่อมต่อ ไปจนถึงระดับบิตของข้อมูล หากทีมโค้ดดิ้งสางงานกวาด Checklist ชุดนี้สำเร็จ ระบบ Vehicle-NFT นี้จะทำงานได้อย่างสมบูรณ์แบบ ไร้รอยต่อ และพลิกวงการรถยนต์โลกได้ 100% ครับ!*

---

## 💣 7. มหันตภัยช่องโหว่ระดับ Smart Contract และ API (The "Zero-Day" Exploits)

หลังจากการขุดเจาะลึกซึ้งไปถึงระดับ Controller และ Smart Contract พบช่องโหว่ร้ายแรงที่สามารถทำให้ระบบล่ม (Crash) หรือถูกขโมยทรัพย์สินได้ทันทีแบบ 100%:

### 💥 7.1 ผูก Role ผิดตัว ทำให้ระบบอายัดรถพังพินาศ (Broken Role Binding)
- **พิกัด:** `blockchain.service.ts` บทที่แจกจ่ายสิทธิ์ให้ Smart Contract
- **ความผิดพลาด:** โค้ด Backend สั่ง `contract.grantRole(roleHash, adminAddress);` โดยแจกให้กระเป๋าแอดมิน **แทนที่จะแจกให้ที่อยู่ของ Smart Contract**! 
- **ผลลัพธ์:** เมื่อ `VehicleRegistry` พยายามสั่งอายัดรถ (เรียก `setTransferLock` ใน `VehicleNFT`) ระบบจะพังและ Revert เสมอ เพราะตัว Contract ที่เรียกคำสั่งไม่มีสิทธิ์ `REGISTRY_ROLE`! ฟีเจอร์อายัดรถและล็อคโอนทั้งหมดจึงเป็นหมันใช้การไม่ได้จริง

### 💥 7.2 ช่องโหว่ API ปล้นรถข้ามโลก (Ultimate IDOR + God Mode Exploit)
- **พิกัด:** `event.controller.ts` > `@Post()` และ `event.service.ts` > `OWNERSHIP_TRANSFERRED`
- **ความผิดพลาด:** Controller `/events` มารับ POST Request โดย **"ไม่มี Auth Guard"** ตรวจสอบ Token ใดๆ แฮกเกอร์เพียงแค่ยิง Request เข้ามา ระบุ `type: 'OWNERSHIP_TRANSFERRED'` ยัด `tokenId` ของใครก็ได้ และใส่ชื่อตัวเองใน `payload.to`
- **ผลลัพธ์:** Backend รับลูกต่อ แบบหลับหูหลับตา เพราะใช้กุญแจ `ADMIN_PRIVATE_KEY` (ซึ่งมีสิทธิ์พระเจ้า `DEFAULT_ADMIN_ROLE`) ไปสั่ง Transfer ผ่าน Smart Contract ทันที! ทำให้แฮกเกอร์สามารถโอนกรรมสิทธิ์รถใดๆ บนโลกเข้ากระเป๋าตัวเองได้ในเสี้ยววินาที

### 💥 7.3 กับระเบิด Out-Of-Memory (OOM) ทำเซิร์ฟเวอร์ระเบิด
- **พิกัด:** `event.service.ts` ในหมวด `MANUFACTURER_MINTED` การตรวจเลขตัวถัง/เครื่องยนต์ (Engine Serial)
- **ความผิดพลาด:** โปรแกรมเมอร์ใช้ท่า `const allVehicles = await this.vehicleRepository.find();` ดึงข้อมูลรถ **"ทุกคันบนโลก"** มายัดลง Memory (RAM) ของ Backend แล้วใช้ For-loop วนหา Engine ตรงๆ
- **ผลลัพธ์:** ถ้าระบบมีรถ 1 ล้านคัน เมื่อมีคนยิงคำสั่ง Mint แม้แต่ครั้งเดียว Backend Server (Node.js) จะสูบ RAM พุ่งกระฉูดและดับอนาถ (Crash) ทันที (ต้องสร้างและอ้างอิง JSON Index จากฝั่ง Database แทน)

### 💥 7.4 รถถูกล็อคตลอดกาล (Permanent Transfer DoS)
- **พิกัด:** `VehicleRegistry.sol` คำสั่ง `setFlag()`
- **ความผิดพลาด:** หากเซ็ตธง `FLAG_STOLEN` ระบบจะสั่งล็อคโอน `vehicleNFT.setTransferLock(tokenId, true)` ทันที **แต่ไม่มีบรรทัดไหนเลยที่ยอมให้สั่ง `false` เมื่อถอดธง!**
- **ผลลัพธ์:** ถ้ารถหายแล้วตามคืนได้ เจ้าหน้าที่กรมขนส่งมากดเคลียร์สถานะขโมยทิ้ง ตัวแปร `transferLocked` ใน NFT จะยังคงค้างเป็น `true` ไปตลอดกาล รถคันนั้นจะถูกสาปให้โอนไม่ได้อีกเลย

### 💥 7.5 การฉ้อโกง Escrow เอาเงินคืน (Escrow Griefing)
- **พิกัด:** `VehicleLien.sol` คำสั่ง `cancelEscrow()`
- **ความผิดพลาด:** สมาร์ตคอนแทรคยอมให้ผู้ซื้อ (Buyer) กด `cancelEscrow` เพื่อดึงเงินคริปโตที่ฝากไว้ (Funded) กลับเข้าตัวเองได้ **"ทุกเวลา"**
- **ผลลัพธ์:** ผู้ซื้อสามารถรอให้ผู้ขายกดปล่อยโอนรถหรือปลดเงื่อนไขออฟไลน์จนเสร็จ แล้วผู้ซื้อฉวยโอกาสกดยกเลิก Escrow กลางอากาศเพื่อเอาเงินดอลลาร์/คริปโตหลบหนีได้ทันที โดยไม่มีช่วงเวลา Dispute Period

### 💥 7.6 บัตรผ่านไร้วันหมดอายุ (Infinite Write Consent)
- **พิกัด:** `VehicleLifecycle.sol` ในคำสั่ง `grantWriteConsent` 
- **ความผิดพลาด:** เปิดรับ parameter `expiresAt` ไว้สวยๆ แต่ในสมาร์ตคอนแทรคไม่มีการเช็ควันเวลาหมดอายุเลย! ตรวจสอบแค่ค่า > 0
- **ผลลัพธ์:** หากเจ้าของรถให้สิทธิ์อู่ซ่อมรถเพียง 1 วัน ...แต่อู่ซ่อมรถจะได้สิทธิ์กรอกประวัติบนรถคันนั้นไป **ตลอดกาล** เพราะโค้ดลืมดัก Expire Date

### 💥 7.7 ช่องโหว่สแปมกระดานสาธารณะ (Public logEvent Spam)
- **พิกัด:** `VehicleLifecycle.sol` คำสั่ง `logEvent(...)`
- **ความผิดพลาด:** ประกาศเป็น `external` ลอยๆ โดยไม่มีเช็ค `onlyRole()` หรือ `onlyVehicleOwner()`
- **ผลลัพธ์:** ใครบนโลกก็สามารถกดเพิ่มเหตุการณ์ "แปลกปลอม" ยัดใส่ประวัติของรถคันไหนก็ได้ ทำให้ความน่าเชื่อถือของ Event-Sourcing เป็นขยะทันที
