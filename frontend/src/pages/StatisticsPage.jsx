import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import usePageTitle from '../hooks/usePageTitle';

const ANNI = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const MESI = [
  { value: '', label: '— Tutti i mesi —' },
  { value: '1', label: 'Gennaio' }, { value: '2', label: 'Febbraio' },
  { value: '3', label: 'Marzo' },   { value: '4', label: 'Aprile' },
  { value: '5', label: 'Maggio' },  { value: '6', label: 'Giugno' },
  { value: '7', label: 'Luglio' },  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Settembre'},{ value: '10', label: 'Ottobre' },
  { value: '11', label: 'Novembre'},{ value: '12', label: 'Dicembre' },
];

function getDaysInMonth(anno, mese) {
  if (!mese) return 31;
  return new Date(parseInt(anno), parseInt(mese), 0).getDate();
}

function fmt(n) {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(n || 0);
}
function fmtShort(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function KpiCard({ label, value, color, euro = false, icon }) {
  return (
    <div className="col">
      <div className="mo-card h-100 text-center py-3 px-2" style={{ borderTop: `4px solid ${color}` }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color, marginBottom: 6 }}>
          {icon && <i className={`bi ${icon} me-1`} />}{label}
        </div>
        <div style={{ fontSize: euro ? '1.15rem' : '1.8rem', fontWeight: 800, color: '#1e1e2e', lineHeight: 1.1 }}>
          {euro ? `€ ${fmt(value)}` : (value ?? '—')}
        </div>
      </div>
    </div>
  );
}

function TrendTooltipOrdini({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#2E3192' }}>Ordini: <strong>{payload[0]?.value}</strong></div>
    </div>
  );
}

function TrendTooltipVenduto({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#10b981' }}>Venduto: <strong>€ {fmt(payload[0]?.value)}</strong></div>
    </div>
  );
}

