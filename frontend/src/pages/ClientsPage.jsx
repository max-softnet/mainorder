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
        <button className="mo-btn mo-btn-primary" onClick={() => navigate('/clients/new')}>
          <i className="bi bi-plus-lg" /> Nuovo cliente
        </button>
      </div>

      {/* Search */}
      <div className="mo-card mb-3">
        <form onSubmit={handleSearch} className="d-flex gap-2">
          <div className="mo-search-wrap flex-grow-1">
            <i className="bi bi-search" />
            <input
              className="mo-search w-100"
              style={{ width: '100%' }}
              type="text"
              placeholder="Cerca per ragione sociale, email, referente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="mo-btn mo-btn-primary">Cerca</button>
          {search && (
            <button type="button" className="mo-btn mo-btn-ghost" onClick={() => { setSearch(''); fetchClients('', 1); }}>
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
