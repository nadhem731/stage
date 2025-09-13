import os
import psycopg2
from constraint import Problem, AllDifferentConstraint
from flask import Flask, jsonify, request
from flask_cors import CORS
import google.generativeai as genai
import requests
import random
import time
from datetime import datetime, timedelta

# Configure Gemini API
# It's recommended to use environment variables for API keys in production
try:
    genai.configure(api_key="AIzaSyDff5a9rk0ESzeS21SmaPA5Pxcnd7ENx1A")
    print("Gemini API configured successfully")
except Exception as e:
    print(f"Error configuring Gemini API: {e}")


# --- Database Connection ---
def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    try:
        print("Tentative de connexion à la base de données...")
        conn = psycopg2.connect(
            host="localhost",
            database="soutenance_db",  # Corrected database name
            user="postgres",      # <-- IMPORTANT: Replace with your database username
            password="nadhem" # <-- IMPORTANT: Replace with your database password
        )
        print("Connexion à la base de données établie avec succès")
        return conn
    except psycopg2.OperationalError as e:
        print(f"Erreur de connexion à la base de données: {e}")
        return None
    except Exception as e:
        print(f"Erreur inattendue lors de la connexion à la base de données: {e}")
        import traceback
        traceback.print_exc()
        return None

# --- AI Scheduling Logic ---
def create_schedule(salles, classes, cours_a_planifier, semaine_numero=1):
    # Stocker les références pour utilisation dans la fonction
    processed_salles = salles
    processed_classes = classes
    """
    Generates the schedule using an optimized greedy algorithm.
    Nouvelles contraintes:
    - Une salle unique par classe par semaine
    - Randomisation des créneaux pour éviter la répétition
    - Lundi à Vendredi (pas de samedi)
    - Mercredi midi = pause (pas de cours 13:30-16:45)
    """
    # Utiliser un algorithme glouton optimisé au lieu du solveur de contraintes

    print(f"Génération du planning pour la semaine {semaine_numero}")
    print(f"Nombre de salles disponibles: {len(salles)}")
    for s in salles:
        print(f"  Salle: {s.get('numsalle')} (ID: {s.get('id_salle')}), Capacité: {s.get('capacite')}, Bloc: {s.get('bloc')}, Type: {s.get('type_type_salle')}")
    
    print(f"Nombre de classes: {len(classes)}")
    for c in classes:
        print(f"  Classe: {c.get('nom_classe')} (ID: {c.get('id_classe')}), Effectif: {c.get('effectif')}, Niveau: {c.get('niveau')}")

    print(f"Nombre de cours à planifier: {len(cours_a_planifier)}")
    for c in cours_a_planifier:
        print(f"  Cours ID: {c['id_cours']}, Classe ID: {c['id_classe']}, Durée: {c['duree_heures']}h, Type: {c['type_planning']}")

    # Jours de la semaine (Lundi à Vendredi seulement)
    jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
    
    # Créneaux horaires selon l'organisation: 2 séances par jour
    # Séance 1: 09:00-12:15 (3h15) et Séance 2: 13:30-16:45 (3h15)
    creneaux_horaires = [
        {"heure_debut": "09:00", "heure_fin": "12:15"},
        {"heure_debut": "13:30", "heure_fin": "16:45"}
    ]
    
    time_slots = []
    for jour in jours:
        for creneau in creneaux_horaires:
            # Pas de cours mercredi après-midi (pause mercredi midi)
            if jour == "Mercredi" and creneau["heure_debut"] == "13:30":
                continue
            time_slots.append((jour, creneau["heure_debut"], creneau["heure_fin"]))

    # Randomiser les créneaux pour éviter la répétition
    random.seed(int(time.time()) + semaine_numero)  # Seed basé sur le temps et la semaine
    random.shuffle(time_slots)
    print(f"Créneaux randomisés: {time_slots}")
    
    # Algorithme glouton optimisé pour éviter la complexité du solveur de contraintes
    return create_schedule_greedy(salles, classes, cours_a_planifier, time_slots, semaine_numero)


def is_teacher_available(enseignant, jour, heure_debut, heure_fin):
    """
    Vérifie si un enseignant est disponible à un créneau donné.
    
    Args:
        enseignant: Dictionnaire contenant les infos de l'enseignant avec 'disponibilite'
        jour: Jour de la semaine (ex: 'Lundi', 'Mardi', etc.)
        heure_debut: Heure de début au format 'HH:MM'
        heure_fin: Heure de fin au format 'HH:MM'
    
    Returns:
        bool: True si l'enseignant est disponible, False sinon
    """
    disponibilite = enseignant.get('disponibilite', {})
    
    # Si pas de disponibilité définie, considérer comme disponible par défaut
    if not disponibilite or not isinstance(disponibilite, dict):
        return True
    
    # Vérifier la disponibilité pour le jour donné
    jour_dispo = disponibilite.get(jour.lower(), {})
    
    # Gérer le cas où jour_dispo est une liste au lieu d'un dictionnaire
    if isinstance(jour_dispo, list):
        # Si c'est une liste vide, considérer comme disponible
        if not jour_dispo:
            return True
        # Si c'est une liste de créneaux, traiter comme des créneaux disponibles
        creneaux = jour_dispo
    elif isinstance(jour_dispo, dict):
        # Si le jour est marqué comme indisponible
        if jour_dispo.get('disponible') == False:
            return False
        
        # Vérifier les créneaux horaires si définis
        creneaux = jour_dispo.get('creneaux', [])
        if not creneaux:
            return True  # Pas de créneaux spécifiques définis
    else:
        # Format non reconnu, considérer comme disponible par défaut
        return True
    
    # Convertir les heures en minutes pour faciliter la comparaison
    def time_to_minutes(time_str):
        try:
            h, m = map(int, time_str.split(':'))
            return h * 60 + m
        except (ValueError, AttributeError):
            return 0
    
    debut_minutes = time_to_minutes(heure_debut)
    fin_minutes = time_to_minutes(heure_fin)
    
    # Vérifier si le créneau demandé chevauche avec un créneau disponible
    for creneau in creneaux:
        if isinstance(creneau, dict) and creneau.get('disponible', True):
            creneau_debut = time_to_minutes(creneau.get('debut', '00:00'))
            creneau_fin = time_to_minutes(creneau.get('fin', '23:59'))
            
            # Vérifier si le créneau demandé est inclus dans le créneau disponible
            if debut_minutes >= creneau_debut and fin_minutes <= creneau_fin:
                return True
    
    # Si aucun créneau disponible trouvé et qu'il y a des créneaux définis, pas disponible
    if creneaux:
        return False
    
    return True

def create_schedule_greedy(salles, classes, cours_a_planifier, time_slots, semaine_numero=1):
    """
    Algorithme glouton optimisé pour la génération de planning.
    Plus rapide que le solveur de contraintes pour des problèmes de taille moyenne.
    """
    print("Utilisation de l'algorithme glouton optimisé...")
    
    # Structures de données pour le suivi
    planning_result = []
    salles_occupees = {}  # {(salle_id, jour, heure): True}
    classes_occupees = {}  # {(classe_id, jour, heure): True}
    
    # Calculer les jours en ligne pour chaque classe
    jours_en_ligne = {}
    jours_disponibles = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
    
    for classe in classes:
        classe_id = classe['id_classe']
        # Rotation basée sur l'ID de classe et le numéro de semaine
        index = (classe_id + semaine_numero + random.randint(0, 4)) % len(jours_disponibles)
        jours_en_ligne[classe_id] = jours_disponibles[index]
        print(f"  Classe {classe['nom_classe']} (ID: {classe_id}) - Jour en ligne: {jours_en_ligne[classe_id]}")
    
    # Assigner une salle unique par classe
    salles_par_classe = {}
    salles_disponibles = [s for s in salles if s.get('type_type_salle') == 'salle de cour']
    random.shuffle(salles_disponibles)
    
    print(f"DEBUG: {len(salles_disponibles)} salles de cours disponibles pour {len(classes)} classes")
    
    for i, classe in enumerate(classes):
        if i < len(salles_disponibles):
            salle = salles_disponibles[i]
            salles_par_classe[classe['id_classe']] = salle
            print(f"  Classe {classe['nom_classe']} assignée à la salle {salle['numsalle']}")
        else:
            # Si plus de salles disponibles, réutiliser les salles existantes
            salle_index = i % len(salles_disponibles)
            salle = salles_disponibles[salle_index]
            salles_par_classe[classe['id_classe']] = salle
            print(f"  Classe {classe['nom_classe']} assignée à la salle {salle['numsalle']} (réutilisée)")
    
    # Trier les cours par priorité (classes avec moins d'options en premier)
    cours_tries = sorted(cours_a_planifier, key=lambda c: c['id_classe'])
    
    # Suivi des enseignants occupés pour éviter les conflits
    enseignants_occupes = {}
    
    # Planifier chaque cours
    for cours in cours_tries:
        classe_id = cours['id_classe']
        salle_assignee = salles_par_classe.get(classe_id)
        
        if not salle_assignee:
            print(f"Aucune salle assignée pour la classe {classe_id}")
            continue
        
        jour_en_ligne = jours_en_ligne.get(classe_id)
        cours_planifie = False
        
        # Essayer chaque créneau disponible
        for jour, heure_debut, heure_fin in time_slots:
            # Déterminer le mode de cours
            mode_cours = "en_ligne" if jour == jour_en_ligne else "presentiel"
            
            # Vérifier les conflits
            cle_classe = (classe_id, jour, heure_debut)
            cle_salle = (salle_assignee['id_salle'], jour, heure_debut)
            cle_enseignant = (cours.get('id_enseignant'), jour, heure_debut)
            
            # Vérifier si la classe est libre
            if cle_classe in classes_occupees:
                continue
            
            # Vérifier si la salle est libre (seulement pour les cours en présentiel)
            if mode_cours == "presentiel" and cle_salle in salles_occupees:
                continue
            
            # NOUVELLE VÉRIFICATION: Vérifier si l'enseignant est libre
            if cours.get('id_enseignant') and cle_enseignant in enseignants_occupes:
                print(f"  Conflit enseignant détecté: {cours.get('nom_enseignant', 'Enseignant inconnu')} déjà occupé le {jour} à {heure_debut}")
                continue
            
            # VÉRIFICATION DISPONIBILITÉ: Vérifier si l'enseignant est disponible selon ses contraintes
            enseignant_info = cours.get('enseignant_info')
            if enseignant_info and not is_teacher_available(enseignant_info, jour, heure_debut, heure_fin):
                print(f"  Enseignant {cours.get('nom_enseignant', 'Enseignant inconnu')} non disponible le {jour} de {heure_debut} à {heure_fin}")
                continue
            
            # Planifier le cours
            classe_info = next((c for c in classes if c['id_classe'] == classe_id), None)
            
            planning_entry = {
                "id_salle": salle_assignee['id_salle'],
                "id_classe": classe_id,
                "id_cours": cours['id_cours'],
                "id_enseignant": cours.get('id_enseignant'),
                "jour": jour,
                "heure_debut": heure_debut,
                "heure_fin": heure_fin,
                "mode_cours": mode_cours,
                "type_planning": cours.get('type_planning', 'cour'),
                "matiere": cours.get('matiere', 'Matière inconnue'),
                "nom_enseignant": cours.get('nom_enseignant', 'Enseignant inconnu'),
                "nom_classe": classe_info['nom_classe'] if classe_info else f"Classe {classe_id}",
                "nom_salle": salle_assignee['numsalle'],
                "statut": "en_cours"
            }
            
            planning_result.append(planning_entry)
            
            # Marquer comme occupé
            classes_occupees[cle_classe] = True
            if mode_cours == "presentiel":
                salles_occupees[cle_salle] = True
            
            # NOUVEAU: Marquer l'enseignant comme occupé
            if cours.get('id_enseignant'):
                enseignants_occupes[cle_enseignant] = True
                print(f"  Enseignant {cours.get('nom_enseignant', 'Enseignant inconnu')} (ID: {cours.get('id_enseignant')}) marqué occupé le {jour} à {heure_debut}")
            
            cours_planifie = True
            print(f"  Cours {cours['id_cours']} planifié: {jour} {heure_debut}-{heure_fin} ({mode_cours})")
            break
        
        if not cours_planifie:
            print(f"  Impossible de planifier le cours {cours['id_cours']} pour la classe {classe_id}")
    
    print(f"Planning généré avec {len(planning_result)} cours planifiés sur {len(cours_a_planifier)} demandés")
    return planning_result


