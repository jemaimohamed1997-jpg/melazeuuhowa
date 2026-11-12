import React, { useState } from 'react';
import { User, Search, Plus, Printer, FileSpreadsheet, Phone, Database } from 'lucide-react';
import { Party, ClientStockSummary } from '../../types/stock';
import { translations, Language } from '../../lib/i18n';

interface ClientsListProps {
  clients: ClientStockSummary[];
  lang: Language;
  onNewClient: (client: { name: string; phone?: string; notes?: string }) => void;
  onPrintClientStatement: (clientSummary: ClientStockSummary) => void;
  onExportExcel: () => void;
}

export const ClientsList: React.FC<ClientsListProps> = ({
  clients,
  lang,
  onNewClient,
  onPrintClientStatement,
  onExportExcel
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = clients.filter(c =>
    c.party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.party.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.party.phone || '').includes(searchTerm)
  );

  const totalStockAllClients = clients.reduce((sum, c) => sum + c.total_quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onNewClient({ name: name.trim(), phone: phone.trim() || undefined, notes: notes.trim() || undefined });
    setName('');
    setPhone('');
    setNotes('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-medium block">Total Producteurs Enregistrés</span>
            <span className="font-mono text-2xl font-black text-stone-900">{clients.length} clients</span>
          </div>
          <div className="p-2.5 bg-stone-100 text-stone-700 rounded-lg">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-medium block">Clients avec Huile en Cuve</span>
            <span className="font-mono text-2xl font-black text-amber-900">
              {clients.filter(c => c.total_quantity > 0).length} actifs
            </span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-medium block">Total Huile Détenue par les Clients</span>
            <span className="font-mono text-2xl font-black text-emerald-800">
              {totalStockAllClients.toLocaleString()} L
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, code ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportExcel}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Producteur</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Nom du Producteur</th>
                <th className="p-3.5">Contact Téléphone</th>
                <th className="p-3.5 text-right">Huile en Cuves</th>
                <th className="p-3.5">Répartition dans les Cuves</th>
                <th className="p-3.5 text-right">Opérations</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length > 0 ? (
                filtered.map((c) => (
                  <tr key={c.party.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-stone-500">
                      {c.party.code}
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-stone-900 block">{c.party.name}</span>
                      {c.party.notes && <span className="text-[10px] text-stone-400">{c.party.notes}</span>}
                    </td>

                    <td className="p-3.5">
                      {c.party.phone ? (
                        <span className="flex items-center gap-1 text-stone-700 font-mono">
                          <Phone className="w-3 h-3 text-stone-400" />
                          {c.party.phone}
                        </span>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <span className={`font-mono text-sm font-black ${
                        c.total_quantity > 0 ? 'text-amber-950' : 'text-stone-400'
                      }`}>
                        {c.total_quantity.toLocaleString()} L
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {c.tanks_distribution.length > 0 ? (
                          c.tanks_distribution.map((td, idx) => (
                            <span key={idx} className="font-mono text-[10px] bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded text-stone-700 font-semibold">
                              {td.tank_code}: {td.quantity}L
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-stone-400 italic">Aucun stockage actuel</span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-right font-mono text-stone-600">
                      {c.total_operations} bon(s)
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => onPrintClientStatement(c)}
                        className="p-1.5 hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200 rounded"
                        title="Imprimer le relevé de compte"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-400 italic">
                    Aucun producteur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-stone-900 text-base">Nouveau Client / Producteur</h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nom et Prénom *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Hedi Jemai"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: +216 98 123 456"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Notes / Région / Parcelles</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Oulad Chamekh, 500 oliviers Chemlali..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 border border-stone-300 rounded-lg text-stone-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
