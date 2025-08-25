# ESP AI Engine

Ce service fournit un moteur d'intelligence artificielle pour la génération et l'optimisation de plannings de cours en utilisant un solveur de contraintes et l'API Gemini de Google.

## Prérequis

- Python 3.9 ou supérieur
- PostgreSQL
- Connexion Internet (pour l'API Gemini)

## Installation

1. Assurez-vous que Python est installé sur votre système
2. Créez un environnement virtuel (déjà inclus dans ce dossier)
3. Activez l'environnement virtuel:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
4. Installez les dépendances: `pip install -r requirements.txt`

## Démarrage rapide

Utilisez les scripts de démarrage fournis:

- Windows: Double-cliquez sur `start_service.bat`
- Linux/Mac: Exécutez `./start_service.sh` (assurez-vous qu'il est exécutable avec `chmod +x start_service.sh`)

Le serveur démarrera sur http://localhost:5001

## Endpoints API

- `/generate-planning` (POST) - Génère un planning basé sur les données fournies
- `/test-gemini` (GET) - Teste la connexion à l'API Gemini
- `/test-db` (GET) - Teste la connexion à la base de données
- `/test-constraint` (GET) - Teste le solveur de contraintes
- `/health-check` (GET) - Vérifie l'état global du service

## Résolution des problèmes

### Problèmes avec l'API Gemini

1. Vérifiez votre connexion Internet
2. Vérifiez que la clé API est valide dans `app.py`
3. Utilisez l'endpoint `/test-gemini` pour diagnostiquer les problèmes
4. Consultez les logs pour les messages d'erreur spécifiques

### Problèmes de base de données

1. Vérifiez que PostgreSQL est en cours d'exécution
2. Vérifiez les informations de connexion dans `app.py` (host, database, user, password)
3. Assurez-vous que la base de données `soutenance_db` existe
4. Utilisez l'endpoint `/test-db` pour diagnostiquer les problèmes

### Problèmes avec le solveur de contraintes

1. Vérifiez que la bibliothèque `python-constraint` est correctement installée
2. Utilisez l'endpoint `/test-constraint` pour diagnostiquer les problèmes
3. Consultez les logs pour les messages d'erreur spécifiques

### Diagnostic complet

Utilisez l'endpoint `/health-check` pour obtenir un diagnostic complet de tous les composants du service.

## Configuration

Modifiez les paramètres suivants dans `app.py` selon vos besoins:

- Connexion à la base de données (fonction `get_db_connection`)
- Clé API Gemini (fonction `genai.configure`)
- Port du serveur (variable `port` dans `app.run`)

## Logs

Les logs sont affichés dans la console. Pour les capturer dans un fichier, redirigez la sortie standard:

```
python app.py > logs.txt 2>&1
```