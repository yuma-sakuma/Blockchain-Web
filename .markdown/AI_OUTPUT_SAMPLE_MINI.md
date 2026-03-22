# AI Output Sample Mini

อัปเดตล่าสุด: 2026-03-20

เอกสารนี้เป็น "ตัวอย่างขนาดเล็ก" ของ output ที่ควรคาดหวังจาก AI เมื่อต้อง:
- อ่าน code จริงก่อนสรุป
- แยกสิ่งที่พบจริงออกจากข้อเสนอ
- ออกแบบแบบ fullstack ตั้งแต่ FE -> API -> BE -> DB
- ระบุ bug, gap, และ patch direction ที่ลงมือทำต่อได้

เป้าหมายของตัวอย่างนี้:
- โชว์โครงเอกสารที่ดี
- โชว์ระดับความละเอียดที่พอใช้งานจริง

## 1. Executive Summary

จาก code ปัจจุบัน flow สร้าง organization ยังไม่สมบูรณ์ในระดับ business flow แม้บาง field จะมีอยู่แล้วใน backend DTO:
- frontend หน้าสร้าง org ยังรับข้อมูลไม่ครบ
- backend รองรับ `serviceIds` แต่ยังไม่ได้บันทึก entitlement จริง
- create flow ยังไม่ห่อ transaction เดียว
- child organization relation ยังไม่ถูกผูกใน flow เดียวกับ create org

ข้อสรุปเชิงออกแบบ:
- ควรยกระดับ `POST /organizations` ให้เป็น aggregate create flow
- ต้องรองรับ organization + domains + services + child relation ใน request เดียว
- ต้อง commit ใน transaction เดียวของ portal DB

## 2. Source of Truth ที่ใช้

อิงจากหลักฐานต่อไปนี้:
- FE page: `src/pages/organizations/create/index.tsx`
- FE API helper: `src/pages/organizations/api/index.ts`
- FE types: `src/pages/organizations/api/response.ts`
- BE DTO: `src/modules/v1/organization/dto/organization.dto.ts`
- BE service: `src/modules/v1/organization/organization.service.ts`
- DB/relationship reference: `organization_children_groups`, `organization_children_group_members`, `organization_service_permissions`

หมายเหตุ:
- ส่วนนี้ต้องเขียนจากไฟล์จริงเสมอ
- ถ้ายังไม่ได้อ่านไฟล์ไหน ห้ามอ้างว่า "มีอยู่แล้ว" แบบเดา

## 3. Feature Status Checklist

| Feature | Status | Notes |
| --- | --- | --- |
| Basic organization create | Partial | สร้าง org row ได้ แต่ flow ยังไม่ครบ |
| Initial domains on create | Partial | มีการส่งบางส่วน แต่ validation และ transaction ยังไม่ครบ |
| Initial service entitlement | Missing | DTO รองรับ แต่ service ยังไม่ insert จริง |
| Child organization linking | Missing | ยังไม่ผูกผ่าน children-group model |

## 4. Critical First: Organization Creation

### 4.1 Current Flow Review จาก code ปัจจุบัน

Frontend:
- มี form สำหรับข้อมูลพื้นฐาน เช่นชื่อองค์กร รายละเอียด ที่อยู่ เบอร์โทร
- ยังไม่เห็น section สำหรับ relationship, services, หรือ review summary ก่อน submit

Backend:
- DTO เริ่มรองรับ field มากกว่า FE
- service flow ยังเน้นสร้าง `organizations` ก่อน แล้วค่อยทำงานบางส่วนต่อ
- ยังไม่เห็น transaction boundary ที่ครอบทุกขั้นตอน

สรุป:
- contract ระหว่าง FE กับ BE ยังไม่ aligned
- flow ปัจจุบันยังเสี่ยงเกิด partial data

### 4.2 Bugs / Incomplete Behavior

- `BUG-ORG-01` FE ไม่ส่ง `maxUser` แม้ BE รองรับ
- `BUG-ORG-02` FE ไม่ส่ง `serviceIds`
- `BUG-ORG-03` BE รับ `serviceIds` แต่ยังไม่ insert `organization_service_permissions`
- `BUG-ORG-04` create flow ไม่ใช้ transaction เดียว
- `BUG-ORG-05` child relation ยังไม่ถูกสร้างผ่าน `organization_children_group_members`

### 4.3 Target Business Rule

เมื่อสร้าง org ใหม่ ระบบควรรองรับใน request เดียว:
- organization master data
- initial domains
- initial service permissions
- optional child-of-parent relationship

