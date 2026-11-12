import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Download, 
  Layers, 
  Eye, 
  Printer,
  Share2,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  X,
  Archive,
  UserX,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { Client, ClientBalance, Cuve, Movement, AppSettings } from '../types';
import { exporterReleveClientExcel } from '../services/excelExport';

interface ClientsManagerProps {
  clients: Client[];
  clientBalances: ClientBalance[];
  cuves: Cuve[];
  mouvements: Movement[];
  onAddClient: (nomComplet: string, telephone?: string, notes?: string) => Promise<Client | void> | void;
  onDeleteClient?: (clientId: string) => Promise<void> | void;
  onToggleClientActive?: (clientId: string) => Promise<void> | void;
  onOpenEntreeForClient: (clientId: string) => void;
  onOpenSortieForClient: (clientId: string) => void;
  onPrintBon: (mouv: Movement) => void;
  settings: AppSettings;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({
  clients,
  clientBalances,
  cuves,
  mouvements,
  onAddClient,
  onDeleteClient,
  onToggleClientActive,
  onOpenEntreeForClient,
  onOpenSortieForClient,
  onPrintBon,
  settings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClientForStatement, setSelectedClientForStatement] = useState<ClientBalance | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientBalance | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Formulaire client
  const [nomComplet, setNomComplet] = useState('');
  const [telephone, setTelephone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const filteredBalances = clientBalances.filter(cb => 
    cb.client.nomComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cb.client.codeClient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cb.client.telephone && cb.client.telephone.includes(searchTerm))
  );

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      await onAddClient(nomComplet, telephone, notes);
      setShowAddModal(false);
      setNomComplet('');
      setTelephone('');
      setNotes('');
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de l'enregistrement du client dans la base de données.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Barre d'action */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Rechercher par nom, code client ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => { setShowAddModal(true); setFormError(''); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Enregistrer un Déposant / Client</span>
        </button>
      </div>

      {/* Liste des Clients */}
      {filteredBalances.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-stone-300 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-base text-stone-800">Aucun client ou déposant enregistré</h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-5">
            Votre base de données démarre propre. Cliquez ci-dessous pour enregistrer manuellement vos clients et producteurs.
          </p>
          <button
            onClick={() => { setShowAddModal(true); setFormError(''); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enregistrer un Déposant / Client</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBalances.map(cb => {
          return (
            <div key={cb.client.id} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-300">
                      {cb.client.codeClient}
                    </span>
                    {cb.client.actif === false && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        Archivé
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-400">Stock Total Confié</span>
                    <div className="font-mono font-extrabold text-base text-emerald-800">
                      {cb.totalStock.toLocaleString('fr-FR', { minimumFractionDigits: settings.precisionDecimales, maximumFractionDigits: settings.precisionDecimales })} L
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-bold text-stone-900 mt-2 truncate" title={cb.client.nomComplet}>
                  {cb.client.nomComplet}
                </h3>

                {cb.client.telephone && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-1">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{cb.client.telephone}</span>
                  </div>
                )}

                {cb.client.notes && (
                  <p className="text-xs text-stone-500 mt-2 italic bg-stone-50 p-2 rounded border border-stone-100 line-clamp-2">
                    "{cb.client.notes}"
                  </p>
                )}

                {/* Répartition par cuve */}
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Répartition dans les Cuves</span>
                    <span>{cb.parCuve.length} cuve(s)</span>
                  </div>

                  {cb.parCuve.length === 0 ? (
                    <div className="text-xs text-stone-400 italic py-1">
                      Aucun stock actuellement déposé
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {cb.parCuve.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-emerald-50/60 text-emerald-900 px-2.5 py-1 rounded border border-emerald-200">
                          <span className="font-medium truncate max-w-[170px]">
                            {item.cuve.numero} - {item.cuve.nom}
                          </span>
                          <span className="font-mono font-bold">
                            {item.quantite.toLocaleString('fr-FR')} L
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Boutons d'action rapides */}
              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center gap-2">
                <button
                  onClick={() => setSelectedClientForStatement(cb)}
                  className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                  title="Voir le relevé des mouvements et exporter"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Relevé</span>
                </button>

                <button
                  onClick={() => onOpenEntreeForClient(cb.client.id)}
                  disabled={cb.client.actif === false}
                  className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  title={cb.client.actif === false ? "Client archivé" : "Enregistrer un nouveau dépôt"}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Entrée</span>
                </button>

                <button
                  onClick={() => onOpenSortieForClient(cb.client.id)}
                  disabled={cb.totalStock <= 0}
                  className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  title="Retirer de l'huile"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Sortie</span>
                </button>

                <button
                  onClick={() => { setClientToDelete(cb); setDeleteError(''); }}
                  className="py-1.5 px-2 bg-stone-100 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer"
                  title="Supprimer ou archiver ce compte client"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
        </div>
      )}

      {/* Modal Ajout Client */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              Nouveau Client / Déposant
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Chaque lot d'huile stocké dans l'huilerie est strictement attribué à un compte client.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nom Complet ou Raison Sociale *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Mohamed Jemai, Domaine Ben Salah..."
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Téléphone (Facultatif)
                </label>
                <input
                  type="tel"
                  placeholder="ex: +216 98 000 000"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Notes & Historique
                </label>
                <textarea
                  rows={2}
                  placeholder="ex: Producteur de Chemlali, région Sfax / Kairouan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-400 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Enregistrement dans la base...' : 'Créer le Compte Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Relevé de Compte Client */}
      {selectedClientForStatement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
            
            <div className="flex justify-between items-start pb-4 border-b border-stone-200">
              <div>
                <span className="font-mono text-xs font-bold text-stone-500 uppercase">
                  Relevé Officiel Déposant &bull; {selectedClientForStatement.client.codeClient}
                </span>
                <h3 className="text-xl font-extrabold text-stone-900 mt-0.5">
                  {selectedClientForStatement.client.nomComplet}
                </h3>
                {selectedClientForStatement.client.telephone && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    Tél : {selectedClientForStatement.client.telephone}
                  </p>
                )}
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-stone-400 uppercase">Solde Net Disponible</div>
                <div className="font-mono font-extrabold text-2xl text-emerald-800">
                  {selectedClientForStatement.totalStock.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                </div>
              </div>
            </div>

            {/* Répartition par cuve */}
            <div className="py-3 bg-stone-50 rounded-xl px-4 my-3 border border-stone-200">
              <div className="text-xs font-bold text-stone-600 uppercase mb-2">
                Localisation Actuelle en Cuves :
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedClientForStatement.parCuve.length === 0 ? (
                  <span className="text-xs text-stone-400 italic">Aucun litre stocké</span>
                ) : (
                  selectedClientForStatement.parCuve.map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-stone-200 text-xs shadow-xs font-medium">
                      <strong>{item.cuve.numero}</strong> ({item.cuve.nom}) : 
                      <span className="font-mono font-bold text-emerald-800">{item.quantite.toLocaleString('fr-FR')} L</span>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Historique des mouvements de ce client */}
            <div className="flex-1 overflow-y-auto my-2">
              <div className="text-xs font-bold text-stone-700 uppercase mb-2">
                Historique des Entrées, Sorties et Transferts :
              </div>
              
              {(() => {
                const clientMouvements = mouvements.filter(m => m.clientId === selectedClientForStatement.client.id);
                if (clientMouvements.length === 0) {
                  return <div className="text-xs text-stone-400 italic py-4">Aucune opération enregistrée.</div>;
                }

                return (
                  <table className="w-full text-left text-xs border border-stone-200 rounded-lg overflow-hidden">
                    <thead className="bg-stone-100 text-stone-600 font-bold uppercase">
                      <tr>
                        <th className="py-2 px-3">N° Bon</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Opération</th>
                        <th className="py-2 px-3">Cuve</th>
                        <th className="py-2 px-3 text-right">Quantité</th>
                        <th className="py-2 px-3 text-center">Bon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {clientMouvements.map(m => {
                        const isEntree = m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE';
                        const cuve = cuves.find(c => c.id === m.cuveId);

                        return (
                          <tr key={m.id} className={m.estAnnule ? 'bg-red-50/40 text-stone-400' : 'hover:bg-stone-50'}>
                            <td className="py-2.5 px-3 font-mono font-bold">{m.numeroBon}</td>
                            <td className="py-2.5 px-3">{new Date(m.dateMouvement).toLocaleDateString('fr-FR')}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                m.estAnnule ? 'line-through text-red-600' : isEntree ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {m.typeMouvement}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">{cuve ? `${cuve.numero} - ${cuve.nom}` : '-'}</td>
                            <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                              m.estAnnule ? 'line-through text-stone-400' : isEntree ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              {isEntree ? '+' : '-'}{m.quantite.toLocaleString('fr-FR')} L
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => onPrintBon(m)}
                                  className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                                  title="Partager le bon (WhatsApp, Messenger, PDF)"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onPrintBon(m)}
                                  className="p-1 text-stone-600 hover:text-stone-900 cursor-pointer"
                                  title="Réimprimer le bon"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-between items-center">
              <button
                onClick={() => {
                  const clientMouvements = mouvements.filter(m => m.clientId === selectedClientForStatement.client.id);
                  exporterReleveClientExcel(selectedClientForStatement.client, clientMouvements, cuves, selectedClientForStatement.totalStock);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-stone-600" />
                <span>Télécharger Relevé (.xlsx)</span>
              </button>

              <button
                onClick={() => setSelectedClientForStatement(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Confirmation de Suppression de Client avec règles de sécurité strictes */}
      {clientToDelete && (() => {
        const stock = clientToDelete.totalStock;
        const hasStock = stock > 0.001;
        const clientMouvements = mouvements.filter(m => m.clientId === clientToDelete.client.id);
        const hasHistory = clientMouvements.length > 0;
        const canPermanentlyDelete = !hasStock && !hasHistory;

        const handleConfirmDelete = async () => {
          if (!canPermanentlyDelete || !onDeleteClient) return;
          setIsDeleting(true);
          setDeleteError('');
          try {
            await onDeleteClient(clientToDelete.client.id);
            setClientToDelete(null);
          } catch (err: any) {
            setDeleteError(err.message || "Erreur lors de la suppression du client.");
          } finally {
            setIsDeleting(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-start pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${canPermanentlyDelete ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-stone-900">
                      Suppression de Client / Déposant
                    </h3>
                    <p className="text-xs text-stone-500 font-mono">
                      {clientToDelete.client.codeClient} &bull; {clientToDelete.client.nomComplet}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setClientToDelete(null)}
                  className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {deleteError && (
                <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Cas 1 : Le client a encore du stock d'huile en cuve */}
              {hasStock && (
                <div className="mt-4 space-y-3">
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-red-800">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Suppression impossible : Stock d'huile actif
                    </div>
                    <p>
                      Le client <strong>{clientToDelete.client.nomComplet} ({clientToDelete.client.codeClient})</strong> possède actuellement{' '}
                      <strong className="font-mono text-red-950 font-extrabold">{stock.toLocaleString('fr-FR')} L</strong> d'huile d'olive en cuve.
                    </p>
                    <p className="text-red-700 text-[11px]">
                      Pour protéger les dépôts et la responsabilité de l'huilerie, vous devez d'abord effectuer les sorties ou livraisons d'huile avant de pouvoir supprimer ce compte.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setClientToDelete(null)}
                      className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const clid = clientToDelete.client.id;
                        setClientToDelete(null);
                        onOpenSortieForClient(clid);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Retirer l'huile du client</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Cas 2 : Le client a 0 stock mais possède un historique comptable */}
              {!hasStock && hasHistory && (
                <div className="mt-4 space-y-3">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                      Suppression permanente interdite : Traçabilité comptable
                    </div>
                    <p>
                      Le client <strong>{clientToDelete.client.nomComplet}</strong> n'a plus d'huile en cuve, mais il est référencé dans{' '}
                      <strong>{clientMouvements.length} bon(s) officiel(s)</strong> de l'historique permanent.
                    </p>
                    <p className="text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded border border-amber-200/80">
                      <strong>Règle de sécurité :</strong> Pour préserver la traçabilité des dépôts et la conformité légale des registres comptables, la suppression définitive d'un client ayant un historique est interdite.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setClientToDelete(null)}
                      className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      Annuler
                    </button>
                    {onToggleClientActive && (
                      <button
                        type="button"
                        onClick={() => {
                          const clid = clientToDelete.client.id;
                          onToggleClientActive(clid);
                          setClientToDelete(null);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer ${
                          clientToDelete.client.actif !== false ? 'bg-amber-700 hover:bg-amber-600' : 'bg-emerald-700 hover:bg-emerald-600'
                        }`}
                      >
                        {clientToDelete.client.actif !== false ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span>{clientToDelete.client.actif !== false ? 'Archiver ce client à la place' : 'Réactiver le client'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cas 3 : Client sans stock et sans aucun historique (Suppression autorisée) */}
              {canPermanentlyDelete && (
                <div className="mt-4 space-y-3">
                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 space-y-1.5">
                    <p className="font-semibold text-stone-900">
                      Confirmation de suppression définitive :
                    </p>
                    <p>
                      Êtes-vous certain de vouloir supprimer définitivement le client{' '}
                      <strong className="text-stone-950">{clientToDelete.client.nomComplet} ({clientToDelete.client.codeClient})</strong> ?
                    </p>
                    <p className="text-stone-500 text-[11px]">
                      Ce compte client ne possède aucun solde et aucun historique d'opération. Il sera définitivement retiré de l'application et de la base de données.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setClientToDelete(null)}
                      className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeleting ? 'Suppression...' : 'Confirmer la suppression'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
};
