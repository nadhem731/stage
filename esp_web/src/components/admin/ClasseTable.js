import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import '../../style/etudient.css';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Sidebar from '../Sidebar';

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
  const rowsPerPage = 8;

  const [search, setSearch] = useState('');

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/classes');
      setClasses(res.data);
    } catch (err) {
      setError('Erreur lors du chargement des classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
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
      setAutoSuccess('Classe modifiée avec succès !');
      setEditId(null);
      setEditData({ nomClasse: '' });
      fetchClasses();
    } catch (err) {
      setAutoError(err.response?.data?.message || err.message || 'Erreur lors de la modification');
    }
  };

  const handleDelete = async (idClasse) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette classe ?')) return;
    try {
      await axios.delete(`/api/classes/${idClasse}`);
      fetchClasses();
    } catch (err) {
      alert('Erreur lors de la suppression');
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
      setAutoSuccess(`Classes générées : ${Array.from({length: autoCount}, (_,i) => `${autoBase}${i+1}`).join(', ')}`);
      setAutoBase('');
      setAutoCount(1);
      fetchClasses();
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeMenu="Classe" setActiveMenu={() => {}} />
      <main style={{ flex: 1, padding: '2rem', marginLeft: 260 }}>
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
          <div style={{ marginTop: '2rem' }}>
            {/* Champ de recherche déplacé dans le header */}
            <table className="table-dashboard">
              <thead>
                <tr>
                  <th>NOM</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClasses.map((classe) => (
                  <tr key={classe.idClasse}>
                    <td>{classe.nomClasse}</td>
                    <td>
                      <button style={{ background: '#eee', color: '#CB0920', border: 'none', borderRadius: 5, padding: '4px 10px', marginRight: 6, cursor: 'pointer', fontWeight: 600 }} onClick={() => handleEditClick(classe)}>Modifier</button>
                      <button style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }} onClick={() => handleDelete(classe.idClasse)}>Supprimer</button>
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
      </main>
    </div>
  );
};

export default ClasseTable; 