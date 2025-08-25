# Résolution des problèmes d'authentification

## Problèmes identifiés

1. **Erreur 404 sur `/api/auth/me`** : Le filtre JWT excluait tous les chemins `/api/auth/**` de l'authentification, y compris `/api/auth/me` qui devrait être protégé.

2. **Erreur 401 sur `/api/plannings/generate`** : L'endpoint était listé comme un chemin public dans la configuration frontend, mais nécessite le rôle ADMIN dans la configuration backend.

## Modifications apportées

### 1. Correction du filtre JWT (`JwtAuthenticationFilter.java`)

- Modification de la méthode `shouldNotFilter` pour n'exclure que les endpoints de connexion et d'inscription, au lieu de tous les chemins `/api/auth/**`.
- Avant : `return antPathMatcher.match("/api/auth/**", path);`
- Après : 
  ```java
  return antPathMatcher.match("/api/auth/login", path) || 
         antPathMatcher.match("/api/auth/signup", path);
  ```

### 2. Correction de la configuration Axios (`axios.js`)

- Suppression de `/api/plannings/generate` de la liste des chemins publics qui ne nécessitent pas d'authentification.
- Avant :
  ```javascript
  const publicPaths = [
    '/api/auth/signup',
    '/api/auth/login',
    '/api/plannings/generate'
  ];
  ```
- Après :
  ```javascript
  const publicPaths = [
    '/api/auth/signup',
    '/api/auth/login'
    // '/api/plannings/generate' a été retiré car il nécessite une authentification
  ];
  ```

### 3. Amélioration de la gestion des erreurs dans le composant Planning (`planning.js`)

- Ajout d'une vérification de l'existence du token avant d'appeler l'API.
- Affichage d'un message d'erreur approprié si l'utilisateur n'est pas connecté.

## Comment tester les modifications

1. **Pour tester `/api/auth/me`** :
   - Connectez-vous à l'application.
   - Vérifiez que les informations utilisateur sont correctement chargées dans le dashboard.

2. **Pour tester `/api/plannings/generate`** :
   - Connectez-vous en tant qu'administrateur.
   - Accédez à la page de planification.
   - Cliquez sur le bouton "Générer le Planning (AI)".
   - Vérifiez que la génération fonctionne sans erreur 401.

## Remarques importantes

- Ces modifications garantissent que seuls les utilisateurs authentifiés peuvent accéder à leurs informations via `/api/auth/me`.
- L'endpoint `/api/plannings/generate` nécessite désormais une authentification avec le rôle ADMIN, conformément à la configuration de sécurité backend.
- Si des problèmes persistent, vérifiez les logs du serveur pour plus de détails sur les erreurs d'authentification.