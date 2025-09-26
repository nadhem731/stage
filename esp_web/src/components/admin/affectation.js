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
    const [searchStudent, setSearchStudent] = useState('');
    const [searchTeacher, setSearchTeacher] = useState('');

    const fetchInitialData = async (forceRefresh = false) => {
        try {
            if (forceRefresh) {
                setLoading(true);
            }
            setError(null);

            const token = localStorage.getItem('token');
            const config = {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                params: { 
                    _t: Date.now() // Cache busting timestamp
                }
            };
            
            const studentParams = { params: { role: ROLES.ETUDIANT, _t: Date.now() } };
            const teacherParams = { params: { role: ROLES.ENSEIGNANT, _t: Date.now() } };

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
            if (forceRefresh) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchInitialData(true);
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
            // Fermer le formulaire immédiatement
            if (activeTab === 'student') {
                setShowStudentForm(false);
            } else {
                setShowTeacherForm(false);
            }
            
            // Rafraîchir avec un délai court
            setTimeout(async () => {
                await fetchInitialData();
                alert(`Affectation ${activeTab === 'student' ? 'etudiant' : 'enseignant'} créée avec succès!`);
            }, 500);
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
                
                // Rafraîchir avec un délai court
                setTimeout(async () => {
                    await fetchInitialData();
                }, 300);
            } catch (err) {
                setError('Erreur lors de la suppression de l\'affectation');
                console.error(err);
            }
        }
    };

    const studentAffectations = affectations.filter(aff => aff.user && aff.user.role && aff.user.role.typeRole === ROLES.ETUDIANT);
    
    // Filtrage des affectations étudiants par recherche dynamique
    const filteredStudentAffectations = React.useMemo(() => {
        if (!searchStudent.trim()) return studentAffectations;
        
        const searchTerm = searchStudent.toLowerCase().trim();
        return studentAffectations.filter(affectation => {
            const fullName = `${affectation.user.nom} ${affectation.user.prenom}`.toLowerCase();
            const className = affectation.classe.nomClasse.toLowerCase();
            const email = affectation.user.email?.toLowerCase() || '';
            
            return fullName.includes(searchTerm) || 
                   className.includes(searchTerm) || 
                   email.includes(searchTerm) ||
                   affectation.user.nom?.toLowerCase().includes(searchTerm) ||
                   affectation.user.prenom?.toLowerCase().includes(searchTerm);
        });
    }, [studentAffectations, searchStudent]);
    
    // Filtrage des affectations enseignants par recherche dynamique
    const filteredTeacherAffectationsByClass = React.useMemo(() => {
        if (!searchTeacher.trim()) return teacherAffectationsByClass;
        
        const searchTerm = searchTeacher.toLowerCase().trim();
        const filtered = {};
        
        Object.entries(teacherAffectationsByClass).forEach(([className, affectations]) => {
            const filteredAffectations = affectations.filter(affectation => {
                const fullName = `${affectation.user.nom} ${affectation.user.prenom}`.toLowerCase();
                const email = affectation.user.email?.toLowerCase() || '';
                const matiere = affectation.user.matiere?.toLowerCase() || '';
                const classNameLower = className.toLowerCase();
                
                return fullName.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       matiere.includes(searchTerm) ||
                       classNameLower.includes(searchTerm) ||
                       affectation.user.nom?.toLowerCase().includes(searchTerm) ||
                       affectation.user.prenom?.toLowerCase().includes(searchTerm);
            });
            
            if (filteredAffectations.length > 0) {
                filtered[className] = filteredAffectations;
            }
        });
        
        return filtered;
    }, [teacherAffectationsByClass, searchTeacher]);

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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="🔍 Rechercher étudiant ou classe..."
                                                value={searchStudent}
                                                onChange={e => setSearchStudent(e.target.value)}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: 6,
                                                    border: searchStudent ? '2px solid #CB0920' : '1px solid #ddd',
                                                    width: 250,
                                                    fontSize: 15,
                                                    marginRight: 8,
                                                    background: '#fafafa',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: searchStudent ? '0 2px 8px rgba(203, 9, 32, 0.2)' : '0 1px 4px rgba(0,0,0,0.04)',
                                                    outline: 'none'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.background = '#fff';
                                                    e.target.style.boxShadow = '0 2px 8px rgba(203, 9, 32, 0.3)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.background = '#fafafa';
                                                    e.target.style.boxShadow = searchStudent ? '0 2px 8px rgba(203, 9, 32, 0.2)' : '0 1px 4px rgba(0,0,0,0.04)';
                                                }}
                                            />
                                            {searchStudent && (
                                                <button
                                                    onClick={() => setSearchStudent('')}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '12px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#666',
                                                        fontSize: '16px',
                                                        padding: '2px'
                                                    }}
                                                    title="Effacer la recherche"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            className="refresh-btn"
                                            title="Actualiser la liste"
                                            onClick={() => fetchInitialData(true)}
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
                                                justifyContent: 'center'
                                            }}
                                        >
                                            ↻
                                        </button>
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
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {showStudentForm ? '-' : '+'}
                                        </button>
                                    </div>
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
                                
                                {/* Indicateur de résultats de recherche */}
                                {searchStudent && (
                                    <div style={{ 
                                        marginBottom: '1rem', 
                                        padding: '0.5rem 1rem', 
                                        background: '#f8f9fa', 
                                        borderRadius: '6px',
                                        border: '1px solid #e9ecef',
                                        fontSize: '0.9rem',
                                        color: '#495057'
                                    }}>
                                        📊 <strong>{filteredStudentAffectations.length}</strong> résultat{filteredStudentAffectations.length !== 1 ? 's' : ''} trouvé{filteredStudentAffectations.length !== 1 ? 's' : ''} pour "<em>{searchStudent}</em>"
                                        {filteredStudentAffectations.length !== studentAffectations.length && (
                                            <span style={{ color: '#6c757d' }}> sur {studentAffectations.length} total</span>
                                        )}
                                    </div>
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
                                        {filteredStudentAffectations.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                                    {searchStudent ? 'Aucun résultat trouvé pour cette recherche' : 'Aucune affectation d\'étudiant trouvée'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStudentAffectations.map(affectation => (
                                                <tr key={affectation.idAffectation}>
                                                    <td>{affectation.user.nom} {affectation.user.prenom}</td>
                                                    <td>{affectation.classe.nomClasse}</td>
                                                    <td>{affectation.dateAffectation}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => handleEditClick(affectation)}
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
                                                            onClick={() => handleDelete(affectation.idAffectation)}
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
                                        )))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'teacher' && (
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <h2 className="section-title">Affectations Enseignants</h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="🔍 Rechercher enseignant ou classe..."
                                                value={searchTeacher}
                                                onChange={e => setSearchTeacher(e.target.value)}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: 6,
                                                    border: searchTeacher ? '2px solid #CB0920' : '1px solid #ddd',
                                                    width: 250,
                                                    fontSize: 15,
                                                    marginRight: 8,
                                                    background: '#fafafa',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: searchTeacher ? '0 2px 8px rgba(203, 9, 32, 0.2)' : '0 1px 4px rgba(0,0,0,0.04)',
                                                    outline: 'none'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.background = '#fff';
                                                    e.target.style.boxShadow = '0 2px 8px rgba(203, 9, 32, 0.3)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.background = '#fafafa';
                                                    e.target.style.boxShadow = searchTeacher ? '0 2px 8px rgba(203, 9, 32, 0.2)' : '0 1px 4px rgba(0,0,0,0.04)';
                                                }}
                                            />
                                            {searchTeacher && (
                                                <button
                                                    onClick={() => setSearchTeacher('')}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '12px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#666',
                                                        fontSize: '16px',
                                                        padding: '2px'
                                                    }}
                                                    title="Effacer la recherche"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            className="refresh-btn"
                                            title="Actualiser la liste"
                                            onClick={() => fetchInitialData(true)}
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
                                                justifyContent: 'center'
                                            }}
                                        >
                                            ↻
                                        </button>
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
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {showTeacherForm ? '-' : '+'}
                                        </button>
                                    </div>
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
                                
                                {/* Indicateur de résultats de recherche pour enseignants */}
                                {searchTeacher && (
                                    <div style={{ 
                                        marginBottom: '1rem', 
                                        padding: '0.5rem 1rem', 
                                        background: '#f8f9fa', 
                                        borderRadius: '6px',
                                        border: '1px solid #e9ecef',
                                        fontSize: '0.9rem',
                                        color: '#495057'
                                    }}>
                                        📊 <strong>{Object.keys(filteredTeacherAffectationsByClass).length}</strong> classe{Object.keys(filteredTeacherAffectationsByClass).length !== 1 ? 's' : ''} trouvée{Object.keys(filteredTeacherAffectationsByClass).length !== 1 ? 's' : ''} pour "<em>{searchTeacher}</em>"
                                        {Object.keys(filteredTeacherAffectationsByClass).length !== Object.keys(teacherAffectationsByClass).length && (
                                            <span style={{ color: '#6c757d' }}> sur {Object.keys(teacherAffectationsByClass).length} total</span>
                                        )}
                                    </div>
                                )}
                                
                                {Object.keys(filteredTeacherAffectationsByClass).length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
                                        {searchTeacher ? 'Aucun résultat trouvé pour cette recherche' : 'Aucune affectation d\'enseignant trouvée'}
                                    </p>
                                ) : (
                                    Object.entries(filteredTeacherAffectationsByClass).map(([className, affectations]) => (
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
                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    <button
                                                                        onClick={() => handleEditClick(affectation)}
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
                                                                        onClick={() => handleDelete(affectation.idAffectation)}
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
