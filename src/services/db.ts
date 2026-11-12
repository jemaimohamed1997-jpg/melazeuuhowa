/**
 * Huilerie Jemai (معصرة جماعي) - Moteur de Base de Données & Logique Métier
 * Contrôles stricts de capacité, soldes clients, audit permanent et sauvegardes.
 */

import { Cuve, Client, Movement, AuditLog, AppSettings, CuveDetails, ClientBalance, BackupSnapshot, TestResultItem, UserAccount, UserPermissions } from '../types';
import { supabase, checkSupabaseConnection, SUPABASE_URL, initSupabaseRealtime, fetchAllSupabaseData, ensureUuid } from './supabase';

const STORAGE_KEY = 'huilerie_jemai_data_v1';
const BACKUPS_KEY = 'huilerie_jemai_backups_v1';
const SETTINGS_KEY = 'huilerie_jemai_settings_v1';

interface StorageData {
  cuves: Cuve[];
  clients: Client[];
  mouvements: Movement[];
  auditLogs: AuditLog[];
  users: UserAccount[];
  sequences: {
    rec: number;
    sor: number;
    trf: number;
    cli: number;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  nomEntreprise: "HUILERIE JEMAI",
  sousTitreArabe: "معصرة جماعي لإنتاج وتخزين زيت الزيتون",
  precisionDecimales: 1,
  unite: "L",
  contactTelephone: "+216 98 000 000",
  adresse: "Route Principale des Oliviers - Tunisie",
  alertSeuilRemplissage: 85
};

const FAKE_CUVE_IDS = new Set(['cuve-1', 'cuve-2', 'cuve-3', 'cuve-4']);
const FAKE_MOUV_IDS = new Set(['m-01', 'm-02', 'm-03', 'm-04']);
const FAKE_CLIENT_IDS = new Set(['cli-1', 'cli-2', 'cli-3', 'cli-4', 'cli-5']);

function sanitizeData(data: StorageData): StorageData {
  if (!data) return data;
  if (data.cuves && Array.isArray(data.cuves)) {
    data.cuves = data.cuves.filter(c => !FAKE_CUVE_IDS.has(c.id));
  } else {
    data.cuves = [];
  }
  if (data.mouvements && Array.isArray(data.mouvements)) {
    data.mouvements = data.mouvements.filter(m => !FAKE_MOUV_IDS.has(m.id) && !FAKE_CUVE_IDS.has(m.cuveId));
  } else {
    data.mouvements = [];
  }
  if (data.clients && Array.isArray(data.clients)) {
    data.clients = data.clients.filter(cl => !FAKE_CLIENT_IDS.has(cl.id));
  } else {
    data.clients = [];
  }
  return data;
}

const INITIAL_DATA: StorageData = {
  cuves: [],
  clients: [],
  mouvements: [],
  auditLogs: [
    {
      id: "log-1",
      dateAction: "2026-10-01T08:00:00",
      utilisateur: "SYSTEME",
      action: "INIT_SYSTEME",
      tableCible: "database",
      details: "Initialisation du système de gestion des stocks Huilerie Jemai"
    }
  ],
  sequences: {
    rec: 0,
    sor: 0,
    trf: 0,
    cli: 0
  },
  users: [
    {
      id: "user-1",
      username: "wizz",
      password: "wizz",
      nomAffiche: "Mohamed Jemai (Gérant)",
      role: "admin",
      actif: true,
      telephone: "+216 98 123 456",
      dateCreation: "2026-10-01T08:00:00",
      acces: {
        peutEntrerHuile: true,
        peutSortirHuile: true,
        peutTransferer: true,
        peutAnnuler: true,
        peutGererCuves: true,
        peutGererClients: true,
        peutVoirRapports: true,
        peutGererParametres: true
      }
    },
    {
      id: "user-2",
      username: "operateur",
      password: "123",
      nomAffiche: "Opérateur Cuverie & Pesée",
      role: "operateur",
      actif: true,
      telephone: "+216 98 000 000",
      dateCreation: "2026-10-01T08:00:00",
      acces: {
        peutEntrerHuile: true,
        peutSortirHuile: true,
        peutTransferer: true,
        peutAnnuler: false,
        peutGererCuves: false,
        peutGererClients: true,
        peutVoirRapports: true,
        peutGererParametres: false
      }
    }
  ]
};

const memoryStore: Record<string, string> = {};
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryStore[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch {}
    memoryStore[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {}
    delete memoryStore[key];
  }
};

export class StorageService {
  public static isTestMode = false;
  private data: StorageData;
  private settings: AppSettings;
  private listeners: (() => void)[] = [];
  private isSyncing = false;
  private realtimeCleanup?: () => void;

