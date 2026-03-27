# 🔍 Blockchain-Web Fullstack Data & Flow Analysis

อัปเดตล่าสุด: 2026-03-22

เอกสารนี้เป็นการตรวจสอบปัญหา Duplicate Data, ข้อมูลใน DB เป็น NULL, ปัญหา File Upload และการ Hash ไปยัง Smart Contract โดยอิงการทำงานจริงจาก Frontend -> Backend -> Database -> Smart Contract

## 1. Executive Summary

จากการแกะรอย flow จริงใน source code พบว่าสาเหตุหลักที่ Database มีค่าเป็น `NULL` ตลอดเวลา ไม่ใช่เพราะ User ไม่ได้กรอก หรือ Schema ออกแบบผิด แต่เกิดจาก **Backend (`event.service.ts`) ดรอปข้อมูลทิ้ง (Data Loss) หรือ Map ตัวแปรผิดระหว่างทาง**

- **File Upload & Hashing**: ระบบ Upload ทำงานได้จริง (บันทึกลง local และ generate SHA-256 hash) Frontend ส่ง Hash ทะลุไปจนถึง Smart contract ได้ถูกต้อง แต่ Backend **ลืมดึง URL ของไฟล์ลงมาบันทึกใน Database** ทำให้ฟิลด์พวก `xxUrl` เป็น NULL หมด
- **Duplicate Data**: ฟิลด์บางตัวเช่น `activeFlags` ใน Vehicles เป็นการเก็บซ้ำซ้อนกับตาราง `vehicle_flags` แต่ในโปรเจคก็ยังเก็บแบบ duplicate เอาไว้เพื่อความรวดเร็วในการ Query (Denormalization)
- **NULL/Missing Data**: หลาย Events ถูกตั้งค่า Hardcode ไว้ว่าง ๆ ใน Backend

ข้อสรุปเชิงออกแบบและแก้ไข:
- ต้อง Refactor `event.service.ts` ในส่วนของการ `create()` Entity ต่าง ๆ ให้ดึงค่าจาก `createEventDto.payload` และ `createEventDto.evidence` มาลง DB อย่างครบถ้วน

## 2. Source of Truth ที่ใช้

อิงจากหลักฐานต่อไปนี้:
- FE pages: `src/pages/ConsumerPage.tsx`, `src/pages/ServicePage.tsx`, `src/pages/InsurancePage.tsx`, `src/pages/InspectionPage.tsx`
- FE API: `src/services/api.ts` (ส่ง `payload` และ `evidence`)
- BE service: `src/event/event.service.ts`, `src/file/file.service.ts`, `src/file/file.controller.ts`
- BE entities: `maintenance-log.entity.ts`, `insurance-policy.entity.ts`, `insurance-claim.entity.ts`, `inspection.entity.ts`

## 3. Feature Status Checklist

| Feature | Status | Notes |
| --- | --- | --- |
| File Upload | Partial | FE อัพโหลดและ Backend รัน SHA-256 สำเร็จ แต่ Backend ไม่ยอม Map URL ไว้ใน DB (ส่งแค่ Hash ไป Smart contract) |
| Smart Contract Hashing | Partial | การนำ Hash ไปเก็บ on-chain ส่วนใหญ่ทำงานถูกต้อง แต่ใน DB กลับไม่ถูกเก็บ |
| Maintenance Log Mappings | Missing | FE ส่งคำว่า `jobs` แต่ Backend ไปดึง `payload.parts`, ฟิลด์อื่น ๆ เป็น NULL หายกลางทาง |
| Claim Evidence Mappings | Missing | `evidenceFiles` และ `evidenceHashes` ถูก hardcode เป็น `[]` ทิ้งในระดับ Entity Create ของ BE |

## 4. Critical First: Missing & NULL Data Flow Analysis

### 4.1. `CLAIM_FILED` (Insurance Claim)
- **Frontend (`InsurancePage.tsx`)**: 
  - ส่ง `payload: { description, severity, evidenceHashes }`
  - ส่งโครงสร้าง `evidence: [{ hash, url, mime, size }]` ครบถ้วน
- **Backend (`event.service.ts` line 931)**:
  - ดึงข้อมูล severity ไปใช้ได้ แต่ตอนนำไปสร้าง `insuranceClaimRepository.create(...)` กลับถูก Hardcode เป็น `evidenceFiles: [], evidenceHashes: []` ทำให้ใน DB กลายเป็น Array ว่างเสมอ
  - ฟิลด์ `description` ที่ FE ส่งมา ไม่มีการนำไปเซฟที่ไหนเลย (Data loss)
- **Smart Contract**: ส่ง Hash ไปบันทึกเข้า Contract ได้ครบ

### 4.2. `MAINTENANCE_RECORDED` (Maintenance Log)
- **Frontend (`ServicePage.tsx`)**: 
  - ส่ง `payload: { jobs, cost, evidenceHash }` 
  - แนบไฟล์ในโครงสร้าง `evidence`
- **Backend (`event.service.ts` line 1094)**:
  - `BUG-DATA-01`: โค้ด Backend สั่ง `jobs: payload.parts || []` ซึ่งผิด! FE ส่งตัวแปรชื่อ `jobs` เข้ามา ทำให้งานซ่อมใน DB เป็น NULL
  - `BUG-DATA-02`: กำหนด `symptoms: payload.description` แต่ FE (`ServicePage.tsx`) ไม่ได้ส่งตัวแปรชื่อ `description` มา
  - `BUG-DATA-03`: `laborCost`, `invoiceUrl`, `invoiceHash`, `technicianId`, `photos` ไม่มีการจับคู่ (Map) ลงตารางแต่อย่างใด เป็นสาเหตุของความโบ๋ว
