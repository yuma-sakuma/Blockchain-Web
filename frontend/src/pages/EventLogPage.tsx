import { ethers } from 'ethers';
import { Activity, FileSearch, Layers, RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ABIS, CONTRACT_ADDRESSES, getGanacheProvider } from '../config/contracts';

interface OnChainEvent {
  contractName: string;
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  args: any;
  rawHashes: string[]; // extracted bytes32 strings for matching
}

// Interfaces to decode logs
const lifecycleInterface = new ethers.Interface(ABIS.VEHICLE_LIFECYCLE);
const registryInterface = new ethers.Interface(ABIS.VEHICLE_REGISTRY);
const nftInterface = new ethers.Interface(ABIS.VEHICLE_NFT);

export const EventLogPage = () => {
  const [events, setEvents] = useState<OnChainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Document Verification State
  const [verifyHash] = useState<string | null>(null);
  // const [verifyFile, setVerifyFile] = useState<File | null>(null);
  // const [matchFound, setMatchFound] = useState<boolean | null>(null);

  // Off-Chain Database Mapping
  const [dbPayloads, setDbPayloads] = useState<Record<string, any>>({});

  // Transaction Details State
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [txLoading, setTxLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const provider = getGanacheProvider();
      
      const lifecycle = new ethers.Contract(CONTRACT_ADDRESSES.VEHICLE_LIFECYCLE, ABIS.VEHICLE_LIFECYCLE, provider);
      const registry = new ethers.Contract(CONTRACT_ADDRESSES.VEHICLE_REGISTRY, ABIS.VEHICLE_REGISTRY, provider);
      const nft = new ethers.Contract(CONTRACT_ADDRESSES.VEHICLE_NFT, ABIS.VEHICLE_NFT, provider);

      // Query all logs from block 0 to latest
      const [lLogs, rLogs, nLogs] = await Promise.all([
        lifecycle.queryFilter('*', 0, 'latest'),
        registry.queryFilter('*', 0, 'latest'),
        nft.queryFilter('*', 0, 'latest')
      ]);

      const allLogs = [
        ...lLogs.map(l => ({ log: l as ethers.EventLog, contractName: 'Lifecycle' })),
        ...rLogs.map(l => ({ log: l as ethers.EventLog, contractName: 'Registry' })),
        ...nLogs.map(l => ({ log: l as ethers.EventLog, contractName: 'NFT' }))
      ];

      // Sort by block number descending
      allLogs.sort((a, b) => b.log.blockNumber - a.log.blockNumber);

      // Get unique block numbers to fetch timestamps
      const blockNumbers = [...new Set(allLogs.map(x => x.log.blockNumber))];
      const blockTimes: Record<number, number> = {};
      
      // Fetch block timestamps in parallel chunks to avoid overwhelming the RPC
      const chunkSize = 10;
      for (let i = 0; i < blockNumbers.length; i += chunkSize) {
        const chunk = blockNumbers.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (num) => {
          if (!blockTimes[num]) {
            const b = await provider.getBlock(num);
            if (b) blockTimes[num] = b.timestamp * 1000;
          }
        }));
      }

      const formattedEvents: OnChainEvent[] = allLogs.map(({ log, contractName }) => {
        let args: any = {};
        const rawHashes: string[] = [];
        
        try {
          if (log.args) {
            args = Object.fromEntries(
              Object.entries(log.args)
                .filter(([key]) => isNaN(Number(key))) // Filter out numeric index keys
            );
            
            // Extract any bytes32 that could be a hash (length 66)
            Object.values(args).forEach(val => {
              if (typeof val === 'string' && val.length === 66 && val.startsWith('0x')) {
                rawHashes.push(val);
              }
              // If it's an array of evidence hashes
              if (Array.isArray(val)) {
                val.forEach(v => {
                  if (typeof v === 'string' && v.length === 66 && v.startsWith('0x')) {
                    rawHashes.push(v);
                  }
                });
              }
            });
          }
        } catch (e) {}

        return {
          contractName,
          eventName: log.eventName || 'Unknown',
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp: blockTimes[log.blockNumber] || Date.now(),
          args,
          rawHashes
        };
      });

      setEvents(formattedEvents);
    } catch (error) {
      console.error("Error fetching on-chain events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDbEvents = async () => {
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${url}/events`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, any> = {};
        data.forEach((e: any) => {
          if (e.txHash) {
            map[e.txHash] = e;
          }
        });
        setDbPayloads(map);
      }
    } catch (e) {
      console.error("Failed to fetch DB events:", e);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchDbEvents();
  }, []);

  // const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   setVerifyFile(file);
    
  //   // Hash file using ethers keccak256
  //   const reader = new FileReader();
  //   reader.onload = async (ev) => {
  //     const arrayBuffer = ev.target?.result as ArrayBuffer;
  //     const uint8Array = new Uint8Array(arrayBuffer);
  //     const hash = ethers.keccak256(uint8Array);
  //     setVerifyHash(hash);
      
  //     // Search if hash exists in our events
  //     const exists = events.some(evt => evt.rawHashes.includes(hash));
  //     setMatchFound(exists);
  //   };
  //   reader.readAsArrayBuffer(file);
  // };

  const filteredEvents = events.filter(e => 
    e.transactionHash.toLowerCase().includes(search.toLowerCase()) ||
    e.eventName.toLowerCase().includes(search.toLowerCase()) ||
    e.rawHashes.some(h => h.toLowerCase() === search.toLowerCase())
  );

  const handleTxClick = async (txHash: string) => {
    try {
      setTxLoading(true);
      setSelectedTx({ txHash }); // Optimistic open
      const provider = getGanacheProvider();
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash)
      ]);

      // Decode Logs
      const decodedLogs = receipt?.logs.map((log: any) => {
        let parsed = null;
        let contract = 'Unknown';
        try { parsed = lifecycleInterface.parseLog(log); contract = 'VehicleLifecycle'; } catch(e) {}
        if (!parsed) try { parsed = registryInterface.parseLog(log); contract = 'VehicleRegistry'; } catch(e) {}
        if (!parsed) try { parsed = nftInterface.parseLog(log); contract = 'VehicleNFT'; } catch(e) {}

        if (parsed) {
          const args = Object.fromEntries(
            Object.entries(parsed.args).filter(([key]) => isNaN(Number(key)))
          );
          return { name: parsed.name, args, contract };
        }
        return { name: 'Unknown Event / Transfer', args: { data: log.data }, contract: 'Unknown' };
      }) || [];

      // Decode Input Data (tx.data)
      let decodedInput = null;
      const interfacesToTry = [
        { name: 'VehicleLifecycle', iface: lifecycleInterface },
        { name: 'VehicleRegistry', iface: registryInterface },
        { name: 'VehicleNFT', iface: nftInterface }
      ];
      if (ABIS.VEHICLE_LIEN) interfacesToTry.push({ name: 'VehicleLien', iface: new ethers.Interface(ABIS.VEHICLE_LIEN) });
      if (ABIS.VEHICLE_CONSENT) interfacesToTry.push({ name: 'VehicleConsent', iface: new ethers.Interface(ABIS.VEHICLE_CONSENT) });

      if (tx && tx.data && tx.data !== '0x') {
        for (const { name, iface } of interfacesToTry) {
          try {
            const parsed = iface.parseTransaction({ data: tx.data, value: tx.value });
            if (parsed) {
              const argsInfo = parsed.fragment.inputs.map((input, idx) => ({
                name: input.name || `Param ${idx + 1}`,
                type: input.type,
                value: parsed.args[idx].toString()
              }));
              decodedInput = {
                name: parsed.name,
                contract: name,
                args: argsInfo
              };
              break;
            }
          } catch(e) {}
        }
      }

      setSelectedTx({ tx, receipt, txHash, decodedLogs, decodedInput });
    } catch (e) {
      console.error(e);
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <>
      {/* Transaction Details Modal - Moved outside page-container to avoid CSS transform containing block issues */}
      {selectedTx && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedTx(null)}>
          <div style={{ width: '800px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedTx(null)} style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity color="var(--accent-primary)" /> Transaction Details
            </h2>
            
            {txLoading && !selectedTx.tx ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}><RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto' }} /> Fetching from Node...</div>
            ) : selectedTx.tx && selectedTx.receipt ? (
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '12px', alignItems: 'center' }}>
                  <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Tx Hash</div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>{selectedTx.tx.hash}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '12px' }}>
                    <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>From</div>
                    <div style={{ fontFamily: 'monospace', color: 'white', wordBreak: 'break-all' }}>{selectedTx.tx.from}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '12px' }}>
                    <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>To (Contract)</div>
                    <div style={{ fontFamily: 'monospace', color: 'white', wordBreak: 'break-all' }}>{selectedTx.tx.to || 'Contract Creation'}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '12px' }}>
                    <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Block</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedTx.receipt.blockNumber}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '12px' }}>
                    <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Gas Used</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedTx.receipt.gasUsed?.toString()} units</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '12px' }}>
                    <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Status</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: selectedTx.receipt.status === 1 ? 'var(--success)' : 'var(--danger)' }}>
                      {selectedTx.receipt.status === 1 ? 'SUCCESS (1)' : 'REVERTED (0)'}
                    </div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '12px' }}>
                  <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Raw Input Data (On-Chain Payload)</div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.85rem', wordBreak: 'break-all', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {selectedTx.tx.data}
                  </div>
                </div>

                {/* Decoded Transaction Payload */}
                {selectedTx.decodedInput && (
                  <div style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div className="text-secondary" style={{ color: '#a855f7', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={14} /> On-Chain Decoded Payload (Function Call)
                    </div>
                    
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>{selectedTx.decodedInput.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{selectedTx.decodedInput.contract}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedTx.decodedInput.args.map((arg: any, i: number) => (
                          <div key={i} style={{ fontSize: '0.85rem', wordBreak: 'break-all', display: 'grid', gridTemplateColumns: 'minmax(140px, max-content) 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{arg.name} <span style={{fontSize: '0.7rem', opacity: 0.5}}>({arg.type})</span></span>
                            <span style={{ color: 'white', fontFamily: 'monospace' }}>{arg.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {dbPayloads[selectedTx.txHash] && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div className="text-secondary" style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={14} /> Off-Chain Decoded Payload (From Indexer)
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                       <div>
                         <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>EVENT TYPE</span>
                         <div style={{ fontWeight: 700 }}>{dbPayloads[selectedTx.txHash].type}</div>
                       </div>
                       <div>
                         <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>ACTOR</span>
                         <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{dbPayloads[selectedTx.txHash].actor}</div>
                       </div>
                    </div>

                    <div>
                       <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>JSON PAYLOAD</span>
                       <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', overflowX: 'auto', marginTop: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                         {JSON.stringify(dbPayloads[selectedTx.txHash].payload, null, 2)}
                       </pre>
                    </div>

                    {dbPayloads[selectedTx.txHash].evidence && dbPayloads[selectedTx.txHash].evidence.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                         <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>DOCUMENT EVIDENCE</span>
                         <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                           {dbPayloads[selectedTx.txHash].evidence.map((ev: any, i: number) => (
                             <a key={i} href={ev.url || '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', textDecoration: 'none', fontSize: '0.85rem' }}>
                               <FileSearch size={14} color="var(--accent-primary)" /> {ev.hash ? ev.hash.substring(0, 10) + '...' : 'Document ' + (i+1)}
                             </a>
                           ))}
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Emitted Events (Receipt Logs) */}
                {selectedTx.decodedLogs && selectedTx.decodedLogs.length > 0 && (
                  <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div className="text-secondary" style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={14} /> Emitted Events (Receipt Logs)
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {selectedTx.decodedLogs.map((log: any, i: number) => (
                        <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{log.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{log.contract}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {Object.entries(log.args).map(([k, v]) => (
                              <div key={k} style={{ fontSize: '0.85rem', wordBreak: 'break-all', display: 'grid', gridTemplateColumns: 'minmax(100px, max-content) 1fr', gap: '1rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{k}:</span>
                                <span style={{ color: 'white', fontFamily: 'monospace' }}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--danger)' }}>Failed to load transaction details.</div>
            )}
          </div>
        </div>
      )}

      <div className="page-container wide">
        <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', background: 'var(--success)', filter: 'blur(120px)', opacity: 0.1, pointerEvents: 'none' }}></div>
          <div>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: '0.5rem', background: 'linear-gradient(to right, #ffffff, var(--success))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              On-Chain Explorer
            </h1>
            <p className="text-secondary" style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.5px' }}>
              A transparent cryptographic ledger directly verifying smart contract events.
            </p>
          </div>
          <button onClick={fetchEvents} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={loading}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Sync from RPC
          </button>
        </header>

      {/* Document Verification Section
      <div className="card" style={{ padding: '2.5rem', marginBottom: '3rem', border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%)' }}>
        <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={24} color="var(--success)" /> Document Verification
            </h3>
            <p className="text-secondary" style={{ lineHeight: 1.6, marginBottom: '2rem' }}>
              Verify if an off-chain document or image truly exists on the ledger. Upload a local file to generate its cryptographic proof (Keccak-256) and check it against on-chain evidence anchors.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <label style={{ cursor: 'pointer', padding: '1rem 2rem', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--success)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              >
                <Upload size={20} color="var(--success)" />
                <span style={{ fontWeight: 600 }}>Select File to Anchor</span>
                <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            </div>
          </div>
          
          {verifyFile && (
            <div style={{ flex: 1, padding: '2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <FileSearch size={24} className="text-secondary" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{verifyFile.name}</div>
                  <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{(verifyFile.size / 1024).toFixed(2)} KB</div>
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Hash size={14}/> Computed Keccak-256 Hash</div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-primary)', wordBreak: 'break-all', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {verifyHash || 'Computing...'}
                </div>
              </div>

              {matchFound !== null && (
                <div style={{ padding: '1rem', borderRadius: '12px', border: matchFound ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', background: matchFound ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {matchFound ? <CheckCircle2 size={24} color="var(--success)" /> : <Activity size={24} color="var(--danger)" />}
                  <div>
                    <div style={{ fontWeight: 800, color: matchFound ? 'var(--success)' : 'var(--danger)' }}>
                      {matchFound ? 'CRYPTO-PROOF VERIFIED' : 'NO ANCHOR FOUND'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {matchFound ? 'This file perfectly matches an immutable on-chain record.' : 'This file was not found in the blockchain history.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div> */}

      {/* Explorer Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '1.5rem 2rem', background: 'var(--bg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
            <Layers size={20} color="var(--accent-primary)" /> Ledger Events
          </h3>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input
              type="text"
              placeholder="Search Events or Hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
            />
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'rgba(255,255,255,0.02)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <tr>
                <th style={{ padding: '1.25rem 2rem', color: 'var(--text-secondary)' }}>Block / Time</th>
                <th style={{ padding: '1.25rem 2rem', color: 'var(--text-secondary)' }}>Event</th>
                <th style={{ padding: '1.25rem 2rem', color: 'var(--text-secondary)' }}>Arguments / Hashes</th>
                <th style={{ padding: '1.25rem 2rem', color: 'var(--text-secondary)' }}>Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 1rem auto' }} />
                    Scanning Smart Contracts...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No immutable events found.</td>
                </tr>
              ) : (
                filteredEvents.map((e, idx) => {
                  const isVerifiedMatch = verifyHash && e.rawHashes.includes(verifyHash);
                  
                  return (
                    <tr key={`${e.transactionHash}-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: isVerifiedMatch ? 'rgba(34, 197, 94, 0.05)' : 'transparent', transition: 'background 0.3s' }}>
                      <td style={{ padding: '1.5rem 2rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}>#{e.blockNumber}</div>
                        <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{new Date(e.timestamp).toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '1.5rem 2rem', verticalAlign: 'top' }}>
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'inline-block' }}>{e.contractName}</span>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{e.eventName}</div>
                      </td>
                      <td style={{ padding: '1.5rem 2rem', verticalAlign: 'top', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {Object.entries(e.args).map(([k, v]) => {
                            let displayValue = String(v);
                            let isHashHighlight = false;
                            
                            if (typeof v === 'string' && v.length === 66 && v.startsWith('0x')) {
                              isHashHighlight = verifyHash === v;
                            }
                            
                            return (
                              <div key={k} style={{ fontSize: '0.85rem', wordBreak: 'break-all', padding: '0.5rem', background: isHashHighlight ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '6px', border: isHashHighlight ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600, marginRight: '0.5rem' }}>{k}:</span>
                                <span style={{ color: isHashHighlight ? 'var(--success)' : 'white', fontFamily: 'monospace' }}>{displayValue}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '1.5rem 2rem', verticalAlign: 'top' }}>
                         <button 
                           onClick={() => handleTxClick(e.transactionHash)}
                           style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent-secondary)', wordBreak: 'break-all', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                           onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                           onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'; }}
                         >
                           {e.transactionHash}
                         </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </>
  );
};
