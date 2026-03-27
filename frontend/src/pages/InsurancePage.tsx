import { AlertCircle, BarChart3, CheckCircle, ClipboardCheck, Clock, FileText, Image, RefreshCw, Search, Shield, ShieldCheck, Trash2, Wrench, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';
import { API_BASE_URL, uploadFile } from '../services/api';

const API_BASE = API_BASE_URL;

type TabKey = 'dashboard' | 'underwriting' | 'claims' | 'workshop';

export const InsurancePage = () => {
    const { vehicles, events, addEvent } = useVehicleStore();
    const { address } = useAuth();

    // Tab navigation
    const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

    // Underwriting state
    const [vin, setVin] = useState('');
    const [policyNo, setPolicyNo] = useState('');
    const [coverage, setCoverage] = useState('1st_class');
    const [premiumAmount, setPremiumAmount] = useState<number | string>('');
    const [deductible, setDeductible] = useState<number | string>('');

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

    // ── Computed Data ──

    const now = new Date();
    const thirtyDaysMs = 30 * 86400000;

    // Vehicles with active insurance
    const insuredVehicles = vehicles.filter(v => v.insurance && v.insurance.status === 'active');

    // Expiring soon (within 30 days)
    const expiringSoon = insuredVehicles.filter(v => {
        const expiryDate = new Date(v.insurance!.validUntil);
        return expiryDate.getTime() - now.getTime() <= thirtyDaysMs && expiryDate > now;
    });

    // Active claims
    const vehiclesWithClaims = vehicles.filter(v => v.activeClaim);
    const openClaims = vehiclesWithClaims.filter(v => v.activeClaim!.status === 'filed' || v.activeClaim!.status === 'investigating');
    const approvedClaims = vehiclesWithClaims.filter(v => v.activeClaim!.status === 'approved');
    const closedClaims = vehiclesWithClaims.filter(v => v.activeClaim!.status === 'repaired' || v.activeClaim!.status === 'rejected');

    // Insurance-related events (recent)
    const insuranceEvents = events
        .filter(e => ['INSURANCE_POLICY_UPDATED', 'CLAIM_FILED', 'CLAIM_STATUS_CHANGED', 'INSURER_APPROVED_ESTIMATE'].includes(e.type))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

    // Pending Estimates from workshops
    const pendingEstimates = events.filter(e =>
        e.type === 'WORKSHOP_ESTIMATE_SUBMITTED' &&
        !events.some(ae => ae.type === 'INSURER_APPROVED_ESTIMATE' && ae.payload.estimateId === e.payload.id)
    );

    // ── Handlers ──

    const handleIssuePolicy = async () => {
        if (!targetVehicle) { alert("Vehicle not found"); return; }
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
                premiumAmount: premiumAmount ? Number(premiumAmount) : undefined,
                deductible: deductible ? Number(deductible) : undefined,
                evidenceHash: policyFiles.length > 0 ? policyFiles[0].hash : undefined
            },
            evidence: policyFiles.length > 0
                ? policyFiles.map(f => ({ hash: f.hash, url: f.path, mime: f.mime, size: f.size }))
                : undefined
        });
        setPolicyNo('');
        setPolicyFiles([]);
        setPremiumAmount('');
        setDeductible('');
    };

    const handleRenewPolicy = async (vehicle: any) => {
        const existingPolicy = vehicle.insurance;
        if (!existingPolicy) return;
        await addEvent({
            type: 'INSURANCE_POLICY_UPDATED',
            actor: insurerId,
            tokenId: vehicle.tokenId,
            payload: {
                insurer: insurerId,
                policyNumber: existingPolicy.policyNumber,
                validFrom: new Date().toISOString(),
                validUntil: new Date(Date.now() + 86400000 * 365).toISOString(),
                coverageType: existingPolicy.coverageType,
                type: 'renew'
            }
        });
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
            e.target.value = '';
        }
    };

    const handleFileClaim = async () => {
        if (!claimVehicle) { alert("Vehicle not found"); return; }
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

    const handleClaimStatusChange = async (vehicle: any, newStatus: string) => {
        if (!vehicle.activeClaim) return;
        await addEvent({
            type: 'CLAIM_UPDATED',
            actor: insurerId,
            tokenId: vehicle.tokenId,
            payload: {
                claimId: vehicle.activeClaim.claimId,
                status: newStatus,
                changedAt: new Date().toISOString()
            }
        });
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

    // ── Render Helpers ──

    const renderEvidence = (ev: any) => {
        if (!ev.evidence || ev.evidence.length === 0) return null;
        return (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {ev.evidence.map((file: any, idx: number) => (
                    <div
                        key={idx}
                        onClick={() => {
                            const url = file.url?.startsWith('http') ? file.url : `${API_BASE}${file.url}`;
                            if (file.mime?.startsWith('image/')) { setLightboxUrl(url); }
                            else { window.open(url, '_blank'); }
                        }}
                        style={{
                            width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden',
                            border: '1px solid var(--border-subtle)', cursor: 'pointer', position: 'relative',
                            background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0
                        }}
                        title={file.url || file.hash}
                    >
                        {file.mime?.startsWith('image/') ? (
                            <img src={file.url?.startsWith('http') ? file.url : `${API_BASE}${file.url}`} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <FileText size={24} color="var(--accent-primary)" />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderUploadedFiles = (files: any[], setFiles: (fn: (prev: any[]) => any[]) => void) => {
        if (files.length === 0) return null;
        return (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {files.map((f, idx) => (
                    <div key={idx} style={{
                        position: 'relative', width: '80px', height: '80px', borderRadius: '8px',
                        overflow: 'hidden', border: '1px solid var(--border-subtle)',
                        background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {f.mime?.startsWith('image/') ? (
                            <img src={`${API_BASE}${f.path}`} alt={f.originalname} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
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
                                background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%',
                                width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
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

    const statusColor = (status: string) => {
        switch (status) {
            case 'filed': return '#f59e0b';
            case 'investigating': return '#3b82f6';
            case 'approved': return '#10b981';
            case 'rejected': return '#ef4444';
            case 'repaired': return '#8b5cf6';
            default: return '#94a3b8';
        }
    };

    // ── Tab definitions ──

    const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
        { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
        { key: 'underwriting', label: 'Policy Underwriting', icon: <ShieldCheck size={18} /> },
        { key: 'claims', label: 'Claim Management', icon: <AlertCircle size={18} />, count: openClaims.length },
        { key: 'workshop', label: 'Workshop Estimates', icon: <Wrench size={18} />, count: pendingEstimates.length },
    ];

    // ── Main Render ──

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Insurance Management</h1>
                <p>End-to-end insurance workflow: Underwriting, Claims, Repair & Renewal.</p>
                <div className="identity-bar">
                    <span className="badge badge-info" style={{ padding: '0.6rem 1.2rem', borderRadius: '100px' }}>
                        <Shield size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                        Insurer: <span style={{ color: 'var(--accent-primary)', fontWeight: 600, marginLeft: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{insurerId.substring(0, 10)}...</span>
                    </span>
                </div>
            </header>

            {/* ═══════ Tab Navigation ═══════ */}
            <div className="tab-nav">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="tab-count">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════ */}
            {/* ═══════ TAB 1: DASHBOARD ═══════ */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Stat Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                        {[
                            { label: 'Active Policies', value: insuredVehicles.length, icon: <Shield size={24} />, color: '#10b981' },
                            { label: 'Open Claims', value: openClaims.length, icon: <AlertCircle size={24} />, color: '#f59e0b' },
                            { label: 'Vehicles Insured', value: insuredVehicles.length, icon: <ShieldCheck size={24} />, color: '#3b82f6' },
                            { label: 'Expiring Soon', value: expiringSoon.length, icon: <Clock size={24} />, color: expiringSoon.length > 0 ? '#ef4444' : '#94a3b8' },
                        ].map((stat, i) => (
                            <div key={i} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                <div style={{ color: stat.color, marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                                <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Expiring Policies Alert */}
                    {expiringSoon.length > 0 && (
                        <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--danger)' }}>
                                <Clock size={20} />
                                ⚠️ Policies Expiring Within 30 Days
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {expiringSoon.map((v, i) => {
                                    const daysLeft = Math.ceil((new Date(v.insurance!.validUntil).getTime() - now.getTime()) / 86400000);
                                    return (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px'
                                        }}>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>{v.makeModelTrim}</span>
                                                <span className="text-secondary" style={{ marginLeft: '0.75rem', fontSize: '0.85rem' }}>VIN: {v.vin}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span className="badge badge-danger">{daysLeft} days left</span>
                                                <button onClick={() => { setActiveTab('underwriting'); setVin(v.vin); }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                                    <RefreshCw size={14} /> Renew
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recent Activities */}
                    <div className="card">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            📋 Recent Insurance Activities
                        </h3>
                        {insuranceEvents.length === 0 ? (
                            <p className="text-secondary">No recent insurance activities.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {insuranceEvents.map((ev, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.625rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                                        border: '1px solid var(--border-subtle)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>{ev.type.replace(/_/g, ' ')}</span>
                                            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>Token #{ev.tokenId}</span>
                                        </div>
                                        <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{new Date(ev.timestamp).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ═══════ TAB 2: POLICY UNDERWRITING ═══════ */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'underwriting' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Issue New Policy */}
                        <div className="card">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <ShieldCheck color="var(--accent-primary)" size={24} />
                                Issue / Renew Policy
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
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Premium Amount (THB)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" value={premiumAmount} onChange={e => setPremiumAmount(e.target.value)} placeholder="e.g. 15000" style={{ marginBottom: 0, paddingRight: '50px' }} />
                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.8rem' }}>THB</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Deductible (THB)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" value={deductible} onChange={e => setDeductible(e.target.value)} placeholder="e.g. 5000" style={{ marginBottom: 0, paddingRight: '50px' }} />
                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-secondary)', fontWeight: 700, fontSize: '0.8rem' }}>THB</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Policy Documents</label>
                                    <div
                                        onClick={() => document.getElementById('policy-upload')?.click()}
                                        style={{
                                            border: '1px dashed var(--border-subtle)', borderRadius: '8px', padding: '1rem',
                                            textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)'
                                        }}
                                    >
                                        {isUploading ? (
                                            <span>Uploading...</span>
                                        ) : (
                                            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                                <Image size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                                                Click to upload policy documents
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

                        {/* Active Policies Table */}
                        <div className="card">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Shield color="var(--success)" size={24} />
                                Active Policies ({insuredVehicles.length})
                            </h2>
                            {insuredVehicles.length === 0 ? (
                                <p className="text-secondary">No active policies.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                                    {insuredVehicles.map((v, i) => {
                                        const expiry = new Date(v.insurance!.validUntil);
                                        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
                                        const isExpiring = daysLeft <= 30 && daysLeft > 0;
                                        return (
                                            <div key={i} style={{
                                                padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                                                border: isExpiring ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{v.makeModelTrim}</div>
                                                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>VIN: {v.vin}</div>
                                                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Policy: {v.insurance!.policyNumber}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span className={`badge ${isExpiring ? 'badge-warning' : daysLeft < 0 ? 'badge-danger' : 'badge-success'}`}>
                                                            {daysLeft < 0 ? 'EXPIRED' : isExpiring ? `${daysLeft}d left` : v.insurance!.coverageType}
                                                        </span>
                                                        <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                                            Until: {expiry.toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isExpiring && (
                                                    <button onClick={() => handleRenewPolicy(v)} style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}>
                                                        <RefreshCw size={14} /> Renew for 1 Year
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ═══════ TAB 3: CLAIM MANAGEMENT ═══════ */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'claims' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Claims Pipeline */}
                    <div className="card">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            📊 Claims Pipeline
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                            {/* Filed */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f59e0b' }}>Filed ({vehiclesWithClaims.filter(v => v.activeClaim!.status === 'filed').length})</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {vehiclesWithClaims.filter(v => v.activeClaim!.status === 'filed').map((v, i) => (
                                        <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{v.makeModelTrim}</div>
                                            <div className="text-secondary" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>{v.activeClaim!.claimId}</div>
                                            <button onClick={() => handleClaimStatusChange(v, 'investigating')} style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                                🔍 Start Investigation
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Investigating */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} />
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#3b82f6' }}>Investigating ({vehiclesWithClaims.filter(v => v.activeClaim!.status === 'investigating').length})</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {vehiclesWithClaims.filter(v => v.activeClaim!.status === 'investigating').map((v, i) => (
                                        <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{v.makeModelTrim}</div>
                                            <div className="text-secondary" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>{v.activeClaim!.description?.slice(0, 60)}</div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleClaimStatusChange(v, 'approved')} style={{ flex: 1, fontSize: '0.7rem', padding: '0.35rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                    <CheckCircle size={12} /> Approve
                                                </button>
                                                <button onClick={() => handleClaimStatusChange(v, 'rejected')} style={{ flex: 1, fontSize: '0.7rem', padding: '0.35rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                                    <XCircle size={12} /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Approved */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#10b981' }}>Approved ({approvedClaims.length})</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {approvedClaims.map((v, i) => (
                                        <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{v.makeModelTrim}</div>
                                            <div className="text-secondary" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                                                {v.activeClaim!.estimateAmount ? `Est: ${v.activeClaim!.estimateAmount.toLocaleString()} THB` : 'Awaiting estimate'}
                                            </div>
                                            <button onClick={() => handleClaimStatusChange(v, 'repaired')} style={{ width: '100%', fontSize: '0.7rem', padding: '0.35rem', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                                ✅ Mark Repaired
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Closed */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(148, 163, 184, 0.1)' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#94a3b8' }} />
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#94a3b8' }}>Closed ({closedClaims.length})</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {closedClaims.slice(0, 5).map((v, i) => (
                                        <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', opacity: 0.7 }}>
                                            <div style={{ fontWeight: 600 }}>{v.makeModelTrim}</div>
                                            <span className="badge" style={{ background: `${statusColor(v.activeClaim!.status)}20`, color: statusColor(v.activeClaim!.status), border: `1px solid ${statusColor(v.activeClaim!.status)}40`, fontSize: '0.6rem' }}>
                                                {v.activeClaim!.status.toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* File New Claim */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div className="card" style={{ border: '1px solid var(--danger)' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--danger)' }}>
                                <AlertCircle size={24} />
                                File New Claim
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
                                    <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Impact Severity</label>
                                    <select value={severity} onChange={e => setSeverity(e.target.value)}>
                                        <option value="minor">Minor: Panel Damage Only</option>
                                        <option value="high">Major: Structural Frame Impact</option>
                                        <option value="total_loss">Catastrophic: Declared Total Loss</option>
                                    </select>
                                </div>

                                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--danger)', display: 'flex', gap: '0.75rem' }}>
                                    <AlertCircle size={28} />
                                    <span>Warning: Filing a Major or Total Loss claim will permanently flag this NFT in the global registry.</span>
                                </div>

                                <button className="premium-btn" onClick={handleFileClaim} disabled={!claimVehicle || !description} style={{ background: 'var(--danger)' }}>
                                    {claimFiles.length > 0 ? `Certify Claim & Flag NFT (${claimFiles.length} file${claimFiles.length > 1 ? 's' : ''} attached)` : 'Certify Claim & Flag NFT'}
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
                                        minHeight: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                                        border: '1px dashed var(--border-subtle)', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', cursor: 'pointer', padding: '1rem'
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
                                    <input id="claim-file-input" type="file" hidden multiple onChange={(e) => handleFileChange(e, 'claim')} />
                                </div>
                                {renderUploadedFiles(claimFiles, setClaimFiles)}
                                {claimFiles.length > 0 && (
                                    <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        ℹ️ {claimFiles.length} file{claimFiles.length > 1 ? 's' : ''} will be attached to the claim when you click "Certify Claim" above.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ═══════ TAB 4: WORKSHOP ESTIMATES ═══════ */}
            {/* ═══════════════════════════════════════════════ */}
            {activeTab === 'workshop' && (
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
            )}

            {/* ═══════ Blockchain Transaction Log ═══════ */}
            {(() => {
                const activeTokenId = targetVehicle?.tokenId || claimVehicle?.tokenId;
                if (!activeTokenId) return null;
                const vehicleEvents = events.filter(e => e.tokenId === activeTokenId && ['INSURANCE_POLICY_UPDATED', 'CLAIM_FILED', 'CLAIM_STATUS_CHANGED', 'INSURER_APPROVED_ESTIMATE'].includes(e.type));
                if (vehicleEvents.length === 0) return null;
                return (
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            🔗 Insurance Blockchain Transactions & Evidence
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {vehicleEvents.slice(-10).map((ev, i) => (
                                <div key={i} style={{
                                    padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '8px', border: '1px solid var(--border-subtle)'
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
                                    {renderEvidence(ev)}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Lightbox Modal */}
            {lightboxUrl && (
                <div
                    onClick={() => setLightboxUrl(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
                        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out', padding: '2rem'
                    }}
                >
                    <button
                        onClick={() => setLightboxUrl(null)}
                        style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                            width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'white'
                        }}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt="Evidence Preview"
                        style={{
                            maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px',
                            objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
