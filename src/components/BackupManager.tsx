import React, { useState } from 'react';
import { 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  Clock, 
  HardDrive,
  FileCode,
  FileCheck
} from 'lucide-react';
import { BackupSnapshot, AppSettings } from '../types';

interface BackupManagerProps {
  backups: BackupSnapshot[];
  onCreateBackup: (desc?: string) => BackupSnapshot;
  onRestoreSnapshot: (snapshotId: string) => void;
  onRestoreJSON: (jsonString: string) => void;
  onExportSQLiteScript: () => string;
  onResetData: () => void;
  settings: AppSettings;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  backups,
  onCreateBackup,
  onRestoreSnapshot,
  onRestoreJSON,
  onExportSQLiteScript,
  onResetData,
  settings
}) => {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  const handleManualBackup = () => {
    setErrorMsg('');
    try {
      const snap = onCreateBackup(customDesc.trim() || "Sauvegarde manuelle utilisateur");
      setSuccessMsg(`Sauvegarde effectuée avec succès : ${snap.nomFichier} (${snap.tailleKo} Ko)`);
      setCustomDesc('');
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur de sauvegarde");
    }
  };

  const handleDownloadJSON = (snapshot: BackupSnapshot) => {
    const blob = new Blob([snapshot.donneesJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = snapshot.nomFichier;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSQLite = () => {
    const sql = onExportSQLiteScript();
    const blob = new Blob([sql], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huilerie_jemai_dump_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        onRestoreJSON(content);
        setSuccessMsg(`Fichier '${file.name}' restauré avec succès après contrôle d'intégrité.`);
      } catch (err: any) {
        setErrorMsg(err.message || "Fichier invalide ou corrompu.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = (id: string) => {
    setErrorMsg('');
    try {
      onRestoreSnapshot(id);
      setSuccessMsg("La sauvegarde a été restaurée avec succès ! Une copie de sécurité a été créée préalablement.");
      setConfirmRestoreId(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la restauration");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-xs text-red-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-700 hover:text-red-900 font-bold">×</button>
        </div>
      )}

      {/* Cartes d'action Sauvegarde & Sécurité */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Création de sauvegarde immédiate */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Créer une Sauvegarde Horodatée
              </h3>
              <p className="text-xs text-stone-500">
                Instantané complet de toutes les cuves, clients, mouvements et audits
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description / Libellé de la sauvegarde (Facultatif)
            </label>
            <input
              type="text"
              placeholder="ex: Fin de journée, avant inventaire mensuel..."
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleManualBackup}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Sauvegarder Maintenant</span>
            </button>

            <button
              onClick={handleDownloadSQLite}
              className="px-3.5 py-2 border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              title="Génère un script d'export SQL compatible avec SQLite 3.x"
            >
              <FileCode className="w-4 h-4 text-emerald-700" />
              <span>Exporter Script SQLite (.sql)</span>
            </button>
          </div>
        </div>

        {/* Restauration depuis un fichier externe */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Restaurer une Sauvegarde Externe
              </h3>
              <p className="text-xs text-stone-500">
                Contrôle d'intégrité strict avant application avec copie de secours automatique
              </p>
            </div>
          </div>

          <p className="text-xs text-stone-600">
            Sélectionnez un fichier JSON de sauvegarde précédemment exporté. Le système vérifie la conformité de chaque table et garantit qu'aucune donnée n'est perdue.
          </p>

          <label className="inline-flex items-center gap-2 px-4 py-2 border border-amber-600 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold cursor-pointer transition">
            <Upload className="w-4 h-4 text-amber-700" />
            <span>Charger un fichier de sauvegarde (.json)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

      </div>

      {/* Emplacements & Chemins de Données */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 text-xs space-y-2">
        <h4 className="font-bold text-stone-800 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-700" />
          Emplacements et Chemins des Données
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-600">
          <div>
            <span className="font-bold text-stone-700">Stockage de Travail Actuel :</span>
            <div className="font-mono text-[11px] bg-white p-2 rounded border border-stone-200 mt-1">
              Navigateur local (IndexedDB / LocalStorage) &bull; Synchronisé en temps réel
            </div>
          </div>
          <div>
            <span className="font-bold text-stone-700">Application Desktop Windows 11 :</span>
            <div className="font-mono text-[11px] bg-white p-2 rounded border border-stone-200 mt-1">
              %USERPROFILE%\Documents\HuilerieJemai\huilerie_jemai.db
            </div>
          </div>
        </div>
      </div>

      {/* Historique Tournant des Sauvegardes Disponibles */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              Historique des Sauvegardes Automatiques et Manuelles ({backups.length})
            </h3>
            <p className="text-xs text-stone-500">
              Chaque sauvegarde est vérifiée et prête pour une restauration instantanée
            </p>
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {backups.map(snap => {
            const isConfirming = confirmRestoreId === snap.id;

            return (
              <div key={snap.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-stone-50 px-2 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                    <Database className="w-4 h-4 text-stone-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-stone-900">{snap.nomFichier}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-200 text-stone-700">
                        {snap.tailleKo} Ko
                      </span>
                    </div>
                    <div className="text-xs text-stone-600 mt-0.5 font-medium">
                      {snap.description}
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      {new Date(snap.date).toLocaleString('fr-FR')} &bull; {snap.nbCuves} cuves, {snap.nbClients} clients, {snap.nbMouvements} mouvements
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadJSON(snap)}
                    className="p-1.5 border border-stone-300 rounded hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Télécharger le fichier JSON sur votre ordinateur"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-600" />
                    <span>Télécharger</span>
                  </button>

                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-lg border border-red-200">
                      <span className="text-xs text-red-800 font-bold px-1">Confirmer ?</span>
                      <button
                        onClick={() => handleConfirmRestore(snap.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700 cursor-pointer"
                      >
                        Oui, Restaurer
                      </button>
                      <button
                        onClick={() => setConfirmRestoreId(null)}
                        className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-[11px] cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRestoreId(snap.id)}
                      className="px-3 py-1.5 border border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>Restaurer</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
