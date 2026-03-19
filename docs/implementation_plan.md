# Fix Consumer Transfer — `missing revert data` Error

## Problem

เมื่อ Consumer กด TRANSFER ในหน้า Verified Assets จะเกิด error `missing revert data` เนื่องจาก **2 bugs** ที่เรียงต่อกัน:

### Bug 1: `payload.to` มี prefix ทำให้ address เป็น ZeroAddress

`ConsumerPage.tsx:77` ทำการ prepend `CONSUMER:` ก่อน address:
```javascript
const fullBuyerId = buyerId.startsWith('0x') ? `CONSUMER:${buyerId}` : buyerId;
```

จากนั้นส่ง `fullBuyerId` ไปเป็น `payload.to` → ตอนที่ `blockchain.ts:60` ตรวจสอบ:
```javascript
const toAddress = ethers.isAddress(payload.to) ? ethers.getAddress(payload.to) : ethers.ZeroAddress;
```
`ethers.isAddress("CONSUMER:0x...")` return `false` → `toAddress = ZeroAddress`

### Bug 2: Consumer wallet ไม่ได้เป็น Owner/Dealer/Admin บน chain

`VehicleLifecycle.recordTransfer()` ตรวจว่า `msg.sender` ต้องเป็น:
- NFT owner, หรือ
- มี `DEALER_ROLE`, หรือ  
- มี `DEFAULT_ADMIN_ROLE`

Consumer wallet ไม่ตรงเงื่อนไขไหนเลย → revert

---

## Proposed Changes

### Frontend

#### [MODIFY] [ConsumerPage.tsx](file:///c:/Users/ariya/OneDrive/เอกสาร/GitHub/Blockchain-Web/frontend/src/pages/ConsumerPage.tsx)

- **Line 77**: เปลี่ยนให้ส่ง raw address เป็น `payload.to` สำหรับ blockchain interaction แล้วเก็บ prefixed version ไว้ใน field อื่น (เช่น `toDisplay`)

```diff
-const fullBuyerId = buyerId.startsWith('0x') ? `CONSUMER:${buyerId}` : buyerId;
+const rawAddress = buyerId.startsWith('0x') ? buyerId : buyerId;
+const fullBuyerId = buyerId.startsWith('0x') ? `CONSUMER:${buyerId}` : buyerId;
```

- **Lines 97-99**: ส่ง raw address เป็น [to](file:///c:/Users/ariya/OneDrive/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/GitHub/Blockchain-Web/backend/src/event/event.service.ts#21-48) field:
```diff
 payload: {
-    from: currentUser,
-    to: fullBuyerId,
+    from: address,
+    to: rawAddress,
+    toDisplay: fullBuyerId,
     reason: 'resale',
```

> [!IMPORTANT]
> เปลี่ยน `reason` จาก `'private_p2p_sale'` เป็น `'resale'` ด้วย เพราะ `blockchain.ts:59` มี `reasonMap` ที่รองรับเฉพาะ: `inventory_transfer`, `first_sale`, `resale`, `trade_in` — ค่า `'private_p2p_sale'` จะ fallback เป็น `2` (resale) อยู่แล้ว แต่ควรใช้ค่าที่ชัดเจน

- **Lines 97-98**: `from` ก็ต้องเป็น raw address เช่นกัน (ปัจจุบันเป็น `CONSUMER:0x...`) → เปลี่ยนเป็น `address` (raw wallet address)

---

#### [MODIFY] [blockchain.ts](file:///c:/Users/ariya/OneDrive/เอกสาร/GitHub/Blockchain-Web/frontend/src/services/blockchain.ts)

- **Line 60**: เพิ่ม logic strip `CONSUMER:` / `DEALER:` prefix ออกก่อนวาลิเดท address เพื่อเป็น safety net:

```diff
-const toAddress = ethers.isAddress(payload.to) ? ethers.getAddress(payload.to) : ethers.ZeroAddress;
+// Strip role prefix (e.g. "CONSUMER:0x..." → "0x...")
+const rawTo = typeof payload.to === 'string' ? payload.to.replace(/^[A-Z_]+:/i, '') : payload.to;
+const toAddress = ethers.isAddress(rawTo) ? ethers.getAddress(rawTo) : ethers.ZeroAddress;
```

- **Line 70**: เช่นเดียวกัน strip prefix จาก `payload.to` สำหรับ `buyerOwnerId`:

```diff
-ethers.id(payload.to || "none")
+ethers.id(rawTo || "none")
```

---

### Backend

#### [MODIFY] [event.service.ts](file:///c:/Users/ariya/OneDrive/เอกสาร/GitHub/Blockchain-Web/backend/src/event/event.service.ts)

- **Line 246**: เพิ่ม safety net เดียวกันสำหรับ backend ด้วย (strip prefix ก่อน isAddress):

```diff
-const toAddress = ethers.isAddress(payload.to) ? ethers.getAddress(payload.to) : ethers.ZeroAddress;
+const rawTo = typeof payload.to === 'string' ? payload.to.replace(/^[A-Z_]+:/i, '') : payload.to;
+const toAddress = ethers.isAddress(rawTo) ? ethers.getAddress(rawTo) : ethers.ZeroAddress;
```

---

## Verification Plan

### Manual Verification
1. เปิดหน้า Consumer (ล็อกอินเป็น Consumer role)
2. ดูว่ามีรถใน Verified Assets
3. กดปุ่ม **TRANSFER** → ใส่ wallet address ปลายทาง (เช่น `0x...`)
4. ใส่ราคา → ยืนยัน
5. ✅ ต้องไม่เกิด `missing revert data` error
6. ✅ Transaction ต้องสำเร็จ → แสดง txHash ใน toast
