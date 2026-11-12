import React, { useState } from 'react';
import { X, CheckCircle, DollarSign, AlertCircle, ShieldCheck, CreditCard, Banknote, FileText } from 'lucide-react';
import { OliveReception, ReceptionPayment } from '../../types/production';
import { Language } from '../../lib/i18n';

interface ReceptionPaymentModalProps {
  reception: OliveReception;
  currentOperator: string;
  lang: Language;
  onClose: () => void;
  onConfirmPayment: (payment: ReceptionPayment) => void;
}

export const ReceptionPaymentModal: React.FC<ReceptionPaymentModalProps> = ({
  reception,
  currentOperator,
  lang,
  onClose,
  onConfirmPayment
}) => {
  const remaining = Math.max(0, reception.remaining_amount_tnd);
  
  // Format today's local date as YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const [paymentAmount, setPaymentAmount] = useState<number | ''>(remaining > 0 ? remaining : '');
  const [paymentMode, setPaymentMode] = useState<'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'NATURE'>('ESPECES');
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const numAmount = typeof paymentAmount === 'number' ? paymentAmount : 0;

  const handleValidateClick = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numAmount <= 0) {
      setErrorMessage('Le montant du règlement doit être strictement supérieur à zéro.');
      return;
    }

    if (numAmount > remaining + 0.0001) {
      setErrorMessage(`Le montant saisi (${numAmount.toFixed(3)} TND) dépasse le reste à payer (${remaining.toFixed(3)} TND).`);
      return;
    }

    setShowConfirm(true);
  };

  const handleFinalSubmit = () => {
    if (isSubmitting) return; // Anti double-clic
    setIsSubmitting(true);

    try {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const paymentId = `pay-${Date.now()}-${rand}`;

      const payment: ReceptionPayment = {
        id: paymentId,
        reception_id: reception.id,
        ticket_number: reception.ticket_number,
        party_name: reception.party_name,
        amount_tnd: Math.round(numAmount * 1000) / 1000,
        payment_mode: paymentMode,
        reference: reference.trim() || undefined,
        payment_date: paymentDate || todayStr,
        operator: currentOperator || 'Gérant Huilerie',
        notes: notes.trim() || undefined,
        created_at: new Date().toISOString()
      };

      onConfirmPayment(payment);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors de l’enregistrement du paiement.');
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base leading-tight">
                {lang === 'ar' ? 'تسجيل خلاص وصل الاستلام' : 'Règlement Bon de Réception'}
              </h2>
              <span className="text-[11px] text-amber-300 font-mono font-bold">
                {reception.ticket_number} · {reception.party_name}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!showConfirm ? (
          <form onSubmit={handleValidateClick} className="p-6 space-y-5">
            
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-center">
              <div>
                <span className="text-[10px] text-stone-500 font-bold uppercase block">
                  Total à Payer
                </span>
                <span className="font-mono text-xs sm:text-sm font-black text-stone-900">
                  {reception.total_milling_fee_tnd.toFixed(3)}
                </span>
                <span className="text-[9px] text-stone-400 block">TND</span>
              </div>

              <div>
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">
                  Déjà Encaissé
                </span>
                <span className="font-mono text-xs sm:text-sm font-black text-emerald-700">
                  {reception.paid_amount_tnd.toFixed(3)}
                </span>
                <span className="text-[9px] text-stone-400 block">TND</span>
              </div>

              <div className="bg-amber-100/70 p-1.5 rounded-lg border border-amber-300/80">
                <span className="text-[10px] text-amber-900 font-extrabold uppercase block">
                  Reste à Payer
                </span>
                <span className="font-mono text-xs sm:text-sm font-black text-amber-950">
                  {remaining.toFixed(3)}
                </span>
                <span className="text-[9px] text-amber-800 font-bold block">TND</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Input Payment Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Montant du Règlement (TND) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPaymentAmount(remaining)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                >
                  Régler la totalité ({remaining.toFixed(3)} TND)
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={remaining}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.000"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl text-base font-mono font-black text-stone-900 outline-none transition"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-stone-400">
                  TND
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-2">
                Mode de Règlement *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'ESPECES', label: 'Espèces (نقدا)', icon: Banknote },
                  { id: 'CHEQUE', label: 'Chèque (شيك)', icon: CreditCard },
                  { id: 'VIREMENT', label: 'Virement (تحويل)', icon: FileText },
                  { id: 'NATURE', label: 'En Nature / Fayda', icon: DollarSign }
                ].map(m => {
                  const Icon = m.icon;
                  const isSel = paymentMode === m.id;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPaymentMode(m.id as any)}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        isSel
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSel ? 'text-emerald-600' : 'text-stone-400'}`} />
                      <span className="text-[11px] leading-tight">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date and Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Date de Paiement *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Réf. Chèque / Virement
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="N° Chèque, banque..."
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Previous Payments History on this voucher */}
            {reception.payments && reception.payments.length > 0 && (
              <div className="pt-2 border-t border-stone-200">
                <span className="text-[11px] font-bold text-stone-600 block mb-1.5 uppercase">
                  Historique des versements précédents ({reception.payments.length})
                </span>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {reception.payments.map((p, idx) => (
                    <div key={p.id || idx} className="p-2 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-mono font-bold text-stone-800">
                          {p.amount_tnd.toFixed(3)} TND
                        </span>
                        <span className="text-stone-400 ml-2">({p.payment_mode})</span>
                      </div>
                      <span className="text-stone-500 font-mono text-[10px]">
                        {p.payment_date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Valider le Règlement</span>
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Screen */
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Confirmer l’enregistrement du paiement ?
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Ce règlement sera immédiatement consigné dans la caisse de l’huilerie et imputé au bon <span className="font-mono font-bold text-stone-800">{reception.ticket_number}</span>.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 max-w-sm mx-auto text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Montant versé :</span>
                <span className="font-mono font-black text-emerald-800">{numAmount.toFixed(3)} TND</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Mode :</span>
                <span className="font-semibold text-stone-800">{paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Date :</span>
                <span className="font-mono text-stone-800">{paymentDate}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-200">
                <span className="text-stone-600 font-bold">Nouveau reste à payer :</span>
                <span className="font-mono font-black text-amber-900">
                  {Math.max(0, remaining - numAmount).toFixed(3)} TND
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Modifier
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmer Définitivement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
