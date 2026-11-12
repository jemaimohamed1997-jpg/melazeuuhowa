"""
Huilerie Jemai (معصرة جماعي) - Module Base de Données SQLite
Gestion atomique, transactions sécurisées, contraintes d'intégrité et audit permanent.
"""

import sqlite3
import datetime
import os
import shutil
from typing import Dict, List, Optional, Tuple, Any

class DatabaseManager:
    def __init__(self, db_path: str = "huilerie_jemai.db"):
        self.db_path = db_path
        self.init_database()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        # Activation stricte des clés étrangères SQLite
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_database(self) -> None:
        """Initialisation des tables avec contraintes et index."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Table des Cuves / Piles
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cuves (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero TEXT UNIQUE NOT NULL,
                    nom TEXT NOT NULL,
                    capacite_max REAL NOT NULL CHECK(capacite_max > 0),
                    active INTEGER NOT NULL DEFAULT 1,
                    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT
                );
            """)

            # Table des Clients
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS clients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code_client TEXT UNIQUE NOT NULL,
                    nom_complet TEXT NOT NULL,
                    telephone TEXT,
                    notes TEXT,
                    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Table des Utilisateurs (Opérateur / Administrateur)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS utilisateurs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nom_utilisateur TEXT UNIQUE NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('admin', 'operateur')),
                    nom_affiche TEXT NOT NULL
                );
            """)

            # Table des Mouvements d'huile (Entrées, Sorties, Transferts, Annulations)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mouvements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero_bon TEXT UNIQUE NOT NULL,
                    type_mouvement TEXT NOT NULL CHECK(type_mouvement IN ('ENTREE', 'SORTIE', 'TRANSFERT_SORTIE', 'TRANSFERT_ENTREE', 'ANNULATION')),
                    cuve_id INTEGER NOT NULL REFERENCES cuves(id),
                    client_id INTEGER NOT NULL REFERENCES clients(id),
                    quantite REAL NOT NULL CHECK(quantite > 0),
                    date_mouvement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    date_corrigee INTEGER DEFAULT 0,
                    motif TEXT,
                    observations TEXT,
                    utilisateur TEXT NOT NULL,
                    mouvement_origine_id INTEGER REFERENCES mouvements(id),
                    est_annule INTEGER NOT NULL DEFAULT 0,
                    date_annulation TIMESTAMP,
                    motif_annulation TEXT,
                    utilisateur_annulation TEXT
                );
            """)

            # Table d'Audit pour traçabilité totale des événements système
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    utilisateur TEXT NOT NULL,
                    action TEXT NOT NULL,
                    table_cible TEXT NOT NULL,
                    entite_id TEXT,
                    details TEXT
                );
            """)

            # Index pour accélérer les requêtes de solde et d'historique
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_mouv_cuve ON mouvements(cuve_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_mouv_client ON mouvements(client_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_mouv_date ON mouvements(date_mouvement);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_mouv_bon ON mouvements(numero_bon);")

            # Utilisateurs par défaut si absents
            cursor.execute("INSERT OR IGNORE INTO utilisateurs (nom_utilisateur, role, nom_affiche) VALUES ('admin', 'admin', 'Gérant (Admin)');")
            cursor.execute("INSERT OR IGNORE INTO utilisateurs (nom_utilisateur, role, nom_affiche) VALUES ('operateur', 'operateur', 'Opérateur Cuverie');")

            conn.commit()

    def generate_numero_bon(self, prefix: str = "REC") -> str:
        """Génère un numéro séquentiel unique par année (ex: BON-REC-2026-0001)."""
        year = datetime.datetime.now().year
        pattern = f"BON-{prefix}-{year}-%"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM mouvements WHERE numero_bon LIKE ?", (pattern,))
            count = cursor.fetchone()[0] + 1
            return f"BON-{prefix}-{year}-{count:04d}"

    # --- CALCULS DE STOCKS ET CAPACITES ---

    def get_stock_cuve(self, cuve_id: int) -> float:
        """Calcule la quantité réelle d'huile dans une cuve à partir des mouvements non annulés."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Mouvements positifs : ENTREE, TRANSFERT_ENTREE
            # Mouvements négatifs : SORTIE, TRANSFERT_SORTIE
            # Les ANNULATIONS sont soit des entrées soit sorties inverses ou gérées par le flag est_annule
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(CASE 
                        WHEN type_mouvement IN ('ENTREE', 'TRANSFERT_ENTREE') AND est_annule = 0 THEN quantite 
                        WHEN type_mouvement IN ('SORTIE', 'TRANSFERT_SORTIE') AND est_annule = 0 THEN -quantite 
                        ELSE 0 
                    END), 0) as stock_total
                FROM mouvements 
                WHERE cuve_id = ?
            """, (cuve_id,))
            row = cursor.fetchone()
            return round(row["stock_total"], 2)

    def get_solde_client_dans_cuve(self, client_id: int, cuve_id: int) -> float:
        """Calcule le solde exact d'huile d'un client dans une cuve spécifique."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(CASE 
                        WHEN type_mouvement IN ('ENTREE', 'TRANSFERT_ENTREE') AND est_annule = 0 THEN quantite 
                        WHEN type_mouvement IN ('SORTIE', 'TRANSFERT_SORTIE') AND est_annule = 0 THEN -quantite 
                        ELSE 0 
                    END), 0) as solde
                FROM mouvements 
                WHERE client_id = ? AND cuve_id = ?
            """, (client_id, cuve_id))
            row = cursor.fetchone()
            return round(row["solde"], 2)

    def get_details_cuve(self, cuve_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM cuves WHERE id = ?", (cuve_id,))
            cuve = cursor.fetchone()
            if not cuve:
                return None
            
            stock_actuel = self.get_stock_cuve(cuve_id)
            cap_max = cuve["capacite_max"]
            cap_restante = max(0.0, round(cap_max - stock_actuel, 2))
            taux = round((stock_actuel / cap_max) * 100, 1) if cap_max > 0 else 0.0

            # Clients présents dans cette cuve
            cursor.execute("""
                SELECT 
                    c.id, c.code_client, c.nom_complet, c.telephone,
                    COALESCE(SUM(CASE 
                        WHEN m.type_mouvement IN ('ENTREE', 'TRANSFERT_ENTREE') AND m.est_annule = 0 THEN m.quantite 
                        WHEN m.type_mouvement IN ('SORTIE', 'TRANSFERT_SORTIE') AND m.est_annule = 0 THEN -m.quantite 
                        ELSE 0 
                    END), 0) as quantite_stockee
                FROM clients c
                JOIN mouvements m ON m.client_id = c.id
                WHERE m.cuve_id = ?
                GROUP BY c.id
                HAVING quantite_stockee > 0.001
            """, (cuve_id,))
            clients_in_cuve = [dict(row) for row in cursor.fetchall()]

            return {
                "id": cuve["id"],
                "numero": cuve["numero"],
                "nom": cuve["nom"],
                "capacite_max": cap_max,
                "active": cuve["active"],
                "notes": cuve["notes"],
                "stock_actuel": stock_actuel,
                "capacite_restante": cap_restante,
                "taux_remplissage": taux,
                "clients": clients_in_cuve
            }

    # --- OPERATIONS ATOMIQUES AVEC CONTROLES STRICTS ---

    def enregistrer_entree(self, client_id: int, cuve_id: int, quantite: float, utilisateur: str, 
                           observations: str = "", date_mouvement: Optional[str] = None) -> Dict[str, Any]:
        """
        Enregistre une entrée d'huile.
        Contrôle obligatoire : interdire toute entrée qui dépasse la capacité restante de la cuve.
        """
        if quantite <= 0:
            raise ValueError("La quantité doit être strictement positive.")

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Vérifier la cuve
            cursor.execute("SELECT capacite_max, active, nom FROM cuves WHERE id = ?", (cuve_id,))
            cuve = cursor.fetchone()
            if not cuve:
                raise ValueError("Cuve introuvable.")
            if not cuve["active"]:
                raise ValueError("Impossible d'enregistrer une entrée sur une cuve désactivée.")

            # Vérifier le client
            cursor.execute("SELECT nom_complet FROM clients WHERE id = ?", (client_id,))
            client = cursor.fetchone()
            if not client:
                raise ValueError("Client introuvable.")

            # Calcul du stock actuel dans la cuve (dans la transaction)
            stock_actuel = self.get_stock_cuve(cuve_id)
            capacite_max = cuve["capacite_max"]
            capacite_restante = round(capacite_max - stock_actuel, 2)

            if quantite > capacite_restante:
                raise ValueError(
                    f"Capacité insuffisante : la cuve '{cuve['nom']}' a une capacité restante de "
                    f"{capacite_restante:.2f} L. Entrée de {quantite:.2f} L refusée !"
                )

            numero_bon = self.generate_numero_bon("REC")
            date_eff = date_mouvement or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            cursor.execute("""
                INSERT INTO mouvements (
                    numero_bon, type_mouvement, cuve_id, client_id, quantite, 
                    date_mouvement, observations, utilisateur
                ) VALUES (?, 'ENTREE', ?, ?, ?, ?, ?, ?)
            """, (numero_bon, cuve_id, client_id, quantite, date_eff, observations, utilisateur))

            mouv_id = cursor.lastrowid

            cursor.execute("""
                INSERT INTO audit_logs (utilisateur, action, table_cible, entite_id, details)
                VALUES (?, 'ENTREE_HUILE', 'mouvements', ?, ?)
            """, (utilisateur, str(mouv_id), f"Entrée de {quantite}L pour {client['nom_complet']} dans {cuve['nom']} (Bon {numero_bon})"))

            conn.commit()

            return {
                "id": mouv_id,
                "numero_bon": numero_bon,
                "client_id": client_id,
                "cuve_id": cuve_id,
                "quantite": quantite,
                "date_mouvement": date_eff,
                "utilisateur": utilisateur
            }

    def enregistrer_sortie(self, client_id: int, cuve_id: int, quantite: float, utilisateur: str,
                           motif: str = "", observations: str = "", date_mouvement: Optional[str] = None) -> Dict[str, Any]:
        """
        Enregistre une sortie d'huile.
        Contrôle obligatoire : interdire toute sortie supérieure au solde du client ET au stock de la cuve.
        """
        if quantite <= 0:
            raise ValueError("La quantité doit être strictement positive.")

        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT nom, capacite_max FROM cuves WHERE id = ?", (cuve_id,))
            cuve = cursor.fetchone()
            if not cuve:
                raise ValueError("Cuve introuvable.")

            cursor.execute("SELECT nom_complet FROM clients WHERE id = ?", (client_id,))
            client = cursor.fetchone()
            if not client:
                raise ValueError("Client introuvable.")

            solde_client = self.get_solde_client_dans_cuve(client_id, cuve_id)
            stock_cuve = self.get_stock_cuve(cuve_id)

            if quantite > solde_client:
                raise ValueError(
                    f"Solde client insuffisant : le client '{client['nom_complet']}' ne dispose que de "
                    f"{solde_client:.2f} L dans la cuve '{cuve['nom']}'. Sortie de {quantite:.2f} L refusée !"
                )

            if quantite > stock_cuve:
                raise ValueError(
                    f"Stock de cuve insuffisant : la cuve ne contient que {stock_cuve:.2f} L. Sortie refusée !"
                )

            numero_bon = self.generate_numero_bon("SOR")
            date_eff = date_mouvement or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            cursor.execute("""
                INSERT INTO mouvements (
                    numero_bon, type_mouvement, cuve_id, client_id, quantite, 
                    date_mouvement, motif, observations, utilisateur
                ) VALUES (?, 'SORTIE', ?, ?, ?, ?, ?, ?, ?)
            """, (numero_bon, cuve_id, client_id, quantite, date_eff, motif, observations, utilisateur))

            mouv_id = cursor.lastrowid

            cursor.execute("""
                INSERT INTO audit_logs (utilisateur, action, table_cible, entite_id, details)
                VALUES (?, 'SORTIE_HUILE', 'mouvements', ?, ?)
            """, (utilisateur, str(mouv_id), f"Sortie de {quantite}L pour {client['nom_complet']} depuis {cuve['nom']} (Bon {numero_bon})"))

            conn.commit()

            return {
                "id": mouv_id,
                "numero_bon": numero_bon,
                "client_id": client_id,
                "cuve_id": cuve_id,
                "quantite": quantite,
                "date_mouvement": date_eff,
                "utilisateur": utilisateur
            }

    def enregistrer_transfert(self, client_id: int, cuve_source_id: int, cuve_dest_id: int,
                              quantite: float, utilisateur: str, motif: str = "") -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Transfère de l'huile d'une cuve source vers une cuve destination pour un client.
        Contrôles :
        - Solde suffisant du client dans la cuve source
        - Capacité restante suffisante dans la cuve destination
        Opération atomique enregistrant deux mouvements liés : TRANSFERT_SORTIE et TRANSFERT_ENTREE.
        """
        if cuve_source_id == cuve_dest_id:
            raise ValueError("La cuve source et la cuve destination doivent être distinctes.")
        if quantite <= 0:
            raise ValueError("La quantité transférée doit être supérieure à 0.")

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Vérifier les cuves
            cursor.execute("SELECT nom, active FROM cuves WHERE id = ?", (cuve_source_id,))
            c_src = cursor.fetchone()
            cursor.execute("SELECT nom, capacite_max, active FROM cuves WHERE id = ?", (cuve_dest_id,))
            c_dest = cursor.fetchone()

            if not c_src or not c_dest:
                raise ValueError("Une des cuves sélectionnées est introuvable.")
            if not c_dest["active"]:
                raise ValueError(f"La cuve de destination '{c_dest['nom']}' est désactivée.")

            # Vérifier solde source
            solde_src = self.get_solde_client_dans_cuve(client_id, cuve_source_id)
            if quantite > solde_src:
                raise ValueError(
                    f"Solde source insuffisant : le client n'a que {solde_src:.2f} L dans '{c_src['nom']}'. "
                    f"Transfert de {quantite:.2f} L impossible !"
                )

            # Vérifier capacité destination
            stock_dest = self.get_stock_cuve(cuve_dest_id)
            cap_dest_restante = round(c_dest["capacite_max"] - stock_dest, 2)
            if quantite > cap_dest_restante:
                raise ValueError(
                    f"Capacité destination insuffisante : '{c_dest['nom']}' ne peut accueillir que "
                    f"{cap_dest_restante:.2f} L. Transfert de {quantite:.2f} L refusé !"
                )

            date_now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            bon_trf_sort = self.generate_numero_bon("TRF-S")
            bon_trf_ent = self.generate_numero_bon("TRF-E")

            # Sortie de la cuve source
            cursor.execute("""
                INSERT INTO mouvements (
                    numero_bon, type_mouvement, cuve_id, client_id, quantite,
                    date_mouvement, motif, observations, utilisateur
                ) VALUES (?, 'TRANSFERT_SORTIE', ?, ?, ?, ?, ?, ?, ?)
            """, (bon_trf_sort, cuve_source_id, client_id, quantite, date_now, motif, 
                  f"Transfert vers cuve {c_dest['nom']}", utilisateur))
            id_sort = cursor.lastrowid

            # Entrée dans la cuve destination liée
            cursor.execute("""
                INSERT INTO mouvements (
                    numero_bon, type_mouvement, cuve_id, client_id, quantite,
                    date_mouvement, motif, observations, utilisateur, mouvement_origine_id
                ) VALUES (?, 'TRANSFERT_ENTREE', ?, ?, ?, ?, ?, ?, ?, ?)
            """, (bon_trf_ent, cuve_dest_id, client_id, quantite, date_now, motif,
                  f"Transfert depuis cuve {c_src['nom']}", utilisateur, id_sort))
            id_ent = cursor.lastrowid

            # Lier la sortie à l'entrée
            cursor.execute("UPDATE mouvements SET mouvement_origine_id = ? WHERE id = ?", (id_ent, id_sort))

            cursor.execute("""
                INSERT INTO audit_logs (utilisateur, action, table_cible, entite_id, details)
                VALUES (?, 'TRANSFERT_HUILE', 'mouvements', ?, ?)
            """, (utilisateur, f"{id_sort}->{id_ent}", 
                  f"Transfert de {quantite}L de {c_src['nom']} vers {c_dest['nom']} (Bons {bon_trf_sort} / {bon_trf_ent})"))

            conn.commit()

            return (
                {"id": id_sort, "bon": bon_trf_sort, "type": "TRANSFERT_SORTIE", "cuve": c_src["nom"]},
                {"id": id_ent, "bon": bon_trf_ent, "type": "TRANSFERT_ENTREE", "cuve": c_dest["nom"]}
            )

    def annuler_mouvement(self, mouvement_id: int, motif_annulation: str, utilisateur: str) -> Dict[str, Any]:
        """
        Annulation traçable avec contre-passation.
        Ne supprime JAMAIS la ligne : marque `est_annule = 1` et crée une ligne d'audit.
        Vérifie au préalable que l'annulation ne rendrait pas un stock ou un solde négatif !
        """
        if not motif_annulation or len(motif_annulation.strip()) < 3:
            raise ValueError("Le motif d'annulation est obligatoire et doit être explicite.")

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM mouvements WHERE id = ?", (mouvement_id,))
            mouv = cursor.fetchone()
            if not mouv:
                raise ValueError("Mouvement introuvable.")
            if mouv["est_annule"]:
                raise ValueError("Ce mouvement est déjà annulé.")

            # Si c'était une entrée, l'annuler revient à retirer l'huile : vérifier que le solde actuel le permet !
            if mouv["type_mouvement"] in ('ENTREE', 'TRANSFERT_ENTREE'):
                solde_actuel = self.get_solde_client_dans_cuve(mouv["client_id"], mouv["cuve_id"])
                if solde_actuel < mouv["quantite"]:
                    raise ValueError(
                        f"Impossible d'annuler cette entrée de {mouv['quantite']:.2f} L : le solde actuel du client "
                        f"dans cette cuve n'est que de {solde_actuel:.2f} L (de l'huile a déjà été retirée depuis)."
                    )

            date_now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            cursor.execute("""
                UPDATE mouvements 
                SET est_annule = 1, 
                    date_annulation = ?, 
                    motif_annulation = ?, 
                    utilisateur_annulation = ?
                WHERE id = ?
            """, (date_now, motif_annulation, utilisateur, mouvement_id))

            # Si c'est un transfert, annuler le mouvement pair associé
            if mouv["mouvement_origine_id"]:
                cursor.execute("""
                    UPDATE mouvements 
                    SET est_annule = 1, 
                        date_annulation = ?, 
                        motif_annulation = ?, 
                        utilisateur_annulation = ?
                    WHERE id = ?
                """, (date_now, f"Contre-passation liée: {motif_annulation}", utilisateur, mouv["mouvement_origine_id"]))

            cursor.execute("""
                INSERT INTO audit_logs (utilisateur, action, table_cible, entite_id, details)
                VALUES (?, 'ANNULATION_MOUVEMENT', 'mouvements', ?, ?)
            """, (utilisateur, str(mouvement_id), f"Annulation du bon {mouv['numero_bon']}. Motif : {motif_annulation}"))

            conn.commit()

            return {
                "id": mouvement_id,
                "numero_bon": mouv["numero_bon"],
                "statut": "ANNULE",
                "date_annulation": date_now,
                "motif": motif_annulation
            }

    # --- SAUVEGARDES ET RESTAURATIONS ---

    def creer_sauvegarde(self, dossier_dest: str = "sauvegardes") -> str:
        """Crée une sauvegarde horodatée et vérifiée de la base SQLite."""
        os.makedirs(dossier_dest, exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        nom_fichier = f"huilerie_jemai_backup_{timestamp}.db"
        chemin_dest = os.path.join(dossier_dest, nom_fichier)

        # Copie via l'API de backup en ligne de SQLite pour consistance garantie
        with self.get_connection() as src_conn:
            dst_conn = sqlite3.connect(chemin_dest)
            src_conn.backup(dst_conn)
            dst_conn.close()

        # Vérification d'intégrité de la sauvegarde
        with sqlite3.connect(chemin_dest) as test_conn:
            cursor = test_conn.cursor()
            cursor.execute("PRAGMA integrity_check;")
            res = cursor.fetchone()[0]
            if res != "ok":
                os.remove(chemin_dest)
                raise RuntimeError("Échec de la sauvegarde : le fichier généré est corrompu !")

        # Journaliser dans l'audit
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO audit_logs (utilisateur, action, table_cible, entite_id, details)
                VALUES ('SYSTEME', 'SAUVEGARDE_AUTO', 'database', ?, ?)
            """, (nom_fichier, f"Sauvegarde réussie vers {chemin_dest}"))
            conn.commit()

        return chemin_dest

    def restaurer_sauvegarde(self, chemin_sauvegarde: str) -> bool:
        """Restaure une base à partir d'un fichier après contrôle d'intégrité strict."""
        if not os.path.exists(chemin_sauvegarde):
            raise FileNotFoundError(f"Fichier de sauvegarde introuvable : {chemin_sauvegarde}")

        # Contrôle d'intégrité préalable
        with sqlite3.connect(chemin_sauvegarde) as test_conn:
            cursor = test_conn.cursor()
            cursor.execute("PRAGMA integrity_check;")
            if cursor.fetchone()[0] != "ok":
                raise ValueError("Restauration impossible : le fichier de sauvegarde est altéré !")

        # Préserver l'état actuel en sécurité avant écrasement
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        safety_copy = f"{self.db_path}.safety_copy_{timestamp}.bak"
        if os.path.exists(self.db_path):
            shutil.copy2(self.db_path, safety_copy)

        # Remplacement
        shutil.copy2(chemin_sauvegarde, self.db_path)
        return True
