
import React, { useState } from 'react';
// Fix: Use a resilient import style for react-router-dom components and hooks
import * as RouterDom from 'react-router-dom';
const { useNavigate, Link } = RouterDom as any;

import { useAuth } from '../App';
import { ShieldCheck, Mail, Lock, ChevronRight, AlertCircle, Loader2, Info, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('deenastibeat@gmail.com');
  const [password, setPassword] = useState('kathoun07');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    
    try {
      await login(email, password);
      setTimeout(() => {
        navigate('/');
      }, 300);
    } catch (err: any) {
      console.error("Login Error:", err);
      let msg = "Accès refusé. Vérifiez vos identifiants.";
      
      // Gestion spécifique de l'erreur 400 pour guider l'utilisateur
      if (err.status === 400 || err.message.includes("Invalid login credentials")) {
        msg = "Ce compte n'existe pas encore. Vous devez d'abord vous INSCRIRE.";
      } else if (err.message.includes("Email not confirmed")) {
        msg = "E-mail non confirmé. Veuillez désactiver 'Confirm Email' dans Supabase.";
      }
      
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 p-20 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-indigo-900"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-black text-3xl shadow-2xl">C</div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase">CommercePro</h1>
          </div>
          <h2 className="text-7xl font-black leading-[1.1] max-w-xl tracking-tighter">Votre ERP Commercial Nouvelle Génération.</h2>
          <div className="mt-20 p-8 bg-white/10 backdrop-blur-md rounded-[32px] border border-white/10 max-w-md">
             <p className="text-blue-100 font-medium">Connectez-vous pour accéder au suivi GPS en temps réel et à la gestion des stocks centralisée.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-12">
          <div>
            <h3 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter">Connexion</h3>
            <p className="text-gray-400 font-medium">Entrez vos accès collaborateur.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-orange-50 text-orange-700 p-6 rounded-[32px] flex flex-col gap-3 border border-orange-100 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="shrink-0" />
                  <span className="text-sm font-black leading-tight">{error}</span>
                </div>
                {error.includes("INSCRIRE") && (
                  <Link to="/register" className="flex items-center justify-center gap-2 bg-orange-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all">
                    Aller à l'Inscription <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-[24px] focus:ring-4 focus:ring-blue-100 font-bold transition-all shadow-inner" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Mot de Passe Sécurisé</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-[24px] focus:ring-4 focus:ring-blue-100 font-bold transition-all shadow-inner" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-6 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-blue-700 shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <>Se connecter <ChevronRight size={24} /></>}
            </button>
          </form>
          
          <div className="text-center pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-400 font-medium">Nouveau collaborateur ? <Link to="/register" className="text-blue-600 font-bold hover:underline">Créer un compte</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
