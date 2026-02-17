import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { VehicleEvent, VehicleNFT } from '../types/vehicle';

interface VehicleContextType {
  vehicles: VehicleNFT[];
  events: VehicleEvent[];
  addEvent: (event: Omit<VehicleEvent, 'id' | 'timestamp'>) => void;
  getVehicle: (tokenId: string) => VehicleNFT | undefined;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const useVehicleStore = () => {
  const context = useContext(VehicleContext);
  if (!context) throw new Error('useVehicleStore must be used within VehicleProvider');
  return context;
};

// Initial State Logic (Reducer-like)
const applyEventToState = (currentVehicles: VehicleNFT[], event: VehicleEvent): VehicleNFT[] => {
  const { type, payload } = event;
  
  if (type === 'MANUFACTURER_MINTED') {
    const newVehicle: VehicleNFT = {
      tokenId: payload.tokenId || Date.now().toString(), // Simple mock ID
      vin: payload.vin,
      makeModelTrim: payload.makeModelTrim,
      spec: payload.spec,
      production: payload.production,
      manufacturerSignature: payload.manufacturerSignature,
      currentOwner: 'MANUFACTURER', // Default initial owner
      ownerCount: 0,
      registration: { isRegistered: false, taxStatus: 'unpaid' },
      warranty: { terms: { years: 0, mileageKm: 0, coverage: [] } },
      flags: { stolen: false, seized: false, majorAccident: false, flood: false, totalLoss: false, scrapped: false },
      lien: { status: 'none', transferLocked: false }
    };
    return [...currentVehicles, newVehicle];
  }
  
  return currentVehicles.map(v => {
    if (v.tokenId !== event.tokenId) return v;
    
    // Apply state changes based on event type
    switch (type) {
      case 'WARRANTY_DEFINED':
        return { ...v, warranty: { ...v.warranty, ...payload } };
      case 'OWNERSHIP_TRANSFERRED':
        return { 
          ...v, 
          currentOwner: payload.to, 
          ownerCount: v.ownerCount + 1 
        };
      case 'DLT_REGISTRATION_UPDATED':
        return { 
          ...v, 
          registration: { 
            ...v.registration, 
            isRegistered: true, 
            bookNo: payload.bookNo 
          } 
        };
      case 'PLATE_EVENT_RECORDED':
        return { 
          ...v, 
          registration: { ...v.registration, plateNo: payload.plateNo } 
        };
      case 'TAX_STATUS_UPDATED':
        return { 
          ...v, 
          registration: { 
            ...v.registration, 
            taxStatus: 'paid', 
            taxValidUntil: payload.validUntil 
          } 
        };
      case 'FLAG_UPDATED':
        return {
          ...v,
          flags: { ...v.flags, [payload.flag]: payload.value }
        };
      case 'LIEN_CREATED':
        return {
          ...v,
          lien: { status: 'active', transferLocked: true, lender: payload.lender }
        };
      case 'LIEN_RELEASED':
        return {
          ...v,
          lien: { status: 'released', transferLocked: false, lender: undefined }
        };
      case 'MAINTENANCE_RECORDED': 
        // Logic: Update mileage if monotonic
        // In a real app we might store the service history in a separate list, 
        // but for the Snapshot, we mostly care about mileage updates attached to service.
        return {
             ...v,
             warranty: { 
                 ...v.warranty, 
                 terms: { 
                     ...v.warranty.terms, 
                     mileageKm: Math.max(v.warranty.terms.mileageKm, payload.mileageKm) 
                 } 
             }
        };
      case 'INSURANCE_POLICY_UPDATED':
        return {
          ...v,
          insurance: {
            insurer: payload.insurer,
            policyNumber: payload.policyNumber,
            coverageType: payload.coverageType,
            validUntil: payload.validUntil,
            status: 'active'
          }
        };
      case 'CLAIM_FILED':
        const isMajor = payload.severity === 'total_loss' || payload.severity === 'high';
        return {
            ...v,
            flags: { 
                ...v.flags, 
                majorAccident: v.flags.majorAccident || isMajor,
                totalLoss: payload.severity === 'total_loss' 
            },
            activeClaim: {
                claimId: payload.claimId || `CLAIM-${Date.now()}`,
                incidentDate: payload.date || new Date().toISOString(),
                description: payload.description,
                status: 'filed'
            }
        };
      case 'CLAIM_STATUS_CHANGED':
        return v.activeClaim ? {
            ...v,
            activeClaim: { ...v.activeClaim, status: payload.status }
        } : v;
      case 'INSURER_APPROVED_ESTIMATE':
        return v.activeClaim ? {
            ...v,
            activeClaim: { ...v.activeClaim, status: 'approved', estimateAmount: payload.amount }
        } : v;
      case 'WRITE_CONSENT_GRANTED':
        return {
          ...v,
          writeConsents: [
            ...(v.writeConsents || []).filter(c => new Date(c.validUntil) > new Date()), // cleanup expired
            {
               grantee: payload.to,
               scope: payload.scope,
               validUntil: payload.expiresAt
            }
          ]
        };
      case 'CRITICAL_PART_REPLACED':
        // Update spec (assuming specific parts like ECU or Battery are tracked in spec)
        // Note: Our spec structure is simple, so we might append to 'options' or fields if they exist.
        // For prototype, let's update if the partType matches a spec field.
        const newSpec = { ...v.spec };
        if (payload.partType === 'ECU') newSpec.engine = payload.newPartNo; // Mock mapping
        if (payload.partType === 'Battery') newSpec.batteryKwh = payload.newPartNo; // Mock mapping
        
        return {
            ...v,
            spec: newSpec
        };
      case 'REPOSSESSION_RECORDED':
        return {
          ...v,
          flags: { ...v.flags, seized: true },
          lien: { ...v.lien, transferLocked: true }
        };
      case 'ODOMETER_SNAPSHOT':
        return {
          ...v,
          warranty: { 
            ...v.warranty, 
            terms: { 
              ...v.warranty.terms, 
              mileageKm: Math.max(v.warranty.terms.mileageKm, payload.mileageKm) 
            } 
          }
        };
      case 'ACCIDENT_REPAIR_FLAGGED':
        return {
          ...v,
          flags: { 
            ...v.flags, 
            majorAccident: v.flags.majorAccident || payload.severity === 'structural' || payload.severity === 'major'
          }
        };
      case 'SPECIFICATION_UPDATED':
        return {
          ...v,
          spec: {
            ...v.spec,
            ...payload.changes // Expect payload to have "changes" object
          }
        };
      // To be implemented: Other events
      default:
        return v;
    }
  });
};

export const VehicleProvider = ({ children }: { children: ReactNode }) => {
  const [vehicles, setVehicles] = useState<VehicleNFT[]>([]);
  const [events, setEvents] = useState<VehicleEvent[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const savedEvents = localStorage.getItem('vehicle_events');
    if (savedEvents) {
      const parsedEvents: VehicleEvent[] = JSON.parse(savedEvents);
      setEvents(parsedEvents);
      
      // Rebuild state from events
      let state: VehicleNFT[] = [];
      parsedEvents.forEach(e => {
        state = applyEventToState(state, e);
      });
      setVehicles(state);
    }
  }, []);

  const addEvent = (newEventData: Omit<VehicleEvent, 'id' | 'timestamp'>) => {
    const newEvent: VehicleEvent = {
      ...newEventData,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    localStorage.setItem('vehicle_events', JSON.stringify(updatedEvents));
    
    setVehicles(prev => applyEventToState(prev, newEvent));
  };

  return (
    <VehicleContext.Provider value={{ vehicles, events, addEvent, getVehicle: (id) => vehicles.find(v => v.tokenId === id) }}>
      {children}
    </VehicleContext.Provider>
  );
};
