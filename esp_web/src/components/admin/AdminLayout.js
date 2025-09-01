import React from 'react';
import Sidebar from '../Sidebar';
import '../../style/admin-layout.css';

const AdminLayout = ({ 
    children, 
    activeMenu, 
    setActiveMenu, 
    title, 
    subtitle,
    loading = false,
    loadingMessage = "Chargement..."
}) => {
    if (loading) {
        return (
            <div className="admin-layout">
                <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
                <div className="admin-content">
                    <div className="admin-main-container">
                        <div className="loading-container">
                            <div className="loading-spinner">🔄</div>
                            <p>{loadingMessage}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
            <div className="admin-content">
                <div className="admin-main-container">
                    {title && (
                        <div className="admin-page-header">
                            <h1 className="admin-page-title">{title}</h1>
                            {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
