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
    <div className="signup-background">
      {/* Background decorative elements */}
      <div className="signup-decoration"></div>
      
      <div className={`login-card-modern ${cardVisible ? 'show' : ''}`} style={{
        maxWidth: '450px',
        width: '100%',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 40px rgba(203,9,32,0.1)',
        padding: '3rem 2.5rem',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(10px)'
      }}>
        <div className="text-center mb-4">
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 8px 25px rgba(203,9,32,0.3)'
          }}>
            <i className="fas fa-graduation-cap" style={{ fontSize: '2rem', color: 'white' }}></i>
          </div>
          <h2 style={{ 
            color: '#333', 
            fontWeight: '700', 
            fontSize: '1.8rem',
            marginBottom: '0.5rem',
            letterSpacing: '-0.5px'
          }}>
            Bienvenue sur ESPRIT
          </h2>
          <p style={{ 
            color: '#666', 
            fontWeight: '400', 
            fontSize: '1rem', 
            marginBottom: 0,
            lineHeight: '1.5'
          }}>
            Connectez-vous pour accéder à votre espace personnel
          </p>
        </div>
        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
            color: 'white',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontWeight: '500',
            boxShadow: '0 4px 15px rgba(255,107,107,0.3)',
            animation: 'shake 0.5s ease-in-out'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} autoComplete="on" style={{ width: '100%' }}>
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#333',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Identifiant
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ 
                position: 'absolute', 
                left: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#CB0920', 
                fontSize: '1.1rem',
                zIndex: 1
              }}>
                <i className="fas fa-user"></i>
              </span>
              <input
                style={{ 
                  width: '100%',
                  paddingLeft: '3rem', 
                  paddingRight: '1rem',
                  height: '3rem', 
                  fontSize: '1rem', 
                  borderRadius: '12px', 
                  border: '2px solid #e9ecef', 
                  background: '#f8f9fa',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                placeholder="Votre identifiant"
                id="formIdentifiant"
                type="text"
                value={identifiant}
                onChange={e => setIdentifiant(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = '#CB0920';
                  e.target.style.background = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(203,9,32,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.background = '#f8f9fa';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#333',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ 
                position: 'absolute', 
                left: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#CB0920', 
                fontSize: '1.1rem',
                zIndex: 1
              }}>
                <i className="fas fa-lock"></i>
              </span>
              <input
                style={{ 
                  width: '100%',
                  paddingLeft: '3rem', 
                  paddingRight: '3rem',
                  height: '3rem', 
                  fontSize: '1rem', 
                  borderRadius: '12px', 
                  border: '2px solid #e9ecef', 
                  background: '#f8f9fa',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                placeholder="Votre mot de passe (CIN)"
                id="formPassword"
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = '#CB0920';
                  e.target.style.background = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(203,9,32,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.background = '#f8f9fa';
                  e.target.style.boxShadow = 'none';
                }}
                required
                autoComplete="current-password"
              />
              <span
                onClick={() => setPasswordVisible(!passwordVisible)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#CB0920',
                  fontSize: '1.1rem',
                  zIndex: 1,
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#8B0000'}
                onMouseLeave={(e) => e.target.style.color = '#CB0920'}
              >
                <i className={`fas ${passwordVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
          </div>
          <div style={{ marginTop: '2rem' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #CB0920 0%, #8B0000 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(203,9,32,0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(203,9,32,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(203,9,32,0.3)';
              }}
            >
              <i className="fas fa-sign-in-alt"></i>
              Se connecter
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <p style={{ color: '#666', fontWeight: '400', fontSize: '0.95rem', margin: 0 }}>
            Vous n'avez pas de compte ?{' '}
            <Link 
              to="/signup" 
              style={{ 
                color: '#CB0920', 
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#8B0000'}
              onMouseLeave={(e) => e.target.style.color = '#CB0920'}
            >
              Inscrivez-vous ici
            </Link>
          </p>
        </div>
      </div>
      <style>{`
        .login-card-modern {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .login-card-modern.show {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        
        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @media (max-width: 500px) {
          .login-card-modern {
            padding: 2rem 1.5rem !important;
            margin: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Login;