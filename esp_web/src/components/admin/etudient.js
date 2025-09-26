import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { ROLES } from '../../config/roles';
import AdminLayout from './AdminLayout';
import '../../style/etudient.css';
import '../../style/table.css';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';

const Etudient = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    tel: '',
    identifiant: '',
    cin: ''
  });
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ nom: '', prenom: '', email: '', tel: '', identifiant: '', cin: '' });
  const [page, setPage] = useState(1);
  const rowsPerPage = 10; // nombre d'étudiants par page
  const [search, setSearch] = useState('');
  const [statusLoading, setStatusLoading] = useState({});

  // Fonction utilitaire pour rafraîchir la liste des étudiants
  const fetchStudents = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setLoading(true);
      }
      setError(null);
      const res = await axios.get('/api/users', { 
        params: { 
          role: ROLES.ETUDIANT,
          _t: Date.now() // Cache busting timestamp
        },
        // Forcer le rechargement en ajoutant un timestamp
        headers: { 
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log('DEBUG: Étudiants récupérés:', res.data);
      setStudents(res.data);
      if (forceRefresh) {
        setPage(1); // Retourner à la première page après ajout
      }
    } catch (err) {
      console.error('Erreur lors du chargement des étudiants:', err);
      setError('Erreur lors du chargement des étudiants');
    } finally {
      if (forceRefresh) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchStudents(true);
  }, []);

  const handleAddClick = () => {
    setShowForm(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!formData.nom || !formData.prenom || !formData.email || !formData.tel || !formData.identifiant || !formData.cin) {
      setFormError('Tous les champs sont obligatoires');
      return;
    }
    try {
      const response = await axios.post('/api/users', {
        ...formData,
        roleTypeRole: ROLES.ETUDIANT,
        password: formData.cin, // mot de passe = cin
      });
      
      console.log('Étudiant ajouté avec succès:', response.data);
      
      // Réinitialiser le formulaire immédiatement
      setFormData({ nom: '', prenom: '', email: '', tel: '', identifiant: '', cin: '' });
      setShowForm(false);
      
      // Forcer le rafraîchissement avec un délai court pour s'assurer que le backend a traité
      setTimeout(async () => {
        await fetchStudents();
        setFormSuccess('Étudiant ajouté avec succès ! Un email avec les identifiants a été envoyé.');
      }, 500);
      
    } catch (err) {
      console.error('Erreur détaillée:', err.response?.data);
      if (err.code === 'ECONNABORTED') {
        setFormError('Timeout de la requête. L\'étudiant pourrait avoir été ajouté. Veuillez rafraîchir la page.');
        // Rafraîchir automatiquement après un délai
        setTimeout(async () => {
          await fetchStudents();
        }, 2000);
      } else if (err.response?.data?.message?.includes('contrainte unique')) {
        setFormError('Ce CIN existe déjà dans le système. Veuillez utiliser un CIN différent.');
      } else if (err.response?.data?.message?.includes('cin')) {
        setFormError('Erreur avec le CIN: ' + err.response.data.message);
      } else {
        setFormError(err.response?.data?.message || 'Erreur lors de l\'ajout');
      }
    }
  };

  const handleEditClick = (etudiant) => {
    setEditId(etudiant.idUser);
    setEditData({
      nom: etudiant.nom,
      prenom: etudiant.prenom,
      email: etudiant.email,
      tel: etudiant.tel,
      identifiant: etudiant.identifiant || '',
      cin: etudiant.cin || ''
    });
    setShowForm(false);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!editData.nom || !editData.prenom || !editData.email || !editData.tel || !editData.identifiant || !editData.cin) {
      setFormError('Tous les champs sont obligatoires');
      return;
    }
    try {
      // On ne modifie jamais le rôle ni le mot de passe
      const payload = {
        nom: editData.nom,
        prenom: editData.prenom,
        email: editData.email,
        tel: editData.tel,
        identifiant: editData.identifiant,
        cin: editData.cin
      };
      await axios.put(`/api/users/${editId}`, payload);
      
      // Réinitialiser le formulaire immédiatement
      setEditId(null);
      setEditData({ nom: '', prenom: '', email: '', tel: '', identifiant: '', cin: '' });
      
      // Rafraîchir avec un délai court
      setTimeout(async () => {
        await fetchStudents();
        setFormSuccess('Étudiant modifié avec succès !');
      }, 300);
      
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleStatusChange = async (idUser, newStatus) => {
    setStatusLoading(prev => ({ ...prev, [idUser]: true }));
    try {
      await axios.put(`/api/users/${idUser}/status`, { statusCompte: newStatus });
      
      // Rafraîchir avec un délai court
      setTimeout(async () => {
        await fetchStudents();
        setStatusLoading(prev => ({ ...prev, [idUser]: false }));
      }, 300);
      
    } catch (err) {
      console.error('Status change error:', err);
      alert('Erreur lors du changement de statut: ' + (err.response?.data?.message || err.message));
      setStatusLoading(prev => ({ ...prev, [idUser]: false }));
    }
  };

  const handleDelete = async (idUser) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet étudiant ?')) return;
    try {
      await axios.delete(`/api/users/${idUser}`);
      
      // Rafraîchir avec un délai court
      setTimeout(async () => {
        await fetchStudents();
      }, 300);
      
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  // Pagination : calcul des étudiants à afficher
  const filteredStudents = students.filter(etudiant =>
    (etudiant.nom && etudiant.nom.toLowerCase().includes(search.toLowerCase())) ||
    (etudiant.prenom && etudiant.prenom.toLowerCase().includes(search.toLowerCase())) ||
    (etudiant.identifiant && etudiant.identifiant.toLowerCase().includes(search.toLowerCase())) ||
    (etudiant.email && etudiant.email.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination sur la liste filtrée
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  if (loading) {
    return (
      <AdminLayout
        activeMenu="Etudient"
        setActiveMenu={() => {}}
        loading={true}
        loadingMessage="Chargement des étudiants..."
      />
    );
  }

  return (
    <AdminLayout
      activeMenu="Etudient"
      setActiveMenu={() => {}}
      title="Gestion des Étudiants"
      subtitle="Gestion des comptes étudiants"
    >
      <div style={{ 
        flex: 1, 
        padding: '2rem', 
        minWidth: 0,
        position: 'relative',
        zIndex: 1
      }}>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'none' }} />
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Gestion des Étudiants</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input
                type="text"
                placeholder="Rechercher..."
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
                onClick={() => fetchStudents(true)}
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
                className="add-etudient-btn"
                title="Ajouter un étudiant"
                onClick={handleAddClick}
                style={{
                  background: '#CB0920',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  fontSize: 28,
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12
                }}
              >
                +
              </button>
            </div>
        </h2>
        {showForm && (
            <form className="add-etudient-form" onSubmit={handleFormSubmit} style={{
              background: '#fff',
              border: '1px solid #f5f5f5',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              padding: 24,
              marginBottom: 24,
              maxWidth: 500,
              marginLeft: 'auto',
              marginRight: 'auto',
              marginTop: 16
            }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <input name="nom" value={formData.nom} onChange={handleFormChange} placeholder="Nom" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                <input name="prenom" value={formData.prenom} onChange={handleFormChange} placeholder="Prénom" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <input name="email" value={formData.email} onChange={handleFormChange} placeholder="Email" type="email" style={{ flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                <input name="tel" value={formData.tel} onChange={handleFormChange} placeholder="Téléphone" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <input name="identifiant" value={formData.identifiant} onChange={handleFormChange} placeholder="Identifiant" style={{ flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                <input name="cin" value={formData.cin} onChange={handleFormChange} placeholder="CIN" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              {formError && <div style={{ color: '#CB0920', marginTop: 10, fontWeight: 500 }}>{formError}</div>}
              {formSuccess && <div style={{ color: 'green', marginTop: 10, fontWeight: 500 }}>{formSuccess}</div>}
              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: '#eee', color: '#CB0920', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button type="submit" style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Ajouter</button>
              </div>
            </form>
        )}
        {editId && (
            <form className="add-etudient-form" onSubmit={handleEditSubmit} style={{
              background: '#fff',
              border: '1px solid #f5f5f5',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              padding: 24,
              marginBottom: 24,
              maxWidth: 500,
              marginLeft: 'auto',
              marginRight: 'auto',
              marginTop: 16
            }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <input name="nom" value={editData.nom} onChange={handleEditChange} placeholder="Nom" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                <input name="prenom" value={editData.prenom} onChange={handleEditChange} placeholder="Prénom" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <input name="email" value={editData.email} onChange={handleEditChange} placeholder="Email" type="email" style={{ flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                <input name="tel" value={editData.tel} onChange={handleEditChange} placeholder="Téléphone" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <input name="identifiant" value={editData.identifiant} onChange={handleEditChange} placeholder="Identifiant" style={{ flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                <input name="cin" value={editData.cin} onChange={handleEditChange} placeholder="CIN" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              {formError && <div style={{ color: '#CB0920', marginTop: 10, fontWeight: 500 }}>{formError}</div>}
              {formSuccess && <div style={{ color: 'green', marginTop: 10, fontWeight: 500 }}>{formSuccess}</div>}
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
            <>
              <div className="users-cards-container">
                {paginatedStudents.map((etudiant) => (
                  <div key={etudiant.idUser} className="user-card">
                                          <div className="user-card-header">
                        <div className="user-card-avatar">
                          {etudiant.imageUrl ? (
                            <img 
                              src={etudiant.imageUrl} 
                              alt="Avatar" 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                borderRadius: '50%', 
                                objectFit: 'cover' 
                              }} 
                            />
                          ) : (
                            etudiant.prenom?.charAt(0)?.toUpperCase() || '👨‍🎓'
                          )}
                        </div>
                      <h3 className="user-card-name">
                        {etudiant.prenom} {etudiant.nom}
                      </h3>
                      <p className="user-card-role">👨‍🎓 Étudiant</p>
                    </div>
                    
                    <div className="user-card-body">
                      <div className={`user-status-badge ${(etudiant.statusCompte || 'ACTIF').toLowerCase()}`}>
                        {etudiant.statusCompte === 'ACTIF' ? '✅ Actif' : 
                         etudiant.statusCompte === 'INACTIF' ? '❌ Inactif' : 
                         etudiant.statusCompte === 'SUSPENDU' ? '⏸️ Suspendu' : '✅ Actif'}
                      </div>
                      
                      <div className="user-info-grid">
                        <div className="user-info-item">
                          <span className="user-info-icon">🆔</span>
                          <span className="user-info-label">Identifiant:</span>
                          <span className="user-info-value">{etudiant.identifiant || '—'}</span>
                        </div>
                        
                        <div className="user-info-item">
                          <span className="user-info-icon">📧</span>
                          <span className="user-info-label">Email:</span>
                          <span className="user-info-value">{etudiant.email}</span>
                        </div>
                        
                        <div className="user-info-item">
                          <span className="user-info-icon">📱</span>
                          <span className="user-info-label">Téléphone:</span>
                          <span className="user-info-value">{etudiant.tel}</span>
                        </div>
                        
                        <div className="user-info-item">
                          <span className="user-info-icon">🆔</span>
                          <span className="user-info-label">CIN:</span>
                          <span className="user-info-value">{etudiant.cin}</span>
                        </div>
                      </div>
                      
                      <div className="user-card-actions">
                        <select
                          className="user-card-status-select"
                          value={etudiant.statusCompte || 'ACTIF'}
                          onChange={(e) => handleStatusChange(etudiant.idUser, e.target.value)}
                          disabled={statusLoading[etudiant.idUser]}
                        >
                          <option value="ACTIF">✅ Actif</option>
                          <option value="INACTIF">❌ Inactif</option>
                          <option value="SUSPENDU">⏸️ Suspendu</option>
                        </select>
                        
                        <div className="user-card-buttons">
                          <button
                            className="user-card-btn"
                            onClick={() => handleEditClick(etudiant)}
                            disabled={statusLoading[etudiant.idUser]}
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
                          >
                            ✎
                          </button>
                          <button
                            className="user-card-btn"
                            onClick={() => handleDelete(etudiant.idUser)}
                            disabled={statusLoading[etudiant.idUser]}
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
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      
                      {statusLoading[etudiant.idUser] && (
                        <div style={{ textAlign: 'center', marginTop: '1rem', color: '#CB0920' }}>
                          ⏳ Mise à jour du statut...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                <Stack spacing={2} sx={{ alignItems: 'center' }}>
                  <Pagination
                    count={Math.ceil(filteredStudents.length / rowsPerPage)}
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
              </div>
            </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Etudient;
