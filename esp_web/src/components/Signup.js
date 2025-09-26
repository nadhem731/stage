import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../style/auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/auth/signup';

function Signup() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [roleTypeRole] = useState('Admin');
  const [identifiant, setIdentifiant] = useState('');
  const [cin, setCin] = useState('');
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cardVisible, setCardVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setCardVisible(true), 100);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!accept) {
      setError('Vous devez accepter les conditions d\'utilisation.');
      return;
    }
    if (cin.length < 6) {
      setError('Le CIN doit contenir au moins 6 caractères');
      return;
    }
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          nom,
          prenom,
          email,
          tel,
          password: cin,
          roleTypeRole,
          identifiant,
          cin,
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Signup failed');
      }
      const data = await response.json();
      setSuccess('Inscription réussie ! Redirection vers la page de connexion...');
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'inscription.');
    }
  };

  return (
    <div className="signup-background">
      {/* Background decorative elements */}
      <div className="signup-decoration"></div>
      
      <div className={`login-card-modern ${cardVisible ? 'show' : ''}`} style={{
        maxWidth: '700px',
        width: '100%',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 40px rgba(203,9,32,0.1)',
        padding: '2.5rem 3rem',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(10px)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div className="text-center mb-4">
          <div style={{
            width: '90px',
            height: '90px',
            background: 'linear-gradient(135deg, #CB0920 0%, #e11d48 50%, #CB0920 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 12px 35px rgba(203,9,32,0.25), 0 4px 15px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
              borderRadius: '50%'
            }}></div>
            <i className="fas fa-user-plus" style={{ fontSize: '2.2rem', color: 'white', zIndex: 1 }}></i>
          </div>
          <h2 style={{ 
            color: '#2c3e50', 
            fontWeight: '700', 
            fontSize: '2rem',
            marginBottom: '0.5rem',
            letterSpacing: '-0.5px'
          }}>
            Rejoignez ESPRIT
          </h2>
          <p style={{ 
            color: '#64748b', 
            fontWeight: '500', 
            fontSize: '1.1rem', 
            marginBottom: 0,
            lineHeight: '1.6'
          }}>
            Créez votre compte pour accéder à la plateforme
          </p>
        </div>
        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontWeight: '500',
            boxShadow: '0 4px 15px rgba(220,38,38,0.1)',
            animation: 'shake 0.5s ease-in-out'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem', color: '#dc2626' }}></i>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            color: '#16a34a',
            border: '1px solid #bbf7d0',
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontWeight: '500',
            boxShadow: '0 4px 15px rgba(22,163,74,0.1)'
          }}>
            <i className="fas fa-check-circle" style={{ marginRight: '0.5rem', color: '#16a34a' }}></i>
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} autoComplete="on" style={{ width: '100%' }}>
          {/* Prénom et Nom */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.2rem' }}>
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#374151',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}>
                Prénom
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
                    height: '3.2rem', 
                    fontSize: '1rem', 
                    borderRadius: '14px', 
                    border: '2px solid #e2e8f0', 
                    background: '#f8fafc',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none',
                    color: '#334155'
                  }}
                  placeholder="Votre prénom"
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#CB0920';
                    e.target.style.background = 'white';
                    e.target.style.boxShadow = '0 0 0 4px rgba(203,9,32,0.08)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                    e.target.style.transform = 'translateY(0)';
                  }}
                  required
                />
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Nom
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
                  placeholder="Votre nom"
                  type="text"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
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
          </div>

          {/* Email */}
          <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#333',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Email
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
                <i className="fas fa-envelope"></i>
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
                placeholder="votre.email@exemple.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
              />
            </div>
          </div>

          {/* Identifiant */}
          <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
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
                <i className="fas fa-id-card"></i>
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
                placeholder="Votre identifiant unique"
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

          {/* CIN et Téléphone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.2rem' }}>
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                CIN
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
                  <i className="fas fa-id-badge"></i>
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
                  placeholder="Numéro CIN"
                  type="text"
                  value={cin}
                  onChange={e => setCin(e.target.value)}
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
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Téléphone
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
                  <i className="fas fa-phone"></i>
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
                  placeholder="+216 XX XXX XXX"
                  type="tel"
                  value={tel}
                  onChange={e => setTel(e.target.value)}
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
          </div>



          {/* Checkbox */}
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem 1.25rem', 
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
            borderRadius: '14px', 
            border: '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
            e.target.style.borderColor = '#CB0920';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.transform = 'translateY(0)';
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={accept}
                onChange={e => setAccept(e.target.checked)}
                style={{ 
                  marginRight: '0.75rem', 
                  marginTop: '0.25rem',
                  width: '20px',
                  height: '20px',
                  accentColor: '#CB0920',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.5' }}>
                J&apos;accepte les{' '}
                <a href="#" style={{ 
                  color: '#CB0920', 
                  textDecoration: 'none', 
                  fontWeight: '600',
                  borderBottom: '1px solid transparent',
                  transition: 'border-color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.borderBottomColor = '#CB0920'}
                onMouseLeave={(e) => e.target.style.borderBottomColor = 'transparent'}>
                  Conditions d&apos;utilisation
                </a>
                {' '}et la{' '}
                <a href="#" style={{ 
                  color: '#CB0920', 
                  textDecoration: 'none', 
                  fontWeight: '600',
                  borderBottom: '1px solid transparent',
                  transition: 'border-color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.borderBottomColor = '#CB0920'}
                onMouseLeave={(e) => e.target.style.borderBottomColor = 'transparent'}>
                  Politique de confidentialité
                </a>
                .
              </span>
            </label>
          </div>

          {/* Bouton */}
          <div style={{ marginTop: '2rem' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #CB0920 0%, #e11d48 50%, #CB0920 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                padding: '1.125rem',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(203,9,32,0.25), 0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                letterSpacing: '0.5px',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.02)';
                e.target.style.boxShadow = '0 12px 35px rgba(203,9,32,0.35), 0 4px 15px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 6px 20px rgba(203,9,32,0.25), 0 2px 8px rgba(0,0,0,0.1)';
              }}
              onMouseDown={(e) => {
                e.target.style.transform = 'translateY(-1px) scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.02)';
              }}
            >
              <i className="fas fa-user-plus"></i>
              Créer mon compte
            </button>
          </div>
        </form>
        <div className="text-center" style={{ 
          marginTop: '2rem', 
          paddingTop: '1.5rem', 
          borderTop: '1px solid #e2e8f0' 
        }}>
          <p style={{ color: '#64748b', fontWeight: '500', fontSize: '0.95rem', margin: 0 }}>
            Vous avez déjà un compte ?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: '#CB0920', 
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#e11d48';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#CB0920';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Connectez-vous ici
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
        
        @media (max-width: 768px) {
          .login-card-modern {
            padding: 1.5rem 1rem !important;
            margin: 0.5rem !important;
            maxWidth: 95vw !important;
          }
          
          /* Responsive pour les grilles */
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
        }
        
        @media (max-width: 500px) {
          .login-card-modern {
            padding: 1rem 0.8rem !important;
            margin: 0.3rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Signup;