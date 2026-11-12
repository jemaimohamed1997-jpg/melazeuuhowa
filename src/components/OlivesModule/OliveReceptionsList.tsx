import React, { useState } from 'react';
import {
  Scale,
  Search,
  Plus,
  Printer,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  AlertCircle,
  CreditCard,
  Banknote,
  Receipt
} from 'lucide-react';
import { OliveReception, ReceptionPayment } from '../../types/production';
import { translations, Language } from '../../lib/i18n';
import { ReceptionPaymentModal } from './ReceptionPaymentModal';

interface OliveReceptionsListProps {
  receptions: OliveReception[];
  currentOperator: string;
  lang: Language;
  onNewReception: () => void;
  onSendToQueue: (receptionId: string) => void;
  onPrintA4: (reception: OliveReception) => void;
  onPrintRP80: (reception: OliveReception) => void;
  onConfirmPayment: (payment: ReceptionPayment) => void;
  onExportExcel: () => void;
}

type DateFilterMode = 'TODAY' | 'EXACT' | 'RANGE' | 'ALL';

export const OliveReceptionsList: React.FC<OliveReceptionsListProps> = ({
  receptions,
  currentOperator,
  lang,
  onNewReception,
  onSendToQueue,
  onPrintA4,
  onPrintRP80,
  onConfirmPayment,
  onExportExcel
}) => {
  const t = translations[lang];
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filters State
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('TODAY');
  const [exactDate, setExactDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Selected Reception for Payment Modal
  const [payingReception, setPayingReception] = useState<OliveReception | null>(null);

  // Helper to extract YYYY-MM-DD from reception date
  const getRecDateStr = (dateVal: string): string => {
    try {
      if (dateVal.length === 10) return dateVal;
      return new Date(dateVal).toISOString().slice(0, 10);
    } catch {
      return dateVal.slice(0, 10);
    }
  };

  // Filter Logic
  const filtered = receptions.filter((r) => {
    // 1. Date Filter
    const rDate = getRecDateStr(r.date);
    let matchesDate = true;
    if (dateFilterMode === 'TODAY') {
      matchesDate = rDate === todayStr;
    } else if (dateFilterMode === 'EXACT') {
      matchesDate = rDate === exactDate;
    } else if (dateFilterMode === 'RANGE') {
      matchesDate = (!startDate || rDate >= startDate) && (!endDate || rDate <= endDate);
    } // 'ALL' leaves matchesDate = true

    // 2. Search Term (Client, Ticket, Driver, Phone)
    const matchesSearch =
      r.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.phone && r.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.vehicle_plate && r.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase()));

    // 3. Status Filter (Presse)
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    // 4. Payment Filter
    const matchesPayment = paymentFilter === 'ALL' || r.payment_status === paymentFilter;

    return matchesDate && matchesSearch && matchesStatus && matchesPayment;
  });

  // Period / Filter Totals
  const totalBons = filtered.length;
  const totalOlivesKg = filtered.reduce((sum, r) => sum + r.net_weight_kg, 0);
  const totalFactureTnd = filtered.reduce((sum, r) => sum + (r.total_milling_fee_tnd || 0), 0);
  const totalEncaisseTnd = filtered.reduce((sum, r) => sum + (r.paid_amount_tnd || 0), 0);
  const totalRestantTnd = filtered.reduce((sum, r) => sum + (r.remaining_amount_tnd || 0), 0);

  const countPayes = filtered.filter((r) => r.payment_status === 'PAYE').length;
  const countPartiels = filtered.filter((r) => r.payment_status === 'PARTIEL').length;
  const countImpayes = filtered.filter((r) => r.payment_status === 'IMPAYE').length;

  // Daily Breakdown calculation for the current view
  const dailyBreakdown = React.useMemo(() => {
    const map = new Map<string, { count: number; netKg: number; facture: number; encaisse: number; restant: number }>();
    filtered.forEach((r) => {
      const d = getRecDateStr(r.date);
      const curr = map.get(d) || { count: 0, netKg: 0, facture: 0, encaisse: 0, restant: 0 };
      curr.count += 1;
      curr.netKg += r.net_weight_kg || 0;
      curr.facture += r.total_milling_fee_tnd || 0;
      curr.encaisse += r.paid_amount_tnd || 0;
      curr.restant += r.remaining_amount_tnd || 0;
      map.set(d, curr);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, data]) => ({ date, ...data }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* 1. Date Filter Navigation Bar (Par Défaut: Aujourd'hui) */}
      <div className="bg-stone-900 text-white p-4 rounded-2xl border border-stone-800 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Période d'affichage
              </span>
              <p className="text-[11px] text-stone-400">
                {dateFilterMode === 'TODAY' && `Affichage exclusif des réceptions d'aujourd'hui (${todayStr})`}
                {dateFilterMode === 'EXACT' && `Bons de réception du ${exactDate}`}
                {dateFilterMode === 'RANGE' && `Bons de réception du ${startDate} au ${endDate}`}
                {dateFilterMode === 'ALL' && "Affichage de l'historique complet des réceptions"}
              </p>
            </div>
          </div>

          {/* Quick Date Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDateFilterMode('TODAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'TODAY'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Aujourd'hui
            </button>

            <button
              onClick={() => setDateFilterMode('EXACT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'EXACT'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Date précise
            </button>

            <button
              onClick={() => setDateFilterMode('RANGE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'RANGE'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Période (Du ... Au ...)
            </button>

            <button
              onClick={() => setDateFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'ALL'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Tous les bons
            </button>
          </div>
        </div>

        {/* Dynamic Inputs when Exact or Range is active */}
        {dateFilterMode === 'EXACT' && (
          <div className="mt-3 pt-3 border-t border-stone-800 flex items-center gap-3">
            <label className="text-xs text-stone-300 font-semibold">Choisir la date :</label>
            <input
              type="date"
              value={exactDate}
              onChange={(e) => setExactDate(e.target.value)}
              className="px-3 py-1.5 bg-stone-800 text-white border border-stone-700 rounded-lg text-xs font-mono font-bold"
            />
          </div>
        )}

        {dateFilterMode === 'RANGE' && (
          <div className="mt-3 pt-3 border-t border-stone-800 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-300 font-semibold">Du :</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-stone-800 text-white border border-stone-700 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-300 font-semibold">Au :</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-stone-800 text-white border border-stone-700 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Financial & Physical Synthesis Cards for Selected Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Bons */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] text-stone-500 font-bold uppercase block">Bons Réception</span>
          <span className="font-mono text-xl font-black text-stone-900 block mt-0.5">{totalBons}</span>
          <span className="text-[10px] text-stone-400">sur la sélection</span>
        </div>

        {/* Poids Net Total */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] text-amber-800 font-bold uppercase block">Poids Net Olives</span>
          <span className="font-mono text-xl font-black text-amber-900 block mt-0.5">
            {totalOlivesKg.toLocaleString()} <span className="text-xs font-semibold">KG</span>
          </span>
          <span className="text-[10px] text-amber-700/80">{(totalOlivesKg / 1000).toFixed(2)} tonnes</span>
        </div>

        {/* Total Facturé */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] text-stone-600 font-bold uppercase block">Total Facturé</span>
          <span className="font-mono text-xl font-black text-stone-900 block mt-0.5">
            {totalFactureTnd.toFixed(3)}
          </span>
          <span className="text-[10px] text-stone-400">TND (Poids × Tarif)</span>
        </div>

        {/* Total Réellement Encaissé */}
        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] text-emerald-800 font-bold uppercase block">Réellement Encaissé</span>
          <span className="font-mono text-xl font-black text-emerald-900 block mt-0.5">
            {totalEncaisseTnd.toFixed(3)}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold">TND en caisse</span>
        </div>

        {/* Total Restant à Encaisser */}
        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[10px] text-amber-900 font-bold uppercase block">Reste à Encaisser</span>
          <span className="font-mono text-xl font-black text-amber-950 block mt-0.5">
            {totalRestantTnd.toFixed(3)}
          </span>
          <span className="text-[10px] text-amber-800 font-semibold">TND créances</span>
        </div>

        {/* Statuts Bons */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] text-stone-500 font-bold uppercase block">Répartition Règlements</span>
          <div className="flex items-center justify-between text-xs font-mono font-bold mt-1">
            <span className="text-emerald-700" title="Bons entièrement payés">{countPayes} payés</span>
            <span className="text-amber-700" title="Bons partiellement payés">{countPartiels} part.</span>
            <span className="text-rose-700" title="Bons impayés">{countImpayes} imp.</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Rechercher par producteur, n° bon, téléphone, matricule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Payment Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'Tous Règlements' },
            { id: 'PAYE', label: 'Payés' },
            { id: 'PARTIEL', label: 'Partiels' },
            { id: 'IMPAYE', label: 'Impayés' }
          ].map((pf) => (
            <button
              key={pf.id}
              onClick={() => setPaymentFilter(pf.id)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                paymentFilter === pf.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {pf.label}
            </button>
          ))}
        </div>

        {/* Press Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'Tous Statuts' },
            { id: 'RECU', label: 'Reçus' },
            { id: 'EN_FILE', label: 'En File' },
            { id: 'TERMINE', label: 'Triturés' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExportExcel}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exporter la liste au format Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={onNewReception}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newOliveReception}</span>
          </button>
        </div>
      </div>

      {/* 4. Table des Bons de Réception Olives */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Ticket & Date</th>
                <th className="p-3.5">Producteur / Client</th>
                <th className="p-3.5 text-right">Poids Net</th>
                <th className="p-3.5 text-right">Tarif & Total</th>
                <th className="p-3.5 text-right">Règlement & Reste</th>
                <th className="p-3.5 text-center">Statut Paiement</th>
                <th className="p-3.5 text-center">Statut Presse</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length > 0 ? (
                filtered.map((rec) => {
                  const rem = Math.max(0, rec.remaining_amount_tnd);
                  const isFullyPaid = rec.payment_status === 'PAYE';

                  return (
                    <tr key={rec.id} className="hover:bg-stone-50 transition-colors">
                      {/* Ticket & Date */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-stone-900 block">
                          {rec.ticket_number}
                        </span>
                        <span className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          {rec.date ? new Date(rec.date).toLocaleDateString('fr-TN') : '—'}
                        </span>
                      </td>

                      {/* Producteur / Client */}
                      <td className="p-3.5">
                        <span className="font-bold text-stone-900 block">
                          {rec.party_name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                          {rec.phone && <span>Tél: {rec.phone}</span>}
                          {rec.vehicle_plate && <span>Matr: {rec.vehicle_plate}</span>}
                        </div>
                      </td>

                      {/* Poids Net */}
                      <td className="p-3.5 text-right">
                        <span className="font-mono font-black text-amber-950 text-sm block">
                          {rec.net_weight_kg.toLocaleString()} KG
                        </span>
                        <span className="text-[10px] text-stone-400">
                          Brut {rec.gross_weight_kg} · Tare {rec.tare_weight_kg}
                        </span>
                      </td>

                      {/* Tarif & Total à Payer */}
                      <td className="p-3.5 text-right">
                        <span className="font-mono font-bold text-stone-900 block">
                          {(rec.total_milling_fee_tnd || 0).toFixed(3)} TND
                        </span>
                        <span className="text-[11px] font-mono text-stone-500">
                          {(rec.milling_fee_per_kg || 0).toFixed(3)} TND/kg
                        </span>
                      </td>

                      {/* Règlement & Reste */}
                      <td className="p-3.5 text-right">
                        <span className="font-mono text-emerald-700 font-bold block">
                          Payé : {(rec.paid_amount_tnd || 0).toFixed(3)} TND
                        </span>
                        <span className={`font-mono text-[11px] font-bold block ${rem > 0 ? 'text-amber-800' : 'text-stone-400'}`}>
                          Reste : {rem.toFixed(3)} TND
                        </span>
                      </td>

                      {/* Statut Paiement */}
                      <td className="p-3.5 text-center">
                        {rec.payment_status === 'PAYE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Payé
                          </span>
                        )}
                        {rec.payment_status === 'PARTIEL' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Partiel
                          </span>
                        )}
                        {rec.payment_status === 'IMPAYE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Impayé
                          </span>
                        )}
                      </td>

                      {/* Statut Presse */}
                      <td className="p-3.5 text-center">
                        {rec.status === 'TERMINE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                            Trituré
                          </span>
                        )}
                        {rec.status === 'EN_FILE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            En File
                          </span>
                        )}
                        {rec.status === 'RECU' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                            Reçu
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Payer button if unpaid or partial */}
                          {!isFullyPaid && (
                            <button
                              onClick={() => setPayingReception(rec)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-[11px] flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                              title="Enregistrer un versement"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Payer</span>
                            </button>
                          )}

                          {/* Print A4 button */}
                          <button
                            onClick={() => onPrintA4(rec)}
                            className="px-2 py-1 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            title="Imprimer au Format A4 Officiel"
                          >
                            <Printer className="w-3.5 h-3.5 text-stone-600" />
                            <span>A4</span>
                          </button>

                          {/* Print RP80 Thermal Ticket button */}
                          <button
                            onClick={() => onPrintRP80(rec)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            title="Imprimer Ticket Thermique 80 mm (RP80)"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-700" />
                            <span>Ticket 80 mm</span>
                          </button>

                          {/* Send to Queue */}
                          {rec.status === 'RECU' && (
                            <button
                              onClick={() => onSendToQueue(rec.id)}
                              className="p-1 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md"
                              title="Envoyer en file de trituration"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone-400 italic">
                    Aucun bon de réception d'olives trouvé pour cette sélection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Daily Breakdown Table (Chiffre d'Affaires Encaissé par Jour) */}
      {dailyBreakdown.length > 1 && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Récapitulatif des encaissements journaliers</span>
            </h3>
            <span className="text-[11px] text-stone-500 font-mono">
              {dailyBreakdown.length} journée(s) active(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Bons</th>
                  <th className="p-3 text-right">Poids Net (KG)</th>
                  <th className="p-3 text-right">Facturé (TND)</th>
                  <th className="p-3 text-right text-emerald-800">Encaissé Réel (TND)</th>
                  <th className="p-3 text-right text-amber-800">Reste (TND)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {dailyBreakdown.map((row) => (
                  <tr key={row.date} className="hover:bg-stone-50">
                    <td className="p-3 font-mono font-bold text-stone-900">{row.date}</td>
                    <td className="p-3 text-center font-mono">{row.count}</td>
                    <td className="p-3 text-right font-mono font-bold">{row.netKg.toLocaleString()} KG</td>
                    <td className="p-3 text-right font-mono">{row.facture.toFixed(3)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      {row.encaisse.toFixed(3)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-800">
                      {row.restant.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Payment Modal if a voucher is selected */}
      {payingReception && (
        <ReceptionPaymentModal
          reception={payingReception}
          currentOperator={currentOperator}
          lang={lang}
          onClose={() => setPayingReception(null)}
          onConfirmPayment={(payment) => {
            onConfirmPayment(payment);
            setPayingReception(null);
          }}
        />
      )}
    </div>
  );
};
