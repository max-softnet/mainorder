import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import usePageTitle from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STATUS_LABELS = {
  in_attesa: 'In Attesa', confermato: 'Confermato',
  annullato: 'Annullato', chiuso: 'Chiuso', fatturato: 'Fatturato',
};

const STATUS_BADGE = {
  in_attesa:      'mo-badge-in_lavorazione',
  confermato:     'mo-badge-consegnato',
  in_lavorazione: 'mo-badge-in_lavorazione',
  in_transito:    'mo-badge-in_transito',
  annullato:      'mo-badge-annullato',
  chiuso:         'mo-badge-confermato',
  fatturato:      'mo-badge-in_transito',
};

export default function WorkOrdersPage() {
  usePageTitle('Ordini di lavoro');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [cittaCarico, setCittaCarico] = useState('');
  const [dataCarico, setDataCarico] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchOrders = async (s = search, st = statusFilter, p = page, cc = cittaCarico, dc = dataCarico) => {
    setLoading(true);
    try {
      const { data } = await api.get('/work-orders', {
        params: {
          search: s || undefined,
          status: st || undefined,
          page: p,
          with_stops: 1,
          citta_carico: cc || undefined,
          data_carico: dc || undefined,
        },
      });
      setOrders(data.data);
      setMeta(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(search); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(search, statusFilter, 1, cittaCarico, dataCarico);
  };

  const handleReset = () => {
    setSearch(''); setStatusFilter(''); setCittaCarico(''); setDataCarico('');
    fetchOrders('', '', 1, '', '');
  };

  const hasFilters = search || statusFilter || cittaCarico || dataCarico;

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

  const [dttModal, setDttModal] = useState(null); // { id, rif_ddt }
  const [dttValue, setDttValue] = useState('');
  const [dttSaving, setDttSaving] = useState(false);

  const openDtt = (e, o) => {
    e.stopPropagation();
    setDttModal({ id: o.id, numero: o.numero_ordine || o.numero_tmp });
    setDttValue(o.rif_ddt || '');
  };

  const saveDtt = async () => {
    setDttSaving(true);
    try {
      await api.patch(`/work-orders/${dttModal.id}/rif-ddt`, { rif_ddt: dttValue });
      setOrders(prev => prev.map(o => o.id === dttModal.id ? { ...o, rif_ddt: dttValue } : o));
      setDttModal(null);
    } finally {
      setDttSaving(false);
    }
  };

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
        <form onSubmit={handleSearch}>
          <div className="d-flex gap-2 flex-wrap align-items-center">
            {/* Numero ordine — larghezza fissa su desktop */}
            <div className="mo-search-wrap" style={{ flex: '1 1 140px', maxWidth: '220px' }}>
              <i className="bi bi-search" />
              <input className="mo-search w-100" type="text"
                placeholder="Nº ordine..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {/* Sede carico — cresce ma non troppo */}
            <input className="mo-form-control" style={{ flex: '1 1 140px', maxWidth: '260px' }}
              type="text" placeholder="Sede di carico (città)..."
              value={cittaCarico} onChange={e => setCittaCarico(e.target.value)} />
            {/* Data carico — larghezza naturale */}
            <input className="mo-form-control" style={{ flex: '0 0 auto', width: '150px' }}
              type="date" title="Data di carico"
              value={dataCarico} onChange={e => setDataCarico(e.target.value)} />
            {/* Stato */}
            <select className="mo-form-control" style={{ flex: '0 0 auto', width: '145px' }}
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchOrders(search, e.target.value, 1, cittaCarico, dataCarico); }}>
              <option value="">Tutti gli stati</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button type="submit" className="mo-btn mo-btn-primary" style={{ flex: '0 0 auto' }}>
              <i className="bi bi-search" /><span className="d-none d-md-inline ms-1">Cerca</span>
            </button>
            {hasFilters && (
              <button type="button" className="mo-btn mo-btn-ghost" style={{ flex: '0 0 auto' }} onClick={handleReset}>
                <i className="bi bi-x-lg" /><span className="d-none d-md-inline ms-1">Azzera</span>
              </button>
            )}
          </div>
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
              {orders.map((o, idx) => {
                const lc = luogoCatico(o);
                const ls = luogoScarico(o);
                return (
                  <div key={o.id} onClick={() => navigate(`/work-orders/${o.id}`)}
                    style={{ padding: '0.9rem 1rem', marginBottom: 8, borderRadius: 8, border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
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
                      </div>
                    )}
                    {(o.totale_cliente || o.totale_trasportatore) && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 3, display: 'flex', gap: '0.75rem' }}>
                        {o.totale_cliente && <span>Prezzo CL: <strong style={{ color: '#374151' }}>€ {parseFloat(o.totale_cliente).toFixed(2)}</strong></span>}
                        {o.totale_trasportatore && <span>Costo TR: <strong style={{ color: '#374151' }}>€ {parseFloat(o.totale_trasportatore).toFixed(2)}</strong></span>}
                      </div>
                    )}
                    {canWrite && (
                      <div style={{ marginTop: 6 }} onClick={e => e.stopPropagation()}>
                        <button className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                          onClick={e => openDtt(e, o)}>
                          <i className="bi bi-file-earmark-text me-1" />
                          {o.rif_ddt ? <span style={{ fontFamily: 'monospace' }}>DDT: {o.rif_ddt}</span> : <span className="mo-text-muted">Rif. DDT —</span>}
                        </button>
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
                    <th>Cliente</th>
                    <th>Trasportatore</th>
                    <th>Carico</th>
                    <th>Scarico</th>
                    <th>Stato</th>
                    <th>Rif. DDT</th>
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
                      <td>
                        {o.cliente ? (
                          <div>
                            <Link to={`/clients/${o.cliente_id}`} style={{ color: 'inherit', textDecoration: 'none' }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--mo-purple)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'inherit'}>
                              {o.cliente.ragione_sociale}
                            </Link>
                            {o.totale_cliente && (
                              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>
                                Prezzo CL: <span style={{ fontWeight: 600, color: '#374151' }}>€ {parseFloat(o.totale_cliente).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {o.carrier ? (
                          <div>
                            <Link to={`/carriers/${o.carrier_id}`} style={{ color: 'inherit', textDecoration: 'none' }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--mo-purple)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'inherit'}>
                              {o.carrier.denominazione}
                            </Link>
                            {o.totale_trasportatore && (
                              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>
                                Costo TR: <span style={{ fontWeight: 600, color: '#374151' }}>€ {parseFloat(o.totale_trasportatore).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
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
                        <span className={`mo-badge ${STATUS_BADGE[o.status] || 'mo-badge-bozza'}`}>
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                      </td>
                      <td>
                        {canWrite ? (
                          <button className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                            onClick={e => openDtt(e, o)}>
                            {o.rif_ddt
                              ? <span style={{ fontFamily: 'monospace', color: '#374151' }}>{o.rif_ddt}</span>
                              : <span className="mo-text-muted"><i className="bi bi-pencil me-1" style={{ fontSize: '0.75rem' }} />—</span>}
                          </button>
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{o.rif_ddt || '—'}</span>
                        )}
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

      {/* Modale Rif. DDT */}
      {dttModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDttModal(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
              <i className="bi bi-file-earmark-text me-2" style={{ color: 'var(--mo-purple)' }} />
              Riferimento DDT
            </div>
            <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 16 }}>
              Ordine {dttModal.numero}
            </div>
            <input
              className="mo-form-control"
              type="text"
              placeholder="Es. DDT-2024-001"
              value={dttValue}
              onChange={e => setDttValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveDtt(); if (e.key === 'Escape') setDttModal(null); }}
              autoFocus
            />
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button className="mo-btn mo-btn-ghost" onClick={() => setDttModal(null)}>Annulla</button>
              <button className="mo-btn mo-btn-primary" onClick={saveDtt} disabled={dttSaving}>
                {dttSaving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

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

