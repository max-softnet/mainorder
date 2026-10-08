import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import usePageTitle from '../hooks/usePageTitle';
import api from '../api/axios';

export default function ClientsPage() {
  usePageTitle('Clienti');
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchClients = async (s = search, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', { params: { search: s || undefined, page: p } });
      setClients(data.data);
      setMeta(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchClients(search, 1);
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo cliente?')) return;
    await api.delete(`/clients/${id}`);
    fetchClients();
  };

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mo-page-title">Clienti</h1>
        <button className="mo-btn mo-btn-primary" onClick={() => navigate('/fic-sync')}>
          <i className="bi bi-cloud-arrow-down me-1" /> Importa da FiC
        </button>
      </div>

      {/* Search */}
      <div className="mo-card mb-3">
        <form onSubmit={handleSearch} className="d-flex gap-2 flex-wrap">
          <div className="mo-search-wrap" style={{ flex: '1 1 180px', minWidth: 0 }}>
            <i className="bi bi-search" />
            <input
              className="mo-search w-100"
              type="text"
              placeholder="Cerca ragione sociale, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="mo-btn mo-btn-primary" style={{ flex: '0 0 auto' }}>Cerca</button>
          {search && (
            <button type="button" className="mo-btn mo-btn-ghost" style={{ flex: '0 0 auto' }} onClick={() => { setSearch(''); fetchClients('', 1); }}>
              Azzera
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="mo-card">
        {loading ? (
          <div className="text-center py-4 mo-text-muted">Caricamento...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-4 mo-text-muted">Nessun cliente trovato.</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="d-md-none">
              {clients.map((c, idx) => (
                <div key={c.id}
                  style={{ padding: '0.85rem 1rem', marginBottom: 8, borderRadius: 8, border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', background: idx % 2 === 0 ? '#ffffff' : '#f9fafb', cursor: 'pointer' }}
                  onClick={() => navigate(`/clients/${c.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.ragione_sociale}</span>
                        <span className={`mo-badge ${c.active ? 'mo-badge-consegnato' : 'mo-badge-annullato'}`} style={{ fontSize: '0.68rem' }}>
                          {c.active ? 'Attivo' : 'Disattivo'}
                        </span>
                        {(c.supplemento_carico || c.supplemento_scarico) && (
                          <span className="mo-badge mo-badge-confermato" style={{ fontSize: '0.68rem' }}>suppl.</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {c.citta && <span><i className="bi bi-geo-alt me-1" />{c.citta}</span>}
                        {c.referente && <span><i className="bi bi-person me-1" />{c.referente}</span>}
                      </div>
                      {(c.email || c.telefono) && (
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
                          {c.email && <span className="me-3"><i className="bi bi-envelope me-1" />{c.email}</span>}
                          {c.telefono && <span><i className="bi bi-telephone me-1" />{c.telefono}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => navigate(`/clients/${c.id}/edit`)}>
                        <i className="bi bi-pencil" style={{ fontSize: '0.85rem' }} />
                      </button>
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => handleDelete(c.id)}>
                        <i className="bi bi-trash" style={{ fontSize: '0.85rem' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="d-none d-md-block">
              <div className="mo-table-wrap"><table className="mo-table">
                <thead>
                  <tr>
                    <th>Ragione Sociale</th>
                    <th>Referente</th>
                    <th>Città</th>
                    <th>Email</th>
                    <th>Telefono</th>
                    <th>P.IVA</th>
                    <th>Stato</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{c.ragione_sociale}</span>
                        {c.supplemento_carico || c.supplemento_scarico ? (
                          <span className="mo-badge mo-badge-confermato ms-2" style={{ fontSize: '0.7rem' }}>suppl.</span>
                        ) : null}
                      </td>
                      <td>{c.referente || <span className="mo-text-muted">—</span>}</td>
                      <td>{c.citta || <span className="mo-text-muted">—</span>}</td>
                      <td>{c.email || <span className="mo-text-muted">—</span>}</td>
                      <td>{c.telefono || <span className="mo-text-muted">—</span>}</td>
                      <td>{c.partita_iva || <span className="mo-text-muted">—</span>}</td>
                      <td>
                        <span className={`mo-badge ${c.active ? 'mo-badge-consegnato' : 'mo-badge-annullato'}`}>
                          {c.active ? 'Attivo' : 'Disattivo'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1 justify-content-end">
                          <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                            onClick={() => navigate(`/clients/${c.id}`)}>
                            <i className="bi bi-eye" />
                          </button>
                          <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                            onClick={() => navigate(`/clients/${c.id}/edit`)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}
                            onClick={() => handleDelete(c.id)}>
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          </>
        )}

        {/* Paginazione */}
        {meta && meta.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
            <span className="mo-text-muted">
              {meta.from}–{meta.to} di {meta.total} clienti
            </span>
            <div className="d-flex gap-1">
              <button className="mo-btn mo-btn-ghost" disabled={page === 1}
                onClick={() => { setPage(p => p - 1); fetchClients(search, page - 1); }}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mo-btn" style={{ cursor: 'default' }}>{page} / {meta.last_page}</span>
              <button className="mo-btn mo-btn-ghost" disabled={page === meta.last_page}
                onClick={() => { setPage(p => p + 1); fetchClients(search, page + 1); }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