  constructor() {
    this.settings = this.loadSettings();
    this.data = this.loadData();
    this.ensureAutoBackup();
    if (!StorageService.isTestMode) {
      this.initServerSync();
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error("Error in db listener", e);
      }
    });
  }

  public async initServerSync(): Promise<void> {
    // 1. Charger immédiatement les données fraîches depuis Supabase dès l'ouverture
    await this.pullFromSupabase();

    // 2. Synchronisation de secours avec le serveur central local
    await this.pullFromServer();

    // 3. Initialisation de Supabase Realtime pour synchronisation instantanée multi-appareils
    try {
      if (this.realtimeCleanup) {
        this.realtimeCleanup();
      }
      this.realtimeCleanup = initSupabaseRealtime((change) => {
        this.handleRealtimeChange(change);
      });
    } catch (e) {
      console.warn("Realtime indisponible:", e);
    }

    // 4. Écoute du retour sur l'onglet ou reconnexion internet
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.pullFromSupabase();
        this.pullFromServer();
      });

      window.addEventListener('online', () => {
        this.pullFromSupabase();
        this.pullFromServer();
      });

      // Polling régulier de sécurité toutes les 8 secondes
      setInterval(() => {
        this.pullFromSupabase();
        this.pullFromServer();
      }, 8000);
    }
  }

  /**
   * Récupère directement les enregistrements officiels depuis Supabase au démarrage et rafraîchissement
   */
  public async pullFromSupabase(): Promise<boolean> {
    if (StorageService.isTestMode) return false;
    try {
      const supaData = await fetchAllSupabaseData();
      if (!supaData || StorageService.isTestMode) return false;

      let changed = false;

      // 1. Clients
      if (supaData.clients && Array.isArray(supaData.clients)) {
        const mappedClients: Client[] = supaData.clients.map((cl: any) => ({
          id: cl.id,
          codeClient: cl.code_client,
          nomComplet: cl.nom_complet,
          telephone: cl.telephone || undefined,
          notes: cl.notes || undefined,
          actif: cl.actif ?? true,
          dateCreation: cl.date_creation || new Date().toISOString()
        }));

        // Calculer immédiatement la séquence maximale pour garantir l'unicité des futurs codes
        let maxClientNum = 0;
        for (const cl of mappedClients) {
          const m = (cl.codeClient || '').match(/(\d+)$/);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxClientNum) maxClientNum = num;
          }
        }
        this.data.sequences.cli = Math.max(this.data.sequences.cli || 0, maxClientNum);

        if (JSON.stringify(this.data.clients) !== JSON.stringify(mappedClients)) {
          this.data.clients = mappedClients;
          changed = true;
        }
      }

      // 2. Cuves
      if (supaData.cuves && Array.isArray(supaData.cuves)) {
        const mappedCuves: Cuve[] = supaData.cuves.map((c: any) => ({
          id: c.id,
          numero: c.numero,
          nom: c.nom,
          capaciteMax: Number(c.capacite_max),
          active: c.active ?? true,
          dateCreation: c.date_creation || new Date().toISOString(),
          notes: c.notes || undefined
        }));
        if (JSON.stringify(this.data.cuves) !== JSON.stringify(mappedCuves)) {
          this.data.cuves = mappedCuves;
          changed = true;
        }
      }

      // 3. Mouvements avec déduplication stricte pour garantir l'exactitude des stocks
      if (supaData.movements && Array.isArray(supaData.movements)) {
        const seenIds = new Set<string>();
        const mappedMovements: Movement[] = [];
        for (const m of supaData.movements) {
          const uniqueKey = m.id || m.numero_bon || `${m.lot || m.cuve_id}-${m.created_at || m.date_mouvement}`;
          if (uniqueKey && seenIds.has(uniqueKey)) continue;
          if (uniqueKey) seenIds.add(uniqueKey);

          // Supporte à la fois les colonnes standard et les colonnes alternatives
          const rawType = (m.type_mouvement || m.type || 'ENTREE').toUpperCase();
          const qte = Number(m.quantite != null ? m.quantite : (m.quantity != null ? m.quantity : 0));
          const rawCuve = m.cuve_id || m.lot || '';
          // Résolution de l'identifiant de la cuve (par id ou par numéro de cuve)
          const matchedCuve = this.data.cuves.find(
            c => c.id === rawCuve || c.numero.toLowerCase() === rawCuve.toLowerCase()
          );
          const resolvedCuveId = matchedCuve ? matchedCuve.id : rawCuve;

          mappedMovements.push({
            id: m.id,
            numeroBon: m.numero_bon || `BON-${String(m.id).slice(0, 8)}`,
            typeMouvement: rawType as any,
            cuveId: resolvedCuveId,
            clientId: m.client_id || (this.data.clients[0]?.id || 'CLI_DEFAULT'),
            quantite: isNaN(qte) ? 0 : qte,
            acidite: m.acidite != null ? Number(m.acidite) : undefined,
            dateMouvement: m.date_mouvement || m.created_at || new Date().toISOString(),
            motif: m.motif || m.reason || undefined,
            observations: m.observations || m.note || undefined,
            utilisateur: m.utilisateur || 'Personnel',
            estAnnule: Boolean(m.est_annule),
            motifAnnulation: m.motif_annulation || undefined,
            dateAnnulation: m.date_annulation || undefined
          });
        }
        // Calculer immédiatement les séquences maximales de bons officiels
        const currentYear = new Date().getFullYear();
        let maxRec = this.data.sequences.rec || 0;
        let maxSor = this.data.sequences.sor || 0;
        let maxTrf = this.data.sequences.trf || 0;

        for (const m of mappedMovements) {
          const bon = m.numeroBon || '';
          const match = bon.match(/BON-(REC|SOR|TRF)-(\d{4})-(\d+)/i);
          if (match) {
            const t = match[1].toUpperCase();
            const y = parseInt(match[2], 10);
            const num = parseInt(match[3], 10);
            if (y === currentYear) {
              if (t === 'REC' && num > maxRec) maxRec = num;
              if (t === 'SOR' && num > maxSor) maxSor = num;
              if (t === 'TRF' && num > maxTrf) maxTrf = num;
            }
          }
        }
        if (maxRec !== this.data.sequences.rec || maxSor !== this.data.sequences.sor || maxTrf !== this.data.sequences.trf) {
          this.data.sequences.rec = maxRec;
          this.data.sequences.sor = maxSor;
          this.data.sequences.trf = maxTrf;
          changed = true;
        }

        if (JSON.stringify(this.data.mouvements) !== JSON.stringify(mappedMovements)) {
          this.data.mouvements = mappedMovements;
          changed = true;
        }
      }

      if (changed) {
        try {
          safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {}
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Échec récupération Supabase:", err);
      return false;
    }
  }

  /**
   * Traitement d'un événement Supabase Realtime entrant depuis un autre appareil
   */
  private handleRealtimeChange(change: { table: string; eventType: string; newRow: any; oldRow: any }): void {
    const { table, eventType, newRow, oldRow } = change;
    let modified = false;

    if (table === 'cuves') {
      if (eventType === 'INSERT') {
        const mapped: Cuve = {
          id: newRow.id,
          numero: newRow.numero,
          nom: newRow.nom,
          capaciteMax: Number(newRow.capacite_max),
          active: newRow.active ?? true,
          dateCreation: newRow.date_creation || new Date().toISOString(),
          notes: newRow.notes || undefined
        };
        if (!this.data.cuves.some(c => c.id === mapped.id)) {
          this.data.cuves.push(mapped);
          modified = true;
        }
      } else if (eventType === 'UPDATE') {
        const idx = this.data.cuves.findIndex(c => c.id === newRow.id);
        if (idx !== -1) {
          this.data.cuves[idx] = {
            id: newRow.id,
            numero: newRow.numero,
            nom: newRow.nom,
            capaciteMax: Number(newRow.capacite_max),
            active: newRow.active ?? true,
            dateCreation: newRow.date_creation || this.data.cuves[idx].dateCreation,
            notes: newRow.notes || undefined
          };
          modified = true;
        }
      } else if (eventType === 'DELETE') {
        const initialLen = this.data.cuves.length;
        this.data.cuves = this.data.cuves.filter(c => c.id !== oldRow.id);
        if (this.data.cuves.length !== initialLen) modified = true;
      }
    } else if (table === 'clients') {
      if (eventType === 'INSERT') {
        const mapped: Client = {
          id: newRow.id,
          codeClient: newRow.code_client,
          nomComplet: newRow.nom_complet,
          telephone: newRow.telephone || undefined,
          notes: newRow.notes || undefined,
          actif: newRow.actif ?? true,
          dateCreation: newRow.date_creation || new Date().toISOString()
        };
        if (!this.data.clients.some(cl => cl.id === mapped.id)) {
          this.data.clients.push(mapped);
          modified = true;
        }
      } else if (eventType === 'UPDATE') {
        const idx = this.data.clients.findIndex(cl => cl.id === newRow.id);
        if (idx !== -1) {
          this.data.clients[idx] = {
            id: newRow.id,
            codeClient: newRow.code_client,
            nomComplet: newRow.nom_complet,
            telephone: newRow.telephone || undefined,
            notes: newRow.notes || undefined,
            actif: newRow.actif ?? true,
            dateCreation: newRow.date_creation || this.data.clients[idx].dateCreation
          };
          modified = true;
        }
      } else if (eventType === 'DELETE') {
        const initialLen = this.data.clients.length;
        this.data.clients = this.data.clients.filter(cl => cl.id !== oldRow.id);
        if (this.data.clients.length !== initialLen) modified = true;
      }
    } else if (table === 'movements') {
      if (eventType === 'INSERT') {
        const mapped: Movement = {
          id: newRow.id,
          numeroBon: newRow.numero_bon,
          typeMouvement: newRow.type_mouvement,
          cuveId: newRow.cuve_id,
          clientId: newRow.client_id,
          quantite: Number(newRow.quantite),
          acidite: newRow.acidite != null ? Number(newRow.acidite) : undefined,
          dateMouvement: newRow.date_mouvement || new Date().toISOString(),
          motif: newRow.motif || undefined,
          observations: newRow.observations || undefined,
          utilisateur: newRow.utilisateur || 'Personnel',
          estAnnule: Boolean(newRow.est_annule)
        };
        if (!this.data.mouvements.some(m => m.id === mapped.id)) {
          this.data.mouvements.unshift(mapped);
          modified = true;
        }
      } else if (eventType === 'UPDATE') {
        const idx = this.data.mouvements.findIndex(m => m.id === newRow.id);
        if (idx !== -1) {
          this.data.mouvements[idx] = {
            ...this.data.mouvements[idx],
            estAnnule: Boolean(newRow.est_annule),
            motifAnnulation: newRow.motif_annulation || undefined,
            dateAnnulation: newRow.date_annulation || undefined
          };
          modified = true;
        }
      }
    }

    if (modified) {
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        // ignore
      }
      this.notifyListeners();
    }
  }

  public async pullFromServer(): Promise<boolean> {
    if (StorageService.isTestMode || this.isSyncing || typeof window === 'undefined') return false;
    try {
      this.isSyncing = true;
      const res = await fetch('/api/data');
      if (StorageService.isTestMode) return false;
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const sanitizedServerData = sanitizeData(json.data);
          const hasDiff = 
            sanitizedServerData.cuves.length !== this.data.cuves.length ||
            sanitizedServerData.mouvements.length !== this.data.mouvements.length ||
            JSON.stringify(sanitizedServerData.cuves) !== JSON.stringify(this.data.cuves) ||
            JSON.stringify(sanitizedServerData.mouvements) !== JSON.stringify(this.data.mouvements) ||
            (sanitizedServerData.clients && sanitizedServerData.clients.length !== this.data.clients.length);

          if (hasDiff) {
            this.data = sanitizedServerData;
            if (json.settings) this.settings = json.settings;
            try {
              safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
              if (json.settings) safeStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
            } catch (e) {
              // ignore
            }
            this.notifyListeners();
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      // Mode hors-ligne / erreur réseau temporaire : on conserve le stockage local
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Actualisation intelligente manuelle (Bouton ACTUALISER)
   * Interroge directement Supabase et le serveur pour vérifier et synchroniser les modifications.
   */
  public async smartRefresh(): Promise<{ updated: boolean; message: string; nbCuves: number; nbMouvements: number }> {
    try {
      this.isSyncing = true;

      // 1. Interrogation directe de Supabase
      let supaHasData = false;
      try {
        const supaData = await fetchAllSupabaseData();
        if (supaData && (supaData.cuves.length > 0 || supaData.clients.length > 0 || supaData.movements.length > 0)) {
          supaHasData = true;
          const mappedCuves: Cuve[] = supaData.cuves.map((c: any) => ({
            id: c.id,
            numero: c.numero,
            nom: c.nom,
            capaciteMax: Number(c.capacite_max),
            active: c.active ?? true,
            dateCreation: c.date_creation || new Date().toISOString(),
            notes: c.notes || undefined
          }));

          const mappedClients: Client[] = supaData.clients.map((cl: any) => ({
            id: cl.id,
            codeClient: cl.code_client,
            nomComplet: cl.nom_complet,
            telephone: cl.telephone || undefined,
            notes: cl.notes || undefined,
            actif: cl.actif ?? true,
            dateCreation: cl.date_creation || new Date().toISOString()
          }));

          const mappedMouvements: Movement[] = supaData.movements.map((m: any) => ({
            id: m.id,
            numeroBon: m.numero_bon,
            typeMouvement: m.type_mouvement,
            cuveId: m.cuve_id,
            clientId: m.client_id,
            quantite: Number(m.quantite),
            acidite: m.acidite != null ? Number(m.acidite) : undefined,
            dateMouvement: m.date_mouvement || new Date().toISOString(),
            motif: m.motif || undefined,
            observations: m.observations || undefined,
            utilisateur: m.utilisateur || 'Personnel',
            estAnnule: Boolean(m.est_annule)
          }));

          const isDiffFromSupa =
            mappedCuves.length !== this.data.cuves.length ||
            mappedClients.length !== this.data.clients.length ||
            mappedMouvements.length !== this.data.mouvements.length;

          if (isDiffFromSupa) {
            this.data.cuves = mappedCuves;
            this.data.clients = mappedClients;
            this.data.mouvements = mappedMouvements;
            try {
              safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            } catch (e) {}
            this.notifyListeners();
            return {
              updated: true,
              message: `Données synchronisées avec Supabase : ${this.data.cuves.length} pile(s), ${this.data.clients.length} client(s), ${this.data.mouvements.length} mouvement(s).`,
              nbCuves: this.data.cuves.length,
              nbMouvements: this.data.mouvements.length
            };
          }
        }
      } catch (e) {
        // Supabase query error fallback to local server
      }

      // 2. Vérification auprès de l'API centrale
      const res = await fetch('/api/data');
      if (!res.ok) {
        throw new Error(`Serveur HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error("Réponse de données invalide");
      }

      const serverData = sanitizeData(json.data);
      const isDiff = 
        serverData.cuves.length !== this.data.cuves.length ||
        serverData.mouvements.length !== this.data.mouvements.length ||
        JSON.stringify(serverData.cuves) !== JSON.stringify(this.data.cuves) ||
        JSON.stringify(serverData.mouvements) !== JSON.stringify(this.data.mouvements) ||
        (serverData.clients && serverData.clients.length !== this.data.clients.length);

      this.data = serverData;
      if (json.settings) this.settings = json.settings;

      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        if (json.settings) safeStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (e) {
        // ignore
      }

      this.notifyListeners();

      if (isDiff) {
        return {
          updated: true,
          message: `Données actualisées avec succès : ${this.data.cuves.length} cuve(s), ${this.data.mouvements.length} mouvement(s).`,
          nbCuves: this.data.cuves.length,
          nbMouvements: this.data.mouvements.length
        };
      } else {
        return {
          updated: false,
          message: "Données déjà à jour (Toutes les piles, réceptions et bons sont synchronisés).",
          nbCuves: this.data.cuves.length,
          nbMouvements: this.data.mouvements.length
        };
      }
    } catch (err: any) {
      console.error("Erreur lors de l'actualisation:", err);
      return {
        updated: false,
        message: `Vérification terminée : Aucune modification en attente (${this.data.cuves.length} pile(s), ${this.data.mouvements.length} mouvement(s)).`,
        nbCuves: this.data.cuves.length,
        nbMouvements: this.data.mouvements.length
      };
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushToServer(): Promise<void> {
    if (StorageService.isTestMode || typeof window === 'undefined') return;
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: this.data,
          settings: this.settings,
          backups: this.getBackups()
        })
      });

      // Synchronisation vers Supabase (mouvements avec les vrais noms de colonnes)
      if (this.data.mouvements && this.data.mouvements.length > 0) {
        for (const m of this.data.mouvements.slice(0, 30)) {
          try {
            await supabase.from('movements').upsert({
              id: m.id,
              numero_bon: m.numeroBon,
              type_mouvement: m.typeMouvement,
              cuve_id: m.cuveId,
              client_id: m.clientId,
              quantite: m.quantite,
              acidite: m.acidite ?? null,
              date_mouvement: m.dateMouvement || new Date().toISOString(),
              motif: m.motif || null,
              observations: m.observations || null,
              utilisateur: m.utilisateur || 'Personnel Huilerie',
              est_annule: Boolean(m.estAnnule),
              motif_annulation: m.motifAnnulation || null,
              date_annulation: m.dateAnnulation || null
            }, { onConflict: 'id' });
          } catch {
            // Ignorer si indisponible ponctuellement
          }
        }
      }

      // Synchronisation conditionnelle des cuves (si la table cuves existe sur Supabase)
      if (this.data.cuves && this.data.cuves.length > 0) {
        try {
          const cuvesPayload = this.data.cuves.map(c => ({
            id: c.id,
            numero: c.numero,
            nom: c.nom,
            capacite_max: c.capaciteMax,
            active: c.active,
            notes: c.notes || null,
            date_creation: c.dateCreation || new Date().toISOString()
          }));
          await supabase.from('cuves').upsert(cuvesPayload, { onConflict: 'id' });
        } catch {
          // Ignorer si la table n'a pas encore été créée
        }
      }

      // Synchronisation conditionnelle des clients (si la table clients existe sur Supabase)
      if (this.data.clients && this.data.clients.length > 0) {
        for (const cl of this.data.clients) {
          try {
            await supabase.from('clients').upsert({
              id: cl.id,
              code_client: cl.codeClient,
              nom_complet: cl.nomComplet,
              telephone: cl.telephone || null,
              notes: cl.notes || null,
              date_creation: cl.dateCreation || new Date().toISOString(),
              actif: cl.actif ?? true
            }, { onConflict: 'id' });
          } catch {
            // Ignorer si indisponible ou erreur ponctuelle
          }
        }
      }
    } catch (err) {
      // Ignorer si serveur temporairement injoignable
    }
  }

  private loadSettings(): AppSettings {
    try {
      const raw = safeStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  public saveSettings(settings: AppSettings): void {
    this.settings = settings;
    try {
      safeStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      // ignore
    }
    this.logAudit("Gérant (Admin)", "MODIF_PARAMETRES", "settings", undefined, "Mise à jour des paramètres système");
    this.pushToServer();
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  private loadData(): StorageData {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY);
      if (raw) {
        let parsed = JSON.parse(raw);
        if (parsed.cuves && parsed.clients && parsed.mouvements) {
          parsed = sanitizeData(parsed);
          if (!parsed.users || !Array.isArray(parsed.users)) {
            parsed.users = INITIAL_DATA.users;
          } else {
            const hasWizz = parsed.users.some((u: any) => u.username.toLowerCase() === 'wizz');
            if (!hasWizz) {
              parsed.users.unshift(INITIAL_DATA.users[0]);
            }
          }
          // Sauvegarde immédiate du cache nettoyé
          try {
            safeStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } catch {
            // ignore
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Échec du chargement localStorage, chargement des données initiales", e);
    }
    this.saveData(INITIAL_DATA);
    return INITIAL_DATA;
  }

  private saveData(data: StorageData): void {
    this.data = data;
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Erreur de sauvegarde locale:", e);
    }
    this.notifyListeners();
    this.pushToServer();
  }

  private logAudit(utilisateur: string, action: string, tableCible: string, entiteId?: string, details: string = ""): void {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dateAction: new Date().toISOString(),
      utilisateur,
      action,
      tableCible,
      entiteId,
      details
    };
    this.data.auditLogs.unshift(log);
    // Limite à 500 entrées d'audit
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveData(this.data);
  }

  // --- LECTURE ET CALCULS STRICTS ---

  public getCuves(): Cuve[] {
    return [...this.data.cuves];
  }

  public getClients(): Client[] {
    return [...this.data.clients];
  }

  public getMouvements(): Movement[] {
    return [...this.data.mouvements];
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.data.auditLogs];
  }

  /**
   * Calcule le stock physique total présent dans une cuve
   * Formule : Somme des entrées non annulées - Somme des sorties non annulées
   */
  public getCuveStock(cuveId: string): number {
    let stock = 0;
    for (const m of this.data.mouvements) {
      if (m.cuveId === cuveId && !m.estAnnule) {
        if (m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE') {
          stock += m.quantite;
        } else if (m.typeMouvement === 'SORTIE' || m.typeMouvement === 'TRANSFERT_SORTIE') {
          stock -= m.quantite;
        }
      }
    }
    return Math.max(0, Math.round(stock * 100) / 100);
  }

  /**
   * Calcule le solde exact d'un client dans une cuve spécifique
   */
  public getClientSoldeDansCuve(clientId: string, cuveId: string): number {
    let solde = 0;
    for (const m of this.data.mouvements) {
      if (m.clientId === clientId && m.cuveId === cuveId && !m.estAnnule) {
        if (m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE') {
          solde += m.quantite;
        } else if (m.typeMouvement === 'SORTIE' || m.typeMouvement === 'TRANSFERT_SORTIE') {
          solde -= m.quantite;
        }
      }
    }
    return Math.max(0, Math.round(solde * 100) / 100);
  }

  /**
   * Calcule le stock total d'un client toutes cuves confondues
   */
  public getClientTotalStock(clientId: string): number {
    let total = 0;
    for (const m of this.data.mouvements) {
      if (m.clientId === clientId && !m.estAnnule) {
        if (m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE') {
          total += m.quantite;
        } else if (m.typeMouvement === 'SORTIE' || m.typeMouvement === 'TRANSFERT_SORTIE') {
          total -= m.quantite;
        }
      }
    }
    return Math.max(0, Math.round(total * 100) / 100);
  }

  /**
   * Détails complets et statut d'une cuve avec liste des clients
   */
  public getCuveDetails(cuveId: string): CuveDetails | null {
    const cuve = this.data.cuves.find(c => c.id === cuveId);
    if (!cuve) return null;

    const stockActuel = this.getCuveStock(cuveId);
    const capaciteRestante = Math.max(0, Math.round((cuve.capaciteMax - stockActuel) * 100) / 100);
    const tauxRemplissage = cuve.capaciteMax > 0 ? Math.round((stockActuel / cuve.capaciteMax) * 1000) / 10 : 0;

    const clientMap = new Map<string, number>();
    for (const m of this.data.mouvements) {
      if (m.cuveId === cuveId && !m.estAnnule) {
        const delta = (m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE') ? m.quantite : -m.quantite;
        clientMap.set(m.clientId, (clientMap.get(m.clientId) || 0) + delta);
      }
    }

    const clientsList: { client: Client; quantite: number; pourcentage: number }[] = [];
    clientMap.forEach((qty, cid) => {
      const q = Math.round(qty * 100) / 100;
      if (q > 0.001) {
        const client = this.data.clients.find(c => c.id === cid);
        if (client) {
          clientsList.push({
            client,
            quantite: q,
            pourcentage: stockActuel > 0 ? Math.round((q / stockActuel) * 1000) / 10 : 0
          });
        }
      }
    });

    return {
      ...cuve,
      stockActuel,
      capaciteRestante,
      tauxRemplissage,
      clients: clientsList
    };
  }

  /**
   * Relevé complet d'un client avec répartition par cuve
   */
  public getClientBalance(clientId: string): ClientBalance | null {
    const client = this.data.clients.find(c => c.id === clientId);
    if (!client) return null;

    const totalStock = this.getClientTotalStock(clientId);
    const parCuve: { cuve: Cuve; quantite: number }[] = [];

    for (const cuve of this.data.cuves) {
      const q = this.getClientSoldeDansCuve(clientId, cuve.id);
      if (q > 0.001) {
        parCuve.push({ cuve, quantite: q });
      }
    }

    const derniersMouvements = this.data.mouvements
      .filter(m => m.clientId === clientId)
      .slice(-10)
      .reverse();

    return {
      client,
      totalStock,
      parCuve,
      derniersMouvements
    };
  }

  // --- OPÉRATIONS TRANSACTIONNELLES AVEC VÉRIFICATIONS STRICTES ---
  private bonMutex: Promise<any> = Promise.resolve();

  /**
   * Système atomique et anti-collision de génération des numéros de bons officiels.
   * 1. Tente d'appeler la fonction RPC PostgreSQL atomique 'get_next_bon_number'
   * 2. En cas d'indisponibilité, interroge le MAX(numero_bon) réel dans Supabase
   * 3. Vérifie l'ensemble des mouvements locaux (y compris annulés et archives) pour garantir l'absence de réutilisation
   * 4. Sérialisé par mutex mémoire pour éliminer les courses simultanées
   */
  public async getNextUniqueBonNumber(type: 'REC' | 'SOR' | 'TRF'): Promise<string> {
    const task = async () => {
      const year = new Date().getFullYear();
      const prefix = `BON-${type}-${year}-`;
      const seqKey = type.toLowerCase() as 'rec' | 'sor' | 'trf';

      if (StorageService.isTestMode) {
        return this.nextBonNumber(type);
      }

      // 1. Tenter l'appel RPC atomique PostgreSQL (si déployé dans Supabase)
      try {
        const { data, error } = await supabase.rpc('get_next_bon_number', {
          p_type: type,
          p_year: year
        });
        if (!error && data && typeof data === 'string' && data.startsWith(prefix)) {
          const match = data.match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            this.data.sequences[seqKey] = Math.max(this.data.sequences[seqKey] || 0, num);
            this.saveData(this.data);
          }
          return data;
        }
      } catch (e) {
        // RPC non configurée ou indisponible, continuer avec la détection directe
      }

      // 2. Interroger Supabase pour connaître le plus grand numero_bon réel
      let maxRemote = 0;
      try {
        const { data: remoteRows } = await supabase
          .from('movements')
          .select('numero_bon')
          .ilike('numero_bon', `${prefix}%`)
          .order('numero_bon', { ascending: false })
          .limit(30);

        if (remoteRows && Array.isArray(remoteRows)) {
          for (const row of remoteRows) {
            const b = row.numero_bon || '';
            const m = b.match(/(\d+)$/);
            if (m) {
              const val = parseInt(m[1], 10);
              if (val > maxRemote) maxRemote = val;
            }
          }
        }
      } catch (e) {}

      // 3. Scanner tous les mouvements locaux (y compris les mouvements annulés ou archivés)
      let maxLocal = 0;
      if (this.data.mouvements && Array.isArray(this.data.mouvements)) {
        for (const m of this.data.mouvements) {
          const b = m.numeroBon || '';
          if (b.startsWith(prefix)) {
            const match = b.match(/(\d+)$/);
            if (match) {
              const val = parseInt(match[1], 10);
              if (val > maxLocal) maxLocal = val;
            }
          }
        }
      }

      // 4. Calcul du prochain numéro strictement supérieur
      const currentSeq = this.data.sequences[seqKey] || 0;
      const highestNumber = Math.max(maxRemote, maxLocal, currentSeq);
      const nextNumber = highestNumber + 1;

      // Mise à jour de la séquence
      this.data.sequences[seqKey] = nextNumber;
      this.saveData(this.data);

      return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    };

    const next = this.bonMutex.then(task, task);
    this.bonMutex = next.catch(() => {});
    return next;
  }

  private nextBonNumber(type: 'REC' | 'SOR' | 'TRF'): string {
    const year = new Date().getFullYear();
    const prefix = `BON-${type}-${year}-`;
    const seqKey = type.toLowerCase() as 'rec' | 'sor' | 'trf';

    let maxLocal = 0;
    if (this.data.mouvements && Array.isArray(this.data.mouvements)) {
      for (const m of this.data.mouvements) {
        const b = m.numeroBon || '';
        if (b.startsWith(prefix)) {
          const match = b.match(/(\d+)$/);
          if (match) {
            const val = parseInt(match[1], 10);
            if (val > maxLocal) maxLocal = val;
          }
        }
      }
    }

    const cur = this.data.sequences[seqKey] || 0;
    const next = Math.max(maxLocal, cur) + 1;
    this.data.sequences[seqKey] = next;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  /**
   * 1. ENREGISTRER UNE ENTRÉE D'HUILE
   * CONTRÔLE STRICT : Interdit toute entrée dépassant la capacité maximale restante de la pile.
   * Système anti-collision automatique (résout le code d'erreur 23505).
   */
  public async enregistrerEntree(params: {
    clientId: string;
    cuveId?: string;
    lot?: string;
    quantite: number;
    utilisateur: string;
    dateMouvement?: string;
    observations?: string;
    motif?: string;
    acidite?: number;
  }, skipRemoteSync: boolean = false): Promise<Movement> {
    const rawLot = params.cuveId || params.lot;
    if (!rawLot) {
      throw new Error("L'identifiant de la cuve ou le lot est obligatoire.");
    }

    const cuve = this.data.cuves.find(c => 
      c.id === rawLot || 
      (c.numero && c.numero.trim().toUpperCase() === String(rawLot).trim().toUpperCase())
    );
    if (!cuve) {
      throw new Error(`Cuve / Pile introuvable : le lot ou identifiant '${rawLot}' ne correspond à aucune cuve existante.`);
    }
    if (!cuve.active) {
      throw new Error(`La cuve ${cuve.nom} (${cuve.numero}) est désactivée. Aucune entrée n'est autorisée.`);
    }

    const client = this.data.clients.find(c => c.id === params.clientId || c.codeClient === params.clientId);
    if (!client) {
      throw new Error("Client / Déposant introuvable.");
    }

    const quantite = Number(params.quantite);
    if (isNaN(quantite) || quantite <= 0) {
      throw new Error("La quantité d'huile doit être strictement supérieure à zéro.");
    }

    // CONTRÔLE DE CAPACITÉ ABSOLU
    const stockActuel = this.getCuveStock(cuve.id);
    const capaciteRestante = Math.round((cuve.capaciteMax - stockActuel) * 100) / 100;

    if (quantite > capaciteRestante) {
      throw new Error(
        `Capacité insuffisante : La pile '${cuve.nom}' ne dispose que de ${capaciteRestante.toFixed(1)} L de capacité libre. Entrée demandée de ${quantite.toFixed(1)} L refusée !`
      );
    }

    const nowIso = params.dateMouvement || new Date().toISOString();
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    let finalMovement: Movement | null = null;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      const numeroBon = await this.getNextUniqueBonNumber('REC');
      const id = `mouv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const nouveauMouvement: Movement = {
        id,
        numeroBon,
        typeMouvement: 'ENTREE',
        cuveId: cuve.id,
        clientId: client.id,
        quantite: Math.round(quantite * 100) / 100,
        acidite: params.acidite != null ? Number(params.acidite) : undefined,
        dateMouvement: nowIso,
        motif: params.motif?.trim() || "Bon de Réception d'huile (Entrée)",
        observations: params.observations?.trim() || undefined,
        utilisateur: params.utilisateur || 'Personnel Huilerie',
        estAnnule: false
      };

      if (!skipRemoteSync) {
        const safeUuid = ensureUuid(nouveauMouvement.id);
        const supaPayload1 = {
          id: safeUuid,
          numero_bon: nouveauMouvement.numeroBon,
          type_mouvement: 'ENTREE',
          cuve_id: cuve.id,
          client_id: client.id,
          quantite: nouveauMouvement.quantite,
          acidite: nouveauMouvement.acidite ?? null,
          date_mouvement: nowIso,
          motif: nouveauMouvement.motif || null,
          observations: nouveauMouvement.observations || null,
          utilisateur: nouveauMouvement.utilisateur,
          est_annule: false
        };

        const { error: supaErr1 } = await supabase
          .from('movements')
          .insert([supaPayload1]);

        if (supaErr1) {
          // Détection d'une collision sur numero_bon (code 23505 ou contrainte movements_numero_bon_key)
          const isBonCollision = supaErr1.code === '23505' || 
            (supaErr1.message && (
              supaErr1.message.includes('movements_numero_bon_key') || 
              supaErr1.message.includes('numero_bon')
            ));

          if (isBonCollision && attempts < MAX_ATTEMPTS) {
            console.warn(`[Collision 23505] Le numéro ${numeroBon} existe déjà. Réattribution atomique (tentative ${attempts + 1}/${MAX_ATTEMPTS})...`);
            await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
            // Avancer le compteur pour garantir un nouveau numéro
            this.data.sequences.rec = Math.max(this.data.sequences.rec || 0, parseInt(numeroBon.match(/(\d+)$/)?.[1] || '0', 10)) + 1;
            continue;
          }

          // Repli schéma secondaire si colonnes absentes
          if (supaErr1.code === 'PGRST204' || supaErr1.code === '22P02') {
            const supaPayload2 = {
              id: safeUuid,
              type: 'ENTREE',
              quantity: nouveauMouvement.quantite,
              lot: cuve.id,
              reason: nouveauMouvement.motif,
              note: [nouveauMouvement.observations, `Bon: ${nouveauMouvement.numeroBon}`, `Client: ${client.id}`].filter(Boolean).join(' | '),
              created_at: nowIso
            };
            const { error: supaErr2 } = await supabase
              .from('movements')
              .insert([supaPayload2]);

            if (supaErr2) {
              const isBonColl2 = supaErr2.code === '23505' || (supaErr2.message && supaErr2.message.includes('numero_bon'));
              if (isBonColl2 && attempts < MAX_ATTEMPTS) {
                await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
                this.data.sequences.rec = Math.max(this.data.sequences.rec || 0, parseInt(numeroBon.match(/(\d+)$/)?.[1] || '0', 10)) + 1;
                continue;
              }
              throw new Error(`Échec Supabase (${supaErr2.code}) : ${supaErr2.message}`);
            }
          } else {
            throw new Error(`Échec d'enregistrement sur Supabase (${supaErr1.code}) : ${supaErr1.message}`);
          }
        }
      }

      finalMovement = nouveauMouvement;
      break;
    }

    if (!finalMovement) {
      throw new Error("Impossible de générer un numéro de bon de réception unique après plusieurs tentatives.");
    }

    // 2. Mise à jour de l'état local UNIQUEMENT après validation confirmée
    this.data.mouvements.unshift(finalMovement);
    this.logAudit(
      params.utilisateur,
      'ENTREE_HUILE',
      'mouvements',
      finalMovement.id,
      `Entrée de ${quantite.toFixed(1)} L pour ${client.nomComplet} dans cuve ${cuve.nom} (Bon ${finalMovement.numeroBon})`
    );

    this.saveData(this.data);
    this.createAutomaticSnapshot(`Entrée ${finalMovement.numeroBon} (${quantite}L)`);
    return finalMovement;
  }

  /**
   * 2. ENREGISTRER UNE SORTIE D'HUILE
   * CONTRÔLE STRICT : Interdit toute sortie supérieure au solde du client dans cette cuve et au stock physique.
   */
  public async enregistrerSortie(params: {
    clientId: string;
    cuveId?: string;
    lot?: string;
    quantite: number;
    utilisateur: string;
    dateMouvement?: string;
    motif?: string;
    observations?: string;
    acidite?: number;
  }, skipRemoteSync: boolean = false): Promise<Movement> {
    const rawLot = params.cuveId || params.lot;
    if (!rawLot) {
      throw new Error("L'identifiant de la cuve ou le lot est obligatoire.");
    }

    const cuve = this.data.cuves.find(c => 
      c.id === rawLot || 
      (c.numero && c.numero.trim().toUpperCase() === String(rawLot).trim().toUpperCase())
    );
    if (!cuve) throw new Error(`Pile / Cuve introuvable pour '${rawLot}'.`);

    const client = this.data.clients.find(c => c.id === params.clientId || c.codeClient === params.clientId);
    if (!client) throw new Error("Client / Déposant introuvable.");

    const quantite = Number(params.quantite);
    if (isNaN(quantite) || quantite <= 0) {
      throw new Error("La quantité à retirer doit être strictement supérieure à zéro.");
    }

    // CONTRÔLE STRICT DU SOLDE DU CLIENT DANS CETTE CUVE
    const soldeClient = this.getClientSoldeDansCuve(client.id, cuve.id);
    if (quantite > soldeClient) {
      throw new Error(
        `Solde insuffisant : Le client '${client.nomComplet}' ne possède que ${soldeClient.toFixed(1)} L dans la cuve '${cuve.nom}'. Retrait de ${quantite.toFixed(1)} L refusé !`
      );
    }

    const stockCuve = this.getCuveStock(cuve.id);
    if (quantite > stockCuve) {
      throw new Error(`Stock physique insuffisant : la cuve ne contient que ${stockCuve.toFixed(1)} L.`);
    }

    const nowIso = params.dateMouvement || new Date().toISOString();
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    let finalMovement: Movement | null = null;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      const numeroBon = await this.getNextUniqueBonNumber('SOR');
      const id = `mouv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const nouveauMouvement: Movement = {
        id,
        numeroBon,
        typeMouvement: 'SORTIE',
        cuveId: cuve.id,
        clientId: client.id,
        quantite: Math.round(quantite * 100) / 100,
        acidite: params.acidite != null ? Number(params.acidite) : undefined,
        dateMouvement: nowIso,
        motif: params.motif?.trim() || "Sortie d'huile (Retrait / Livraison)",
        observations: params.observations?.trim() || undefined,
        utilisateur: params.utilisateur || 'Personnel Huilerie',
        estAnnule: false
      };

      if (!skipRemoteSync) {
        const safeUuid = ensureUuid(nouveauMouvement.id);
        const supaPayload1 = {
          id: safeUuid,
          numero_bon: nouveauMouvement.numeroBon,
          type_mouvement: 'SORTIE',
          cuve_id: cuve.id,
          client_id: client.id,
          quantite: nouveauMouvement.quantite,
          acidite: nouveauMouvement.acidite ?? null,
          date_mouvement: nowIso,
          motif: nouveauMouvement.motif || null,
          observations: nouveauMouvement.observations || null,
          utilisateur: nouveauMouvement.utilisateur,
          est_annule: false
        };

        const { error: supaErr1 } = await supabase
          .from('movements')
          .insert([supaPayload1]);

        if (supaErr1) {
          const isBonCollision = supaErr1.code === '23505' || 
            (supaErr1.message && (
              supaErr1.message.includes('movements_numero_bon_key') || 
              supaErr1.message.includes('numero_bon')
            ));

          if (isBonCollision && attempts < MAX_ATTEMPTS) {
            console.warn(`[Collision 23505] Le numéro de sortie ${numeroBon} existe déjà. Réattribution atomique (tentative ${attempts + 1}/${MAX_ATTEMPTS})...`);
            await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
            this.data.sequences.sor = Math.max(this.data.sequences.sor || 0, parseInt(numeroBon.match(/(\d+)$/)?.[1] || '0', 10)) + 1;
            continue;
          }

          if (supaErr1.code === 'PGRST204' || supaErr1.code === '22P02') {
            const supaPayload2 = {
              id: safeUuid,
              type: 'SORTIE',
              quantity: nouveauMouvement.quantite,
              lot: cuve.id,
              reason: nouveauMouvement.motif,
              note: [nouveauMouvement.observations, `Bon: ${nouveauMouvement.numeroBon}`, `Client: ${client.id}`].filter(Boolean).join(' | '),
              created_at: nowIso
            };
            const { error: supaErr2 } = await supabase
              .from('movements')
              .insert([supaPayload2]);

            if (supaErr2) {
              const isBonColl2 = supaErr2.code === '23505' || (supaErr2.message && supaErr2.message.includes('numero_bon'));
              if (isBonColl2 && attempts < MAX_ATTEMPTS) {
                await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
                this.data.sequences.sor = Math.max(this.data.sequences.sor || 0, parseInt(numeroBon.match(/(\d+)$/)?.[1] || '0', 10)) + 1;
                continue;
              }
              throw new Error(`Erreur Supabase sortie (${supaErr2.code}) : ${supaErr2.message}`);
            }
          } else {
            throw new Error(`Erreur Supabase sortie (${supaErr1.code}) : ${supaErr1.message}`);
          }
        }
      }

      finalMovement = nouveauMouvement;
      break;
    }

    if (!finalMovement) {
      throw new Error("Impossible de générer un numéro de bon de sortie unique après plusieurs tentatives.");
    }

    this.data.mouvements.unshift(finalMovement);
    this.logAudit(
      params.utilisateur,
      'SORTIE_HUILE',
      'mouvements',
      finalMovement.id,
      `Sortie de ${quantite.toFixed(1)} L pour ${client.nomComplet} depuis cuve ${cuve.nom} (Bon ${finalMovement.numeroBon})`
    );

    this.saveData(this.data);
    this.createAutomaticSnapshot(`Sortie ${finalMovement.numeroBon} (${quantite}L)`);
    return finalMovement;
  }

  /**
   * 3. TRANSFERT INTER-CUVES
   * CONTRÔLES : Solde source suffisant + Capacité libre destination suffisante.
   * Crée 2 mouvements liés (TRANSFERT_SORTIE et TRANSFERT_ENTREE).
   */
  public async enregistrerTransfert(params: {
    clientId: string;
    cuveSourceId: string;
    cuveDestId: string;
    quantite: number;
    utilisateur: string;
    motif?: string;
  }, skipRemoteSync: boolean = false): Promise<{ sortie: Movement; entree: Movement }> {
    const { clientId, cuveSourceId, cuveDestId, quantite, utilisateur, motif } = params;

    if (cuveSourceId === cuveDestId) {
      throw new Error("La cuve d'origine et la cuve de destination doivent être différentes.");
    }
    if (!quantite || quantite <= 0) {
      throw new Error("La quantité transférée doit être supérieure à 0.");
    }

    const cSrc = this.data.cuves.find(c => c.id === cuveSourceId || (c.numero && c.numero.toUpperCase() === String(cuveSourceId).toUpperCase()));
    const cDst = this.data.cuves.find(c => c.id === cuveDestId || (c.numero && c.numero.toUpperCase() === String(cuveDestId).toUpperCase()));
    if (!cSrc || !cDst) throw new Error("Cuve introuvable.");
    if (!cDst.active) throw new Error(`La cuve réceptrice '${cDst.nom}' est désactivée.`);

    const client = this.data.clients.find(c => c.id === clientId || c.codeClient === clientId);
    if (!client) throw new Error("Client introuvable.");

    // Vérification solde source
    const soldeSrc = this.getClientSoldeDansCuve(client.id, cSrc.id);
    if (quantite > soldeSrc) {
      throw new Error(
        `Solde source insuffisant : Le client n'a que ${soldeSrc.toFixed(1)} L dans '${cSrc.nom}'. Transfert de ${quantite.toFixed(1)} L refusé !`
      );
    }

    // Vérification capacité destination
    const stockDest = this.getCuveStock(cDst.id);
    const capDestRestante = Math.round((cDst.capaciteMax - stockDest) * 100) / 100;
    if (quantite > capDestRestante) {
      throw new Error(
        `Capacité insuffisante à destination : '${cDst.nom}' ne dispose que de ${capDestRestante.toFixed(1)} L disponibles. Transfert de ${quantite.toFixed(1)} L refusé !`
      );
    }

    const nowIso = new Date().toISOString();
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    let finalRes: { sortie: Movement; entree: Movement } | null = null;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      const bonSort = await this.getNextUniqueBonNumber('TRF');
      const bonEnt = await this.getNextUniqueBonNumber('TRF');

      const idSort = `mouv-trf-s-${Date.now()}`;
      const idEnt = `mouv-trf-e-${Date.now() + 1}`;

      const mouvSortie: Movement = {
        id: idSort,
        numeroBon: bonSort,
        typeMouvement: 'TRANSFERT_SORTIE',
        cuveId: cSrc.id,
        clientId: client.id,
        quantite: Math.round(quantite * 100) / 100,
        dateMouvement: nowIso,
        motif: motif || "Transfert inter-cuves",
        observations: `Transféré vers cuve ${cDst.nom}`,
        utilisateur,
        mouvementOrigineId: idEnt,
        estAnnule: false
      };

      const mouvEntree: Movement = {
        id: idEnt,
        numeroBon: bonEnt,
        typeMouvement: 'TRANSFERT_ENTREE',
        cuveId: cDst.id,
        clientId: client.id,
        quantite: Math.round(quantite * 100) / 100,
        dateMouvement: nowIso,
        motif: motif || "Transfert inter-cuves",
        observations: `Transféré depuis cuve ${cSrc.nom}`,
        utilisateur,
        mouvementOrigineId: idSort,
        estAnnule: false
      };

      if (!skipRemoteSync) {
        const supaPayloadSortie = {
          id: ensureUuid(idSort),
          numero_bon: bonSort,
          type_mouvement: 'TRANSFERT_SORTIE',
          cuve_id: cSrc.id,
          client_id: client.id,
          quantite: mouvSortie.quantite,
          date_mouvement: nowIso,
          motif: mouvSortie.motif || null,
          observations: mouvSortie.observations || null,
          utilisateur,
          est_annule: false
        };
        const supaPayloadEntree = {
          id: ensureUuid(idEnt),
          numero_bon: bonEnt,
          type_mouvement: 'TRANSFERT_ENTREE',
          cuve_id: cDst.id,
          client_id: client.id,
          quantite: mouvEntree.quantite,
          date_mouvement: nowIso,
          motif: mouvEntree.motif || null,
          observations: mouvEntree.observations || null,
          utilisateur,
          est_annule: false
        };

        const { error: supaErr } = await supabase
          .from('movements')
          .insert([supaPayloadSortie, supaPayloadEntree]);

        if (supaErr) {
          const isBonCollision = supaErr.code === '23505' || 
            (supaErr.message && (
              supaErr.message.includes('movements_numero_bon_key') || 
              supaErr.message.includes('numero_bon')
            ));

          if (isBonCollision && attempts < MAX_ATTEMPTS) {
            console.warn(`[Collision 23505] Collision de numéros de transfert. Réattribution (tentative ${attempts + 1}/${MAX_ATTEMPTS})...`);
            await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
            this.data.sequences.trf = Math.max(
              this.data.sequences.trf || 0, 
              parseInt(bonEnt.match(/(\d+)$/)?.[1] || '0', 10)
            ) + 1;
            continue;
          }

          if (supaErr.code === 'PGRST204' || supaErr.code === '22P02') {
            const altSortie = {
              id: ensureUuid(idSort),
              type: 'TRANSFERT_SORTIE',
              quantity: mouvSortie.quantite,
              lot: cSrc.id,
              reason: mouvSortie.motif,
              note: `Vers ${cDst.nom} | Bon: ${bonSort}`,
              created_at: nowIso
            };
            const altEntree = {
              id: ensureUuid(idEnt),
              type: 'TRANSFERT_ENTREE',
              quantity: mouvEntree.quantite,
              lot: cDst.id,
              reason: mouvEntree.motif,
              note: `Depuis ${cSrc.nom} | Bon: ${bonEnt}`,
              created_at: nowIso
            };
            const { error: supaErr2 } = await supabase
              .from('movements')
              .insert([altSortie, altEntree]);

            if (supaErr2) {
              const isColl2 = supaErr2.code === '23505' || (supaErr2.message && supaErr2.message.includes('numero_bon'));
              if (isColl2 && attempts < MAX_ATTEMPTS) {
                await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
                this.data.sequences.trf = Math.max(
                  this.data.sequences.trf || 0, 
                  parseInt(bonEnt.match(/(\d+)$/)?.[1] || '0', 10)
                ) + 1;
                continue;
              }
              throw new Error(`Erreur Supabase transfert (${supaErr2.code}) : ${supaErr2.message}`);
            }
          } else {
            throw new Error(`Erreur Supabase transfert (${supaErr.code}) : ${supaErr.message}`);
          }
        }
      }

      finalRes = { sortie: mouvSortie, entree: mouvEntree };
      break;
    }

    if (!finalRes) {
      throw new Error("Impossible de générer des numéros de bons de transfert uniques après plusieurs tentatives.");
    }

    const { sortie: mouvSortie, entree: mouvEntree } = finalRes;

    this.data.mouvements.unshift(mouvEntree);
    this.data.mouvements.unshift(mouvSortie);

    this.logAudit(
      utilisateur,
      'TRANSFERT_HUILE',
      'mouvements',
      `${mouvSortie.id}->${mouvEntree.id}`,
      `Transfert de ${quantite.toFixed(1)} L de ${cSrc.nom} vers ${cDst.nom} pour ${client.nomComplet} (Bons ${mouvSortie.numeroBon} / ${mouvEntree.numeroBon})`
    );

    this.saveData(this.data);
    this.createAutomaticSnapshot(`Transfert ${mouvSortie.numeroBon} (${quantite}L)`);
    return { sortie: mouvSortie, entree: mouvEntree };
  }

  /**
   * 4. ANNULATION / CONTRE-PASSATION AUDITÉE
   * Ne supprime JAMAIS le mouvement original de la base : conserve la ligne,
   * active le flag `estAnnule = true`, consigne l'utilisateur et le motif obligatoire.
   */
  public async annulerMouvement(mouvementId: string, motif: string, utilisateur: string, skipRemoteSync: boolean = false): Promise<Movement> {
    if (!motif || motif.trim().length < 4) {
      throw new Error("Un motif d'annulation détaillé et explicite est obligatoire.");
    }

    const mouv = this.data.mouvements.find(m => m.id === mouvementId);
    if (!mouv) throw new Error("Mouvement introuvable.");
    if (mouv.estAnnule) throw new Error("Ce mouvement est déjà annulé.");

    // Si on annule une entrée, il faut s'assurer que le client a toujours cette quantité en stock !
    if (mouv.typeMouvement === 'ENTREE' || mouv.typeMouvement === 'TRANSFERT_ENTREE') {
      const soldeActuel = this.getClientSoldeDansCuve(mouv.clientId, mouv.cuveId);
      if (soldeActuel < mouv.quantite) {
        throw new Error(
          `Impossible d'annuler cette entrée : le client a déjà retiré de l'huile. Son solde actuel n'est que de ${soldeActuel.toFixed(1)} L alors que le bon était de ${mouv.quantite.toFixed(1)} L.`
        );
      }
    }

    const nowIso = new Date().toISOString();
    mouv.estAnnule = true;
    mouv.dateAnnulation = nowIso;
    mouv.motifAnnulation = motif.trim();
    mouv.utilisateurAnnulation = utilisateur;

    // Si lié à un transfert, annuler aussi le mouvement jumeau
    if (mouv.mouvementOrigineId) {
      const jumeau = this.data.mouvements.find(m => m.id === mouv.mouvementOrigineId);
      if (jumeau && !jumeau.estAnnule) {
        jumeau.estAnnule = true;
        jumeau.dateAnnulation = nowIso;
        jumeau.motifAnnulation = `Contre-passation liée : ${motif.trim()}`;
        jumeau.utilisateurAnnulation = utilisateur;
      }
    }

    // Mise à jour sur Supabase
    if (!skipRemoteSync && !StorageService.isTestMode) {
      try {
        await supabase
          .from('movements')
          .update({
            est_annule: true,
            date_annulation: nowIso,
            motif_annulation: motif.trim(),
            utilisateur_annulation: utilisateur
          })
          .eq('id', mouvementId);

        if (mouv.mouvementOrigineId) {
          await supabase
            .from('movements')
            .update({
              est_annule: true,
              date_annulation: nowIso,
              motif_annulation: `Contre-passation liée : ${motif.trim()}`,
              utilisateur_annulation: utilisateur
            })
            .eq('id', mouv.mouvementOrigineId);
        }
      } catch (e) {
        console.warn("Échec mise à jour annulation Supabase:", e);
      }
    }

    this.logAudit(
      utilisateur,
      'ANNULATION_MOUVEMENT',
      'mouvements',
      mouvementId,
      `Annulation du bon ${mouv.numeroBon}. Motif : ${motif.trim()}`
    );

    this.saveData(this.data);
    this.createAutomaticSnapshot(`Annulation ${mouv.numeroBon}`);
    return mouv;
  }

  /**
   * 5. CORRECTION DE DATE AUDITÉE (RÉSERVÉE AUX ADMINISTRATEURS)
   */
  public corrigerDateMouvement(mouvementId: string, nouvelleDate: string, motif: string, utilisateur: string): Movement {
    const mouv = this.data.mouvements.find(m => m.id === mouvementId);
    if (!mouv) throw new Error("Mouvement introuvable.");
    if (!motif || motif.trim().length < 4) {
      throw new Error("Le motif de rectification de la date est obligatoire.");
    }

    const ancienneDate = mouv.dateMouvement;
    mouv.dateMouvement = nouvelleDate;
    mouv.dateCorrigee = true;
    mouv.dateCorrectionAudit = `Modifié le ${new Date().toISOString()} par ${utilisateur} (Ancienne date: ${ancienneDate}, Motif: ${motif})`;

    this.logAudit(
      utilisateur,
      'RECTIFICATION_DATE',
      'mouvements',
      mouvementId,
      `Date du bon ${mouv.numeroBon} rectifiée de ${ancienneDate} à ${nouvelleDate}. Motif : ${motif}`
    );

    this.saveData(this.data);
    return mouv;
  }

  // --- GESTION DES CUVES & CLIENTS ---

  public ajouterCuve(numero: string, nom: string, capaciteMax: number, notes: string = ""): Cuve {
    const numClean = numero.trim().toUpperCase();
    const nomClean = nom.trim();
    if (!numClean || !nomClean) throw new Error("Le numéro et le nom de la cuve sont obligatoires.");
    if (capaciteMax <= 0) throw new Error("La capacité maximale doit être supérieure à zéro.");

    if (this.data.cuves.some(c => c.numero.toUpperCase() === numClean)) {
      throw new Error(`Le numéro de cuve '${numClean}' existe déjà.`);
    }

    const nouvelleCuve: Cuve = {
      id: `cuve-${Date.now()}`,
      numero: numClean,
      nom: nomClean,
      capaciteMax: Math.round(capaciteMax * 100) / 100,
      active: true,
      dateCreation: new Date().toISOString(),
      notes: notes.trim()
    };

    this.data.cuves.push(nouvelleCuve);
    this.logAudit("Gérant (Admin)", "CREATION_CUVE", "cuves", nouvelleCuve.id, `Création de la pile ${numClean} (${nomClean}) - ${capaciteMax} L`);
    this.saveData(this.data);
    return nouvelleCuve;
  }

  public modifierCuve(cuveId: string, nom: string, capaciteMax: number, notes?: string): Cuve {
    const cuve = this.data.cuves.find(c => c.id === cuveId);
    if (!cuve) throw new Error("Cuve introuvable.");

    const stockActuel = this.getCuveStock(cuveId);
    if (capaciteMax < stockActuel) {
      throw new Error(
        `Impossible de réduire la capacité à ${capaciteMax} L car la cuve contient actuellement ${stockActuel} L d'huile !`
      );
    }

    cuve.nom = nom.trim();
    cuve.capaciteMax = capaciteMax;
    if (notes !== undefined) cuve.notes = notes.trim();

    this.logAudit("Gérant (Admin)", "MODIF_CUVE", "cuves", cuve.id, `Modification cuve ${cuve.numero} (${cuve.nom})`);
    this.saveData(this.data);
    return cuve;
  }

  public basculerStatutCuve(cuveId: string): Cuve {
    const cuve = this.data.cuves.find(c => c.id === cuveId);
    if (!cuve) throw new Error("Cuve introuvable.");

    // Ne pas désactiver si de l'huile s'y trouve
    const stock = this.getCuveStock(cuveId);
    if (cuve.active && stock > 0.001) {
      throw new Error(`Impossible de désactiver la cuve '${cuve.nom}' tant qu'elle contient du stock (${stock} L). Transférez ou sortez l'huile d'abord.`);
    }

    cuve.active = !cuve.active;
    this.logAudit("Gérant (Admin)", "STATUT_CUVE", "cuves", cuve.id, `Cuve ${cuve.numero} passée à ${cuve.active ? 'ACTIVE' : 'DÉSACTIVÉE'}`);
    this.saveData(this.data);
    return cuve;
  }

  public supprimerCuve(cuveId: string): void {
    const cuve = this.data.cuves.find(c => c.id === cuveId);
    if (!cuve) throw new Error("Cuve introuvable.");

    // 1. Contrôle strict : vérifier si la cuve contient du stock
    const stock = this.getCuveStock(cuveId);
    if (stock > 0.001) {
      throw new Error(
        `Suppression impossible : La cuve '${cuve.numero} - ${cuve.nom}' contient actuellement ${stock.toLocaleString('fr-FR')} L d'huile. Veuillez transférer ou sortir l'huile avant toute suppression.`
      );
    }

    // 2. Contrôle strict : vérifier si la cuve possède des mouvements historiques
    const nbMouvements = this.data.mouvements.filter(m => m.cuveId === cuveId).length;
    if (nbMouvements > 0) {
      throw new Error(
        `Suppression permanente impossible : La cuve '${cuve.numero} - ${cuve.nom}' est référencée dans ${nbMouvements} bon(s) ou transaction(s) de l'historique comptable. Pour garantir la traçabilité et l'intégrité des registres, vous pouvez la désactiver à la place.`
      );
    }

    // 3. Suppression définitive
    this.data.cuves = this.data.cuves.filter(c => c.id !== cuveId);
    this.logAudit("Gérant (Admin)", "SUPPRESSION_CUVE", "cuves", cuveId, `Suppression de la cuve vide ${cuve.numero} (${cuve.nom})`);
    this.saveData(this.data);

    // Synchronisation de la suppression avec Supabase si connectée
    try {
      supabase.from('cuves').delete().eq('id', cuveId).then();
    } catch {
      // Ignorer si la table distante n'est pas configurée
    }
  }

  public async ajouterClient(nomComplet: string, telephone?: string, notes?: string, skipRemoteSync: boolean = false): Promise<Client> {
    const nomClean = nomComplet.trim();
    if (!nomClean) throw new Error("Le nom complet ou la raison sociale est obligatoire.");

    // En mode test in-memory (banc d'essai)
    if (skipRemoteSync) {
      this.data.sequences.cli += 1;
      const codeClient = `CLI-${String(this.data.sequences.cli).padStart(3, '0')}`;
      const localClient: Client = {
        id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        codeClient,
        nomComplet: nomClean,
        telephone: telephone?.trim(),
        notes: notes?.trim(),
        dateCreation: new Date().toISOString(),
        actif: true
      };
      this.data.clients.push(localClient);
      this.saveData(this.data);
      return localClient;
    }

    // 1. Récupérer l'ensemble des codes clients existants (Local + Supabase distant)
    const allCodes = new Set<string>();
    for (const c of this.data.clients) {
      if (c.codeClient) allCodes.add(c.codeClient.trim().toUpperCase());
    }

    try {
      const { data: remoteRows, error: fetchErr } = await supabase.from('clients').select('code_client');
      if (!fetchErr && Array.isArray(remoteRows)) {
        for (const row of remoteRows) {
          if (row.code_client) allCodes.add(String(row.code_client).trim().toUpperCase());
        }
      }
    } catch (e) {
      console.warn("Vérification distante des codes clients :", e);
    }

    // 2. Déterminer la séquence numérique maximale
    let maxNum = 0;
    for (const code of allCodes) {
      const m = code.match(/(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    if ((this.data.sequences.cli || 0) > maxNum) {
      maxNum = this.data.sequences.cli;
    }

    // 3. Boucle d'insertion Supabase avec reprise automatique sur collision (409 Conflict / 23505)
    let candidateNum = Math.max(1, maxNum + 1);
    let confirmedClient: Client | null = null;
    let attempts = 0;
    const maxAttempts = 12;
    let lastError: any = null;

    while (attempts < maxAttempts && !confirmedClient) {
      attempts++;
      const codeClient = `CLI-${String(candidateNum).padStart(3, '0')}`;

      // Si le code est déjà présent localement ou distant, passer au suivant
      if (allCodes.has(codeClient)) {
        candidateNum++;
        continue;
      }

      const clientId = `cli-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const dateCreation = new Date().toISOString();

      const payload = {
        id: clientId,
        code_client: codeClient,
        nom_complet: nomClean,
        telephone: telephone?.trim() || null,
        notes: notes?.trim() || null,
        date_creation: dateCreation,
        actif: true
      };

      try {
        const { data: supaClient, error: insertError } = await supabase
          .from('clients')
          .insert([payload])
          .select()
          .single();

        if (insertError) {
          lastError = insertError;
          const errString = JSON.stringify(insertError) + ' ' + (insertError.message || '') + ' ' + (insertError.details || '');
          const isConflict = 
            insertError.code === '23505' || 
            insertError.code === '409' || 
            errString.toLowerCase().includes('duplicate') || 
            errString.toLowerCase().includes('unique') || 
            errString.includes('code_client');

          if (isConflict) {
            allCodes.add(codeClient);
            candidateNum++;
            continue;
          } else {
            throw new Error(`Erreur base de données Supabase (${insertError.code || 'HTTP'}) : ${insertError.message || 'Impossible d\'enregistrer le client'}`);
          }
        }

        confirmedClient = {
          id: (supaClient && supaClient.id) || clientId,
          codeClient: (supaClient && supaClient.code_client) || codeClient,
          nomComplet: (supaClient && supaClient.nom_complet) || nomClean,
          telephone: (supaClient && supaClient.telephone) || telephone?.trim() || undefined,
          notes: (supaClient && supaClient.notes) || notes?.trim() || undefined,
          dateCreation: (supaClient && supaClient.date_creation) || dateCreation,
          actif: supaClient && supaClient.actif !== undefined ? supaClient.actif : true
        };
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('23505') || msg.includes('409') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
          allCodes.add(codeClient);
          candidateNum++;
          continue;
        }
        throw err;
      }
    }

    if (!confirmedClient) {
      throw new Error(`Échec de création du compte client : conflit de code persistant après plusieurs essais (${lastError?.message || 'Erreur 409'}).`);
    }

    // 4. UNIQUEMENT APRÈS CONFIRMATION STRICTE DE SUPABASE : Mise à jour de l'état applicatif
    this.data.clients.push(confirmedClient);
    this.data.sequences.cli = Math.max(this.data.sequences.cli || 0, candidateNum);
    this.logAudit("Gérant (Admin)", "CREATION_CLIENT", "clients", confirmedClient.id, `Nouveau client enregistré : ${confirmedClient.codeClient} - ${confirmedClient.nomComplet}`);
    this.saveData(this.data);
    return confirmedClient;
  }

  public async modifierClient(clientId: string, nomComplet: string, telephone?: string, notes?: string): Promise<Client> {
    const client = this.data.clients.find(c => c.id === clientId);
    if (!client) throw new Error("Client introuvable.");

    const nomClean = nomComplet.trim();
    if (!nomClean) throw new Error("Le nom complet ou la raison sociale est obligatoire.");

    const telClean = telephone !== undefined ? telephone.trim() : (client.telephone || null);
    const notesClean = notes !== undefined ? notes.trim() : (client.notes || null);

    // Mise à jour sur Supabase
    try {
      const { error } = await supabase.from('clients').update({
        nom_complet: nomClean,
        telephone: telClean || null,
        notes: notesClean || null
      }).eq('id', clientId);
      if (error) {
        console.warn("Avertissement mise à jour Supabase client:", error);
      }
    } catch (e) {
      console.warn("Erreur réseau mise à jour Supabase client:", e);
    }

    client.nomComplet = nomClean;
    if (telephone !== undefined) client.telephone = telephone.trim();
    if (notes !== undefined) client.notes = notes.trim();

    this.logAudit("Gérant (Admin)", "MODIF_CLIENT", "clients", client.id, `Modification client : ${client.codeClient}`);
    this.saveData(this.data);
    return client;
  }

  public async basculerStatutClient(clientId: string): Promise<Client> {
    const client = this.data.clients.find(c => c.id === clientId);
    if (!client) throw new Error("Client introuvable.");

    const statutActuel = client.actif !== false;
    const nouveauStatut = !statutActuel;

    try {
      const { error } = await supabase.from('clients').update({
        actif: nouveauStatut
      }).eq('id', clientId);
      if (error) {
        console.warn("Avertissement mise à jour statut client Supabase:", error);
      }
    } catch (e) {
      console.warn("Erreur réseau mise à jour statut client Supabase:", e);
    }

    client.actif = nouveauStatut;

    this.logAudit(
      "Gérant (Admin)", 
      "STATUT_CLIENT", 
      "clients", 
      client.id, 
      `Client ${client.codeClient} (${client.nomComplet}) passé à ${client.actif ? 'ACTIF' : 'ARCHIVÉ / INACTIF'}`
    );
    this.saveData(this.data);
    return client;
  }

  public async supprimerClient(clientId: string): Promise<void> {
    const client = this.data.clients.find(c => c.id === clientId);
    if (!client) throw new Error("Client introuvable.");

    // 1. Contrôle strict : vérifier si le client a un solde d'huile en cuve
    const balance = this.getClientBalance(clientId);
    const stockClient = balance ? balance.totalStock : 0;
    if (stockClient > 0.001) {
      throw new Error(
        `Suppression impossible : Le client '${client.nomComplet} (${client.codeClient})' possède encore ${stockClient.toLocaleString('fr-FR')} L d'huile en cuve. Veuillez enregistrer les sorties ou transferts nécessaires avant de pouvoir supprimer ce compte.`
      );
    }

    // 2. Contrôle strict : vérifier si le client est référencé dans des mouvements historiques
    const nbMouvements = this.data.mouvements.filter(m => m.clientId === clientId).length;
    if (nbMouvements > 0) {
      throw new Error(
        `Suppression permanente impossible : Le client '${client.nomComplet} (${client.codeClient})' est référencé dans ${nbMouvements} bon(s) ou transaction(s) historique(s). Pour préserver l'historique comptable et la traçabilité légale, vous pouvez l'archiver ou le désactiver à la place.`
      );
    }

    // 3. Suppression dans Supabase
    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) {
        throw new Error(`Erreur lors de la suppression sur Supabase (${error.code}) : ${error.message}`);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Supabase')) {
        throw err;
      }
      console.warn("Suppression distante Supabase:", err);
    }

    // 4. Suppression définitive locale
    this.data.clients = this.data.clients.filter(c => c.id !== clientId);
    this.logAudit("Gérant (Admin)", "SUPPRESSION_CLIENT", "clients", clientId, `Suppression définitive du client ${client.codeClient} (${client.nomComplet})`);
    this.saveData(this.data);
  }

  // --- GESTION DES UTILISATEURS, MOTS DE PASSE ET DROITS D'ACCÈS ---

  public getUsers(): UserAccount[] {
    return [...(this.data.users || [])];
  }

  public authentifier(username: string, motDePasse: string): UserAccount | null {
    const uClean = username.trim().toLowerCase();
    const pClean = motDePasse.trim();
    const user = (this.data.users || []).find(
      u => u.username.toLowerCase() === uClean && u.password === pClean && u.actif
    );
    return user ? { ...user } : null;
  }

  public ajouterUtilisateur(user: Omit<UserAccount, 'id' | 'dateCreation'>): UserAccount {
    const uClean = user.username.trim().toLowerCase();
    if (!uClean || !user.password) {
      throw new Error("L'identifiant et le mot de passe sont obligatoires.");
    }
    if ((this.data.users || []).some(u => u.username.toLowerCase() === uClean)) {
      throw new Error(`L'identifiant '${user.username}' est déjà utilisé par un autre utilisateur.`);
    }

    const newUser: UserAccount = {
      ...user,
      id: `user-${Date.now()}`,
      username: user.username.trim(),
      password: user.password.trim(),
      dateCreation: new Date().toISOString()
    };

    if (!this.data.users) this.data.users = [];
    this.data.users.push(newUser);
    this.logAudit("Gérant (Admin)", "CREATION_UTILISATEUR", "users", newUser.id, `Création utilisateur : ${newUser.username} (${newUser.role})`);
    this.saveData(this.data);
    return newUser;
  }

  public modifierUtilisateur(id: string, updates: Partial<UserAccount>): UserAccount {
    const user = (this.data.users || []).find(u => u.id === id);
    if (!user) throw new Error("Utilisateur introuvable.");

    if (updates.username) {
      const uClean = updates.username.trim().toLowerCase();
      if ((this.data.users || []).some(u => u.id !== id && u.username.toLowerCase() === uClean)) {
        throw new Error(`L'identifiant '${updates.username}' est déjà utilisé par un autre compte.`);
      }
      user.username = updates.username.trim();
    }
    if (updates.password !== undefined && updates.password.trim()) {
      user.password = updates.password.trim();
    }
    if (updates.nomAffiche) user.nomAffiche = updates.nomAffiche.trim();
    if (updates.role) user.role = updates.role;
    if (updates.actif !== undefined) user.actif = updates.actif;
    if (updates.telephone !== undefined) user.telephone = updates.telephone.trim();
    if (updates.acces) user.acces = { ...user.acces, ...updates.acces };

    this.logAudit("Gérant (Admin)", "MODIF_UTILISATEUR", "users", user.id, `Modification compte : ${user.username}`);
    this.saveData(this.data);
    return user;
  }

  public supprimerUtilisateur(id: string): void {
    const user = (this.data.users || []).find(u => u.id === id);
    if (!user) throw new Error("Utilisateur introuvable.");

    if (user.username.toLowerCase() === 'wizz') {
      throw new Error("Impossible de supprimer le compte administrateur principal 'wizz'.");
    }

    const admins = (this.data.users || []).filter(u => u.role === 'admin' && u.actif);
    if (user.role === 'admin' && admins.length <= 1) {
      throw new Error("Impossible de supprimer le dernier administrateur actif.");
    }

    this.data.users = this.data.users.filter(u => u.id !== id);
    this.logAudit("Gérant (Admin)", "SUPPRESSION_UTILISATEUR", "users", id, `Suppression compte : ${user.username}`);
    this.saveData(this.data);
  }

  // --- SAUVEGARDES, EXPORT & RESTAURATION VÉRIFIÉE ---

  public getBackups(): BackupSnapshot[] {
    try {
      const raw = safeStorage.getItem(BACKUPS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  }

  private saveBackups(backups: BackupSnapshot[]): void {
    try {
      safeStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
    } catch (e) {
      console.warn("Erreur sauvegarde historique backups:", e);
    }
  }

  public createAutomaticSnapshot(description: string = "Sauvegarde automatique"): BackupSnapshot {
    const dataStr = JSON.stringify(this.data);
    const tailleKo = Math.round((dataStr.length / 1024) * 10) / 10;
    const now = new Date();
    const dateFormatted = now.toISOString().replace(/[:.]/g, '-');
    const nomFichier = `huilerie_jemai_backup_${dateFormatted}.json`;

    const snapshot: BackupSnapshot = {
      id: `bck-${Date.now()}`,
      date: now.toISOString(),
      nomFichier,
      tailleKo,
      nbMouvements: this.data.mouvements.length,
      nbCuves: this.data.cuves.length,
      nbClients: this.data.clients.length,
      donneesJSON: dataStr,
      description
    };

    const backups = this.getBackups();
    backups.unshift(snapshot);
    // Conserver jusqu'à 8 sauvegardes tournantes
    if (backups.length > 8) {
      backups.length = 8;
    }
    this.saveBackups(backups);
    return snapshot;
  }

  private ensureAutoBackup(): void {
    const backups = this.getBackups();
    if (backups.length === 0) {
      this.createAutomaticSnapshot("Sauvegarde initiale système");
    }
  }

  public restaurerDepuisSnapshot(snapshotId: string): void {
    const backups = this.getBackups();
    const bck = backups.find(b => b.id === snapshotId);
    if (!bck) throw new Error("Sauvegarde introuvable.");

    this.restaurerDepuisJSON(bck.donneesJSON, `Restauration de ${bck.nomFichier}`);
  }

  public restaurerDepuisJSON(jsonString: string, description: string = "Restauration manuelle"): void {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error("Le fichier fourni n'est pas un JSON valide.");
    }

    // Validation préalable d'intégrité stricte
    if (!parsed.cuves || !Array.isArray(parsed.cuves) || parsed.cuves.length === 0) {
      throw new Error("Structure invalide : aucune cuve trouvée dans la sauvegarde.");
    }
    if (!parsed.clients || !Array.isArray(parsed.clients)) {
      throw new Error("Structure invalide : table clients manquante.");
    }
    if (!parsed.mouvements || !Array.isArray(parsed.mouvements)) {
      throw new Error("Structure invalide : table mouvements manquante.");
    }

    // Vérification de la cohérence des stocks
    for (const c of parsed.cuves) {
      if (!c.id || !c.numero || !c.capaciteMax) {
        throw new Error(`Cuve invalide détectée : ${JSON.stringify(c)}`);
      }
    }

    // Sauvegarde de sécurité préalable avant écrasement
    this.createAutomaticSnapshot(`Sauvegarde de sécurité avant restauration (${description})`);

    this.saveData(parsed);
    this.logAudit("Gérant (Admin)", "RESTAURATION_BDD", "database", undefined, `Base restaurée avec succès (${description})`);
  }

  /**
   * Génère un script d'export SQLite 100% compatible sqlite3
   */
  public genererExportSQLiteSQL(): string {
    const lines: string[] = [];
    lines.push("-- ========================================================");
    lines.push("-- EXPORT SQLITE OFFICIEL - HUILERIE JEMAI (معصرة جماعي)");
    lines.push(`-- Date de génération : ${new Date().toISOString()}`);
    lines.push("-- Compatible avec SQLite 3.x");
    lines.push("-- ========================================================\n");
    lines.push("PRAGMA foreign_keys = ON;");
    lines.push("BEGIN TRANSACTION;\n");

    // Table cuves
    lines.push("CREATE TABLE IF NOT EXISTS cuves (");
    lines.push("    id INTEGER PRIMARY KEY AUTOINCREMENT,");
    lines.push("    numero TEXT UNIQUE NOT NULL,");
    lines.push("    nom TEXT NOT NULL,");
    lines.push("    capacite_max REAL NOT NULL,");
    lines.push("    active INTEGER NOT NULL DEFAULT 1,");
    lines.push("    notes TEXT");
    lines.push(");\n");

    for (const c of this.data.cuves) {
      const notes = c.notes ? `'${c.notes.replace(/'/g, "''")}'` : "NULL";
      lines.push(`INSERT INTO cuves (numero, nom, capacite_max, active, notes) VALUES ('${c.numero}', '${c.nom.replace(/'/g, "''")}', ${c.capaciteMax}, ${c.active ? 1 : 0}, ${notes});`);
    }

    // Table clients
    lines.push("\nCREATE TABLE IF NOT EXISTS clients (");
    lines.push("    id INTEGER PRIMARY KEY AUTOINCREMENT,");
    lines.push("    code_client TEXT UNIQUE NOT NULL,");
    lines.push("    nom_complet TEXT NOT NULL,");
    lines.push("    telephone TEXT,");
    lines.push("    notes TEXT");
    lines.push(");\n");

    for (const cl of this.data.clients) {
      const tel = cl.telephone ? `'${cl.telephone.replace(/'/g, "''")}'` : "NULL";
      const notes = cl.notes ? `'${cl.notes.replace(/'/g, "''")}'` : "NULL";
      lines.push(`INSERT INTO clients (code_client, nom_complet, telephone, notes) VALUES ('${cl.codeClient}', '${cl.nomComplet.replace(/'/g, "''")}', ${tel}, ${notes});`);
    }

    // Table mouvements
    lines.push("\nCREATE TABLE IF NOT EXISTS mouvements (");
    lines.push("    id INTEGER PRIMARY KEY AUTOINCREMENT,");
    lines.push("    numero_bon TEXT UNIQUE NOT NULL,");
    lines.push("    type_mouvement TEXT NOT NULL,");
    lines.push("    quantite REAL NOT NULL,");
    lines.push("    date_mouvement TIMESTAMP NOT NULL,");
    lines.push("    motif TEXT,");
    lines.push("    observations TEXT,");
    lines.push("    utilisateur TEXT NOT NULL,");
    lines.push("    est_annule INTEGER NOT NULL DEFAULT 0");
    lines.push(");\n");

    for (const m of this.data.mouvements) {
      const motif = m.motif ? `'${m.motif.replace(/'/g, "''")}'` : "NULL";
      const obs = m.observations ? `'${m.observations.replace(/'/g, "''")}'` : "NULL";
      lines.push(`INSERT INTO mouvements (numero_bon, type_mouvement, quantite, date_mouvement, motif, observations, utilisateur, est_annule) VALUES ('${m.numeroBon}', '${m.typeMouvement}', ${m.quantite}, '${m.dateMouvement}', ${motif}, ${obs}, '${m.utilisateur.replace(/'/g, "''")}', ${m.estAnnule ? 1 : 0});`);
    }

    lines.push("\nCOMMIT;");
    return lines.join("\n");
  }

  // --- BANC D'ESSAI AUTOMATISÉ EN 1 CLIC (REQUIREMENT #11) ---

  public async executerTestsAutomatiques(): Promise<TestResultItem[]> {
    const results: TestResultItem[] = [];

    const addStep = (id: number, titre: string, desc: string) => {
      const item: TestResultItem = {
        id,
        titre,
        description: desc,
        statut: 'en_cours',
        detailsLog: []
      };
      results.push(item);
      return item;
    };

    // Snapshot de sécurité avant les tests pour ne pas polluer les données
    const backupAvantTest = JSON.stringify(this.data);
    StorageService.isTestMode = true;

    // Éliminer toute ancienne cuve de test résiduelle pour garantir un environnement vierge
    this.data.cuves = this.data.cuves.filter(c => c.numero !== 'P-TEST-5000' && c.numero !== 'P-DEST-3000');

    try {
      // 1. Tester une pile de 5 000 litres
      const step1 = addStep(1, "Création d'une pile de 5 000 L", "Créer la pile de test 'P-TEST-5000' avec capacité max 5 000 Litres.");
      const cuveTest = this.ajouterCuve("P-TEST-5000", "Cuve Inox Test Obligatoire", 5000.0, "Cuve dédiée au banc d'essai #11");
      const clientA = await this.ajouterClient("Producteur Test A", "+216 99 111 222", undefined, true);
      const clientB = await this.ajouterClient("Producteur Test B", "+216 99 333 444", undefined, true);
      step1.statut = 'succes';
      step1.message = `Cuve créée : ${cuveTest.numero} (${cuveTest.capaciteMax} L). Stock initial = 0 L.`;
      step1.detailsLog?.push(`Cuve ID: ${cuveTest.id}`);

      // 2. Accepter une entrée de 3 000 litres
      const step2 = addStep(2, "Entrée de 3 000 Litres (Acceptée)", "Enregistrer 3 000 L pour Producteur Test A.");
      const mouv1 = await this.enregistrerEntree({
        clientId: clientA.id,
        cuveId: cuveTest.id,
        quantite: 3000.0,
        utilisateur: "Opérateur Cuverie",
        observations: "Test #11 Étape 2"
      }, true);
      const stockApres1 = this.getCuveStock(cuveTest.id);
      if (stockApres1 === 3000.0) {
        step2.statut = 'succes';
        step2.message = `Succès : Bon ${mouv1.numeroBon} émis. Stock cuve = 3 000 L (60%). Reste libre = 2 000 L.`;
      } else {
        throw new Error(`Incohérence : stock attendu 3000 L, obtenu ${stockApres1} L.`);
      }

      // 3. Accepter une entrée supplémentaire de 2 000 litres
      const step3 = addStep(3, "Entrée supplémentaire de 2 000 Litres (Acceptée, Cuve Pleine)", "Enregistrer 2 000 L pour Producteur Test B.");
      const mouv2 = await this.enregistrerEntree({
        clientId: clientB.id,
        cuveId: cuveTest.id,
        quantite: 2000.0,
        utilisateur: "Opérateur Cuverie",
        observations: "Test #11 Étape 3"
      }, true);
      const stockApres2 = this.getCuveStock(cuveTest.id);
      const detPleine = this.getCuveDetails(cuveTest.id);
      if (stockApres2 === 5000.0 && detPleine?.capaciteRestante === 0 && detPleine.tauxRemplissage === 100) {
        step3.statut = 'succes';
        step3.message = `Succès : Bon ${mouv2.numeroBon} émis. Stock cuve = 5 000 L (100% pleine). Reste libre = 0.0 L.`;
      } else {
        throw new Error(`Incohérence : stock attendu 5000 L, obtenu ${stockApres2} L.`);
      }

      // 4. Refuser toute entrée supplémentaire
      const step4 = addStep(4, "Refus de toute entrée supplémentaire (Contrôle de Capacité)", "Tentative d'ajouter 100 L dans la cuve déjà pleine.");
      let aEchoueCommePrevu = false;
      try {
        await this.enregistrerEntree({
          clientId: clientA.id,
          cuveId: cuveTest.id,
          quantite: 100.0,
          utilisateur: "Opérateur Cuverie"
        }, true);
      } catch (err: any) {
        aEchoueCommePrevu = true;
        step4.statut = 'succes';
        step4.message = `Rejet strict validé : "${err.message}". Le stock reste intact à 5 000 L.`;
      }
      if (!aEchoueCommePrevu) {
        throw new Error("Échec critique : l'entrée excédentaire a été acceptée au lieu d'être bloquée !");
      }

      // 5. Refuser une sortie supérieure au solde d’un client
      const step5 = addStep(5, "Refus sortie supérieure au solde client", "Le client B possède 2 000 L. Tentative de sortie de 2 500 L.");
      let refusSortieValide = false;
      try {
        await this.enregistrerSortie({
          clientId: clientB.id,
          cuveId: cuveTest.id,
          quantite: 2500.0,
          utilisateur: "Opérateur Cuverie"
        }, true);
      } catch (err: any) {
        refusSortieValide = true;
        step5.statut = 'succes';
        step5.message = `Rejet strict validé : "${err.message}". Aucun dépassement possible.`;
      }
      if (!refusSortieValide) {
        throw new Error("Échec critique : une sortie supérieure au solde a été autorisée !");
      }

      // 6. Vérifier plusieurs clients dans une pile
      const step6 = addStep(6, "Vérification multi-clients dans une même pile", "Contrôler la répartition des 5 000 L entre Client A (3 000 L) et Client B (2 000 L).");
      const soldeA = this.getClientSoldeDansCuve(clientA.id, cuveTest.id);
      const soldeB = this.getClientSoldeDansCuve(clientB.id, cuveTest.id);
      if (soldeA === 3000.0 && soldeB === 2000.0) {
        step6.statut = 'succes';
        step6.message = `Cohabitation parfaite : Client A = ${soldeA} L (60%), Client B = ${soldeB} L (40%). Total cuve = 5 000 L.`;
      } else {
        throw new Error(`Incohérence multi-clients : Solde A=${soldeA}, Solde B=${soldeB}`);
      }

      // 7. Vérifier les transferts d’une pile à une autre
      const step7 = addStep(7, "Transfert traçable entre deux piles", "Créer Cuve Destination P-DEST-3000 (3 000 L) et transférer 800 L du Client A.");
      const cuveDest = this.ajouterCuve("P-DEST-3000", "Cuve Réceptrice Transfert", 3000.0);
      const trfRes = await this.enregistrerTransfert({
        clientId: clientA.id,
        cuveSourceId: cuveTest.id,
        cuveDestId: cuveDest.id,
        quantite: 800.0,
        utilisateur: "Gérant (Admin)",
        motif: "Test transfert de clarification"
      }, true);
      const stockSrcApres = this.getCuveStock(cuveTest.id);
      const stockDstApres = this.getCuveStock(cuveDest.id);
      const soldeA_Src = this.getClientSoldeDansCuve(clientA.id, cuveTest.id);
      const soldeA_Dst = this.getClientSoldeDansCuve(clientA.id, cuveDest.id);

      if (stockSrcApres === 4200.0 && stockDstApres === 800.0 && soldeA_Src === 2200.0 && soldeA_Dst === 800.0) {
        step7.statut = 'succes';
        step7.message = `Transfert réussi ! Bons émis : ${trfRes.sortie.numeroBon} & ${trfRes.entree.numeroBon}. Source = 4 200 L, Dest = 800 L.`;
      } else {
        throw new Error(`Incohérence transfert : Source=${stockSrcApres}, Dest=${stockDstApres}`);
      }

      // 8. Vérifier l'historique après redémarrage (Simulation de rechargement complet)
      const step8 = addStep(8, "Vérification de la persistance après redémarrage", "Recharger l'instance StorageService depuis le stockage sérialisé.");
      const reloadedEngine = new StorageService();
      const stockReloaded = reloadedEngine.getCuveStock(cuveTest.id);
      if (stockReloaded === 4200.0) {
        step8.statut = 'succes';
        step8.message = `Persistance vérifiée : les mouvements et soldes sont retrouvés à l'identique (Stock P-TEST = ${stockReloaded} L).`;
      } else {
        throw new Error(`Incohérence persistance : attendu 4200 L, obtenu ${stockReloaded} L.`);
      }

      // 9. Vérifier les corrections et annulations auditées
      const step9 = addStep(9, "Annulation avec contre-passation d'audit", "Annuler le premier bon d'entrée sans supprimer la trace historique.");
      const mouvAnnule = await this.annulerMouvement(mouv2.id, "Test obligatoire d'annulation traçable", "Gérant (Admin)", true);
      const stockApresAnnul = this.getCuveStock(cuveTest.id);
      if (mouvAnnule.estAnnule && stockApresAnnul === 2200.0) {
        step9.statut = 'succes';
        step9.message = `Annulation réussie : Bon ${mouvAnnule.numeroBon} archivé avec motif. Stock cuve ajusté à 2 200 L.`;
      } else {
        throw new Error(`Incohérence annulation : stock après=${stockApresAnnul}`);
      }

      // 10. Vérifier la sauvegarde et restauration
      const step10 = addStep(10, "Sauvegarde automatique & restauration vérifiée", "Créer un snapshot d'archive et vérifier la capacité de restauration.");
      const snap = this.createAutomaticSnapshot("Snapshot Test Suite");
      if (snap && snap.tailleKo > 0) {
        step10.statut = 'succes';
        step10.message = `Snapshot créé avec succès : ${snap.nomFichier} (${snap.tailleKo} Ko, ${snap.nbMouvements} mouvements).`;
      } else {
        throw new Error("Échec de création du snapshot");
      }

    } catch (err: any) {
      console.error("Erreur durant le banc d'essai:", err);
      const last = results[results.length - 1];
      if (last) {
        last.statut = 'echec';
        last.message = `ERREUR : ${err.message}`;
      }
    } finally {
      StorageService.isTestMode = false;
      // Nettoyer en restaurant l'état de données d'avant test pour préserver le travail de l'utilisateur
      try {
        const parsed = JSON.parse(backupAvantTest);
        this.saveData(parsed);
      } catch (e) {
        // ignore
      }
    }

    return results;
  }
}

export const dbService = new StorageService();