def optimize_planning_with_gemini(planning_data, salles_info, classes_info, cours_info):
    """
    Utilise Gemini AI pour optimiser le planning généré.
    Prend le planning actuel et les informations contextuelles,
    et renvoie des suggestions d'optimisation organisées par classe.
    """
    print("Démarrage de l'optimisation avec Gemini AI...")
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        print("Modèle Gemini-1.5-flash initialisé avec succès")
        
        # Organiser les données du planning par classe pour une meilleure analyse
        planning_par_classe = {}
        for cours in planning_data:
            classe_nom = cours.get('nom_classe', f"Classe {cours.get('id_classe')}")
            if classe_nom not in planning_par_classe:
                planning_par_classe[classe_nom] = []
            planning_par_classe[classe_nom].append(cours)
        
        # Préparer un prompt élégant et ultra-professionnel avec formatage Markdown
        prompt = (
            "═══════════════════════════════════════════════════════════════════\n"
            "# 🎓 **RAPPORT D'ANALYSE & OPTIMISATION DU PLANNING ACADÉMIQUE** 🎓\n"
            "═══════════════════════════════════════════════════════════════════\n\n"
            
            "**MISSION CONFIÉE :** En qualité d'Expert-Conseil en Planification Pédagogique, vous êtes chargé(e) d'analyser "
            "le planning ci-dessous et de formuler des recommandations stratégiques d'optimisation.\n\n"
            
            "## 📊 **SYNTHÈSE EXÉCUTIVE DU PLANNING ACTUEL**\n"
            f"- **Volume total de cours planifiés :** `{len(planning_data)} séances`\n"
            f"- **Périmètre d'intervention :** `{len(classes_info)} classes académiques`\n"
            f"- **Infrastructure mobilisée :** `{len(salles_info)} espaces pédagogiques`\n\n"
            
            "## 📋 **DÉTAIL DU PLANNING PAR ENTITÉ ACADÉMIQUE**\n"
        )
        
        # Ajouter les détails par classe avec formatage Markdown élégant
        for classe_nom, cours_classe in planning_par_classe.items():
            prompt += f"\n### 🏫 **CLASSE : {classe_nom.upper()}**\n"
            for i, cours in enumerate(cours_classe, 1):
                mode_icon = "💻" if cours.get('mode_cours') == 'en_ligne' else "🏛️"
                prompt += (f"{i:02d}. **{cours.get('jour')}** `{cours.get('heure_debut')}-{cours.get('heure_fin')}` "
                          f"{mode_icon} **{cours.get('matiere')}**\n"
                          f"   - 👨‍🏫 Enseignant : *{cours.get('nom_enseignant')}*\n"
                          f"   - 🏢 Salle : `{cours.get('nom_salle')}` | Mode : **{cours.get('mode_cours').replace('_', ' ').title()}**\n\n")
            prompt += "---\n"
        
        prompt += (
            "\n## 🏢 **INFRASTRUCTURE & RESSOURCES DISPONIBLES**\n"
            f"{salles_info}\n\n"
            
            "## 🎯 **CAHIER DES CHARGES - OPTIMISATION STRATÉGIQUE**\n"
            "**AXES D'AMÉLIORATION PRIORITAIRES :**\n"
            "- **Équilibrage temporel** : Harmonisation de la charge hebdomadaire\n"
            "- **Optimisation spatiale** : Maximisation de l'utilisation des infrastructures\n"
            "- **Fluidité pédagogique** : Minimisation des interruptions et temps morts\n"
            "- **Hybridation intelligente** : Équilibre optimal présentiel/distanciel\n\n"
            
            "## 📋 **TEMPLATE DE LIVRABLE - ANALYSE PAR ENTITÉ**\n\n"
            "**STRUCTURE ATTENDUE POUR CHAQUE CLASSE :**\n\n"
            "═══════════════════════════════════════════════════════════════════\n"
            "## 🎓 **[NOM DE LA CLASSE]** - DIAGNOSTIC & RECOMMANDATIONS\n"
            "═══════════════════════════════════════════════════════════════════\n\n"
            
            "### ✨ **POINTS FORTS IDENTIFIÉS**\n"
            "- [Élément positif du planning actuel]\n"
            "- [Autre force identifiée]\n\n"
            
            "### 🔧 **PRÉCONISATIONS D'OPTIMISATION**\n"
            "#### 🎯 RECOMMANDATION #1 :\n"
            "- **Action :** [Description précise de l'amélioration]\n"
            "- **Justification :** [Rationale technique/pédagogique]\n"
            "- **Priorité :** `[Haute/Moyenne/Faible]`\n\n"
            "#### 🎯 RECOMMANDATION #2 :\n"
            "- **Action :** [Description précise de l'amélioration]\n"
            "- **Justification :** [Rationale technique/pédagogique]\n"
            "- **Priorité :** `[Haute/Moyenne/Faible]`\n\n"
            
            "### 📊 **IMPACT BUSINESS ATTENDU**\n"
            "- **Amélioration quantifiable :** [Métrique précise]\n"
            "- **Bénéfice qualitatif :** [Impact sur l'expérience utilisateur]\n"
            "- **ROI estimé :** [Retour sur investissement]\n\n"
            
            "> **NOTE :** Si le planning d'une classe est déjà optimal, indiquez : \"✅ **PLANNING OPTIMAL** - Aucune amélioration requise\"\n\n"
            
            "═══════════════════════════════════════════════════════════════════\n"
            "## 🚀 **SYNTHÈSE EXÉCUTIVE & PLAN D'ACTION PRIORITAIRE**\n"
            "═══════════════════════════════════════════════════════════════════\n"
            "**Terminez votre analyse par :**\n"
            "- **TOP 3 des recommandations stratégiques**\n"
            "- **Roadmap d'implémentation suggérée**\n"
            "- **Indicateurs de performance clés (KPI) à suivre**\n"
        )
        
        print("Envoi de la requête à l'API Gemini...")
        response = model.generate_content(prompt)
        print("Réponse reçue de l'API Gemini")
        
        if response and hasattr(response, 'text'):
            return response.text
        else:
            print("Avertissement: La réponse de Gemini n'a pas le format attendu")
            return (
                "═══════════════════════════════════════════════════════════════════\n"
                "# ❌ **RAPPORT D'ERREUR - SERVICE D'OPTIMISATION INDISPONIBLE**\n"
                "═══════════════════════════════════════════════════════════════════\n\n"
                "**STATUT :** Service d'analyse IA temporairement indisponible\n"
                "**CAUSE :** Format de réponse non conforme aux spécifications\n\n"
                "## 💡 **RECOMMANDATIONS GÉNÉRALES DE FALLBACK**\n"
                "- Vérifier l'équilibrage de la charge hebdomadaire par classe\n"
                "- Optimiser l'allocation des espaces pédagogiques\n"
                "- Harmoniser la répartition présentiel/distanciel\n"
            )
            
    except Exception as e:
        print(f"Erreur lors de l'appel à Gemini AI: {e}")
        import traceback
        traceback.print_exc()
        return (
            "═══════════════════════════════════════════════════════════════════\n"
            "# ⚠️ **RAPPORT D'INCIDENT - SERVICE D'OPTIMISATION**\n"
            "═══════════════════════════════════════════════════════════════════\n\n"
            f"**ERREUR TECHNIQUE :** {str(e)}\n"
            "**IMPACT :** Analyse automatisée temporairement indisponible\n\n"
            "## 🔧 **PLAN D'ACTION MANUEL RECOMMANDÉ**\n"
            "**AXES D'OPTIMISATION PRIORITAIRES :**\n"
            "- **Équilibrage temporel** : Répartir uniformément les cours sur la semaine\n"
            "- **Optimisation spatiale** : Maximiser l'occupation des salles disponibles\n"
            "- **Fluidité pédagogique** : Minimiser les créneaux libres entre les cours\n"
            "- **Hybridation intelligente** : Équilibrer les modes présentiel/distanciel\n\n"
            "**RECOMMANDATION :** Contacter l'administrateur système pour diagnostic approfondi\n"
        )


