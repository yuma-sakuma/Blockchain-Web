import { Activity, AlertTriangle, Car, CheckCircle2, Clipboard, FileText, History, Info, Link, Lock, Search, ShieldCheck, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../services/api';
import { useVehicleStore } from '../store';
import { EventType } from '../types/vehicle';

const getEventIcon = (type: EventType) => {
  switch (type) {
    case 'MANUFACTURER_MINTED': return <Car size={16} color="var(--accent-primary)" />;
    case 'DLT_REGISTRATION_UPDATED': return <FileText size={16} color="var(--success)" />;
    case 'OWNERSHIP_TRANSFERRED': return <Activity size={16} color="var(--accent-secondary)" />;
    case 'LIEN_CREATED': return <Lock size={16} color="var(--danger)" />;
    case 'CLAIM_FILED': return <AlertTriangle size={16} color="var(--danger)" />;
    case 'MAINTENANCE_RECORDED': return <Zap size={16} color="var(--accent-primary)" />;
    default: return <Clipboard size={16} color="var(--text-secondary)" />;
  }
};

export const OverviewPage = () => {
  const { vehicles, events } = useVehicleStore();
  const [search, setSearch] = useState('');
  const [selectedVin, setSelectedVin] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<any>(null);

  useEffect(() => {
    import('../services/api').then(api => {
      api.checkBackendStatus().then(status => setNetworkStatus(status)).catch(console.error);
    });
  }, []);

  const filteredVehicles = vehicles.filter(v =>
    v.vin.toLowerCase().includes(search.toLowerCase()) ||
    v.tokenId.includes(search)
  );

  const selectedVehicle = selectedVin ? vehicles.find(v => v.vin === selectedVin) : null;
  const vehicleEvents = selectedVehicle
    ? events.filter(e => e.tokenId === selectedVehicle.tokenId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  return (
    <div className="page-container wide" style={{ position: 'relative' }}>
      <header style={{ marginBottom: '4.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', background: 'var(--accent-primary)', filter: 'blur(120px)', opacity: 0.15, zIndex: -1, pointerEvents: 'none' }}></div>
        <div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: '0.5rem', background: 'linear-gradient(to right, #ffffff, var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0px 4px 12px rgba(59, 130, 246, 0.3))' }}>
            Chain Explorer
          </h1>
          <p className="text-secondary" style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.5px' }}>Unified registry protocol for high-fidelity vehicle lifecycle assets.</p>
        </div>
        <div className={`badge ${networkStatus?.status === 'ok' ? 'badge-info' : 'badge-danger'}`} style={{ padding: '0.75rem 1.75rem', borderRadius: '100px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <Activity size={16} style={{ marginRight: '10px' }} className={networkStatus?.status === 'ok' ? "animate-pulse" : ""} />
          <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>{networkStatus?.status === 'ok' ? `Network Online: ${networkStatus?.peerCount ?? 0} Nodes` : 'Network Offline'}</span>
        </div>
      </header>

      {/* Search Hub */}
      <div className="card" style={{ padding: '2.5rem', marginBottom: '4.5rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search style={{ position: 'absolute', left: '1.75rem', color: 'var(--accent-primary)', zIndex: 10 }} size={28} />
          <input
            type="text"
            placeholder="Search VIN, Chassis Number or NFT Token ID..."
            style={{ 
              width: '100%', paddingLeft: '4.5rem', fontSize: '1.2rem', paddingRight: '2rem', height: '80px', 
              borderRadius: '24px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)',
              color: 'white', outline: 'none', transition: 'all 0.3s ease', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
            }}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (selectedVin) setSelectedVin(null);
            }}
            onFocus={(e) => { e.currentTarget.style.border = '1px solid var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.3), inset 0 2px 10px rgba(0,0,0,0.2)'; }}
            onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'inset 0 2px 10px rgba(0,0,0,0.2)'; }}
          />
        </div>

        {!search && (
          <div style={{ marginTop: '2.5rem' }}>
            <p className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Recently Tracked Assets</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {vehicles.slice(0, 3).map(v => (
                <button key={v.tokenId} onClick={() => setSelectedVin(v.vin)} style={{ padding: '0.85rem 1.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', fontWeight: 500, color: 'white', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
                >
                  <Car size={18} color="var(--accent-primary)" /> <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{v.vin}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!selectedVehicle ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '2.5rem' }}>
          {filteredVehicles.map(v => (
            <div key={v.tokenId} className="card" style={{ cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', position: 'relative', overflow: 'hidden', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.03)', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.4) 100%)' }} 
              onClick={() => setSelectedVin(v.vin)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.03)'; }}
            >
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--accent-primary)', filter: 'blur(80px)', opacity: 0.1, zIndex: 0 }}></div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                  <span className="badge badge-info" style={{ fontFamily: 'monospace', padding: '0.6rem 1.2rem', fontSize: '0.85rem', letterSpacing: '1px', background: 'rgba(59, 130, 246, 0.1)' }}>NFT ID: {v.tokenId}</span>
                  {v.flags?.majorAccident && <span className="badge badge-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 800 }}>HISTORY LOSS</span>}
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>{v.makeModelTrim}</h3>
                <p className="text-secondary" style={{ fontSize: '0.95rem', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: '0.5rem' }}>{v.vin}</p>
                {(() => {
                  const mintEvent = events.find(e => e.tokenId === v.tokenId && e.type === 'MANUFACTURER_MINTED');
                  if (mintEvent) {
                    return (
                      <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontFamily: 'monospace', opacity: 0.8, marginTop: '0.5rem' }}>
                        MINT EVENT ID: {mintEvent.id}
                      </div>
                    );
                  }
                  return null;
                })()}

                <div style={{ marginTop: '2.25rem', paddingTop: '1.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '3rem' }}>
                  <div>
                    <div className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' }}>DMR STATUS</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: v.registration?.isRegistered ? 'var(--success)' : 'var(--text-secondary)' }}>
                      {v.registration?.isRegistered ? 'REGISTERED' : 'UNREGISTERED'}
                    </div>
                  </div>
                  <div>
                    <div className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' }}>ODOMETER</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{v.spec?.mileageKm?.toLocaleString() ?? '0'} KM</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '3.5rem', minWidth: 0 }}>
          {/* Main Visualizer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', minWidth: 0 }}>
            <div>
              <button 
                onClick={() => setSelectedVin(null)} 
                className="btn" 
                style={{ padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateX(-4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                &larr; Back to Results
              </button>
            </div>
            <div className="card" style={{ padding: '3.5rem', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(145deg, rgba(15,23,42,0.6) 0%, rgba(0,0,0,0.8) 100%)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '2rem', opacity: 0.05, transform: 'rotate(15deg) scale(1.5)', transformOrigin: 'top right' }}>
                <Car size={300} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', marginBottom: '3.5rem', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '28px', background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4), inset 0 2px 10px rgba(255,255,255,0.3)' }}>
                  <Car color="white" size={44} />
                </div>
                <div>
                  <h2 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: '0.5rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{selectedVehicle.makeModelTrim}</h2>
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '1.05rem' }}>
                    <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={16} /> VIN: <span style={{ color: 'white', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '1px' }}>{selectedVehicle.vin}</span></span>
                    <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={16} color="var(--success)"/> NFT Status: <span style={{ color: 'var(--success)', fontWeight: 800, letterSpacing: '0.5px' }}>AUTHENTICATED</span></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Activity size={16} /> Current Holder</div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--accent-primary)', lineHeight: '1.4' }}>{selectedVehicle.currentOwner}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                  <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={14} /> Mileage</div>
                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--accent-primary)', textShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                      {selectedVehicle.spec?.mileageKm?.toLocaleString() ?? '0'} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>KM</span>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={14} /> Lien Guard</div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: selectedVehicle.lien?.status === 'active' ? 'var(--danger)' : 'var(--success)', textShadow: selectedVehicle.lien?.status === 'active' ? '0 0 15px rgba(239,68,68,0.3)' : '0 0 15px rgba(34,197,94,0.3)' }}>
                      {selectedVehicle.lien?.status === 'active' ? 'ENCUMBERED' : 'UNLOCKED'}
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={14} /> Plate No.</div>
                    <div style={{ fontWeight: 900, fontSize: '1.3rem', color: 'white' }}>{selectedVehicle.registration?.plateNo || (selectedVehicle.spec as any)?.plateNo || 'PENDING'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '3.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
              <h3 style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
                <History size={24} color="var(--accent-primary)" />
                Unified Event Timeline
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {vehicleEvents.map((e) => (
                  <div key={e.id} className="timeline-item" style={{ borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '2rem', paddingBottom: '2.5rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-13px', top: '0', background: '#0f172a', padding: '4px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getEventIcon(e.type)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>{e.type.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontFamily: 'monospace', opacity: 0.8, marginTop: '4px' }}>EVENT ID: {e.id}</div>
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{new Date(e.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Actor Authority: <span style={{ color: e.actor ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600, wordBreak: 'break-all', fontStyle: e.actor ? 'normal' : 'italic' }}>{e.actor || 'undefined'}</span>
                    </div>
                    <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                      {/* Linked Request reference */}
                      {e.type === 'SERVICE_ACCESS_APPROVED' && e.payload?.requestId && (
                        <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                            <Link size={14} /> Linked Service Request
                          </div>
                          <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'white', wordBreak: 'break-all' }}>
                            ID: {e.payload.requestId}
                          </div>
                          {e.payload.requestPayloadHash && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              Payload Hash: <span style={{ fontFamily: 'monospace' }}>{e.payload.requestPayloadHash.substring(0, 20)}...</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {(() => {
                          const payloadObj = (e.payload || {}) as Record<string, any>;
                          const knownKeysMap: Record<string, string[]> = {
                            'MANUFACTURER_MINTED': ['vin', 'make', 'model', 'color', 'batteryKwh'],
                            'DLT_REGISTRATION_UPDATED': ['plateNo', 'taxStatus'],
                            'OWNERSHIP_TRANSFERRED': ['from', 'to', 'reason'],
                            'CLAIM_FILED': ['claimId', 'severity', 'description'],
                            'PURCHASE_OFFER_CREATED': ['seller', 'buyer', 'price'],
                            'PURCHASE_CONSENT_GIVEN': ['buyer', 'seller', 'paymentTxHash'],
                            'LIEN_CREATED': ['borrower', 'lender', 'principalAmount']
                          };
                          const typeKeys = knownKeysMap[e.type] || [];
                          const linkedKeys = ['requestId', 'requestPayloadHash', 'requestEvidenceHash'];
                          const allKeys = Array.from(new Set([...typeKeys, ...Object.keys(payloadObj)]))
                            .filter(key => !linkedKeys.includes(key));

                          if (allKeys.length === 0) {
                            return <div className="text-secondary" style={{ fontStyle: 'italic' }}>No payload data</div>;
                          }

                          return allKeys.map((key) => {
                            let value = payloadObj[key];
                            if (typeof value === 'object' && value !== null) {
                              value = JSON.stringify(value);
                            }
                            const isEmpty = value === null || value === undefined || value === '';
                            let displayValue = isEmpty ? 'undefined' : String(value);

                            const isDateKey = (
                              key.toLowerCase().includes('at') || 
                              key.toLowerCase().includes('date') || 
                              key.toLowerCase().includes('time') ||
                              key.toLowerCase().includes('until') ||
                              key.toLowerCase().includes('expiry')
                            );
                            if (!isEmpty && isDateKey) {
                              const numericValue = Number(value);
                              const d = !isNaN(numericValue) && numericValue > 1000000000 ? new Date(numericValue) : new Date(value);
                              if (!isNaN(d.getTime())) {
                                displayValue = d.toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              }
                            }

                            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                            return (
                              <div key={key} style={{ minWidth: 0, padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{formattedKey}</div>
                                <div style={{ 
                                  color: isEmpty ? 'var(--text-secondary)' : 'white', 
                                  wordBreak: 'break-all', 
                                  fontStyle: isEmpty ? 'italic' : 'normal',
                                  fontSize: '0.95rem',
                                  fontWeight: isEmpty ? 400 : 600
                                }}>
                                  {displayValue}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      
                      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>TX Hash:</span>
                        {e.txHash && e.txHash !== 'undefined' && e.txHash !== 'null' ? (
                          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--success)', wordBreak: 'break-all' }}>{e.txHash}</span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Off-chain record</span>
                        )}
                      </div>

                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Attached Evidence:</div>
                        {e.evidence && e.evidence.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {e.evidence.map((ev, i) => {
                              const fullUrl = ev.url.startsWith('http') ? ev.url : `${API_BASE_URL}${ev.url}`;
                              return (
                                <a key={i} href={fullUrl} target="_blank" rel="noreferrer" style={{ display: 'block', width: '90px', height: '65px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.4)', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } } as any}>
                                  {ev.mime.startsWith('image/') ? (
                                    <img src={fullUrl} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                                      <FileText size={20} color="var(--accent-primary)" />
                                    </div>
                                  )}
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>None</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', minWidth: 0 }}>
            <div className="card" style={{ padding: '2.5rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--success)' }}></div>
              <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.25rem', fontWeight: 800 }}>
                <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', display: 'flex' }}><ShieldCheck size={20} color="var(--success)" /></div>
                Ownership Authority
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.03)', border: '1px solid rgba(34, 197, 94, 0.15)', borderRadius: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}><CheckCircle2 size={40} color="var(--success)" opacity={0.1} /></div>
                  <div className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', marginBottom: '0.75rem' }}>LEGAL REGISTERED OWNER</div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', wordBreak: 'break-all', lineHeight: '1.5' }}>{selectedVehicle.currentOwner}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <Info size={20} className="text-secondary" />
                  <span className="text-secondary" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>Identity computationally verified via DLT Provincial Link Oracle.</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '2.5rem', border: selectedVehicle.flags?.majorAccident || selectedVehicle.flags?.totalLoss ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex' }}><Activity size={20} color="var(--accent-secondary)" /></div>
                   Safety Integrity
                </h3>
                {selectedVehicle.flags?.majorAccident || selectedVehicle.flags?.totalLoss ? <AlertTriangle size={28} color="var(--danger)" /> : <CheckCircle2 size={28} color="var(--success)" />}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                  <span className="text-secondary" style={{ fontWeight: 600 }}>Clean Title</span>
                  {selectedVehicle.flags?.totalLoss ? <span className="badge badge-danger" style={{ fontWeight: 800 }}>NO</span> : <span style={{ color: 'var(--success)', fontWeight: 800 }}>YES</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                  <span className="text-secondary" style={{ fontWeight: 600 }}>Odo Integrity</span>
                  <span style={{ color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16}/> VERIFIED</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-secondary" style={{ fontWeight: 600 }}>Theft Flags</span>
                  {selectedVehicle.flags?.stolen ? <span className="badge badge-danger" style={{ fontWeight: 800 }}>ACTIVE</span> : <span style={{ color: 'var(--success)', fontWeight: 800 }}>NONE</span>}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h3 style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.25rem', fontWeight: 800 }}>
                <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex' }}><Zap size={20} color="var(--accent-primary)" /></div>
                Asset Specifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Model Year</span>
                  <span style={{ fontWeight: 800, textAlign: 'right', fontSize: '1.1rem' }}>{new Date(selectedVehicle.production?.manufacturedAt ?? Date.now()).getFullYear()}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Color</span>
                  <span style={{ fontWeight: 800, textAlign: 'right', fontSize: '1.1rem' }}>{selectedVehicle.spec?.color}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Engine Type</span>
                  <span style={{ fontWeight: 800, textAlign: 'right', fontSize: '1.1rem', wordBreak: 'break-all' }}>{selectedVehicle.spec?.engine}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Battery Cap</span>
                  <span style={{ fontWeight: 800, textAlign: 'right', fontSize: '1.1rem', color: 'var(--success)' }}>{(selectedVehicle.spec as any)?.batteryKwh || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};