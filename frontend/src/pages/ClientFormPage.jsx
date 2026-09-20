import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

const EMPTY = {
  ragione_sociale: '', indirizzo: '', citta: '', cap: '', provincia: '',
  email: '', telefono: '', sito_web: '', referente: '', note: '',
  fatturazione_indirizzo: '', fatturazione_citta: '', fatturazione_cap: '',
  fatturazione_provincia: '', sdi: '', codice_fiscale: '', partita_iva: '',
  fic_id: '', supplemento_carico: '', supplemento_scarico: '', active: true,
};

export default function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  usePageTitle('Clienti', isEdit ? (form.ragione_sociale || 'Modifica') : 'Nuovo cliente');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/clients/${id}`).then(({ data }) => {
      setForm({ ...EMPTY, ...data });
      setLoading(false);
    });
  }, [id]);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  const copySedeLegale = () => {
    setForm(f => ({
      ...f,
      fatturazione_indirizzo: f.indirizzo,
      fatturazione_citta: f.citta,
      fatturazione_cap: f.cap,
      fatturazione_provincia: f.provincia,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (isEdit) {
        await api.put(`/clients/${id}`, form);
      } else {
        await api.post('/clients', form);
      }
      navigate('/clients');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout><div className="mo-text-muted p-4">Caricamento...</div></Layout>;

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mo-page-title">{isEdit ? 'Modifica cliente' : 'Nuovo cliente'}</h1>
        <button className="mo-btn mo-btn-ghost" onClick={() => navigate('/clients')}>
          <i className="bi bi-arrow-left" /> Torna alla lista
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Anagrafica */}
        <div className="mo-card mb-3">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span style={{ fontWeight: 600 }}>Anagrafica</span>
            <label className="d-flex align-items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={form.active} onChange={set('active')} />
              Cliente attivo
            </label>
          </div>
          <div className="row g-3">
            <div className="col-12">
              <Field label="Ragione Sociale / Denominazione *" error={errors.ragione_sociale}>
                <input className="mo-form-control" value={form.ragione_sociale} onChange={set('ragione_sociale')} required />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Referente" error={errors.referente}>
                <input className="mo-form-control" value={form.referente} onChange={set('referente')} placeholder="Nome e cognome" />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Telefono" error={errors.telefono}>
                <input className="mo-form-control" value={form.telefono} onChange={set('telefono')} placeholder="+39 02 1234567" />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Email" error={errors.email}>
                <input className="mo-form-control" type="email" value={form.email} onChange={set('email')} />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Sito Web" error={errors.sito_web}>
                <input className="mo-form-control" value={form.sito_web} onChange={set('sito_web')} placeholder="https://" />
              </Field>
            </div>
            <div className="col-12">
              <Field label="Indirizzo sede operativa" error={errors.indirizzo}>
                <input className="mo-form-control" value={form.indirizzo} onChange={set('indirizzo')} />
              </Field>
            </div>
            <div className="col-md-5">
              <Field label="Città" error={errors.citta}>
                <input className="mo-form-control" value={form.citta} onChange={set('citta')} />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="CAP" error={errors.cap}>
                <input className="mo-form-control" value={form.cap} onChange={set('cap')} maxLength={10} />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Provincia" error={errors.provincia}>
                <input className="mo-form-control" value={form.provincia} onChange={set('provincia')} maxLength={5} placeholder="MI" />
              </Field>
            </div>
            <div className="col-12">
              <Field label="Note" error={errors.note}>
                <textarea className="mo-form-control" rows={3} value={form.note} onChange={set('note')} />
              </Field>
            </div>
          </div>
        </div>

        {/* Sede Legale */}
        <div className="mo-card mb-3">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span style={{ fontWeight: 600 }}>Sede Legale / Fatturazione</span>
            <button type="button" className="mo-btn mo-btn-ghost" style={{ fontSize: '0.8rem' }} onClick={copySedeLegale}>
              <i className="bi bi-copy" /> Copia da sede operativa
            </button>
          </div>
          <div className="row g-3">
            <div className="col-12">
              <Field label="Indirizzo" error={errors.fatturazione_indirizzo}>
                <input className="mo-form-control" value={form.fatturazione_indirizzo} onChange={set('fatturazione_indirizzo')} />
              </Field>
            </div>
            <div className="col-md-5">
              <Field label="Città" error={errors.fatturazione_citta}>
                <input className="mo-form-control" value={form.fatturazione_citta} onChange={set('fatturazione_citta')} />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="CAP" error={errors.fatturazione_cap}>
                <input className="mo-form-control" value={form.fatturazione_cap} onChange={set('fatturazione_cap')} maxLength={10} />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Provincia" error={errors.fatturazione_provincia}>
                <input className="mo-form-control" value={form.fatturazione_provincia} onChange={set('fatturazione_provincia')} maxLength={5} placeholder="MI" />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="P.IVA" error={errors.partita_iva}>
                <input className="mo-form-control" value={form.partita_iva} onChange={set('partita_iva')} />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Codice Fiscale" error={errors.codice_fiscale}>
                <input className="mo-form-control" value={form.codice_fiscale} onChange={set('codice_fiscale')} />
              </Field>
            </div>
            <div className="col-md-4">
              <Field label="Codice SDI" error={errors.sdi}>
                <input className="mo-form-control" value={form.sdi} onChange={set('sdi')} placeholder="0000000" />
              </Field>
            </div>
            {form.fic_id && (
              <div className="col-md-4">
                <Field label="ID Fatture in Cloud">
                  <input className="mo-form-control" value={form.fic_id} readOnly
                    style={{ background: '#f9fafb', color: '#6b7280', cursor: 'default' }} />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Supplementi */}
        <div className="mo-card mb-4">
          <div className="mb-3" style={{ fontWeight: 600 }}>Supplementi fissi</div>
          <div className="row g-3">
            <div className="col-md-6">
              <Field label="Supplemento carico extra (€)" error={errors.supplemento_carico}>
                <input className="mo-form-control" type="number" step="0.01" min="0"
                  value={form.supplemento_carico} onChange={set('supplemento_carico')} placeholder="0.00" />
              </Field>
            </div>
            <div className="col-md-6">
              <Field label="Supplemento scarico extra (€)" error={errors.supplemento_scarico}>
                <input className="mo-form-control" type="number" step="0.01" min="0"
                  value={form.supplemento_scarico} onChange={set('supplemento_scarico')} placeholder="0.00" />
              </Field>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="mo-btn mo-btn-ghost" onClick={() => navigate('/clients')}>
            Annulla
          </button>
          <button type="submit" className="mo-btn mo-btn-primary" disabled={saving}>
            {saving ? <><i className="bi bi-arrow-repeat me-1" />Salvataggio...</> : <><i className="bi bi-check-lg me-1" />{isEdit ? 'Salva modifiche' : 'Crea cliente'}</>}
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
      {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{error[0]}</div>}
    </div>
  );
}
