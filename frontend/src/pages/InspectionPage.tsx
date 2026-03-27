import { CheckCircle, ClipboardCheck, Search, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { uploadFile } from '../services/api';
import { useVehicleStore } from '../store';

export const InspectionPage = () => {
    const { vehicles, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [searchVin, setSearchVin] = useState('');
    const [result, setResult] = useState<'pass' | 'fail'>('pass');
    const [co2, setCo2] = useState(120);
    const [inspFile, setInspFile] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);

    const inspectorId = address || 'UNKNOWN';

    const vehicle = vehicles.find(v => v.vin === searchVin);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await uploadFile(file);
            setInspFile(result);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmitResult = async () => {
        if (!vehicle) return;

        await addEvent({
            type: 'INSPECTION_RESULT_RECORDED',
            actor: inspectorId,
            tokenId: vehicle.tokenId,
            payload: {
                stationId: inspectorId,
                result: result,
                passed: result === 'pass',
                metrics: { co2_g_km: co2, brake_efficiency: '90%' },
                validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                certHash: inspFile?.hash || "CERT-" + Date.now()
            },
            evidence: inspFile ? [{
                hash: inspFile.hash,
                url: inspFile.path,
                mime: inspFile.mime,
                size: inspFile.size
            }] : undefined
        });
        setInspFile(null);
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Inspection Center</h1>
                <p>Annual Vehicle Inspection for Registration Renewal (ตรวจสภาพรถ ตรอ.)</p>
                <div className="identity-bar">
                    <span className="badge badge-info" style={{ padding: '0.6rem 1.2rem', borderRadius: '100px' }}>
                        <ShieldCheck size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                        Inspector: <span style={{ color: 'var(--accent-primary)', fontWeight: 600, marginLeft: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{inspectorId.substring(0, 10)}...</span>
                    </span>
                </div>
            </header>

            {/* Search Section */}
            <div className="section-card">
                <div className="card-accent blue" />
                <h3 className="section-title">
                    <span className="icon-wrap blue"><Search size={20} color="var(--accent-primary)" /></span>
                    Inspect Vehicle
                </h3>

                <div className="search-container">
                    <Search className="search-icon" size={22} />
                    <input
                        value={searchVin}
                        onChange={e => setSearchVin(e.target.value)}
                        placeholder="Enter VIN to begin inspection..."
                    />
                </div>
            </div>

            {vehicle && (
                <div className="section-card animate-slide-up">
                    {/* Vehicle Info Bar */}
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.04))',
                        borderRadius: '16px',
                        border: '1px solid rgba(59, 130, 246, 0.15)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '2rem'
                    }}>
                        <div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{vehicle.makeModelTrim}</div>
                            <div className="text-secondary" style={{ fontSize: '0.9rem', fontFamily: 'monospace', marginTop: '0.25rem' }}>VIN: {vehicle.vin}</div>
                        </div>
                        <span className="badge badge-info" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Token: {vehicle.tokenId}</span>
                    </div>

                    {/* Inspection Form */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Left: Measurements */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Emission Level (CO₂ g/km)</label>
                                <input
                                    type="number"
                                    value={co2}
                                    onChange={e => setCo2(Number(e.target.value))}
                                    style={{ fontSize: '1.1rem', fontWeight: 600 }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Inspection Result</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button
                                        onClick={() => setResult('pass')}
                                        style={{
                                            padding: '1.25rem',
                                            borderRadius: '16px',
                                            background: result === 'pass'
                                                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(16, 185, 129, 0.15))'
                                                : 'rgba(255,255,255,0.03)',
                                            border: result === 'pass'
                                                ? '2px solid var(--success)'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            color: result === 'pass' ? 'var(--success)' : 'var(--text-secondary)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.25s ease',
                                            fontSize: '1rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        <CheckCircle size={28} />
                                        PASS
                                    </button>
                                    <button
                                        onClick={() => setResult('fail')}
                                        style={{
                                            padding: '1.25rem',
                                            borderRadius: '16px',
                                            background: result === 'fail'
                                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.15))'
                                                : 'rgba(255,255,255,0.03)',
                                            border: result === 'fail'
                                                ? '2px solid var(--danger)'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            color: result === 'fail' ? 'var(--danger)' : 'var(--text-secondary)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.25s ease',
                                            fontSize: '1rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        <XCircle size={28} />
                                        FAIL
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right: Upload + Submit */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Inspection Certificate Photo</label>
                                <div
                                    className="upload-area"
                                    onClick={() => document.getElementById('insp-upload')?.click()}
                                    style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
                                >
                                    {isUploading ? (
                                        <span style={{ color: 'var(--accent-primary)' }}>Uploading...</span>
                                    ) : inspFile ? (
                                        <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <CheckCircle size={24} />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{inspFile.originalname}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Certified ✓</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <ClipboardCheck size={32} style={{ opacity: 0.4 }} />
                                            <span>Click to upload inspection result</span>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Supports images & documents</span>
                                        </>
                                    )}
                                    <input id="insp-upload" type="file" hidden onChange={handleFileChange} />
                                </div>
                            </div>

                            <button
                                className="premium-btn"
                                onClick={handleSubmitResult}
                                style={{
                                    padding: '1.25rem',
                                    fontSize: '1rem',
                                    borderRadius: '16px',
                                    marginTop: 'auto'
                                }}
                            >
                                <ClipboardCheck size={20} />
                                Submit Inspection Result
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!vehicle && searchVin && (
                <div className="section-card empty-state">
                    <Search size={48} className="empty-icon" />
                    <p>No vehicle found with VIN "{searchVin}"</p>
                </div>
            )}
        </div>
    );
};
