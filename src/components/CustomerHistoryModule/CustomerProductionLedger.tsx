import React, { useState } from 'react';
import { User, Search, Printer, Database, ArrowRight, CheckCircle2, AlertCircle, Droplets, Award, X } from 'lucide-react';
import { Party, TankStockDetail } from '../../types/stock';
import { ProductionBatch } from '../../types/production';
import { translations, Language } from '../../lib/i18n';

interface CustomerProductionLedgerProps {
  parties: Party[];
  batches: ProductionBatch[];
  tanks: TankStockDetail[];
  lang: Language;
  onPrintStatement: (clientSummary: any) => void;
  onDepositInTank: (batch: ProductionBatch, targetTankId: string) => void;
}

export const CustomerProductionLedger: React.FC<CustomerProductionLedgerProps> = ({
  parties,
  batches,
  tanks,
  lang,
  onPrintStatement,
  onDepositInTank
}) => {
  const t = translations[lang];
  const [selectedPartyId, setSelectedPartyId] = useState<string>(parties[0]?.id || 'ALL');
  const [depositModalBatch, setDepositModalBatch] = useState<ProductionBatch | null>(null);
  const [chosenTankId, setChosenTankId] = useState<string>(tanks[0]?.tank.id || '');

  // Filter batches by selected party
  const filteredBatches = selectedPartyId === 'ALL'
    ? batches
    : batches.filter(b => b.party_id === selectedPartyId);

  // Group by client
  const clientsSummaries = parties.map(p => {
    const clientBatches = batches.filter(b => b.party_id === p.id);
    const totalOlives = clientBatches.reduce((sum, b) => sum + b.olives_net_kg, 0);
    const totalOilLitres = clientBatches.reduce((sum, b) => sum + b.oil_quantity_litres, 0);
    const totalOilKg = clientBatches.reduce((sum, b) => sum + b.oil_quantity_kg, 0);
    const avgYield = totalOlives > 0 ? (totalOilKg / totalOlives) * 100 : 0;
    const totalFees = clientBatches.reduce((sum, b) => sum + b.milling_fee_total_tnd, 0);
    const paidFees = clientBatches.filter(b => b.milling_fee_paid).reduce((sum, b) => sum + b.milling_fee_total_tnd, 0);

    return {
      party: p,
      batches: clientBatches,
      totalOlives,
      totalOilLitres,
      totalOilKg,
      avgYield,
      totalFees,
      paidFees,
      dueFees: totalFees - paidFees
    };
  }).filter(cs => cs.batches.length > 0 || selectedPartyId === cs.party.id);

  // Overall totals for filtered view
  const overallOlives = filteredBatches.reduce((sum, b) => sum + b.olives_net_kg, 0);
  const overallOilLitres = filteredBatches.reduce((sum, b) => sum + b.oil_quantity_litres, 0);
  const overallOilKg = filteredBatches.reduce((sum, b) => sum + b.oil_quantity_kg, 0);
  const overallAvgYield = overallOlives > 0 ? (overallOilKg / overallOlives) * 100 : 0;
  const overallFees = filteredBatches.reduce((sum, b) => sum + b.milling_fee_total_tnd, 0);

  const handleConfirmDeposit = () => {
    if (depositModalBatch && chosenTankId) {
      onDepositInTank(depositModalBatch, chosenTankId);
      setDepositModalBatch(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Client Selector & Overview Filter */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Sélectionner un Producteur pour voir son Relevé</h3>
            <p className="text-xs text-stone-500">Historique complet des récoltes triturées, rendements obtenus et solde</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 min-w-[220px]"
            >
              <option value="ALL">Tous les Producteurs ({batches.length} lots)</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>

            {selectedPartyId !== 'ALL' && (
              <button
                onClick={() => {
                  const curr = clientsSummaries.find(cs => cs.party.id === selectedPartyId);
                  if (curr) {
                    onPrintStatement({
                      party_name: curr.party.name,
                      party_code: curr.party.code,
                      total_olives_kg: curr.totalOlives,
                      total_oil_litres: curr.totalOilLitres,
                      average_yield_percent: curr.avgYield
                    });
                  }
                }}
                className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer Relevé</span>
              </button>
            )}
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-[11px] text-stone-500 block">Total Olives Triturées</span>
            <span className="font-mono text-base font-black text-stone-900">{overallOlives.toLocaleString()} KG</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-[11px] text-amber-800 font-semibold block">Huile Totale Extraite</span>
            <span className="font-mono text-base font-black text-amber-950">{overallOilLitres.toLocaleString()} Litres</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-[11px] text-emerald-800 font-semibold block">Rendement Moyen</span>
            <span className="font-mono text-base font-black text-emerald-900">{overallAvgYield.toFixed(2)} %</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-[11px] text-stone-500 block">Frais Totaux Trituration</span>
            <span className="font-mono text-base font-bold text-stone-900">{overallFees.toFixed(3)} TND</span>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
            Détail des Lots de Trituration ({filteredBatches.length})
          </h4>
          <span className="text-xs text-stone-500">
            Huile conservée dans l'historique du client sans mélange automatique en cuves
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">N° Bon & Date</th>
                <th className="p-3.5">Producteur</th>
                <th className="p-3.5 text-right">Olives Net</th>
                <th className="p-3.5 text-right">Huile Obtenue</th>
                <th className="p-3.5 text-right">Rendement</th>
                <th className="p-3.5">Frais & Paiement</th>
                <th className="p-3.5">Destination de l'huile</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredBatches.length > 0 ? (
                filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-stone-900 block">{b.ticket_number}</span>
                      <span className="text-[10px] text-stone-400">{new Date(b.started_at).toLocaleDateString('fr-TN')}</span>
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-stone-900 block">{b.party_name}</span>
                      <span className="text-[10px] text-stone-500">Réf: {b.reception_ticket}</span>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-stone-800">
                      {b.olives_net_kg.toLocaleString()} KG
                    </td>

                    <td className="p-3.5 text-right">
                      <span className="font-mono font-black text-amber-950 text-sm block">
                        {b.oil_quantity_litres} L
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        ({b.oil_quantity_kg} KG)
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <span className="font-mono font-black text-emerald-700 text-sm block">
                        {b.yield_percentage.toFixed(2)} %
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {b.yield_litres_per_100kg.toFixed(2)} L/100kg
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className="font-mono font-bold text-stone-900 block">
                        {b.milling_fee_total_tnd.toFixed(3)} TND
                      </span>
                      <span className={`text-[10px] font-bold ${b.milling_fee_paid ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {b.milling_fee_paid ? '✓ Payé' : '✗ Reste à régler'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {b.oil_destination === 'STOCKAGE_CUVE' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <Database className="w-3 h-3 text-blue-600" />
                          En Cuve Stockage
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                          Enlevé par le client
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      {b.oil_destination !== 'STOCKAGE_CUVE' && (
                        <button
                          onClick={() => setDepositModalBatch(b)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold text-[11px] flex items-center gap-1 ml-auto"
                          title="Transférer cette huile vers une cuve de stockage de la huilerie"
                        >
                          <Database className="w-3 h-3" />
                          <span>Mettre en Cuve</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone-400 italic">
                    Aucun historique de trituration pour ce producteur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for transferring customer oil into storage tanks explicitly */}
      {depositModalBatch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-bold text-stone-900 text-sm">
                Transférer l'huile en Cuve de Stockage
              </h3>
              <button onClick={() => setDepositModalBatch(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Le producteur <strong>{depositModalBatch.party_name}</strong> souhaite déposer <strong>{depositModalBatch.oil_quantity_litres} Litres</strong> d'huile extraite dans les cuves de l'huilerie.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Choisir la Cuve de Stockage Réceptrice :
              </label>
              <select
                value={chosenTankId}
                onChange={(e) => setChosenTankId(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
              >
                {tanks.map(item => (
                  <option key={item.tank.id} value={item.tank.id}>
                    {item.tank.code} - {item.tank.name} (Libre: {item.remaining_capacity} L)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
              Cela enregistrera officiellement un <strong>Bon de Réception Stock (Entrée Cuve)</strong> pour ce client, conformément aux règles de traçabilité.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDepositModalBatch(null)}
                className="px-3 py-1.5 border border-stone-300 rounded text-xs font-semibold text-stone-700"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDeposit}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold"
              >
                Confirmer l'Entrée en Cuve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
