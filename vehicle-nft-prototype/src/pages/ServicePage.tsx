import { AlertTriangle, Cpu, FileText, Gauge, Save, Search, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';

export const ServicePage = () => {
    const { vehicles, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [vin, setVin] = useState('');
    const [mileage, setMileage] = useState<number>(0);
    const [jobs, setJobs] = useState('');
    
    // Part Registry state
    const [partType, setPartType] = useState('ECU');
    const [newPartNo, setNewPartNo] = useState('');

    // Estimate state
    const [estimateJobs, setEstimateJobs] = useState('');
    const [estimateTotal, setEstimateTotal] = useState<number>(0);

    const garageId = address ? `WORKSHOP:${address}` : "WORKSHOP:KDT-Service-01";
    const targetVehicle = vehicles.find(v => v.vin === vin);

    const handleRecordService = () => {
        if (!targetVehicle) return;
        
        if (mileage < targetVehicle.warranty.terms.mileageKm) {
            alert(`Odometer Rollback Warning! New value ${mileage} < current ${targetVehicle.warranty.terms.mileageKm}. Action Blocked.`);
            return;
        }

        addEvent({
            type: 'MAINTENANCE_RECORDED',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                workshop: garageId,
                date: new Date().toISOString(),
                mileageKm: mileage,
                jobs: jobs.split(',').map(j => j.trim()),
                cost: { total: 1500 }
            }
        });

        // Also record a snapshot
        addEvent({
            type: 'ODOMETER_SNAPSHOT',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: { mileageKm: mileage, date: new Date().toISOString() }
        });

        alert("Validated service record committed to ledger.");
        setJobs('');
        setMileage(0);
    };

    const handleRegisterPart = () => {
        if (!targetVehicle || !newPartNo) return;
        addEvent({
            type: 'CRITICAL_PART_REPLACED',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                date: new Date().toISOString(),
                partType,
                newPartNo,
                oldPartNo: (targetVehicle.spec as any)[partType.toLowerCase()] || "UNKNOWN",
                reason: "Replacement/Upgrade"
            }
        });
        alert(`Critical asset ${partType} updated in specific registry.`);
        setNewPartNo('');
    };

    const handleSubmitEstimate = () => {
        if (!targetVehicle || !estimateJobs || !estimateTotal) return;
        addEvent({
            type: 'WORKSHOP_ESTIMATE_SUBMITTED',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                id: "EST-" + Date.now(),
                workshop: garageId,
                jobs: estimateJobs.split(',').map(j => j.trim()),
                total: Number(estimateTotal)
            }
        });
        alert("Estimate submitted for Insurer approval.");
        setEstimateJobs('');
        setEstimateTotal(0);
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header>
                 <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Service & Maintenance Registry</h1>
                 <p className="text-secondary">Official workshop logs for vehicle lifecycle maintenance and parts certification.</p>
                 <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <span className="badge badge-info">Registered Workshop: {garageId}</span>
                </div>
            </header>

            <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Search color="var(--accent-primary)" size={20} />
                    Check-in Vehicle
                </h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input value={vin} onChange={e => setVin(e.target.value)} placeholder="Scan or Type VIN to identify asset..." style={{ marginBottom: 0 }} />
                </div>
                {targetVehicle && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid var(--accent-primary)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>{targetVehicle.makeModelTrim}</div>
                            <div className="text-secondary" style={{ fontSize: '0.9rem' }}>Current Mileage: {targetVehicle.warranty.terms.mileageKm.toLocaleString()} KM</div>
                        </div>
                        <div className="badge badge-success">Consent Granted</div>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {/* Log Service */}
                    <div className="card">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <Wrench color="var(--accent-primary)" size={20} />
                            Log Final Service Record
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Labor & Parts Details</label>
                                <input value={jobs} onChange={e => setJobs(e.target.value)} placeholder="e.g. Engine Oil (OW-20), Air Filter..." />
                            </div>
                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Odometer Certified (KM)</label>
                                <div style={{ position: 'relative' }}>
                                    <Gauge size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input type="number" value={mileage} onChange={e => setMileage(Number(e.target.value))} style={{ paddingLeft: '3rem' }} />
                                </div>
                            </div>
                            <button className="premium-btn" onClick={handleRecordService} disabled={!targetVehicle}>
                                <Save size={18} /> Commit Service to Chain
                            </button>
                        </div>
                    </div>

                    {/* Part Registry */}
                    <div className="card">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <Cpu color="var(--accent-secondary)" size={20} />
                            Critical Part Certification
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <select value={partType} onChange={e => setPartType(e.target.value)}>
                                <option value="ECU">Electronic Control Unit (ECU)</option>
                                <option value="BATTERY">EV Battery Module</option>
                                <option value="MOTOR">Main Drive Motor</option>
                            </select>
                            <input value={newPartNo} onChange={e => setNewPartNo(e.target.value)} placeholder="Enter New Serial Number (PartID)..." />
                            <button onClick={handleRegisterPart} disabled={!targetVehicle || !newPartNo} style={{ border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)' }}>
                                Certify Component Swap
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {/* Insurance Estimate */}
                    <div className="card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid var(--accent-primary)' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <FileText color="var(--accent-primary)" size={18} />
                            Insurance Claim Appraisal
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                                <AlertTriangle size={24} color="var(--accent-primary)" />
                                <span>Use this form to submit repair estimates for vehicles with active accident claims.</span>
                            </div>
                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Estimated Repair Jobs</label>
                                <textarea value={estimateJobs} onChange={e => setEstimateJobs(e.target.value)} placeholder="e.g. Frame Alignment, Front Bumper, Headlight Assy..." style={{ minHeight: '80px' }} />
                            </div>
                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Total Appraisal Value (THB)</label>
                                <input type="number" value={estimateTotal} onChange={e => setEstimateTotal(Number(e.target.value))} placeholder="0.00" />
                            </div>
                            <button onClick={handleSubmitEstimate} disabled={!targetVehicle || !estimateTotal} className="premium-btn">
                                Submit for Insurer Approval
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
