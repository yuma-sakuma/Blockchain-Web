import { Wrench } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../auth/roles';

export const DevTools = () => {
  const { impersonate, role: currentRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const roles = Object.values(UserRole);

  if (process.env.NODE_ENV === 'production') return null; // Optional: Hide in prod

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
      {isOpen && (
        <div className="card animate-fade-in" style={{ 
          marginBottom: '1rem', 
          width: '250px', 
          maxHeight: '400px', 
          overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          border: '1px solid var(--accent-primary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-primary)' }}>Developer Tools</h4>
            <button onClick={() => window.location.reload()} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Reset App</button>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
            Switch roles instantly without MetaMask signature.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {roles.map(r => (
              <button 
                key={r} 
                onClick={() => { impersonate(r); setIsOpen(false); }}
                style={{ 
                  textAlign: 'left', 
                  fontSize: '0.8rem', 
                  padding: '0.5rem',
                  background: currentRole === r ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: currentRole === r ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  color: currentRole === r ? 'white' : 'var(--text-secondary)'
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '50px', 
          height: '50px', 
          borderRadius: '50%', 
          background: 'var(--bg-card)', 
          border: '2px solid var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        <Wrench color="var(--accent-primary)" size={24} />
      </button>
    </div>
  );
};