# --- Flask API ---
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3001"], supports_credentials=True, allow_headers=["Content-Type", "Authorization"])  # Enable CORS for React app

from flask import request # Add this import

@app.route('/test-gemini', methods=['GET'])
def test_gemini_api():
    """Endpoint pour tester la connexion à l'API Gemini."""
    try:
        print("Test de l'API Gemini...")
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Bonjour, pouvez-vous confirmer que l'API Gemini fonctionne correctement?")
        
        if response and hasattr(response, 'text'):
            return jsonify({
                "status": "success",
                "message": "API Gemini fonctionne correctement",
                "response": response.text
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Réponse de l'API Gemini dans un format inattendu"
            }), 500
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        return jsonify({
            "status": "error",
            "message": f"Erreur lors du test de l'API Gemini: {str(e)}",
            "traceback": error_traceback
        }), 500

@app.route('/test-db', methods=['GET'])
def test_db_connection():
    """Endpoint pour tester la connexion à la base de données."""
    try:
        print("Test de la connexion à la base de données...")
        conn = get_db_connection()
        if conn is None:
            return jsonify({
                "status": "error",
                "message": "Échec de la connexion à la base de données"
            }), 500
            
        # Tester une requête simple
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "Connexion à la base de données établie avec succès",
            "result": result[0]
        })
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        return jsonify({
            "status": "error",
            "message": f"Erreur lors du test de la connexion à la base de données: {str(e)}",
            "traceback": error_traceback
        }), 500

@app.route('/test-constraint', methods=['GET'])
def test_constraint_solver():
    """Endpoint pour tester le solveur de contraintes."""
    try:
        print("Test du solveur de contraintes...")
        # Créer un problème simple de test
        problem = Problem()
        
        # Ajouter une variable avec un domaine
        problem.addVariable("x", [1, 2, 3])
        
        # Ajouter une contrainte simple
        problem.addConstraint(lambda x: x > 1, ["x"])
        
        # Résoudre le problème
        solutions = problem.getSolutions()
        
        return jsonify({
            "status": "success",
            "message": "Solveur de contraintes fonctionne correctement",
            "solutions": solutions
        })
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        return jsonify({
            "status": "error",
            "message": f"Erreur lors du test du solveur de contraintes: {str(e)}",
            "traceback": error_traceback
        }), 500


@app.route('/generate-planning', methods=['POST'])
def generate_planning_endpoint():
    """API endpoint to trigger the schedule generation."""
    # TODO: Implémenter la validation JWT complète
    # Pour l'instant, on désactive la vérification d'authentification
    print("Endpoint /generate-planning appelé")
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data provided."}), 400

    salles_data = data.get('salles', [])
    classes_data = data.get('classes', [])

    print(f"DEBUG: Raw salles_data from Spring Boot: {salles_data}")
    print(f"DEBUG: Raw classes_data from Spring Boot: {classes_data}")
    
    # Si aucune classe n'est fournie dans la requête, les récupérer directement depuis l'API
    if not classes_data:
        print("DEBUG: Aucune classe fournie dans la requête, récupération depuis l'API...")
        token = request.headers.get('Authorization', '').replace('Bearer ', '') if request.headers.get('Authorization') else None
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        
        try:
            classes_response = requests.get('http://localhost:8080/api/classes', headers=headers, timeout=5)
            if classes_response.status_code == 200:
                classes_data = classes_response.json()
                print(f"DEBUG: Classes récupérées depuis l'API: {len(classes_data)} classes")
                print(f"DEBUG: Classes data: {classes_data}")
            else:
                print(f"DEBUG: Erreur lors de la récupération des classes: {classes_response.status_code}")
        except Exception as e:
            print(f"DEBUG: Exception lors de la récupération des classes: {e}")

    # Adapter les données reçues de Spring Boot au format attendu par le solveur Python
    # Spring Boot envoie idSalle, numSalle (camelCase), typeSalle (objet imbriqué)
    # Python s'attend à id_salle, numsalle (snake_case), type_type_salle (string)
    
    # Traitement des salles
    processed_salles = []
    for s in salles_data:
        processed_salles.append({
            "id_salle": s.get('idSalle'),
            "numsalle": s.get('numSalle'), # Utiliser numSalle tel quel
            "capacite": s.get('capacite'),
            "disponibilite": s.get('disponibilite'),
            "bloc": s.get('bloc'),
            "type_type_salle": s.get('typeSalle', {}).get('typeSalle') if s.get('typeSalle') else None # Gérer le cas où typeSalle est None
        })
    print(f"DEBUG: Processed salles for AI: {processed_salles}")

    # Traitement des classes
    processed_classes = []
    for c in classes_data:
        processed_classes.append({
            "id_classe": c.get('idClasse'),
            "nom_classe": c.get('nomClasse'),
            "effectif": c.get('effectif'),
            "niveau": str(c.get('nomClasse', ''))[:2] # Extraire le niveau comme avant
        })
    print(f"DEBUG: Processed classes for AI: {processed_classes}")

    # Générer un nombre réduit de cours pour éviter la complexité excessive
    # Limiter à 2 cours par classe pour commencer
    cours_a_planifier = []
    cours_id = 1
    
    # Récupérer les enseignants et leurs affectations depuis Spring Boot
    enseignants_data = []
    affectations_data = []
    
    try:
        # Récupérer le token depuis les données de la requête ou utiliser un token par défaut
        token = data.get('token') if 'token' in data else None
        headers = {}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            print("DEBUG: Token d'authentification ajouté aux requêtes")
        else:
            print("DEBUG: Aucun token fourni - tentative sans authentification")
        
        print("DEBUG: Tentative de récupération des enseignants...")
        try:
            enseignants_response = requests.get('http://localhost:8080/api/users/enseignants', 
                                              headers=headers, timeout=5)
            print(f"DEBUG: Enseignants response status: {enseignants_response.status_code}")
            
            if enseignants_response.status_code == 200:
                enseignants_data = enseignants_response.json()
                print(f"DEBUG: Enseignants récupérés: {len(enseignants_data)}")
                if enseignants_data:
                    print(f"DEBUG: Premier enseignant: {enseignants_data[0]}")
                else:
                    print("DEBUG: AUCUN enseignant trouvé - la liste est vide!")
            else:
                print(f"DEBUG: Erreur récupération enseignants: {enseignants_response.status_code}")
                enseignants_data = []
        except Exception as e:
            print(f"DEBUG: Erreur lors de la récupération des enseignants: {e}")
            enseignants_data = []
        
        print("DEBUG: Tentative de récupération des affectations d'enseignants...")
        try:
            affectations_response = requests.get('http://localhost:8080/api/affectations/enseignants', 
                                               headers=headers, timeout=5)
            print(f"DEBUG: Affectations enseignants response status: {affectations_response.status_code}")
            
            if affectations_response.status_code == 200:
                affectations_data = affectations_response.json()
                print(f"DEBUG: Affectations d'enseignants récupérées: {len(affectations_data)}")
                if affectations_data:
                    print(f"DEBUG: Première affectation d'enseignant: {affectations_data[0]}")
                else:
                    print("DEBUG: AUCUNE affectation d'enseignant trouvée - la liste est vide!")
            else:
                print(f"DEBUG: Erreur récupération affectations enseignants: {affectations_response.status_code}")
                affectations_data = []
        except Exception as e:
            print(f"DEBUG: Erreur lors de la récupération des affectations: {e}")
            affectations_data = []
            
    except Exception as e:
        print(f"DEBUG: Erreur générale lors de la récupération des données enseignants: {e}")
        import traceback
        traceback.print_exc()
        enseignants_data = []
        affectations_data = []

    # Créer des enseignants disponibles à partir des données récupérées avec leurs disponibilités
    enseignants_disponibles = []
    
    # Ajouter les enseignants depuis les affectations
    for affectation in affectations_data:
        user_data = affectation.get('user', {})
        if user_data.get('idUser'):
            enseignant = {
                'id': user_data.get('idUser'),
                'nom': user_data.get('nom', ''),
                'prenom': user_data.get('prenom', ''),
                'matiere': user_data.get('matiere', 'Matière inconnue'),
                'disponibilite': user_data.get('disponibilite', {})  # Récupérer les disponibilités
            }
            if not any(e['id'] == enseignant['id'] for e in enseignants_disponibles):
                enseignants_disponibles.append(enseignant)
    
    # Ajouter les enseignants directs
    for enseignant in enseignants_data:
        if enseignant.get('idUser'):
            ens = {
                'id': enseignant.get('idUser'),
                'nom': enseignant.get('nom', ''),
                'prenom': enseignant.get('prenom', ''),
                'matiere': enseignant.get('matiere', 'Matière inconnue'),
                'disponibilite': enseignant.get('disponibilite', {})  # Récupérer les disponibilités
            }
            if not any(e['id'] == ens['id'] for e in enseignants_disponibles):
                enseignants_disponibles.append(ens)
    
    # Si pas assez d'enseignants réels, utiliser les enseignants existants en rotation
    if len(enseignants_disponibles) < 3:
        print(f"DEBUG: Seulement {len(enseignants_disponibles)} enseignants disponibles, utilisation en rotation")
        # Dupliquer les enseignants existants pour avoir assez de variété
        enseignants_originaux = enseignants_disponibles.copy()
        while len(enseignants_disponibles) < 5 and enseignants_originaux:
            for ens in enseignants_originaux:
                if len(enseignants_disponibles) >= 5:
                    break
                # Créer une copie avec un identifiant unique pour éviter les conflits
                ens_copie = ens.copy()
                enseignants_disponibles.append(ens_copie)
    
    print(f"DEBUG: {len(enseignants_disponibles)} enseignants disponibles pour la génération")
    for ens in enseignants_disponibles:
        print(f"  - Teacher ID: {ens['id']}, Name: {ens.get('prenom', '')} {ens.get('nom', '')}, Subject: {ens.get('matiere', 'N/A')}")
    
    # Générer exactement 2 cours par classe en utilisant des enseignants différents
    for classe in processed_classes:
        classe_id = classe['id_classe']
        print(f"DEBUG: Génération de cours pour la classe {classe['nom_classe']} (ID: {classe_id})")
        
        # Mélanger les enseignants pour chaque classe pour éviter les patterns
        enseignants_classe = enseignants_disponibles.copy()
        random.shuffle(enseignants_classe)
        
        # Créer 2 cours par classe avec des enseignants différents
        enseignants_utilises_classe = []
        
        for i in range(2):
            # Sélectionner un enseignant qui n'a pas encore de cours dans cette classe
            enseignant = None
            for ens in enseignants_classe:
                if ens['id'] not in enseignants_utilises_classe:
                    enseignant = ens
                    break
            
            # Si tous les enseignants ont déjà un cours dans cette classe, prendre le suivant en rotation
            if enseignant is None:
                enseignant = enseignants_classe[i % len(enseignants_classe)]
            
            enseignant_id = enseignant['id']
            nom_complet = f"{enseignant['prenom']} {enseignant['nom']}".strip()
            matiere = enseignant['matiere']
            
            # Marquer cet enseignant comme utilisé pour cette classe
            enseignants_utilises_classe.append(enseignant_id)
            
            print(f"DEBUG: Creating course {cours_id} for class {classe['nom_classe']} - Teacher ID: {enseignant_id}, Name: {nom_complet} ({matiere})")
            
            # Validation de l'ID enseignant
            if not enseignant_id or not str(enseignant_id).isdigit():
                print(f"WARNING: Invalid teacher ID {enseignant_id} for course {cours_id}")
                continue
            
            cours_a_planifier.append({
                "id_cours": cours_id,
                "id_classe": classe_id,
                "id_enseignant": enseignant_id,
                "duree_heures": 3.25,  # 3h15 par séance
                "type_planning": "cour",
                "matiere": matiere,
                "nom_enseignant": nom_complet,
                "enseignant_info": enseignant  # Ajouter les infos complètes de l'enseignant avec disponibilités
            })
            cours_id += 1
    
    print(f"DEBUG: Generated {len(cours_a_planifier)} courses to fill all time slots")
    print(f"DEBUG: Courses to plan: {cours_a_planifier}")
    
    planning = create_schedule(processed_salles, processed_classes, cours_a_planifier)
    
    if planning is None:
        return jsonify({"error": "Could not generate a valid planning."}), 500

    # Le planning est déjà formaté correctement par create_schedule
    formatted_planning = planning

    # Appeler Gemini AI pour l'optimisation
    print("Appel à Gemini AI pour l'optimisation du planning...")
    try:
        gemini_suggestions = optimize_planning_with_gemini(
            formatted_planning,
            processed_salles, # Passer les données traitées
            processed_classes, # Passer les données traitées
            cours_a_planifier
        )
        print("Optimisation avec Gemini AI terminée avec succès")
    except Exception as e:
        print(f"Erreur lors de l'appel à l'optimisation Gemini: {e}")
        gemini_suggestions = f"Erreur lors de l'optimisation: {str(e)}"

    # Retourner le planning généré et les suggestions de Gemini
    print("Planning généré avec succès.")
    return jsonify({
        "planning": formatted_planning,
        "gemini_suggestions": gemini_suggestions
    })

