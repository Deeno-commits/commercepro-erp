
import React, { useState, useEffect } from 'react';
import { Save, Building, MapPin, Phone, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BusinessInfo } from '../types';

const ConfigSettings: React.FC = () => {
  const [business, setBusiness] = useState<BusinessInfo>({
    id: 1, type: '', name: '', address: '', phone: ''
  });
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      const { data } = await supabase.from('business_info').select('*').eq('id', 1).single();
      if (data) setBusiness(data);
      setLoading(false);
    };
    fetchInfo();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('business_info').upsert([business]);
    if (!error) alert("Paramètres Nexus mis à jour !");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div><h1 className="text-3xl font-bold">Configuration Système</h1><p className="text-gray-500">Personnalisez l'identité de votre commerce.</p></div>
      <div className="flex gap-4 p-1 bg-white rounded-2xl shadow-sm border border-gray-100 w-fit">
        <button onClick={() => setActiveTab('info')} className={`px-6 py-2 rounded-xl font-bold text-sm ${activeTab === 'info' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}>Infos Commerce</button>
        <button onClick={() => setActiveTab('security')} className={`px-6 py-2 rounded-xl font-bold text-sm ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}>Rôles & Accès</button>
      </div>

      {activeTab === 'info' ? (
        <form onSubmit={handleSave} className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom Commercial</label><input className="w-full p-4 bg-gray-50 rounded-2xl" value={business.name} onChange={e => setBusiness({...business, name: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activité</label><input className="w-full p-4 bg-gray-50 rounded-2xl" value={business.type || ''} onChange={e => setBusiness({...business, type: e.target.value})} /></div>
              <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adresse Siège</label><textarea rows={3} className="w-full p-4 bg-gray-50 rounded-2xl resize-none" value={business.address} onChange={e => setBusiness({...business, address: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Téléphone Clientèle</label><input className="w-full p-4 bg-gray-50 rounded-2xl" value={business.phone} onChange={e => setBusiness({...business, phone: e.target.value})} /></div>
            </div>
            <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 mt-4"><Save size={20} /> Enregistrer la Configuration</button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-10">
           <div className="flex items-center gap-4 mb-8"><Shield className="text-blue-600" size={32} /><div><h3 className="font-bold">Niveaux d'Accès</h3><p className="text-sm text-gray-400">Règles de sécurité pour chaque profil.</p></div></div>
           <div className="space-y-4">
              {['Administrateur', 'Commercial', 'Livreur'].map((r, i) => (
                <div key={i} className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between"><span className="font-bold">{r}</span><span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-600 px-3 py-1 rounded-full">Actif</span></div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default ConfigSettings;
