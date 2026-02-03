
import React, { useState, useEffect, createContext, useContext } from 'react';
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
  FileText
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
  const [dbError, setDbError] = useState(false);
  const [configValid] = useState(isConfigured());

  const fetchProfile = async (id: string, email: string) => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (error) {
        if ((error as any).status === 401) { handleAuthError(); return; }
        throw error;
      }
      if (data) {
        setUser(data);
      } else {
        setUser({ id, email, first_name: email.split('@')[0], last_name: '', role: UserRole.ADMIN, is_active: true });
      }
    } catch (e) { console.error("Profile Fetch Error:", e); }
  };

  const handleAuthError = () => {
    (supabase.auth as any).signOut();
    localStorage.clear();
    setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!configValid) { setLoading(false); return; }
      try {
        const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession();
        if (sessionError || (sessionError as any)?.status === 401) {
           handleAuthError();
        } else if (session?.user && mounted) {
          await fetchProfile(session.user.id, session.user.email!);
        }
      } catch (e) { setDbError(true); } finally { if (mounted) setLoading(false); }
    };
    init();
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: any, session: any) => {
      if (!mounted) return;
      if (session?.user) { await fetchProfile(session.user.id, session.user.email!); } 
      else { setUser(null); }
      setLoading(false);
    });
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, [configValid]);

  const login = async (email: string, pass: string) => {
    const { error } = await (supabase.auth as any).signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const register = async (email: string, pass: string, firstName: string, role: UserRole) => {
    const { data, error: authError } = await (supabase.auth as any).signUp({ 
      email, password: pass, options: { data: { first_name: firstName, role: role } }
    });
    if (authError) throw authError;
    if (data.user) {
      try { await supabase.from('users').upsert({ id: data.user.id, email, first_name: firstName, role, is_active: true }); } 
      catch (e) {}
    }
  };

  const logout = async () => {
    await (supabase.auth as any).signOut();
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, dbError, configValid }}>
      {children}
    </AuthContext.Provider>
  );
};

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, active: boolean, roles?: UserRole[] }> = ({ to, icon, label, active, roles }) => {
  const { user } = useAuth();
  if (roles && user && !roles.includes(user.role)) return null;
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-gray-500 hover:bg-white hover:text-blue-600'}`}>
      <span>{icon}</span>
      <span className="font-bold text-sm">{label}</span>
    </Link>
  );
};

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();
  
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
      {/* Sidebar cachée si livreur */}
      {!isLivreur && (
        <aside className={`fixed lg:static inset-y-0 left-0 z-[100] w-72 bg-gray-50 border-r border-gray-200/50 flex flex-col p-6 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} no-print`}>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">C</div>
            <h1 className="text-xl font-black tracking-tighter">CommercePro</h1>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {menuItems.map(item => (
              <SidebarLink key={item.path} to={item.path} icon={item.icon} label={item.label} active={location.pathname === item.path} roles={item.roles} />
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
        {/* Header caché si livreur pour maximiser l'espace mobile */}
        {!isLivreur && (
          <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-8 flex items-center justify-between z-10 no-print">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 bg-gray-100 rounded-xl"><Menu size={20} /></button>
            <div className="flex items-center gap-4">
              <button onClick={() => window.location.reload()} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all active:rotate-180"><RefreshCcw size={20} /></button>
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><Bell size={20} /></button>
            </div>
          </header>
        )}

        <div className={`flex-1 overflow-y-auto bg-gray-50/50 ${isLivreur ? 'p-0' : 'p-6 sm:p-10'}`}>
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
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">CommercePro Initialisation...</p>
    </div>
  );
  if (!configValid) return <div className="p-20 text-center font-black uppercase text-red-500">Erreur de Configuration Supabase</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default App;