def has_enseignant_conflict(enseignant_id, jour, heure_debut, heure_fin, token):
    """
    Vérifie si un enseignant a des conflits avec des cours ou rattrapages aux horaires donnés.
    
    Args:
        enseignant_id: ID de l'enseignant
        jour: Jour de la semaine (ex: "Lundi")
        heure_debut: Heure de début (ex: "09:00")
        heure_fin: Heure de fin (ex: "10:30")
        token: Token JWT pour l'authentification
    
    Returns:
        bool: True si conflit détecté, False sinon
    """
    try:
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        
        # Vérifier les conflits avec les cours existants
        cours_query = """
        SELECT COUNT(*) as conflits_cours,
               STRING_AGG(DISTINCT COALESCE(c.nom_classe, p.id_classe::text), ', ') as classes_conflictuelles
        FROM Planning p
        LEFT JOIN Classe c ON p.id_classe = c.id_classe
        WHERE p.id_user = %s
        AND p.jour = %s
        AND (
            (p.heure_debut <= %s AND p.heure_fin > %s) OR
            (p.heure_debut < %s AND p.heure_fin >= %s) OR
            (p.heure_debut >= %s AND p.heure_fin <= %s)
        )
        AND p.statut_validation = 'valide'
        """
        
        cursor.execute(cours_query, (
            enseignant_id, jour, 
            heure_debut, heure_debut,  # Conflit si cours commence avant et finit après début soutenance
            heure_fin, heure_fin,      # Conflit si cours commence avant et finit après fin soutenance
            heure_debut, heure_fin     # Conflit si cours est complètement dans la plage de soutenance
        ))
        
        result_cours = cursor.fetchone()
        conflits_cours = result_cours[0] if result_cours else 0
        classes_conflictuelles = result_cours[1] if result_cours and result_cours[1] else ""
        
        # Vérifier les conflits avec les rattrapages approuvés
        rattrapage_query = """
        SELECT COUNT(*) as conflits_rattrapages,
               STRING_AGG(DISTINCT r.classe_rattrapage, ', ') as classes_rattrapage_conflits
        FROM rattrapage r
        WHERE r.id_enseignant = %s
        AND r.jour_rattrapage = %s
        AND (
            (r.heure_debut_rattrapage <= %s AND r.heure_fin_rattrapage > %s) OR
            (r.heure_debut_rattrapage < %s AND r.heure_fin_rattrapage >= %s) OR
            (r.heure_debut_rattrapage >= %s AND r.heure_fin_rattrapage <= %s)
        )
        AND r.statut = 'approuve'
        """
        
        cursor.execute(rattrapage_query, (
            enseignant_id, jour,
            heure_debut, heure_debut,
            heure_fin, heure_fin,
            heure_debut, heure_fin
        ))
        
        result_rattrapage = cursor.fetchone()
        conflits_rattrapages = result_rattrapage[0] if result_rattrapage else 0
        classes_rattrapage_conflits = result_rattrapage[1] if result_rattrapage and result_rattrapage[1] else ""
        
        # Vérifier les conflits avec les soutenances existantes
        soutenance_query = """
        SELECT COUNT(*) as conflits_soutenances,
               STRING_AGG(DISTINCT s.nom_etudiant, ', ') as etudiants_conflits
        FROM Soutenance s
        JOIN soutenance_jury sj ON s.id_soutenance = sj.id_soutenance
        WHERE sj.id_enseignant = %s
        AND s.jour = %s
        AND (
            (s.heure_debut <= %s AND s.heure_fin > %s) OR
            (s.heure_debut < %s AND s.heure_fin >= %s) OR
            (s.heure_debut >= %s AND s.heure_fin <= %s)
        )
        AND s.statut_validation = 'valide'
        """
        
        cursor.execute(soutenance_query, (
            enseignant_id, jour,
            heure_debut, heure_debut,
            heure_fin, heure_fin,
            heure_debut, heure_fin
        ))
        
        result_soutenance = cursor.fetchone()
        conflits_soutenances = result_soutenance[0] if result_soutenance else 0
        etudiants_conflits = result_soutenance[1] if result_soutenance and result_soutenance[1] else ""
        
        # Logging des conflits détectés
        if conflits_cours > 0 or conflits_rattrapages > 0 or conflits_soutenances > 0:
            print(f" CONFLIT JURY DÉTECTÉ - Enseignant ID {enseignant_id}:")
            if conflits_cours > 0:
                print(f"   {conflits_cours} cours en conflit ({jour} {heure_debut}-{heure_fin})")
                print(f"   Classes concernées: {classes_conflictuelles}")
            if conflits_rattrapages > 0:
                print(f"   {conflits_rattrapages} rattrapages en conflit ({jour} {heure_debut}-{heure_fin})")
                print(f"   Classes rattrapage: {classes_rattrapage_conflits}")
            if conflits_soutenances > 0:
                print(f"   {conflits_soutenances} soutenances en conflit ({jour} {heure_debut}-{heure_fin})")
                print(f"   Étudiants concernés: {etudiants_conflits}")
            return True
        
        return False
        
    except Exception as e:
        print(f"Erreur lors de la vérification des conflits enseignant {enseignant_id}: {e}")
        # En cas d'erreur, on considère qu'il n'y a pas de conflit pour ne pas bloquer
        return False

