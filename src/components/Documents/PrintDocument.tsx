import React, { useState } from 'react';
import { Printer, X, Download, FileText, Receipt, CheckCircle, Info } from 'lucide-react';
import { AppSettings, Operation, Tank, Party } from '../../types/stock';
import { OliveReception, ProductionBatch, GrignonSale } from '../../types/production';

export type PrintableDocType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'STOCK_TRANSFER'
  | 'OLIVE_RECEPTION'
  | 'PRODUCTION_TICKET'
  | 'GRIGNON_SALE'
  | 'PURCHASE_RECEIPT'
  | 'CLIENT_STATEMENT';

export type PrintFormat = 'A4' | 'RP80';

interface PrintDocumentProps {
  docType: PrintableDocType;
  settings: AppSettings;
  data: any;
  initialFormat?: PrintFormat;
  onClose: () => void;
}

export const PrintDocument: React.FC<PrintDocumentProps> = ({
  docType,
  settings,
  data,
  initialFormat = 'A4',
  onClose
}) => {
  const [format, setFormat] = useState<PrintFormat>(initialFormat);
  const [showPrinterTips, setShowPrinterTips] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  const isOliveRec = docType === 'OLIVE_RECEPTION';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Dynamic Print CSS injected for specific format */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: ${format === 'RP80' ? '2mm' : '15mm'};
            width: ${format === 'RP80' ? '74mm' : '100%'};
            background: white !important;
            color: black !important;
          }
          @page {
            size: ${format === 'RP80' ? '80mm auto' : 'A4 portrait'};
            margin: ${format === 'RP80' ? '2mm' : '10mm'};
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className={`bg-white text-stone-900 rounded-2xl shadow-2xl w-full my-4 overflow-hidden flex flex-col max-h-[94vh] border border-stone-200 ${
        format === 'RP80' ? 'max-w-md' : 'max-w-3xl'
      }`}>
        
        {/* Modal Toolbar (hidden during print) */}
        <div className="no-print bg-stone-900 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-extrabold text-xs sm:text-sm block">
                {format === 'A4' ? 'Aperçu Impression — Format A4 Officiel' : 'Aperçu Impression — Ticket Thermique RP80 (80mm)'}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                {data.ticket_number || data.doc_number || 'BON-OFFICIEL'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Format Switcher (especially for Olive Reception & Tickets) */}
            <div className="bg-stone-800 p-0.5 rounded-lg border border-stone-700 flex items-center">
              <button
                type="button"
                onClick={() => setFormat('A4')}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  format === 'A4'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
                title="Format Standard A4 avec en-tête et signatures"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('RP80')}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  format === 'RP80'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
                title="Format Ticket Thermique pour imprimante RP80 80mm"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ticket 80 mm</span>
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            {/* Help / Tips for RP80 */}
            <button
              type="button"
              onClick={() => setShowPrinterTips(!showPrinterTips)}
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-amber-300 transition cursor-pointer"
              title="Conseils de configuration imprimante RP80"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* RP80 Instructions Banner if requested */}
        {showPrinterTips && (
          <div className="no-print bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-start justify-between gap-3">
            <div>
              <span className="font-bold block mb-0.5">Configuration recommandée pour l'imprimante RP80 :</span>
              <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                <li>Dans la boîte d'impression du navigateur : sélectionnez la taille de papier <strong>80 mm</strong> (ou rouleau de caisse).</li>
                <li>Réglez les marges sur <strong>« Aucune » (ou « Minimum »)</strong>.</li>
                <li>Cochez la case <strong>« Graphiques d'arrière-plan »</strong> pour afficher les séparateurs nets.</li>
              </ul>
            </div>
            <button
              onClick={() => setShowPrinterTips(false)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Printable Area */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-stone-50 flex justify-center">
          <div
            id="printable-area"
            className={`bg-white shadow-xs rounded-lg p-6 sm:p-8 text-stone-900 ${
              format === 'RP80'
                ? 'w-full max-w-[320px] font-mono text-[11px] leading-tight border border-stone-300'
                : 'w-full max-w-2xl text-xs'
            }`}
          >
            {/* Render Olive Reception (A4 vs RP80) */}
            {isOliveRec ? (
              format === 'RP80' ? (
                renderOliveReceptionRP80(data, settings)
              ) : (
                renderOliveReceptionA4(data, settings)
              )
            ) : (
              /* Other ERP document types in A4 format */
              <>
                {/* Standard Header */}
                <div className="border-b-2 border-stone-800 pb-4 mb-5 flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-stone-900">
                      {settings.company_name}
                    </h1>
                    <p className="text-sm font-arabic font-bold text-amber-700 mt-0.5" dir="rtl">
                      {settings.arabic_subtitle}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      {settings.address} · Tél: {settings.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-stone-100 border border-stone-300 font-mono text-xs font-bold rounded text-stone-800">
                      {data.doc_number || data.ticket_number || 'BON-OFFICIEL'}
                    </span>
                    <p className="text-[11px] text-stone-500 mt-1 font-mono">
                      Date: {new Date(data.date || data.operation_date || data.started_at || Date.now()).toLocaleDateString('fr-TN')}
                    </p>
                  </div>
                </div>

                {docType === 'STOCK_IN' && renderStockOperation(data, 'BON DE RÉCEPTION D’HUILE (ENTRÉE STOCK)', 'وصل إيداع زيت')}
                {docType === 'STOCK_OUT' && renderStockOperation(data, 'BON DE SORTIE D’HUILE (RETRAIT STOCK)', 'وصل تسليم زيت')}
                {docType === 'STOCK_TRANSFER' && renderStockTransfer(data)}
                {docType === 'PRODUCTION_TICKET' && renderProductionTicket(data)}
                {docType === 'GRIGNON_SALE' && renderGrignonSale(data)}
                {docType === 'PURCHASE_RECEIPT' && renderPurchaseReceipt(data)}
                {docType === 'CLIENT_STATEMENT' && renderClientStatement(data)}

                {/* Footer Signatures for A4 */}
                <div className="mt-8 pt-5 border-t border-stone-300">
                  <div className="grid grid-cols-2 gap-6 text-center text-xs">
                    <div className="border border-stone-300 rounded-lg p-3 h-24 flex flex-col justify-between">
                      <span className="font-semibold text-stone-700">Signature du Client / Fellaḥ</span>
                      <span className="text-[10px] text-stone-400 font-arabic">توقيع الحريف / الفلاح</span>
                    </div>
                    <div className="border border-stone-300 rounded-lg p-3 h-24 flex flex-col justify-between">
                      <span className="font-semibold text-stone-700">Cachet & Signature Huilerie Jemai</span>
                      <span className="text-[10px] text-stone-400 font-arabic">ختم وتوقيع المعصرة</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-[9px] text-stone-400 font-mono">
                    Document généré par Huilerie Jemai ERP · Traçabilité Oléicole Conforme
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 1. BON DE RÉCEPTION OLIVES — FORMAT A4
// ==========================================
function renderOliveReceptionA4(rec: OliveReception, settings: AppSettings) {
  const recDateStr = rec.date ? new Date(rec.date).toLocaleDateString('fr-TN') : new Date().toLocaleDateString('fr-TN');
  const rem = Math.max(0, rec.remaining_amount_tnd || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-stone-800 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900">
            {settings.company_name}
          </h1>
          <p className="text-base font-arabic font-bold text-amber-700 mt-0.5" dir="rtl">
            {settings.arabic_subtitle}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {settings.address} · Tél: {settings.phone}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-stone-100 border border-stone-300 font-mono text-sm font-black rounded text-stone-900">
            {rec.ticket_number}
          </span>
          <p className="text-xs text-stone-600 mt-1 font-mono font-bold">
            Date de Réception : {recDateStr}
          </p>
          <span className={`inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold rounded uppercase ${
            rec.payment_status === 'PAYE'
              ? 'bg-emerald-100 text-emerald-800'
              : rec.payment_status === 'PARTIEL'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-rose-100 text-rose-800'
          }`}>
            Statut : {rec.payment_status === 'PAYE' ? 'Payé' : rec.payment_status === 'PARTIEL' ? 'Partiellement Payé' : 'Impayé'}
          </span>
        </div>
      </div>

      {/* Titre Document */}
      <div className="bg-stone-100 p-3 rounded-lg border border-stone-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-stone-900 tracking-tight">
            BON DE RÉCEPTION OLIVES & PESÉE
          </h2>
          <p className="text-xs font-arabic font-bold text-amber-800" dir="rtl">
            وصل استلام ووزن الزيتون
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-stone-600">
          Opérateur : {rec.operator || 'Personnel Huilerie'}
        </span>
      </div>

      {/* Informations Client */}
      <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
        <h3 className="font-bold text-xs uppercase text-stone-600 mb-2 tracking-wider">
          Informations du Client / Producteur
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block text-[11px]">Producteur / Fellaḥ :</span>
            <span className="font-bold text-stone-900 text-sm">{rec.party_name}</span>
          </div>
          {rec.phone && (
            <div>
              <span className="text-stone-500 block text-[11px]">Téléphone :</span>
              <span className="font-mono font-semibold text-stone-800">{rec.phone}</span>
            </div>
          )}
          {rec.vehicle_plate && (
            <div>
              <span className="text-stone-500 block text-[11px]">Matricule Véhicule :</span>
              <span className="font-mono font-semibold text-stone-800">{rec.vehicle_plate}</span>
            </div>
          )}
          {rec.driver_name && (
            <div>
              <span className="text-stone-500 block text-[11px]">Chauffeur :</span>
              <span className="font-semibold text-stone-800">{rec.driver_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Résultats de la Pesée */}
      <div className="bg-stone-50 rounded-lg border border-stone-200 p-4">
        <h3 className="font-bold text-xs uppercase text-stone-600 mb-3 tracking-wider">
          Résultats de la Pesée
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-white rounded-lg border border-stone-200">
            <span className="text-[11px] text-stone-500 block">Poids Brut</span>
            <span className="font-mono font-bold text-stone-800 text-base">{rec.gross_weight_kg} KG</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-stone-200">
            <span className="text-[11px] text-stone-500 block">Tare Déduite</span>
            <span className="font-mono font-bold text-stone-600 text-base">{rec.tare_weight_kg} KG</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border-2 border-amber-400">
            <span className="text-[11px] text-amber-900 block font-extrabold uppercase">Poids Net d'Olives</span>
            <span className="font-mono font-black text-amber-950 text-xl">{rec.net_weight_kg} KG</span>
          </div>
        </div>
      </div>

      {/* Décompte Financier Trituration */}
      <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
        <h3 className="font-bold text-xs uppercase text-stone-600 tracking-wider">
          Décompte des Frais de Trituration
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-white rounded border border-stone-200">
            <span className="text-[10px] text-stone-500 block">Prix de Trituration</span>
            <span className="font-mono font-bold text-stone-900 text-sm">
              {(rec.milling_fee_per_kg || 0).toFixed(3)} TND/kg
            </span>
          </div>
          <div className="p-3 bg-white rounded border border-stone-200">
            <span className="text-[10px] text-stone-500 block">Poids Net Facturé</span>
            <span className="font-mono font-bold text-stone-900 text-sm">
              {rec.net_weight_kg} KG
            </span>
          </div>
          <div className="p-3 bg-stone-900 text-white rounded border border-stone-800">
            <span className="text-[10px] text-amber-300 font-bold block uppercase">Total à Payer</span>
            <span className="font-mono font-black text-amber-400 text-base">
              {(rec.total_milling_fee_tnd || 0).toFixed(3)} TND
            </span>
          </div>
        </div>

        {/* Détail Règlements */}
        <div className="p-3 bg-white rounded border border-stone-200 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-stone-500">Montant Déjà Réglé : </span>
            <span className="font-black text-emerald-700">{(rec.paid_amount_tnd || 0).toFixed(3)} TND</span>
          </div>
          <div>
            <span className="text-stone-500">Reste à Régler : </span>
            <span className="font-black text-amber-900">{rem.toFixed(3)} TND</span>
          </div>
        </div>
      </div>

      {/* Signatures & Cachet */}
      <div className="pt-4 border-t border-stone-200">
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div className="border border-stone-300 rounded-lg p-4 h-28 flex flex-col justify-between">
            <span className="font-semibold text-stone-700">Signature du Client / Producteur</span>
            <span className="text-[10px] text-stone-400 font-arabic">توقيع الفلاح / الحريف</span>
          </div>
          <div className="border border-stone-300 rounded-lg p-4 h-28 flex flex-col justify-between">
            <span className="font-semibold text-stone-700">Cachet & Signature Huilerie Jemai</span>
            <span className="text-[10px] text-stone-400 font-arabic">ختم وتوقيع المعصرة</span>
          </div>
        </div>
        <div className="mt-4 text-center text-[10px] text-stone-400 font-mono">
          Document généré par Huilerie Jemai ERP · Traçabilité Oléicole Officielle
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. BON DE RÉCEPTION OLIVES — TICKET THERMIQUE RP80 (80mm)
// ==========================================
function renderOliveReceptionRP80(rec: OliveReception, settings: AppSettings) {
  const recDateStr = rec.date ? new Date(rec.date).toLocaleDateString('fr-TN') : new Date().toLocaleDateString('fr-TN');
  const rem = Math.max(0, rec.remaining_amount_tnd || 0);

  return (
    <div className="text-center font-mono text-[11px] leading-tight space-y-2 py-2">
      {/* En-tête ticket */}
      <div>
        <h1 className="text-base font-black tracking-tight uppercase text-black">
          {settings.company_name}
        </h1>
        <p className="font-arabic font-bold text-xs" dir="rtl">
          {settings.arabic_subtitle}
        </p>
        <p className="text-[10px] text-stone-600 mt-0.5">
          Tél: {settings.phone}
        </p>
        <p className="text-[9px] text-stone-500">
          {settings.address}
        </p>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Titre et N° Bon */}
      <div>
        <span className="font-black text-xs uppercase block tracking-wider">
          TICKET RÉCEPTION OLIVES
        </span>
        <span className="font-black text-sm block mt-0.5">
          {rec.ticket_number}
        </span>
        <span className="text-[10px] block mt-0.5">
          Date : {recDateStr}
        </span>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Client */}
      <div className="text-left space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span>Client :</span>
          <span className="font-black">{rec.party_name}</span>
        </div>
        {rec.phone && (
          <div className="flex justify-between">
            <span>Tél :</span>
            <span>{rec.phone}</span>
          </div>
        )}
        {rec.vehicle_plate && (
          <div className="flex justify-between">
            <span>Matr :</span>
            <span>{rec.vehicle_plate}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Pesée */}
      <div className="text-left space-y-1">
        <div className="flex justify-between text-[10px]">
          <span>Poids Brut :</span>
          <span>{rec.gross_weight_kg} kg</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Tare :</span>
          <span>{rec.tare_weight_kg} kg</span>
        </div>
        <div className="flex justify-between text-xs font-black pt-1 border-t border-dotted border-stone-400">
          <span>POIDS NET :</span>
          <span className="text-sm">{rec.net_weight_kg} KG</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Décompte Financier */}
      <div className="text-left space-y-1">
        <div className="flex justify-between text-[10px]">
          <span>Prix trituration :</span>
          <span>{(rec.milling_fee_per_kg || 0).toFixed(3)} TND/kg</span>
        </div>
        <div className="flex justify-between text-xs font-black pt-1 border-t border-dotted border-stone-400">
          <span>TOTAL À PAYER :</span>
          <span className="text-sm">{(rec.total_milling_fee_tnd || 0).toFixed(3)} TND</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Déjà réglé :</span>
          <span>{(rec.paid_amount_tnd || 0).toFixed(3)} TND</span>
        </div>
        <div className="flex justify-between text-xs font-black">
          <span>RESTE À PAYER :</span>
          <span>{rem.toFixed(3)} TND</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Statut :</span>
          <span className="font-black uppercase">
            {rec.payment_status === 'PAYE' ? 'PAYÉ' : rec.payment_status === 'PARTIEL' ? 'PARTIEL' : 'IMPAYÉ'}
          </span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Bas de ticket */}
      <div className="text-center text-[10px] space-y-1 pt-1">
        <p className="font-bold">Opérateur : {rec.operator || 'Huilerie'}</p>
        <p className="font-bold">Merci de votre confiance !</p>
        <p className="font-arabic font-bold text-xs" dir="rtl">
          مع الشكر لثقتكم بمعصرتنا
        </p>
        <p className="text-[8px] text-stone-500 pt-1">
          Huilerie Jemai ERP · Système Certifié
        </p>
      </div>
    </div>
  );
}

// ==========================================
// 3. OTHER DOCUMENT TYPES (STOCK, PRODUCTION, ETC.)
// ==========================================
function renderStockOperation(op: any, titleFr: string, titleAr: string) {
  return (
    <div className="space-y-6">
      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{titleFr}</h2>
          <p className="text-xs font-arabic font-bold text-amber-700" dir="rtl">{titleAr}</p>
        </div>
        <div className="text-right">
          <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded ${op.status === 'VALIDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {op.status === 'VALIDE' ? 'Validé' : 'Annulé'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Producteur / Client:</span>
          <span className="font-bold text-sm text-stone-900">{op.party_name || op.party_id}</span>
        </div>
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Opérateur responsable:</span>
          <span className="font-medium text-stone-800">{op.operator || 'Mohamed Jemai'}</span>
        </div>
      </div>

      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-100 border-b border-stone-200 text-stone-700">
            <tr>
              <th className="p-3">Cuve Affectée</th>
              <th className="p-3">Mouvement</th>
              <th className="p-3 text-right">Quantité (Litres)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {op.movements && op.movements.length > 0 ? (
              op.movements.map((m: any, idx: number) => (
                <tr key={idx}>
                  <td className="p-3 font-medium">{m.tank_code || m.tank_id}</td>
                  <td className="p-3 text-stone-600">{m.direction === 'IN' ? 'Entrée (+)' : 'Sortie (-)'}</td>
                  <td className="p-3 text-right font-mono font-bold">{m.quantity} L</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3 font-medium">Cuve assignée</td>
                <td className="p-3 text-stone-600">{op.type === 'ENTREE' ? 'Entrée (+)' : 'Sortie (-)'}</td>
                <td className="p-3 text-right font-mono font-bold">{op.total_quantity} L</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-stone-50 font-bold border-t border-stone-200">
            <tr>
              <td colSpan={2} className="p-3 text-stone-800">Total Général :</td>
              <td className="p-3 text-right font-mono text-sm text-amber-900">{op.total_quantity} L</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {op.notes && (
        <div className="p-3 bg-stone-50 rounded border border-stone-200 text-xs">
          <span className="font-semibold text-stone-700 block mb-1">Observations :</span>
          <p className="text-stone-600">{op.notes}</p>
        </div>
      )}
    </div>
  );
}

function renderStockTransfer(op: any) {
  return (
    <div className="space-y-6">
      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">BON DE TRANSFERT INTER-CUVES</h2>
          <p className="text-xs font-arabic font-bold text-amber-700" dir="rtl">وصل تحويل داخلي بين الخزانات</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Cuve Source (Origine):</span>
          <span className="font-bold text-sm text-stone-900">{op.source_tank_code || 'Cuve Source'}</span>
        </div>
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Cuve Destination (Réceptrice):</span>
          <span className="font-bold text-sm text-stone-900">{op.target_tank_code || 'Cuve Destination'}</span>
        </div>
      </div>
      <div className="p-4 bg-amber-50 rounded border border-amber-200 text-center">
        <span className="text-xs text-amber-800 uppercase block font-semibold">Volume Transféré</span>
        <span className="font-mono text-2xl font-black text-amber-900">{op.total_quantity} Litres</span>
      </div>
    </div>
  );
}

function renderProductionTicket(batch: ProductionBatch) {
  return (
    <div className="space-y-6">
      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">BON DE TRITURATION & RENDEMENT D'HUILE</h2>
          <p className="text-xs font-arabic font-bold text-amber-700" dir="rtl">وصل عصر الزيتون واحتساب المردود</p>
        </div>
        <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
          {batch.is_confirmed ? 'CONFIRMÉ & VERROUILLÉ' : 'EN COURS'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Producteur:</span>
          <span className="font-bold text-stone-900">{batch.party_name}</span>
        </div>
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Ligne de Trituration:</span>
          <span className="font-semibold text-stone-900">{batch.press_line}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-white rounded border border-stone-200">
          <span className="text-[10px] text-stone-500 block">Olives Net</span>
          <span className="font-mono font-bold text-stone-900 text-sm">{batch.olives_net_kg} KG</span>
        </div>
        <div className="p-3 bg-amber-50 rounded border border-amber-300">
          <span className="text-[10px] text-amber-800 font-bold block">Huile en Litres</span>
          <span className="font-mono font-black text-amber-900 text-base">{batch.oil_quantity_litres} L</span>
        </div>
        <div className="p-3 bg-emerald-50 rounded border border-emerald-300">
          <span className="text-[10px] text-emerald-800 font-bold block">Rendement %</span>
          <span className="font-mono font-black text-emerald-900 text-base">{batch.yield_percentage.toFixed(2)} %</span>
        </div>
        <div className="p-3 bg-white rounded border border-stone-200">
          <span className="text-[10px] text-stone-500 block">L / 100 KG</span>
          <span className="font-mono font-bold text-stone-900 text-sm">{batch.yield_litres_per_100kg.toFixed(2)} L</span>
        </div>
      </div>

      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-stone-600">Huile produite en Kilogrammes :</span>
          <span className="font-mono font-bold text-stone-900">{batch.oil_quantity_kg} KG (Densité: {batch.oil_density})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">Grignons (Faytous) estimés :</span>
          <span className="font-mono font-bold text-stone-800">{batch.grignons_estimated_kg} KG</span>
        </div>
        <div className="flex justify-between border-t border-stone-200 pt-2 font-bold">
          <span className="text-stone-800">Frais de trituration ({batch.milling_fee_rate} TND/kg) :</span>
          <span className="font-mono text-amber-900 text-sm">{batch.milling_fee_total_tnd.toFixed(3)} TND ({batch.milling_fee_mode})</span>
        </div>
        <div className="flex justify-between text-stone-600">
          <span>Destination de l'huile :</span>
          <span className="font-semibold text-stone-800">
            {batch.oil_destination === 'SORTIE_CLIENT' ? 'Enlèvement immédiat par le producteur' : batch.oil_destination === 'STOCKAGE_CUVE' ? `Déposée en Cuve (${batch.destination_tank_id || 'assignée'})` : 'En attente de décision'}
          </span>
        </div>
      </div>
    </div>
  );
}

function renderGrignonSale(sale: GrignonSale) {
  return (
    <div className="space-y-6">
      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">BON DE VENTE DES GRIGNONS (فيتورة)</h2>
          <p className="text-xs font-arabic font-bold text-amber-700" dir="rtl">وصل بيع ونقل الفيتورة السائبة</p>
        </div>
        <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded ${sale.payment_status === 'PAYE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {sale.payment_status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Acheteur / Usine:</span>
          <span className="font-bold text-stone-900 text-sm">{sale.buyer_name}</span>
        </div>
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Matricule Camion / Chauffeur:</span>
          <span className="font-bold text-stone-900">{sale.truck_plate} {sale.driver_name ? `(${sale.driver_name})` : ''}</span>
        </div>
      </div>

      <div className="bg-stone-50 rounded-lg border border-stone-200 p-4">
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-2 bg-white rounded border border-stone-200">
            <span className="text-stone-500 block">Poids Brut</span>
            <span className="font-mono font-bold text-stone-800">{sale.gross_weight_kg} KG</span>
          </div>
          <div className="p-2 bg-white rounded border border-stone-200">
            <span className="text-stone-500 block">Tare Camion</span>
            <span className="font-mono font-bold text-stone-600">{sale.tare_weight_kg} KG</span>
          </div>
          <div className="p-2 bg-amber-50 rounded border border-amber-300">
            <span className="text-amber-800 block font-bold">Poids Net Chargé</span>
            <span className="font-mono font-black text-amber-900">{sale.net_weight_tonnes} Tonnes ({sale.net_weight_kg} KG)</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50/60 rounded-lg border border-amber-200 text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-stone-600">Prix unitaire convenu :</span>
          <span className="font-mono font-bold text-stone-900">{sale.unit_price_per_tonne_tnd.toFixed(3)} TND / Tonne</span>
        </div>
        <div className="flex justify-between border-t border-amber-200 pt-2 font-black text-sm text-amber-950">
          <span>Montant Total à Régler :</span>
          <span className="font-mono text-lg">{sale.total_price_tnd.toFixed(3)} TND</span>
        </div>
        <div className="flex justify-between text-stone-600 pt-1">
          <span>Mode de règlement :</span>
          <span className="font-semibold text-stone-800">{sale.payment_mode}</span>
        </div>
      </div>
    </div>
  );
}

function renderClientStatement(clientSummary: any) {
  return (
    <div className="space-y-6">
      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
        <h2 className="text-lg font-bold text-stone-900">RELEVÉ DE COMPTE PRODUCTEUR</h2>
        <p className="text-xs font-arabic font-bold text-amber-700" dir="rtl">كشف حساب الفلاح - معصرة جماعي</p>
        <p className="text-xs text-stone-600 mt-1">Client: <strong>{clientSummary.party_name}</strong> (Code: {clientSummary.party_code})</p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        <div className="p-3 bg-white rounded border border-stone-200">
          <span className="text-stone-500 block">Total Olives Apportées</span>
          <span className="font-mono font-bold text-stone-900">{clientSummary.total_olives_kg || 0} KG</span>
        </div>
        <div className="p-3 bg-amber-50 rounded border border-amber-200">
          <span className="text-amber-800 font-bold block">Huile Totale Extraite</span>
          <span className="font-mono font-black text-amber-900">{clientSummary.total_oil_litres || 0} L</span>
        </div>
        <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
          <span className="text-emerald-800 font-bold block">Rendement Moyen</span>
          <span className="font-mono font-black text-emerald-900">{clientSummary.average_yield_percent?.toFixed(2) || '0.00'} %</span>
        </div>
      </div>
    </div>
  );
}

function renderPurchaseReceipt(purchase: any) {
  return (
    <div className="space-y-6">
      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">BON D'ACHAT DIRECT (COMPTE HUILERIE)</h2>
          <p className="text-xs font-arabic font-bold text-amber-700" dir="rtl">وصل شراء لحساب المعصرة</p>
        </div>
        <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded ${purchase.payment_status === 'PAYE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {purchase.payment_status === 'PAYE' ? 'Payé' : 'Impayé'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Fournisseur / Agriculteur:</span>
          <span className="font-bold text-stone-900 text-sm">{purchase.supplier_name}</span>
          {purchase.supplier_phone && <span className="text-stone-500 block text-[11px]">{purchase.supplier_phone}</span>}
        </div>
        <div className="p-3 bg-stone-50 rounded border border-stone-200">
          <span className="text-stone-500 block">Type de Produit & Variété:</span>
          <span className="font-bold text-stone-900">
            {purchase.item_type === 'OLIVES' ? `Olives en Vrac (${purchase.variety || 'Standard'})` : 'Huile d’Olive en Vrac'}
          </span>
        </div>
      </div>

      <div className="bg-stone-50 rounded-lg border border-stone-200 p-4">
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-2 bg-white rounded border border-stone-200">
            <span className="text-stone-500 block">Quantité Achetée</span>
            <span className="font-mono font-bold text-stone-900 text-sm">
              {purchase.quantity} {purchase.item_type === 'OLIVES' ? 'KG' : 'L'}
            </span>
          </div>
          <div className="p-2 bg-white rounded border border-stone-200">
            <span className="text-stone-500 block">Prix Unitaire Convenu</span>
            <span className="font-mono font-bold text-stone-800">
              {purchase.unit_price_tnd?.toFixed(3)} TND
            </span>
          </div>
          <div className="p-2 bg-amber-50 rounded border border-amber-300">
            <span className="text-amber-800 block font-bold">Montant Total à Payer</span>
            <span className="font-mono font-black text-amber-900 text-sm">
              {purchase.total_price_tnd?.toFixed(3)} TND
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs flex justify-between items-center">
        <div>
          <span className="text-stone-500">Mode de paiement: </span>
          <span className="font-bold text-stone-800">{purchase.payment_mode}</span>
        </div>
        {purchase.notes && (
          <div className="text-stone-600 italic">
            Obs: {purchase.notes}
          </div>
        )}
      </div>
    </div>
  );
}
