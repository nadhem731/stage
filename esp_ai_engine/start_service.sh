#!/bin/bash

echo "Démarrage du service AI Engine..."

# Activer l'environnement virtuel
cd "$(dirname "$0")"
source venv/bin/activate

# Vérifier si l'activation a réussi
if [ $? -ne 0 ]; then
    echo "Erreur lors de l'activation de l'environnement virtuel."
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Installer ou mettre à jour les dépendances
echo "Installation/mise à jour des dépendances..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "Erreur lors de l'installation des dépendances."
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Démarrer l'application Flask
echo "Démarrage du serveur Flask..."
python app.py

if [ $? -ne 0 ]; then
    echo "Erreur lors du démarrage du serveur Flask."
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

read -p "Appuyez sur Entrée pour continuer..."