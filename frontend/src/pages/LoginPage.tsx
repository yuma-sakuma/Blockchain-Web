import { ChevronRight, ShieldCheck, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { RolePermissions } from '../auth/roles';

export const LoginPage = () => {
  const { connectWallet, login, logout, address, role, isConnecting } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // const [selectedRole, setSelectedRole] = useState<UserRole | ''>(''); // Removed

  const from = location.state?.from?.pathname || '/';

  // If already logged in, redirect
  if (address && role) {
    const target = from === '/login' || from === '/' ? RolePermissions[role][0] : from;
    navigate(target, { replace: true });
    return null;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(10px)',
        padding: '3rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
          }}>
            <ShieldCheck size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Welcome to BlockVIN</h1>
          <p style={{ color: '#94a3b8' }}>Secure Vehicle NFT Lifecycle Management</p>
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
                padding: '1rem',
                borderRadius: '12px',
                background: isConnecting ? '#334155' : 'white',
                color: isConnecting ? '#94a3b8' : '#0f172a',
                border: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                transform: isConnecting ? 'none' : 'scale(1)',
              }}
              onMouseOver={(e) => !isConnecting && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseOut={(e) => !isConnecting && (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Wallet size={20} />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b', marginTop: '1rem' }}>
              Connect your MetaMask wallet to access the platform.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ 
              padding: '1rem', 
              background: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: '12px', 
              border: '1px solid rgba(59, 130, 246, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Connected Wallet</div>
              <div style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{address}</div>
            </div>

            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
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
                padding: '1rem',
                borderRadius: '12px',
                background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: isConnecting ? 'wait' : 'pointer',
                marginTop: '0.5rem',
                transition: 'opacity 0.2s',
                opacity: isConnecting ? 0.7 : 1
              }}
            >
              {isConnecting ? 'Verifying...' : 'Verify Identity & Login'}
              <ChevronRight size={20} />
            </button>
            
            <button 
              onClick={logout}
              style={{
                marginTop: '1rem',
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                padding: '0.75rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.9rem'
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
