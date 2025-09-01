import { useState, useContext, createContext, useEffect } from 'react';
import axios from '../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour décoder le token JWT (base64)
  const decodeToken = (token) => {
    try {
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      return decodedPayload;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Fonction pour vérifier si un token est expiré
  const isTokenExpired = (token) => {
    try {
      const decodedToken = decodeToken(token);
      if (!decodedToken || !decodedToken.exp) {
        return true;
      }
      // Vérifier si le token est expiré (exp est en secondes)
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp < currentTime;
    } catch (error) {
      return true;
    }
  };

  // Fonction pour récupérer les informations utilisateur depuis le backend
  const fetchUserInfo = async (token) => {
    try {
      const response = await axios.get('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('DEBUG - fetchUserInfo response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  };

  // Initialiser l'utilisateur au chargement de l'app
  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem('token');
      
      // Si pas de token, rediriger immédiatement vers login
      if (!token) {
        setLoading(false);
        return;
      }

      // Vérifier si le token est expiré
      if (isTokenExpired(token)) {
        console.log('Token expired, removing from localStorage');
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      try {
        // Essayer de récupérer les informations utilisateur depuis le backend
        const userInfo = await fetchUserInfo(token);
        if (userInfo) {
          console.log('DEBUG - Setting user from fetchUserInfo:', userInfo);
          
          // Décoder le token pour récupérer l'identifiant
          const token = localStorage.getItem('token');
          const decodedToken = decodeToken(token);
          const userIdentifiant = decodedToken?.sub;
          
          const userWithCompatibility = {
            ...userInfo,
            id: userIdentifiant || userInfo.identifiant,
            idUser: userInfo.idUser || userIdentifiant || userInfo.identifiant,
            identifiant: userIdentifiant || userInfo.identifiant,
            cin: userInfo.cin || '',
            email: userInfo.email || '',
            tel: userInfo.tel || '',
            matiere: userInfo.matiere || ''
          };
          console.log('DEBUG - Final user object:', userWithCompatibility);
          setUser(userWithCompatibility);
        } else {
          // Si la récupération échoue, supprimer le token
          console.log('Failed to fetch user info, removing token');
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        // En cas d'erreur, supprimer le token invalide
        localStorage.removeItem('token');
      }
      
      setLoading(false);
    };

    // Initialiser l'utilisateur au démarrage
    initializeUser();
  }, []);

  // Rafraîchir les informations de l'utilisateur (utile après mise à jour du profil)
  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token || isTokenExpired(token)) {
      return null;
    }
    const userInfo = await fetchUserInfo(token);
    if (userInfo) {
      const decodedToken = decodeToken(token);
      const userIdentifiant = decodedToken?.sub;
      const userWithCompatibility = {
        ...userInfo,
        id: userIdentifiant || userInfo.identifiant,
        idUser: userInfo.idUser || userIdentifiant || userInfo.identifiant,
        identifiant: userIdentifiant || userInfo.identifiant,
        cin: userInfo.cin || '',
        email: userInfo.email || '',
        tel: userInfo.tel || '',
        matiere: userInfo.matiere || ''
      };
      setUser(userWithCompatibility);
      return userWithCompatibility;
    }
    return null;
  };

  const login = async (identifiant, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        identifiant,
        password
      });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        console.log('DEBUG - Full login response:', JSON.stringify(response.data, null, 2));
        
        // Décoder le token JWT pour extraire l'ID utilisateur
        const decodedToken = decodeToken(response.data.token);
        console.log('DEBUG - Decoded token:', JSON.stringify(decodedToken, null, 2));
        
        // Extraire l'ID depuis le token JWT (sub contient l'identifiant)
        const userIdentifiant = decodedToken?.sub || response.data.email;
        
        const userInfo = {
          id: userIdentifiant, // Utiliser l'identifiant comme ID
          idUser: userIdentifiant, // Ajout pour compatibilité
          identifiant: userIdentifiant,
          nom: response.data.nom,
          prenom: response.data.prenom,
          tel: response.data.tel || '',
          cin: response.data.cin || '',
          email: response.data.email || '',
          matiere: response.data.matiere || '',
          role: response.data.role
        };
        console.log('DEBUG - Login userInfo created:', JSON.stringify(userInfo, null, 2));
        console.log('DEBUG - Setting user state with:', JSON.stringify(userInfo, null, 2));
        
        setUser(userInfo);
        
        // Vérifier immédiatement que l'état est mis à jour
        setTimeout(() => {
          console.log('DEBUG - User state after login should be set');
        }, 100);
        
        return response.data;
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Login failed');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Fonction pour vérifier si l'utilisateur a un rôle spécifique
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Fonction pour vérifier si l'utilisateur a un des rôles spécifiés
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading,
      refreshUser,
      hasRole,
      hasAnyRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);