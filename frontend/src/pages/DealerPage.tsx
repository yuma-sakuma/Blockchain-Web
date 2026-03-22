import { AlertTriangle, ArrowRightLeft, Clock, DollarSign, History, ShieldAlert, Store, UserCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';

export const DealerPage = () => {
    const { vehicles, events, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [tradeInVin, setTradeInVin] = useState('');
    const [showDisclosure, setShowDisclosure] = useState<string | null>(null);
    const [disclosures, setDisclosures] = useState('');

    // Sale Modal State
    const [showSaleModal, setShowSaleModal] = useState<string | null>(null);
    const [salePrice, setSalePrice] = useState('');
    const [buyerAddress, setBuyerAddress] = useState('');

    // Dynamic Dealer ID from Auth
    const dealerId = address || 'UNKNOWN';
    const displayId = address ? `${address.substring(0, 6)}...${address.substring(38)}` : 'Unknown';

    const normalizedAddress = address?.toLowerCase() || '';
    const myStock = vehicles.filter(v => {
        const ownerLower = v.currentOwner.toLowerCase();
        return ownerLower === normalizedAddress;
    });

    const handleOpenSaleModal = (tokenId: string) => {
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

        setShowSaleModal(tokenId);
        setSalePrice('');
        setBuyerAddress(import.meta.env.VITE_CONSUMER_ADDRESS || '');
    };

    const handleSubmitSale = async () => {
        if (!showSaleModal || !salePrice || !buyerAddress) return;

        const price = parseFloat(salePrice);
        if (isNaN(price) || price <= 0) {
            alert('กรุณากรอกราคาที่ถูกต้อง');
            return;
        }

        if (!buyerAddress.startsWith('0x') || buyerAddress.length !== 42) {
            alert('กรุณากรอก Wallet Address ที่ถูกต้อง (0x...)');
            return;
        }

        try {
            await addEvent({
                type: 'PURCHASE_OFFER_CREATED',
                actor: dealerId,
                tokenId: showSaleModal,
                payload: {
                    seller: dealerId,
                    sellerRole: 'DEALER',
                    buyer: buyerAddress,
                    price: price,
                    currency: 'ETH',
                    offeredAt: new Date().toISOString()
                }
            });
            setShowSaleModal(null);
            setSalePrice('');
            setBuyerAddress('');
        } catch (err) {
            console.error('Failed to create purchase offer:', err);
        }
    };

    const handleApplyDisclosure = async () => {
        if (!showDisclosure || !disclosures) return;
        await addEvent({
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
    };

    const handleEvaluateTradeIn = async () => {
        const vehicle = vehicles.find(v => v.vin === tradeInVin);
        if (!vehicle) {
            alert("Vehicle not found!");
            return;
        }

        const priceInput = prompt("กรอกราคาประเมินรถเทิร์น (บาท):", "500000");
        if (!priceInput) return;
        const evaluationPrice = Number(priceInput);
        if (isNaN(evaluationPrice) || evaluationPrice <= 0) {
            alert("ราคาไม่ถูกต้อง");
            return;
        }

        await addEvent({
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
            await addEvent({
                type: 'OWNERSHIP_TRANSFERRED',
                actor: dealerId,
                tokenId: vehicle.tokenId,
                payload: {
                    from: vehicle.currentOwner,
                    to: dealerId,
                    reason: 'trade_in',
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

            {/* Sale Modal Overlay */}
            {showSaleModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '520px', border: '1px solid var(--accent-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-primary)', margin: 0 }}>
                                <DollarSign size={24} />
                                Create Sale Offer
                            </h2>
                            <button onClick={() => setShowSaleModal(null)} style={{ padding: '0.5rem', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <X size={20} color="var(--text-secondary)" />
                            </button>
                        </div>

                        {(() => {
                            const vehicle = vehicles.find(v => v.tokenId === showSaleModal);
                            return vehicle ? (
                                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{vehicle.makeModelTrim}</div>
                                    <div className="text-secondary" style={{ fontSize: '0.85rem' }}>VIN: {vehicle.vin}</div>
                                    <div className="text-secondary" style={{ fontSize: '0.85rem' }}>Token: {vehicle.tokenId}</div>
                                </div>
                            ) : null;
                        })()}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    Buyer Wallet Address
                                </label>
                                <input
                                    value={buyerAddress}
                                    onChange={e => setBuyerAddress(e.target.value)}
                                    placeholder="0x..."
                                    style={{ marginBottom: 0, fontFamily: 'monospace' }}
                                />
                            </div>
                            <div>
                                <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    Sale Price (ETH)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={salePrice}
                                        onChange={e => setSalePrice(e.target.value)}
                                        placeholder="0.00"
                                        style={{ marginBottom: 0, paddingRight: '60px' }}
                                    />
                                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                                        ETH
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                className="premium-btn"
                                onClick={handleSubmitSale}
                                disabled={!salePrice || !buyerAddress}
                                style={{ flex: 1, opacity: (!salePrice || !buyerAddress) ? 0.5 : 1 }}
                            >
                                <UserCheck size={16} /> Send Offer to Buyer
                            </button>
                            <button className="text-secondary" onClick={() => setShowSaleModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>

                        <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '1rem', textAlign: 'center', opacity: 0.7 }}>
                            ⚠️ Vehicle will NOT transfer until the buyer accepts and pays the stated ETH amount.
                        </p>
                    </div>
                </div>
            )}

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
                            const hasPendingOffer = !!v.pendingPurchase;
                            return (
                                <div key={v.tokenId} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                                    <div style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <span className="badge badge-info">{v.tokenId}</span>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {hasAccident && <span className="badge badge-danger">FLAGGED</span>}
                                                {hasPendingOffer && (
                                                    <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                                                        <Clock size={12} style={{ marginRight: '4px' }} />
                                                        PENDING CONSENT
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{v.makeModelTrim}</h3>
                                        <p className="text-secondary" style={{ fontSize: '0.85rem' }}>VIN: {v.vin}</p>

                                        {hasPendingOffer && (
                                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(251, 191, 36, 0.08)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.15)' }}>
                                                <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Offer Sent</div>
                                                <div style={{ fontSize: '0.9rem' }}>
                                                    <strong>{v.pendingPurchase!.price} ETH</strong> → <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{v.pendingPurchase!.buyer.substring(0, 8)}...{v.pendingPurchase!.buyer.substring(38)}</span>
                                                </div>
                                            </div>
                                        )}

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
                                            onClick={() => handleOpenSaleModal(v.tokenId)}
                                            style={{ flex: 1.5, opacity: hasPendingOffer ? 0.5 : 1 }}
                                            disabled={hasPendingOffer}
                                        >
                                            <UserCheck size={16} /> {hasPendingOffer ? 'Awaiting Consent' : 'Process Sale'}
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
