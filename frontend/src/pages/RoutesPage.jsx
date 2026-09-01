import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

function fmt(n) {
  return n != null ? new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(n) : '—';
}

function ClientRoutesTab({ isAdmin }) {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [provinciaDa, setProvinciaDa] = useState('');
  const [provinciaA, setProvinciaA] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchRoutes = async (p = page, s = search, da = provinciaDa, a = provinciaA) => {
    setLoading(true);
    try {
      const { data } = await api.get('/client-routes', { params: {
        page: p,
        search: s || undefined,
        provincia_da: da || undefined,
        provincia_a: a || undefined,
      }});
      setRoutes(data.data);
      setMeta(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRoutes(1, search, provinciaDa, provinciaA);
  };

  const handleReset = () => {
    setSearch(''); setProvinciaDa(''); setProvinciaA('');
    fetchRoutes(1, '', '', '');
  };

  const startEdit = (r) => {
    setEditing(r.id);
    setEditForm({ prezzo: r.prezzo ?? '', note: r.note ?? '' });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/client-routes/${id}`, editForm);
      setRoutes(rs => rs.map(r => r.id === id ? data : r));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa tratta dal listino clienti?')) return;
    await api.delete(`/client-routes/${id}`);
    fetchRoutes(page, search, provinciaDa, provinciaA);
  };

  const hasFilters = search || provinciaDa || provinciaA;

  return (
    <>
      <div className="mo-card mb-3">
        <form onSubmit={handleSearch} className="d-flex gap-2 flex-wrap align-items-end">
          <div className="mo-search-wrap" style={{ flex: '2 1 160px' }}>
            <i className="bi bi-search" />
            <input className="mo-search w-100" type="text"
              placeholder="Cerca cliente..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 90px' }}>
            <input className="mo-form-control" type="text" maxLength={2}
              placeholder="Da (es. MI)"
              value={provinciaDa} onChange={e => setProvinciaDa(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }} />
          </div>
          <div style={{ flex: '1 1 90px' }}>
            <input className="mo-form-control" type="text" maxLength={2}
              placeholder="A (es. RM)"
              value={provinciaA} onChange={e => setProvinciaA(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }} />
          </div>
          <button type="submit" className="mo-btn mo-btn-primary">Cerca</button>
          {hasFilters && (
            <button type="button" className="mo-btn mo-btn-ghost" onClick={handleReset}>Azzera</button>
          )}
        </form>
      </div>

      <div className="mo-card">
        {loading ? (
          <div className="text-center py-4 mo-text-muted">Caricamento...</div>
        ) : routes.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-signpost-2" style={{ fontSize: '2.5rem', color: '#d1d5db' }} />
            <div className="mt-2 mo-text-muted">Nessuna tratta cliente. Si crea automaticamente alla conferma degli ordini.</div>
          </div>
        ) : (
          <div className="mo-table-wrap">
            <table className="mo-table">
              <thead>
                <tr>
                  <th>Da</th>
                  <th>A</th>
                  <th>Cliente</th>
                  <th>Prezzo (€)</th>
                  <th>Ultimo aggiorn.</th>
                  <th>Note</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className="mo-badge mo-badge-in_transito" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                        {r.provincia_da}
                      </span>
                    </td>
                    <td>
                      <span className="mo-badge mo-badge-in_transito" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                        {r.provincia_a}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.cliente?.ragione_sociale || '—'}</td>
                    {editing === r.id ? (
                      <>
                        <td>
                          <input className="mo-form-control" type="number" step="0.01" min="0"
                            style={{ width: 110 }} value={editForm.prezzo}
                            onChange={e => setEditForm(f => ({ ...f, prezzo: e.target.value }))} />
                        </td>
                        <td>—</td>
                        <td>
                          <input className="mo-form-control" type="text"
                            style={{ width: 140 }} value={editForm.note} placeholder="Note..."
                            onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="mo-btn mo-btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                              onClick={() => saveEdit(r.id)} disabled={saving}>
                              <i className="bi bi-check-lg" />
                            </button>
                            <button className="mo-btn mo-btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                              onClick={() => setEditing(null)}>
                              <i className="bi bi-x-lg" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>€ {fmt(r.prezzo)}</td>
                        <td className="mo-text-muted" style={{ fontSize: '0.8rem' }}>
                          {r.updated_at ? new Date(r.updated_at).toLocaleDateString('it-IT') : '—'}
                          {r.last_work_order_id && (
                            <button className="mo-btn mo-btn-ghost ms-1" style={{ padding: '0 0.3rem', fontSize: '0.75rem' }}
                              onClick={() => navigate(`/work-orders/${r.last_work_order_id}`)}>
                              <i className="bi bi-box-arrow-up-right" />
                            </button>
                          )}
                        </td>
                        <td className="mo-text-muted" style={{ fontSize: '0.8rem' }}>
                          {r.note || <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        {isAdmin && (
                          <td>
                            <div className="d-flex gap-1 justify-content-end">
                              <button className="mo-btn mo-btn-ghost" style={{ padding: '0.25rem 0.5rem' }}
                                onClick={() => startEdit(r)} title="Modifica prezzo">
                                <i className="bi bi-pencil" />
                              </button>
                              <button className="mo-btn mo-btn-ghost" style={{ padding: '0.25rem 0.5rem', color: '#ef4444' }}
                                onClick={() => handleDelete(r.id)} title="Elimina tratta">
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
            <span className="mo-text-muted">{meta.from}–{meta.to} di {meta.total} tratte</span>
            <div className="d-flex gap-1">
              <button className="mo-btn mo-btn-ghost" disabled={page === 1}
                onClick={() => { const p = page - 1; setPage(p); fetchRoutes(p, search, provinciaDa, provinciaA); }}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mo-btn" style={{ cursor: 'default' }}>{page} / {meta.last_page}</span>
              <button className="mo-btn mo-btn-ghost" disabled={page === meta.last_page}
                onClick={() => { const p = page + 1; setPage(p); fetchRoutes(p, search, provinciaDa, provinciaA); }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function CarrierRoutesTab({ isAdmin }) {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [provinciaDa, setProvinciaDa] = useState('');
  const [provinciaA, setProvinciaA] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchRoutes = async (p = page, s = search, da = provinciaDa, a = provinciaA) => {
    setLoading(true);
    try {
      const { data } = await api.get('/carrier-routes', { params: {
        page: p,
        search: s || undefined,
        provincia_da: da || undefined,
        provincia_a: a || undefined,
      }});
      setRoutes(data.data);
      setMeta(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRoutes(1, search, provinciaDa, provinciaA);
  };

  const handleReset = () => {
    setSearch(''); setProvinciaDa(''); setProvinciaA('');
    fetchRoutes(1, '', '', '');
  };

  const startEdit = (r) => {
    setEditing(r.id);
    setEditForm({ costo: r.costo ?? '', km_totali: r.km_totali ?? '', note: r.note ?? '' });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/carrier-routes/${id}`, editForm);
      setRoutes(rs => rs.map(r => r.id === id ? data : r));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa tratta dal listino trasportatori?')) return;
    await api.delete(`/carrier-routes/${id}`);
    fetchRoutes(page, search, provinciaDa, provinciaA);
  };

  const hasFilters = search || provinciaDa || provinciaA;

  return (
    <>
      <div className="mo-card mb-3">
        <form onSubmit={handleSearch} className="d-flex gap-2 flex-wrap align-items-end">
          <div className="mo-search-wrap" style={{ flex: '2 1 160px' }}>
            <i className="bi bi-search" />
            <input className="mo-search w-100" type="text"
              placeholder="Cerca trasportatore..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 90px' }}>
            <input className="mo-form-control" type="text" maxLength={2}
              placeholder="Da (es. MI)"
              value={provinciaDa} onChange={e => setProvinciaDa(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }} />
          </div>
          <div style={{ flex: '1 1 90px' }}>
            <input className="mo-form-control" type="text" maxLength={2}
              placeholder="A (es. RM)"
              value={provinciaA} onChange={e => setProvinciaA(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }} />
          </div>
          <button type="submit" className="mo-btn mo-btn-primary">Cerca</button>
          {hasFilters && (
            <button type="button" className="mo-btn mo-btn-ghost" onClick={handleReset}>Azzera</button>
          )}
        </form>
      </div>

      <div className="mo-card">
        {loading ? (
          <div className="text-center py-4 mo-text-muted">Caricamento...</div>
        ) : routes.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-signpost-2" style={{ fontSize: '2.5rem', color: '#d1d5db' }} />
            <div className="mt-2 mo-text-muted">Nessuna tratta trasportatore. Si crea automaticamente alla conferma degli ordini.</div>
          </div>
        ) : (
          <div className="mo-table-wrap">
            <table className="mo-table">
              <thead>
                <tr>
                  <th>Da</th>
                  <th>A</th>
                  <th>Trasportatore</th>
                  <th>Km</th>
                  <th>Costo (€)</th>
                  <th>Ultimo aggiorn.</th>
                  <th>Note</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className="mo-badge mo-badge-in_transito" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                        {r.provincia_da}
                      </span>
                    </td>
                    <td>
                      <span className="mo-badge mo-badge-in_transito" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                        {r.provincia_a}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.carrier?.denominazione || '—'}</td>
                    {editing === r.id ? (
                      <>
                        <td>
                          <input className="mo-form-control" type="number" step="0.01" min="0"
                            style={{ width: 90 }} value={editForm.km_totali} placeholder="km"
                            onChange={e => setEditForm(f => ({ ...f, km_totali: e.target.value }))} />
                        </td>
                        <td>
                          <input className="mo-form-control" type="number" step="0.01" min="0"
                            style={{ width: 110 }} value={editForm.costo}
                            onChange={e => setEditForm(f => ({ ...f, costo: e.target.value }))} />
                        </td>
                        <td>—</td>
                        <td>
                          <input className="mo-form-control" type="text"
                            style={{ width: 140 }} value={editForm.note} placeholder="Note..."
                            onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="mo-btn mo-btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                              onClick={() => saveEdit(r.id)} disabled={saving}>
                              <i className="bi bi-check-lg" />
                            </button>
                            <button className="mo-btn mo-btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                              onClick={() => setEditing(null)}>
                              <i className="bi bi-x-lg" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="mo-text-muted" style={{ fontSize: '0.85rem' }}>
                          {r.km_totali ? `${parseFloat(r.km_totali).toFixed(0)} km` : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>€ {fmt(r.costo)}</td>
                        <td className="mo-text-muted" style={{ fontSize: '0.8rem' }}>
                          {r.updated_at ? new Date(r.updated_at).toLocaleDateString('it-IT') : '—'}
                          {r.last_work_order_id && (
                            <button className="mo-btn mo-btn-ghost ms-1" style={{ padding: '0 0.3rem', fontSize: '0.75rem' }}
                              onClick={() => navigate(`/work-orders/${r.last_work_order_id}`)}>
                              <i className="bi bi-box-arrow-up-right" />
                            </button>
                          )}
                        </td>
                        <td className="mo-text-muted" style={{ fontSize: '0.8rem' }}>
                          {r.note || <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        {isAdmin && (
                          <td>
                            <div className="d-flex gap-1 justify-content-end">
                              <button className="mo-btn mo-btn-ghost" style={{ padding: '0.25rem 0.5rem' }}
                                onClick={() => startEdit(r)} title="Modifica costo">
                                <i className="bi bi-pencil" />
                              </button>
                              <button className="mo-btn mo-btn-ghost" style={{ padding: '0.25rem 0.5rem', color: '#ef4444' }}
                                onClick={() => handleDelete(r.id)} title="Elimina tratta">
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
            <span className="mo-text-muted">{meta.from}–{meta.to} di {meta.total} tratte</span>
            <div className="d-flex gap-1">
              <button className="mo-btn mo-btn-ghost" disabled={page === 1}
                onClick={() => { const p = page - 1; setPage(p); fetchRoutes(p, search, provinciaDa, provinciaA); }}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mo-btn" style={{ cursor: 'default' }}>{page} / {meta.last_page}</span>
              <button className="mo-btn mo-btn-ghost" disabled={page === meta.last_page}
                onClick={() => { const p = page + 1; setPage(p); fetchRoutes(p, search, provinciaDa, provinciaA); }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function RoutesPage() {
  usePageTitle('Tratte');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('clienti');

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="mo-page-title mb-1">Tratte</h1>
          <span className="mo-text-muted" style={{ fontSize: '0.82rem' }}>
            Listino dinamico aggiornato automaticamente alla conferma degli ordini
          </span>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="d-flex gap-2 mb-3">
        <button
          className={`mo-btn ${tab === 'clienti' ? 'mo-btn-primary' : 'mo-btn-ghost'}`}
          onClick={() => setTab('clienti')}>
          <i className="bi bi-people me-1" />Clienti
        </button>
        <button
          className={`mo-btn ${tab === 'trasportatori' ? 'mo-btn-primary' : 'mo-btn-ghost'}`}
          onClick={() => setTab('trasportatori')}>
          <i className="bi bi-truck me-1" />Trasportatori
        </button>
      </div>

      {tab === 'clienti'
        ? <ClientRoutesTab isAdmin={isAdmin} />
        : <CarrierRoutesTab isAdmin={isAdmin} />
      }
    </Layout>
  );
}
