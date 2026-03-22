import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { createAuthenticatedEvent, getEvents, getVehicles } from '../services/api';
import { blockchainService } from '../services/blockchain';
import { VehicleEvent, VehicleNFT } from '../types/vehicle';

interface VehicleContextType {
  vehicles: VehicleNFT[];
  events: VehicleEvent[];
  isGlobalLoading: boolean;
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
      tokenId: event.tokenId || 'PENDING', // Uses actual ID from event now
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
      case 'FLAG_UPDATED': {
        const flagKey = payload.flag;
        if (!flagKey) return v;
        // Map snake_case flag names to camelCase state keys
        const flagStateKeyMap: Record<string, string> = {
          stolen: 'stolen', seized: 'seized', major_accident: 'majorAccident',
          flood: 'flood', total_loss: 'totalLoss', scrapped: 'scrapped'
        };
        const stateKey = flagStateKeyMap[flagKey] || flagKey;
        const isStolen = flagKey === 'stolen';
        const isSeized = flagKey === 'seized';
        const newFlags = { ...v.flags, [stateKey]: payload.value };
        // Update transferLocked when toggling stolen/seized
        let newTransferLocked = v.lien.transferLocked;
        if (isStolen || isSeized) {
          if (payload.value) {
            newTransferLocked = true;
          } else {
            // Only unlock if no other enforcement flags active
            const otherFlagsActive = (isStolen ? newFlags.seized : newFlags.stolen);
            if (!otherFlagsActive) {
              newTransferLocked = false;
            }
          }
        }
        return {
          ...v,
          flags: newFlags,
          lien: { ...v.lien, transferLocked: newTransferLocked }
        };
      }
      case 'LIEN_CREATED':
        return {
          ...v,
          lien: { status: 'active', transferLocked: true, lender: payload.lender }
        };
      case 'LIEN_RELEASED':
        return {
          ...v,
          lien: { status: 'none', transferLocked: false, lender: undefined }
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
      case 'PURCHASE_OFFER_CREATED':
        return {
          ...v,
          pendingPurchase: {
            seller: payload.seller,
            sellerRole: payload.sellerRole,
            buyer: payload.buyer,
            price: payload.price,
            currency: payload.currency || 'ETH',
            offeredAt: payload.offeredAt || new Date().toISOString()
          }
        };
      case 'PURCHASE_CONSENT_GIVEN':
        if (payload.declined) {
          return { ...v, pendingPurchase: undefined };
        }
        return {
          ...v,
          pendingPurchase: undefined,
          currentOwner: payload.buyer,
          ownerCount: v.ownerCount + 1
        };
      // To be implemented: Other events
      default:
        return v;
    }
  });
};

// Helper: reconstruct pendingPurchase from events (since backend doesn't store it)
const reconstructPendingPurchases = (vehicles: VehicleNFT[], events: VehicleEvent[]): VehicleNFT[] => {
  // Sort events by timestamp to process in order
  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  // Build a map: tokenId → pendingPurchase | undefined
  const pendingMap = new Map<string, VehicleNFT['pendingPurchase']>();
  for (const e of sorted) {
    if (e.type === 'PURCHASE_OFFER_CREATED') {
      pendingMap.set(e.tokenId, {
        seller: e.payload.seller,
        sellerRole: e.payload.sellerRole,
        buyer: e.payload.buyer,
        price: e.payload.price,
        currency: e.payload.currency || 'ETH',
        offeredAt: e.payload.offeredAt || e.timestamp
      });
    } else if (e.type === 'PURCHASE_CONSENT_GIVEN' || e.type === 'OWNERSHIP_TRANSFERRED') {
      pendingMap.set(e.tokenId, undefined); // Clear pending
    }
  }
  return vehicles.map(v => ({
    ...v,
    pendingPurchase: pendingMap.has(v.tokenId) ? pendingMap.get(v.tokenId) : v.pendingPurchase
  }));
};

