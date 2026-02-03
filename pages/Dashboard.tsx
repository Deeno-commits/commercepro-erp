
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  ShoppingCart,
  Truck,
  RefreshCcw,
  Video,
  MapPin,
  Mic,
  Maximize2,
  PhoneCall,
  VideoOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';

const Dashboard: React.FC = () => {
  const { dbError } = useAuth();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [stats, setStats] = useState({ ca: 0, orders: 0, stockTotal: 0, activeDrivers: 0 });
  const [loading, setLoading] = useState(true);
  const [activeCam, setActiveCam] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        supabase.from('sales').select('total_amount'),
        supabase.from('products').select('stock_quantity'),
        supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('work_status', 'active'),
      ]);

      const sales = (results[0] as any).value?.data || [];
      const prods = (results[1] as any).value?.data || [];
      const driversCount = (results[2] as any).value?.count || 0;

      const caTotal = sales.reduce((acc: number, s: any) => acc + Number(s.total_amount), 0);
      const stockTotal = prods.reduce((acc: number, p: any) => acc + Number(p.stock_quantity), 0);

      setStats({ ca: caTotal, orders: sales.length, stockTotal, activeDrivers: driversCount });
    } catch (err) {
      console.warn("Using fallback stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [period]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Nexus <span className="text-blue-600">Admin</span></h1>
          <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Supervision opérationnelle globale</p>
        </div>
        <div className="flex p-1.5 bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-x-auto max-w-full">
          {(['day', 'week', 'month'] as const).map(p => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${period === p ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-gray-400'}`}
            >
              {p === 'day' ? "Aujourd'hui" : p === 'week' ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="CA Total" value={`${stats.ca.toLocaleString()} Ar`} icon={<DollarSign />} color="bg-blue-600" />
        <StatCard title="Transactions" value={stats.orders.toString()} icon={<ShoppingCart />} color="bg-indigo-600" />
        <StatCard title="Stock Global" value={stats.stockTotal.toLocaleString()} icon={<Package />} color="bg-orange-600" />
        <StatCard title="Drivers Live" value={stats.activeDrivers.toString()} icon={<Truck />} color="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CONTROL CENTER : LIVE VIDEO MONITORING */}
        <div className="lg:col-span-2 bg-gray-950 rounded-[48px] p-6 lg:p-10 text-white shadow-2xl relative overflow-hidden group border border-white/5">
           <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none"></div>
           <div className="relative z-10 flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center animate-pulse shadow-xl shadow-red-500/50">
                    <Video size={20}/>
                 </div>
                 <div>
                    <h3 className="font-black text-lg uppercase tracking-tight">Nexus Video Live</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">
                       {activeCam ? 'Liaison vidéo établie' : 'Attente instruction admin'}
                    </p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button className={`p-3 rounded-2xl transition-all border border-white/10 ${activeCam ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400'}`} onClick={() => setActiveCam(activeCam ? null : 1)}>
                    {activeCam ? <VideoOff size={18}/> : <PhoneCall size={18}/>}
                 </button>
                 <button className="p-3 bg-white/5 text-gray-400 rounded-2xl border border-white/10"><Maximize2 size={18}/></button>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-auto sm:h-[400px]">
              <div className="bg-black rounded-[32px] overflow-hidden relative border border-white/10 group/cam min-h-[200px]">
                 {activeCam ? (
                   <img src="https://images.unsplash.com/photo-1556740734-7f9a2b7a0f4d?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover animate-in fade-in duration-1000" />
                 ) : (
                   <div className="absolute inset-0 flex items-center justify-center opacity-20"><Video size={40}/></div>
                 )}
                 <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border border-white/10">CAM 01 - CAISSE</div>
              </div>
              <div className="bg-black rounded-[32px] overflow-hidden relative border border-white/10 group/cam min-h-[200px]">
                 {activeCam ? (
                   <img src="https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover animate-in fade-in duration-1000" />
                 ) : (
                   <div className="absolute inset-0 flex items-center justify-center opacity-20"><Video size={40}/></div>
                 )}
                 <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border border-white/10">CAM 02 - STOCK</div>
              </div>
           </div>
           
           {!activeCam && (
             <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Cliquez sur l'icône téléphone pour initier la liaison vidéo avec vos équipes</p>
             </div>
           )}
        </div>

        {/* GPS QUICK VIEW */}
        <div className="bg-white rounded-[48px] p-10 shadow-sm border border-gray-100 flex flex-col gap-6">
           <h3 className="font-black text-lg uppercase flex items-center gap-3"><MapPin className="text-blue-600"/> Télémétrie</h3>
           <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px]">
              {[1, 2].map(i => (
                <div key={i} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm"><Truck size={18} className="text-blue-600"/></div>
                      <div>
                         <p className="text-[11px] font-black uppercase">Livreur 0{i}</p>
                         <p className="text-[9px] font-bold text-gray-400 uppercase">En mouvement</p>
                      </div>
                   </div>
                   <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-200 animate-pulse"></div>
                </div>
              ))}
           </div>
           <button onClick={() => window.location.hash = '/deliveries'} className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl">Carte Temps Réel</button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col gap-6 group hover:border-blue-200 transition-all">
    <div className={`p-4 rounded-[18px] w-fit ${color} text-white shadow-lg`}>{icon}</div>
    <div>
      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black mt-1 tracking-tighter text-gray-900">{value}</h3>
    </div>
  </div>
);

export default Dashboard;
