#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script de diagnostic pour ESP AI Engine
Ce script vérifie tous les composants du service AI et génère un rapport détaillé.
"""

import os
import sys
import json
import platform
import subprocess
import importlib.util
import traceback

# Couleurs pour la sortie console
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Désactiver les couleurs sur Windows sauf si ANSI est supporté
if platform.system() == 'Windows' and not os.environ.get('ANSICON'):
    Colors.HEADER = ''
    Colors.OKBLUE = ''
    Colors.OKGREEN = ''
    Colors.WARNING = ''
    Colors.FAIL = ''
    Colors.ENDC = ''
    Colors.BOLD = ''
    Colors.UNDERLINE = ''

def print_header(message):
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== {message} ==={Colors.ENDC}\n")

def print_success(message):
    print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.WARNING}⚠ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")

def check_python_version():
    print_header("Vérification de la version de Python")
    version = sys.version.split()[0]
    print(f"Version de Python: {version}")
    
    major, minor, _ = version.split('.')
    if int(major) < 3 or (int(major) == 3 and int(minor) < 9):
        print_error(f"Python 3.9 ou supérieur est requis. Version actuelle: {version}")
        return False
    else:
        print_success(f"Version de Python compatible: {version}")
        return True

def check_dependencies():
    print_header("Vérification des dépendances")
    required_packages = [
        'flask',
        'psycopg2',
        'constraint',
        'google.generativeai',
        'requests',
        'werkzeug',
        'protobuf'
    ]
    
    all_ok = True
    for package in required_packages:
        try:
            spec = importlib.util.find_spec(package)
            if spec is None:
                print_error(f"Package {package} non trouvé")
                all_ok = False
            else:
                # Essayer d'importer pour vérifier qu'il fonctionne
                module = importlib.import_module(package)
                if hasattr(module, '__version__'):
                    print_success(f"Package {package} trouvé (version {module.__version__})")
                else:
                    print_success(f"Package {package} trouvé")
        except ImportError as e:
            print_error(f"Erreur lors de l'importation de {package}: {e}")
            all_ok = False
        except Exception as e:
            print_error(f"Erreur inattendue avec {package}: {e}")
            all_ok = False
    
    return all_ok

def check_database_connection():
    print_header("Vérification de la connexion à la base de données")
    try:
        import psycopg2
        conn = psycopg2.connect(
            host="localhost",
            database="soutenance_db",
            user="postgres",
            password="nadhem"
        )
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        cursor.close()
        conn.close()
        
        print_success(f"Connexion à la base de données réussie")
        print(f"Version PostgreSQL: {db_version[0]}")
        return True
    except psycopg2.OperationalError as e:
        print_error(f"Erreur de connexion à la base de données: {e}")
        print_warning("Vérifiez que PostgreSQL est en cours d'exécution et que les informations de connexion sont correctes.")
        return False
    except Exception as e:
        print_error(f"Erreur inattendue: {e}")
        traceback.print_exc()
        return False

def check_gemini_api():
    print_header("Vérification de l'API Gemini")
    try:
        import google.generativeai as genai
        
        # Configurer l'API avec la clé
        genai.configure(api_key="AIzaSyDff5a9rk0ESzeS21SmaPA5Pxcnd7ENx1A")
        
        # Tester l'API
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("Test de l'API Gemini depuis le script de diagnostic")
        
        if response and hasattr(response, 'text'):
            print_success("Connexion à l'API Gemini réussie")
            print(f"Réponse de test: {response.text[:100]}...")
            return True
        else:
            print_warning("L'API Gemini a répondu mais dans un format inattendu")
            print(f"Réponse: {response}")
            return False
    except Exception as e:
        print_error(f"Erreur lors de la connexion à l'API Gemini: {e}")
        traceback.print_exc()
        print_warning("Vérifiez votre connexion Internet et la validité de la clé API.")
        return False

def check_constraint_solver():
    print_header("Vérification du solveur de contraintes")
    try:
        from constraint import Problem, AllDifferentConstraint
        
        # Créer un problème simple
        problem = Problem()
        problem.addVariable("x", [1, 2, 3])
        problem.addVariable("y", [1, 2, 3])
        problem.addConstraint(AllDifferentConstraint(), ["x", "y"])
        
        # Résoudre le problème
        solutions = problem.getSolutions()
        
        if solutions:
            print_success("Solveur de contraintes fonctionne correctement")
            print(f"Solutions trouvées: {len(solutions)}")
            return True
        else:
            print_warning("Le solveur de contraintes n'a pas trouvé de solutions")
            return False
    except Exception as e:
        print_error(f"Erreur lors de l'utilisation du solveur de contraintes: {e}")
        traceback.print_exc()
        return False

def check_flask_server():
    print_header("Vérification du serveur Flask")
    try:
        import flask
        print_success(f"Flask est installé (version {flask.__version__})")
        
        # Vérifier si le port 5001 est déjà utilisé
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', 5001))
        if result == 0:
            print_warning("Le port 5001 est déjà utilisé. Le serveur Flask est peut-être déjà en cours d'exécution.")
        else:
            print_success("Le port 5001 est disponible pour le serveur Flask")
        sock.close()
        
        return True
    except Exception as e:
        print_error(f"Erreur lors de la vérification de Flask: {e}")
        traceback.print_exc()
        return False

def run_diagnostics():
    import datetime
    print_header("DIAGNOSTIC ESP AI ENGINE")
    print(f"Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Système: {platform.system()} {platform.release()}")
    print(f"Répertoire: {os.getcwd()}")
    
    results = {
        "python_version": check_python_version(),
        "dependencies": check_dependencies(),
        "database": check_database_connection(),
        "gemini_api": check_gemini_api(),
        "constraint_solver": check_constraint_solver(),
        "flask_server": check_flask_server()
    }
    
    print_header("RÉSUMÉ DU DIAGNOSTIC")
    
    all_ok = True
    for component, status in results.items():
        if status:
            print_success(f"{component}: OK")
        else:
            print_error(f"{component}: ÉCHEC")
            all_ok = False
    
    if all_ok:
        print_header("TOUS LES COMPOSANTS FONCTIONNENT CORRECTEMENT")
        print("Vous pouvez démarrer le service AI Engine sans problème.")
    else:
        print_header("CERTAINS COMPOSANTS ONT ÉCHOUÉ")
        print("Veuillez résoudre les problèmes ci-dessus avant de démarrer le service.")
        print("Consultez le README.md pour des instructions de dépannage.")

if __name__ == "__main__":
    run_diagnostics()