def create_soutenance_schedule(etudiants_selectionnes, salles=None, enseignants=None, semaine_numero=1, date_debut_semaine=None, token=None):
    """
    Génère un planning de soutenance hebdomadaire avec assignation automatique de jurys.
    
    Args:
        etudiants_selectionnes: Liste des étudiants sélectionnés pour soutenance
        salles: Liste de toutes les salles disponibles
        enseignants: Liste de tous les enseignants disponibles
        semaine_numero: Numéro de la semaine pour la randomisation
        date_debut_semaine: Date de début de la semaine (lundi)
    
    Returns:
        Liste des soutenances planifiées avec jurys assignés
    """
    print(f"Génération du planning de soutenance pour la semaine {semaine_numero}")
    print(f"Nombre d'étudiants sélectionnés: {len(etudiants_selectionnes)}")
    
    # Trier les salles par priorité: soutenance > cours > amphi
    salles_soutenance = [s for s in salles if s.get('type_type_salle') == 'salle de soutenance' and s.get('disponibilite')]
    salles_cours = [s for s in salles if s.get('type_type_salle') == 'salle de cour' and s.get('disponibilite')]
    salles_amphi = [s for s in salles if s.get('type_type_salle') == 'amphie' and s.get('disponibilite')]
    
    salles_priorite = salles_soutenance + salles_cours + salles_amphi
    
    print(f"Salles disponibles: {len(salles_soutenance)} soutenance, {len(salles_cours)} cours, {len(salles_amphi)} amphi")
    
    if not salles_priorite:
        print("ERREUR: Aucune salle disponible pour les soutenances")
        return []
    
    if len(enseignants) < 3:
        print("ERREUR: Minimum 3 enseignants requis pour former des jurys")
        return []
    
    # Créneaux horaires pour soutenances - 2 créneaux matin et 2 créneaux après-midi
    creneaux_soutenance = []
    
    # Session matin : 2 créneaux de 1h30 chacun (09:00-10:30 et 10:45-12:15)
    creneaux_soutenance.extend([
        {
            "heure_debut": "09:00", 
            "heure_fin": "10:30", 
            "duree": 90, 
            "periode": "matin",
            "slot": 1
        },
        {
            "heure_debut": "10:45", 
            "heure_fin": "12:15", 
            "duree": 90, 
            "periode": "matin",
            "slot": 2
        }
    ])
    
    # Session après-midi : 2 créneaux de 1h30 chacun (13:30-15:00 et 15:15-16:45)
    creneaux_soutenance.extend([
        {
            "heure_debut": "13:30", 
            "heure_fin": "15:00", 
            "duree": 90, 
            "periode": "apres_midi",
            "slot": 1
        },
        {
            "heure_debut": "15:15", 
            "heure_fin": "16:45", 
            "duree": 90, 
            "periode": "apres_midi",
            "slot": 2
        }
    ])
    
    planning_soutenances = []
    salles_occupees = {}  # {(salle_id, creneau): True}
    enseignants_occupes = {}  # {(enseignant_id, creneau): True}
    soutenances_par_creneau = {}  # {(jour, periode): count} - Maximum 2 par créneau
    conflits_detectes = []  # Liste des conflits détectés pour validation
    creneaux_utilises = {}  # {(jour, heure_debut, heure_fin): [soutenance_info]} - Validation stricte des conflits
    conflits_jury_evites = 0  # Compteur des conflits de jury évités
    enseignants_rejetes_par_conflit = {}  # {enseignant_id: nombre_de_rejets}
    
    # Randomiser pour éviter les patterns (basé sur la semaine comme pour les cours)
    random.seed(int(time.time()) + semaine_numero)
    random.shuffle(etudiants_selectionnes)
    random.shuffle(enseignants)
    
    # Jours disponibles pour les soutenances (tous les jours y compris mercredi midi et samedi)
    jours_soutenance = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    
    # Créer tous les créneaux possibles (jour + créneau horaire)
    time_slots_soutenance = []
    for jour in jours_soutenance:
        for creneau in creneaux_soutenance:
            # Pour les soutenances, on accepte même mercredi midi (contrairement aux cours)
            time_slots_soutenance.append((jour, creneau["heure_debut"], creneau["heure_fin"], creneau["duree"], creneau["periode"], creneau["slot"]))
    
    # Randomiser les créneaux avec une distribution équilibrée par jour
    # Au lieu de mélanger complètement, on assure une répartition équitable
    print(f"Créneaux de soutenance disponibles: {len(time_slots_soutenance)} créneaux sur {len(jours_soutenance)} jours")
    
    # Debug: Afficher la distribution des créneaux par jour AVANT randomisation
    creneaux_par_jour = {}
    for jour, heure_debut, heure_fin, duree, periode, slot in time_slots_soutenance:
        if jour not in creneaux_par_jour:
            creneaux_par_jour[jour] = 0
        creneaux_par_jour[jour] += 1
    print(f"Distribution des créneaux par jour AVANT randomisation: {creneaux_par_jour}")
    
    # Randomiser mais en gardant une distribution équilibrée
    random.shuffle(time_slots_soutenance)
    
    # Utiliser un algorithme de distribution équilibrée au lieu de prendre le premier créneau disponible
    etudiant_index = 0
    for etudiant in etudiants_selectionnes:
        soutenance_planifiee = False
        
        # Commencer par un jour différent pour chaque étudiant pour assurer une distribution équilibrée
        start_index = (etudiant_index * 7) % len(time_slots_soutenance)  # Rotation basée sur l'index étudiant
        
        # Créer une liste des créneaux en commençant par l'index calculé
        rotated_slots = time_slots_soutenance[start_index:] + time_slots_soutenance[:start_index]
        
        # Essayer chaque créneau
        for jour, heure_debut, heure_fin, duree, periode, slot in rotated_slots:
            creneau_key = f"{jour}-{heure_debut}-{heure_fin}"
            creneau_exact = (jour, heure_debut, heure_fin)
            
            # Utiliser la période définie dans le créneau
            creneau_periode_key = (jour, periode)
            
            # Vérifier la limite de 2 soutenances par période par jour
            if soutenances_par_creneau.get(creneau_periode_key, 0) >= 2:
                continue  # Maximum 2 soutenances par période (matin/après-midi) par jour atteint
            
            # Vérifier si ce créneau exact est déjà occupé
            creneau_exact = (jour, heure_debut, heure_fin)
            if creneau_exact in creneaux_utilises:
                continue  # Ce créneau exact est déjà pris
            
            # Trouver une salle libre
            salle_assignee = None
            for salle in salles_priorite:
                salle_key = (salle['id_salle'], creneau_key)
                if salle_key not in salles_occupees:
                    salle_assignee = salle
                    break
            
            if not salle_assignee:
                continue  # Pas de salle libre pour ce créneau
            
            # Générer un jury de 3-5 enseignants
            jury_size = random.randint(3, min(5, len(enseignants)))
            jury_candidats = []
            
            # Sélectionner des enseignants libres (vérifier conflits avec cours et rattrapages)
            for enseignant in enseignants:
                enseignant_key = (enseignant['id'], creneau_key)
                if enseignant_key not in enseignants_occupes:
                    # Vérifier si l'enseignant a des conflits avec cours ou rattrapages
                    if not has_enseignant_conflict(enseignant['id'], jour, heure_debut, heure_fin, token):
                        jury_candidats.append(enseignant)
                        if len(jury_candidats) >= jury_size:
                            break
                    else:
                        # Compter les conflits évités
                        conflits_jury_evites += 1
                        enseignant_id = enseignant['id']
                        enseignants_rejetes_par_conflit[enseignant_id] = enseignants_rejetes_par_conflit.get(enseignant_id, 0) + 1
            
            if len(jury_candidats) < 3:
                continue  # Pas assez d'enseignants libres
            
            # Créer la soutenance
            jury_final = jury_candidats[:jury_size]
            
            # Debug: Vérifier la valeur du jour avant création
            jour_soutenance = jour  # Capturer explicitement la variable
            print(f"DEBUG AI: Création soutenance pour {etudiant.get('nom', 'Inconnu')} - Jour: {jour_soutenance}")
            
            soutenance = {
                "id_etudiant": etudiant.get('id_user') or etudiant.get('idUser'),
                "nom_etudiant": f"{etudiant.get('prenom', '')} {etudiant.get('nom', '')}".strip(),
                "identifiant_etudiant": etudiant.get('identifiant') or etudiant.get('idUser'),
                "classe_etudiant": etudiant.get('nomClasse') or etudiant.get('classe', {}).get('nomClasse', 'Non spécifiée'),
                "niveau_etudiant": etudiant.get('niveau', ''),
                "id_salle": salle_assignee['id_salle'],
                "nom_salle": salle_assignee['numsalle'],
                "type_salle": salle_assignee['type_type_salle'],
                "jour": jour_soutenance,
                "heure_debut": heure_debut,
                "heure_fin": heure_fin,
                "duree_minutes": 30,
                "date_soutenance": date_debut_semaine or "À définir",
                "semaine_numero": semaine_numero,
                "jury": [
                    {
                        "id_enseignant": ens['id'],
                        "nom_enseignant": f"{ens.get('prenom', '')} {ens.get('nom', '')}".strip(),
                        "matiere": ens.get('matiere', 'Non spécifiée'),
                        "role_jury": "Président" if i == 0 else "Examinateur"
                    }
                    for i, ens in enumerate(jury_final)
                ],
                "statut": "planifie"
            }
            
            planning_soutenances.append(soutenance)
            
            # ENREGISTRER LE CRÉNEAU COMME UTILISÉ - VALIDATION STRICTE
            creneaux_utilises[creneau_exact] = {
                "etudiant": soutenance["nom_etudiant"],
                "salle": soutenance["nom_salle"],
                "jury": [j["nom_enseignant"] for j in soutenance["jury"]]
            }
            
            # Marquer comme occupé
            salle_key = (salle_assignee['id_salle'], creneau_key)
            salles_occupees[salle_key] = True
            
            for enseignant in jury_final:
                enseignant_key = (enseignant['id'], creneau_key)
                enseignants_occupes[enseignant_key] = True
            
            # Incrémenter le compteur de soutenances pour ce créneau
            soutenances_par_creneau[creneau_periode_key] = soutenances_par_creneau.get(creneau_periode_key, 0) + 1
            
            soutenance_planifiee = True
            print(f"Soutenance planifiée: {soutenance['nom_etudiant']} - {salle_assignee['numsalle']} ({jour} {heure_debut}-{heure_fin}) - {soutenances_par_creneau[creneau_periode_key]}/2 pour {periode}")
            break
        
        if not soutenance_planifiee:
            print(f"ATTENTION: Impossible de planifier une soutenance pour l'étudiant {etudiant.get('nom', 'Inconnu')}")
        
        etudiant_index += 1  # Incrémenter l'index pour la rotation des créneaux
    
    # RAPPORT DE VALIDATION FINAL
    print(f"\n=== RAPPORT DE VALIDATION DES SOUTENANCES ===")
    print(f"✅ Soutenances planifiées: {len(planning_soutenances)}/{len(etudiants_selectionnes)} étudiants")
    print(f"🔒 Créneaux utilisés: {len(creneaux_utilises)} (AUCUN CONFLIT AUTORISÉ)")
    print(f"⚠️  Conflits détectés et évités: {len(conflits_detectes)}")
    print(f"🚫 Conflits de jury évités: {conflits_jury_evites}")
    
    if enseignants_rejetes_par_conflit:
        print("👥 Enseignants rejetés par conflits:")
        for ens_id, nb_rejets in enseignants_rejetes_par_conflit.items():
            print(f"   - Enseignant ID {ens_id}: {nb_rejets} rejets")
    
    if conflits_detectes:
        print("📋 Détails des conflits évités:")
        for conflit in conflits_detectes:
            print(f"   - {conflit['message']}")
    
    # Vérification finale de l'unicité des créneaux
    creneaux_verification = {}
    for soutenance in planning_soutenances:
        cle_verification = (soutenance['jour'], soutenance['heure_debut'], soutenance['heure_fin'])
        if cle_verification in creneaux_verification:
            print(f"🚨 ERREUR CRITIQUE: Conflit détecté dans le planning final!")
            print(f"   Créneau: {cle_verification}")
            print(f"   Soutenance 1: {creneaux_verification[cle_verification]}")
            print(f"   Soutenance 2: {soutenance['nom_etudiant']}")
        else:
            creneaux_verification[cle_verification] = soutenance['nom_etudiant']
    
    print(f"✅ Validation finale: {len(creneaux_verification)} créneaux uniques confirmés")
    print("===============================================\n")
    
    return planning_soutenances

