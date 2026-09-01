import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import usePageTitle from '../hooks/usePageTitle';
import api from '../api/axios';

function fmt(n) {
  return n != null ? new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(n) : '—';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function BillingPage() {
  usePageTitle('Fatturazione');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filtri
  const [clienteId] = useState(searchParams.get('cliente_id') || '');
  const [clienteNome, setClienteNome] = useState(searchParams.get('cliente_nome') || '');
  const [dataDa, setDataDa] = useState(firstOfMonthISO());
  const [dataA, setDataA] = useState(todayISO());

  // Dati
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  // Selezione
  const [selected, setSelected] = useState(new Set());

  // Invio fatturazione
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);

  const fetchOrders = useCallback(async (p = 1) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const { data } = await api.get('/work-orders', {
        params: {
          status: 'confermato',
          cliente_id: clienteId || undefined,
          data_da: dataDa || undefined,
          data_a: dataA || undefined,
          with_stops: 1,
          page: p,
          per_page: 50,
        },
      });
      setOrders(data.data);
      setMeta(data);
    } finally {
      setLoading(false);
    }
  }, [clienteId, dataDa, dataA]);

  useEffect(() => { fetchOrders(1); }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1);
  };

  // --- Selezione ---
  const allIds = orders.map(o => o.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedOrders = orders.filter(o => selected.has(o.id));
  const totaleSelezionato = selectedOrders.reduce((acc, o) => {
    return acc + (parseFloat(o.totale_cliente) || 0);
  }, 0);

  const handleInviaFatturazione = () => {
    if (selected.size === 0) return;
    setResults(null);
    setShowModal(true);
  };

  const handleConfermaInvio = async () => {
    setSending(true);
    try {
      const { data } = await api.post('/billing/send', {
        order_ids: Array.from(selected),
      });
      setResults(data);
      setSelected(new Set());
      // Ricarica la lista (gli ordini fatturati non appariranno più)
      fetchOrders(1);
    } catch (err) {
      setResults({
        error: err.response?.data?.message || 'Errore durante l\'invio a Fatture in Cloud.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <ConfirmModal
      show={showModal}
      onClose={() => !sending && setShowModal(false)}
      onConfirm={handleConfermaInvio}
      sending={sending}
      selectedOrders={selectedOrders}
      totale={totaleSelezionato}
    />
    <Layout>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <button className="mo-btn mo-btn-ghost" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left" />
          </button>
          <div>
            <h1 className="mo-page-title mb-0">Ordini da fatturare</h1>
            {clienteNome && (
              <span className="mo-text-muted" style={{ fontSize: '0.82rem' }}>
                {clienteNome}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="mo-card mb-3">
        <form onSubmit={handleFilter} className="d-flex gap-2 flex-wrap align-items-end">
          <div>
            <label className="mo-form-label mb-1">Da</label>
            <input
              type="date"
              className="mo-form-control"
              value={dataDa}
              onChange={e => setDataDa(e.target.value)}
              style={{ width: 160 }}
            />
          </div>
          <div>
            <label className="mo-form-label mb-1">A</label>
            <input
              type="date"
              className="mo-form-control"
              value={dataA}
              onChange={e => setDataA(e.target.value)}
              style={{ width: 160 }}
            />
          </div>
          <button type="submit" className="mo-btn mo-btn-primary">
            <i className="bi bi-funnel me-1" /> Filtra
          </button>
          <button
            type="button"
            className="mo-btn mo-btn-ghost"
            onClick={() => { setDataDa(firstOfMonthISO()); setDataA(todayISO()); }}
          >
            Mese corrente
          </button>
        </form>
      </div>

      {/* Tabella */}
      <div className="mo-card">
        {loading ? (
          <div className="text-center py-4 mo-text-muted">Caricamento...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-4 mo-text-muted">
            Nessun ordine confermato nel periodo selezionato.
          </div>
        ) : (
          <div className="mo-table-wrap">
            <table className="mo-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      title="Seleziona tutti"
                    />
                  </th>
                  <th>N° Ordine</th>
                  <th>Data carico</th>
                  {!clienteId && <th>Cliente</th>}
                  <th>Rif. DDT</th>
                  <th>Trasportatore</th>
                  <th>Tratta</th>
                  <th style={{ textAlign: 'right' }}>Prezzo</th>
                  <th style={{ textAlign: 'right' }}>Suppl.</th>
                  <th style={{ textAlign: 'right' }}>Totale</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const isChecked = selected.has(o.id);
                  return (
                    <tr
                      key={o.id}
                      style={{ background: isChecked ? 'var(--mo-purple-light, #f5f3ff)' : undefined }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(o.id)}
                        />
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--mo-purple)' }}>
                          {o.numero_ordine || o.numero_tmp}
                        </span>
                      </td>
                      <td>
                        {o.data_carico
                          ? new Date(o.data_carico).toLocaleDateString('it-IT')
                          : <span className="mo-text-muted">—</span>}
                      </td>
                      {!clienteId && (
                        <td>{o.cliente?.ragione_sociale || <span className="mo-text-muted">—</span>}</td>
                      )}
                      <td className="mo-text-muted" style={{ fontSize: '0.83rem' }}>
                        {o.rif_ddt || '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {o.carrier?.denominazione || <span className="mo-text-muted">—</span>}
                      </td>
                      <td style={{ fontSize: '0.83rem' }}>
                        <Tratta order={o} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {o.prezzo_cliente ? `€ ${fmt(o.prezzo_cliente)}` : <span className="mo-text-muted">—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {o.supplemento_cliente > 0
                          ? <span style={{ color: '#f59e0b' }}>€ {fmt(o.supplemento_cliente)}</span>
                          : <span className="mo-text-muted">—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {o.totale_cliente ? `€ ${fmt(o.totale_cliente)}` : <span className="mo-text-muted">—</span>}
                      </td>
                      <td>
                        <button
                          className="mo-btn mo-btn-ghost"
                          style={{ padding: '0.2rem 0.5rem' }}
                          onClick={() => navigate(`/work-orders/${o.id}`)}
                          title="Visualizza ordine"
                        >
                          <i className="bi bi-eye" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginazione */}
        {meta && meta.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3"
            style={{ borderTop: '1px solid #f3f4f6' }}>
            <span className="mo-text-muted">{meta.from}–{meta.to} di {meta.total} ordini</span>
            <div className="d-flex gap-1">
              <button className="mo-btn mo-btn-ghost" disabled={page === 1}
                onClick={() => { const p = page - 1; setPage(p); fetchOrders(p); }}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mo-btn" style={{ cursor: 'default' }}>{page} / {meta.last_page}</span>
              <button className="mo-btn mo-btn-ghost" disabled={page === meta.last_page}
                onClick={() => { const p = page + 1; setPage(p); fetchOrders(p); }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Risultati invio */}
      {results && !results.error && (
        <div className="mo-card mt-3" style={{ border: '1.5px solid #d1fae5' }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '1.2rem' }} />
            <span style={{ fontWeight: 600 }}>
              Elaborazione completata — {results.summary?.success} ordini fatturati
              {results.summary?.failed > 0 && `, ${results.summary.failed} con errori`}
            </span>
          </div>
          <div className="d-flex flex-column gap-2">
            {results.results?.map((r, i) => (
              <div key={i} className="d-flex align-items-center gap-2 p-2"
                style={{ background: r.success ? '#f0fdf4' : '#fef2f2', borderRadius: 8 }}>
                <i className={`bi ${r.success ? 'bi-check-circle text-success' : 'bi-x-circle text-danger'}`} />
                <span style={{ fontWeight: 500 }}>{r.ragione_sociale}</span>
                <span className="mo-text-muted" style={{ fontSize: '0.82rem' }}>
                  {r.ordini} {r.ordini === 1 ? 'ordine' : 'ordini'}
                </span>
                {r.success && r.fic_doc_number && (
                  <span className="mo-badge mo-badge-consegnato ms-1" style={{ fontSize: '0.75rem' }}>
                    Fattura {r.fic_doc_number}
                  </span>
                )}
                {!r.success && (
                  <span style={{ color: '#dc2626', fontSize: '0.82rem' }}>{r.error}</span>
                )}
              </div>
            ))}
          </div>
          <button className="mo-btn mo-btn-ghost mt-3" style={{ fontSize: '0.82rem' }}
            onClick={() => setResults(null)}>
            <i className="bi bi-x me-1" /> Chiudi
          </button>
        </div>
      )}

      {results?.error && (
        <div className="mo-card mt-3" style={{ border: '1.5px solid #fecaca' }}>
          <i className="bi bi-exclamation-triangle-fill text-danger me-2" />
          <span style={{ color: '#dc2626' }}>{results.error}</span>
          <button className="mo-btn mo-btn-ghost ms-3" style={{ fontSize: '0.82rem' }}
            onClick={() => setResults(null)}>Chiudi</button>
        </div>
      )}

      {/* Barra azione selezione */}
      {selected.size > 0 && (
        <div
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: '#1e1b4b', color: '#fff', borderRadius: 12,
            padding: '0.85rem 1.5rem',
            display: 'flex', alignItems: 'center', gap: '1.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 100,
            minWidth: 420,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selected.size}</span>
            <span style={{ opacity: 0.75, fontSize: '0.88rem' }}>
              {selected.size === 1 ? 'ordine selezionato' : 'ordini selezionati'}
            </span>
          </div>
          <div style={{ height: 24, width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div>
            <span style={{ opacity: 0.75, fontSize: '0.82rem', marginRight: '0.4rem' }}>Totale:</span>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>€ {fmt(totaleSelezionato)}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              className="mo-btn mo-btn-ghost"
              style={{ color: '#fff', opacity: 0.7, fontSize: '0.82rem' }}
              onClick={() => setSelected(new Set())}
            >
              Deseleziona
            </button>
            <button
              className="mo-btn"
              style={{
                background: 'var(--mo-purple, #7c3aed)', color: '#fff',
                fontWeight: 600, fontSize: '0.9rem',
                border: 'none', borderRadius: 8, padding: '0.5rem 1.2rem',
              }}
              onClick={handleInviaFatturazione}
            >
              <i className="bi bi-send me-2" />
              Invia a fatturazione
            </button>
          </div>
        </div>
      )}
    </Layout>
    </>
  );
}

function ConfirmModal({ show, onClose, onConfirm, sending, selectedOrders, totale }) {
  if (!show) return null;

  // Raggruppa per cliente per il riepilogo
  const byClient = selectedOrders.reduce((acc, o) => {
    const key = o.cliente?.ragione_sociale || `Cliente #${o.cliente_id}`;
    if (!acc[key]) acc[key] = { orders: [], total: 0 };
    acc[key].orders.push(o);
    acc[key].total += parseFloat(o.totale_cliente) || 0;
    return acc;
  }, {});

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}
        onClick={!sending ? onClose : undefined}
      >
        <div
          style={{
            background: '#fff', borderRadius: 16, padding: '2rem',
            width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="d-flex align-items-center gap-2 mb-1">
            <i className="bi bi-send" style={{ color: 'var(--mo-purple)', fontSize: '1.2rem' }} />
            <h5 className="mb-0" style={{ fontWeight: 700 }}>Invia a Fatture in Cloud</h5>
          </div>
          <p className="mo-text-muted mb-4" style={{ fontSize: '0.88rem' }}>
            Verrà creata una fattura per ogni cliente. Gli ordini passeranno in stato <strong>Fatturato</strong>.
          </p>

          {/* Riepilogo per cliente */}
          <div className="d-flex flex-column gap-2 mb-4">
            {Object.entries(byClient).map(([nome, { orders, total }]) => (
              <div key={nome} className="d-flex align-items-center justify-content-between p-2"
                style={{ background: '#f9fafb', borderRadius: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{nome}</span>
                  <span className="mo-text-muted ms-2" style={{ fontSize: '0.8rem' }}>
                    {orders.length} {orders.length === 1 ? 'ordine' : 'ordini'}
                  </span>
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>€ {fmt(total)}</span>
              </div>
            ))}
          </div>

          <div className="d-flex align-items-center justify-content-between p-3 mb-4"
            style={{ background: '#1e1b4b', borderRadius: 10, color: '#fff' }}>
            <span style={{ opacity: 0.8, fontSize: '0.88rem' }}>Totale complessivo</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>€ {fmt(totale)}</span>
          </div>

          <div className="d-flex gap-2 justify-content-end">
            <button className="mo-btn mo-btn-ghost" onClick={onClose} disabled={sending}>
              Annulla
            </button>
            <button
              className="mo-btn"
              style={{
                background: 'var(--mo-purple, #7c3aed)', color: '#fff',
                fontWeight: 600, border: 'none', borderRadius: 8, padding: '0.55rem 1.4rem',
              }}
              onClick={onConfirm}
              disabled={sending}
            >
              {sending
                ? <><span className="spinner-border spinner-border-sm me-2" />Invio in corso...</>
                : <><i className="bi bi-send me-2" />Conferma e invia</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Tratta({ order }) {
  const stops = order.stops;
  if (!stops || stops.length === 0) return <span className="mo-text-muted">—</span>;
  const carico = stops.find(s => s.tipo === 'carico');
  const scarico = [...stops].reverse().find(s => s.tipo === 'scarico');
  if (!carico && !scarico) return <span className="mo-text-muted">—</span>;
  const da = carico?.provincia || carico?.citta || '?';
  const a = scarico?.provincia || scarico?.citta || '?';
  return (
    <span>
      <span className="mo-badge mo-badge-in_transito" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{da}</span>
      <i className="bi bi-arrow-right mx-1" style={{ fontSize: '0.7rem', opacity: 0.5 }} />
      <span className="mo-badge mo-badge-in_transito" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{a}</span>
    </span>
  );
}
