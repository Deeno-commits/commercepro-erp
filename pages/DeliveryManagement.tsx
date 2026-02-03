
import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  CheckCircle, 
  XCircle, 
  Navigation, 
  Power,
  Package,
  MapPin,
  AlertCircle,
  User,
  Map as MapIcon,
  List as ListIcon,
  LogOut,
  RefreshCw
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
  const [gpsError, setGpsError] = useState<string | null>(null);

  const isLivreur = user?.role === UserRole.LIVREUR;
  const myProfile = drivers.find(d => d.user_id === user?.id);

  const fetchData = async () => {
    const { data: d } = await supabase.from('deliveries').select('*');
    const { data: o } = await supabase.from('sales').select('*').neq('delivery_status', 'none').order('created_at', { ascending: false });
    if (d) setDrivers(d);
    if (o) setOrders(o);
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from('sales').update({ delivery_status: status }).eq('id', orderId);
      if (error) throw error;
      fetchData();
    } catch (err) { alert("Erreur mise à jour statut"); }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || viewMode !== 'map') return;
    mapInstanceRef.current = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([myLocation.lat, myLocation.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [viewMode]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    const myIcon = L.divIcon({
      html: `<div class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-pulse"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M20 12h2"></path><path d="M4 12h2"></path></svg></div>`,
      className: '', iconSize: [40, 40], iconAnchor: [20, 20]
    });
    markersRef.current['me'] = L.marker([myLocation.lat, myLocation.lng], { icon: myIcon }).addTo(mapInstanceRef.current).bindPopup("Ma Position");
    drivers.forEach(d => {
      if (d.user_id === user?.id || !d.current_lat) return;
      const otherIcon = L.divIcon({
        html: `<div class="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white"><User size={14}/></div>`,
        className: '', iconSize: [32, 32], iconAnchor: [16, 16]
      });
      L.marker([d.current_lat, d.current_lng], { icon: otherIcon }).addTo(mapInstanceRef.current!).bindPopup(d.driver_name);
    });
  }, [drivers, myLocation, viewMode]);

  useEffect(() => {
    fetchData();
    let watchId: number;
    const startGps = () => {
      if (!("geolocation" in navigator)) return;
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMyLocation({ lat: latitude, lng: longitude });
          setGpsError(null);
          if (isLivreur && myProfile?.work_status === 'active') {
            supabase.from('deliveries').update({ current_lat: latitude, current_lng: longitude, updated_at: new Date().toISOString() }).eq('id', myProfile.id).then();
          }
        },
        (err) => { setGpsError("GPS Simulé (Fixe)"); setMyLocation({ lat: -18.8792, lng: 47.5079 }); },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
      );
    };
    startGps();
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [user?.id, myProfile?.id]);

  const filteredOrders = orders.filter(o => !isLivreur || o.assigned_driver_id === myProfile?.id || o.delivery_status === 'pending');

  return (
    <div className={`h-full flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500 overflow-hidden no-print pb-10 ${isLivreur ? 'bg-white p-4' : 'px-4'}`}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Logistique <span className="text-blue-600">GPS</span></h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${myProfile?.work_status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <p className="text-gray-500 font-bold text-[10px] uppercase">{myProfile?.work_status === 'active' ? 'Connecté' : 'Déconnecté'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Boutons spéciaux pour livreur (puisqu'il n'a plus de menu) */}
          {isLivreur && (
            <>
              <button onClick={() => window.location.reload()} className="p-3 bg-gray-100 text-gray-600 rounded-2xl"><RefreshCw size={18}/></button>
              <button onClick={logout} className="p-3 bg-red-50 text-red-600 rounded-2xl"><LogOut size={18}/></button>
            </>
          )}
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}><ListIcon size={18}/></button>
            <button onClick={() => setViewMode('map')} className={`p-2.5 rounded-xl ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}><MapIcon size={18}/></button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 relative">
        <div className={`lg:col-span-4 flex flex-col gap-4 overflow-y-auto ${viewMode === 'map' ? 'hidden lg:flex' : 'flex'}`}>
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-blue-100 text-blue-600 mb-2 inline-block">{order.delivery_status}</span>
                  <h4 className="font-black text-sm uppercase text-gray-900 truncate">{order.customer_name}</h4>
                  <p className="text-[10px] font-bold text-gray-400"># {order.sale_number}</p>
                </div>
                <p className="text-sm font-black text-blue-600">{Number(order.total_amount).toLocaleString()} Ar</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => updateOrderStatus(order.id, 'en_route')} className="py-4 bg-white text-[8px] font-black uppercase rounded-2xl border border-gray-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm">Route</button>
                <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="py-4 bg-white text-[8px] font-black uppercase rounded-2xl border border-gray-100 hover:bg-green-600 hover:text-white transition-all shadow-sm">Livré</button>
                <button onClick={() => updateOrderStatus(order.id, 'returned')} className="py-4 bg-white text-[8px] font-black uppercase rounded-2xl border border-gray-100 hover:bg-red-600 hover:text-white transition-all shadow-sm">Retour</button>
              </div>
            </div>
          ))}
          {filteredOrders.length === 0 && <p className="text-center py-20 opacity-20 font-black text-xs uppercase">Aucune mission</p>}
        </div>

        <div className={`lg:col-span-8 flex flex-col gap-6 min-h-[300px] ${viewMode === 'list' ? 'hidden lg:flex' : 'flex'}`}>
           <div className="flex-1 bg-white rounded-[40px] shadow-sm border-8 border-white overflow-hidden relative">
              <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full"></div>
              <button onClick={() => mapInstanceRef.current?.panTo([myLocation.lat, myLocation.lng])} className="absolute bottom-6 right-6 z-10 p-4 bg-white text-blue-600 rounded-2xl shadow-2xl border border-gray-100"><MapPin size={24} /></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryManagement;