function TopTable({ title, icon, rows, valueKey, valueLabel, color }) {
  return (
    <div className="mo-card h-100">
      <div className="mb-3 d-flex align-items-center gap-2" style={{ fontWeight: 700, fontSize: '1rem' }}>
        <i className={`bi ${icon}`} style={{ color }} />{title}
      </div>
      <div className="mo-table-wrap">
        <table className="mo-table" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>Nome</th>
              <th style={{ textAlign: 'center' }}>Ordini</th>
              <th style={{ textAlign: 'right' }}>{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: '50%', fontSize: '0.72rem', fontWeight: 700,
                    background: i < 3 ? color : '#f3f4f6',
                    color: i < 3 ? '#fff' : '#6b7280',
                  }}>{i + 1}</span>
                </td>
                <td style={{ fontWeight: i < 3 ? 600 : 400 }}>{r.nome}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className="mo-badge mo-badge-in_transito" style={{ fontSize: '0.72rem' }}>{r.ordini}</span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>€ {fmt(r[valueKey])}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="text-center mo-text-muted py-3">Nessun dato</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function trendTitle(anno, mese, giorno) {
  if (mese && giorno) {
    const d = new Date(anno, parseInt(mese) - 1, parseInt(giorno));
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (mese) {
    const nome = MESI.find(m => m.value === mese)?.label ?? mese;
    return `${nome} ${anno}`;
  }
  return `Anno ${anno}`;
}

export default function StatisticsPage() {
  const [anno, setAnno]     = useState(String(new Date().getFullYear()));
  const [mese, setMese]     = useState('');
  const [giorno, setGiorno] = useState('');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  usePageTitle('Statistiche');

  const load = async (a = anno, m = mese, g = giorno) => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/statistics', {
        params: { anno: a, mese: m || undefined, giorno: g || undefined },
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Reset giorno se si cambia mese
  const handleMeseChange = (val) => {
    setMese(val);
    setGiorno('');
  };

  const giorni = mese ? getDaysInMonth(anno, mese) : 0;
  const kpi     = data?.kpi    || {};
  const mensile = data?.mensile || [];
  const trend   = data?.trend   || [];

  const title = trendTitle(anno, mese, giorno);

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mo-page-title">Statistiche</h1>
      </div>

      {/* Filtri */}
      <div className="mo-card mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <label className="mo-form-label mb-0">Anno</label>
            <select className="mo-form-control" style={{ width: 'auto' }}
              value={anno} onChange={e => { setAnno(e.target.value); setGiorno(''); }}>
              {ANNI.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="mo-form-label mb-0">Mese</label>
            <select className="mo-form-control" style={{ width: 'auto', minWidth: 130 }}
              value={mese} onChange={e => handleMeseChange(e.target.value)}>
              {MESI.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {mese && (
            <div className="d-flex align-items-center gap-2">
              <label className="mo-form-label mb-0">Giorno</label>
              <select className="mo-form-control" style={{ width: 'auto', minWidth: 80 }}
                value={giorno} onChange={e => setGiorno(e.target.value)}>
                <option value="">— Tutti —</option>
                {Array.from({ length: giorni }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
          <button className="mo-btn mo-btn-primary" onClick={() => load(anno, mese, giorno)} disabled={loading}>
            <i className="bi bi-search me-1" />{loading ? 'Caricamento...' : 'Filtra'}
          </button>
          {(mese || giorno) && (
            <button className="mo-btn mo-btn-ghost" onClick={() => { setMese(''); setGiorno(''); load(anno, '', ''); }}>
              <i className="bi bi-x-lg me-1" />Azzera
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="row row-cols-2 row-cols-md-4 row-cols-xl-8 g-3 mb-4">
        <KpiCard label="Totale ordini"  value={kpi.totale_ordini} color="#3b82f6" icon="bi-list-ol" />
        <KpiCard label="Confermati"     value={kpi.confermati}    color="#10b981" icon="bi-check-circle" />
        <KpiCard label="Fatturati"      value={kpi.fatturati}     color="#06b6d4" icon="bi-receipt" />
        <KpiCard label="Annullati"      value={kpi.annullati}     color="#ef4444" icon="bi-x-circle" />
        <KpiCard label="In attesa"      value={kpi.in_attesa}     color="#f59e0b" icon="bi-hourglass-split" />
        <KpiCard label="Venduto"        value={kpi.venduto}       color="#10b981" icon="bi-graph-up-arrow" euro />
        <KpiCard label="Costo"          value={kpi.costo}         color="#ef4444" icon="bi-graph-down-arrow" euro />
        <KpiCard label="Margine"        value={kpi.margine}       color="#2E3192" icon="bi-percent" euro />
      </div>

      {/* Grafici di andamento affiancati */}
      {trend.length > 0 && (
        <div className="row g-3 mb-4">
          {/* Grafico N° Ordini */}
          <div className="col-md-6">
            <div className="mo-card h-100">
              <div className="mb-3 d-flex align-items-center justify-content-between">
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  <i className="bi bi-list-ol me-2" style={{ color: '#2E3192' }} />
                  N° Ordini confermati
                </div>
                <span className="mo-text-muted" style={{ fontSize: '0.75rem' }}>{title}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    interval={trend.length > 15 ? Math.floor(trend.length / 10) : 0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<TrendTooltipOrdini />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="ordini" stroke="#2E3192" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#2E3192', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#2E3192', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafico Venduto */}
          <div className="col-md-6">
            <div className="mo-card h-100">
              <div className="mb-3 d-flex align-items-center justify-content-between">
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  <i className="bi bi-graph-up-arrow me-2" style={{ color: '#10b981' }} />
                  Venduto totale (€)
                </div>
                <span className="mo-text-muted" style={{ fontSize: '0.75rem' }}>{title}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    interval={trend.length > 15 ? Math.floor(trend.length / 10) : 0} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip content={<TrendTooltipVenduto />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="venduto" stroke="#10b981" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Grafico mensile economico (solo vista anno intero) */}
      {mensile.length > 0 && (
        <div className="mo-card mb-4">
          <div className="mb-3" style={{ fontWeight: 700, fontSize: '1rem' }}>
            <i className="bi bi-bar-chart me-2" style={{ color: 'var(--mo-purple)' }} />
            Andamento economico mensile {anno}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mensile} barGap={2} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`}
                tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={55}
              />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.6rem 1rem', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                    {payload.map(p => (
                      <div key={p.dataKey} style={{ color: p.color }}>
                        {p.name}: <strong>€ {fmt(p.value)}</strong>
                      </div>
                    ))}
                  </div>
                );
              }} />
              <Bar dataKey="venduto" name="Venduto"  fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costo"   name="Costo"    fill="#f87171" radius={[4, 4, 0, 0]} />
              <Bar dataKey="margine" name="Margine"  fill="#6366a0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top 10 */}
      <div className="row g-4">
        <div className="col-md-6">
          <TopTable
            title="Top 10 Clienti per Fatturato"
            icon="bi-building" color="#10b981"
            rows={data?.top_clienti || []}
            valueKey="venduto" valueLabel="Venduto"
          />
        </div>
        <div className="col-md-6">
          <TopTable
            title="Top 10 Trasportatori per Costo"
            icon="bi-truck" color="#f59e0b"
            rows={data?.top_carrier || []}
            valueKey="costo" valueLabel="Costo"
          />
        </div>
      </div>
    </Layout>
  );
}
