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
      const response = await axios.get('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
          setUser({
            ...userInfo,
            identifiant: userInfo.identifiant
          });
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

  const login = async (identifiant, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        identifiant,
        password
      });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        // Créer l'objet utilisateur avec toutes les informations
        const userInfo = {
          id: response.data.id,
          identifiant: response.data.identifiant,
          nom: response.data.nom,
          prenom: response.data.prenom,
          tel: response.data.tel,
          role: response.data.role
        };
        
        setUser(userInfo);
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
      hasRole,
      hasAnyRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);