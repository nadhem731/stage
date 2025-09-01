import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import './MicrosoftIntegration.css';

const MicrosoftIntegration = () => {
    const [activeMenu, setActiveMenu] = useState('microsoft-integration');
    const [microsoftStatus, setMicrosoftStatus] = useState({
        configured: false,
        services: {
            calendar: false,
            mail: false,
            teams: false
        }
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('status');
    const [syncOptions, setSyncOptions] = useState({
        createCalendarEvents: true,
        createTeamsMeetings: false,
        sendNotifications: false
    });
    const [syncResult, setSyncResult] = useState(null);
    const [config, setConfig] = useState({
        clientId: '',
        clientSecret: '',
        tenantId: ''
    });

    useEffect(() => {
        fetchMicrosoftStatus();
    }, []);

    const fetchMicrosoftStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/microsoft/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMicrosoftStatus(response.data);
        } catch (error) {
            console.error('Erreur lors de la récupération du statut Microsoft:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSync = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Récupérer les plannings et soutenances depuis localStorage ou API
            const plannings = JSON.parse(localStorage.getItem('planning') || '[]');
            const soutenances = JSON.parse(localStorage.getItem('planningSoutenances') || '[]');

            const response = await axios.post('/api/microsoft/bulk-sync', {
                plannings: plannings,
                soutenances: soutenances,
                ...syncOptions
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSyncResult(response.data);
        } catch (error) {
            console.error('Erreur lors de la synchronisation:', error);
            setSyncResult({
                success: false,
                message: 'Erreur lors de la synchronisation: ' + error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSyncOptionChange = (option) => {
        setSyncOptions(prev => ({
            ...prev,
            [option]: !prev[option]
        }));
    };

    const renderStatusTab = () => (
        <div className="microsoft-status-tab">
            <div className="dashboard-section-header">
                <h2 className="section-title">🔗 Statut de l'intégration Microsoft</h2>
                <button 
                    className="dashboard-btn secondary"
                    onClick={fetchMicrosoftStatus}
                    disabled={loading}
                >
                    🔄 Actualiser
                </button>
            </div>

            <div className="dashboard-cards">
                <div className={`dashboard-card ${microsoftStatus.configured ? 'success' : 'error'}`}>
                    <div className="card-icon">
                        {microsoftStatus.configured ? '✅' : '❌'}
                    </div>
                    <div className="card-content">
                        <h4>Configuration générale</h4>
                        <p>{microsoftStatus.configured ? 'Configuré' : 'Non configuré'}</p>
                        <div className="dashboard-cards">
                            <div className={`dashboard-card ${microsoftStatus.services.calendar ? 'success' : 'error'}`} style={{'--card-delay': '0.1s'}}>
                                <div className="card-icon">📅</div>
                                <div className="card-content">
                                    <h3>Microsoft Calendar</h3>
                                    <p>{microsoftStatus.services.calendar ? 'Connecté' : 'Non configuré'}</p>
                                    <div className="status-indicator">
                                        {microsoftStatus.services.calendar ? '✅' : '❌'}
                                    </div>
                                </div>
                            </div>
                            <div className={`dashboard-card ${microsoftStatus.services.mail ? 'success' : 'error'}`} style={{'--card-delay': '0.2s'}}>
                                <div className="card-icon">📧</div>
                                <div className="card-content">
                                    <h3>Microsoft Mail</h3>
                                    <p>{microsoftStatus.services.mail ? 'Connecté' : 'Non configuré'}</p>
                                    <div className="status-indicator">
                                        {microsoftStatus.services.mail ? '✅' : '❌'}
                                    </div>
                                </div>
                            </div>
                            <div className={`dashboard-card ${microsoftStatus.services.teams ? 'success' : 'error'}`} style={{'--card-delay': '0.3s'}}>
                                <div className="card-icon">👥</div>
                                <div className="card-content">
                                    <h3>Microsoft Teams</h3>
                                    <p>{microsoftStatus.services.teams ? 'Connecté' : 'Non configuré'}</p>
                                    <div className="status-indicator">
                                        {microsoftStatus.services.teams ? '✅' : '❌'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!microsoftStatus.configured && (
                <div className="dashboard-alert warning">
                    <div className="alert-icon">⚠️</div>
                    <div className="alert-content">
                        <h4>Configuration requise</h4>
                        <p>Pour utiliser l'intégration Microsoft, vous devez configurer les paramètres Azure AD dans le fichier application.properties :</p>
                        <div className="code-block">
                            <code>
                                microsoft.graph.client-id=votre-client-id<br/>
                                microsoft.graph.client-secret=votre-client-secret<br/>
                                microsoft.graph.tenant-id=votre-tenant-id
                            </code>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderSyncTab = () => (
        <div className="microsoft-sync-tab">
            <div className="dashboard-section-header">
                <h2 className="section-title">🔄 Synchronisation avec Microsoft</h2>
                <p className="section-subtitle">Synchronisez vos plannings et soutenances avec les services Microsoft</p>
            </div>

            <div className="dashboard-section">
                <h3 className="subsection-title">Options de synchronisation</h3>
                <div className="dashboard-options">
                    <label className="option-item">
                        <input
                            type="checkbox"
                            checked={syncOptions.createCalendarEvents}
                            onChange={() => handleSyncOptionChange('createCalendarEvents')}
                        />
                        <span className="checkmark"></span>
                        <div className="option-info">
                            <strong>📅 Créer des événements calendrier</strong>
                            <p>Synchronise les cours et soutenances avec Outlook Calendar</p>
                        </div>
                    </label>

                    <label className="option-item">
                        <input
                            type="checkbox"
                            checked={syncOptions.createTeamsMeetings}
                            onChange={() => handleSyncOptionChange('createTeamsMeetings')}
                        />
                        <span className="checkmark"></span>
                        <div className="option-info">
                            <strong>💬 Créer des réunions Teams</strong>
                            <p>Génère automatiquement des liens Teams pour les cours en ligne et soutenances</p>
                        </div>
                    </label>

                    <label className="option-item">
                        <input
                            type="checkbox"
                            checked={syncOptions.sendNotifications}
                            onChange={() => handleSyncOptionChange('sendNotifications')}
                        />
                        <span className="checkmark"></span>
                        <div className="option-info">
                            <strong>📧 Envoyer des notifications email</strong>
                            <p>Notifie automatiquement les enseignants et étudiants par email</p>
                        </div>
                    </label>
                </div>
            </div>

            <div className="dashboard-actions">
                <button
                    className="dashboard-btn primary large"
                    onClick={handleBulkSync}
                    disabled={loading || !microsoftStatus.configured}
                >
                    {loading ? '🔄 Synchronisation...' : '🚀 Lancer la synchronisation'}
                </button>
            </div>

            {syncResult && (
                <div className={`sync-result ${syncResult.success ? 'success' : 'error'}`}>
                    <div className="result-icon">
                        {syncResult.success ? '✅' : '❌'}
                    </div>
                    <div className="result-info">
                        <h4>{syncResult.success ? 'Synchronisation réussie' : 'Erreur de synchronisation'}</h4>
                        <p>{syncResult.message}</p>
                        {syncResult.successCount !== undefined && (
                            <div className="result-stats">
                                <span className="success-count">✅ {syncResult.successCount} succès</span>
                                <span className="error-count">❌ {syncResult.errorCount} erreurs</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderConfigTab = () => (
        <div className="microsoft-config-tab">
            <div className="config-header">
                <h3>⚙️ Configuration Azure AD</h3>
                <p>Guide de configuration pour l'intégration Microsoft Graph API</p>
            </div>

            <div className="config-steps">
                <div className="config-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                        <h4>Créer une application Azure AD</h4>
                        <p>Rendez-vous sur le <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer">portail Azure</a> et créez une nouvelle application dans Azure Active Directory.</p>
                    </div>
                </div>

                <div className="config-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                        <h4>Configurer les permissions</h4>
                        <p>Ajoutez les permissions Microsoft Graph suivantes :</p>
                        <ul>
                            <li>Calendars.ReadWrite</li>
                            <li>Mail.Send</li>
                            <li>OnlineMeetings.ReadWrite</li>
                            <li>User.Read</li>
                        </ul>
                    </div>
                </div>

                <div className="config-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                        <h4>Récupérer les identifiants</h4>
                        <p>Copiez les valeurs suivantes depuis votre application Azure :</p>
                        <div className="config-form">
                            <div className="form-group">
                                <label>Client ID (Application ID)</label>
                                <input
                                    type="text"
                                    value={config.clientId}
                                    onChange={(e) => setConfig({...config, clientId: e.target.value})}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                />
                            </div>
                            <div className="form-group">
                                <label>Client Secret</label>
                                <input
                                    type="password"
                                    value={config.clientSecret}
                                    onChange={(e) => setConfig({...config, clientSecret: e.target.value})}
                                    placeholder="Votre client secret"
                                />
                            </div>
                            <div className="form-group">
                                <label>Tenant ID (Directory ID)</label>
                                <input
                                    type="text"
                                    value={config.tenantId}
                                    onChange={(e) => setConfig({...config, tenantId: e.target.value})}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="config-step">
                    <div className="step-number">4</div>
                    <div className="step-content">
                        <h4>Mettre à jour application.properties</h4>
                        <p>Ajoutez ces configurations dans votre fichier application.properties :</p>
                        <div className="config-code">
                            <code>
                                microsoft.graph.client-id={config.clientId || 'votre-client-id'}<br/>
                                microsoft.graph.client-secret={config.clientSecret || 'votre-client-secret'}<br/>
                                microsoft.graph.tenant-id={config.tenantId || 'votre-tenant-id'}
                            </code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading && !syncResult) {
        return (
            <AdminLayout
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                loading={true}
                loadingMessage="Chargement de l'intégration Microsoft..."
            />
        );
    }

    return (
        <AdminLayout
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            title="Intégration Microsoft"
            subtitle="Synchronisez vos plannings avec Calendar, Teams et Mail"
        >
            <div className="dashboard-tabs">
                <button 
                    className={`dashboard-tab ${activeTab === 'status' ? 'active' : ''}`}
                    onClick={() => setActiveTab('status')}
                    style={{'--delay': '0.1s'}}
                >
                    📊 Statut
                </button>
                <button 
                    className={`dashboard-tab ${activeTab === 'sync' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sync')}
                    style={{'--delay': '0.2s'}}
                >
                    🔄 Synchronisation
                </button>
                <button 
                    className={`dashboard-tab ${activeTab === 'config' ? 'active' : ''}`}
                    onClick={() => setActiveTab('config')}
                    style={{'--delay': '0.3s'}}
                >
                    ⚙️ Configuration
                </button>
            </div>

            <div className="dashboard-main">
                {activeTab === 'status' && renderStatusTab()}
                {activeTab === 'sync' && renderSyncTab()}
                {activeTab === 'config' && renderConfigTab()}
            </div>
        </AdminLayout>
    );
};

export default MicrosoftIntegration;
