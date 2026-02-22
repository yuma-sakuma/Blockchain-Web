import { ethers } from 'ethers';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { MOCK_ADDRESS_ROLE_MAP, UserRole } from './roles';

interface AuthContextType {
  address: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  login: () => Promise<void>; // Modified to be async and take no args (auto-resolves)
  logout: () => void;
  checkConnection: () => Promise<void>;
  impersonate: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Mock Database for Role Persistence (Simulating Backend/Smart Contract)
const MOCK_ROLE_DB_KEY = 'mock_role_db';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Restore session on load
  useEffect(() => {
    const savedAddress = localStorage.getItem('auth_address');
    const savedRole = localStorage.getItem('auth_role') as UserRole | null;
    
    if (savedAddress) {
      setAddress(savedAddress);
      // Verify if still connected to Metamask
      checkConnection();
    }
    if (savedRole) {
      setRole(savedRole);
    }
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const currentAccount = accounts[0].address;
           // If address changed in metamask, we should probably update or logout
           if (address && currentAccount.toLowerCase() !== address.toLowerCase()) {
              logout();
           } else {
             setAddress(currentAccount);
           }
        } else {
          // Keep session if it exists? Or logout? 
          // For now, let's not auto-logout simply on check, unless explicit disconnect
        }
      } catch (err) {
        console.error("Failed to check connection:", err);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install Metamask!");
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];
      
      // Just connect, don't set global auth state fully until login (signature)
      // But for UX, we often show "Connected: 0x..." before "Logged In"
      // In this flow, we will combine them or require explicit sign after connect.
      
      // Let's verify signature immediately after connect for "Login"
      await loginSequence(provider, userAddress);

    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet: " + (error as any).message);
    } finally {
      setIsConnecting(false);
    }
  };

  const loginSequence = async (provider: ethers.BrowserProvider, userAddress: string) => {
      try {
        // 1. Request Signature
        const signer = await provider.getSigner();
        const message = `Login to Vehicle NFT System\nTimestamp: ${Date.now()}\nAddress: ${userAddress}`;
        
        // This prompts Metamask to sign
        const signature = await signer.signMessage(message);
        console.log("Signature:", signature);

        // 2. Verify Signature (Client-side simulation)
        const recoveredAddress = ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error("Invalid signature!");
        }

        // 3. Resolve Role
        // Check hardcoded map first
        let userRole = MOCK_ADDRESS_ROLE_MAP[userAddress] || MOCK_ADDRESS_ROLE_MAP[ethers.getAddress(userAddress)];
        
        // If not in map, default to CONSUMER
        if (!userRole) {
            console.warn(`Address ${userAddress} not found in whitelist, defaulting to CONSUMER`);
            userRole = UserRole.CONSUMER;
        }

        // 4. Set Session
        setAddress(userAddress);
        setRole(userRole);
        localStorage.setItem('auth_address', userAddress);
        localStorage.setItem('auth_role', userRole);

        // Save to Mock DB (Legacy support if needed, but localStorage is enough for now)
        const mockDb = JSON.parse(localStorage.getItem(MOCK_ROLE_DB_KEY) || '{}');
        mockDb[userAddress] = userRole;
        localStorage.setItem(MOCK_ROLE_DB_KEY, JSON.stringify(mockDb));

      } catch (error) {
          console.error("Login verification failed:", error);
          alert("Login cancelled or failed verification.");
          logout();
      }
  }

  const login = async () => {
      // Re-trigger login sequence if already connected but session expired or switching
      if (window.ethereum) {
          setIsConnecting(true);
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
                await loginSequence(provider, accounts[0].address);
            } else {
                await connectWallet();
            }
          } finally {
            setIsConnecting(false);
          }
      } else {
          connectWallet();
      }
  };

  const impersonate = (targetRole: UserRole) => {
      // Find a mock address for this role
      const mockEntry = Object.entries(MOCK_ADDRESS_ROLE_MAP).find(([_, r]) => r === targetRole);
      const mockAddress = mockEntry ? mockEntry[0] : '0x0000000000000000000000000000000000000000';
      
      setAddress(mockAddress);
      setRole(targetRole);
      localStorage.setItem('auth_address', mockAddress);
      localStorage.setItem('auth_role', targetRole);
      
      // Force reload to ensure all components pick up the new "signer" if they strictly rely on window.ethereum (which they shouldn't for read views, but for consistency)
      // window.location.reload(); 
      // Actually, React state update should be enough for UI, but `window.ethereum` won't match. 
      // Our app uses `address` from context mostly, so it should work fine for UI testing.
  };

  const logout = () => {
    setAddress(null);
    setRole(null);
    localStorage.removeItem('auth_address');
    localStorage.removeItem('auth_role');
  };

  return (
    <AuthContext.Provider value={{ 
      address, 
      role, 
      isAuthenticated: !!address && !!role, 
      isConnecting,
      connectWallet, 
      login, 
      logout,
      checkConnection,
      impersonate
    }}>
      {children}
    </AuthContext.Provider>
  );
};
