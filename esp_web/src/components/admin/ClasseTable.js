import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import AdminLayout from './AdminLayout';
import '../../style/dashboard.css';
import '../../style/etudient.css';
import '../../style/table.css';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';

const ClasseTable = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ nomClasse: '' });

  // Pour la génération automatique
  const [autoBase, setAutoBase] = useState('');
  const [autoCount, setAutoCount] = useState(1);
  const [autoError, setAutoError] = useState(null);
  const [autoSuccess, setAutoSuccess] = useState(null);
  const [showAutoForm, setShowAutoForm] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');

  // Pour la popup de détails
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClasseDetails, setSelectedClasseDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchClasses = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setLoading(true);
      }
      setError(null);
      const res = await axios.get('/api/classes', {
        params: { 
          _t: Date.now() // Cache busting timestamp
        },
        headers: { 
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log('DEBUG: Classes récupérées:', res.data);
      setClasses(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des classes:', err);
      setError('Erreur lors du chargement des classes');
    } finally {
      if (forceRefresh) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchClasses(true);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleEditClick = (classe) => {
    setEditId(classe.idClasse);
    setEditData({ nomClasse: classe.nomClasse });
    setAutoError(null);
    setAutoSuccess(null);
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setAutoError(null);
    setAutoSuccess(null);
    if (!editData.nomClasse) {
      setAutoError('Le nom de la classe est obligatoire');
      return;
    }
    try {
      await axios.put(`/api/classes/${editId}`, editData);
      
      // Réinitialiser le formulaire immédiatement
      setEditId(null);
      setEditData({ nomClasse: '' });
      
      // Rafraîchir avec un délai court
      setTimeout(async () => {
        await fetchClasses();
        setAutoSuccess('Classe modifiée avec succès !');
      }, 300);
    } catch (err) {
      setAutoError(err.response?.data?.message || err.message || 'Erreur lors de la modification');
    }
  };

  const handleDelete = async (idClasse) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette classe ?')) return;
    try {
      await axios.delete(`/api/classes/${idClasse}`);
      
      // Rafraîchir avec un délai court
      setTimeout(async () => {
        await fetchClasses();
      }, 300);
      
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  // Fonction pour récupérer les détails d'une classe (enseignants et étudiants)
  const handleDetailClick = async (classe) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    setSelectedClasseDetails({ ...classe, enseignants: [], etudiants: [] });

    try {
      // Récupérer toutes les affectations pour cette classe
      const affectationsRes = await axios.get(`/api/affectations/classe/${classe.idClasse}`);
      const affectations = affectationsRes.data || [];

      // Séparer enseignants et étudiants selon leur rôle
      const enseignants = affectations.filter(affectation => 
        affectation.user && affectation.user.role && 
        (affectation.user.role.typeRole === 'Enseignant' || 
         affectation.user.role.typeRole === 'enseignant' ||
         affectation.user.role.typeRole === 'ENSEIGNANT')
      );

      const etudiants = affectations.filter(affectation => 
        affectation.user && affectation.user.role && 
        (affectation.user.role.typeRole === 'Etudiant' || 
         affectation.user.role.typeRole === 'etudiant' ||
         affectation.user.role.typeRole === 'ETUDIANT')
      );

      setSelectedClasseDetails({
        ...classe,
        enseignants: enseignants,
        etudiants: etudiants
      });
    } catch (err) {
      console.error('Erreur lors du chargement des détails:', err);
      setSelectedClasseDetails({
        ...classe,
        enseignants: [],
        etudiants: [],
        error: 'Erreur lors du chargement des détails'
      });
    } finally {
      setDetailLoading(false);
    }
  };

  // Génération automatique de classes (ex: 1A1, 1A2, 1A3)
  const handleAutoGenerate = async (e) => {
    e.preventDefault();
    setAutoError(null);
    setAutoSuccess(null);
    if (!autoBase || !autoCount || autoCount < 1) {
      setAutoError('Veuillez saisir un nom de base et un nombre valide.');
      return;
    }
    try {
      const requests = [];
      for (let i = 1; i <= autoCount; i++) {
        requests.push(
          axios.post('/api/classes', { nomClasse: `${autoBase}${i}` })
        );
      }
      await Promise.all(requests);
      // Réinitialiser le formulaire immédiatement
      setAutoBase('');
      setAutoCount(1);
      
      // Rafraîchir avec un délai court
      setTimeout(async () => {
        await fetchClasses();
        setAutoSuccess(`Classes générées : ${Array.from({length: autoCount}, (_,i) => `${autoBase}${i+1}`).join(', ')}`);
      }, 500);
    } catch (err) {
      setAutoError('Erreur lors de la génération automatique.');
    }
  };

  // Trie les classes par nomClasse (ordre croissant)
  const filteredClasses = classes.filter(classe =>
    classe.nomClasse.toLowerCase().includes(search.toLowerCase())
  );
  const sortedClasses = [...filteredClasses].sort((a, b) =>
    a.nomClasse.localeCompare(b.nomClasse, undefined, { numeric: true })
  );

  // Regroupe les classes par préfixe numérique (ex: 1, 2, 3...)
  const groupByPrefix = (arr) => {
    const groups = {};
    arr.forEach(classe => {
      // Extraire le(s) chiffre(s) au début du nom (ex: 1A1 -> 1, 2A2 -> 2)
      const match = classe.nomClasse.match(/^(\d+)/);
      const prefix = match ? match[1] : 'Autre';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(classe);
    });
    return groups;
  };
  const grouped = groupByPrefix(sortedClasses);
  const groupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Pagination par groupe
  const totalPages = groupKeys.length;
  const currentGroupKey = groupKeys[page - 1];
  const paginatedClasses = grouped[currentGroupKey] || [];

  if (loading) {
    return (
      <AdminLayout
        activeMenu="ClasseTable"
        setActiveMenu={() => {}}
        loading={true}
        loadingMessage="Chargement des classes..."
      />
    );
  }

  return (
    <AdminLayout
      activeMenu="ClasseTable"
      setActiveMenu={() => {}}
      title="Gestion des Classes"
      subtitle="Gestion des classes et niveaux"
    >
      <div style={{ 
        flex: 1, 
        padding: '2rem', 
        minWidth: 0,
        position: 'relative',
        zIndex: 1
      }}>
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Gestion des Classes</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <input
              type="text"
              placeholder="Rechercher une classe..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ddd',
                width: 220,
                fontSize: 15,
                marginRight: 8,
                background: '#fafafa',
                transition: 'box-shadow 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
              }}
            />
            <button
              className="refresh-btn"
              title="Actualiser la liste"
              onClick={() => fetchClasses(true)}
              style={{
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                fontSize: 20,
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8
              }}
            >
              ↻
            </button>
            <button
              className="add-salle-btn"
              title={showAutoForm ? "Fermer le formulaire" : "Générer des classes"}
              onClick={() => setShowAutoForm((prev) => !prev)}
              style={{ background: showAutoForm ? '#eee' : '#CB0920', color: showAutoForm ? '#CB0920' : '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 28, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.10)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >+
            </button>
          </div>
        </h2>
        {/* Formulaire de génération automatique toggle */}
        {showAutoForm && (
          <form onSubmit={handleAutoGenerate} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, background: '#fafafa', border: '1px solid #f5f5f5', borderRadius: 12, padding: 16, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
            <input
              type="text"
              placeholder="Nom de base (ex: 1A)"
              value={autoBase}
              onChange={e => setAutoBase(e.target.value)}
              style={{ flex: 2, minWidth: 80, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              type="number"
              min={1}
              placeholder="Nombre"
              value={autoCount}
              onChange={e => setAutoCount(Number(e.target.value))}
              style={{ flex: 1, minWidth: 60, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <button type="submit" style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Générer</button>
          </form>
        )}
        {autoError && <div style={{ color: '#CB0920', textAlign: 'center', marginBottom: 10 }}>{autoError}</div>}
        {autoSuccess && <div style={{ color: 'green', textAlign: 'center', marginBottom: 10 }}>{autoSuccess}</div>}

        {/* Formulaire d'édition */}
        {editId && (
          <form className="add-salle-form" onSubmit={handleEditSubmit} style={{ background: '#fff', border: '1px solid #f5f5f5', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 24, marginBottom: 24, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', marginTop: 16 }}>
            <input name="nomClasse" value={editData.nomClasse} onChange={handleEditChange} placeholder="Nom de la classe" style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
            {autoError && <div style={{ color: '#CB0920', marginTop: 10, fontWeight: 500 }}>{autoError}</div>}
            {autoSuccess && <div style={{ color: 'green', marginTop: 10, fontWeight: 500 }}>{autoSuccess}</div>}
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setEditId(null)} style={{ background: '#eee', color: '#CB0920', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button type="submit" style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
            </div>
          </form>
        )}
        {loading ? (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <span style={{ color: '#CB0920', fontWeight: 600, fontSize: '1.2rem' }}>Chargement...</span>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <span style={{ color: '#CB0920', fontWeight: 600, fontSize: '1.1rem' }}>{error}</span>
          </div>
        ) : (
          <div className="table-container" style={{ marginTop: '2rem' }}>
            <table className="table-dashboard classes-table">
              <thead>
                <tr>
                  <th>NOM</th>
                  <th>Effectif</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClasses.map((classe) => (
                  <tr key={classe.idClasse}>
                    <td>{classe.nomClasse}</td>
                    <td>{classe.effectif || 0}</td>
                    <td className="actions-cell">
                      <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn-detail" 
                          onClick={() => handleDetailClick(classe)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            minWidth: '70px',
                            height: '32px',
                            background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 4px 16px rgba(0, 123, 255, 0.4)';
                            e.target.style.background = 'linear-gradient(135deg, #0056b3 0%, #004085 100%)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
                            e.target.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
                          }}
                        >👁</button>
                        <button 
                          className="btn-edit" 
                          onClick={() => handleEditClick(classe)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            minWidth: '70px',
                            height: '32px',
                            background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 8px rgba(203, 9, 32, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 4px 16px rgba(203, 9, 32, 0.4)';
                            e.target.style.background = 'linear-gradient(135deg, #8B0000 0%, #660000 100%)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(203, 9, 32, 0.3)';
                            e.target.style.background = 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)';
                          }}
                        >✎</button>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDelete(classe.idClasse)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            minWidth: '70px',
                            height: '32px',
                            background: 'linear-gradient(135deg, #6c757d 0%, #343a40 100%)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 8px rgba(52, 58, 64, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 4px 16px rgba(52, 58, 64, 0.4)';
                            e.target.style.background = 'linear-gradient(135deg, #495057 0%, #212529 100%)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(52, 58, 64, 0.3)';
                            e.target.style.background = 'linear-gradient(135deg, #6c757d 0%, #343a40 100%)';
                          }}
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination par groupe de préfixe */}
            <Stack spacing={2} sx={{ alignItems: 'center', marginTop: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: '#CB0920',
                    borderColor: '#CB0920',
                  },
                  '& .Mui-selected': {
                    backgroundColor: '#CB0920 !important',
                    color: '#fff !important',
                    borderColor: '#CB0920',
                  },
                  '& .MuiPaginationItem-root.Mui-selected:hover': {
                    backgroundColor: '#b8081c !important',
                  },
                  '& .MuiPaginationItem-root:hover': {
                    backgroundColor: '#fbeaec',
                  }
                }}
              />
            </Stack>
            {/* Affichage du préfixe courant */}

          </div>
        )}

        {/* Modal de détails de la classe */}
        {showDetailModal && selectedClasseDetails && (
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
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #f0f0f0',
                paddingBottom: '1rem'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#CB0920',
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Détails de la classe {selectedClasseDetails.nomClasse}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
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

              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <span style={{ color: '#CB0920', fontWeight: 600 }}>Chargement des détails...</span>
                </div>
              ) : selectedClasseDetails.error ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#CB0920' }}>
                  {selectedClasseDetails.error}
                </div>
              ) : (
                <div>
                  {/* Informations générales */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ color: '#333', marginBottom: '0.5rem' }}>Informations générales</h4>
                    <div className="stat-card" style={{ background: 'var(--red-main)', color: 'var(--white-main)', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: 'var(--shadow)', border: '1px solid var(--gray-light)' }}>
                      <div className="stat-content">
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}><strong>Nom de la classe:</strong> {selectedClasseDetails.nomClasse}</p>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}><strong>Effectif:</strong> {selectedClasseDetails.effectif || 0} étudiants</p>
                      </div>
                    </div>
                  </div>

                  {/* Liste des enseignants */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ color: '#333', marginBottom: '1rem' }}>
                      Enseignants affectés ({selectedClasseDetails.enseignants.length})
                    </h4>
                    {selectedClasseDetails.enseignants.length > 0 ? (
                      <div style={{ background: 'var(--white-main)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: 'var(--shadow)', border: '1px solid var(--gray-light)' }}>
                        <table className="table-dashboard teachers-detail-table">
                          <thead>
                            <tr>
                              <th>Nom</th>
                              <th>Prénom</th>
                              <th>Matière</th>
                              <th>Email</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedClasseDetails.enseignants.map((affectation, index) => (
                              <tr key={index}>
                                <td>{affectation.user?.nom || 'N/A'}</td>
                                <td>{affectation.user?.prenom || 'N/A'}</td>
                                <td>{affectation.user?.matiere || 'N/A'}</td>
                                <td>{affectation.user?.email || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ 
                        background: '#fff3cd', 
                        color: '#856404', 
                        padding: '1rem', 
                        borderRadius: '8px',
                        border: '1px solid #ffeaa7'
                      }}>
                        Aucun enseignant affecté à cette classe
                      </div>
                    )}
                  </div>

                  {/* Liste des étudiants */}
                  <div>
                    <h4 style={{ color: '#333', marginBottom: '1rem' }}>
                      Étudiants inscrits ({selectedClasseDetails.etudiants.length})
                    </h4>
                    {selectedClasseDetails.etudiants.length > 0 ? (
                      <div style={{ background: 'var(--white-main)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: 'var(--shadow)', border: '1px solid var(--gray-light)' }}>
                        <table className="table-dashboard students-detail-table">
                          <thead>
                            <tr>
                              <th>Nom</th>
                              <th>Prénom</th>
                              <th>Email</th>
                              <th>Téléphone</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedClasseDetails.etudiants.map((affectation, index) => (
                              <tr key={index}>
                                <td>{affectation.user?.nom || 'N/A'}</td>
                                <td>{affectation.user?.prenom || 'N/A'}</td>
                                <td>{affectation.user?.email || 'N/A'}</td>
                                <td>{affectation.user?.tel || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ 
                        background: '#fff3cd', 
                        color: '#856404', 
                        padding: '1rem', 
                        borderRadius: '8px',
                        border: '1px solid #ffeaa7'
                      }}>
                        Aucun étudiant inscrit dans cette classe
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClasseTable;
