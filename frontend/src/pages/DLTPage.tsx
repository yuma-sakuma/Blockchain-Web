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
    const [isRepairing, setIsRepairing] = useState(false);

    // Dynamic Actor ID
    const actorId = address ? `DLT:${address}` : 'DLT:System';

    const handleRepair = async () => {
        if (!confirm("This will attempt to re-mint database vehicles onto the blockchain if they are missing. Use this after a Ganache reset. Proceed?")) return;
        setIsRepairing(true);
        try {
            const { repairRegistry } = await import('../services/api');
            const result = await repairRegistry();
            const count = result.results.filter((r: any) => r.status === 'recovered').length;
            alert(`Repair complete. Recovered ${count} vehicles. Please refresh your inventory.`);
            window.location.reload(); // Refresh to get new tokenIds
        } catch (err: any) {
            alert("Repair failed: " + err.message);
        } finally {
            setIsRepairing(false);
        }
    };

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
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <header>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Land Transport Authority</h1>
                <p className="text-secondary">Official registry for vehicle identities, license plates, and legal flags.</p>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-info">Logged in as {actorId}</span>
                    <button 
                        onClick={handleRepair} 
                        disabled={isRepairing}
                        style={{ 
                            fontSize: '0.8rem', 
                            padding: '0.4rem 0.8rem', 
                            border: '1px solid var(--warning)', 
                            color: 'var(--warning)',
                            background: isRepairing ? 'rgba(255,193,7,0.1)' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {isRepairing ? 'Repairing Registry...' : 'Repair Central Registry'}
                        <Settings size={14} />
                    </button>
                </div>
            </header>

            <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Search color="var(--accent-primary)" size={20} />
                    Lookup Central Registry
                </h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        value={searchVin}
                        onChange={(e) => setSearchVin(e.target.value)}
                        placeholder="Enter Chassis Number (VIN)..."
                        style={{ marginBottom: 0 }}
                    />
                    <button className="premium-btn">Query Asset</button>
                </div>
            </div>

            {searchResult ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="card">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Book color="var(--success)" size={20} />
                                Registration Status
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Current State</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                        {searchResult.registration.isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>License Plate</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{searchResult.registration.plateNo || searchResult.spec.plateNo || 'None'}</div>
                                </div>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Registered Color</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{searchResult.spec.color}</div>
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

                        <div className="card">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <History color="var(--accent-primary)" size={20} />
                                Official Plate History
                            </h3>
                            {plateEvents.length === 0 ? <p className="text-secondary">No plate changes recorded.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {plateEvents.map((pe, idx) => (
                                        <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 700 }}>{pe.payload.plateNo}</span>
                                                <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{new Date(pe.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{pe.payload.province} — Action: {pe.payload.action.toUpperCase()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="card" style={{ border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)', marginBottom: '1.5rem' }}>
                                <ShieldAlert size={20} />
                                Enforcement Flags
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-secondary">Loss/Theft</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {searchResult.flags.stolen ? <span className="badge badge-danger">STOLEN</span> : <span className="badge badge-success">CLEAN</span>}
                                        <button onClick={async () => {
                                            const reason = prompt("Enter Police Report / Case Number:");
                                            if (!reason) return;
                                            await addEvent({
                                                type: 'FLAG_UPDATED',
                                                actor: actorId,
                                                tokenId: searchResult.tokenId,
                                                payload: { flagType: 'stolen', value: !searchResult.flags.stolen, reason, ref: 'POL-' + Date.now() }
                                            });
                                        }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                                            {searchResult.flags.stolen ? 'REVOKE' : 'REPORT'}
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-secondary">Legal Seizure</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {searchResult.flags.seized ? <span className="badge badge-danger">SEIZED</span> : <span className="badge badge-success">NONE</span>}
                                        <button onClick={async () => {
                                            const reason = prompt("Enter Court Order Number:");
                                            if (!reason) return;
                                            await addEvent({
                                                type: 'FLAG_UPDATED',
                                                actor: actorId,
                                                tokenId: searchResult.tokenId,
                                                payload: { flagType: 'seized', value: !searchResult.flags.seized, reason, ref: 'CRT-' + Date.now() }
                                            });
                                        }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                                            {searchResult.flags.seized ? 'RELEASE' : 'SEIZE'}
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-secondary">Salvage Only</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {searchResult.flags.totalLoss ? <span className="badge badge-danger">TOTAL LOSS</span> : <span className="badge badge-success">NO</span>}
                                        <button onClick={async () => {
                                            if (!confirm("Confirm Total Loss? This action significantly devalues the asset.")) return;
                                            await addEvent({
                                                type: 'FLAG_UPDATED',
                                                actor: actorId,
                                                tokenId: searchResult.tokenId,
                                                payload: { flagType: 'totalLoss', value: !searchResult.flags.totalLoss, reason: 'Insurance/Inspection Report', ref: 'DMG-' + Date.now() }
                                            });
                                        }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                                            {searchResult.flags.totalLoss ? 'REVERT' : 'DECLARE'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <Settings size={20} color="var(--warning)" />
                                Legal Modification
                            </h3>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Assign New Plate No.</label>
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
                                <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Update Vehicle Attributes</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <input value={newColor} onChange={e => setNewColor(e.target.value)} placeholder="New Color..." style={{ marginBottom: 0 }} />
                                    <button onClick={handleUpdateColor} style={{ fontSize: '0.8rem' }}>Update Spec</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                    <Book size={48} style={{ margin: '0 auto 1.5rem auto' }} />
                    <p>Enter a valid VIN to retrieve official registration records.</p>
                </div>
            )}
        </div>
    );
};
