
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
  ExternalLink,
  Printer
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BusinessInfo } from '../types';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [bizInfo, setBizInfo] = useState<BusinessInfo | null>(null);
  
  // États pour l'impression de facture historique
  const [lastSale, setLastSale] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const productionUrl = "https://commercepro-erp.vercel.app/";

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sales } = await supabase.from('sales').select('total_amount');
      const { data: recent } = await supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false }).limit(20);
      const { data: drivers } = await supabase.from('deliveries').select('*').eq('work_status', 'active');
      const { data: biz } = await supabase.from('business_info').select('*').eq('id', 1).maybeSingle();
      
      if (sales) setTotalSales(sales.reduce((acc, s) => acc + Number(s.total_amount), 0));
      if (recent) setRecentOrders(recent);
      if (drivers) setActiveDrivers(drivers);
      if (biz) setBizInfo(biz);
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
    navigator.clipboard.writeText(productionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInvoicePrint = (order: any) => {
    setLastSale({
      ...order,
      items: order.sale_items || []
    });
    setTimeout(() => {
        window.print();
    }, 500);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(productionUrl)}`;

  // Composant Facture Dédié (Identique au POS pour cohérence visuelle)
  const InvoicePrint = () => {
    if (!lastSale) return null;
    return (
      <div id="invoice-capture" className="print-only bg-white text-gray-900 p-8 w-[148mm] min-h-[210mm] border-[4px] border-black font-sans box-border">
        <div className="flex justify-between items-start mb-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-black uppercase leading-none">{bizInfo?.name || 'COMMERCE PRO'}</h1>
            <p className="text-[10px] font-black uppercase text-gray-400">{bizInfo?.type || 'STORE'}</p>
            <p className="text-[9px] font-bold mt-4 opacity-70 max-w-[50mm] leading-tight">{bizInfo?.address}</p>
            <p className="text-[12px] font-black mt-2">TEL: {bizInfo?.phone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase text-blue-600">FACTURE</h2>
            <p className="text-[11px] font-black mt-1">N° {lastSale.sale_number}</p>
            <p className="text-[10px] font-bold text-gray-400">{new Date(lastSale.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 py-6 border-y-2 border-gray-100 mb-8">
          <div>
            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Détails Commande :</p>
            <p className="text-[11px] font-black uppercase underline decoration-blue-600">Client: {lastSale.customer_name}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Status Livraison :</p>
            <p className="text-[11px] font-black uppercase">{lastSale.delivery_status}</p>
          </div>
        </div>

        <table className="w-full text-left mb-10">
          <thead>
            <tr className="border-b-4 border-black">
              <th className="py-2 text-[10px] font-black uppercase">Article</th>
              <th className="py-2 text-[10px] font-black uppercase text-center">Qté</th>
              <th className="py-2 text-[10px] font-black uppercase text-right">P.U</th>
              <th className="py-2 text-[10px] font-black uppercase text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lastSale.items.map((item: any) => (
              <tr key={item.id}>
                <td className="py-4 text-[10px] font-bold uppercase">{item.product_name}</td>
                <td className="py-4 text-[10px] font-black text-center">x{item.quantity}</td>
                <td className="py-4 text-[10px] text-right">{item.unit_price.toLocaleString()}</td>
                <td className="py-4 text-[10px] font-black text-right">{item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-auto pt-4 border-t-2 border-black">
          <div className="flex justify-between items-center bg-black text-white p-5 rounded-sm">
            <span className="text-[10px] font-black uppercase">Somme Totale (Ar)</span>
            <span className="text-2xl font-black">{lastSale.total_amount.toLocaleString()} Ar</span>
          </div>
          <div className="flex justify-between items-end mt-10">
            <div className="space-y-4">
              <div className="p-1 border-2 border-black rounded-sm inline-block">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${lastSale.sale_number}`} className="w-14 h-14" />
              </div>
              <p className="text-[7px] font-black uppercase max-w-[55mm] opacity-40 leading-none italic">
                Ré-impression de facture effectuée le {new Date().toLocaleString()}.
              </p>
            </div>
            <div className="text-center w-[45mm] pb-4">
              <p className="text-[9px] font-black uppercase mb-10">Signature Nexus</p>
              <div className="h-[1px] bg-black"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-16 px-4 no-print">
      
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-capture, #invoice-capture * { visibility: visible !important; }
          #invoice-capture { 
            position: fixed !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 148mm !important; 
            height: 210mm !important; 
            display: block !important; 
            background: white !important;
            z-index: 99999 !important;
            padding: 10mm !important;
            box-sizing: border-box !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <InvoicePrint />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900">Nexus <span className="text-blue-600">Rapports</span></h1>
          <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Supervision opérationnelle globale</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="font-black text-xl mb-8 flex items-center gap-3"><Clock className="text-blue-600" /> Historique Transactions</h3>
            <div className="space-y-6">
              {recentOrders.length > 0 ? recentOrders.map(order => (
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
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-black text-blue-600">{Number(order.total_amount).toLocaleString()} Ar</p>
                      </div>
                      {/* BOUTON FACTURE AJOUTÉ */}
                      <button 
                        onClick={() => openInvoicePrint(order)}
                        className="p-3 bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl border border-gray-100 shadow-sm transition-all"
                      >
                        <Printer size={18} />
                      </button>
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
              )) : (
                <div className="py-20 text-center opacity-20">
                  <Package size={48} className="mx-auto mb-4" />
                  <p className="font-black uppercase text-xs">Aucune transaction Nexus</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-blue-600 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
            <Globe className="absolute -right-10 -bottom-10 opacity-20" size={200} />
            <div className="relative z-10 space-y-6">
              <h3 className="font-black text-xl uppercase tracking-tighter">Nexus Cloud</h3>
              <p className="text-blue-100 text-xs font-bold leading-relaxed uppercase">
                Lien universel pour terminaux mobiles et livreurs distants.
              </p>
              
              <div className="bg-white/10 p-5 rounded-3xl border border-white/20">
                <p className="text-[10px] font-black uppercase mb-3 text-blue-200">Point d'accès</p>
                <div className="text-[10px] font-black bg-black/20 p-3 rounded-xl break-all">
                  {productionUrl}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center gap-6 text-center">
             <div>
               <h3 className="font-black text-lg mb-2 uppercase tracking-tighter">Accès Mobile</h3>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scanner QR Nexus</p>
             </div>
             <div className="bg-gray-50 p-6 rounded-[32px] border-2 border-dashed border-gray-200">
                <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
             </div>
             <button 
                onClick={copyToClipboard}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${copied ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {copied ? <Check size={16} className="inline mr-2"/> : <Copy size={16} className="inline mr-2"/>}
                {copied ? 'Lien Nexus Copié' : 'Copier Lien Cloud'}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
