import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import '../../style/etudient.css'; 
import '../../style/table.css';
import '../../style/disponibilite.css';
import '../../style/dashboard.css';
import { useAuth } from '../../hooks/useAuth';
import EnseignantLayout from './EnseignantLayout';

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
                const userResponse = await axios.get('/api/users/me', {
                    params: { _t: Date.now() },
                    headers: { 'Cache-Control': 'no-cache' }
                });
                const currentUser = userResponse.data;
                
                if (!currentUser || !currentUser.idUser) {
                    throw new Error('Impossible de récupérer les informations utilisateur');
                }
                
                setUserId(currentUser.idUser);
                console.log('DEBUG - User ID récupéré:', currentUser.idUser);
                
                // Récupérer les disponibilités
                const availabilityResponse = await axios.get(`/api/users/${currentUser.idUser}/disponibilite`, {
                    params: { _t: Date.now() },
                    headers: { 'Cache-Control': 'no-cache' }
                });
                
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
            <EnseignantLayout 
                loading={true} 
                loadingMessage="Chargement de l'authentification..." 
            />
        );
    }

    // Afficher un message d'erreur si pas d'utilisateur
    if (!user) {
        return (
            <EnseignantLayout 
                title="❌ Erreur d'authentification"
                subtitle="Veuillez vous reconnecter pour accéder à cette page"
            >
                <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem',
                    background: '#ffebee',
                    borderRadius: '12px',
                    border: '1px solid #ffcdd2'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                    <h3 style={{ color: '#d32f2f', marginBottom: '1rem' }}>
                        Accès non autorisé
                    </h3>
                    <p style={{ color: '#666', marginBottom: '2rem' }}>
                        Vous devez être connecté en tant qu'enseignant pour accéder à cette page.
                    </p>
                    <button
                        onClick={() => window.location.href = '/login'}
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
                        Se reconnecter
                    </button>
                </div>
            </EnseignantLayout>
        );
    }

    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const timeSlots = [
        { debut: "09:00", fin: "12:15" },
        { debut: "13:30", fin: "16:45" },
    ];

    return (
        <EnseignantLayout
            title="📅 Gérer mes disponibilités"
            subtitle="Définissez vos créneaux de disponibilité pour l'emploi du temps"
            loading={loading}
            loadingMessage="Chargement des disponibilités..."
            showRefresh={true}
            onRefresh={() => window.location.reload()}
        >
                    
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
                    
                    {!loading && (
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
        </EnseignantLayout>
    );
};

export default Disponibilite;
