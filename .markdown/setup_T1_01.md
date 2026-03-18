# การรันโปรเจค Blockchain VIN (Setup Guide)

โปรเจคนี้ประกอบด้วย 3 ส่วนหลัก ได้แก่ สมาร์ทคอนแทรค (Smart Contracts), ระบบหลังบ้าน (Backend) และระบบหน้าบ้าน (Frontend) กรุณาทำตามขั้นตอนต่อไปนี้เพื่อรันระบบทั้งหมดบนเครื่อง Local ของคุณ

---

## 🟢 1. การรัน Smart Contracts (Hardhat & Ganache)

โปรเจคนี้จำลอง Blockchain ด้วย **Ganache** (UI หรือ CLI) และใช้ชุดคำสั่งจากโฟลเดอร์ `smart-contracts` เพื่อ Deploy และรัน Automated Tests

### **สิ่งที่ต้องเตรียม:**
- ติดตั้งและเปิดโปรแกรม **Ganache**
- กด Quickstart (Ethereum) หรือตั้งค่า Workspace ใหม่ให้รันที่ **Port: 7545** (ตรงตาม `GANACHE_RPC_URL` ในโปรเจค)
- นำ Private Keys จาก Ganache ไปใส่ในไฟล์ `.env` (ตัวอย่าง: `smart-contracts/.env` และ `backend/.env`) 

### **การรัน Scripts:**
1. เปิด Terminal ใหม่แล้วเข้าไปที่โฟลเดอร์ Smart Contracts:
   ```bash
   cd smart-contracts
   ```
2. โหลด Dependencies:
   ```bash
   npm install
   ```
3. รันเช็คสถานะการทดสอบ (Unit Tests ที่อิงตาม Checklist ทั้ง 5 ข้อ):
   ```bash
   npx hardhat test
   ```
4. รันสคริปต์เพื่อ Deploy Smart Contracts ลงบน Ganache (หากมีสคริปต์อัพเดท):
   ```bash
   npx hardhat run scripts/deploy.ts --network ganache
   ```

*(หมายเหตุ: เมื่อ Deploy เสร็จแล้ว อย่าลืมนำ Address ของ Smart Contracts แต่ละตัวไปอัปเดตใส่ไฟล์ `.env` ของฝั่ง Backend และ Frontend)*

---

## 🔵 2. การรัน Backend (NestJS)

Backend ทำหน้าที่จัดการข้อมูลนอกเชน (Off-chain DB), ทำงานร่วมกับ IPFS (ถ้ามี), และให้บริการ API แบบ EIP-191 Authenticated ให้กับ Frontend 

1. เปิด Terminal ใหม่ (คู่ขนานกัน) แล้วเข้าไปที่โฟลเดอร์ Backend:
   ```bash
   cd backend
   ```
2. โหลด Dependencies:
   ```bash
   npm install
   ```
3. สร้าง Database บน MySQL หรือ MariaDB ชื่อ `blockchain_vin` ให้ตรงกับใน `.env` 
4. ตรวจสอบไฟล์ `backend/.env` ว่าเชื่อมต่อ Database ถูกต้อง และ Smart Contract Address ตรงกับที่ Deploy ล่าสุดหรือไม่
5. สตาร์ทโปรเจค (แบบ Hot Reload):
   ```bash
   npm run start:dev
   ```
6. ถ้าระบบพร้อม ตัว Backend จะรันอยู่ที่: **http://localhost:3000**
   สามารถเข้าดู Document API ของ Swagger ได้ที่: **http://localhost:3000/api**

> **การใช้ Jest ทดสอบ Signature (EIP-191)**
> หากต้องการทดสอบระบบ Authentication อย่างเดียว ให้รัน:
> `npm run test src/auth/signature.guard.spec.ts`

---

## 🟠 3. การรัน Frontend (Vite + React)

Frontend ระบบ UI ของ DApp สำหรับให้แต่ละ Role เลือกใช้งาน, เซ็น Transaction, และเรียกใช้งานผ่าน Web3.

1. เปิด Terminal ใหม่ (แท็บที่สาม) แล้วเข้าไปที่โฟลเดอร์ Frontend:
   ```bash
   cd frontend
   ```
2. โหลด Dependencies:
   ```bash
   npm install
   ```
3. กำหนดตัวแปรใน `frontend/.env` ให้ชี้ไปที่ RPC เดียวกับที่ตั้งไว้ และใช้ Contract Address เดียวกัน
4. สตาร์ทโปรเจคหน้าบ้าน:
   ```bash
   npm run dev
   ```
5. ระบบจะทำงานอยู่ที่: **http://localhost:5173** (พร้อมสุ่ม Port อื่นให้อัตโนมัติหาก 5173 ชนกัน)

---

## 💡 ลำดับการเปิดใช้งาน (สรุป)
1. เปิด **Ganache**
2. เปิด Terminal 1: `cd smart-contracts` -> `npx hardhat run scripts/deploy.ts --network ganache`
3. ก๊อปปี้ Addresses ทั้งหมดไปใส่ไฟล์ `.env` ของ `backend` และ `frontend`
4. เปิด Terminal 2: `cd backend` -> `npm run start:dev`
5. เปิด Terminal 3: `cd frontend` -> `npm run dev`
6. เปิดเบราว์เซอร์ ทดสอบระบบที่ **http://localhost:5173**
