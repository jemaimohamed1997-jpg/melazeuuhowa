import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  RotateCcw, 
  ShieldAlert, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar,
  AlertTriangle,
  Clock,
  Layers,
  Users,
  Share2,
  X
} from 'lucide-react';
import { Movement, Client, Cuve, AuditLog, UserSession, AppSettings } from '../types';
import { exporterHistoriqueMouvementsExcel } from '../services/excelExport';

interface HistoryAuditProps {
  mouvements: Movement[];
  clients: Client[];
  cuves: Cuve[];
  auditLogs: AuditLog[];
  currentUser: UserSession;
  onAnnulerMouvement: (mouvementId: string, motif: string, utilisateur: string) => void;
  onPrintBon: (mouv: Movement) => void;
  settings: AppSettings;
}

export const HistoryAudit: React.FC<HistoryAuditProps> = ({
  mouvements,
  clients,
  cuves,
  auditLogs,
  currentUser,
  onAnnulerMouvement,
  onPrintBon,
  settings
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'mouvements' | 'audit'>('mouvements');

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCuveId, setFilterCuveId] = useState<string>('ALL');
  const [filterClientId, setFilterClientId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ALL, VALIDE, ANNULE
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Annulation Modal
  const [mouvementToCancel, setMouvementToCancel] = useState<Movement | null>(null);
  const [cancelMotif, setCancelMotif] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Détail Modal
  const [mouvementDetail, setMouvementDetail] = useState<Movement | null>(null);

  // Normalisation robuste pour recherche insensible à la casse et aux accents
  const normalize = (str: string) => {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Helper pour extraire ou afficher l'acidité d'un mouvement
  const getMovementAcidite = (m: Movement) => {
    if ((m as any).acidite) return `${(m as any).acidite}°`;
    const combined = `${m.observations || ''} ${m.motif || ''}`;
    const match = combined.match(/(?:acidit[eé]|acidity|acid|degre|degré)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)\s*°?/i);
    if (match) return `${match[1]}°`;
    return '—';
  };

  // Filtrage des mouvements
  const cleanSearch = normalize(searchTerm);
  const searchWords = cleanSearch.split(/\s+/).filter(Boolean);

  const filteredMouvements = mouvements.filter(m => {
    const client = clients.find(c => c.id === m.clientId);
    const cuve = cuves.find(c => c.id === m.cuveId);

    // Recherche textuelle multi-mots (nom client complet ou partiel, code client, bon, cuve, motif, notes)
    if (searchWords.length > 0) {
      const clientNom = client ? normalize(client.nomComplet) : '';
      const clientCode = client ? normalize(client.codeClient) : '';
      const clientTel = client?.telephone ? normalize(client.telephone) : '';
      const cuveNom = cuve ? normalize(cuve.nom) : '';
      const cuveNum = cuve ? normalize(cuve.numero) : '';
      const bon = normalize(m.numeroBon);
      const motif = normalize(m.motif || '');
      const obs = normalize(m.observations || '');
      const user = normalize(m.utilisateur || '');

      // Correspondance précise pour le client (nom complet ou n'importe quelle partie du nom)
      const matchesClient = searchWords.every(word =>
        clientNom.includes(word) || clientCode.includes(word) || clientTel.includes(word)
      );

      // Correspondance sur les autres champs généraux
      const matchesGeneral = searchWords.every(word =>
        bon.includes(word) ||
        cuveNom.includes(word) ||
        cuveNum.includes(word) ||
        motif.includes(word) ||
        obs.includes(word) ||
        user.includes(word)
      );

      if (!matchesClient && !matchesGeneral) return false;
    }

    // Type
    if (filterType !== 'ALL' && m.typeMouvement !== filterType) return false;

    // Cuve
    if (filterCuveId !== 'ALL' && m.cuveId !== filterCuveId) return false;

    // Client
    if (filterClientId !== 'ALL' && m.clientId !== filterClientId) return false;

    // Statut
    if (filterStatus === 'VALIDE' && m.estAnnule) return false;
    if (filterStatus === 'ANNULE' && !m.estAnnule) return false;

    // Dates
    if (dateDebut && m.dateMouvement.slice(0, 10) < dateDebut) return false;
    if (dateFin && m.dateMouvement.slice(0, 10) > dateFin) return false;

    return true;
  });

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mouvementToCancel) return;
    setCancelError('');

    try {
      onAnnulerMouvement(mouvementToCancel.id, cancelMotif, currentUser.nomAffiche);
      setMouvementToCancel(null);
      setCancelMotif('');
    } catch (err: any) {
      setCancelError(err.message || "Erreur lors de l'annulation");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sélecteur de sous-onglets */}
      <div className="flex border-b border-stone-200 gap-4">
        <button
          onClick={() => setActiveSubTab('mouvements')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeSubTab === 'mouvements'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Registre des Mouvements ({filteredMouvements.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeSubTab === 'audit'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Journal d'Audit Système ({auditLogs.length})</span>
        </button>
      </div>

      {activeSubTab === 'mouvements' && (
        <>
          {/* Panneau de filtres avancés */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[260px] relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par client (nom complet ou partiel), bon, cuve, motif..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                    title="Effacer la recherche (X)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => exporterHistoriqueMouvementsExcel(filteredMouvements, clients, cuves)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 cursor-pointer"
              >
                <Download className="w-4 h-4 text-stone-600" />
                <span>Exporter le Registre (.xlsx)</span>
              </button>
            </div>

            {/* Bannière d'état de recherche avec bouton d'effacement rapide */}
            {searchTerm && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs text-emerald-900">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>
                    Historique filtré pour le client ou terme <strong className="font-bold underline">"{searchTerm}"</strong> : <strong>{filteredMouvements.length}</strong> mouvement(s) complets trouvés (Entrées &amp; Sorties).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline ml-2 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Effacer la recherche</span>
                </button>
              </div>
            )}

            {/* Rangée de filtres déroulants */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-stone-100 text-xs">
              
              {/* Type d'opération */}
              <div>
                <label className="block text-stone-500 font-bold mb-1">Type d'opération</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="ALL">Tous les types</option>
                  <option value="ENTREE">Entrées (Réceptions)</option>
                  <option value="SORTIE">Sorties (Livraisons)</option>
                  <option value="TRANSFERT_SORTIE">Transfert (Sortie)</option>
                  <option value="TRANSFERT_ENTREE">Transfert (Entrée)</option>
                </select>
              </div>

              {/* Client */}
              <div>
                <label className="block text-stone-500 font-bold mb-1">Filtrer par Client</label>
                <select
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="ALL">Tous les clients</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nomComplet}</option>
                  ))}
                </select>
              </div>

              {/* Cuve */}
              <div>
                <label className="block text-stone-500 font-bold mb-1">Filtrer par Cuve</label>
                <select
                  value={filterCuveId}
                  onChange={(e) => setFilterCuveId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="ALL">Toutes les cuves</option>
                  {cuves.map(c => (
                    <option key={c.id} value={c.id}>{c.numero} - {c.nom}</option>
                  ))}
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-stone-500 font-bold mb-1">Statut d'Audit</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="VALIDE">Validés uniquement</option>
                  <option value="ANNULE">Annulés / Contre-passés</option>
                </select>
              </div>

              {/* Période */}
              <div>
                <label className="block text-stone-500 font-bold mb-1">Période (Depuis)</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-2 py-1.5 border border-stone-300 rounded-lg bg-white"
                />
              </div>

            </div>
          </div>

          {/* Tableau d'Historique Permanent (Desktop: Table, Mobile: Cards) */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100/90 text-stone-700 font-bold uppercase tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">N° Bon</th>
                    <th className="py-3 px-4">Date &amp; Heure</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Client / Déposant</th>
                    <th className="py-3 px-4">Pile / Cuve</th>
                    <th className="py-3 px-4 text-right">Quantité (L)</th>
                    <th className="py-3 px-4 text-center">Acidité</th>
                    <th className="py-3 px-4">Opérateur</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMouvements.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-stone-400 italic">
                        Aucun mouvement correspondant aux critères sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredMouvements.map(m => {
                      const isEntree = m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE';
                      const isTransfert = m.typeMouvement.startsWith('TRANSFERT');
                      const client = clients.find(c => c.id === m.clientId);
                      const cuve = cuves.find(c => c.id === m.cuveId);
                      const aciditeVal = getMovementAcidite(m);

                      return (
                        <tr key={m.id} className={`hover:bg-stone-50 transition ${m.estAnnule ? 'bg-red-50/20 text-stone-400' : ''}`}>
                          <td className="py-3 px-4 font-mono font-bold text-stone-900">
                            {m.numeroBon}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-medium text-stone-900">{new Date(m.dateMouvement).toLocaleDateString('fr-FR')}</div>
                            <div className="text-[10px] text-stone-500 font-mono">{new Date(m.dateMouvement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                          </td>
                          <td className="py-3 px-4 font-medium text-stone-900">
                            {client?.nomComplet || 'Inconnu'}
                          </td>
                          <td className="py-3 px-4 text-stone-700">
                            {cuve ? `${cuve.numero} - ${cuve.nom}` : 'Inconnue'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-sm">
                            <span className={m.estAnnule ? 'line-through text-stone-400' : isEntree ? 'text-emerald-700' : 'text-amber-700'}>
                              {isEntree ? '+' : '-'}{m.quantite.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-stone-700">
                            {aciditeVal !== '—' ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                                {aciditeVal}
                              </span>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-stone-600">
                            {m.utilisateur}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {m.estAnnule ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800" title={m.motifAnnulation}>
                                <XCircle className="w-3 h-3" />
                                Annulé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                <CheckCircle className="w-3 h-3" />
                                Validé
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setMouvementDetail(m)}
                                className="p-1.5 rounded hover:bg-stone-100 text-stone-600 cursor-pointer"
                                title="Voir les détails complets"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onPrintBon(m)}
                                className="p-1.5 rounded hover:bg-blue-50 text-blue-600 cursor-pointer"
                                title="Partager le bon (WhatsApp, Messenger, PDF, Email)"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onPrintBon(m)}
                                className="p-1.5 rounded hover:bg-emerald-50 text-emerald-700 cursor-pointer"
                                title="Réimprimer le bon officiel (Duplicata)"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {!m.estAnnule && (
                                <button
                                  onClick={() => { setMouvementToCancel(m); setCancelError(''); setCancelMotif(''); }}
                                  className="p-1.5 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                                  title="Annuler avec motif obligatoire (Contre-passation)"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Optimized for Smartphones with 0 horizontal scroll) */}
            <div className="md:hidden divide-y divide-stone-100">
              {filteredMouvements.length === 0 ? (
                <div className="py-8 text-center text-stone-400 italic text-xs">
                  Aucun mouvement correspondant aux critères.
                </div>
              ) : (
                filteredMouvements.map(m => {
                  const isEntree = m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE';
                  const isTransfert = m.typeMouvement.startsWith('TRANSFERT');
                  const client = clients.find(c => c.id === m.clientId);
                  const cuve = cuves.find(c => c.id === m.cuveId);
                  const aciditeVal = getMovementAcidite(m);

                  return (
                    <div key={m.id} className={`p-4 transition ${m.estAnnule ? 'bg-red-50/20' : 'hover:bg-stone-50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-xs text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                              {m.numeroBon}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                          <h4 className="font-bold text-sm text-stone-900 mt-1">
                            {client?.nomComplet || 'Client Inconnu'}
                          </h4>
                          <p className="text-xs text-stone-500">
                            {cuve ? `${cuve.numero} - ${cuve.nom}` : 'Cuve'} &bull; Opérateur: {m.utilisateur}
                            {aciditeVal !== '—' && (
                              <span className="ml-1 text-emerald-700 font-bold">&bull; Acidité: {aciditeVal}</span>
                            )}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`font-mono font-extrabold text-base ${
                            m.estAnnule ? 'line-through text-stone-400' : isEntree ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {isEntree ? '+' : '-'}{m.quantite.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                          </div>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            {new Date(m.dateMouvement).toLocaleDateString('fr-FR')} {new Date(m.dateMouvement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Touch action row */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPrintBon(m)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                            title="Partager le bon officiel sur WhatsApp ou imprimer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Partager Bon</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMouvementDetail(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium active:scale-95 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Détails</span>
                          </button>
                        </div>

                        {!m.estAnnule && (
                          <button
                            type="button"
                            onClick={() => { setMouvementToCancel(m); setCancelError(''); setCancelMotif(''); }}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs font-bold active:scale-95 transition cursor-pointer"
                            title="Annuler ce bon"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </>
      )}

      {/* Sous-onglet Journal d'Audit Système */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-700" />
                Journal d'Audit et de Traçabilité Permanente
              </h3>
              <p className="text-xs text-stone-500">
                Toute opération, création, modification ou annulation est enregistrée de façon inaltérable.
              </p>
            </div>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {auditLogs.map(log => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 hover:bg-stone-50 px-2 rounded">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900 px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Table : <strong>{log.tableCible}</strong>
                      </span>
                    </div>
                    <div className="text-xs text-stone-800 mt-1 font-medium">
                      {log.details}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-semibold text-stone-700">{log.utilisateur}</div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    {new Date(log.dateAction).toLocaleDateString('fr-FR')} {new Date(log.dateAction).toLocaleTimeString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal d'Annulation avec Contre-passation Audité */}
      {mouvementToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-start gap-3 text-red-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Annuler le Bon {mouvementToCancel.numeroBon}
                </h3>
                <p className="text-xs text-stone-500">
                  Règle de gestion : L'opération ne sera pas supprimée mais marquée annulée avec motif audit.
                </p>
              </div>
            </div>

            {cancelError && (
              <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-1">
                <div>Type : <strong>{mouvementToCancel.typeMouvement}</strong></div>
                <div>Quantité : <strong>{mouvementToCancel.quantite} Litres</strong></div>
                <div>Opérateur d'origine : <strong>{mouvementToCancel.utilisateur}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Motif d'annulation obligatoire * (minimum 4 caractères)
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelMotif}
                  onChange={(e) => setCancelMotif(e.target.value)}
                  placeholder="ex: Erreur de saisie ticket de pesée n°12, annulation demandée par le client..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMouvementToCancel(null)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Fermer sans annuler
                </button>
                <button
                  type="submit"
                  disabled={cancelMotif.trim().length < 4}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow cursor-pointer"
                >
                  Confirmer la Contre-passation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détail du Mouvement */}
      {mouvementDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center justify-between">
              <span>Détails du Bon {mouvementDetail.numeroBon}</span>
              <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
                mouvementDetail.estAnnule ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {mouvementDetail.estAnnule ? 'Annulé' : 'Validé'}
              </span>
            </h3>

            <div className="space-y-2 text-xs divide-y divide-stone-100">
              <div className="pt-1.5 flex justify-between">
                <span className="text-stone-500">Date enregistrée :</span>
                <span className="font-medium text-stone-900">{new Date(mouvementDetail.dateMouvement).toLocaleString('fr-FR')}</span>
              </div>
              <div className="pt-1.5 flex justify-between">
                <span className="text-stone-500">Client / Déposant :</span>
                <span className="font-bold text-stone-900">{clients.find(c => c.id === mouvementDetail.clientId)?.nomComplet}</span>
              </div>
              <div className="pt-1.5 flex justify-between">
                <span className="text-stone-500">Cuve assignée :</span>
                <span className="font-bold text-stone-900">{cuves.find(c => c.id === mouvementDetail.cuveId)?.nom}</span>
              </div>
              <div className="pt-1.5 flex justify-between">
                <span className="text-stone-500">Quantité nette :</span>
                <span className="font-mono font-bold text-stone-900 text-sm">{mouvementDetail.quantite} Litres</span>
              </div>
              <div className="pt-1.5 flex justify-between">
                <span className="text-stone-500">Opérateur :</span>
                <span className="font-medium text-stone-800">{mouvementDetail.utilisateur}</span>
              </div>
              {mouvementDetail.motif && (
                <div className="pt-1.5">
                  <span className="text-stone-500 block mb-0.5">Motif :</span>
                  <p className="bg-stone-50 p-2 rounded text-stone-800">{mouvementDetail.motif}</p>
                </div>
              )}
              {mouvementDetail.observations && (
                <div className="pt-1.5">
                  <span className="text-stone-500 block mb-0.5">Observations :</span>
                  <p className="bg-stone-50 p-2 rounded text-stone-800">{mouvementDetail.observations}</p>
                </div>
              )}
              {mouvementDetail.estAnnule && (
                <div className="pt-2 bg-red-50 p-3 rounded-lg text-red-900">
                  <span className="font-bold block mb-1">Détails d'annulation :</span>
                  <div>Motif : {mouvementDetail.motifAnnulation}</div>
                  <div className="text-[10px] text-red-700 mt-1">
                    Annulé le {new Date(mouvementDetail.dateAnnulation || '').toLocaleString('fr-FR')} par {mouvementDetail.utilisateurAnnulation}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 flex justify-between">
              <button
                onClick={() => {
                  onPrintBon(mouvementDetail);
                  setMouvementDetail(null);
                }}
                className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer le Bon</span>
              </button>

              <button
                onClick={() => setMouvementDetail(null)}
                className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
