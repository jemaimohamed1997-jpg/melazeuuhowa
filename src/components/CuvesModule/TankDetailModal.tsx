import React from 'react';
import { X, Printer, Database, AlertTriangle, ArrowDownLeft, ArrowUpRight, User } from 'lucide-react';
import { TankStockDetail, TankMovement, Operation } from '../../types/stock';
import { translations, Language } from '../../lib/i18n';

interface TankDetailModalProps {
  tankDetail: TankStockDetail;
  movements: TankMovement[];
  operations: Operation[];
  lang: Language;
  onClose: () => void;
  onPrint: () => void;
}

export const TankDetailModal: React.FC<TankDetailModalProps> = ({
  tankDetail,
  movements,
  operations,
  lang,
  onClose,
  onPrint
}) => {
  const t = translations[lang];
  const { tank, current_quantity, fill_percentage, remaining_capacity, is_alert, clients_breakdown } = tankDetail;

  // Filter movements for this tank
  const tankMovements = movements.filter(m => m.tank_id === tank.id);
  const opMap = new Map<string, Operation>();
  for (const op of operations) opMap.set(op.id, op);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black px-2.5 py-1 bg-amber-500 text-stone-950 rounded">
              {tank.code}
            </span>
            <div>
              <h2 className="font-bold text-base">{tank.name}</h2>
              <span className="text-xs text-stone-400">Fiche Technique & Relevé de Stock</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="p-1.5 hover:bg-stone-800 rounded text-stone-300 hover:text-white"
              title="Imprimer la fiche de cuve"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-[11px] text-stone-500 block">Capacité Max</span>
              <span className="font-mono font-bold text-stone-900 text-sm">{tank.capacity.toLocaleString()} L</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-[11px] text-amber-800 block font-semibold">Stock Actuel</span>
              <span className="font-mono font-black text-amber-950 text-base">{current_quantity.toLocaleString()} L</span>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-[11px] text-stone-500 block">Espace Libre</span>
              <span className="font-mono font-bold text-stone-900 text-sm">{remaining_capacity.toLocaleString()} L</span>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-[11px] text-stone-500 block">Taux Remplissage</span>
              <span className={`font-mono font-black text-base ${is_alert ? 'text-rose-600' : 'text-stone-900'}`}>
                {fill_percentage}%
              </span>
            </div>
          </div>

          {is_alert && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2.5 text-xs text-amber-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Avertissement : Cette cuve a atteint ou dépassé le seuil de remplissage recommandé (85%).</span>
            </div>
          )}

          {/* Clients breakdown in this tank */}
          <div>
            <h3 className="text-xs font-bold uppercase text-stone-800 mb-3 tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-600" />
              <span>Producteurs possédant de l'huile dans cette cuve ({clients_breakdown.length})</span>
            </h3>

            {clients_breakdown.length > 0 ? (
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Producteur / Client</th>
                      <th className="p-2.5 text-right">Quantité Détenue</th>
                      <th className="p-2.5 text-right">Part dans la Cuve</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {clients_breakdown.map((c, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="p-2.5 font-mono text-stone-500">{c.party_code}</td>
                        <td className="p-2.5 font-bold text-stone-900">{c.party_name}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-amber-950">{c.quantity} L</td>
                        <td className="p-2.5 text-right font-mono text-stone-600">{c.percentage_of_tank}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic py-3 bg-stone-50 rounded-lg text-center">
                Aucun client n'a de stock dans cette cuve actuellement.
              </p>
            )}
          </div>

          {/* Historical Movements Log */}
          <div>
            <h3 className="text-xs font-bold uppercase text-stone-800 mb-3 tracking-wider">
              Historique des Mouvements sur cette Cuve ({tankMovements.length})
            </h3>

            {tankMovements.length > 0 ? (
              <div className="border border-stone-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-600 border-b border-stone-200 sticky top-0">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">N° Bon</th>
                      <th className="p-2">Sens</th>
                      <th className="p-2 text-right">Quantité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {tankMovements.map((m, idx) => {
                      const op = opMap.get(m.operation_id);
                      return (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="p-2 text-stone-500 font-mono text-[11px]">
                            {m.created_at ? new Date(m.created_at).toLocaleDateString('fr-TN') : '-'}
                          </td>
                          <td className="p-2 font-mono font-semibold text-stone-800">
                            {op?.doc_number || m.notes || m.operation_id}
                          </td>
                          <td className="p-2">
                            <span className={`inline-flex items-center gap-1 font-bold ${
                              m.direction === 'IN' ? 'text-emerald-700' : 'text-stone-700'
                            }`}>
                              {m.direction === 'IN' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                              {m.direction === 'IN' ? 'Entrée' : 'Sortie'}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono font-bold">
                            {m.direction === 'IN' ? `+${m.quantity}` : `-${m.quantity}`} L
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic py-3 bg-stone-50 rounded-lg text-center">
                Aucun mouvement enregistré pour cette cuve.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
