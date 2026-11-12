import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  Plus,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Tag,
  Banknote,
  Receipt,
  CreditCard,
  Clock
} from 'lucide-react';
import { ProductionBatch, GrignonSale, PurchaseBatch, ExpenseItem, OliveReception, ReceptionPayment } from '../../types/production';
import { Language } from '../../lib/i18n';

interface FinancesManagerProps {
  receptions?: OliveReception[];
  receptionPayments?: ReceptionPayment[];
  productionBatches: ProductionBatch[];
  grignonSales: GrignonSale[];
  purchases: PurchaseBatch[];
  expenses: ExpenseItem[];
  lang: Language;
  onAddExpense: (expense: ExpenseItem) => void;
  onExportExcel: () => void;
}

export const FinancesManager: React.FC<FinancesManagerProps> = ({
  receptions = [],
  receptionPayments = [],
  productionBatches,
  grignonSales,
  purchases,
  expenses,
  lang,
  onAddExpense,
  onExportExcel
}) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseItem['category']>('ENERGIE_ELECTRICITE');
  const [expLabel, setExpLabel] = useState('');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expBeneficiary, setExpBeneficiary] = useState('');
  const [expPaymentMode, setExpPaymentMode] = useState<ExpenseItem['payment_mode']>('ESPECES');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RECEPTIONS_CASH' | 'EXPENSES'>('OVERVIEW');

  // =========================================================================
  // CALCULS FINANCIERS STRICTS : Facturé vs Réellement Encaissé
  // =========================================================================

  // 1. Réceptions Olives
  const receptionsFactureTotal = receptions.reduce((sum, r) => sum + (r.total_milling_fee_tnd || 0), 0);
  const receptionsEncaisseReel = receptionPayments.reduce((sum, p) => sum + (p.amount_tnd || 0), 0);
  const receptionsEncaisseCash = receptionPayments
    .filter(p => p.payment_mode === 'ESPECES')
    .reduce((sum, p) => sum + (p.amount_tnd || 0), 0);
  const receptionsRestantAEncaisser = receptions.reduce((sum, r) => sum + (r.remaining_amount_tnd || 0), 0);

  const receptionsPayesCount = receptions.filter(r => r.payment_status === 'PAYE').length;
  const receptionsPartielsCount = receptions.filter(r => r.payment_status === 'PARTIEL').length;
  const receptionsImpayesCount = receptions.filter(r => r.payment_status === 'IMPAYE').length;

  // 2. Mouture directe batches (historique)
  const legacyMillingCash = productionBatches
    .filter(b => b.milling_fee_paid && b.milling_fee_mode === 'ESPECES')
    .reduce((acc, b) => acc + b.milling_fee_total_tnd, 0);

  // 3. Grignons
  const grignonRevenue = grignonSales
    .filter(s => s.payment_status === 'PAYE')
    .reduce((acc, s) => acc + s.total_price_tnd, 0);

  const grignonUnpaid = grignonSales
    .filter(s => s.payment_status === 'IMPAYE')
    .reduce((acc, s) => acc + s.total_price_tnd, 0);

  // 4. Décaissements réels (Sorties de caisse)
  const purchasesOutflow = purchases
    .filter(p => p.payment_status === 'PAYE')
    .reduce((acc, p) => acc + p.total_price_tnd, 0);

  const expensesOutflow = expenses.reduce((acc, e) => acc + e.amount_tnd, 0);

  // 5. Totaux de trésorerie RÉELLE (uniquement l'argent réellement encaissé en caisse !)
  const totalInflowsCash = receptionsEncaisseCash + legacyMillingCash + grignonRevenue;
  const totalOutflows = purchasesOutflow + expensesOutflow;
  const netCashflow = totalInflowsCash - totalOutflows;

  // Créances globales en attente
  const totalCreancesGlobales = receptionsRestantAEncaisser + grignonUnpaid;

  // Daily Cash breakdown from receptionPayments
  const dailyCashBreakdown = React.useMemo(() => {
    const map = new Map<string, { total: number; count: number; especes: number; cheques: number }>();
    receptionPayments.forEach(p => {
      const d = p.payment_date || p.created_at.slice(0, 10);
      const curr = map.get(d) || { total: 0, count: 0, especes: 0, cheques: 0 };
      curr.total += p.amount_tnd;
      curr.count += 1;
      if (p.payment_mode === 'ESPECES') curr.especes += p.amount_tnd;
      else curr.cheques += p.amount_tnd;
      map.set(d, curr);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, data]) => ({ date, ...data }));
  }, [receptionPayments]);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expLabel.trim()) {
      alert('Veuillez saisir le libellé de la dépense.');
      return;
    }
    if (typeof expAmount !== 'number' || expAmount <= 0) {
      alert('Veuillez saisir un montant valide (> 0).');
      return;
    }

    const newExp: ExpenseItem = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString(),
      category: expCategory,
      label: expLabel.trim(),
      amount_tnd: expAmount,
      beneficiary: expBeneficiary.trim() || undefined,
      payment_mode: expPaymentMode,
      operator: 'Gérant Huilerie',
      created_at: new Date().toISOString()
    };

    onAddExpense(newExp);
    setIsExpenseModalOpen(false);
    setExpLabel('');
    setExpAmount('');
    setExpBeneficiary('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Recettes Réelles Encaissées (Cash Réel) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {lang === 'ar' ? 'المقابيض الفعلية بالصندوق' : 'Recettes Réelles Encaissées'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {totalInflowsCash.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}{' '}
            <span className="text-xs font-normal text-stone-500">TND</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>Réceptions: {receptionsEncaisseCash.toFixed(3)}</span> &bull; 
            <span>Grignons: {grignonRevenue.toFixed(3)}</span>
          </div>
        </div>

        {/* Total Décaissements & Charges */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {lang === 'ar' ? 'المصاريف والمشتريات المدفوعة' : 'Décaissements (Achats & Charges)'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {totalOutflows.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}{' '}
            <span className="text-xs font-normal text-stone-500">TND</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-2">
            <span>Achats: {purchasesOutflow.toFixed(3)}</span> &bull; 
            <span>Charges: {expensesOutflow.toFixed(3)}</span>
          </div>
        </div>

        {/* Solde Net de Caisse (Trésorerie Disponible) */}
        <div className={`p-5 rounded-2xl border shadow-2xs relative overflow-hidden ${
          netCashflow >= 0
            ? 'bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950 text-white border-stone-800'
            : 'bg-gradient-to-br from-stone-900 via-stone-900 to-rose-950 text-white border-rose-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
              {lang === 'ar' ? 'السيولة الصافية بالصندوق' : 'Solde Net de Caisse'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">
            {netCashflow.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}{' '}
            <span className="text-xs font-normal text-stone-300">TND</span>
          </div>
          <div className="text-[11px] text-stone-300 mt-1">
            {netCashflow >= 0 ? '✓ Trésorerie positive en caisse' : '⚠ Trésorerie négative'}
          </div>
        </div>

        {/* Créances à Recouvrer (Restant sur Réceptions & Grignons) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {lang === 'ar' ? 'مستحقات معلقة بالذمة' : 'Créances Clients à Recouvrer'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {totalCreancesGlobales.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}{' '}
            <span className="text-xs font-normal text-stone-500">TND</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Réceptions impayées: {receptionsRestantAEncaisser.toFixed(3)} TND
          </div>
        </div>
      </div>

      {/* 2. Synthèse Détaillée Spécifique aux Bons de Réception Olives */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Synthèse Financière des Réceptions d'Olives</span>
            </h3>
            <p className="text-xs text-stone-500">
              Rapprochement entre facturation de trituration et encaissements effectifs
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg">
              {receptionsPayesCount} Soldés
            </span>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg">
              {receptionsPartielsCount} Partiels
            </span>
            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg">
              {receptionsImpayesCount} Impayés
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 font-bold uppercase block">
              1. Total Facturé (Théorique)
            </span>
            <span className="font-mono text-2xl font-black text-stone-900 block mt-1">
              {receptionsFactureTotal.toFixed(3)} <span className="text-xs font-normal text-stone-500">TND</span>
            </span>
            <span className="text-[11px] text-stone-400 mt-0.5 block">
              Calculé : Poids Net × Tarif / kg
            </span>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-xs text-emerald-800 font-bold uppercase block">
              2. Total Réellement Encaissé
            </span>
            <span className="font-mono text-2xl font-black text-emerald-900 block mt-1">
              {receptionsEncaisseReel.toFixed(3)} <span className="text-xs font-normal text-emerald-700">TND</span>
            </span>
            <span className="text-[11px] text-emerald-700 mt-0.5 block">
              Dont {receptionsEncaisseCash.toFixed(3)} TND en espèces
            </span>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-xs text-amber-900 font-bold uppercase block">
              3. Reste à Encaisser (Créances)
            </span>
            <span className="font-mono text-2xl font-black text-amber-950 block mt-1">
              {receptionsRestantAEncaisser.toFixed(3)} <span className="text-xs font-normal text-amber-800">TND</span>
            </span>
            <span className="text-[11px] text-amber-800 mt-0.5 block">
              Montant en attente de règlement
            </span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs within Finance: Vue d'Ensemble vs Encaissements Réception vs Charges */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Journal des Encaissements Réception ({receptionPayments.length})
        </button>

        <button
          onClick={() => setActiveTab('RECEPTIONS_CASH')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'RECEPTIONS_CASH'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Récapitulatif Journalier des Encaissements
        </button>

        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'EXPENSES'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Charges & Dépenses d'Exploitation ({expenses.length})
        </button>
      </div>

      {/* TAB 1: Journal des Versements Réceptions */}
      {activeTab === 'OVERVIEW' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-stone-800">
              Historique des Versements Reçus (Bons de Réception)
            </h3>
            <span className="font-mono text-xs text-stone-500">
              Total perçu : {receptionsEncaisseReel.toFixed(3)} TND
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">N° Bon</th>
                  <th className="p-3">Client / Producteur</th>
                  <th className="p-3">Mode de Règlement</th>
                  <th className="p-3">Référence</th>
                  <th className="p-3">Opérateur</th>
                  <th className="p-3 text-right">Montant Encaissé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {receptionPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400 italic">
                      Aucun versement enregistré pour l'instant. Les règlements validés dans Réception d'olives apparaîtront ici.
                    </td>
                  </tr>
                ) : (
                  receptionPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3 font-mono text-stone-600">
                        {p.payment_date || p.created_at.slice(0, 10)}
                      </td>
                      <td className="p-3 font-mono font-bold text-stone-900">
                        {p.ticket_number}
                      </td>
                      <td className="p-3 font-bold text-stone-800">
                        {p.party_name}
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] bg-stone-100 px-2 py-0.5 rounded font-bold">
                          {p.payment_mode}
                        </span>
                      </td>
                      <td className="p-3 text-stone-500 font-mono text-[11px]">
                        {p.reference || '—'}
                      </td>
                      <td className="p-3 text-stone-600">
                        {p.operator || 'Gérant'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                        +{p.amount_tnd.toFixed(3)} TND
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Récapitulatif Journalier des Encaissements */}
      {activeTab === 'RECEPTIONS_CASH' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-stone-800">
              Encaissements Groupés par Journée
            </h3>
            <span className="font-mono text-xs text-stone-500">
              {dailyCashBreakdown.length} journée(s) avec versements
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Nombre Versements</th>
                  <th className="p-3 text-right">Espèces (TND)</th>
                  <th className="p-3 text-right">Chèques / Autres (TND)</th>
                  <th className="p-3 text-right text-emerald-800 font-bold">Total Encaissé (TND)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {dailyCashBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400 italic">
                      Aucun encaissement journalier à afficher.
                    </td>
                  </tr>
                ) : (
                  dailyCashBreakdown.map((row) => (
                    <tr key={row.date} className="hover:bg-stone-50">
                      <td className="p-3 font-mono font-bold text-stone-900">{row.date}</td>
                      <td className="p-3 text-center font-mono">{row.count}</td>
                      <td className="p-3 text-right font-mono text-stone-800">{row.especes.toFixed(3)}</td>
                      <td className="p-3 text-right font-mono text-stone-600">{row.cheques.toFixed(3)}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                        +{row.total.toFixed(3)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Charges & Dépenses d'Exploitation */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-stone-900">
                {lang === 'ar' ? 'سجل مصاريف التشغيل والصيانة' : 'Journal des Charges d’Exploitation de l’Huilerie'}
              </h3>
              <p className="text-xs text-stone-500">
                {lang === 'ar' ? 'تسجيل فواتير الكهرباء، اليد العاملة والقطع' : 'Suivi des dépenses courantes (électricité STEG, main d’œuvre, pièces)'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onExportExcel}
                className="px-3 py-2 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-bold text-stone-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Exporter Synthèse</span>
              </button>

              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer une Charge</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-800 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3">Libellé de la Dépense</th>
                    <th className="px-4 py-3">Bénéficiaire</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3 text-right">Montant (TND)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                        Aucune dépense d'exploitation enregistrée pour l'instant.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="px-4 py-3 text-stone-500 whitespace-nowrap font-mono">
                          {new Date(e.date).toLocaleDateString('fr-TN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-bold text-[10px]">
                            <Tag className="w-3 h-3 text-stone-500" />
                            {e.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-stone-900">
                          {e.label}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {e.beneficiary || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded font-bold">
                            {e.payment_mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-rose-600 text-sm">
                          -{e.amount_tnd.toFixed(3)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Expense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-stone-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm">
                {lang === 'ar' ? 'إضافة نفقة تشغيل جديدة' : 'Nouvelle Dépense d’Exploitation'}
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Catégorie *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ENERGIE_ELECTRICITE">Énergie & Électricité (STEG)</option>
                  <option value="MAIN_DOEUVRE">Main d’œuvre saisonnière</option>
                  <option value="MAINTENANCE_PIECES">Maintenance & Pièces machines</option>
                  <option value="EAU_ASSAINISSEMENT">Eau & Lavage des olives</option>
                  <option value="TRANSPORT">Carburant & Transport</option>
                  <option value="DIVERS">Frais généraux divers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Libellé de la Dépense *</label>
                <input
                  type="text"
                  required
                  value={expLabel}
                  onChange={(e) => setExpLabel(e.target.value)}
                  placeholder="Ex: Facture STEG Tranche Décembre"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Montant (TND) *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="Ex: 850.000"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Mode de Paiement</label>
                  <select
                    value={expPaymentMode}
                    onChange={(e) => setExpPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ESPECES">Espèces</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="VIREMENT">Virement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Bénéficiaire / Fournisseur</label>
                <input
                  type="text"
                  value={expBeneficiary}
                  onChange={(e) => setExpBeneficiary(e.target.value)}
                  placeholder="Ex: STEG Agence Kairouan"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Enregistrer la Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
