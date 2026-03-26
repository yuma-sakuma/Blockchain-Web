import { Ban, Calendar, ChevronLeft, ChevronRight, Clock, CreditCard, Landmark, Lock, Search, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicleStore } from '../store';

export const FinancePage = () => {
    const { vehicles, events, addEvent } = useVehicleStore();
    const { address } = useAuth();
    const [vin, setVin] = useState('');
    const [schedulerPage, setSchedulerPage] = useState(0);
    const [paymentPopup, setPaymentPopup] = useState<number | null>(null); // installment number
    const [auctionPopup, setAuctionPopup] = useState<boolean>(false);
    const [auctionPrice, setAuctionPrice] = useState('');
    const [auctionWinner, setAuctionWinner] = useState('');
    const [processingApproval, setProcessingApproval] = useState<string | null>(null);

    const lender = address || 'UNKNOWN';
    const normalizedLender = address?.toLowerCase() || '';

    const pendingApplications = vehicles.filter(v => v.pendingLoan && v.pendingLoan.lender.toLowerCase() === normalizedLender);

    const targetVehicle = vehicles.find(v => v.vin === vin);
    const loan = targetVehicle?.loanAccount;
    const hasActiveLoan = !!loan && loan.lienStatus === 'ACTIVE';
    const hasAnyLoan = !!loan;

    // Scheduler config
    const totalMonths = loan?.termMonths || 48;
    const monthsPerPage = 12;
    const totalPages = Math.ceil(totalMonths / monthsPerPage);
    const currentPageMonths = Array.from(
        { length: Math.min(monthsPerPage, totalMonths - schedulerPage * monthsPerPage) },
        (_, i) => schedulerPage * monthsPerPage + i + 1
    );

    const handleApproveLoan = async (tokenId: string) => {
        const vehicle = vehicles.find(v => v.tokenId === tokenId);
        if (!vehicle?.pendingLoan) return;

        const dealerAddress = vehicle.currentOwner;
        const { borrower, principal, interestRateBps, termMonths } = vehicle.pendingLoan;

        if (!confirm(`Approve loan application?\nBorrower: ${borrower.substring(0, 8)}\nDealer: ${dealerAddress.substring(0, 8)}\nAmount: ${principal.toLocaleString()} THB\nTerm: ${termMonths} months`)) {
            return;
        }

        setProcessingApproval(tokenId);
        try {
            await addEvent({
                type: 'LOAN_APPROVED',
                actor: lender,
                tokenId: tokenId,
                payload: {
                    lender,
                    borrower,
                    dealerAddress,
                    principal,
                    interestRateBps,
                    termMonths,
                    approvedAt: new Date().toISOString()
                }
            });
            alert('✅ Loan Approved. Asset title transferred to Lender, possessor set to Consumer.');
        } catch (e: any) {
            console.error('Failed to approve loan', e);
            alert(`❌ Error: ${e.message}`);
        } finally {
            setProcessingApproval(null);
        }
    };

    const handleCreateLien = async () => {
        if (!targetVehicle) return;
        await addEvent({
            type: 'LIEN_CREATED',
            actor: lender,
            tokenId: targetVehicle.tokenId,
            payload: {
                lender,
                contractHash: `CTR-${targetVehicle.tokenId}-${Date.now()}`,
                startDate: new Date().toISOString(),
                rules: { transferLocked: true }
            }
        });
    };

    const handleReleaseLien = async () => {
        if (!targetVehicle) return;
        await addEvent({
            type: 'LIEN_RELEASED',
            actor: lender,
            tokenId: targetVehicle.tokenId,
            payload: {
                releasedAt: new Date().toISOString(),
                receiptHash: `RLS-${targetVehicle.tokenId}-${Date.now()}`
            }
        });
    };

    const handleRepossess = async () => {
        if (!targetVehicle) return;
        if (confirm("Executing seizure protocol. Confirming legal default?")) {
            await addEvent({
                type: 'REPOSSESSION_RECORDED',
                actor: lender,
                tokenId: targetVehicle.tokenId,
                payload: {
                    date: new Date().toISOString(),
                    legalRefHash: `RPO-${targetVehicle.tokenId}-${Date.now()}`
                }
            });
        }
    };

    const handleMilestone = async (num: number, status: 'PAID' | 'MISSED') => {
        if (!targetVehicle) return;
        await addEvent({
            type: 'INSTALLMENT_MILESTONE_RECORDED',
            actor: lender,
            tokenId: targetVehicle.tokenId,
            payload: {
                installmentNo: num,
                status: status,
                amount: loan ? Math.round(loan.principal / loan.termMonths) : 0,
                date: new Date().toISOString(),
                proofHash: `PAY-${targetVehicle.tokenId}-${num}-${Date.now()}`
            }
        });
        setPaymentPopup(null);
    };

    const handleLiquidate = async () => {
        if (!targetVehicle || !auctionPrice || !auctionWinner) return;
        const price = parseFloat(auctionPrice);

        if (confirm(`Confirm liquidation sale to ${auctionWinner} for ${price} THB?\nThis will clear the loan, remove the seized flag, and force-transfer ownership.`)) {
            // 1. Release Lien
            await addEvent({
                type: 'LIEN_RELEASED',
                actor: lender,
                tokenId: targetVehicle.tokenId,
                payload: {
                    releasedAt: new Date().toISOString(),
                    receiptHash: `LIQ-RLS-${targetVehicle.tokenId}-${Date.now()}`
                }
            });

            // 2. Clear Seized Flag
            await addEvent({
                type: 'FLAG_UPDATED',
                actor: lender,
                tokenId: targetVehicle.tokenId,
                payload: {
                    flag: 'seized',
                    value: false,
                    reason: 'Asset Liquidated',
                    updatedAt: new Date().toISOString()
                }
            });

            // 3. Force Transfer Ownership
            await addEvent({
                type: 'OWNERSHIP_TRANSFERRED',
                actor: lender,
                tokenId: targetVehicle.tokenId,
                payload: {
                    from: targetVehicle.currentOwner,
                    to: auctionWinner,
                    reason: 'resale',
                    price: price,
                    paymentTxHash: `LIQ-PAY-${Date.now()}`,
                    deliveryDate: new Date().toISOString()
                }
            });

            setAuctionPopup(false);
            setAuctionPrice('');
            setAuctionWinner('');
            alert("✅ Asset Liquidated Successfully!");
        }
    };

    // Compute missed count for display
    const missedCount = loan ? Object.values(loan.payments).filter(s => s === 'MISSED').length : 0;
    const paidCount = loan ? Object.values(loan.payments).filter(s => s === 'PAID').length : 0;

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Asset Finance & Lien Registry</h1>
                <p className="text-secondary">Corporate portal for hire-purchase contracts, lien registration, and debt recovery.</p>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <span className="badge badge-info">Logged in as {lender}</span>
                </div>
            </header>

            {pendingApplications.length > 0 && (
                <div className="card" style={{ border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.03)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#3b82f6' }}>
                        <Clock size={20} />
                        Pending Loan Applications ({pendingApplications.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {pendingApplications.map(v => (
                            <div key={v.tokenId} style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{v.makeModelTrim} <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 400 }}>{v.tokenId}</span></h3>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                                        <div className="text-secondary">Principal: <strong style={{ color: 'var(--text-primary)' }}>{v.pendingLoan!.principal.toLocaleString()} THB</strong></div>
                                        <div className="text-secondary">Rate: <strong style={{ color: 'var(--text-primary)' }}>{(v.pendingLoan!.interestRateBps / 100).toFixed(2)}%</strong></div>
                                        <div className="text-secondary">Term: <strong style={{ color: 'var(--text-primary)' }}>{v.pendingLoan!.termMonths} mo</strong></div>
                                    </div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                        <span className="text-secondary">Applicant:</span> <span style={{ fontFamily: 'monospace' }}>{v.pendingLoan!.borrower.substring(0, 8)}...</span> •
                                        <span className="text-secondary" style={{ marginLeft: '0.5rem' }}>Dealer:</span> <span style={{ fontFamily: 'monospace' }}>{v.currentOwner.substring(0, 8)}...</span>
                                    </div>
                                </div>
                                <button
                                    className="premium-btn"
                                    onClick={() => handleApproveLoan(v.tokenId)}
                                    disabled={processingApproval === v.tokenId}
                                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)', whiteSpace: 'nowrap' }}
                                >
                                    {processingApproval === v.tokenId ? 'Processing...' : 'Approve & Fund Data'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Search color="var(--accent-primary)" size={20} />
                    Contract Lookup
                </h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input value={vin} onChange={e => setVin(e.target.value)} placeholder="Enter VIN to retrieve contract state..." style={{ marginBottom: 0 }} />
                </div>
            </div>

            {targetVehicle ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            {/* ── Installment Scheduler ── */}
                            <div className="card" style={{
                                opacity: hasActiveLoan ? 1 : 0.45,
                                pointerEvents: hasActiveLoan ? 'auto' : 'none',
                                position: 'relative'
                            }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <CreditCard color="var(--accent-primary)" size={20} />
                                    Installment Scheduler
                                    {hasActiveLoan && (
                                        <span className="badge badge-info" style={{ fontSize: '0.65rem', marginLeft: 'auto' }}>
                                            Page {schedulerPage + 1}/{totalPages} • {loan?.termMonths} months
                                        </span>
                                    )}
                                </h3>

                                {!hasActiveLoan && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
                                        <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 600, background: 'rgba(0,0,0,0.7)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                            No active loan
                                        </span>
                                    </div>
                                )}

                                {/* Month Grid — 4 columns × 3 rows = 12 months */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                                    {currentPageMonths.map(m => {
                                        const status = loan?.payments[m];
                                        const isPaid = status === 'PAID';
                                        const isMissed = status === 'MISSED';
                                        return (
                                            <button key={m} onClick={() => setPaymentPopup(m)} style={{
                                                padding: '1rem 0.25rem',
                                                borderRadius: '14px',
                                                background: isPaid ? 'rgba(34, 197, 94, 0.1)' : isMissed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                                                border: isPaid ? '1px solid var(--success)' : isMissed ? '1px solid var(--danger)' : '1px solid var(--border-subtle)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                opacity: isPaid || isMissed ? 0.9 : 1,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}>
                                                <span className="text-secondary" style={{ fontSize: '0.6rem' }}>MONTH</span>
                                                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: isPaid ? 'var(--success)' : isMissed ? 'var(--danger)' : 'inherit' }}>{m}</span>
                                                <span className={`badge ${isPaid ? 'badge-success' : isMissed ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.55rem' }}>
                                                    {isPaid ? '✓ PAID' : isMissed ? '✗ MISSED' : 'LOG PAYMENT'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Pagination: < dots > */}
                                {hasActiveLoan && totalPages > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem' }}>
                                        <button
                                            onClick={() => setSchedulerPage(p => Math.max(0, p - 1))}
                                            disabled={schedulerPage === 0}
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: schedulerPage === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(99, 102, 241, 0.15)',
                                                border: schedulerPage === 0 ? '1px solid var(--border-subtle)' : '1px solid rgba(99, 102, 241, 0.3)',
                                                color: schedulerPage === 0 ? 'var(--text-secondary)' : 'var(--accent-primary)',
                                                cursor: schedulerPage === 0 ? 'not-allowed' : 'pointer',
                                                opacity: schedulerPage === 0 ? 0.4 : 1
                                            }}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>

                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {Array.from({ length: totalPages }, (_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSchedulerPage(i)}
                                                    style={{
                                                        width: schedulerPage === i ? '12px' : '8px',
                                                        height: schedulerPage === i ? '12px' : '8px',
                                                        borderRadius: '50%',
                                                        background: schedulerPage === i ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        padding: 0
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setSchedulerPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={schedulerPage === totalPages - 1}
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: schedulerPage === totalPages - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(99, 102, 241, 0.15)',
                                                border: schedulerPage === totalPages - 1 ? '1px solid var(--border-subtle)' : '1px solid rgba(99, 102, 241, 0.3)',
                                                color: schedulerPage === totalPages - 1 ? 'var(--text-secondary)' : 'var(--accent-primary)',
                                                cursor: schedulerPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                                                opacity: schedulerPage === totalPages - 1 ? 0.4 : 1
                                            }}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* ── Loan Summary ── */}
                            <div className="card">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <Calendar color="var(--accent-primary)" size={20} />
                                    Loan Summary
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                                    <div>
                                        <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Principal Amount</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{loan ? loan.principal.toLocaleString() : '—'} THB</div>
                                    </div>
                                    <div>
                                        <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Rate (Fixed)</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{loan ? (loan.interestRateBps / 100).toFixed(2) + '%' : '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Status</div>
                                        <div style={{
                                            fontSize: '1.25rem', fontWeight: 700,
                                            color: loan?.lienStatus === 'ACTIVE' ? 'var(--accent-primary)' : loan?.lienStatus === 'RELEASED' ? 'var(--success)' : loan?.lienStatus === 'DEFAULTED' ? 'var(--danger)' : 'var(--text-secondary)'
                                        }}>
                                            {loan?.lienStatus || 'NO LOAN'}
                                        </div>
                                    </div>
                                </div>
                                {hasAnyLoan && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                                        <div>
                                            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Term</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{loan!.termMonths} months ({loan!.termMonths / 12}yr)</div>
                                        </div>
                                        <div>
                                            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Paid</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success)' }}>{paidCount}/{totalMonths}</div>
                                        </div>
                                        <div>
                                            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Missed</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: missedCount >= 3 ? 'var(--danger)' : 'inherit' }}>{missedCount}{missedCount >= 3 ? ' ⚠️' : ''}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            {/* ── Asset Security Control ── */}
                            <div className="card" style={{
                                border: targetVehicle.lien.status === 'active' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                opacity: (hasActiveLoan || targetVehicle.lien.status === 'released') ? 1 : 0.45,
                                pointerEvents: (hasActiveLoan || targetVehicle.lien.status === 'released') ? 'auto' : 'none'
                            }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <Landmark size={20} color="var(--accent-primary)" />
                                    Asset Security Control
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Current Lien Hash</div>
                                        <div style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{targetVehicle.lien.contractHash || "NO_ACTIVE_LIEN"}</div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <button className="premium-btn" onClick={handleCreateLien} disabled={targetVehicle.lien.status === 'active' || targetVehicle.lien.status === 'released'}>
                                            <Lock size={16} /> Lock Asset
                                        </button>
                                        <button onClick={handleReleaseLien} disabled={targetVehicle.lien.status !== 'active'} style={{ border: '1px solid var(--success)', color: 'var(--success)' }}>
                                            <Unlock size={16} /> Discharge
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Dispute & Recovery ── */}
                            <div className="card" style={{ border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--danger)' }}>
                                    <Ban size={20} />
                                    Dispute & Recovery
                                </h3>
                                <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                    Permanent seizure protocol. This action must be backed by a court order or contractual default.
                                </p>
                                <button
                                    onClick={handleRepossess}
                                    disabled={loan?.lienStatus !== 'DEFAULTED' || targetVehicle.flags.seized}
                                    style={{
                                        width: '100%',
                                        background: loan?.lienStatus === 'DEFAULTED' && !targetVehicle.flags.seized ? 'var(--danger)' : 'rgba(239, 68, 68, 0.2)',
                                        opacity: loan?.lienStatus === 'DEFAULTED' && !targetVehicle.flags.seized ? 1 : 0.5
                                    }}
                                >
                                    Execute Seizure Notice
                                </button>

                                {targetVehicle.flags.seized && (
                                    <button
                                        onClick={() => setAuctionPopup(true)}
                                        className="premium-btn"
                                        style={{
                                            width: '100%',
                                            marginTop: '1rem',
                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                                        }}
                                    >
                                        Liquidate NPA Asset (Auction)
                                    </button>
                                )}

                                {loan?.lienStatus !== 'DEFAULTED' && !targetVehicle.flags.seized && (
                                    <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>
                                        Seizure is only available when loan status is DEFAULTED (≥3 missed payments)
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Payment Popup Modal */}
                    {paymentPopup !== null && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="card" style={{ width: '360px', textAlign: 'center', border: '1px solid var(--accent-primary)' }}>
                                <h3 style={{ marginBottom: '0.5rem' }}>Month {paymentPopup}</h3>
                                <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '2rem' }}>
                                    Choose payment status for installment #{paymentPopup}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => handleMilestone(paymentPopup, 'PAID')}
                                        style={{
                                            padding: '1rem',
                                            background: 'rgba(34, 197, 94, 0.15)',
                                            border: '1px solid var(--success)',
                                            color: 'var(--success)',
                                            borderRadius: '12px',
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✓ PAID
                                    </button>
                                    <button
                                        onClick={() => handleMilestone(paymentPopup, 'MISSED')}
                                        style={{
                                            padding: '1rem',
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid var(--danger)',
                                            color: 'var(--danger)',
                                            borderRadius: '12px',
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✗ MISSED
                                    </button>
                                    <button
                                        onClick={() => setPaymentPopup(null)}
                                        style={{
                                            padding: '0.75rem',
                                            background: 'transparent',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: '12px',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Auction/Liquidation Modal */}
                    {auctionPopup && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="card" style={{ width: '420px', border: '1px solid #d97706' }}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b', margin: 0, marginBottom: '1.5rem' }}>
                                    <Landmark size={24} />
                                    Asset Liquidation
                                </h2>
                                <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                    Transfer NPA asset to auction winner. This will clear the lien and unseize the vehicle.
                                </p>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                        Winner Wallet Address
                                    </label>
                                    <input
                                        value={auctionWinner}
                                        onChange={e => setAuctionWinner(e.target.value)}
                                        placeholder="0x..."
                                        style={{ marginBottom: 0, fontFamily: 'monospace' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                        Winning Bid (Price)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="number"
                                            value={auctionPrice}
                                            onChange={e => setAuctionPrice(e.target.value)}
                                            placeholder="e.g. 450000"
                                            style={{ marginBottom: 0, paddingRight: '60px' }}
                                        />
                                        <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>THB</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        className="premium-btn"
                                        onClick={handleLiquidate}
                                        disabled={!auctionPrice || !auctionWinner}
                                        style={{ flex: 1, background: '#d97706', opacity: (!auctionPrice || !auctionWinner) ? 0.5 : 1 }}
                                    >
                                        Confirm Liquidation
                                    </button>
                                    <button onClick={() => setAuctionPopup(false)} className="text-secondary" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Transaction History with txHash */}
                    {(() => {
                        const vehicleEvents = events.filter(e => e.tokenId === targetVehicle.tokenId && e.txHash && ['LIEN_CREATED', 'LIEN_RELEASED', 'REPOSSESSION_RECORDED', 'INSTALLMENT_MILESTONE_RECORDED'].includes(e.type));
                        return vehicleEvents.length > 0 ? (
                            <div className="card" style={{ gridColumn: '1 / -1' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    🔗 Blockchain Transaction Log
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {vehicleEvents.slice(-8).map((ev, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                            <div>
                                                <span className="badge badge-info" style={{ marginRight: '0.75rem', fontSize: '0.65rem' }}>{ev.type}</span>
                                                <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{new Date(ev.timestamp).toLocaleString()}</span>
                                            </div>
                                            <code style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer' }} title={ev.txHash}>
                                                {ev.txHash!.slice(0, 10)}...{ev.txHash!.slice(-8)}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null;
                    })()}
                </>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                    <Landmark size={48} style={{ margin: '0 auto 1.5rem auto' }} />
                    <p>Query a VIN to manage hire-purchase contracts.</p>
                </div>
            )}
        </div>
    );
};
