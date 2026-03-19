# Decentralized Vehicle Lifecycle Ownership Platform
## Use Case Specification Document
**Digital Car Title & Carfax Platform**

---

## Actor Roles

| Actor Role | Description |
| :--- | :--- |
| **Manufacturer** | Creates and registers new vehicles on the DLT |
| **Dealer** | Receives vehicles and sells to consumers |
| **Consumer** | Owns vehicles, can transfer/sell peer-to-peer |
| **DLT Officer** | Registers plates, declares stolen/seized/total loss status |
| **Insurer** | Creates policies by VIN, files critical incident reports |
| **Lender** | Financial institution with stake in vehicle ownership |
| **Service Provider** | Updates odometer, certifies parts, files appraisals |
| **Inspector** | Conducts emission tests and records pass/fail result |

---

## Table of Contents

- [UC-001 — Register New Vehicle (Manufacturer)](#uc-001--register-new-vehicle)
- [UC-002 — Transfer Vehicle to Dealer (Manufacturer)](#uc-002--transfer-vehicle-to-dealer)
- [UC-003 — Sell Vehicle to Consumer (Dealer)](#uc-003--sell-vehicle-to-consumer)
- [UC-004 — Transfer Vehicle to Consumer or Dealer (Consumer)](#uc-004--transfer-vehicle-to-consumer-or-dealer)
- [UC-005 — Register Vehicle Plate Number (DLT Officer)](#uc-005--register-vehicle-plate-number)
- [UC-006 — Declare Vehicle Status (DLT Officer)](#uc-006--declare-vehicle-status)
- [UC-007 — Create Insurance Policy for Vehicle (Insurer)](#uc-007--create-insurance-policy-for-vehicle)
- [UC-008 — File Critical Incident Report (Insurer)](#uc-008--file-critical-incident-report)
- [UC-009 — Update Vehicle Odometer Reading (Service Provider)](#uc-009--update-vehicle-odometer-reading)
- [UC-010 — Certify Critical Part Replacement (Service Provider)](#uc-010--certify-critical-part-replacement)
- [UC-011 — File Insurance Claim/ Repair Job (Service Provider)](#uc-011--file-insurance-claim-appraisal--repair-job)
- [UC-012 — Submit Emission Inspection Result (Inspector)](#uc-012--submit-emission-inspection-result)
- [UC-013 — Change Vehicle Plate Number or VIN (DLT Officer)](#uc-013--change-vehicle-plate-number-or-vin)
- [UC-014 — View Vehicle History Timeline (Consumer)](#uc-014--view-vehicle-history-timeline)
- [UC-015 — View Vehicle Green Book (Digital Registry) (Consumer)](#uc-015--view-vehicle-green-book-digital-registry)
- [UC-016 — Dealer Buyback from Consumer (Dealer)](#uc-016--dealer-buyback-from-consumer)

---

## Use Cases

### UC-001 — Register New Vehicle

| Field | Detail |
| **Use Case ID** | UC-001 |
| **Actor** | Manufacturer |
| **Description** | Manufacturer mints a new vehicle record on the blockchain with full VIN details. |
| **Priority** | High |

**Preconditions**
- Manufacturer account is verified
- VIN has not been previously registered

**Main Flow**
1. Manufacturer logs in and navigates to Manufacturer Page
2. Inputs VIN, battery capacity, model, installed option, colour, engine type,warranty
3. Submits vehicle data — system writes record to DLT
4. System confirms on-chain registration with transaction hash

**Alternate Flow**
- **A1:** Batch upload via CSV for multiple units — system processes each VIN sequentially

**Exception Flow**
- **E1:** Duplicate VIN detected → error: "VIN already exists on chain"

**Postconditions**
- Vehicle linked to manufacturer's wallet address
- System confirms on-chain registration with transaction hash

---

### UC-002 — Transfer Vehicle to Dealer

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-002 |
| **Actor** | Manufacturer |
| **Description** | Manufacturer transfers vehicle ownership to a registered dealer on the platform. |
| **Priority** | High |

**Preconditions**
- Dealer is registered on the platform
- Manufacturer is registered

**Main Flow**
1. Manufacturer selects vehicle in Inventory pool and sent to dealer
2. Selects target dealer from registered dealer list
3. Confirms transfer — system triggers DLT ownership transfer
4. Dealer receives notification of vehicle
5. Vehicle status updates to: `At Dealer`

**Exception Flow**
- **E1:** Target dealer not found / not registered — transfer blocked

**Postconditions**
- Vehicle ownership on DLT updated to dealer's address
- Vehicle status: `At Dealer`

---

### UC-003 — Sell Vehicle to Consumer

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-003 |
| **Actor** | Dealer |
| **Description** | Dealer lists and completes a sale of a vehicle to a consumer. |
| **Priority** | High |

**Preconditions**
- Dealer owns the vehicle on DLT
- Consumer account is registered

**Main Flow**
1. Dealer selects vehicle and sets sale price (THB / ETH)
2. Payment (ETH or fiat) is confirmed
3. System executes DLT ownership transfer to consumer
4. Vehicle status updates to: `Owned by Consumer`

**Alternate Flow**
- **A1:** Payment in ETH settled via smart contract escrow

**Exception Flow**
- **E1:** Vehicle flagged as stolen/seized → sale blocked automatically

**Postconditions**
- Vehicle ownership transferred to consumer on DLT
- Transaction record stored on chain
- Vehicle status: `Owned`

---

### UC-004 — Transfer Vehicle to Consumer or Dealer

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-004 |
| **Actor** | Consumer |
| **Description** | Consumer sells or transfers their vehicle to another consumer or dealer for ETH or fiat. |
| **Priority** | High |

**Preconditions**
- Consumer owns the vehicle on DLT
- Recipient (consumer or dealer) is registered on the platform

**Main Flow**
1. Consumer opens their vehicle profile
2. Selects Transfer / Sell option
3. Inputs recipient address or selects from registered users
4. Sets agreed price (THB or ETH)
5. DLT ownership transfer executes

**Alternate Flow**
- **A1:** ETH smart contract escrow used for peer-to-peer safety

**Exception Flow**
- **E1:** Vehicle declared stolen/seized → transfer blocked
- **E2:** Recipient wallet address invalid → error shown

**Postconditions**
- New owner recorded on DLT
- Full transfer history appended to vehicle timeline

---

### UC-005 — Register Vehicle Plate Number

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-005 |
| **Actor** | DLT Officer |
| **Description** | DLT officer links an official plate number to a VIN on the system. |
| **Priority** | High |

**Preconditions**
- DLT Officer account is active
- Vehicle is registered on DLT (by manufacturer)
- Vehicle does not yet have a plate number

**Main Flow**
1. DLT officer searches vehicle by VIN
2. Enters official plate number
3. Confirms registration — system links plate to VIN on DLT
4. Vehicle record updated with plate number and registration date

**Alternate Flow**
- **A1:** Plate renewal — officer updates expired plate number linked to same VIN

**Exception Flow**
- **E1:** Plate number already assigned to another VIN → error
- **E2:** VIN not found on chain → registration blocked

**Postconditions**
- Plate number linked to VIN on DLT
- Vehicle status updated: `Registered`

---

### UC-006 — Declare Vehicle Status

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-006 |
| **Actor** | DLT Officer |
| **Description** | DLT officer flags a vehicle on the chain with an official status: Stolen, Seized by Bank, or Total Loss. |
| **Priority** | High |

**Preconditions**
- DLT Officer is authenticated
- Vehicle exists on DLT

**Main Flow**
1. Officer searches vehicle by VIN or plate number
2. Selects status type: Stolen / Seized by Bank / Total Loss
3. Enters reference document number or case ID
4. Submits declaration — status written to DLT
5. All platform users viewing this vehicle see the flag immediately

**Alternate Flow**
- **A1:** Revoke declaration — officer can lift a "Stolen" flag if vehicle is recovered (with case reference)
- **A2:** Revoke Seize — officer can lift a "SEIZE" flag if vehicle is payed (with case reference)

**Postconditions**
- Vehicle status flag is active on DLT
- Any transfer or sale attempts for this vehicle are blocked
- Flag visible in full vehicle history

---

### UC-007 — Create Insurance Policy for Vehicle

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-007 |
| **Actor** | Insurer |
| **Description** | Insurer creates and links an insurance policy to a specific vehicle identified by VIN. |
| **Priority** | High |

**Preconditions**
- Insurer account is verified
- Vehicle VIN exists on platform
- Vehicle is owned (not in transit)

**Main Flow**
1. Insurer searches vehicle by VIN
2. Selects insurance tier (Basic / Comprehensive / Premium)
3. Uploads policy document (PNG)
4. Enter contract number
5. Submits — system writes policy record linked to VIN on DLT
6. Vehicle record updated with active insurance status

**Alternate Flow**
- **A1:** Policy renewal — insurer uploads new document and extends dates for existing policy

**Exception Flow**
- **E1:** Vehicle flagged as Total Loss → policy creation blocked

**Postconditions**
- Insurance policy linked to VIN on DLT
- Policy document hash stored on chain for tamper-proof verification
- Vehicle insurance status: `Active`

---

### UC-008 — File Critical Incident Report

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-008 |
| **Actor** | Insurer |
| **Description** | Insurer files an incident report against a specific insured vehicle with a severity rating. |
| **Priority** | High |

**Preconditions**
- Insurance policy is active for the vehicle
- Insurer is authenticated

**Main Flow**
1. Insurer enter vehicle profile by VIN
2. Chooses severity: Minor / Major / Total Loss
3. Inputs incident date, description, and supporting details
4. Submits report — record written to DLT vehicle history

**Alternate Flow**
- **A1:** Total Loss severity automatically triggers a flag suggestion to DLT officer

**Exception Flow**
- **E1:** No active policy found for VIN → report blocked
- **E2:** Duplicate incident report for same date → system warns insurer

**Postconditions**
- Incident report appended to vehicle history on DLT
- If Total Loss: vehicle status automatically updated
- Report visible to vehicle owner and relevant parties

---

### UC-009 — Update Vehicle Odometer Reading

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-009 |
| **Actor** | Service Provider |
| **Description** | Service provider updates the current odometer reading for a vehicle after a service visit. |
| **Priority** | Medium |

**Preconditions**
- Service provider is registered and verified
- Vehicle VIN exists on platform

**Main Flow**
1. Service provider enters vehicle by VIN
2. Enters current odometer reading (km)
3. Inputs Labor & Parts Details
4. Submits — odometer record written to DLT

**Alternate Flow**
- **A1:** Odometer update bundled with a critical part certification in the same service entry

**Exception Flow**
- **E1:** New odometer value is lower than the last recorded value → system flags rollback warning

**Postconditions**
- Odometer reading updated on vehicle DLT record
- Service entry visible in vehicle history timeline

---

### UC-010 — Certify Critical Part Replacement

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-010 |
| **Actor** | Service Provider |
| **Description** | Service provider certifies replacement of a critical vehicle component with its new serial number. |
| **Priority** | High |

**Preconditions**
- Service provider is verified
- Vehicle exists on DLT
- Original part serial number exists in record (or is being added fresh)

**Main Flow**
1. Service provider enters vehicle by VIN
2. Selects Add Part Certification
3. Chooses part type: ECU / Battery / Main Motor
4. Inputs new part serial number
5. Submits — part record written to DLT

**Alternate Flow**
- **A1:** Certify multiple parts in a single service visit

**Exception Flow**
- **E1:** Serial number format invalid for selected part type → inline error
- **E2:** Part serial number already used on another VIN → duplicate warning

**Postconditions**
- New part serial number recorded on vehicle DLT history
- Previous part record marked as replaced
- Part certification visible in full vehicle report

---

### UC-011 — File Insurance Claim Appraisal / Repair Job

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-011 |
| **Actor** | Service Provider |
| **Description** | Service provider submits a repair appraisal with itemised job values in Thai Baht. |
| **Priority** | High |

**Preconditions**
- Vehicle has an active or recently filed insurance claim / incident report
- Service provider is verified

**Main Flow**
1. Service provider opens vehicle by VIN
2. Selects Insurance Claim Appraisal
3. Inputs repair items (e.g. Frame Alignment, Front Bumper, Headlining Assembly)
4. Inputs appraisal value per item in Thai Baht (THB)
5. Attaches supporting photos if required
6. Submits — appraisal record linked to incident report on DLT

**Alternate Flow**
- **A1:** Update appraisal if additional damage is discovered during repair

**Exception Flow**
- **E1:** No linked incident report found for vehicle → submission blocked
- **E2:** Appraisal total exceeds vehicle insured value → system flags for insurer review

**Postconditions**
- Appraisal record written to DLT linked to incident
- Insurer notified of submitted appraisal
- Appraisal visible to vehicle owner and insurer

---

### UC-012 — Submit Emission Inspection Result

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-012 |
| **Actor** | Inspector |
| **Description** | Inspector records the vehicle's CO2 emission reading and issues a pass or fail decision. |
| **Priority** | Medium |

**Preconditions**
- Inspector account is verified
- Vehicle VIN exists on platform
- Inspection appointment is scheduled

**Main Flow**
1. Inspector opens vehicle by VIN
2. Selects New Emission Inspection
3. Inputs CO2 measurement (g/km) from test equipment
4. Reviews against standard threshold
5. Selects result: Pass or Fail
6. Adds notes if failed
7. Submits — inspection record written to DLT

**Alternate Flow**
- **A1:** Re-inspection after repair — inspector links new result to prior failed inspection

**Exception Flow**
- **E1:** CO2 value entered is out of plausible range → system flags for review
- **E2:** Inspector attempts to submit for a vehicle already inspected today → duplicate warning

**Postconditions**
- Emission inspection result recorded on DLT vehicle history
- Pass/Fail status visible on vehicle public record
- If failed: vehicle flagged pending re-inspection

---

### UC-013 — View Vehicle History Timeline

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-013 |
| **Actor** | Consumer |
| **Description** | Consumer views the full on-chain event history of a vehicle, including ownership transfers, flag updates, plate events, DLT registrations, sale contracts, and payment proofs — each with actor address, timestamp, and transaction hash. |
| **Priority** | High |

**Preconditions**
- Consumer is authenticated
- Vehicle VIN or plate number is known
- Vehicle record exists on DLT

**Main Flow**
1. Consumer navigates to Vehicle History or searches by VIN / plate number
2. System retrieves all on-chain events linked to the vehicle
3. Events are displayed in reverse chronological order, each showing:
   - Event type (e.g. Ownership Transferred, Plate Event Recorded, Flag Updated)
   - Actor type and wallet address (e.g. CONSUMER:0xF039...)
   - Event date and time
   - Transaction hash (TX) as a clickable link where applicable
4. Consumer reviews the full lifecycle from manufacture to current ownership

**Alternate Flow**
- **A1:** Consumer filters events by type (e.g. show only Ownership Transfers)
- **A2:** Consumer clicks a TX hash to view the raw on-chain transaction details

**Exception Flow**
- **E1:** VIN not found on DLT → "No record found" message shown
- **E2:** Vehicle history is empty (newly minted) → message: "No events recorded yet"
- **E3:** DLT node unavailable → system shows cached last-known history with a stale warning

**Postconditions**
- Consumer has viewed the complete verified event log of the vehicle
- No data is modified — read-only operation

---

### UC-014 — View Vehicle Green Book (Digital Registry)

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-014 |
| **Actor** | Consumer |
| **Description** | Consumer views the Official Digital Registry (Green Book) of a vehicle, showing vehicle identity, registration details, current status badges, and verified ownership history. |
| **Priority** | High |

**Preconditions**
- Consumer is authenticated
- Vehicle VIN or plate number is known
- Vehicle is registered on DLT with a plate number (registered by DLT officer)

**Main Flow**
1. Consumer opens the vehicle profile and selects View Green Book / Digital Registry
2. System generates the Official Digital Registry view showing:
   - Vehicle Identity: Vehicle name, VIN, Token ID
   - Registration Details: Plate number, Book number (e.g. GB-769117)
   - Status Badges: Active flags such as TAX DUE, UNINSURED, STOLEN, SEIZED, TOTAL LOSS
   - Verified Ownership History: Chronological list of all ownership transfers with actor wallet addresses and dates
3. Consumer reviews the official registry information

**Alternate Flow**
- **A1:** Consumer shares a read-only green book link with a prospective buyer for verification
- **A2:** Third party (e.g. bank, insurer) views the green book via a shared link without logging in

**Exception Flow**
- **E1:** Vehicle has no registered plate → green book cannot be generated; message: "Vehicle not yet registered"
- **E2:** Vehicle is flagged as Stolen or Seized → green book displays prominent warning banner
- **E3:** DLT data unavailable → cached registry shown with timestamp of last sync

**Postconditions**
- Consumer has viewed the official digital registry of the vehicle
- No data is modified — read-only operation
- Status badges reflect the latest on-chain state

---

### UC-015 — Dealer Buyback from Consumer

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-015 |
| **Actor** | Dealer |
| **Description** | Dealer initiates a buyback of a consumer-owned vehicle at an evaluated price, transferring ownership back to the dealer on the DLT. |
| **Priority** | Medium |

**Preconditions**
- Dealer is authenticated
- Consumer owns the vehicle on DLT
- Vehicle has no active Stolen, Seized, or Total Loss flag
- Both dealer and consumer agree on the buyback evaluation price

**Main Flow**
1. Dealer searches for the vehicle by VIN or plate number
2. Dealer reviews vehicle history, green book, odometer records, and part certifications to determine evaluation price
3. Dealer submits a Buyback Offer with the proposed price (THB or ETH)
4. Consumer receives notification of the buyback offer and reviews it
5. Consumer accepts the offer
6. Payment is processed (ETH via smart contract or recorded fiat transaction)
7. System executes DLT ownership transfer from consumer to dealer
8. Vehicle status updates to: `At Dealer`
9. Buyback event recorded on vehicle history timeline

**Alternate Flow**
- **A1:** Consumer counter-offers a different price → dealer reviews and accepts or declines
- **A2:** Dealer uses vehicle evaluation score as the basis for the offer price
- **A3:** Payment settled in ETH via smart contract escrow — funds released upon ownership transfer confirmation

**Exception Flow**
- **E1:** Vehicle flagged as Stolen / Seized / Total Loss → buyback blocked
- **E2:** Consumer declines the offer → no transfer occurs; offer marked as rejected
- **E3:** Payment fails or wallet insufficient → transaction rolled back
- **E4:** Vehicle ownership disputed (pending transfer) → buyback blocked until resolved

**Postconditions**
- Vehicle ownership transferred back to dealer on DLT
- Buyback transaction and price recorded on chain
- Vehicle status: `At Dealer`
- Full ownership trail updated in vehicle history timeline