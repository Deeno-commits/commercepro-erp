
import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import * as RouterDom from 'react-router-dom';
const { HashRouter, Routes, Route, Navigate, Link, useLocation } = RouterDom as any;

import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Truck, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  Bell,
  RefreshCcw,
  FileText,
  AlertCircle,
  X
} from 'lucide-react';
import { supabase, isConfigured } from './lib/supabase';

import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import DeliveryManagement from './pages/DeliveryManagement';
import Statistics from './pages/Statistics';
import ConfigSettings from './pages/ConfigSettings';
import Exchanges from './pages/Exchanges';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Register from './pages/Register';
import { User, UserRole } from './types';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, firstName: string, role: UserRole) => Promise<void>;
  logout: () => void;
  loading: boolean;
  dbError: boolean;
  configValid: boolean;
  refreshData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [configValid] = useState(isConfigured());

  const fetchProfile = useCallback(async (id: string, email: string) => {
    try {
      // Timeout de 1.5s pour la DB afin de ne pas bloquer l'utilisateur
      const profilePromise = supabase.from('users').select('*').eq('id', id).maybeSingle();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
      
      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;
      
      if (error || !data) throw new Error("No profile");
      setUser(data);
    } catch (e) {
      // Fallback rapide : l'utilisateur peut entrer même si la table 'users' est lente
      setUser({ id, email, first_name: email.split('@')[0], last_name: '', role: UserRole.ADMIN, is_active: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          await fetchProfile(session.user.id, session.user.email!);
        } else {
          if (mounted) setLoading(false);
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email!);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => { 
      mounted = false; 
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, pass: string) => {
    // Le chargement global n'est pas activé ici pour laisser le bouton de login gérer son propre état
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    // La redirection et le profil sont gérés par onAuthStateChange
  };

  const register = async (email: string, pass: string, firstName: string, role: UserRole) => {
    const { data, error: authError } = await supabase.auth.signUp({ 
      email, password: pass, options: { data: { first_name: firstName, role: role } }
    });
    if (authError) throw authError;
    if (data.user) {
      await supabase.from('users').upsert({ id: data.user.id, email, first_name: firstName, role, is_active: true });
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      setUser(null);
      window.location.hash = '/login';
    } finally {
      setLoading(false);
    }
  };

  const refreshData = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  const value = useMemo(() => ({
    user, login, register, logout, loading, dbError, configValid, refreshData
  }), [user, loading, dbError, configValid, refreshData]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, active: boolean, roles?: UserRole[], onClick?: () => void }> = ({ to, icon, label, active, roles, onClick }) => {
  const { user } = useAuth();
  if (roles && user && !roles.includes(user.role)) return null;
  return (
    <Link to={to} onClick={onClick} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-gray-500 hover:bg-white hover:text-blue-600'}`}>
      <span>{icon}</span>
      <span className="font-bold text-sm">{label}</span>
    </Link>
  );
};

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout, refreshData } = useAuth();
  
  const isLivreur = user?.role === UserRole.LIVREUR;

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.ADMIN, UserRole.COMMERCE] },
    { path: '/inventory', label: 'Stock', icon: <Package size={20} />, roles: [UserRole.ADMIN, UserRole.COMMERCE] },
    { path: '/pos', label: 'Caisse', icon: <ShoppingCart size={20} />, roles: [UserRole.ADMIN, UserRole.COMMERCE] },
    { path: '/exchanges', label: 'Échanges', icon: <RefreshCcw size={20} />, roles: [UserRole.ADMIN, UserRole.COMMERCE] },
    { path: '/deliveries', label: 'Livraisons', icon: <Truck size={20} /> },
    { path: '/reports', label: 'Rapports', icon: <FileText size={20} />, roles: [UserRole.ADMIN] },
    { path: '/stats', label: 'Statistiques', icon: <BarChart3 size={20} />, roles: [UserRole.ADMIN] },
    { path: '/settings', label: 'Configuration', icon: <Settings size={20} />, roles: [UserRole.ADMIN] },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {!isLivreur && (
        <aside className={`fixed lg:static inset-y-0 left-0 z-[100] w-72 bg-gray-50 border-r border-gray-200/50 flex flex-col p-6 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} no-print shadow-2xl lg:shadow-none`}>
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">C</div>
               <h1 className="text-xl font-black tracking-tighter">CommercePro</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-gray-400"><X size={24}/></button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {menuItems.map(item => (
              <SidebarLink key={item.path} to={item.path} icon={item.icon} label={item.label} active={location.pathname === item.path} roles={item.roles} onClick={() => setSidebarOpen(false)} />
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">{user?.first_name?.[0] || 'U'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate">{user?.first_name || 'Utilisateur'}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{user?.role || 'Membre'}</p>
              </div>
            </div>
            <button onClick={logout} className="flex items-center gap-3 w-full mt-4 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest">
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {!isLivreur && (
          <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 lg:px-8 flex items-center justify-between z-10 no-print">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-3 bg-gray-50 rounded-xl text-blue-600"><Menu size={24} /></button>
            <div className="flex items-center gap-4 ml-auto">
              <button onClick={refreshData} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"><RefreshCcw size={20} /></button>
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </header>
        )}

        <div className={`flex-1 overflow-y-auto bg-gray-50/50 ${isLivreur ? 'p-0 h-full' : 'p-4 lg:p-10'}`}>
          <Routes>
            <Route path="/" element={isLivreur ? <Navigate to="/deliveries" replace /> : <Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/exchanges" element={<Exchanges />} />
            <Route path="/deliveries" element={<DeliveryManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/stats" element={<Statistics />} />
            <Route path="/settings" element={<ConfigSettings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, configValid } = useAuth();
  
  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white z-[9999]">
      <div className="relative flex items-center justify-center">
        <div className="w-24 h-24 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute font-black text-xl text-blue-600 animate-pulse">CP</div>
      </div>
      <div className="mt-10 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-900 animate-pulse">Initialisation Nexus</p>
        <p className="text-[9px] font-bold text-gray-400 mt-2 uppercase">Liaison satellite établie...</p>
      </div>
    </div>
  );
  
  if (!configValid) return (
    <div className="h-screen flex items-center justify-center p-10 bg-red-50">
      <div className="text-center max-w-md p-10 bg-white rounded-[40px] shadow-2xl border border-red-100">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black uppercase text-red-600 mb-4">Erreur Système</h2>
        <p className="text-gray-400 font-bold text-sm mb-6">Connexion perdue avec le centre de données.</p>
        <button onClick={() => window.location.reload()} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Reconnexion</button>
      </div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default App;
