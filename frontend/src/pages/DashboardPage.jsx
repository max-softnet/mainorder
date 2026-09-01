import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import usePageTitle from '../hooks/usePageTitle';
import api from '../api/axios';

const STATUS_LABELS = {
  in_attesa: 'In Attesa', confermato: 'Confermato',
  annullato: 'Annullato', chiuso: 'Chiuso', fatturato: 'Fatturato',
};
const STATUS_BADGE = {
  in_attesa: 'mo-badge-bozza', confermato: 'mo-badge-confermato',
  annullato: 'mo-badge-annullato', chiuso: 'mo-badge-consegnato', fatturato: 'mo-badge-in_transito',
};

function fmt(n) {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(n || 0);
}

function OrderTable({ rows, navigate, isAdminOp, cols }) {
  const has = (c) => cols.includes(c);
  return (
    <div className="mo-table-wrap">
      <table className="mo-table" style={{ fontSize: '0.85rem' }}>
        <thead>
          <tr>
            {has('numero')       && <th>N° Ordine</th>}
            {has('cliente')      && <th>Cliente</th>}
            {has('trasportatore')&& <th>Trasportatore</th>}
            {has('carico')       && <th>Data carico</th>}
            {has('scarico')      && <th>Data scarico</th>}
            {has('ora_carico')   && <th>Fascia oraria</th>}
            {has('azioni')       && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(o => (
            <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/work-orders/${o.id}`)}>
              {has('numero') && (
                <td>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: 'var(--mo-purple)' }}>
                    {o.numero_ordine || o.numero_tmp}
                  </span>
                </td>
              )}
              {has('cliente')       && <td style={{ fontWeight: 500 }}>{o.cliente?.ragione_sociale || '—'}</td>}
              {has('trasportatore') && <td>{o.carrier?.denominazione || '—'}</td>}
              {has('carico')  && (
                <td>{o.data_carico ? new Date(o.data_carico).toLocaleDateString('it-IT') : <span className="mo-text-muted">—</span>}</td>
              )}
              {has('scarico') && (
                <td>{o.data_scarico ? new Date(o.data_scarico).toLocaleDateString('it-IT') : <span className="mo-text-muted">—</span>}</td>
              )}
              {has('ora_carico') && (
                <td>{o.ora_carico ? <span style={{ fontFamily: 'monospace' }}>{o.ora_carico}</span> : <span className="mo-text-muted">—</span>}</td>
              )}
              {has('azioni') && (
                <td onClick={e => e.stopPropagation()}>
                  <div className="d-flex gap-1 justify-content-end">
                    <button className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.45rem' }}
                      onClick={() => navigate(`/work-orders/${o.id}`)}>
                      <i className="bi bi-eye" />
                    </button>
                    {isAdminOp && (
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.45rem' }}
                        onClick={() => navigate(`/work-orders/${o.id}/edit`)}>
                        <i className="bi bi-pencil" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiBox({ label, value, icon, accent, euro = false, onClick }) {
  return (
    <div
      className="mo-card"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        padding: euro ? '0.75rem 1.1rem' : '0.6rem 0.9rem',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
        flex: '1 1 0',
        minWidth: 0,
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <i className={`bi ${icon} me-1`} style={{ color: accent }} />{label}
      </div>
      <div style={{ fontSize: euro ? '1.35rem' : '1.6rem', fontWeight: 800, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
        {value === null
          ? <span style={{ color: '#d1d5db' }}>—</span>
          : euro
            ? <span style={{ color: accent }}>€ {fmt(value)}</span>
            : <span style={{ color: '#1e1e2e' }}>{value}</span>
        }
      </div>
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [kpi, setKpi] = useState(null);
  const [ordiniOggi, setOrdiniOggi] = useState([]);
  const [ordiniInAttesa, setOrdiniInAttesa] = useState([]);
  const [loadingOggi, setLoadingOggi] = useState(true);
  const [loadingAttesa, setLoadingAttesa] = useState(true);

  const oggi = new Date().toISOString().slice(0, 10);
  const anno = new Date().getFullYear();

  useEffect(() => {
    api.get('/statistics', { params: { anno } }).then(({ data }) => setKpi(data.kpi));

    // Carichi confermati oggi
    api.get('/work-orders', { params: { data_carico: oggi, status: 'confermato', per_page: 100 } })
      .then(({ data }) => setOrdiniOggi(data.data || data))
      .finally(() => setLoadingOggi(false));

    // Ordini in attesa (TMP) — qualsiasi data
    api.get('/work-orders', { params: { status: 'in_attesa', per_page: 100 } })
      .then(({ data }) => setOrdiniInAttesa(data.data || data))
      .finally(() => setLoadingAttesa(false));
  }, []);

  const isAdminOp = user?.role === 'admin' || user?.role === 'operatore';
  const ora = new Date().getHours();
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <Layout>
      {/* Header benvenuto */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="mo-page-title mb-1">{saluto}, {user?.name?.split(' ')[0]}!</h1>
          <span className="mo-text-muted" style={{ fontSize: '0.85rem' }}>
            <i className="bi bi-calendar3 me-1" />
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        {isAdminOp && (
          <button className="mo-btn mo-btn-primary" onClick={() => navigate('/work-orders/new')}>
            <i className="bi bi-plus-lg me-1" />Nuovo ordine
          </button>
        )}
      </div>

      {/* KPI riga 1 — contatori + in attesa */}
      <div className="mb-2" style={{ display: 'flex', gap: '0.5rem' }}>
        <KpiBox label="Totale ordini" value={kpi?.totale_ordini ?? null} icon="bi-list-ol"      accent="#2E3192" onClick={() => navigate('/work-orders')} />
        <KpiBox label="Confermati"    value={kpi?.confermati    ?? null} icon="bi-check-circle"  accent="#10b981" />
        <KpiBox label="Fatturati"     value={kpi?.fatturati     ?? null} icon="bi-receipt"       accent="#06b6d4" />
        <KpiBox label="Annullati"     value={kpi?.annullati     ?? null} icon="bi-x-circle"      accent="#ef4444" />

        {/* Separatore */}
        <div style={{ width: 1, background: '#e5e7eb', margin: '0 0.15rem', flexShrink: 0 }} />

        {/* In attesa — N° + valore potenziale */}
        <div
          className="mo-card"
          style={{ padding: '0.6rem 0.9rem', borderLeft: '3px solid #f59e0b', borderRadius: 8, cursor: 'pointer', flex: '1 1 0' }}
          onClick={() => navigate('/work-orders')}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 4, whiteSpace: 'nowrap' }}>
            <i className="bi bi-hourglass-split me-1" style={{ color: '#f59e0b' }} />In attesa
          </div>
          <div className="d-flex align-items-baseline gap-2">
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e1e2e', lineHeight: 1.15 }}>
              {kpi?.in_attesa ?? <span style={{ color: '#d1d5db' }}>—</span>}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>
              € {fmt(kpi?.in_attesa_venduto)}
            </span>
          </div>
        </div>
      </div>

      {/* KPI riga 2 — valori economici */}
      <div className="mb-4" style={{ display: 'flex', gap: '0.5rem' }}>
        <KpiBox label="Venduto" value={kpi?.venduto ?? null} icon="bi-graph-up-arrow"   accent="#10b981" euro />
        <KpiBox label="Costo"   value={kpi?.costo   ?? null} icon="bi-graph-down-arrow" accent="#ef4444" euro />
        <KpiBox label="Margine" value={kpi?.margine  ?? null} icon="bi-percent"          accent="#2E3192" euro />
      </div>

      <div className="row g-4">
        {/* Carichi confermati oggi */}
        <div className="col-12">
          <div className="mo-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                <i className="bi bi-truck me-2" style={{ color: '#10b981' }} />
                Carichi confermati oggi
                {ordiniOggi.length > 0 && (
                  <span className="mo-badge mo-badge-confermato ms-2">{ordiniOggi.length}</span>
                )}
              </div>
              <button className="mo-btn mo-btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => navigate('/work-orders')}>
                Tutti gli ordini <i className="bi bi-arrow-right ms-1" />
              </button>
            </div>

            {loadingOggi ? (
              <div className="text-center py-3 mo-text-muted">Caricamento...</div>
            ) : ordiniOggi.length === 0 ? (
              <div className="text-center py-4" style={{ color: '#9ca3af' }}>
                <i className="bi bi-calendar-check" style={{ fontSize: '1.8rem' }} />
                <div className="mt-2" style={{ fontSize: '0.88rem' }}>Nessun carico confermato per oggi</div>
              </div>
            ) : (
              <OrderTable rows={ordiniOggi} navigate={navigate} isAdminOp={isAdminOp}
                cols={['numero', 'cliente', 'trasportatore', 'scarico', 'ora_carico', 'azioni']} />
            )}
          </div>
        </div>

        {/* Ordini in attesa da perfezionare */}
        <div className="col-12">
          <div className="mo-card" style={{ borderTop: '4px solid #f59e0b' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                <i className="bi bi-hourglass-split me-2" style={{ color: '#f59e0b' }} />
                Da perfezionare (TMP in attesa)
                {ordiniInAttesa.length > 0 && (
                  <span className="ms-2" style={{
                    background: '#fef3c7', color: '#92400e', fontSize: '0.72rem',
                    fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 99,
                  }}>{ordiniInAttesa.length}</span>
                )}
              </div>
              <button className="mo-btn mo-btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => navigate('/work-orders')}>
                Tutti gli ordini <i className="bi bi-arrow-right ms-1" />
              </button>
            </div>

            {loadingAttesa ? (
              <div className="text-center py-3 mo-text-muted">Caricamento...</div>
            ) : ordiniInAttesa.length === 0 ? (
              <div className="text-center py-4" style={{ color: '#9ca3af' }}>
                <i className="bi bi-check2-circle" style={{ fontSize: '1.8rem', color: '#10b981' }} />
                <div className="mt-2" style={{ fontSize: '0.88rem' }}>Nessun ordine in attesa — tutto in ordine!</div>
              </div>
            ) : (
              <OrderTable rows={ordiniInAttesa} navigate={navigate} isAdminOp={isAdminOp}
                cols={['numero', 'cliente', 'trasportatore', 'carico', 'scarico', 'ora_carico', 'azioni']} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
