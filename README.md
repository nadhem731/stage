# Projet ESP - Système de Planification et Réservation

## 📋 Description Générale

Le projet ESP (École Supérieure Privée) est un système complet de planification et de réservation de salles pour un établissement d'enseignement. Il comprend trois composants principaux qui travaillent ensemble pour gérer efficacement l'emploi du temps et les réservations.

## 🏗️ Architecture du Projet

### 1. **Backend Spring Boot (`esp/`)**
- **Technologie** : Java 17 + Spring Boot 3.5.3
- **Base de données** : PostgreSQL
- **Fonctionnalités** :
  - API REST pour la gestion des entités (salles, classes, planning, enseignants,...)
  - Authentification et autorisation avec JWT
  - Gestion des données avec Spring Data JPA
  - Sécurité avec Spring Security

### 2. **Moteur d'IA (`esp_ai_engine/`)**
- **Technologie** : Python 3.x + Flask
- **Fonctionnalités** :
  - Génération automatique d'emplois du temps avec IA (Google Gemini)
  - Algorithme de planification optimisé avec contraintes
  - Gestion des conflits de réservation
  - API pour la planification intelligente

### 3. **Interface Web (`esp_web/`)**
- **Technologie** : React 18 + TypeScript
- **Fonctionnalités** :
  - Interface utilisateur moderne et responsive
  - Gestion des réservations en temps réel
  - Intégration avec Microsoft Graph (Azure AD)
  - Export PDF des plannings

## 🚀 Installation et Configuration

### Prérequis
- Java 17 ou supérieur
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Maven 3.6+

### 1. Configuration de la Base de Données
```sql
-- Créer la base de données
CREATE DATABASE soutenance_db;
```

### 2. Backend Spring Boot
```bash
cd esp/
# Configurer les paramètres de connexion dans application.properties
mvn clean install
mvn spring-boot:run
```

### 3. Moteur d'IA
```bash
cd esp_ai_engine/
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer l'API Gemini
export GOOGLE_API_KEY="votre_clé_api"

# Démarrer le service
python app.py
```

### 4. Interface Web
```bash
cd esp_web/
# Installer les dépendances
npm install
# ou
yarn install

# Démarrer l'application
npm start
# ou
yarn start
```

## ⚙️ Configuration

### Variables d'Environnement
- `GOOGLE_API_KEY` : Clé API pour Google Gemini
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` : Paramètres de base de données
- `JWT_SECRET` : Clé secrète pour les tokens JWT

### Ports par Défaut
- Backend Spring Boot : `8080`
- Moteur d'IA : `5000`
- Interface Web : `3000`

## 📱 Fonctionnalités Principales

### Gestion des Salles
- Création et modification de salles
- Gestion des capacités et types de salles
- Attribution des blocs et étages

### Gestion des Classes
- Création de classes avec effectifs
- Attribution des niveaux d'études
- Gestion des contraintes pédagogiques

### Planification Automatique
- Génération d'emplois du temps avec IA
- Respect des contraintes (capacité, disponibilité)
- Optimisation des créneaux horaires
- Gestion des pauses (mercredi midi)

### Réservation de Salles
- Interface intuitive pour les réservations
- Vérification des disponibilités en temps réel
- Gestion des conflits et chevauchements

### Authentification
- Intégration Azure AD
- Gestion des rôles et permissions
- Sécurisation des API

## 🧪 Tests

### Backend
```bash
cd esp/
mvn test
```

### Moteur d'IA
```bash
cd esp_ai_engine/
python test_python_endpoint.py
python test_auth.py
```

### Interface Web
```bash
cd esp_web/
npm test
```

## 📊 Structure de la Base de Données

Le système utilise PostgreSQL avec les tables principales :
- `salles` : Informations sur les salles de cours
- `classes` : Données des classes d'étudiants
- `planning` : Définition des planifier pour reserver des salles
- `enseignants` : Informations sur le personnel enseignant
- `reservations` : Historique des réservations

## 🔒 Sécurité

- Authentification JWT
- Intégration Azure AD
- Validation des données côté serveur
- Protection CSRF
- Gestion des permissions par rôle

## 🚀 Déploiement

### Production
- Utiliser des variables d'environnement pour les secrets
- Configurer HTTPS
- Mettre en place un reverse proxy (Nginx)
- Utiliser des conteneurs Docker (optionnel)

### Docker (optionnel)
```bash
# Construire les images
docker build -t esp-backend ./esp
docker build -t esp-ai-engine ./esp_ai_engine
docker build -t esp-web ./esp_web

# Démarrer les services
docker-compose up -d
```

## 📝 API Documentation

### Endpoints Principaux
- `POST /api/auth/login` : Authentification
- `GET /api/salles` : Liste des salles
- `POST /api/planning/generate` : Génération d'emploi du temps
- `GET /api/reservations` : Gestion des réservations

## 🤝 Contribution

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est développé dans le cadre d'un stage à l'ESPRIT.

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur le repository
- Contacter l'équipe de développement

---

**Note** : Ce projet est en cours de développement. Certaines fonctionnalités peuvent être en cours d'implémentation.
