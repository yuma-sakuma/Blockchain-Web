import { CheckCircle, ClipboardCheck, Search, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';

export const InspectionPage = () => {
    const { vehicles, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [searchVin, setSearchVin] = useState('');
    const [result, setResult] = useState<'pass' | 'fail'>('pass');
    const [co2, setCo2] = useState(120);
    
    const inspectorId = address ? `INSPECTION:${address}` : "INSPECTION:Tor-Ror-Or-099";
    
    const vehicle = vehicles.find(v => v.vin === searchVin);

    const handleSubmitResult = () => {
        if (!vehicle) return;

        addEvent({
            type: 'INSPECTION_RESULT_RECORDED',
            actor: inspectorId,
            tokenId: vehicle.tokenId,
            payload: {
                stationId: inspectorId,
                result: result,
                metrics: { co2_g_km: co2, brake_efficiency: '90%' },
                validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year validity
                certHash: "CERT-" + Date.now()
            }
        });

        if (result === 'pass') {
            alert("Inspection Passed! Certificate Issued.");
        } else {
            alert("Inspection Failed. Repair required.");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Inspection Center (Tor-Ror-Or)</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Annual Vehicle Inspection for Registration Renewal.</p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', padding: '0.5rem', background: 'var(--bg-card)', display: 'inline-block', borderRadius: '4px' }}>
                    Identity: <span style={{ color: 'var(--accent-primary)' }}>{inspectorId}</span>
                </div>
            </header>

            <div className="card">
                 <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search size={20} color="var(--accent-primary)" />
                    Inspect Vehicle
                </h2>
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <input 
                        value={searchVin}
                        onChange={e => setSearchVin(e.target.value)}
                        placeholder="Enter VIN..."
                    />
                </div>

                {vehicle && (
                    <div style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0 }}>{vehicle.makeModelTrim}</h3>
                        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>VIN: {vehicle.vin}</div>

                        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Emission (CO2 g/km)</label>
                                <input 
                                    type="number" 
                                    value={co2}
                                    onChange={e => setCo2(Number(e.target.value))}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Result</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button 
                                        onClick={() => setResult('pass')}
                                        style={{ 
                                            flex: 1, 
                                            background: result === 'pass' ? 'var(--success)' : 'transparent',
                                            border: '1px solid var(--success)',
                                            color: result === 'pass' ? 'black' : 'var(--success)'
                                        }}
                                    >
                                        <CheckCircle size={16} style={{ display: 'inline', marginRight: '5px' }} />
                                        PASS
                                    </button>
                                    <button 
                                        onClick={() => setResult('fail')}
                                        style={{ 
                                            flex: 1, 
                                            background: result === 'fail' ? 'var(--danger)' : 'transparent',
                                            border: '1px solid var(--danger)',
                                            color: result === 'fail' ? 'white' : 'var(--danger)'
                                        }}
                                    >
                                        <XCircle size={16} style={{ display: 'inline', marginRight: '5px' }} />
                                        FAIL
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button className="premium-btn" onClick={handleSubmitResult}>
                            <ClipboardCheck size={18} style={{ marginRight: '0.5rem' }} />
                            Submit Result
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
