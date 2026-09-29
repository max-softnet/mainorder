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
        params: { search: s || undefined, status: st || undefined, page: p, with_stops: 1 },
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

  const handleClone = async (id) => {
    const { data } = await api.get(`/work-orders/${id}`);
    const { stops: rawStops, carrier_contacts: cc, documents, numero_ordine, numero_tmp, status, ...rest } = data;
    const DATE_FIELDS = ['data_ordine', 'data_carico', 'data_scarico'];
    DATE_FIELDS.forEach(f => { if (rest[f]) rest[f] = rest[f].slice(0, 10); });
    const cloneForm = {
      ...rest,
      data_ordine: new Date().toISOString().slice(0, 10),
      carrier_contact_ids: cc?.map(c => c.id) || [],
    };
    const cloneStops = (rawStops || []).map(({ id: _id, work_order_id, created_at, updated_at, ...s }) => ({
      ...s,
      data: s.data ? s.data.slice(0, 10) : '',
      _tmpId: Math.random().toString(36).slice(2),
    }));
    navigate('/work-orders/new', { state: { clone: { form: cloneForm, stops: cloneStops } } });
  };

  const canWrite = user?.role === 'admin' || user?.role === 'operatore';

  const luogoCatico = (o) => {
    const s = o.stops?.find(s => s.tipo === 'carico');
    return [s?.citta, s?.provincia].filter(Boolean).join(' (') + (s?.citta && s?.provincia ? ')' : '');
  };
  const luogoScarico = (o) => {
    const s = [...(o.stops || [])].reverse().find(s => s.tipo === 'scarico');
    return [s?.citta, s?.provincia].filter(Boolean).join(' (') + (s?.citta && s?.provincia ? ')' : '');
  };

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="mo-page-title">Ordini di lavoro</h1>
        {canWrite && (
          <button className="mo-btn mo-btn-primary d-none d-md-flex" onClick={() => navigate('/work-orders/new')}>
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
          <select className="mo-form-control" style={{ width: 'auto', minWidth: '140px' }}
            value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchOrders(search, e.target.value, 1); }}>
            <option value="">Tutti gli stati</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button type="submit" className="mo-btn mo-btn-primary">
            <i className="bi bi-search d-md-none" /><span className="d-none d-md-inline">Cerca</span>
          </button>
          {(search || statusFilter) && (
            <button type="button" className="mo-btn mo-btn-ghost"
              onClick={() => { setSearch(''); setStatusFilter(''); fetchOrders('', '', 1); }}>
              <i className="bi bi-x-lg d-md-none" /><span className="d-none d-md-inline">Azzera</span>
            </button>
          )}
        </form>
      </div>

      {/* Lista ordini */}
      <div className="mo-card">
        {loading ? (
          <div className="text-center py-4 mo-text-muted">Caricamento...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-4 mo-text-muted">Nessun ordine trovato.</div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="d-md-none">
              {orders.map(o => {
                const lc = luogoCatico(o);
                const ls = luogoScarico(o);
                return (
                  <div key={o.id} onClick={() => navigate(`/work-orders/${o.id}`)}
                    style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: 'var(--mo-purple)' }}>
                          {o.numero_ordine || o.numero_tmp}
                        </span>
                        <span className={`mo-badge ${STATUS_BADGE[o.status] || 'mo-badge-bozza'}`} style={{ fontSize: '0.7rem' }}>
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {canWrite && (
                          <button className="mo-btn mo-btn-ghost" style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => navigate(`/work-orders/${o.id}/edit`)}>
                            <i className="bi bi-pencil" style={{ fontSize: '0.85rem' }} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      {o.cliente?.ragione_sociale || '—'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {o.data_carico && (
                        <span>
                          <i className="bi bi-arrow-up-circle me-1" style={{ color: '#10b981' }} />
                          {new Date(o.data_carico).toLocaleDateString('it-IT')}
                          {lc && <span style={{ color: '#9ca3af' }}> · {lc}</span>}
                        </span>
                      )}
                      {o.data_scarico && (
                        <span>
                          <i className="bi bi-arrow-down-circle me-1" style={{ color: '#ef4444' }} />
                          {new Date(o.data_scarico).toLocaleDateString('it-IT')}
                          {ls && <span style={{ color: '#9ca3af' }}> · {ls}</span>}
                        </span>
                      )}
                    </div>
                    {o.carrier?.denominazione && (
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 3 }}>
                        <i className="bi bi-truck me-1" />{o.carrier.denominazione}
                        {o.totale_cliente && <span style={{ marginLeft: 8, fontWeight: 600, color: '#374151' }}>€ {parseFloat(o.totale_cliente).toFixed(2)}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: tabella */}
            <div className="d-none d-md-block">
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
                        <div>
                          {o.data_carico
                            ? <div style={{ fontSize: '0.85rem' }}>{new Date(o.data_carico).toLocaleDateString('it-IT')}</div>
                            : <span className="mo-text-muted">—</span>}
                          {luogoCatico(o) && <div className="mo-text-muted" style={{ fontSize: '0.78rem' }}>{luogoCatico(o)}</div>}
                        </div>
                      </td>
                      <td>
                        <div>
                          {o.data_scarico
                            ? <div style={{ fontSize: '0.85rem' }}>{new Date(o.data_scarico).toLocaleDateString('it-IT')}</div>
                            : <span className="mo-text-muted">—</span>}
                          {luogoScarico(o) && <div className="mo-text-muted" style={{ fontSize: '0.78rem' }}>{luogoScarico(o)}</div>}
                        </div>
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
                          {canWrite && (<>
                            <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                              onClick={() => navigate(`/work-orders/${o.id}/edit`)}>
                              <i className="bi bi-pencil" />
                            </button>
                            <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                              title="Clona ordine"
                              onClick={() => handleClone(o.id)}>
                              <i className="bi bi-copy" />
                            </button>
                          </>)}
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
            </div>
          </>
        )}

        {meta && meta.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3"
            style={{ borderTop: '1px solid #f3f4f6' }}>
            <span className="mo-text-muted" style={{ fontSize: '0.82rem' }}>{meta.from}–{meta.to} di {meta.total}</span>
            <div className="d-flex gap-1">
              <button className="mo-btn mo-btn-ghost" disabled={page === 1}
                onClick={() => { setPage(p => p - 1); fetchOrders(search, statusFilter, page - 1); }}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mo-btn" style={{ cursor: 'default', fontSize: '0.85rem' }}>{page} / {meta.last_page}</span>
              <button className="mo-btn mo-btn-ghost" disabled={page === meta.last_page}
                onClick={() => { setPage(p => p + 1); fetchOrders(search, statusFilter, page + 1); }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FAB Nuovo ordine — solo mobile */}
      {canWrite && (
        <button
          className="d-md-none"
          onClick={() => navigate('/work-orders/new')}
          style={{
            position: 'fixed', bottom: 24, right: 20, zIndex: 50,
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--mo-purple, #7c3aed)', color: '#fff',
            border: 'none', boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
            fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Nuovo ordine"
        >
          <i className="bi bi-plus-lg" />
        </button>
      )}
    </Layout>
  );
}
