
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Activity, 
  ShoppingCart,
  Truck,
  Eye,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';

const Dashboard: React.FC = () => {
  const { dbError } = useAuth();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [stats, setStats] = useState({ ca: 0, orders: 0, stockTotal: 0, activeDrivers: 0 });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let salesQuery = supabase.from('sales').select('total_amount, created_at');
      
      const results = await Promise.allSettled([
        salesQuery,
        supabase.from('products').select('stock_quantity'),
        supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('work_status', 'active'),
        supabase.from('sale_items').select('product_name, quantity').limit(10)
      ]);

      // Fix: Check status from the Supabase response object (the fulfilled value) instead of error.status
      const isAnyError500 = results.some(r => r.status === 'rejected' || (r.status === 'fulfilled' && (r.value as any).status === 500));
      
      if (isAnyError500 || dbError) {
        // DONNEES DE SECOURS (MODE DEMO)
        setIsDemo(true);
        setStats({ ca: 1250000, orders: 42, stockTotal: 856, activeDrivers: 3 });
        setTopProducts([
          { name: "Article Démo A", sales: 15 },
          { name: "Article Démo B", sales: 12 },
          { name: "Article Démo C", sales: 8 },
          { name: "Article Démo D", sales: 5 }
        ]);
      } else {
        const sales = results[0].status === 'fulfilled' ? (results[0].value as any).data : [];
        const prods = results[1].status === 'fulfilled' ? (results[1].value as any).data : [];
        const driversCount = results[2].status === 'fulfilled' ? (results[2].value as any).count : 0;
        const items = results[3].status === 'fulfilled' ? (results[3].value as any).data : [];

        const caTotal = sales?.reduce((acc: number, s: any) => acc + Number(s.total_amount), 0) || 0;
        const stockTotal = prods?.reduce((acc: number, p: any) => acc + Number(p.stock_quantity), 0) || 0;

        let sortedTop: any[] = [];
        if (items && items.length > 0) {
          const grouped = items.reduce((acc: any, item: any) => {
            acc[item.product_name] = (acc[item.product_name] || 0) + item.quantity;
            return acc;
          }, {});
          sortedTop = Object.entries(grouped).map(([name, qty]) => ({ name, sales: qty })).sort((a: any, b: any) => b.sales - a.sales).slice(0, 4);
        }

        setStats({ ca: caTotal, orders: sales?.length || 0, stockTotal, activeDrivers: driversCount || 0 });
        setTopProducts(sortedTop);
        setIsDemo(false);
      }
    } catch (err) {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, dbError]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {isDemo && (
        <div className="bg-orange-600 text-white p-4 rounded-[20px] shadow-xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <AlertCircle />
            <p className="text-xs font-black uppercase tracking-widest">Attention : Mode Démonstration activé (Erreur Serveur Supabase)</p>
          </div>
          <button onClick={() => window.location.reload()} className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition-all">
            <RefreshCcw size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Dashboard <span className="text-blue-600">Pro</span></h1>
          <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Supervision opérationnelle en direct</p>
        </div>
        <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-gray-100">
          {(['day', 'week', 'month'] as const).map(p => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-900'}`}
            >
              {p === 'day' ? "Aujourd'hui" : p === 'week' ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title={`CA (${period})`} value={`${stats.ca.toLocaleString()} Ar`} icon={<DollarSign />} color="bg-blue-600" />
        <StatCard title="Ventes" value={stats.orders.toString()} icon={<ShoppingCart />} color="bg-indigo-600" />
        <StatCard title="Stock" value={stats.stockTotal.toLocaleString()} icon={<Package />} color="bg-orange-600" />
        <StatCard title="Livreurs" value={stats.activeDrivers.toString()} icon={<Truck />} color="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-xl flex items-center gap-3"><Activity className="text-blue-600" /> Activité Commerciale</h3>
            <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Temps Réel</span>
          </div>
          <div className="flex-1 rounded-3xl bg-gray-50 flex flex-col items-center justify-center border border-dashed border-gray-200 gap-4">
             <TrendingUp size={48} className="text-gray-200" />
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Flux de transactions actif</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-[40px] p-10 flex flex-col gap-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 flex items-center justify-between">
            <h3 className="font-black text-lg flex items-center gap-3"><span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-lg shadow-red-500"></span> LIVE VIDEO</h3>
            <button className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><Eye size={18} /></button>
          </div>
          <div className="flex-1 rounded-[32px] bg-black relative overflow-hidden border border-white/5 shadow-inner">
             <img src={`https://images.unsplash.com/photo-1556740734-7f9a2b7a0f4d?auto=format&fit=crop&q=80&w=800`} alt="Live" className="w-full h-full object-cover opacity-40 grayscale group-hover:opacity-60 transition-opacity duration-700" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
             <div className="absolute bottom-8 left-8">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-2">Source : Cam-01</p>
               <p className="text-lg font-black tracking-tight">Zone d'Encaissement</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100">
           <h3 className="font-black text-xl mb-10">Top Articles</h3>
           <div className="space-y-8">
             {topProducts.length > 0 ? topProducts.map((prod, i) => (
               <div key={i} className="flex items-center gap-5">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-[18px] flex items-center justify-center font-black text-sm">{i+1}</div>
                 <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate uppercase tracking-tight text-gray-800">{prod.name}</p>
                    <p className="text-xs text-gray-400 font-bold">{prod.sales} ventes</p>
                 </div>
                 <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{width: `${Math.max(20, 100 - (i*25))}%`}}></div>
                 </div>
               </div>
             )) : <p className="text-center py-10 text-gray-400 font-bold text-[10px] uppercase tracking-widest italic opacity-50">Aucune donnée disponible</p>}
           </div>
        </div>
        <div className="lg:col-span-2 bg-blue-600 rounded-[40px] p-16 text-white flex flex-col justify-center relative shadow-2xl overflow-hidden group">
           <div className="relative z-10">
              <h2 className="text-5xl font-black mb-6 tracking-tighter leading-none">CommercePro <br/> Cloud ERP</h2>
              <p className="text-blue-100 text-lg mb-10 max-w-sm font-medium opacity-80">Votre gestion commerciale centralisée même en mode restreint.</p>
              <button onClick={fetchData} className="bg-white text-blue-600 font-black px-12 py-5 rounded-[22px] hover:scale-105 transition-all shadow-xl text-xs uppercase tracking-widest">Actualiser</button>
           </div>
           <Package className="absolute -bottom-20 -right-20 opacity-10 group-hover:rotate-12 transition-transform duration-1000" size={400} />
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 flex flex-col gap-6 group hover:border-blue-200 transition-all hover:-translate-y-1">
    <div className={`p-4 rounded-[22px] w-fit ${color} text-white shadow-lg`}>{icon}</div>
    <div>
      <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">{title}</p>
      <h3 className="text-3xl font-black mt-2 tracking-tighter text-gray-900">{value}</h3>
    </div>
  </div>
);

export default Dashboard;
