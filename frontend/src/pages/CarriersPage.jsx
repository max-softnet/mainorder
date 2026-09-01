import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

export default function CarriersPage() {
  usePageTitle('Trasportatori');
  const navigate = useNavigate();
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchCarriers = async (s = search, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/carriers', { params: { search: s || undefined, page: p } });
      setCarriers(data.data);
      setMeta(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCarriers(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCarriers(search, 1);
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo trasportatore?')) return;
    await api.delete(`/carriers/${id}`);
    fetchCarriers();
  };

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mo-page-title">Trasportatori</h1>
        <button className="mo-btn mo-btn-primary" onClick={() => navigate('/carriers/new')}>
          <i className="bi bi-plus-lg" /> Nuovo trasportatore
        </button>
      </div>

      <div className="mo-card mb-3">
        <form onSubmit={handleSearch} className="d-flex gap-2">
          <div className="mo-search-wrap flex-grow-1">
            <i className="bi bi-search" />
            <input className="mo-search w-100" type="text"
              placeholder="Cerca per denominazione, email..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="mo-btn mo-btn-primary">Cerca</button>
          {search && (
            <button type="button" className="mo-btn mo-btn-ghost"
              onClick={() => { setSearch(''); fetchCarriers('', 1); }}>Azzera</button>
          )}
        </form>
      </div>

      <div className="mo-card">
        {loading ? (
          <div className="text-center py-4 mo-text-muted">Caricamento...</div>
        ) : carriers.length === 0 ? (
          <div className="text-center py-4 mo-text-muted">Nessun trasportatore trovato.</div>
        ) : (
          <div className="mo-table-wrap"><table className="mo-table">
            <thead>
              <tr>
                <th>Denominazione</th>
                <th>Città</th>
                <th>Telefono</th>
                <th>Email</th>
                <th>P.IVA</th>
                <th>Referenti</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carriers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.denominazione}</td>
                  <td>{c.citta || <span className="mo-text-muted">—</span>}</td>
                  <td>{c.telefono || <span className="mo-text-muted">—</span>}</td>
                  <td>{c.email || <span className="mo-text-muted">—</span>}</td>
                  <td>{c.partita_iva || <span className="mo-text-muted">—</span>}</td>
                  <td>
                    <span className="mo-badge mo-badge-confermato">
                      <i className="bi bi-people me-1" />{c.contacts_count}
                    </span>
                  </td>
                  <td>
                    <span className={`mo-badge ${c.active ? 'mo-badge-consegnato' : 'mo-badge-annullato'}`}>
                      {c.active ? 'Attivo' : 'Disattivo'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1 justify-content-end">
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                        onClick={() => navigate(`/carriers/${c.id}`)}>
                        <i className="bi bi-eye" />
                      </button>
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                        onClick={() => navigate(`/carriers/${c.id}/edit`)}>
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

        {meta && meta.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
            <span className="mo-text-muted">{meta.from}–{meta.to} di {meta.total} trasportatori</span>
            <div className="d-flex gap-1">
              <button className="mo-btn mo-btn-ghost" disabled={page === 1}
                onClick={() => { setPage(p => p - 1); fetchCarriers(search, page - 1); }}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mo-btn" style={{ cursor: 'default' }}>{page} / {meta.last_page}</span>
              <button className="mo-btn mo-btn-ghost" disabled={page === meta.last_page}
                onClick={() => { setPage(p => p + 1); fetchCarriers(search, page + 1); }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
