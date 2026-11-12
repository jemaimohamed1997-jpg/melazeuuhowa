"""
Huilerie Jemai (معصرة جماعي) - Suite de Tests Unitaires Obligatoires
Vérification stricte de l'ensemble des 11 exigences du cahier des charges :
1. Test cuve 5 000 L
2. Entrée 3 000 L acceptée
3. Entrée 2 000 L supplémentaire acceptée (Total 5 000 L)
4. Refus catégorique de toute entrée supplémentaire
5. Refus d'une sortie supérieure au solde client
6. Multi-clients dans une même pile
7. Transferts inter-piles traçables
8. Persistance et historique après redémarrage
9. Annulation / Correction auditable
10. Sauvegarde et restauration vérifiée
"""

import unittest
import os
import tempfile
import sqlite3
from database import DatabaseManager

class TestHuilerieStock(unittest.TestCase):
    def setUp(self):
        # Création d'une base temporaire isolée pour chaque test
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_huilerie.db")
        self.db = DatabaseManager(self.db_path)

        # Insertion de clients de test
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO clients (code_client, nom_complet, telephone) VALUES ('CLI-001', 'Mohamed Jemai (Gérant)', '21698000001')")
            c.execute("INSERT INTO clients (code_client, nom_complet, telephone) VALUES ('CLI-002', 'Ali Ben Salah', '21698000002')")
            c.execute("INSERT INTO clients (code_client, nom_complet, telephone) VALUES ('CLI-003', 'Salah Trabelsi', '21698000003')")
            conn.commit()

    def tearDown(self):
        # Nettoyage
        if os.path.exists(self.test_dir):
            import shutil
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_a_04_pile_5000l_et_controles_capacite(self):
        """
        Scénario clé exigé :
        - Créer pile 5 000 L
        - Entrée 3 000 L (Acceptée)
        - Entrée 2 000 L (Acceptée, Cuve pleine)
        - Entrée supplémentaire refusée (même 1 Litre)
        """
        # 1. Créer une pile de 5 000 litres
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO cuves (numero, nom, capacite_max) VALUES ('P-01', 'Pile Cuve N°1 (Inox 5000L)', 5000.0)")
            cuve_id = c.lastrowid
            conn.commit()

        details = self.db.get_details_cuve(cuve_id)
        self.assertEqual(details["capacite_max"], 5000.0)
        self.assertEqual(details["stock_actuel"], 0.0)
        self.assertEqual(details["capacite_restante"], 5000.0)

        # 2. Accepter une entrée de 3 000 litres pour Mohamed Jemai (CLI-001)
        res1 = self.db.enregistrer_entree(client_id=1, cuve_id=cuve_id, quantite=3000.0, utilisateur="operateur")
        self.assertTrue(res1["numero_bon"].startswith("BON-REC-"))
        self.assertEqual(self.db.get_stock_cuve(cuve_id), 3000.0)
        self.assertEqual(self.db.get_solde_client_dans_cuve(1, cuve_id), 3000.0)

        # 3. Accepter une entrée supplémentaire de 2 000 litres pour Ali Ben Salah (CLI-002)
        res2 = self.db.enregistrer_entree(client_id=2, cuve_id=cuve_id, quantite=2000.0, utilisateur="operateur")
        self.assertTrue(res2["numero_bon"].startswith("BON-REC-"))
        self.assertEqual(self.db.get_stock_cuve(cuve_id), 5000.0)
        self.assertEqual(self.db.get_solde_client_dans_cuve(2, cuve_id), 2000.0)

        # Vérifier que le taux de remplissage est de 100% et la capacité restante est de 0
        details_pleine = self.db.get_details_cuve(cuve_id)
        self.assertEqual(details_pleine["capacite_restante"], 0.0)
        self.assertEqual(details_pleine["taux_remplissage"], 100.0)

        # 4. Refuser catégoriquement toute entrée supplémentaire (ex: 50 L ou même 1 L)
        with self.assertRaises(ValueError) as context:
            self.db.enregistrer_entree(client_id=1, cuve_id=cuve_id, quantite=50.0, utilisateur="operateur")
        self.assertIn("Capacité insuffisante", str(context.exception))

        # Le stock doit rester intact à 5 000 L
        self.assertEqual(self.db.get_stock_cuve(cuve_id), 5000.0)

    def test_05_refus_sortie_superieure_au_solde_client(self):
        """
        Contrôle de sécurité des sorties :
        Interdire toute sortie supérieure au solde de ce client dans cette pile.
        """
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO cuves (numero, nom, capacite_max) VALUES ('P-02', 'Pile N°2', 10000.0)")
            cuve_id = c.lastrowid
            conn.commit()

        # Mohamed dépose 1 500 L
        self.db.enregistrer_entree(client_id=1, cuve_id=cuve_id, quantite=1500.0, utilisateur="operateur")

        # Tentative de sortie de 2 000 L par Mohamed -> DOIT ÉCHOUER
        with self.assertRaises(ValueError) as ctx:
            self.db.enregistrer_sortie(client_id=1, cuve_id=cuve_id, quantite=2000.0, utilisateur="operateur")
        self.assertIn("Solde client insuffisant", str(ctx.exception))

        # Sortie autorisée de 500 L -> Réussite
        res_ok = self.db.enregistrer_sortie(client_id=1, cuve_id=cuve_id, quantite=500.0, utilisateur="operateur")
        self.assertTrue(res_ok["numero_bon"].startswith("BON-SOR-"))
        self.assertEqual(self.db.get_solde_client_dans_cuve(1, cuve_id), 1000.0)
        self.assertEqual(self.db.get_stock_cuve(cuve_id), 1000.0)

    def test_06_multiples_clients_dans_meme_pile(self):
        """
        Vérifie la cohabitation transparente de plusieurs clients dans la même cuve.
        Chaque solde reste étanche et traçable.
        """
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO cuves (numero, nom, capacite_max) VALUES ('P-03', 'Grande Cuve Partagée', 8000.0)")
            cuve_id = c.lastrowid
            conn.commit()

        self.db.enregistrer_entree(client_id=1, cuve_id=cuve_id, quantite=1200.0, utilisateur="operateur")
        self.db.enregistrer_entree(client_id=2, cuve_id=cuve_id, quantite=2500.0, utilisateur="operateur")
        self.db.enregistrer_entree(client_id=3, cuve_id=cuve_id, quantite=800.0, utilisateur="operateur")

        details = self.db.get_details_cuve(cuve_id)
        self.assertEqual(details["stock_actuel"], 4500.0)
        self.assertEqual(len(details["clients"]), 3)

        # Vérification des soldes individuels
        self.assertEqual(self.db.get_solde_client_dans_cuve(1, cuve_id), 1200.0)
        self.assertEqual(self.db.get_solde_client_dans_cuve(2, cuve_id), 2500.0)
        self.assertEqual(self.db.get_solde_client_dans_cuve(3, cuve_id), 800.0)

    def test_07_transfert_entre_piles(self):
        """
        Vérifie le transfert d'huile d'une pile source vers une pile destination.
        Création de 2 mouvements liés (TRANSFERT_SORTIE et TRANSFERT_ENTREE).
        """
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO cuves (numero, nom, capacite_max) VALUES ('P-SRC', 'Cuve Source', 5000.0)")
            c_src = c.lastrowid
            c.execute("INSERT INTO cuves (numero, nom, capacite_max) VALUES ('P-DST', 'Cuve Destination', 3000.0)")
            c_dst = c.lastrowid
            conn.commit()

        # Dépôt initial de 2 000 L dans P-SRC
        self.db.enregistrer_entree(client_id=1, cuve_id=c_src, quantite=2000.0, utilisateur="operateur")

        # Transfert de 800 L de P-SRC vers P-DST
        sort_info, ent_info = self.db.enregistrer_transfert(
            client_id=1, cuve_source_id=c_src, cuve_dest_id=c_dst, quantite=800.0, utilisateur="admin", motif="Filtration"
        )

        self.assertEqual(self.db.get_stock_cuve(c_src), 1200.0)
        self.assertEqual(self.db.get_stock_cuve(c_dst), 800.0)
        self.assertEqual(self.db.get_solde_client_dans_cuve(1, c_src), 1200.0)
        self.assertEqual(self.db.get_solde_client_dans_cuve(1, c_dst), 800.0)

        # Tentative de transfert supérieur à la capacité restante de destination -> Doit échouer
        with self.assertRaises(ValueError):
            # Destination a 3000 - 800 = 2200 L restante. Tentative de 2500 L
            self.db.enregistrer_transfert(client_id=1, cuve_source_id=c_src, cuve_dest_id=c_dst, quantite=2500.0, utilisateur="admin")

    def test_08_persistance_apres_redemarrage(self):
        """
        Vérifie que la fermeture et réouverture d'une nouvelle instance retrouve exactement l'état des stocks.
        """
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO cuves (numero, nom, capacite_max) VALUES ('P-PERSIST', 'Cuve Test Persist', 4000.0)")
            cuve_id = c.lastrowid
            conn.commit()

        self.db.enregistrer_entree(client_id=1, cuve_id=cuve_id, quantite=1500.0, utilisateur="operateur")

        # Nouvelle instance simulant le redémarrage de l'application
        db_reloaded = DatabaseManager(self.db_path)
        self.assertEqual(db_reloaded.get_stock_cuve(cuve_id), 1500.0)
        self.assertEqual(db_reloaded.get_solde_client_dans_cuve(1, cuve_id), 1500.0)

    def test_09_annulation_et_audit(self):
        """
        Vérifie l'annulation traçable avec contre-passation.
        L'opération originale n'est jamais supprimée de la table (traçabilité permanente).
        """
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO cuves (numero, nom, capacite_max) VALUES ('P-ANNUL', 'Cuve Annulation', 6000.0)")
            cuve_id = c.lastrowid
            conn.commit()

        res = self.db.enregistrer_entree(client_id=2, cuve_id=cuve_id, quantite=1000.0, utilisateur="operateur")
        mouv_id = res["id"]
        self.assertEqual(self.db.get_stock_cuve(cuve_id), 1000.0)

        # Annulation avec motif
        self.db.annuler_mouvement(mouvement_id=mouv_id, motif_annulation="Erreur de saisie ticket pesée n°42", utilisateur="admin")

        # Le stock revient à 0
        self.assertEqual(self.db.get_stock_cuve(cuve_id), 0.0)

        # Mais le mouvement existe toujours dans la base de données
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM mouvements WHERE id = ?", (mouv_id,))
            mouv = c.fetchone()
            self.assertIsNotNone(mouv)
            self.assertEqual(mouv["est_annule"], 1)
            self.assertEqual(mouv["motif_annulation"], "Erreur de saisie ticket pesée n°42")

    def test_10_sauvegarde_et_restauration_verifiee(self):
        """
        Vérifie la création d'un backup SQLite en ligne et sa restauration avec intégrité.
        """
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO cuves (numero, nom, capacite_max) VALUES ('P-BCK', 'Cuve Backup', 5000.0)")
            cuve_id = c.lastrowid
            conn.commit()

        self.db.enregistrer_entree(client_id=1, cuve_id=cuve_id, quantite=2200.0, utilisateur="operateur")

        backup_dir = os.path.join(self.test_dir, "sauvegardes")
        backup_file = self.db.creer_sauvegarde(backup_dir)
        self.assertTrue(os.path.exists(backup_file))

        # Modifier l'état actuel (ajouter 500 L)
        self.db.enregistrer_entree(client_id=1, cuve_id=cuve_id, quantite=500.0, utilisateur="operateur")
        self.assertEqual(self.db.get_stock_cuve(cuve_id), 2700.0)

        # Restaurer la sauvegarde
        self.db.restaurer_sauvegarde(backup_file)
        self.assertEqual(self.db.get_stock_cuve(cuve_id), 2200.0)

if __name__ == '__main__':
    unittest.main()
