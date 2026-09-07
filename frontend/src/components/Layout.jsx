import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  admin: 'Admin',
  operatore: 'Operatore',
  cliente: 'Cliente',
  trasportatore: 'Trasportatore',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chiudi sidebar ad ogni cambio di pagina (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Blocca scroll body quando sidebar è aperta su mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const navItem = (to, icon, label, end = false) => (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) => `mo-nav-item ${isActive ? 'active' : ''}`}
    >
      <i className={`bi ${icon}`} />
      <span className="mo-nav-label">{label}</span>
    </NavLink>
  );

  return (
    <>
      {/* Overlay backdrop (mobile) */}
      {sidebarOpen && (
        <div className="mo-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`mo-sidebar ${sidebarOpen ? 'mo-sidebar-open' : ''}`}>
        {/* Logo + chiudi su mobile */}
        <div className="mo-sidebar-logo">
          <img src="/icon-192.png" alt="DiCecca" style={{ width: 44, height: 44, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          <button
            className="mo-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Chiudi menu"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <nav className="mo-sidebar-nav">
          {navItem('/', 'bi-grid-fill', 'Dashboard', true)}
          {navItem('/work-orders', 'bi-clipboard2-check', 'Ordini')}
          {(user?.role === 'admin' || user?.role === 'operatore') && (<>
            {navItem('/clients', 'bi-building', 'Clienti')}
            {navItem('/carriers', 'bi-truck', 'Trasportatori')}
            {navItem('/work-orders/new', 'bi-plus-circle', 'Nuovo ordine')}
          </>)}
          {(user?.role === 'admin' || user?.role === 'operatore') && (<>
            {navItem('/routes', 'bi-signpost-2', 'Tratte')}
            {navItem('/billing', 'bi-receipt', 'Fatturazione')}
            {navItem('/statistics', 'bi-bar-chart-line', 'Statistiche')}
          </>)}
          {user?.role === 'admin' && (<>
            {navItem('/users', 'bi-people', 'Utenti')}
            {navItem('/mail-logs', 'bi-envelope-check', 'Log email')}
            {navItem('/settings', 'bi-sliders', 'Impostazioni')}
          </>)}
        </nav>

        <div className="mo-sidebar-bottom">
          <button
            className="mo-nav-item"
            onClick={handleLogout}
            title="Esci"
            style={{ background: 'none', border: 'none' }}
          >
            <i className="bi bi-box-arrow-right" />
            <span className="mo-nav-label">Esci</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="mo-main">
        {/* Header */}
        <header className="mo-header">
          {/* Burger menu (visibile solo su mobile) */}
          <button
            className="mo-burger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Apri menu"
          >
            <i className="bi bi-list" />
          </button>

          <div className="mo-search-wrap">
            <i className="bi bi-search" />
            <input className="mo-search" type="text" placeholder="Cerca ordine..." />
          </div>

          <div className="mo-header-right">
            <button className="mo-btn-ghost mo-btn" style={{ fontSize: '1.1rem', padding: '0.4rem 0.6rem' }}>
              <i className="bi bi-bell" />
            </button>
            <div className="mo-user-info">
              <div className="mo-avatar">{initials}</div>
              <div className="mo-user-text">
                <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>{user?.name}</div>
                <div className="mo-text-muted" style={{ fontSize: '0.75rem' }}>{ROLE_LABELS[user?.role]}</div>
              </div>
              <i className="bi bi-chevron-down mo-text-muted" style={{ fontSize: '0.75rem' }} />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mo-content">
          {children}
        </main>
      </div>
    </>
  );
}
