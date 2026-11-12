import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Edit3, 
  PowerOff, 
  Power, 
  ArrowLeftRight, 
  Search, 
  Download, 
  AlertCircle,
  CheckCircle,
  Users,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  X,
  History,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Droplets
} from 'lucide-react';
import { CuveDetails, Cuve, AppSettings, Movement, Client } from '../types';
import { exporterSituationStockExcel } from '../services/excelExport';

interface CuvesManagerProps {
  cuvesDetails: CuveDetails[];
  mouvements?: Movement[];
  clients?: Client[];
  onAddCuve: (numero: string, nom: string, capaciteMax: number, notes?: string) => void;
  onEditCuve: (cuveId: string, nom: string, capaciteMax: number, notes?: string) => void;
  onToggleActive: (cuveId: string) => void;
  onDeleteCuve?: (cuveId: string) => void;
  onOpenTransfertForCuve: (cuveId: string) => void;
  onOpenEntreeForCuve: (cuveId: string) => void;
  settings: AppSettings;
}

export const CuvesManager: React.FC<CuvesManagerProps> = ({
  cuvesDetails,
  mouvements = [],
  clients = [],
  onAddCuve,
  onEditCuve,
  onToggleActive,
  onDeleteCuve,
  onOpenTransfertForCuve,
  onOpenEntreeForCuve,
  settings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCuve, setEditingCuve] = useState<CuveDetails | null>(null);
  const [cuveToDelete, setCuveToDelete] = useState<CuveDetails | null>(null);
  const [selectedCuveForHistory, setSelectedCuveForHistory] = useState<CuveDetails | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Formulaire d'ajout
  const [newNumero, setNewNumero] = useState('');
  const [newNom, setNewNom] = useState('');
  const [newCapacite, setNewCapacite] = useState<number>(5000);
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Formulaire d'édition
  const [editNom, setEditNom] = useState('');
  const [editCapacite, setEditCapacite] = useState<number>(5000);
  const [editNotes, setEditNotes] = useState('');

  const filteredCuves = cuvesDetails.filter(c => 
    c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      onAddCuve(newNumero, newNom, Number(newCapacite), newNotes);
      setShowAddModal(false);
      setNewNumero('');
      setNewNom('');
      setNewCapacite(5000);
      setNewNotes('');
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleStartEdit = (cuve: CuveDetails) => {
    setEditingCuve(cuve);
    setEditNom(cuve.nom);
    setEditCapacite(cuve.capaciteMax);
    setEditNotes(cuve.notes || '');
    setFormError('');
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCuve) return;
    setFormError('');
    try {
      onEditCuve(editingCuve.id, editNom, Number(editCapacite), editNotes);
      setEditingCuve(null);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Barre d'action supérieure */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Rechercher par numéro de pile, nom ou note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exporterSituationStockExcel(cuvesDetails, id => {
              const c = cuvesDetails.find(x => x.id === id);
              return c ? c.stockActuel : 0;
            }, settings.nomEntreprise)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 cursor-pointer"
          >
            <Download className="w-4 h-4 text-stone-600" />
            <span>Exporter en Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => { setShowAddModal(true); setFormError(''); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Pile / Cuve</span>
          </button>
        </div>
      </div>

      {/* Tableau détaillé des Cuves */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/90 text-stone-700 font-bold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">N° Pile</th>
                <th className="py-3 px-4">Désignation</th>
                <th className="py-3 px-4 text-right">Capacité Max</th>
                <th className="py-3 px-4 text-right">Stock Actuel</th>
                <th className="py-3 px-4 text-right">Capacité Libre</th>
                <th className="py-3 px-4">Remplissage</th>
                <th className="py-3 px-4">Déposants / Répartition</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCuves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-stone-800 text-sm">
                        {searchTerm ? "Aucune pile ne correspond à votre recherche." : "Aucune pile / cuve de stockage enregistrée."}
                      </div>
                      <p className="text-xs text-stone-400">
                        {searchTerm 
                          ? "Vérifiez l'orthographe du numéro ou du nom de la cuve." 
                          : "L'application est vierge de toute fausse pile. Cliquez ci-dessous pour configurer vos propres piles de stockage."}
                      </p>
                      {!searchTerm && (
                        <button
                          type="button"
                          onClick={() => { setShowAddModal(true); setFormError(''); }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Créer ma Première Pile</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCuves.map(cuve => {
                  const isFull = cuve.capaciteRestante <= 0.001;
                  const isNearFull = cuve.tauxRemplissage >= settings.alertSeuilRemplissage;

                  return (
                    <tr key={cuve.id} className="hover:bg-stone-50 transition">
                      <td className="py-3 px-4 font-mono font-extrabold text-stone-900">
                        <button
                          type="button"
                          onClick={() => setSelectedCuveForHistory(cuve)}
                          className="px-2 py-1 rounded bg-stone-100 hover:bg-emerald-100 border border-stone-300 hover:border-emerald-500 text-stone-900 hover:text-emerald-800 transition cursor-pointer text-left"
                          title="Cliquer pour voir l'historique complet de cette pile"
                        >
                          {cuve.numero}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedCuveForHistory(cuve)}
                          className="font-bold text-stone-900 hover:text-emerald-700 text-left transition cursor-pointer group"
                          title="Cliquer pour ouvrir l'historique complet de cette pile"
                        >
                          <span>{cuve.nom}</span>
                          <span className="hidden group-hover:inline ml-1.5 text-[10px] text-emerald-600 font-normal">
                            &bull; Voir l'historique &rarr;
                          </span>
                        </button>
                        {cuve.notes && <div className="text-[11px] text-stone-400 mt-0.5">{cuve.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-stone-700">
                        {cuve.capaciteMax.toLocaleString('fr-FR')} L
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-800">
                        {cuve.stockActuel.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isFull ? 'text-red-600' : 'text-stone-700'}>
                          {cuve.capaciteRestante.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                        </span>
                      </td>
                      <td className="py-3 px-4 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-2 rounded-full ${
                                isFull ? 'bg-red-600' : isNearFull ? 'bg-amber-500' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${Math.min(100, cuve.tauxRemplissage)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-stone-700 w-10 text-right">
                            {cuve.tauxRemplissage}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {cuve.clients.length === 0 ? (
                          <span className="text-stone-400 italic">Vide (aucun client)</span>
                        ) : (
                          <div className="space-y-1 max-w-[260px]">
                            {cuve.clients.map((c, i) => (
                              <div key={i} className="flex justify-between items-center text-[11px] bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                                <span className="truncate max-w-[160px] font-medium" title={c.client.nomComplet}>
                                  {c.client.nomComplet}
                                </span>
                                <span className="font-mono font-bold text-emerald-700 shrink-0 ml-1">
                                  {c.quantite.toLocaleString('fr-FR')} L
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          cuve.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {cuve.active ? <CheckCircle className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                          {cuve.active ? 'Active' : 'Désactivée'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCuveForHistory(cuve)}
                            className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                            title="Ouvrir l'historique complet de cette pile (Entrées, Sorties, Dates)"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenEntreeForCuve(cuve.id)}
                            disabled={!cuve.active || isFull}
                            className="p-1.5 rounded hover:bg-emerald-50 text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Entrée d'huile dans cette cuve"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenTransfertForCuve(cuve.id)}
                            disabled={!cuve.active || cuve.stockActuel <= 0}
                            className="p-1.5 rounded hover:bg-sky-50 text-sky-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Transférer de l'huile depuis cette cuve"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cuve)}
                            className="p-1.5 rounded hover:bg-stone-100 text-stone-600 cursor-pointer"
                            title="Modifier nom ou capacité"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleActive(cuve.id)}
                            className={`p-1.5 rounded cursor-pointer ${
                              cuve.active ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                            title={cuve.active ? "Désactiver la cuve" : "Réactiver la cuve"}
                          >
                            {cuve.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCuveToDelete(cuve); setDeleteError(''); }}
                            className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-600 transition cursor-pointer"
                            title="Supprimer la cuve (Contrôle strict des stocks et historiques)"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Modal Ajout Nouvelle Cuve */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-700" />
              Créer une Nouvelle Pile / Cuve
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Chaque cuve possède un numéro unique et une capacité maximale de contrôle.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Numéro Unique de Pile (ex: P-05, CUVE-10) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: P-05"
                  value={newNumero}
                  onChange={(e) => setNewNumero(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Désignation / Nom de la Cuve *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Cuve Inox 316L Nord"
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Capacité Maximale Totale (Litres) *
                </label>
                <input
                  type="number"
                  required
                  min="50"
                  step="10"
                  value={newCapacite}
                  onChange={(e) => setNewCapacite(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Emplacement / Observations techniques
                </label>
                <textarea
                  rows={2}
                  placeholder="ex: Rangée Nord, réservée huile vierge extra, robinet de purge bas"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                >
                  Enregistrer la Cuve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Édition Cuve */}
      {editingCuve && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-1">
              Modifier la Pile {editingCuve.numero}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Stock actuel : {editingCuve.stockActuel} L. La capacité ne peut pas être inférieure au stock déjà présent.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Désignation
                </label>
                <input
                  type="text"
                  required
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Capacité Maximale (Litres)
                </label>
                <input
                  type="number"
                  required
                  min={editingCuve.stockActuel}
                  step="10"
                  value={editCapacite}
                  onChange={(e) => setEditCapacite(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCuve(null)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation de Suppression de Cuve avec règles de sécurité strictes */}
      {cuveToDelete && (() => {
        const stock = cuveToDelete.stockActuel;
        const hasStock = stock > 0.001;
        const cuveMouvements = (mouvements || []).filter(m => m.cuveId === cuveToDelete.id);
        const hasHistory = cuveMouvements.length > 0;
        const canPermanentlyDelete = !hasStock && !hasHistory;

        const handleConfirmDelete = () => {
          if (!canPermanentlyDelete || !onDeleteCuve) return;
          setIsDeleting(true);
          setDeleteError('');
          try {
            onDeleteCuve(cuveToDelete.id);
            setCuveToDelete(null);
          } catch (err: any) {
            setDeleteError(err.message || "Erreur lors de la suppression de la cuve.");
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
                      Suppression de Pile / Cuve
                    </h3>
                    <p className="text-xs text-stone-500 font-mono">
                      {cuveToDelete.numero} &bull; {cuveToDelete.nom}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCuveToDelete(null)}
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

              {/* Cas 1 : La cuve contient du stock */}
              {hasStock && (
                <div className="mt-4 space-y-3">
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-red-800">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Suppression impossible : Cuve non vide
                    </div>
                    <p>
                      La cuve <strong>{cuveToDelete.numero}</strong> contient actuellement{' '}
                      <strong className="font-mono text-red-950 font-extrabold">{stock.toLocaleString('fr-FR')} L</strong> d'huile d'olive.
                    </p>
                    <p className="text-red-700 text-[11px]">
                      Pour protéger le capital et les stocks de l'huilerie, vous devez d'abord transférer ou sortir l'huile avant de pouvoir supprimer cette cuve.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCuveToDelete(null)}
                      className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cid = cuveToDelete.id;
                        setCuveToDelete(null);
                        onOpenTransfertForCuve(cid);
                      }}
                      className="px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Transférer l'huile</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Cas 2 : La cuve est vide mais possède un historique comptable */}
              {!hasStock && hasHistory && (
                <div className="mt-4 space-y-3">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                      Suppression permanente interdite : Traçabilité historique
                    </div>
                    <p>
                      La cuve <strong>{cuveToDelete.numero}</strong> est actuellement vide de stock, mais elle est référencée dans{' '}
                      <strong>{cuveMouvements.length} bon(s) officiel(s)</strong> de l'historique comptable.
                    </p>
                    <p className="text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded border border-amber-200/80">
                      <strong>Règle de sécurité :</strong> Pour préserver la conformité légale des registres, les cuves ayant des transactions historiques ne peuvent pas être détruites. Vous pouvez la désactiver à la place pour empêcher de nouveaux dépôts.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCuveToDelete(null)}
                      className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cid = cuveToDelete.id;
                        onToggleActive(cid);
                        setCuveToDelete(null);
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer ${
                        cuveToDelete.active ? 'bg-amber-700 hover:bg-amber-600' : 'bg-emerald-700 hover:bg-emerald-600'
                      }`}
                    >
                      {cuveToDelete.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      <span>{cuveToDelete.active ? 'Désactiver la cuve à la place' : 'Réactiver la cuve'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Cas 3 : Cuve vide et sans aucun historique (Suppression autorisée) */}
              {canPermanentlyDelete && (
                <div className="mt-4 space-y-3">
                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 space-y-1.5">
                    <p className="font-semibold text-stone-900">
                      Confirmation de suppression définitive :
                    </p>
                    <p>
                      Êtes-vous certain de vouloir supprimer définitivement la cuve{' '}
                      <strong className="text-stone-950">{cuveToDelete.numero} - {cuveToDelete.nom}</strong> ?
                    </p>
                    <p className="text-stone-500 text-[11px]">
                      Capacité : {cuveToDelete.capaciteMax.toLocaleString('fr-FR')} L &bull; Stock actuel : 0 L.
                      Cette cuve ne contient aucun historique et sera définitivement retirée de l'application et de la base de données.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCuveToDelete(null)}
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

      {/* Modal Historique Individuel Officiel de la Pile Inox */}
      {selectedCuveForHistory && (() => {
        const cuve = selectedCuveForHistory;
        const pileMouvements = mouvements
          .filter(m => m.cuveId === cuve.id)
          .sort((a, b) => new Date(b.dateMouvement).getTime() - new Date(a.dateMouvement).getTime());

        // Calculs stricts des totaux de cette pile
        let totalEntrees = 0;
        let totalSorties = 0;

        pileMouvements.forEach(m => {
          if (!m.estAnnule) {
            if (m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE') {
              totalEntrees += m.quantite;
            } else if (m.typeMouvement === 'SORTIE' || m.typeMouvement === 'TRANSFERT_SORTIE') {
              totalSorties += m.quantite;
            }
          }
        });

        const soldeActuel = Math.max(0, Math.round((totalEntrees - totalSorties) * 100) / 100);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              
              {/* Entête Modal */}
              <div className="flex justify-between items-start pb-4 border-b border-stone-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0 shadow-xs">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-stone-900 text-amber-300 font-mono font-extrabold text-xs">
                        {cuve.numero}
                      </span>
                      <h3 className="text-lg font-extrabold text-stone-900">
                        {cuve.nom}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cuve.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                      }`}>
                        {cuve.active ? 'Active' : 'Désactivée'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Historique chronologique et traçabilité des opérations de cette pile
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCuveForHistory(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Statistiques clés de la pile */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Capacité Max</span>
                  <div className="font-mono font-extrabold text-stone-900 text-lg mt-0.5">
                    {cuve.capaciteMax.toLocaleString('fr-FR')} L
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Entrées</span>
                  <div className="font-mono font-extrabold text-emerald-800 text-lg mt-0.5">
                    +{totalEntrees.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Total Sorties</span>
                  <div className="font-mono font-extrabold text-amber-800 text-lg mt-0.5">
                    -{totalSorties.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                  </div>
                </div>

                <div className="bg-stone-900 text-white p-3 rounded-xl border border-stone-800">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Stock Net Actuel</span>
                  <div className="font-mono font-extrabold text-white text-lg mt-0.5">
                    {soldeActuel.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    Remplissage : {cuve.capaciteMax > 0 ? Math.round((soldeActuel / cuve.capaciteMax) * 1000) / 10 : 0}%
                  </div>
                </div>
              </div>

              {/* Tableau chronologique des mouvements */}
              <div className="flex-1 overflow-y-auto border border-stone-200 rounded-xl">
                {pileMouvements.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 italic">
                    <History className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                    <p className="font-semibold text-stone-600">Aucun mouvement pour cette cuve.</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Les réceptions et sorties d'huile enregistrées pour la pile {cuve.numero} apparaîtront automatiquement ici.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 text-stone-700 font-bold uppercase tracking-wider sticky top-0 border-b border-stone-200">
                      <tr>
                        <th className="py-2.5 px-3">Date & Heure</th>
                        <th className="py-2.5 px-3">N° Bon</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Client / Déposant</th>
                        <th className="py-2.5 px-3 text-right">Quantité (L)</th>
                        <th className="py-2.5 px-3">Acidité</th>
                        <th className="py-2.5 px-3">Observations / Motif</th>
                        <th className="py-2.5 px-3">Opérateur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {pileMouvements.map(m => {
                        const isEntree = m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE';
                        const isTransfert = m.typeMouvement.startsWith('TRANSFERT');
                        const client = clients.find(c => c.id === m.clientId);
                        
                        // Détection éventuelle de l'acidité
                        const textSearch = `${m.observations || ''} ${m.motif || ''}`;
                        const aciditeMatch = textSearch.match(/(\d+[.,]?\d*)\s*(?:°|%|deg|acid)/i);
                        const aciditeValue = aciditeMatch ? `${aciditeMatch[1]}°` : '-';

                        return (
                          <tr key={m.id} className={`hover:bg-stone-50 transition ${m.estAnnule ? 'bg-red-50/40 text-stone-400 line-through' : ''}`}>
                            <td className="py-2.5 px-3 whitespace-nowrap font-medium text-stone-700">
                              <div>{new Date(m.dateMouvement).toLocaleDateString('fr-FR')}</div>
                              <div className="text-[10px] text-stone-400">
                                à {new Date(m.dateMouvement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                              {m.numeroBon}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isEntree 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : isTransfert 
                                  ? 'bg-sky-100 text-sky-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isEntree ? <ArrowDownRight className="w-3 h-3 text-emerald-700" /> : <ArrowUpRight className="w-3 h-3 text-amber-700" />}
                                {m.typeMouvement}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-stone-900">
                              {client ? client.nomComplet : (m.clientId || 'Client non spécifié')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-sm">
                              <span className={isEntree ? 'text-emerald-700' : 'text-amber-700'}>
                                {isEntree ? '+' : '-'}{m.quantite.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} L
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-stone-700">
                              {aciditeValue}
                            </td>
                            <td className="py-2.5 px-3 text-stone-600 max-w-[200px] truncate" title={m.observations || m.motif}>
                              {m.observations || m.motif || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-stone-500 text-[11px]">
                              {m.utilisateur}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pied du modal */}
              <div className="pt-4 border-t border-stone-200 flex justify-between items-center text-xs">
                <span className="text-stone-500 font-medium">
                  {pileMouvements.length} mouvement(s) affiché(s) chronologiquement
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCuveForHistory(null)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold transition cursor-pointer"
                >
                  Fermer l'Historique
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
