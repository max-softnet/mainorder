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

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('it-IT') : 'â€”';
}
function luogoCarico(o) {
  const s = o.stops?.find(s => s.tipo === 'carico');
  return [s?.citta, s?.provincia].filter(Boolean).join(' (') + (s?.citta && s?.provincia ? ')' : '');
}
function luogoScarico(o) {
  const s = [...(o.stops || [])].reverse().find(s => s.tipo === 'scarico');
  return [s?.citta, s?.provincia].filter(Boolean).join(' (') + (s?.citta && s?.provincia ? ')' : '');
}

// Card mobile per singolo ordine
function OrderCard({ o, navigate, isAdminOp }) {
  return (
    <div
      onClick={() => navigate(`/work-orders/${o.id}`)}
      style={{
        padding: '0.85rem 1rem',
        borderBottom: '1px solid #f3f4f6',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 3 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: 'var(--mo-purple)' }}>
            {o.numero_ordine || o.numero_tmp}
          </span>
          <span className={`mo-badge ${STATUS_BADGE[o.status] || 'mo-badge-bozza'}`} style={{ fontSize: '0.7rem' }}>
            {STATUS_LABELS[o.status] || o.status}
          </span>
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 2 }}>
          {o.cliente?.ragione_sociale || 'â€”'}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {o.data_carico && <span><i className="bi bi-arrow-up-circle me-1" />{fmtDate(o.data_carico)}{o.ora_carico ? ` Â· ${o.ora_carico}` : ''}</span>}
          {o.carrier?.denominazione && <span><i className="bi bi-truck me-1" />{o.carrier.denominazione}</span>}
        </div>
      </div>
      <i className="bi bi-chevron-right" style={{ color: '#d1d5db', flexShrink: 0 }} />
    </div>
  );
}

