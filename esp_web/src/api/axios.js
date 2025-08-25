import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false
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

export default instance;
