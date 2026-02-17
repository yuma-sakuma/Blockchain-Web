import { ClipboardCheck, Factory, FileBadge, Landmark, LayoutDashboard, LogOut, Shield, Store, User, Wrench } from 'lucide-react';
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { RoleNames, UserRole } from '../auth/roles';

const SidebarItem = ({ icon: Icon, label, path, active }: any) => (
  <Link 
    to={path} 
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      color: active ? '#fff' : 'var(--text-secondary)',
      backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
      marginBottom: '0.5rem',
      transition: 'all 0.2s',
      textDecoration: 'none'
    }}
  >
    <Icon size={20} />
    <span style={{ fontWeight: 500 }}>{label}</span>
  </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, address, logout, isAuthenticated } = useAuth();
  
  const allMenuItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/', roles: [UserRole.MANUFACTURER, UserRole.DEALER, UserRole.CONSUMER, UserRole.DLT_OFFICER, UserRole.LENDER, UserRole.INSURER, UserRole.SERVICE_PROVIDER, UserRole.INSPECTOR] },
    { icon: Factory, label: 'Manufacturer', path: '/manufacturer', roles: [UserRole.MANUFACTURER] },
    { icon: Store, label: 'Dealer', path: '/dealer', roles: [UserRole.DEALER] },
    { icon: User, label: 'My Garage', path: '/consumer', roles: [UserRole.CONSUMER] },
    { icon: FileBadge, label: 'DLT Registry', path: '/dlt', roles: [UserRole.DLT_OFFICER] },
    { icon: Wrench, label: 'Service Center', path: '/service', roles: [UserRole.SERVICE_PROVIDER] },
    { icon: ClipboardCheck, label: 'Inspection', path: '/inspection', roles: [UserRole.INSPECTOR] },
    { icon: Landmark, label: 'Finance', path: '/finance', roles: [UserRole.LENDER] },
    { icon: Shield, label: 'Insurance', path: '/insurance', roles: [UserRole.INSURER] },
  ];

  const visibleMenu = allMenuItems.filter(item => 
    isAuthenticated && role && item.roles.includes(role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // If on login page, render children without sidebar (or handle in App.tsx)
  // But since we wrap routes in Layout, we might want to suppress sidebar if not auth
  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '280px', 
        borderRight: '1px solid var(--border-subtle)', 
        padding: '1.5rem',
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          marginBottom: '2rem',
          background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          cursor: 'pointer'
        }} onClick={() => navigate('/')}>
          BlockVIN
        </div>
        
        {isAuthenticated && (
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
              {role ? RoleNames[role] : 'Guest'}
            </div>
            <div style={{ color: 'var(--text-secondary)', wordBreak: 'break-all', fontSize: '0.75rem' }}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          </div>
        )}

        <nav style={{ flex: 1 }}>
          {visibleMenu.map((item) => (
            <SidebarItem 
              key={item.path} 
              {...item} 
              active={location.pathname === item.path} 
            />
          ))}
        </nav>
        
        {isAuthenticated && (
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: 'var(--error)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginTop: 'auto',
              width: '100%',
              transition: 'background 0.2s',
              fontWeight: 500
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={20} />
            Logout
          </button>
        )}
        
        {!isAuthenticated && (
          <div style={{ marginTop: 'auto', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
            Please connect wallet
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};
