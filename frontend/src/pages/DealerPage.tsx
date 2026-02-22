import { AlertTriangle, ArrowRightLeft, History, ShieldAlert, Store, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';

export const DealerPage = () => {
    const { vehicles, events, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [tradeInVin, setTradeInVin] = useState('');
    const [showDisclosure, setShowDisclosure] = useState<string | null>(null);
    const [disclosures, setDisclosures] = useState('');
    
    // Dynamic Dealer ID from Auth
    const dealerId = `DEALER:${address}`;
    const displayId = address ? `${address.substring(0, 6)}...${address.substring(38)}` : 'Unknown';

    // In a real app, we'd query "my pending incoming transfers" too. 
    // For this prototype, we assume Manufacturer transfer set owner directly to us (or we filter by prefix if we want to be loose)
    // But strict check is better:
    const myStock = vehicles.filter(v => v.currentOwner === dealerId || v.currentOwner === `DEALER:${address?.toLowerCase()}` || (v.currentOwner.includes('DEALER') && v.currentOwner.includes(address || '')));

    const handleSellToCustomer = (tokenId: string) => {
        const vehicle = vehicles.find(v => v.tokenId === tokenId);
        if (!vehicle) return;

        const isFlagged = vehicle.flags.majorAccident || vehicle.flags.flood || vehicle.flags.totalLoss;
        if (isFlagged) {
            const hasDisclosure = events.some(e => e.tokenId === tokenId && e.type === 'DISCLOSURE_SIGNED');
            if (!hasDisclosure) {
                alert("LEGAL ERROR: Flagged vehicle found. You must record a formal Disclosure (DISCLOSURE_SIGNED) before sale.");
                setShowDisclosure(tokenId);
                return;
            }
        }

        const defaultConsumer = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
        const customerName = prompt("Buyer Identity (Wallet Address or Name):", defaultConsumer);
        if (!customerName) return;

        const buyerId = customerName.startsWith('0x') ? `CONSUMER:${customerName}` : `PERSON:${customerName}`;

        addEvent({
            type: 'SALE_CONTRACT_CREATED',
            actor: dealerId,
            tokenId: tokenId,
            payload: {
                buyer: buyerId,
                saleType: "new_car",
                price: 850000,
                contractHash: "HASH_CONTRACT_" + Date.now()
            }
        });

        addEvent({
            type: 'OWNERSHIP_TRANSFERRED',
            actor: dealerId,
            tokenId: tokenId,
            payload: {
                from: dealerId,
                to: buyerId,
                reason: 'first_owner_delivery',
                deliveryDate: new Date().toISOString()
            }
        });
    };

    const handleApplyDisclosure = () => {
        if (!showDisclosure || !disclosures) return;
        addEvent({
             type: 'DISCLOSURE_SIGNED',
             actor: dealerId,
             tokenId: showDisclosure,
             payload: {
                 seller: dealerId,
                 disclosed: disclosures.split(',').map(s => s.trim()),
                 acknowledgementHash: "SIG_ACK_" + Date.now()
             }
        });
        setShowDisclosure(null);
        setDisclosures('');
        alert("Disclosure certified and signed by buyer.");
    };

    const handleEvaluateTradeIn = () => {
        const vehicle = vehicles.find(v => v.vin === tradeInVin);
        if (!vehicle) {
            alert("Vehicle not found!");
            return;
        }
        
        // In reality, we'd check if we are allowed to evaluate it (e.g. user presented it)
        
        const evaluationPrice = 500000; // Mock valuation
        
        addEvent({
            type: 'TRADEIN_EVALUATED',
            actor: dealerId,
            tokenId: vehicle.tokenId,
            payload: {
                dealer: dealerId,
                mileageKm: vehicle.warranty.terms.mileageKm + 500, 
                evaluation: { score: 85, priceOffer: evaluationPrice },
                inputsUsed: ["odometer_history", "accident_flags"]
            }
        });
        
        if (confirm(`Market Evaluation: ${evaluationPrice.toLocaleString()} THB. Buyback this asset into inventory?`)) {
             addEvent({
                type: 'OWNERSHIP_TRANSFERRED',
                actor: dealerId,
                tokenId: vehicle.tokenId,
                payload: {
                    from: vehicle.currentOwner,
                    to: dealerId,
                    reason: 'trade_in_buyback',
                    docRef: 'TRADEIN-' + Date.now()
                }
            });
        }
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Inventory Control</h1>
                <p className="text-secondary">Track showroom stock, evaluate trade-ins, and certify sale disclosures.</p>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <span className="badge badge-info">Logged in as {displayId}</span>
                </div>
            </header>

            {/* Disclosure Modal Overlay */}
            {showDisclosure && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '500px', border: '1px solid var(--danger)' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)' }}>
                            <ShieldAlert size={24} />
                            History Disclosure Form
                        </h2>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                            This vehicle has structural damage or flood history. You must document that the buyer accepts these risks.
                        </p>
                        <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Incident Details to Disclose</label>
                        <textarea 
                            value={disclosures} 
                            onChange={e => setDisclosures(e.target.value)} 
                            placeholder="e.g. Minor flood damage 2024, Frame repair (Structural)..." 
                            style={{ minHeight: '120px' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="premium-btn" onClick={handleApplyDisclosure} style={{ flex: 1 }}>Sign & Certify Disclosure</button>
                            <button className="text-secondary" onClick={() => setShowDisclosure(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <History color="var(--accent-primary)" size={20} />
                    Trade-In Valuation
                </h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Customer Vehicle VIN</label>
                        <input 
                            value={tradeInVin}
                            onChange={(e) => setTradeInVin(e.target.value)}
                            placeholder="Search asset for buyback..."
                            style={{ marginBottom: 0 }}
                        />
                    </div>
                    <button onClick={handleEvaluateTradeIn} className="premium-btn" style={{ whiteSpace: 'nowrap' }}>
                        <ArrowRightLeft size={18} /> Run Appraisal
                    </button>
                </div>
            </div>

            <div>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Store color="var(--accent-primary)" size={20} />
                    Current Inventory Stock
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {myStock.length === 0 ? (
                        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5 }}>Warehouse is empty.</div>
                    ) : (
                        myStock.map(v => {
                            const hasAccident = v.flags.majorAccident || v.flags.flood;
                            return (
                                <div key={v.tokenId} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                                    <div style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <span className="badge badge-info">{v.tokenId}</span>
                                            {hasAccident && <span className="badge badge-danger">FLAGGED</span>}
                                        </div>
                                        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{v.makeModelTrim}</h3>
                                        <p className="text-secondary" style={{ fontSize: '0.85rem' }}>VIN: {v.vin}</p>
                                        
                                        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                                <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Color</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{v.spec.color}</div>
                                            </div>
                                            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                                <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Mileage</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{v.warranty.terms.mileageKm} KM</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '1rem' }}>
                                        <button 
                                            className="premium-btn" 
                                            onClick={() => handleSellToCustomer(v.tokenId)}
                                            style={{ flex: 1.5 }}
                                        >
                                            <UserCheck size={16} /> Process Sale
                                        </button>
                                        <button
                                            onClick={() => setShowDisclosure(v.tokenId)}
                                            style={{ flex: 1, background: 'transparent' }}
                                        >
                                            <AlertTriangle size={16} color={hasAccident ? 'var(--danger)' : 'var(--text-secondary)'} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

