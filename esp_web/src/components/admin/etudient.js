import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import Sidebar from '../Sidebar';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import '../../style/etudient.css';
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
  const rowsPerPage = 8; // nombre d'étudiants par page
  const [search, setSearch] = useState('');

  // Fonction utilitaire pour rafraîchir la liste des étudiants
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/users');
      // On ne garde que les utilisateurs dont le rôle est 'Etudiant'
      const etudiants = res.data.filter(u => u.role && (u.role.typeRole === 'Etudiant' || u.role === 'Etudiant'));
      setStudents(etudiants);
    } catch (err) {
      setError('Erreur lors du chargement des étudiants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
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
      await axios.post('/api/auth/signup', {
        ...formData,
        roleTypeRole: 'Etudiant',
        password: formData.cin, // mot de passe = cin
      });
      setFormSuccess('Étudiant ajouté avec succès !');
      setShowForm(false);
      setFormData({ nom: '', prenom: '', email: '', tel: '', identifiant: '', cin: '' });
      // Rafraîchir la liste
      fetchStudents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erreur lors de l\'ajout');
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
      setFormSuccess('Étudiant modifié avec succès !');
      setEditId(null);
      setEditData({ nom: '', prenom: '', email: '', tel: '', identifiant: '', cin: '' });
      // Rafraîchir la liste
      fetchStudents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleDelete = async (idUser) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet étudiant ?')) return;
    try {
      await axios.delete(`/api/users/${idUser}`);
      // Rafraîchir la liste
      fetchStudents();
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeMenu="Etudient" setActiveMenu={() => {}} />
      <main style={{ flex: 1, padding: '2rem', marginLeft: 260 }}>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'none' }} />
        <div className="dashboard-content" style={{ position: 'relative' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Gestion des Étudiants</span>
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
            <div style={{ marginTop: '2rem' }}>
              <table className="table-dashboard">
                <thead>
                  <tr>
                    <th>IDENTIFIANT</th>
                    <th>NOM</th>
                    <th>PRÉNOM</th>
                    <th>EMAIL</th>
                    <th>TÉLÉPHONE</th>
                    <th>CIN</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((etudiant) => (
                    <tr key={etudiant.idUser}>
                      <td>{etudiant.identifiant || '—'}</td>
                      <td>{etudiant.nom}</td>
                      <td>{etudiant.prenom}</td>
                      <td>{etudiant.email}</td>
                      <td>{etudiant.tel}</td>
                      <td>{etudiant.cin}</td>
                      <td>
                        <button
                          style={{ background: '#eee', color: '#CB0920', border: 'none', borderRadius: 5, padding: '4px 10px', marginRight: 6, cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => handleEditClick(etudiant)}
                        >Modifier</button>
                        <button
                          style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => handleDelete(etudiant.idUser)}
                        >Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <Stack spacing={2} sx={{ alignItems: 'center', marginTop: 3 }}>
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
          )}
        </div>
      </main>
    </div>
  );
};

export default Etudient;