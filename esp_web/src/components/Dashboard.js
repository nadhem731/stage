import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';
import '../style/dashboard.css';
import Etudient from './admin/etudient'; // en haut du fichier
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { user, hasRole, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  
  // Menu par défaut selon le rôle
  const getDefaultMenu = () => {
    const userRole = user?.role || 'Etudiant';
    if (userRole === 'Admin') {
      return 'dashboard';
    } else if (userRole === 'Enseignant') {
      return 'dashboard';
    } else {
      return 'dashboard';
    }
  };
  
  const [activeMenu, setActiveMenu] = useState(getDefaultMenu());

  // Fonction pour vérifier les permissions d'accès
  const hasAccess = (menuId) => {
    const userRole = user?.role || 'Enseignant';

    // Admin a accès à tout
    if (userRole === 'Admin') {
      return true;
    }

    // Fonctionnalités spécifiques aux enseignants
    if (userRole === 'Enseignant') {
      const teacherMenus = ['dashboard', 'disponibilite', 'planning-enseignant', 'settings'];
      return teacherMenus.includes(menuId);
    }

    // Fonctionnalités d'administration (seulement pour Admin)
    const adminMenus = ['Etudiant', 'Enseignant', 'Salles', 'Planning', 'users', 'reports', 'system-admin', 'assignments', 'students', 'grades', 'courses', 'schedule', 'calendar'];
    if (adminMenus.includes(menuId)) {
      return userRole === 'Admin';
    }

    return false;
  };

  // Synchroniser le menu actif avec la navigation
  const handleMenuChange = (menuId) => {
    setActiveMenu(menuId);
    if (user?.role === 'Admin') {
      if (menuId === 'Etudient') navigate('/admin/etudient');
      else if (menuId === 'Enseignant') navigate('/admin/enseignant');
      else if (menuId === 'Salles') navigate('/admin/salle');
      else if (menuId === 'Planning') navigate('/admin/planning');
      else if (menuId === 'dashboard') navigate('/dashboard');
      // Ajouter d'autres routes admin ici si besoin
    }
  };

  // Fonction pour obtenir le contenu selon le menu et les permissions
  const renderContent = () => {
    // Vérifier les permissions d'accès
    if (!hasAccess(activeMenu)) {
      return (
        <div className="dashboard-content">
          <div className="access-denied">
            <div className="access-denied-icon">🚫</div>
            <h1>Accès Refusé</h1>
            <p>Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
            <p className="access-denied-role">
              Rôle actuel : <span className="role-badge">{user?.role}</span>
            </p>
            <button 
              onClick={() => setActiveMenu('dashboard')}
              className="back-to-dashboard-btn"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      );
    }

    switch (activeMenu) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <div className="welcome-section">
              <h1 className="welcome-title">
                Bienvenue, {user?.prenom || user?.email} ! 👋
              </h1>
              <p className="welcome-subtitle">
                Connecté en tant que <span className="role-badge">{user?.role}</span>
              </p>
            </div>
            
            {user?.role === 'Enseignant' ? (
              // Tableau de bord pour les enseignants
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👨‍🎓</div>
                    <div className="stat-content">
                      <h3 className="stat-number">120</h3>
                      <p className="stat-label">Étudiants</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-content">
                      <h3 className="stat-number">8</h3>
                      <p className="stat-label">Cours cette semaine</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">⏰</div>
                    <div className="stat-content">
                      <h3 className="stat-number">24h</h3>
                      <p className="stat-label">Heures de cours</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-content">
                      <h3 className="stat-number">15</h3>
                      <p className="stat-label">Devoirs à corriger</p>
                    </div>
                  </div>
                </div>

                <div className="section-title">Mes Cours</div>
                <div className="courses-grid">
                  <div className="course-card">
                    <div className="course-header">
                      <h3>Programmation Web</h3>
                      <span className="course-code">WEB301</span>
                    </div>
                    <p>Développement d'applications web modernes avec React et Node.js</p>
                    <div className="course-stats">
                      <span>👨‍🎓 30 étudiants</span>
                      <span>📚 24h de cours</span>
                      <span>📝 3 devoirs</span>
                    </div>
                  </div>
                  
                  <div className="course-card">
                    <div className="course-header">
                      <h3>Base de Données</h3>
                      <span className="course-code">BD401</span>
                    </div>
                    <p>Conception et gestion de bases de données relationnelles</p>
                    <div className="course-stats">
                      <span>👨‍🎓 25 étudiants</span>
                      <span>📚 18h de cours</span>
                      <span>📝 2 devoirs</span>
                    </div>
                  </div>
                  
                  <div className="course-card">
                    <div className="course-header">
                      <h3>Algorithmes</h3>
                      <span className="course-code">ALG201</span>
                    </div>
                    <p>Structures de données et algorithmes de tri</p>
                    <div className="course-stats">
                      <span>👨‍🎓 28 étudiants</span>
                      <span>📚 20h de cours</span>
                      <span>📝 4 devoirs</span>
                    </div>
                  </div>
                </div>

                <div className="section-title">Planning de la Semaine</div>
                <div className="schedule-container">
                  <div className="schedule-day">
                    <h3>Lundi 9 Décembre</h3>
                    <div className="schedule-item">
                      <span className="time">09:00 - 12:00</span>
                      <span className="course">Programmation Web</span>
                      <span className="room">Salle A101</span>
                      <span className="students">30 étudiants</span>
                    </div>
                    <div className="schedule-item">
                      <span className="time">14:00 - 17:00</span>
                      <span className="course">Base de Données</span>
                      <span className="room">Salle B203</span>
                      <span className="students">25 étudiants</span>
                    </div>
                  </div>
                  
                  <div className="schedule-day">
                    <h3>Mardi 10 Décembre</h3>
                    <div className="schedule-item">
                      <span className="time">10:00 - 13:00</span>
                      <span className="course">Algorithmes</span>
                      <span className="room">Salle C305</span>
                      <span className="students">28 étudiants</span>
                    </div>
                  </div>
                </div>

                <div className="section-title">Notes & Évaluations</div>
                <div className="grades-container">
                  <div className="grade-card">
                    <h3>Programmation Web</h3>
                    <div className="grade-score">18/20</div>
                    <div className="grade-details">
                      <span>Devoir 1: 17/20</span>
                      <span>Devoir 2: 19/20</span>
                      <span>Projet: 18/20</span>
                    </div>
                  </div>
                  
                  <div className="grade-card">
                    <h3>Base de Données</h3>
                    <div className="grade-score">16/20</div>
                    <div className="grade-details">
                      <span>Devoir 1: 15/20</span>
                      <span>Projet: 17/20</span>
                    </div>
                  </div>
                  
                  <div className="grade-card">
                    <h3>Algorithmes</h3>
                    <div className="grade-score">14/20</div>
                    <div className="grade-details">
                      <span>Devoir 1: 13/20</span>
                      <span>Devoir 2: 15/20</span>
                    </div>
                  </div>
                </div>

                <div className="section-title">Devoirs</div>
                <div className="assignments-container">
                  <div className="assignment-card urgent">
                    <div className="assignment-header">
                      <h3>Projet Final PFE</h3>
                      <span className="assignment-status urgent">Urgent</span>
                    </div>
                    <p>Développement d'une application web complète</p>
                    <div className="assignment-meta">
                      <span>📅 Date limite: 10/12/2024</span>
                      <span>📝 Type: Projet</span>
                    </div>
                  </div>
                  
                  <div className="assignment-card">
                    <div className="assignment-header">
                      <h3>Devoir Algorithmes</h3>
                      <span className="assignment-status">En cours</span>
                    </div>
                    <p>Implémentation des algorithmes de tri</p>
                    <div className="assignment-meta">
                      <span>📅 Date limite: 15/12/2024</span>
                      <span>📝 Type: Devoir</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Tableau de bord pour les admins
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-content">
                      <h3 className="stat-number">12</h3>
                      <p className="stat-label">Cours actifs</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-content">
                      <h3 className="stat-number">5</h3>
                      <p className="stat-label">Devoirs en cours</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                      <h3 className="stat-number">3</h3>
                      <p className="stat-label">Événements cette semaine</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <h3 className="stat-number">85%</h3>
                      <p className="stat-label">Moyenne générale</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      
      
      case 'Etudiant':
        return (
          <Etudient />
        );
      
      // case 'Enseignant':
      //   return (
          
      //   );

      // case 'Salles':
      //   return (
         
      //   );

      // case 'Planning':
      //   return (
         
      //   );
      
     
      
      
      
      // case 'disponibilite':
      //   return (
        
      //   );

      // case 'planning-enseignant':
      //   return (
          
      //   );

     
      
      // case 'settings':
      //   return (
          
      //   );

      // Sections Admin uniquement
     

     

      
      
      default:
        return (
          <div className="dashboard-content">
            <h1>Page non trouvée</h1>
            <p>Cette section n'existe pas encore.</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar activeMenu={activeMenu} setActiveMenu={handleMenuChange} />
      <main className="dashboard-main">
        {renderContent()}
      </main>
    </div>
  );
}

export default Dashboard;