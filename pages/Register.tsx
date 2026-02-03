
import React, { useState } from 'react';
// Fix: Use a resilient import style for react-router-dom hooks and components
import * as RouterDom from 'react-router-dom';
const { useNavigate, Link } = RouterDom as any;

import { useAuth } from '../App';
import { UserPlus, Mail, Lock, User as UserIcon, Shield, ChevronRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types';

const Register: React.FC = () => {
  const [email, setEmail] = useState('deenastibeat@gmail.com');
  const [password, setPassword] = useState('kathoun07');
  const [firstName, setFirstName] = useState('Deenasti');
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    
    try {
      await register(email, password, firstName, role);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error("Register Error:", err);
      setError(err.message || "Erreur lors de l'inscription. Vérifiez votre connexion.");
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-600 p-6 text-white text-center">
        <div className="max-w-md space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-white text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-4xl font-black tracking-tighter">Compte Créé !</h2>
          <p className="text-blue-100 font-medium">Votre profil de collaborateur a été enregistré avec succès. Redirection vers la page de connexion...</p>
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-white animate-[progress_2s_ease-in-out]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 p-20 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-indigo-900"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-black text-3xl shadow-2xl">C</div>
            <h1 className="text-4xl font-black tracking-tighter">CommercePro</h1>
          </div>
          <h2 className="text-6xl font-black leading-[1.1] max-w-xl tracking-tighter">Configuration de votre Espace Pro.</h2>
          <p className="mt-6 text-blue-200 text-lg font-medium opacity-80">Remplissez ces informations une seule fois pour activer votre ERP.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h3 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">Inscription</h3>
            <p className="text-gray-400 font-medium italic">Remplissez les champs pour créer votre compte administrateur.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-5 rounded-3xl flex flex-col gap-1 border border-red-100">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} />
                  <span className="text-sm font-bold">Erreur : {error}</span>
                </div>
                <p className="text-[10px] opacity-70 ml-8">Vérifiez que cet e-mail n'est pas déjà utilisé.</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Prénom</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 font-bold transition-all" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-mail Professionnel</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 font-bold transition-all" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mot de Passe Sécurisé</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 font-bold transition-all" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Attribuer un Rôle</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 font-bold transition-all appearance-none">
                    <option value={UserRole.ADMIN}>Administrateur (Accès Total)</option>
                    <option value={UserRole.COMMERCE}>Commercial (Ventes & Stock)</option>
                    <option value={UserRole.LIVREUR}>Livreur (GPS & Vidéo)</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-blue-700 shadow-2xl transition-all active:scale-95 disabled:opacity-50 mt-4">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <>Finaliser l'Inscription <ChevronRight size={20} /></>}
            </button>
          </form>
          
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium">Déjà enregistré ? <Link to="/login" className="text-blue-600 font-bold">Se connecter ici</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
