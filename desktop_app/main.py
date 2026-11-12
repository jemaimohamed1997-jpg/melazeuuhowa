"""
Huilerie Jemai (معصرة جماعي) - Application Desktop Windows 11
Interface graphique moderne sous PySide6 (Qt pour Python) avec SQLite persistant,
contrôle des capacités, génération de bons d'impression et sauvegardes sécurisées.
"""

import sys
import os
import datetime
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QTabWidget, QLabel, QPushButton, QTableWidget, QTableWidgetItem,
    QHeaderView, QMessageBox, QDialog, QFormLayout, QLineEdit,
    QDoubleSpinBox, QComboBox, QTextEdit, QFileDialog, QGroupBox,
    QProgressBar, QFrame, QSplitter
)
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QFont, QIcon, QColor
from PySide6.QtPrintSupport import QPrinter, QPrintDialog

from database import DatabaseManager
from receipt_printer import generer_html_bon

class HuilerieMainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Huilerie Jemai (معصرة جماعي) - Gestion de Stock d'Huile d'Olive")
        self.resize(1280, 800)
        self.setMinimumSize(1000, 650)

        # Base de données locale SQLite
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "huilerie_jemai.db")
        self.db = DatabaseManager(db_path)
        self.current_user = "admin"  # Par défaut admin

        self.init_ui()
        self.rafraichir_tout()

    def init_ui(self):
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QVBoxLayout(main_widget)
        main_layout.setContentsMargins(16, 12, 16, 16)
        main_layout.setSpacing(12)

        # En-tête Windows 11 avec identité Huilerie Jemai
        header = self.creer_header()
        main_layout.addWidget(header)

        # Onglets principaux
        self.tabs = QTabWidget()
        self.tabs.setStyleSheet("""
            QTabWidget::pane { border: 1px solid #d6d3d1; background: #ffffff; border-radius: 6px; }
            QTabBar::tab { background: #e7e5e4; color: #44403c; padding: 10px 18px; font-weight: 600; border-top-left-radius: 6px; border-top-right-radius: 6px; margin-right: 4px; }
            QTabBar::tab:selected { background: #2d4a22; color: #ffffff; }
        """)

        # 1. Tableau de bord
        self.tab_dashboard = QWidget()
        self.init_tab_dashboard()
        self.tabs.addTab(self.tab_dashboard, "📊 Tableau de Bord")

        # 2. Gestion des Piles / Cuves
        self.tab_cuves = QWidget()
        self.init_tab_cuves()
        self.tabs.addTab(self.tab_cuves, "🛢️ Piles & Cuves")

        # 3. Gestion des Clients
        self.tab_clients = QWidget()
        self.init_tab_clients()
        self.tabs.addTab(self.tab_clients, "👥 Clients & Producteurs")

        # 4. Historique & Audit
        self.tab_historique = QWidget()
        self.init_tab_historique()
        self.tabs.addTab(self.tab_historique, "📜 Historique & Audit")

        # 5. Sauvegardes & Sécurité
        self.tab_sauvegardes = QWidget()
        self.init_tab_sauvegardes()
        self.tabs.addTab(self.tab_sauvegardes, "💾 Sauvegardes & Données")

        main_layout.addWidget(self.tabs)

        # Barre d'état en bas
        self.statusBar().showMessage("Prêt - Huilerie Jemai (Système sécurisé)")

    def creer_header(self) -> QWidget:
        header_frame = QFrame()
        header_frame.setStyleSheet("background-color: #2d4a22; border-radius: 8px; color: white; padding: 6px 14px;")
        layout = QHBoxLayout(header_frame)

        titles_box = QVBoxLayout()
        title = QLabel("HUILERIE JEMAI")
        title.setStyleSheet("font-size: 20px; font-weight: 800; color: #fef08a; letter-spacing: 1px;")
        subtitle = QLabel("معصرة جماعي - Système Officiel de Gestion des Cuves et Stocks d'Huile")
        subtitle.setStyleSheet("font-size: 13px; color: #e7e5e4;")
        titles_box.addWidget(title)
        titles_box.addWidget(subtitle)
        layout.addLayout(titles_box)

        layout.addStretch()

        # Boutons d'action rapide
        btn_entree = QPushButton("➕ Entrée d'Huile")
        btn_entree.setStyleSheet("background-color: #15803d; color: white; font-weight: bold; padding: 8px 14px; border-radius: 6px;")
        btn_entree.clicked.connect(self.ouvrir_dialogue_entree)
        layout.addWidget(btn_entree)

        btn_sortie = QPushButton("➖ Sortie d'Huile")
        btn_sortie.setStyleSheet("background-color: #b45309; color: white; font-weight: bold; padding: 8px 14px; border-radius: 6px;")
        btn_sortie.clicked.connect(self.ouvrir_dialogue_sortie)
        layout.addWidget(btn_sortie)

        btn_transfert = QPushButton("🔄 Transfert Cuves")
        btn_transfert.setStyleSheet("background-color: #0369a1; color: white; font-weight: bold; padding: 8px 14px; border-radius: 6px;")
        btn_transfert.clicked.connect(self.ouvrir_dialogue_transfert)
        layout.addWidget(btn_transfert)

        return header_frame

    def init_tab_dashboard(self):
        layout = QVBoxLayout(self.tab_dashboard)
        layout.setContentsMargins(16, 16, 16, 16)

        # Cartes KPI
        kpi_layout = QHBoxLayout()
        
        self.kpi_stock = self.creer_carte_kpi("Volume Stocké Total", "0 L", "#15803d")
        self.kpi_capacite = self.creer_carte_kpi("Capacité Totale Cuverie", "0 L", "#0369a1")
        self.kpi_restante = self.creer_carte_kpi("Capacité Restante Libre", "0 L", "#b45309")
        self.kpi_taux = self.creer_carte_kpi("Taux Remplissage Global", "0 %", "#4d7c0f")

        kpi_layout.addWidget(self.kpi_stock)
        kpi_layout.addWidget(self.kpi_capacite)
        kpi_layout.addWidget(self.kpi_restante)
        kpi_layout.addWidget(self.kpi_taux)
        layout.addLayout(kpi_layout)

        # Tableau des cuves actives
        lbl_cuves = QLabel("État en temps réel des Piles et Cuves")
        lbl_cuves.setStyleSheet("font-size: 15px; font-weight: bold; margin-top: 10px;")
        layout.addWidget(lbl_cuves)

        self.table_dash_cuves = QTableWidget()
        self.table_dash_cuves.setColumnCount(6)
        self.table_dash_cuves.setHorizontalHeaderLabels(["N° Pile", "Désignation", "Capacité Max", "Stock Actuel", "Libre", "Remplissage"])
        self.table_dash_cuves.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.table_dash_cuves)

    def creer_carte_kpi(self, titre: str, valeur: str, couleur: str) -> QFrame:
        frame = QFrame()
        frame.setStyleSheet(f"background-color: #fafaf9; border-left: 6px solid {couleur}; border-radius: 6px; padding: 12px; border-top: 1px solid #e7e5e4; border-right: 1px solid #e7e5e4; border-bottom: 1px solid #e7e5e4;")
        l = QVBoxLayout(frame)
        t = QLabel(titre)
        t.setStyleSheet("font-size: 11px; text-transform: uppercase; color: #78716c; font-weight: bold;")
        v = QLabel(valeur)
        v.setStyleSheet(f"font-size: 22px; font-weight: 800; color: {couleur};")
        v.setObjectName("valeur")
        l.addWidget(t)
        l.addWidget(v)
        return frame

    def init_tab_cuves(self):
        layout = QVBoxLayout(self.tab_cuves)
        layout.setContentsMargins(16, 16, 16, 16)

        barre_action = QHBoxLayout()
        btn_nouvelle_cuve = QPushButton("➕ Ajouter une Nouvelle Pile / Cuve")
        btn_nouvelle_cuve.setStyleSheet("background-color: #2d4a22; color: white; padding: 8px 16px; font-weight: bold; border-radius: 4px;")
        btn_nouvelle_cuve.clicked.connect(self.dialogue_ajouter_cuve)
        barre_action.addWidget(btn_nouvelle_cuve)
        barre_action.addStretch()
        layout.addLayout(barre_action)

        self.table_cuves = QTableWidget()
        self.table_cuves.setColumnCount(7)
        self.table_cuves.setHorizontalHeaderLabels(["ID", "N° Pile", "Nom", "Capacité Max (L)", "Stock (L)", "Reste (L)", "Clients dans la cuve"])
        self.table_cuves.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.table_cuves)

    def init_tab_clients(self):
        layout = QVBoxLayout(self.tab_clients)
        layout.setContentsMargins(16, 16, 16, 16)

        barre = QHBoxLayout()
        btn_client = QPushButton("➕ Enregistrer un Nouveau Client / Déposant")
        btn_client.setStyleSheet("background-color: #2d4a22; color: white; padding: 8px 16px; font-weight: bold; border-radius: 4px;")
        btn_client.clicked.connect(self.dialogue_ajouter_client)
        barre.addWidget(btn_client)
        barre.addStretch()
        layout.addLayout(barre)

        self.table_clients = QTableWidget()
        self.table_clients.setColumnCount(5)
        self.table_clients.setHorizontalHeaderLabels(["Code", "Nom Complet", "Téléphone", "Stock Global Déposé", "Répartition par cuves"])
        self.table_clients.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.table_clients)

    def init_tab_historique(self):
        layout = QVBoxLayout(self.tab_historique)
        layout.setContentsMargins(16, 16, 16, 16)

        lbl = QLabel("Registre Permanent et Inaltérable des Mouvements (Journal d'Audit)")
        lbl.setStyleSheet("font-size: 14px; font-weight: bold; color: #44403c;")
        layout.addWidget(lbl)

        self.table_mouvements = QTableWidget()
        self.table_mouvements.setColumnCount(8)
        self.table_mouvements.setHorizontalHeaderLabels(["N° Bon", "Date & Heure", "Type", "Client", "Cuve", "Quantité (L)", "Statut", "Action"])
        self.table_mouvements.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.table_mouvements)

    def init_tab_sauvegardes(self):
        layout = QVBoxLayout(self.tab_sauvegardes)
        layout.setContentsMargins(20, 20, 20, 20)

        box = QGroupBox("Sauvegarde et Sécurité de la Base de Données Huilerie Jemai")
        box.setStyleSheet("font-weight: bold; color: #2d4a22;")
        box_layout = QVBoxLayout(box)

        lbl_info = QLabel("Le système effectue des copies conformes horodatées de la base SQLite. Les sauvegardes peuvent être restaurées à tout moment avec vérification préalable d'intégrité.")
        lbl_info.setWordWrap(True)
        lbl_info.setStyleSheet("color: #57534e; margin-bottom: 12px; font-weight: normal;")
        box_layout.addWidget(lbl_info)

        btn_backup_now = QPushButton("💾 Exécuter une Sauvegarde Manuelle Immédiate")
        btn_backup_now.setStyleSheet("background-color: #15803d; color: white; padding: 10px; font-weight: bold; border-radius: 4px;")
        btn_backup_now.clicked.connect(self.executer_sauvegarde_manuelle)
        box_layout.addWidget(btn_backup_now)

        btn_restore = QPushButton("🔄 Restaurer une Sauvegarde Existante (.db)")
        btn_restore.setStyleSheet("background-color: #b45309; color: white; padding: 10px; font-weight: bold; border-radius: 4px;")
        btn_restore.clicked.connect(self.executer_restauration)
        box_layout.addWidget(btn_restore)

        layout.addWidget(box)
        layout.addStretch()

    # --- ACTIONS & LOGIQUE ---

    def rafraichir_tout(self):
        with self.db.get_connection() as conn:
            c = conn.cursor()
            
            # Cuves
            c.execute("SELECT id FROM cuves WHERE active = 1")
            cuve_ids = [r["id"] for r in c.fetchall()]

            total_stock = 0.0
            total_cap = 0.0

            self.table_cuves.setRowCount(len(cuve_ids))
            self.table_dash_cuves.setRowCount(len(cuve_ids))

            for row_idx, cid in enumerate(cuve_ids):
                details = self.db.get_details_cuve(cid)
                if not details:
                    continue

                total_stock += details["stock_actuel"]
                total_cap += details["capacite_max"]

                # Ligne dans tableau Cuves
                self.table_cuves.setItem(row_idx, 0, QTableWidgetItem(str(details["id"])))
                self.table_cuves.setItem(row_idx, 1, QTableWidgetItem(details["numero"]))
                self.table_cuves.setItem(row_idx, 2, QTableWidgetItem(details["nom"]))
                self.table_cuves.setItem(row_idx, 3, QTableWidgetItem(f"{details['capacite_max']:,.2f}"))
                self.table_cuves.setItem(row_idx, 4, QTableWidgetItem(f"{details['stock_actuel']:,.2f}"))
                self.table_cuves.setItem(row_idx, 5, QTableWidgetItem(f"{details['capacite_restante']:,.2f}"))
                clients_txt = ", ".join([f"{cl['nom_complet']} ({cl['quantite_stockee']}L)" for cl in details["clients"]]) or "Aucun"
                self.table_cuves.setItem(row_idx, 6, QTableWidgetItem(clients_txt))

                # Ligne dans Dash
                self.table_dash_cuves.setItem(row_idx, 0, QTableWidgetItem(details["numero"]))
                self.table_dash_cuves.setItem(row_idx, 1, QTableWidgetItem(details["nom"]))
                self.table_dash_cuves.setItem(row_idx, 2, QTableWidgetItem(f"{details['capacite_max']:,.2f} L"))
                self.table_dash_cuves.setItem(row_idx, 3, QTableWidgetItem(f"{details['stock_actuel']:,.2f} L"))
                self.table_dash_cuves.setItem(row_idx, 4, QTableWidgetItem(f"{details['capacite_restante']:,.2f} L"))
                self.table_dash_cuves.setItem(row_idx, 5, QTableWidgetItem(f"{details['taux_remplissage']}%"))

            # Maj KPIs
            self.kpi_stock.findChild(QLabel, "valeur").setText(f"{total_stock:,.1f} L")
            self.kpi_capacite.findChild(QLabel, "valeur").setText(f"{total_cap:,.1f} L")
            reste_global = max(0.0, total_cap - total_stock)
            self.kpi_restante.findChild(QLabel, "valeur").setText(f"{reste_global:,.1f} L")
            taux_global = round((total_stock / total_cap * 100), 1) if total_cap > 0 else 0
            self.kpi_taux.findChild(QLabel, "valeur").setText(f"{taux_global} %")

            # Clients
            c.execute("SELECT * FROM clients")
            clients = c.fetchall()
            self.table_clients.setRowCount(len(clients))
            for i, cl in enumerate(clients):
                self.table_clients.setItem(i, 0, QTableWidgetItem(cl["code_client"]))
                self.table_clients.setItem(i, 1, QTableWidgetItem(cl["nom_complet"]))
                self.table_clients.setItem(i, 2, QTableWidgetItem(cl["telephone"] or "-"))

                # Calcul total stock du client
                c.execute("""
                    SELECT 
                        COALESCE(SUM(CASE 
                            WHEN type_mouvement IN ('ENTREE', 'TRANSFERT_ENTREE') AND est_annule = 0 THEN quantite 
                            WHEN type_mouvement IN ('SORTIE', 'TRANSFERT_SORTIE') AND est_annule = 0 THEN -quantite 
                            ELSE 0 
                        END), 0) as total_client
                    FROM mouvements WHERE client_id = ?
                """, (cl["id"],))
                tot = c.fetchone()["total_client"]
                self.table_clients.setItem(i, 3, QTableWidgetItem(f"{tot:,.2f} L"))
                self.table_clients.setItem(i, 4, QTableWidgetItem("Détails disponibles"))

            # Mouvements
            c.execute("""
                SELECT m.*, cl.nom_complet as nom_client, cu.nom as nom_cuve 
                FROM mouvements m
                JOIN clients cl ON cl.id = m.client_id
                JOIN cuves cu ON cu.id = m.cuve_id
                ORDER BY m.id DESC LIMIT 100
            """)
            mouvs = c.fetchall()
            self.table_mouvements.setRowCount(len(mouvs))
            for i, m in enumerate(mouvs):
                self.table_mouvements.setItem(i, 0, QTableWidgetItem(m["numero_bon"]))
                self.table_mouvements.setItem(i, 1, QTableWidgetItem(str(m["date_mouvement"])))
                self.table_mouvements.setItem(i, 2, QTableWidgetItem(m["type_mouvement"]))
                self.table_mouvements.setItem(i, 3, QTableWidgetItem(m["nom_client"]))
                self.table_mouvements.setItem(i, 4, QTableWidgetItem(m["nom_cuve"]))
                self.table_mouvements.setItem(i, 5, QTableWidgetItem(f"{m['quantite']:,.2f}"))
                statut = "ANNULÉ" if m["est_annule"] else "VALIDÉ"
                self.table_mouvements.setItem(i, 6, QTableWidgetItem(statut))
                
                btn_print = QPushButton("Imprimer Bon")
                btn_print.clicked.connect(lambda ch, mouv=dict(m): self.imprimer_bon(mouv))
                self.table_mouvements.setCellWidget(i, 7, btn_print)

    def ouvrir_dialogue_entree(self):
        diag = QDialog(self)
        diag.setWindowTitle("Enregistrer une Entrée d'Huile (Réception Déposant)")
        layout = QFormLayout(diag)

        # Clients
        combo_clients = QComboBox()
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT id, code_client, nom_complet FROM clients")
            for cl in c.fetchall():
                combo_clients.addItem(f"{cl['code_client']} - {cl['nom_complet']}", cl["id"])
        layout.addRow("Client / Déposant :", combo_clients)

        # Cuves
        combo_cuves = QComboBox()
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT id, numero, nom FROM cuves WHERE active = 1")
            for cu in c.fetchall():
                det = self.db.get_details_cuve(cu["id"])
                reste = det["capacite_restante"] if det else 0
                combo_cuves.addItem(f"{cu['numero']} - {cu['nom']} (Reste libre: {reste:.1f} L)", cu["id"])
        layout.addRow("Pile / Cuve réceptrice :", combo_cuves)

        # Quantité
        spin_qty = QDoubleSpinBox()
        spin_qty.setRange(0.1, 1000000.0)
        spin_qty.setValue(1000.0)
        spin_qty.setSuffix(" Litres")
        layout.addRow("Quantité d'huile (Litres) :", spin_qty)

        txt_obs = QLineEdit()
        layout.addRow("Observations :", txt_obs)

        btn_valider = QPushButton("Valider l'Entrée & Imprimer le Bon")
        btn_valider.setStyleSheet("background-color: #15803d; color: white; font-weight: bold; padding: 8px;")
        
        def valider():
            client_id = combo_clients.currentData()
            cuve_id = combo_cuves.currentData()
            qty = spin_qty.value()
            try:
                res = self.db.enregistrer_entree(client_id, cuve_id, qty, self.current_user, txt_obs.text())
                QMessageBox.information(diag, "Succès", f"Entrée enregistrée avec succès !\nBon n° : {res['numero_bon']}")
                diag.accept()
                self.rafraichir_tout()
            except Exception as e:
                QMessageBox.critical(diag, "Erreur de Capacité", str(e))

        btn_valider.clicked.connect(valider)
        layout.addRow(btn_valider)
        diag.exec()

    def ouvrir_dialogue_sortie(self):
        diag = QDialog(self)
        diag.setWindowTitle("Enregistrer une Sortie d'Huile (Livraison / Retrait)")
        layout = QFormLayout(diag)

        combo_clients = QComboBox()
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT id, code_client, nom_complet FROM clients")
            for cl in c.fetchall():
                combo_clients.addItem(f"{cl['code_client']} - {cl['nom_complet']}", cl["id"])
        layout.addRow("Client :", combo_clients)

        combo_cuves = QComboBox()
        def maj_cuves_client():
            combo_cuves.clear()
            cid = combo_clients.currentData()
            if not cid:
                return
            with self.db.get_connection() as conn:
                c = conn.cursor()
                c.execute("SELECT id, numero, nom FROM cuves WHERE active = 1")
                for cu in c.fetchall():
                    solde = self.db.get_solde_client_dans_cuve(cid, cu["id"])
                    if solde > 0:
                        combo_cuves.addItem(f"{cu['numero']} - {cu['nom']} (Solde client: {solde:.1f} L)", cu["id"])
        
        combo_clients.currentIndexChanged.connect(maj_cuves_client)
        maj_cuves_client()
        layout.addRow("Pile / Cuve source :", combo_cuves)

        spin_qty = QDoubleSpinBox()
        spin_qty.setRange(0.1, 100000.0)
        spin_qty.setSuffix(" Litres")
        layout.addRow("Quantité à retirer :", spin_qty)

        txt_motif = QLineEdit()
        layout.addRow("Motif du retrait :", txt_motif)

        btn_valider = QPushButton("Valider la Sortie & Imprimer le Bon")
        btn_valider.setStyleSheet("background-color: #b45309; color: white; font-weight: bold; padding: 8px;")

        def valider():
            cid = combo_clients.currentData()
            cuid = combo_cuves.currentData()
            if not cuid:
                QMessageBox.warning(diag, "Attention", "Ce client n'a aucun stock dans les cuves !")
                return
            qty = spin_qty.value()
            try:
                res = self.db.enregistrer_sortie(cid, cuid, qty, self.current_user, txt_motif.text())
                QMessageBox.information(diag, "Succès", f"Sortie effectuée avec succès !\nBon n° : {res['numero_bon']}")
                diag.accept()
                self.rafraichir_tout()
            except Exception as e:
                QMessageBox.critical(diag, "Erreur de Solde", str(e))

        btn_valider.clicked.connect(valider)
        layout.addRow(btn_valider)
        diag.exec()

    def ouvrir_dialogue_transfert(self):
        diag = QDialog(self)
        diag.setWindowTitle("Transfert d'Huile Inter-Cuves")
        layout = QFormLayout(diag)

        combo_clients = QComboBox()
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT id, code_client, nom_complet FROM clients")
            for cl in c.fetchall():
                combo_clients.addItem(f"{cl['code_client']} - {cl['nom_complet']}", cl["id"])
        layout.addRow("Client propriétaire :", combo_clients)

        combo_src = QComboBox()
        combo_dst = QComboBox()

        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT id, numero, nom FROM cuves WHERE active = 1")
            for cu in c.fetchall():
                combo_src.addItem(f"{cu['numero']} - {cu['nom']}", cu["id"])
                combo_dst.addItem(f"{cu['numero']} - {cu['nom']}", cu["id"])

        layout.addRow("Cuve Origine :", combo_src)
        layout.addRow("Cuve Destination :", combo_dst)

        spin_qty = QDoubleSpinBox()
        spin_qty.setRange(0.1, 100000.0)
        spin_qty.setSuffix(" Litres")
        layout.addRow("Quantité transférée :", spin_qty)

        txt_motif = QLineEdit("Transvasement / Filtration")
        layout.addRow("Motif du transfert :", txt_motif)

        btn_valider = QPushButton("Exécuter le Transfert")
        btn_valider.setStyleSheet("background-color: #0369a1; color: white; font-weight: bold; padding: 8px;")

        def valider():
            cid = combo_clients.currentData()
            c_src = combo_src.currentData()
            c_dst = combo_dst.currentData()
            qty = spin_qty.value()
            try:
                sort_res, ent_res = self.db.enregistrer_transfert(cid, c_src, c_dst, qty, self.current_user, txt_motif.text())
                QMessageBox.information(diag, "Succès", f"Transfert réussi !\nBons émis : {sort_res['bon']} & {ent_res['bon']}")
                diag.accept()
                self.rafraichir_tout()
            except Exception as e:
                QMessageBox.critical(diag, "Erreur de Transfert", str(e))

        btn_valider.clicked.connect(valider)
        layout.addRow(btn_valider)
        diag.exec()

    def dialogue_ajouter_cuve(self):
        diag = QDialog(self)
        diag.setWindowTitle("Ajouter une Nouvelle Pile / Cuve")
        layout = QFormLayout(diag)

        txt_num = QLineEdit()
        txt_nom = QLineEdit()
        spin_cap = QDoubleSpinBox()
        spin_cap.setRange(100.0, 500000.0)
        spin_cap.setValue(5000.0)
        spin_cap.setSuffix(" L")

        layout.addRow("Numéro Unique (ex: P-01) :", txt_num)
        layout.addRow("Nom / Désignation :", txt_nom)
        layout.addRow("Capacité Maximale :", spin_cap)

        btn = QPushButton("Créer la Cuve")
        btn.setStyleSheet("background-color: #2d4a22; color: white; padding: 8px;")

        def creer():
            num = txt_num.text().strip()
            nom = txt_nom.text().strip()
            if not num or not nom:
                QMessageBox.warning(diag, "Attention", "Le numéro et le nom sont requis.")
                return
            try:
                with self.db.get_connection() as conn:
                    c = conn.cursor()
                    c.execute("INSERT INTO cuves (numero, nom, capacite_max) VALUES (?, ?, ?)", (num, nom, spin_cap.value()))
                    conn.commit()
                QMessageBox.information(diag, "Succès", f"Pile '{nom}' créée avec succès !")
                diag.accept()
                self.rafraichir_tout()
            except Exception as e:
                QMessageBox.critical(diag, "Erreur", str(e))

        btn.clicked.connect(creer)
        layout.addRow(btn)
        diag.exec()

    def dialogue_ajouter_client(self):
        diag = QDialog(self)
        diag.setWindowTitle("Ajouter un Nouveau Client")
        layout = QFormLayout(diag)

        txt_nom = QLineEdit()
        txt_tel = QLineEdit()

        layout.addRow("Nom Complet / Société :", txt_nom)
        layout.addRow("Téléphone :", txt_tel)

        btn = QPushButton("Enregistrer le Client")
        btn.setStyleSheet("background-color: #2d4a22; color: white; padding: 8px;")

        def creer():
            nom = txt_nom.text().strip()
            if not nom:
                QMessageBox.warning(diag, "Attention", "Le nom est obligatoire.")
                return
            try:
                with self.db.get_connection() as conn:
                    c = conn.cursor()
                    c.execute("SELECT COUNT(*) FROM clients")
                    count = c.fetchone()[0] + 1
                    code = f"CLI-{count:03d}"
                    c.execute("INSERT INTO clients (code_client, nom_complet, telephone) VALUES (?, ?, ?)", (code, nom, txt_tel.text().strip()))
                    conn.commit()
                QMessageBox.information(diag, "Succès", f"Client '{nom}' enregistré avec le code {code} !")
                diag.accept()
                self.rafraichir_tout()
            except Exception as e:
                QMessageBox.critical(diag, "Erreur", str(e))

        btn.clicked.connect(creer)
        layout.addRow(btn)
        diag.exec()

    def imprimer_bon(self, mouv: dict):
        with self.db.get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM clients WHERE id = ?", (mouv["client_id"],))
            client = dict(c.fetchone())
            c.execute("SELECT * FROM cuves WHERE id = ?", (mouv["cuve_id"],))
            cuve = dict(c.fetchone())

        html = generer_html_bon(mouv, client, cuve, duplicata=bool(mouv.get("est_annule", False)))

        # Affichage du dialogue d'impression Windows standard
        printer = QPrinter(QPrinter.HighResolution)
        printer.setPageOrientation(QPrinter.Portrait)
        dialog = QPrintDialog(printer, self)
        if dialog.exec() == QDialog.Accepted:
            from PySide6.QtGui import QTextDocument
            doc = QTextDocument()
            doc.setHtml(html)
            doc.print_(printer)
            QMessageBox.information(self, "Impression", "Le bon a été transmis à votre imprimante Windows avec succès !")

    def executer_sauvegarde_manuelle(self):
        try:
            chemin = self.db.creer_sauvegarde()
            QMessageBox.information(self, "Sauvegarde Réussie", f"La base de données a été sauvegardée avec succès !\nFichier vérifié :\n{chemin}")
        except Exception as e:
            QMessageBox.critical(self, "Erreur de Sauvegarde", str(e))

    def executer_restauration(self):
        fichier, _ = QFileDialog.getOpenFileName(self, "Sélectionner la sauvegarde SQLite à restaurer", "", "Fichiers SQLite (*.db);;Tous les fichiers (*)")
        if not fichier:
            return
        conf = QMessageBox.question(self, "Confirmation", "Attention : la restauration remplacera les données actuelles (une copie de secours sera automatiquement conservée).\nContinuer ?")
        if conf == QMessageBox.Yes:
            try:
                self.db.restaurer_sauvegarde(fichier)
                QMessageBox.information(self, "Restauration Terminée", "La base a été restaurée avec succès !")
                self.rafraichir_tout()
            except Exception as e:
                QMessageBox.critical(self, "Erreur", str(e))

class LoginDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Huilerie Jemai (معصرة جماعي) - Connexion")
        self.setFixedSize(380, 260)
        self.user_role = "admin"
        self.user_name = "Mohamed Jemai (Gérant)"

        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)

        title = QLabel("HUILERIE JEMAI (معصرة جماعي)")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #2d4a22;")
        layout.addWidget(title)

        sub = QLabel("Connexion sécurisée au système de cuverie")
        sub.setStyleSheet("font-size: 11px; color: #57534e; margin-bottom: 8px;")
        layout.addWidget(sub)

        form = QFormLayout()
        self.txt_user = QLineEdit("")
        self.txt_user.setPlaceholderText("Nom d'utilisateur (ex: wizz)")
        self.txt_pass = QLineEdit("")
        self.txt_pass.setPlaceholderText("Mot de passe")
        self.txt_pass.setEchoMode(QLineEdit.Password)

        form.addRow("Identifiant :", self.txt_user)
        form.addRow("Mot de passe :", self.txt_pass)
        layout.addLayout(form)

        btn_box = QHBoxLayout()
        btn_login = QPushButton("Se Connecter")
        btn_login.setStyleSheet("background-color: #2d4a22; color: white; font-weight: bold; padding: 8px; border-radius: 4px;")
        btn_login.clicked.connect(self.verifier)
        btn_box.addWidget(btn_login)
        layout.addLayout(btn_box)

    def verifier(self):
        u = self.txt_user.text().strip().lower()
        p = self.txt_pass.text().strip()
        if (u == 'wizz' and p == 'wizz') or (u in ('admin', 'gerant') and p in ('wizz', 'admin123', '1997')):
            self.user_role = "admin"
            self.user_name = "Administrateur (wizz)"
            self.accept()
        elif (u in ('operateur', 'pesee') and p in ('1234', 'op123', 'operateur')):
            self.user_role = "operateur"
            self.user_name = "Opérateur Cuverie"
            self.accept()
        else:
            QMessageBox.critical(self, "Accès refusé", "Nom d'utilisateur ou mot de passe incorrect.")

def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    
    font = QFont("Segoe UI", 10)
    app.setFont(font)

    login = LoginDialog()
    if login.exec() == QDialog.Accepted:
        window = HuilerieMainWindow()
        window.current_user = login.user_role
        window.show()
        sys.exit(app.exec())

if __name__ == '__main__':
    main()
