import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import usePageTitle from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STATUS_LABELS = {
  in_attesa: 'In Attesa', confermato: 'Confermato',
  annullato: 'Annullato', chiuso: 'Chiuso', fatturato: 'Fatturato',
};

const STATUS_BADGE = {
  in_attesa: 'mo-badge-bozza', confermato: 'mo-badge-confermato',
  in_lavorazione: 'mo-badge-in_lavorazione', in_transito: 'mo-badge-in_transito',
  annullato: 'mo-badge-annullato', chiuso: 'mo-badge-consegnato', fatturato: 'mo-badge-in_transito',
};

export default function WorkOrdersPage() {
  usePageTitle('Ordini di lavoro');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchOrders = async (s = search, st = statusFilter, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/work-orders', {
        params: { search: s || undefined, status: st || undefined, page: p },
      });
      setOrders(data.data);
      setMeta(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(search, statusFilter, 1);
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo ordine?')) return;
    await api.delete(`/work-orders/${id}`);
    fetchOrders();
  };

  const canWrite = user?.role === 'admin' || user?.role === 'operatore';

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mo-page-title">Ordini di lavoro</h1>
        {canWrite && (
          <button className="mo-btn mo-btn-primary" onClick={() => navigate('/work-orders/new')}>
            <i className="bi bi-plus-lg" /> Nuovo ordine
          </button>
        )}
      </div>

      {/* Filtri */}
      <div className="mo-card mb-3">
        <form onSubmit={handleSearch} className="d-flex gap-2 flex-wrap">
          <div className="mo-search-wrap flex-grow-1">
            <i className="bi bi-search" />
            <input className="mo-search w-100" type="text"
              placeholder="Cerca per numero ordine..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="mo-form-control" style={{ width: 'auto', minWidth: '160px' }}
            value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchOrders(search, e.target.value, 1); }}>
            <option value="">Tutti gli stati</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button type="submit" className="mo-btn mo-btn-primary">Cerca</button>
          {(search || statusFilter) && (
            <button type="button" className="mo-btn mo-btn-ghost"
              onClick={() => { setSearch(''); setStatusFilter(''); fetchOrders('', '', 1); }}>
              Azzera
            </button>
          )}
        </form>
      </div>

      {/* Tabella */}
      <div className="mo-card">
        {loading ? (
          <div className="text-center py-4 mo-text-muted">Caricamento...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-4 mo-text-muted">Nessun ordine trovato.</div>
        ) : (
          <div className="mo-table-wrap"><table className="mo-table">
            <thead>
              <tr>
                <th>N° Ordine</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Trasportatore</th>
                <th>Carico</th>
                <th>Scarico</th>
                <th>Totale Cliente</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/work-orders/${o.id}`} style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--mo-purple)', textDecoration: 'none' }}>
                      {o.numero_ordine || o.numero_tmp}
                    </Link>
                  </td>
                  <td>{o.data_ordine ? new Date(o.data_ordine).toLocaleDateString('it-IT') : '—'}</td>
                  <td>
                    {o.cliente ? (
                      <Link to={`/clients/${o.cliente_id}`} style={{ color: 'inherit', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--mo-purple)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'inherit'}>
                        {o.cliente.ragione_sociale}
                      </Link>
                    ) : '—'}
                  </td>
                  <td>
                    {o.carrier ? (
                      <Link to={`/carriers/${o.carrier_id}`} style={{ color: 'inherit', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--mo-purple)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'inherit'}>
                        {o.carrier.denominazione}
                      </Link>
                    ) : '—'}
                  </td>
                  <td>
                    {o.data_carico
                      ? new Date(o.data_carico).toLocaleDateString('it-IT')
                      : <span className="mo-text-muted">—</span>}
                  </td>
                  <td>
                    {o.data_scarico
                      ? new Date(o.data_scarico).toLocaleDateString('it-IT')
                      : <span className="mo-text-muted">—</span>}
                  </td>
                  <td>
                    {o.totale_cliente
                      ? <span style={{ fontWeight: 600 }}>€ {parseFloat(o.totale_cliente).toFixed(2)}</span>
                      : <span className="mo-text-muted">—</span>}
                  </td>
                  <td>
                    <span className={`mo-badge ${STATUS_BADGE[o.status] || 'mo-badge-bozza'}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1 justify-content-end">
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                        onClick={() => navigate(`/work-orders/${o.id}`)}>
                        <i className="bi bi-eye" />
                      </button>
                      {canWrite && (
                        <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                          onClick={() => navigate(`/work-orders/${o.id}/edit`)}>
                          <i className="bi bi-pencil" />
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}
                          onClick={() => handleDelete(o.id)}>
                          <i className="bi bi-trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3"
            style={{ borderTop: '1px solid #f3f4f6' }}>
            <span className="mo-text-muted">{meta.from}–{meta.to} di {meta.total} ordini</span>
            <div className="d-flex gap-1">
              <button className="mo-btn mo-btn-ghost" disabled={page === 1}
                onClick={() => { setPage(p => p - 1); fetchOrders(search, statusFilter, page - 1); }}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mo-btn" style={{ cursor: 'default' }}>{page} / {meta.last_page}</span>
              <button className="mo-btn mo-btn-ghost" disabled={page === meta.last_page}
                onClick={() => { setPage(p => p + 1); fetchOrders(search, statusFilter, page + 1); }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
