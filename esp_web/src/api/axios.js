import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false,
  timeout: 30000 // 30 secondes pour les opérations longues comme l'envoi d'email
});

// Liste des chemins qui ne nécessitent pas d'authentification
const publicPaths = [
  '/api/auth/signup',
  '/api/auth/login'
  // '/api/plannings/generate' a été retiré car il nécessite une authentification
];

instance.interceptors.request.use(
  (config) => {
    // Vérifier si le chemin de la requête est un chemin public
    const isPublicPath = publicPaths.some(path => config.url.includes(path));

    if (!isPublicPath) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse pour gérer les erreurs de timeout et autres
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout de la requête - l\'opération peut avoir réussi côté serveur');
      error.message = 'Timeout de la requête. Veuillez rafraîchir la page pour vérifier si l\'opération a réussi.';
    } else if (error.response?.status === 500) {
      console.error('Erreur serveur 500:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export default instance;
