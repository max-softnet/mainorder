import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

const EVENT_LABELS = {
  login_success: 'Login riuscito',
  login_failed:  'Login fallito',
  logout:        'Logout',
};

const EVENT_BADGE = {
  login_success: { bg: '#dcfce7', color: '#166534' },
  login_failed:  { bg: '#fee2e2', color: '#991b1b' },
  logout:        { bg: '#f3f4f6', color: '#374151' },
};

export default function AccessLogsPage() {
  usePageTitle('Log accessi');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchLogs = async (s = search, ev = eventFilter, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/access-logs', {
        params: { search: s || undefined, event: ev || undefined, page: p },
      });
      setLogs(data.data || []);
      setMeta(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const parseUA = (ua) => {
    if (!ua) return '—';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return ua.slice(0, 40);
  };

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mo-page-title">Log accessi</h1>
      </div>

      <div className="mo-card mb-3">
        <form className="d-flex gap-2 flex-wrap" onSubmit={e => { e.preventDefault(); setPage(1); fetchLogs(search, eventFilter, 1); }}>
          <div className="mo-search-wrap flex-grow-1">
            <i className="bi bi-search" />
            <input className="mo-search w-100" type="text"
              placeholder="Cerca per email..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="mo-form-control" style={{ width: 'auto', minWidth: '160px' }}
            value={eventFilter}
            onChange={e => { setEventFilter(e.target.value); setPage(1); fetchLogs(search, e.target.value, 1); }}>
            <option value="">Tutti gli eventi</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button type="submit" className="mo-btn mo-btn-primary">Cerca</button>
          {(search || eventFilter) && (
            <button type="button" className="mo-btn mo-btn-ghost"
              onClick={() => { setSearch(''); setEventFilter(''); setPage(1); fetchLogs('', '', 1); }}>
              Azzera
            </button>
          )}
        </form>
      </div>

      <div className="mo-card">
        {loading ? (
          <div className="text-center py-4 mo-text-muted">Caricamento...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-4 mo-text-muted">Nessun accesso registrato.</div>
        ) : (
          <div className="mo-table-wrap">
            <table className="mo-table">
              <thead>
                <tr>
                  <th>Data e ora</th>
                  <th>Email</th>
                  <th>Utente</th>
                  <th>Evento</th>
                  <th>IP</th>
                  <th>Browser</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const badge = EVENT_BADGE[log.event] || { bg: '#f3f4f6', color: '#374151' };
                  return (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td>{log.email || '—'}</td>
                      <td>{log.user ? log.user.name : <span className="mo-text-muted">—</span>}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          background: badge.bg,
                          color: badge.color,
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          {EVENT_LABELS[log.event] || log.event}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {log.ip_address || '—'}
                      </td>
                      <td className="mo-text-muted" style={{ fontSize: '0.85rem' }}>
                        {parseUA(log.user_agent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3"
            style={{ borderTop: '1px solid #f3f4f6' }}>
            <span className="mo-text-muted">{meta.from}–{meta.to} di {meta.total} accessi</span>
            <div className="d-flex gap-1">
              <button className="mo-btn mo-btn-ghost" disabled={page === 1}
                onClick={() => { setPage(p => p - 1); fetchLogs(search, eventFilter, page - 1); }}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mo-btn" style={{ cursor: 'default' }}>{page} / {meta.last_page}</span>
              <button className="mo-btn mo-btn-ghost" disabled={page === meta.last_page}
                onClick={() => { setPage(p => p + 1); fetchLogs(search, eventFilter, page + 1); }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
