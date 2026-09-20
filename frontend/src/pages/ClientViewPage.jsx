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

export default function ClientViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageTitle('Clienti', client?.ragione_sociale || '...');

  const isAdminOp = user?.role === 'admin' || user?.role === 'operatore';

  useEffect(() => {
    Promise.all([
      api.get(`/clients/${id}`),
      api.get('/work-orders', { params: { cliente_id: id, per_page: 10 } }),
      api.get('/client-routes', { params: { cliente_id: id, per_page: 50 } }),
    ]).then(([{ data: c }, { data: o }, { data: r }]) => {
      setClient(c);
      setOrders(o.data || o);
      setRoutes(r.data || []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><div className="mo-text-muted p-4">Caricamento...</div></Layout>;
  if (!client) return <Layout><div className="mo-text-muted p-4">Cliente non trovato.</div></Layout>;

  return (
    <Layout>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <button className="mo-btn mo-btn-ghost" onClick={() => navigate('/clients')}>
            <i className="bi bi-arrow-left" />
          </button>
          <div>
            <h1 className="mo-page-title mb-0">{client.ragione_sociale}</h1>
            <span className="mo-text-muted" style={{ fontSize: '0.82rem' }}>
              {client.citta}{client.provincia ? ` (${client.provincia})` : ''}
            </span>
          </div>
          {!client.active && (
            <span className="mo-badge mo-badge-annullato">Inattivo</span>
          )}
        </div>
        {isAdminOp && (
          <div className="d-flex gap-2">
            <button
              className="mo-btn mo-btn-ghost"
              onClick={() => navigate(`/billing?cliente_id=${id}&cliente_nome=${encodeURIComponent(client.ragione_sociale)}`)}
            >
              <i className="bi bi-receipt me-1" /> Ordini da fatturare
            </button>
            <button className="mo-btn mo-btn-outline" onClick={() => navigate(`/clients/${id}/edit`)}>
              <i className="bi bi-pencil me-1" /> Modifica
            </button>
          </div>
        )}
      </div>

      <div className="row g-3">
        {/* Anagrafica */}
        <div className="col-lg-6">
          <div className="mo-card h-100">
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
              <i className="bi bi-building me-2" style={{ color: 'var(--mo-purple)' }} />Anagrafica
            </div>
            <Row label="Referente"   value={client.referente} />
            <Row label="Telefono"    value={client.telefono} />
            <Row label="Email"       value={client.email} />
            <Row label="Sito web"    value={client.sito_web} />
            <Row label="Indirizzo"   value={client.indirizzo} />
            <Row label="Città"       value={[client.citta, client.cap, client.provincia].filter(Boolean).join(' ')} />
            {client.note && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#f9fafb', borderRadius: 8, fontSize: '0.85rem', color: '#6b7280' }}>
                <i className="bi bi-sticky me-1" />{client.note}
              </div>
            )}
          </div>
        </div>

        {/* Fatturazione */}
        <div className="col-lg-6">
          <div className="mo-card h-100">
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
              <i className="bi bi-receipt me-2" style={{ color: 'var(--mo-purple)' }} />Dati fiscali
            </div>
            <Row label="P.IVA"          value={client.partita_iva} />
            <Row label="Cod. Fiscale"   value={client.codice_fiscale} />
            <Row label="Codice SDI"     value={client.sdi} />
            {client.fic_id && <Row label="ID Fatture in Cloud" value={String(client.fic_id)} />}
            <Row label="Indirizzo fatt." value={client.fatturazione_indirizzo} />
            <Row label="Città fatt."    value={[client.fatturazione_citta, client.fatturazione_cap, client.fatturazione_provincia].filter(Boolean).join(' ')} />

            {(client.supplemento_carico > 0 || client.supplemento_scarico > 0) && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '0.5rem' }}>
                  Supplementi fissi
                </div>
                <div className="d-flex gap-3">
                  {client.supplemento_carico > 0 && (
                    <span style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-arrow-up-circle me-1 text-success" />
                      Carico: <strong>€ {fmt(client.supplemento_carico)}</strong>
                    </span>
                  )}
                  {client.supplemento_scarico > 0 && (
                    <span style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-arrow-down-circle me-1 text-danger" />
                      Scarico: <strong>€ {fmt(client.supplemento_scarico)}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Listino tratte */}
        {routes.length > 0 && (
          <div className="col-12">
            <div className="mo-card">
              <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                <i className="bi bi-signpost-2 me-2" style={{ color: 'var(--mo-purple)' }} />
                Listino tratte ({routes.length})
              </div>
              <div className="mo-table-wrap">
                <table className="mo-table">
                  <thead>
                    <tr>
                      <th>Da</th><th>A</th><th>Prezzo</th><th>Aggiornato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map(r => (
                      <tr key={r.id}>
                        <td><span className="mo-badge mo-badge-in_transito" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.provincia_da}</span></td>
                        <td><span className="mo-badge mo-badge-in_transito" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.provincia_a}</span></td>
                        <td style={{ fontWeight: 600 }}>€ {fmt(r.prezzo)}</td>
                        <td className="mo-text-muted" style={{ fontSize: '0.8rem' }}>
                          {r.updated_at ? new Date(r.updated_at).toLocaleDateString('it-IT') : '—'}
                        </td>
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
                  onClick={() => navigate(`/work-orders?cliente_id=${id}`)}>
                  Tutti gli ordini <i className="bi bi-arrow-right ms-1" />
                </button>
              )}
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-4 mo-text-muted">Nessun ordine per questo cliente.</div>
            ) : (
              <div className="mo-table-wrap">
                <table className="mo-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr><th>N° Ordine</th><th>Stato</th><th>Data carico</th><th>Prezzo</th><th></th></tr>
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
                        <td className="mo-text-muted">
                          {o.data_carico ? new Date(o.data_carico).toLocaleDateString('it-IT') : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {o.prezzo_cliente ? `€ ${fmt(o.prezzo_cliente)}` : '—'}
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
