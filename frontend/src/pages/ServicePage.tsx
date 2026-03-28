import { AlertTriangle, Cpu, FileText, Gauge, Save, Search, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';
import { API_BASE_URL, uploadFile } from '../services/api';

const API_BASE = API_BASE_URL;

export const ServicePage = () => {
    const { vehicles, events, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [vin, setVin] = useState('');
    const [mileage, setMileage] = useState<number | string>("");
    const [jobs, setJobs] = useState('');

    // Part Registry state
    const [partType, setPartType] = useState('ECU');
    const [newPartNo, setNewPartNo] = useState('');

    // Estimate state
    const [estimateJobs, setEstimateJobs] = useState('');
    const [estimateTotal, setEstimateTotal] = useState<number | string>("");

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

        if (Number(mileage) < targetVehicle.warranty.terms.mileageKm) {
            alert(`Odometer Rollback Warning! New value ${mileage} < current ${targetVehicle.warranty.terms.mileageKm}. Action Blocked.`);
            return;
        }

        await addEvent({
            type: 'SERVICE_ACCESS_REQUESTED',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                workshop: garageId,
                vehicleVin: targetVehicle.vin,
                vehicleModel: targetVehicle.makeModelTrim,
                actionType: 'MAINTENANCE_RECORDED',
                actionLabel: `Maintenance: ${jobs}`,
                requestedAt: new Date().toISOString(),
                actionPayload: {
                    workshop: garageId,
                    date: new Date().toISOString(),
                    mileageKm: Number(mileage),
                    jobs: jobs.split(',').map(j => j.trim()),
                    cost: { total: 1500 },
                    evidenceHash: maintFile?.hash || undefined
                },
                actionEvidence: maintFile ? [{
                    hash: maintFile.hash,
                    url: maintFile.path,
                    mime: maintFile.mime,
                    size: maintFile.size
                }] : undefined
            },
            evidence: maintFile ? [{
                hash: maintFile.hash,
                url: maintFile.path,
                mime: maintFile.mime,
                size: maintFile.size
            }] : undefined
        });

        setJobs('');
        setMileage("");
        setMaintFile(null);
        alert('✅ Service request sent to owner for approval.');
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
            type: 'SERVICE_ACCESS_REQUESTED',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                workshop: garageId,
                vehicleVin: targetVehicle.vin,
                vehicleModel: targetVehicle.makeModelTrim,
                actionType: 'CRITICAL_PART_REPLACED',
                actionLabel: `Part Replacement: ${partType} → ${newPartNo}`,
                requestedAt: new Date().toISOString(),
                actionPayload: {
                    date: new Date().toISOString(),
                    partType,
                    newPartNo,
                    oldPartNo: (targetVehicle.spec as any)[partType.toLowerCase()] || "UNKNOWN",
                    reason: "Replacement/Upgrade",
                    evidenceHash: partFile?.hash || undefined
                },
                actionEvidence: partFile ? [{
                    hash: partFile.hash,
                    url: partFile.path,
                    mime: partFile.mime,
                    size: partFile.size
                }] : undefined
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
        alert('✅ Part certification request sent to owner for approval.');
    };

    const handleSubmitEstimate = async () => {
        if (!targetVehicle || !estimateJobs || !estimateTotal) return;
        await addEvent({
            type: 'SERVICE_ACCESS_REQUESTED',
            actor: garageId,
            tokenId: targetVehicle.tokenId,
            payload: {
                workshop: garageId,
                vehicleVin: targetVehicle.vin,
                vehicleModel: targetVehicle.makeModelTrim,
                actionType: 'WORKSHOP_ESTIMATE_SUBMITTED',
                actionLabel: `Estimate: ${estimateJobs} (${Number(estimateTotal).toLocaleString()} THB)`,
                requestedAt: new Date().toISOString(),
                actionPayload: {
                    id: "EST-" + Date.now(),
                    workshop: garageId,
                    jobs: estimateJobs.split(',').map(j => j.trim()),
                    total: Number(estimateTotal),
                    evidenceHash: estimateFile?.hash || undefined
                },
                actionEvidence: estimateFile ? [{
                    hash: estimateFile.hash,
                    url: estimateFile.path,
                    mime: estimateFile.mime,
                    size: estimateFile.size
                }] : undefined
            },
            evidence: estimateFile ? [{
                hash: estimateFile.hash,
                url: estimateFile.path,
                mime: estimateFile.mime,
                size: estimateFile.size
            }] : undefined
        });
        setEstimateJobs('');
        setEstimateTotal("");
        setEstimateFile(null);
        alert('✅ Estimate request sent to owner for approval.');
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Service & Maintenance Registry</h1>
                <p>Official workshop logs for vehicle lifecycle maintenance and parts certification.</p>
                <div className="identity-bar">
                    <span className="badge badge-info" style={{ padding: '0.6rem 1.2rem', borderRadius: '100px' }}>
                        <Wrench size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                        Workshop: <span style={{ color: 'var(--accent-primary)', fontWeight: 600, marginLeft: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{garageId.substring(0, 10)}...</span>
                    </span>
                </div>
            </header>

            <div className="section-card">
                <div className="card-accent blue" />
                <h3 className="section-title">
                    <span className="icon-wrap blue"><Search size={20} color="var(--accent-primary)" /></span>
                    Check-in Vehicle
                </h3>
                <div className="search-container">
                    <Search className="search-icon" size={22} />
                    <input value={vin} onChange={e => setVin(e.target.value)} placeholder="Scan or Type VIN to identify asset..." />
                </div>
                {targetVehicle && (
                    <div style={{ marginTop: '1.25rem', padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.04))', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{targetVehicle.makeModelTrim}</div>
                            <div className="text-secondary" style={{ fontSize: '0.9rem', fontFamily: 'monospace', marginTop: '0.25rem' }}>Odometer: {targetVehicle.warranty.terms.mileageKm.toLocaleString()} KM</div>
                        </div>
                        <div className="badge badge-info">Vehicle Found</div>
                        {targetVehicle.pendingServiceRequest && (
                            <div className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>⏳ Awaiting Owner Approval</div>
                        )}
                    </div>
                )}
            </div>

            <div className="service-forms" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', opacity: !targetVehicle ? 0.4 : 1, pointerEvents: !targetVehicle ? 'none' : 'auto', transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {/* Log Service */}
                    <div className="section-card">
                        <div className="card-accent blue" />
                        <h3 className="section-title">
                            <span className="icon-wrap blue"><Wrench size={20} color="var(--accent-primary)" /></span>
                            Log Final Service Record
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">Labor & Parts Details</label>
                                <input value={jobs} onChange={e => setJobs(e.target.value)} placeholder="e.g. Engine Oil (OW-20), Air Filter..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    Odometer Certified (KM)
                                    {targetVehicle && <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>(Min: {targetVehicle.warranty.terms.mileageKm.toLocaleString()})</span>}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Gauge size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input type="number" min={targetVehicle?.warranty.terms.mileageKm || 0} value={mileage} onChange={e => setMileage(e.target.value)} style={{ paddingLeft: '3rem' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button className="btn" onClick={() => document.getElementById('maint-upload')?.click()} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                                    {isUploading === 'maint' ? 'Uploading...' : maintFile ? '✓ Photo Ready' : '+ Upload Receipt/Odometer'}
                                </button>
                                <input id="maint-upload" type="file" hidden onChange={(e) => handleFileUpload(e, 'maint')} />
                                <button className="premium-btn" onClick={handleRecordService} disabled={!targetVehicle || !!targetVehicle?.pendingServiceRequest || Number(mileage) <= 0 || Number(mileage) < (targetVehicle?.warranty.terms.mileageKm || 0)} style={{ flex: 1, opacity: (!targetVehicle || !!targetVehicle?.pendingServiceRequest || Number(mileage) <= 0 || Number(mileage) < (targetVehicle?.warranty.terms.mileageKm || 0)) ? 0.5 : 1 }}>
                                    <Save size={18} /> {targetVehicle?.pendingServiceRequest ? 'Pending Approval...' : (Number(mileage) <= 0 || Number(mileage) < (targetVehicle?.warranty.terms.mileageKm || 0)) ? 'Invalid Mileage' : 'Commit Service to Chain'}
                                </button>
                            </div>
                            {renderFilePreview(maintFile)}
                        </div>
                    </div>

                    {/* Part Registry */}
                    <div className="section-card">
                        <div className="card-accent green" />
                        <h3 className="section-title">
                            <span className="icon-wrap purple"><Cpu size={20} color="var(--accent-secondary)" /></span>
                            Critical Part Certification
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Component Type</label>
                                <select value={partType} onChange={e => setPartType(e.target.value)}>
                                    <option value="ECU">Electronic Control Unit (ECU)</option>
                                    <option value="BATTERY">EV Battery Module</option>
                                    <option value="MOTOR">Main Drive Motor</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Serial Number</label>
                                <input value={newPartNo} onChange={e => setNewPartNo(e.target.value)} placeholder="Enter New Serial Number (PartID)..." />
                            </div>
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
                    <div className="section-card" style={{ border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div className="card-accent blue" />
                        <h3 className="section-title">
                            <span className="icon-wrap blue"><FileText size={20} color="var(--accent-primary)" /></span>
                            Insurance Claim Appraisal
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="info-banner info">
                                <AlertTriangle size={22} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                                <span>Use this form to submit repair estimates for vehicles with active accident claims.</span>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Estimated Repair Jobs</label>
                                <textarea value={estimateJobs} onChange={e => setEstimateJobs(e.target.value)} placeholder="e.g. Frame Alignment, Front Bumper, Headlight Assy..." style={{ minHeight: '80px' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Total Appraisal Value (THB)</label>
                                <input type="number" value={estimateTotal} onChange={e => setEstimateTotal(e.target.value)} placeholder="0.00" />
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
                const vehicleEvents = events.filter(e => e.tokenId === targetVehicle.tokenId && e.txHash && ['MAINTENANCE_RECORDED', 'INSPECTION_RESULT_RECORDED', 'CRITICAL_PART_REPLACED', 'WORKSHOP_ESTIMATE_SUBMITTED', 'ODOMETER_SNAPSHOT', 'OWNERSHIP_TRANSFERRED'].includes(e.type));
                return vehicleEvents.length > 0 ? (
                    <div className="section-card">
                        <h3 className="section-title">
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
