// ─────────────────────────────────────────────
//  Enums สำหรับ Vehicle Lifecycle Management
// ─────────────────────────────────────────────

/** บทบาทของผู้กระทำ (Actor) ในระบบ */
export enum ActorRole {
  MANUFACTURER = 'MANUFACTURER',
  DEALER = 'DEALER',
  DLT = 'DLT',
  FINANCE = 'FINANCE',
  INSURER = 'INSURER',
  WORKSHOP = 'WORKSHOP',
  INSPECT = 'INSPECT',
  OWNER = 'OWNER',
}

/** ประเภท Event ที่เกิดขึ้นกับรถ */
export enum EventType {
  VEHICLE_MINTED = 'VEHICLE_MINTED',
  INVENTORY_TRANSFER = 'INVENTORY_TRANSFER',
  FIRST_SALE = 'FIRST_SALE',
  OWNERSHIP_TRANSFER = 'OWNERSHIP_TRANSFER',
  TRADE_IN = 'TRADE_IN',
  DISCLOSURE = 'DISCLOSURE',
  REGISTRATION = 'REGISTRATION',
  PLATE_ISSUE = 'PLATE_ISSUE',
  PLATE_CHANGE = 'PLATE_CHANGE',
  PLATE_LOST = 'PLATE_LOST',
  TAX_PAYMENT = 'TAX_PAYMENT',
  FLAG_UPDATE = 'FLAG_UPDATE',
  INSPECTION = 'INSPECTION',
  MAINTENANCE = 'MAINTENANCE',
  PART_REPLACEMENT = 'PART_REPLACEMENT',
  ACCIDENT_REPAIR = 'ACCIDENT_REPAIR',
  INSURANCE_NEW = 'INSURANCE_NEW',
  INSURANCE_RENEW = 'INSURANCE_RENEW',
  INSURANCE_CHANGE = 'INSURANCE_CHANGE',
  INSURANCE_CANCEL = 'INSURANCE_CANCEL',
  CLAIM_FILED = 'CLAIM_FILED',
  CLAIM_UPDATED = 'CLAIM_UPDATED',
  CLAIM_CLOSED = 'CLAIM_CLOSED',
  LIEN_CREATED = 'LIEN_CREATED',
  LIEN_RELEASED = 'LIEN_RELEASED',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',
}

/** สถานะการจดทะเบียน */
export enum RegistrationStatus {
  UNREGISTERED = 'UNREGISTERED',
  REGISTERED = 'REGISTERED',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

/** ประเภท event ป้ายทะเบียน */
export enum PlateEventType {
  ISSUE = 'ISSUE',
  CHANGE = 'CHANGE',
  LOST = 'LOST',
}

/** สถานะการชำระภาษี */
export enum TaxStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  OVERDUE = 'OVERDUE',
}

/** ธงสถานะรถ */
export enum VehicleFlag {
  STOLEN = 'STOLEN',
  SEIZED = 'SEIZED',
  MAJOR_ACCIDENT = 'MAJOR_ACCIDENT',
  FLOOD = 'FLOOD',
  TOTAL_LOSS = 'TOTAL_LOSS',
  SCRAPPED = 'SCRAPPED',
  REG_CANCELLED = 'REG_CANCELLED',
}

/** ผลตรวจสภาพ */
export enum InspectionResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
}

/** ระดับความเสียหายจากอุบัติเหตุ */
export enum AccidentSeverity {
  NONE = 'NONE',
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  STRUCTURAL = 'STRUCTURAL',
}

/** การดำเนินการประกันภัย */
export enum InsuranceAction {
  NEW = 'NEW',
  RENEW = 'RENEW',
  CHANGE = 'CHANGE',
  CANCEL = 'CANCEL',
}

/** สถานะเคลมประกัน */
export enum ClaimStatus {
  FILED = 'FILED',
  ESTIMATING = 'ESTIMATING',
  APPROVED = 'APPROVED',
  REPAIRING = 'REPAIRING',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
}

/** ความรุนแรงของเคลม */
export enum ClaimSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  STRUCTURAL = 'STRUCTURAL',
  TOTAL_LOSS = 'TOTAL_LOSS',
}

/** สถานะภาระผูกพัน (Lien) */
export enum LienStatus {
  NONE = 'NONE',
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
  DEFAULTED = 'DEFAULTED',
}

/** สถานะ Escrow */
export enum EscrowState {
  CREATED = 'CREATED',
  FUNDED = 'FUNDED',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

/** วิธีการชำระเงิน */
export enum PaymentMethod {
  CASH = 'CASH',
  BANK = 'BANK',
  CRYPTO = 'CRYPTO',
}

/** เหตุผลการโอนกรรมสิทธิ์ */
export enum TransferReason {
  INVENTORY_TRANSFER = 'INVENTORY_TRANSFER',
  FIRST_SALE = 'FIRST_SALE',
  RESALE = 'RESALE',
  TRADE_IN = 'TRADE_IN',
  LIEN_DEFAULT = 'LIEN_DEFAULT',
  INHERITANCE = 'INHERITANCE',
}

/** ขอบเขตสิทธิ์การเข้าถึง (Consent Scope) */
export enum ConsentScope {
  VEHICLE_IDENTITY = 'VEHICLE_IDENTITY',
  MAINTENANCE_FULL = 'MAINTENANCE_FULL',
  MAINTENANCE_SUMMARY = 'MAINTENANCE_SUMMARY',
  CLAIMS_FULL = 'CLAIMS_FULL',
  CLAIMS_SUMMARY = 'CLAIMS_SUMMARY',
  OWNERSHIP_HISTORY = 'OWNERSHIP_HISTORY',
  INSPECTION_HISTORY = 'INSPECTION_HISTORY',
  ODOMETER_TREND = 'ODOMETER_TREND',
  PII = 'PII',
}
