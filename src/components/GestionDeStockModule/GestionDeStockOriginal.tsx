/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  Users, 
  History, 
  FileSpreadsheet, 
  HardDrive, 
  CheckCircle, 
  Cpu, 
  Monitor, 
  Settings as SettingsIcon,
  Plus,
  MinusCircle,
  ArrowLeftRight,
  Save,
  HelpCircle
} from 'lucide-react';

import { dbService } from '../../services/db';
import { supabase } from '../../services/supabase';
import { 
  Cuve, 
  Client, 
  Movement, 
  AuditLog, 
  AppSettings, 
  UserSession, 
  CuveDetails, 
  ClientBalance, 
  BackupSnapshot 
} from '../../types';

import { Header } from '../Header';
import { Dashboard } from '../Dashboard';
import { CuvesManager } from '../CuvesManager';
import { ClientsManager } from '../ClientsManager';
import { HistoryAudit } from '../HistoryAudit';
import { ReportsManager } from '../ReportsManager';
import { BackupManager } from '../BackupManager';
import { AutomatedTestSuite } from '../AutomatedTestSuite';
import { WindowsDesktopCode } from '../WindowsDesktopCode';
import { MovementEntryModal } from '../MovementEntryModal';
import { MovementExitModal } from '../MovementExitModal';
import { MovementTransferModal } from '../MovementTransferModal';
import { ReceiptModal } from '../ReceiptModal';
import { SettingsModal } from '../SettingsModal';
import { LoginPortal } from '../LoginPortal';
import { ClientDashboard } from '../ClientDashboard';
import { MobileNavigation } from '../MobileNavigation';

const SESSION_STORAGE_KEY = 'huilerie_jemai_active_session_v1';

