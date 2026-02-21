import { ArrowRightLeft, CreditCard, FileText, History, Lock, ShieldCheck, User, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';

export const ConsumerPage = () => {
  const { vehicles, events, addEvent } = useVehicleStore();
  const { address } = useAuth();
  const [showGreenBook, setShowGreenBook] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  
  // Dynamic User ID
  const currentUser = address ? `CONSUMER:${address}` : 'UNKNOWN';
  const displayUser = address ? `${address.substring(0, 6)}...` : 'Guest';

  // Address format normalization for robust matching
  const normalizedAddress = address?.toLowerCase() || '';
  
  const myVehicles = vehicles.filter(v => {
      const ownerLower = v.currentOwner.toLowerCase();
      // Match if the owner exactly matches our address, is the CONSUMER: prefixed version, or is the PERSON: prefixed version.
      return ownerLower === normalizedAddress || 
             ownerLower === `consumer:${normalizedAddress}` || 
             ownerLower === `person:${normalizedAddress}`;
  });

  const handleGrantConsent = (tokenId: string, granteeOverride?: string) => {
    const grantee = granteeOverride || prompt("Target Entity ID (e.g. DEALER:0x... or INSURER:0x...):");
    if (!grantee) return;

    addEvent({
      type: 'CONSENT_UPDATED',
      actor: currentUser,
      tokenId: tokenId,
      payload: {
        owner: currentUser,
        grantTo: grantee,
        permissions: {
          showPersonalData: false,
          showFullMaintenance: true,
          showClaims: true
        },
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() // 30 days
      }
    });
    // alert(`Privacy permissions updated for ${grantee}`);
  };

  const handleRevokeConsent = (tokenId: string, grantee: string) => {
      if (!confirm(`Revoke access for ${grantee}?`)) return;
      addEvent({
          type: 'CONSENT_REVOKED', // Custom event type for prototype (or reuse UPDATED with empty perms/expired)
          actor: currentUser,
          tokenId: tokenId,
          payload: {
              owner: currentUser,
              revokeFrom: grantee,
              revokedAt: new Date().toISOString()
          }
      });
  };

  const handleTransferVehicle = (tokenId: string) => {
      const buyerId = prompt("Recipient Wallet Address:", "0x...");
      if (!buyerId) return;

      const vehicle = vehicles.find(v => v.tokenId === tokenId);
      if (vehicle?.lien.transferLocked) {
          alert("SECURITY BLOCK: This asset is LOCKED by an active finance lien.");
          return;
      }

      const price = prompt("Agreed Sale Price (THB):", "450000");
      if (!price) return;

      const fullBuyerId = buyerId.startsWith('0x') ? `CONSUMER:${buyerId}` : buyerId;

      // Simulate Payment
      addEvent({
          type: 'PAYMENT_PROOF_SUBMITTED',
          actor: currentUser,
          tokenId: tokenId,
          payload: {
              payer: fullBuyerId,
              payee: currentUser,
              amount: Number(price),
              method: 'verified_bank_transfer',
              proofHash: 'TXN_' + Math.floor(Math.random() * 1000000)
          }
      });

      addEvent({
          type: 'OWNERSHIP_TRANSFERRED',
          actor: currentUser,
          tokenId: tokenId,
          payload: {
              from: currentUser,
              to: fullBuyerId,
              reason: 'private_p2p_sale',
              price: Number(price),
              date: new Date().toISOString()
          }
      });
      alert("Asset transfer protocol complete.");
  };

  const selectedVehicle = vehicles.find(v => v.tokenId === (showGreenBook || showPrivacy));

  // Derive active consents
  const activeConsents = selectedVehicle ? events.filter(e => 
      e.type === 'CONSENT_UPDATED' && 
      e.tokenId === selectedVehicle.tokenId && 
      e.payload.owner.includes(address || 'x') &&
      new Date(e.payload.expiresAt) > new Date()
  ) : [];

  // Filter out revoked ones (rudimentary check)
  const revokedEvents = selectedVehicle ? events.filter(e => e.type === 'CONSENT_REVOKED' && e.tokenId === selectedVehicle.tokenId) : [];
  const validConsents = activeConsents.filter(ac => !revokedEvents.some(re => re.payload.revokeFrom === ac.payload.grantTo && new Date(re.timestamp) > new Date(ac.timestamp)));


  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Asset Wallet</h1>
           <p className="text-secondary">Manage your verified vehicle NFTs and privacy protocols.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <User size={20} color="var(--accent-primary)" />
            <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{displayUser}</span>
        </div>
      </header>

      {/* Digital Green Book Modal */}
      {showGreenBook && selectedVehicle && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="card" style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', background: '#0a0a0b', border: '2px solid var(--success)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ShieldCheck size={32} color="var(--success)" />
                        <h2 style={{ margin: 0 }}>OFFICIAL DIGITAL REGISTRY</h2>
                      </div>
                      <button onClick={() => setShowGreenBook(null)} style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
                      <div>
                          <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Vehicle Identity</label>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{selectedVehicle.makeModelTrim}</div>
                          <div className="text-secondary" style={{ fontSize: '0.9rem' }}>VIN: {selectedVehicle.vin}</div>
                          <div className="text-secondary" style={{ fontSize: '0.9rem' }}>Token: {selectedVehicle.tokenId}</div>
                      </div>
                      <div>
                          <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Registration Details</label>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{selectedVehicle.registration?.plateNo || 'PENDING'}</div>
                          <div className="text-secondary" style={{ fontSize: '0.9rem' }}>Book No: {selectedVehicle.registration?.bookNo || 'N/A'}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <span className="badge badge-success">TAX VALID</span>
                              <span className="badge badge-info">INSURED</span>
                          </div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                          <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Verified Ownership History</label>
                          {events.filter(e => e.tokenId === selectedVehicle.tokenId && e.type === 'OWNERSHIP_TRANSFERRED').map((e, idx) => (
                              <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                  {new Date(e.timestamp).toLocaleDateString()} — Transfer to <span style={{ color: 'var(--accent-primary)' }}>{e.payload.to}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Privacy Management Modal */}
      {showPrivacy && selectedVehicle && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="card" style={{ width: '600px', background: '#0a0a0b', border: '1px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ShieldCheck size={28} color="var(--accent-primary)" />
                        <h2 style={{ margin: 0 }}>Data Privacy Control</h2>
                      </div>
                      <button onClick={() => setShowPrivacy(null)} style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
                  </div>
                  
                  <div style={{ marginBottom: '2rem' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedVehicle.makeModelTrim}</div>
                      <div className="text-secondary">VIN: {selectedVehicle.vin}</div>
                  </div>

                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Active Access Grants</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                      {validConsents.length === 0 ? (
                           <div className="text-secondary" style={{ fontStyle: 'italic' }}>No active 3rd party access grants.</div>
                      ) : (
                          validConsents.map((c, idx) => (
                              <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                      <div style={{ fontWeight: 600 }}>{c.payload.grantTo}</div>
                                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Expires: {new Date(c.payload.expiresAt).toLocaleDateString()}</div>
                                  </div>
                                  <button onClick={() => handleRevokeConsent(selectedVehicle.tokenId, c.payload.grantTo)} style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>REVOKE</button>
                              </div>
                          ))
                      )}
                  </div>

                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Grant New Access</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <button onClick={() => handleGrantConsent(selectedVehicle.tokenId, 'INSURER:Generic')} className="btn" style={{ fontSize: '0.9rem' }}>+ Share w/ Insurance</button>
                      <button onClick={() => handleGrantConsent(selectedVehicle.tokenId, 'LENDER:Generic')} className="btn" style={{ fontSize: '0.9rem' }}>+ Share w/ Finance</button>
                      <button onClick={() => handleGrantConsent(selectedVehicle.tokenId, 'SERVICE:Generic')} className="btn" style={{ fontSize: '0.9rem' }}>+ Share w/ Service</button>
                      <button onClick={() => handleGrantConsent(selectedVehicle.tokenId)} className="btn" style={{ fontSize: '0.9rem' }}>+ Custom Entity...</button>
                  </div>
              </div>
          </div>
      )}

      {/* History Timeline Modal */}
      {showHistory && selectedVehicle && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="card" style={{ width: '600px', maxHeight: '80vh', overflowY: 'auto', background: '#0a0a0b', border: '1px solid var(--accent-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <History size={28} color="var(--accent-secondary)" />
                        <h2 style={{ margin: 0 }}>Asset Lifecycle History</h2>
                      </div>
                      <button onClick={() => setShowHistory(null)} style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
                  </div>
                  
                  <div style={{ marginBottom: '2rem' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedVehicle.makeModelTrim}</div>
                      <div className="text-secondary">VIN: {selectedVehicle.vin}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {events.filter(e => e.tokenId === selectedVehicle.tokenId).map((e, idx) => (
                          <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid var(--accent-secondary)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{String(e.type).replace(/_/g, ' ')}</span>
                                  <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{new Date(e.timestamp).toLocaleDateString()}</span>
                              </div>
                              <div className="text-secondary" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                  Actor: {e.actor}
                              </div>
                          </div>
                      ))}
                      {events.filter(e => e.tokenId === selectedVehicle.tokenId).length === 0 && (
                          <p className="text-secondary" style={{ fontStyle: 'italic' }}>No history records found for this asset.</p>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div>
         <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CreditCard size={24} color="var(--accent-primary)" />
            Verified Assets
         </h2>

         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
            {myVehicles.length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5 }}>You do not currently hold any vehicle NFTs associated with {displayUser}.</div>
            ) : (
                myVehicles.map(v => (
                    <div key={v.tokenId} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>{v.makeModelTrim}</h3>
                                {v.lien.status === 'active' && <Lock size={20} color="var(--danger)" />}
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>VIN Number</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{v.vin}</div>
                                </div>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Odometer</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{(v.warranty?.terms?.mileageKm || 0).toLocaleString()} KM</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-subtle)' }}>
                            <button onClick={() => setShowGreenBook(v.tokenId)} style={{ border: 'none', background: 'transparent', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                <FileText size={18} color="var(--success)" /> BOOK
                            </button>
                            <button onClick={() => setShowPrivacy(v.tokenId)} style={{ border: 'none', borderLeft: '1px solid var(--border-subtle)', background: 'transparent', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                <ShieldCheck size={18} color="var(--accent-primary)" /> PRIVACY
                            </button>
                            <button onClick={() => setShowHistory(v.tokenId)} style={{ border: 'none', borderLeft: '1px solid var(--border-subtle)', background: 'transparent', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                <History size={18} color="var(--accent-secondary)" /> HISTORY
                            </button>
                            <button onClick={() => handleTransferVehicle(v.tokenId)} style={{ border: 'none', borderLeft: '1px solid var(--border-subtle)', background: 'rgba(59, 130, 246, 0.1)', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                <ArrowRightLeft size={18} color="var(--accent-primary)" /> TRANSFER
                            </button>
                        </div>
                    </div>
                ))
            )}
         </div>
      </div>
    </div>
  );
};

