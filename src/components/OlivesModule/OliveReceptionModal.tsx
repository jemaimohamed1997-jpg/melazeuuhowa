import React, { useState } from 'react';
import { X, CheckCircle, Scale, Calendar, DollarSign, Truck, User } from 'lucide-react';
import { Party } from '../../types/stock';
import { OliveReception } from '../../types/production';
import { translations, Language } from '../../lib/i18n';

interface OliveReceptionModalProps {
  parties: Party[];
  currentOperator: string;
  lang: Language;
  onClose: () => void;
  onSubmit: (reception: OliveReception, sendToQueue: boolean) => void;
}

export const OliveReceptionModal: React.FC<OliveReceptionModalProps> = ({
  parties,
  currentOperator,
  lang,
  onClose,
  onSubmit
}) => {
  const t = translations[lang];

  // Default to today's local date
  const todayStr = new Date().toISOString().slice(0, 10);

  const [dateReception, setDateReception] = useState<string>(todayStr);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(parties[0]?.id || 'NEW');
  const [newPartyName, setNewPartyName] = useState<string>('');
  const [newPartyPhone, setNewPartyPhone] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');

  // Weighing
  const [grossWeight, setGrossWeight] = useState<number>(1200);
  const [tareWeight, setTareWeight] = useState<number>(300);

  // Milling Pricing
  const [millingFeePerKg, setMillingFeePerKg] = useState<number>(0.200);

  const [notes, setNotes] = useState<string>('');
  const [sendDirectlyToQueue, setSendDirectlyToQueue] = useState<boolean>(true);

  // Auto-calculated net weight & total fee
  const netWeight = Math.max(0, grossWeight - tareWeight);
  const totalMillingFeeTnd = Math.round(netWeight * millingFeePerKg * 1000) / 1000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (netWeight <= 0) {
      alert('Le poids net doit être strictement supérieur à zéro (Poids Brut > Tare).');
      return;
    }
    if (millingFeePerKg <= 0) {
      alert('Le prix de trituration par kg doit être supérieur à zéro.');
      return;
    }

    let partyName = '';
    let partyCode = 'CLI';
    let partyId = selectedPartyId;
    let partyPhone = '';

    if (selectedPartyId === 'NEW') {
      partyName = newPartyName.trim() || 'Nouveau Client';
      partyId = `cli-${Date.now()}`;
      partyPhone = newPartyPhone.trim();
    } else {
      const p = parties.find(item => item.id === selectedPartyId);
      partyName = p?.name || 'Client';
      partyCode = p?.code || 'CLI';
      partyPhone = p?.phone || '';
    }

    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `BON-OLV-${year}-${rand}`;

    const reception: OliveReception = {
      id: `olv-${Date.now()}`,
      ticket_number: ticketNumber,
      date: dateReception || todayStr,
      party_id: partyId,
      party_name: partyName,
      party_code: partyCode,
      phone: partyPhone || undefined,
      vehicle_plate: vehiclePlate.trim() || undefined,
      driver_name: driverName.trim() || undefined,
      gross_weight_kg: Number(grossWeight),
      tare_weight_kg: Number(tareWeight),
      net_weight_kg: Number(netWeight),
      milling_fee_per_kg: Number(millingFeePerKg),
      total_milling_fee_tnd: totalMillingFeeTnd,
      paid_amount_tnd: 0,
      remaining_amount_tnd: totalMillingFeeTnd,
      payment_status: 'IMPAYE',
      payments: [],
      status: sendDirectlyToQueue ? 'EN_FILE' : 'RECU',
      notes: notes.trim() || null,
      operator: currentOperator || 'Personnel Huilerie',
      created_at: new Date().toISOString()
    };

    onSubmit(reception, sendDirectlyToQueue);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-stone-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base">
                {lang === 'ar' ? 'وصل وزن وقبول الزيتون (BON-OLV)' : 'Nouveau Bon de Réception Olives'}
              </h2>
              <span className="text-[11px] text-stone-400">
                Pesée au pont-bascule & Tarification de la trituration
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
          {/* Date de réception (Obligatoire avec date picker) */}
          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
            <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>Date de Réception *</span>
            </label>
            <input
              type="date"
              required
              value={dateReception}
              onChange={(e) => setDateReception(e.target.value)}
              className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-[10px] text-amber-800/80 mt-1 block">
              Date officielle enregistrée sur le ticket et prise en compte pour le filtre du jour
            </span>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-stone-500" />
              <span>Producteur / Déposant *</span>
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900"
            >
              {parties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
              <option value="NEW">+ Nouveau Producteur / Non Enregistré</option>
            </select>

            {selectedPartyId === 'NEW' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-100 rounded-xl border border-stone-300">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Nom Complet du Producteur *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPartyName}
                    onChange={(e) => setNewPartyName(e.target.value)}
                    placeholder="Ex: Ali Trabelsi"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={newPartyPhone}
                    onChange={(e) => setNewPartyPhone(e.target.value)}
                    placeholder="Ex: 98 123 456"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Transport Details (Véhicule / Chauffeur) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-stone-500" />
                <span>Matricule Véhicule / Remorque</span>
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="Ex: 154 TN 8900"
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Chauffeur / Livreur
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Ex: Chauffeur agricole"
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
              />
            </div>
          </div>

          {/* Weighing Section (Bascule en KG) */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>Pesée à la Bascule (Kilogrammes)</span>
              </span>
              <span className="text-[11px] text-stone-500 font-mono">Unité: KG</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Poids Brut (KG) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Tare Camion / Caisses (KG) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  Poids Net des Olives
                </label>
                <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-sm font-mono font-black text-amber-950 text-center">
                  {netWeight.toLocaleString()} KG
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Total Section (Formule: Poids Net x Prix/kg) */}
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span>Tarif de Trituration & Total à Payer</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-800 font-bold">Devise: TND</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Prix de Trituration (TND / KG) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={millingFeePerKg}
                    onChange={(e) => setMillingFeePerKg(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-mono font-black text-emerald-950"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-stone-400">
                    TND/kg
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Modifiable pour chaque bon (tarif négocié par producteur)
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-300 text-center shadow-xs">
                <span className="text-[11px] font-extrabold text-stone-600 block uppercase">
                  Total à Payer (Calcul Automatique)
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-emerald-800 block my-0.5">
                  {totalMillingFeeTnd.toFixed(3)} TND
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {netWeight} kg × {millingFeePerKg.toFixed(3)} TND/kg
                </span>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Remarques / Parcelle (optionnel)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Récolte du matin, verger Sidi Bou..."
              className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium"
            />
          </div>

          {/* Direct Queue Assignment Checkbox */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-900 block">
                Mettre directement en file d'attente de trituration ?
              </span>
              <span className="text-[11px] text-stone-500">
                Rend le lot immédiatement disponible pour l'opérateur de la ligne de presse
              </span>
            </div>
            <input
              type="checkbox"
              checked={sendDirectlyToQueue}
              onChange={(e) => setSendDirectlyToQueue(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Enregistrer & Émettre le Bon</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
