@echo off
chcp 65001 > nul
echo Lancement de Huilerie Jemai (معصرة جماعي)...
python main.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Une erreur s'est produite lors du lancement.
    echo Vérifiez que Python et PySide6 sont bien installés (pip install -r requirements.txt).
    pause
)
