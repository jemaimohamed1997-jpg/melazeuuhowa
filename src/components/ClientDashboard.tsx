import React from 'react';
import { 
  Droplet, 
  Layers, 
  Printer, 
  Download, 
  LogOut, 
  Phone, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar,
  Clock,
  Share2
} from 'lucide-react';
import { Client, ClientBalance, Cuve, Movement, AppSettings, UserSession } from '../types';
import { exporterReleveClientExcel } from '../services/excelExport';

interface ClientDashboardProps {
  currentUser: UserSession;
  clientBalance: ClientBalance | null;
  cuves: Cuve[];
  mouvements: Movement[];
  onLogout: () => void;
  onPrintBon: (mouv: Movement) => void;
  settings: AppSettings;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  currentUser,
  clientBalance,
  cuves,
  mouvements,
  onLogout,
  onPrintBon,
  settings
}) => {
  if (!clientBalance) {
    return (
      <div className="min-h-screen bg-stone-100 p-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl border border-stone-200 text-center">
          <p className="text-sm text-stone-600">Compte client introuvable.</p>
          <button onClick={onLogout} className="mt-3 px-4 py-2 bg-stone-800 text-white rounded-lg text-xs font-bold cursor-pointer">
            Retour
          </button>
        </div>
      </div>
    );
  }

  const { client, totalStock, parCuve, derniersMouvements } = clientBalance;
  const clientMouvements = mouvements.filter(m => m.clientId === client.id);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      
      {/* Header Espace Client */}
      <header className="bg-stone-900 text-white border-b border-stone-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center text-amber-400">
                <Droplet className="w-5 h-5 fill-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white uppercase">{settings.nomEntreprise}</h1>
                <span className="text-amber-400 text-xs font-serif font-bold">{settings.sousTitreArabe}</span>
              </div>
              <p className="text-xs text-amber-400 font-medium">
                Espace Déposant &bull; Suivi Personnel de Stockage
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-stone-200 block">{client.nomComplet}</span>
              <span className="text-[11px] font-mono text-stone-400">{client.codeClient}</span>
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-red-950/80 hover:text-red-300 border border-stone-700 rounded-lg text-xs font-bold text-stone-300 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>

        </div>
      </header>

      {/* Contenu Espace Déposant */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        
        {/* Banner Bienvenue */}
        <div className="bg-gradient-to-r from-emerald-900 to-stone-900 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-emerald-800/50 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1 max-w-lg">
            <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
              Compte Producteur Actif &bull; {client.codeClient}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bienvenue, {client.nomComplet}
            </h2>
            <p className="text-xs sm:text-sm text-stone-300">
              Votre huile d'olive est entreposée dans les cuves inox certifiées de Huilerie Jemai. Retrouvez ici la situation exacte de votre stock et vos bons officiels.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-center min-w-[200px]">
            <span className="text-xs font-bold uppercase text-stone-300 block mb-1">
              Votre Solde d'Huile Total
            </span>
            <div className="text-3xl font-black font-mono text-emerald-300">
              {totalStock.toLocaleString('fr-FR', { minimumFractionDigits: 1 })}
              <span className="text-base font-semibold text-white ml-1.5">{settings.unite}</span>
            </div>
            <span className="text-[11px] text-stone-300 block mt-1">
              Réparti dans {parCuve.length} cuve(s)
            </span>
          </div>
        </div>

        {/* Détail par Cuve */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                Localisation de votre Huile dans les Piles / Cuves
              </h3>
              <p className="text-xs text-stone-500">
                Chaque lot est étanche et rigoureusement tracé
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {parCuve.length === 0 ? (
              <div className="col-span-3 text-center py-6 text-stone-400 text-xs italic">
                Vous n'avez actuellement aucun stock déposé dans l'huilerie.
              </div>
            ) : (
              parCuve.map((item, idx) => (
                <div key={idx} className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold bg-stone-900 text-white px-2 py-0.5 rounded">
                      {item.cuve.numero}
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-800">
                      {item.quantite.toLocaleString('fr-FR')} L
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900">{item.cuve.nom}</h4>
                  <div className="text-[11px] text-stone-500">
                    Capacité cuve : {item.cuve.capaciteMax.toLocaleString('fr-FR')} L
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Historique des Bons & Mouvements */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                Vos Bons Officiels de Pesée & de Livraison
              </h3>
              <p className="text-xs text-stone-500">
                Consultez et réimprimez n'importe quel bon officiel à tout moment
              </p>
            </div>

            <button
              onClick={() => exporterReleveClientExcel(client, clientMouvements, cuves, totalStock)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-emerald-600 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Télécharger mon Relevé (.xlsx)</span>
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">N° Bon</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Opération</th>
                  <th className="py-2.5 px-3">Cuve</th>
                  <th className="py-2.5 px-3 text-right">Quantité</th>
                  <th className="py-2.5 px-3 text-center">Bon A4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {clientMouvements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-stone-400 italic">
                      Aucune opération enregistrée sur votre compte.
                    </td>
                  </tr>
                ) : (
                  clientMouvements.map(m => {
                    const isEntree = m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE';
                    const targetCuve = cuves.find(c => c.id === m.cuveId);

                    return (
                      <tr key={m.id} className={m.estAnnule ? 'bg-red-50/20 text-stone-400 line-through' : 'hover:bg-stone-50'}>
                        <td className="py-2.5 px-3 font-mono font-bold text-stone-900">{m.numeroBon}</td>
                        <td className="py-2.5 px-3">{new Date(m.dateMouvement).toLocaleDateString('fr-FR')} {new Date(m.dateMouvement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.estAnnule ? 'bg-red-100 text-red-800 line-through' : isEntree ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {m.typeMouvement}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-700">{targetCuve?.numero} - {targetCuve?.nom}</td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold ${isEntree ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isEntree ? '+' : '-'}{m.quantite.toLocaleString('fr-FR')} L
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onPrintBon(m)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer"
                              title="Partager le bon (WhatsApp, Messenger, PDF)"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onPrintBon(m)}
                              className="p-1.5 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                              title="Imprimer / Télécharger le bon A4 officiel"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List for Smartphones */}
          <div className="md:hidden divide-y divide-stone-100">
            {clientMouvements.length === 0 ? (
              <div className="py-6 text-center text-stone-400 italic text-xs">
                Aucune opération enregistrée sur votre compte.
              </div>
            ) : (
              clientMouvements.map(m => {
                const isEntree = m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE';
                const targetCuve = cuves.find(c => c.id === m.cuveId);

                return (
                  <div key={m.id} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            {m.numeroBon}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.estAnnule ? 'bg-red-100 text-red-800 line-through' : isEntree ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {m.typeMouvement}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-1">
                          {targetCuve ? `${targetCuve.numero} - ${targetCuve.nom}` : 'Cuve'} &bull; {new Date(m.dateMouvement).toLocaleDateString('fr-FR')} {new Date(m.dateMouvement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-mono font-bold text-base ${isEntree ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isEntree ? '+' : '-'}{m.quantite.toLocaleString('fr-FR')} L
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => onPrintBon(m)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold active:scale-95 transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Partager & Imprimer Bon</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      <footer className="bg-stone-900 text-stone-400 py-4 text-xs text-center border-t border-stone-800">
        Huilerie Jemai (معصرة جماعي) &bull; Tél : {settings.contactTelephone} &bull; {settings.adresse}
      </footer>

    </div>
  );
};
