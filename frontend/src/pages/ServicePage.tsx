import { AlertTriangle, Cpu, FileText, Gauge, Save, Search, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';
import { uploadFile } from '../services/api';

const API_BASE = 'http://localhost:3000';

export const ServicePage = () => {
    const { vehicles, events, addEvent } = useVehicleStore();
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

    // Upload states
    const [maintFile, setMaintFile] = useState<any>(null);
    const [partFile, setPartFile] = useState<any>(null);
    const [estimateFile, setEstimateFile] = useState<any>(null);
    const [isUploading, setIsUploading] = useState<string | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const garageId = address || 'UNKNOWN';
    const targetVehicle = vehicles.find(v => v.vin === vin);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(type);
        try {
            const result = await uploadFile(file);
            if (type === 'maint') setMaintFile(result);
            if (type === 'part') setPartFile(result);
            if (type === 'estimate') setEstimateFile(result);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Upload failed");
        } finally {
            setIsUploading(null);
        }
    };

    const handleRecordService = async () => {
        if (!targetVehicle) return;

        if (mileage < targetVehicle.warranty.terms.mileageKm) {
            alert(`Odometer Rollback Warning! New value ${mileage} < current ${targetVehicle.warranty.terms.mileageKm}. Action Blocked.`);
            return;
        }

        await addEvent({
            type: 'MAINTENANCE_RECORDED',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                workshop: garageId,
                date: new Date().toISOString(),
                mileageKm: mileage,
                jobs: jobs.split(',').map(j => j.trim()),
                cost: { total: 1500 },
                evidenceHash: maintFile?.hash || undefined
            },
            evidence: maintFile ? [{
                hash: maintFile.hash,
                url: maintFile.path,
                mime: maintFile.mime,
                size: maintFile.size
            }] : undefined
        });

        await addEvent({
            type: 'ODOMETER_SNAPSHOT',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                mileageKm: mileage,
                date: new Date().toISOString(),
                evidenceHash: maintFile?.hash
            },
            evidence: maintFile ? [{
                hash: maintFile.hash,
                url: maintFile.path,
                mime: maintFile.mime,
                size: maintFile.size
            }] : undefined
        });

        setJobs('');
        setMileage(0);
        setMaintFile(null);
    };

    // Helper: render uploaded file preview
    const renderFilePreview = (file: any) => {
        if (!file) return null;
        return (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                {file.mime?.startsWith('image/') ? (
                    <img src={`${API_BASE}${file.path}`} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => setLightboxUrl(`${API_BASE}${file.path}`)} />
                ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                        <FileText size={24} color="var(--accent-primary)" />
                    </div>
                )}
            </div>
        );
    };

    const handleRegisterPart = async () => {
        if (!targetVehicle || !newPartNo) return;
        await addEvent({
            type: 'CRITICAL_PART_REPLACED',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                date: new Date().toISOString(),
                partType,
                newPartNo,
                oldPartNo: (targetVehicle.spec as any)[partType.toLowerCase()] || "UNKNOWN",
                reason: "Replacement/Upgrade",
                evidenceHash: partFile?.hash || undefined
            },
            evidence: partFile ? [{
                hash: partFile.hash,
                url: partFile.path,
                mime: partFile.mime,
                size: partFile.size
            }] : undefined
        });
        setNewPartNo('');
        setPartFile(null);
    };

    const handleSubmitEstimate = async () => {
        if (!targetVehicle || !estimateJobs || !estimateTotal) return;
        await addEvent({
            type: 'WORKSHOP_ESTIMATE_SUBMITTED',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                id: "EST-" + Date.now(),
                workshop: garageId,
                jobs: estimateJobs.split(',').map(j => j.trim()),
                total: Number(estimateTotal),
                evidenceHash: estimateFile?.hash || undefined
            },
            evidence: estimateFile ? [{
                hash: estimateFile.hash,
                url: estimateFile.path,
                mime: estimateFile.mime,
                size: estimateFile.size
            }] : undefined
        });
        setEstimateJobs('');
        setEstimateTotal(0);
        setEstimateFile(null);
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
                        <div className={`badge ${events.some(e => e.tokenId === targetVehicle.tokenId && e.type === 'CONSENT_UPDATED' && !events.some(r => r.tokenId === targetVehicle.tokenId && r.type === 'CONSENT_REVOKED' && r.payload?.revokeFrom === e.payload?.grantTo)) ? 'badge-success' : 'badge-danger'}`}>{events.some(e => e.tokenId === targetVehicle.tokenId && e.type === 'CONSENT_UPDATED' && !events.some(r => r.tokenId === targetVehicle.tokenId && r.type === 'CONSENT_REVOKED' && r.payload?.revokeFrom === e.payload?.grantTo)) ? 'Consent Granted' : 'No Consent'}</div>
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
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button className="btn" onClick={() => document.getElementById('maint-upload')?.click()} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                                    {isUploading === 'maint' ? 'Uploading...' : maintFile ? '✓ Photo Ready' : '+ Upload Receipt/Odometer'}
                                </button>
                                <input id="maint-upload" type="file" hidden onChange={(e) => handleFileUpload(e, 'maint')} />
                                <button className="premium-btn" onClick={handleRecordService} disabled={!targetVehicle} style={{ flex: 1 }}>
                                    <Save size={18} /> Commit Service to Chain
                                </button>
                            </div>
                            {renderFilePreview(maintFile)}
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
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button className="btn" onClick={() => document.getElementById('part-upload')?.click()} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                                    {isUploading === 'part' ? 'Uploading...' : partFile ? '✓ Part SN Photo' : '+ Photo'}
                                </button>
                                <input id="part-upload" type="file" hidden onChange={(e) => handleFileUpload(e, 'part')} />
                                <button onClick={handleRegisterPart} disabled={!targetVehicle || !newPartNo} style={{ border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)', flex: 1 }}>
                                    Certify Component Swap
                                </button>
                            </div>
                            {renderFilePreview(partFile)}
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
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button className="btn" onClick={() => document.getElementById('estimate-upload')?.click()} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                                    {isUploading === 'estimate' ? 'Uploading...' : estimateFile ? '✓ Estimate Proof' : '+ Upload Damage Photo'}
                                </button>
                                <input id="estimate-upload" type="file" hidden onChange={(e) => handleFileUpload(e, 'estimate')} />
                                <button onClick={handleSubmitEstimate} disabled={!targetVehicle || !estimateTotal} className="premium-btn" style={{ flex: 1 }}>
                                    Submit for Insurer Approval
                                </button>
                            </div>
                            {renderFilePreview(estimateFile)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Blockchain Transaction Log */}
            {targetVehicle && (() => {
                const vehicleEvents = events.filter(e => e.tokenId === targetVehicle.tokenId && e.txHash && ['MAINTENANCE_RECORDED', 'INSPECTION_RESULT_RECORDED', 'CRITICAL_PART_REPLACED', 'WORKSHOP_ESTIMATE_SUBMITTED', 'ODOMETER_SNAPSHOT'].includes(e.type));
                return vehicleEvents.length > 0 ? (
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            🔗 Service Blockchain Transactions
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {vehicleEvents.slice(-8).map((ev, i) => (
                                <div key={i} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span className="badge badge-info" style={{ marginRight: '0.75rem', fontSize: '0.65rem' }}>{ev.type}</span>
                                            <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{new Date(ev.timestamp).toLocaleString()}</span>
                                        </div>
                                        {ev.txHash && (
                                            <code style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer' }} title={ev.txHash}>
                                                {ev.txHash.slice(0, 10)}...{ev.txHash.slice(-8)}
                                            </code>
                                        )}
                                    </div>
                                    {/* Evidence Gallery */}
                                    {ev.evidence && ev.evidence.length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                            {ev.evidence.map((file: any, idx: number) => (
                                                <div key={idx} onClick={() => {
                                                    const url = file.url?.startsWith('http') ? file.url : `${API_BASE}${file.url}`;
                                                    if (file.mime?.startsWith('image/')) setLightboxUrl(url);
                                                    else window.open(url, '_blank');
                                                }} style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {file.mime?.startsWith('image/') ? (
                                                        <img src={file.url?.startsWith('http') ? file.url : `${API_BASE}${file.url}`} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <FileText size={24} color="var(--accent-primary)" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            })()}

            {/* Lightbox Modal */}
            {lightboxUrl && (
                <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: '2rem' }}>
                    <button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                        <X size={24} />
                    </button>
                    <img src={lightboxUrl} alt="Evidence Preview" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};
