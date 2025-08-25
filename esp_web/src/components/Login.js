import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../style/auth.css';

function Login() {
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setCardVisible(true), 100);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(identifiant, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion');
    }
  };

  return (
    <div className="gradient-form min-vh-100 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', minWidth: '100vw', overflow: 'auto' }}>
      <div className={`shadow-5 login-card-animated ${cardVisible ? 'show' : ''}`} style={{
        maxWidth: '600px',
        width: '100vw',
        minHeight: '70vh',
        height: 'auto',
        margin: 'auto',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '1.5rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3), 0 0 30px rgba(203,9,32,0.2)',
        padding: '3.5rem 2.5rem',
        position: 'relative',
        animation: 'cardFloat 6s ease-in-out infinite',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <div className="text-center mb-4">
          <h4 className="mt-3 mb-2 pb-1" style={{ color: '#CB0920', fontWeight: 700, letterSpacing: 1 }}>Connexion à ESPRIT</h4>
          <p style={{ color: '#333', fontWeight: 500, fontSize: '1.1rem', marginBottom: 0 }}>Bienvenue ! Connectez-vous pour accéder à votre espace.</p>
        </div>
        {error && (
          <div className="alert alert-danger text-center mb-4 animate__animated animate__shakeX" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} autoComplete="on" style={{ width: '100%', marginTop: 10 }}>
          <div className="form-outline mb-4 position-relative">
            <span className="input-icon" style={{ position: 'absolute', left: 18, top: 18, color: '#CB0920', fontSize: 20 }}>
              <i className="fas fa-user"></i>
            </span>
            <input
              className="form-control"
              style={{ paddingLeft: 44, height: 48, fontSize: 17, borderRadius: 10, border: '2px solid #e0e0e0', transition: 'all 0.3s' }}
              placeholder="Identifiant"
              id="formIdentifiant"
              type="text"
              value={identifiant}
              onChange={e => setIdentifiant(e.target.value)}
              required
            />
          </div>
          <div className="form-outline mb-2 position-relative">
            <span className="input-icon" style={{ position: 'absolute', left: 18, top: 18, color: '#CB0920', fontSize: 20 }}>
              <i className="fas fa-lock"></i>
            </span>
            <input
              className="form-control"
              style={{ paddingLeft: 44, height: 48, fontSize: 17, borderRadius: 10, border: '2px solid #e0e0e0', transition: 'all 0.3s' }}
              placeholder="Mot de passe (CIN)"
              id="formPassword"
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <span
              onClick={() => setPasswordVisible(!passwordVisible)}
              style={{
                position: 'absolute',
                right: 18,
                top: 14,
                cursor: 'pointer',
                color: '#CB0920',
                fontSize: 20
              }}
            >
              <i className={`fas ${passwordVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </span>
          </div>
          <div className="mb-3 text-start" style={{ color: '#CB0920', fontSize: '0.98rem', fontWeight: 500, marginLeft: 2 }}>
          </div>
          <div className="text-center pt-1 mb-4">
            <button
              className="mb-4 w-100 gradient-custom-2 btn login-glow-btn"
              size="lg"
              type="submit"
              style={{
                borderRadius: '10px',
                padding: '14px 0',
                fontSize: '1.15rem',
                fontWeight: 700,
                letterSpacing: 1,
                boxShadow: '0 4px 15px rgba(203,9,32,0.13)',
                transition: 'all 0.3s',
                marginTop: 10
              }}
            >
              <i className="fas fa-sign-in-alt me-2"></i>
              Se connecter
            </button>
          </div>
        </form>
        <div className="text-center mt-2">
          <p className="mb-0" style={{ color: '#666', fontWeight: 500 }}>Vous n'avez pas de compte ?{' '}
            <Link to="/signup" className="text-decoration-none fw-bold" style={{ color: '#CB0920' }}>
              Inscrivez-vous ici
            </Link>
          </p>
        </div>
      </div>
      <style>{`
        .login-card-animated {
          opacity: 0;
          transform: translateY(40px) scale(0.98);
          transition: all 0.7s cubic-bezier(.4,0,.2,1);
          min-height: 70vh;
          width: 100vw;
          max-width: 600px;
        }
        .login-card-animated.show {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        @media (max-width: 700px) {
          .login-card-animated {
            max-width: 98vw;
            min-height: 90vh;
            padding: 1.2rem 0.5rem !important;
          }
        }
        .input-icon {
          pointer-events: none;
        }
        .login-glow-btn {
          position: relative;
          z-index: 1;
          animation: loginGlow 2.2s infinite alternate;
          box-shadow: 0 0 0 0 rgba(203,9,32,0.25), 0 4px 15px rgba(203,9,32,0.13);
        }
        .login-glow-btn:hover {
          animation: loginBounce 0.45s cubic-bezier(.4,0,.2,1);
          box-shadow: 0 0 16px 4px #CB0920, 0 8px 32px rgba(203,9,32,0.18);
        }
        @keyframes loginGlow {
          0% { box-shadow: 0 0 0 0 rgba(203,9,32,0.18), 0 4px 15px rgba(203,9,32,0.13); }
          100% { box-shadow: 0 0 24px 8px #CB0920, 0 8px 32px rgba(203,9,32,0.18); }
        }
        @keyframes loginBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.08); }
          60% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default Login;