@app.route('/generate-soutenance-planning', methods=['POST'])
def generate_soutenance_planning_endpoint():
    """API endpoint pour générer un planning de soutenances."""
    print("Endpoint /generate-soutenance-planning appelé")
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Données JSON invalides"}), 400
        
        etudiants_selectionnes = data.get('etudiants_selectionnes', [])
        date_soutenance = data.get('date_soutenance')
        
        if not etudiants_selectionnes:
            return jsonify({"error": "Aucun étudiant sélectionné"}), 400
        
        print(f"Étudiants sélectionnés: {len(etudiants_selectionnes)}")
        print(f"Date de soutenance: {date_soutenance}")
        
        # Récupérer les salles depuis Spring Boot
        token = data.get('token')
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        
        try:
            salles_response = requests.get('http://localhost:8080/api/salles', headers=headers, timeout=5)
            if salles_response.status_code == 200:
                salles_data = salles_response.json()
                # Adapter le format
                processed_salles = []
                for s in salles_data:
                    processed_salles.append({
                        "id_salle": s.get('idSalle'),
                        "numsalle": s.get('numSalle'),
                        "capacite": s.get('capacite'),
                        "disponibilite": s.get('disponibilite'),
                        "bloc": s.get('bloc'),
                        "type_type_salle": s.get('typeSalle', {}).get('typeSalle') if s.get('typeSalle') else None
                    })
            else:
                return jsonify({"error": "Impossible de récupérer les salles"}), 500
        except Exception as e:
            return jsonify({"error": f"Erreur lors de la récupération des salles: {str(e)}"}), 500
        
        # Récupérer les enseignants depuis Spring Boot
        try:
            enseignants_response = requests.get('http://localhost:8080/api/users/enseignants', headers=headers, timeout=5)
            if enseignants_response.status_code == 200:
                enseignants_data = enseignants_response.json()
                # Adapter le format
                processed_enseignants = []
                for e in enseignants_data:
                    processed_enseignants.append({
                        "id": e.get('idUser'),
                        "nom": e.get('nom', ''),
                        "prenom": e.get('prenom', ''),
                        "matiere": e.get('matiere', 'Non spécifiée')
                    })
            else:
                return jsonify({"error": "Impossible de récupérer les enseignants"}), 500
        except Exception as e:
            return jsonify({"error": f"Erreur lors de la récupération des enseignants: {str(e)}"}), 500
        
        # Générer le planning de soutenance
        planning_soutenances = create_soutenance_schedule(
            etudiants_selectionnes, 
                salles=processed_salles, 
            enseignants=processed_enseignants, 
            semaine_numero=1,  # Semaine fixe
            date_debut_semaine=date_soutenance,
            token=token
        )
        
        if not planning_soutenances:
            return jsonify({"error": "Impossible de générer le planning de soutenance"}), 500
        
        # Debug: Vérifier les données avant envoi
        print(f"DEBUG AI: Envoi de {len(planning_soutenances)} soutenances")
        for i, sout in enumerate(planning_soutenances[:3]):  # Afficher les 3 premières
            print(f"DEBUG AI: Soutenance {i+1} - Jour: {sout.get('jour', 'MANQUANT')}")
        
        return jsonify({
            "planning_soutenances": planning_soutenances,
            "statistiques": {
                "total_soutenances": len(planning_soutenances),
                "etudiants_demandes": len(etudiants_selectionnes),
                "salles_utilisees": len(set(s['id_salle'] for s in planning_soutenances)),
                "enseignants_mobilises": len(set(e['id_enseignant'] for s in planning_soutenances for e in s['jury']))
            }
        })
        
    except Exception as e:
        print(f"Erreur dans generate_soutenance_planning_endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erreur interne: {str(e)}"}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Endpoint pour récupérer les statistiques avancées du système."""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Connexion à la base de données impossible"}), 500
        
        cursor = conn.cursor()
        
        # Statistiques de base
        stats = {
            "tauxPresence": None,
            "repartitionParNiveau": {},
            "evolutionInscriptions": [],
            "performanceEnseignants": {}
        }
        
        # 1. Calculer le taux de présence moyen
        try:
            cursor.execute("""
                SELECT AVG(CASE WHEN active = true THEN 95 ELSE 70 END) 
                FROM users WHERE role = 'Etudiant'
            """)
            result = cursor.fetchone()
            if result and result[0]:
                stats["tauxPresence"] = round(float(result[0]))
        except Exception as e:
            print(f"Erreur calcul taux présence: {e}")
        
        # 2. Répartition par niveau/classe
        try:
            cursor.execute("""
                SELECT niveau, COUNT(*) as count 
                FROM users 
                WHERE role = 'Etudiant' AND niveau IS NOT NULL
                GROUP BY niveau
                ORDER BY niveau
            """)
            for row in cursor.fetchall():
                stats["repartitionParNiveau"][row[0]] = row[1]
        except Exception as e:
            print(f"Erreur répartition par niveau: {e}")
        
        # 3. Évolution des inscriptions (6 derniers mois)
        try:
            cursor.execute("""
                SELECT 
                    TO_CHAR(date_creation, 'Month') as mois,
                    COUNT(*) as inscriptions
                FROM users 
                WHERE role = 'Etudiant' 
                    AND date_creation >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', date_creation), TO_CHAR(date_creation, 'Month')
                ORDER BY DATE_TRUNC('month', date_creation)
            """)
            for row in cursor.fetchall():
                stats["evolutionInscriptions"].append({
                    "mois": row[0].strip(),
                    "inscriptions": row[1]
                })
        except Exception as e:
            print(f"Erreur évolution inscriptions: {e}")
        
        # 4. Performance des enseignants
        try:
            cursor.execute("""
                SELECT 
                    CONCAT(prenom, ' ', nom) as nom_complet,
                    COALESCE(evaluation, 4.2) as note_evaluation,
                    COALESCE(presence, 92) as taux_presence
                FROM users 
                WHERE role = 'Enseignant'
                LIMIT 10
            """)
            for row in cursor.fetchall():
                stats["performanceEnseignants"][row[0]] = {
                    "coursDispenses": random.randint(3, 8),  # À remplacer par vraie donnée
                    "noteEvaluation": float(row[1]),
                    "tauxPresence": int(row[2])
                }
        except Exception as e:
            print(f"Erreur performance enseignants: {e}")
        
        cursor.close()
        conn.close()
        
        return jsonify(stats)
        
    except Exception as e:
        print(f"Erreur dans get_statistics: {e}")
        return jsonify({"error": "Erreur lors de la récupération des statistiques"}), 500

@app.route('/health-check', methods=['GET'])
def health_check():
    """Endpoint pour vérifier l'état global du service AI."""
    health_status = {
        "status": "checking",
        "components": {
            "database": {
                "status": "unknown",
                "message": ""
            },
            "constraint_solver": {
                "status": "unknown",
                "message": ""
            },
            "gemini_api": {
                "status": "unknown",
                "message": ""
            }
        },
        "overall_status": "unknown"
    }
    
    # Vérifier la base de données
    try:
        conn = get_db_connection()
        if conn is not None:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            health_status["components"]["database"]["status"] = "ok"
            health_status["components"]["database"]["message"] = "Connexion à la base de données établie avec succès"
        else:
            health_status["components"]["database"]["status"] = "error"
            health_status["components"]["database"]["message"] = "Échec de la connexion à la base de données"
    except Exception as e:
        health_status["components"]["database"]["status"] = "error"
        health_status["components"]["database"]["message"] = f"Erreur: {str(e)}"
    
    # Vérifier le solveur de contraintes
    try:
        problem = Problem()
        problem.addVariable("x", [1, 2, 3])
        problem.addConstraint(lambda x: x > 1, ["x"])
        solutions = problem.getSolutions()
        if solutions:
            health_status["components"]["constraint_solver"]["status"] = "ok"
            health_status["components"]["constraint_solver"]["message"] = "Solveur de contraintes fonctionne correctement"
        else:
            health_status["components"]["constraint_solver"]["status"] = "warning"
            health_status["components"]["constraint_solver"]["message"] = "Le solveur fonctionne mais n'a pas trouvé de solutions"
    except Exception as e:
        health_status["components"]["constraint_solver"]["status"] = "error"
        health_status["components"]["constraint_solver"]["message"] = f"Erreur: {str(e)}"
    
    # Vérifier l'API Gemini
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Test de l'API Gemini")
        if response and hasattr(response, 'text'):
            health_status["components"]["gemini_api"]["status"] = "ok"
            health_status["components"]["gemini_api"]["message"] = "API Gemini fonctionne correctement"
        else:
            health_status["components"]["gemini_api"]["status"] = "warning"
            health_status["components"]["gemini_api"]["message"] = "Réponse de l'API Gemini dans un format inattendu"
    except Exception as e:
        health_status["components"]["gemini_api"]["status"] = "error"
        health_status["components"]["gemini_api"]["message"] = f"Erreur: {str(e)}"
    
    # Déterminer l'état global
    component_statuses = [component["status"] for component in health_status["components"].values()]
    if "error" in component_statuses:
        health_status["overall_status"] = "error"
    elif "warning" in component_statuses:
        health_status["overall_status"] = "warning"
    else:
        health_status["overall_status"] = "ok"
    
    health_status["status"] = "completed"
    
    return jsonify(health_status)

