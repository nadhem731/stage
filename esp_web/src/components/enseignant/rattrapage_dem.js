import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import Sidebar from '../Sidebar';
import '../../style/rattrapage_dem.css';

function RattrapageDem() {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState('rattrapage-demande');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [nouvelleDemande, setNouvelleDemande] = useState({
    motif: '',
    dateSeance: '',
    heureDebut: '',
    heureFin: '',
    classe: '',
    matiere: '',
    dateRattrapage: '',
    heureDebutRattrapage: '',
    heureFinRattrapage: '',
    sallePreferee: '',
    commentaire: ''
  });

  // États pour les données de référence
  const [classes, setClasses] = useState([]);
  const [salles, setSalles] = useState([]);
  const [seancesEnseignant, setSeancesEnseignant] = useState([]);
  const [seanceSelectionnee, setSeanceSelectionnee] = useState(null);
  const [datesOccupees, setDatesOccupees] = useState([]);
  const [creneauxOccupes, setCreneauxOccupes] = useState([]);
  const [disponibiliteMessage, setDisponibiliteMessage] = useState('');

  useEffect(() => {
    fetchDemandes();
    fetchClasses();
    fetchSalles();
    fetchSeancesEnseignant();
    fetchDatesOccupees();
  }, []);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('DEBUG Frontend: Token récupéré:', token ? token.substring(0, 20) + '...' : 'null');
      
      const response = await fetch('/api/rattrapages/enseignant', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('DEBUG Frontend: Status de la réponse:', response.status);
      console.log('DEBUG Frontend: Headers de la réponse:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('DEBUG Frontend: Données reçues:', data);
        console.log('DEBUG Frontend: Nombre de demandes:', data ? data.length : 0);
        setDemandes(data || []);
      } else {
        const errorData = await response.text();
        console.error('DEBUG Frontend: Erreur HTTP', response.status, errorData);
        setDemandes([]);
      }
    } catch (error) {
      console.error('DEBUG Frontend: Exception lors de la récupération:', error);
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/classes', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClasses(data || []);
      } else {
        console.error('Erreur lors de la récupération des classes');
        setClasses([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des classes:', error);
      setClasses([]);
    }
  };

  const fetchSalles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/salles', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSalles(data || []);
      } else {
        console.error('Erreur lors de la récupération des salles');
        setSalles([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des salles:', error);
      setSalles([]);
    }
  };

  const fetchSeancesEnseignant = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Récupérer les plannings (cours)
      const planningsResponse = await fetch('/api/plannings/seances/enseignant', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Récupérer les soutenances
      const soutenancesResponse = await fetch('/api/soutenances/seances/enseignant', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let seances = [];
      
      if (planningsResponse.ok) {
        const planningsData = await planningsResponse.json();
        seances = [...seances, ...planningsData];
      }
      
      if (soutenancesResponse.ok) {
        const soutenancesData = await soutenancesResponse.json();
        seances = [...seances, ...soutenancesData];
      }
      
      // Trier par date et heure
      seances.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.heureDebut);
        const dateB = new Date(b.date + ' ' + b.heureDebut);
        return dateA - dateB;
      });
      
      setSeancesEnseignant(seances);
    } catch (error) {
      console.error('Erreur lors de la récupération des séances:', error);
      setSeancesEnseignant([]);
    }
  };

  const fetchDatesOccupees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/rattrapages/dates-occupees', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDatesOccupees(data.datesOccupees || []);
        setCreneauxOccupes(data.creneauxOccupes || []);
      } else {
        console.error('Erreur lors de la récupération des créneaux occupés');
        setDatesOccupees([]);
        setCreneauxOccupes([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des dates occupées:', error);
      setDatesOccupees([]);
    }
  };

  const verifierDisponibilite = async (dateRattrapage, heureDebut, heureFin) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/rattrapages/verifier-disponibilite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dateRattrapage,
          heureDebut,
          heureFin
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.disponible) {
          setDisponibiliteMessage('✅ Créneau disponible');
        } else {
          setDisponibiliteMessage(`❌ ${data.message} - ${data.conflits?.join(', ')}`);
        }
        return data.disponible;
      } else {
        setDisponibiliteMessage('❌ Erreur lors de la vérification');
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setDisponibiliteMessage('❌ Erreur de connexion');
      return false;
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setNouvelleDemande(prev => ({
      ...prev,
      [name]: value
    }));

    // Vérifier la disponibilité quand tous les champs de créneau sont remplis
    if (name === 'dateRattrapage' || name === 'heureDebutRattrapage' || name === 'heureFinRattrapage') {
      const updatedDemande = { ...nouvelleDemande, [name]: value };
      
      if (updatedDemande.dateRattrapage && updatedDemande.heureDebutRattrapage && updatedDemande.heureFinRattrapage) {
        await verifierDisponibilite(
          updatedDemande.dateRattrapage,
          updatedDemande.heureDebutRattrapage + ':00',
          updatedDemande.heureFinRattrapage + ':00'
        );
      } else {
        setDisponibiliteMessage('');
      }
    }
  };

  const handleSeanceSelection = (seance) => {
    setSeanceSelectionnee(seance);
    setNouvelleDemande(prev => ({
      ...prev,
      dateSeance: seance.date,
      heureDebut: seance.heureDebut,
      heureFin: seance.heureFin,
      classe: seance.classe,
      matiere: seance.matiere,
      seanceId: seance.id
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      // Préparer les données à envoyer
      const demandeData = {
        idSeance: seanceSelectionnee?.id,
        dateAbsence: seanceSelectionnee?.date,
        heureDebutAbsence: seanceSelectionnee?.heureDebut,
        heureFinAbsence: seanceSelectionnee?.heureFin,
        classe: seanceSelectionnee?.classe,
        matiere: seanceSelectionnee?.matiere,
        motif: nouvelleDemande.motif,
        dateRattrapage: nouvelleDemande.dateRattrapage,
        heureDebutRattrapage: nouvelleDemande.heureDebutRattrapage,
        heureFinRattrapage: nouvelleDemande.heureFinRattrapage,
        sallePreferee: nouvelleDemande.sallePreferee,
        commentaire: nouvelleDemande.commentaire
      };

      const response = await fetch('/api/rattrapages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(demandeData)
      });

      if (response.ok) {
        // Recharger les demandes
        await fetchDemandes();
        
        // Réinitialiser le formulaire
        setNouvelleDemande({
          motif: '',
          dateRattrapage: '',
          heureDebutRattrapage: '',
          heureFinRattrapage: '',
          sallePreferee: '',
          commentaire: ''
        });
        setSeanceSelectionnee(null);
        setShowModal(false);
        
        setMessage('Demande de rattrapage créée avec succès !');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la création de la demande');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'en_attente': return '#f39c12';
      case 'approuve': return '#27ae60';
      case 'refuse': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatutText = (statut) => {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'approuve': return 'Approuvé';
      case 'refuse': return 'Refusé';
      default: return 'Inconnu';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <div className="rattrapage-container">
        <div className="rattrapage-header">
          <div className="header-content">
            <h1 className="rattrapage-title">📝 Demandes de Rattrapage</h1>
            <p className="rattrapage-subtitle">
              Gérez vos demandes de rattrapage de cours
            </p>
          </div>
          <button 
            className="btn-nouvelle-demande"
            onClick={() => setShowModal(true)}
          >
            ➕ Nouvelle Demande
          </button>
        </div>

      {/* Indicateurs de statut */}
      <div className="status-indicators">
        <div className="status-card en-attente">
          <div className="status-icon">⏳</div>
          <div className="status-content">
            <h3>{demandes.filter(d => d.statut === 'en_attente').length}</h3>
            <p>En attente</p>
          </div>
        </div>
        <div className="status-card approuve">
          <div className="status-icon">✅</div>
          <div className="status-content">
            <h3>{demandes.filter(d => d.statut === 'approuve').length}</h3>
            <p>Approuvées</p>
          </div>
        </div>
        <div className="status-card refuse">
          <div className="status-icon">❌</div>
          <div className="status-content">
            <h3>{demandes.filter(d => d.statut === 'refuse').length}</h3>
            <p>Refusées</p>
          </div>
        </div>
      </div>

      {/* Guide d'utilisation - Version compacte */}
      {demandes.length === 0 && (
        <div className="guide-section-compact">
          <div className="guide-card">
            <h3>🚀 Comment ça marche ?</h3>
            <div className="guide-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Sélectionnez votre séance</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Proposez un créneau</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Attendez la validation</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des demandes */}
      <div className="demandes-section">
        <h3>📋 Mes Demandes</h3>
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Chargement des demandes...</p>
          </div>
        ) : demandes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Aucune demande</h3>
            <p>Vous n'avez pas encore soumis de demande de rattrapage.</p>
            <button 
              className="btn-premiere-demande"
              onClick={() => setShowModal(true)}
            >
              Créer ma première demande
            </button>
          </div>
        ) : (
          <div className="demandes-grid">
            {demandes.map((demande, index) => (
              <div key={index} className="demande-card">
                <div className="demande-header">
                  <div className="demande-info">
                    <h4>{demande.matiere}</h4>
                    <p className="classe-info">Classe: {demande.classe}</p>
                  </div>
                  <div 
                    className="statut-badge"
                    style={{ backgroundColor: getStatutColor(demande.statut) }}
                  >
                    {getStatutText(demande.statut)}
                  </div>
                </div>
                
                <div className="demande-details">
                  <div className="detail-row">
                    <span className="detail-label">📅 Séance manquée:</span>
                    <span className="detail-value">
                      {demande.dateAbsence} ({demande.heureDebutAbsence} - {demande.heureFinAbsence})
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🔄 Rattrapage proposé:</span>
                    <span className="detail-value">
                      {demande.dateRattrapageProposee} ({demande.heureDebutRattrapage} - {demande.heureFinRattrapage})
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🏫 Salle préférée:</span>
                    <span className="detail-value">{demande.sallePreferee || 'Non spécifiée'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📝 Motif:</span>
                    <span className="detail-value">{demande.motif}</span>
                  </div>
                  {demande.commentaire && (
                    <div className="detail-row">
                      <span className="detail-label">💬 Commentaire:</span>
                      <span className="detail-value">{demande.commentaire}</span>
                    </div>
                  )}
                  {demande.messageAdmin && demande.statut === 'refuse' && (
                    <div className="message-admin">
                      <div className="message-admin-header">
                        <span className="admin-icon">🤖</span>
                        <span className="admin-title">Message de l'administration</span>
                      </div>
                      <div className="message-admin-content">
                        {demande.messageAdmin.split('\n').map((line, index) => (
                          <div key={index} className="message-line">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de nouvelle demande */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📝 Nouvelle Demande de Rattrapage</h2>
              <button 
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="demande-form">
              {/* Étape 1: Sélection de séance */}
              <div className="form-step">
                <div className="step-header">
                  <span className="step-number">1</span>
                  <h3>Choisir la séance à rattraper</h3>
                </div>
                
                {seancesEnseignant.length > 0 ? (
                  <div className="seances-list">
                    {seancesEnseignant.map((seance) => (
                      <div 
                        key={seance.id} 
                        className={`seance-item ${seanceSelectionnee?.id === seance.id ? 'selected' : ''}`}
                        onClick={() => handleSeanceSelection(seance)}
                      >
                        <div className="seance-info">
                          <div className="seance-main">
                            <h4>{seance.matiere}</h4>
                            <span className="seance-badge">{seance.type}</span>
                          </div>
                          <div className="seance-meta">
                            <span>📅 {new Date(seance.date).toLocaleDateString('fr-FR')}</span>
                            <span>⏰ {seance.heureDebut} - {seance.heureFin}</span>
                            <span>🎓 {seance.classe}</span>
                          </div>
                        </div>
                        <div className="seance-select">
                          {seanceSelectionnee?.id === seance.id ? (
                            <div className="selected-check">✓</div>
                          ) : (
                            <div className="select-circle"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-small">
                    <p>Aucune séance programmée trouvée</p>
                  </div>
                )}
              </div>

              {/* Étape 2: Motif */}
              {seanceSelectionnee && (
                <div className="form-step">
                  <div className="step-header">
                    <span className="step-number">2</span>
                    <h3>Motif de l'absence</h3>
                  </div>
                  <div className="form-group">
                    <textarea
                      name="motif"
                      value={nouvelleDemande.motif}
                      onChange={handleInputChange}
                      placeholder="Expliquez brièvement la raison de votre absence..."
                      rows="3"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Étape 3: Proposition de rattrapage */}
              {seanceSelectionnee && nouvelleDemande.motif && (
                <div className="form-step">
                  <div className="step-header">
                    <span className="step-number">3</span>
                    <h3>Proposer un créneau de rattrapage</h3>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>📅 Date proposée</label>
                      <input
                        type="date"
                        name="dateRattrapage"
                        value={nouvelleDemande.dateRattrapage}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                      {datesOccupees.includes(nouvelleDemande.dateRattrapage) && (
                        <div className="warning-message">
                          ⚠️ Vous avez déjà des cours ou soutenances ce jour-là
                          <div className="creneaux-occupes-details">
                            {creneauxOccupes
                              .filter(creneau => creneau.date === nouvelleDemande.dateRattrapage)
                              .map((creneau, index) => (
                                <div key={index} className="creneau-occupe">
                                  📅 {creneau.type === 'cours' ? '📚' : '🎓'} {creneau.matiere} 
                                  ({creneau.heureDebut} - {creneau.heureFin})
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>⏰ Heure de début</label>
                      <input
                        type="time"
                        name="heureDebutRattrapage"
                        value={nouvelleDemande.heureDebutRattrapage}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>⏰ Heure de fin</label>
                      <input
                        type="time"
                        name="heureFinRattrapage"
                        value={nouvelleDemande.heureFinRattrapage}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Message de disponibilité */}
                  {disponibiliteMessage && (
                    <div className={`availability-message ${disponibiliteMessage.includes('✅') ? 'success' : 'error'}`}>
                      {disponibiliteMessage}
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label>🏫 Salle préférée (optionnel)</label>
                    <select
                      name="sallePreferee"
                      value={nouvelleDemande.sallePreferee}
                      onChange={handleInputChange}
                    >
                      <option value="">Aucune préférence</option>
                      {salles.map(salle => (
                        <option key={salle.idSalle} value={salle.numSalle}>
                          {salle.numSalle} - {typeof salle.typeSalle === 'string' ? salle.typeSalle : (salle.typeSalle?.nom || 'Type non spécifié')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>💬 Commentaire (optionnel)</label>
                    <textarea
                      name="commentaire"
                      value={nouvelleDemande.commentaire}
                      onChange={handleInputChange}
                      placeholder="Informations supplémentaires..."
                      rows="2"
                    />
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={!seanceSelectionnee}
                >
                  📤 Soumettre la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Messages d'erreur et de succès */}
      {error && (
        <div className="alert alert-error">
          <span>❌ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      
      {message && (
        <div className="alert alert-success">
          <span>✅ {message}</span>
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}
      </div>
    </div>
  );
}

export default RattrapageDem;