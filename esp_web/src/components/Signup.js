import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../style/auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/auth/signup';

function Signup() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [roleTypeRole, setRoleTypeRole] = useState('Etudiant');
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
      setError('Vous devez accepter les conditions d’utilisation.');
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
      setError(err.message || 'Erreur lors de l’inscription.');
    }
  };

  return (
    <div className="gradient-form min-vh-100 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', minWidth: '100vw', overflow: 'auto' }}>
      <div className={`signup-card-modern ${cardVisible ? 'show' : ''}`} style={{
        maxWidth: 480,
        width: '100%',
        margin: 'auto',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(44,62,80,0.13)',
        padding: '2.5rem 2rem',
        position: 'relative',
        transition: 'all 0.7s cubic-bezier(.4,0,.2,1)',
        opacity: cardVisible ? 1 : 0,
        transform: cardVisible ? 'translateY(0)' : 'translateY(40px) scale(0.98)',
      }}>
        <h2 style={{ fontWeight: 700, color: '#222', marginBottom: 8 }}>Sign Up</h2>
        <div style={{ color: '#888', fontWeight: 500, fontSize: '1.05rem', marginBottom: 24 }}>Please fill in this form to create an account!</div>
        {error && <div className="alert alert-danger text-center mb-3" role="alert">{error}</div>}
        {success && <div className="alert alert-success text-center mb-3" role="alert">{success}</div>}
        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="row" style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div className="col" style={{ flex: 1, minWidth: 0 }}>
              <input
                className="form-control"
                style={{ background: '#f5f6fa', border: '1.5px solid #e0e0e0', borderRadius: 7, height: 44, fontSize: 16, marginBottom: 0 }}
                placeholder="First Name"
                type="text"
                value={nom}
                onChange={e => setNom(e.target.value)}
                required
              />
            </div>
            <div className="col" style={{ flex: 1, minWidth: 0 }}>
              <input
                className="form-control"
                style={{ background: '#f5f6fa', border: '1.5px solid #e0e0e0', borderRadius: 7, height: 44, fontSize: 16, marginBottom: 0 }}
                placeholder="Last Name"
                type="text"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                required
              />
            </div>
          </div>
          <input
            className="form-control mb-3"
            style={{ background: '#f5f6fa', border: '1.5px solid #e0e0e0', borderRadius: 7, height: 44, fontSize: 16 }}
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="form-control mb-3"
            style={{ background: '#f5f6fa', border: '1.5px solid #e0e0e0', borderRadius: 7, height: 44, fontSize: 16 }}
            placeholder="Identifiant"
            type="text"
            value={identifiant}
            onChange={e => setIdentifiant(e.target.value)}
            required
          />
          <input
            className="form-control mb-3"
            style={{ background: '#f5f6fa', border: '1.5px solid #e0e0e0', borderRadius: 7, height: 44, fontSize: 16 }}
            placeholder="CIN"
            type="text"
            value={cin}
            onChange={e => setCin(e.target.value)}
            required
          />
          <input
            className="form-control mb-3"
            style={{ background: '#f5f6fa', border: '1.5px solid #e0e0e0', borderRadius: 7, height: 44, fontSize: 16 }}
            placeholder="Numéro de téléphone"
            type="tel"
            value={tel}
            onChange={e => setTel(e.target.value)}
            required
          />
          {/* Password et Confirm Password masqués mais requis pour l’UX */}
          <input
            className="form-control mb-3"
            style={{ background: '#f5f6fa', border: '1.5px solid #e0e0e0', borderRadius: 7, height: 44, fontSize: 16 }}
            placeholder="Password (CIN)"
            type="password"
            value={cin}
            disabled
            required
          />
          <input
            className="form-control mb-3"
            style={{ background: '#f5f6fa', border: '1.5px solid #e0e0e0', borderRadius: 7, height: 44, fontSize: 16 }}
            placeholder="Confirm Password (CIN)"
            type="password"
            value={cin}
            disabled
            required
          />
          <div className="form-check mb-3" style={{ display: 'flex', alignItems: 'center' }}>
            <input
              className="form-check-input"
              type="checkbox"
              checked={accept}
              onChange={e => setAccept(e.target.checked)}
              id="acceptTerms"
              style={{ marginRight: 8 }}
            />
            <label className="form-check-label" htmlFor="acceptTerms" style={{ fontSize: 15, color: '#555' }}>
              J’accepte les <a href="#" style={{ color: '#337ab7', textDecoration: 'underline' }}>Conditions d’utilisation</a> & <a href="#" style={{ color: '#337ab7', textDecoration: 'underline' }}>Politique de confidentialité</a>.
            </label>
          </div>
          <button
            className="gradient-custom-2 btn w-100 signup-glow-btn"
            type="submit"
            style={{ borderRadius: 7, fontWeight: 700, fontSize: 18, padding: '12px 0', marginTop: 8 }}
          >
            Sign Up
          </button>
        </form>
        <div className="text-center mt-4" style={{ fontSize: 15, color: '#888' }}>
          Déjà un compte ?{' '}
          <Link to="/login" className="text-decoration-none fw-bold" style={{ color: '#337ab7' }}>
            Login here
          </Link>
        </div>
      </div>
      <style>{`
        .signup-card-modern {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(44,62,80,0.13);
          padding: 2.5rem 2rem;
          max-width: 480px;
          width: 100%;
          margin: auto;
        }
        .signup-card-modern.show {
          opacity: 1;
          transform: translateY(0);
        }
        .signup-card-modern {
          opacity: 0;
          transform: translateY(40px) scale(0.98);
          transition: all 0.7s cubic-bezier(.4,0,.2,1);
        }
        @media (max-width: 600px) {
          .signup-card-modern {
            padding: 1.2rem 0.5rem !important;
            max-width: 99vw;
          }
        }
        .signup-glow-btn {
          position: relative;
          z-index: 1;
          animation: signupGlow 2.2s infinite alternate;
          box-shadow: 0 0 0 0 rgba(203,9,32,0.25), 0 4px 15px rgba(203,9,32,0.13);
        }
        .signup-glow-btn:hover {
          animation: signupBounce 0.45s cubic-bezier(.4,0,.2,1);
          box-shadow: 0 0 16px 4px #CB0920, 0 8px 32px rgba(203,9,32,0.18);
        }
        @keyframes signupGlow {
          0% { box-shadow: 0 0 0 0 rgba(203,9,32,0.18), 0 4px 15px rgba(203,9,32,0.13); }
          100% { box-shadow: 0 0 24px 8px #CB0920, 0 8px 32px rgba(203,9,32,0.18); }
        }
        @keyframes signupBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.08); }
          60% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default Signup;