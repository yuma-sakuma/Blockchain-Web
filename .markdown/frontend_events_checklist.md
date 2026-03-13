# Frontend Event Integration Checklist

This checklist tracks all the events triggered by the frontend pages that need to be fully supported and persisted by the backend database. Every checked item indicates that the backend successfully processes and stores the data for that event type.

## 🏭 ManufacturerPage
- [x] `MANUFACTURER_MINTED` (Vehicle Creation)
- [ ] `WARRANTY_DEFINED`
- [ ] `OWNERSHIP_TRANSFERRED` (Sent to Dealer)

## 🚙 ConsumerPage
- [ ] `CONSENT_UPDATED` (Grant Privacy Access)
- [ ] `CONSENT_REVOKED` (Revoke Privacy Access)
- [ ] `PAYMENT_PROOF_SUBMITTED`
- [ ] `OWNERSHIP_TRANSFERRED` (P2P Transfer)

## 🏢 DealerPage
- [ ] `SALE_CONTRACT_CREATED`
- [ ] `OWNERSHIP_TRANSFERRED` (Sell to Consumer)
- [ ] `DISCLOSURE_SIGNED`
- [ ] `TRADEIN_EVALUATED`
- [ ] `OWNERSHIP_TRANSFERRED` (Trade-in from Consumer)

## 🏛️ DLTPage (Department of Land Transport)
- [ ] `DLT_REGISTRATION_UPDATED`
- [ ] `PLATE_EVENT_RECORDED` (Issue/Change/Lost)
- [ ] `TAX_STATUS_UPDATED`
- [ ] `SPECIFICATION_UPDATED`
- [ ] `FLAG_UPDATED` (e.g., Stolen, Scrapped)

## 💰 FinancePage
- [ ] `LIEN_CREATED`
- [ ] `LIEN_RELEASED`
- [ ] `REPOSSESSION_RECORDED`
- [ ] `INSTALLMENT_MILESTONE_RECORDED`

## 🛡️ InsurancePage
- [ ] `INSURANCE_POLICY_UPDATED`
- [ ] `CLAIM_FILED`
- [ ] `INSURER_APPROVED_ESTIMATE`

## 🔧 ServicePage (Garage)
- [ ] `MAINTENANCE_RECORDED`
- [ ] `ODOMETER_SNAPSHOT`
- [ ] `CRITICAL_PART_REPLACED`
- [ ] `WORKSHOP_ESTIMATE_SUBMITTED`

## 🔍 InspectionPage
- [ ] `INSPECTION_RESULT_RECORDED`

---
> **Note**: Currently, [addEvent](file:///c:/Programming-Workspace/Kmutnb/Blockchain/Blockchain_VIN/Blockchain-Web/vehicle-nft-prototype/src/store/index.tsx#284-304) on the frontend syncs all these events to the [EventLog](file:///c:/Programming-Workspace/Kmutnb/Blockchain/Blockchain_VIN/Blockchain-Web/backend/src/database/entities/event-log.entity.ts#19-79) table via `POST /events`. However, backend logic (like in [event.service.ts](file:///c:/Programming-Workspace/Kmutnb/Blockchain/Blockchain_VIN/Blockchain-Web/backend/src/event/event.service.ts)) needs to interpret some of these events to update the main [Vehicle](file:///c:/Programming-Workspace/Kmutnb/Blockchain/Blockchain_VIN/Blockchain-Web/backend/src/database/entities/vehicle.entity.ts#25-141) entity or related tables. The `MANUFACTURER_MINTED` event is currently the only one fully mapped to create a new vehicle row in the database.
