import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import '../../style/etudient.css'; 
import '../../style/table.css';
import '../../style/disponibilite.css';
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
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        const fetchAvailability = async () => {
            if (authLoading) return; // Attend que l'authentification soit terminée

            if (!user || !user.idUser) {
                setError("Utilisateur non authentifié.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await axios.get(`/api/users/${user.idUser}/disponibilite`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.data) {
                    setAvailability(response.data);
                }
                setError(null); // Efface les erreurs précédentes en cas de succès
            } catch (err) {
                console.error('Erreur lors de la récupération des disponibilités:', err);
                setError('Erreur lors de la récupération des disponibilités.');
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
            const slotIndex = dayAvailability.findIndex(slot => slot.debut === timeSlot.debut && slot.fin === timeSlot.fin);

            if (slotIndex > -1) {
                newAvailability[day] = dayAvailability.filter((_, index) => index !== slotIndex);
            } else {
                newAvailability[day] = [...dayAvailability, timeSlot];
            }
            return newAvailability;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!user || !user.idUser) {
            setError("Utilisateur non authentifié.");
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/users/${user.idUser}/disponibilite`, availability, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setSuccess('Disponibilités mises à jour avec succès !');
        } catch (err) {
            console.error('Erreur lors de la mise à jour des disponibilités:', err);
            setError('Erreur lors de la mise à jour des disponibilités.');
        }
    };

    if (loading || authLoading) return <p>Chargement...</p>;
    if (error && !success) return <p style={{ color: 'red' }}>{error}</p>;

    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const timeSlots = [
        { debut: "09:00", fin: "12:15" },
        { debut: "13:30", fin: "16:45" },
    ];

    return (
        <div className="page-container disponibilite-page" style={{ display: 'flex' }}>
            <Sidebar />
            <div className="content-container" style={{ flex: 1, padding: '2rem' }}>
                <h2>Gérer mes disponibilités</h2>
                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
                {success && <p style={{ color: 'green', textAlign: 'center' }}>{success}</p>}
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
                            {days.map(day => (
                                <tr key={day}>
                                    <th>{day}</th>
                                    <td
                                        className={availability[day.toLowerCase()]?.some(s => s.debut === "09:00") ? 'available' : ''}
                                        onClick={() => handleSlotClick(day.toLowerCase(), timeSlots[0])}
                                    ></td>
                                    <td className="pause-cell"></td>
                                    <td
                                        className={availability[day.toLowerCase()]?.some(s => s.debut === "13:30") ? 'available' : ''}
                                        onClick={() => handleSlotClick(day.toLowerCase(), timeSlots[1])}
                                    ></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="submit" className="submit-btn">Enregistrer</button>
                </form>
            </div>
        </div>
    );
};

export default Disponibilite;
