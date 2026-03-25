import { AlertCircle, ArrowRightLeft, CheckCircle, CreditCard, DollarSign, FileText, History, Image, Lock, Shield, ShieldCheck, ShoppingCart, Trash2, User, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/AuthContext';
import { blockchainService } from '../services/blockchain';
import { getWalletForRole } from '../config/contracts';
import { useVehicleStore } from '../store';
import { uploadFile } from '../services/api';

const API_BASE = 'http://localhost:3000';

export const ConsumerPage = () => {
  const { vehicles, events, addEvent } = useVehicleStore();
  const { address } = useAuth();
  const [showGreenBook, setShowGreenBook] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [processingPurchase, setProcessingPurchase] = useState<string | null>(null);

  // Sale modal state
  const [saleModal, setSaleModal] = useState<{ tokenId: string; vin: string; model: string } | null>(null);
  const [saleBuyerAddress, setSaleBuyerAddress] = useState('');
  const [salePrice, setSalePrice] = useState('');

  // Claim modal state
  const [claimModal, setClaimModal] = useState<{ tokenId: string; vin: string; model: string } | null>(null);
  const [claimDescription, setClaimDescription] = useState('');
  const [claimSeverity, setClaimSeverity] = useState('minor');
  const [claimFiles, setClaimFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Dynamic User ID — raw address for blockchain, prefixed for display only
  const currentUser = address || 'UNKNOWN';
  const displayUser = address ? `${address.substring(0, 6)}...` : 'Guest';

  // Address format normalization for robust matching
  const normalizedAddress = address?.toLowerCase() || '';
  
  const myVehicles = vehicles.filter(v => {
      const ownerLower = v.currentOwner.toLowerCase();
      return ownerLower === normalizedAddress;
  });

  // Find pending purchase offers for this consumer
  const pendingOffers = vehicles.filter(v => 
      v.pendingPurchase && 
      v.pendingPurchase.buyer.toLowerCase() === normalizedAddress
  );

  // Insurance: vehicles with expiring policies (within 30 days)
  const now = new Date();
  const expiringVehicles = myVehicles.filter(v => {
      if (!v.insurance || !v.insurance.validUntil) return false;
      const expiry = new Date(v.insurance.validUntil);
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
      return daysLeft <= 30 && daysLeft > 0;
  });

  // --- Sale Modal Handlers (Consumer-to-Consumer) ---
  const handleOpenSaleModal = (tokenId: string) => {
    const vehicle = vehicles.find(v => v.tokenId === tokenId);
    if (!vehicle) return;
    if (vehicle.lien.transferLocked) {
      alert("SECURITY BLOCK: This asset is LOCKED by an active finance lien.");
      return;
    }
    if (vehicle.pendingPurchase) {
      alert("This vehicle already has a pending offer.");
      return;
    }
    setSaleModal({ tokenId, vin: vehicle.vin, model: vehicle.makeModelTrim });
    setSaleBuyerAddress('');
    setSalePrice('');
  };

  // --- Claim Modal Handlers ---
  const handleOpenClaimModal = (tokenId: string) => {
    const vehicle = vehicles.find(v => v.tokenId === tokenId);
    if (!vehicle) return;
    if (!vehicle.insurance) {
      alert('This vehicle has no active insurance policy. Please contact your insurer first.');
      return;
    }
    if (vehicle.activeClaim && !['repaired', 'rejected'].includes(vehicle.activeClaim.status)) {
      alert(`This vehicle already has an active claim: ${vehicle.activeClaim.claimId} (${vehicle.activeClaim.status})`);
      return;
    }
    setClaimModal({ tokenId, vin: vehicle.vin, model: vehicle.makeModelTrim });
    setClaimDescription('');
    setClaimSeverity('minor');
    setClaimFiles([]);
  };

  const handleClaimFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await uploadFile(file);
        setClaimFiles(prev => [...prev, result]);
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('File upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmitClaim = async () => {
    if (!claimModal || !claimDescription) return;
    await addEvent({
      type: 'CLAIM_FILED',
      actor: currentUser,
      tokenId: claimModal.tokenId,
      payload: {
        claimId: 'CLM-' + Date.now(),
        date: new Date().toISOString(),
        description: claimDescription,
        severity: claimSeverity,
        evidenceHashes: claimFiles.map(f => f.hash)
      },
      evidence: claimFiles.length > 0
        ? claimFiles.map(f => ({ hash: f.hash, url: f.path, mime: f.mime, size: f.size }))
        : undefined
    });
    setClaimModal(null);
    alert('✅ Claim filed successfully! Your insurer will review your claim.');
  };

  const handleSubmitSale = async () => {
    if (!saleModal || !saleBuyerAddress || !salePrice) return;

    if (saleBuyerAddress.toLowerCase() === normalizedAddress) {
      alert('ไม่สามารถขาย/โอนรถให้ตัวเองได้');
      return;
    }

    const priceNum = parseFloat(salePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('กรุณาใส่ราคาที่ถูกต้อง');
      return;
    }

    await addEvent({
      type: 'PURCHASE_OFFER_CREATED',
      actor: currentUser,
      tokenId: saleModal.tokenId,
      payload: {
        seller: currentUser,
        sellerRole: 'CONSUMER',
        buyer: saleBuyerAddress,
        price: priceNum,
        currency: 'ETH',
        offeredAt: new Date().toISOString()
      }
    });

    setSaleModal(null);
    alert(`✅ สร้างข้อเสนอขายเรียบร้อย!\n\nรอ ${saleBuyerAddress.substring(0, 8)}... ยืนยัน`);
  };

  const handleAcceptAndPay = async (tokenId: string) => {
    const vehicle = vehicles.find(v => v.tokenId === tokenId);
    if (!vehicle?.pendingPurchase) return;

    const { seller, price, currency } = vehicle.pendingPurchase;

    if (!confirm(`ยืนยันการซื้อรถ ${vehicle.makeModelTrim}\n\nราคา: ${price} ${currency}\nผู้ขาย: ${seller.substring(0, 10)}...\n\nETH จะถูกหักจาก wallet ของคุณทันที`)) {
      return;
    }

    setProcessingPurchase(tokenId);

    try {
      // 1. Send ETH payment from consumer wallet to seller wallet
      const role = sessionStorage.getItem('auth_role') || 'CONSUMER';
      const consumerWallet = getWalletForRole(role);
      if (!consumerWallet) {
        alert('ไม่พบ wallet สำหรับ role นี้');
        return;
      }

      const paymentResult = await blockchainService.sendPayment(
        consumerWallet,
        seller,
        price.toString()
      );

      // Determine seller role from pendingPurchase (populated by PURCHASE_OFFER_CREATED payload)
      const sellerRole = (vehicle.pendingPurchase as any).sellerRole || 'DEALER';

      // 2. Record consent/payment event — this also triggers ownership transfer via seller wallet in store
      await addEvent({
        type: 'PURCHASE_CONSENT_GIVEN',
        actor: currentUser,
        tokenId: tokenId,
        payload: {
          buyer: currentUser,
          seller: seller,
          sellerRole: sellerRole,
          reason: sellerRole === 'CONSUMER' ? 'resale' : 'first_sale',
          price: price,
          currency: currency,
          paymentTxHash: paymentResult.txHash,
          consentedAt: new Date().toISOString()
        }
      });

      alert(`✅ ซื้อรถสำเร็จ!\n\nPayment TX: ${paymentResult.txHash.substring(0, 20)}...`);
    } catch (err: any) {
      console.error('Purchase failed:', err);
      alert(`❌ การซื้อล้มเหลว: ${err.message}`);
    } finally {
      setProcessingPurchase(null);
    }
  };

  const handleDeclineOffer = async (tokenId: string) => {
    if (!confirm('ปฏิเสธข้อเสนอนี้?')) return;
    // Simply record a consent revocation to clear the pending offer
    await addEvent({
      type: 'PURCHASE_CONSENT_GIVEN', // Reuse to clear pendingPurchase, with declined flag
      actor: currentUser,
      tokenId: tokenId,
      payload: {
        buyer: currentUser,
        declined: true,
        declinedAt: new Date().toISOString()
      }
    });
  };

  const handleGrantConsent = async (tokenId: string, granteeOverride?: string) => {
    const grantee = granteeOverride || prompt("Target Entity ID (e.g. DEALER:0x... or INSURER:0x...):");
    if (!grantee) return;

    await addEvent({
      type: 'CONSENT_UPDATED',
      actor: currentUser,
      tokenId: tokenId,
      payload: {
        owner: currentUser,
        grantTo: grantee,
        permissions: {
          showPersonalData: false,
          showFullMaintenance: true,
          showClaims: true
        },
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
      }
    });
  };

  const handleRevokeConsent = async (tokenId: string, grantee: string) => {
      if (!confirm(`Revoke access for ${grantee}?`)) return;
      await addEvent({
          type: 'CONSENT_REVOKED',
          actor: currentUser,
          tokenId: tokenId,
          payload: {
              owner: currentUser,
              revokeFrom: grantee,
              revokedAt: new Date().toISOString()
          }
      });
  };

  const selectedVehicle = vehicles.find(v => v.tokenId === (showGreenBook || showPrivacy || showHistory));

  // Derive active consents
  const activeConsents = selectedVehicle ? events.filter(e => 
      e.type === 'CONSENT_UPDATED' && 
      e.tokenId === selectedVehicle.tokenId && 
      e.payload.owner.includes(address || 'x') &&
      new Date(e.payload.expiresAt) > new Date()
  ) : [];

  // Filter out revoked ones (rudimentary check)
  const revokedEvents = selectedVehicle ? events.filter(e => e.type === 'CONSENT_REVOKED' && e.tokenId === selectedVehicle.tokenId) : [];
  const validConsents = activeConsents.filter(ac => !revokedEvents.some(re => re.payload.revokeFrom === ac.payload.grantTo && new Date(re.timestamp) > new Date(ac.timestamp)));


  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Asset Wallet</h1>
           <p className="text-secondary">Manage your verified vehicle NFTs and privacy protocols.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <User size={20} color="var(--accent-primary)" />
            <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{displayUser}</span>
        </div>
      </header>

      {/* ═══════════ Insurance Expiry Notification ═══════════ */}
      {expiringVehicles.length > 0 && (
        <div style={{
          padding: '1rem 1.5rem', borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.05))',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <AlertCircle size={22} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.9rem' }}>⚠️ Insurance Expiring Soon</div>
            <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {expiringVehicles.map(v => {
                const daysLeft = Math.ceil((new Date(v.insurance!.validUntil).getTime() - now.getTime()) / 86400000);
                return `${v.makeModelTrim} (${daysLeft} days left)`;
              }).join(' • ')}
              {' — Please contact your insurer to renew.'}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Pending Purchase Offers Section ═══════════ */}
      {pendingOffers.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={24} color="#fbbf24" />
            Pending Purchase Offers
            <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', fontSize: '0.8rem' }}>
              {pendingOffers.length}
            </span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {pendingOffers.map(v => (
              <div key={v.tokenId} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{v.makeModelTrim}</h3>
                      <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0' }}>VIN: {v.vin}</p>
                    </div>
                    <span className="badge badge-info">{v.tokenId}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                      <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Color</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{v.spec.color}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                      <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Mileage</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{v.warranty.terms.mileageKm.toLocaleString()} KM</div>
                    </div>
                  </div>

                  {/* Price & Seller Info */}
                  <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(245, 158, 11, 0.05))', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Price</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>
                          <DollarSign size={18} style={{ display: 'inline', verticalAlign: 'middle' }} />
                          {v.pendingPurchase!.price} ETH
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Seller</div>
                        <div style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                          {v.pendingPurchase!.seller.substring(0, 8)}...{v.pendingPurchase!.seller.substring(38)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.25)', display: 'flex', gap: '1rem' }}>
                  <button
                    className="premium-btn"
                    onClick={() => handleAcceptAndPay(v.tokenId)}
                    disabled={processingPurchase === v.tokenId}
                    style={{ flex: 2, opacity: processingPurchase === v.tokenId ? 0.6 : 1 }}
                  >
                    {processingPurchase === v.tokenId ? (
                      <>⏳ Processing Payment...</>
                    ) : (
                      <><CheckCircle size={16} /> Accept & Pay {v.pendingPurchase!.price} ETH</>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeclineOffer(v.tokenId)}
                    disabled={processingPurchase === v.tokenId}
                    style={{ flex: 1, background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Digital Green Book Modal */}
      {showGreenBook && selectedVehicle && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: '#0a0a0b', border: '2px solid var(--success)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ShieldCheck size={32} color="var(--success)" />
                        <h2 style={{ margin: 0 }}>OFFICIAL DIGITAL REGISTRY</h2>
                      </div>
                      <button onClick={() => setShowGreenBook(null)} style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
                      <div>
                          <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Vehicle Identity</label>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{selectedVehicle.makeModelTrim}</div>
                          <div className="text-secondary" style={{ fontSize: '0.9rem' }}>VIN: {selectedVehicle.vin}</div>
                          <div className="text-secondary" style={{ fontSize: '0.9rem' }}>Token: {selectedVehicle.tokenId}</div>
                      </div>
                      <div>
                          <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Registration Details</label>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{selectedVehicle.registration?.plateNo || 'PENDING'}</div>
                          <div className="text-secondary" style={{ fontSize: '0.9rem' }}>Book No: {selectedVehicle.registration?.bookNo || 'N/A'}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <span className={`badge ${selectedVehicle.registration?.taxStatus === 'paid' ? 'badge-success' : 'badge-danger'}`}>{selectedVehicle.registration?.taxStatus === 'paid' ? 'TAX VALID' : 'TAX DUE'}</span>
                              <span className={`badge ${selectedVehicle.insurance ? 'badge-info' : 'badge-danger'}`}>{selectedVehicle.insurance ? 'INSURED' : 'UNINSURED'}</span>
                          </div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                          <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Verified Ownership History</label>
                          {events.filter(e => e.tokenId === selectedVehicle.tokenId && e.type === 'OWNERSHIP_TRANSFERRED').map((e, idx) => (
                              <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                  {new Date(e.timestamp).toLocaleDateString()} — Transfer to <span style={{ color: 'var(--accent-primary)' }}>{e.payload.to}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* Privacy Management Modal */}
      {showPrivacy && selectedVehicle && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: '#0a0a0b', border: '1px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ShieldCheck size={28} color="var(--accent-primary)" />
                        <h2 style={{ margin: 0 }}>Data Privacy Control</h2>
                      </div>
                      <button onClick={() => setShowPrivacy(null)} style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
                  </div>
                  
                  <div style={{ marginBottom: '2rem' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedVehicle.makeModelTrim}</div>
                      <div className="text-secondary">VIN: {selectedVehicle.vin}</div>
                  </div>

                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Active Access Grants</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                      {validConsents.length === 0 ? (
                           <div className="text-secondary" style={{ fontStyle: 'italic' }}>No active 3rd party access grants.</div>
                      ) : (
                          validConsents.map((c, idx) => (
                              <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                      <div style={{ fontWeight: 600 }}>{c.payload.grantTo}</div>
                                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Expires: {new Date(c.payload.expiresAt).toLocaleDateString()}</div>
                                  </div>
                                  <button onClick={() => handleRevokeConsent(selectedVehicle.tokenId, c.payload.grantTo)} style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>REVOKE</button>
                              </div>
                          ))
                      )}
                  </div>

                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Grant New Access</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <button onClick={() => handleGrantConsent(selectedVehicle.tokenId, 'INSURER:Generic')} className="btn" style={{ fontSize: '0.9rem' }}>+ Share w/ Insurance</button>
                      <button onClick={() => handleGrantConsent(selectedVehicle.tokenId, 'LENDER:Generic')} className="btn" style={{ fontSize: '0.9rem' }}>+ Share w/ Finance</button>
                      <button onClick={() => handleGrantConsent(selectedVehicle.tokenId, 'SERVICE:Generic')} className="btn" style={{ fontSize: '0.9rem' }}>+ Share w/ Service</button>
                      <button onClick={() => handleGrantConsent(selectedVehicle.tokenId)} className="btn" style={{ fontSize: '0.9rem' }}>+ Custom Entity...</button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* History Timeline Modal */}
      {showHistory && selectedVehicle && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: '#0a0a0b', border: '1px solid var(--accent-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <History size={28} color="var(--accent-secondary)" />
                        <h2 style={{ margin: 0 }}>Asset Lifecycle History</h2>
                      </div>
                      <button onClick={() => setShowHistory(null)} style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
                  </div>
                  
                  <div style={{ marginBottom: '2rem' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedVehicle.makeModelTrim}</div>
                      <div className="text-secondary">VIN: {selectedVehicle.vin}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {events.filter(e => e.tokenId === selectedVehicle.tokenId).map((e, idx) => (
                          <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid var(--accent-secondary)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{String(e.type).replace(/_/g, ' ')}</span>
                                  <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{new Date(e.timestamp).toLocaleDateString()}</span>
                              </div>
                              <div className="text-secondary" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                  Actor: {e.actor}
                              </div>
                              {(e as any).txHash && (
                                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-primary)', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                                      TX: {(e as any).txHash}
                                  </div>
                              )}
                          </div>
                      ))}
                      {events.filter(e => e.tokenId === selectedVehicle.tokenId).length === 0 && (
                          <p className="text-secondary" style={{ fontStyle: 'italic' }}>No history records found for this asset.</p>
                      )}
                  </div>
              </div>
          </div>,
          document.body
      )}

      <div>
         <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CreditCard size={24} color="var(--accent-primary)" />
            Verified Assets
         </h2>

         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
            {myVehicles.length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5 }}>You do not currently hold any vehicle NFTs associated with {displayUser}.</div>
            ) : (
                myVehicles.map(v => (
                    <div key={v.tokenId} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>{v.makeModelTrim}</h3>
                                {v.lien.status === 'active' && <Lock size={20} color="var(--danger)" />}
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>VIN Number</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{v.vin}</div>
                                </div>
                                <div>
                                    <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Odometer</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{(v.warranty?.terms?.mileageKm || 0).toLocaleString()} KM</div>
                                </div>
                            </div>

                            {/* ── Insurance Info ── */}
                            <div style={{ marginTop: '1.25rem', padding: '0.875rem', borderRadius: '10px', background: v.insurance ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)', border: `1px solid ${v.insurance ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Shield size={16} color={v.insurance ? '#10b981' : '#ef4444'} />
                                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                    {v.insurance ? 'Insured' : 'Uninsured'}
                                  </span>
                                </div>
                                {v.insurance && (() => {
                                  const daysLeft = Math.ceil((new Date(v.insurance.validUntil).getTime() - now.getTime()) / 86400000);
                                  return (
                                    <span className={`badge ${daysLeft <= 30 ? 'badge-warning' : daysLeft <= 0 ? 'badge-danger' : 'badge-success'}`}>
                                      {daysLeft <= 0 ? 'EXPIRED' : daysLeft <= 30 ? `${daysLeft}d left` : v.insurance.coverageType}
                                    </span>
                                  );
                                })()}
                              </div>
                              {v.insurance && (
                                <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                  Policy: {v.insurance.policyNumber} • Until: {new Date(v.insurance.validUntil).toLocaleDateString()}
                                </div>
                              )}

                              {/* Active Claim Status Tracker */}
                              {v.activeClaim && (
                                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Claim: {v.activeClaim.claimId}</span>
                                    <span className="badge" style={{
                                      fontSize: '0.6rem',
                                      background: v.activeClaim.status === 'filed' ? 'rgba(245,158,11,0.15)' : v.activeClaim.status === 'investigating' ? 'rgba(59,130,246,0.15)' : v.activeClaim.status === 'approved' ? 'rgba(16,185,129,0.15)' : v.activeClaim.status === 'repaired' ? 'rgba(139,92,246,0.15)' : 'rgba(239,68,68,0.15)',
                                      color: v.activeClaim.status === 'filed' ? '#f59e0b' : v.activeClaim.status === 'investigating' ? '#3b82f6' : v.activeClaim.status === 'approved' ? '#10b981' : v.activeClaim.status === 'repaired' ? '#8b5cf6' : '#ef4444',
                                      border: 'none'
                                    }}>
                                      {v.activeClaim.status.toUpperCase()}
                                    </span>
                                  </div>
                                  {/* Progress Bar */}
                                  <div style={{ display: 'flex', gap: '3px' }}>
                                    {['filed', 'investigating', 'approved', 'repaired'].map((step, idx) => {
                                      const statusOrder = ['filed', 'investigating', 'approved', 'repaired'];
                                      const currentIdx = statusOrder.indexOf(v.activeClaim!.status);
                                      const isActive = idx <= currentIdx;
                                      return (
                                        <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                          <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: isActive ? (idx === 0 ? '#f59e0b' : idx === 1 ? '#3b82f6' : idx === 2 ? '#10b981' : '#8b5cf6') : 'rgba(255,255,255,0.1)' }} />
                                          <span style={{ fontSize: '0.55rem', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{step}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {v.activeClaim.estimateAmount && (
                                    <div className="text-secondary" style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>Estimate: {v.activeClaim.estimateAmount.toLocaleString()} THB</div>
                                  )}
                                </div>
                              )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-subtle)' }}>
                            <button onClick={() => { setShowGreenBook(v.tokenId); setShowPrivacy(null); setShowHistory(null); }} style={{ border: 'none', background: 'transparent', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                <FileText size={18} color="var(--success)" /> BOOK
                            </button>
                            <button onClick={() => { setShowPrivacy(v.tokenId); setShowGreenBook(null); setShowHistory(null); }} style={{ border: 'none', borderLeft: '1px solid var(--border-subtle)', background: 'transparent', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                <ShieldCheck size={18} color="var(--accent-primary)" /> PRIVACY
                            </button>
                            <button onClick={() => { setShowHistory(v.tokenId); setShowGreenBook(null); setShowPrivacy(null); }} style={{ border: 'none', borderLeft: '1px solid var(--border-subtle)', background: 'transparent', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                <History size={18} color="var(--accent-secondary)" /> HISTORY
                            </button>
                            <button
                              onClick={() => handleOpenClaimModal(v.tokenId)}
                              disabled={!!v.activeClaim && !['repaired', 'rejected'].includes(v.activeClaim.status) || !v.insurance}
                              style={{ border: 'none', borderLeft: '1px solid var(--border-subtle)', background: (v.activeClaim && !['repaired', 'rejected'].includes(v.activeClaim.status)) ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.05)', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', cursor: ((v.activeClaim && !['repaired', 'rejected'].includes(v.activeClaim.status)) || !v.insurance) ? 'not-allowed' : 'pointer', opacity: ((v.activeClaim && !['repaired', 'rejected'].includes(v.activeClaim.status)) || !v.insurance) ? 0.5 : 1 }}
                            >
                                <AlertCircle size={18} color={(v.activeClaim && !['repaired', 'rejected'].includes(v.activeClaim.status)) ? '#f59e0b' : '#ef4444'} /> {(v.activeClaim && !['repaired', 'rejected'].includes(v.activeClaim.status)) ? 'CLAIMED' : 'CLAIM'}
                            </button>
                            <button 
                              onClick={() => handleOpenSaleModal(v.tokenId)}
                              disabled={!!v.pendingPurchase}
                              style={{ border: 'none', borderLeft: '1px solid var(--border-subtle)', background: v.pendingPurchase ? 'rgba(251, 191, 36, 0.1)' : 'rgba(59, 130, 246, 0.1)', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', cursor: v.pendingPurchase ? 'not-allowed' : 'pointer', opacity: v.pendingPurchase ? 0.6 : 1 }}
                            >
                                <ArrowRightLeft size={18} color={v.pendingPurchase ? '#fbbf24' : 'var(--accent-primary)'} /> {v.pendingPurchase ? 'PENDING' : 'SELL'}
                            </button>
                        </div>
                    </div>
                ))
            )}
         </div>
      </div>

      {/* ═══════════ Sale Modal (Consumer-to-Consumer) ═══════════ */}
      {saleModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', background: '#0a0a0b', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <DollarSign size={28} color="var(--accent-primary)" />
                <h2 style={{ margin: 0 }}>Sell Vehicle</h2>
              </div>
              <button onClick={() => setSaleModal(null)} style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{saleModal.model}</div>
              <div className="text-secondary" style={{ fontSize: '0.9rem' }}>VIN: {saleModal.vin}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Buyer Wallet Address</label>
                <input
                  type="text"
                  value={saleBuyerAddress}
                  onChange={(e) => setSaleBuyerAddress(e.target.value)}
                  placeholder="0x..."
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white', fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Sale Price (ETH)</label>
                <input
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.5"
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white', fontSize: '1rem' }}
                />
              </div>
              <button
                className="premium-btn"
                onClick={handleSubmitSale}
                disabled={!saleBuyerAddress || !salePrice}
                style={{ marginTop: '0.5rem', opacity: (!saleBuyerAddress || !salePrice) ? 0.5 : 1 }}
              >
                <ShoppingCart size={16} /> Create Sale Offer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════ Claim Filing Modal ═══════════ */}
      {claimModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', background: '#0a0a0b', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <AlertCircle size={28} color="var(--danger)" />
                <h2 style={{ margin: 0 }}>File Insurance Claim</h2>
              </div>
              <button onClick={() => setClaimModal(null)} style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{claimModal.model}</div>
              <div className="text-secondary" style={{ fontSize: '0.9rem' }}>VIN: {claimModal.vin}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Incident Description</label>
                <textarea
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                  placeholder="Describe what happened: when, where, how the damage occurred..."
                  style={{ minHeight: '100px' }}
                />
              </div>
              <div>
                <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Severity</label>
                <select value={claimSeverity} onChange={(e) => setClaimSeverity(e.target.value)}>
                  <option value="minor">Minor: Scratches / Panel Damage</option>
                  <option value="high">Major: Structural / Frame Impact</option>
                  <option value="total_loss">Total Loss</option>
                </select>
              </div>
              <div>
                <label className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Evidence Photos</label>
                <div
                  onClick={() => document.getElementById('consumer-claim-upload')?.click()}
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
                      Click to upload photos of damage
                    </span>
                  )}
                  <input id="consumer-claim-upload" type="file" hidden multiple accept="image/*" onChange={handleClaimFileChange} />
                </div>
                {claimFiles.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {claimFiles.map((f, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                        {f.mime?.startsWith('image/') ? (
                          <img src={`${API_BASE}${f.path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><FileText size={24} color="var(--accent-primary)" /></div>
                        )}
                        <button
                          onClick={() => setClaimFiles(prev => prev.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {claimSeverity !== 'minor' && (
                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', gap: '0.5rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>A {claimSeverity === 'total_loss' ? 'Total Loss' : 'Major'} claim will permanently flag this vehicle in the registry.</span>
                </div>
              )}

              <button
                className="premium-btn"
                onClick={handleSubmitClaim}
                disabled={!claimDescription}
                style={{ background: 'var(--danger)', marginTop: '0.5rem' }}
              >
                {claimFiles.length > 0 ? `Submit Claim (${claimFiles.length} photo${claimFiles.length > 1 ? 's' : ''})` : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

