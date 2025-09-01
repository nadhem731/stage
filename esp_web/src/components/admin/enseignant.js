import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { ROLES } from '../../config/roles';
import AdminLayout from './AdminLayout';
import '../../style/etudient.css';
import '../../style/table.css';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';

const Enseignant = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    tel: '',
    identifiant: '',
    cin: '',
    matiere: ''
  });
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ nom: '', prenom: '', email: '', tel: '', identifiant: '', cin: '', matiere: '' });
  const [page, setPage] = useState(1);
  const rowsPerPage = 8;
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('gestion');

  // State for teacher availability
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherAvailability, setTeacherAvailability] = useState({
    lundi: [],
    mardi: [],
    mercredi: [],
    jeudi: [],
    vendredi: [],
    samedi: []
  });
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(null);
  const [statusLoading, setStatusLoading] = useState({});

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/users', { 
        params: { 
          role: ROLES.ENSEIGNANT,
          _t: Date.now() // Cache busting timestamp
        },
        // Forcer le rechargement en ajoutant un timestamp
        headers: { 'Cache-Control': 'no-cache' }
      });
      console.log('DEBUG: Enseignants récupérés:', res.data);
      setTeachers(res.data);
      setPage(1); // Retourner à la première page après ajout
    } catch (err) {
      console.error('Erreur lors du chargement des enseignants:', err);
      setError('Erreur lors du chargement des enseignants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
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
    if (!formData.nom || !formData.prenom || !formData.email || !formData.tel || !formData.identifiant || !formData.cin || !formData.matiere) {
      setFormError('Tous les champs sont obligatoires');
      return;
    }
    try {
      await axios.post('/api/users', {
        ...formData,
        roleTypeRole: ROLES.ENSEIGNANT,
        password: formData.cin,
      });
      
      // Forcer le rafraîchissement immédiat AVANT d'afficher le succès
      await fetchTeachers();
      
      setFormSuccess('Enseignant ajouté avec succès ! Un email avec les identifiants a été envoyé.');
      setShowForm(false);
      setFormData({ nom: '', prenom: '', email: '', tel: '', identifiant: '', cin: '', matiere: '' });
    } catch (err) {
      console.error('Erreur détaillée:', err.response?.data);
      if (err.code === 'ECONNABORTED') {
        setFormError('Timeout de la requête. L\'enseignant pourrait avoir été ajouté. Veuillez rafraîchir la page.');
        // Rafraîchir automatiquement après un délai
        setTimeout(async () => {
          await fetchTeachers();
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

  const handleEditClick = (enseignant) => {
    setEditId(enseignant.idUser);
    setEditData({
      nom: enseignant.nom,
      prenom: enseignant.prenom,
      email: enseignant.email,
      tel: enseignant.tel,
      identifiant: enseignant.identifiant || '',
      cin: enseignant.cin || '',
      matiere: enseignant.matiere || ''
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
    if (!editData.nom || !editData.prenom || !editData.email || !editData.tel || !editData.identifiant || !editData.cin || !editData.matiere) {
      setFormError('Tous les champs sont obligatoires');
      return;
    }
    try {
      const payload = {
        nom: editData.nom,
        prenom: editData.prenom,
        email: editData.email,
        tel: editData.tel,
        identifiant: editData.identifiant,
        cin: editData.cin,
        matiere: editData.matiere
      };
      await axios.put(`/api/users/${editId}`, payload);
      setFormSuccess('Enseignant modifié avec succès !');
      setEditId(null);
      setEditData({ nom: '', prenom: '', email: '', tel: '', identifiant: '', cin: '', matiere: '' });
      fetchTeachers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleDelete = async (idUser) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet enseignant ?')) return;
    try {
      const token = localStorage.getItem('token');
      console.log('Token for delete:', token ? 'Present' : 'Missing');
      
      // L'interceptor axios ajoute déjà le token automatiquement
      await axios.delete(`/api/users/${idUser}`);
      fetchTeachers();
    } catch (err) {
      console.error('Delete error:', err.response?.data || err.message);
      console.error('Full error response:', err.response);
      alert('Erreur lors de la suppression: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleStatusChange = async (idUser, newStatus) => {
    setStatusLoading(prev => ({ ...prev, [idUser]: true }));
    try {
      await axios.put(`/api/users/${idUser}/status`, { statusCompte: newStatus });
      fetchTeachers();
    } catch (err) {
      console.error('Status change error:', err);
      alert('Erreur lors du changement de statut: ' + (err.response?.data?.message || err.message));
    } finally {
      setStatusLoading(prev => ({ ...prev, [idUser]: false }));
    }
  };

  // Fetch availability for a selected teacher
  const fetchTeacherAvailability = async (teacherId) => {
    if (!teacherId) {
      setTeacherAvailability({lundi: [],mardi: [],mercredi: [],jeudi: [],vendredi: [],samedi: []}); // Clear availability if no teacher selected
      setAvailabilityError(null);
      return;
    }
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    try {
      // Assuming the API returns user data including availability at /api/users/:id
      const response = await axios.get(`/api/users/${teacherId}`);
      console.log("API Response Data:", response.data); // Log the response data
      if (response.data && response.data.disponibilite) {
        console.log("Disponibilite found:", response.data.disponibilite); // Log the availability data
        setTeacherAvailability(response.data.disponibilite);
      } else {
        // If no availability data is found, clear it
        console.log("No disponibilite key found in response.");
        setTeacherAvailability({ lundi: [],mardi: [],mercredi: [],jeudi: [],vendredi: [],samedi: []});
        setAvailabilityError('Aucune disponibilité trouvée pour cet enseignant.');
      }
    } catch (err) {
      console.error("Error fetching availability:", err); // Log the error
      setAvailabilityError('Erreur lors du chargement des disponibilités de l\'enseignant.');
      setTeacherAvailability({ lundi: [],mardi: [],mercredi: [],jeudi: [],vendredi: [],samedi: []}); // Clear on error
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleTeacherSelectChange = (e) => {
    const teacherId = e.target.value;
    setSelectedTeacherId(teacherId);
    console.log("Selected Teacher ID:", teacherId); // Log the selected ID
    fetchTeacherAvailability(teacherId);
  };

  // Pagination : calcul des enseignants à afficher
  const filteredTeachers = teachers.filter(enseignant =>
    (enseignant.nom && enseignant.nom.toLowerCase().includes(search.toLowerCase())) ||
    (enseignant.prenom && enseignant.prenom.toLowerCase().includes(search.toLowerCase())) ||
    (enseignant.identifiant && enseignant.identifiant.toLowerCase().includes(search.toLowerCase())) ||
    (enseignant.email && enseignant.email.toLowerCase().includes(search.toLowerCase()))
  );

  const paginatedTeachers = filteredTeachers.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const timeSlots = [
      { debut: "09:00", fin: "12:15" },
      { debut: "13:30", fin: "16:45" },
  ];

  // Helper to get the class name for a slot
  const getSlotClassName = (day, slot) => {
    console.log(`Checking availability for: ${day}, Slot: ${slot.debut}-${slot.fin}`);
    const dayAvailability = teacherAvailability[day.toLowerCase()];
    console.log(`Availability for ${day.toLowerCase()}:`, dayAvailability);
    if (!Array.isArray(dayAvailability)) {
        console.log(`Availability for ${day.toLowerCase()} is not an array.`);
        return ''; // Return empty string if not an array
    }
    const isAvailable = dayAvailability.some(s => s.debut === slot.debut && s.fin === slot.fin);
    console.log(`Is slot available for ${day.toLowerCase()}?`, isAvailable);
    return isAvailable ? 'available' : ''; // Return class name directly
  };

  // Log current state for debugging
  console.log("Current state:", { selectedTeacherId, teacherAvailability });

  if (loading) {
    return (
      <AdminLayout
        activeMenu="Enseignant"
        setActiveMenu={() => {}}
        loading={true}
        loadingMessage="Chargement des enseignants..."
      />
    );
  }

  return (
    <AdminLayout
      activeMenu="Enseignant"
      setActiveMenu={() => {}}
      title="Gestion des Enseignants"
      subtitle="Gestion des comptes enseignants et disponibilités"
    >
      <div>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'none' }} />
        <div className="tabs" style={{ marginBottom: '2rem', borderBottom: '1px solid #ddd', display: 'flex' }}>
          <button
            style={{ padding: '1rem', border: 'none', background: activeTab === 'gestion' ? '#fff' : 'transparent', borderBottom: activeTab === 'gestion' ? '3px solid #CB0920' : 'none', cursor: 'pointer', fontWeight: '600' }}
            onClick={() => setActiveTab('gestion')}>
            Gestion des Enseignants
          </button>
          <button
            style={{ padding: '1rem', border: 'none', background: activeTab === 'disponibilite' ? '#fff' : 'transparent', borderBottom: activeTab === 'disponibilite' ? '3px solid #CB0920' : 'none', cursor: 'pointer', fontWeight: '600' }}
            onClick={() => setActiveTab('disponibilite')}>
            Disponibilité
          </button>
        </div>

        {activeTab === 'gestion' && (
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Gestion des Enseignants</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid #CB0920',
                      minWidth: 180,
                      fontSize: 16
                    }}
                  />
                  <button
                    className="add-enseignant-btn"
                    title="Ajouter un enseignant"
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
                <form className="add-enseignant-form" onSubmit={handleFormSubmit} style={{
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
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    <input name="matiere" value={formData.matiere} onChange={handleFormChange} placeholder="Matière" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
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
                <form className="add-enseignant-form" onSubmit={handleEditSubmit} style={{
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
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    <input name="matiere" value={editData.matiere} onChange={handleEditChange} placeholder="Matière" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
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
                  {paginatedTeachers.map((enseignant) => (
                    <div key={enseignant.idUser} className="user-card">
                      <div className="user-card-header">
                        <div className="user-card-avatar">
                          {enseignant.imageUrl ? (
                            <img 
                              src={enseignant.imageUrl} 
                              alt="Avatar" 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                borderRadius: '50%', 
                                objectFit: 'cover' 
                              }} 
                            />
                          ) : (
                            enseignant.prenom?.charAt(0)?.toUpperCase() || '👨‍🏫'
                          )}
                        </div>
                        <h3 className="user-card-name">
                          {enseignant.prenom} {enseignant.nom}
                        </h3>
                        <p className="user-card-role">👨‍🏫 Enseignant</p>
                      </div>
                      
                      <div className="user-card-body">
                        <div className={`user-status-badge ${(enseignant.statusCompte || 'ACTIF').toLowerCase()}`}>
                          {enseignant.statusCompte === 'ACTIF' ? '✅ Actif' : 
                           enseignant.statusCompte === 'INACTIF' ? '❌ Inactif' : 
                           enseignant.statusCompte === 'SUSPENDU' ? '⏸️ Suspendu' : '✅ Actif'}
                        </div>
                        
                        <div className="user-info-grid">
                          <div className="user-info-item">
                            <span className="user-info-icon">🆔</span>
                            <span className="user-info-label">Identifiant:</span>
                            <span className="user-info-value">{enseignant.identifiant || '—'}</span>
                          </div>
                          
                          <div className="user-info-item">
                            <span className="user-info-icon">📧</span>
                            <span className="user-info-label">Email:</span>
                            <span className="user-info-value">{enseignant.email}</span>
                          </div>
                          
                          <div className="user-info-item">
                            <span className="user-info-icon">📱</span>
                            <span className="user-info-label">Téléphone:</span>
                            <span className="user-info-value">{enseignant.tel}</span>
                          </div>
                          
                          <div className="user-info-item">
                            <span className="user-info-icon">🆔</span>
                            <span className="user-info-label">CIN:</span>
                            <span className="user-info-value">{enseignant.cin}</span>
                          </div>
                          
                          <div className="user-info-item">
                            <span className="user-info-icon">📚</span>
                            <span className="user-info-label">Matière:</span>
                            <span className="user-info-value">{enseignant.matiere}</span>
                          </div>
                        </div>
                        
                        <div className="user-card-actions">
                          <select
                            className="user-card-status-select"
                            value={enseignant.statusCompte || 'ACTIF'}
                            onChange={(e) => handleStatusChange(enseignant.idUser, e.target.value)}
                            disabled={statusLoading[enseignant.idUser]}
                          >
                            <option value="ACTIF">✅ Actif</option>
                            <option value="INACTIF">❌ Inactif</option>
                            <option value="SUSPENDU">⏸️ Suspendu</option>
                          </select>
                          
                          <div className="user-card-buttons">
                            <button
                              className="user-card-btn user-card-btn-edit"
                              onClick={() => handleEditClick(enseignant)}
                              disabled={statusLoading[enseignant.idUser]}
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              className="user-card-btn user-card-btn-delete"
                              onClick={() => handleDelete(enseignant.idUser)}
                              disabled={statusLoading[enseignant.idUser]}
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                        
                        {statusLoading[enseignant.idUser] && (
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
                      count={Math.ceil(filteredTeachers.length / rowsPerPage)}
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
          
        )}

        {activeTab === 'disponibilite' && (
          <div>
            <h2 className="section-title">Disponibilité des Enseignants</h2>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label htmlFor="enseignant-select" style={{ fontWeight: 'bold' }}>Sélectionner un enseignant :</label>
              <select
                id="enseignant-select"
                value={selectedTeacherId}
                onChange={handleTeacherSelectChange}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  minWidth: 200,
                  fontSize: 16
                }}
              >
                <option value="">-- Sélectionner un enseignant --</option>
                {teachers.map(teacher => (
                  <option key={teacher.idUser} value={teacher.idUser}>
                    {teacher.prenom} {teacher.nom} ({teacher.identifiant})
                  </option>
                ))}
              </select>
            </div>

            {availabilityLoading ? (
              <p>Chargement des disponibilités...</p>
            ) : availabilityError ? (
              <p style={{ color: 'red' }}>{availabilityError}</p>
            ) : selectedTeacherId && (
              <form onSubmit={(e) => e.preventDefault()} style={{ marginTop: '1rem' }}>
                <table className="table-dashboard">
                  <thead>
                    <tr>
                      <th></th>
                      <th>09:00 - 12:15</th>
                      <th className="pause-header">PAUSE</th>
                      <th>13:30 - 16:45</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(day => {
                      const slotClassNameMorning = getSlotClassName(day, timeSlots[0]);
                      const slotClassNameAfternoon = getSlotClassName(day, timeSlots[1]);
                      return (
                        <tr key={day}>
                          <th>{day}</th>
                          <td
                            className={slotClassNameMorning}
                            style={{ backgroundColor: slotClassNameMorning === 'available' ? 'lightgreen' : 'transparent' }}
                          ></td>
                          <td className="pause-cell" style={{ backgroundColor: '#f0f0f0' }}></td>
                          <td
                            className={slotClassNameAfternoon}
                            style={{ backgroundColor: slotClassNameAfternoon === 'available' ? 'lightgreen' : 'transparent' }}
                          ></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </form>
            )}
            {!selectedTeacherId && !availabilityLoading && !availabilityError && (
              <p>Veuillez sélectionner un enseignant pour voir ses disponibilités.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Enseignant;
