import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

function fmt(n) {
  return n != null ? new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(n) : '—';
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.45rem 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9ca3af', minWidth: 160 }}>
        {label}
      </span>
      <span style={{ fontSize: '0.9rem', color: '#374151' }}>{value}</span>
    </div>
  );
}

export default function CarrierViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [carrier, setCarrier] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageTitle('Trasportatori', carrier?.denominazione || '...');

  const isAdminOp = user?.role === 'admin' || user?.role === 'operatore';

  useEffect(() => {
    Promise.all([
      api.get(`/carriers/${id}`),
      api.get('/work-orders', { params: { carrier_id: id, per_page: 10 } }),
    ]).then(([{ data: c }, { data: o }]) => {
      setCarrier(c);
      setOrders(o.data || o);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><div className="mo-text-muted p-4">Caricamento...</div></Layout>;
  if (!carrier) return <Layout><div className="mo-text-muted p-4">Trasportatore non trovato.</div></Layout>;

  return (
    <Layout>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <button className="mo-btn mo-btn-ghost" onClick={() => navigate('/carriers')}>
            <i className="bi bi-arrow-left" />
          </button>
          <div>
            <h1 className="mo-page-title mb-0">{carrier.denominazione}</h1>
            <span className="mo-text-muted" style={{ fontSize: '0.82rem' }}>
              {carrier.citta}{carrier.provincia ? ` (${carrier.provincia})` : ''}
            </span>
          </div>
          {!carrier.active && (
            <span className="mo-badge mo-badge-annullato">Inattivo</span>
          )}
        </div>
        {isAdminOp && (
          <button className="mo-btn mo-btn-outline" onClick={() => navigate(`/carriers/${id}/edit`)}>
            <i className="bi bi-pencil me-1" /> Modifica
          </button>
        )}
      </div>

      <div className="row g-3">
        {/* Anagrafica */}
        <div className="col-lg-6">
          <div className="mo-card h-100">
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
              <i className="bi bi-truck me-2" style={{ color: 'var(--mo-purple)' }} />Anagrafica
            </div>
            <Row label="Telefono"    value={carrier.telefono} />
            <Row label="Email"       value={carrier.email} />
            <Row label="Sito web"    value={carrier.sito_web} />
            <Row label="Indirizzo"   value={carrier.indirizzo} />
            <Row label="Città"       value={[carrier.citta, carrier.cap, carrier.provincia].filter(Boolean).join(' ')} />
            {carrier.note && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#f9fafb', borderRadius: 8, fontSize: '0.85rem', color: '#6b7280' }}>
                <i className="bi bi-sticky me-1" />{carrier.note}
              </div>
            )}
          </div>
        </div>

        {/* Dati fiscali */}
        <div className="col-lg-6">
          <div className="mo-card h-100">
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
              <i className="bi bi-receipt me-2" style={{ color: 'var(--mo-purple)' }} />Dati fiscali e albo
            </div>
            <Row label="P.IVA"            value={carrier.partita_iva} />
            <Row label="Cod. Fiscale"     value={carrier.codice_fiscale} />
            <Row label="N° Iscrizione Albo" value={carrier.n_iscrizione_albo} />
          </div>
        </div>

        {/* Referenti */}
        {carrier.contacts && carrier.contacts.length > 0 && (
          <div className="col-12">
            <div className="mo-card">
              <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                <i className="bi bi-people me-2" style={{ color: 'var(--mo-purple)' }} />
                Referenti ({carrier.contacts.length})
              </div>
              <div className="mo-table-wrap">
                <table className="mo-table">
                  <thead>
                    <tr>
                      <th>Nome</th><th>Ruolo</th><th>Telefono</th><th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrier.contacts.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.nome}</td>
                        <td className="mo-text-muted" style={{ fontSize: '0.85rem' }}>{c.ruolo || '—'}</td>
                        <td>{c.telefono || <span className="mo-text-muted">—</span>}</td>
                        <td>{c.email || <span className="mo-text-muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Ultimi ordini */}
        <div className="col-12">
          <div className="mo-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div style={{ fontWeight: 600 }}>
                <i className="bi bi-clipboard2-check me-2" style={{ color: 'var(--mo-purple)' }} />
                Ultimi ordini
              </div>
              {isAdminOp && (
                <button className="mo-btn mo-btn-ghost" style={{ fontSize: '0.82rem' }}
                  onClick={() => navigate(`/work-orders?carrier_id=${id}`)}>
                  Tutti gli ordini <i className="bi bi-arrow-right ms-1" />
                </button>
              )}
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-4 mo-text-muted">Nessun ordine per questo trasportatore.</div>
            ) : (
              <div className="mo-table-wrap">
                <table className="mo-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr><th>N° Ordine</th><th>Stato</th><th>Cliente</th><th>Data carico</th><th>Costo</th><th></th></tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/work-orders/${o.id}`)}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--mo-purple)' }}>
                            {o.numero_ordine || o.numero_tmp}
                          </span>
                        </td>
                        <td>
                          <span className={`mo-badge mo-badge-${o.status}`} style={{ fontSize: '0.72rem' }}>
                            {o.status}
                          </span>
                        </td>
                        <td className="mo-text-muted" style={{ fontSize: '0.83rem' }}>
                          {o.cliente?.ragione_sociale || '—'}
                        </td>
                        <td className="mo-text-muted">
                          {o.data_carico ? new Date(o.data_carico).toLocaleDateString('it-IT') : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {o.costo_trasportatore ? `€ ${fmt(o.costo_trasportatore)}` : '—'}
                        </td>
                        <td>
                          <i className="bi bi-chevron-right mo-text-muted" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
