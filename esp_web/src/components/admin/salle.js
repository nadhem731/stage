// esp_web/src/components/admin/salle.js
import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import AdminLayout from './AdminLayout';
import '../../style/etudient.css';
import '../../style/table.css';

const Salle = () => {
  const [salles, setSalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(true); // Default to batch form
  const [formData, setFormData] = useState({
    numSalle: '',
    capacite: '',
    bloc: '',
    disponibilite: true,
    typeSalle: { typeSalle: '' },
    // New fields for batch creation
    blocName: '',
    numberOfRooms: ''
  });
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({
    numSalle: '',
    capacite: '',
    bloc: '',
    disponibilite: true,
    typeSalle: { typeSalle: '' }
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeSalles, setTypeSalles] = useState([]);

  const fetchSalles = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setLoading(true);
      }
      setError(null);
      const res = await axios.get('/api/salles', {
        params: { 
          _t: Date.now() // Cache busting timestamp
        },
        headers: { 
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log('DEBUG: Salles récupérées:', res.data);
      setSalles(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des salles:', err);
      setError('Erreur lors du chargement des salles');
    } finally {
      if (forceRefresh) {
        setLoading(false);
      }
    }
  };

  const fetchTypeSalles = async () => {
    try {
      console.log('Fetching types de salles...');
      const res = await axios.get('/api/typesalle');
      console.log('Types de salles récupérés:', res.data);
      setTypeSalles(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des types de salle:', err);
      setError('Erreur lors du chargement des types de salle');
      // En cas d'erreur, définir des types par défaut
      setTypeSalles([
        { typeSalle: 'salle de cour' },
        { typeSalle: 'salle de soutenance' },
        { typeSalle: 'amphie' }
      ]);
    }
  };


  useEffect(() => {
    fetchSalles(true);
    fetchTypeSalles();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleAddClick = () => {
    setShowForm(true);
    setShowBatchForm(true); // Default to batch form
    setFormError(null);
    setFormSuccess(null);
    setFormData({ // Reset form data
      numSalle: '',
      capacite: '',
      bloc: '',
      disponibilite: true,
      typeSalle: { typeSalle: '' },
      blocName: '',
      numberOfRooms: ''
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'typeSalle') {
      setFormData({ ...formData, typeSalle: { typeSalle: value } });
    } else if (name === 'disponibilite') {
      setFormData({ ...formData, disponibilite: value === 'true' });
    } else if (name === 'numberOfRooms') {
      setFormData({ ...formData, [name]: parseInt(value) || '' }); // Parse to integer
    }
    else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (showBatchForm) {
      // Batch creation logic
      if (!formData.blocName || !formData.numberOfRooms || !formData.capacite || !formData.typeSalle.typeSalle) {
        setFormError('Tous les champs (Nom du bloc, Nombre de salles, Capacité, Type de salle) sont obligatoires pour la création par lot.');
        return;
      }
      try {
        const batchData = {
          blocName: formData.blocName,
          numberOfRooms: formData.numberOfRooms,
          capacite: formData.capacite,
          disponibilite: formData.disponibilite,
          typeSalleId: formData.typeSalle.typeSalle
        };
        await axios.post('/api/salles/batch', batchData);
        
        // Réinitialiser le formulaire immédiatement
        setFormData({ numSalle: '', capacite: '', bloc: '', disponibilite: true, typeSalle: { typeSalle: '' }, blocName: '', numberOfRooms: '' });
        setShowForm(false);
        
        // Rafraîchir avec un délai court
        setTimeout(async () => {
          await fetchSalles();
          setFormSuccess('Salles ajoutées avec succès !');
        }, 500);
      } catch (err) {
        setFormError(
          err.response?.data?.message ||
          err.response?.data ||
          err.message ||
          'Erreur lors de l\'ajout par lot'
        );
      }
    } else {
      // Single room creation logic
      if (!formData.numSalle || !formData.capacite || !formData.typeSalle.typeSalle || !formData.bloc) {
        setFormError('Tous les champs sont obligatoires');
        return;
      }
      try {
        await axios.post('/api/salles', formData);
        
        // Réinitialiser le formulaire immédiatement
        setFormData({ numSalle: '', capacite: '', bloc: '', disponibilite: true, typeSalle: { typeSalle: '' }, blocName: '', numberOfRooms: '' });
        setShowForm(false);
        
        // Rafraîchir avec un délai court
        setTimeout(async () => {
          await fetchSalles();
          setFormSuccess('Salle ajoutée avec succès !');
        }, 500);
      } catch (err) {
        setFormError(
          err.response?.data?.message ||
          err.response?.data ||
          err.message ||
          'Erreur lors de l\'ajout'
        );
      }
    }
  };

  const handleEditClick = (salle) => {
    setEditId(salle.idSalle);
    setEditData({
      numSalle: salle.numSalle,
      capacite: salle.capacite,
      bloc: salle.bloc,
      disponibilite: salle.disponibilite,
      typeSalle: { typeSalle: salle.typeSalle?.typeSalle || '' }
    });
    setShowForm(false);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === 'typeSalle') {
      setEditData({ ...editData, typeSalle: { typeSalle: value } });
    } else if (name === 'disponibilite') {
      setEditData({ ...editData, disponibilite: value === 'true' });
    } else {
      setEditData({ ...editData, [name]: value });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!editData.numSalle || !editData.capacite || !editData.typeSalle.typeSalle || !editData.bloc) {
      setFormError('Tous les champs sont obligatoires');
      return;
    }
    try {
      await axios.put(`/api/salles/${editId}`, editData);
      
      // Réinitialiser le formulaire immédiatement
      setEditId(null);
      setEditData({ numSalle: '', capacite: '', bloc: '', disponibilite: true, typeSalle: { typeSalle: '' } });
      
      // Rafraîchir avec un délai court
      setTimeout(async () => {
        await fetchSalles();
        setFormSuccess('Salle modifiée avec succès !');
      }, 300);
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        'Erreur lors de la modification'
      );
    }
  };

  const handleDelete = async (idSalle) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette salle ?')) return;
    try {
      await axios.delete(`/api/salles/${idSalle}`);
      
      // Rafraîchir avec un délai court
      setTimeout(async () => {
        await fetchSalles();
      }, 300);
      
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };
  const handleDisponibiliteChange = async (idSalle, newDisponibilite) => {
    try {
      await axios.put(`/api/salles/${idSalle}`, { disponibilite: newDisponibilite });
      fetchSalles(); // Refresh the list after update
    } catch (err) {
      alert('Erreur lors de la mise à jour de la disponibilité.');
      console.error(err);
    }
  };

  const handleTypeChange = async (idSalle, newType) => {
    try {
      // Récupérer les données actuelles de la salle
      const currentSalle = salles.find(s => s.idSalle === idSalle);
      if (!currentSalle) return;
      
      // Préparer les données avec le nouveau type
      const updatedData = {
        numSalle: currentSalle.numSalle,
        capacite: currentSalle.capacite,
        bloc: currentSalle.bloc,
        disponibilite: currentSalle.disponibilite,
        typeSalle: { typeSalle: newType }
      };
      
      await axios.put(`/api/salles/${idSalle}`, updatedData);
      fetchSalles(); // Refresh the list after update
    } catch (err) {
      alert('Erreur lors de la mise à jour du type.');
      console.error(err);
    }
  };
 
  // Recherche et pagination
  const filteredSalles = salles.filter(salle =>
    (salle.numSalle && salle.numSalle.toLowerCase().includes(search.toLowerCase())) ||
    (salle.typeSalle && (typeof salle.typeSalle === 'string'
      ? salle.typeSalle.toLowerCase().includes(search.toLowerCase())
      : salle.typeSalle.typeSalle?.toLowerCase().includes(search.toLowerCase()))) ||
    (salle.bloc && salle.bloc.toLowerCase().includes(search.toLowerCase()))
  );
  // Trie les salles par numSalle (ordre croissant)
  const sortedSalles = [...filteredSalles].sort((a, b) => 
    a.numSalle.localeCompare(b.numSalle, undefined, { numeric: true })
  );

  // Regroupe les salles par première lettre du numéro
  const groupByFirstLetter = (arr) => {
    const groups = {};
    arr.forEach(salle => {
      const firstLetter = salle.numSalle.charAt(0).toUpperCase();
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(salle);
    });
    return groups;
  };
  const grouped = groupByFirstLetter(sortedSalles);
  const groupKeys = Object.keys(grouped).sort();

  // Pagination par groupe de première lettre
  const currentGroupKey = groupKeys[page - 1];
  const paginatedSalles = grouped[currentGroupKey] || [];

  // Utiliser les types récupérés depuis l'API
  const typeSallesDisponibles = typeSalles;

  if (loading) {
    return (
      <AdminLayout
        activeMenu="Salle"
        setActiveMenu={() => {}}
        loading={true}
        loadingMessage="Chargement des salles..."
      />
    );
  }

  return (
    <AdminLayout
      activeMenu="Salle"
      setActiveMenu={() => {}}
      title="Gestion des Salles"
      subtitle="Gestion des salles et classes"
    >
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Gestion des Salles</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="text"
                  placeholder="Rechercher par numéro, type ou bloc..."
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
                  className="refresh-btn"
                  title="Actualiser la liste"
                  onClick={() => fetchSalles(true)}
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
                  title="Ajouter une salle"
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
              <form className="add-salle-form" onSubmit={handleFormSubmit} style={{
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
                  {/* Toggle button for single/batch form */}
                  <button
                    type="button"
                    onClick={() => setShowBatchForm(!showBatchForm)}
                    style={{
                      background: '#f0f0f0',
                      color: '#333',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginBottom: 12,
                      width: '100%'
                    }}
                  >
                    {showBatchForm ? 'Ajouter une seule salle' : 'Ajouter plusieurs salles'}
                  </button>

                  {!showBatchForm && (
                    <>
                      <input name="numSalle" value={formData.numSalle} onChange={handleFormChange} placeholder="Numéro de salle" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                      <input name="bloc" value={formData.bloc} onChange={handleFormChange} placeholder="Bloc" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                    </>
                  )}
                  {showBatchForm && (
                    <>
                      <input name="blocName" value={formData.blocName} onChange={handleFormChange} placeholder="Nom du bloc (ex: A)" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                      <input name="numberOfRooms" value={formData.numberOfRooms} onChange={handleFormChange} placeholder="Nombre de salles (ex: 5)" type="number" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                    </>
                  )}
                  <input name="capacite" value={formData.capacite} onChange={handleFormChange} placeholder="Capacité" type="number" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  <select name="typeSalle" value={formData.typeSalle.typeSalle} onChange={handleFormChange} style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} required>
                    <option value="">Sélectionner un type</option>
                    {typeSallesDisponibles && typeSallesDisponibles.length > 0 ? (
                      typeSallesDisponibles.map((ts) => (
                        <option key={ts.typeSalle} value={ts.typeSalle}>{ts.typeSalle}</option>
                      ))
                    ) : (
                      <>
                        <option value="salle de cour">salle de cour</option>
                        <option value="salle de soutenance">salle de soutenance</option>
                        <option value="amphie">amphie</option>
                      </>
                    )}
                  </select>
                  <select name="disponibilite" value={formData.disponibilite} onChange={handleFormChange} style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
                    <option value={true}>Disponible</option>
                    <option value={false}>Indisponible</option>
                  </select>
                </div>
                {formError && <div style={{ color: '#CB0920', marginTop: 10, fontWeight: 500 }}>{formError}</div>}
                {formSuccess && <div style={{ color: 'green', marginTop: 10, fontWeight: 500 }}>{formSuccess}</div>}
                <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ background: '#eee', color: '#CB0920', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                  <button type="submit" style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>{showBatchForm ? 'Ajouter les salles' : 'Ajouter'}</button>
                </div>
              </form>
            )}
            {editId && (
              <form className="add-salle-form" onSubmit={handleEditSubmit} style={{
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
                  <input name="numSalle" value={editData.numSalle} onChange={handleEditChange} placeholder="Numéro de salle" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                  <input name="capacite" value={editData.capacite} onChange={handleEditChange} placeholder="Capacité" type="number" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  <input name="bloc" value={editData.bloc} onChange={handleEditChange} placeholder="Bloc" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                  <select name="typeSalle" value={editData.typeSalle.typeSalle} onChange={handleEditChange} style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} required>
                    <option value="">Sélectionner un type</option>
                    {typeSallesDisponibles && typeSallesDisponibles.length > 0 ? (
                      typeSallesDisponibles.map((ts) => (
                        <option key={ts.typeSalle} value={ts.typeSalle}>{ts.typeSalle}</option>
                      ))
                    ) : (
                      <>
                        <option value="salle de cour">salle de cour</option>
                        <option value="salle de soutenance">salle de soutenance</option>
                        <option value="amphie">amphie</option>
                      </>
                    )}
                  </select>
                  <select name="disponibilite" value={editData.disponibilite} onChange={handleEditChange} style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
                    <option value={true}>Disponible</option>
                    <option value={false}>Indisponible</option>
                  </select>
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
              <div className="table-container" style={{ marginTop: '2rem' }}>
                <table className="table-dashboard rooms-table">
                  <thead>
                    <tr>
                      <th>NUMÉRO</th>
                      <th>CAPACITÉ</th>
                      <th>BLOC</th>
                      <th>TYPE</th>
                      <th>DISPONIBLE</th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSalles.map((salle) => (
                      <tr key={salle.idSalle}>
                        <td>{salle.numSalle}</td>
                        <td>{salle.capacite}</td>
                        <td>{salle.bloc}</td>
                        <td>
                          <select
                            value={typeof salle.typeSalle === 'string' ? salle.typeSalle : salle.typeSalle?.typeSalle || ''}
                            onChange={(e) => handleTypeChange(salle.idSalle, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid #ddd',
                              minWidth: 120,
                              background: '#fff',
                              fontWeight: 500
                            }}
                          >
                            <option value="">Sélectionner un type</option>
                            {typeSallesDisponibles && typeSallesDisponibles.length > 0 ? (
                              typeSallesDisponibles.map((ts) => (
                                <option key={ts.typeSalle} value={ts.typeSalle}>{ts.typeSalle}</option>
                              ))
                            ) : (
                              <>
                                <option value="salle de cour">salle de cour</option>
                                <option value="salle de soutenance">salle de soutenance</option>
                                <option value="amphie">amphie</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td>
                          <select
                            value={salle.disponibilite}
                            onChange={(e) => handleDisponibiliteChange(salle.idSalle, e.target.value === 'true')}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid #ddd',
                              minWidth: 90,
                              background: salle.disponibilite ? '#e8f5e9' : '#ffebee',
                              color: salle.disponibilite ? '#2e7d32' : '#c62828',
                              fontWeight: 600
                            }}
                          >
                            <option value={true}>Oui</option>
                            <option value={false}>Non</option>
                          </select>
                        </td>
                        <td className="actions-cell">
                          <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn-edit"
                              onClick={() => handleEditClick(salle)}
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
                              onClick={() => handleDelete(salle.idSalle)}
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
                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
                  {groupKeys.map((letter, index) => (
                    <button
                      key={letter}
                      onClick={() => setPage(index + 1)}
                      style={{
                        background: page === index + 1 ? '#CB0920' : '#fff',
                        color: page === index + 1 ? '#fff' : '#CB0920',
                        border: '1px solid #CB0920',
                        borderRadius: 6,
                        padding: '8px 16px',
                        fontWeight: 600,
                        fontSize: 16,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minWidth: 40,
                        textAlign: 'center'
                      }}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
            )}
    </AdminLayout>
  );
};

export default Salle;
