import React, { useState } from 'react';
import { 
  Droplet, 
  ShieldCheck, 
  Lock, 
  User, 
  Users, 
  ArrowRight, 
  AlertCircle, 
  HardDrive,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { UserSession, Client, AppSettings } from '../types';
import { dbService } from '../services/db';
import { supabase } from '../services/supabase';

interface LoginPortalProps {
  onLogin: (session: UserSession, rememberMe: boolean) => void;
  clients: Client[];
  settings: AppSettings;
  totalStock: number;
  nbCuves: number;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  onLogin,
  clients,
  settings,
  totalStock,
  nbCuves
}) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'client'>('staff');

  // Champs de saisie vides par défaut (aucune pré-saisie)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Espace Client
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setErrorMessage("Veuillez saisir votre identifiant et votre mot de passe.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Tenter la connexion Supabase Auth si l'identifiant est un email ou utilisateur
      let supabaseSessionUser = null;
      if (u.includes('@')) {
        try {
          const { data: supaAuth, error: supaErr } = await supabase.auth.signInWithPassword({
            email: u,
            password: p
          });
          if (!supaErr && supaAuth.user) {
            supabaseSessionUser = supaAuth.user;
          }
        } catch (authErr) {
          // fallback vers la base locale/centrale
        }
      }

      // 2. Vérification dans la base d'utilisateurs autorisés de l'huilerie
      const authenticatedUser = dbService.authentifier(u, p);

      if (authenticatedUser) {
        onLogin({
          username: authenticatedUser.username,
          role: authenticatedUser.role,
          nomAffiche: authenticatedUser.nomAffiche,
          telephone: authenticatedUser.telephone,
          email: u.includes('@') ? u : undefined,
          acces: authenticatedUser.acces,
          dernierAcces: new Date().toISOString()
        }, rememberMe);
      } else if (supabaseSessionUser) {
        // Utilisateur authentifié directement via Supabase Auth
        onLogin({
          username: supabaseSessionUser.email?.split('@')[0] || 'admin',
          role: 'admin',
          nomAffiche: supabaseSessionUser.email || 'Administrateur',
          email: supabaseSessionUser.email,
          dernierAcces: new Date().toISOString()
        }, rememberMe);
      } else {
        setErrorMessage("Identifiant ou mot de passe incorrect. Accès réservé au personnel autorisé de l'Huilerie Jemai !");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de connexion.");
      setIsSubmitting(false);
    }
  };

  const handleClientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const targetClient = clients.find(c => c.id === selectedClientId);
    if (targetClient) {
      onLogin({
        username: targetClient.codeClient,
        role: 'client',
        nomAffiche: targetClient.nomComplet,
        clientId: targetClient.id,
        telephone: targetClient.telephone,
        dernierAcces: new Date().toISOString()
      }, rememberMe);
    } else {
      setErrorMessage("Veuillez sélectionner un compte déposant valide.");
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-lime-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-500 via-emerald-600 to-amber-500 p-0.5 shadow-xl flex items-center justify-center">
            <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-amber-400">
              <Droplet className="w-6 h-6 fill-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white uppercase">
                {settings.nomEntreprise}
              </h1>
              <span className="text-xs font-bold text-amber-400 font-serif px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80">
                {settings.sousTitreArabe}
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Système Officiel de Gestion de Cuverie & Espace Client
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Accès Sécurisé & Authentifié</span>
        </div>
      </header>

      {/* Central Login Card */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 my-auto py-8">
        <div className="bg-stone-900/90 backdrop-blur-md rounded-3xl border border-stone-800 shadow-2xl p-6 sm:p-8">
          
          {/* Header Card */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Connexion au Logiciel
            </h2>
            <p className="text-xs text-stone-400 mt-1" dir="rtl">
              تسجيل الدخول إلى منظومة معصرة جماعي
            </p>
          </div>

          {/* Onglets : Personnel vs Espace Client */}
          <div className="grid grid-cols-2 p-1 bg-stone-950/90 rounded-xl border border-stone-800 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setActiveTab('staff'); setErrorMessage(''); }}
              className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Gérance & Cuverie</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('client'); setErrorMessage(''); }}
              className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'client'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Espace Producteur</span>
            </button>
          </div>

          {/* Message d'erreur */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-red-950/90 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2.5 shadow-md">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulaire 1 : Staff (Gérance / Opérateur) */}
          {activeTab === 'staff' && (
            <form onSubmit={handleStaffLogin} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Email ou Identifiant
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Email Supabase ou Identifiant (ex: wizz)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Saisissez votre mot de passe..."
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-stone-400 hover:text-stone-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-stone-700 bg-stone-950 text-emerald-600 focus:ring-0"
                  />
                  <span>Se souvenir de moi</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{isSubmitting ? "Vérification en cours..." : "Entrer dans le Système"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Formulaire 2 : Espace Producteur / Déposant */}
          {activeTab === 'client' && (
            <form onSubmit={handleClientLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Sélectionnez votre Compte Déposant
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {clients.map(cl => (
                    <option key={cl.id} value={cl.id}>
                      {cl.codeClient} - {cl.nomComplet}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed bg-stone-950/60 p-3 rounded-xl border border-stone-800/80">
                Consultez en direct vos litres d'huile d'olive en stock, l'emplacement de vos cuves et téléchargez vos bons de pesée et relevés officiels.
              </p>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Accéder à mon Espace Déposant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>
      </main>

      {/* Bottom Live Indicators Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-5 text-xs text-stone-500 border-t border-stone-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5 text-stone-400">
            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
            Stockage Sécurisé
          </span>
          <span>&bull;</span>
          <span>{nbCuves} Piles sous contrôle</span>
          <span>&bull;</span>
          <span className="font-mono text-emerald-400 font-bold">
            {totalStock.toLocaleString('fr-FR')} Litres stockés
          </span>
        </div>

        <div className="text-[11px] text-stone-500 font-serif" dir="rtl">
          معصرة جماعي لإنتاج وتخزين زيت الزيتون &bull; جميع الحقوق محفوظة 2026
        </div>
      </footer>

    </div>
  );
};
