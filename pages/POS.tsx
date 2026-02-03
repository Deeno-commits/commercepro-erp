
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Printer, 
  Truck, 
  CheckCircle, 
  RefreshCcw,
  Package,
  User as UserIcon,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { Product, SaleItem, BusinessInfo } from '../types';

const POS: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState({ name: 'Client Passager', phone: '', address: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bizInfo, setBizInfo] = useState<BusinessInfo | null>(null);

  const fetchData = async () => {
    const { data: prs } = await supabase.from('products').select('*').eq('is_active', true).order('name');
    const { data: biz } = await supabase.from('business_info').select('*').eq('id', 1).maybeSingle();
    if (prs) setProducts(prs);
    if (biz) setBizInfo(biz);
  };

  useEffect(() => { fetchData(); }, []);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      updateQuantity(existing.id, (existing.quantity + 1).toString());
    } else {
      setCart([...cart, {
        id: Math.random().toString(),
        sale_id: '',
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.selling_price,
        total: product.selling_price
      }]);
    }
  };

  const updateQuantity = (id: string, qty: string) => {
    const n = qty === '' ? 0 : Math.max(0, parseInt(qty) || 0);
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: n, total: n * item.unit_price } : item
    ));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = useMemo(() => cart.reduce((acc, item) => acc + item.total, 0), [cart]);

  const handleSale = async (type: 'sold' | 'delivery') => {
    if (cart.length === 0 || !user || isProcessing) return;
    if (cart.some(item => item.quantity <= 0)) {
      alert("Veuillez saisir une quantité valide.");
      return;
    }

    setIsProcessing(true);
    try {
      const saleNumber = 'FAC-' + Date.now().toString().slice(-6);
      const { data: sale, error: saleError } = await supabase.from('sales').insert([{
        sale_number: saleNumber,
        customer_name: customer.name,
        customer_phone: customer.phone,
        total_amount: total,
        amount_paid: total,
        created_by: user.id,
        delivery_status: type === 'delivery' ? 'pending' : 'none',
        status: 'completed'
      }]).select().single();
      
      if (saleError) throw saleError;
      
      for (const item of cart) {
        await supabase.from('sale_items').insert([{
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: item.product_name,
          total: item.total
        }]);
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (p) await supabase.from('products').update({ stock_quantity: p.stock_quantity - item.quantity }).eq('id', item.product_id);
      }
      
      setLastSale({ ...sale, items: cart });
      setShowSuccessModal(true);
      setCart([]);
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const printInvoice = () => {
    // Petit délai pour forcer le rendu des données dans le DOM avant d'ouvrir la boîte de dialogue
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Composant Facture Dédié pour l'impression
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
            <p className="text-[10px] font-bold text-gray-400">{new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 py-6 border-y-2 border-gray-100 mb-8">
          <div>
            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Caissier :</p>
            <p className="text-[11px] font-black uppercase underline decoration-blue-600">{user?.first_name}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Client :</p>
            <p className="text-[11px] font-black uppercase">{lastSale.customer_name}</p>
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
                Document officiel généré par CommercePro Cloud. Marchandises non échangeables.
              </p>
            </div>
            <div className="text-center w-[45mm] pb-4">
              <p className="text-[9px] font-black uppercase mb-10">Signature / Cachet</p>
              <div className="h-[1px] bg-black"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 overflow-hidden relative pb-10">
      
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

      <div className="flex-1 flex flex-col gap-6 bg-white p-6 rounded-[40px] shadow-sm border border-gray-100 no-print">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
          <input type="text" placeholder="Rechercher produit..." className="w-full pl-16 pr-6 py-5 bg-gray-50 border-none rounded-[24px] font-bold text-xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredProducts.map(p => (
            <div key={p.id} onClick={() => addToCart(p)} className="p-4 bg-white border border-gray-50 rounded-2xl flex items-center justify-between hover:border-blue-400 cursor-pointer group transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black"><Package size={24} /></div>
                <div><h4 className="font-black text-sm uppercase">{p.name}</h4><p className="text-[10px] text-gray-400 font-bold uppercase">{p.category}</p></div>
              </div>
              <p className="text-lg font-black text-blue-600">{p.selling_price.toLocaleString()} Ar</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[450px] flex flex-col bg-white rounded-[40px] shadow-2xl border border-gray-100 no-print">
        <div className="p-6 bg-blue-600 text-white rounded-t-[40px] flex justify-between items-center">
          <h3 className="font-black text-xl uppercase tracking-tighter">Caisse</h3>
          <span className="text-xs font-black bg-white/20 px-4 py-1.5 rounded-full">{cart.length} Articles</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {cart.map(item => (
            <div key={item.id} className="bg-gray-50 p-4 rounded-3xl flex items-center gap-4 border border-gray-100 group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate uppercase text-gray-800">{item.product_name}</p>
                <p className="text-[10px] font-bold text-gray-400">{item.unit_price.toLocaleString()} Ar</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min="1"
                  value={item.quantity || ''}
                  onChange={(e) => updateQuantity(item.id, e.target.value)}
                  className="w-14 p-2 bg-white rounded-xl border-none shadow-sm text-center font-black text-blue-600 text-sm"
                />
                <button onClick={() => removeItem(item.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 space-y-6 rounded-b-[40px]">
          <input placeholder="Nom Client..." className="w-full p-4 rounded-2xl border-none bg-white text-sm font-bold shadow-sm" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-gray-400 font-black uppercase">Total</span>
            <span className="text-4xl font-black text-gray-900">{total.toLocaleString()} <span className="text-sm text-blue-600">Ar</span></span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleSale('sold')} disabled={!cart.length || isProcessing} className="py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-blue-700 active:scale-95 transition-all">Payer Cash</button>
            <button onClick={() => handleSale('delivery')} disabled={!cart.length || isProcessing} className="py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-black active:scale-95 transition-all">À Livrer</button>
          </div>
        </div>
      </div>

      {showSuccessModal && lastSale && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 no-print">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col gap-6 w-full max-w-sm text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle size={40} /></div>
            <h2 className="text-3xl font-black tracking-tight uppercase">Vente Validée</h2>
            <div className="space-y-3">
              <button 
                onClick={printInvoice} 
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 shadow-xl"
              >
                <Printer size={18} /> Imprimer Reçu
              </button>
              <button 
                onClick={() => {setShowSuccessModal(false); setLastSale(null);}} 
                className="w-full py-5 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-[10px]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
