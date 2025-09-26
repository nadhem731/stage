import React from 'react';
import Sidebar from '../Sidebar';
import '../../style/dashboard.css';

const EnseignantLayout = ({ 
  children, 
  title, 
  subtitle, 
  loading = false, 
  loadingMessage = "Chargement...",
  showRefresh = false,
  onRefresh = null
}) => {
  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main">
          <div className="dashboard-content">
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              background: '#f8f9fa',
              borderRadius: '12px',
              margin: '2rem 0'
            }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem',
                animation: 'spin 2s linear infinite'
              }}>
                ⏳
              </div>
              <h3 style={{ color: '#CB0920', marginBottom: '0.5rem' }}>
                {loadingMessage}
              </h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Veuillez patienter pendant le chargement des données...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <div className="dashboard-content">
          {(title || showRefresh) && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '2rem',
              padding: '1rem 0',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <div>
                {title && (
                  <h1 style={{ 
                    margin: 0, 
                    color: '#CB0920', 
                    fontSize: '2rem',
                    fontWeight: '700'
                  }}>
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p style={{ 
                    margin: '0.5rem 0 0 0', 
                    color: '#666', 
                    fontSize: '1.1rem' 
                  }}>
                    {subtitle}
                  </p>
                )}
              </div>
              
              {showRefresh && onRefresh && (
                <button
                  onClick={onRefresh}
                  style={{
                    background: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    fontSize: 24,
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(40, 167, 69, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
                  }}
                  title="Actualiser les données"
                >
                  ↻
                </button>
              )}
            </div>
          )}
          
          {children}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EnseignantLayout;