import requests
import json
import sys

# URL du service d'authentification Spring Boot
AUTH_URL = "http://localhost:8080/api/auth/login"
# URL directe du service Python
PYTHON_API_URL = "http://localhost:5001/generate-planning"

def test_python_endpoint():
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
        
        # 2. Appeler directement l'API Python avec le token JWT
        print("\n2. Appel direct de l'API Python avec le token JWT...")
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Données minimales pour le test
        test_data = {
            "salles": [
                {"idSalle": 1, "numSalle": "A101", "capacite": 30, "disponibilite": True, "bloc": "A", 
                 "typeSalle": {"typeSalle": "salle de cour"}}
            ],
            "classes": [
                {"idClasse": 1, "nomClasse": "1A1", "effectif": 25}
            ]
        }
        
        python_response = requests.post(PYTHON_API_URL, headers=headers, json=test_data)
        
        print(f"Code de statut: {python_response.status_code}")
        print(f"Réponse: {python_response.text[:200]}..." if len(python_response.text) > 200 else f"Réponse: {python_response.text}")
        
        if python_response.status_code == 401:
            print("❌ Erreur 401 Unauthorized - Le service Python rejette le token JWT")
            return False
        elif python_response.status_code >= 400:
            print(f"❌ Erreur {python_response.status_code} - Un autre problème est survenu")
            return False
        else:
            print("✓ Appel direct à l'API Python réussi!")
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
    print("=== Test direct de l'endpoint Python avec authentification JWT ===")
    success = test_python_endpoint()
    
    if success:
        print("\n✅ Test réussi! L'API Python accepte correctement le token JWT.")
        sys.exit(0)
    else:
        print("\n❌ Test échoué. L'API Python rejette le token JWT ou un autre problème est survenu.")
        sys.exit(1)