import React from 'react';
import { 
  Database, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Droplet, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Layers,
  ShieldCheck,
  PlusCircle,
  MinusCircle,
  ArrowLeftRight,
  Share2,
  Smartphone
} from 'lucide-react';
import { CuveDetails, Movement, Client, ClientBalance, AppSettings } from '../types';

interface DashboardProps {
  cuvesDetails: CuveDetails[];
  mouvements: Movement[];
  clients: Client[];
  clientBalances: ClientBalance[];
  onOpenEntreeForCuve: (cuveId: string) => void;
  onOpenSortieForClient: (clientId: string) => void;
  onOpenEntree?: () => void;
  onOpenSortie?: () => void;
  onOpenTransfert?: () => void;
  onPrintBon?: (movement: Movement) => void;
  onSelectTab: (tabKey: string) => void;
  settings: AppSettings;
}

export const Dashboard: React.FC<DashboardProps> = ({
  cuvesDetails,
  mouvements,
  clients,
  clientBalances,
  onOpenEntreeForCuve,
  onOpenSortieForClient,
  onOpenEntree,
  onOpenSortie,
  onOpenTransfert,
  onPrintBon,
  onSelectTab,
  settings
}) => {
  // Calculs globaux
  const activeCuves = cuvesDetails.filter(c => c.active);
  const totalCapacite = activeCuves.reduce((acc, c) => acc + c.capaciteMax, 0);
  const totalStock = activeCuves.reduce((acc, c) => acc + c.stockActuel, 0);
  const totalRestant = Math.max(0, totalCapacite - totalStock);
  const tauxGlobal = totalCapacite > 0 ? Math.round((totalStock / totalCapacite) * 1000) / 10 : 0;

  // Mouvements du jour
  const todayStr = new Date().toISOString().slice(0, 10);
  const mouvementsJour = mouvements.filter(m => m.dateMouvement.slice(0, 10) === todayStr && !m.estAnnule);
  
  const entreesJour = mouvementsJour
    .filter(m => m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE')
    .reduce((acc, m) => acc + m.quantite, 0);

  const sortiesJour = mouvementsJour
    .filter(m => m.typeMouvement === 'SORTIE' || m.typeMouvement === 'TRANSFERT_SORTIE')
    .reduce((acc, m) => acc + m.quantite, 0);

  // Alertes de cuves presque pleines
  const alertesCuves = activeCuves.filter(c => c.tauxRemplissage >= settings.alertSeuilRemplissage);

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* SECTION SPÉCIALE SMARTPHONE : Actions Rapides & Synthèse Tactile */}
      <div className="md:hidden space-y-3">
        
        {/* Barre de 3 Grands Boutons Tactiles (Touch targets >= 48px) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onOpenEntree ? onOpenEntree() : onOpenEntreeForCuve(activeCuves[0]?.id || '')}
            className="flex items-center justify-center gap-2 py-3 px-3.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-sm transition cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-emerald-200" />
            <span>+ Entrée d'Huile</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSortie ? onOpenSortie() : onOpenSortieForClient('')}
            className="flex items-center justify-center gap-2 py-3 px-3.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-sm transition cursor-pointer"
          >
            <MinusCircle className="w-5 h-5 text-amber-200" />
            <span>- Sortie d'Huile</span>
          </button>
        </div>

        {/* Transfert inter-cuve tactile */}
        {onOpenTransfert && (
          <button
            type="button"
            onClick={onOpenTransfert}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-sky-900/90 text-sky-100 border border-sky-700 active:scale-98 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
          >
            <ArrowLeftRight className="w-4 h-4 text-sky-300" />
            <span>Transférer de l'huile entre 2 cuves</span>
          </button>
        )}

        {/* Mini Carte Synthèse Mobile */}
        <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-100">
            <span className="font-bold text-stone-700 flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-emerald-700 fill-emerald-600/30" />
              État Général de la Cuverie
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {activeCuves.length} cuves actives
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Stock Total Stocké</span>
              <span className="font-mono font-extrabold text-base text-stone-900">
                {totalStock.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} {settings.unite}
              </span>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                {tauxGlobal}% de la capacité
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Capacité Libre</span>
              <span className="font-mono font-extrabold text-base text-amber-700">
                {totalRestant.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} {settings.unite}
              </span>
              <div className="text-[10px] text-stone-500 font-semibold mt-0.5">
                Total : {totalCapacite.toLocaleString('fr-FR')} L
              </div>
            </div>
          </div>

          {/* Statistiques Journalières Mobile */}
          <div className="mt-3 pt-2.5 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-800 block">Entrées du jour</span>
              <span className="font-mono font-extrabold text-sm text-emerald-700">
                +{entreesJour.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} L
              </span>
            </div>
            <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-100">
              <span className="text-[10px] font-bold text-amber-800 block">Sorties du jour</span>
              <span className="font-mono font-extrabold text-sm text-amber-700">
                -{sortiesJour.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} L
              </span>
            </div>
          </div>
        </div>

      </div>
      
      {/* Alertes d'encombrement / Cuves presque pleines */}
      {alertesCuves.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">
              Alerte Capacité Cuverie ({alertesCuves.length} {alertesCuves.length > 1 ? 'cuves en vigilance' : 'cuve en vigilance'})
            </h4>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-amber-800">
              {alertesCuves.map(c => (
                <span key={c.id} className="inline-flex items-center gap-1 bg-amber-100/90 font-medium px-2.5 py-1 rounded-md border border-amber-300">
                  <strong>{c.numero} - {c.nom}</strong> : {c.stockActuel.toLocaleString('fr-FR')} L / {c.capaciteMax.toLocaleString('fr-FR')} L ({c.tauxRemplissage}% plein)
                  &bull; Reste : {c.capaciteRestante.toLocaleString('fr-FR')} L
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cartes KPI Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Stocké */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Stock Total en Cuves</p>
              <h3 className="text-2xl font-extrabold text-stone-900 mt-1">
                {totalStock.toLocaleString('fr-FR', { minimumFractionDigits: settings.precisionDecimales, maximumFractionDigits: settings.precisionDecimales })}
                <span className="text-sm font-semibold text-emerald-700 ml-1.5">{settings.unite}</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Droplet className="w-5 h-5 fill-emerald-600/20" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
            <span>Taux de remplissage :</span>
            <span className="font-bold text-emerald-800">{tauxGlobal}%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, tauxGlobal)}%` }}
            />
          </div>
        </div>

        {/* Capacité Restante Libre */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Capacité Restante Libre</p>
              <h3 className="text-2xl font-extrabold text-stone-900 mt-1">
                {totalRestant.toLocaleString('fr-FR', { minimumFractionDigits: settings.precisionDecimales, maximumFractionDigits: settings.precisionDecimales })}
                <span className="text-sm font-semibold text-amber-700 ml-1.5">{settings.unite}</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
            <span>Capacité totale installation :</span>
            <span className="font-bold text-stone-800">{totalCapacite.toLocaleString('fr-FR')} L</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(0, 100 - tauxGlobal)}%` }}
            />
          </div>
        </div>

        {/* Entrées du jour */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Entrées du Jour (Aujourd'hui)</p>
              <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">
                +{entreesJour.toLocaleString('fr-FR', { minimumFractionDigits: 1 })}
                <span className="text-sm font-semibold text-stone-500 ml-1.5">L</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
            <span>Bons de réception aujourd'hui :</span>
            <span className="font-bold text-stone-800">
              {mouvementsJour.filter(m => m.typeMouvement === 'ENTREE').length} bons
            </span>
          </div>
        </div>

        {/* Sorties du jour */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Sorties / Retraits du Jour</p>
              <h3 className="text-2xl font-extrabold text-amber-700 mt-1">
                -{sortiesJour.toLocaleString('fr-FR', { minimumFractionDigits: 1 })}
                <span className="text-sm font-semibold text-stone-500 ml-1.5">L</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
            <span>Bons de sortie aujourd'hui :</span>
            <span className="font-bold text-stone-800">
              {mouvementsJour.filter(m => m.typeMouvement === 'SORTIE').length} bons
            </span>
          </div>
        </div>

      </div>

      {/* État Graphique en Temps Réel des Piles / Cuves */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-700" />
              Surveillance des Piles & Cuves d'Huile d'Olive
            </h2>
            <p className="text-xs text-stone-500">
              Contrôle volumétrique et répartition par client en temps réel
            </p>
          </div>
          <button
            onClick={() => onSelectTab('cuves')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            Gérer les cuves &rarr;
          </button>
        </div>

        {activeCuves.length === 0 ? (
          <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-8 text-center">
            <Layers className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-stone-800">Aucune pile inox configurée</h4>
            <p className="text-xs text-stone-500 mt-1 mb-4">Votre cuverie est propre et prête. Configurez vos piles de stockage pour commencer.</p>
            <button
              type="button"
              onClick={() => onSelectTab('cuves')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Configurer vos premières piles</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeCuves.map(cuve => {
            const isNearFull = cuve.tauxRemplissage >= settings.alertSeuilRemplissage;
            const isFull = cuve.capaciteRestante <= 0.001;

            return (
              <div 
                key={cuve.id} 
                className={`rounded-xl border p-4.5 transition-all flex flex-col justify-between ${
                  isFull 
                    ? 'border-red-400 bg-red-50/30' 
                    : isNearFull 
                    ? 'border-amber-300 bg-amber-50/20' 
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-stone-900 text-stone-100">
                      {cuve.numero}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isFull 
                        ? 'bg-red-100 text-red-800' 
                        : isNearFull 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {cuve.tauxRemplissage}%
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-stone-900 mt-2 truncate" title={cuve.nom}>
                    {cuve.nom}
                  </h4>

                  {/* Cuve Graphic Container */}
                  <div className="my-3.5 relative bg-stone-200/80 rounded-lg h-20 overflow-hidden border border-stone-300 flex items-end">
                    {/* Liquid fill */}
                    <div 
                      className={`w-full transition-all duration-700 flex items-center justify-center text-[11px] font-mono font-bold text-white shadow-inner ${
                        isFull 
                          ? 'bg-gradient-to-t from-red-600 to-amber-600' 
                          : isNearFull 
                          ? 'bg-gradient-to-t from-amber-600 to-lime-600' 
                          : 'bg-gradient-to-t from-emerald-700 to-lime-600'
                      }`}
                      style={{ height: `${Math.max(8, Math.min(100, cuve.tauxRemplissage))}%` }}
                    >
                      {cuve.stockActuel > 0 && (
                        <span className="drop-shadow-sm px-1 truncate">
                          {cuve.stockActuel.toLocaleString('fr-FR')} L
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-stone-600">
                    <div className="flex justify-between">
                      <span>Capacité maximale :</span>
                      <span className="font-semibold text-stone-900">{cuve.capaciteMax.toLocaleString('fr-FR')} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Disponible / Libre :</span>
                      <span className={`font-semibold ${isFull ? 'text-red-700 font-bold' : 'text-stone-900'}`}>
                        {cuve.capaciteRestante.toLocaleString('fr-FR')} L
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Déposants actifs :</span>
                      <span className="font-semibold text-stone-900">{cuve.clients.length} clients</span>
                    </div>
                  </div>

                  {/* Client Breakdown Pills */}
                  {cuve.clients.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-stone-200/80 space-y-1">
                      <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Répartition :</div>
                      <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                        {cuve.clients.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-stone-700">
                            <span className="truncate max-w-[130px] font-medium" title={item.client.nomComplet}>
                              {item.client.nomComplet}
                            </span>
                            <span className="font-mono font-bold text-stone-900">
                              {item.quantite.toLocaleString('fr-FR')} L
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200">
                  <button
                    disabled={isFull}
                    onClick={() => onOpenEntreeForCuve(cuve.id)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isFull 
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95 cursor-pointer border border-emerald-300'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isFull ? 'Cuve Pleine' : 'Nouvelle Entrée'}
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Section Deux Colonnes : Soldes par Client & Derniers Mouvements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Soldes par Client */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-700" />
                Soldes d'Huile par Client / Déposant
              </h3>
              <p className="text-xs text-stone-500">Stock total confié par chaque producteur</p>
            </div>
            <button
              onClick={() => onSelectTab('clients')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              Tous les clients &rarr;
            </button>
          </div>

          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {clientBalances.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 italic">
                Aucun compte client enregistré pour le moment.
              </div>
            ) : (
              clientBalances.map(cb => (
                <div key={cb.client.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-stone-50 px-2 rounded-lg">
                  <div>
                    <div className="font-bold text-stone-900">{cb.client.nomComplet}</div>
                    <div className="text-[11px] text-stone-500 font-mono flex items-center gap-2">
                      <span>{cb.client.codeClient}</span>
                      {cb.client.telephone && <span>&bull; {cb.client.telephone}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-sm text-emerald-800">
                      {cb.totalStock.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                    </div>
                    <button
                      onClick={() => onOpenSortieForClient(cb.client.id)}
                      disabled={cb.totalStock <= 0}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 disabled:text-stone-300 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Retirer &rarr;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dernières Opérations Enregistrées */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Journal des Dernières Opérations
              </h3>
              <p className="text-xs text-stone-500">Traçabilité immédiate avec numéros de bons</p>
            </div>
            <button
              onClick={() => onSelectTab('historique')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              Journal complet &rarr;
            </button>
          </div>

          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {mouvements.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 italic">
                Aucun mouvement d'huile enregistré pour le moment.
              </div>
            ) : (
              mouvements.slice(0, 7).map(m => {
              const isEntree = m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE';
              const isTransfert = m.typeMouvement.startsWith('TRANSFERT');
              const cl = clients.find(c => c.id === m.clientId);

              return (
                <div key={m.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-stone-50 px-2 rounded-lg">
                  <div className="flex items-start gap-2.5">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      m.estAnnule 
                        ? 'bg-red-400' 
                        : isEntree 
                        ? 'bg-emerald-500' 
                        : isTransfert 
                        ? 'bg-sky-500' 
                        : 'bg-amber-500'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-800">{m.numeroBon}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          m.estAnnule
                            ? 'bg-red-100 text-red-800 line-through'
                            : isEntree
                            ? 'bg-emerald-100 text-emerald-800'
                            : isTransfert
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {m.typeMouvement}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {cl?.nomComplet || 'Client'} &bull; {new Date(m.dateMouvement).toLocaleDateString('fr-FR')} {new Date(m.dateMouvement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-mono font-extrabold text-sm ${
                      m.estAnnule ? 'text-stone-400 line-through' : isEntree ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {isEntree ? '+' : '-'}{m.quantite.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                    </div>
                    <span className="text-[10px] text-stone-400">{m.utilisateur}</span>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

      </div>

    </div>
  );
};
