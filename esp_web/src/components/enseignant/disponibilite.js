import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import '../../style/etudient.css'; 
import '../../style/table.css';
import '../../style/disponibilite.css';
import '../../style/dashboard.css';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../Sidebar';

const Disponibilite = () => {
    const { user, loading: authLoading } = useAuth();
    const [availability, setAvailability] = useState({
        lundi: [],
        mardi: [],
        mercredi: [],
        jeudi: [],
        vendredi: [],
        samedi: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const fetchAvailability = async () => {
            if (authLoading) {
                console.log('DEBUG - Still loading auth, waiting...');
                return;
            }

            if (!user) {
                console.log('DEBUG - No user object, waiting for auth...');
                setError("Chargement de l'authentification...");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                // Récupérer l'utilisateur connecté pour obtenir son ID
                const userResponse = await axios.get('/api/users/me');
                const currentUser = userResponse.data;
                
                if (!currentUser || !currentUser.idUser) {
                    throw new Error('Impossible de récupérer les informations utilisateur');
                }
                
                setUserId(currentUser.idUser);
                console.log('DEBUG - User ID récupéré:', currentUser.idUser);
                
                // Récupérer les disponibilités
                const availabilityResponse = await axios.get(`/api/users/${currentUser.idUser}/disponibilite`);
                
                if (availabilityResponse.data) {
                    console.log('DEBUG - Disponibilités récupérées:', availabilityResponse.data);
                    setAvailability(availabilityResponse.data);
                }
                
            } catch (err) {
                console.error('Erreur lors de la récupération des disponibilités:', err);
                setError('Erreur lors de la récupération des disponibilités: ' + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        };

        fetchAvailability();
    }, [user, authLoading]);

    const handleSlotClick = (day, timeSlot) => {
        setAvailability(prev => {
            const newAvailability = { ...prev };
            const dayAvailability = newAvailability[day] || [];
            const slotIndex = dayAvailability.findIndex(slot => 
                slot.debut === timeSlot.debut && slot.fin === timeSlot.fin
            );

            if (slotIndex > -1) {
                // Retirer le créneau s'il existe déjà
                newAvailability[day] = dayAvailability.filter((_, index) => index !== slotIndex);
            } else {
                // Ajouter le créneau s'il n'existe pas
                newAvailability[day] = [...dayAvailability, timeSlot];
            }
            
            console.log(`DEBUG - ${day} mis à jour:`, newAvailability[day]);
            return newAvailability;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!userId) {
            setError("Erreur: ID utilisateur non disponible");
            return;
        }

        try {
            setError(null);
            console.log('DEBUG - Sauvegarde des disponibilités pour userId:', userId);
            console.log('DEBUG - Données à sauvegarder:', availability);
            
            await axios.put(`/api/users/${userId}/disponibilite`, availability);
            
            alert('Disponibilités sauvegardées avec succès !');
        } catch (err) {
            console.error('Erreur lors de la sauvegarde des disponibilités:', err);
            setError('Erreur lors de la sauvegarde des disponibilités: ' + (err.response?.data?.message || err.message));
        }
    };

    // Afficher un message de chargement pendant l'authentification
    if (authLoading) {
        return (
            <div className="dashboard-container">
                <Sidebar />
                <div className="dashboard-main">
                    <div className="dashboard-content">
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p>Chargement de l'authentification...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Afficher un message d'erreur si pas d'utilisateur
    if (!user) {
        return (
            <div className="dashboard-container">
                <Sidebar />
                <div className="dashboard-main">
                    <div className="dashboard-content">
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'red' }}>Utilisateur non authentifié</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const timeSlots = [
        { debut: "09:00", fin: "12:15" },
        { debut: "13:30", fin: "16:45" },
    ];

    return (
        <div className="dashboard-container">
            <Sidebar />
            <div className="dashboard-main">
                <div className="dashboard-content">
                    <h2>Gérer mes disponibilités</h2>
                    
                    {error && (
                        <div style={{ 
                            color: 'red', 
                            textAlign: 'center', 
                            padding: '1rem',
                            backgroundColor: '#ffebee',
                            borderRadius: '8px',
                            marginBottom: '1rem'
                        }}>
                            {error}
                        </div>
                    )}
                    
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p>Chargement des disponibilités...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
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
                                        const dayKey = day.toLowerCase();
                                        const morningAvailable = availability[dayKey]?.some(s => s.debut === "09:00" && s.fin === "12:15");
                                        const afternoonAvailable = availability[dayKey]?.some(s => s.debut === "13:30" && s.fin === "16:45");
                                        
                                        return (
                                            <tr key={day}>
                                                <th>{day}</th>
                                                <td
                                                    className={morningAvailable ? 'available' : ''}
                                                    onClick={() => handleSlotClick(dayKey, timeSlots[0])}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {morningAvailable && <span style={{ fontSize: '1.5rem' }}>✓</span>}
                                                </td>
                                                <td className="pause-cell"></td>
                                                <td
                                                    className={afternoonAvailable ? 'available' : ''}
                                                    onClick={() => handleSlotClick(dayKey, timeSlots[1])}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {afternoonAvailable && <span style={{ fontSize: '1.5rem' }}>✓</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                                <button 
                                    type="submit" 
                                    className="submit-btn"
                                    style={{
                                        background: '#CB0920',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: '600'
                                    }}
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Disponibilite;
