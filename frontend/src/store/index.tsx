import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { createEvent, getEvents, getVehicles } from '../services/api';
import { VehicleEvent, VehicleNFT } from '../types/vehicle';

interface VehicleContextType {
  vehicles: VehicleNFT[];
  events: VehicleEvent[];
  addEvent: (event: Omit<VehicleEvent, 'id' | 'timestamp'>) => Promise<any>;
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
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 8000);
  };

  // Load from backend API on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [fetchedVehicles, fetchedEvents] = await Promise.all([
          getVehicles(),
          getEvents()
        ]);

        // Map backend event structure to frontend structure
        const mappedEvents: VehicleEvent[] = fetchedEvents.map((e: any) => ({
          id: e.eventId,
          tokenId: e.tokenId,
          timestamp: new Date(Number(e.occurredAt)).toISOString(),
          actor: e.actorAddress || 'UNKNOWN',
          type: e.type,
          payload: e.payload,
          txHash: e.txHash || undefined,
        }));
        setEvents(mappedEvents);

        // Map backend vehicle structure to frontend VehicleNFT structure
        const mappedVehicles: VehicleNFT[] = fetchedVehicles.map((v: any) => ({
          tokenId: v.tokenId,
          vin: v.vinNumber,
          makeModelTrim: v.modelJson?.model || 'Unknown',
          spec: v.specJson || { color: 'Unknown', options: [] },
          production: {
            manufacturedAt: new Date(Number(v.manufacturedAt)).toISOString(),
            plantId: v.manufacturerAddress
          },
          manufacturerSignature: v.manufacturerSignature || '',
          currentOwner: v.currentOwnerAddress || 'Unknown',
          ownerCount: v.ownerCount || 0,
          registration: {
            isRegistered: v.registrationStatus === 'REGISTERED',
            taxStatus: v.taxPayments && v.taxPayments.length > 0 ? 'paid' : 'unpaid' as any,
            plateNo: v.plateRecords && v.plateRecords.length > 0
              ? v.plateRecords.sort((a: any, b: any) => Number(b.effectiveAt) - Number(a.effectiveAt))[0].plateNo
              : undefined,
            bookNo: v.registrations && v.registrations.length > 0
              ? v.registrations.sort((a: any, b: any) => Number(b.registeredAt) - Number(a.registeredAt))[0].greenBookNo
              : undefined
          },
          warranty: { terms: { years: 0, mileageKm: 0, coverage: [] } },
          flags: {
            stolen: v.activeFlags?.includes('STOLEN') || false,
            seized: v.activeFlags?.includes('SEIZED') || false,
            majorAccident: v.activeFlags?.includes('MAJOR_ACCIDENT') || false,
            flood: v.activeFlags?.includes('FLOOD') || false,
            totalLoss: v.activeFlags?.includes('TOTAL_LOSS') || false,
            scrapped: v.activeFlags?.includes('SCRAPPED') || false
          },
          lien: { status: v.transferLocked ? 'active' : 'none' as any, transferLocked: v.transferLocked || false },
          insurance: v.insurancePolicies && v.insurancePolicies.length > 0 ? {
            insurer: v.insurancePolicies[0].insurerAddress,
            policyNumber: v.insurancePolicies[0].policyNo,
            coverageType: v.insurancePolicies[0].coverageDetails?.type || 'unknown',
            validUntil: new Date(Number(v.insurancePolicies[0].validTo)).toISOString(),
            status: 'active' as any
          } : undefined
        }));

        // Re-apply events to construct full dynamic state if needed, or rely on mapped initial state
        let state = mappedVehicles;
        // Optimization: In a real app we might only apply events occurring *after* the DB snapshot.
        // For prototype, we recalculate state over the loaded vehicles, but SKIP events the backend already baked into Vehicle props
        const backendHandledEvents = [
          'MANUFACTURER_MINTED',
          'OWNERSHIP_TRANSFERRED',
          'DLT_REGISTRATION_UPDATED',
          'FLAG_UPDATED',
          'LIEN_CREATED',
          'LIEN_RELEASED',
          'REPOSSESSION_RECORDED'
        ];

        mappedEvents.forEach(e => {
          if (!backendHandledEvents.includes(e.type)) {
            state = applyEventToState(state, e);
          }
        });

        setVehicles(state);
      } catch (err: any) {
        console.error("Failed to fetch initial data", err);
      }
    };

    fetchInitialData();
  }, []);

  const addEvent = async (newEventData: Omit<VehicleEvent, 'id' | 'timestamp'>) => {
    let newEvent: VehicleEvent = {
      ...newEventData,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    // Keep optimistic update for speed on most events
    setEvents(prev => [...prev, newEvent]);
    setVehicles(prev => applyEventToState(prev, newEvent));

    try {
      // Sync to backend
      const response = await createEvent(newEvent);
      if (response && response.txHash) {
        showToast(`Smart Contract interaction successful\n\nTxHash: ${response.txHash}`);
      }
      
      // Update real token ID in state if it changed from backend (e.g. minting returns real on-chain ID)
      if (response && response.tokenId && response.tokenId !== newEvent.tokenId) {
          setVehicles(prev => prev.map(v => v.tokenId === newEvent.tokenId ? { ...v, tokenId: response.tokenId } : v));
          setEvents(prev => prev.map(e => (e.id === newEvent.id ? { ...e, tokenId: response.tokenId, txHash: response.txHash || undefined } : e)));
      } else if (response && response.txHash) {
          // Update txHash on the event in local state
          setEvents(prev => prev.map(e => (e.id === newEvent.id ? { ...e, txHash: response.txHash } : e)));
      }

      return response;
    } catch (err: any) {
      console.error("Failed to sync event with backend", err);
      // Reverting optimistic UI for prototype is complex, so we log it
      showToast(`Smart Contract interaction failed: ${err.message}`, 'error');
      throw err;
    }
  };

  return (
    <VehicleContext.Provider value={{ vehicles, events, addEvent, getVehicle: (id) => vehicles.find(v => v.tokenId === id) }}>
      {children}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toastMessage.type === 'success' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
          color: '#ffffff',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          zIndex: 9999,
          maxWidth: '450px',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {toastMessage.message}
        </div>
      )}
    </VehicleContext.Provider>
  );
};
