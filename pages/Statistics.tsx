
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Download, RefreshCw, BarChart3, TrendingUp, Package, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

const COLORS = ['#2563eb', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ caTotal: 0, count: 0, avg: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sales } = await supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: true });
      
      if (sales) {
        setRawSales(sales);
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const chartMap: any = {};
        sales.forEach(s => {
          const m = months[new Date(s.created_at).getMonth()];
          chartMap[m] = (chartMap[m] || 0) + Number(s.total_amount);
        });
        setSalesData(Object.entries(chartMap).map(([name, sales]) => ({ name, sales })));
        
        const total = sales.reduce((a, b) => a + Number(b.total_amount), 0);
        setMetrics({ caTotal: total, count: sales.length, avg: sales.length ? total / sales.length : 0 });

        const pMap: any = {};
        sales.forEach(s => s.sale_items?.forEach((i: any) => {
          pMap[i.product_name] = (pMap[i.product_name] || 0) + i.quantity;
        }));
        const top = Object.entries(pMap).map(([name, qty]) => ({ name, qty: Number(qty) })).sort((a, b) => b.qty - a.qty).slice(0, 5);
        setTopProducts(top);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExportFull = () => {
    let csv = "RAPPORT COMMERCIAL COMPLET - " + new Date().toLocaleDateString() + "\n\n";
    csv += "--- RESUME GLOBAL ---\n";
    csv += `Chiffre d'Affaires Total;${metrics.caTotal} Ar\n`;
    csv += `Nombre de Ventes;${metrics.count}\n`;
    csv += `Panier Moyen;${Math.round(metrics.avg)} Ar\n\n`;
    csv += "--- TOP PRODUITS ---\n";
    csv += "PRODUIT;UNITES VENDUES\n";
    topProducts.forEach(p => { csv += `${p.name};${p.qty}\n`; });
    csv += "\n--- DETAILS DES VENTES ---\n";
    csv += "N_FACTURE;DATE;CLIENT;STATUT;TOTAL\n";
    rawSales.forEach(s => {
      csv += `${s.sale_number};${new Date(s.created_at).toLocaleString()};${s.customer_name};${s.delivery_status};${s.total_amount}\n`;
    });
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900">Performance <span className="text-blue-600">Analytique</span></h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Extraction temps réel des métriques</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all shadow-sm">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExportFull} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-blue-700 transition-all">
            <Download size={18} /> Export CSV Complet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MetricCard title="C.A Global" value={`${metrics.caTotal.toLocaleString()} Ar`} icon={<TrendingUp />} color="bg-blue-600" />
        <MetricCard title="Panier Moyen" value={`${Math.round(metrics.avg).toLocaleString()} Ar`} icon={<Package />} color="bg-indigo-600" />
        <MetricCard title="Transactions" value={metrics.count.toString()} icon={<Users />} color="bg-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-10 rounded-[40px] shadow-sm border border-gray-100">
           <h3 className="font-black text-xl mb-8 flex items-center gap-3"><BarChart3 className="text-blue-600" /> Évolution Mensuelle</h3>
           <div className="h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={salesData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                 <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                 <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="lg:col-span-4 bg-gray-900 rounded-[40px] p-10 text-white shadow-2xl flex flex-col gap-8">
           <h3 className="font-black text-xl flex items-center gap-3">Top Articles</h3>
           <div className="space-y-6">
             {topProducts.map((p, i) => (
               <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                 <div className="min-w-0">
                    <p className="text-xs font-black uppercase truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{p.qty} unités vendues</p>
                 </div>
                 <span className="text-blue-500 font-black">#{i+1}</span>
               </div>
             ))}
             {topProducts.length === 0 && <p className="text-center py-10 opacity-30 text-[10px] font-black uppercase">Aucune vente</p>}
           </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{title: string, value: string, icon: any, color: string}> = ({title, value, icon, color}) => (
  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex items-center gap-6">
    <div className={`p-4 rounded-2xl ${color} text-white shadow-lg`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      <p className="text-2xl font-black tracking-tighter">{value}</p>
    </div>
  </div>
);

export default Statistics;
