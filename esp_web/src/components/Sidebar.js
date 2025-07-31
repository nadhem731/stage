import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import '../style/sidebar.css';

function Sidebar({ activeMenu, setActiveMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // État initial des catégories étendues selon le rôle
  const getInitialExpandedState = () => {
    const userRole = user?.role || 'Enseignant';
    const initialState = {};
    
    if (userRole === 'Admin') {
      initialState.academic = true;
      initialState.system = true;
    } else if (userRole === 'Enseignant') {
      initialState.personal = true;
      initialState.system = true;
    }
    
    return initialState;
  };

  const [expandedCategories, setExpandedCategories] = useState(getInitialExpandedState());

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Fonction pour obtenir les menus selon le rôle
  const getMenuCategories = () => {
    const baseCategories = [];

    // Menus spécifiques à l'Admin
    const adminCategories = [
      {
        id: 'academic',
        label: 'Espace Admin',
        icon: '🎓',
        roles: ['Admin'], // Seuls les admins peuvent voir cette section
        items: [
          { id: 'dashboard', label: 'Tableau de bord', icon: '📊', notifications: 0 ,onClick: () => navigate('/dashboard')},
          { id: 'Etudient', label: 'Etudient', icon: '👨‍🎓', notifications: 0 ,onClick: () => navigate('/admin/etudient')},
          { id: 'Enseignant', label: 'Enseignant', icon: '🧑‍🏫', notifications: 0 ,onClick: () => navigate('/admin/enseignant')},
          { id: 'Salles', label: 'Salles', icon: '🏫', notifications: 0 ,onClick: () => navigate('/admin/salle')},
          { id: 'Classe', label: 'Classe', icon: '📚', notifications: 0 ,onClick: () => navigate('/admin/classe')},
          { id: 'Affectation', label: 'Affectation', icon: '🔗', notifications: 0 ,onClick: () => navigate('/admin/affectation')},
          { id: 'Planning', label: 'Planning', icon: '📅', notifications: 0,onClick: () => navigate('/admin/planning')},
        ]
      },
      {
        id: 'system',
        label: 'Système',
        icon: '⚙️',
        roles: ['Admin'], // Seuls les admins peuvent voir cette section
        items: [
          { id: 'settings', label: 'Paramètres', icon: '⚙️', notifications: 0 },
        ]
      }
    ];

    // Menus spécifiques à l'Enseignant
    const teacherCategories = [
      {
        id: 'personal',
        label: 'Espace Enseignant',
        icon: '👤',
        roles: ['Enseignant'], // Seuls les enseignants peuvent voir cette section
        items: [
          { id: 'dashboard', label: 'Tableau de bord', icon: '📊', notifications: 0 },
          { id: 'disponibilite', label: 'Mes Disponibilités', icon: '📋', notifications: 0 },
          { id: 'planning-enseignant', label: 'Mon Planning', icon: '📅', notifications: 0 },
        ]
      },
      {
        id: 'system',
        label: 'Système',
        icon: '⚙️',
        roles: ['Enseignant'], // Seuls les enseignants peuvent voir cette section
        items: [
          { id: 'settings', label: 'Paramètres', icon: '⚙️', notifications: 0 },
        ]
      }
    ];

    // Filtrer les catégories selon le rôle de l'utilisateur
    const userRole = user?.role || 'Enseignant';
    
    if (userRole === 'Admin') {
      adminCategories.forEach(category => {
        if (category.roles.includes(userRole)) {
          baseCategories.push(category);
        }
      });
    } else if (userRole === 'Enseignant') {
      teacherCategories.forEach(category => {
        if (category.roles.includes(userRole)) {
          baseCategories.push(category);
        }
      });
    }

    return baseCategories;
  };

  const getUserRoleDisplay = () => {
    if (!user?.role) return 'Utilisateur';
    const roleMap = {
      'Admin': 'Administrateur',
      'Enseignant': 'Enseignant'
    };
    return roleMap[user.role] || user.role;
  };

  const getUserAvatar = () => {
    if (!user?.role) return '👤';
    const avatarMap = {
      'Admin': '👨‍💼',
      'Enseignant': '👨‍🏫'
    };
    return avatarMap[user.role] || '👤';
  };

  const getUserDisplayName = () => {
    if (user?.nom && user?.prenom) {
      return `${user.prenom} ${user.nom}`;
    }
    return user?.identifiant || 'Utilisateur';
  };

  const getTotalNotifications = () => {
    return getMenuCategories().reduce((total, category) => {
      return total + category.items.reduce((catTotal, item) => catTotal + item.notifications, 0);
    }, 0);
  };

  const menuCategories = getMenuCategories();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="header-main">
          <h1 className="sidebar-title">ESPRIT</h1>
        </div>
        {getTotalNotifications() > 0 && (
          <div className="notification-badge">
            {getTotalNotifications()}
          </div>
        )}
      </div>
      
      <div className="sidebar-content">
        <nav className="sidebar-nav">
          {menuCategories.map((category) => (
            <div key={category.id} className="menu-category">
              <button
                className="category-header"
                onClick={() => toggleCategory(category.id)}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-label">{category.label}</span>
                <span className={`category-arrow ${expandedCategories[category.id] ? 'expanded' : ''}`}>
                  ▼
                </span>
              </button>
              
              <div className={`category-items ${expandedCategories[category.id] ? 'expanded' : ''}`}>
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.onClick ? item.onClick() : setActiveMenu(item.id)}
                    className={`sidebar-menu-item ${activeMenu === item.id ? 'active' : ''}`}
                  >
                    <span className="sidebar-menu-icon">{item.icon}</span>
                    <span className="menu-item-label">{item.label}</span>
                    {item.notifications > 0 && (
                      <span className="notification-count">{item.notifications}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
      
      <div className="sidebar-user">
        <div className="user-info">
          <div className="user-avatar">
            {getUserAvatar()}
          </div>
          <div className="user-details">
            <p className="user-name">{getUserDisplayName()}</p>
            <p className="user-role">{getUserRoleDisplay()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-logout-btn"
        >
          <span className="logout-icon">🚪</span>
          Déconnexion
        </button>
      </div>
    </div>
  );
}

export default Sidebar; 