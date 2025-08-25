@echo off
echo Démarrage du service AI Engine...

REM Activer l'environnement virtuel
cd %~dp0
call venv\Scripts\activate.bat

REM Vérifier si l'activation a réussi
if %ERRORLEVEL% NEQ 0 (
    echo Erreur lors de l'activation de l'environnement virtuel.
    pause
    exit /b 1
)

REM Installer ou mettre à jour les dépendances
echo Installation/mise à jour des dépendances...
pip install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo Erreur lors de l'installation des dépendances.
    pause
    exit /b 1
)

REM Démarrer l'application Flask
echo Démarrage du serveur Flask...
python app.py

if %ERRORLEVEL% NEQ 0 (
    echo Erreur lors du démarrage du serveur Flask.
    pause
    exit /b 1
)

pause