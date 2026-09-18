import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import OrderStops from '../components/OrderStops';
import OrderDocuments from '../components/OrderDocuments';
import SearchSelect from '../components/SearchSelect';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

const EMPTY = {
  data_ordine: new Date().toISOString().slice(0, 10),
  cliente_id: '', carrier_id: '',
  data_carico: '', ora_carico: '8-16', data_scarico: '', ora_scarico: '8-16',
  prezzo_cliente: '', supplemento_cliente: '',
  costo_trasportatore: '', supplemento_trasportatore: '',
  vehicle_type_id: '', n_bancali: '', tipologia_merce: '',
  peso: '', metri_lineari: '', km_totali: '', rif_ddt: '', annotazioni: '',
  nome_autista: '', targa_motrice: '', targa_rimorchio: '',
  annotazioni_mail: '', numero_documento: '',
  carrier_contact_ids: [],
  stops: [],
};

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

export default function WorkOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Dati di supporto
  const [clients, setClients] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [carrierContacts, setCarrierContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [routeSuggestion, setRouteSuggestion] = useState(null);
  const [suggestionAccepted, setSuggestionAccepted] = useState(false);

  // Carica dati di supporto
  useEffect(() => {
    Promise.all([
      api.get('/clients', { params: { active: 1, per_page: 999 } }),
      api.get('/carriers', { params: { active: 1, per_page: 999 } }),
      api.get('/vehicle-types'),
    ]).then(([c, car, vt]) => {
      setClients(c.data.data || c.data);
      setCarriers(car.data.data || car.data);
      setVehicleTypes(vt.data);
    });
  }, []);

  // Carica ordine in modifica
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/work-orders/${id}`).then(({ data }) => {
      const { stops: s, carrier_contacts: cc, documents: docs, ...rest } = data;
      // Normalizza date ISO → yyyy-MM-dd
      const DATE_FIELDS = ['data_ordine', 'data_carico', 'data_scarico'];
      DATE_FIELDS.forEach(f => { if (rest[f]) rest[f] = rest[f].slice(0, 10); });
      const normalizedStops = (s || []).map(stop => ({
        ...stop,
        data: stop.data ? stop.data.slice(0, 10) : '',
      }));
      setForm({ ...EMPTY, ...rest, carrier_contact_ids: cc?.map(c => c.id) || [] });
      setStops(normalizedStops);
      setDocuments(docs || []);
      if (rest.carrier_id) loadCarrierContacts(rest.carrier_id);
      setLoading(false);
    });
  }, [id]);

  // Carica referenti quando cambia il trasportatore
  const loadCarrierContacts = async (carrierId) => {
    if (!carrierId) { setCarrierContacts([]); return; }
    const { data } = await api.get(`/carriers/${carrierId}/contacts`);
    setCarrierContacts(data);
  };

  const ricalcolaSupplementi = () => {
    const nCarichi  = stops.filter(s => s.tipo === 'carico').length;
    const nScarichi = stops.filter(s => s.tipo === 'scarico').length;
    const extraTappe = Math.max(0, (nCarichi - 1) + (nScarichi - 1));

    const prezzoCl = parseFloat(form.prezzo_cliente) || 0;
    const costoTr  = parseFloat(form.costo_trasportatore) || 0;

    setForm(f => ({
      ...f,
      supplemento_cliente:       prezzoCl > 0 ? (extraTappe > 0 ? (extraTappe * prezzoCl).toFixed(2) : '') : f.supplemento_cliente,
      supplemento_trasportatore: costoTr  > 0 ? (extraTappe > 0 ? (extraTappe * costoTr).toFixed(2)  : '') : f.supplemento_trasportatore,
    }));
  };

  // Suggerimento tratta quando cambiano cliente, trasportatore e province
  const fetchSuggestion = useCallback(async (clienteId, carrierId, stopsData) => {
    if (!clienteId || !carrierId) return;

    const firstCarico = stopsData.find(s => s.tipo === 'carico');
    const lastScarico = [...stopsData].reverse().find(s => s.tipo === 'scarico');

    if (!firstCarico?.provincia || !lastScarico?.provincia) return;

    try {
      const { data } = await api.get('/work-orders/prepare', {
        params: {
          cliente_id: clienteId,
          carrier_id: carrierId,
          provincia_da: firstCarico.provincia,
          provincia_a: lastScarico.provincia,
        },
      });
      if (data.route_suggestion) {
        setRouteSuggestion(data.route_suggestion);
        setSuggestionAccepted(false);
      } else {
        setRouteSuggestion(null);
      }
    } catch {}
  }, [form.cliente_id, clients]);

  // Applica suggerimento tratta — sovrascrive solo i campi presenti nel suggerimento
  const acceptSuggestion = () => {
    if (!routeSuggestion) return;
    setForm(f => ({
      ...f,
      ...(routeSuggestion.prezzo_cliente != null      && { prezzo_cliente:      routeSuggestion.prezzo_cliente }),
      ...(routeSuggestion.costo_trasportatore != null && { costo_trasportatore: routeSuggestion.costo_trasportatore }),
      ...(routeSuggestion.km_totali != null           && { km_totali:           routeSuggestion.km_totali }),
    }));
    setSuggestionAccepted(true);
    setRouteSuggestion(null);
  };

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    applyField(field, val);
  };

  const applyField = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));

    if (field === 'carrier_id') {
      loadCarrierContacts(val);
      setForm(f => ({ ...f, carrier_contact_ids: [] }));
    }

    if (field === 'cliente_id' || field === 'carrier_id') {
      fetchSuggestion(
        field === 'cliente_id' ? val : form.cliente_id,
        field === 'carrier_id' ? val : form.carrier_id,
        stops
      );
    }
  };

  const toggleContact = (contactId) => {
    setForm(f => {
      const ids = f.carrier_contact_ids.includes(contactId)
        ? f.carrier_contact_ids.filter(i => i !== contactId)
        : [...f.carrier_contact_ids, contactId];
      return { ...f, carrier_contact_ids: ids };
    });
  };

  const handleStopsChange = (newStops) => {
    setStops(newStops);
    // Aggiorna km_totali dalla somma dei km_da_precedente delle tappe
    const kmTot = newStops.reduce((sum, s) => sum + (parseFloat(s.km_da_precedente) || 0), 0);
    if (kmTot > 0) setForm(f => ({ ...f, km_totali: kmTot.toFixed(2) }));
    fetchSuggestion(form.cliente_id, form.carrier_id, newStops);
  };

  const validateStops = () => {
    const missing = stops.filter(s => s.indirizzo && !s.provincia);
    if (missing.length === 0) return true;
    const labels = missing.map((s, i) => `${s.tipo === 'carico' ? 'Carico' : 'Scarico'}: "${s.indirizzo}"`).join('\n');
    alert(`Provincia mancante per le seguenti tappe:\n${labels}\n\nSeleziona l'indirizzo dal menu a tendina per ottenere la provincia automaticamente.`);
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStops()) return;
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form, stops };
      if (isEdit) {
        await api.put(`/work-orders/${id}`, payload);
      } else {
        await api.post('/work-orders', payload);
      }
      navigate('/work-orders');
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      window.scrollTo(0, 0);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'confermato') {
      if (form.carrier_contact_ids.length === 0) {
        if (carrierContacts.length === 0) {
          alert('Il trasportatore selezionato non ha referenti configurati.\nAggiungi almeno un referente nella scheda del trasportatore prima di confermare l\'ordine.');
        } else {
          alert('Seleziona almeno un referente del trasportatore a cui inviare la conferma d\'ordine.');
        }
        document.getElementById('carrier-contacts-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (!form.data_carico || !form.data_scarico) {
        alert('Inserisci la data di carico e la data di scarico prima di confermare l\'ordine.');
        return;
      }
    }
    if (!validateStops()) return;
    if (!confirm(`Portare l'ordine in stato "${STATUS_LABELS[newStatus]}"?`)) return;
    setSaving(true);
    try {
      await api.put(`/work-orders/${id}`, { ...form, stops, status: newStatus });
      navigate('/work-orders');
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
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
      a.download = `ordine-${form.numero_ordine || form.numero_tmp}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Errore nella generazione del PDF.');
    }
  };

  // Totali calcolati in tempo reale (rispecchiano la colonna virtual del DB)
  usePageTitle('Ordini', isEdit ? (form.numero_ordine || form.numero_tmp || 'Modifica') : 'Nuovo ordine');

  const totaleCliente = (parseFloat(form.prezzo_cliente) || 0) + (parseFloat(form.supplemento_cliente) || 0);
  const totaleTrasportatore = (parseFloat(form.costo_trasportatore) || 0) + (parseFloat(form.supplemento_trasportatore) || 0);
  const margine = totaleCliente - totaleTrasportatore;

  if (loading) return <Layout><div className="mo-text-muted p-4">Caricamento...</div></Layout>;

  return (
    <Layout>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="mo-page-title mb-1">
            {isEdit ? 'Modifica ordine' : 'Nuovo ordine'}
          </h1>
          {isEdit && (
            <span className={`mo-badge mo-badge-${form.status}`}>
              {STATUS_LABELS[form.status]}
            </span>
          )}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="mo-btn mo-btn-ghost" onClick={() => navigate('/work-orders')}>
            <i className="bi bi-arrow-left" /> Lista ordini
          </button>
          {isEdit && (
            <button className="mo-btn mo-btn-outline" onClick={handleDownloadPdf}>
              <i className="bi bi-file-earmark-pdf me-1" /> Scarica PDF
            </button>
          )}
          {/* Pulsanti cambio stato in edit */}
          {isEdit && STATUS_TRANSITIONS[form.status]?.map(s => (
            <button key={s} className="mo-btn mo-btn-outline" disabled={saving}
              onClick={() => handleStatusChange(s)}>
              {s === 'confermato' ? <><i className="bi bi-send me-1" />Conferma e invia ordine</> : <>→ {STATUS_LABELS[s]}</>}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* SEZIONE 1 — Intestazione */}
        <div className="mo-card mb-3">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span style={{ fontWeight: 600 }}>Intestazione ordine</span>
            {isEdit && (form.numero_ordine || form.numero_tmp) && (
              <div className="d-flex align-items-center gap-2">
                <span className="mo-text-muted" style={{ fontSize: '0.8rem' }}>N° Ordine</span>
                <span style={{
                  fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem',
                  background: '#e8e9f5', color: 'var(--mo-purple)',
                  padding: '0.25rem 0.75rem', borderRadius: '8px',
                  border: '1.5px solid #c4b5fd', letterSpacing: '0.05em',
                }}>
                  {form.numero_ordine || form.numero_tmp}
                </span>
              </div>
            )}
          </div>
          <div className="row g-3">
            <div className="col-md-3">
              <Field label="Data ordine *" error={errors.data_ordine}>
                <input className="mo-form-control" type="date" value={form.data_ordine} onChange={set('data_ordine')} required />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Cliente *" error={errors.cliente_id}>
                <SearchSelect
                  options={clients.map(c => ({ value: c.id, label: c.ragione_sociale }))}
                  value={form.cliente_id}
                  onChange={val => applyField('cliente_id', val)}
                  placeholder="Cerca cliente..."
                />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Trasportatore *" error={errors.carrier_id}>
                <SearchSelect
                  options={carriers.map(c => ({ value: c.id, label: c.denominazione }))}
                  value={form.carrier_id}
                  onChange={val => applyField('carrier_id', val)}
                  placeholder="Cerca trasportatore..."
                />
              </Field>
            </div>
          </div>

          {/* Referenti trasportatore */}
          {form.carrier_id && (
            <div className="mt-3" id="carrier-contacts-section">
              <div className="d-flex align-items-center gap-2 mb-1">
                <label className="mo-form-label mb-0">
                  <i className="bi bi-send me-1" />
                  Referenti a cui inviare l'ordine
                  <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>
                </label>
                {form.carrier_contact_ids.length === 0 && carrierContacts.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                    <i className="bi bi-exclamation-triangle me-1" />Obbligatorio per la conferma
                  </span>
                )}
              </div>

              {carrierContacts.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: '#9ca3af', padding: '0.5rem 0' }}>
                  <i className="bi bi-info-circle me-1" />
                  Nessun referente configurato per questo trasportatore.{' '}
                  {form.carrier_id && (
                    <a href={`/carriers/${form.carrier_id}/edit`} target="_blank" rel="noreferrer"
                      style={{ color: 'var(--mo-purple)' }}>
                      Aggiungi referenti →
                    </a>
                  )}
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {carrierContacts.map(c => {
                    const selected = form.carrier_contact_ids.includes(c.id);
                    return (
                      <button key={c.id} type="button"
                        onClick={() => toggleContact(c.id)}
                        className="mo-btn"
                        style={{
                          fontSize: '0.82rem', padding: '0.35rem 0.85rem',
                          background: selected ? 'var(--mo-purple)' : '#f3f4f6',
                          color: selected ? '#fff' : 'var(--mo-text)',
                          border: selected ? '1.5px solid var(--mo-purple)' : '1.5px solid #e5e7eb',
                        }}>
                        <i className={`bi ${selected ? 'bi-check-circle' : 'bi-person'} me-1`} />
                        {c.cognome} {c.nome}
                        {c.ruolo && <span style={{ opacity: 0.7, fontSize: '0.75rem' }}> ({c.ruolo})</span>}
                        {c.email && <span style={{ opacity: 0.6, fontSize: '0.72rem', marginLeft: 4 }}>{c.email}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SEZIONE 2 — Tappe carico/scarico */}
        <div className="mo-card mb-3">
          <div className="mb-3" style={{ fontWeight: 600 }}>
            Tappe di carico e scarico
            <span className="mo-text-muted ms-2" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
              La prima provincia di carico e l'ultima di scarico definiscono la tratta
            </span>
          </div>
          <OrderStops stops={stops} onChange={handleStopsChange} />

          <hr className="mo-divider" />

          {/* Date carico/scarico sull'ordine */}
          <div className="row g-3 mt-1">
            <div className="col-12">
              <label className="mo-form-label">Date e orari ordine (riferimento generale)</label>
            </div>
            <div className="col-md-3">
              <Field label="Data carico" error={errors.data_carico}>
                <input className="mo-form-control" type="date" value={form.data_carico ?? ''} onChange={set('data_carico')} />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Fascia oraria carico" error={errors.ora_carico}>
                <input className="mo-form-control" type="text" value={form.ora_carico ?? ''} onChange={set('ora_carico')} placeholder="es. 8-16" />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Data scarico" error={errors.data_scarico}>
                <input className="mo-form-control" type="date" value={form.data_scarico ?? ''} onChange={set('data_scarico')} />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Fascia oraria scarico" error={errors.ora_scarico}>
                <input className="mo-form-control" type="text" value={form.ora_scarico ?? ''} onChange={set('ora_scarico')} placeholder="es. 8-16" />
              </Field>
            </div>
          </div>
        </div>

        {/* Suggerimento tratta */}
        {routeSuggestion && !suggestionAccepted && (
          <div className="mb-3 p-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
            style={{ background: '#ede9fe', borderRadius: '12px', border: '1.5px solid #c4b5fd' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#5b21b6', fontSize: '0.9rem' }}>
                <i className="bi bi-stars me-2" />Tratta già effettuata — suggerimento prezzi disponibile
              </div>
              <div className="mo-text-muted mt-1" style={{ fontSize: '0.82rem' }}>
                {routeSuggestion.prezzo_cliente && <>Prezzo cliente: <strong>€{routeSuggestion.prezzo_cliente}</strong> &nbsp;·&nbsp;</>}
                {routeSuggestion.costo_trasportatore && <>Costo trasportatore: <strong>€{routeSuggestion.costo_trasportatore}</strong> &nbsp;·&nbsp;</>}
                {routeSuggestion.km_totali && <>Km: <strong>{routeSuggestion.km_totali}</strong> &nbsp;·&nbsp;</>}
                Usato il: <strong>{routeSuggestion.last_used}</strong>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="mo-btn mo-btn-primary" style={{ fontSize: '0.85rem' }} onClick={acceptSuggestion}>
                <i className="bi bi-check-lg me-1" />Applica
              </button>
              <button type="button" className="mo-btn mo-btn-ghost" style={{ fontSize: '0.85rem' }} onClick={() => setRouteSuggestion(null)}>
                Ignora
              </button>
            </div>
          </div>
        )}

        {/* SEZIONE 3 — Economico */}
        <div className="mo-card mb-3">
          <div className="mb-3" style={{ fontWeight: 600 }}>Prezzi e costi</div>
          <div className="row g-3">
            {/* Cliente */}
            <div className="col-12">
              <div className="p-3" style={{ background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div className="mb-2 d-flex align-items-center justify-content-between">
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#065f46' }}>
                    <i className="bi bi-building me-1" />Prezzo cliente
                  </span>
                  <button type="button" className="mo-btn mo-btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                    title={`Tappe extra: ${Math.max(0, stops.filter(s=>s.tipo==='carico').length - 1 + stops.filter(s=>s.tipo==='scarico').length - 1)}`}
                    onClick={ricalcolaSupplementi}>
                    <i className="bi bi-arrow-repeat me-1" />Ricalcola supplementi
                  </button>
                </div>
                <div className="row g-2">
                  <div className="col-md-4">
                    <Field label="Prezzo base (€)" error={errors.prezzo_cliente}>
                      <input className="mo-form-control" type="number" step="0.01" min="0"
                        value={form.prezzo_cliente} onChange={set('prezzo_cliente')} placeholder="0.00" />
                    </Field>
                  </div>
                  <div className="col-md-4">
                    <Field label="Supplemento (€)" error={errors.supplemento_cliente}>
                      <input className="mo-form-control" type="number" step="0.01" min="0"
                        value={form.supplemento_cliente} onChange={set('supplemento_cliente')} placeholder="0.00" />
                    </Field>
                  </div>
                  <div className="col-md-4">
                    <label className="mo-form-label">Totale cliente (€)</label>
                    <div className="mo-form-control d-flex align-items-center"
                      style={{ background: '#dcfce7', fontWeight: 700, fontSize: '1rem', color: '#065f46' }}>
                      {totaleCliente.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trasportatore */}
            <div className="col-12">
              <div className="p-3" style={{ background: '#fff7ed', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                <div className="mb-2" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>
                  <i className="bi bi-truck me-1" />Costo trasportatore
                </div>
                <div className="row g-2">
                  <div className="col-md-4">
                    <Field label="Costo base (€)" error={errors.costo_trasportatore}>
                      <input className="mo-form-control" type="number" step="0.01" min="0"
                        value={form.costo_trasportatore} onChange={set('costo_trasportatore')} placeholder="0.00" />
                    </Field>
                  </div>
                  <div className="col-md-4">
                    <Field label="Supplemento (€)" error={errors.supplemento_trasportatore}>
                      <input className="mo-form-control" type="number" step="0.01" min="0"
                        value={form.supplemento_trasportatore} onChange={set('supplemento_trasportatore')} placeholder="0.00" />
                    </Field>
                  </div>
                  <div className="col-md-4">
                    <label className="mo-form-label">Totale trasportatore (€)</label>
                    <div className="mo-form-control d-flex align-items-center"
                      style={{ background: '#ffedd5', fontWeight: 700, fontSize: '1rem', color: '#92400e' }}>
                      {totaleTrasportatore.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Margine */}
            <div className="col-12">
              <div className="d-flex align-items-center gap-3 p-2"
                style={{ background: '#f0ebfa', borderRadius: '10px', fontSize: '0.875rem' }}>
                <span className="mo-text-muted">Margine:</span>
                <span style={{ fontWeight: 700, color: margine >= 0 ? '#065f46' : '#991b1b', fontSize: '1rem' }}>
                  € {margine.toFixed(2)}
                </span>
                {totaleCliente > 0 && (
                  <span className="mo-text-muted">
                    ({((margine / totaleCliente) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 4 — Dettagli trasporto */}
        <div className="mo-card mb-3">
          <div className="mb-3" style={{ fontWeight: 600 }}>Dettagli trasporto</div>
          <div className="row g-3">
            <div className="col-md-4">
              <Field label="Tipo mezzo" error={errors.vehicle_type_id}>
                <select className="mo-form-control" value={form.vehicle_type_id} onChange={set('vehicle_type_id')}>
                  <option value="">— Seleziona —</option>
                  {vehicleTypes.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-md-2">
              <Field label="N° bancali" error={errors.n_bancali}>
                <input className="mo-form-control" type="number" min="0" value={form.n_bancali} onChange={set('n_bancali')} />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Peso" error={errors.peso}>
                <input className="mo-form-control" value={form.peso} onChange={set('peso')} placeholder="es. 1200 kg" />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Metri lineari" error={errors.metri_lineari}>
                <input className="mo-form-control" value={form.metri_lineari} onChange={set('metri_lineari')} placeholder="es. 6.5 ml" />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Tipologia merce" error={errors.tipologia_merce}>
                <input className="mo-form-control" value={form.tipologia_merce} onChange={set('tipologia_merce')} />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Km totali" error={errors.km_totali}>
                <input className="mo-form-control" type="number" step="0.01" min="0"
                  value={form.km_totali} onChange={set('km_totali')} placeholder="calcolato da Google" />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Numero documento" error={errors.numero_documento}>
                <input className="mo-form-control" value={form.numero_documento} onChange={set('numero_documento')} />
              </Field>
            </div>
            <div className="col-12">
              <Field label="Rif. DDT" error={errors.rif_ddt}>
                <textarea className="mo-form-control" rows={2} value={form.rif_ddt} onChange={set('rif_ddt')} />
              </Field>
            </div>
            <div className="col-12">
              <Field label="Annotazioni" error={errors.annotazioni}>
                <textarea className="mo-form-control" rows={2} value={form.annotazioni} onChange={set('annotazioni')} />
              </Field>
            </div>
          </div>
        </div>

        {/* SEZIONE 5 — Dati fornitore */}
        <div className="mo-card mb-3">
          <div className="mb-3" style={{ fontWeight: 600 }}>Dati fornitore / mezzo</div>
          <div className="row g-3">
            <div className="col-md-4">
              <Field label="Nome autista" error={errors.nome_autista}>
                <input className="mo-form-control" value={form.nome_autista} onChange={set('nome_autista')} />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Targa motrice" error={errors.targa_motrice}>
                <input className="mo-form-control" value={form.targa_motrice} onChange={set('targa_motrice')} style={{ textTransform: 'uppercase' }} />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Targa rimorchio" error={errors.targa_rimorchio}>
                <input className="mo-form-control" value={form.targa_rimorchio} onChange={set('targa_rimorchio')} style={{ textTransform: 'uppercase' }} />
              </Field>
            </div>
          </div>
        </div>

        {/* SEZIONE 6 — Annotazioni mail */}
        <div className="mo-card mb-4">
          <div className="mb-3" style={{ fontWeight: 600 }}>Annotazioni per la mail al trasportatore</div>
          <Field label="Testo aggiuntivo nella mail" error={errors.annotazioni_mail}>
            <textarea className="mo-form-control" rows={3} value={form.annotazioni_mail}
              onChange={set('annotazioni_mail')}
              placeholder="Questo testo verrà incluso nella mail di invio ordine al trasportatore..." />
          </Field>
        </div>

        {/* SEZIONE 7 — Documenti allegati (solo in modifica) */}
        {isEdit && (
          <div className="mo-card mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span style={{ fontWeight: 600 }}>Documenti allegati</span>
              {documents.length > 0 && (
                <span className="mo-badge mo-badge-confermato">
                  <i className="bi bi-file-earmark-pdf me-1" />{documents.length} PDF
                </span>
              )}
            </div>
            <OrderDocuments
              workOrderId={id}
              documents={documents}
              onUpdate={setDocuments}
            />
          </div>
        )}

        {/* Azioni */}
        <div className="d-flex gap-2 justify-content-end mb-4">
          <button type="button" className="mo-btn mo-btn-ghost" onClick={() => navigate('/work-orders')}>
            Annulla
          </button>
          <button type="submit" className="mo-btn mo-btn-primary" disabled={saving}>
            {saving
              ? <><i className="bi bi-arrow-repeat me-1" />Salvataggio...</>
              : <><i className="bi bi-check-lg me-1" />{isEdit ? 'Salva modifiche' : 'Crea ordine'}</>}
          </button>
        </div>
      </form>
    </Layout>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mo-form-label">{label}</label>
      {children}
      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          {Array.isArray(error) ? error[0] : error}
        </div>
      )}
    </div>
  );
}
