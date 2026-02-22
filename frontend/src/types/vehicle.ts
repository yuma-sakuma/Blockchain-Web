export interface ProductionData {
  manufacturedAt: string;
  plantId: string;
  batchNo?: string;
}

export interface Specification {
  color: string;
  engine?: string;
  engineSerial?: string;
  batteryKwh?: number;
  batteryCapacity?: string;
  options: string[];
}

export interface Warranty {
  startDate?: string;
  startPolicy?: string;
  terms: {
    years: number;
    mileageKm: number;
    coverage: string[];
  };
}

export interface Lien {
  status: 'none' | 'active' | 'released';
  transferLocked: boolean;
  lender?: string;
  contractHash?: string;
}

export interface VehicleFlags {
  stolen: boolean;
  seized: boolean;
  majorAccident: boolean;
  flood: boolean;
  totalLoss: boolean;
  scrapped: boolean;
}

export interface Registration {
  isRegistered: boolean;
  plateNo?: string;
  province?: string;
  taxStatus: 'unpaid' | 'paid';
  taxValidUntil?: string;
  bookNo?: string;
}

export interface WriteConsent {
    grantee: string; // The garage ID
    validUntil: string;
    scope: string[];
}

export interface InsurancePolicy {
    insurer: string;
    policyNumber: string;
    coverageType: string;
    validUntil: string;
    status: 'active' | 'expired' | 'cancelled';
}

export interface InsuranceClaim {
    claimId: string;
    incidentDate: string;
    description: string;
    status: 'filed' | 'investigating' | 'approved' | 'rejected' | 'repaired';
    estimateAmount?: number;
}

export interface VehicleNFT {
  tokenId: string;
  vin: string;
  makeModelTrim: string;
  spec: Specification;
  production: ProductionData;
  manufacturerSignature: string;
  
  // Mutable State
  currentOwner: string;
  ownerCount: number;
  
  registration: Registration;
  warranty: Warranty;
  flags: VehicleFlags;
  lien: Lien;
  writeConsents?: WriteConsent[];
  
  // Insurance
  insurance?: InsurancePolicy;
  activeClaim?: InsuranceClaim;
}

export type EventType = 
  | 'MANUFACTURER_MINTED'
  | 'WARRANTY_DEFINED'
  | 'SALE_CONTRACT_CREATED'
  | 'TRADEIN_EVALUATED'
  | 'DISCLOSURE_SIGNED'
  | 'CONSENT_UPDATED'
  | 'OWNERSHIP_TRANSFERRED'
  | 'DLT_REGISTRATION_UPDATED'
  | 'PLATE_EVENT_RECORDED'
  | 'TAX_STATUS_UPDATED'
  | 'FLAG_UPDATED'
  | 'LIEN_CREATED'
  | 'LIEN_RELEASED'
  | 'INSURANCE_POLICY_UPDATED'
  | 'CLAIM_FILED'
  | 'PAYMENT_PROOF_SUBMITTED'
  | 'INSPECTION_RESULT_RECORDED'
  | 'MAINTENANCE_RECORDED'
  | 'WRITE_CONSENT_GRANTED'
  | 'CRITICAL_PART_REPLACED'
  | 'INSTALLMENT_MILESTONE_RECORDED'
  | 'CONDITIONAL_TRANSFER_CREATED'
  | 'WORKSHOP_ESTIMATE_SUBMITTED'
  | 'INSURER_APPROVED_ESTIMATE'
  | 'CLAIM_STATUS_CHANGED'
  | 'ACCIDENT_REPAIR_FLAGGED'
  | 'ODOMETER_SNAPSHOT'
  | 'REPOSSESSION_RECORDED'
  | 'CONSENT_REVOKED'
  | 'SPECIFICATION_UPDATED';

export interface VehicleEvent {
  id: string;
  tokenId: string;
  timestamp: string;
  actor: string;
  type: EventType;
  payload: any;
  signature?: string;
}
