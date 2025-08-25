import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth'; // Import correct
import Login from './components/Login';
import Signup from './components/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import Etudient from './components/admin/etudient';
import Enseignant from './components/admin/enseignant';
import Salle from './components/admin/salle';
import Planning from './components/admin/planning';
import Sidebar from './components/Sidebar';
import ClasseTable from './components/admin/ClasseTable';
import Affectation from './components/admin/affectation';
import Disponibilite from './components/enseignant/disponibilite';
import PlanningEnseignant from './components/enseignant/planning_ens';

function AppContent() {
  const { user, loading } = useAuth();
  
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

  // Déterminer la route par défaut - toujours rediriger vers login si pas d'utilisateur
  const defaultPath = user ? '/dashboard' : '/login';

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Navigate to={defaultPath} replace />} />
          <Route path="/login" element={
            user ? <Navigate to="/dashboard" replace /> : <Login />
          } />
          <Route path="/signup" element={
            user ? <Navigate to="/dashboard" replace /> : <Signup />
          } />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/enseignant" element={<ProtectedRoute><Enseignant /></ProtectedRoute>} />
          <Route path="/admin/etudient" element={<ProtectedRoute><Etudient /></ProtectedRoute>} />
          <Route path="/admin/salle" element={<ProtectedRoute><Salle /></ProtectedRoute>} />
          <Route path="/admin/classe" element={<ProtectedRoute><ClasseTable /></ProtectedRoute>} />
          <Route path="/admin/affectation" element={<ProtectedRoute><Affectation /></ProtectedRoute>} />
          <Route path="/admin/planning" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
          <Route path="/enseignant/disponibilite" element={<ProtectedRoute><Disponibilite /></ProtectedRoute>} />
          <Route path="/enseignant/planning" element={<ProtectedRoute><PlanningEnseignant /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
