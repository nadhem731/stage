import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import EnseignantLayout from './EnseignantLayout';
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
      
      const response = await api.get('/api/rattrapages/enseignant', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      console.log('DEBUG Frontend: Status de la réponse:', response.status);
      console.log('DEBUG Frontend: Données reçues:', response.data);
      console.log('DEBUG Frontend: Nombre de demandes:', response.data ? response.data.length : 0);
      setDemandes(response.data || []);
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
      const response = await api.get('/api/classes', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      setClasses(response.data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des classes:', error);
      setClasses([]);
    }
  };

  const fetchSalles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/salles', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      setSalles(response.data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des salles:', error);
      setSalles([]);
    }
  };

  const fetchSeancesEnseignant = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Récupérer les plannings (cours)
      const planningsResponse = await api.get('/api/plannings/seances/enseignant', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      // Récupérer les soutenances
      const soutenancesResponse = await api.get('/api/soutenances/seances/enseignant', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      let seances = [];
      
      if (planningsResponse.data) {
        seances = [...seances, ...planningsResponse.data];
      }
      
      if (soutenancesResponse.data) {
        seances = [...seances, ...soutenancesResponse.data];
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
      const response = await api.get('/api/rattrapages/dates-occupees', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      setDatesOccupees(response.data.datesOccupees || []);
      setCreneauxOccupes(response.data.creneauxOccupes || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des dates occupées:', error);
      setDatesOccupees([]);
    }
  };

  const verifierDisponibilite = async (dateRattrapage, heureDebut, heureFin) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/rattrapages/verifier-disponibilite', {
        dateRattrapage,
        heureDebut,
        heureFin
      });

      if (response.data.disponible) {
        setDisponibiliteMessage('✅ Créneau disponible');
      } else {
        setDisponibiliteMessage(`❌ ${response.data.message} - ${response.data.conflits?.join(', ')}`);
      }
      return response.data.disponible;
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

      await api.post('/api/rattrapages', demandeData);

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
    <EnseignantLayout
      title="📝 Demandes de Rattrapage"
      subtitle="Gérez vos demandes de rattrapage de cours et suivez leur statut"
      loading={loading}
      loadingMessage="Chargement des demandes..."
      showRefresh={true}
      onRefresh={() => fetchDemandes()}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button 
          onClick={() => setShowModal(true)}
          style={{
            background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(203, 9, 32, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 16px rgba(203, 9, 32, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(203, 9, 32, 0.3)';
          }}
        >
          ➕ Nouvelle Demande
        </button>
      </div>

      {/* Statistiques des demandes */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          color: 'white',
          boxShadow: '0 4px 20px rgba(243, 156, 18, 0.2)',
          transition: 'transform 0.3s ease'
        }}
        onMouseEnter={(e) => e.target.style.transform = 'translateY(-4px)'}
        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {demandes.filter(d => d.statut === 'en_attente').length}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', opacity: '0.9' }}>
                En attente
              </div>
            </div>
            <div style={{ fontSize: '3rem', opacity: '0.7' }}>⏳</div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          color: 'white',
          boxShadow: '0 4px 20px rgba(39, 174, 96, 0.2)',
          transition: 'transform 0.3s ease'
        }}
        onMouseEnter={(e) => e.target.style.transform = 'translateY(-4px)'}
        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {demandes.filter(d => d.statut === 'approuve').length}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', opacity: '0.9' }}>
                Approuvées
              </div>
            </div>
            <div style={{ fontSize: '3rem', opacity: '0.7' }}>✅</div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          color: 'white',
          boxShadow: '0 4px 20px rgba(231, 76, 60, 0.2)',
          transition: 'transform 0.3s ease'
        }}
        onMouseEnter={(e) => e.target.style.transform = 'translateY(-4px)'}
        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {demandes.filter(d => d.statut === 'refuse').length}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', opacity: '0.9' }}>
                Refusées
              </div>
            </div>
            <div style={{ fontSize: '3rem', opacity: '0.7' }}>❌</div>
          </div>
        </div>
      </div>

      {/* Guide d'utilisation - Version moderne */}
      {demandes.length === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
            <h3 style={{ color: '#CB0920', fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Comment créer une demande de rattrapage ?
            </h3>
            <p style={{ color: '#666', fontSize: '1rem' }}>
              Suivez ces étapes simples pour soumettre votre demande
            </p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem' 
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
                color: 'white',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 auto 1rem auto'
              }}>
                1
              </div>
              <h4 style={{ color: '#333', marginBottom: '0.5rem' }}>Sélectionnez votre séance</h4>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Choisissez la séance que vous avez manquée
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                color: 'white',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 auto 1rem auto'
              }}>
                2
              </div>
              <h4 style={{ color: '#333', marginBottom: '0.5rem' }}>Proposez un créneau</h4>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Indiquez votre disponibilité pour le rattrapage
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                color: 'white',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 auto 1rem auto'
              }}>
                3
              </div>
              <h4 style={{ color: '#333', marginBottom: '0.5rem' }}>Attendez la validation</h4>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                L'administration traitera votre demande
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des demandes */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          color: '#CB0920', 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          📋 Mes Demandes
          <span style={{
            background: '#f8f9fa',
            color: '#666',
            fontSize: '0.8rem',
            fontWeight: '600',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            border: '1px solid #dee2e6'
          }}>
            {demandes.length} demande{demandes.length !== 1 ? 's' : ''}
          </span>
        </h3>
        
        {demandes.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
            <h3 style={{ color: '#333', fontSize: '1.3rem', fontWeight: '600', marginBottom: '1rem' }}>
              Aucune demande de rattrapage
            </h3>
            <p style={{ color: '#666', fontSize: '1rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
              Vous n'avez pas encore soumis de demande de rattrapage. Créez votre première demande pour commencer.
            </p>
            <button 
              onClick={() => setShowModal(true)}
              style={{
                background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(203, 9, 32, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(203, 9, 32, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(203, 9, 32, 0.3)';
              }}
            >
              ➕ Créer ma première demande
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {demandes.map((demande, index) => (
              <div key={index} style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid #f0f0f0',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-4px)';
                e.target.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
              }}
              >
                <div style={{
                  background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
                  color: 'white',
                  padding: '1.5rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    right: '-50%',
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    transform: 'rotate(45deg)'
                  }}></div>
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>
                          {demande.matiere}
                        </h4>
                        <p style={{ margin: '0.25rem 0 0 0', opacity: '0.9', fontSize: '0.9rem' }}>
                          Classe: {demande.classe}
                        </p>
                      </div>
                      <div style={{
                        background: getStatutColor(demande.statut),
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}>
                        {getStatutText(demande.statut)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>📅</span>
                        <span style={{ fontWeight: '600', color: '#495057' }}>Séance manquée</span>
                      </div>
                      <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                        {demande.dateAbsence} • {demande.heureDebutAbsence} - {demande.heureFinAbsence}
                      </div>
                    </div>

                    <div style={{
                      background: '#e8f5e9',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid #c8e6c9'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🔄</span>
                        <span style={{ fontWeight: '600', color: '#2e7d32' }}>Rattrapage proposé</span>
                      </div>
                      <div style={{ color: '#388e3c', fontSize: '0.9rem' }}>
                        {demande.dateRattrapageProposee} • {demande.heureDebutRattrapage} - {demande.heureFinRattrapage}
                      </div>
                    </div>

                    <div style={{
                      background: '#fff3e0',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid #ffcc02'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🏫</span>
                        <span style={{ fontWeight: '600', color: '#ef6c00' }}>Salle préférée</span>
                      </div>
                      <div style={{ color: '#f57c00', fontSize: '0.9rem' }}>
                        {demande.sallePreferee || 'Non spécifiée'}
                      </div>
                    </div>

                    <div style={{
                      background: '#f3e5f5',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid #ce93d8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>📝</span>
                        <span style={{ fontWeight: '600', color: '#7b1fa2' }}>Motif</span>
                      </div>
                      <div style={{ color: '#8e24aa', fontSize: '0.9rem', lineHeight: '1.4' }}>
                        {demande.motif}
                      </div>
                    </div>

                    {demande.commentaire && (
                      <div style={{
                        background: '#e3f2fd',
                        borderRadius: '8px',
                        padding: '1rem',
                        border: '1px solid #90caf9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>💬</span>
                          <span style={{ fontWeight: '600', color: '#1976d2' }}>Commentaire</span>
                        </div>
                        <div style={{ color: '#1e88e5', fontSize: '0.9rem', lineHeight: '1.4' }}>
                          {demande.commentaire}
                        </div>
                      </div>
                    )}

                    {demande.messageAdmin && demande.statut === 'refuse' && (
                      <div style={{
                        background: '#ffebee',
                        borderRadius: '8px',
                        padding: '1rem',
                        border: '1px solid #ffcdd2'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>🤖</span>
                          <span style={{ fontWeight: '600', color: '#d32f2f' }}>Message de l'administration</span>
                        </div>
                        <div style={{ 
                          color: '#c62828', 
                          fontSize: '0.9rem', 
                          lineHeight: '1.4',
                          background: 'white',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #ffcdd2'
                        }}>
                          {demande.messageAdmin.split('\n').map((line, index) => (
                            <div key={index} style={{ marginBottom: index < demande.messageAdmin.split('\n').length - 1 ? '0.5rem' : 0 }}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de nouvelle demande */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(2px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'modalSlideIn 0.3s ease-out',
            scrollbarWidth: 'thin',
            scrollbarColor: '#CB0920 #f1f1f1'
          }}
          className="custom-scrollbar"
          >
            <div style={{
              background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
              color: 'white',
              padding: '2rem',
              borderRadius: '20px 20px 0 0',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-50%',
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                transform: 'rotate(45deg)'
              }}></div>
              
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>
                    📝 Nouvelle Demande de Rattrapage
                  </h2>
                  <p style={{ margin: '0.5rem 0 0 0', opacity: '0.9', fontSize: '1rem' }}>
                    Remplissez le formulaire pour soumettre votre demande
                  </p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    color: 'white',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div style={{ padding: '2rem' }}>
              {/* Indicateur de progression */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '2rem',
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    <span>1</span>
                    <span>Séance</span>
                  </div>
                  
                  <div style={{ 
                    width: '30px', 
                    height: '2px', 
                    background: seanceSelectionnee ? '#CB0920' : '#e0e0e0',
                    transition: 'background 0.3s ease'
                  }}></div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    background: seanceSelectionnee 
                      ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' 
                      : '#e9ecef',
                    color: seanceSelectionnee ? 'white' : '#6c757d',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}>
                    <span>2</span>
                    <span>Motif</span>
                  </div>
                  
                  <div style={{ 
                    width: '30px', 
                    height: '2px', 
                    background: (seanceSelectionnee && nouvelleDemande.motif) ? '#CB0920' : '#e0e0e0',
                    transition: 'background 0.3s ease'
                  }}></div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    background: (seanceSelectionnee && nouvelleDemande.motif) 
                      ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' 
                      : '#e9ecef',
                    color: (seanceSelectionnee && nouvelleDemande.motif) ? 'white' : '#6c757d',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}>
                    <span>3</span>
                    <span>Créneau</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Étape 1: Sélection de séance */}
                <div style={{ marginBottom: '2rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #f0f0f0'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: '700'
                  }}>
                    1
                  </div>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1.3rem', fontWeight: '600' }}>
                    Choisir la séance à rattraper
                  </h3>
                </div>
                
                {seancesEnseignant.length > 0 ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.75rem',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '0.5rem'
                  }}>
                    {seancesEnseignant.map((seance) => (
                      <div 
                        key={seance.id} 
                        onClick={() => handleSeanceSelection(seance)}
                        style={{
                          background: seanceSelectionnee?.id === seance.id 
                            ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' 
                            : 'white',
                          border: seanceSelectionnee?.id === seance.id 
                            ? '2px solid #4caf50' 
                            : '1px solid #e0e0e0',
                          borderRadius: '12px',
                          padding: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: seanceSelectionnee?.id === seance.id 
                            ? '0 4px 12px rgba(76, 175, 80, 0.2)' 
                            : '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                          if (seanceSelectionnee?.id !== seance.id) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (seanceSelectionnee?.id !== seance.id) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                              <h4 style={{ 
                                margin: 0, 
                                color: seanceSelectionnee?.id === seance.id ? '#2e7d32' : '#333',
                                fontSize: '1.1rem',
                                fontWeight: '600'
                              }}>
                                {seance.matiere}
                              </h4>
                              <span style={{
                                background: seanceSelectionnee?.id === seance.id ? '#4caf50' : '#f0f0f0',
                                color: seanceSelectionnee?.id === seance.id ? 'white' : '#666',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: '600'
                              }}>
                                {seance.type}
                              </span>
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              gap: '1rem', 
                              fontSize: '0.9rem',
                              color: seanceSelectionnee?.id === seance.id ? '#388e3c' : '#666'
                            }}>
                              <span>📅 {new Date(seance.date).toLocaleDateString('fr-FR')}</span>
                              <span>⏰ {seance.heureDebut} - {seance.heureFin}</span>
                              <span>🎓 {seance.classe}</span>
                            </div>
                          </div>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: seanceSelectionnee?.id === seance.id ? '2px solid #4caf50' : '2px solid #ddd',
                            background: seanceSelectionnee?.id === seance.id ? '#4caf50' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: '700'
                          }}>
                            {seanceSelectionnee?.id === seance.id && '✓'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📅</div>
                    <p style={{ color: '#666', margin: 0 }}>Aucune séance programmée trouvée</p>
                  </div>
                )}
              </div>

              {/* Étape 2: Motif */}
              {seanceSelectionnee && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px solid #f0f0f0'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: '700'
                    }}>
                      2
                    </div>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1.3rem', fontWeight: '600' }}>
                      Motif de l'absence
                    </h3>
                  </div>
                  <div>
                    <textarea
                      name="motif"
                      value={nouvelleDemande.motif}
                      onChange={handleInputChange}
                      placeholder="Expliquez brièvement la raison de votre absence..."
                      rows="4"
                      required
                      style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '2px solid #e0e0e0',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        transition: 'border-color 0.3s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#CB0920'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                  </div>
                </div>
              )}

              {/* Étape 3: Proposition de rattrapage */}
              {seanceSelectionnee && nouvelleDemande.motif && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px solid #f0f0f0'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: '700'
                    }}>
                      3
                    </div>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1.3rem', fontWeight: '600' }}>
                      Proposer un créneau de rattrapage
                    </h3>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        fontWeight: '600', 
                        color: '#333',
                        fontSize: '0.9rem'
                      }}>
                        📅 Date proposée
                      </label>
                      <input
                        type="date"
                        name="dateRattrapage"
                        value={nouvelleDemande.dateRattrapage}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e0e0e0',
                          fontSize: '1rem',
                          transition: 'border-color 0.3s ease',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#CB0920'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      />
                      {datesOccupees.includes(nouvelleDemande.dateRattrapage) && (
                        <div style={{
                          background: '#fff3cd',
                          border: '1px solid #ffeaa7',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          marginTop: '0.5rem',
                          fontSize: '0.9rem'
                        }}>
                          <div style={{ color: '#856404', fontWeight: '600', marginBottom: '0.5rem' }}>
                            ⚠️ Vous avez déjà des cours ou soutenances ce jour-là
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {creneauxOccupes
                              .filter(creneau => creneau.date === nouvelleDemande.dateRattrapage)
                              .map((creneau, index) => (
                                <div key={index} style={{ 
                                  color: '#b7791f', 
                                  fontSize: '0.8rem',
                                  padding: '0.25rem 0.5rem',
                                  background: 'rgba(255, 193, 7, 0.1)',
                                  borderRadius: '4px'
                                }}>
                                  {creneau.type === 'cours' ? '📚' : '🎓'} {creneau.matiere} 
                                  ({creneau.heureDebut} - {creneau.heureFin})
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        fontWeight: '600', 
                        color: '#333',
                        fontSize: '0.9rem'
                      }}>
                        ⏰ Heure de début
                      </label>
                      <input
                        type="time"
                        name="heureDebutRattrapage"
                        value={nouvelleDemande.heureDebutRattrapage}
                        onChange={handleInputChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e0e0e0',
                          fontSize: '1rem',
                          transition: 'border-color 0.3s ease',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#CB0920'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      />
                    </div>
                    
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        fontWeight: '600', 
                        color: '#333',
                        fontSize: '0.9rem'
                      }}>
                        ⏰ Heure de fin
                      </label>
                      <input
                        type="time"
                        name="heureFinRattrapage"
                        value={nouvelleDemande.heureFinRattrapage}
                        onChange={handleInputChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e0e0e0',
                          fontSize: '1rem',
                          transition: 'border-color 0.3s ease',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#CB0920'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      />
                    </div>
                  </div>

                  {/* Message de disponibilité */}
                  {disponibiliteMessage && (
                    <div style={{
                      background: disponibiliteMessage.includes('✅') 
                        ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)' 
                        : 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
                      color: disponibiliteMessage.includes('✅') ? '#155724' : '#721c24',
                      border: `1px solid ${disponibiliteMessage.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      marginBottom: '1rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {disponibiliteMessage}
                    </div>
                  )}
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '1rem' 
                  }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        fontWeight: '600', 
                        color: '#333',
                        fontSize: '0.9rem'
                      }}>
                        🏫 Salle préférée (optionnel)
                      </label>
                      <select
                        name="sallePreferee"
                        value={nouvelleDemande.sallePreferee}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e0e0e0',
                          fontSize: '1rem',
                          background: 'white',
                          cursor: 'pointer',
                          transition: 'border-color 0.3s ease',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#CB0920'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      >
                        <option value="">Aucune préférence</option>
                        {salles.map(salle => (
                          <option key={salle.idSalle} value={salle.numSalle}>
                            {salle.numSalle} - {typeof salle.typeSalle === 'string' ? salle.typeSalle : (salle.typeSalle?.nom || 'Type non spécifié')}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        fontWeight: '600', 
                        color: '#333',
                        fontSize: '0.9rem'
                      }}>
                        💬 Commentaire (optionnel)
                      </label>
                      <textarea
                        name="commentaire"
                        value={nouvelleDemande.commentaire}
                        onChange={handleInputChange}
                        placeholder="Informations supplémentaires..."
                        rows="3"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e0e0e0',
                          fontSize: '1rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          transition: 'border-color 0.3s ease',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#CB0920'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '1rem', 
                paddingTop: '2rem',
                borderTop: '2px solid #f0f0f0',
                marginTop: '2rem'
              }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{
                    background: '#f8f9fa',
                    color: '#6c757d',
                    border: '2px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e9ecef';
                    e.target.style.borderColor = '#dee2e6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#e9ecef';
                  }}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={!seanceSelectionnee || !nouvelleDemande.motif || loading}
                  style={{
                    background: (seanceSelectionnee && nouvelleDemande.motif && !loading)
                      ? 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)' 
                      : '#e9ecef',
                    color: (seanceSelectionnee && nouvelleDemande.motif && !loading) ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (seanceSelectionnee && nouvelleDemande.motif && !loading) ? 'pointer' : 'not-allowed',
                    boxShadow: (seanceSelectionnee && nouvelleDemande.motif && !loading)
                      ? '0 4px 12px rgba(203, 9, 32, 0.3)' 
                      : 'none',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (seanceSelectionnee && nouvelleDemande.motif && !loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(203, 9, 32, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (seanceSelectionnee && nouvelleDemande.motif && !loading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(203, 9, 32, 0.3)';
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid currentColor',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      📤 Soumettre la demande
                    </>
                  )}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Messages d'erreur et de succès */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(231, 76, 60, 0.3)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          maxWidth: '400px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <span style={{ fontSize: '1.2rem' }}>❌</span>
          <span style={{ flex: 1, fontWeight: '500' }}>{error}</span>
          <button 
            onClick={() => setError('')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem'
            }}
          >
            ✕
          </button>
        </div>
      )}
      
      {message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(39, 174, 96, 0.3)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          maxWidth: '400px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <span style={{ fontSize: '1.2rem' }}>✅</span>
          <span style={{ flex: 1, fontWeight: '500' }}>{message}</span>
          <button 
            onClick={() => setMessage('')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Styles d'animation et personnalisés */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #CB0920 0%, #8B0000 100%);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #8B0000 0%, #660000 100%);
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .pulse-animation {
          animation: pulse 2s infinite;
        }
      `}</style>
    </EnseignantLayout>
  );
}

export default RattrapageDem;