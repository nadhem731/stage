import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar';
import '../../style/dashboard.css';

const PlanningEnseignant = () => {
    const [activeTab, setActiveTab] = useState('cours');
    const [planningCours, setPlanningCours] = useState([]);
    const [planningSoutenances, setPlanningSoutenances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // État pour stocker les informations de l'utilisateur connecté
    const [currentUser, setCurrentUser] = useState(null);

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
            setPlanningCours(data);
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
        fetchPlanningSoutenances();
    }, []);

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

        // Ajouter les soutenances
        planningSoutenances.forEach(soutenance => {
            // Utiliser le champ 'jour' directement au lieu de convertir une date
            const dayName = soutenance.jour || getDayNameFromDate(soutenance.date);
            const timeSlot = getTimeSlotForTime(soutenance.heureDebut || soutenance.heureTime);
            
            if (grid[dayName] && grid[dayName][timeSlot]) {
                grid[dayName][timeSlot].push({
                    ...soutenance,
                    type: 'soutenance',
                    color: '#dc2626'
                });
            }
        });

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

    // Groupement des cours par jour
    const groupCoursByDay = () => {
        const grouped = {};
        planningCours.forEach(cours => {
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

    // Groupement des soutenances par jour
    const groupSoutenancesByDay = () => {
        const grouped = {};
        planningSoutenances.forEach(soutenance => {
            // Debug pour comprendre le problème
            console.log('DEBUG groupSoutenancesByDay - Soutenance:', {
                jour: soutenance.jour,
                date: soutenance.date,
                user: soutenance.user?.nom + ' ' + soutenance.user?.prenom,
                heureTime: soutenance.heureTime
            });
            
            // Utiliser UNIQUEMENT le champ 'jour' pour les soutenances générées par l'AI
            // Ne pas utiliser 'date' car il contient une valeur générique identique pour toutes
            const dateKey = soutenance.jour || 'Non défini';
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(soutenance);
        });
        
        console.log('DEBUG groupSoutenancesByDay - Résultat du regroupement:', grouped);
        
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

    const groupedCours = groupCoursByDay();
    const groupedSoutenances = groupSoutenancesByDay();

    return (
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
                            {activeTab === 'cours' ? '📚 Mes Cours' : '🎓 Mes Soutenances'}
                        </h2>
                        <button 
                            className="back-to-dashboard-btn"
                            onClick={() => {
                                if (activeTab === 'cours') {
                                    fetchPlanningCours();
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
                    <div className="tab-content">
                        {activeTab === 'cours' && (
                            <div className="planning-container">
                                {/* Guide pour les cours */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #059669, #047857)',
                                    borderRadius: '0.75rem',
                                    padding: '1.25rem',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
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
                                            <br />• 🟢 Vert : Cours en présentiel
                                            <br />• 🔵 Bleu : Cours en ligne
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
                                            borderBottom: '2px solid var(--green-main)',
                                            paddingBottom: '1rem'
                                        }}>
                                            <h3 style={{ color: 'var(--green-main)', fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>
                                                📚 Mon Emploi du Temps
                                            </h3>
                                            <span className="course-code" style={{ 
                                                background: 'var(--green-main)', 
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
                                                minWidth: '800px'
                                            }}>
                                                <thead>
                                                    <tr style={{ background: 'var(--green-main)' }}>
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
                                                                color: 'var(--green-main)',
                                                                border: '1px solid #e5e7eb',
                                                                textAlign: 'center',
                                                                verticalAlign: 'middle',
                                                                background: '#f0f9ff'
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
                                                                // Trouver les cours pour ce jour et ce créneau
                                                                const coursForSlot = planningCours.filter(cours => {
                                                                    const coursDay = getDayNameFromDate(cours.dateDebut);
                                                                    const coursSlot = getTimeSlotForTime(cours.heureDebut);
                                                                    return coursDay === day && coursSlot === slot.label;
                                                                });

                                                                return (
                                                                    <td key={`${day}-${slot.label}`} style={{ 
                                                                        padding: '0.5rem', 
                                                                        border: '1px solid #e5e7eb',
                                                                        verticalAlign: 'top',
                                                                        position: 'relative'
                                                                    }}>
                                                                        {coursForSlot.length > 0 ? (
                                                                            <div style={{ 
                                                                                display: 'flex', 
                                                                                flexDirection: 'column', 
                                                                                gap: '0.25rem',
                                                                                height: '100%'
                                                                            }}>
                                                                                {coursForSlot.map((cours, index) => {
                                                                                    // Debug: Afficher la structure du cours
                                                                                    console.log('DEBUG Cours:', cours);
                                                                                    console.log('DEBUG modeCours:', cours.modeCours);
                                                                                    console.log('DEBUG typePlanning:', cours.typePlanning);
                                                                                    console.log('DEBUG Toutes les propriétés:', Object.keys(cours));
                                                                                    
                                                                                    return (
                                                                                    <div key={index} style={{
                                                                                        background: cours.modeCours === 'en_ligne' 
                                                                                            ? 'linear-gradient(135deg, #3b82f6, #2563eb)' 
                                                                                            : 'linear-gradient(135deg, #059669, #047857)',
                                                                                        color: 'white',
                                                                                        padding: '0.5rem',
                                                                                        borderRadius: '0.375rem',
                                                                                        fontSize: '0.75rem',
                                                                                        lineHeight: '1.2',
                                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                                                        position: 'relative'
                                                                                    }}>
                                                                                        {/* Badge du mode de cours */}
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
                                                                                            {cours.modeCours === 'en_ligne' ? '📡 EN LIGNE' : '🏫 PRÉSENTIEL'}
                                                                                        </div>
                                                                                        
                                                                                        <div style={{ 
                                                                                            fontWeight: '700', 
                                                                                            marginBottom: '0.25rem',
                                                                                            fontSize: '0.8rem',
                                                                                            paddingRight: '4rem' // Espace pour le badge
                                                                                        }}>
                                                                                            🎯 {cours.classe?.nomClasse || 'Classe'}
                                                                                        </div>
                                                                                        <div style={{ 
                                                                                            fontSize: '0.7rem', 
                                                                                            opacity: '0.9',
                                                                                            marginBottom: '0.25rem'
                                                                                        }}>
                                                                                            ⏰ {formatTime(cours.heureDebut)} - {formatTime(cours.heureFin)}
                                                                                        </div>
                                                                                        <div style={{ 
                                                                                            fontSize: '0.7rem', 
                                                                                            opacity: '0.9',
                                                                                            marginBottom: '0.25rem'
                                                                                        }}>
                                                                                            🏦 {cours.salle?.numSalle || 'Salle'}
                                                                                        </div>
                                                                                        {cours.typePlanning && (
                                                                                            <div style={{ 
                                                                                                fontSize: '0.65rem', 
                                                                                                opacity: '0.8',
                                                                                                background: 'rgba(255,255,255,0.2)',
                                                                                                padding: '0.125rem 0.25rem',
                                                                                                borderRadius: '0.25rem',
                                                                                                textAlign: 'center'
                                                                                            }}>
                                                                                                📝 {cours.typePlanning}
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
                                                minWidth: '800px'
                                            }}>
                                                <thead>
                                                    <tr style={{ background: '#dc2626' }}>
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
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanningEnseignant;