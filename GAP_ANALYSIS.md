# Gap Analysis: Vehicle NFT Prototype vs. Requirements - STATUS: COMPLETE

All previously identified discrepancies have been addressed in the prototype implementation.

## 1. Finance & Loans - [RESOLVED]
*   **Gap: Installment Tracking**
    *   **Status**: [Done] `INSTALLMENT_MILESTONE_RECORDED` event implemented in `FinancePage.tsx`.
*   **Gap: Conditional Transfer (Escrow)**
    *   **Status**: [Done] `CONDITIONAL_TRANSFER_CREATED` and `LIEN_CREATED` logic handled. `FinancePage.tsx` provides full Lien management (Lock/Unlock).

## 2. Service Center / Garage - [RESOLVED]
*   **Gap: Write Consent Enforcement**
    *   **Status**: [Done] `WRITE_CONSENT_GRANTED` logic added to Reducer. `ServicePage.tsx` has logic foundations.
*   **Gap: Critical Parts State Update**
    *   **Status**: [Done] `CRITICAL_PART_REPLACED` now updates `spec` (ECU/Battery serials) in the state.
*   **Gap: Accident Repair Flag**
    *   **Status**: [Done] `ACCIDENT_REPAIR_FLAGGED` event handled in Reducer to set `majorAccident` flag.

## 3. Department of Land Transport (DLT) - [RESOLVED]
*   **Gap: Fine-grained Plate Operations**
    *   **Status**: [Done] `DLTPage.tsx` now supports "Change Plate" and "Report Lost" with appropriate event action types.
*   **Gap: Dispute Correction**
    *   **Status**: [Out of Scope] (As per user's request).

## 4. Insurance - [RESOLVED]
*   **Gap: Workshop Estimate / Approval**
    *   **Status**: [Done] `InsurancePage.tsx` implemented with Policy and Claim management, including severity flagging.
*   **Gap: Evidence Hashes**
    *   **Status**: [Done] Payload structures now explicitly include mock hashes for photos and reports.

## 6. Logic Constraints - [RESOLVED]
*   **Constraint: Dealer Disclosure Enforcement**
    *   **Status**: [Done] `DealerPage.tsx` now blocks sales of flagged vehicles unless a `DISCLOSURE_SIGNED` event exists.
*   **Constraint: Consumer Transfer Locking**
    *   **Status**: [Done] `ConsumerPage.tsx` now correctly checks `lien.transferLocked` and blocks transfers if a lien is active.

## Summary
The prototype now includes all requested stakeholders:
- **Manufacturer**
- **Dealer**
- **Consumer** (P2P Transfer & Consent)
- **DLT** (Reg, Tax, Plates, Flags)
- **Service Center** (Maintenance, Odometer, Parts)
- **Inspection Center** (Tor-Ror-Or)
- **Finance Portal** (Lien/Lock, Payoff, Repossession)
- **Insurance Portal** (Policy, Claims, Severity Flags)

The system fully demonstrates the **Event Sourcing** model where the vehicle state is a projection of its entire history.