// Tabella desktop
function OrderTable({ rows, navigate, isAdminOp, cols }) {
  const has = (c) => cols.includes(c);
  return (
    <div className="mo-table-wrap">
      <table className="mo-table" style={{ fontSize: '0.85rem' }}>
        <thead>
          <tr>
            {has('numero')        && <th>NÂ° Ordine</th>}
            {has('cliente')       && <th>Cliente</th>}
            {has('trasportatore') && <th>Trasportatore</th>}
            {has('carico')        && <th>Data carico</th>}
            {has('scarico')       && <th>Data scarico</th>}
            {has('carico_luogo')  && <th>Tappa carico</th>}
            {has('scarico_luogo') && <th>Tappa scarico</th>}
            {has('ora_carico')    && <th>Orario</th>}
            {has('azioni')        && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(o => (
            <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/work-orders/${o.id}`)}>
              {has('numero') && (
                <td><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: 'var(--mo-purple)' }}>{o.numero_ordine || o.numero_tmp}</span></td>
              )}
              {has('cliente')       && <td style={{ fontWeight: 500 }}>{o.cliente?.ragione_sociale || 'â€”'}</td>}
              {has('trasportatore') && <td>{o.carrier?.denominazione || 'â€”'}</td>}
              {has('carico')        && <td>{fmtDate(o.data_carico)}</td>}
              {has('scarico')       && <td>{fmtDate(o.data_scarico)}</td>}
              {has('carico_luogo')  && <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{luogoCarico(o) || <span className="mo-text-muted">—</span>}</td>}
              {has('scarico_luogo') && <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{luogoScarico(o) || <span className="mo-text-muted">—</span>}</td>}
              {has('ora_carico')    && <td>{o.ora_carico ? <span style={{ fontFamily: 'monospace' }}>{o.ora_carico}</span> : <span className="mo-text-muted">â€”</span>}</td>}
              {has('azioni') && (
                <td onClick={e => e.stopPropagation()}>
                  <div className="d-flex gap-1 justify-content-end">
                    <button className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.45rem' }} onClick={() => navigate(`/work-orders/${o.id}`)}>
                      <i className="bi bi-eye" />
                    </button>
                    {isAdminOp && (
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.45rem' }} onClick={() => navigate(`/work-orders/${o.id}/edit`)}>
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

function OrderList({ rows, navigate, isAdminOp, cols, loading, emptyIcon, emptyText }) {
  if (loading) return <div className="text-center py-3 mo-text-muted">Caricamento...</div>;
  if (rows.length === 0) return (
    <div className="text-center py-4" style={{ color: '#9ca3af' }}>
      <i className={`bi ${emptyIcon}`} style={{ fontSize: '1.8rem' }} />
      <div className="mt-2" style={{ fontSize: '0.88rem' }}>{emptyText}</div>
    </div>
  );
  return (
    <>
      {/* Mobile: card list */}
      <div className="d-md-none">
        {rows.map(o => <OrderCard key={o.id} o={o} navigate={navigate} isAdminOp={isAdminOp} />)}
      </div>
      {/* Desktop: tabella */}
      <div className="d-none d-md-block">
        <OrderTable rows={rows} navigate={navigate} isAdminOp={isAdminOp} cols={cols} />
      </div>
    </>
  );
}

function KpiBox({ label, value, icon, accent, euro = false, onClick }) {
  return (
    <div
      className="mo-card"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        padding: '0.7rem 0.9rem',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <i className={`bi ${icon} me-1`} style={{ color: accent }} />{label}
      </div>
      <div style={{ fontSize: euro ? '1.1rem' : '1.5rem', fontWeight: 800, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
        {value === null || value === undefined
          ? <span style={{ color: '#d1d5db' }}>â€”</span>
          : euro
            ? <span style={{ color: accent }}>â‚¬ {fmt(value)}</span>
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
    api.get('/work-orders', { params: { data_carico: oggi, status: 'confermato', per_page: 100, with_stops: 1 } })
      .then(({ data }) => setOrdiniOggi(data.data || data))
      .finally(() => setLoadingOggi(false));
    api.get('/work-orders', { params: { status: 'in_attesa', per_page: 100 } })
      .then(({ data }) => setOrdiniInAttesa(data.data || data))
      .finally(() => setLoadingAttesa(false));
  }, []);

  const isAdminOp = user?.role === 'admin' || user?.role === 'operatore';
  const ora = new Date().getHours();
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <Layout>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h1 className="mo-page-title mb-1">{saluto}, {user?.name?.split(' ')[0]}!</h1>
          <span className="mo-text-muted" style={{ fontSize: '0.82rem' }}>
            <i className="bi bi-calendar3 me-1" />
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        {/* Bottone nuovo ordine â€” visibile solo su desktop */}
        {isAdminOp && (
          <button className="mo-btn mo-btn-primary d-none d-md-flex" onClick={() => navigate('/work-orders/new')}>
            <i className="bi bi-plus-lg me-1" />Nuovo ordine
          </button>
        )}
      </div>

      {/* KPI â€” griglia 2 colonne mobile, 4+ desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}
        className="kpi-grid">
        <KpiBox label="Totale ordini" value={kpi?.totale_ordini ?? null} icon="bi-list-ol"      accent="#2E3192" onClick={() => navigate('/work-orders')} />
        <KpiBox label="Confermati"    value={kpi?.confermati    ?? null} icon="bi-check-circle"  accent="#10b981" />
        <KpiBox label="Fatturati"     value={kpi?.fatturati     ?? null} icon="bi-receipt"       accent="#06b6d4" />
        <KpiBox label="Annullati"     value={kpi?.annullati     ?? null} icon="bi-x-circle"      accent="#ef4444" />
      </div>

      {/* In attesa + valori economici */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="mo-card" style={{ padding: '0.7rem 0.9rem', borderLeft: '3px solid #f59e0b', borderRadius: 8, cursor: 'pointer' }}
          onClick={() => navigate('/work-orders')}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 4 }}>
            <i className="bi bi-hourglass-split me-1" style={{ color: '#f59e0b' }} />In attesa
          </div>
          <div className="d-flex align-items-baseline gap-2 flex-wrap">
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e1e2e', lineHeight: 1.15 }}>
              {kpi?.in_attesa ?? <span style={{ color: '#d1d5db' }}>â€”</span>}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>
              â‚¬ {fmt(kpi?.in_attesa_venduto)}
            </span>
          </div>
        </div>
        <KpiBox label="Venduto"  value={kpi?.venduto ?? null} icon="bi-graph-up-arrow"   accent="#10b981" euro />
        <KpiBox label="Costo"    value={kpi?.costo   ?? null} icon="bi-graph-down-arrow" accent="#ef4444" euro />
        <KpiBox label="Margine"  value={kpi?.margine  ?? null} icon="bi-percent"          accent="#2E3192" euro />
      </div>

      {/* Carichi confermati oggi */}
      <div className="mo-card mb-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            <i className="bi bi-truck me-2" style={{ color: '#10b981' }} />
            Carichi oggi
            {ordiniOggi.length > 0 && (
              <span className="mo-badge mo-badge-confermato ms-2">{ordiniOggi.length}</span>
            )}
          </div>
          <button className="mo-btn mo-btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/work-orders')}>
            Tutti <i className="bi bi-arrow-right ms-1" />
          </button>
        </div>
        <OrderList
          rows={ordiniOggi} navigate={navigate} isAdminOp={isAdminOp} loading={loadingOggi}
          cols={['numero', 'cliente', 'trasportatore', 'carico_luogo', 'scarico_luogo', 'scarico', 'ora_carico', 'azioni']}
          emptyIcon="bi-calendar-check" emptyText="Nessun carico confermato per oggi"
        />
      </div>

      {/* Ordini in attesa */}
      <div className="mo-card" style={{ borderTop: '4px solid #f59e0b' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            <i className="bi bi-hourglass-split me-2" style={{ color: '#f59e0b' }} />
            Da perfezionare
            {ordiniInAttesa.length > 0 && (
              <span className="ms-2" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 99 }}>
                {ordiniInAttesa.length}
              </span>
            )}
          </div>
          <button className="mo-btn mo-btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/work-orders')}>
            Tutti <i className="bi bi-arrow-right ms-1" />
          </button>
        </div>
        <OrderList
          rows={ordiniInAttesa} navigate={navigate} isAdminOp={isAdminOp} loading={loadingAttesa}
          cols={['numero', 'cliente', 'trasportatore', 'carico', 'scarico', 'ora_carico', 'azioni']}
          emptyIcon="bi-check2-circle" emptyText="Nessun ordine in attesa â€” tutto in ordine!"
        />
      </div>

      {/* FAB Nuovo ordine â€” solo mobile */}
      {isAdminOp && (
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

      <style>{`
        @media (min-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
    </Layout>
  );
}


