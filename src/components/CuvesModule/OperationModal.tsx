import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus, Trash2 } from 'lucide-react';
import { Tank, Party, Operation, TankMovement, TankStockDetail } from '../../types/stock';
import { translations, Language } from '../../lib/i18n';

interface OperationModalProps {
  type: 'ENTREE' | 'SORTIE' | 'TRANSFERT';
  tanks: TankStockDetail[];
  parties: Party[];
  currentOperator: string;
  preselectedTankId?: string;
  lang: Language;
  onClose: () => void;
  onSubmit: (operation: Operation, movements: TankMovement[]) => void;
}

export const OperationModal: React.FC<OperationModalProps> = ({
  type,
  tanks,
  parties,
  currentOperator,
  preselectedTankId,
  lang,
  onClose,
  onSubmit
}) => {
  const t = translations[lang];

  // Form states
  const [partyId, setPartyId] = useState<string>(parties[0]?.id || '');
  const [notes, setNotes] = useState<string>('');
  const [operationDate, setOperationDate] = useState<string>(new Date().toISOString().slice(0, 16));

  // Entrée specific: multi-tank allocations
  const [allocations, setAllocations] = useState<{ tankId: string; quantity: number }[]>([
    { tankId: preselectedTankId || tanks[0]?.tank.id || '', quantity: 1000 }
  ]);

  // Sortie / Transfert specific
  const [sourceTankId, setSourceTankId] = useState<string>(preselectedTankId || tanks[0]?.tank.id || '');
  const [targetTankId, setTargetTankId] = useState<string>(tanks[1]?.tank.id || '');
  const [singleQuantity, setSingleQuantity] = useState<number>(500);

  // Validation errors
  const [error, setError] = useState<string | null>(null);

  // Helper to get client balance in tank
  const getClientBalanceInTank = (tankId: string, pId: string): number => {
    const tankDetail = tanks.find(t => t.tank.id === tankId);
    if (!tankDetail) return 0;
    const clientEntry = tankDetail.clients_breakdown.find(c => c.party_id === pId);
    return clientEntry ? clientEntry.quantity : 0;
  };

  // Helper to get remaining capacity
  const getRemainingCapacity = (tankId: string): number => {
    const tankDetail = tanks.find(t => t.tank.id === tankId);
    return tankDetail ? tankDetail.remaining_capacity : 0;
  };

  const handleAddAllocation = () => {
    setAllocations([...allocations, { tankId: tanks[0]?.tank.id || '', quantity: 500 }]);
  };

  const handleRemoveAllocation = (index: number) => {
    if (allocations.length > 1) {
      setAllocations(allocations.filter((_, i) => i !== index));
    }
  };

  const handleUpdateAllocation = (index: number, field: 'tankId' | 'quantity', value: any) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const opId = `mouv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (type === 'ENTREE') {
      const totalQty = allocations.reduce((sum, a) => sum + Number(a.quantity || 0), 0);
      if (totalQty <= 0) {
        setError('Veuillez saisir une quantité positive.');
        return;
      }

      // Check capacities
      for (const alloc of allocations) {
        const rem = getRemainingCapacity(alloc.tankId);
        if (Number(alloc.quantity) > rem) {
          const tName = tanks.find(t => t.tank.id === alloc.tankId)?.tank.name;
          setError(`La quantité saisie (${alloc.quantity} L) dépasse la capacité restante de la cuve ${tName} (${rem} L).`);
          return;
        }
      }

      const docNumber = `BON-REC-${year}-${rand}`;
      const newOp: Operation = {
        id: opId,
        doc_number: docNumber,
        type: 'ENTREE',
        party_id: partyId,
        operator: currentOperator,
        total_quantity: totalQty,
        notes: notes || 'Huile d’olive vierge extra - Entrée en cuverie',
        status: 'VALIDE',
        operation_date: new Date(operationDate).toISOString()
      };

      const newMvts: TankMovement[] = allocations.map(a => ({
        id: `tm-${opId}-${a.tankId}`,
        operation_id: opId,
        tank_id: a.tankId,
        party_id: partyId,
        direction: 'IN',
        quantity: Number(a.quantity),
        notes: `${docNumber} - ENTREE`,
        created_at: new Date(operationDate).toISOString()
      }));

      onSubmit(newOp, newMvts);
    } else if (type === 'SORTIE') {
      const qty = Number(singleQuantity);
      if (qty <= 0) {
        setError('Veuillez saisir une quantité positive.');
        return;
      }

      // Check client balance in source tank
      const clientBal = getClientBalanceInTank(sourceTankId, partyId);
      if (qty > clientBal) {
        const pName = parties.find(p => p.id === partyId)?.name;
        const tName = tanks.find(t => t.tank.id === sourceTankId)?.tank.name;
        setError(`Solde insuffisant: le client ${pName} ne possède que ${clientBal} L dans la cuve ${tName}.`);
        return;
      }

      const docNumber = `BON-SOR-${year}-${rand}`;
      const newOp: Operation = {
        id: opId,
        doc_number: docNumber,
        type: 'SORTIE',
        party_id: partyId,
        operator: currentOperator,
        total_quantity: qty,
        notes: notes || 'Retrait producteur / Vente en vrac',
        status: 'VALIDE',
        operation_date: new Date(operationDate).toISOString()
      };

      const newMvt: TankMovement = {
        id: `tm-${opId}-${sourceTankId}`,
        operation_id: opId,
        tank_id: sourceTankId,
        party_id: partyId,
        direction: 'OUT',
        quantity: qty,
        notes: `${docNumber} - SORTIE`,
        created_at: new Date(operationDate).toISOString()
      };

      onSubmit(newOp, [newMvt]);
    } else if (type === 'TRANSFERT') {
      const qty = Number(singleQuantity);
      if (qty <= 0) {
        setError('Veuillez saisir une quantité positive.');
        return;
      }

      if (sourceTankId === targetTankId) {
        setError('La cuve source et la cuve destination doivent être différentes.');
        return;
      }

      // Check available capacity in target tank
      const remTarget = getRemainingCapacity(targetTankId);
      if (qty > remTarget) {
        const targetName = tanks.find(t => t.tank.id === targetTankId)?.tank.name;
        setError(`Capacité insuffisante: la cuve réceptrice ${targetName} ne peut recevoir que ${remTarget} L.`);
        return;
      }

      // Check stock in source tank
      const sourceDetail = tanks.find(t => t.tank.id === sourceTankId);
      if (!sourceDetail || qty > sourceDetail.current_quantity) {
        setError(`Quantité insuffisante dans la cuve source (Stock disponible: ${sourceDetail?.current_quantity || 0} L).`);
        return;
      }

      const docNumber = `BON-TRA-${year}-${rand}`;
      const newOp: Operation = {
        id: opId,
        doc_number: docNumber,
        type: 'TRANSFERT',
        party_id: partyId,
        operator: currentOperator,
        total_quantity: qty,
        notes: notes || 'Transfert interne entre cuves',
        status: 'VALIDE',
        operation_date: new Date(operationDate).toISOString(),
        source_tank_id: sourceTankId,
        target_tank_id: targetTankId
      };

      const outMvt: TankMovement = {
        id: `tm-${opId}-out-${sourceTankId}`,
        operation_id: opId,
        tank_id: sourceTankId,
        party_id: partyId,
        direction: 'OUT',
        quantity: qty,
        notes: `${docNumber} - TRANSFERT SORTIE`,
        created_at: new Date(operationDate).toISOString()
      };

      const inMvt: TankMovement = {
        id: `tm-${opId}-in-${targetTankId}`,
        operation_id: opId,
        tank_id: targetTankId,
        party_id: partyId,
        direction: 'IN',
        quantity: qty,
        notes: `${docNumber} - TRANSFERT ENTREE`,
        created_at: new Date(operationDate).toISOString()
      };

      onSubmit(newOp, [outMvt, inMvt]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {type === 'ENTREE' && <ArrowDownLeft className="w-5 h-5 text-emerald-400" />}
            {type === 'SORTIE' && <ArrowUpRight className="w-5 h-5 text-amber-400" />}
            {type === 'TRANSFERT' && <ArrowLeftRight className="w-5 h-5 text-blue-400" />}
            <h2 className="font-bold text-base">
              {type === 'ENTREE' && 'Nouveau Bon de Réception Stock (Entrée Cuve)'}
              {type === 'SORTIE' && 'Nouveau Bon de Sortie Stock (Retrait Cuve)'}
              {type === 'TRANSFERT' && 'Nouveau Bon de Transfert Inter-Cuves'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Client & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {t.client} *
              </label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                required
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {parties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {t.date}
              </label>
              <input
                type="datetime-local"
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
                required
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
              </input>
            </div>
          </div>

          {/* TYPE: ENTREE (Multi-tank allocations) */}
          {type === 'ENTREE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Répartition dans les Cuves (Litres)
                </label>
                <button
                  type="button"
                  onClick={handleAddAllocation}
                  className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une autre cuve
                </button>
              </div>

              {allocations.map((alloc, idx) => {
                const rem = getRemainingCapacity(alloc.tankId);
                return (
                  <div key={idx} className="flex items-center gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                    <div className="flex-1">
                      <select
                        value={alloc.tankId}
                        onChange={(e) => handleUpdateAllocation(idx, 'tankId', e.target.value)}
                        className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-medium"
                      >
                        {tanks.map(item => (
                          <option key={item.tank.id} value={item.tank.id}>
                            {item.tank.code} - {item.tank.name} (Dispo: {item.remaining_capacity} L)
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-stone-500 mt-0.5 block">
                        Capacité disponible: <strong>{rem} Litres</strong>
                      </span>
                    </div>

                    <div className="w-32">
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max={rem}
                          value={alloc.quantity}
                          onChange={(e) => handleUpdateAllocation(idx, 'quantity', Number(e.target.value))}
                          placeholder="Litres"
                          className="w-full p-2 pr-7 bg-white border border-stone-300 rounded text-xs font-mono font-bold text-stone-900"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 font-bold">
                          L
                        </span>
                      </div>
                    </div>

                    {allocations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAllocation(idx)}
                        className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900">Quantité Totale à Réceptionner :</span>
                <span className="font-mono text-base font-black text-emerald-950">
                  {allocations.reduce((sum, a) => sum + Number(a.quantity || 0), 0).toLocaleString()} Litres
                </span>
              </div>
            </div>
          )}

          {/* TYPE: SORTIE */}
          {type === 'SORTIE' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Cuve Source de Retrait *
                </label>
                <select
                  value={sourceTankId}
                  onChange={(e) => setSourceTankId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                >
                  {tanks.map(item => {
                    const clientBal = getClientBalanceInTank(item.tank.id, partyId);
                    return (
                      <option key={item.tank.id} value={item.tank.id}>
                        {item.tank.code} - {item.tank.name} (Solde Client: {clientBal} L)
                      </option>
                    );
                  })}
                </select>
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Solde disponible pour ce client dans cette cuve: <strong className="text-stone-900">{getClientBalanceInTank(sourceTankId, partyId)} L</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Quantité à Retirer (Litres) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={getClientBalanceInTank(sourceTankId, partyId)}
                    value={singleQuantity}
                    onChange={(e) => setSingleQuantity(Number(e.target.value))}
                    required
                    className="w-full p-2.5 pr-8 bg-stone-50 border border-stone-300 rounded-lg text-sm font-mono font-bold text-stone-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                    Litres
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TYPE: TRANSFERT */}
          {type === 'TRANSFERT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Cuve Source (Origine) *
                  </label>
                  <select
                    value={sourceTankId}
                    onChange={(e) => setSourceTankId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                  >
                    {tanks.map(item => (
                      <option key={item.tank.id} value={item.tank.id}>
                        {item.tank.code} (Stock: {item.current_quantity} L)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Cuve Destination (Réceptrice) *
                  </label>
                  <select
                    value={targetTankId}
                    onChange={(e) => setTargetTankId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                  >
                    {tanks.map(item => (
                      <option key={item.tank.id} value={item.tank.id}>
                        {item.tank.code} (Dispo: {item.remaining_capacity} L)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Volume à Transférer (Litres) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={getRemainingCapacity(targetTankId)}
                    value={singleQuantity}
                    onChange={(e) => setSingleQuantity(Number(e.target.value))}
                    required
                    className="w-full p-2.5 pr-8 bg-stone-50 border border-stone-300 rounded-lg text-sm font-mono font-bold text-stone-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                    Litres
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Observations / Numéro de Lot
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Huile vierge extra - Première pression à froid..."
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
            />
          </div>

          {/* Operator notice */}
          <div className="text-[11px] text-stone-500 pt-2 flex items-center justify-between border-t border-stone-100">
            <span>Opérateur: <strong className="text-stone-700">{currentOperator}</strong></span>
            <span>Unité: <strong>Litres (L)</strong></span>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Valider & Générer le Bon</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
