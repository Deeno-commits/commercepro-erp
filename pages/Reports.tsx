
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Smartphone, 
  TrendingUp, 
  Clock, 
  Truck, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Globe,
  Package,
  Copy,
  Check,
  Info,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  
  const currentOrigin = window.location.origin;
  const isLocalhost = currentOrigin.includes('localhost');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sales } = await supabase.from('sales').select('total_amount');
      const { data: recent } = await supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false }).limit(10);
      const { data: drivers } = await supabase.from('deliveries').select('*').eq('work_status', 'active');
      
      if (sales) setTotalSales(sales.reduce((acc, s) => acc + Number(s.total_amount), 0));
      if (recent) setRecentOrders(recent);
      if (drivers) setActiveDrivers(drivers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const assignDriver = async (orderId: string, driverId: string) => {
    const { error } = await supabase.from('sales').update({ 
      assigned_driver_id: driverId,
      delivery_status: 'assigned' 
    }).eq('id', orderId);
    if (!error) fetchData();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentOrigin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentOrigin)}`;

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-16 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900">Rapports & <span className="text-blue-600">Activité</span></h1>
          <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Supervision opérationnelle globale</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="font-black text-xl mb-8 flex items-center gap-3"><Clock className="text-blue-600" /> Historique des Transactions</h3>
            <div className="space-y-6">
              {recentOrders.map(order => (
                <div key={order.id} className="p-6 bg-gray-50 rounded-[32px] border border-transparent hover:border-blue-200 transition-all flex flex-col gap-4">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${order.delivery_status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        {order.delivery_status === 'delivered' ? <CheckCircle2 size={24}/> : <Package size={24}/>}
                      </div>
                      <div>
                        <p className="font-black text-sm text-gray-900 uppercase tracking-tight">#{order.sale_number} - {order.customer_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-blue-600">{Number(order.total_amount).toLocaleString()} Ar</p>
                    </div>
                  </div>
                  {order.delivery_status === 'pending' && (
                    <div className="pl-16 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center gap-3">
                       <p className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-2">Assigner un livreur :</p>
                       <select 
                        className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold"
                        onChange={(e) => assignDriver(order.id, e.target.value)}
                        value={order.assigned_driver_id || ""}
                       >
                         <option value="">Sélectionner...</option>
                         {activeDrivers.map(d => <option key={d.id} value={d.id}>{d.driver_name}</option>)}
                       </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* NOUVELLE SECTION : ACCÈS DISTANCE (4G/5G) */}
          <div className="bg-blue-600 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
            <Globe className="absolute -right-10 -bottom-10 opacity-20" size={200} />
            <div className="relative z-10 space-y-6">
              <h3 className="font-black text-xl uppercase tracking-tighter">Accès Public (4G/5G)</h3>
              <p className="text-blue-100 text-xs font-bold leading-relaxed uppercase">
                Pour que vos livreurs se connectent depuis la rue (hors Wi-Fi), vous devez utiliser un "Tunnel" ou déployer l'app.
              </p>
              
              <div className="bg-white/10 p-5 rounded-3xl border border-white/20">
                <p className="text-[10px] font-black uppercase mb-3 text-blue-200">Option 1 : ngrok (Gratuit)</p>
                <ol className="text-[9px] font-bold space-y-2 uppercase list-decimal pl-4">
                  <li>Installez <a href="https://ngrok.com" target="_blank" className="underline font-black">ngrok</a></li>
                  <li>Tapez : <code className="bg-black/20 p-1">ngrok http 5173</code></li>
                  <li>Envoyez le lien <span className="text-white underline">https://...</span> au livreur</li>
                </ol>
              </div>

              <div className="bg-white/10 p-5 rounded-3xl border border-white/20">
                <p className="text-[10px] font-black uppercase mb-3 text-blue-200">Option 2 : Déploiement</p>
                <p className="text-[9px] font-bold uppercase">
                  Publiez sur <span className="font-black text-white">Vercel</span> ou <span className="font-black text-white">Netlify</span> pour avoir une adresse fixe (ex: <span className="italic">monshop.vercel.app</span>).
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center gap-6 text-center">
             <div>
               <h3 className="font-black text-lg mb-2 uppercase">Lien Wi-Fi Local</h3>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Seulement sur le même réseau</p>
             </div>
             <div className="bg-gray-50 p-6 rounded-[32px] border-2 border-dashed border-gray-200">
                <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
             </div>
             <button 
                onClick={copyToClipboard}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${copied ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {copied ? <Check size={16} className="inline mr-2"/> : <Copy size={16} className="inline mr-2"/>}
                {copied ? 'Copié' : 'Copier Lien'}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
