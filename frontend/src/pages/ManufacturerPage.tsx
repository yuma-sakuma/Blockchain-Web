import { ArrowRightLeft, PackagePlus, ShieldCheck, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';

export const ManufacturerPage = () => {
  const { addEvent, vehicles } = useVehicleStore();
  const { address } = useAuth();
  const [isSigning, setIsSigning] = useState(false);
  const [formData, setFormData] = useState({
    vin: '',
    model: '',
    color: '',
    engineNo: '',
    batteryKwh: '60',
    options: '',
    warrantyYears: '3',
    warrantyMileage: '100000'
  });

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vin || !formData.model) return;

    setIsSigning(true);
    // Simulate digital signing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const tokenId = Math.floor(Math.random() * 1000000000).toString();
    const signature = 'sig_' + Math.random().toString(36).substring(7).toUpperCase();
    const actorId = `MANUFACTURER:${address?.substring(0, 6)}...`;

    // 1. Mint Event
    addEvent({
      type: 'MANUFACTURER_MINTED',
      actor: actorId, 
      tokenId: tokenId,
      payload: {
        tokenId: tokenId,
        vin: formData.vin,
        makeModelTrim: formData.model,
        spec: { 
          color: formData.color, 
          engine: formData.engineNo,
          batteryKwh: Number(formData.batteryKwh),
          options: formData.options.split(',').map(o => o.trim()).filter(o => o)
        },
        production: { 
          manufacturedAt: new Date().toISOString(), 
          plantId: address || 'UNKNOWN_PLANT'
        },
        manufacturerSignature: signature
      }
    });

    // 2. Warranty Definition
    addEvent({
        type: 'WARRANTY_DEFINED',
        actor: actorId,
        tokenId: tokenId,
        payload: {
             startPolicy: "at_first_registration", 
             terms: { 
                 years: Number(formData.warrantyYears), 
                 mileageKm: Number(formData.warrantyMileage), 
                 coverage: ["powertrain", "battery", "chassis"] 
            }
        }
    });

    setIsSigning(false);
    setFormData({ vin: '', model: '', color: '', engineNo: '', batteryKwh: '60', options: '', warrantyYears: '3', warrantyMileage: '100000' });
  };

  const handleTransferToDealer = (tokenId: string) => {
    // Default to the standard mock Dealer address for convenience
    const defaultDealer = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const dest = prompt("Enter Dealer Wallet Address:", defaultDealer);
    if (!dest) return;

    const targetDealerId = `DEALER:${dest}`;

    addEvent({
      type: 'OWNERSHIP_TRANSFERRED',
      actor: `MANUFACTURER:${address?.substring(0, 6)}...`,
      tokenId: tokenId,
      payload: {
        from: `MANUFACTURER:${address}`,
        to: targetDealerId,
        reason: 'inventory_transfer',
        docRef: 'INV-' + Math.floor(Math.random() * 10000)
      }
    });
  };

  const myStock = vehicles.filter(v => v.currentOwner.startsWith('MANUFACTURER')); // Simple check, could look for specific address match if we tracked exact owner string format consistently

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Production Dashboard</h1>
        <p className="text-secondary">Mint high-fidelity vehicle NFTs and certify production specifications.</p>
      </header>

      <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        {isSigning && (
          <div style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.8)', zIndex: 10, backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem'
          }}>
            <ShieldCheck size={48} color="var(--accent-primary)" style={{ animation: 'pulse 1s infinite' }} />
            <h3 style={{ margin: 0 }}>Certifying Digital Signature...</h3>
            <div className="text-secondary" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>RSA-4096 / SHA-256</div>
          </div>
        )}

        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <PackagePlus color="var(--accent-primary)" />
          New Unit Genesis
        </h2>

        <form onSubmit={handleMint} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
             <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Vehicle Model & Trim</label>
             <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="e.g. KDT E-Car 1.8 Premium" required />
          </div>
          
          <div>
            <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>VIN Identification</label>
            <input value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} placeholder="17-Digit VIN Number" required />
          </div>

          <div>
            <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Exterior Color</label>
            <input value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="e.g. Midnight Blue Metallic" required />
          </div>

          <div>
             <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Engine/Motor Serial</label>
             <input value={formData.engineNo} onChange={e => setFormData({...formData, engineNo: e.target.value})} placeholder="SN-XXXXX" />
          </div>

          <div>
             <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Battery Capacity (KWh)</label>
             <input type="number" value={formData.batteryKwh} onChange={e => setFormData({...formData, batteryKwh: e.target.value})} placeholder="60" />
          </div>
          
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1', fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>Warranty Configuration</div>
              <div>
                 <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Warranty Period (Years)</label>
                 <input type="number" value={formData.warrantyYears} onChange={e => setFormData({...formData, warrantyYears: e.target.value})} placeholder="3" />
              </div>
              <div>
                 <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Max Mileage (Km)</label>
                 <input type="number" value={formData.warrantyMileage} onChange={e => setFormData({...formData, warrantyMileage: e.target.value})} placeholder="100000" />
              </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
             <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Installed Options (Comma separated)</label>
             <textarea value={formData.options} onChange={e => setFormData({...formData, options: e.target.value})} placeholder="Sunroof, Leather Seats, Autopilot v2..." style={{ height: '80px' }} />
          </div>

          <button type="submit" className="premium-btn" style={{ gridColumn: '1 / -1', padding: '1.25rem' }} disabled={isSigning}>
            Generate Certified Vehicle NFT
          </button>
        </form>
      </div>

      <div>
         <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           <Zap color="var(--warning)" size={20} />
           Factory Inventory Pool
         </h2>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {myStock.length === 0 ? (
               <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5 }}>No inventory in pool.</div>
            ) : myStock.map(v => (
                <div key={v.tokenId} className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>{v.makeModelTrim}</h3>
                        <div className="text-secondary" style={{ fontSize: '0.85rem' }}>VIN: {v.vin}</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                       <span className="badge badge-info">{v.spec.batteryKwh}kWh</span>
                       <span className="badge badge-info">{v.spec.color}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                            <ShieldCheck size={16} /> CERTIFIED
                        </div>
                        <button onClick={() => handleTransferToDealer(v.tokenId)} style={{ fontSize: '0.85rem' }}>
                          <ArrowRightLeft size={16} /> Send to Dealer
                        </button>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

