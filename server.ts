import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const rawSupabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://vtyytslihvjmyelhahum.supabase.co').trim();
const SUPABASE_URL = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LXJ1R8X0W01sc44edNemwA_pjCRXt6j').trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'huilerie_jemai_central_db.json');
const BACKUPS_FILE = path.join(DATA_DIR, 'huilerie_jemai_backups.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'huilerie_jemai_settings.json');

// Assurer l'existence du dossier data
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Données initiales par défaut si la base centrale est neuve
const DEFAULT_SETTINGS = {
  nomEntreprise: "HUILERIE JEMAI",
  sousTitreArabe: "معصرة جماعي لإنتاج وتخزين زيت الزيتون",
  precisionDecimales: 1,
  unite: "L",
  contactTelephone: "+216 98 000 000",
  adresse: "Route Principale des Oliviers - Tunisie",
  alertSeuilRemplissage: 85
};

const DEFAULT_DATA = {
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

function readDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);

      let hasChanged = false;

      // Nettoyage définitif des fausses cuves générées par les versions de démonstration
      const fakeCuveIds = new Set(['cuve-1', 'cuve-2', 'cuve-3', 'cuve-4']);
      if (parsed.cuves && Array.isArray(parsed.cuves)) {
        const initialCount = parsed.cuves.length;
        parsed.cuves = parsed.cuves.filter((c: any) => !fakeCuveIds.has(c.id));
        if (parsed.cuves.length !== initialCount) {
          hasChanged = true;
        }
      } else {
        parsed.cuves = [];
        hasChanged = true;
      }

      // Nettoyage des mouvements de démo rattachés à ces fausses cuves
      const fakeMouvIds = new Set(['m-01', 'm-02', 'm-03', 'm-04']);
      if (parsed.mouvements && Array.isArray(parsed.mouvements)) {
        const initialMouvCount = parsed.mouvements.length;
        parsed.mouvements = parsed.mouvements.filter((m: any) => !fakeMouvIds.has(m.id) && !fakeCuveIds.has(m.cuveId));
        if (parsed.mouvements.length !== initialMouvCount) {
          hasChanged = true;
        }
      } else {
        parsed.mouvements = [];
        hasChanged = true;
      }

      // Nettoyage des clients de démo (cli-1 à cli-5)
      const fakeClientIds = new Set(['cli-1', 'cli-2', 'cli-3', 'cli-4', 'cli-5']);
      if (parsed.clients && Array.isArray(parsed.clients)) {
        const initialClientCount = parsed.clients.length;
        parsed.clients = parsed.clients.filter((c: any) => !fakeClientIds.has(c.id));
        if (parsed.clients.length !== initialClientCount) {
          hasChanged = true;
        }
      } else {
        parsed.clients = [];
        hasChanged = true;
      }

      // Migration automatique pour s'assurer que users existe et que wizz/wizz est présent
      if (!parsed.users || !Array.isArray(parsed.users)) {
        parsed.users = DEFAULT_DATA.users;
        hasChanged = true;
      } else {
        const hasWizz = parsed.users.some((u: any) => u.username.toLowerCase() === 'wizz');
        if (!hasWizz) {
          parsed.users.unshift(DEFAULT_DATA.users[0]);
          hasChanged = true;
        }
      }

      if (hasChanged) {
        writeDb(parsed);
      }

      return parsed;
    }
  } catch (err) {
    console.error("Erreur lecture base centrale:", err);
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
  return DEFAULT_DATA;
}

