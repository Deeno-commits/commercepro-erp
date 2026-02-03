
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Package, 
  AlertTriangle, 
  Tag,
  Box,
  X,
  Trash2,
  Edit2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (data) {
      setProducts(data);
      const uniqueCats = Array.from(new Set(data.map(p => p.category))).filter(Boolean) as string[];
      setCategories(uniqueCats);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    const channel = supabase.channel('inventory-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const [formState, setFormState] = useState({
    name: '',
    category: '',
    purchase_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    min_stock_level: 5,
    sku: ''
  });

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        const { error } = await supabase.from('products').update(formState).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const sku = formState.sku || 'SKU-' + Math.floor(Math.random() * 100000);
        const { error } = await supabase.from('products').insert([{ ...formState, sku, is_active: true }]);
        if (error) throw error;
      }
      fetchProducts();
      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
    } catch (err: any) {
      alert("Erreur Supabase: " + err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm("⚠️ Souhaitez-vous vraiment supprimer cet article ? Cette action est définitive.")) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        fetchProducts();
        setActiveMenuId(null);
      } else {
        alert("Impossible de supprimer : cet article est probablement lié à des factures existantes.");
      }
    }
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormState({
      name: p.name,
      category: p.category,
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      stock_quantity: p.stock_quantity,
      min_stock_level: p.min_stock_level,
      sku: p.sku
    });
    setShowAddModal(true);
    setActiveMenuId(null);
  };

  const resetForm = () => {
    setFormState({ name: '', category: '', purchase_price: 0, selling_price: 0, stock_quantity: 0, min_stock_level: 5, sku: '' });
  };

  const filteredProducts = products.filter(p => 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterCategory === 'all' || p.category === filterCategory)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Gestion <span className="text-blue-600">Stock</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Inventaire réel centralisé</p>
        </div>
        <button onClick={() => { setEditingProduct(null); resetForm(); setShowAddModal(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all">
          <Plus size={20} /> Nouvel Article
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Rechercher (Nom, SKU)..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="relative">
          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <select className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold appearance-none cursor-pointer" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">Toutes Catégories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100">
          <AlertTriangle size={20} />
          <span className="text-xs font-black uppercase">{products.filter(p => p.stock_quantity <= p.min_stock_level).length} Ruptures</span>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-visible">
        {loading ? (
          <div className="p-20 flex justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto overflow-visible">
            <table className="w-full text-left border-collapse overflow-visible">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-wider text-gray-400">Désignation</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-gray-400">Catégorie</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-gray-400">Niveau Stock</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">P. Achat</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">P. Vente</th>
                  <th className="px-8 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 overflow-visible">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400"><Box size={20} /></div>
                        <div><p className="font-black text-sm uppercase text-gray-900 tracking-tight">{p.name}</p><p className="text-[10px] text-gray-400 font-bold">#{p.sku}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><span className="text-[10px] font-black uppercase bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{p.category || 'Général'}</span></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${p.stock_quantity <= p.min_stock_level ? 'text-red-500' : 'text-gray-900'}`}>{p.stock_quantity}</span>
                        {p.stock_quantity <= p.min_stock_level && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-200"></div>}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-xs text-gray-400">{Number(p.purchase_price).toLocaleString()} Ar</td>
                    <td className="px-6 py-5 text-right font-black text-sm text-blue-600">{Number(p.selling_price).toLocaleString()} Ar</td>
                    <td className="px-8 py-5 text-right relative overflow-visible">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                        className="p-2 text-gray-300 hover:text-blue-600 transition-all rounded-lg hover:bg-white"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {activeMenuId === p.id && (
                        <div className="absolute right-12 top-0 w-48 bg-white shadow-2xl rounded-2xl border border-gray-100 z-[100] p-2 animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={() => openEdit(p)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                            <Edit2 size={16} /> Modifier
                          </button>
                          <div className="h-px bg-gray-50 my-1"></div>
                          <button onClick={() => deleteProduct(p.id)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">
                            <Trash2 size={16} /> Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => { setShowAddModal(false); setEditingProduct(null); }} className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-full transition-all"><X size={20} /></button>
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black tracking-tighter uppercase">{editingProduct ? 'Modifier' : 'Nouveau'} Produit</h2>
              <p className="text-gray-400 text-sm font-medium">Informations obligatoires pour le suivi financier.</p>
            </div>
            <form onSubmit={handleAction} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Désignation</label>
                <input required placeholder="Ex: Basket Nike Air" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Catégorie</label>
                  <input required placeholder="Ex: Chaussures" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" value={formState.category} onChange={e => setFormState({...formState, category: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Code SKU</label>
                  <input placeholder="Ex: BSK-001" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" value={formState.sku} onChange={e => setFormState({...formState, sku: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">P. Achat (Ar)</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" value={formState.purchase_price || ''} onChange={e => setFormState({...formState, purchase_price: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">P. Vente (Ar)</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" value={formState.selling_price || ''} onChange={e => setFormState({...formState, selling_price: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Stock Initial</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" value={formState.stock_quantity || ''} onChange={e => setFormState({...formState, stock_quantity: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Seuil d'Alerte</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" value={formState.min_stock_level || ''} onChange={e => setFormState({...formState, min_stock_level: parseInt(e.target.value)})} />
                </div>
              </div>
              <button type="submit" className="w-full py-6 rounded-3xl font-black uppercase text-[10px] tracking-widest bg-blue-600 text-white hover:bg-blue-700 shadow-2xl transition-all active:scale-95">
                {editingProduct ? 'Mettre à jour' : 'Enregistrer Article'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