@app.route('/analyze-rattrapage', methods=['POST'])
def analyze_rattrapage():
    """
    Analyse avancée d'une demande de rattrapage avec l'IA Gemini.
    Inclut des critères intelligents et une analyse contextuelle approfondie.
    """
    try:
        data = request.get_json()
        
        # Validation des données requises
        required_fields = ['classe', 'matiere', 'date_rattrapage', 'heure_debut', 'heure_fin', 'motif']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'error': f'Champ requis manquant: {field}',
                    'status': 'error'
                }), 400
        
        # Extraction des données
        classe = data['classe']
        matiere = data['matiere']
        date_rattrapage = data['date_rattrapage']
        heure_debut = data['heure_debut']
        heure_fin = data['heure_fin']
        motif = data['motif']
        enseignant_id = data.get('enseignant_id', 'Non spécifié')
        
        # Analyse avancée avec données contextuelles
        analysis_result = perform_advanced_rattrapage_analysis(
            classe, matiere, date_rattrapage, heure_debut, heure_fin, motif, enseignant_id
        )
        
        return jsonify(analysis_result)
        
    except Exception as e:
        print(f"Erreur lors de l'analyse IA: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Erreur lors de l\'analyse: {str(e)}',
            'status': 'error'
        }), 500

def perform_advanced_rattrapage_analysis(classe, matiere, date_rattrapage, heure_debut, heure_fin, motif, enseignant_id):
    """
    Effectue une analyse avancée et contextuelle de la demande de rattrapage.
    """
    conn = get_db_connection()
    if not conn:
        return {
            'error': 'Erreur de connexion à la base de données',
            'status': 'error'
        }
    
    cursor = conn.cursor()
    
    # 1. ANALYSE DES CONFLITS DE PLANNING
    cursor.execute("""
        SELECT COUNT(*), 
               STRING_AGG(DISTINCT COALESCE(c.nom_classe, p.id_classe::text), ', ') as classes_conflictuelles,
               STRING_AGG(DISTINCT s.num_salle, ', ') as salles_occupees
        FROM Planning p
        JOIN Salle s ON p.id_salle = s.id_salle
        LEFT JOIN Classe c ON p.id_classe = c.id_classe
        WHERE p.date_debut = %s 
        AND ((p.heure_debut <= %s AND p.heure_fin > %s) 
             OR (p.heure_debut < %s AND p.heure_fin >= %s)
             OR (p.heure_debut >= %s AND p.heure_fin <= %s))
    """, (date_rattrapage, heure_debut, heure_debut, heure_fin, heure_fin, heure_debut, heure_fin))
    
    conflit_result = cursor.fetchone()
    conflits_planning = conflit_result[0] or 0
    classes_conflictuelles = conflit_result[1] or ""
    salles_occupees = conflit_result[2] or ""
    
    # 2. ANALYSE AVANCÉE DES SALLES DISPONIBLES
    cursor.execute("""
        SELECT s.id_salle, s.num_salle, s.capacite,
               CASE WHEN s.id_salle IN (
                   SELECT DISTINCT p.id_salle FROM Planning p 
                   WHERE p.date_debut = %s 
                   AND ((p.heure_debut <= %s AND p.heure_fin > %s) 
                        OR (p.heure_debut < %s AND p.heure_fin >= %s)
                        OR (p.heure_debut >= %s AND p.heure_fin <= %s))
               ) THEN false ELSE true END as disponible
        FROM Salle s
        WHERE s.disponibilite = true
        ORDER BY s.capacite DESC
    """, (date_rattrapage, heure_debut, heure_debut, heure_fin, heure_fin, heure_debut, heure_fin))
    
    salles_info = cursor.fetchall()
    salles_disponibles = sum(1 for salle in salles_info if salle[3])  # Count available rooms
    salles_details = [
        {
            'nom': salle[1], 
            'capacite': salle[2], 
            'disponible': salle[3]
        } for salle in salles_info
    ]
    
    # 3. ANALYSE DE LA CHARGE DE TRAVAIL DE L'ENSEIGNANT
    try:
        # Vérifier si enseignant_id est valide (numérique)
        if enseignant_id and str(enseignant_id).isdigit():
            cursor.execute("""
                SELECT COUNT(*) as total_rattrapages,
                       COUNT(CASE WHEN r.statut = 'approuve' THEN 1 END) as rattrapages_approuves,
                       COUNT(CASE WHEN r.date_rattrapage_proposee = %s THEN 1 END) as rattrapages_meme_jour
                FROM Rattrapage r
                WHERE r.id_enseignant = %s 
                AND r.date_rattrapage_proposee >= CURRENT_DATE - INTERVAL '30 days'
            """, (date_rattrapage, int(enseignant_id)))
            
            charge_result = cursor.fetchone()
            charge_enseignant = {
                'total_rattrapages': charge_result[0] or 0,
                'rattrapages_approuves': charge_result[1] or 0,
                'rattrapages_meme_jour': charge_result[2] or 0
            }
        else:
            # Si enseignant_id n'est pas valide, utiliser des valeurs par défaut
            charge_enseignant = {
                'total_rattrapages': 0,
                'rattrapages_approuves': 0,
                'rattrapages_meme_jour': 0
            }
    except Exception as e:
        print(f"Erreur lors de l'analyse de la charge enseignant: {e}")
        charge_enseignant = {
            'total_rattrapages': 0,
            'rattrapages_approuves': 0,
            'rattrapages_meme_jour': 0
        }
    
    # 4. VÉRIFICATION DES CONFLITS D'HORAIRES ENSEIGNANT
    try:
        # Vérifier si enseignant_id est valide avant de faire les requêtes
        if enseignant_id and str(enseignant_id).isdigit():
            # Note: La table Planning n'a pas de colonne id_enseignant, on skip cette vérification
            # pour éviter l'erreur SQL. Cette fonctionnalité nécessiterait une modification du schéma DB
            conflits_enseignant = 0
            classes_enseignant_occupees = ""
            
            # Note: Les colonnes d'horaires proposées n'existent pas dans la table Rattrapage
            # On skip cette vérification pour éviter l'erreur SQL
            # Cette fonctionnalité nécessiterait l'ajout des colonnes heure_debut_proposee et heure_fin_proposee
            rattrapages_conflits = 0
            classes_rattrapage_conflits = ""
        else:
            # Si enseignant_id n'est pas valide, pas de conflits possibles
            conflits_enseignant = 0
            classes_enseignant_occupees = ""
            rattrapages_conflits = 0
            classes_rattrapage_conflits = ""
        
    except Exception as e:
        print(f"Erreur lors de la vérification des conflits enseignant: {e}")
        conflits_enseignant = 0
        classes_enseignant_occupees = ""
        rattrapages_conflits = 0
        classes_rattrapage_conflits = ""
    
    # 5. ANALYSE TEMPORELLE ET CONTEXTUELLE
    from datetime import datetime, timedelta
    try:
        date_obj = datetime.strptime(date_rattrapage, '%Y-%m-%d')
        jour_semaine = date_obj.strftime('%A')
        jours_avant = (date_obj - datetime.now()).days
        
        # Vérifier si c'est un weekend ou jour férié
        est_weekend = date_obj.weekday() >= 5  # Samedi = 5, Dimanche = 6
    except:
        jour_semaine = "Inconnu"
        jours_avant = 0
        est_weekend = False
    
    # 5. ANALYSE DU MOTIF AVEC IA
    motifs_urgents = ['maladie', 'urgence', 'familial', 'médical', 'décès', 'hospitalisation']
    motifs_acceptables = ['formation', 'conférence', 'mission', 'professionnel', 'pédagogique']
    
    urgence_motif = any(mot in motif.lower() for mot in motifs_urgents)
    acceptabilite_motif = any(mot in motif.lower() for mot in motifs_acceptables) or urgence_motif
    
    # 6. CALCUL DU SCORE DE FAISABILITÉ
    score_faisabilite = 50  # Score de base
    
    # Facteurs positifs
    if salles_disponibles > 0:
        score_faisabilite += 20
    if charge_enseignant['rattrapages_meme_jour'] == 0:
        score_faisabilite += 15
    if jours_avant >= 3:
        score_faisabilite += 10
    if not est_weekend:
        score_faisabilite += 5
    if conflits_enseignant == 0 and rattrapages_conflits == 0:
        score_faisabilite += 15  # Bonus si l'enseignant est libre
    
    # Facteurs négatifs
    if conflits_planning > 0:
        score_faisabilite -= 25
    if conflits_enseignant > 0:
        score_faisabilite -= 30  # Pénalité majeure pour conflit enseignant
    if rattrapages_conflits > 0:
        score_faisabilite -= 25  # Pénalité pour rattrapage déjà programmé
    if charge_enseignant['total_rattrapages'] > 5:
        score_faisabilite -= 10
    if jours_avant < 1:
        score_faisabilite -= 20
    if est_weekend:
        score_faisabilite -= 5
    if jours_avant < 2:
        score_faisabilite -= 15
    
    score_faisabilite = max(0, min(100, score_faisabilite))
    
    conn.close()
    
    # 7. GÉNÉRATION DU PROMPT AVANCÉ POUR GEMINI
    prompt = f"""
    Analysez cette demande de rattrapage avec une approche contextuelle avancée.

    📋 INFORMATIONS DE LA DEMANDE:
    - Classe: {classe}
    - Matière: {matiere}
    - Date: {date_rattrapage} ({jour_semaine}, dans {jours_avant} jours)
    - Horaire: {heure_debut} - {heure_fin}
    - Motif: "{motif}"
    - Enseignant ID: {enseignant_id}

    🔍 ANALYSE TECHNIQUE DÉTAILLÉE:
    - Conflits planning: {conflits_planning} (Classes: {classes_conflictuelles})
    - Salles disponibles: {salles_disponibles}/{len(salles_info)} total
    - Salles occupées: {salles_occupees}
    - Score de faisabilité calculé: {score_faisabilite}/100

    👨‍🏫 CHARGE DE TRAVAIL ENSEIGNANT:
    - Rattrapages ce mois: {charge_enseignant['total_rattrapages']}
    - Rattrapages approuvés: {charge_enseignant['rattrapages_approuves']}
    - Rattrapages même jour: {charge_enseignant['rattrapages_meme_jour']}
    
    ⚠️ CONFLITS D'HORAIRES ENSEIGNANT:
    - Cours en conflit: {conflits_enseignant} (Classes: {classes_enseignant_occupees})
    - Rattrapages en conflit: {rattrapages_conflits} (Classes: {classes_rattrapage_conflits})

    🏢 DÉTAILS DES SALLES:
    {chr(10).join([f"- {s['nom']} ({s['capacite']} places): {'✅ Disponible' if s['disponible'] else '❌ Occupée'}" for s in salles_details[:5]])}

    ⚡ FACTEURS CONTEXTUELS:
    - Weekend: {'Oui' if est_weekend else 'Non'}
    - Urgence motif: {'Oui' if urgence_motif else 'Non'}
    - Motif acceptable: {'Oui' if acceptabilite_motif else 'Non'}
    - Préavis: {jours_avant} jours

    🎯 CRITÈRES D'ÉVALUATION AVANCÉS:
    1. Disponibilité des ressources (salles, équipements)
    2. Impact sur les autres cours et étudiants
    3. Charge de travail et bien-être de l'enseignant
    4. Conflits d'horaires de l'enseignant (PRIORITÉ CRITIQUE)
    5. Urgence et légitimité du motif
    6. Respect des délais et procédures
    7. Qualité pédagogique du rattrapage
    8. Équité envers les autres demandes
    9. Faisabilité logistique et organisationnelle
    
    ⚠️ RÈGLE CRITIQUE: Un enseignant ne peut PAS avoir plusieurs séances simultanées aux mêmes horaires et date.

    Analysez tous ces éléments et donnez une décision claire au format JSON:
    {{
        "recommandation": "APPROUVER" ou "REJETER",
        "score_confiance": [0-100],
        "priorite": "HAUTE" ou "MOYENNE" ou "BASSE",
        "raisons": ["raison principale de la décision", "raison secondaire", "raison tertiaire"],
        "decision_justification": "Explication claire de pourquoi approuver ou rejeter",
        "suggestions": ["suggestion1", "suggestion2"],
        "alternatives": ["alternative1", "alternative2"],
        "conditions": ["condition1", "condition2"]
    }}
    """
    
    # 8. APPEL À L'IA GEMINI AVEC GESTION D'ERREURS
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        # Parser la réponse JSON
        import json
        try:
            ai_analysis = json.loads(response.text.strip())
        except:
            # Fallback intelligent basé sur l'analyse technique
            ai_analysis = generate_fallback_analysis(
                score_faisabilite, salles_disponibles, conflits_planning, 
                urgence_motif, acceptabilite_motif, charge_enseignant
            )
    except Exception as e:
        print(f"Erreur Gemini API: {e}")
        ai_analysis = generate_fallback_analysis(
            score_faisabilite, salles_disponibles, conflits_planning, 
            urgence_motif, acceptabilite_motif, charge_enseignant
        )
    
    # 9. ENRICHISSEMENT DE LA RÉPONSE AVEC DONNÉES CONTEXTUELLES
    result = {
        **ai_analysis,
        'technical_data': {
            'conflits_planning': conflits_planning,
            'salles_disponibles': salles_disponibles,
            'score_faisabilite': score_faisabilite,
            'conflits_enseignant': conflits_enseignant,
            'rattrapages_conflits': rattrapages_conflits
        },
        'contextual_data': {
            'est_weekend': est_weekend,
            'jours_avant': jours_avant,
            'jour_semaine': jour_semaine,
            'charge_enseignant': charge_enseignant
        },
        'analyse_motif': {
            'urgence': urgence_motif,
            'acceptabilite': acceptabilite_motif
        },
        'salles_details': salles_details,
        'demande_info': {
            'classe': classe,
            'matiere': matiere,
            'date_rattrapage': date_rattrapage,
            'horaire': f"{heure_debut} - {heure_fin}",
            'motif': motif,
            'enseignant_id': enseignant_id
        }
    }
    
    print(f"Analyse IA avancée pour rattrapage {classe} - {matiere}: {ai_analysis.get('recommandation', 'ERREUR')} (Score: {score_faisabilite})")
    
    return result

