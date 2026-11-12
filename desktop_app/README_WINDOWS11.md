# Guide d'Installation et d'Utilisation - Huilerie Jemai (معصرة جماعي)
## Application de Bureau sous Windows 11

Bienvenue dans l'application officielle de gestion de stockage d'huile d'olive de **Huilerie Jemai (معصرة جماعي)**. Ce guide est conçu pour être suivi pas à pas, même par une personne n'ayant aucune compétence en programmation.

---

### OPTION 1 : DÉMARRAGE RAPIDE DIRECT EN PYTHON

1. **Installer Python sous Windows 11** :
   - Téléchargez Python 3.10 ou supérieur depuis [python.org](https://www.python.org/downloads/).
   - ⚠️ **Important lors de l'installation** : cochez la case **"Add python.exe to PATH"** en bas de la première fenêtre d'installation.
   - Cliquez sur **"Install Now"**.

2. **Ouvrir le dossier de l'application** :
   - Ouvrez le dossier `desktop_app` dans l'Explorateur de fichiers Windows.

3. **Lancer l'application** :
   - Double-cliquez simplement sur le fichier `lancer_application.bat` (ou ouvrez l'invite de commande dans ce dossier et tapez `python main.py`).
   - L'application se lance immédiatement avec son interface graphique fluide et professionnelle.

---

### OPTION 2 : CRÉER L'EXÉCUTABLE AUTONOME (.EXE) SANS PYTHON

Si vous souhaitez distribuer le logiciel sur un ordinateur Windows 11 où Python n'est pas installé :

1. Double-cliquez sur le fichier **`build_exe.bat`**.
2. Le script va automatiquement :
   - Installer les bibliothèques gratuites nécessaires (`PySide6`, `pyinstaller`).
   - Lancer la suite de tests unitaires pour valider l'intégrité de la logique de calcul.
   - Générer le fichier **`dist\HuilerieJemai.exe`**.
3. Une fois terminé, vous pouvez copier ce fichier `HuilerieJemai.exe` sur n'importe quel PC sous Windows 11 : il fonctionnera directement sans aucune installation de Python !

---

### OPTION 3 : CRÉER UN INSTALLATEUR COMPLET (.SETUP AVEC ASSISTANT)

1. Téléchargez et installez l'outil gratuit **Inno Setup** ([jrsoftware.org/isdl.php](https://jrsoftware.org/isdl.php)).
2. Faites un clic droit sur le fichier **`installer_setup.iss`** et choisissez **"Compile"**.
3. Vous obtiendrez un installeur standard `output_installer\Setup_Huilerie_Jemai_v1.0.exe` qui installe l'application dans `C:\Program Files\HuilerieJemai` et place une icône sur le Bureau Windows !

---

### RÈGLES DE GESTION APPLIQUÉES EN CUVERIE

- **Piles / Cuves** : Chaque cuve a une capacité maximale stricte (ex: 5 000 Litres). Tout enregistrement excédant la capacité restante est systématiquement bloqué par la base de données SQLite.
- **Clients & Producteurs** : Chaque litre déposé appartient à un client nominatif. Plusieurs clients peuvent partager une même pile. Un client peut répartir sa récolte dans plusieurs piles.
- **Sorties & Livraisons** : Il est strictement impossible d'effectuer une sortie supérieure au solde du client dans cette cuve.
- **Transferts** : Déplacement d'huile contrôlé d'une cuve A vers une cuve B (vérification automatique du solde source et de la place libre en destination).
- **Historique inaltérable** : Aucun mouvement validé ne peut être effacé discrètement. Toute correction passe par une annulation avec motif audité et contre-passation.
- **Impression A4** : Les bons de réception et de livraison sont générés automatiquement avec le logo officiel Huilerie Jemai, la date/heure exacte et les signatures.
- **Sauvegardes automatiques** : Une copie conforme horodatée de la base de données est créée automatiquement dans le sous-dossier `sauvegardes\`.
