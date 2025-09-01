import React, { useState, useEffect } from 'react';
import '../../style/planning_ens.css';
import '../../style/planning_pagination.css';
import '../../style/dashboard.css';
import Sidebar from '../Sidebar';

const PlanningEnseignant = () => {
    const [activeTab, setActiveTab] = useState('cours');
    const [planningCours, setPlanningCours] = useState([]);
    const [planningSoutenances, setPlanningSoutenances] = useState([]);
    const [planningRattrapages, setPlanningRattrapages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // États pour la popup Teams
    const [showTeamsModal, setShowTeamsModal] = useState(false);
    const [selectedCours, setSelectedCours] = useState(null);
    const [teamsLoading, setTeamsLoading] = useState(false);

    // État pour stocker les informations de l'utilisateur connecté
    const [currentUser, setCurrentUser] = useState(null);

    // États pour la pagination par semaine
    const [currentWeekCours, setCurrentWeekCours] = useState(0);
    const [currentWeekSoutenances, setCurrentWeekSoutenances] = useState(0);
    const [currentWeekRattrapages, setCurrentWeekRattrapages] = useState(0);

    // Fonction pour gérer le clic sur un cours en ligne
    const handleCoursEnLigneClick = (cours) => {
        if (cours.modeCours === 'en_ligne') {
            console.log('Cours sélectionné pour Teams:', cours);
            console.log('ID du cours:', cours.idPlanning || cours.id || 'UNDEFINED');
            setSelectedCours(cours);
            setShowTeamsModal(true);
        }
    };

    // Fonction pour accéder à la réunion Teams
    const accederReunionTeams = async () => {
        if (!selectedCours) return;
        
        console.log('DEBUG: selectedCours complet:', selectedCours);
        console.log('DEBUG: Propriétés disponibles:', Object.keys(selectedCours));
        
        // Essayer différentes propriétés d'ID
        const planningId = selectedCours.idPlanning || selectedCours.id || selectedCours.id_planning;
        console.log('DEBUG: planningId utilisé:', planningId);
        
        if (!planningId) {
            setError('ID du planning non trouvé');
            return;
        }
        
        setTeamsLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                setError('Token d\'authentification manquant');
                return;
            }

            const response = await fetch(`http://localhost:8080/api/teams/meeting-link/${planningId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la génération du lien Teams');
            }

            const data = await response.json();
            if (data.meetingUrl) {
                // Ouvrir le lien Teams dans un nouvel onglet
                window.open(data.meetingUrl, '_blank');
                setShowTeamsModal(false);
            } else {
                throw new Error('Lien de réunion non disponible');
            }
        } catch (error) {
            console.error('Erreur Teams:', error);
            setError('Impossible d\'accéder à la réunion Teams: ' + error.message);
        } finally {
            setTeamsLoading(false);
        }
    };

    // Récupération du token JWT
    const getAuthToken = () => {
        const token = localStorage.getItem('token');
        console.log('Token récupéré:', token ? 'Présent' : 'Absent');
        if (!token) {
            setError('Token d\'authentification manquant. Veuillez vous reconnecter.');
            return null;
        }
        
        // Vérifier si le token est expiré et afficher les rôles
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            console.log('Token exp:', payload.exp, 'Current time:', currentTime);
            console.log('Payload complet:', payload);
            console.log('Rôles utilisateur:', payload.roles || payload.authorities || payload.role);
            
            if (payload.exp < currentTime) {
                console.log('Token expiré');
                localStorage.removeItem('token');
                setError('Session expirée. Veuillez vous reconnecter.');
                return null;
            }
        } catch (e) {
            console.log('Erreur lors de la vérification du token:', e);
            localStorage.removeItem('token');
            setError('Token invalide. Veuillez vous reconnecter.');
            return null;
        }
        
        return token;
    };

    // Récupération des informations de l'utilisateur connecté
    const fetchCurrentUser = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;
            
            const response = await fetch('http://localhost:8080/api/users/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                console.log('Données utilisateur récupérées:', userData);
                setCurrentUser(userData);
            }
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
        }
    };

    // Récupération des plannings de cours pour l'enseignant connecté
    const fetchPlanningCours = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                return;
            }
            
            console.log('Envoi de la requête avec token:', token.substring(0, 20) + '...');
            const response = await fetch('http://localhost:8080/api/plannings/enseignant', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Réponse reçue:', response.status, response.statusText);

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Session expirée. Veuillez vous reconnecter.');
                    localStorage.removeItem('token');
                    return;
                }
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('DEBUG: Données plannings reçues:', data);
            console.log('DEBUG: Type des données:', typeof data);
            console.log('DEBUG: Est-ce un tableau?', Array.isArray(data));
            console.log('DEBUG: Longueur:', data?.length);
            
            // Attendu: uniquement les cours via cet endpoint
            if (data.cours) {
                setPlanningCours(data.cours);
            } else if (Array.isArray(data)) {
                // Filtrer pour exclure les rattrapages de l'onglet cours
                const coursUniquement = data.filter(item => item.source !== 'rattrapage');
                setPlanningCours(coursUniquement);
            } else {
                setPlanningCours([]);
            }
        } catch (error) {
            console.error('Erreur:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Récupération des rattrapages approuvés depuis la table Rattrapage
    const fetchPlanningRattrapages = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                return;
            }

            const response = await fetch('http://localhost:8080/api/rattrapages/planning/enseignant', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Session expirée. Veuillez vous reconnecter.');
                    localStorage.removeItem('token');
                    return;
                }
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('DEBUG: Données rattrapages reçues:', data);

            // Mapper vers le format attendu par l'UI
            const mapped = Array.isArray(data) ? data.map(item => ({
                id: item.id,
                dateDebut: item.date_planning,
                heureDebut: item.heure_debut,
                heureFin: item.heure_fin,
                matiere: item.matiere,
                classe: { nomClasse: item.nom_classe },
                salle: { numSalle: item.salle },
                source: 'rattrapage'
            })) : [];

            setPlanningRattrapages(mapped);
        } catch (error) {
            console.error('Erreur:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Récupération des plannings de soutenances pour l'enseignant connecté
    const fetchPlanningSoutenances = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                return;
            }
            
            const response = await fetch('http://localhost:8080/api/soutenances/enseignant', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Session expirée. Veuillez vous reconnecter.');
                    localStorage.removeItem('token');
                    return;
                }
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('DEBUG: Données soutenances reçues:', data);
            console.log('DEBUG: Type des données:', typeof data);
            console.log('DEBUG: Est-ce un tableau?', Array.isArray(data));
            console.log('DEBUG: Longueur:', data?.length);
            
            // Debug détaillé pour comprendre le problème d'affichage par jour
            if (Array.isArray(data) && data.length > 0) {
                console.log('DEBUG: Structure de la première soutenance:', data[0]);
                console.log('DEBUG: Structure complète première soutenance:', JSON.stringify(data[0], null, 2));
                data.forEach((soutenance, index) => {
                    console.log(`DEBUG Soutenance ${index}:`, {
                        jour: soutenance.jour,
                        date: soutenance.date,
                        heureDebut: soutenance.heureDebut,
                        heureTime: soutenance.heureTime,
                        user: soutenance.user?.nom + ' ' + soutenance.user?.prenom,
                        jury: soutenance.jury,
                        enseignantJury: soutenance.enseignantJury,
                        allKeys: Object.keys(soutenance)
                    });
                });
            }
            setPlanningSoutenances(data);
        } catch (error) {
            console.error('Erreur:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Chargement initial des données
    useEffect(() => {
        fetchCurrentUser();
        fetchPlanningCours();
        fetchPlanningRattrapages();
        fetchPlanningSoutenances();
    }, [fetchCurrentUser, fetchPlanningCours, fetchPlanningRattrapages, fetchPlanningSoutenances]);

    // Fonction pour formater la date
    const formatDate = (dateString) => {
        if (!dateString) return 'Non défini';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Fonction pour formater l'heure
    const formatTime = (timeString) => {
        if (!timeString) return 'Non défini';
        return timeString.substring(0, 5); // Format HH:MM
    };

    // Créneaux horaires pour l'emploi du temps
    const timeSlots = [
        { start: '09:00', end: '12:15', label: '09:00 - 12:15' },
        { start: '13:30', end: '16:45', label: '13:30 - 16:45' }
    ];

    // Jours de la semaine
    const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    // Fonctions utilitaires pour la pagination par semaine
    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi comme premier jour
        return new Date(d.setDate(diff));
    };

    const getWeekEnd = (weekStart) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return weekEnd;
    };

    const formatWeekRange = (weekStart) => {
        const weekEnd = getWeekEnd(weekStart);
        return `${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    };

    const getUniqueWeeks = (data, dateField = 'dateDebut') => {
        const weeks = new Set();
        data.forEach(item => {
            if (item[dateField]) {
                const weekStart = getWeekStart(item[dateField]);
                weeks.add(weekStart.toISOString().split('T')[0]);
            }
        });
        return Array.from(weeks).sort().map(weekStr => new Date(weekStr));
    };

    const filterByWeek = (data, weekIndex, dateField = 'dateDebut') => {
        const weeks = getUniqueWeeks(data, dateField);
        if (weekIndex >= weeks.length) return [];
        
        const targetWeek = weeks[weekIndex];
        const weekEnd = getWeekEnd(targetWeek);
        
        return data.filter(item => {
            if (!item[dateField]) return false;
            const itemDate = new Date(item[dateField]);
            return itemDate >= targetWeek && itemDate <= weekEnd;
        });
    };

    // Fonction pour créer la grille emploi du temps
    const createScheduleGrid = () => {
        const grid = {};
        
        // Initialiser la grille vide
        weekDays.forEach(day => {
            grid[day] = {};
            timeSlots.forEach(slot => {
                grid[day][slot.label] = [];
            });
        });

        // Ajouter les cours
        planningCours.forEach(cours => {
            const dayName = getDayNameFromDate(cours.dateDebut);
            const timeSlot = getTimeSlotForTime(cours.heureDebut);
            
            if (grid[dayName] && grid[dayName][timeSlot]) {
                grid[dayName][timeSlot].push({
                    ...cours,
                    type: 'cours',
                    color: '#059669'
                });
            }
        });

        // Les rattrapages ne sont plus affichés dans l'onglet cours
        // Ils restent uniquement dans leur onglet dédié

        // Les soutenances ne sont plus affichées dans l'onglet cours
        // Elles restent uniquement dans leur onglet dédié

        return grid;
    };

    // Fonction pour obtenir le nom du jour à partir d'une date
    const getDayNameFromDate = (dateString) => {
        const date = new Date(dateString);
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        return dayNames[date.getDay()];
    };

    // Fonction pour déterminer le créneau horaire
    const getTimeSlotForTime = (timeString) => {
        if (!timeString) return null;
        const time = timeString.substring(0, 5);
        
        if (time >= '09:00' && time <= '12:15') {
            return '09:00 - 12:15';
        } else if (time >= '13:30' && time <= '16:45') {
            return '13:30 - 16:45';
        }
        return null;
    };

    // Groupement des cours par jour avec pagination par semaine
    const groupCoursByDay = () => {
        const coursFiltered = filterByWeek(planningCours, currentWeekCours, 'dateDebut');
        const grouped = {};
        coursFiltered.forEach(cours => {
            const dateKey = cours.dateDebut;
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(cours);
        });
        
        // Trier les cours par heure pour chaque jour
        Object.keys(grouped).forEach(day => {
            grouped[day].sort((a, b) => {
                return a.heureDebut.localeCompare(b.heureDebut);
            });
        });
        
        return grouped;
    };

    // Groupement des soutenances par jour avec pagination par semaine
    const groupSoutenancesByDay = () => {
        const soutenancesFiltered = filterByWeek(planningSoutenances, currentWeekSoutenances, 'date');
        const grouped = {};
        soutenancesFiltered.forEach(soutenance => {
            // Utiliser UNIQUEMENT le champ 'jour' pour les soutenances générées par l'AI
            const dateKey = soutenance.jour || 'Non défini';
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(soutenance);
        });
        
        // Trier les soutenances par heure pour chaque jour
        Object.keys(grouped).forEach(day => {
            grouped[day].sort((a, b) => {
                const timeA = a.heureDebut || a.heureTime || '00:00';
                const timeB = b.heureDebut || b.heureTime || '00:00';
                return timeA.localeCompare(timeB);
            });
        });
        
        return grouped;
    };

    // Composant de pagination par semaine réutilisable
    const WeekPagination = ({ data, currentWeek, setCurrentWeek, dateField, title, sectionType }) => {
        const weeks = getUniqueWeeks(data, dateField);
        
        if (weeks.length <= 1) return null;
        
        return (
            <div className={`week-pagination ${sectionType || ''}`}>
                <button 
                    className="week-pagination-btn"
                    onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
                    disabled={currentWeek === 0}
                >
                    ← Semaine précédente
                </button>
                
                <div className="week-pagination-info">
                    <div className="week-pagination-title">
                        {title}
                    </div>
                    <div className="week-pagination-date">
                        📅 Semaine du {formatWeekRange(weeks[currentWeek])}
                    </div>
                    <div className="week-pagination-counter">
                        {currentWeek + 1} / {weeks.length}
                    </div>
                </div>
                
                <button 
                    className="week-pagination-btn"
                    onClick={() => setCurrentWeek(Math.min(weeks.length - 1, currentWeek + 1))}
                    disabled={currentWeek === weeks.length - 1}
                >
                    Semaine suivante →
                </button>
            </div>
        );
    };

    const groupedCours = groupCoursByDay();
    const groupedSoutenances = groupSoutenancesByDay();

    return (
        <>
        <div className="dashboard-container" style={{ display: 'flex' }}>
            <Sidebar />
            <div className="dashboard-main">
                <div className="dashboard-content">
                    <div className="welcome-section">
                        <h1 className="welcome-title">📅 Mon Planning</h1>
                    </div>

                    {/* Statistiques */}
                    <div className="stats-grid">
                        <div className="stat-card cours" onClick={() => setActiveTab('cours')}>
                            <div className="stat-icon">📚</div>
                            <div className="stat-content">
                                <div className="stat-number">{planningCours.length}</div>
                                <div className="stat-label">Mes Cours</div>
                            </div>
                        </div>
                        <div className="stat-card rattrapages" onClick={() => setActiveTab('rattrapages')}>
                            <div className="stat-icon">🔄</div>
                            <div className="stat-content">
                                <div className="stat-number">{planningRattrapages.length}</div>
                                <div className="stat-label">Mes Rattrapages</div>
                            </div>
                        </div>
                        <div className="stat-card soutenances" onClick={() => setActiveTab('soutenances')}>
                            <div className="stat-icon">🎓</div>
                            <div className="stat-content">
                                <div className="stat-number">{planningSoutenances.length}</div>
                                <div className="stat-label">Mes Soutenances</div>
                            </div>
                        </div>
                    </div>

                    {/* Section titre avec bouton de rafraîchissement */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 className="section-title">
                            {activeTab === 'cours' ? '📚 Mes Cours' : 
                             activeTab === 'rattrapages' ? '🔄 Mes Rattrapages' : 
                             '🎓 Mes Soutenances'}
                        </h2>
                        <button 
                            className="back-to-dashboard-btn"
                            onClick={() => {
                                if (activeTab === 'cours') {
                                    fetchPlanningCours();
                                } else if (activeTab === 'rattrapages') {
                                    fetchPlanningRattrapages();
                                } else {
                                    fetchPlanningSoutenances();
                                }
                            }}
                            disabled={loading}
                        >
                            {loading ? '🔄 Chargement...' : '🔄 Actualiser'}
                        </button>
                    </div>

                    {/* Affichage des erreurs */}
                    {error && (
                        <div className="access-denied" style={{ padding: '1rem', marginBottom: '1rem' }}>
                            <div className="access-denied-icon">⚠️</div>
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Contenu des onglets */}
                    <div>
                        {activeTab === 'rattrapages' && (
                        <div className="planning-container">
                                {/* Guide pour les rattrapages */}
                                <div style={{
                                    background: 'linear-gradient(135deg,rgb(241, 128, 128),rgb(228, 51, 32))',
                                    borderRadius: '0.75rem',
                                    padding: '1.25rem',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                                    marginBottom: '1.5rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>🔄</span>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                                            Guide - Séances de Rattrapage Approuvées
                                        </h3>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', lineHeight: '1.5', opacity: '0.95' }}>
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <strong>📋 Origine :</strong>
                                            <br />• Demandes de rattrapage approuvées par l'administration
                                            <br />• Intégrées automatiquement dans votre emploi du temps
                                        </div>
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <strong>🎨 Code couleur :</strong>
                                            <br />• 🟠 Orange : Séances de rattrapage
                                            <br />• Type affiché : Cours ou Soutenance selon le contexte
                                        </div>
                                        <div>
                                            <strong>💡 Information :</strong>
                                            <br />• Ces séances sont programmées selon vos disponibilités
                                            <br />• Salles assignées automatiquement
                                        </div>
                                    </div>
                                </div>
                                
                                {planningRattrapages.length === 0 ? (
                                    <div className="access-denied">
                                        <div className="access-denied-icon">🔄</div>
                                        <h1>Aucun rattrapage programmé</h1>
                                        <p>Vous n'avez aucune séance de rattrapage approuvée pour le moment.</p>
                                    </div>
                                ) : (
                                    <div className="course-section" style={{ 
                                        marginBottom: '2rem', 
                                        background: 'var(--white-main)', 
                                        borderRadius: '0.75rem', 
                                        padding: '1.5rem', 
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}>
                                        <div className="course-header" style={{ 
                                            marginBottom: '1.5rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderBottom: '2px solid #dc2626',
                                            paddingBottom: '1rem'
                                        }}>
                                            <h3 style={{ color: '#dc2626', fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>
                                                🔄 Mon Emploi du Temps - Rattrapages
                                            </h3>
                                            <span className="course-code" style={{ 
                                                background: '#dc2626', 
                                                color: 'white', 
                                                padding: '0.5rem 1rem', 
                                                borderRadius: '0.5rem', 
                                                fontSize: '0.9rem', 
                                                fontWeight: '600' 
                                            }}>
                                                {planningRattrapages.length} rattrapages programmés
                                            </span>
                                        </div>

                                        {/* Emploi du temps sous forme de tableau */}
                                        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                                            <table style={{ 
                                                width: '100%', 
                                                borderCollapse: 'collapse',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                borderRadius: '0.75rem',
                                                overflow: 'hidden'
                                            }}>
                                                <thead>
                                                    <tr style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                                                        <th style={{ 
                                                            padding: '1rem', 
                                                            color: 'white', 
                                                            fontWeight: '700',
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            width: '120px',
                                                            textAlign: 'center'
                                                        }}>
                                                            ⏰ Horaires
                                                        </th>
                                                        {weekDays.map(day => (
                                                            <th key={day} style={{ 
                                                                padding: '0.75rem', 
                                                                color: 'white', 
                                                                fontWeight: '600',
                                                                border: '1px solid rgba(255,255,255,0.2)',
                                                                textAlign: 'center',
                                                                minWidth: '140px'
                                                            }}>
                                                                📅 {day}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {timeSlots.map((slot, slotIndex) => (
                                                        <tr key={slot.label} style={{ 
                                                            background: slotIndex % 2 === 0 ? '#f8f9fa' : 'white',
                                                            height: '120px'
                                                        }}>
                                                            <td style={{ 
                                                                padding: '0.75rem', 
                                                                fontWeight: '700',
                                                                color: '#dc2626',
                                                                border: '1px solid #e5e7eb',
                                                                textAlign: 'center',
                                                                verticalAlign: 'middle',
                                                                background: '#fef2f2'
                                                            }}>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                                                    {slot.start}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0' }}>
                                                                    -
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                                                    {slot.end}
                                                                </div>
                                                            </td>
                                                            {weekDays.map(day => {
                                                                // Trouver les rattrapages pour ce jour et ce créneau (filtrés par semaine)
                                                                const rattrapagesFiltered = filterByWeek(planningRattrapages, currentWeekRattrapages, 'dateDebut');
                                                                const rattrapagesForSlot = rattrapagesFiltered.filter(rattrapage => {
                                                                    const rattrapageDay = getDayNameFromDate(rattrapage.dateDebut);
                                                                    const rattrapageSlot = getTimeSlotForTime(rattrapage.heureDebut);
                                                                    return rattrapageDay === day && rattrapageSlot === slot.label;
                                                                });

                                                                return (
                                                                    <td key={day} style={{ 
                                                                        padding: '0.5rem', 
                                                                        border: '1px solid #e5e7eb',
                                                                        verticalAlign: 'top',
                                                                        position: 'relative'
                                                                    }}>
                                                                        {rattrapagesForSlot.length > 0 ? (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
                                                                                {rattrapagesForSlot.map((rattrapage, index) => (
                                                                                    <div key={index} style={{
                                                                                        background: rattrapage.typePlanning === 'soutenance' ? 
                                                                                            'linear-gradient(135deg, #ef4444, #dc2626)' : 
                                                                                            'linear-gradient(135deg, #dc2626, #b91c1c)',
                                                                                        color: 'white',
                                                                                        padding: '0.75rem',
                                                                                        borderRadius: '0.5rem',
                                                                                        fontSize: '0.8rem',
                                                                                        fontWeight: '600',
                                                                                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'transform 0.2s ease',
                                                                                        border: '2px solid rgba(255,255,255,0.3)'
                                                                                    }}>
                                                                                        <div style={{ 
                                                                                            display: 'flex', 
                                                                                            alignItems: 'center', 
                                                                                            justifyContent: 'space-between',
                                                                                            marginBottom: '0.25rem'
                                                                                        }}>
                                                                                            <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                                                                                                🎯 {rattrapage.classe?.nomClasse || 'Classe'}
                                                                                            </span>
                                                                                            <span style={{
                                                                                                background: 'rgba(255,255,255,0.25)',
                                                                                                padding: '0.15rem 0.4rem',
                                                                                                borderRadius: '0.25rem',
                                                                                                fontSize: '0.65rem',
                                                                                                fontWeight: '600'
                                                                                            }}>
                                                                                                {rattrapage.typePlanning === 'soutenance' ? '🎓' : '📚'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div style={{ fontSize: '0.7rem', opacity: '0.9', marginBottom: '0.25rem' }}>
                                                                                            ⏰ {formatTime(rattrapage.heureDebut)} - {formatTime(rattrapage.heureFin)}
                                                                                        </div>
                                                                                        <div style={{ fontSize: '0.7rem', opacity: '0.9' }}>
                                                                                            🏦 {rattrapage.salle?.numSalle || 'Salle'}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ 
                                                                                height: '100%', 
                                                                                display: 'flex', 
                                                                                alignItems: 'center', 
                                                                                justifyContent: 'center',
                                                                                color: '#9ca3af',
                                                                                fontSize: '0.7rem',
                                                                                fontStyle: 'italic'
                                                                            }}>
                                                                                Libre
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {/* Pagination par semaine pour les rattrapages */}
                                        <WeekPagination 
                                            data={planningRattrapages}
                                            currentWeek={currentWeekRattrapages}
                                            setCurrentWeek={setCurrentWeekRattrapages}
                                            dateField="dateDebut"
                                            title="Navigation Rattrapages"
                                            sectionType="rattrapages"
                                        />
                                    </div>
                                )}
                        </div>
                    )}

                    {activeTab === 'cours' && (
                        <div className="planning-container">
                        {/* Guide pour les cours */}
                        <div style={{
                            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                            borderRadius: '0.75rem',
                            padding: '1.25rem',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>📚</span>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                                    Guide - Emploi du Temps des Cours
                                </h3>
                            </div>
                            <div style={{ fontSize: '0.85rem', lineHeight: '1.5', opacity: '0.95' }}>
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <strong>📅 Créneaux horaires :</strong>
                                    <br />• Matin : 09:00 - 12:15 (3h15)
                                    <br />• Après-midi : 13:30 - 16:45 (3h15)
                                </div>
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <strong>🎨 Code couleur :</strong>
                                    <br />• 🔴 Rouge foncé : Cours en présentiel
                                    <br />• 🔴 Rouge clair : Cours en ligne
                                </div>
                                <div>
                                    <strong>💡 Utilisation :</strong>
                                    <br />• Cases vides = créneaux libres
                                    <br />• Cliquez sur un cours pour plus de détails
                                </div>
                            </div>
                        </div>
                        {Object.keys(groupedCours).length === 0 ? (
                            <div className="access-denied">
                                <div className="access-denied-icon">📚</div>
                                <h1>Aucun cours programmé</h1>
                                <p>Vous n'avez aucun cours programmé pour le moment.</p>
                            </div>
                        ) : (
                            <div className="course-section" style={{ 
                                marginBottom: '2rem', 
                                background: 'var(--white-main)', 
                                borderRadius: '0.75rem', 
                                padding: '1.5rem', 
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                                <div className="course-header" style={{ 
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '2px solid #dc2626',
                                    paddingBottom: '1rem'
                                }}>
                                    <h3 style={{ color: '#dc2626', fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>
                                        📚 Mon Emploi du Temps
                                    </h3>
                                    <span className="course-code" style={{ 
                                        background: '#dc2626', 
                                        color: 'white', 
                                        padding: '0.5rem 1rem', 
                                        borderRadius: '0.5rem', 
                                        fontSize: '0.9rem', 
                                        fontWeight: '600' 
                                    }}>
                                        {planningCours.length} cours programmés
                                    </span>
                                </div>
                                        
                                        {/* Grille emploi du temps */}
                                        <div style={{ 
                                            overflowX: 'auto',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}>
                                            <table style={{ 
                                                width: '100%', 
                                                borderCollapse: 'collapse',
                                                fontSize: '0.85rem',
                                                minWidth: '1000px'
                                            }}>
                                                <thead>
                                                    <tr style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                                                        <th style={{ 
                                                            padding: '0.75rem', 
                                                            color: 'white', 
                                                            fontWeight: '600',
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            width: '120px',
                                                            textAlign: 'center'
                                                        }}>
                                                            ⏰ Horaires
                                                        </th>
                                                        {weekDays.map(day => (
                                                            <th key={day} style={{ 
                                                                padding: '0.75rem', 
                                                                color: 'white', 
                                                                fontWeight: '600',
                                                                border: '1px solid rgba(255,255,255,0.2)',
                                                                textAlign: 'center',
                                                                minWidth: '140px'
                                                            }}>
                                                                📅 {day}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {timeSlots.map((slot, slotIndex) => (
                                                        <tr key={slot.label} style={{ 
                                                            background: slotIndex % 2 === 0 ? '#f8f9fa' : 'white',
                                                            height: '120px'
                                                        }}>
                                                            <td style={{ 
                                                                padding: '0.75rem', 
                                                                fontWeight: '700',
                                                                color: '#dc2626',
                                                                border: '1px solid #e5e7eb',
                                                                textAlign: 'center',
                                                                verticalAlign: 'middle',
                                                                background: '#fef2f2'
                                                            }}>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                                                    {slot.start}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0' }}>
                                                                    -
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                                                    {slot.end}
                                                                </div>
                                                            </td>
                                                            {weekDays.map(day => {
                                                                // Trouver UNIQUEMENT les cours pour ce jour et ce créneau
                                                                const itemsForSlot = planningCours.filter(item => {
                                                                    const itemDay = getDayNameFromDate(item.dateDebut);
                                                                    const itemSlot = getTimeSlotForTime(item.heureDebut);
                                                                    return itemDay === day && itemSlot === slot.label;
                                                                });

                                                                return (
                                                                    <td key={`${day}-${slot.label}`} style={{ 
                                                                        padding: '0.5rem', 
                                                                        border: '1px solid #e5e7eb',
                                                                        verticalAlign: 'top',
                                                                        position: 'relative'
                                                                    }}>
                                                                        {itemsForSlot.length > 0 ? (
                                                                            <div style={{ 
                                                                                display: 'flex', 
                                                                                flexDirection: 'column', 
                                                                                gap: '0.25rem',
                                                                                height: '100%'
                                                                            }}>
                                                                                {itemsForSlot.map((item, index) => {
                                                                                    const isEnLigne = item.modeCours === 'en_ligne';
                                                                                    const background = isEnLigne
                                                                                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                                                                        : 'linear-gradient(135deg, #dc2626, #b91c1c)';

                                                                                    return (
                                                                                    <div 
                                                                                        key={index} 
                                                                                        onClick={() => handleCoursEnLigneClick(item)}
                                                                                        style={{
                                                                                        background,
                                                                                        color: 'white',
                                                                                        padding: '0.5rem',
                                                                                        borderRadius: '0.375rem',
                                                                                        fontSize: '0.75rem',
                                                                                        lineHeight: '1.2',
                                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                                                        position: 'relative',
                                                                                        cursor: isEnLigne ? 'pointer' : 'default',
                                                                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                                                                    }}
                                                                                    onMouseEnter={(e) => {
                                                                                        if (isEnLigne) {
                                                                                            e.target.style.transform = 'scale(1.02)';
                                                                                            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                                                                        }
                                                                                    }}
                                                                                    onMouseLeave={(e) => {
                                                                                        if (isEnLigne) {
                                                                                            e.target.style.transform = 'scale(1)';
                                                                                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                                                                        }
                                                                                    }}
                                                                                    >
                                                                                        {/* Badge du mode de cours ou type */}
                                                                                        <div style={{
                                                                                            position: 'absolute',
                                                                                            top: '0.25rem',
                                                                                            right: '0.25rem',
                                                                                            background: 'rgba(255,255,255,0.25)',
                                                                                            padding: '0.125rem 0.375rem',
                                                                                            borderRadius: '0.75rem',
                                                                                            fontSize: '0.6rem',
                                                                                            fontWeight: '600',
                                                                                            textTransform: 'uppercase',
                                                                                            letterSpacing: '0.025em'
                                                                                        }}>
                                                                                            {isEnLigne ? '📡 EN LIGNE' : '🏫 PRÉSENTIEL'}
                                                                                        </div>
                                                                                        
                                                                                        <div style={{ 
                                                                                            fontWeight: '700', 
                                                                                            marginBottom: '0.25rem',
                                                                                            fontSize: '0.8rem',
                                                                                            paddingRight: '4rem' // Espace pour le badge
                                                                                        }}>
                                                                                            🎯 {item.classe?.nomClasse || 'Classe'}
                                                                                        </div>
                                                                                        <div style={{ 
                                                                                            fontSize: '0.7rem', 
                                                                                            opacity: '0.9',
                                                                                            marginBottom: '0.25rem'
                                                                                        }}>
                                                                                            ⏰ {formatTime(item.heureDebut)} - {formatTime(item.heureFin)}
                                                                                        </div>
                                                                                        <div style={{ 
                                                                                            fontSize: '0.7rem', 
                                                                                            opacity: '0.9',
                                                                                            marginBottom: '0.25rem'
                                                                                        }}>
                                                                                            🏦 {item.salle?.numSalle || 'Salle'}
                                                                                        </div>
                                                                                        {item.typePlanning && (
                                                                                            <div style={{ 
                                                                                                fontSize: '0.65rem', 
                                                                                                opacity: '0.8',
                                                                                                background: 'rgba(255,255,255,0.2)',
                                                                                                padding: '0.125rem 0.25rem',
                                                                                                borderRadius: '0.25rem',
                                                                                                textAlign: 'center'
                                                                                            }}>
                                                                                                📝 {item.typePlanning}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ 
                                                                                height: '100%', 
                                                                                display: 'flex', 
                                                                                alignItems: 'center', 
                                                                                justifyContent: 'center',
                                                                                color: '#9ca3af',
                                                                                fontSize: '0.7rem',
                                                                                fontStyle: 'italic'
                                                                            }}>
                                                                                Libre
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {/* Pagination par semaine pour les cours */}
                                        <WeekPagination 
                                            data={planningCours}
                                            currentWeek={currentWeekCours}
                                            setCurrentWeek={setCurrentWeekCours}
                                            dateField="dateDebut"
                                            title="Navigation Cours"
                                            sectionType="cours"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                    {activeTab === 'soutenances' && (
                        <div className="planning-container">
                                
                                {/* Guide pour les soutenances */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                    borderRadius: '0.75rem',
                                    padding: '1.25rem',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
                                    marginBottom: '1.5rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>🎓</span>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                                            Guide - Planning des Soutenances
                                        </h3>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', lineHeight: '1.5', opacity: '0.95' }}>
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <strong>👨‍🏫 Vos rôles :</strong>
                                            <br />• Président de jury
                                            <br />• Examinateur
                                        </div>
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <strong>⏱️ Durée :</strong>
                                            <br />• 30 min par soutenance
                                            <br />• Présentation + questions
                                        </div>
                                        <div>
                                            <strong>📋 Préparation :</strong>
                                            <br />• Consulter la grille d'évaluation
                                            <br />• Préparer les questions techniques
                                        </div>
                                    </div>
                                </div>
                                {Object.keys(groupedSoutenances).length === 0 ? (
                                    <div className="access-denied">
                                        <div className="access-denied-icon">🎓</div>
                                        <h1>Aucune soutenance programmée</h1>
                                        <p>Vous n'êtes membre d'aucun jury de soutenance pour le moment.</p>
                                    </div>
                                ) : (
                                    <div className="course-section" style={{ 
                                        marginBottom: '2rem', 
                                        background: 'var(--white-main)', 
                                        borderRadius: '0.75rem', 
                                        padding: '1.5rem', 
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}>
                                        <div className="course-header" style={{ 
                                            marginBottom: '1.5rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderBottom: '2px solid #dc2626',
                                            paddingBottom: '1rem'
                                        }}>
                                            <h3 style={{ color: '#dc2626', fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>
                                                🎓 Planning des Soutenances
                                            </h3>
                                            <span className="course-code" style={{ 
                                                background: '#dc2626', 
                                                color: 'white', 
                                                padding: '0.5rem 1rem', 
                                                borderRadius: '0.5rem', 
                                                fontSize: '0.9rem', 
                                                fontWeight: '600' 
                                            }}>
                                                {planningSoutenances.length} soutenances programmées
                                            </span>
                                        </div>
                                        
                                        {/* Grille emploi du temps des soutenances */}
                                        <div style={{ 
                                            overflowX: 'auto',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}>
                                            <table style={{ 
                                                width: '100%', 
                                                borderCollapse: 'collapse',
                                                fontSize: '0.85rem',
                                                minWidth: '1000px'
                                            }}>
                                                <thead>
                                                    <tr style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                                                        <th style={{ 
                                                            padding: '0.75rem', 
                                                            color: 'white', 
                                                            fontWeight: '600',
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            width: '120px',
                                                            textAlign: 'center'
                                                        }}>
                                                            ⏰ Horaires
                                                        </th>
                                                        {weekDays.map(day => (
                                                            <th key={day} style={{ 
                                                                padding: '0.75rem', 
                                                                color: 'white', 
                                                                fontWeight: '600',
                                                                border: '1px solid rgba(255,255,255,0.2)',
                                                                textAlign: 'center',
                                                                minWidth: '140px'
                                                            }}>
                                                                📅 {day}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {timeSlots.map((slot, slotIndex) => (
                                                        <tr key={slot.label} style={{ 
                                                            background: slotIndex % 2 === 0 ? '#fef2f2' : 'white',
                                                            height: '120px'
                                                        }}>
                                                            <td style={{ 
                                                                padding: '0.75rem', 
                                                                fontWeight: '700',
                                                                color: '#dc2626',
                                                                border: '1px solid #e5e7eb',
                                                                textAlign: 'center',
                                                                verticalAlign: 'middle',
                                                                background: '#fef2f2'
                                                            }}>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                                                    {slot.start}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0' }}>
                                                                    -
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                                                    {slot.end}
                                                                </div>
                                                            </td>
                                                            {weekDays.map(day => {
                                                                // Trouver les soutenances pour ce jour et ce créneau
                                                                const soutenancesForSlot = planningSoutenances.filter(soutenance => {
                                                                    const soutenanceDay = soutenance.jour || getDayNameFromDate(soutenance.date);
                                                                    const soutenanceSlot = getTimeSlotForTime(soutenance.heureDebut || soutenance.heureTime);
                                                                    return soutenanceDay === day && soutenanceSlot === slot.label;
                                                                });

                                                                return (
                                                                    <td key={`${day}-${slot.label}`} style={{ 
                                                                        padding: '0.5rem', 
                                                                        border: '1px solid #e5e7eb',
                                                                        verticalAlign: 'top',
                                                                        position: 'relative'
                                                                    }}>
                                                                        {soutenancesForSlot.length > 0 ? (
                                                                            <div style={{ 
                                                                                display: 'flex', 
                                                                                flexDirection: 'column', 
                                                                                gap: '0.25rem',
                                                                                height: '100%'
                                                                            }}>
                                                                                {soutenancesForSlot.map((soutenance, index) => (
                                                                                    <div key={index} style={{
                                                                                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                                                                        color: 'white',
                                                                                        padding: '0.5rem',
                                                                                        borderRadius: '0.375rem',
                                                                                        fontSize: '0.75rem',
                                                                                        lineHeight: '1.2',
                                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                                        border: '1px solid rgba(255,255,255,0.2)'
                                                                                    }}>
                                                                                        <div style={{ 
                                                                                            fontWeight: '700', 
                                                                                            marginBottom: '0.25rem',
                                                                                            fontSize: '0.8rem'
                                                                                        }}>
                                                                                            👨‍🎓 {soutenance.user?.nom} {soutenance.user?.prenom}
                                                                                        </div>
                                                                                        <div style={{ 
                                                                                            fontSize: '0.7rem', 
                                                                                            opacity: '0.9',
                                                                                            marginBottom: '0.25rem'
                                                                                        }}>
                                                                                            ⏰ {formatTime(soutenance.heureTime)} ({soutenance.duree})
                                                                                        </div>
                                                                                        <div style={{ 
                                                                                            fontSize: '0.7rem', 
                                                                                            opacity: '0.9',
                                                                                            marginBottom: '0.25rem'
                                                                                        }}>
                                                                                            🏦 {soutenance.salle?.numSalle || 'Salle non définie'}
                                                                                        </div>
                                                                                        <div style={{ 
                                                                                            fontSize: '0.65rem', 
                                                                                            opacity: '0.8',
                                                                                            background: 'rgba(255,255,255,0.2)',
                                                                                            padding: '0.125rem 0.25rem',
                                                                                            borderRadius: '0.25rem',
                                                                                            textAlign: 'center'
                                                                                        }}>
                                                                                            {(() => {
                                                                                                // Utiliser les informations de l'utilisateur connecté récupérées via API
                                                                                                if (currentUser && currentUser.nom && currentUser.prenom) {
                                                                                                    return `👑 Membre Jury: ${currentUser.nom} ${currentUser.prenom}`;
                                                                                                }
                                                                                                
                                                                                                // Fallback: récupérer depuis le token
                                                                                                try {
                                                                                                    const token = localStorage.getItem('token');
                                                                                                    if (token) {
                                                                                                        const payload = JSON.parse(atob(token.split('.')[1]));
                                                                                                        const identifiant = payload.sub || payload.username || payload.identifiant;
                                                                                                        
                                                                                                        if (identifiant) {
                                                                                                            return `👑 Membre Jury: ${identifiant}`;
                                                                                                        }
                                                                                                    }
                                                                                                } catch (e) {
                                                                                                    console.log('Erreur récupération identifiant:', e);
                                                                                                }
                                                                                                
                                                                                                // Dernier fallback: afficher l'étudiant de la soutenance
                                                                                                return `👨‍🎓 Étudiant: ${soutenance.user?.nom} ${soutenance.user?.prenom}`;
                                                                                            })()}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ 
                                                                                height: '100%', 
                                                                                display: 'flex', 
                                                                                alignItems: 'center', 
                                                                                justifyContent: 'center',
                                                                                color: '#9ca3af',
                                                                                fontSize: '0.7rem',
                                                                                fontStyle: 'italic'
                                                                            }}>
                                                                                Libre
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {/* Pagination par semaine pour les soutenances */}
                                        <WeekPagination 
                                            data={planningSoutenances}
                                            currentWeek={currentWeekSoutenances}
                                            setCurrentWeek={setCurrentWeekSoutenances}
                                            dateField="date"
                                            title="Navigation Soutenances"
                                            sectionType="soutenances"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Teams pour cours en ligne */}
            {showTeamsModal && selectedCours && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        padding: '2rem',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        position: 'relative'
                    }}>
                        {/* Bouton fermer */}
                        <button
                            onClick={() => setShowTeamsModal(false)}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'none',
                                border: 'none',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                color: '#6b7280',
                                padding: '0.25rem'
                            }}
                        >
                            ✕
                        </button>

                        {/* En-tête */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{
                                fontSize: '3rem',
                                marginBottom: '0.5rem'
                            }}>
                                📡
                            </div>
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#1f2937',
                                margin: 0,
                                marginBottom: '0.5rem'
                            }}>
                                Cours en Ligne
                            </h2>
                            <p style={{
                                color: '#6b7280',
                                margin: 0,
                                fontSize: '0.9rem'
                            }}>
                                Accéder à la réunion Microsoft Teams
                            </p>
                        </div>

                        {/* Détails du cours */}
                        <div style={{
                            backgroundColor: '#f3f4f6',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{
                                display: 'grid',
                                gap: '0.5rem',
                                fontSize: '0.9rem'
                            }}>
                                <div>
                                    <strong>🎯 Classe:</strong> {selectedCours.classe?.nomClasse || 'Non défini'}
                                </div>
                                <div>
                                    <strong>⏰ Horaire:</strong> {formatTime(selectedCours.heureDebut)} - {formatTime(selectedCours.heureFin)}
                                </div>
                                <div>
                                    <strong>🏦 Salle:</strong> {selectedCours.salle?.numSalle || 'Non défini'}
                                </div>
                                <div>
                                    <strong>📅 Date:</strong> {formatDate(selectedCours.dateDebut)}
                                </div>
                            </div>
                        </div>

                        {/* Message de confirmation */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <p style={{
                                fontSize: '1rem',
                                color: '#374151',
                                margin: 0,
                                lineHeight: '1.5'
                            }}>
                                Voulez-vous accéder à la réunion Teams pour ce cours ?
                            </p>
                        </div>

                        {/* Boutons d'action */}
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={() => setShowTeamsModal(false)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    backgroundColor: 'white',
                                    color: '#374151',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#f9fafb';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'white';
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={accederReunionTeams}
                                disabled={teamsLoading}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    backgroundColor: teamsLoading ? '#9ca3af' : '#dc2626',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: teamsLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onMouseEnter={(e) => {
                                    if (!teamsLoading) {
                                        e.target.style.backgroundColor = '#b91c1c';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!teamsLoading) {
                                        e.target.style.backgroundColor = '#dc2626';
                                    }
                                }}
                            >
                                {teamsLoading ? (
                                    <>
                                        <div style={{
                                            width: '1rem',
                                            height: '1rem',
                                            border: '2px solid transparent',
                                            borderTop: '2px solid white',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }}></div>
                                        Connexion...
                                    </>
                                ) : (
                                    <>
                                        🚀 Oui, accéder à Teams
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <style jsx>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
        </>
    );
};

export default PlanningEnseignant;