import { ChevronRight, ShieldCheck, Wallet } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { RolePermissions } from '../auth/roles';

export const LoginPage = () => {
  const { connectWallet, login, logout, address, role, isConnecting } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (address && role) {
      const target = from === '/login' || from === '/' ? RolePermissions[role][0] : from;
      navigate(target, { replace: true });
    }
  }, [address, role, navigate, from]);

  if (address && role) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), linear-gradient(160deg, #060910 0%, #0c1220 50%, #0a0f1e 100%)',
      color: 'white',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Floating Particles BG */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${80 + i * 40}px`,
            height: `${80 + i * 40}px`,
            borderRadius: '50%',
            border: '1px solid rgba(59, 130, 246, 0.06)',
            top: `${15 + i * 16}%`,
            left: `${10 + i * 18}%`,
            animation: `pulse ${3 + i}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.5))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '3.5rem',
        borderRadius: '28px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        position: 'relative',
        zIndex: 1,
        animation: 'slideUp 0.6s ease forwards'
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px',
          background: 'linear-gradient(to right, transparent, rgba(59, 130, 246, 0.5), rgba(139, 92, 246, 0.5), transparent)',
          borderRadius: '2px'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 8px 30px rgba(59, 130, 246, 0.4)',
            transform: 'rotate(-5deg)'
          }}>
            <ShieldCheck size={36} color="white" />
          </div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            marginBottom: '0.5rem',
            background: 'linear-gradient(to right, #ffffff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Welcome to BlockVIN</h1>
          <p style={{ color: '#64748b', letterSpacing: '0.5px' }}>Secure Vehicle NFT Lifecycle Management</p>
        </div>

        {!address ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1.15rem',
                borderRadius: '16px',
                background: isConnecting ? '#1e293b' : 'linear-gradient(135deg, #ffffff, #e2e8f0)',
                color: isConnecting ? '#64748b' : '#0f172a',
                border: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: isConnecting ? 'none' : '0 8px 24px rgba(255, 255, 255, 0.15)',
              }}
            >
              <Wallet size={20} />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#475569', marginTop: '0.75rem', lineHeight: 1.6 }}>
              Connect your MetaMask wallet to access the platform.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              padding: '1.15rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.06))',
              borderRadius: '16px',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Connected Wallet</div>
              <div style={{ fontFamily: 'monospace', color: '#60a5fa', fontSize: '0.9rem', wordBreak: 'break-all' }}>{address}</div>
            </div>

            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Please sign the message to verify your identity and retrieve your role.
            </div>

            <button
              onClick={() => login()}
              disabled={isConnecting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1.15rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: isConnecting ? 'wait' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: isConnecting ? 0.7 : 1,
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
              }}
            >
              {isConnecting ? 'Verifying...' : 'Verify Identity & Login'}
              <ChevronRight size={20} />
            </button>

            <button
              onClick={logout}
              style={{
                marginTop: '0.5rem',
                background: 'transparent',
                border: '1px solid rgba(100, 116, 139, 0.2)',
                color: '#64748b',
                padding: '0.75rem',
                borderRadius: '14px',
                cursor: 'pointer',
                fontSize: '0.88rem',
                transition: 'all 0.2s',
              }}
            >
              Disconnect / Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