- **Smart Contract**: มีการผูก `ethers.id(JSON.stringify(payload.parts || []))` เป็น Hash ไปลง Contract ก็จะกลายเป็น Hash ว่างเปล่าเช่นกัน

### 4.3. `INSURANCE_POLICY_UPDATED` (Insurance Policy)
- **Frontend (`InsurancePage.tsx`)**: ส่งครบถ้วนรวมถึง `evidenceHash` และแนบ `policyFiles` ทะลุเข้ามาใน `evidence`
- **Backend (`event.service.ts` line 878)**:
  - `BUG-DATA-04`: `policyDocUrl`, `premiumAmount`, `deductible` ขาดการผูกข้อมูลจาก `createEventDto.evidence?.[0]?.url` และ Payload

### 4.4. `INSPECTION_RESULT_RECORDED` (Inspection)
- **Frontend (`InspectionPage.tsx`)**: ผู้ตรวจสภาพรถถ่ายรูปใบรับรอง แนบรูปมาใน `evidence` ได้ URL เรียบร้อย
- **Backend (`event.service.ts` line 1042)**:
  - `BUG-DATA-05`: `certUrl` ถูกละเลยและไม่ได้สั่ง Save ลง Entity

## 5. File Upload และ Smart Contract Hashing Flow

### 5.1. Current Flow Review
- **Frontend** เรียก `/files/upload` (Multer) ไฟล์วิ่งเข้าโฟลเดอร์ `uploads/`
- **Backend `file.controller.ts`** ทำการ generate Hash (SHA-256 จาก `file.service.ts`) และเตรียม `url`, `originalname`, `hash` เด้งกลับ
- **Frontend** นำข้อมูลไฟล์มายัดลงใน Field `evidence`
- **Backend `event.service.ts`** สกิมเอาเฉพาะ Hash โยนเข้า Smart Contract (`fileClaim`, `logMaintenance` etc.)

### 5.2. หลุมพรางที่พบ
- `BUG-UPL-01`: Backend เน้นเอา Hash ไป Verify สภาพบน เชน เท่านั้น แต่หลงลืมว่าฝั่ง Database ของระบบ Web2 ต้องใช้ `URL` เพื่อเอามาเรียกดูรูป UI ทำให้ข้อมูลหลักสูญหาย และเปิดดูรูปไม่ได้ตามตาราง DB ยกเว้นแต่ดึงจาก Event Log ดิบ ๆ 

## 6. FE -> DTO -> DB Mapping Example

| Event / Entity | FE Input / Payload | BE Variable Fix (Target) | DB Table | DB Column |
| --- | --- | --- | --- | --- |
| `CLAIM_FILED` | `evidence[]` | `createEventDto.evidence` | `insurance_claims` | `evidenceFiles` |
| `CLAIM_FILED` | `description` | `payload.description` | `insurance_claims` | (ต้องเพิ่มคอลัมน์ หรือเก็บใน JSON) |
| `MAINTENANCE_RECORDED` | `payload.jobs` | `payload.jobs` | `maintenance_logs` | `jobs` |
| `MAINTENANCE_RECORDED` | `evidence[0].url` | `evidence[0].url` | `maintenance_logs` | `invoiceUrl` หรือ `photos` |
| `INSURANCE_POLICY` | `evidence[0].url` | `evidence[0].url` | `insurance_policies`| `policyDocUrl` |
| `INSPECTION_RESULT` | `evidence[0].url` | `evidence[0].url` | `inspections` | `certUrl` |

## 7. Recommended Code Changes

การแพตช์ปัญหา NULL ใน Database สามารถทำได้ง่ายมากด้วยการแก้ `src/event/event.service.ts`:

**ตัวอย่างของแพตช์ `CLAIM_FILED`**:
```ts
const claim = this.insuranceClaimRepository.create({
  tokenId: vehicle.tokenId,
  claimNo: payload.claimId || `CLM-${Date.now()}`,
  claimNoHash: ethers.id(payload.claimId || 'none'),
  filedAt: new Date(payload.date || Date.now()).getTime().toString(),
  status: 'FILED' as any,
  severity: (payload.severity?.toUpperCase() || 'MINOR') as any,
  evidenceFiles: createEventDto.evidence || [],  // <--- แก้ไขจุดนี้
  evidenceHashes: createEventDto.evidence ? createEventDto.evidence.map(e => e.hash) : [] // <--- แก้ไขจุดนี้
});
```

**ตัวอย่างของแพตช์ `MAINTENANCE_RECORDED`**:
```ts
const maintenance = this.maintenanceLogRepository.create({
  // ...
  mileageKm: payload.mileageKm || 0,
  jobs: payload.jobs || [], // <--- แก้จาก payload.parts เป็น payload.jobs
  symptoms: payload.description || 'Routine Check', 
  invoiceUrl: createEventDto.evidence && createEventDto.evidence.length > 0 ? createEventDto.evidence[0].url : null, // <--- เพิ่ม URL
  photos: createEventDto.evidence || null, // <--- เพิ่มรูปให้เปิดดูย้อนหลังได้
  // ...
});
```

## 8. Delivery Priority

**Phase 1: Stop the NULLs (Backend Mapping Fixes)**
- เข้าไป Refactor Entity `create()` method ทั้งหมดในตาราง `event.service.ts`
- โดยดึงเอาข้อมูล `payload` และ `evidence` ที่ Frontend ส่งมาเหนื่อยยากอยู่แล้ว เอาลง Database ให้ครบ
- สิ่งนี้จะซ่อมตาราง 10 กว่าตารางที่ก่อนหน้านี้ไม่สมบูรณ์

**Phase 2: Frontend Payload Standardize**
- เพิ่ม/ปรับ payload ให้รองรับ `premiumAmount`, `description` ตามความเหมาะสมของ Entity ใน Base Database
