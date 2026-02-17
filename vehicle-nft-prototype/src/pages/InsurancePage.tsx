import { AlertCircle, ClipboardCheck, FileText, Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';

export const InsurancePage = () => {
    const { vehicles, events, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [vin, setVin] = useState('');
    const [policyNo, setPolicyNo] = useState('');
    const [coverage, setCoverage] = useState('1st_class');
    
    // Claim state
    const [claimVin, setClaimVin] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('minor');

    const insurerId = address ? `INSURER:${address}` : "INSURER:ABC-Insurance-Thailand";
    const targetVehicle = vehicles.find(v => v.vin === vin);
    const claimVehicle = vehicles.find(v => v.vin === claimVin);

    // Pending Estimates from workshops
    const pendingEstimates = events.filter(e => e.type === 'WORKSHOP_ESTIMATE_SUBMITTED' && !events.some(ae => ae.type === 'INSURER_APPROVED_ESTIMATE' && ae.payload.estimateId === e.payload.id));

    const handleIssuePolicy = () => {
        if (!targetVehicle) {
            alert("Vehicle not found");
            return;
        }

        addEvent({
            type: 'INSURANCE_POLICY_UPDATED',
            actor: insurerId,
            tokenId: targetVehicle.tokenId,
            payload: {
                insurer: insurerId,
                policyNumber: policyNo,
                validFrom: new Date().toISOString(),
                validUntil: new Date(Date.now() + 86400000 * 365).toISOString(),
                coverageType: coverage
            }
        });

        alert("Insurance policy issued!");
        setPolicyNo('');
    };

    const handleFileClaim = () => {
        if (!claimVehicle) {
            alert("Vehicle not found");
            return;
        }

        addEvent({
            type: 'CLAIM_FILED',
            actor: insurerId,
            tokenId: claimVehicle.tokenId,
            payload: {
                claimId: "CLM-" + Date.now(),
                date: new Date().toISOString(),
                description,
                severity,
                evidenceHashes: ["HASH_ACCIDENT_PHOTO_01", "HASH_POLICE_REPORT"]
            }
        });

        alert("Critical Claim certified. Vehicle flags updated.");
        setDescription('');
    };

    const handleApproveEstimate = (estimate: any) => {
        addEvent({
            type: 'INSURER_APPROVED_ESTIMATE',
            actor: insurerId,
            tokenId: estimate.tokenId,
            payload: {
                estimateId: estimate.payload.id,
                amount: estimate.payload.total, // Reducer expects 'amount'
                approvedAmount: estimate.payload.total,
                approvalCode: "APP-" + Math.floor(Math.random()*10000),
                notes: "Standard labor rates applied."
            }
        });
        alert("Repair estimate approved. Workshop notified.");
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Claims & Risk Management</h1>
                <p className="text-secondary">Execute policy underwriting and process high-fidelity accident claims.</p>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <span className="badge badge-info">Certified Insurer: {insurerId}</span>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {/* Underwriting */}
                    <div className="card">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <ShieldCheck color="var(--accent-primary)" size={24} />
                            Policy Underwriting
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Target Asset (VIN)</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input value={vin} onChange={e => setVin(e.target.value)} placeholder="Enter VIN to link policy..." style={{marginBottom:0}} />
                                    <button className="btn" onClick={() => {/* Search trigger implied by state change for now */}}><Search size={18}/></button>
                                </div>
                            </div>
                            
                            {targetVehicle && (
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                                    <div style={{fontWeight: 700}}>{targetVehicle.makeModelTrim}</div>
                                    <div className="text-secondary">Current Owner: {targetVehicle.currentOwner}</div>
                                    {targetVehicle.insurance ? (
                                        <div style={{ marginTop: '0.5rem', color: 'var(--success)' }}>
                                            Active Policy: {targetVehicle.insurance.policyNumber} ({targetVehicle.insurance.coverageType})
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '0.5rem', color: 'var(--warning)' }}>No Active Policy</div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Contract Number</label>
                                <input value={policyNo} onChange={e => setPolicyNo(e.target.value)} placeholder="e.g. POL-VERIFY-2026" />
                            </div>
                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Coverage Tier</label>
                                <select value={coverage} onChange={e => setCoverage(e.target.value)}>
                                    <option value="1st_class">Tier 1: Comprehensive Platinum</option>
                                    <option value="2nd_class">Tier 2: Collision & Fire</option>
                                    <option value="3rd_class">Tier 3: Third Party Liability</option>
                                </select>
                            </div>
                            <button className="premium-btn" onClick={handleIssuePolicy} disabled={!targetVehicle || !policyNo}>
                                Bind Policy to Vehicle NFT
                            </button>
                        </div>
                    </div>

                    {/* Pending Approvals */}
                    <div className="card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid var(--accent-primary)' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <ClipboardCheck color="var(--accent-primary)" size={18} />
                            Workshop Estimates for Review
                        </h2>
                        {pendingEstimates.length === 0 ? <p className="text-secondary">No pending repair estimates.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {pendingEstimates.map((est, idx) => (
                                    <div key={idx} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 700 }}>{est.payload.workshop}</span>
                                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>{est.payload.total.toLocaleString()} THB</span>
                                        </div>
                                        <div className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                                            Items: {est.payload.jobs.join(', ')}
                                        </div>
                                        <button onClick={() => handleApproveEstimate(est)} className="premium-btn" style={{ width: '100%', fontSize: '0.85rem' }}>Approve & Release Funds</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {/* Filing */}
                    <div className="card" style={{ border: '1px solid var(--danger)' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--danger)' }}>
                            <AlertCircle size={24} />
                            Filing Critical Incident
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                             <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Accident Vehicle (VIN)</label>
                                <input value={claimVin} onChange={e => setClaimVin(e.target.value)} placeholder="Type VIN..." />
                            </div>
                            
                            {claimVehicle && (
                                 <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                                    <div style={{fontWeight: 700}}>{claimVehicle.makeModelTrim}</div>
                                    {claimVehicle.activeClaim ? (
                                        <div style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>
                                            ⚠️ Active Claim: {claimVehicle.activeClaim.claimId} ({claimVehicle.activeClaim.status})
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--success)', marginTop: '0.5rem' }}>No Active Claims</div>
                                    )}
                                 </div>
                            )}

                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Detailed Incident Report</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe collision evidence..." style={{ minHeight: '100px' }} />
                            </div>
                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Impact Severity Certification</label>
                                <select value={severity} onChange={e => setSeverity(e.target.value)}>
                                    <option value="minor">Minor: Panel Damage Only</option>
                                    <option value="high">Major: Structural Frame Impact</option>
                                    <option value="total_loss">Catastrophic: Declared Total Loss</option>
                                </select>
                            </div>
                            
                            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--danger)', display: 'flex', gap: '0.75rem' }}>
                                <AlertCircle size={32} />
                                <span>Warning: Filing a Major or Total Loss claim will permanently flag this NFT in the global registry.</span>
                            </div>

                            <button className="premium-btn" onClick={handleFileClaim} disabled={!claimVehicle || !description} style={{ background: 'var(--danger)' }}>
                                Certify Claim & Flag NFT
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <FileText size={18} color="var(--accent-primary)" />
                            Proof of Evidence
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }} className="text-secondary">Photo_Event_Link_01.hash</div>
                            <div style={{ height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }} className="text-secondary">Police_Report.hash</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
