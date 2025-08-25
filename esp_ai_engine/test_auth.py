import requests
import json
import sys

# URL du service d'authentification Spring Boot
AUTH_URL = "http://localhost:8080/api/auth/login"
# URL du service de planification Spring Boot
PLANNING_URL = "http://localhost:8080/api/plannings/generate"

def test_auth_flow():
    # 1. Se connecter pour obtenir un token JWT
    print("1. Tentative de connexion pour obtenir un token JWT...")
    auth_data = {
        "identifiant": "admin",  # Remplacez par un identifiant valide
        "password": "admin"     # Remplacez par un mot de passe valide
    }
    
    try:
        auth_response = requests.post(AUTH_URL, json=auth_data)
        auth_response.raise_for_status()  # Lever une exception si la réponse n'est pas 2xx
        
        auth_json = auth_response.json()
        token = auth_json.get("token")
        
        if not token:
            print("Erreur: Aucun token JWT reçu dans la réponse d'authentification")
            print(f"Réponse reçue: {auth_json}")
            return False
            
        print("✓ Connexion réussie, token JWT obtenu")
        
        # 2. Appeler l'API de planification avec le token JWT
        print("\n2. Appel de l'API de planification avec le token JWT...")
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        planning_response = requests.post(PLANNING_URL, headers=headers, json={})
        
        print(f"Code de statut: {planning_response.status_code}")
        print(f"Réponse: {planning_response.text[:200]}..." if len(planning_response.text) > 200 else f"Réponse: {planning_response.text}")
        
        if planning_response.status_code == 401:
            print("❌ Erreur 401 Unauthorized - Le problème d'authentification persiste")
            return False
        elif planning_response.status_code >= 400:
            print(f"❌ Erreur {planning_response.status_code} - Un autre problème est survenu")
            return False
        else:
            print("✓ Appel à l'API de planification réussi!")
            return True
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur lors de la requête HTTP: {e}")
        return False
    except json.JSONDecodeError:
        print("❌ Erreur lors du décodage de la réponse JSON")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False

if __name__ == "__main__":
    print("=== Test du flux d'authentification pour l'API de planification ===")
    success = test_auth_flow()
    
    if success:
        print("\n✅ Test réussi! Le problème d'authentification semble résolu.")
        sys.exit(0)
    else:
        print("\n❌ Test échoué. Le problème d'authentification persiste.")
        sys.exit(1)