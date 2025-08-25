# Résolution du problème d'authentification entre Spring Boot et Python

## Problème identifié

Le problème d'erreur 401 (Unauthorized) lors de l'appel à `/api/plannings/generate` était dû à une incompatibilité d'authentification entre le service Spring Boot et le service Python Flask. Voici les causes spécifiques :

1. Le filtre JWT dans Spring Boot excluait l'endpoint `/api/plannings/generate` de l'authentification, mais le service Python n'était pas configuré pour recevoir et valider le token JWT.
2. Le service Spring Boot n'envoyait pas le token JWT au service Python lors de l'appel à l'API.

## Modifications apportées

### 1. Dans le service Python (app.py)

- Ajout de la vérification de l'en-tête d'autorisation dans l'endpoint `/generate-planning`
- Retour d'une erreur 401 si le token JWT est absent ou invalide

### 2. Dans le service Spring Boot

- Modification du `JwtAuthenticationFilter.java` pour ne plus exclure l'endpoint `/api/plannings/generate` de l'authentification
- Mise à jour du `PlanningController.java` pour transmettre le token JWT au service Python

## Comment tester les modifications

Deux scripts de test ont été créés pour vérifier si les modifications résolvent le problème :

1. `test_auth.py` : Teste le flux complet d'authentification en appelant d'abord l'API d'authentification Spring Boot pour obtenir un token JWT, puis en utilisant ce token pour appeler l'API de planification.

2. `test_python_endpoint.py` : Teste directement l'endpoint Python en obtenant d'abord un token JWT via Spring Boot, puis en l'utilisant pour appeler directement l'API Python.

### Exécution des tests

```bash
# Activer l'environnement virtuel
# Sur Windows
venv\Scripts\activate

# Sur Linux/Mac
source venv/bin/activate

# Exécuter les tests
python test_auth.py
python test_python_endpoint.py
```

## Remarques importantes

1. **Identifiants de test** : Les scripts de test utilisent "admin" comme identifiant et mot de passe. Assurez-vous de les remplacer par des identifiants valides si nécessaire.

2. **Redémarrage des services** : Après avoir appliqué les modifications, redémarrez à la fois le service Spring Boot et le service Python pour que les changements prennent effet.

3. **Vérification des logs** : En cas de problème persistant, vérifiez les logs des deux services pour identifier d'éventuelles erreurs.

## Étapes de déploiement

1. Redémarrer le service Python :
   ```bash
   # Sur Windows
   start_service.bat
   
   # Sur Linux/Mac
   ./start_service.sh
   ```

2. Redémarrer le service Spring Boot :
   ```bash
   # Dans le dossier esp
   ./mvnw spring-boot:run
   
   # Ou sur Windows
   .\mvnw.cmd spring-boot:run
   ```

3. Exécuter les tests pour vérifier que le problème est résolu.