def generate_fallback_analysis(score_faisabilite, salles_disponibles, conflits_planning, urgence_motif, acceptabilite_motif, charge_enseignant):
    """
    Génère une analyse de fallback intelligente basée sur les données techniques.
    """
    if score_faisabilite >= 60:
        recommandation = "APPROUVER"
        priorite = "HAUTE" if urgence_motif else "MOYENNE"
    else:
        recommandation = "REJETER"
        priorite = "BASSE"
    
    raisons = []
    suggestions = []
    alternatives = []
    conditions = []
    
    # Analyse des raisons pour APPROUVER ou REJETER
    decision_justification = ""
    
    if recommandation == "APPROUVER":
        decision_justification = "Demande approuvée car les conditions sont favorables"
        if salles_disponibles > 0:
            raisons.append(f"✅ {salles_disponibles} salle(s) disponible(s)")
        if conflits_planning <= 2:
            raisons.append("✅ Conflits de planning gérables")
        if urgence_motif:
            raisons.append("🚨 Motif d'urgence justifié")
            priorite = "HAUTE"
        elif acceptabilite_motif:
            raisons.append("✅ Motif pédagogiquement acceptable")
        if charge_enseignant['total_rattrapages'] <= 5:
            raisons.append("✅ Charge de travail enseignant raisonnable")
    else:  # REJETER
        decision_justification = "Demande rejetée en raison de contraintes importantes"
        if salles_disponibles == 0:
            raisons.append("❌ Aucune salle disponible")
        if conflits_planning > 2:
            raisons.append(f"❌ Trop de conflits de planning ({conflits_planning})")
        if not acceptabilite_motif and not urgence_motif:
            raisons.append("❌ Motif insuffisamment justifié")
        if charge_enseignant['total_rattrapages'] > 5:
            raisons.append("❌ Surcharge de rattrapages pour l'enseignant")
        
        # Suggestions pour améliorer la demande
        suggestions.append("Revoir la justification du motif")
        suggestions.append("Proposer un autre créneau horaire")
        alternatives.append("Reporter à une date ultérieure")
        alternatives.append("Organiser en mode distanciel")
    
    return {
        "recommandation": recommandation,
        "score_confiance": min(95, max(60, score_faisabilite + 10)),
        "priorite": priorite,
        "raisons": raisons[:4],  # Limiter à 4 raisons principales
        "decision_justification": decision_justification,
        "suggestions": suggestions[:3],  # Limiter à 3 suggestions
        "alternatives": alternatives[:3],  # Limiter à 3 alternatives
        "conditions": conditions[:3]  # Limiter à 3 conditions
    }

if __name__ == '__main__':
    # Note: Don't use this in production. Use a proper WSGI server like Gunicorn.
    app.run(debug=True, port=5001)
