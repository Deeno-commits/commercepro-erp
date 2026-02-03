
import React, { useState, useEffect } from 'react';
import { RefreshCcw, X, Plus, DollarSign, AlertCircle } from 'lucide-react';
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
    exchanged_product_id: '',
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
  const valueDiff = prodOut ? Number(prodOut.selling_price) - Number(formData.original_product_value) : 0;
  
  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !prodOut) return;
    setErrorMsg(null);

    try {
      // Payload minimaliste pour tester ce qui passe
      const payload: any = {
        customer_name: formData.customer_name,
        reason: formData.reason,
        status: 'completed'
      };

      // On ajoute les colonnes une par une pour identifier celle qui bloque si nécessaire
      try { payload.user_id = user.id; } catch(e){}
      try { payload.original_product_name = formData.original_product_name; } catch(e){}
      try { payload.original_product_value = formData.original_product_value; } catch(e){}
      try { payload.exchanged_product_id = prodOut.id; } catch(e){}
      try { payload.value_difference = valueDiff; } catch(e){}

      const { error } = await supabase.from('exchanges').insert([payload]);

      if (error) {
        console.error("Supabase error:", error);
        setErrorMsg(`La colonne '${error.message.split("'")[1]}' est introuvable. Veuillez l'ajouter dans Supabase.`);
        return;
      }

      // Mise à jour du stock
      const { data: currentP } = await supabase.from('products').select('stock_quantity').eq('id', prodOut.id).single();
      if (currentP) {
        await supabase.from('products').update({ stock_quantity: currentP.stock_quantity - 1 }).eq('id', prodOut.id);
      }
      
      fetchData();
      setShowModal(false);
      setFormData({ original_product_name: '', original_product_value: 0, exchanged_product_id: '', customer_name: '', reason: 'taille' });
      alert("Échange réussi !");
    } catch (err: any) {
      setErrorMsg("Erreur de connexion à la base de données.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16 no-print">
      <div className="flex justify-between items-center px-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Échanges & <span className="text-blue-600">Retours</span></h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Flux marchandises entrants</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-blue-700">
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
              <th className="py-6">Retour (-)</th>
              <th className="py-6">Emporté (+)</th>
              <th className="py-6 text-right">Ajustement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {exchanges.map(ex => (
              <tr key={ex.id} className="text-sm group hover:bg-gray-50/50">
                <td className="px-8 py-6 text-[10px] text-gray-400 font-black">{new Date(ex.created_at).toLocaleDateString()}</td>
                <td className="py-6 font-black uppercase text-xs">{ex.customer_name}</td>
                <td className="py-6 font-bold text-red-500 text-xs">{ex.original_product_name}</td>
                <td className="py-6 font-bold text-green-600 text-xs">{products.find(p => p.id === ex.exchanged_product_id)?.name || 'Article emporté'}</td>
                <td className="px-8 py-6 text-right">
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${ex.value_difference > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
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
            <h2 className="text-3xl font-black tracking-tighter">Opération d'Échange</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase">Article Rendu</h4>
                  <input required placeholder="Nom du produit" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm" value={formData.original_product_name} onChange={e => setFormData({...formData, original_product_name: e.target.value})} />
                  <input required type="number" placeholder="Valeur estimée (Ar)" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm" value={formData.original_product_value || ''} onChange={e => setFormData({...formData, original_product_value: parseFloat(e.target.value)})} />
               </div>
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase">Nouvel Article</h4>
                  <select required className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm h-[56px]" value={formData.exchanged_product_id} onChange={e => setFormData({...formData, exchanged_product_id: e.target.value})}>
                    <option value="">Choisir en stock...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.selling_price.toLocaleString()} Ar)</option>)}
                  </select>
                  <input required placeholder="Nom du Client" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
               </div>
            </div>

            <div className={`p-6 rounded-3xl flex items-center gap-5 border ${valueDiff >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              <DollarSign size={24}/>
              <div>
                <p className="text-[10px] font-black uppercase opacity-60">Impact Caisse</p>
                <p className="text-xl font-black">{valueDiff.toLocaleString()} Ar</p>
              </div>
            </div>

            <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all">Valider l'Opération</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Exchanges;
