import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();
  const token = localStorage.getItem('token');
  
  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }
  
  // Vérifier si le token existe et n'est pas expiré
  if (!token || isTokenExpired(token)) {
    // Nettoyer le token invalide
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }
  
  // Vérifier l'utilisateur dans le contexte
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Vérifier les rôles requis si spécifiés
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export default ProtectedRoute;