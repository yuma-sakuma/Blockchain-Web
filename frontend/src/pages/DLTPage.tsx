import { Book, History, Search, Settings, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { checkPlateExists } from '../services/api';
import { useVehicleStore } from '../store';

// ── Thai Plate Generator ──
const LETTERS_TH = "กขคฆงจฉชซญฎฏฐฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ";

function randomPlateNo(): string {
    const prefix = Math.floor(Math.random() * 9) + 1;
    const char1 = LETTERS_TH.charAt(Math.floor(Math.random() * LETTERS_TH.length));
    const char2 = LETTERS_TH.charAt(Math.floor(Math.random() * LETTERS_TH.length));
    const digits = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}${char1}${char2}-${digits}`;
}

async function generateUniquePlate(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
        const plate = randomPlateNo();
        const { exists } = await checkPlateExists(plate);
        if (!exists) return plate;
    }
    throw new Error('ไม่สามารถสุ่มเลขทะเบียนที่ไม่ซ้ำได้ กรุณาลองใหม่อีกครั้ง');
}

export const DLTPage = () => {
    const { vehicles, events, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [searchVin, setSearchVin] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [newColor, setNewColor] = useState('');


    // Dynamic Actor ID
    const actorId = address || 'UNKNOWN';


    const searchResult = vehicles.find(v => v.vin === searchVin);
    const vehicleEvents = searchResult ? events.filter(e => e.tokenId === searchResult.tokenId) : [];
    const plateEvents = vehicleEvents.filter(e => e.type === 'PLATE_EVENT_RECORDED');

    const handleRegister = async () => {
        if (!searchResult) return;

        try {
            // 1. สุ่มป้ายทะเบียนและเช็คซ้ำผ่าน API
            const generatedPlate = await generateUniquePlate();

            // 2. บันทึกการจดทะเบียน
            await addEvent({
                type: 'DLT_REGISTRATION_UPDATED',
                actor: actorId,
                tokenId: searchResult.tokenId,
                payload: {
                    status: 'registered',
                    registeredAt: new Date().toISOString(),
                    bookNo: 'GB-' + Math.floor(Math.random() * 1000000)
                }
            });

            // 3. บันทึกป้ายทะเบียนที่สุ่มได้ (พร้อมเลขป้าย)
            await addEvent({
                type: 'PLATE_EVENT_RECORDED',
                actor: actorId,
                tokenId: searchResult.tokenId,
                payload: { action: 'issue', plateNo: generatedPlate, province: 'Bangkok', date: new Date().toISOString() }
            });

            alert(`Registration complete. Plate: ${generatedPlate}`);
        } catch (err: any) {
            alert(`Registration failed: ${err.message}`);
        }
    };

    const handleUpdateTax = async () => {
        if (!searchResult) return;

        const age = new Date().getFullYear() - new Date(searchResult.production.manufacturedAt).getFullYear();
        if (age >= 7) {
            const hasInspection = events.some(e => e.tokenId === searchResult.tokenId && e.type === 'INSPECTION_RESULT_RECORDED' && e.payload.result === 'pass');
            if (!hasInspection) {
                alert("TAX RENEWAL BLOCKED: Vehicle age >= 7 years requires a passing inspection (Tor-Ror-Or).");
                return;
            }
        }

        await addEvent({
            type: 'TAX_STATUS_UPDATED',
            actor: actorId,
            tokenId: searchResult.tokenId,
            payload: {
                taxYear: new Date().getFullYear() + 1,
                paidAt: new Date().toISOString(),
                validUntil: new Date(Date.now() + 31536000000).toISOString()
            }
        });
        alert("Tax status updated successfully.");
    };

    const handleUpdateColor = async () => {
        if (!searchResult || !newColor) return;
        await addEvent({
            type: 'SPECIFICATION_UPDATED',
            actor: actorId,
            tokenId: searchResult.tokenId,
            payload: {
                changes: { color: newColor.toUpperCase() }, // Standardize to uppercase
                reason: 'legal_modification_declared',
                refNo: 'REQ-' + Date.now()
            }
        });
        alert(`Vehicle color updated to ${newColor}`);
        setNewColor('');
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Land Transport Authority</h1>
                <p>Official registry for vehicle identities, license plates, and legal flags.</p>
                <div className="identity-bar">
                    <span className="badge badge-info" style={{ padding: '0.6rem 1.2rem', borderRadius: '100px' }}>
                        <Book size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                        Officer: <span style={{ color: 'var(--accent-primary)', fontWeight: 600, marginLeft: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{actorId.substring(0, 10)}...</span>
                    </span>
                </div>
            </header>

            <div className="section-card">
                <div className="card-accent blue" />
                <h3 className="section-title">
                    <span className="icon-wrap blue"><Search size={20} color="var(--accent-primary)" /></span>
                    Lookup Central Registry
                </h3>
                <div className="search-container">
                    <Search className="search-icon" size={22} />
                    <input value={searchVin} onChange={(e) => setSearchVin(e.target.value)} placeholder="Enter Chassis Number (VIN)..." />
                </div>
            </div>

            {searchResult ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="section-card">
                            <div className="card-accent green" />
                            <h3 className="section-title">
                                <span className="icon-wrap green"><Book size={20} color="var(--success)" /></span>
                                Registration Status
                            </h3>

                            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                                <div className="data-cell">
                                    <div className="data-cell-label">Current State</div>
                                    <div className="data-cell-value" style={{ color: searchResult.registration.isRegistered ? 'var(--success)' : 'var(--warning)' }}>
                                        {searchResult.registration.isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}
                                    </div>
                                </div>
                                <div className="data-cell">
                                    <div className="data-cell-label">License Plate</div>
                                    <div className="data-cell-value">{searchResult.registration.plateNo || 'None'}</div>
                                </div>
                                <div className="data-cell">
                                    <div className="data-cell-label">Registered Color</div>
                                    <div className="data-cell-value">{searchResult.spec.color}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {!searchResult.registration.isRegistered ? (
                                    <button onClick={handleRegister} className="premium-btn" style={{ flex: 1 }}>Execute Initial Registration</button>
                                ) : (
                                    <button onClick={handleUpdateTax} style={{ flex: 1, border: '1px solid var(--success)', color: 'var(--success)' }}>Renew Annual Tax</button>
                                )}
                            </div>
                        </div>

                        <div className="section-card">
                            <div className="card-accent blue" />
                            <h3 className="section-title">
                                <span className="icon-wrap blue"><History size={20} color="var(--accent-primary)" /></span>
                                Official Plate History
                            </h3>
                            {plateEvents.length === 0 ? <p className="text-secondary">No plate changes recorded.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {plateEvents.map((pe, idx) => (
                                        <div key={idx} style={{ padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '4px solid var(--accent-primary)', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{pe.payload.plateNo}</span>
                                                <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{new Date(pe.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{pe.payload.province} — Action: {pe.payload.action.toUpperCase()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="section-card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <div className="card-accent red" />
                            <h3 className="section-title" style={{ color: 'var(--danger)' }}>
                                <span className="icon-wrap red"><ShieldAlert size={20} color="var(--danger)" /></span>
                                Enforcement Flags
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-secondary">Loss/Theft</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {searchResult.flags.stolen ? <span className="badge badge-danger">STOLEN</span> : <span className="badge badge-success">CLEAN</span>}
                                        {searchResult.flags.stolen ? (
                                            <button onClick={async () => {
                                                if (!confirm('Confirm this vehicle has been returned to its original owner? This will clear the STOLEN flag.')) return;
                                                await addEvent({
                                                    type: 'FLAG_UPDATED',
                                                    actor: actorId,
                                                    tokenId: searchResult.tokenId,
                                                    payload: { flag: 'stolen', value: false }
                                                });
                                                alert('Vehicle flag cleared. Status returned to CLEAN.');
                                            }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--success)', color: 'var(--success)' }}>
                                                RETURN TO OWNER
                                            </button>
                                        ) : (
                                            <button onClick={async () => {
                                                const caseNo = prompt('Enter Police Report / Case Number:');
                                                if (!caseNo) return;
                                                await addEvent({
                                                    type: 'FLAG_UPDATED',
                                                    actor: actorId,
                                                    tokenId: searchResult.tokenId,
                                                    payload: { flag: 'stolen', value: true, caseDocUrl: caseNo, ref: 'POL-' + Date.now() }
                                                });
                                                alert('Vehicle flagged as STOLEN. Transfer locked.');
                                            }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                                                REPORT
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-secondary">Legal Seizure</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {searchResult.flags.seized ? <span className="badge badge-danger">SEIZURE</span> : <span className="badge badge-success">NONE</span>}
                                        {searchResult.flags.seized ? (
                                            <button onClick={async () => {
                                                if (!confirm('Confirm this vehicle seizure has been released and returned to its original owner?')) return;
                                                await addEvent({
                                                    type: 'FLAG_UPDATED',
                                                    actor: actorId,
                                                    tokenId: searchResult.tokenId,
                                                    payload: { flag: 'seized', value: false }
                                                });
                                                alert('Vehicle seizure cleared. Status returned to NONE.');
                                            }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--success)', color: 'var(--success)' }}>
                                                RETURN TO OWNER
                                            </button>
                                        ) : (
                                            <button onClick={async () => {
                                                const courtOrder = prompt('Enter Court Order Number:');
                                                if (!courtOrder) return;
                                                await addEvent({
                                                    type: 'FLAG_UPDATED',
                                                    actor: actorId,
                                                    tokenId: searchResult.tokenId,
                                                    payload: { flag: 'seized', value: true, caseDocUrl: courtOrder, ref: 'CRT-' + Date.now() }
                                                });
                                                alert('Vehicle flagged as SEIZURE. Transfer locked.');
                                            }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                                                SEIZE
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-secondary">Major Accident</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {searchResult.flags.majorAccident ? <span className="badge badge-danger">MAJOR DAMAGE</span> : <span className="badge badge-success">CLEAN</span>}
                                        <button onClick={async () => {
                                            if (!confirm(searchResult.flags.majorAccident ? "Confirm vehicle has passed structural inspection? This will clear the Major Accident flag." : "Confirm Major Accident?")) return;
                                            await addEvent({
                                                type: 'FLAG_UPDATED',
                                                actor: actorId,
                                                tokenId: searchResult.tokenId,
                                                payload: { flag: 'major_accident', value: !searchResult.flags.majorAccident, reason: 'Inspection Report', ref: 'INSP-' + Date.now() }
                                            });
                                        }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                                            {searchResult.flags.majorAccident ? 'REVERT' : 'DECLARE'}
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-secondary">Salvage Only</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {searchResult.flags.totalLoss ? <span className="badge badge-danger">TOTAL LOSS</span> : <span className="badge badge-success">NO</span>}
                                        <button onClick={async () => {
                                            if (!confirm(searchResult.flags.totalLoss ? "Confirm vehicle has passed structural inspection? This will clear the Total Loss flag." : "Confirm Total Loss? This action significantly devalues the asset.")) return;
                                            await addEvent({
                                                type: 'FLAG_UPDATED',
                                                actor: actorId,
                                                tokenId: searchResult.tokenId,
                                                payload: { flag: 'total_loss', value: !searchResult.flags.totalLoss, reason: 'Insurance/Inspection Report', ref: 'DMG-' + Date.now() }
                                            });
                                        }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                                            {searchResult.flags.totalLoss ? 'REVERT' : 'DECLARE'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="section-card">
                            <div className="card-accent yellow" />
                            <h3 className="section-title">
                                <span className="icon-wrap yellow"><Settings size={20} color="var(--warning)" /></span>
                                Legal Modification
                            </h3>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Assign New Plate No.</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <input value={plateNumber} onChange={e => setPlateNumber(e.target.value)} placeholder="e.g. 7กพ-9999" style={{ marginBottom: 0 }} />
                                    <button onClick={async () => {
                                        if (!plateNumber) return;
                                        await addEvent({
                                            type: 'PLATE_EVENT_RECORDED',
                                            actor: actorId,
                                            tokenId: searchResult.tokenId,
                                            payload: { action: 'change', plateNo: plateNumber, province: 'Bangkok', date: new Date().toISOString() }
                                        });
                                    }} style={{ fontSize: '0.8rem' }}>Change Plate</button>
                                </div>
                            </div>

                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Update Vehicle Attributes</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <input value={newColor} onChange={e => setNewColor(e.target.value)} placeholder="New Color..." style={{ marginBottom: 0 }} />
                                    <button onClick={handleUpdateColor} style={{ fontSize: '0.8rem' }}>Update Spec</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="section-card empty-state">
                    <Book size={48} className="empty-icon" />
                    <p>Enter a valid VIN to retrieve official registration records.</p>
                </div>
            )}
        </div>
    );
};
