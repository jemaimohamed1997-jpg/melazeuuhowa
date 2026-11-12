import React, { useState } from 'react';
import { Database, AlertTriangle, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, User, Eye, Search } from 'lucide-react';
import { TankStockDetail } from '../../types/stock';
import { translations, Language } from '../../lib/i18n';

interface CuvesGridProps {
  tanks: TankStockDetail[];
  lang: Language;
  onSelectTank: (tank: TankStockDetail) => void;
  onOpenOperation: (type: 'ENTREE' | 'SORTIE' | 'TRANSFERT', preselectedTankId?: string) => void;
}

export const CuvesGrid: React.FC<CuvesGridProps> = ({
  tanks,
  lang,
  onSelectTank,
  onOpenOperation
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlert, setFilterAlert] = useState(false);

  const filteredTanks = tanks.filter(item => {
    const matchesSearch = item.tank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tank.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAlert = filterAlert ? item.is_alert : true;
    return matchesSearch && matchesAlert;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterAlert(!filterAlert)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              filterAlert
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alertes Seuil (&ge; 85%)</span>
          </button>

          <button
            onClick={() => onOpenOperation('ENTREE')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>{t.stockIn}</span>
          </button>

          <button
            onClick={() => onOpenOperation('SORTIE')}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{t.stockOut}</span>
          </button>

          <button
            onClick={() => onOpenOperation('TRANSFERT')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>{t.transfer}</span>
          </button>
        </div>
      </div>

      {/* Tanks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredTanks.map((item) => {
          const { tank, current_quantity, fill_percentage, remaining_capacity, is_alert, clients_breakdown } = item;

          // Color scale for fill level
          let liquidColor = 'from-amber-400 to-amber-500';
          let gaugeBorder = 'border-amber-200';
          if (fill_percentage >= 95) {
            liquidColor = 'from-rose-500 to-rose-600';
            gaugeBorder = 'border-rose-400';
          } else if (fill_percentage >= 85) {
            liquidColor = 'from-amber-500 to-orange-500';
            gaugeBorder = 'border-orange-300';
          } else if (fill_percentage > 0) {
            liquidColor = 'from-lime-500 to-emerald-600';
          }

          return (
            <div
              key={tank.id}
              className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden relative ${
                is_alert ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-stone-200'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-stone-100 flex items-start justify-between bg-stone-50/70">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 bg-stone-900 text-white rounded">
                      {tank.code}
                    </span>
                    <span className="text-xs font-semibold text-stone-700 truncate max-w-[130px]">
                      {tank.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 block mt-1">
                    Capacité: <strong className="text-stone-800">{tank.capacity.toLocaleString()} L</strong>
                  </span>
                </div>

                <div className="text-right">
                  <span className={`inline-block font-mono text-sm font-black ${
                    fill_percentage >= 85 ? 'text-rose-600' : 'text-stone-900'
                  }`}>
                    {fill_percentage}%
                  </span>
                  {is_alert && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-700 font-bold justify-end mt-0.5">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Pleine &ge; 85%
                    </span>
                  )}
                </div>
              </div>

              {/* Tank Body / Visual Gauge */}
              <div className="p-4 space-y-4">
                {/* Visual Liquid Indicator */}
                <div className="relative w-full h-18 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 p-1 flex items-end">
                  <div
                    className={`w-full bg-gradient-to-t ${liquidColor} rounded transition-all duration-500 relative`}
                    style={{ height: `${Math.max(6, fill_percentage)}%` }}
                  >
                    {/* Subtle liquid shine line */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-white/40" />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-mono font-bold pointer-events-none">
                    <span className="bg-white/80 px-1.5 py-0.5 rounded text-stone-800 backdrop-blur-xs">
                      {current_quantity.toLocaleString()} L
                    </span>
                    <span className="bg-white/80 px-1.5 py-0.5 rounded text-stone-500 backdrop-blur-xs">
                      Reste {remaining_capacity.toLocaleString()} L
                    </span>
                  </div>
                </div>

                {/* Clients Breakdown preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Producteurs stockés :
                    </span>
                    <span className="font-semibold text-stone-700">{clients_breakdown.length}</span>
                  </div>

                  {clients_breakdown.length > 0 ? (
                    <div className="space-y-1">
                      {clients_breakdown.slice(0, 2).map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-stone-50 px-2 py-1 rounded border border-stone-100">
                          <span className="truncate max-w-[140px] text-stone-700 font-medium">
                            {c.party_name}
                          </span>
                          <span className="font-mono font-bold text-amber-900 text-[11px]">
                            {c.quantity} L ({c.percentage_of_tank}%)
                          </span>
                        </div>
                      ))}
                      {clients_breakdown.length > 2 && (
                        <p className="text-[10px] text-stone-400 text-right">
                          + {clients_breakdown.length - 2} autre(s) producteur(s)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-400 italic py-1 text-center bg-stone-50/50 rounded">
                      Cuve totalement vide
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectTank(item)}
                  className="flex-1 px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Détails & Fiche</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    title="Entrée dans cette cuve"
                    onClick={() => onOpenOperation('ENTREE', tank.id)}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded transition-colors"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Sortie de cette cuve"
                    onClick={() => onOpenOperation('SORTIE', tank.id)}
                    className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
