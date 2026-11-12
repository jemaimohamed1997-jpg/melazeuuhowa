import React, { useState } from 'react';
import { X, CheckCircle, Truck, DollarSign } from 'lucide-react';
import { GrignonSale, GrignonPaymentMode } from '../../types/production';
import { translations, Language } from '../../lib/i18n';

interface GrignonSaleModalProps {
  currentOperator: string;
  lang: Language;
  onClose: () => void;
  onSubmit: (sale: GrignonSale) => void;
}

export const GrignonSaleModal: React.FC<GrignonSaleModalProps> = ({
  currentOperator,
  lang,
  onClose,
  onSubmit
}) => {
  const t = translations[lang];

  const [buyerName, setBuyerName] = useState<string>('Huilerie du Sud - Extraction');
  const [truckPlate, setTruckPlate] = useState<string>('123 TU 4567');
  const [driverName, setDriverName] = useState<string>('');

  const [grossWeight, setGrossWeight] = useState<number>(24500);
  const [tareWeight, setTareWeight] = useState<number>(9500);
  const [pricePerTonne, setPricePerTonne] = useState<number>(180); // e.g. 180 TND/tonne
  const [paymentMode, setPaymentMode] = useState<GrignonPaymentMode>('ESPECES');
  const [paymentStatus, setPaymentStatus] = useState<'PAYE' | 'IMPAYE'>('PAYE');
  const [notes, setNotes] = useState<string>('');

  // Calculations
  const netWeightKg = Math.max(0, grossWeight - tareWeight);
  const netWeightTonnes = Math.round((netWeightKg / 1000) * 100) / 100;
  const totalPriceTnd = Math.round(netWeightTonnes * pricePerTonne * 1000) / 1000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (netWeightKg <= 0) {
      alert('Le poids net de grignons doit être supérieur à zéro.');
      return;
    }

    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const docNumber = `BON-GRI-${year}-${rand}`;

    const sale: GrignonSale = {
      id: `gri-${Date.now()}`,
      doc_number: docNumber,
      date: new Date().toISOString(),
      buyer_name: buyerName.trim(),
      truck_plate: truckPlate.trim().toUpperCase(),
      driver_name: driverName.trim() || null,
      gross_weight_kg: Number(grossWeight),
      tare_weight_kg: Number(tareWeight),
      net_weight_kg: Number(netWeightKg),
      net_weight_tonnes: Number(netWeightTonnes),
      unit_price_per_tonne_tnd: Number(pricePerTonne),
      total_price_tnd: Number(totalPriceTnd),
      payment_mode: paymentMode,
      payment_status: paymentStatus,
      operator: currentOperator,
      notes: notes.trim() || null,
      created_at: new Date().toISOString()
    };

    onSubmit(sale);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base">
              Nouveau Bon de Vente des Grignons (فيتورة)
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600">
            <strong>Règle Métier 8 & 9 :</strong> Les ventes de grignons sont documentées de façon indépendante sans gestion de stock distincte (chargement direct et pesée par camion).
          </div>

          {/* Buyer & Truck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Acheteur / Usine d'extraction *
              </label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Ex: Usine d'Huile & Grignons..."
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Matricule Camion *
              </label>
              <input
                type="text"
                required
                value={truckPlate}
                onChange={(e) => setTruckPlate(e.target.value)}
                placeholder="Ex: 145 TU 8900"
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nom du Chauffeur (optionnel)
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Ex: Habib Mansour"
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
            />
          </div>

          {/* Weighing Section */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Pesée du Camion (Bascule Pont)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Poids Brut (Camion plein)
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(Number(e.target.value))}
                  required
                  className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Tare (Camion vide)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(Number(e.target.value))}
                  required
                  className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-800 mb-1">
                  Poids Net de Grignons
                </label>
                <div className="p-2 bg-amber-50 border border-amber-300 rounded text-xs font-mono font-black text-amber-950 text-center">
                  {netWeightTonnes} T ({netWeightKg} KG)
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Prix unitaire (TND / Tonne)
              </label>
              <input
                type="number"
                min="1"
                step="5"
                value={pricePerTonne}
                onChange={(e) => setPricePerTonne(Number(e.target.value))}
                required
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mode de Paiement
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as GrignonPaymentMode)}
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded text-xs font-medium"
              >
                <option value="ESPECES">Espèces (نقدا)</option>
                <option value="CHEQUE">Chèque (شيك)</option>
                <option value="VIREMENT">Virement bancaire (تحويل)</option>
                <option value="A_TERME">À terme / Crédit (مؤجل)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Statut Règlement
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as 'PAYE' | 'IMPAYE')}
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded text-xs font-medium"
              >
                <option value="PAYE">Payé (خالص)</option>
                <option value="IMPAYE">Non Payé / Crédit (غير خالص)</option>
              </select>
            </div>
          </div>

          {/* Total Banner */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
              Montant Total de la Vente :
            </span>
            <span className="font-mono text-xl font-black text-amber-950">
              {totalPriceTnd.toFixed(3)} TND
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Remarques
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Chargement du matin, humidité conforme..."
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded text-xs"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Valider & Émettre le Bon de Vente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