export function GestionDeStockOriginal() {
  // Session utilisateur (Persistée si 'Se souvenir de moi' activé ou session Supabase JWT active)
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      username: 'wizz',
      role: 'admin',
      nomAffiche: 'Mohamed Jemai (Gérant)',
      dernierAcces: new Date().toISOString()
    };
  });

  // Vérification de la session JWT Supabase au démarrage
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !currentUser) {
        setCurrentUser({
          username: session.user.email?.split('@')[0] || 'employe',
          role: 'admin',
          nomAffiche: session.user.email || 'Personnel Huilerie',
          email: session.user.email,
          dernierAcces: new Date().toISOString()
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && currentUser?.email) {
        setCurrentUser(null);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (session: UserSession, rememberMe: boolean) => {
    setCurrentUser(session);
    if (rememberMe) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  // Onglet actif
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Données d'état
  const [settings, setSettings] = useState<AppSettings>(dbService.getSettings());
  const [cuves, setCuves] = useState<Cuve[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mouvements, setMouvements] = useState<Movement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [cuvesDetails, setCuvesDetails] = useState<CuveDetails[]>([]);
  const [clientBalances, setClientBalances] = useState<ClientBalance[]>([]);

  // États des Modales
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [receiptMovement, setReceiptMovement] = useState<Movement | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isDuplicateReceipt, setIsDuplicateReceipt] = useState(false);

  // Pré-sélections pour les modales
  const [preSelectedCuveId, setPreSelectedCuveId] = useState<string | undefined>(undefined);
  const [preSelectedClientId, setPreSelectedClientId] = useState<string | undefined>(undefined);

  // Rafraîchissement complet de l'état
  const refreshState = useCallback(() => {
    const rawCuves = dbService.getCuves();
    const rawClients = dbService.getClients();
    const rawMouvements = dbService.getMouvements();
    const rawAudit = dbService.getAuditLogs();
    const rawBackups = dbService.getBackups();

    setCuves(rawCuves);
    setClients(rawClients);
    setMouvements(rawMouvements);
    setAuditLogs(rawAudit);
    setBackups(rawBackups);

    // Détails des cuves calculés
    const calculatedCuvesDetails: CuveDetails[] = rawCuves
      .map(c => dbService.getCuveDetails(c.id))
      .filter((d): d is CuveDetails => d !== null);
    setCuvesDetails(calculatedCuvesDetails);

    // Soldes des clients calculés
    const calculatedClientBalances: ClientBalance[] = rawClients
      .map(cl => dbService.getClientBalance(cl.id))
      .filter((cb): cb is ClientBalance => cb !== null);
    setClientBalances(calculatedClientBalances);
  }, []);

  useEffect(() => {
    refreshState();
    const unsubscribe = dbService.subscribe(refreshState);
    return () => unsubscribe();
  }, [refreshState]);

  // Raccourcis clavier (Navigation rapide)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        openEntree();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !e.shiftKey) {
        // éviter d'intercepter la sauvegarde navigateur si besoin, ou utiliser Alt
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Déclencheurs de Modales
  const openEntree = (cuveId?: string, clientId?: string) => {
    setPreSelectedCuveId(cuveId);
    setPreSelectedClientId(clientId);
    setIsEntryModalOpen(true);
  };

  const openSortie = (clientId?: string) => {
    setPreSelectedClientId(clientId);
    setIsExitModalOpen(true);
  };

  const openTransfert = (cuveId?: string) => {
    setPreSelectedCuveId(cuveId);
    setIsTransferModalOpen(true);
  };

  const openReceipt = (movement: Movement, duplicate: boolean = false) => {
    setReceiptMovement(movement);
    setIsDuplicateReceipt(duplicate);
    setIsReceiptOpen(true);
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const handleSmartRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await dbService.smartRefresh();
      refreshState();
      setRefreshToast({
        message: res.message,
        type: res.updated ? 'success' : 'info'
      });
      setTimeout(() => {
        setRefreshToast(null);
      }, 4000);
    } catch (err: any) {
      setRefreshToast({
        message: `Erreur d'actualisation : ${err.message || 'Serveur injoignable'}`,
        type: 'info'
      });
      setTimeout(() => {
        setRefreshToast(null);
      }, 4000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuickBackup = () => {
    const snap = dbService.createAutomaticSnapshot("Sauvegarde manuelle rapide (Bouton barre)");
    refreshState();
    alert(`Sauvegarde réussie : ${snap.nomFichier} (${snap.tailleKo} Ko) enregistrée avec succès.`);
  };

  // Actions métier déléguées
  const handleSaveSettings = (newSettings: AppSettings) => {
    dbService.saveSettings(newSettings);
    setSettings(newSettings);
    refreshState();
  };

  const handleAddCuve = (numero: string, nom: string, capaciteMax: number, notes?: string) => {
    dbService.ajouterCuve(numero, nom, capaciteMax, notes);
    refreshState();
  };

  const handleEditCuve = (cuveId: string, nom: string, capaciteMax: number, notes?: string) => {
    dbService.modifierCuve(cuveId, nom, capaciteMax, notes);
    refreshState();
  };

  const handleToggleCuve = (cuveId: string) => {
    dbService.basculerStatutCuve(cuveId);
    refreshState();
  };

  const handleDeleteCuve = (cuveId: string) => {
    dbService.supprimerCuve(cuveId);
    refreshState();
  };

  const handleAddClient = async (nomComplet: string, telephone?: string, notes?: string): Promise<Client> => {
    const nouveauClient = await dbService.ajouterClient(nomComplet, telephone, notes);
    refreshState();
    return nouveauClient;
  };

  const handleDeleteClient = async (clientId: string) => {
    await dbService.supprimerClient(clientId);
    refreshState();
  };

  const handleToggleClientActive = async (clientId: string) => {
    await dbService.basculerStatutClient(clientId);
    refreshState();
  };

  const handleAnnulerMouvement = async (mouvementId: string, motif: string, utilisateur: string) => {
    await dbService.annulerMouvement(mouvementId, motif, utilisateur);
    refreshState();
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    dbService.restaurerDepuisSnapshot(snapshotId);
    refreshState();
  };

  const handleRestoreJSON = (jsonString: string) => {
    dbService.restaurerDepuisJSON(jsonString);
    refreshState();
  };

  // 1. Si non connecté : Affichage du Dashboard de Login
  if (!currentUser) {
    const totalStock = cuvesDetails.filter(c => c.active).reduce((acc, c) => acc + c.stockActuel, 0);
    return (
      <LoginPortal
        onLogin={handleLogin}
        clients={clients}
        settings={settings}
        totalStock={totalStock}
        nbCuves={cuves.length}
      />
    );
  }

  // 2. Si connecté en tant que Producteur / Client : Affichage de son Espace Déposant
  if (currentUser.role === 'client') {
    const userClientBalance = clientBalances.find(b => b.client.id === currentUser.clientId) || null;
    return (
      <>
        <ClientDashboard
          currentUser={currentUser}
          clientBalance={userClientBalance}
          cuves={cuves}
          mouvements={mouvements}
          onLogout={handleLogout}
          onPrintBon={(m) => openReceipt(m, true)}
          settings={settings}
        />
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          movement={receiptMovement}
          clients={clients}
          cuves={cuves}
          settings={settings}
          isDuplicate={isDuplicateReceipt}
        />
      </>
    );
  }

  // 3. Si connecté en tant que Gérant (Admin) ou Opérateur : Application Cuverie Complète
  return (
    <div className="min-h-screen flex flex-col bg-stone-100/90 text-stone-900">
      
      {/* 1. Header Officiel avec Identité Visuelle et Actions */}
      <Header
        currentUser={currentUser}
        onSwitchUser={setCurrentUser}
        onLogout={handleLogout}
        onOpenEntree={() => openEntree()}
        onOpenSortie={() => openSortie()}
        onOpenTransfert={() => openTransfert()}
        onQuickBackup={handleQuickBackup}
        onRefresh={handleSmartRefresh}
        isRefreshing={isRefreshing}
        settings={settings}
      />

      {/* 2. Barre de Navigation Principale Style Bureau Windows 11 (Masquée sur mobile au profit de la MobileNavigation) */}
      <nav className="no-print bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto py-1 scrollbar-none">
            
            <div className="flex items-center space-x-1 sm:space-x-2 py-1">
              {[
                { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
                { id: 'cuves', label: 'Piles & Cuves', icon: Layers, badge: cuves.length },
                { id: 'clients', label: 'Clients & Déposants', icon: Users, badge: clients.length },
                { id: 'historique', label: 'Historique & Audit', icon: History, badge: mouvements.length },
                { id: 'rapports', label: 'Rapports & Excel', icon: FileSpreadsheet },
                { id: 'sauvegardes', label: 'Sauvegardes', icon: HardDrive }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-200 text-stone-700'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-2.5 py-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer ml-2"
              title="Paramètres de l'huilerie"
            >
              <SettingsIcon className="w-4 h-4 text-stone-500" />
              <span className="hidden md:inline">Paramètres</span>
            </button>

          </div>
        </div>
      </nav>

      {/* 3. Contenu Principal de l'Application (avec marge inférieure pour barre mobile) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-6">
        
        {activeTab === 'dashboard' && (
          <Dashboard
            cuvesDetails={cuvesDetails}
            mouvements={mouvements}
            clients={clients}
            clientBalances={clientBalances}
            onOpenEntreeForCuve={(cid) => openEntree(cid)}
            onOpenSortieForClient={(clid) => openSortie(clid)}
            onOpenEntree={() => openEntree()}
            onOpenSortie={() => openSortie()}
            onOpenTransfert={() => openTransfert()}
            onPrintBon={(m) => openReceipt(m, true)}
            onSelectTab={setActiveTab}
            settings={settings}
          />
        )}

        {activeTab === 'cuves' && (
          <CuvesManager
            cuvesDetails={cuvesDetails}
            mouvements={mouvements}
            clients={clients}
            onAddCuve={handleAddCuve}
            onEditCuve={handleEditCuve}
            onToggleActive={handleToggleCuve}
            onDeleteCuve={handleDeleteCuve}
            onOpenTransfertForCuve={(cid) => openTransfert(cid)}
            onOpenEntreeForCuve={(cid) => openEntree(cid)}
            settings={settings}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsManager
            clients={clients}
            clientBalances={clientBalances}
            cuves={cuves}
            mouvements={mouvements}
            onAddClient={handleAddClient}
            onDeleteClient={handleDeleteClient}
            onToggleClientActive={handleToggleClientActive}
            onOpenEntreeForClient={(clid) => openEntree(undefined, clid)}
            onOpenSortieForClient={(clid) => openSortie(clid)}
            onPrintBon={(m) => openReceipt(m, true)}
            settings={settings}
          />
        )}

        {activeTab === 'historique' && (
          <HistoryAudit
            mouvements={mouvements}
            clients={clients}
            cuves={cuves}
            auditLogs={auditLogs}
            currentUser={currentUser}
            onAnnulerMouvement={handleAnnulerMouvement}
            onPrintBon={(m) => openReceipt(m, true)}
            settings={settings}
          />
        )}

        {activeTab === 'rapports' && (
          <ReportsManager
            cuvesDetails={cuvesDetails}
            cuves={cuves}
            clients={clients}
            mouvements={mouvements}
            onPrintBon={(m) => openReceipt(m, true)}
            settings={settings}
          />
        )}

        {activeTab === 'sauvegardes' && (
          <BackupManager
            backups={backups}
            onCreateBackup={(desc) => {
              const b = dbService.createAutomaticSnapshot(desc);
              refreshState();
              return b;
            }}
            onRestoreSnapshot={handleRestoreSnapshot}
            onRestoreJSON={handleRestoreJSON}
            onExportSQLiteScript={() => dbService.genererExportSQLiteSQL()}
            onResetData={() => {
              // Réinitialiser
              refreshState();
            }}
            settings={settings}
          />
        )}

        {activeTab === 'tests' && (
          <AutomatedTestSuite />
        )}

        {activeTab === 'windows' && (
          <WindowsDesktopCode />
        )}

      </main>

      {/* 4. Pied de Page Pro & Statut Système */}
      <footer className="no-print bg-stone-900 text-stone-400 border-t border-stone-800 text-xs py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-bold text-stone-200">{settings.nomEntreprise}</span> &bull; {settings.sousTitreArabe} &bull; Logiciel de Gestion Cuverie v1.0
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              Contrôles de capacité stricts actifs
            </span>
            <span className="text-stone-500">|</span>
            <span>Unité officielle : Litres ({settings.unite})</span>
            <span className="text-stone-500">|</span>
            <span className="font-mono text-stone-400">Transactions Atomiques SQLite</span>
          </div>
        </div>
      </footer>

      {/* 5. Modales du Système */}

      {/* Modale d'Entrée (Réception) */}
      <MovementEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        cuvesDetails={cuvesDetails}
        clients={clients}
        initialCuveId={preSelectedCuveId}
        initialClientId={preSelectedClientId}
        currentUser={currentUser}
        onSubmit={async (params) => {
          const mouv = await dbService.enregistrerEntree(params);
          refreshState();
          return mouv;
        }}
        onOpenReceipt={(m) => openReceipt(m, false)}
        settings={settings}
      />

      {/* Modale de Sortie (Livraison / Retrait) */}
      <MovementExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        cuvesDetails={cuvesDetails}
        clients={clients}
        clientBalances={clientBalances}
        initialClientId={preSelectedClientId}
        currentUser={currentUser}
        onSubmit={async (params) => {
          const mouv = await dbService.enregistrerSortie(params);
          refreshState();
          return mouv;
        }}
        onOpenReceipt={(m) => openReceipt(m, false)}
        settings={settings}
      />

      {/* Modale de Transfert Inter-Cuves */}
      <MovementTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        cuvesDetails={cuvesDetails}
        clients={clients}
        clientBalances={clientBalances}
        initialCuveSourceId={preSelectedCuveId}
        currentUser={currentUser}
        onSubmit={async (params) => {
          const res = await dbService.enregistrerTransfert(params);
          refreshState();
          return res;
        }}
        onOpenReceipt={(m) => openReceipt(m, false)}
        settings={settings}
      />

      {/* Modale Bon d'Impression A4 Officiel */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        movement={receiptMovement}
        clients={clients}
        cuves={cuves}
        settings={settings}
        isDuplicate={isDuplicateReceipt}
      />

      {/* Modale des Paramètres */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Barre de Navigation et Tiroir Spécifique Smartphone */}
      <MobileNavigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenEntree={() => openEntree()}
        onOpenSortie={() => openSortie()}
        onOpenTransfert={() => openTransfert()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onQuickBackup={handleQuickBackup}
        settings={settings}
        cuvesCount={cuves.length}
        clientsCount={clients.length}
        mouvementsCount={mouvements.length}
      />

      {/* Notification Toast de Synchronisation Intelligente */}
      {refreshToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
          refreshToast.type === 'success'
            ? 'bg-emerald-950 text-emerald-100 border-emerald-600/80'
            : 'bg-stone-900 text-stone-100 border-stone-700'
        }`}>
          <CheckCircle className={`w-4 h-4 shrink-0 ${refreshToast.type === 'success' ? 'text-emerald-400' : 'text-sky-400'}`} />
          <span>{refreshToast.message}</span>
        </div>
      )}

    </div>
  );
}
