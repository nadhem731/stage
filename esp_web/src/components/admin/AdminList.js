import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import AdminLayout from './AdminLayout';
import './AdminList.css';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';

const AdminList = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ nom: '', prenom: '', email: '', tel: '', identifiant: '' });
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const rowsPerPage = 8;

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/admins');
      console.log('DEBUG: Administrateurs récupérés:', response.data);
      setAdmins(response.data);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération des admins:', err);
      setError('Erreur lors du chargement des administrateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (admin) => {
    setEditId(admin.idUser);
    setEditData({
      nom: admin.nom,
      prenom: admin.prenom,
      email: admin.email,
      tel: admin.tel,
      identifiant: admin.identifiant || ''
    });
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
    if (!editData.nom || !editData.prenom || !editData.email || !editData.tel || !editData.identifiant) {
      setFormError('Tous les champs sont obligatoires');
      return;
    }
    try {
      const payload = {
        nom: editData.nom,
        prenom: editData.prenom,
        email: editData.email,
        tel: editData.tel,
        identifiant: editData.identifiant
      };
      await axios.put(`/api/users/${editId}`, payload);
      setFormSuccess('Administrateur modifié avec succès !');
      setEditId(null);
      setEditData({ nom: '', prenom: '', email: '', tel: '', identifiant: '' });
      fetchAdmins();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleDelete = async (idUser) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet administrateur ?')) return;
    try {
      await axios.delete(`/api/users/${idUser}`);
      fetchAdmins();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  // Filtrage des admins selon le terme de recherche
  const filteredAdmins = admins.filter(admin => {
    const searchLower = search.toLowerCase();
    return (
      admin.nom?.toLowerCase().includes(searchLower) ||
      admin.prenom?.toLowerCase().includes(searchLower) ||
      admin.email?.toLowerCase().includes(searchLower) ||
      admin.identifiant?.toLowerCase().includes(searchLower) ||
      admin.tel?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination sur la liste filtrée
  const paginatedAdmins = filteredAdmins.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // eslint-disable-next-line no-unused-vars
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  if (loading) {
    return (
      <AdminLayout
        activeMenu="admin-list"
        setActiveMenu={() => {}}
        loading={true}
        loadingMessage="Chargement des administrateurs..."
      />
    );
  }

  return (
    <AdminLayout
      activeMenu="admin-list"
      setActiveMenu={() => {}}
      title="Liste des Administrateurs"
      subtitle="Gestion des comptes administrateurs"
    >
      <button onClick={() => navigate('/dashboard')} style={{ display: 'none' }} />
      
      <div className="admin-search-container" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
        <input
          type="text"
          placeholder="Rechercher un administrateur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-search-input"
        />
      </div>
      
        
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
            <h3 style={{ marginBottom: 20, color: '#CB0920', textAlign: 'center' }}>Modifier l'administrateur</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input 
                name="nom" 
                value={editData.nom} 
                onChange={handleEditChange} 
                placeholder="Nom" 
                style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} 
              />
              <input 
                name="prenom" 
                value={editData.prenom} 
                onChange={handleEditChange} 
                placeholder="Prénom" 
                style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} 
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <input 
                name="email" 
                value={editData.email} 
                onChange={handleEditChange} 
                placeholder="Email" 
                type="email" 
                style={{ flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} 
              />
              <input 
                name="tel" 
                value={editData.tel} 
                onChange={handleEditChange} 
                placeholder="Téléphone" 
                style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} 
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <input 
                name="identifiant" 
                value={editData.identifiant} 
                onChange={handleEditChange} 
                placeholder="Identifiant" 
                style={{ flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} 
              />
            </div>
            {formError && <div style={{ color: '#CB0920', marginTop: 10, fontWeight: 500 }}>{formError}</div>}
            {formSuccess && <div style={{ color: 'green', marginTop: 10, fontWeight: 500 }}>{formSuccess}</div>}
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                type="button" 
                onClick={() => setEditId(null)} 
                style={{ background: '#eee', color: '#CB0920', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button 
                type="submit" 
                style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}
              >
                Enregistrer
              </button>
            </div>
          </form>
        )}
        
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <div className="admin-loading-text">Chargement des administrateurs...</div>
          </div>
        ) : error ? (
          <div className="admin-error">
            ⚠️ {error}
          </div>
        ) : (
          <div className="admin-cards" style={{ marginTop: '2rem' }}>
            {paginatedAdmins.map((admin) => (
              <div key={admin.idUser} className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-avatar">
                    {admin.imageUrl ? (
                      <img src={admin.imageUrl} alt="Avatar" />
                    ) : (
                      <span className="admin-card-avatar-fallback">👨‍💼</span>
                    )}
                  </div>
                  <div className="admin-card-title">
                    <div className="admin-card-name">{admin.prenom} {admin.nom}</div>
                    <div className="admin-card-identifiant">{admin.identifiant || '—'}</div>
                  </div>
                </div>
                <div className="admin-card-body">
                  <div className="admin-card-field">
                    <span className="admin-card-label">Email</span>
                    <span className="admin-card-value">{admin.email || '—'}</span>
                  </div>
                  <div className="admin-card-field">
                    <span className="admin-card-label">Téléphone</span>
                    <span className="admin-card-value">{admin.tel || '—'}</span>
                  </div>
                </div>
                <div className="admin-card-actions">
                  <button
                    className="admin-card-btn admin-card-btn-edit"
                    onClick={() => handleEditClick(admin)}
                  >
                    Modifier
                  </button>
                  <button
                    className="admin-card-btn admin-card-btn-delete"
                    onClick={() => handleDelete(admin.idUser)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="admin-pagination">
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Pagination
              count={Math.ceil(filteredAdmins.length / rowsPerPage)}
              page={page}
              onChange={(_, value) => setPage(value)}
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#CB0920',
                  borderColor: '#CB0920',
                  fontSize: '1rem',
                  fontWeight: '600',
                },
                '& .Mui-selected': {
                  backgroundColor: '#CB0920 !important',
                  color: '#fff !important',
                  borderColor: '#CB0920',
                  boxShadow: '0 2px 8px rgba(203, 9, 32, 0.3)',
                },
                '& .MuiPaginationItem-root.Mui-selected:hover': {
                  backgroundColor: '#b8081c !important',
                },
                '& .MuiPaginationItem-root:hover': {
                  backgroundColor: '#fbeaec',
                  transform: 'translateY(-1px)',
                }
              }}
            />
          </Stack>
        </div>
    </AdminLayout>
  );
};

export default AdminList;
