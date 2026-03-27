---
description: Lender/Finance Workflow
---

# Lender/Finance Workflow

This workflow describes the technical and operational steps for LENDER within the Blockchain Vehicle Lien System.

## 1. Loan Origination & Approval
Lenders manage incoming loan applications initiated by Consumers (from Dealer offers).

1.  **Dashboard Access**: Log in to the Finance Portal to view "Pending Loan Applications".
2.  **Review Application**: Inspect the Borrower address, Principal (THB), Interest Rate, and Term (Months).
3.  **Approval**: Click **"Approve & Fund Data"**.
    *   **Event**: Emits `LOAN_APPROVED`.
    *   **Effect**: Ownership of the Vehicle NFT transitions to the **Lender**. The vehicle is removed from the marketplace.

## 2. Asset Locking (Lien Registry)
Once a loan is approved, the Lender must legally register the lien.

1.  **Contract Lookup**: Search for the vehicle by **VIN**.
2.  **Lock Asset**: Click **"Lock Asset"** in the "Asset Security Control" section.
    *   **Event**: Emits `LIEN_CREATED`.
    *   **Effect**: Sets `transferLocked: true` on the vehicle, preventing any unauthorized ownership transfers on the blockchain.

## 3. Loan Servicing (Installment Management)
Lenders track monthly payments manually through the system (simulating a bank feed).

1.  **Installment Scheduler**: Navigate to the payment grid for a specific vehicle.
2.  **Log Payment**: Click on a month and select:
    *   **✓ PAID**: Emits `INSTALLMENT_MILESTONE_RECORDED` with status `PAID`.
    *   **✗ MISSED**: Emits `INSTALLMENT_MILESTONE_RECORDED` with status `MISSED`.
3.  **Monitoring**: The "Loan Summary" updates automatically. If **3 or more payments** are missed, the system flags the loan as `DEFAULTED`.

## 4. Default & Recovery (Repossession)
If a borrower defaults, the Lender can initiate the recovery protocol.

1.  **Execute Seizure Notice**: Click **"Execute Seizure Notice"** in the "Dispute & Recovery" section.
    *   **Event**: Emits `REPOSSESSION_RECORDED`.
    *   **Effect**: Sets the `seized` flag on the vehicle.

## 5. Loan Discharge (Standard Completion)
When the loan is fully paid, the Lender discharges the lien.

1.  **Discharge**: Click **"Discharge"** in the "Asset Security Control" section.
    *   **Event**: Emits `LIEN_RELEASED`.
    *   **Effect**: Unlocks the asset for future transfer by the Consumer (once ownership is finalized).