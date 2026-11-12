@echo off
chcp 65001 > nul
echo =====================================================================
echo  HUILERIE JEMAI (معصرة جماعي) - COMPILATION DE L'EXÉCUTABLE WINDOWS 11
echo =====================================================================
echo.
echo Vérification des dépendances Python...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo.
echo Lancement de la suite de tests unitaires préalables...
python -m unittest discover -s . -p "test_*.py"
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Les tests unitaires ont échoué. Arrêt de la compilation.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [OK] Tous les tests sont validés avec succès !
echo Génération du fichier exécutable autonome Windows (.exe)...
pyinstaller --clean --noconfirm huilerie_jemai.spec

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================================
    echo  COMPILATION TERMINÉE AVEC SUCCÈS !
    echo  Votre application autonome se trouve dans : dist\HuilerieJemai.exe
    echo =====================================================================
) else (
    echo [ERREUR] La compilation PyInstaller a échoué.
)

pause