export const VehicleProvider = ({ children }: { children: ReactNode }) => {
  const [vehicles, setVehicles] = useState<VehicleNFT[]>([]);
  const [events, setEvents] = useState<VehicleEvent[]>([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

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
          evidence: e.evidence || undefined,
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
          'REPOSSESSION_RECORDED',
          'PURCHASE_OFFER_CREATED',
          'PURCHASE_CONSENT_GIVEN'
        ];

        mappedEvents.forEach(e => {
          if (!backendHandledEvents.includes(e.type)) {
            state = applyEventToState(state, e);
          }
        });

        // Reconstruct pendingPurchase from events (backend doesn't store this)
        state = reconstructPendingPurchases(state, mappedEvents);

        setVehicles(state);
      } catch (err: any) {
        console.error("Failed to fetch initial data", err);
      }
    };

    fetchInitialData();
  }, []);

  // Re-fetch all data from backend (called after successful events)
  const fetchAllData = async () => {
    try {
      const [fetchedVehicles, fetchedEvents] = await Promise.all([
        getVehicles(),
        getEvents()
      ]);
      const mappedEvents: VehicleEvent[] = fetchedEvents.map((e: any) => ({
        id: e.eventId,
        tokenId: e.tokenId,
        timestamp: new Date(Number(e.occurredAt)).toISOString(),
        actor: e.actorAddress || 'UNKNOWN',
        type: e.type,
        payload: e.payload,
        evidence: e.evidence || undefined,
        txHash: e.txHash || undefined,
      }));
      setEvents(mappedEvents);

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
      // Reconstruct pendingPurchase from events (backend doesn't store this)
      const finalVehicles = reconstructPendingPurchases(mappedVehicles, mappedEvents);
      setVehicles(finalVehicles);
    } catch (err) {
      console.error('[fetchAllData] Failed to re-fetch:', err);
    }
  };

  const addEvent = async (newEventData: Omit<VehicleEvent, 'id' | 'timestamp'>) => {
    setIsGlobalLoading(true);
    // const originalTokenId = newEventData.tokenId;
    let newEvent: VehicleEvent = {
      ...newEventData,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actorRole: sessionStorage.getItem('auth_role') || undefined
    };

    try {
      // --- Direct Blockchain TX from role wallet ---
      const role = sessionStorage.getItem('auth_role') || 'CONSUMER';
      const roleWallet = blockchainService.getRoleWallet(role);

      if (roleWallet) {
        let txResult;
        switch (newEvent.type) {
          case 'MANUFACTURER_MINTED':
            showToast(`Initiating Minting on Blockchain...`, 'success');
            txResult = await blockchainService.mintVehicle(roleWallet, newEvent.payload);
            // REQUIRE OBTANING REAL TOKEN ID BEFORE PROCEEDING
            if (txResult.tokenId) {
              newEvent.tokenId = txResult.tokenId;
              newEvent.payload.tokenId = txResult.tokenId; // Update payload too
            } else {
              throw new Error("Failed to retrieve Token ID from Blockchain");
            }
            break;
          case 'DLT_REGISTRATION_UPDATED':
            txResult = await blockchainService.registerVehicle(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'OWNERSHIP_TRANSFERRED':
            txResult = await blockchainService.recordTransfer(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'PLATE_EVENT_RECORDED':
            txResult = await blockchainService.recordPlateEvent(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'TAX_STATUS_UPDATED':
            txResult = await blockchainService.recordTaxPayment(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'FLAG_UPDATED':
          case 'REPOSSESSION_RECORDED':
            txResult = await blockchainService.setFlag(roleWallet, newEvent.tokenId, { ...newEvent.payload, event: newEvent.type });
            break;
          case 'LIEN_CREATED':
            txResult = await blockchainService.createLien(roleWallet, newEvent.tokenId);
            break;
          case 'LIEN_RELEASED':
            txResult = await blockchainService.releaseLien(roleWallet, newEvent.tokenId);
            break;
          case 'CONSENT_UPDATED':
            txResult = await blockchainService.grantConsent(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'CONSENT_REVOKED':
            txResult = await blockchainService.revokeConsent(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'READ_CONSENT_GRANTED':
            txResult = await blockchainService.grantReadConsent(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'READ_CONSENT_REVOKED':
            txResult = await blockchainService.revokeReadConsent(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'INSURANCE_POLICY_UPDATED':
            txResult = await blockchainService.recordInsurancePolicy(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'CLAIM_FILED':
            txResult = await blockchainService.fileClaim(roleWallet, newEvent.tokenId, newEvent.payload, newEvent.evidence || []);
            break;
          case 'INSPECTION_RESULT_RECORDED':
            txResult = await blockchainService.recordInspection(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'MAINTENANCE_RECORDED':
            txResult = await blockchainService.logMaintenance(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'CRITICAL_PART_REPLACED':
            txResult = await blockchainService.logPartCertification(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'ESCROW_CREATED':
            txResult = await blockchainService.createEscrow(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'ESCROW_FUNDED':
            txResult = await blockchainService.fundEscrowNative(roleWallet, newEvent.payload);
            break;
          case 'ESCROW_RELEASED':
            txResult = await blockchainService.fulfillCondition(roleWallet, newEvent.payload);
            break;
          case 'ESCROW_CANCELLED':
            txResult = await blockchainService.cancelEscrow(roleWallet, newEvent.payload);
            break;
          case 'WARRANTY_DEFINED':
            txResult = await blockchainService.recordWarranty(roleWallet, newEvent.tokenId, newEvent.payload);
            break;
          case 'PURCHASE_CONSENT_GIVEN':
            // ADMIN = lifecycle recording (has DEFAULT_ADMIN_ROLE)
            // Seller wallet = NFT transferFrom (is the NFT owner)
            if (!newEvent.payload.declined) {
              const relayWallet = blockchainService.getRoleWallet('ADMIN');
              const sellerRole = newEvent.payload.sellerRole || 'DEALER';
              const sellerWallet = blockchainService.getRoleWallet(sellerRole);
              if (relayWallet) {
                txResult = await blockchainService.recordTransfer(relayWallet, newEvent.tokenId, {
                  from: newEvent.payload.seller,
                  to: newEvent.payload.buyer,
                  reason: newEvent.payload.reason || 'resale',
                  price: newEvent.payload.price,
                  paymentTxHash: newEvent.payload.paymentTxHash,
                  deliveryDate: new Date().toISOString()
                }, sellerWallet || undefined);
              }
            }
            break;
        }

        if (txResult && txResult.txHash) {
          newEvent.txHash = txResult.txHash;
          console.log('[DirectTX] ✅ Success! txHash:', txResult.txHash);
        }
      }

      // Update local state optimistically
      setEvents(prev => [...prev, newEvent]);
      setVehicles(prev => applyEventToState(prev, newEvent));

      // Sync to backend
      const response = await createAuthenticatedEvent(newEvent, roleWallet);

      if (response && response.txHash) {
        showToast(`Transaction Confirmed\n\nTxHash: ${response.txHash}`);
        setEvents(prev => prev.map(e => (e.id === newEvent.id ? { ...e, txHash: response.txHash } : e)));
      }

      // If PURCHASE_CONSENT_GIVEN (not declined), also send OWNERSHIP_TRANSFERRED to backend
      if (newEvent.type === 'PURCHASE_CONSENT_GIVEN' && !newEvent.payload.declined) {
        const sellerRole = newEvent.payload.sellerRole || 'DEALER';
        const transferEvent: VehicleEvent = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          actor: newEvent.payload.seller,
          actorRole: sellerRole,
          type: 'OWNERSHIP_TRANSFERRED',
          tokenId: newEvent.tokenId,
          txHash: newEvent.txHash,
          payload: {
            from: newEvent.payload.seller,
            to: newEvent.payload.buyer,
            reason: newEvent.payload.reason || 'resale',
            price: newEvent.payload.price,
            paymentTxHash: newEvent.payload.paymentTxHash,
            deliveryDate: new Date().toISOString()
          }
        };
        setEvents(prev => [...prev, transferEvent]);
        setVehicles(prev => applyEventToState(prev, transferEvent));
        // Use ADMIN wallet for backend auth (system relay)
        const relayWallet = blockchainService.getRoleWallet('ADMIN');
        await createAuthenticatedEvent(transferEvent, relayWallet);
      }

      // Re-fetch all data from backend to ensure consistency
      await fetchAllData();

      return newEvent;
    } catch (err: any) {
      console.error("Failed executing event flow", err);
      showToast(`Interaction failed: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsGlobalLoading(false);
    }
  };

  return (
    <VehicleContext.Provider value={{ vehicles, events, isGlobalLoading, addEvent, getVehicle: (id) => vehicles.find(v => v.tokenId === id) }}>
      {children}

      {/* Loading Overlay */}
      {isGlobalLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '16px',
            padding: '32px 48px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(99,102,241,0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <div style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
              ⏳ Processing Transaction...
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>
              Syncing with Blockchain
            </div>
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
          zIndex: 10001,
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