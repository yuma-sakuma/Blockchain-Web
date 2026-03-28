import { CheckCircle, ClipboardCheck, FileText, Gauge, Search, ShieldCheck, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL, uploadFile } from '../services/api';
import { useVehicleStore } from '../store';


export const InspectionPage = () => {
    const { vehicles, events, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [searchVin, setSearchVin] = useState('');
    const [result, setResult] = useState<'pass' | 'fail'>('pass');
    const [co2, setCo2] = useState(120);
    const [mileage, setMileage] = useState<number | string>("");
    const [inspFile, setInspFile] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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
                mileageKm: Number(mileage),
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

        if (mileage) {
            await addEvent({
                type: 'ODOMETER_SNAPSHOT',
                actor: inspectorId,
                tokenId: vehicle.tokenId,
                payload: {
                    mileageKm: Number(mileage),
                    date: new Date().toISOString(),
                    evidenceHash: inspFile?.hash
                },
                evidence: inspFile ? [{
                    hash: inspFile.hash,
                    url: inspFile.path,
                    mime: inspFile.mime,
                    size: inspFile.size
                }] : undefined
            });
        }

        setInspFile(null);
        setMileage("");
        setCo2(120);
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
                <div style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0 }}>{vehicle.makeModelTrim}</h3>
                    <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>VIN: {vehicle.vin}</div>

                    {/* Vehicle Specification Display for Visual Verification */}
                    <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Color</div>
                            <div style={{ fontWeight: 600 }}>{(vehicle.spec as any)?.color || 'Not Specified'}</div>
                        </div>
                        <div>
                            <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Engine No.</div>
                            <div style={{ fontWeight: 600 }}>{(vehicle.spec as any)?.engine?.toUpperCase() || 'Not Specified'}</div>
                        </div>
                        <div>
                            <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Previous Mileage</div>
                            <div style={{ fontWeight: 600 }}>{vehicle.warranty.terms.mileageKm.toLocaleString()} KM</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                Current Odometer (KM)
                                {vehicle && <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>(Min: {vehicle.warranty.terms.mileageKm.toLocaleString()})</span>}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Gauge size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="number"
                                    min={vehicle?.warranty.terms.mileageKm || 0}
                                    value={mileage}
                                    onChange={e => setMileage(e.target.value)}
                                    style={{ paddingLeft: '2.5rem', width: '100%', marginBottom: 0 }}
                                    placeholder="Enter current mileage..."
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Emission (CO2 g/km)</label>
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
                            disabled={!vehicle || Number(mileage) < (vehicle?.warranty.terms.mileageKm || 0)}
                            style={{
                                padding: '1.25rem',
                                fontSize: '1rem',
                                borderRadius: '16px',
                                marginTop: 'auto',
                                opacity: (!vehicle || Number(mileage) < (vehicle?.warranty.terms.mileageKm || 0)) ? 0.5 : 1
                            }}
                        >
                            <ClipboardCheck size={20} />
                            {Number(mileage) < (vehicle?.warranty.terms.mileageKm || 0) ? 'Invalid Mileage' : 'Submit Inspection Result'}
                        </button>
                    </div>
                </div>
            )}

            {/* Blockchain Transaction Log for Inspector */}
            {vehicle && (() => {
                const vehicleEvents = events.filter((e: any) => e.tokenId === vehicle.tokenId && e.txHash && ['INSPECTION_RESULT_RECORDED', 'ODOMETER_SNAPSHOT'].includes(e.type));
            return vehicleEvents.length > 0 ? (
                <div className="card" style={{ marginTop: '0.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        🔗 Inspection & Registry History
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {vehicleEvents.slice(-8).map((ev: any, i: number) => (
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
                                                const url = file.url?.startsWith('http') ? file.url : `${API_BASE_URL}${file.url}`;
                                                if (file.mime?.startsWith('image/')) setLightboxUrl(url);
                                                else window.open(url, '_blank');
                                            }} style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {file.mime?.startsWith('image/') ? (
                                                    <img src={file.url?.startsWith('http') ? file.url : `${API_BASE_URL}${file.url}`} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                <img src={lightboxUrl} alt="Evidence Preview" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={(e: any) => e.stopPropagation()} />
            </div>
            )}
        </div>
    );
};

