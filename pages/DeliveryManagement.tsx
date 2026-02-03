
import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  CheckCircle, 
  Navigation, 
  Package,
  MapPin,
  Map as MapIcon,
  List as ListIcon,
  LogOut,
  RefreshCw,
  Clock,
  Battery,
  AlertCircle,
  XCircle,
  Coffee,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { Delivery, UserRole } from '../types';
import L from 'leaflet';

const DeliveryManagement: React.FC = () => {
  const { user, logout } = useAuth();
  const [drivers, setDrivers] = useState<Delivery[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  
  const [myLocation, setMyLocation] = useState({ lat: -18.8792, lng: 47.5079 });

  const isLivreur = user?.role === UserRole.LIVREUR;
  const myProfile = drivers.find(d => d.user_id === user?.id);

  const fetchData = async () => {
    try {
      const { data: d } = await supabase.from('deliveries').select('*');
      const { data: o } = await supabase.from('sales').select('*').neq('delivery_status', 'none').order('created_at', { ascending: false });
      
      if (d) setDrivers(d);
      if (o) setOrders(o);

      // Auto-création du profil livreur s'il n'existe pas
      if (isLivreur && d && !d.find(p => p.user_id === user?.id)) {
        const { data: newProfile, error } = await supabase.from('deliveries').insert([{
          user_id: user?.id,
          driver_name: user?.first_name || 'Livreur',
          status: 'available',
          work_status: 'rest',
          current_lat: myLocation.lat,
          current_lng: myLocation.lng
        }]).select().single();
        
        if (!error && newProfile) {
          setDrivers(prev => [...prev, newProfile]);
        }
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from('sales').update({ delivery_status: status }).eq('id', orderId);
      if (error) throw error;
      fetchData();
    } catch (err) { alert("Erreur mise à jour status"); }
  };

  const toggleWorkStatus = async () => {
    // Si myProfile n'est pas encore là, on attend ou on force un rafraîchissement
    if (!myProfile) {
       await fetchData();
       if (!myProfile) return;
    }

    const newStatus = myProfile.work_status === 'active' ? 'rest' : 'active';
    try {
      const { error } = await supabase.from('deliveries').update({ work_status: newStatus }).eq('id', myProfile.id);
      if (error) throw error;
      fetchData();
    } catch (err) { 
      console.error(err);
      alert("Erreur status travail"); 
    }
  };

  useEffect(() => {
    if (isLivreur) {
      setViewMode('list');
    }
    fetchData();
  }, [user?.id]);

  useEffect(() => {
    if (isLivreur) return;
    if (!mapContainerRef.current || mapInstanceRef.current || viewMode !== 'map') return;
    mapInstanceRef.current = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([myLocation.lat, myLocation.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [viewMode, isLivreur]);

  useEffect(() => {
    if (!mapInstanceRef.current || isLivreur || viewMode !== 'map') return;
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    
    drivers.forEach(d => {
      if (!d.current_lat || !d.current_lng) return;
      const isOnline = (new Date().getTime() - new Date(d.updated_at || 0).getTime()) < 60000;
      
      const icon = L.divIcon({
        html: `
          <div class="relative">
            <div class="w-10 h-10 ${isOnline ? 'bg-blue-600' : 'bg-gray-500'} text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M20 12h2"></path><path d="M4 12h2"></path>
              </svg>
            </div>
            ${isOnline ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>' : ''}
          </div>
        `,
        className: '', iconSize: [40, 40], iconAnchor: [20, 20]
      });
      
      markersRef.current[d.id] = L.marker([d.current_lat, d.current_lng], { icon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`<b>${d.driver_name}</b><br/>${isOnline ? 'EN LIGNE' : 'HORS LIGNE'}`);
    });
  }, [drivers, isLivreur, viewMode]);

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setMyLocation({ lat: latitude, lng: longitude });
        
        if (isLivreur && myProfile && myProfile.work_status === 'active') {
          supabase.from('deliveries')
            .update({ 
              current_lat: latitude, 
              current_lng: longitude, 
              updated_at: new Date().toISOString()
            })
            .eq('id', myProfile.id)
            .then();
        }
      }, (err) => console.warn("GPS Access Denied"), { enableHighAccuracy: true });
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isLivreur, myProfile?.id]);

  // Filtrage intelligent : pour un livreur, on montre uniquement ce qui lui est assigné
  const filteredOrders = orders.filter(o => !isLivreur || o.assigned_driver_id === myProfile?.id);

  if (loading) return (
    <div className="h-full flex items-center justify-center p-20">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className={`h-full flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500 overflow-hidden no-print ${isLivreur ? 'bg-white p-6' : 'px-4'}`}>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${isLivreur ? 'text-2xl' : 'text-3xl'} font-black tracking-tight uppercase`}>
            {isLivreur ? 'Tableau de Bord Livreur' : 'Supervision GPS'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${myProfile?.work_status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">
              {myProfile?.work_status === 'active' ? 'Opérationnel' : 'En Pause'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLivreur ? (
            <>
              <button 
                onClick={toggleWorkStatus}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl ${myProfile?.work_status === 'active' ? 'bg-orange-100 text-orange-600' : 'bg-green-600 text-white'}`}
              >
                {myProfile?.work_status === 'active' ? <><Coffee size={18}/> Passer en Repos</> : <><Zap size={18}/> Passer Actif</>}
              </button>
              <button onClick={logout} className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><LogOut size={20}/></button>
            </>
          ) : (
            <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}><ListIcon size={18}/></button>
              <button onClick={() => setViewMode('map')} className={`p-2 rounded-xl ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}><MapIcon size={18}/></button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        <div className={`${isLivreur || viewMode === 'list' ? 'lg:col-span-12' : 'lg:col-span-4'} flex flex-col gap-4 overflow-y-auto pr-1 pb-10`}>
          {filteredOrders.length > 0 ? filteredOrders.map(order => (
            <div key={order.id} className={`p-6 lg:p-8 rounded-[32px] border transition-all ${order.delivery_status === 'delivered' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-blue-100 shadow-xl shadow-blue-50'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${order.delivery_status === 'delivered' ? 'bg-green-500' : order.delivery_status === 'returned' ? 'bg-red-500' : 'bg-blue-600 animate-pulse'}`}></span>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">FAC #{order.sale_number}</p>
                  </div>
                  <h4 className="font-black text-lg text-gray-900 uppercase leading-none">{order.customer_name}</h4>
                  <div className="flex items-center gap-3 pt-2">
                    <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><MapPin size={10}/> {order.customer_address || 'Tana Centre'}</p>
                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Clock size={10}/> {new Date(order.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-gray-900">{Number(order.total_amount).toLocaleString()} Ar</p>
                  <p className="text-[9px] font-black text-green-600 uppercase">Payé Cash</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => updateOrderStatus(order.id, 'en_route')} 
                  disabled={order.delivery_status === 'delivered'}
                  className={`py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all flex flex-col items-center justify-center gap-2 ${order.delivery_status === 'en_route' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:border-blue-400 border border-transparent'}`}
                >
                  <Navigation size={18}/> En Route
                </button>
                <button 
                  onClick={() => updateOrderStatus(order.id, 'delivered')} 
                  className={`py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all flex flex-col items-center justify-center gap-2 ${order.delivery_status === 'delivered' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:border-green-400 border border-transparent'}`}
                >
                  <CheckCircle size={18}/> Livré
                </button>
                <button 
                  onClick={() => updateOrderStatus(order.id, 'returned')} 
                  className={`py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all flex flex-col items-center justify-center gap-2 ${order.delivery_status === 'returned' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:border-red-400 border border-transparent'}`}
                >
                  <XCircle size={18}/> Retour
                </button>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
               <Truck size={80} strokeWidth={1} className="animate-bounce"/>
               <p className="font-black uppercase text-sm mt-4 tracking-widest">Aucune mission assignée</p>
            </div>
          )}
        </div>

        {!isLivreur && (
          <div className={`lg:col-span-8 ${viewMode === 'list' ? 'hidden' : 'flex'} flex-col gap-6 h-full relative`}>
             <div className="flex-1 bg-white rounded-[40px] shadow-sm border-[8px] border-white overflow-hidden relative">
                <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full"></div>
                <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md p-6 rounded-[32px] text-white space-y-4 border border-white/10 max-w-[250px]">
                   <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span> Télémétrie Nexus
                   </p>
                   <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {drivers.map(d => {
                        const isOnline = (new Date().getTime() - new Date(d.updated_at || 0).getTime()) < 60000;
                        return (
                          <div key={d.id} className="flex items-center gap-3">
                             <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-500'}`}></div>
                             <div className="flex-1">
                               <p className="text-[11px] font-black uppercase truncate">{d.driver_name}</p>
                               <p className="text-[8px] text-gray-400 font-bold uppercase">{isOnline ? 'Actif' : 'Pause'}</p>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryManagement;
