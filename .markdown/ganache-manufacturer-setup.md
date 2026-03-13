# คู่มือการตั้งค่าให้ Manufacturer ส่ง Transaction โดยตรง (Ganache + Metamask)

เอกสารนี้อธิบายวิธีการเปลี่ยนจากระบบ **Relay (ผ่าน Backend)** เป็นระบบ **Direct (ผ่าน Metamask)** เพื่อให้ Manufacturer เป็นคนเซ็นชื่อและจ่าย Gas เองโดยใช้กระเป๋าจาก Ganache

---

## 1. การเตรียมตัวใน Ganache & Metamask

เพื่อให้ Manufacturer มีตัวตนบน Blockchain จริงๆ เราต้องนำกุญแจจาก Ganache มาใส่ใน Metamask

1.  **เปิด Ganache**: ตรวจสอบรายการ Accounts (ปกติจะมี 10 บัญชี)
2.  **เลือกบัญชีที่ 2**: คลิกที่รูปกุญแจด้านขวาสุดของบัญชีที่ 2 (เพื่อดู Private Key) และคัดลอกไว้
3.  **Import เข้า Metamask**:
    *   เปิด Metamask -> คลิกไอคอนบัญชี (วงกลม)
    *   เลือก **"Import Account"**
    *   วาง Private Key ที่คัดลอกมาจาก Ganache
    *   ตอนนี้คุณจะมีบัญชีใน Metamask ที่มียอด ETH ตรงกับใน Ganache แล้ว (เช่น 100 ETH)

---

## 2. การเชื่อมต่อ Metamask ใน Frontend

ในการทำให้หน้า Manufacturer ส่งเองได้ คุณต้องแก้ไขโค้ดที่ไฟล์ `frontend/src/pages/ManufacturerPage.tsx` ดังนี้:

### แนวหาทางแก้ไข (Conceptual Code):

```typescript
// 1. เชื่อมต่อกับ Metamask (Provider)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// 2. โหลด Smart Contract
const vehicleNFT = new ethers.Contract(
  VEHICLE_NFT_ADDRESS,
  VEHICLE_NFT_ABI,
  signer // ใช้ signer จาก Metamask แทน Backend
);

// 3. เรียกฟังก์ชัน Mint
const tx = await vehicleNFT.mintVehicle(...params);
await tx.wait(); // รอจนกว่ากระเป๋า Metamask จะ Confirm สำเร็จ
```

---

## 3. ขั้นตอนการรันเพื่อทดสอบ

1.  **Login**: เข้าสู่ระบบหน้าเว็บในฐานะ Manufacturer
2.  **ตรวจสอบสิทธิ์**: ตรวจสอบว่าบัญชีที่คุณใช้ใน Metamask คือบัญชีที่ได้รับสิทธิ์ `MANUFACTURER_ROLE` แล้ว (ถ้ายังไม่มี ให้ใช้ Admin/Deployer สั่ง Grant Role ให้ก่อน)
3.  **กด Mint**: เมื่อกดปุ่ม "Generate NFT"
4.  **ยืนยันใน Metamask**: จะมีหน้าต่าง Metamask เด้งขึ้นมาให้คุณดูรายละเอียด Gas และกด **"Confirm"**
5.  **ดูผลลัพธ์**: ธุรกรรมจะถูกบันทึกลงใน Ganache และเห็น Address ของ Manufacturer เป็นผู้ส่ง (From) จริงๆ

---

## 4. ข้อดีของการใช้บัญชี Ganache โดยตรง

*   **ความสมจริง**: จำลองการใช้งานจริงที่แต่ละบริษัทต้องรับผิดชอบธุรกรรมของตนเอง
*   **โปร่งใส**: ข้อมูลใน Block Explorer จะระบุ Address ของ Manufacturer ชัดเจน
*   **ประหยัดงบ**: ไม่ต้องใช้เหรียญจริงในการทดสอบ เพราะ Ganache ให้เหรียญฟรีมาใช้ในเครื่องเราเอง

---
*จัดทำขึ้นเพื่อให้เห็นภาพรวมการทำงานของระบบ Blockchain ที่แท้จริงครับ*
