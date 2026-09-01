import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

const EMPTY_CARRIER = {
  denominazione: '', indirizzo: '', citta: '', cap: '', provincia: '',
  telefono: '', email: '', sito_web: '',
  partita_iva: '', codice_fiscale: '', n_iscrizione_albo: '',
  note: '', active: true,
};

const EMPTY_CONTACT = { cognome: '', nome: '', email: '', telefono: '', ruolo: '', note: '' };

export default function CarrierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_CARRIER);
  usePageTitle('Trasportatori', isEdit ? (form.denominazione || 'Modifica') : 'Nuovo trasportatore');
  const [contacts, setContacts] = useState([{ ...EMPTY_CONTACT }]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Stato per aggiunta/modifica referenti in modalità edit
  const [editingContact, setEditingContact] = useState(null); // {index, data} o null
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({ ...EMPTY_CONTACT });

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/carriers/${id}`).then(({ data }) => {
      const { contacts: c, ...carrier } = data;
      setForm({ ...EMPTY_CARRIER, ...carrier });
      setContacts(c || []);
      setLoading(false);
    });
  }, [id]);

  const setField = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const setContactField = (idx) => (field) => (e) => {
    setContacts(cs => cs.map((c, i) => i === idx ? { ...c, [field]: e.target.value } : c));
  };

  const addContact = () => setContacts(cs => [...cs, { ...EMPTY_CONTACT }]);

  const removeContact = (idx) => {
    if (contacts.length <= 1) return;
    setContacts(cs => cs.filter((_, i) => i !== idx));
  };

  // Submit creazione
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (isEdit) {
        await api.put(`/carriers/${id}`, form);
      } else {
        await api.post('/carriers', { ...form, contacts });
      }
      navigate('/carriers');
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally {
      setSaving(false);
    }
  };

  // Aggiunta referente in modalità edit (API separata)
  const handleAddContact = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/carriers/${id}/contacts`, newContact);
      setContacts(cs => [...cs, data]);
      setAddingContact(false);
      setNewContact({ ...EMPTY_CONTACT });
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally {
      setSaving(false);
    }
  };

  // Aggiornamento referente esistente
  const handleUpdateContact = async (contact) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/carriers/${id}/contacts/${contact.id}`, editingContact.data);
      setContacts(cs => cs.map(c => c.id === contact.id ? data : c));
      setEditingContact(null);
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally {
      setSaving(false);
    }
  };

  // Eliminazione referente
  const handleDeleteContact = async (contact) => {
    if (!confirm(`Eliminare il referente ${contact.cognome} ${contact.nome}?`)) return;
    try {
      await api.delete(`/carriers/${id}/contacts/${contact.id}`);
      setContacts(cs => cs.filter(c => c.id !== contact.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Errore durante l\'eliminazione.');
    }
  };

  if (loading) return <Layout><div className="mo-text-muted p-4">Caricamento...</div></Layout>;

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mo-page-title">{isEdit ? 'Modifica trasportatore' : 'Nuovo trasportatore'}</h1>
        <button className="mo-btn mo-btn-ghost" onClick={() => navigate('/carriers')}>
          <i className="bi bi-arrow-left" /> Torna alla lista
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Dati principali */}
        <div className="mo-card mb-3">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span style={{ fontWeight: 600 }}>Dati principali</span>
            <label className="d-flex align-items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={form.active} onChange={setField('active')} />
              Trasportatore attivo
            </label>
          </div>
          <div className="row g-3">
            <div className="col-12">
              <Field label="Denominazione *" error={errors.denominazione}>
                <input className="mo-form-control" value={form.denominazione} onChange={setField('denominazione')} required />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Telefono" error={errors.telefono}>
                <input className="mo-form-control" value={form.telefono} onChange={setField('telefono')} />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Email generale" error={errors.email}>
                <input className="mo-form-control" type="email" value={form.email} onChange={setField('email')} />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Sito Web" error={errors.sito_web}>
                <input className="mo-form-control" value={form.sito_web} onChange={setField('sito_web')} placeholder="https://" />
              </Field>
            </div>
            <div className="col-12">
              <Field label="Indirizzo" error={errors.indirizzo}>
                <input className="mo-form-control" value={form.indirizzo} onChange={setField('indirizzo')} />
              </Field>
            </div>
            <div className="col-md-5">
              <Field label="Città" error={errors.citta}>
                <input className="mo-form-control" value={form.citta} onChange={setField('citta')} />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="CAP" error={errors.cap}>
                <input className="mo-form-control" value={form.cap} onChange={setField('cap')} maxLength={10} />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Provincia" error={errors.provincia}>
                <input className="mo-form-control" value={form.provincia} onChange={setField('provincia')} maxLength={5} placeholder="MI" />
              </Field>
            </div>
            <div className="col-12">
              <Field label="Note" error={errors.note}>
                <textarea className="mo-form-control" rows={2} value={form.note} onChange={setField('note')} />
              </Field>
            </div>
          </div>
        </div>

        {/* Dati fiscali */}
        <div className="mo-card mb-3">
          <div className="mb-3" style={{ fontWeight: 600 }}>Dati fiscali</div>
          <div className="row g-3">
            <div className="col-md-4">
              <Field label="P.IVA" error={errors.partita_iva}>
                <input className="mo-form-control" value={form.partita_iva} onChange={setField('partita_iva')} />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Codice Fiscale" error={errors.codice_fiscale}>
                <input className="mo-form-control" value={form.codice_fiscale} onChange={setField('codice_fiscale')} />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="N° iscrizione albo" error={errors.n_iscrizione_albo}>
                <input className="mo-form-control" value={form.n_iscrizione_albo} onChange={setField('n_iscrizione_albo')} />
              </Field>
            </div>
          </div>
        </div>

        {/* Referenti */}
        <div className="mo-card mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <span style={{ fontWeight: 600 }}>Referenti</span>
              <span className="mo-text-muted ms-2" style={{ fontSize: '0.8rem' }}>almeno 1 richiesto</span>
            </div>
            {isEdit && (
              <button type="button" className="mo-btn mo-btn-outline" style={{ fontSize: '0.8rem' }}
                onClick={() => setAddingContact(true)}>
                <i className="bi bi-plus-lg" /> Aggiungi referente
              </button>
            )}
          </div>

          {errors.contacts && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              {errors.contacts}
            </div>
          )}

          {/* Modalità creazione: referenti inline */}
          {!isEdit && contacts.map((c, idx) => (
            <ContactRow key={idx} contact={c} idx={idx}
              onChange={setContactField(idx)}
              onRemove={() => removeContact(idx)}
              canRemove={contacts.length > 1}
              errors={errors}
            />
          ))}
          {!isEdit && (
            <button type="button" className="mo-btn mo-btn-ghost mt-2" onClick={addContact}>
              <i className="bi bi-plus-lg" /> Aggiungi referente
            </button>
          )}

          {/* Modalità modifica: lista referenti salvati */}
          {isEdit && contacts.map((c) => (
            <div key={c.id}>
              {editingContact?.id === c.id ? (
                <ContactEditRow
                  data={editingContact.data}
                  onChange={(field, val) => setEditingContact(e => ({ ...e, data: { ...e.data, [field]: val } }))}
                  onSave={() => handleUpdateContact(c)}
                  onCancel={() => setEditingContact(null)}
                  saving={saving}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-between py-2"
                  style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{c.cognome} {c.nome}</span>
                    {c.ruolo && <span className="mo-badge mo-badge-in_lavorazione ms-2">{c.ruolo}</span>}
                    <div className="mo-text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                      {c.email && <span className="me-3"><i className="bi bi-envelope me-1" />{c.email}</span>}
                      {c.telefono && <span><i className="bi bi-telephone me-1" />{c.telefono}</span>}
                    </div>
                  </div>
                  <div className="d-flex gap-1">
                    <button type="button" className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                      onClick={() => setEditingContact({ id: c.id, data: { ...c } })}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button type="button" className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}
                      onClick={() => handleDeleteContact(c)}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Form aggiunta referente in edit */}
          {isEdit && addingContact && (
            <div className="mt-3 p-3" style={{ background: '#f9fafb', borderRadius: '10px' }}>
              <div className="mb-2" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Nuovo referente</div>
              <ContactEditRow
                data={newContact}
                onChange={(field, val) => setNewContact(n => ({ ...n, [field]: val }))}
                onSave={handleAddContact}
                onCancel={() => { setAddingContact(false); setNewContact({ ...EMPTY_CONTACT }); }}
                saving={saving}
              />
            </div>
          )}
        </div>

        {!isEdit && (
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="mo-btn mo-btn-ghost" onClick={() => navigate('/carriers')}>
              Annulla
            </button>
            <button type="submit" className="mo-btn mo-btn-primary" disabled={saving}>
              {saving
                ? <><i className="bi bi-arrow-repeat me-1" />Salvataggio...</>
                : <><i className="bi bi-check-lg me-1" />Crea trasportatore</>}
            </button>
          </div>
        )}

        {isEdit && (
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="mo-btn mo-btn-ghost" onClick={() => navigate('/carriers')}>
              Annulla
            </button>
            <button type="submit" className="mo-btn mo-btn-primary" disabled={saving}>
              {saving
                ? <><i className="bi bi-arrow-repeat me-1" />Salvataggio...</>
                : <><i className="bi bi-check-lg me-1" />Salva modifiche</>}
            </button>
          </div>
        )}
      </form>
    </Layout>
  );
}

function ContactRow({ contact, idx, onChange, onRemove, canRemove, errors }) {
  return (
    <div className="p-3 mb-2" style={{ background: '#f9fafb', borderRadius: '10px' }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Referente {idx + 1}</span>
        {canRemove && (
          <button type="button" className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.5rem', color: '#ef4444' }} onClick={onRemove}>
            <i className="bi bi-trash" />
          </button>
        )}
      </div>
      <div className="row g-2">
        <div className="col-md-3"><Field label="Cognome *"><input className="mo-form-control" value={contact.cognome} onChange={onChange('cognome')} required /></Field></div>
        <div className="col-md-3"><Field label="Nome *"><input className="mo-form-control" value={contact.nome} onChange={onChange('nome')} required /></Field></div>
        <div className="col-md-3"><Field label="Ruolo"><input className="mo-form-control" value={contact.ruolo} onChange={onChange('ruolo')} placeholder="es. Responsabile" /></Field></div>
        <div className="col-md-3"><Field label="Telefono"><input className="mo-form-control" value={contact.telefono} onChange={onChange('telefono')} /></Field></div>
        <div className="col-md-6"><Field label="Email ordini"><input className="mo-form-control" type="email" value={contact.email} onChange={onChange('email')} /></Field></div>
        <div className="col-md-6"><Field label="Note"><input className="mo-form-control" value={contact.note} onChange={onChange('note')} /></Field></div>
      </div>
    </div>
  );
}

function ContactEditRow({ data, onChange, onSave, onCancel, saving }) {
  return (
    <div>
      <div className="row g-2 mb-2">
        <div className="col-md-3"><Field label="Cognome *"><input className="mo-form-control" value={data.cognome} onChange={e => onChange('cognome', e.target.value)} required /></Field></div>
        <div className="col-md-3"><Field label="Nome *"><input className="mo-form-control" value={data.nome} onChange={e => onChange('nome', e.target.value)} required /></Field></div>
        <div className="col-md-3"><Field label="Ruolo"><input className="mo-form-control" value={data.ruolo || ''} onChange={e => onChange('ruolo', e.target.value)} placeholder="es. Responsabile" /></Field></div>
        <div className="col-md-3"><Field label="Telefono"><input className="mo-form-control" value={data.telefono || ''} onChange={e => onChange('telefono', e.target.value)} /></Field></div>
        <div className="col-md-6"><Field label="Email ordini"><input className="mo-form-control" type="email" value={data.email || ''} onChange={e => onChange('email', e.target.value)} /></Field></div>
        <div className="col-md-6"><Field label="Note"><input className="mo-form-control" value={data.note || ''} onChange={e => onChange('note', e.target.value)} /></Field></div>
      </div>
      <div className="d-flex gap-2">
        <button type="button" className="mo-btn mo-btn-primary" onClick={onSave} disabled={saving}>
          <i className="bi bi-check-lg" /> Salva
        </button>
        <button type="button" className="mo-btn mo-btn-ghost" onClick={onCancel}>Annulla</button>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mo-form-label">{label}</label>
      {children}
      {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{Array.isArray(error) ? error[0] : error}</div>}
    </div>
  );
}
