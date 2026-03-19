import { AlertCircle, ClipboardCheck, FileText, Image, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';
import { uploadFile } from '../services/api';

const API_BASE = 'http://localhost:3000';

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
    const [claimFiles, setClaimFiles] = useState<any[]>([]);
    const [policyFiles, setPolicyFiles] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const insurerId = address || 'UNKNOWN';
    const targetVehicle = vehicles.find(v => v.vin === vin);
    const claimVehicle = vehicles.find(v => v.vin === claimVin);

    // Pending Estimates from workshops
    const pendingEstimates = events.filter(e => e.type === 'WORKSHOP_ESTIMATE_SUBMITTED' && !events.some(ae => ae.type === 'INSURER_APPROVED_ESTIMATE' && ae.payload.estimateId === e.payload.id));

    const handleIssuePolicy = async () => {
        if (!targetVehicle) {
            alert("Vehicle not found");
            return;
        }

        await addEvent({
            type: 'INSURANCE_POLICY_UPDATED',
            actor: insurerId,
            tokenId: targetVehicle.tokenId,
            payload: {
                insurer: insurerId,
                policyNumber: policyNo,
                validFrom: new Date().toISOString(),
                validUntil: new Date(Date.now() + 86400000 * 365).toISOString(),
                coverageType: coverage,
                evidenceHash: policyFiles.length > 0 ? policyFiles[0].hash : undefined
            },
            evidence: policyFiles.length > 0
                ? policyFiles.map(f => ({ hash: f.hash, url: f.path, mime: f.mime, size: f.size }))
                : undefined
        });

        setPolicyNo('');
        setPolicyFiles([]);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, target: 'claim' | 'policy') => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of files) {
                const result = await uploadFile(file);
                if (target === 'claim') setClaimFiles(prev => [...prev, result]);
                if (target === 'policy') setPolicyFiles(prev => [...prev, result]);
            }
        } catch (err) {
            console.error("Upload failed", err);
            alert("File upload failed");
        } finally {
            setIsUploading(false);
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    };

    const handleFileClaim = async () => {
        if (!claimVehicle) {
            alert("Vehicle not found");
            return;
        }

        await addEvent({
            type: 'CLAIM_FILED',
            actor: insurerId,
            tokenId: claimVehicle.tokenId,
            payload: {
                claimId: "CLM-" + Date.now(),
                date: new Date().toISOString(),
                description,
                severity,
                evidenceHashes: claimFiles.map(f => f.hash)
            },
            evidence: claimFiles.length > 0
                ? claimFiles.map(f => ({ hash: f.hash, url: f.path, mime: f.mime, size: f.size }))
                : undefined
        });

        setDescription('');
        setClaimFiles([]);
    };

    const handleApproveEstimate = async (estimate: any) => {
        await addEvent({
            type: 'INSURER_APPROVED_ESTIMATE',
            actor: insurerId,
            tokenId: estimate.tokenId,
            payload: {
                estimateId: estimate.payload.id,
                amount: estimate.payload.total,
                approvedAmount: estimate.payload.total,
                approvalCode: crypto.randomUUID(),
                notes: "Standard labor rates applied."
            }
        });
    };

    // Helper: render evidence thumbnails for an event
    const renderEvidence = (ev: any) => {
        if (!ev.evidence || ev.evidence.length === 0) return null;
        return (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {ev.evidence.map((file: any, idx: number) => (
                    <div
                        key={idx}
                        onClick={() => {
                            const url = file.url?.startsWith('http') ? file.url : `${API_BASE}${file.url}`;
                            if (file.mime?.startsWith('image/')) {
                                setLightboxUrl(url);
                            } else {
                                window.open(url, '_blank');
                            }
                        }}
                        style={{
                            width: '56px', height: '56px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            position: 'relative',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}
                        title={file.url || file.hash}
                    >
                        {file.mime?.startsWith('image/') ? (
                            <img
                                src={file.url?.startsWith('http') ? file.url : `${API_BASE}${file.url}`}
                                alt="evidence"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <FileText size={24} color="var(--accent-primary)" />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Helper: render uploaded files preview grid (for form state)
    const renderUploadedFiles = (files: any[], setFiles: (fn: (prev: any[]) => any[]) => void) => {
        if (files.length === 0) return null;
        return (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {files.map((f, idx) => (
                    <div key={idx} style={{
                        position: 'relative',
                        width: '80px', height: '80px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {f.mime?.startsWith('image/') ? (
                            <img
                                src={`${API_BASE}${f.path}`}
                                alt={f.originalname}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                            />
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <FileText size={28} color="var(--accent-primary)" />
                                <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all', padding: '0 4px' }}>
                                    {f.originalname?.slice(0, 12)}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, i) => i !== idx)); }}
                            style={{
                                position: 'absolute', top: '2px', right: '2px',
                                background: 'rgba(239, 68, 68, 0.9)', color: 'white',
                                border: 'none', borderRadius: '50%',
                                width: '18px', height: '18px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', padding: 0
                            }}
                        >
                            <Trash2 size={10} />
                        </button>
                    </div>
                ))}
            </div>
        );
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
                                    <input value={vin} onChange={e => setVin(e.target.value)} placeholder="Enter VIN to link policy..." style={{ marginBottom: 0 }} />
                                    <button className="btn" onClick={() => {}}><Search size={18} /></button>
                                </div>
                            </div>

                            {targetVehicle && (
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                                    <div style={{ fontWeight: 700 }}>{targetVehicle.makeModelTrim}</div>
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
                            <div>
                                <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Policy Documents</label>
                                <div
                                    onClick={() => document.getElementById('policy-upload')?.click()}
                                    style={{
                                        border: '1px dashed var(--border-subtle)',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.02)'
                                    }}
                                >
                                    {isUploading ? (
                                        <span>Uploading...</span>
                                    ) : (
                                        <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                            <Image size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                                            Click to upload policy documents (multiple files supported)
                                        </span>
                                    )}
                                    <input id="policy-upload" type="file" hidden multiple onChange={(e) => handleFileChange(e, 'policy')} />
                                </div>
                                {renderUploadedFiles(policyFiles, setPolicyFiles)}
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
                                    <div style={{ fontWeight: 700 }}>{claimVehicle.makeModelTrim}</div>
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

                    {/* Evidence Upload */}
                    <div className="card">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <FileText size={18} color="var(--accent-primary)" />
                            Proof of Evidence
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div
                                style={{
                                    minHeight: '100px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    border: '1px dashed var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    padding: '1rem'
                                }}
                                className="text-secondary"
                                onClick={() => document.getElementById('claim-file-input')?.click()}
                            >
                                {isUploading ? (
                                    <span>Uploading...</span>
                                ) : (
                                    <>
                                        <Image size={28} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
                                        <span>Click to upload accident photos, police reports, or other evidence</span>
                                        <span style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.7 }}>Multiple files supported — images and documents</span>
                                    </>
                                )}
                                <input
                                    id="claim-file-input"
                                    type="file"
                                    hidden
                                    multiple
                                    onChange={(e) => handleFileChange(e, 'claim')}
                                />
                            </div>
                            {renderUploadedFiles(claimFiles, setClaimFiles)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Blockchain Transaction Log with Evidence Gallery */}
            {(() => {
                // Show events for either target vehicle or claim vehicle
                const activeTokenId = targetVehicle?.tokenId || claimVehicle?.tokenId;
                if (!activeTokenId) return null;
                const vehicleEvents = events.filter(e => e.tokenId === activeTokenId && ['INSURANCE_POLICY_UPDATED', 'CLAIM_FILED', 'INSURER_APPROVED_ESTIMATE'].includes(e.type));
                if (vehicleEvents.length === 0) return null;
                return (
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            🔗 Insurance Blockchain Transactions & Evidence
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {vehicleEvents.slice(-10).map((ev, i) => (
                                <div key={i} style={{
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-subtle)'
                                }}>
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
                                    {renderEvidence(ev)}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Lightbox Modal for image preview */}
            {lightboxUrl && (
                <div
                    onClick={() => setLightboxUrl(null)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 10000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out',
                        padding: '2rem'
                    }}
                >
                    <button
                        onClick={() => setLightboxUrl(null)}
                        style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'rgba(255,255,255,0.1)', border: 'none',
                            borderRadius: '50%', width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'white'
                        }}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt="Evidence Preview"
                        style={{
                            maxWidth: '90vw', maxHeight: '85vh',
                            borderRadius: '12px',
                            objectFit: 'contain',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
