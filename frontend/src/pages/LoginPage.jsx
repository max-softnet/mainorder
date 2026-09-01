import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../hooks/usePageTitle';

export default function LoginPage() {
  usePageTitle('Accedi');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Credenziali non valide.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--mo-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 1rem' }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '18px',
            background: 'var(--mo-purple)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', fontWeight: 700, margin: '0 auto 1rem',
          }}>M</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--mo-text)', margin: 0 }}>MainOrder</h1>
          <p className="mo-text-muted" style={{ marginTop: '0.25rem' }}>Gestione ordini logistica e trasporti</p>
        </div>

        {/* Card */}
        <div className="mo-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--mo-text)' }}>Accedi al tuo account</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="mo-form-label">Email</label>
              <input
                type="email"
                className="mo-form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                required
              />
            </div>
            <div className="mb-4">
              <label className="mo-form-label">Password</label>
              <input
                type="password"
                className="mo-form-control"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.6rem 0.9rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <i className="bi bi-exclamation-circle me-2" />{error}
              </div>
            )}
            <button type="submit" className="mo-btn mo-btn-primary w-100 justify-content-center" disabled={loading}
              style={{ padding: '0.7rem', fontSize: '0.95rem' }}>
              {loading ? <><i className="bi bi-arrow-repeat me-2" />Accesso...</> : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