function writeDb(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readBackups() {
  try {
    if (fs.existsSync(BACKUPS_FILE)) {
      return JSON.parse(fs.readFileSync(BACKUPS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error("Erreur lecture backups:", err);
  }
  return [];
}

function writeBackups(backups: any[]) {
  fs.writeFileSync(BACKUPS_FILE, JSON.stringify(backups, null, 2), 'utf-8');
}

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error("Erreur lecture settings:", err);
  }
  return DEFAULT_SETTINGS;
}

function writeSettings(settings: any) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  // En dev AI Studio ou prod Cloud Run, écoute sur process.env.PORT (3000 en dev AI Studio, 8080 sur Cloud Run)
  const PORT = Number(process.env.PORT) || (isProd ? 8080 : (Number(process.env.DEV_PORT) || 3000));

  app.use(express.json({ limit: '50mb' }));

  // --- Endpoints de santé pour sondes Cloud Run / Load Balancer ---
  app.get(['/healthz', '/api/health'], (req, res) => {
    res.status(200).json({ status: 'ok', service: 'huilerie-jemai', mode: isProd ? 'production' : 'development', timestamp: new Date().toISOString() });
  });

  // --- API REST CENTRALISÉE POUR TOUS LES NAVIGATEURS (CHROME, OPERA GX, EDGE, MOBILE) ---

  // 1. Récupération des données globales
  app.get('/api/data', (req, res) => {
    try {
      const data = readDb();
      const settings = readSettings();
      const backups = readBackups();
      res.json({ success: true, data, settings, backups });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1.b Vérification de santé et connexion Supabase
  app.get('/api/supabase/status', async (req, res) => {
    let canRead = false;
    let canWrite = false;
    let readError: string | null = null;
    let writeError: string | null = null;

    try {
      const { error: rErr } = await supabase.from('movements').select('id').limit(1);
      if (!rErr) {
        canRead = true;
      } else {
        readError = rErr.message;
      }
    } catch (e: any) {
      readError = e.message;
    }

    try {
      const pingUuid = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
      const testRow1 = {
        id: pingUuid,
        type_mouvement: 'ENTREE',
        quantite: 0.1,
        cuve_id: 'PING_CHECK',
        client_id: 'CLI_PING',
        observations: 'Test de diagnostic Supabase Huilerie Jemai',
        motif: 'PING',
        date_mouvement: new Date().toISOString(),
        utilisateur: 'SYSTEME',
        est_annule: false
      };
      const { error: wErr1 } = await supabase.from('movements').insert([testRow1]);
      if (!wErr1) {
        canWrite = true;
        await supabase.from('movements').delete().eq('id', pingUuid);
      } else if (wErr1.code === 'PGRST204' || wErr1.code === '22P02') {
        const testRow2 = {
          id: pingUuid,
          type: 'ENTREE',
          quantity: 0.1,
          lot: 'PING_CHECK',
          reason: 'PING',
          note: 'Test de diagnostic Supabase Huilerie Jemai',
          created_at: new Date().toISOString()
        };
        const { error: wErr2 } = await supabase.from('movements').insert([testRow2]);
        if (!wErr2) {
          canWrite = true;
          await supabase.from('movements').delete().eq('id', pingUuid);
        } else {
          writeError = wErr2.message;
        }
      } else {
        writeError = wErr1.message;
      }
    } catch (e: any) {
      writeError = e.message;
    }

    res.json({
      success: canRead,
      url: SUPABASE_URL,
      hasKey: Boolean(SUPABASE_KEY),
      canRead,
      canWrite,
      readError,
      writeError,
      timestamp: new Date().toISOString()
    });
  });

  // 2. Synchronisation complète de l'état (écriture atomique sur le serveur)
  app.post('/api/sync', async (req, res) => {
    try {
      const { data, settings, backups } = req.body;
      if (data && data.cuves && data.clients && data.mouvements) {
        writeDb(data);
      }
      if (settings) {
        writeSettings(settings);
      }
      if (backups && Array.isArray(backups)) {
        writeBackups(backups);
      }

      // Tentative d'insertion des mouvements sur Supabase avec les vrais noms de colonnes
      let supabaseInsertResult: any = null;
      if (data && data.mouvements && data.mouvements.length > 0) {
        try {
          const payload = data.mouvements.slice(0, 25).map((m: any) => ({
            id: m.id,
            numero_bon: m.numeroBon,
            type_mouvement: m.typeMouvement,
            cuve_id: m.cuveId,
            client_id: m.clientId,
            quantite: Number(m.quantite),
            acidite: m.acidite != null ? Number(m.acidite) : null,
            date_mouvement: m.dateMouvement || new Date().toISOString(),
            motif: m.motif || null,
            observations: m.observations || null,
            utilisateur: m.utilisateur || 'Personnel Huilerie',
            est_annule: Boolean(m.estAnnule),
            motif_annulation: m.motifAnnulation || null,
            date_annulation: m.dateAnnulation || null
          }));
          const { error } = await supabase.from('movements').upsert(payload, { onConflict: 'id' });
          if (error) {
            supabaseInsertResult = { success: false, error: error.message, code: error.code };
          } else {
            supabaseInsertResult = { success: true, count: payload.length };
          }
        } catch (subErr: any) {
          supabaseInsertResult = { success: false, error: subErr.message };
        }
      }

      res.json({ 
        success: true, 
        message: "Données synchronisées sur le serveur avec succès !",
        supabaseUrl: SUPABASE_URL,
        supabaseInsertResult
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  let movementMutex: Promise<any> = Promise.resolve();

  // 3. Enregistrement d'un mouvement avec mapping intelligent lot->cuve_id et validation stricte (sérialisé par mutex atomique)
  const handlePostMovement = async (req: express.Request, res: express.Response) => {
    movementMutex = movementMutex.then(async () => {
      try {
      const body = req.body || {};
      const rawMouv = body.mouvement || body;
      const db = readDb();

      // Normalisation des colonnes (support iPhone / legacy / Supabase natif)
      const rawLot = rawMouv.cuve_id || rawMouv.cuveId || rawMouv.lot;
      if (!rawLot) {
        return res.status(400).json({ success: false, error: "Le paramètre 'cuve_id' ou 'lot' est obligatoire." });
      }

      // Vérification et mapping de lot -> cuve_id
      const targetCuve = (db.cuves || []).find((c: any) => 
        c.id === rawLot || 
        (c.numero && String(c.numero).trim().toUpperCase() === String(rawLot).trim().toUpperCase())
      );
      if (!targetCuve) {
        return res.status(400).json({ 
          success: false, 
          error: `Cuve introuvable : le lot ou identifiant '${rawLot}' ne correspond à aucune cuve existante.` 
        });
      }
      if (!targetCuve.active) {
        return res.status(400).json({ 
          success: false, 
          error: `La cuve '${targetCuve.nom}' est désactivée. Aucun mouvement n'est autorisé.` 
        });
      }

      // Normalisation de la quantité
      const rawQty = rawMouv.quantite !== undefined ? rawMouv.quantite : rawMouv.quantity;
      const numQty = Number(rawQty);
      if (isNaN(numQty) || numQty <= 0) {
        return res.status(400).json({ success: false, error: "La quantité ('quantite') doit être un nombre strictement supérieur à 0." });
      }

      // Normalisation du type de mouvement
      const rawType = String(rawMouv.type_mouvement || rawMouv.typeMouvement || rawMouv.type || 'ENTREE').toUpperCase();
      let typeMouvement = 'ENTREE';
      if (rawType.includes('SORT') || rawType === 'OUT' || rawType.includes('LIVR')) {
        typeMouvement = 'SORTIE';
      } else if (rawType.includes('TRANSFERT_SORTIE')) {
        typeMouvement = 'TRANSFERT_SORTIE';
      } else if (rawType.includes('TRANSFERT_ENTREE')) {
        typeMouvement = 'TRANSFERT_ENTREE';
      } else {
        typeMouvement = 'ENTREE';
      }

      // Calcul du stock actuel de la cuve
      let currentStock = 0;
      for (const m of (db.mouvements || [])) {
        if (m.cuveId === targetCuve.id && !m.estAnnule) {
          if (m.typeMouvement === 'ENTREE' || m.typeMouvement === 'TRANSFERT_ENTREE') {
            currentStock += Number(m.quantite);
          } else if (m.typeMouvement === 'SORTIE' || m.typeMouvement === 'TRANSFERT_SORTIE') {
            currentStock -= Number(m.quantite);
          }
        }
      }

      // Contrôle de capacité pour ENTREE
      if (typeMouvement === 'ENTREE' || typeMouvement === 'TRANSFERT_ENTREE') {
        const remainingCap = Math.max(0, targetCuve.capaciteMax - currentStock);
        if (numQty > remainingCap) {
          return res.status(400).json({ 
            success: false, 
            error: `Capacité dépassée : la cuve '${targetCuve.nom}' n'a que ${remainingCap.toFixed(1)} L de libre. Quantité demandée : ${numQty.toFixed(1)} L.` 
          });
        }
      }

      // Client
      const rawClientId = rawMouv.client_id || rawMouv.clientId || (db.clients[0]?.id || 'cli-default');
      const targetClient = (db.clients || []).find((cl: any) => cl.id === rawClientId || cl.codeClient === rawClientId);
      const clientId = targetClient ? targetClient.id : (db.clients[0]?.id || 'cli-default');

      // Motif et observations
      const motif = rawMouv.motif || rawMouv.reason || (typeMouvement === 'ENTREE' ? "Bon de Réception d'huile" : "Sortie d'huile");
      const observations = rawMouv.observations || rawMouv.note || null;
      const utilisateur = rawMouv.utilisateur || rawMouv.user || 'Personnel Huilerie';
      const dateMouvement = rawMouv.date_mouvement || rawMouv.dateMouvement || rawMouv.created_at || new Date().toISOString();

      async function getServerNextBonNumber(type: 'REC' | 'SOR' | 'TRF'): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `BON-${type}-${year}-`;
        const seqKey = type.toLowerCase() as 'rec' | 'sor' | 'trf';

        try {
          const { data, error } = await supabase.rpc('get_next_bon_number', { p_type: type, p_year: year });
          if (!error && data && typeof data === 'string' && data.startsWith(prefix)) {
            const m = data.match(/(\d+)$/);
            if (m) {
              const num = parseInt(m[1], 10);
              if (!db.sequences) db.sequences = { rec: 0, sor: 0, trf: 0, cli: 0 };
              db.sequences[seqKey] = Math.max(db.sequences[seqKey] || 0, num);
            }
            return data;
          }
        } catch (e) {}

        let maxRemote = 0;
        try {
          const { data } = await supabase
            .from('movements')
            .select('numero_bon')
            .ilike('numero_bon', `${prefix}%`)
            .order('numero_bon', { ascending: false })
            .limit(30);
          if (data && Array.isArray(data)) {
            for (const r of data) {
              const m = (r.numero_bon || '').match(/(\d+)$/);
              if (m) {
                const val = parseInt(m[1], 10);
                if (val > maxRemote) maxRemote = val;
              }
            }
          }
        } catch (e) {}

        let maxLocal = 0;
        for (const m of (db.mouvements || [])) {
          const b = m.numeroBon || '';
          if (b.startsWith(prefix)) {
            const match = b.match(/(\d+)$/);
            if (match) {
              const val = parseInt(match[1], 10);
              if (val > maxLocal) maxLocal = val;
            }
          }
        }

        if (!db.sequences) db.sequences = { rec: 0, sor: 0, trf: 0, cli: 0 };
        const curSeq = db.sequences[seqKey] || 0;
        const nextVal = Math.max(maxRemote, maxLocal, curSeq) + 1;
        db.sequences[seqKey] = nextVal;
        return `${prefix}${String(nextVal).padStart(4, '0')}`;
      }

      function toUuid(rawId: string): string {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
          return rawId;
        }
        let hash = 0;
        for (let i = 0; i < rawId.length; i++) {
          hash = ((hash << 5) - hash) + rawId.charCodeAt(i);
          hash |= 0;
        }
        const hex = Math.abs(hash).toString(16).padStart(8, '0');
        const nowHex = Date.now().toString(16).padStart(12, '0');
        return `${hex.slice(0, 8)}-1234-4567-89ab-${nowHex.slice(-12)}`;
      }

      let numeroBon = rawMouv.numero_bon || rawMouv.numeroBon;
      let id = rawMouv.id || `mouv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      let safeUuid = toUuid(id);

      // 1. Insertion directe sur Supabase avec boucle anti-collision 23505
      let supaSuccess = false;
      let supaError: any = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 5;

      while (attempts < MAX_ATTEMPTS) {
        attempts++;
        if (!numeroBon || attempts > 1) {
          numeroBon = await getServerNextBonNumber(typeMouvement === 'ENTREE' ? 'REC' : 'SOR');
          id = `mouv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          safeUuid = toUuid(id);
        }

        try {
          const supaPayload1 = {
            id: safeUuid,
            numero_bon: numeroBon,
            type_mouvement: typeMouvement,
            cuve_id: targetCuve.id,
            client_id: clientId,
            quantite: Math.round(numQty * 100) / 100,
            acidite: rawMouv.acidite != null ? Number(rawMouv.acidite) : null,
            date_mouvement: dateMouvement,
            motif,
            observations,
            utilisateur,
            est_annule: false
          };

          const { error: supaErr1 } = await supabase.from('movements').insert([supaPayload1]);
          if (!supaErr1) {
            supaSuccess = true;
            break;
          }

          const isBonCollision = supaErr1.code === '23505' || 
            (supaErr1.message && (
              supaErr1.message.includes('movements_numero_bon_key') || 
              supaErr1.message.includes('numero_bon')
            ));

          if (isBonCollision && attempts < MAX_ATTEMPTS) {
            console.warn(`[Server Collision 23505] Bon ${numeroBon} existe déjà. Tentative ${attempts + 1}/${MAX_ATTEMPTS}...`);
            await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
            numeroBon = undefined; // Forcer régénération au tour suivant
            continue;
          }

          if (supaErr1.code === 'PGRST204' || supaErr1.code === '22P02') {
            const supaPayload2 = {
              id: safeUuid,
              type: typeMouvement,
              quantity: Math.round(numQty * 100) / 100,
              lot: targetCuve.id,
              reason: motif || numeroBon,
              note: [observations, `Bon: ${numeroBon}`, `Client: ${clientId}`].filter(Boolean).join(' | '),
              created_at: dateMouvement
            };
            const { error: supaErr2 } = await supabase.from('movements').insert([supaPayload2]);
            if (!supaErr2) {
              supaSuccess = true;
              break;
            }
            const isBonColl2 = supaErr2.code === '23505' || (supaErr2.message && supaErr2.message.includes('numero_bon'));
            if (isBonColl2 && attempts < MAX_ATTEMPTS) {
              await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
              numeroBon = undefined;
              continue;
            }
            supaError = supaErr2;
            break;
          } else {
            supaError = supaErr1;
            break;
          }
        } catch (err: any) {
          console.error("Exception Supabase /api/mouvement:", err);
          supaError = err;
          break;
        }
      }

      // 2. Sauvegarde locale centrale (garantit que l'application ne perd jamais la donnée)
      const localMovement = {
        id,
        numeroBon,
        typeMouvement,
        cuveId: targetCuve.id,
        clientId,
        quantite: Math.round(numQty * 100) / 100,
        acidite: rawMouv.acidite != null ? Number(rawMouv.acidite) : undefined,
        dateMouvement,
        motif,
        observations: observations || undefined,
        utilisateur,
        estAnnule: false
      };

      db.mouvements.unshift(localMovement);

      // Audit Log
      const auditLog = {
        id: `log-${Date.now()}`,
        dateAction: new Date().toISOString(),
        utilisateur,
        action: typeMouvement === 'ENTREE' ? 'ENTREE_HUILE' : 'SORTIE_HUILE',
        tableCible: 'mouvements',
        entiteId: id,
        details: `${typeMouvement} de ${numQty} L dans ${targetCuve.nom} (Bon ${numeroBon})`
      };
      db.auditLogs.unshift(auditLog);

      writeDb(db);

      const nouveauStock = typeMouvement === 'ENTREE' ? currentStock + numQty : Math.max(0, currentStock - numQty);
      res.json({ 
        success: true, 
        mouvement: localMovement, 
        stockActuel: nouveauStock,
        cuve: { id: targetCuve.id, numero: targetCuve.numero, nom: targetCuve.nom, stockActuel: nouveauStock }
      });
    } catch (err: any) {
      console.error("Erreur serveur handlePostMovement:", err);
      res.status(500).json({ success: false, error: err.message });
    }
    }).catch((err) => {
      console.error("Erreur fatale queue movementMutex:", err);
      if (!res.headersSent) res.status(500).json({ success: false, error: err?.message || 'Erreur interne' });
    });
    return movementMutex;
  };

  app.post('/api/mouvement', handlePostMovement);
  app.post('/api/mouvements', handlePostMovement);
  app.post('/api/movements', handlePostMovement);

  // 4. Export / Import / Reset
  app.post('/api/reset', (req, res) => {
    try {
      writeDb(DEFAULT_DATA);
      writeSettings(DEFAULT_SETTINGS);
      res.json({ success: true, data: DEFAULT_DATA });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- MONTAGE DE VITE EN DEV OU SERVEUR STATIQUE EN PRODUCTION ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // En production : servir les fichiers statiques générés par npm run build
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ success: false, error: 'Endpoint API non trouvé' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn("ATTENTION: Le dossier 'dist' n'existe pas. Assurez-vous d'avoir exécuté 'npm run build'.");
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Huilerie Jemai centralisé démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erreur démarrage serveur:", err);
  process.exit(1);
});
