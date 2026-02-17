import { Ban, Calendar, CreditCard, Landmark, Lock, Search, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';

export const FinancePage = () => {
    const { vehicles, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [vin, setVin] = useState('');
    
    const lender = address ? `LENDER:${address}` : 'FIN:KDT-Leasing';
    
    const targetVehicle = vehicles.find(v => v.vin === vin);

    const handleCreateLien = () => {
        if (!targetVehicle) return;
        addEvent({
            type: 'LIEN_CREATED',
            actor: lender,
            tokenId: targetVehicle.tokenId,
            payload: {
                lender,
                contractHash: "L-CTR-" + Date.now(),
                startDate: new Date().toISOString(),
                rules: { transferLocked: true }
            }
        });
        alert("Encumbrance registered. Ownership transfer is now LOCKED.");
    };

    const handleReleaseLien = () => {
        if (!targetVehicle) return;
        addEvent({
            type: 'LIEN_RELEASED',
            actor: lender,
            tokenId: targetVehicle.tokenId,
            payload: {
                releasedAt: new Date().toISOString(),
                receiptHash: "L-PAY-" + Date.now()
            }
        });
        alert("Lien discharged. Asset is now transferable.");
    };

    const handleRepossess = () => {
        if (!targetVehicle) return;
        if (confirm("Executing seizure protocol. Confirming legal default?")) {
            addEvent({
                type: 'REPOSSESSION_RECORDED',
                actor: lender,
                tokenId: targetVehicle.tokenId,
                payload: {
                    date: new Date().toISOString(),
                    legalRefHash: "DLT-NOTICE-" + Date.now()
                }
            });
            alert("Vehicle REPOSSESSED. System flags updated.");
        }
    };

    const handleMilestone = (num: number) => {
        if (!targetVehicle) return;
        addEvent({
            type: 'INSTALLMENT_MILESTONE_RECORDED',
            actor: lender,
            tokenId: targetVehicle.tokenId,
            payload: {
                installmentNo: num,
                amount: 15400,
                date: new Date().toISOString(),
                proofHash: "TXN_" + Math.random().toString(36).substring(7)
            }
        });
        alert(`Installment #${num} acknowledged and certified.`);
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Asset Finance & Lien Registry</h1>
                <p className="text-secondary">Corporate portal for hire-purchase contracts, lien registration, and debt recovery.</p>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <span className="badge badge-info">Logged in as {lender}</span>
                </div>
            </header>

            <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Search color="var(--accent-primary)" size={20} />
                    Contract Lookup
                </h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input value={vin} onChange={e => setVin(e.target.value)} placeholder="Enter VIN to retrieve contract state..." style={{ marginBottom: 0 }} />
                </div>
            </div>

            {targetVehicle ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        <div className="card">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                                <CreditCard color="var(--accent-primary)" size={20} />
                                Installment Scheduler
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(m => (
                                    <button key={m} onClick={() => handleMilestone(m)} style={{ 
                                        padding: '1.5rem 0.5rem', 
                                        borderRadius: '16px', 
                                        background: 'rgba(255,255,255,0.03)', 
                                        border: '1px solid var(--border-subtle)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <span className="text-secondary" style={{ fontSize: '0.7rem' }}>MONTH</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{m}</span>
                                        <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>LOG PAYMENT</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Calendar color="var(--accent-primary)" size={20} />
                                Loan Summary
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Principal Amount</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>850,000 THB</div>
                                </div>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Rate (Fixed)</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>2.45%</div>
                                </div>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Status</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>PERFORMING</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        <div className="card" style={{ border: targetVehicle.lien.status === 'active' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Landmark size={20} color="var(--accent-primary)" />
                                Asset Security Control
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                                    <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Current Lien Hash</div>
                                    <div style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{targetVehicle.lien.contractHash || "NO_ACTIVE_LIEN"}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button className="premium-btn" onClick={handleCreateLien} disabled={targetVehicle.lien.status === 'active'}>
                                        <Lock size={16} /> Lock Asset
                                    </button>
                                    <button onClick={handleReleaseLien} disabled={targetVehicle.lien.status !== 'active'} style={{ border: '1px solid var(--success)', color: 'var(--success)' }}>
                                        <Unlock size={16} /> Discharge
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--danger)' }}>
                                <Ban size={20} />
                                Dispute & Recovery
                            </h3>
                            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                Permanent seizure protocol. This action must be backed by a court order or contractual default.
                            </p>
                            <button onClick={handleRepossess} disabled={targetVehicle.lien.status !== 'active' || targetVehicle.flags.seized} style={{ width: '100%', background: 'var(--danger)' }}>
                                Execute Seizure Notice
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                   <Landmark size={48} style={{ margin: '0 auto 1.5rem auto' }} />
                   <p>Query a VIN to manage hire-purchase contracts.</p>
                </div>
            )}
        </div>
    );
};
