import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import Sidebar from '../Sidebar';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { ROLES } from '../../config/roles';
import '../../style/etudient.css';

const Affectation = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [salles, setSalles] = useState([]);
    const [classes, setClasses] = useState([]);
    const [affectations, setAffectations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formType, setFormType] = useState('student'); // 'student' or 'teacher'
    const [formData, setFormData] = useState({
        userId: '',
        salleId: '',
        classeId: '',
        dateAffectation: new Date().toISOString().split('T')[0] // Default to today
    });

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const config = {
                headers: { 'Authorization': `Bearer ${token}` }
            };
            
            const studentParams = { params: { role: ROLES.ETUDIANT } };
            const teacherParams = { params: { role: ROLES.ENSEIGNANT } };

            const [studentsResponse, teachersResponse, sallesResponse, classesResponse, affectationsResponse] = await Promise.all([
                axios.get('/api/users', { ...config, ...studentParams }),
                axios.get('/api/users', { ...config, ...teacherParams }),
                axios.get('/api/salles', config),
                axios.get('/api/classes', config),
                axios.get('/api/affectations', config)
            ]);

            setStudents(studentsResponse.data);
            setTeachers(teachersResponse.data);
            setSalles(sallesResponse.data);
            setClasses(classesResponse.data);
            setAffectations(affectationsResponse.data);

        } catch (err) {
            setError('Erreur lors du chargement des données');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleChange = (selectedOption, actionMeta) => {
        setFormData({ ...formData, [actionMeta.name]: selectedOption ? selectedOption.value : '' });
    };

    const handleDateChange = (e) => {
        setFormData({ ...formData, dateAffectation: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const payload = {
                userId: formData.userId,
                classeId: formData.classeId,
                dateAffectation: formData.dateAffectation,
                salleId: formType === 'student' ? formData.salleId : null
            };

            await axios.post('/api/affectations', payload, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            alert(`Affectation ${formType === 'student' ? 'etudiant' : 'enseignant'} créée avec succès!`);
            fetchInitialData(); // Refresh data
        } catch (err) {
            setError(`Erreur lors de la création de l'affectation`);
            console.error(err);
        }
    };

    const studentAffectations = affectations.filter(aff => aff.user && aff.user.role && aff.user.role.typeRole === ROLES.ETUDIANT);
    const teacherAffectations = affectations.filter(aff => aff.user && aff.user.role && aff.user.role.typeRole === ROLES.ENSEIGNANT);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar activeMenu="Affectation" setActiveMenu={() => {}} />
            <main style={{ flex: 1, padding: '2rem', marginLeft: 260 }}>
                <h2>Créer une Affectation</h2>

                <div>
                    <label>
                        <input
                            type="radio"
                            value="student"
                            checked={formType === 'student'}
                            onChange={() => setFormType('student')}
                        />
                        Étudiant
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="teacher"
                            checked={formType === 'teacher'}
                            onChange={() => setFormType('teacher')}
                        />
                        Enseignant
                    </label>
                </div>

                {loading ? (
                    <p>Chargement...</p>
                ) : error ? (
                    <p style={{ color: 'red' }}>{error}</p>
                ) : (
                    <>
                        <form className="add-etudient-form" onSubmit={handleSubmit} style={{
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
                                <label htmlFor="userId">{formType === 'student' ? 'Etudiant' : 'Enseignant'}:</label>
                                <Select
                                    name="userId"
                                    options={(formType === 'student' ? students : teachers).map(user => ({ value: user.idUser, label: `${user.nom} ${user.prenom}` }))}
                                    onChange={handleChange}
                                    isClearable
                                    isSearchable
                                    placeholder="Sélectionner..."
                                    styles={{ container: base => ({ ...base, flex: 1, minWidth: 120 }) }}
                                />
                            </div>

                            {formType === 'student' && (
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                                    <label htmlFor="salleId">Salle:</label>
                                    <Select
                                        name="salleId"
                                        options={salles.map(salle => ({ value: salle.idSalle, label: salle.numSalle }))}
                                        onChange={handleChange}
                                        isClearable
                                        isSearchable
                                        placeholder="Sélectionner..."
                                        styles={{ container: base => ({ ...base, flex: 1, minWidth: 120 }) }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                                <label htmlFor="classeId">Classe:</label>
                                <Select
                                    name="classeId"
                                    options={classes.map(classe => ({ value: classe.idClasse, label: classe.nomClasse }))}
                                    onChange={handleChange}
                                    isClearable
                                    isSearchable
                                    placeholder="Sélectionner..."
                                    styles={{ container: base => ({ ...base, flex: 1, minWidth: 120 }) }}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                                <label htmlFor="dateAffectation">Date d'affectation:</label>
                                <input
                                    type="date"
                                    name="dateAffectation"
                                    value={formData.dateAffectation}
                                    onChange={handleDateChange}
                                    style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                                />
                            </div>

                            <button type="submit" style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', marginTop: 12 }}>
                                Créer Affectation {formType === 'student' ? 'Etudiant' : 'Enseignant'}
                            </button>
                        </form>

                        <h3 style={{ marginTop: '2rem' }}>Affectations Étudiants</h3>
                        <table className="table-dashboard">
                            <thead>
                                <tr>
                                    <th>Étudiant</th>
                                    <th>Salle</th>
                                    <th>Classe</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentAffectations.map(affectation => (
                                    <tr key={affectation.idAffectation}>
                                        <td>{affectation.user.nom} {affectation.user.prenom}</td>
                                        <td>{affectation.salle ? affectation.salle.numSalle : 'N/A'}</td>
                                        <td>{affectation.classe.nomClasse}</td>
                                        <td>{affectation.dateAffectation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <h3 style={{ marginTop: '2rem' }}>Affectations Enseignants</h3>
                        <table className="table-dashboard">
                            <thead>
                                <tr>
                                    <th>Enseignant</th>
                                    <th>Classe</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teacherAffectations.map(affectation => (
                                    <tr key={affectation.idAffectation}>
                                        <td>{affectation.user.nom} {affectation.user.prenom}</td>
                                        <td>{affectation.classe.nomClasse}</td>
                                        <td>{affectation.dateAffectation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </main>
        </div>
    );
};

export default Affectation;
