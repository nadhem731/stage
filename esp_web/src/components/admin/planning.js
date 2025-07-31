import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar';
import '../../style/etudient.css';

const Planning = () => {
  const [plannings, setPlannings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [formData, setFormData] = useState({
    dateDebut: '',
    dateFin: '',
    statutTypeStatus: '',
    idSalle: '',
    idUser: '',
    idClasse: '',
    classe: ''
  });

  useEffect(() => {
    fetchPlannings();
  }, [currentWeekStart]);

  const fetchPlannings = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/plannings');
      if (!response.ok) throw new Error('Erreur lors de la récupération des plannings');
      const data = await response.json();
      setPlannings(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const nextWeek = () => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekStart(nextWeek);
  };

  const prevWeek = () => {
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeekStart(prevWeek);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8080/api/plannings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateDebut: formData.dateDebut,
          dateFin: formData.dateFin,
          statutTypeStatus: formData.statutTypeStatus,
          idSalle: parseInt(formData.idSalle),
          idUser: parseInt(formData.idUser),
          idClasse: parseInt(formData.idClasse)
        })
      });
      if (!response.ok) throw new Error("Erreur lors de l'ajout du planning");
      await fetchPlannings();
      setFormData({ dateDebut: '', dateFin: '', statutTypeStatus: '', idSalle: '', idUser: '', idClasse: '', classe: '' });
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center py-10">Chargement...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Erreur : {error}</div>;

  // Grouper les plannings par salle
  const planningsBySalle = plannings.reduce((acc, planning) => {
    const salleId = planning.salle?.idSalle || 'Sans Salle';
    if (!acc[salleId]) acc[salleId] = [];
    acc[salleId].push(planning);
    return acc;
  }, {});

  // Grouper les plannings par enseignant
  const planningsByEnseignant = plannings.reduce((acc, planning) => {
    const userId = planning.user?.idUser || 'Sans Enseignant';
    if (!acc[userId]) acc[userId] = [];
    acc[userId].push(planning);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7f7' }}>
      <Sidebar activeMenu="Planning" setActiveMenu={() => {}} />
      <main style={{ flex: 1, padding: '2rem', marginLeft: 260 }}>
        <div className="dashboard-content" style={{ maxWidth: 1100, margin: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 32 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Gestion des Plannings</h2>
          {/* Formulaire d'Ajout */}
          <div className="add-etudient-form" style={{ background: '#fafafa', border: '1px solid #f5f5f5', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, maxWidth: 600, margin: '24px auto 0 auto' }}>
            <h3 style={{ marginBottom: 16 }}>Ajouter un Planning</h3>
            {error && <p style={{ color: '#CB0920', marginBottom: 10 }}>{error}</p>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <input type="date" name="dateDebut" value={formData.dateDebut} onChange={handleChange} required style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              <input type="date" name="dateFin" value={formData.dateFin} onChange={handleChange} required style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              <select name="statutTypeStatus" value={formData.statutTypeStatus} onChange={handleChange} required style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
                <option value="">Statut</option>
                <option value="en cours">En cours</option>
                <option value="validé">Validé</option>
              </select>
              <input type="number" name="idSalle" value={formData.idSalle} onChange={handleChange} required placeholder="ID Salle" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              <input type="number" name="idUser" value={formData.idUser} onChange={handleChange} required placeholder="ID Enseignant" style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
              <input
                type="number"
                name="idClasse"
                value={formData.idClasse}
                onChange={handleChange}
                required
                placeholder="ID Classe"
                style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <button type="submit" style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', flex: 1 }}>Ajouter</button>
            </form>
          </div>

          {/* Navigation semaine */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 24px 0' }}>
            <button onClick={prevWeek} style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Semaine Précédente</button>
            <span style={{ fontWeight: 600, fontSize: 18 }}>
              Semaine du {currentWeekStart.toLocaleDateString()} au {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </span>
            <button onClick={nextWeek} style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Semaine Suivante</button>
          </div>

          {/* Planning par Salle */}
          <div style={{ marginTop: 32 }}>
            <h3 style={{ marginBottom: 16 }}>Planning par Salle</h3>
            {Object.keys(planningsBySalle).map((salleId) => (
              <div key={salleId} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 24, padding: 16 }}>
                <h4 style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Salle {salleId} - {planningsBySalle[salleId][0]?.salle?.numSalle || 'Non définie'}</h4>
                <table className="table-dashboard">
                  <thead>
                    <tr>
                      <th>Jour</th>
                      <th>Classe</th>
                      <th>Enseignant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((day, index) => {
                      const date = new Date(currentWeekStart);
                      date.setDate(date.getDate() + index);
                      const planning = planningsBySalle[salleId].find(p => new Date(p.dateDebut).toDateString() === date.toDateString());
                      return (
                        <tr key={day}>
                          <td>{day} ({date.toLocaleDateString()})</td>
                          <td>{planning?.classe?.nomClasse || planning?.classe?.idClasse || '—'}</td>
                          <td>{planning?.user?.nom || 'Non assigné'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Planning par Enseignant */}
          <div style={{ marginTop: 32 }}>
            <h3 style={{ marginBottom: 16 }}>Planning par Enseignant</h3>
            {Object.keys(planningsByEnseignant).map((userId) => (
              <div key={userId} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 24, padding: 16 }}>
                <h4 style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Enseignant {userId} - {planningsByEnseignant[userId][0]?.user?.nom || 'Non défini'}</h4>
                <table className="table-dashboard">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Salle</th>
                      <th>Classe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planningsByEnseignant[userId].map((planning) => (
                      <tr key={planning.idPlanning}>
                        <td>{new Date(planning.dateDebut).toLocaleDateString()}</td>
                        <td>{planning.salle?.numSalle || 'Non définie'}</td>
                        <td>{planning.classe?.nomClasse || planning.classe?.idClasse || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Planning;