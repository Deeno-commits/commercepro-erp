
import React, { useState, useEffect } from 'react';
import { RefreshCcw, X, Plus, DollarSign, AlertCircle, ArrowRightLeft, Scale } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';

const Exchanges: React.FC = () => {
  const { user } = useAuth();
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    original_product_name: '',
    original_product_value: 0,
    original_quantity: 1, // Nouvelle quantité
    exchanged_product_id: '',
    exchanged_quantity: 1, // Nouvelle quantité
    customer_name: '',
    reason: 'taille'
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: exData } = await supabase.from('exchanges').select('*').order('created_at', { ascending: false });
    const { data: prData } = await supabase.from('products').select('*').eq('is_active', true);
    if (exData) setExchanges(exData);
    if (prData) setProducts(prData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const prodOut = products.find(p => p.id === formData.exchanged_product_id);
  
  // Calcul précis : (Prix Sortie * Qty Sortie) - (Prix Entrée * Qty Entrée)
  const totalValueIn = formData.original_product_value * formData.original_quantity;
  const totalValueOut = prodOut ? Number(prodOut.selling_price) * formData.exchanged_quantity : 0;
  const valueDiff = totalValueOut - totalValueIn;
  
  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !prodOut) return;
    setErrorMsg(null);

    try {
      const payload: any = {
        customer_name: formData.customer_name,
        reason: formData.reason,
        status: 'completed',
        user_id: user.id,
        original_product_name: `${formData.original_product_name} (x${formData.original_quantity})`,
        original_product_value: totalValueIn,
        exchanged_product_id: prodOut.id,
        value_difference: valueDiff
      };

      const { error } = await supabase.from('exchanges').insert([payload]);

      if (error) {
        console.error("Supabase error:", error);
        setErrorMsg("Erreur lors de l'enregistrement de l'échange. Vérifiez les droits d'accès.");
        return;
      }

      // Mise à jour du stock avec la quantité exacte choisie pour l'échange
      const { data: currentP } = await supabase.from('products').select('stock_quantity').eq('id', prodOut.id).single();
      if (currentP) {
        await supabase.from('products').update({ stock_quantity: currentP.stock_quantity - formData.exchanged_quantity }).eq('id', prodOut.id);
      }
      
      fetchData();
      setShowModal(false);
      setFormData({ 
        original_product_name: '', original_product_value: 0, original_quantity: 1,
        exchanged_product_id: '', exchanged_quantity: 1, customer_name: '', reason: 'taille' 
      });
      alert("Opération d'échange finalisée !");
    } catch (err: any) {
      setErrorMsg("Erreur de connexion critique.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16 no-print">
      <div className="flex justify-between items-center px-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Nexus <span className="text-blue-600">Échanges</span></h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Flux marchandises & Ajustements</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-blue-700 transition-all">
          <Plus size={18} /> Nouvel Échange
        </button>
      </div>

      {errorMsg && (
        <div className="mx-4 bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-xs font-bold">{errorMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-x-auto mx-4">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
              <th className="px-8 py-6">Date</th>
              <th className="py-6">Client</th>
              <th className="py-6">Retour Client (-)</th>
              <th className="py-6">Sortie Vendeur (+)</th>
              <th className="py-6 text-right">Ajustement Caisse</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {exchanges.map(ex => (
              <tr key={ex.id} className="text-sm group hover:bg-gray-50/50">
                <td className="px-8 py-6 text-[10px] text-gray-400 font-black">{new Date(ex.created_at).toLocaleDateString()}</td>
                <td className="py-6 font-black uppercase text-xs">{ex.customer_name}</td>
                <td className="py-6 font-bold text-red-500 text-xs">{ex.original_product_name}</td>
                <td className="py-6 font-bold text-green-600 text-xs">{products.find(p => p.id === ex.exchanged_product_id)?.name || 'Article Nexus'}</td>
                <td className="px-8 py-6 text-right">
                  <span className={`text-[11px] font-black px-4 py-2 rounded-xl ${ex.value_difference > 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400'}`}>
                    {ex.value_difference?.toLocaleString()} Ar
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <form onSubmit={handleExchange} className="bg-white w-full max-w-2xl rounded-[40px] p-10 space-y-8 animate-in zoom-in-95 relative shadow-2xl">
            <button type="button" onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-full transition-all"><X /></button>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><RefreshCcw size={24}/></div>
              <h2 className="text-3xl font-black tracking-tighter uppercase">Opération Échange</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-6 bg-red-50/50 rounded-3xl space-y-4 border border-red-100">
                  <h4 className="text-[10px] font-black text-red-600 uppercase flex items-center gap-2"><ArrowRightLeft size={12}/> Retour Client</h4>
                  <input required placeholder="Désignation produit" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm shadow-sm" value={formData.original_product_name} onChange={e => setFormData({...formData, original_product_name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="number" placeholder="Valeur Unit." className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm shadow-sm" value={formData.original_product_value || ''} onChange={e => setFormData({...formData, original_product_value: parseFloat(e.target.value)})} />
                    <input required type="number" placeholder="Qté" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm shadow-sm" value={formData.original_quantity || ''} onChange={e => setFormData({...formData, original_quantity: parseInt(e.target.value)})} />
                  </div>
               </div>
               <div className="p-6 bg-green-50/50 rounded-3xl space-y-4 border border-green-100">
                  <h4 className="text-[10px] font-black text-green-600 uppercase flex items-center gap-2"><Scale size={12}/> Sortie Stock</h4>
                  <select required className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm h-[56px] shadow-sm" value={formData.exchanged_product_id} onChange={e => setFormData({...formData, exchanged_product_id: e.target.value})}>
                    <option value="">Article en stock...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.selling_price.toLocaleString()} Ar)</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="number" placeholder="Qté Échange" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm shadow-sm" value={formData.exchanged_quantity || ''} onChange={e => setFormData({...formData, exchanged_quantity: parseInt(e.target.value)})} />
                    <input required placeholder="Nom Client" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm shadow-sm" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
                  </div>
               </div>
            </div>

            <div className={`p-8 rounded-[32px] flex items-center justify-between border ${valueDiff >= 0 ? 'bg-blue-600 text-white border-blue-400 shadow-xl shadow-blue-200' : 'bg-gray-100 border-gray-200 text-gray-900'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><DollarSign size={24}/></div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Ajustement Caisse</p>
                  <p className="text-3xl font-black">{valueDiff.toLocaleString()} Ar</p>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{valueDiff >= 0 ? 'Surplus Client' : 'Rendu Client'}</p>
            </div>

            <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all active:scale-95">Valider l'Échange Nexus</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Exchanges;
