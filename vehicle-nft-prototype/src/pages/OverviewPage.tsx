import { Activity, AlertTriangle, Car, CheckCircle2, Clipboard, FileText, History, Info, Lock, Search, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import { useVehicleStore } from '../store';
import { EventType } from '../types/vehicle';

const getEventIcon = (type: EventType) => {
    switch(type) {
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

  const filteredVehicles = vehicles.filter(v => 
    v.vin.toLowerCase().includes(search.toLowerCase()) || 
    v.tokenId.includes(search)
  );

  const selectedVehicle = (search && filteredVehicles.length > 0) ? filteredVehicles[0] : null;
  const vehicleEvents = selectedVehicle 
    ? events.filter(e => e.tokenId === selectedVehicle.tokenId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
           <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Chain Explorer
          </h1>
          <p className="text-secondary" style={{ fontSize: '1.2rem' }}>Unified registry protocol for high-fidelity vehicle lifecycle assets.</p>
        </div>
        <div className="badge badge-info" style={{ padding: '0.75rem 1.5rem', borderRadius: '100px' }}>
            <Activity size={14} style={{ marginRight: '8px' }} /> Network Online: 3 Nodes
        </div>
      </header>

      {/* Search Hub */}
      <div className="card" style={{ padding: '2rem', marginBottom: '3rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} size={24} />
          <input 
            type="text" 
            placeholder="Search VIN, Chassis Number or NFT ID..." 
            style={{ paddingLeft: '4rem', fontSize: '1.25rem', paddingRight: '1.5rem', height: '70px', borderRadius: '20px', background: 'rgba(0,0,0,0.3)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {!search && (
            <div style={{ marginTop: '2rem' }}>
                <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '1rem' }}>Recently Tracked Assets</p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {vehicles.slice(0, 3).map(v => (
                        <button key={v.tokenId} onClick={() => setSearch(v.vin)} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                            <Car size={16} color="var(--accent-primary)" /> {v.vin}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {!selectedVehicle ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
          {filteredVehicles.map(v => (
            <div key={v.tokenId} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden' }} onClick={() => setSearch(v.vin)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>{v.tokenId}</span>
                {v.flags.majorAccident && <span className="badge badge-danger">HISTORY LOSS</span>}
              </div>
              <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>{v.makeModelTrim}</h3>
              <p className="text-secondary" style={{ fontSize: '0.9rem' }}>VIN: {v.vin}</p>
              
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                    <div>
                        <div className="text-secondary" style={{ fontSize: '0.7rem' }}>REGISTERED</div>
                        <div style={{ fontWeight: 700 }}>{v.registration.isRegistered ? 'YES' : 'NO'}</div>
                    </div>
                    <div>
                        <div className="text-secondary" style={{ fontSize: '0.7rem' }}>ODOMETER</div>
                        <div style={{ fontWeight: 700 }}>{v.warranty.terms.mileageKm.toLocaleString()} KM</div>
                    </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem' }}>
          {/* Main Visualizer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div className="card" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '2rem', opacity: 0.1 }}>
                  <Car size={180} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)' }}>
                  <Car color="white" size={40} />
                </div>
                <div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>{selectedVehicle.makeModelTrim}</h2>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '1rem' }}>
                    <span className="text-secondary">Chassis: <span style={{ color: 'white', fontWeight: 600 }}>{selectedVehicle.vin}</span></span>
                    <span className="text-secondary">NFT Status: <span style={{ color: 'var(--success)', fontWeight: 600 }}>AUTHENTICATED</span></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Holder</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedVehicle.currentOwner}</div>
                </div>
                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Mileage</div>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                    <Zap size={16} /> {selectedVehicle.warranty.terms.mileageKm.toLocaleString()} KM
                  </div>
                </div>
                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Lien Guard</div>
                  <div style={{ fontWeight: 700, color: selectedVehicle.lien.status === 'active' ? 'var(--danger)' : 'var(--success)' }}>
                    {selectedVehicle.lien.status === 'active' ? 'ENCUMBERED' : 'UNLOCKED'}
                  </div>
                </div>
                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Plate No.</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedVehicle.registration.plateNo || 'PENDING'}</div>
                </div>
              </div>
            </div>

            <div className="card">
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
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>{e.type.replace(/_/g, ' ')}</div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{new Date(e.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Actor Authority: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{e.actor}</span>
                    </div>
                    <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          {Object.entries(e.payload as object).map(([key, value]) => (
                               typeof value !== 'object' && (
                                  <div key={key}>
                                      <span className="text-secondary" style={{ textTransform: 'capitalize' }}>{key}: </span>
                                      <span style={{ color: 'white' }}>{String(value)}</span>
                                  </div>
                               )
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 <ShieldCheck size={20} color="var(--success)" />
                 Ownership Authority
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ padding: '1.25rem', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '16px' }}>
                    <div className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>LEGAL REGISTERED OWNER</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedVehicle.currentOwner}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <Info size={16} className="text-secondary" />
                    <span className="text-secondary">Identity verified via DLT Provincial Link.</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ border: selectedVehicle.flags.majorAccident ? '1px solid var(--danger)' : '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ margin: 0 }}>Safety Integrity</h3>
                 {selectedVehicle.flags.majorAccident ? <AlertTriangle size={24} color="var(--danger)" /> : <CheckCircle2 size={24} color="var(--success)" />}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Clean Title</span>
                    {selectedVehicle.flags.totalLoss ? <span color="var(--danger)">No</span> : <span style={{ color: 'var(--success)' }}>Yes</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Odo Integrity</span>
                    <span style={{ color: 'var(--success)' }}>Verified</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Theft Flags</span>
                    {selectedVehicle.flags.stolen ? <span color="var(--danger)">ACTIVE</span> : <span style={{ color: 'var(--success)' }}>None</span>}
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent)' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Zap size={20} color="var(--accent-primary)" />
                    Asset Specifications
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-secondary">Model Year</span>
                        <span>{new Date(selectedVehicle.production.manufacturedAt).getFullYear()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-secondary">Color</span>
                        <span>{selectedVehicle.spec.color}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-secondary">Engine Serial</span>
                        <span style={{ fontFamily: 'monospace' }}>{selectedVehicle.spec.engineSerial}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-secondary">Battery Cap</span>
                        <span>{(selectedVehicle.spec as any).batteryCapacity || 'N/A'}</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
