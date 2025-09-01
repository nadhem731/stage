import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { ROLES } from '../../config/roles';
import AdminLayout from './AdminLayout';
import '../../style/etudient.css';
import '../../style/table.css';

const Affectation = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [affectations, setAffectations] = useState([]);
    const [teacherAffectationsByClass, setTeacherAffectationsByClass] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('student'); // 'student' or 'teacher'
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [showTeacherForm, setShowTeacherForm] = useState(false);
    const [formData, setFormData] = useState({
        userId: '',
        classeId: '',
        dateAffectation: new Date().toISOString().split('T')[0] // Default to today
    });
    const [editId, setEditId] = useState(null);
    const [editData, setEditData] = useState({
        userId: '',
        classeId: '',
        dateAffectation: ''
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

            const [studentsResponse, teachersResponse, classesResponse, affectationsResponse, teacherAffectationsResponse] = await Promise.all([
                axios.get('/api/users', { ...config, ...studentParams }),
                axios.get('/api/users', { ...config, ...teacherParams }),
                axios.get('/api/classes', config),
                axios.get('/api/affectations', config),
                axios.get('/api/affectations/enseignants', config)
            ]);

            setStudents(studentsResponse.data);
            setTeachers(teachersResponse.data);
            setClasses(classesResponse.data);
            setAffectations(affectationsResponse.data);
            
            // Group teacher affectations by class
            const groupedByClass = {};
            teacherAffectationsResponse.data.forEach(affectation => {
                const className = affectation.classe.nomClasse;
                if (!groupedByClass[className]) {
                    groupedByClass[className] = [];
                }
                groupedByClass[className].push(affectation);
            });
            setTeacherAffectationsByClass(groupedByClass);

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
        const { name } = actionMeta;
        const value = selectedOption ? selectedOption.value : '';

        setFormData(prev => ({ ...prev, [name]: value }));

        if (activeTab === 'teacher' && name === 'classeId') {
        }
    };

    const handleDateChange = (e) => {
        setFormData({ ...formData, dateAffectation: e.target.value });
    };

    const handleAddClick = (type) => {
        if (type === 'student') {
            setShowStudentForm(!showStudentForm);
            setShowTeacherForm(false);
        } else {
            setShowTeacherForm(!showTeacherForm);
            setShowStudentForm(false);
        }
        setEditId(null);
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
            };

            await axios.post('/api/affectations', payload, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            alert(`Affectation ${activeTab === 'student' ? 'etudiant' : 'enseignant'} créée avec succès!`);
            if (activeTab === 'student') {
                setShowStudentForm(false);
            } else {
                setShowTeacherForm(false);
            }
            fetchInitialData(); // Refresh data
        } catch (err) {
            setError(`Erreur lors de la création de l'affectation`);
            console.error(err);
        }
    };

    const handleEditClick = (affectation) => {
        setEditId(affectation.idAffectation);
        setEditData({
            userId: affectation.user.idUser,
            classeId: affectation.classe.idClasse,
            dateAffectation: affectation.dateAffectation
        });
        if (affectation.user.role.typeRole === ROLES.ETUDIANT) {
            setShowStudentForm(true);
        } else {
            setShowTeacherForm(true);
        }
    };


    const handleDelete = async (id) => {
        if (window.confirm('Voulez-vous vraiment supprimer cette affectation ?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`/api/affectations/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchInitialData();
            } catch (err) {
                setError('Erreur lors de la suppression de l\'affectation');
                console.error(err);
            }
        }
    };

    const studentAffectations = affectations.filter(aff => aff.user && aff.user.role && aff.user.role.typeRole === ROLES.ETUDIANT);

    if (loading) {
        return (
            <AdminLayout
                activeMenu="Affectation"
                setActiveMenu={() => {}}
                loading={true}
                loadingMessage="Chargement des affectations..."
            />
        );
    }

    return (
        <AdminLayout
            activeMenu="Affectation"
            setActiveMenu={() => {}}
            title="Gestion des Affectations"
            subtitle="Affectation des étudiants et enseignants aux classes"
        >
            <div style={{ 
                flex: 1, 
                padding: '2rem', 
                minWidth: 0,
                position: 'relative',
                zIndex: 1
            }}>
                <div className="tabs" style={{ marginBottom: '2rem', borderBottom: '1px solid #ddd', display: 'flex' }}>
                    <button 
                      style={{ padding: '1rem', border: 'none', background: activeTab === 'student' ? '#fff' : 'transparent', borderBottom: activeTab === 'student' ? '3px solid #CB0920' : 'none', cursor: 'pointer', fontWeight: '600' }}
                      onClick={() => setActiveTab('student')}>
                      Affectations Étudiants
                    </button>
                    <button 
                      style={{ padding: '1rem', border: 'none', background: activeTab === 'teacher' ? '#fff' : 'transparent', borderBottom: activeTab === 'teacher' ? '3px solid #CB0920' : 'none', cursor: 'pointer', fontWeight: '600' }}
                      onClick={() => setActiveTab('teacher')}>
                      Affectations Enseignants
                    </button>
                </div>


                {loading ? (
                    <p>Chargement...</p>
                ) : error ? (
                    <p style={{ color: 'red' }}>{error}</p>
                ) : (
                    <>
                        {activeTab === 'student' && (
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <h2 className="section-title">Affectations Étudiants</h2>
                                    <button
                                        className="add-etudient-btn"
                                        title="Ajouter une affectation"
                                        onClick={() => handleAddClick('student')}
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
                                        {showStudentForm ? '-' : '+'}
                                    </button>
                                </div>
                                {showStudentForm && (
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
                                        <div style={{ marginBottom: 12 }}>
                                            <label htmlFor="userId" style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Etudiant:</label>
                                            <Select
                                                name="userId"
                                                options={students.map(user => ({ value: user.idUser, label: `${user.nom} ${user.prenom}` }))}
                                                onChange={handleChange}
                                                isClearable
                                                isSearchable
                                                placeholder="Sélectionner un étudiant..."
                                                styles={{ 
                                                    container: base => ({ ...base, width: '100%' }),
                                                    control: base => ({ ...base, minHeight: 40, borderColor: '#ddd' })
                                                }}
                                            />
                                        </div>
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
                                            Créer Affectation Etudiant
                                        </button>
                                    </form>
                                )}
                                <table className="table-dashboard affectations-table">
                                    <thead>
                                        <tr>
                                            <th>Étudiant</th>
                                            <th>Classe</th>
                                            <th>Date d'affectation</th>
                                            <th className="actions-column">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentAffectations.map(affectation => (
                                            <tr key={affectation.idAffectation}>
                                                <td>{affectation.user.nom} {affectation.user.prenom}</td>
                                                <td>{affectation.classe.nomClasse}</td>
                                                <td>{affectation.dateAffectation}</td>
                                                <td>
                                                    <button
                                                        style={{ background: '#eee', color: '#CB0920', border: 'none', borderRadius: 5, padding: '4px 10px', marginRight: 6, cursor: 'pointer', fontWeight: 600 }}
                                                        onClick={() => handleEditClick(affectation)}
                                                    >Modifier</button>
                                                    <button
                                                        style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                                                        onClick={() => handleDelete(affectation.idAffectation)}
                                                    >Supprimer</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'teacher' && (
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <h2 className="section-title">Affectations Enseignants</h2>
                                    <button
                                        className="add-etudient-btn"
                                        title="Ajouter une affectation"
                                        onClick={() => handleAddClick('teacher')}
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
                                        {showTeacherForm ? '-' : '+'}
                                    </button>
                                </div>
                                {showTeacherForm && (
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
                                        <div style={{ marginBottom: 12 }}>
                                            <label htmlFor="userId" style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Enseignant:</label>
                                            <Select
                                                name="userId"
                                                options={teachers.map(user => ({ value: user.idUser, label: `${user.nom} ${user.prenom}` }))}
                                                onChange={handleChange}
                                                isClearable
                                                isSearchable
                                                placeholder="Sélectionner un enseignant..."
                                                styles={{ 
                                                    container: base => ({ ...base, width: '100%' }),
                                                    control: base => ({ ...base, minHeight: 40, borderColor: '#ddd' })
                                                }}
                                            />
                                        </div>
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
                                            Créer Affectation Enseignant
                                        </button>
                                    </form>
                                )}
                                {Object.keys(teacherAffectationsByClass).length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>Aucune affectation d'enseignant trouvée</p>
                                ) : (
                                    Object.entries(teacherAffectationsByClass).map(([className, affectations]) => (
                                        <div key={className} style={{ marginBottom: '2rem', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div style={{ background: '#f8f9fa', padding: '1rem', borderBottom: '1px solid #e0e0e0' }}>
                                                <h4 style={{ margin: 0, color: '#CB0920', fontSize: '1.1rem' }}>Classe: {className}</h4>
                                                <span style={{ color: '#666', fontSize: '0.9rem' }}>({affectations.length} enseignant{affectations.length > 1 ? 's' : ''})</span>
                                            </div>
                                            <table className="table-dashboard" style={{ margin: 0, border: 'none' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Enseignant</th>
                                                        <th>Email</th>
                                                        <th>Date d'affectation</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {affectations.map(affectation => (
                                                        <tr key={affectation.idAffectation}>
                                                            <td>
                                                                <div style={{ fontWeight: '600' }}>
                                                                    {affectation.user.nom} {affectation.user.prenom}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                                                    {affectation.user.role.typeRole}
                                                                </div>
                                                            </td>
                                                            <td>{affectation.user.email}</td>
                                                            <td>{new Date(affectation.dateAffectation).toLocaleDateString('fr-FR')}</td>
                                                            <td>
                                                                <button
                                                                    style={{ background: '#eee', color: '#CB0920', border: 'none', borderRadius: 5, padding: '4px 10px', marginRight: 6, cursor: 'pointer', fontWeight: 600 }}
                                                                    onClick={() => handleEditClick(affectation)}
                                                                >Modifier</button>
                                                                <button
                                                                    style={{ background: '#CB0920', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                                                                    onClick={() => handleDelete(affectation.idAffectation)}
                                                                >Supprimer</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
};

export default Affectation;
