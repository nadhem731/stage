import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import './rattrapage_admin.css';

const RattrapageAdmin = () => {
    const [activeMenu, setActiveMenu] = useState('rattrapage-admin');
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState({});
    const [analyzingId, setAnalyzingId] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [filtreStatut, setFiltreStatut] = useState('tous');
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        en_attente: 0,
        approuve: 0,
        refuse: 0
    });

    const chargerDemandes = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            if (!token) {
                setError('Token d\'authentification manquant');
                return;
            }

            const response = await fetch('/api/rattrapages/admin', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('DEBUG - Données reçues de l\'API:', data);
            console.log('DEBUG - Première demande:', data[0]);
            setDemandes(data);
            calculerStats(data);
            setError('');
        } catch (err) {
            console.error('Erreur lors du chargement des demandes:', err);
            setError('Erreur lors du chargement des demandes: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        chargerDemandes();
    }, []);


    const calculerStats = (demandesData) => {
        const statsCalculees = {
            total: demandesData.length,
            en_attente: demandesData.filter(d => d.statut === 'en_attente').length,
            approuve: demandesData.filter(d => d.statut === 'approuve').length,
            refuse: demandesData.filter(d => d.statut === 'refuse').length
        };
        setStats(statsCalculees);
    };

    const changerStatut = async (id, nouveauStatut) => {
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token');

            // Préparer les données à envoyer
            let requestData = { statut: nouveauStatut };
            
            // Si on rejette la demande et qu'il y a une analyse IA avec des alternatives
            if (nouveauStatut === 'refuse' && aiAnalysis[id]) {
                const analysis = aiAnalysis[id].analysis;
                if (analysis && (analysis.alternatives || analysis.suggestions || analysis.decision_justification)) {
                    let messageAdmin = "🤖 Analyse IA - Demande rejetée:\n\n";
                    
                    if (analysis.decision_justification) {
                        messageAdmin += `📋 Justification: ${analysis.decision_justification}\n\n`;
                    }
                    
                    if (analysis.alternatives && analysis.alternatives.length > 0) {
                        messageAdmin += "🔄 Alternatives suggérées:\n";
                        analysis.alternatives.forEach((alt, index) => {
                            messageAdmin += `• ${alt}\n`;
                        });
                        messageAdmin += "\n";
                    }
                    
                    if (analysis.suggestions && analysis.suggestions.length > 0) {
                        messageAdmin += "💡 Suggestions:\n";
                        analysis.suggestions.forEach((sugg, index) => {
                            messageAdmin += `• ${sugg}\n`;
                        });
                    }
                    
                    requestData.messageAdmin = messageAdmin;
                }
            }

            const response = await fetch(`/api/rattrapages/${id}/statut`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            // Recharger les demandes après modification
            await chargerDemandes();
            setShowModal(false);
            setSelectedDemande(null);
        } catch (err) {
            console.error('Erreur lors du changement de statut:', err);
            setError('Erreur lors du changement de statut: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const analyserDemande = async (demandeId) => {
            try {
                setAnalyzingId(demandeId);
                const token = localStorage.getItem('token');
                
                // Récupérer les détails de la demande pour l'analyse
                const demande = demandes.find(d => d.idRattrapage === demandeId);
                if (!demande) {
                    throw new Error('Demande introuvable');
                }

                // Préparer les données pour l'analyse IA
                const analysisData = {
                    classe: demande.classe,
                    matiere: demande.matiere,
                    date_rattrapage: demande.dateRattrapageProposee,
                    heure_debut: demande.heureDebutRattrapage,
                    heure_fin: demande.heureFinRattrapage,
                    motif: demande.motif,
                    enseignant_id: demande.idEnseignant
                };

                // Appel direct au service IA Python
                const aiResponse = await fetch('http://localhost:5001/analyze-rattrapage', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(analysisData)
                });

                if (!aiResponse.ok) {
                    throw new Error(`Erreur service IA: ${aiResponse.status}`);
                }

                const aiResult = await aiResponse.json();
                console.log('Réponse IA brute:', aiResult);
                
                // Structurer la réponse pour correspondre au format attendu
                const structuredResult = {
                    status: 'success',
                    analysis: {
                        recommandation: aiResult.recommandation || 'ANALYSE_MANUELLE',
                        score_confiance: aiResult.score_confiance || 0,
                        priorite: aiResult.priorite || 'MOYENNE',
                        raisons: aiResult.raisons || [],
                        suggestions: aiResult.suggestions || [],
                        alternatives: aiResult.alternatives || [],
                        conditions: aiResult.conditions || []
                    },
                    technical_data: {
                        conflits_planning: aiResult.technical_data?.conflits_planning || 0,
                        salles_disponibles: aiResult.technical_data?.salles_disponibles || 0,
                        score_faisabilite: aiResult.technical_data?.score_faisabilite || 0
                    },
                    contextual_data: aiResult.contextual_data || {}
                };
                
                console.log('Résultat structuré:', structuredResult);
                
                // Mettre à jour le statut dans le backend si nécessaire
                try {
                    await fetch(`/api/rattrapages/${demandeId}/analyze`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (backendError) {
                    console.warn('Erreur mise à jour backend:', backendError);
                }
                
                setAiAnalysis(prev => ({
                    ...prev,
                    [demandeId]: structuredResult
                }));

            } catch (error) {
                console.error('Erreur lors de l\'analyse:', error);
                setAiAnalysis(prev => ({
                    ...prev,
                    [demandeId]: {
                        status: 'error',
                        analysis: {
                            recommandation: 'ANALYSE_MANUELLE',
                            score_confiance: 0,
                            priorite: 'MOYENNE',
                            raisons: ['Erreur lors de l\'analyse automatique'],
                            suggestions: ['Analyser manuellement la demande'],
                            alternatives: ['Contacter le service technique'],
                            conditions: []
                        },
                        technical_data: {
                            conflits_planning: 0,
                            salles_disponibles: 0,
                            score_faisabilite: 0
                        }
                    }
                }));
            } finally {
                setAnalyzingId(null);
            }
        };

    const supprimerDemande = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
            return;
        }

        setError(''); // Clear previous errors
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Token d\'authentification manquant');
        }

        try {
            setActionLoading(true);

            const response = await fetch(`/api/rattrapages/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            // Recharger les demandes après suppression
            await chargerDemandes();
            setShowModal(false);
            setSelectedDemande(null);
        } catch (err) {
            console.error('Erreur lors de la suppression:', err);
            setError('Erreur lors de la suppression: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const ouvrirModal = (demande) => {
        setSelectedDemande(demande);
        setShowModal(true);
    };

    const fermerModal = () => {
        setShowModal(false);
        setSelectedDemande(null);
    };

    const analyserAvecIA = async (id) => {
        console.log('Début analyse IA pour ID:', id);
        try {
            setAnalyzingId(id);
            setError(''); // Clear previous errors
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('Token d\'authentification manquant');
            }

            console.log('Appel API pour analyse IA...');
            const response = await fetch(`/api/rattrapages/${id}/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Réponse API:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erreur API:', errorText);
                throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('Résultat analyse IA:', result);
            
            setAiAnalysis(prev => ({
                ...prev,
                [id]: result
            }));

            // Show success message
            console.log('Analyse IA terminée avec succès');

        } catch (err) {
            console.error('Erreur lors de l\'analyse IA:', err);
            setError('Erreur lors de l\'analyse IA: ' + err.message);
        } finally {
            setAnalyzingId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Non définie';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'Non définie';
        return timeString.substring(0, 5);
    };

    const getStatutBadge = (statut) => {
        const badges = {
            'en_attente': { class: 'badge-warning', text: 'En attente', icon: '⏳' },
            'approuve': { class: 'badge-success', text: 'Approuvé', icon: '✅' },
            'refuse': { class: 'badge-danger', text: 'Refusé', icon: '❌' }
        };
        const badge = badges[statut] || { class: 'badge-secondary', text: statut, icon: '❓' };
        return (
            <span className={`badge ${badge.class}`}>
                {badge.icon} {badge.text}
            </span>
        );
    };

    // Filtrer les demandes
    const demandesFiltrees = demandes.filter(demande => {
        const matchStatut = filtreStatut === 'tous' || demande.statut === filtreStatut;
        const matchSearch = searchTerm === '' || 
            demande.classe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            demande.matiere?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            demande.motif?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchStatut && matchSearch;
    });

    if (loading) {
        return (
            <AdminLayout
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                loading={true}
                loadingMessage="Chargement des demandes de rattrapage..."
            />
        );
    }

    return (
        <AdminLayout
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            title="Gestion des Demandes de Rattrapage"
            subtitle="Consultez et gérez toutes les demandes de rattrapage des enseignants"
        >

            {error && (
                <div className="error-message">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError('')} className="close-error">×</button>
                </div>
            )}

            {/* Statistiques */}
            <div className="stats-container">
                <div className="stat-card total">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <h3>{stats.total}</h3>
                        <p>Total des demandes</p>
                    </div>
                </div>
                <div className="stat-card pending">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <h3>{stats.en_attente}</h3>
                        <p>En attente</p>
                    </div>
                </div>
                <div className="stat-card approved">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>{stats.approuve}</h3>
                        <p>Approuvées</p>
                    </div>
                </div>
                <div className="stat-card rejected">
                    <div className="stat-icon">❌</div>
                    <div className="stat-content">
                        <h3>{stats.refuse}</h3>
                        <p>Refusées</p>
                    </div>
                </div>
            </div>

            {/* Filtres et recherche */}
            <div className="filters-container">
                <div className="filter-group">
                    <label>Filtrer par statut :</label>
                    <select 
                        value={filtreStatut} 
                        onChange={(e) => setFiltreStatut(e.target.value)}
                        className="filter-select"
                    >
                        <option value="tous">Tous les statuts</option>
                        <option value="en_attente">En attente</option>
                        <option value="approuve">Approuvé</option>
                        <option value="refuse">Refusé</option>
                    </select>
                </div>
                <div className="search-group">
                    <label>Rechercher :</label>
                    <input
                        type="text"
                        placeholder="Classe, matière, motif..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <button onClick={chargerDemandes} className="refresh-btn">
                    🔄 Actualiser
                </button>
            </div>

            {/* Liste des demandes */}
            <div className="demandes-container">
                {demandesFiltrees.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <h3>Aucune demande trouvée</h3>
                        <p>
                            {demandes.length === 0 
                                ? "Aucune demande de rattrapage n'a été soumise pour le moment."
                                : "Aucune demande ne correspond aux critères de recherche."
                            }
                        </p>
                    </div>
                ) : (
                    <div className="demandes-grid">
                        {demandesFiltrees.map((demande) => (
                            <div key={demande.idRattrapage} className="demande-card">
                                <div className="demande-header">
                                    <div className="demande-info">
                                        <h4>Demande de {demande.nomEnseignant || demande.prenomEnseignant ? `${demande.prenomEnseignant || ''} ${demande.nomEnseignant || ''}`.trim() : `Enseignant ID: ${demande.idEnseignant}`}</h4>
                                        <p className="demande-date">
                                            📅 Créée le {formatDate(demande.dateCreation)}
                                        </p>
                                    </div>
                                    {getStatutBadge(demande.statut)}
                                </div>
                                
                                <div className="demande-content">
                                    <div className="demande-detail">
                                        <strong>📚 Classe :</strong> {demande.classe}
                                    </div>
                                    <div className="demande-detail">
                                        <strong>📖 Matière :</strong> {demande.matiere}
                                    </div>
                                    <div className="demande-detail">
                                        <strong>📅 Absence :</strong> {formatDate(demande.dateAbsence)}
                                    </div>
                                    <div className="demande-detail">
                                        <strong>🕐 Horaire :</strong> {formatTime(demande.heureDebutAbsence)} - {formatTime(demande.heureFinAbsence)}
                                    </div>
                                    <div className="demande-detail">
                                        <strong>💭 Motif :</strong> {demande.motif}
                                    </div>
                                </div>

                                {/* Analyse IA Avancée */}
                                {aiAnalysis[demande.idRattrapage] && (
                                    <div className={`ai-analysis ${aiAnalysis[demande.idRattrapage].analysis?.recommandation?.toLowerCase() || ''}`}>
                                        <div className="ai-analysis-header">
                                            <h4>
                                                🤖 Analyse IA Avancée
                                                {aiAnalysis[demande.idRattrapage].analysis?.priorite && (
                                                    <span className={`priority-badge priority-${aiAnalysis[demande.idRattrapage].analysis.priorite.toLowerCase()}`}>
                                                        {aiAnalysis[demande.idRattrapage].analysis.priorite}
                                                    </span>
                                                )}
                                            </h4>
                                        </div>

                                        <div className="score">
                                            <div className="recommendation-text">
                                                {aiAnalysis[demande.idRattrapage].analysis?.recommandation === 'APPROUVER' ? '✅ APPROUVER' : 
                                                 aiAnalysis[demande.idRattrapage].analysis?.recommandation === 'REJETER' ? '❌ REJETER' :
                                                 '🔍 ANALYSE MANUELLE'}
                                            </div>
                                            <div className="confidence-score">
                                                Confiance: {aiAnalysis[demande.idRattrapage].analysis?.score_confiance || 0}%
                                            </div>
                                            <div className="score-bar">
                                                <div 
                                                    className={`score-fill ${
                                                        (aiAnalysis[demande.idRattrapage].analysis?.score_confiance || 0) >= 75 ? 'high' :
                                                        (aiAnalysis[demande.idRattrapage].analysis?.score_confiance || 0) >= 50 ? 'medium' : 'low'
                                                    }`}
                                                    style={{width: `${aiAnalysis[demande.idRattrapage].analysis?.score_confiance || 0}%`}}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="analysis-sections">
                                            {aiAnalysis[demande.idRattrapage].analysis?.raisons && (
                                                <div className="analysis-section">
                                                    <h5>📊 Raisons</h5>
                                                    <ul>
                                                        {aiAnalysis[demande.idRattrapage].analysis.raisons.map((raison, index) => (
                                                            <li key={index}>{raison}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {aiAnalysis[demande.idRattrapage].analysis?.suggestions && aiAnalysis[demande.idRattrapage].analysis.suggestions.length > 0 && (
                                                <div className="analysis-section">
                                                    <h5>💡 Suggestions</h5>
                                                    <ul>
                                                        {aiAnalysis[demande.idRattrapage].analysis.suggestions.map((suggestion, index) => (
                                                            <li key={index}>{suggestion}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {aiAnalysis[demande.idRattrapage].analysis?.alternatives && aiAnalysis[demande.idRattrapage].analysis.alternatives.length > 0 && (
                                                <div className="analysis-section">
                                                    <h5>🔄 Alternatives</h5>
                                                    <ul>
                                                        {aiAnalysis[demande.idRattrapage].analysis.alternatives.map((alternative, index) => (
                                                            <li key={index}>{alternative}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {aiAnalysis[demande.idRattrapage].analysis?.conditions && aiAnalysis[demande.idRattrapage].analysis.conditions.length > 0 && (
                                                <div className="analysis-section">
                                                    <h5>⚠️ Conditions</h5>
                                                    <ul>
                                                        {aiAnalysis[demande.idRattrapage].analysis.conditions.map((condition, index) => (
                                                            <li key={index}>{condition}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Données techniques */}
                                        {aiAnalysis[demande.idRattrapage].technical_data && (
                                            <div className="technical-data">
                                                <h5>🔧 Données Techniques</h5>
                                                <div className="tech-stats">
                                                    <div className="tech-stat">
                                                        <div className="value">{aiAnalysis[demande.idRattrapage].technical_data.conflits_planning || 0}</div>
                                                        <div className="label">Conflits</div>
                                                    </div>
                                                    <div className="tech-stat">
                                                        <div className="value">{aiAnalysis[demande.idRattrapage].technical_data.salles_disponibles || 0}</div>
                                                        <div className="label">Salles libres</div>
                                                    </div>
                                                    <div className="tech-stat">
                                                        <div className="value">{aiAnalysis[demande.idRattrapage].technical_data.score_faisabilite || 0}%</div>
                                                        <div className="label">Faisabilité</div>
                                                    </div>
                                                    {aiAnalysis[demande.idRattrapage].contextual_data?.charge_enseignant && (
                                                        <div className="tech-stat">
                                                            <div className="value">{aiAnalysis[demande.idRattrapage].contextual_data.charge_enseignant.total_rattrapages || 0}</div>
                                                            <div className="label">Rattrapages/mois</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="demande-actions">
                                    <div className="primary-actions">
                                        <button 
                                            onClick={() => analyserDemande(demande.idRattrapage)}
                                            className="btn-ai-analyze"
                                            disabled={analyzingId === demande.idRattrapage}
                                        >
                                            {analyzingId === demande.idRattrapage ? '⏳ Analyse...' : '🤖 Analyser IA'}
                                        </button>
                                        {demande.statut === 'en_attente' && (
                                            <>
                                                <button 
                                                    onClick={() => changerStatut(demande.idRattrapage, 'approuve')}
                                                    className="btn-approve"
                                                    disabled={actionLoading}
                                                >
                                                    ✅ Approuver
                                                </button>
                                                <button 
                                                    onClick={() => changerStatut(demande.idRattrapage, 'refuse')}
                                                    className="btn-reject"
                                                    disabled={actionLoading}
                                                >
                                                    ❌ Refuser
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="secondary-actions">
                                        <button 
                                            onClick={() => ouvrirModal(demande)}
                                            className="btn-details"
                                        >
                                            👁️ Voir détails
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal détails */}
            {showModal && selectedDemande && (
                <div className="modal-overlay" onClick={fermerModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📋 Détails de la demande de {selectedDemande.nomEnseignant || selectedDemande.prenomEnseignant ? `${selectedDemande.prenomEnseignant || ''} ${selectedDemande.nomEnseignant || ''}`.trim() : `Enseignant ID: ${selectedDemande.idEnseignant}`}</h2>
                            <button onClick={fermerModal} className="close-modal">×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="modal-section">
                                <h3>🚫 Séance manquée</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <strong>Date :</strong> {formatDate(selectedDemande.dateAbsence)}
                                    </div>
                                    <div className="detail-item">
                                        <strong>Horaire :</strong> {formatTime(selectedDemande.heureDebutAbsence)} - {formatTime(selectedDemande.heureFinAbsence)}
                                    </div>
                                    <div className="detail-item">
                                        <strong>Classe :</strong> {selectedDemande.classe}
                                    </div>
                                    <div className="detail-item">
                                        <strong>Matière :</strong> {selectedDemande.matiere}
                                    </div>
                                    <div className="detail-item full-width">
                                        <strong>Motif :</strong> {selectedDemande.motif}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-section">
                                <h3>🔄 Rattrapage proposé</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <strong>Date :</strong> {formatDate(selectedDemande.dateRattrapageProposee)}
                                    </div>
                                    <div className="detail-item">
                                        <strong>Horaire :</strong> {formatTime(selectedDemande.heureDebutRattrapage)} - {formatTime(selectedDemande.heureFinRattrapage)}
                                    </div>
                                    <div className="detail-item">
                                        <strong>Salle préférée :</strong> {selectedDemande.sallePreferee || 'Non spécifiée'}
                                    </div>
                                    <div className="detail-item">
                                        <strong>Statut :</strong> {getStatutBadge(selectedDemande.statut)}
                                    </div>
                                    {selectedDemande.commentaire && (
                                        <div className="detail-item full-width">
                                            <strong>Commentaire :</strong> {selectedDemande.commentaire}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            {selectedDemande.statut === 'en_attente' && (
                                <div className="modal-actions">
                                    <button 
                                        onClick={() => changerStatut(selectedDemande.idRattrapage, 'approuve')}
                                        className="btn-approve"
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? '⏳' : '✅'} Approuver
                                    </button>
                                    <button 
                                        onClick={() => changerStatut(selectedDemande.idRattrapage, 'refuse')}
                                        className="btn-reject"
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? '⏳' : '❌'} Refuser
                                    </button>
                                </div>
                            )}
                            <div className="modal-secondary-actions">
                                <button 
                                    onClick={() => supprimerDemande(selectedDemande.idRattrapage)}
                                    className="btn-delete"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? '⏳' : '🗑️'} Supprimer
                                </button>
                                <button onClick={fermerModal} className="btn-cancel">
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default RattrapageAdmin;