กติกาหลัก:
- ถ้าเป็น child org ต้อง resolve parent org ให้ชัด
- ถ้าเปิด services ไม่สำเร็จ ต้อง rollback ทั้ง flow
- ห้ามพึ่ง field สมมติที่ไม่ได้เป็น source of truth ใน schema จริง

## 5. Recommended FE Design

ใช้หน้าเดิม แต่ขยายเป็น 4 sections:

### Section A: Basic Info
- `orgName`
- `orgDescription`
- `orgAddress`
- `orgPhone`
- `maxUser`

### Section B: Relationship
- `relationshipMode`
- `parentOrgId`
- `parentChildrenGroupId`
- `memberType`
- `allowParentAccess`

### Section C: Initial Domains
- `domainName`
- `description`
- `pairedIndex`

### Section D: Initial Services
- `serviceIds: string[]`

## 6. FE -> DTO -> DB Mapping Example

| FE Input | BE DTO | DB Table | DB Column |
| --- | --- | --- | --- |
| `orgName` | `name` | `organizations` | `org_name` |
| `maxUser` | `maxUser` | `organizations` | `max_user` |
| `serviceIds[]` | `serviceIds[]` | `organization_service_permissions` | `svc_id` |
| `parentChildrenGroupId` | `parentChildrenGroupId` | `organization_children_group_members` | `group_id` |
| `allowParentAccess` | `allowParentAccess` | `organization_children_group_members` | `allow_parent_access` |

## 7. DTO Example ที่ควรได้

```ts
export interface CreateOrganizationRequest {
  orgName: string;
  orgDescription?: string;
  orgAddress?: string;
  orgPhone?: string;
  maxUser?: number;
  relationshipMode?: 'STANDALONE' | 'CHILD_OF_ORG';
  parentOrgId?: string;
  parentChildrenGroupId?: string;
  memberType?: string;
  allowParentAccess?: boolean;
  domains?: {
    domainName: string;
    description?: string;
    pairedIndex?: number;
  }[];
  serviceIds?: string[];
}
```

## 8. Validation ที่ควรมี

Frontend:
- `orgName` required
- `maxUser >= 1`
- child mode ต้องมี `parentOrgId`
- domain ซ้ำกันใน form ไม่ได้

Backend:
- ตรวจ org / parent org มีอยู่จริง
- ตรวจ service ทุกตัวมีอยู่จริง
- ตรวจ domain pair ถูกต้อง
- ตรวจ group ต้อง belong กับ parent org

## 9. Transaction Design

ลำดับที่แนะนำ:
1. validate request ระดับ business
2. เปิด transaction
3. insert `organizations`
4. insert `domains`
5. insert `organization_service_permissions`
6. ถ้าเป็น child org ให้ insert `organization_children_group_members`
7. commit
8. emit audit log

rollback ทันทีเมื่อ:
- insert org fail
- insert domain fail
- enable service fail
- create child membership fail

## 10. Recommended Code Changes

Frontend:
- ขยาย `src/pages/organizations/create/index.tsx`
- ขยาย request types ใน `src/pages/organizations/api/response.ts`
- ขยาย API helper ใน `src/pages/organizations/api/index.ts`

Backend:
- ขยาย `CreateOrganizationDto`
- refactor `createOrganization()` ให้ใช้ transaction
- เพิ่ม validation helper สำหรับ domain/service/relationship
- เพิ่ม repository method สำหรับ children group lookup และ service lookup

## 11. Delivery Priority

Phase 1:
- align FE/BE contract
- เพิ่ม transaction
- เพิ่ม service entitlement insert

Phase 2:
- เพิ่ม child organization relation
- เพิ่ม review summary และ better validation

## 12. ลักษณะของ output ที่ดี

output ที่ดีควรมีลักษณะนี้:
- พูดจาก code จริง ไม่ใช่ generic best practice ลอย ๆ
- มีทั้ง current state และ target state
- ชี้ bug/gap ได้ชัด
- map ข้าม FE, DTO, BE, DB ได้
- บอก patch direction ที่ทีมเอาไป implement ต่อได้ทันที

ถ้า AI ตอบแค่:
- "ควรมี frontend/backend/database"
- "ควรใช้ transaction"
- "ควร validate input"

โดยไม่ชี้ว่าไฟล์ไหน, flow ไหน, field ไหน, table ไหน, ถือว่ายังไม่ถึงระดับที่ต้องการ
