import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';
import '../style/userProfile.css';
import axios from '../api/axios';

function UserProfile() {
  const { user, refreshUser } = useAuth();
  const [activeMenu, setActiveMenu] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (user) {
      console.log('DEBUG - User data in profile:', user);
      setEditedUser({
        nom: user.nom || '',
        prenom: user.prenom || '',
        email: user.email || '',
        tel: user.tel || '',
        cin: user.cin || '',
        identifiant: user.identifiant || '',
        matiere: user.matiere || '',
        imageUrl: user.imageUrl || '',
        statusCompte: user.statusCompte || 'ACTIF'
      });
      setImagePreview(user.imageUrl || '');
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Prévisualiser l'image si c'est le champ imageUrl
    if (name === 'imageUrl') {
      setImagePreview(value);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('La taille de l\'image ne doit pas dépasser 5MB');
      return;
    }
    
    setImageFile(file);
    
    // Créer une URL de prévisualisation
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setMessage('Veuillez sélectionner un fichier image valide.');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('L\'image ne doit pas dépasser 5MB.');
      return;
    }

    setUploading(true);
    try {
      // Convertir l'image en base64 pour l'affichage immédiat
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target.result;
        setImagePreview(base64Image);
        setEditedUser(prev => ({
          ...prev,
          imageUrl: base64Image
        }));
      };
      reader.readAsDataURL(file);
      
      setMessage('Image chargée avec succès. Cliquez sur "Sauvegarder" pour confirmer.');
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image:', error);
      setMessage('Erreur lors du chargement de l\'image.');
    } finally {
      setUploading(false);
    }
  };

  const triggerImageUpload = () => {
    document.getElementById('imageUploadInput').click();
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const formData = new FormData();
      const userData = {
        nom: editedUser.nom,
        prenom: editedUser.prenom,
        email: editedUser.email,
        tel: editedUser.tel,
        identifiant: editedUser.identifiant,
        cin: editedUser.cin,
        matiere: editedUser.matiere,
      };
      
      formData.append('user', new Blob([JSON.stringify(userData)], { type: 'application/json' }));
      
      if (imageFile) {
        formData.append('file', imageFile);
      }
      await axios.put('/api/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      await refreshUser();
 
      setMessage('Profil mis à jour avec succès');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
      
      // Réinitialiser le fichier image après sauvegarde
      setImageFile(null);
    } catch (error) {
      console.error('Erreur mise à jour profil:', error.response?.data || error.message);
      if (error.response) {
        const { status, data } = error.response;
        if (status === 401) {
          setMessage('Session expirée. Veuillez vous reconnecter.');
        } else if (status === 403) {
          setMessage('Accès refusé. Vous n’avez pas les permissions nécessaires.');
        } else if (status === 409) {
          setMessage(data?.message || 'Conflit de données (identifiant/CIN/email déjà utilisé).');
        } else {
          setMessage(data?.message || 'Erreur lors de la mise à jour');
        }
      } else {
        setMessage('Erreur de connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setEditedUser({
        nom: user.nom || '',
        prenom: user.prenom || '',
        email: user.email || '',
        tel: user.tel || '',
        cin: user.cin || '',
        identifiant: user.identifiant || '',
        matiere: user.matiere || '',
        imageUrl: user.imageUrl || '',
        statusCompte: user.statusCompte || 'ACTIF'
      });
      setImagePreview(user.imageUrl || '');
    }
  };

  const getUserRoleDisplay = () => {
    if (!user?.role) return 'Utilisateur';
    const roleMap = {
      'Admin': 'Administrateur',
      'Enseignant': 'Enseignant',
      'Etudiant': 'Étudiant'
    };
    return roleMap[user.role] || user.role;
  };

  const getUserAvatar = () => {
    if (!user?.role) return '👤';
    const avatarMap = {
      'Admin': '👨‍💼',
      'Enseignant': '👨‍🏫',
      'Etudiant': '👨‍🎓'
    };
    return avatarMap[user.role] || '👤';
  };

  return (
    <div className="app-layout">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      
      <div className="main-content">
        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-avatar" onClick={triggerImageUpload} style={{cursor: 'pointer', position: 'relative'}}>
              {uploading && (
                <div className="upload-overlay">
                  <div className="upload-spinner">⏳</div>
                </div>
              )}
              {imagePreview || user?.imageUrl ? (
                <img 
                  src={imagePreview || (user.imageData ? 
                    `data:${user.imageType};base64,${btoa(String.fromCharCode(...new Uint8Array(user.imageData)))}` : 
                    user.imageUrl)} 
                  alt="Profil" 
                  className="profile-image"
                />
              ) : (
                <div className="profile-avatar-initials">
                  {getUserAvatar()}
                </div>
              )}
              <div className="profile-avatar-fallback" style={{display: (imagePreview || user?.imageUrl) ? 'none' : 'block'}}>
                {getUserAvatar()}
              </div>
              <div className="upload-hint">
                
              </div>
              <input
                id="imageUploadInput"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{display: 'none'}}
              />
            </div>
            <div className="profile-header-info">
              <h1 className="profile-name">
                {user?.prenom} {user?.nom}
              </h1>
              <p className="profile-role">{getUserRoleDisplay()}</p>
              <p className="profile-id">ID: {user?.identifiant}</p>
            </div>
            <div className="profile-actions">
              {!isEditing ? (
                <button 
                  className="btn-edit-profile"
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Modifier le profil
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    className="btn-save"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? '⏳' : '💾'} Sauvegarder
                  </button>
                  <button 
                    className="btn-cancel"
                    onClick={handleCancel}
                  >
                    ❌ Annuler
                  </button>
                </div>
              )}
            </div>
          </div>

          {message && (
            <div className={`message ${message.includes('succès') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <div className="profile-content">
            <div className="profile-section">
              <h2 className="section-title">📋 Informations personnelles</h2>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>Identifiant</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="identifiant"
                      value={editedUser.identifiant}
                      onChange={handleInputChange}
                      className="profile-input"
                    />
                  ) : (
                    <span className="profile-value">{user?.identifiant || '—'}</span>
                  )}
                </div>

                <div className="profile-field">
                  <label>Nom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="nom"
                      value={editedUser.nom}
                      onChange={handleInputChange}
                      className="profile-input"
                    />
                  ) : (
                    <span className="profile-value">{user?.nom || '—'}</span>
                  )}
                </div>

                <div className="profile-field">
                  <label>Prénom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="prenom"
                      value={editedUser.prenom}
                      onChange={handleInputChange}
                      className="profile-input"
                    />
                  ) : (
                    <span className="profile-value">{user?.prenom || '—'}</span>
                  )}
                </div>

                <div className="profile-field">
                  <label>Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={editedUser.email}
                      onChange={handleInputChange}
                      className="profile-input"
                    />
                  ) : (
                    <span className="profile-value">{user?.email || '—'}</span>
                  )}
                </div>

                <div className="profile-field">
                  <label>Téléphone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="tel"
                      value={editedUser.tel}
                      onChange={handleInputChange}
                      className="profile-input"
                    />
                  ) : (
                    <span className="profile-value">{user?.tel || '—'}</span>
                  )}
                </div>

                <div className="profile-field">
                  <label>CIN</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="cin"
                      value={editedUser.cin}
                      onChange={handleInputChange}
                      className="profile-input"
                    />
                  ) : (
                    <span className="profile-value">{user?.cin || '—'}</span>
                  )}
                </div>

                <div className="profile-field">
                  {/* Image URL field removed as requested */}
                </div>

                {user?.role === 'Enseignant' && (
                  <div className="profile-field">
                    <label>Matière</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="matiere"
                        value={editedUser.matiere}
                        onChange={handleInputChange}
                        className="profile-input"
                      />
                    ) : (
                      <span className="profile-value">{user?.matiere || '—'}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="profile-section">
              <h2 className="section-title">🔐 Informations de compte</h2>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>Rôle</label>
                  <span className="profile-value role-badge">{getUserRoleDisplay()}</span>
                </div>
                

                <div className="profile-field">
                  <label>Statut du compte</label>
                  <span className={`profile-value status-badge ${user?.statusCompte?.toLowerCase() || 'actif'}`}>
                    {user?.statusCompte === 'ACTIF' && '✅ Actif'}
                    {user?.statusCompte === 'INACTIF' && '❌ Inactif'}
                    {user?.statusCompte === 'SUSPENDU' && '⏸️ Suspendu'}
                    {!user?.statusCompte && '✅ Actif'}
                  </span>
                </div>
              </div>
            </div>

            {user?.role === 'Enseignant' && (
              <div className="profile-section">
                <h2 className="section-title">📚 Informations académiques</h2>
                <div className="profile-grid">
                  <div className="profile-field">
                    <label>Matière enseignée</label>
                    <span className="profile-value">{user?.matiere || 'Non spécifiée'}</span>
                  </div>
                  
                  <div className="profile-field">
                    <label>Disponibilités</label>
                    <span className="profile-value">
                      <a href="/enseignant/disponibilite" className="profile-link">
                        📅 Gérer mes disponibilités
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
