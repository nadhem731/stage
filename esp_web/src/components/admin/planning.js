import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import '../../style/etudient.css';
import '../../style/table.css';
import '../../style/dashboard.css';
import api from '../../api/axios';
import 'jspdf-autotable';

function Planning() {
  const [activeTab, setActiveTab] = useState('cour'); // 'cour' or 'soutenance'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [geminiSuggestions, setGeminiSuggestions] = useState(''); // Pour stocker les suggestions de Gemini
  const [showSuggestions, setShowSuggestions] = useState(false); // Pour afficher/masquer les suggestions
  const [groupedPlanning, setGroupedPlanning] = useState({}); // Pour stocker le planning regroupé par jour
  const [planningByClass, setPlanningByClass] = useState({}); // Pour stocker le planning regroupé par classe
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedSoutenance, setSelectedSoutenance] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [planningStatus, setPlanningStatus] = useState('en_cours'); // 'en_cours' ou 'valide'
  const [currentPlanningData, setCurrentPlanningData] = useState(null); // Pour stocker les données brutes du planning
  const [timeUntilSunday, setTimeUntilSunday] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [planningHistory, setPlanningHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // États pour les soutenances
  const [etudiants, setEtudiants] = useState([]);
  const [selectedEtudiants, setSelectedEtudiants] = useState([]);
  const [planningSoutenances, setPlanningSoutenances] = useState([]);
  const [showSoutenanceModal, setShowSoutenanceModal] = useState(false);
  const [soutenanceStats, setSoutenanceStats] = useState({});
  const [searchEtudiant, setSearchEtudiant] = useState('');
  const [soutenanceViewMode, setSoutenanceViewMode] = useState('day');
  const [groupedSoutenances, setGroupedSoutenances] = useState({});
  const [showStudentList, setShowStudentList] = useState(true);
  const [preventSoutenanceReload, setPreventSoutenanceReload] = useState(false); // Pour empêcher le rechargement automatique

  const [showMicrosoftOptions, setShowMicrosoftOptions] = useState(false);
  const [microsoftOptions, setMicrosoftOptions] = useState({
    calendar: true,
    teams: false,
    notifications: false
  });
  const [microsoftSyncResults, setMicrosoftSyncResults] = useState(null);
  const [microsoftSyncLoading, setMicrosoftSyncLoading] = useState(false);


  // Charger le planning sauvegardé au démarrage
  React.useEffect(() => {
    // Synchroniser les soutenances du storage avec la base de données au démarrage
    synchroniserSoutenancesAvecBD();
    
    const savedPlanning = localStorage.getItem('currentPlanning');
    const savedStatus = localStorage.getItem('planningStatus');
    const savedSuggestions = localStorage.getItem('geminiSuggestions');
    const savedHistory = localStorage.getItem('planningHistory');
    
    // Récupérer le statut depuis la base de données
    const fetchPlanningStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await api.get('/api/plannings/status', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data) {
            setPlanningStatus(response.data);
            localStorage.setItem('planningStatus', response.data);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du statut:', error);
      }
    };
    
    fetchPlanningStatus();
    fetchMicrosoftStatus();
    
    // Synchroniser les soutenances périodiquement
    const intervalSync = setInterval(() => {
      synchroniserSoutenancesAvecBD();
    }, 300000); // Toutes les 5 minutes
    
    // Nettoyer l'intervalle au démontage du composant
    return () => clearInterval(intervalSync);
    
    if (savedPlanning) {
      try {
        const planningData = JSON.parse(savedPlanning);
        setCurrentPlanningData(planningData);
        
        // Regrouper par jour
        const grouped = planningData.reduce((acc, item) => {
          const { jour } = item;
          if (!acc[jour]) {
            acc[jour] = [];
          }
          acc[jour].push(item);
          return acc;
        }, {});
        setGroupedPlanning(grouped);

        // Regrouper par classe
        const groupedByClass = planningData.reduce((acc, item) => {
          const { nom_classe } = item;
          if (!acc[nom_classe]) {
            acc[nom_classe] = [];
          }
          acc[nom_classe].push(item);
          return acc;
        }, {});
        setPlanningByClass(groupedByClass);
        
        setMessage('Planning chargé depuis la sauvegarde locale');
      } catch (error) {
        console.error('Erreur lors du chargement du planning sauvegardé:', error);
        localStorage.removeItem('currentPlanning');
      }
    }
    
    if (savedStatus) {
      setPlanningStatus(savedStatus);
    }
    
    if (savedSuggestions) {
      setGeminiSuggestions(savedSuggestions);
    }
    
    if (savedHistory) {
      try {
        setPlanningHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
      }
    }
    
    const savedSoutenances = localStorage.getItem('planningSoutenances');
    const savedEtudiants = localStorage.getItem('etudiants');
    const savedSelectedEtudiants = localStorage.getItem('selectedEtudiants');
    
    // Ne recharger les soutenances que si on n'est pas en train de les supprimer
    if (savedSoutenances && !preventSoutenanceReload) {
      try {
        const soutenancesData = JSON.parse(savedSoutenances);
        // Charger toutes les soutenances du storage (la synchronisation avec la BD se fait séparément)
        setPlanningSoutenances(soutenancesData);
        
        // Regrouper les soutenances par jour pour la vue dashboard
        const groupedSout = soutenancesData.reduce((acc, soutenance) => {
          const jour = soutenance.jour;
          if (!acc[jour]) {
            acc[jour] = [];
          }
          acc[jour].push(soutenance);
          return acc;
        }, {});
        setGroupedSoutenances(groupedSout);
      } catch (error) {
        console.error('Erreur lors du chargement des soutenances:', error);
      }
    }
    
    if (savedEtudiants) {
      try {
        setEtudiants(JSON.parse(savedEtudiants));
      } catch (error) {
        console.error('Erreur lors du chargement des étudiants:', error);
      }
    }
    
    if (savedSelectedEtudiants) {
      try {
        setSelectedEtudiants(JSON.parse(savedSelectedEtudiants));
      } catch (error) {
        console.error('Erreur lors du chargement des étudiants sélectionnés:', error);
      }
    }
  }, []);

  // Fonction pour récupérer le statut Microsoft
  const fetchMicrosoftStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/api/microsoft/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // setMicrosoftStatus(response.data); // Variable removed
    } catch (error) {
      console.error('Erreur lors de la récupération du statut Microsoft:', error);
    }
  };

  // Fonction pour synchronisation en masse vers Microsoft
  const handleBulkSyncToMicrosoft = async () => {
    if (!currentPlanningData || currentPlanningData.length === 0) {
      setMicrosoftSyncResults({
        success: false,
        error: 'Aucun planning à synchroniser'
      });
      return;
    }

    setMicrosoftSyncLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/microsoft/calendar/sync-bulk', {
        plannings: currentPlanningData,
        options: microsoftOptions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMicrosoftSyncResults({
        success: true,
        details: [`${currentPlanningData.length} cours synchronisés avec Microsoft Calendar`]
      });
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setMicrosoftSyncResults({
        success: false,
        error: error.response?.data?.message || 'Erreur de synchronisation'
      });
    } finally {
      setMicrosoftSyncLoading(false);
    }
  };

  // Fonction pour synchroniser un planning individuel

  // Fonction pour créer une réunion Teams
  const handleCreateTeamsMeeting = async (planning) => {
    setMicrosoftSyncLoading(true);
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/microsoft/teams/create-meeting', planning, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMicrosoftSyncResults({
        success: true,
        details: [`Réunion Teams créée pour ${planning.matiere}`]
      });
    } catch (error) {
      console.error('Erreur lors de la création de la réunion:', error);
      setMicrosoftSyncResults({
        success: false,
        error: error.response?.data?.message || 'Erreur de création de réunion'
      });
    } finally {
      setMicrosoftSyncLoading(false);
    }
  };

  // Fonction pour synchroniser une classe complète
  const handleSyncClassToMicrosoft = async (className, plannings) => {
    setMicrosoftSyncLoading(true);
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/microsoft/calendar/sync-bulk', {
        plannings: plannings,
        options: { ...microsoftOptions, className }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMicrosoftSyncResults({
        success: true,
        details: [`${plannings.length} cours de la classe ${className} synchronisés`]
      });
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setMicrosoftSyncResults({
        success: false,
        error: error.response?.data?.message || 'Erreur de synchronisation'
      });
    } finally {
      setMicrosoftSyncLoading(false);
    }
  };

  // Fonction pour créer des réunions Teams pour une classe
  const handleCreateClassTeamsMeetings = async (className, plannings) => {
    setMicrosoftSyncLoading(true);
    try {
      const token = localStorage.getItem('token');
      const promises = plannings.map(planning => 
        api.post('/api/microsoft/teams/create-meeting', planning, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(promises);
      
      setMicrosoftSyncResults({
        success: true,
        details: [`${plannings.length} réunions Teams créées pour la classe ${className}`]
      });
    } catch (error) {
      console.error('Erreur lors de la création des réunions:', error);
      setMicrosoftSyncResults({
        success: false,
        error: error.response?.data?.message || 'Erreur de création de réunions'
      });
    } finally {
      setMicrosoftSyncLoading(false);
    }
  };

  // Fonction pour synchroniser toutes les soutenances
  const handleBulkSyncSoutenancesToMicrosoft = async () => {
    if (!planningSoutenances || planningSoutenances.length === 0) {
      setMicrosoftSyncResults({
        success: false,
        error: 'Aucune soutenance à synchroniser'
      });
      return;
    }

    setMicrosoftSyncLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/microsoft/calendar/sync-soutenances-bulk', {
        soutenances: planningSoutenances,
        options: microsoftOptions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMicrosoftSyncResults({
        success: true,
        details: [`${planningSoutenances.length} soutenances synchronisées avec Microsoft Calendar`]
      });
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setMicrosoftSyncResults({
        success: false,
        error: error.response?.data?.message || 'Erreur de synchronisation'
      });
    } finally {
      setMicrosoftSyncLoading(false);
    }
  };

  // Fonction pour synchroniser une soutenance individuelle
  const handleSyncSoutenanceToMicrosoft = async (soutenance) => {
    setMicrosoftSyncLoading(true);
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/microsoft/calendar/sync-soutenance', soutenance, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMicrosoftSyncResults({
        success: true,
        details: [`Soutenance de ${soutenance.nom_etudiant} synchronisée avec Microsoft Calendar`]
      });
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setMicrosoftSyncResults({
        success: false,
        error: error.response?.data?.message || 'Erreur de synchronisation'
      });
    } finally {
      setMicrosoftSyncLoading(false);
    }
  };

  // Fonction pour créer une réunion Teams pour une soutenance
  const handleCreateSoutenanceTeamsMeeting = async (soutenance) => {
    setMicrosoftSyncLoading(true);
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/microsoft/teams/create-soutenance-meeting', soutenance, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMicrosoftSyncResults({
        success: true,
        details: [`Réunion Teams créée pour la soutenance de ${soutenance.nom_etudiant}`]
      });
    } catch (error) {
      console.error('Erreur lors de la création de la réunion:', error);
      setMicrosoftSyncResults({
        success: false,
        error: error.response?.data?.message || 'Erreur de création de réunion'
      });
    } finally {
      setMicrosoftSyncLoading(false);
    }
  };

  // Fonction pour créer des réunions Teams pour toutes les soutenances
  const handleCreateAllSoutenancesTeamsMeetings = async () => {
    if (!planningSoutenances || planningSoutenances.length === 0) {
      setMicrosoftSyncResults({
        success: false,
        error: 'Aucune soutenance pour créer des réunions'
      });
      return;
    }

    setMicrosoftSyncLoading(true);
    try {
      const token = localStorage.getItem('token');
      const promises = planningSoutenances.map(soutenance => 
        api.post('/api/microsoft/teams/create-soutenance-meeting', soutenance, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(promises);
      
      setMicrosoftSyncResults({
        success: true,
        details: [`${planningSoutenances.length} réunions Teams créées pour les soutenances`]
      });
    } catch (error) {
      console.error('Erreur lors de la création des réunions:', error);
      setMicrosoftSyncResults({
        success: false,
        error: error.response?.data?.message || 'Erreur de création de réunions'
      });
    } finally {
      setMicrosoftSyncLoading(false);
    }
  };

  // Fonction pour gérer la synchronisation avec options
  const handleMicrosoftSync = async () => {
    setShowMicrosoftOptions(false);
    
    if (microsoftOptions.calendar) {
      await handleBulkSyncToMicrosoft();
    }
    
    if (microsoftOptions.teams && currentPlanningData) {
      for (const planning of currentPlanningData) {
        await handleCreateTeamsMeeting(planning);
      }
    }
  };

  // Nettoyer les résultats Microsoft après 5 secondes
  React.useEffect(() => {
    if (microsoftSyncResults) {
      const timer = setTimeout(() => {
        setMicrosoftSyncResults(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [microsoftSyncResults]);


  // Fonction pour calculer le temps jusqu'au prochain dimanche
  const calculateTimeUntilSunday = () => {
    const now = new Date();
    const nextSunday = new Date();
    
    // Calculer le prochain dimanche
    const daysUntilSunday = (7 - now.getDay()) % 7;
    if (daysUntilSunday === 0 && now.getDay() === 0) {
      // Si c'est déjà dimanche, prendre le dimanche suivant
      nextSunday.setDate(now.getDate() + 7);
    } else {
      nextSunday.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    }
    
    // Fixer l'heure à 00:00:00 du dimanche
    nextSunday.setHours(0, 0, 0, 0);
    
    const timeDiff = nextSunday.getTime() - now.getTime();
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  };

  // Chronomètre qui se met à jour chaque seconde
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilSunday(calculateTimeUntilSunday());
    }, 1000);

    // Initialiser le chronomètre
    setTimeUntilSunday(calculateTimeUntilSunday());

    return () => clearInterval(timer);
  }, []);

  // Fonction pour générer un fichier HTML du planning (alternative au PDF)
  const generatePlanningHTML = (planningData, weekInfo) => {
    // Regrouper par classe
    const planningByClass = planningData.reduce((acc, item) => {
      const { nom_classe } = item;
      if (!acc[nom_classe]) {
        acc[nom_classe] = [];
      }
      acc[nom_classe].push(item);
      return acc;
    }, {});

    let tablesHTML = '';
    Object.entries(planningByClass).forEach(([nomClasse, plannings]) => {
      const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
      const creneaux = [
        { debut: '09:00', fin: '12:15' },
        { debut: '13:30', fin: '16:45' }
      ];
      
      const coursMap = {};
      plannings.forEach(cours => {
        const key = `${cours.jour}-${cours.heure_debut}`;
        coursMap[key] = cours;
      });

      let tableRows = '';
      creneaux.forEach(creneau => {
        let row = `<td style="font-weight: bold;">${creneau.debut}-${creneau.fin}</td>`;
        jours.forEach(jour => {
          const isPauseMercredi = jour === 'Mercredi' && creneau.debut === '13:30';
          const key = `${jour}-${creneau.debut}`;
          const cours = coursMap[key];
          
          if (isPauseMercredi) {
            row += '<td class="pause">⏸️ PAUSE</td>';
          } else if (cours) {
            if (cours.mode_cours === 'en_ligne') {
              row += `<td><span style="color: #007bff; font-weight: bold;">📡 EN LIGNE</span><br>👨‍🏫 ${cours.nom_enseignant || 'Enseignant'}<br>📚 ${cours.matiere || 'Matière'}</td>`;
            } else {
              row += `<td>🏫 ${cours.nom_salle}<br>👨‍🏫 ${cours.nom_enseignant || 'Enseignant'}<br>📚 ${cours.matiere || 'Matière'}</td>`;
            }
          } else {
            row += '<td class="libre">💤 Libre</td>';
          }
        });
        tableRows += `<tr>${row}</tr>`;
      });

      tablesHTML += `
        <h2 style="color:rgb(215, 26, 48); margin-top: 30px;">📅 Classe: ${nomClasse}</h2>
        <table>
          <thead>
            <tr>
              <th>⏰ Horaires</th>
              <th>📅 Lundi</th>
              <th>📅 Mardi</th>
              <th>📅 Mercredi</th>
              <th>📅 Jeudi</th>
              <th>📅 Vendredi</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Planning Hebdomadaire - ESPRIT</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h1 { 
              color: #CB0920; 
              text-align: center; 
              border-bottom: 3px solid #CB0920;
              padding-bottom: 10px;
            }
            .info {
              text-align: center;
              margin: 20px 0;
              font-size: 16px;
              color: #666;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: center;
              vertical-align: middle;
            }
            th { 
              background-color: #CB0920; 
              color: white;
              font-weight: bold;
            }
            .pause { 
              background-color: #ffebee; 
              color: #d32f2f;
              font-weight: bold;
            }
            .libre { 
              background-color: #f5f5f5; 
              color: #666;
              font-style: italic;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            tr:hover {
              background-color: #f0f0f0;
            }
            @media print {
              body { margin: 0; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📚 Planning Hebdomadaire - ESPRIT</h1>
            <div class="info">
              <p><strong>📅 Semaine du ${weekInfo.startDate} au ${weekInfo.endDate}</strong></p>
              <p>📄 Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
              <p>📊 Semaine ${weekInfo.weekNumber} - ${weekInfo.year}</p>
            </div>
            ${tablesHTML}
          </div>
        </body>
      </html>
    `;
    
    return htmlContent;
  };

  // Fonctions pour les soutenances
  const fetchEtudiants = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/users/etudiants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        // Enrichir les données étudiants avec les informations de classe
        const etudiantsAvecClasse = response.data.map((etudiant) => {
          return {
            ...etudiant,
            nomClasse: etudiant.classe?.nomClasse || 'Non assignée'
          };
        });
        
        setEtudiants(etudiantsAvecClasse);
        localStorage.setItem('etudiants', JSON.stringify(etudiantsAvecClasse));
        setMessage(`${etudiantsAvecClasse.length} étudiants chargés avec succès`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des étudiants:', error);
      setMessage('Erreur lors du chargement des étudiants');
    } finally {
      setLoading(false);
    }
  };

  const handleEtudiantSelection = (etudiant) => {
    const isSelected = selectedEtudiants.some(e => e.idUser === etudiant.idUser);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedEtudiants.filter(e => e.idUser !== etudiant.idUser);
    } else {
      newSelection = [...selectedEtudiants, etudiant];
    }
    
    setSelectedEtudiants(newSelection);
    localStorage.setItem('selectedEtudiants', JSON.stringify(newSelection));
  };

  const handleSelectAllEtudiants = () => {
    const filteredEtudiants = etudiants.filter(etudiant =>
      `${etudiant.prenom} ${etudiant.nom}`.toLowerCase().includes(searchEtudiant.toLowerCase())
    );
    
    const allSelected = filteredEtudiants.every(etudiant =>
      selectedEtudiants.some(selected => selected.idUser === etudiant.idUser)
    );
    
    let newSelection;
    if (allSelected) {
      newSelection = selectedEtudiants.filter(selected =>
        !filteredEtudiants.some(etudiant => etudiant.idUser === selected.idUser)
      );
    } else {
      const toAdd = filteredEtudiants.filter(etudiant =>
        !selectedEtudiants.some(selected => selected.idUser === etudiant.idUser)
      );
      newSelection = [...selectedEtudiants, ...toAdd];
    }
    
    setSelectedEtudiants(newSelection);
    localStorage.setItem('selectedEtudiants', JSON.stringify(newSelection));
  };

  const genererPlanningSoutenance = async () => {
    if (selectedEtudiants.length === 0) {
      setMessage('Veuillez sélectionner au moins un étudiant');
      return;
    }

    // Fonction pour supprimer complètement les anciens affichages
    const clearAllSoutenanceData = () => {
      setPreventSoutenanceReload(true); // Empêcher le rechargement automatique
      setPlanningSoutenances([]);
      setSoutenanceStats({});
      setGroupedSoutenances({});
      setShowSoutenanceModal(false);
      
      // Supprimer toutes les données liées aux soutenances du localStorage
      localStorage.removeItem('planningSoutenances');
      localStorage.removeItem('soutenanceStats');
      localStorage.removeItem('groupedSoutenances');
      
      // Forcer le re-render en mettant à jour l'état
      window.dispatchEvent(new Event('storage'));
    };

    // Supprimer complètement les anciens affichages de soutenances
    console.log('Suppression des anciens plannings de soutenances...');
    clearAllSoutenanceData();
    setMessage('Suppression des anciens plannings de soutenances...');
    
    // Attendre que l'interface se mette à jour
    await new Promise(resolve => setTimeout(resolve, 200));

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/generate-soutenance-planning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          etudiants_selectionnes: selectedEtudiants.map(etudiant => ({
            ...etudiant,
            nomClasse: etudiant.nomClasse || etudiant.classe?.nomClasse || 'Non assignée',
            identifiant: etudiant.identifiant || etudiant.idUser
          })),
          date_soutenance: new Date().toISOString().split('T')[0],
          token: token
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // S'assurer que les anciens données sont bien supprimées avant d'ajouter les nouvelles
        clearAllSoutenanceData();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setPlanningSoutenances(result.planning_soutenances || []);
        setSoutenanceStats(result.statistiques || {});
        
        // Regrouper les soutenances par jour
        const grouped = (result.planning_soutenances || []).reduce((acc, soutenance) => {
          const { jour } = soutenance;
          if (!acc[jour]) {
            acc[jour] = [];
          }
          acc[jour].push(soutenance);
          return acc;
        }, {});
        setGroupedSoutenances(grouped);
        
        // Sauvegarder toutes les soutenances générées
        localStorage.setItem('planningSoutenances', JSON.stringify(result.planning_soutenances || []));
        setPreventSoutenanceReload(false); // Réactiver le rechargement pour les prochaines fois
        setMessage(`Nouveau planning de soutenances généré: ${result.planning_soutenances?.length || 0} soutenances`);
      } else {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors de la génération du planning:', error);
      setMessage('Erreur lors de la génération du planning de soutenances');
    } finally {
      setLoading(false);
    }
  };


  const validerPlanningSoutenances = async () => {
    if (planningSoutenances.length === 0) {
      setMessage('Aucun planning de soutenances à valider');
      return;
    }

    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Erreur: Vous devez être connecté pour valider le planning');
      return;
    }

    try {
      setLoading(true);
      console.log('Token trouvé:', token ? 'Oui' : 'Non');
      console.log('Données de soutenances à sauvegarder:', planningSoutenances.length, 'éléments');
      
      // Vérifier si le token est expiré
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        console.log('Token expiration:', new Date(tokenPayload.exp * 1000));
        console.log('Current time:', new Date(currentTime * 1000));
        console.log('Token expired:', tokenPayload.exp < currentTime);
        
        if (tokenPayload.exp < currentTime) {
          setMessage('Erreur: Votre session a expiré. Veuillez vous reconnecter.');
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error('Erreur lors de la vérification du token:', e);
      }
      
      // Préparer les données pour la sauvegarde en base
      const soutenancesToSave = planningSoutenances.map(soutenance => ({
        date_soutenance: new Date().toISOString().split('T')[0], // Date du jour
        heure_debut: soutenance.heure_debut,
        heure_fin: soutenance.heure_fin,
        id_etudiant: soutenance.id_etudiant,
        id_salle: soutenance.id_salle,
        jour: soutenance.jour, // AJOUT DU CHAMP JOUR
        jury: soutenance.jury || []
      }));

      console.log('Données préparées pour la sauvegarde:', soutenancesToSave);

      // Sauvegarder le planning de soutenances en base de données
      const response = await api.post('/api/soutenances/save-planning', {
        planning_soutenances: soutenancesToSave
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200 || response.status === 201) {
        setMessage('Planning de soutenances validé et sauvegardé en base de données avec succès !');
        setShowSoutenanceModal(false);
        
        // Mettre à jour le localStorage pour marquer comme validé
        const updatedSoutenances = planningSoutenances.map(s => ({ ...s, status: 'valide' }));
        localStorage.setItem('planningSoutenances', JSON.stringify(updatedSoutenances));
      }
    } catch (error) {
      console.error('Erreur lors de la validation du planning de soutenances:', error);
      setMessage('Erreur lors de la validation du planning: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour synchroniser les soutenances du storage avec la base de données
  const synchroniserSoutenancesAvecBD = async () => {
    const savedSoutenances = localStorage.getItem('planningSoutenances');
    if (savedSoutenances) {
      try {
        const soutenancesData = JSON.parse(savedSoutenances);
        
        // Récupérer les soutenances existantes depuis la base de données
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await api.get('/api/soutenances', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          const soutenancesBD = response.data;
          
          // Créer un Set des IDs des soutenances existantes dans la BD
          const idsSoutenancesBD = new Set(
            soutenancesBD.map(s => s.id || s._id || `${s.jour}-${s.heureDebut}-${s.user?.id}`)
          );
          
          // Filtrer les soutenances du storage pour ne garder que celles qui existent dans la BD
          const soutenancesExistantes = soutenancesData.filter(soutenance => {
            const soutenanceId = soutenance.id || soutenance._id || `${soutenance.jour}-${soutenance.heureDebut}-${soutenance.user?.id}`;
            return idsSoutenancesBD.has(soutenanceId);
          });
          
          // Mettre à jour le storage si des soutenances ont été supprimées
          if (soutenancesExistantes.length !== soutenancesData.length) {
            if (soutenancesExistantes.length > 0) {
              localStorage.setItem('planningSoutenances', JSON.stringify(soutenancesExistantes));
              setPlanningSoutenances(soutenancesExistantes);
            } else {
              localStorage.removeItem('planningSoutenances');
              localStorage.removeItem('soutenanceStats');
              localStorage.removeItem('groupedSoutenances');
              setPlanningSoutenances([]);
            }
            console.log(`${soutenancesData.length - soutenancesExistantes.length} soutenances supprimées de la BD ont été retirées du storage`);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la synchronisation des soutenances:', error);
        // En cas d'erreur API, on garde les soutenances du storage
      }
    }
  };

  const reinitialiserSoutenances = () => {
    // Vérifier si le planning de soutenances est validé
    const savedSoutenances = localStorage.getItem('planningSoutenances');
    if (savedSoutenances) {
      try {
        const soutenancesData = JSON.parse(savedSoutenances);
        const isValidated = soutenancesData.some(s => s.status === 'valide');
        if (isValidated) {
          setMessage('Impossible de supprimer un planning de soutenances validé');
          return;
        }
      } catch (e) {
        console.error('Erreur lors de la vérification du statut:', e);
      }
    }

    setSelectedEtudiants([]);
    setPlanningSoutenances([]);
    setSoutenanceStats({});
    setGroupedSoutenances({});
    localStorage.removeItem('selectedEtudiants');
    localStorage.removeItem('planningSoutenances');
    setMessage('Données des soutenances réinitialisées');
  };

  // Fonction pour sauvegarder le planning dans l'historique et générer un PDF
  const saveToHistoryAndGeneratePDF = async (planningData) => {
    if (!currentPlanningData || currentPlanningData.length === 0) return;
    
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi de cette semaine
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Vendredi de cette semaine
    
    const weekInfo = {
      startDate: weekStart.toLocaleDateString('fr-FR'),
      endDate: weekEnd.toLocaleDateString('fr-FR'),
      year: now.getFullYear(),
      weekNumber: getWeekNumber(now)
    };
    
    // Générer le fichier HTML
    const htmlContent = generatePlanningHTML(currentPlanningData, weekInfo);
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    
    // Créer l'entrée d'historique
    const historyEntry = {
      id: Date.now(),
      weekInfo,
      planningData: currentPlanningData,
      createdAt: now.toISOString(),
      fileName: `Planning_Semaine_${weekInfo.weekNumber}_${weekInfo.year}.html`
    };
    
    // Sauvegarder le fichier HTML localement
    const reader = new FileReader();
    reader.onload = function() {
      historyEntry.fileData = reader.result;
      
      const updatedHistory = [...planningHistory, historyEntry];
      setPlanningHistory(updatedHistory);
      localStorage.setItem('planningHistory', JSON.stringify(updatedHistory));
      
      setMessage(`Planning de la semaine ${weekInfo.weekNumber} sauvegardé dans l'historique`);
    };
    reader.readAsDataURL(htmlBlob);
  };

  // Fonction pour obtenir le numéro de semaine
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Fonction pour télécharger un fichier HTML depuis l'historique
  const downloadFileFromHistory = (historyEntry) => {
    if (!historyEntry.fileData) {
      // Régénérer le fichier HTML si les données ne sont pas disponibles
      const htmlContent = generatePlanningHTML(historyEntry.planningData, historyEntry.weekInfo);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = historyEntry.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Télécharger le fichier sauvegardé
      const link = document.createElement('a');
      link.href = historyEntry.fileData;
      link.download = historyEntry.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Fonction pour supprimer une entrée de l'historique
  const deleteHistoryEntry = (entryId) => {
    const updatedHistory = planningHistory.filter(entry => entry.id !== entryId);
    setPlanningHistory(updatedHistory);
    localStorage.setItem('planningHistory', JSON.stringify(updatedHistory));
    setMessage('Entrée supprimée de l\'historique');
  };

  // Sauvegarder le planning dans localStorage à chaque modification
  const savePlanningToStorage = (planningData, status = 'en_cours', suggestions = '') => {
    localStorage.setItem('currentPlanning', JSON.stringify(planningData));
    localStorage.setItem('planningStatus', status);
    if (suggestions) {
      localStorage.setItem('geminiSuggestions', suggestions);
    }
  };
 
  const handleGenerate = async () => {
    // Sauvegarder le planning actuel dans l'historique avant de générer un nouveau
    if (currentPlanningData && currentPlanningData.length > 0) {
      await saveToHistoryAndGeneratePDF(currentPlanningData);
    }

    setLoading(true);
    setMessage('');
    setGeminiSuggestions(''); // Réinitialiser les suggestions précédentes
    setGroupedPlanning({}); // Réinitialiser le planning groupé
    setPlanningByClass({}); // Réinitialiser le planning par classe

    try {
      // Vérifier si l'utilisateur est connecté et a un token
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Erreur: Vous devez être connecté pour générer un planning');
        setLoading(false);
        return;
      }
      
      setMessage('Récupération des données actualisées...');
      
      // Récupérer les données des salles et classes depuis Spring Boot avec cache-busting
      const timestamp = new Date().getTime();
      console.log('DEBUG: Récupération des données avec timestamp:', timestamp);
      
      const sallesResponse = await api.get(`/api/salles?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const classesResponse = await api.get(`/api/classes?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('DEBUG: Salles récupérées:', sallesResponse.data);
      console.log('DEBUG: Nombre de salles:', sallesResponse.data.length);
      console.log('DEBUG: Classes récupérées:', classesResponse.data);
      console.log('DEBUG: Nombre de classes:', classesResponse.data.length);
      
      // Vérifier si des classes sont disponibles
      if (!classesResponse.data || classesResponse.data.length === 0) {
        setMessage('Erreur: Aucune classe trouvée. Veuillez créer des classes avant de générer un planning.');
        setLoading(false);
        return;
      }
      
      const requestData = {
        salles: sallesResponse.data,
        classes: classesResponse.data,
        token: token // Ajouter le token JWT pour l'authentification
      };
      
      // Appel direct vers l'API Python sur le port 5001
      const response = await fetch('http://localhost:5001/generate-planning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // La réponse contient maintenant 'planning' et 'gemini_suggestions'
      if (data.planning && data.planning.length > 0) {
        const planningData = data.planning;
        console.log('DEBUG: Planning data received:', planningData);
        console.log('DEBUG: First planning entry:', planningData[0]);
        console.log('DEBUG: Checking nom_salle in first entry:', planningData[0]?.nom_salle);
        setCurrentPlanningData(planningData);
        
        // Regrouper par jour
        const grouped = planningData.reduce((acc, item) => {
          const { jour } = item;
          if (!acc[jour]) {
            acc[jour] = [];
          }
          acc[jour].push(item);
          return acc;
        }, {});
        setGroupedPlanning(grouped);

        // Regrouper par classe
        const groupedByClass = planningData.reduce((acc, item) => {
          const { nom_classe } = item;
          if (!acc[nom_classe]) {
            acc[nom_classe] = [];
          }
          acc[nom_classe].push(item);
          return acc;
        }, {});
        setPlanningByClass(groupedByClass);

        // Sauvegarder dans localStorage
        savePlanningToStorage(planningData, 'en_cours');
        setPlanningStatus('en_cours');
        
        // Afficher les suggestions Gemini si disponibles
        if (data.gemini_suggestions) {
          setGeminiSuggestions(data.gemini_suggestions);
          setShowSuggestions(true);
        }
        
        setMessage(`Planning généré avec succès ! (${classesResponse.data.length} classes traitées)`);
      } else {
        setMessage('Aucun planning généré - Vérifiez que des classes et salles sont disponibles');
      }
    } catch (error) {
      console.error('Erreur lors de la génération du planning:', error);
      setMessage('Erreur lors de la génération du planning: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = (classeData, nomClasse) => {
    // Popup désactivée selon la demande utilisateur
    // setSelectedClass({ data: classeData, nom: nomClasse });
    // setShowStudentsModal(true);
  };

  const handleValidatePlanning = async () => {
    if (!currentPlanningData || currentPlanningData.length === 0) {
      setMessage('Aucun planning à valider');
      return;
    }

    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Erreur: Vous devez être connecté pour valider le planning');
      return;
    }

    try {
      setLoading(true);
      console.log('Token trouvé:', token ? 'Oui' : 'Non');
      console.log('Token value:', token);
      console.log('Données à sauvegarder:', currentPlanningData.length, 'éléments');
      
      // Vérifier si le token est expiré
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        console.log('Token expiration:', new Date(tokenPayload.exp * 1000));
        console.log('Current time:', new Date(currentTime * 1000));
        console.log('Token expired:', tokenPayload.exp < currentTime);
        
        if (tokenPayload.exp < currentTime) {
          setMessage('Erreur: Votre session a expiré. Veuillez vous reconnecter.');
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error('Erreur lors de la vérification du token:', e);
      }
      
      // Fonction pour calculer la date réelle basée sur le jour de la semaine
      const getDateForDay = (dayName) => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
        
        // Mapping des jours français vers les numéros
        const dayMapping = {
          'Lundi': 1,
          'Mardi': 2,
          'Mercredi': 3,
          'Jeudi': 4,
          'Vendredi': 5
        };
        
        const targetDay = dayMapping[dayName];
        if (!targetDay) return today.toISOString().split('T')[0];
        
        // Calculer la différence de jours
        let dayDiff = targetDay - currentDay;
        
        // Si le jour cible est déjà passé cette semaine, prendre la semaine suivante
        if (dayDiff < 0) {
          dayDiff += 7;
        }
        
        // Calculer la date cible
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayDiff);
        
        return targetDate.toISOString().split('T')[0];
      };

      // Préparer les données pour la sauvegarde en base
      const planningToSave = currentPlanningData.map(item => {
        const dateForDay = getDateForDay(item.jour);
        return {
          dateDebut: dateForDay, // Date réelle du jour de la semaine
          dateFin: dateForDay,   // Date réelle du jour de la semaine
          heureDebut: item.heure_debut,
          heureFin: item.heure_fin,
          idClasse: parseInt(item.id_classe), // Convertir en Integer
          idSalle: parseInt(item.id_salle),   // Convertir en Long (sera traité comme Long côté Java)
          idUser: parseInt(item.id_enseignant), // Ajouter l'ID de l'enseignant
          typePlanning: item.type_planning || 'cour',
          jour: item.jour,
          modeCours: item.mode_cours || 'presentiel'
        };
      });

      console.log('Données préparées pour la sauvegarde:', planningToSave);

      // Sauvegarder le planning en base de données
      const response = await api.post('/api/plannings/save-bulk', planningToSave);
      
      if (response.status === 200 || response.status === 201) {
        setPlanningStatus('valide');
        setMessage('Planning validé et sauvegardé en base de données avec succès !');
        
        // Mettre à jour le localStorage avec le nouveau statut
        savePlanningToStorage(currentPlanningData, 'valide', geminiSuggestions);
      }
    } catch (error) {
      console.error('Erreur lors de la validation du planning:', error);
      setMessage('Erreur lors de la validation du planning: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout
      activeMenu="Planning"
      setActiveMenu={() => {}}
      title="Gestion du Planning"
      subtitle="Génération et gestion des plannings de cours et soutenances"
    >

          <div className="tabs" style={{ marginBottom: '2rem', borderBottom: '1px solid #ddd', display: 'flex' }}>
            <button 
              style={{ padding: '1rem', border: 'none', background: activeTab === 'cour' ? '#fff' : 'transparent', borderBottom: activeTab === 'cour' ? '3px solid #CB0920' : 'none', cursor: 'pointer', fontWeight: '600' }}
              onClick={() => setActiveTab('cour')}>
              Salle des Cours
            </button>
            <button 
              style={{ padding: '1rem', border: 'none', background: activeTab === 'soutenance' ? '#fff' : 'transparent', borderBottom: activeTab === 'soutenance' ? '3px solid #CB0920' : 'none', cursor: 'pointer', fontWeight: '600' }}
              onClick={() => setActiveTab('soutenance')}>
              Salle des Soutenances
            </button>
          </div>

          {activeTab === 'cour' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ color: '#333', margin: '0 0 0.5rem 0' }}>Gestion du Planning des Cours</h3>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* Icône d'alerte pour le chronomètre */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowTimerModal(!showTimerModal)}
                      style={{
                        background: '#FF4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        boxShadow: '0 2px 8px rgba(255, 68, 68, 0.3)',
                        position: 'relative',
                        animation: timeUntilSunday.days <= 1 ? 'pulse 2s infinite' : 'none'
                      }}
                      title="Temps restant avant nouveau planning"
                    >
                      🚨
                      {/* Badge de notification si moins de 2 jours */}
                      {timeUntilSunday.days <= 1 && (
                        <span style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          background: '#FF0000',
                          color: 'white',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}>
                          !
                        </span>
                      )}
                    </button>
                  </div>
                  
                  {/* Icône de notification pour les suggestions Gemini AI */}
                  {geminiSuggestions && (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        style={{
                          background: '#FFA500',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '40px',
                          height: '40px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          boxShadow: '0 2px 8px rgba(255, 165, 0, 0.3)',
                          position: 'relative'
                        }}
                        title="Suggestions d'optimisation (Gemini AI)"
                      >
                        💡
                        {/* Badge de notification */}
                        <span style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          background: '#FF4444',
                          color: 'white',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}>
                          !
                        </span>
                      </button>
                    </div>
                  )}
                  
                  {/* Bouton Historique */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowHistoryModal(true)}
                      style={{
                        background: '#4A90E2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        boxShadow: '0 2px 8px rgba(74, 144, 226, 0.3)',
                        position: 'relative'
                      }}
                      title={`Historique des plannings (${planningHistory.length})`}
                    >
                      📚
                      {/* Badge avec le nombre d'entrées */}
                      {planningHistory.length > 0 && (
                        <span style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          background: '#FF4444',
                          color: 'white',
                          borderRadius: '50%',
                          minWidth: '16px',
                          height: '16px',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          padding: '0 2px'
                        }}>
                          {planningHistory.length}
                        </span>
                      )}
                    </button>
                  </div>
                  
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    style={{
                      background: loading ? '#ccc' : '#CB0920',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {loading ? 'Génération en cours...' : 'Générer Planning'}
                  </button>
                  {Object.keys(groupedPlanning).length > 0 && (
                    <>
                      <button
                        onClick={handleValidatePlanning}
                        style={{
                          background: planningStatus === 'valide' ? '#6c757d' : '#28a745',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '10px 20px',
                          fontWeight: 600,
                          cursor: planningStatus === 'valide' ? 'not-allowed' : 'pointer',
                          opacity: planningStatus === 'valide' ? 0.6 : 1
                        }}
                        disabled={planningStatus === 'valide'}
                      >
                        {planningStatus === 'valide' ? 'Planning Validé' : 'Valider le Planning'}
                      </button>
                      
                      
                          
                      
                    </>
                  )}
                </div>
              </div>
              {message && (
                <div style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  borderRadius: 6,
                  background: message.includes('Erreur') ? '#ffebee' : '#e8f5e9',
                  color: message.includes('Erreur') ? '#c62828' : '#2e7d32',
                  fontWeight: 500
                }}>
                  {message}
                </div>
              )}

              {/* Modal pour les options de synchronisation Microsoft */}
              {showMicrosoftOptions && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    background: 'var(--white-main)',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: 'var(--shadow-hover)',
                    border: '1px solid var(--gray-light)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '1.5rem',
                      paddingBottom: '1rem',
                      borderBottom: '2px solid #f0f0f0'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #0078d4, #106ebe)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px'
                      }}>
                        🔄
                      </div>
                      <h3 style={{
                        margin: 0,
                        color: 'var(--black-main)',
                        fontSize: '1.4rem',
                        fontWeight: '700'
                      }}>
                        Synchronisation Microsoft
                      </h3>
                      <button
                        onClick={() => setShowMicrosoftOptions(false)}
                        style={{
                          marginLeft: 'auto',
                          background: 'none',
                          border: 'none',
                          fontSize: '1.5rem',
                          cursor: 'pointer',
                          color: '#666',
                          padding: '5px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ color: 'var(--black-main)', marginBottom: '1rem' }}>Options de synchronisation :</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={microsoftOptions.calendar}
                            onChange={(e) => setMicrosoftOptions(prev => ({ ...prev, calendar: e.target.checked }))}
                          />
                          <span>📅 Synchroniser avec Microsoft Calendar</span>
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={microsoftOptions.teams}
                            onChange={(e) => setMicrosoftOptions(prev => ({ ...prev, teams: e.target.checked }))}
                          />
                          <span>🎥 Créer des réunions Teams</span>
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={microsoftOptions.notifications}
                            onChange={(e) => setMicrosoftOptions(prev => ({ ...prev, notifications: e.target.checked }))}
                          />
                          <span>📧 Envoyer des notifications par email</span>
                        </label>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setShowMicrosoftOptions(false)}
                        style={{
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '10px 20px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Annuler
                      </button>
                      
                      <button
                        onClick={handleMicrosoftSync}
                        disabled={microsoftSyncLoading}
                        style={{
                          background: microsoftSyncLoading ? '#ccc' : '#0078d4',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '10px 20px',
                          cursor: microsoftSyncLoading ? 'not-allowed' : 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        {microsoftSyncLoading ? 'Synchronisation...' : 'Synchroniser'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Affichage des résultats de synchronisation Microsoft */}
              {microsoftSyncResults && (
                <div style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  borderRadius: 6,
                  background: microsoftSyncResults.success ? '#e8f5e9' : '#ffebee',
                  color: microsoftSyncResults.success ? '#2e7d32' : '#c62828',
                  fontWeight: 500,
                  border: `1px solid ${microsoftSyncResults.success ? '#4caf50' : '#f44336'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span>{microsoftSyncResults.success ? '✅' : '❌'}</span>
                    <strong>{microsoftSyncResults.success ? 'Synchronisation réussie' : 'Erreur de synchronisation'}</strong>
                  </div>
                  
                  {microsoftSyncResults.details && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      {microsoftSyncResults.details.map((detail, index) => (
                        <div key={index}>• {detail}</div>
                      ))}
                    </div>
                  )}
                  
                  {microsoftSyncResults.error && (
                    <div style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                      Erreur: {microsoftSyncResults.error}
                    </div>
                  )}
                </div>
              )}

              {/* Modal/Panel pour afficher les suggestions Gemini AI */}
              {showSuggestions && geminiSuggestions && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    background: 'var(--white-main)',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    boxShadow: 'var(--shadow-hover)',
                    position: 'relative',
                    border: '1px solid var(--gray-light)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '1.5rem',
                      paddingBottom: '1rem',
                      borderBottom: '2px solid #f0f0f0'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px'
                      }}>
                        💡
                      </div>
                      <h3 style={{ 
                        margin: 0, 
                        color: 'var(--black-main)',
                        fontSize: '1.4rem',
                        fontWeight: '600'
                      }}>
                        Suggestions d'optimisation (Gemini AI)
                      </h3>
                      <button
                        onClick={() => setShowSuggestions(false)}
                        style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          background: 'none',
                          border: 'none',
                          fontSize: '24px',
                          cursor: 'pointer',
                          color: '#666',
                          padding: '5px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{
                      background: 'var(--white-soft)',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--gray-light)',
                      lineHeight: '1.6',
                      color: 'var(--black-main)',
                      fontSize: '14px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {geminiSuggestions}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal/Popup pour le chronomètre */}
              {showTimerModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    background: 'var(--white-main)',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: 'var(--shadow-hover)',
                    border: '1px solid var(--gray-light)',
                    position: 'relative',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.5rem',
                      paddingBottom: '1rem',
                      borderBottom: '2px solid var(--gray-light)'
                    }}>
                      <div style={{
                        background: timeUntilSunday.days <= 1 ? '#FF4444' : '#FFA500',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '15px',
                        fontSize: '24px'
                      }}>
                        {timeUntilSunday.days <= 1 ? '🚨' : '⏰'}
                      </div>
                      <h3 style={{ 
                        margin: 0, 
                        color: 'var(--black-main)',
                        fontSize: '1.4rem',
                        fontWeight: '600'
                      }}>
                        {timeUntilSunday.days <= 1 ? 'Alerte Planning!' : 'Prochain Planning'}
                      </h3>
                      <button
                        onClick={() => setShowTimerModal(false)}
                        style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          background: 'none',
                          border: 'none',
                          fontSize: '24px',
                          cursor: 'pointer',
                          color: '#666',
                          padding: '5px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div style={{
                      background: timeUntilSunday.days <= 1 ? 'var(--red-light)' : 'var(--white-soft)',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      border: `1px solid ${timeUntilSunday.days <= 1 ? 'var(--red-main)' : 'var(--gray-light)'}`,
                      marginBottom: '1.5rem'
                    }}>
                      <p style={{
                        margin: '0 0 1rem 0',
                        color: 'var(--black-main)',
                        fontSize: '1.1rem',
                        fontWeight: '500'
                      }}>
                        {timeUntilSunday.days <= 1 
                          ? '⚠️ Le nouveau planning sera généré dans moins de 2 jours!'
                          : 'Temps restant avant la génération du nouveau planning:'
                        }
                      </p>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          background: 'var(--red-main)',
                          color: 'var(--white-main)',
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '1.8rem', fontWeight: '700', fontFamily: 'monospace' }}>
                            {timeUntilSunday.days}
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>JOURS</div>
                        </div>
                        <div style={{
                          background: 'var(--red-main)',
                          color: 'var(--white-main)',
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '1.8rem', fontWeight: '700', fontFamily: 'monospace' }}>
                            {timeUntilSunday.hours}
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>HEURES</div>
                        </div>
                        <div style={{
                          background: 'var(--red-main)',
                          color: 'var(--white-main)',
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '1.8rem', fontWeight: '700', fontFamily: 'monospace' }}>
                            {timeUntilSunday.minutes}
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>MINUTES</div>
                        </div>
                        <div style={{
                          background: 'var(--red-main)',
                          color: 'var(--white-main)',
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '1.8rem', fontWeight: '700', fontFamily: 'monospace' }}>
                            {timeUntilSunday.seconds}
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>SECONDES</div>
                        </div>
                      </div>
                      
                      <p style={{
                        margin: 0,
                        color: 'var(--black-soft)',
                        fontSize: '0.9rem',
                        fontStyle: 'italic'
                      }}>
                        📅 Le nouveau planning sera disponible dimanche à 00:00
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setShowTimerModal(false)}
                      style={{
                        background: 'var(--red-main)',
                        color: 'var(--white-main)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem'
                      }}
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}

              {Object.keys(groupedPlanning).length > 0 && (
                <div className="planning-section">
                  <div className="section-title">Planning Généré</div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <div
                        className="stat-card active-view"
                        style={{
                          padding: '0.8rem 1.5rem',
                          border: '2px solid var(--gray-light)',
                          borderRadius: '0.5rem',
                          background: 'var(--red-main)',
                          color: 'var(--white-main)',
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        
                        }}
                      >
                        🎓 Par Classe
                      </div>
                    </div>
                  </div>
                  
                  {Object.entries(planningByClass)
                    .sort(([classeA], [classeB]) => classeA.localeCompare(classeB))
                    .map(([nomClasse, plannings]) => {
                    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
                    const creneaux = [
                      { debut: '09:00', fin: '12:15' },
                      { debut: '13:30', fin: '16:45' }
                    ];
                    
                    // Trier les plannings par jour et heure pour un affichage ordonné
                    const planningsOrdonnes = plannings.sort((a, b) => {
                      // Ordre des jours
                      const ordreJours = { 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4, 'Vendredi': 5 };
                      const jourA = ordreJours[a.jour] || 999;
                      const jourB = ordreJours[b.jour] || 999;
                      
                      if (jourA !== jourB) {
                        return jourA - jourB;
                      }
                      
                      // Si même jour, trier par heure
                      return a.heure_debut.localeCompare(b.heure_debut);
                    });
                    
                    // Créer un mapping des cours par jour et créneau
                    const coursMap = {};
                    planningsOrdonnes.forEach(cours => {
                      const key = `${cours.jour}-${cours.heure_debut}`;
                      coursMap[key] = cours;
                    });

                    return (
                      <div key={nomClasse} className="course-section" style={{ 
                        marginBottom: '2rem', 
                        background: 'var(--white-main)', 
                        borderRadius: '0.75rem', 
                        padding: '1.5rem', 
                        border: '1px solid var(--gray-light)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div className="course-header" style={{ 
                          marginBottom: '1.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '2px solid var(--red-main)',
                          paddingBottom: '1rem'
                        }}>
                          <h3 style={{ color: 'var(--red-main)', fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>
                            🎓 Emploi du temps - {nomClasse}
                          </h3>
                          <span className="course-code" style={{ 
                            background: 'var(--red-main)', 
                            color: 'var(--white-main)', 
                            padding: '0.5rem 1rem', 
                            borderRadius: '0.5rem', 
                            fontSize: '0.9rem', 
                            fontWeight: '600' 
                          }}>
                            {plannings.length} cours programmés
                          </span>
                        </div>
                        
                        {/* Tableau emploi du temps */}
                        <div style={{ 
                          overflowX: 'auto',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--gray-light)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                          <table className="table-dashboard planning-table" style={{ 
                            fontSize: '0.9rem'
                          }}>
                            <thead>
                              <tr style={{ background: 'var(--red-main)' }}>
                                <th className="planning-time-column">
                                  ⏰ Horaires
                                </th>
                                {jours.map(jour => (
                                  <th key={jour} className="planning-day-column">
                                    📅 {jour}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {creneaux.map((creneau, index) => (
                                <tr key={index} style={{ 
                                  background: index % 2 === 0 ? '#f8f9fa' : 'white',
                                  transition: 'background-color 0.2s ease'
                                }}>
                                  <td style={{ 
                                    padding: '1rem', 
                                    fontWeight: '700',
                                    color: 'var(--red-main)',
                                    border: '1px solid var(--gray-light)',
                                    textAlign: 'center',
                                    background: 'white'
                                  }}>
                                    {creneau.debut}<br/>-<br/>{creneau.fin}
                                  </td>
                                  {jours.map(jour => {
                                    const isPauseMercredi = jour === 'Mercredi' && creneau.debut === '13:30';
                                    const key = `${jour}-${creneau.debut}`;
                                    const cours = coursMap[key];
                                    
                                    return (
                                      <td key={jour} style={{ 
                                        padding: '0.8rem', 
                                        border: '1px solid var(--gray-light)',
                                        verticalAlign: 'middle',
                                        textAlign: 'center',
                                        minHeight: '100px',
                                        position: 'relative'
                                      }}>
                                        {isPauseMercredi ? (
                                          <div style={{ 
                                            color: 'var(--red-main)', 
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            background: '#ffebee',
                                            padding: '1rem',
                                            borderRadius: '0.5rem'
                                          }}>
                                            <span style={{ fontSize: '1.5rem' }}>⏸️</span>
                                            <span>PAUSE</span>
                                            <span style={{ fontSize: '0.7rem', fontWeight: '400' }}>Mercredi midi</span>
                                          </div>
                                        ) : cours ? (
                                          <div style={{ 
                                            fontSize: '0.85rem',
                                            padding: '0.8rem',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            gap: '0.4rem',
                                            cursor: 'pointer',
                                            borderRadius: '0.5rem',
                                            transition: 'all 0.2s ease',
                                            background: cours.mode_cours === 'en_ligne' ? '#e3f2fd' : '#e8f5e9'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.02)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(203, 9, 32, 0.2)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.boxShadow = 'none';
                                          }}
                                          >
                                            {cours.mode_cours !== 'en_ligne' && (
                                              <div style={{ 
                                                fontWeight: '700', 
                                                color: 'var(--red-main)',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.3rem'
                                              }}>
                                                <span>🏫</span>
                                                <span>{cours.nom_salle || `Salle ${cours.id_salle}` || 'Salle non définie'}</span>
                                              </div>
                                            )}
                                            
                                            {cours.mode_cours === 'en_ligne' && (
                                              <div style={{ 
                                                fontWeight: '700', 
                                                color: '#007bff',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.3rem'
                                              }}>
                                                <span>📡</span>
                                                <span>EN LIGNE</span>
                                              </div>
                                            )}
                                            
                                            <div style={{ 
                                              color: 'var(--black-main)', 
                                              fontWeight: '600',
                                              fontSize: '0.8rem',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '0.3rem'
                                            }}>
                                              <span>👨‍🏫</span>
                                              <span>{cours.nom_enseignant || 'Enseignant'}</span>
                                            </div>
                                            
                                            <div style={{ 
                                              color: 'var(--black-soft)', 
                                              fontSize: '0.75rem',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '0.3rem'
                                            }}>
                                              <span>📚</span>
                                              <span>{cours.matiere || 'Matière'}</span>
                                            </div>
                                            
                                            {cours.mode_cours === 'en_ligne' && (
                                              <div style={{ 
                                                marginTop: '0.2rem',
                                                padding: '0.1rem 0.4rem', 
                                                background: '#007bff', 
                                                color: 'white', 
                                                borderRadius: '0.2rem', 
                                                fontSize: '0.65rem',
                                                fontWeight: '600',
                                                display: 'inline-block'
                                              }}>
                                                EN LIGNE
                                              </div>
                                            )}
                                            
                                            
                                            
                                          </div>
                                        ) : (
                                          <div style={{ 
                                            color: 'var(--black-soft)', 
                                            fontSize: '0.8rem',
                                            opacity: 0.5,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            gap: '0.2rem'
                                          }}>
                                            <span style={{ fontSize: '1.5rem' }}>💤</span>
                                            <span>Libre</span>
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
                        
                        {/* Actions Microsoft pour la classe */}
                        {planningStatus === 'valide' && (
                          <div style={{
                            padding: '1rem',
                            background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                            borderTop: '1px solid #dee2e6',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}>
                           
                              
                            
                            
                            <div style={{
                              display: 'flex',
                              gap: '8px'
                            }}>
                             
                              
                            </div>
                          </div>
                        )}
                        
                        {/* Légende */}
                        <div style={{ padding: '1rem', background: '#f8f9fa', borderTop: '1px solid #eee' }}>
                          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <div style={{ width: '15px', height: '15px', background: '#e8f5e9', border: '1px solid #ddd' }}></div>
                              <span style={{ fontSize: '12px' }}>Cours programmé</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <div style={{ width: '15px', height: '15px', background: '#ffebee', border: '1px solid #ddd' }}></div>
                              <span style={{ fontSize: '12px' }}>Pause mercredi midi</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <div style={{ 
                                padding: '1px 4px', 
                                background: '#007bff', 
                                color: 'white', 
                                borderRadius: '2px', 
                                fontSize: '9px'
                              }}>
                                EN LIGNE
                              </div>
                              <span style={{ fontSize: '12px' }}>Cours en ligne</span>
                            </div>
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                            <strong>Horaires:</strong> Séance 1: 09:00-12:15, Séance 2: 13:30-16:45 (Lundi à Vendredi) • 
                            <strong> Cours programmés:</strong> {plannings.length} • 
                            <strong> Jours actifs:</strong> {[...new Set(plannings.map(p => p.jour))].length}/5
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {activeTab === 'soutenance' && (
            <div>
              {/* Interface de gestion des soutenances */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={fetchEtudiants}
                  disabled={loading}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px 20px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  🔄 Charger Étudiants
                </button>

                <button
                  onClick={genererPlanningSoutenance}
                  disabled={loading || selectedEtudiants.length === 0}
                  style={{
                    background: selectedEtudiants.length === 0 
                      ? 'var(--gray-light)' 
                      : 'linear-gradient(135deg, var(--green-main) 0%, #4caf50 100%)',
                    color: 'var(--white-main)',
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.5rem',
                    cursor: (loading || selectedEtudiants.length === 0) ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: selectedEtudiants.length === 0 ? 'none' : 'var(--shadow)',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  🎓 Générer Planning Soutenances
                </button>

                <button
                  onClick={reinitialiserSoutenances}
                  disabled={(() => {
                    const savedSoutenances = localStorage.getItem('planningSoutenances');
                    if (savedSoutenances) {
                      try {
                        const soutenancesData = JSON.parse(savedSoutenances);
                        return soutenancesData.some(s => s.status === 'valide');
                      } catch (e) {
                        return false;
                      }
                    }
                    return false;
                  })()}
                  style={{
                    background: (() => {
                      const savedSoutenances = localStorage.getItem('planningSoutenances');
                      if (savedSoutenances) {
                        try {
                          const soutenancesData = JSON.parse(savedSoutenances);
                          const isValidated = soutenancesData.some(s => s.status === 'valide');
                          return isValidated ? '#6c757d' : 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)';
                        } catch (e) {
                          return 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)';
                        }
                      }
                      return 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)';
                    })(),
                    color: 'var(--white-main)',
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.5rem',
                    cursor: (() => {
                      const savedSoutenances = localStorage.getItem('planningSoutenances');
                      if (savedSoutenances) {
                        try {
                          const soutenancesData = JSON.parse(savedSoutenances);
                          const isValidated = soutenancesData.some(s => s.status === 'valide');
                          return isValidated ? 'not-allowed' : 'pointer';
                        } catch (e) {
                          return 'pointer';
                        }
                      }
                      return 'pointer';
                    })(),
                    fontWeight: '700',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: 'var(--shadow)',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    opacity: (() => {
                      const savedSoutenances = localStorage.getItem('planningSoutenances');
                      if (savedSoutenances) {
                        try {
                          const soutenancesData = JSON.parse(savedSoutenances);
                          const isValidated = soutenancesData.some(s => s.status === 'valide');
                          return isValidated ? 0.6 : 1;
                        } catch (e) {
                          return 1;
                        }
                      }
                      return 1;
                    })()
                  }}
                >
                  {(() => {
                    const savedSoutenances = localStorage.getItem('planningSoutenances');
                    if (savedSoutenances) {
                      try {
                        const soutenancesData = JSON.parse(savedSoutenances);
                        const isValidated = soutenancesData.some(s => s.status === 'valide');
                        return isValidated ? '🔒 Planning Validé' : '🗑️ Réinitialiser';
                      } catch (e) {
                        return '🗑️ Réinitialiser';
                      }
                    }
                    return '🗑️ Réinitialiser';
                  })()}
                </button>

                {planningSoutenances.length > 0 && (
                  <button
                    onClick={validerPlanningSoutenances}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.75rem',
                      padding: '1rem 1.5rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: '700',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: 'var(--shadow)',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    ✅ Valider Planning
                  </button>
                )}
              </div>

              {/* Section de sélection des étudiants */}
              {etudiants.length > 0 && (
                <div style={{ 
                  marginBottom: '20px',
                  background: 'var(--white-main)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  border: '1px solid var(--gray-light)',
                  boxShadow: 'var(--shadow)'
                }}>
                  <h3 style={{ 
                    color: 'var(--black-main)', 
                    marginBottom: '1rem',
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    borderBottom: '2px solid var(--red-main)',
                    paddingBottom: '0.5rem'
                  }}>
                    🎓 Sélection des Étudiants ({selectedEtudiants.length} sélectionné{selectedEtudiants.length !== 1 ? 's' : ''})
                  </h3>
                  
                  {/* Barre de recherche */}
                  <div style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    gap: '1rem', 
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <input
                      type="text"
                      placeholder="🔍 Rechercher un étudiant..."
                      value={searchEtudiant}
                      onChange={(e) => setSearchEtudiant(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: '250px',
                        padding: '0.75rem 1rem',
                        border: '2px solid var(--gray-light)',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--red-main)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--gray-light)'}
                    />
                    <button
                      onClick={handleSelectAllEtudiants}
                      style={{
                        background: 'linear-gradient(135deg, var(--purple-main) 0%, #9c27b0 100%)',
                        color: 'var(--white-main)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1.25rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        boxShadow: 'var(--shadow)',
                        transition: 'all 0.3s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {etudiants.filter(etudiant =>
                        `${etudiant.prenom} ${etudiant.nom}`.toLowerCase().includes(searchEtudiant.toLowerCase())
                      ).every(etudiant =>
                        selectedEtudiants.some(selected => selected.idUser === etudiant.idUser)
                      ) ? '❌ Désélectionner Tout' : '✅ Sélectionner Tout'}
                    </button>
                  </div>

                  {/* Boutons de synchronisation Microsoft pour toutes les soutenances */}
                  {planningSoutenances.length > 0 && (
                    <div style={{
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <span style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: 'var(--black-main)'
                        }}>
                          🔄 Synchronisation Microsoft - Toutes les soutenances:
                        </span>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleBulkSyncSoutenancesToMicrosoft}
                            disabled={microsoftSyncLoading}
                            style={{
                              background: microsoftSyncLoading ? '#ccc' : '#0078d4',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              cursor: microsoftSyncLoading ? 'not-allowed' : 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {microsoftSyncLoading ? (
                              <>
                                <span>⏳</span>
                                Sync...
                              </>
                            ) : (
                              <>
                                <span>📅</span>
                                Sync Toutes
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={handleCreateAllSoutenancesTeamsMeetings}
                            disabled={microsoftSyncLoading}
                            style={{
                              background: microsoftSyncLoading ? '#ccc' : '#6264a7',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              cursor: microsoftSyncLoading ? 'not-allowed' : 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {microsoftSyncLoading ? (
                              <>
                                <span>⏳</span>
                                Teams...
                              </>
                            ) : (
                              <>
                                <span>🎥</span>
                                Teams Toutes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Bouton pour masquer/démasquer la liste */}
                  <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => setShowStudentList(!showStudentList)}
                      style={{
                        background: 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)',
                        color: 'var(--white-main)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        margin: '0 auto',
                        transition: 'all 0.3s ease',
                        boxShadow: 'var(--shadow)'
                      }}
                    >
                      {showStudentList ? '👁️ Masquer la liste' : '👁️‍🗨️ Afficher la liste'}
                    </button>
                  </div>

                  {/* Liste des étudiants */}
                  {showStudentList && (
                    <div className="students-list" style={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      border: '2px solid var(--gray-light)',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      animation: 'fadeInScale 0.3s ease-out',
                      background: 'var(--white-soft)'
                    }}>
                    {etudiants
                      .filter(etudiant =>
                        `${etudiant.prenom} ${etudiant.nom}`.toLowerCase().includes(searchEtudiant.toLowerCase())
                      )
                      .map(etudiant => {
                        const isSelected = selectedEtudiants.some(e => e.idUser === etudiant.idUser);
                        return (
                          <div
                            key={etudiant.idUser}
                            className="student-item"
                            onClick={() => handleEtudiantSelection(etudiant)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '1rem',
                              margin: '0.5rem 0',
                              background: isSelected 
                                ? 'linear-gradient(135deg, var(--red-light) 0%, rgba(203, 9, 32, 0.1) 100%)' 
                                : 'var(--white-main)',
                              border: `2px solid ${isSelected ? 'var(--red-main)' : 'var(--gray-light)'}`,
                              borderRadius: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: isSelected ? 'var(--shadow-hover)' : 'var(--shadow)',
                              transform: isSelected ? 'translateY(-2px)' : 'translateY(0)'
                            }}
                          >
                            <div className="student-avatar" style={{
                              width: '3rem',
                              height: '3rem',
                              background: isSelected 
                                ? 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)' 
                                : 'var(--red-light)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.5rem',
                              border: `2px solid ${isSelected ? 'var(--red-hover)' : 'var(--red-main)'}`,
                              marginRight: '1rem',
                              color: isSelected ? 'var(--white-main)' : 'var(--red-main)'
                            }}>
                              {isSelected ? '✓' : '👤'}
                            </div>
                            <div className="student-info" style={{ flex: 1 }}>
                              <h4 style={{
                                color: 'var(--black-main)',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                margin: '0 0 0.25rem 0'
                              }}>
                                {etudiant.prenom} {etudiant.nom}
                              </h4>
                              <p style={{
                                color: 'var(--black-soft)',
                                margin: '0',
                                fontSize: '0.9rem'
                              }}>
                                🎓 Classe: {etudiant.nomClasse || 'Non assignée'}
                              </p>
                              <p style={{
                                color: 'var(--black-soft)',
                                margin: '0',
                                fontSize: '0.85rem',
                                fontFamily: 'monospace'
                              }}>
                                🆔 ID: {etudiant.identifiant || etudiant.idUser}
                              </p>
                              <div className="student-status active" style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '1rem',
                                display: 'inline-block',
                                marginTop: '0.25rem',
                                background: isSelected ? 'var(--red-main)' : 'var(--red-light)',
                                color: isSelected ? 'var(--white-main)' : 'var(--red-main)'
                              }}>
                                {isSelected ? 'SÉLECTIONNÉ' : 'DISPONIBLE'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Affichage des soutenances planifiées - Style Dashboard */}
              {planningSoutenances.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  {/* Statistiques */}
                  {Object.keys(soutenanceStats).length > 0 && (
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      border: '2px solid #e0e0e0'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📊 Statistiques des Soutenances</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                        <div><strong>Total soutenances:</strong> {soutenanceStats.total_soutenances || 0}</div>
                        <div><strong>Salles utilisées:</strong> {soutenanceStats.salles_utilisees || 0}</div>
                        <div><strong>Enseignants mobilisés:</strong> {soutenanceStats.enseignants_mobilises || 0}</div>
                      </div>
                    </div>
                  )}

                  {/* Toggle pour changer de vue */}
                  <div className="flex justify-center mb-6">
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                      <button
                        onClick={() => setSoutenanceViewMode('day')}
                        className={`px-4 py-2 rounded-md transition-all ${
                          soutenanceViewMode === 'day'
                            ? 'bg-white shadow-sm text-blue-600 font-medium'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        📅 Vue par Jour
                      </button>
                      <button
                        onClick={() => setSoutenanceViewMode('student')}
                        className={`px-4 py-2 rounded-md transition-all ${
                          soutenanceViewMode === 'student'
                            ? 'bg-white shadow-sm text-blue-600 font-medium'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        🎓 Vue par Étudiant
                      </button>
                    </div>
                  </div>

                  {/* Affichage selon le mode sélectionné */}
                  {soutenanceViewMode === 'day' ? (
                    /* Vue par jour - Style dashboard */
                    <div className="stats-grid">
                      {Object.entries(groupedSoutenances).map(([jour, soutenances]) => (
                        <div key={jour} className="stat-card" style={{
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '1.5rem',
                          background: 'var(--white-main)',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--gray-light)',
                          boxShadow: 'var(--shadow)',
                          borderLeft: '4px solid var(--red-main)'
                        }}>
                          <div style={{
                            background: 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)',
                            color: 'var(--white-main)',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1rem',
                            width: '100%',
                            textAlign: 'center'
                          }}>
                            <h3 style={{ 
                              color: 'var(--white-main)', 
                              fontSize: '1.2rem', 
                              fontWeight: '700', 
                              margin: '0 0 0.25rem 0' 
                            }}>{jour}</h3>
                            <p style={{ 
                              color: 'rgba(255,255,255,0.9)', 
                              fontSize: '0.9rem', 
                              margin: 0 
                            }}>{soutenances.length} soutenance{soutenances.length > 1 ? 's' : ''}</p>
                          </div>
                          <div style={{ 
                            width: '100%', 
                            maxHeight: '400px', 
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                          }}>
                            {soutenances.map((soutenance, index) => (
                              <div key={index} style={{
                                borderLeft: '4px solid var(--red-main)',
                                background: 'var(--red-light)',
                                padding: '0.75rem',
                                borderRadius: '0 0.5rem 0.5rem 0',
                                border: '1px solid var(--gray-light)',
                                transition: 'all 0.3s ease'
                              }}>
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'flex-start', 
                                  marginBottom: '0.5rem' 
                                }}>
                                  <div style={{ 
                                    fontWeight: '600', 
                                    color: 'var(--black-main)',
                                    fontSize: '1rem'
                                  }}>{soutenance.nom_etudiant}</div>
                                  <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--black-soft)',
                                    margin: '2px 0',
                                    fontFamily: 'monospace'
                                  }}>🆔 {soutenance.identifiant_etudiant || soutenance.id_etudiant}</div>
                                  <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--black-soft)',
                                    margin: '2px 0'
                                  }}>🎓 {soutenance.classe_etudiant || 'Non spécifiée'}</div>
                                  <div style={{
                                    fontSize: '0.75rem',
                                    background: 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)',
                                    color: 'var(--white-main)',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '1rem',
                                    fontWeight: '600'
                                  }}>
                                    {soutenance.heure_debut} - {soutenance.heure_fin}
                                  </div>
                                </div>
                                <div style={{ 
                                  fontSize: '0.9rem', 
                                  color: 'var(--black-soft)', 
                                  marginBottom: '0.25rem' 
                                }}>
                                  📍 {soutenance.nom_salle}
                                </div>
                                <div style={{ 
                                  fontSize: '0.8rem', 
                                  color: 'var(--black-soft)' 
                                }}>
                                  👥 Jury: {soutenance.jury?.map(j => j.nom_enseignant).join(', ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Vue par étudiant - Style dashboard */
                    <div style={{
                      background: 'var(--white-main)',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--gray-light)',
                      boxShadow: 'var(--shadow)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)',
                        color: 'var(--white-main)',
                        padding: '1.5rem',
                        textAlign: 'center'
                      }}>
                        <h3 style={{ 
                          color: 'var(--white-main)', 
                          fontSize: '1.3rem', 
                          fontWeight: '700', 
                          margin: '0 0 0.5rem 0' 
                        }}>Planning par Étudiant</h3>
                        <p style={{ 
                          color: 'rgba(255,255,255,0.9)', 
                          fontSize: '1rem', 
                          margin: 0 
                        }}>{planningSoutenances.length} soutenance{planningSoutenances.length > 1 ? 's' : ''} programmée{planningSoutenances.length > 1 ? 's' : ''}</p>
                      </div>
                      <div style={{ 
                        padding: '1.5rem', 
                        maxHeight: '500px', 
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        {planningSoutenances.map((soutenance, index) => (
                          <div key={index} style={{
                            borderLeft: '4px solid var(--red-main)',
                            background: 'var(--red-light)',
                            padding: '1.25rem',
                            borderRadius: '0 0.75rem 0.75rem 0',
                            border: '1px solid var(--gray-light)',
                            boxShadow: 'var(--shadow)',
                            transition: 'all 0.3s ease'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'flex-start', 
                              marginBottom: '1rem' 
                            }}>
                              <div style={{ 
                                fontWeight: '700', 
                                color: 'var(--black-main)',
                                fontSize: '1.2rem'
                              }}>🎓 {soutenance.nom_etudiant}</div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--black-soft)',
                                margin: '5px 0',
                                fontFamily: 'monospace'
                              }}>🆔 ID: {soutenance.identifiant_etudiant || soutenance.id_etudiant}</div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--black-soft)',
                                margin: '5px 0'
                              }}>🎓 Classe: {soutenance.classe_etudiant || 'Non spécifiée'}</div>
                              <div style={{
                                fontSize: '0.8rem',
                                background: 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)',
                                color: 'var(--white-main)',
                                padding: '0.5rem 1rem',
                                borderRadius: '1rem',
                                fontWeight: '600'
                              }}>
                                {soutenance.jour}
                              </div>
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                              gap: '1rem',
                              fontSize: '0.95rem'
                            }}>
                              <div>
                                <div style={{ 
                                  color: 'var(--black-soft)', 
                                  marginBottom: '0.5rem' 
                                }}>
                                  🕐 <span style={{ fontWeight: '600' }}>{soutenance.heure_debut} - {soutenance.heure_fin}</span>
                                </div>
                                <div style={{ 
                                  color: 'var(--black-soft)' 
                                }}>
                                  📍 <span style={{ fontWeight: '600' }}>{soutenance.nom_salle}</span>
                                </div>
                              </div>
                              <div>
                                <div style={{ 
                                  color: 'var(--black-soft)',
                                  marginBottom: '0.5rem'
                                }}>
                                  👥 <span style={{ fontWeight: '600' }}>Jury:</span>
                                </div>
                                <div style={{ 
                                  color: 'var(--black-soft)', 
                                  fontSize: '0.85rem',
                                  lineHeight: '1.4'
                                }}>
                                  {soutenance.jury?.map(j => j.nom_enseignant).join(', ')}
                                </div>
                              </div>
                            </div>
                            <div style={{
                              marginTop: '1rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '10px'
                            }}>
                              {/* Boutons de synchronisation Microsoft pour soutenances */}
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleSyncSoutenanceToMicrosoft(soutenance)}
                                  style={{
                                    background: '#0078d4',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Synchroniser avec Microsoft Calendar"
                                >
                                  <span>📅</span>
                                  Calendar
                                </button>
                                
                                <button
                                  onClick={() => handleCreateSoutenanceTeamsMeeting(soutenance)}
                                  style={{
                                    background: '#6264a7',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Créer réunion Teams"
                                >
                                  <span>🎥</span>
                                  Teams
                                </button>
                              </div>
                              
                              <button
                                onClick={() => {
                                  setSelectedSoutenance(soutenance);
                                  setShowDetailModal(true);
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)',
                                  color: 'var(--white-main)',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  boxShadow: 'var(--shadow)'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = 'translateY(-2px)';
                                  e.target.style.boxShadow = 'var(--shadow-hover)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'translateY(0)';
                                  e.target.style.boxShadow = 'var(--shadow)';
                                }}
                              >
                                📋 Voir Détails
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

      {/* Modal pour afficher les détails de la soutenance */}
      {showDetailModal && selectedSoutenance && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--white-main)',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-hover)',
            border: '2px solid var(--red-light)'
          }}>
            {/* En-tête du modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid var(--red-light)'
            }}>
              <h3 style={{
                margin: 0,
                color: 'var(--red-main)',
                fontSize: '1.5rem',
                fontWeight: '700'
              }}>
                📋 Détails de la Soutenance
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: 'var(--red-main)',
                  color: 'var(--white-main)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Informations de l'étudiant */}
            <div style={{
              background: 'linear-gradient(135deg, var(--red-light) 0%, rgba(203, 9, 32, 0.1) 100%)',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--red-main)'
            }}>
              <h4 style={{
                margin: '0 0 1rem 0',
                color: 'var(--red-main)',
                fontSize: '1.3rem',
                fontWeight: '700'
              }}>
                🎓 {selectedSoutenance.nom_etudiant}
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div>
                  <strong style={{ color: 'var(--black-main)' }}>🆔 Identifiant:</strong>
                  <div style={{ fontFamily: 'monospace', color: 'var(--black-soft)' }}>
                    {selectedSoutenance.identifiant_etudiant || selectedSoutenance.id_etudiant}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--black-main)' }}>🎓 Classe:</strong>
                  <div style={{ color: 'var(--black-soft)' }}>
                    {selectedSoutenance.classe_etudiant || 'Non spécifiée'}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--black-main)' }}>📚 Niveau:</strong>
                  <div style={{ color: 'var(--black-soft)' }}>
                    {selectedSoutenance.niveau_etudiant || 'Non spécifié'}
                  </div>
                </div>
              </div>
            </div>

            {/* Informations de planification */}
            <div style={{
              background: 'var(--white-soft)',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--gray-light)'
            }}>
              <h4 style={{
                margin: '0 0 1rem 0',
                color: 'var(--black-main)',
                fontSize: '1.2rem',
                fontWeight: '600'
              }}>
                📅 Planning
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div>
                  <strong style={{ color: 'var(--black-main)' }}>📅 Jour:</strong>
                  <div style={{ 
                    color: 'var(--red-main)', 
                    fontWeight: '600',
                    fontSize: '1.1rem'
                  }}>
                    {selectedSoutenance.jour}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--black-main)' }}>🕐 Horaire:</strong>
                  <div style={{ 
                    color: 'var(--black-soft)',
                    fontWeight: '600'
                  }}>
                    {selectedSoutenance.heure_debut} - {selectedSoutenance.heure_fin}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--black-main)' }}>⏱️ Durée:</strong>
                  <div style={{ color: 'var(--black-soft)' }}>
                    {selectedSoutenance.duree_minutes} minutes
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--black-main)' }}>📍 Salle:</strong>
                  <div style={{ color: 'var(--black-soft)' }}>
                    {selectedSoutenance.nom_salle} ({selectedSoutenance.type_salle})
                  </div>
                </div>
              </div>
            </div>

            {/* Informations du jury */}
            <div style={{
              background: 'var(--white-soft)',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--gray-light)'
            }}>
              <h4 style={{
                margin: '0 0 1rem 0',
                color: 'var(--black-main)',
                fontSize: '1.2rem',
                fontWeight: '600'
              }}>
                👥 Composition du Jury
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {selectedSoutenance.jury?.map((membre, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: index === 0 
                      ? 'linear-gradient(135deg, var(--red-light) 0%, rgba(203, 9, 32, 0.1) 100%)'
                      : 'var(--white-main)',
                    borderRadius: '0.5rem',
                    border: `1px solid ${index === 0 ? 'var(--red-main)' : 'var(--gray-light)'}`
                  }}>
                    <div>
                      <div style={{
                        fontWeight: '600',
                        color: 'var(--black-main)',
                        fontSize: '1rem'
                      }}>
                        {membre.nom_enseignant}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--black-soft)'
                      }}>
                        📚 {membre.matiere}
                      </div>
                    </div>
                    <div style={{
                      background: index === 0 ? 'var(--red-main)' : 'var(--gray-main)',
                      color: 'var(--white-main)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {membre.role_jury}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bouton de fermeture */}
            <div style={{
              marginTop: '2rem',
              textAlign: 'center'
            }}>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: 'linear-gradient(135deg, var(--red-main) 0%, var(--red-hover) 100%)',
                  color: 'var(--white-main)',
                  border: 'none',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: 'var(--shadow)'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour afficher les étudiants */}
      {showStudentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--white-main)',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: 'var(--shadow-hover)',
            border: '1px solid var(--gray-light)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--black-main)' }}>Étudiants de la classe</h3>
              <button
                onClick={() => setShowStudentModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                Fonctionnalité temporairement désactivée
              </p>
            </div>
            
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button
                onClick={() => setShowStudentModal(false)}
                style={{
                  background: '#CB0920',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Historique des Plannings */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            width: '800px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              borderBottom: '2px solid var(--red-main)',
              paddingBottom: '1rem'
            }}>
              <h2 style={{ 
                color: 'var(--red-main)', 
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                📚 Historique des Plannings
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '5px'
                }}
              >
                ✕
              </button>
            </div>

            {planningHistory.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#666'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <h3>Aucun historique disponible</h3>
                <p>Les plannings précédents apparaîtront ici automatiquement</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {planningHistory
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      backgroundColor: '#f9f9f9',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <h4 style={{
                          color: 'var(--red-main)',
                          margin: '0 0 0.5rem 0',
                          fontSize: '1.1rem'
                        }}>
                          📅 Semaine {entry.weekInfo.weekNumber} - {entry.weekInfo.year}
                        </h4>
                        <p style={{
                          color: '#666',
                          margin: '0 0 0.5rem 0',
                          fontSize: '0.9rem'
                        }}>
                          Du {entry.weekInfo.startDate} au {entry.weekInfo.endDate}
                        </p>
                        <p style={{
                          color: '#888',
                          margin: 0,
                          fontSize: '0.8rem'
                        }}>
                          Créé le: {new Date(entry.createdAt).toLocaleDateString('fr-FR')} à {new Date(entry.createdAt).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => downloadFileFromHistory(entry)}
                          style={{
                            backgroundColor: 'var(--red-main)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#a00720'}
                          onMouseOut={(e) => e.target.style.backgroundColor = 'var(--red-main)'}
                        >
                          📄 Télécharger HTML
                        </button>
                        
                        <button
                          onClick={() => deleteHistoryEntry(entry.id)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                          title="Supprimer de l'historique"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      padding: '1rem',
                      border: '1px solid #e0e0e0'
                    }}>
                      <h5 style={{
                        color: '#333',
                        margin: '0 0 0.5rem 0',
                        fontSize: '0.9rem'
                      }}>
                        📊 Résumé du planning:
                      </h5>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.5rem',
                        fontSize: '0.8rem',
                        color: '#666'
                      }}>
                        <div>📚 Total cours: {entry.planningData.length}</div>
                        <div>🏫 Classes: {new Set(entry.planningData.map(p => p.nom_classe)).size}</div>
                        <div>👨‍🏫 Enseignants: {new Set(entry.planningData.map(p => p.nom_enseignant)).size}</div>
                        <div>🏢 Salles: {new Set(entry.planningData.map(p => p.nom_salle)).size}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              borderTop: '1px solid #e0e0e0',
              paddingTop: '1rem'
            }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour les détails des soutenances */}
      {showSoutenanceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>
              🎓 Détails du Planning des Soutenances
            </h2>

            {/* Statistiques détaillées */}
            {Object.keys(soutenanceStats).length > 0 && (
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '2px solid #e0e0e0'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>📊 Statistiques Complètes</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                  <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
                    <strong>Total soutenances:</strong> {soutenanceStats.total_soutenances || 0}
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '6px' }}>
                    <strong>Salles utilisées:</strong> {soutenanceStats.salles_utilisees || 0}
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '6px' }}>
                    <strong>Enseignants mobilisés:</strong> {soutenanceStats.enseignants_mobilises || 0}
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#fce4ec', borderRadius: '6px' }}>
                    <strong>Étudiants sélectionnés:</strong> {selectedEtudiants.length}
                  </div>
                </div>
              </div>
            )}

            {/* Liste détaillée des soutenances */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#333', marginBottom: '15px' }}>
                📋 Liste Complète des Soutenances ({planningSoutenances.length})
              </h3>
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '2px solid #e0e0e0',
                borderRadius: '8px'
              }}>
                {planningSoutenances.map((soutenance, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '20px',
                      borderBottom: index < planningSoutenances.length - 1 ? '1px solid #e0e0e0' : 'none',
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#007bff', fontSize: '18px' }}>
                          🎓 {soutenance.nom_etudiant}
                        </h4>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px', fontFamily: 'monospace' }}>
                          🆔 ID: {soutenance.identifiant_etudiant || soutenance.id_etudiant}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                          🎓 Classe: {soutenance.classe_etudiant || 'Non spécifiée'}
                        </div>
                        <div style={{ marginBottom: '10px', fontSize: '16px' }}>
                          <strong>📅 {soutenance.jour}</strong> - {soutenance.heure_debut} à {soutenance.heure_fin}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>🏢 Salle:</strong> {soutenance.nom_salle} ({soutenance.type_salle})
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>👨‍🎓 Niveau:</strong> {soutenance.niveau_etudiant}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>⏱️ Durée:</strong> {soutenance.duree_minutes} minutes
                        </div>
                        <div>
                          <strong>📅 Date:</strong> {soutenance.date_soutenance}
                        </div>
                      </div>
                      <div style={{ minWidth: '350px', marginLeft: '20px' }}>
                        <h5 style={{ margin: '0 0 15px 0', color: '#28a745', fontSize: '16px' }}>👥 Composition du Jury</h5>
                        {soutenance.jury && soutenance.jury.map((membre, juryIndex) => (
                          <div
                            key={juryIndex}
                            style={{
                              padding: '10px 15px',
                              margin: '8px 0',
                              backgroundColor: membre.role_jury === 'Président' ? '#d4edda' : '#e2e3e5',
                              border: `2px solid ${membre.role_jury === 'Président' ? '#c3e6cb' : '#d6d8db'}`,
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                              {membre.role_jury === 'Président' ? '👑' : '👨‍🏫'} {membre.nom_enseignant}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              <strong>Rôle:</strong> {membre.role_jury}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              <strong>Matière:</strong> {membre.matiere}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={validerPlanningSoutenances}
                disabled={loading}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 25px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '16px'
                }}
              >
                ✅ Valider et Sauvegarder
              </button>
              
              <button
                onClick={() => setShowSoutenanceModal(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 25px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '16px'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default Planning;
