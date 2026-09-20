import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import usePageTitle from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STATUS_LABELS = {
  in_attesa: 'In Attesa', confermato: 'Confermato',
  annullato: 'Annullato', chiuso: 'Chiuso', fatturato: 'Fatturato',
};

const STATUS_TRANSITIONS = {
  in_attesa:  ['confermato', 'annullato'],
  confermato: ['annullato', 'chiuso'],
  chiuso:     ['fatturato'],
  fatturato:  [],
  annullato:  [],
};

const STATUS_BADGE = {
  in_attesa: 'mo-badge-bozza', confermato: 'mo-badge-confermato',
  annullato: 'mo-badge-annullato', chiuso: 'mo-badge-consegnato', fatturato: 'mo-badge-in_transito',
};

function Row({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="col-md-4 col-6 mb-3">
      <div className="mo-text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 500, fontFamily: mono ? 'monospace' : undefined }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mo-card mb-3">
      <div className="mb-3" style={{ fontWeight: 600, borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>{title}</div>
      <div className="row">{children}</div>
    </div>
  );
}

function StopBadge({ stop, idx }) {
  const isCarico = stop.tipo === 'carico';
  return (
    <div className="mb-2 p-2" style={{
      borderRadius: 8, fontSize: '0.85rem',
      background: isCarico ? '#f0fdf4' : '#fff7ed',
      border: `1px solid ${isCarico ? '#bbf7d0' : '#fed7aa'}`,
    }}>
      <span className={`mo-badge ${isCarico ? 'mo-badge-consegnato' : 'mo-badge-in_lavorazione'} mb-1`}>
        {isCarico ? 'Carico' : 'Scarico'} {idx + 1}
      </span>
      {stop.ragione_sociale && <div style={{ fontWeight: 600 }}>{stop.ragione_sociale}</div>}
      {stop.indirizzo && <div>{stop.indirizzo}</div>}
      {(stop.citta || stop.provincia) && (
        <div className="mo-text-muted">{stop.citta}{stop.provincia ? ` (${stop.provincia})` : ''}</div>
      )}
      {stop.data && (
        <div className="mt-1 mo-text-muted" style={{ fontSize: '0.8rem' }}>
          <i className="bi bi-calendar3 me-1" />
          {new Date(stop.data).toLocaleDateString('it-IT')}
          {stop.ora_da && <> &nbsp;{stop.ora_da}</>}
          {stop.ora_a && <> – {stop.ora_a}</>}
        </div>
      )}
      {stop.note && <div className="mo-text-muted mt-1" style={{ fontSize: '0.8rem' }}>{stop.note}</div>}
    </div>
  );
}

export default function WorkOrderViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/work-orders/${id}`).then(({ data }) => {
      setOrder(data);
      setLoading(false);
    }).catch(() => navigate('/work-orders'));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'confermato') {
      if (!order.carrier_contacts?.length) {
        alert('Seleziona almeno un referente del trasportatore modificando l\'ordine.');
        return;
      }
      if (!order.data_carico || !order.data_scarico) {
        alert('Inserisci la data di carico e la data di scarico prima di confermare l\'ordine.\nModifica l\'ordine per aggiungere le date.');
        return;
      }
    }
    if (newStatus === 'confermato') {
      const prezzoCliente = parseFloat(order.prezzo_cliente || 0);
      const costoTrasportatore = parseFloat(order.costo_trasportatore || 0);
      if (prezzoCliente === 0 && costoTrasportatore === 0) {
        alert('Prezzo cliente e costo trasportatore sono entrambi a zero.\nModifica l\'ordine e inserisci i valori prima di confermare.');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        status:                   newStatus,
        data_ordine:              order.data_ordine,
        cliente_id:               order.cliente_id,
        carrier_id:               order.carrier_id,
        carrier_contact_ids:      (order.carrier_contacts || []).map(c => c.id),
        // Non reinviare le tappe: sono già nel DB e non devono essere sovrascritte
        prezzo_cliente:           order.prezzo_cliente,
        supplemento_cliente:      order.supplemento_cliente,
        costo_trasportatore:      order.costo_trasportatore,
        supplemento_trasportatore: order.supplemento_trasportatore,
        data_carico:              order.data_carico,
        data_scarico:             order.data_scarico,
        ora_carico:               order.ora_carico,
        ora_scarico:              order.ora_scarico,
        vehicle_type_id:          order.vehicle_type_id,
        n_bancali:                order.n_bancali,
        tipologia_merce:          order.tipologia_merce,
        peso:                     order.peso,
        metri_lineari:            order.metri_lineari,
        km_totali:                order.km_totali,
        rif_ddt:                  order.rif_ddt,
        annotazioni:              order.annotazioni,
        nome_autista:             order.nome_autista,
        targa_motrice:            order.targa_motrice,
        targa_rimorchio:          order.targa_rimorchio,
        numero_documento:         order.numero_documento,
      };
      const { data } = await api.put(`/work-orders/${id}`, payload);
      setOrder(data);
    } catch (err) {
      alert('Errore nel cambio stato: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    const { data } = await api.get(`/work-orders/${id}`);
    const { stops: rawStops, carrier_contacts: cc, documents, numero_ordine, numero_tmp, status, ...rest } = data;
    const DATE_FIELDS = ['data_ordine', 'data_carico', 'data_scarico'];
    DATE_FIELDS.forEach(f => { if (rest[f]) rest[f] = rest[f].slice(0, 10); });
    const cloneForm = {
      ...rest,
      data_ordine: new Date().toISOString().slice(0, 10),
      carrier_contact_ids: cc?.map(c => c.id) || [],
    };
    const cloneStops = (rawStops || []).map(({ id: _id, work_order_id, created_at, updated_at, ...s }) => ({
      ...s,
      data: s.data ? s.data.slice(0, 10) : '',
      _tmpId: Math.random().toString(36).slice(2),
    }));
    navigate('/work-orders/new', { state: { clone: { form: cloneForm, stops: cloneStops } } });
  };

  const handleResendEmail = async () => {
    if (!confirm('Reinviare la mail di conferma ordine?')) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/work-orders/${id}/resend-email`);
      alert(data.message);
    } catch (err) {
      alert('Errore nel reinvio: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await api.get(`/work-orders/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordine-${order.numero_ordine || order.numero_tmp}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Errore nella generazione del PDF.');
    }
  };

  usePageTitle('Ordini', order?.numero_ordine || order?.numero_tmp);

  if (loading) return <Layout><div className="mo-text-muted p-4">Caricamento...</div></Layout>;

  const canEdit = user?.role === 'admin' || user?.role === 'operatore';
  const carichi  = (order.stops || []).filter(s => s.tipo === 'carico');
  const scarichi = (order.stops || []).filter(s => s.tipo === 'scarico');
  const totaleCliente = (parseFloat(order.prezzo_cliente) || 0) + (parseFloat(order.supplemento_cliente) || 0);
  const totaleTrasportatore = (parseFloat(order.costo_trasportatore) || 0) + (parseFloat(order.supplemento_trasportatore) || 0);
  const margine = totaleCliente - totaleTrasportatore;

  return (
    <Layout>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <div>
            <h1 className="mo-page-title mb-1">
              {order.numero_ordine || order.numero_tmp}
            </h1>
            <span className={`mo-badge ${STATUS_BADGE[order.status] || 'mo-badge-bozza'}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="mo-btn mo-btn-ghost" onClick={() => navigate('/work-orders')}>
            <i className="bi bi-arrow-left" /> Lista ordini
          </button>
          {canEdit && (
            <button className="mo-btn mo-btn-outline" onClick={handleDownloadPdf}>
              <i className="bi bi-file-earmark-pdf me-1" /> Scarica PDF
            </button>
          )}
          {canEdit && order.status === 'confermato' && (
            <button className="mo-btn mo-btn-outline" disabled={saving} onClick={handleResendEmail}>
              <i className="bi bi-envelope-arrow-up me-1" /> Reinvia mail
            </button>
          )}
          {canEdit && STATUS_TRANSITIONS[order.status]?.map(s => (
            <button key={s} className="mo-btn mo-btn-outline" disabled={saving}
              onClick={() => handleStatusChange(s)}>
              {s === 'confermato'
                ? <><i className="bi bi-send me-1" />Conferma e invia ordine</>
                : <>→ {STATUS_LABELS[s]}</>}
            </button>
          ))}
          <button className="mo-btn mo-btn-ghost" onClick={handleClone} title="Clona ordine">
            <i className="bi bi-copy me-1" /> Clona
          </button>
          {canEdit && (
            <button className="mo-btn mo-btn-primary" onClick={() => navigate(`/work-orders/${id}/edit`)}>
              <i className="bi bi-pencil me-1" /> Modifica
            </button>
          )}
        </div>
      </div>

      {/* Intestazione */}
      <Section title="Intestazione ordine">
        <Row label="Data ordine" value={order.data_ordine ? new Date(order.data_ordine).toLocaleDateString('it-IT') : null} />
        <Row label="Cliente" value={order.cliente?.ragione_sociale} />
        <Row label="Trasportatore" value={order.carrier?.denominazione} />
      </Section>

      {/* Invio */}
      {order.inviato && (
        <div className="mo-card mb-3 p-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div className="mb-2" style={{ fontWeight: 600, color: '#065f46', fontSize: '0.9rem' }}>
            <i className="bi bi-send-check me-2" />Ordine inviato
          </div>
          <div className="row">
            <div className="col-md-4 col-6 mb-2">
              <div className="mo-text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Inviato il</div>
              <div style={{ fontWeight: 500 }}>
                {order.inviato_il ? new Date(order.inviato_il).toLocaleString('it-IT') : '—'}
              </div>
            </div>
            <div className="col-md-4 col-6 mb-2">
              <div className="mo-text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Mittente</div>
              <div style={{ fontWeight: 500 }}>{order.inviato_da || '—'}</div>
            </div>
            <div className="col-md-4 col-12 mb-2">
              <div className="mo-text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Inviato a</div>
              <div style={{ fontWeight: 500 }}>{order.inviato_a || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tappe */}
      <div className="mo-card mb-3">
        <div className="mb-3" style={{ fontWeight: 600, borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
          Tappe di carico e scarico
        </div>
        <div className="row g-3">
          <div className="col-md-6">
            <div style={{ fontWeight: 600, color: '#065f46', fontSize: '0.85rem', marginBottom: 8 }}>
              <i className="bi bi-box-arrow-in-down me-1" />Carichi
            </div>
            {carichi.length === 0
              ? <div className="mo-text-muted" style={{ fontSize: '0.85rem' }}>Nessuno</div>
              : carichi.map((s, i) => <StopBadge key={s.id} stop={s} idx={i} />)}
            {(order.data_carico || order.ora_carico) && (
              <div className="d-flex gap-3 mt-2" style={{ fontSize: '0.85rem' }}>
                {order.data_carico && (
                  <div>
                    <div className="mo-text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Data carico</div>
                    <div style={{ fontWeight: 600 }}>{new Date(order.data_carico).toLocaleDateString('it-IT')}</div>
                  </div>
                )}
                {order.ora_carico && (
                  <div>
                    <div className="mo-text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Fascia oraria</div>
                    <div style={{ fontWeight: 600 }}>{order.ora_carico}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="col-md-6">
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: '0.85rem', marginBottom: 8 }}>
              <i className="bi bi-box-arrow-up me-1" />Scarichi
            </div>
            {scarichi.length === 0
              ? <div className="mo-text-muted" style={{ fontSize: '0.85rem' }}>Nessuno</div>
              : scarichi.map((s, i) => <StopBadge key={s.id} stop={s} idx={i} />)}
            {(order.data_scarico || order.ora_scarico) && (
              <div className="d-flex gap-3 mt-2" style={{ fontSize: '0.85rem' }}>
                {order.data_scarico && (
                  <div>
                    <div className="mo-text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Data scarico</div>
                    <div style={{ fontWeight: 600 }}>{new Date(order.data_scarico).toLocaleDateString('it-IT')}</div>
                  </div>
                )}
                {order.ora_scarico && (
                  <div>
                    <div className="mo-text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Fascia oraria</div>
                    <div style={{ fontWeight: 600 }}>{order.ora_scarico}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Economico */}
      <div className="mo-card mb-3">
        <div className="mb-3" style={{ fontWeight: 600, borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>Prezzi e costi</div>
        <div className="row">
          <div className="col-md-4 mb-3">
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.75rem', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#065f46', textTransform: 'uppercase', marginBottom: 4 }}>Prezzo cliente</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#065f46' }}>€ {totaleCliente.toFixed(2)}</div>
              {parseFloat(order.supplemento_cliente) > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  base {parseFloat(order.prezzo_cliente).toFixed(2)} + suppl. {parseFloat(order.supplemento_cliente).toFixed(2)}
                </div>
              )}
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div style={{ background: '#fff7ed', borderRadius: 10, padding: '0.75rem', border: '1px solid #fed7aa' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', marginBottom: 4 }}>Costo trasportatore</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#92400e' }}>€ {totaleTrasportatore.toFixed(2)}</div>
              {parseFloat(order.supplemento_trasportatore) > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  base {parseFloat(order.costo_trasportatore).toFixed(2)} + suppl. {parseFloat(order.supplemento_trasportatore).toFixed(2)}
                </div>
              )}
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div style={{ background: '#f0ebfa', borderRadius: 10, padding: '0.75rem', border: '1px solid #c4b5fd' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--mo-purple)', textTransform: 'uppercase', marginBottom: 4 }}>Margine</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: margine >= 0 ? '#065f46' : '#991b1b' }}>
                € {margine.toFixed(2)}
              </div>
              {totaleCliente > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  {((margine / totaleCliente) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dettagli trasporto */}
      <Section title="Dettagli trasporto">
        <Row label="Tipo mezzo" value={order.vehicle_type?.nome} />
        <Row label="N° bancali" value={order.n_bancali} />
        <Row label="Peso" value={order.peso} />
        <Row label="Metri lineari" value={order.metri_lineari} />
        <Row label="Km totali" value={order.km_totali ? `${parseFloat(order.km_totali).toFixed(0)} km` : null} />
        <Row label="Tipologia merce" value={order.tipologia_merce} />
        <Row label="Numero documento" value={order.numero_documento} mono />
        {order.rif_ddt && (
          <div className="col-12 mb-3">
            <div className="mo-text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 2 }}>Rif. DDT</div>
            <div style={{ whiteSpace: 'pre-line' }}>{order.rif_ddt}</div>
          </div>
        )}
        {order.annotazioni && (
          <div className="col-12 mb-3">
            <div className="mo-text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 2 }}>Annotazioni</div>
            <div style={{ whiteSpace: 'pre-line' }}>{order.annotazioni}</div>
          </div>
        )}
      </Section>

      {/* Referenti trasportatore */}
      {order.carrier_contacts?.length > 0 && (
        <div className="mo-card mb-3">
          <div className="mb-3" style={{ fontWeight: 600, borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            Referenti trasportatore
          </div>
          <div className="d-flex flex-wrap gap-2">
            {order.carrier_contacts.map(c => (
              <div key={c.id} style={{
                background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 8,
                padding: '0.5rem 0.85rem', fontSize: '0.85rem',
              }}>
                <div style={{ fontWeight: 600 }}>{c.nome} {c.cognome}</div>
                {c.ruolo && <div className="mo-text-muted" style={{ fontSize: '0.78rem' }}>{c.ruolo}</div>}
                {c.email && <div className="mo-text-muted" style={{ fontSize: '0.78rem' }}><i className="bi bi-envelope me-1" />{c.email}</div>}
                {c.telefono && <div className="mo-text-muted" style={{ fontSize: '0.78rem' }}><i className="bi bi-telephone me-1" />{c.telefono}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dati fornitore */}
      {(order.nome_autista || order.targa_motrice || order.targa_rimorchio) && (
        <Section title="Dati fornitore / mezzo">
          <Row label="Nome autista" value={order.nome_autista} />
          <Row label="Targa motrice" value={order.targa_motrice} mono />
          <Row label="Targa rimorchio" value={order.targa_rimorchio} mono />
        </Section>
      )}
    </Layout>
  );
}
