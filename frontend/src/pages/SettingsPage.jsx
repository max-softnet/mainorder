import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

// Ordine di visualizzazione esplicito per ogni gruppo
const GROUP_ORDER = ['general', 'company', 'smtp', 'fatturazione'];

const GROUP_LABELS = {
  smtp:         'Configurazione SMTP',
  general:      'Impostazioni Generali',
  company:      'Dati Aziendali (intestazione e piè di pagina PDF)',
  fatturazione: 'Fatture in Cloud',
};

const TYPE_ICONS = {
  smtp:         'bi-envelope-at',
  general:      'bi-gear',
  company:      'bi-building',
  fatturazione: 'bi-receipt',
};

// Ordine dei campi all'interno di ciascun gruppo
const FIELD_ORDER = {
  general: ['app_name', 'google_maps_key', 'maps_countries'],
  company: [
    'company_name', 'company_piva',
    'company_address', 'company_city',
    'company_legal_name', 'company_capitale_sociale',
    'company_sede_legale', 'company_registro_imprese',
    'company_email', 'company_website',
    'company_rea', 'company_albo_autotrasportatori', 'company_albo_spedizionieri',
    'company_payment_terms', 'company_contract_note',
  ],
  smtp: [
    'smtp_host', 'smtp_port',
    'smtp_encryption', 'smtp_username',
    'smtp_password',
    'mail_from_address', 'mail_from_name',
  ],
  fatturazione: [
    'fic_access_token', 'fic_company_id',
    'fic_vat_id', 'fic_payment_method_id',
  ],
};

const HIDDEN_KEYS = ['app_logo_path'];

// Campi che occupano tutta la riga
const FULL_WIDTH_KEYS = [
  'company_sede_legale', 'company_payment_terms', 'company_contract_note', 'smtp_password',
];

// Campi textarea
const TEXTAREA_KEYS = ['company_payment_terms', 'company_contract_note', 'company_sede_legale'];

function sortItems(group, items) {
  const order = FIELD_ORDER[group];
  if (!order) return items;
  return [...items].sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export default function SettingsPage() {
  usePageTitle('Impostazioni');
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testingFic, setTestingFic] = useState(false);
  const [message, setMessage] = useState(null);
  const [logoSrc, setLogoSrc] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    fetchSettings();
    fetchLogo();
  }, []);

  async function fetchLogo() {
    try {
      const { data } = await api.get('/settings/logo');
      setLogoSrc(data.logo || null);
    } catch { /* nessun logo */ }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    setMessage(null);
    const form = new FormData();
    form.append('logo', file);
    try {
      await api.post('/settings/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchLogo();
      setMessage({ type: 'success', text: 'Logo caricato correttamente.' });
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Errore nel caricamento del logo.' });
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  }

  async function handleLogoDelete() {
    if (!window.confirm('Rimuovere il logo?')) return;
    try {
      await api.delete('/settings/logo');
      setLogoSrc(null);
      setMessage({ type: 'success', text: 'Logo rimosso.' });
    } catch {
      setMessage({ type: 'danger', text: 'Errore nella rimozione del logo.' });
    }
  }

  async function fetchSettings() {
    try {
      const { data } = await api.get('/settings');
      const normalized = {};
      for (const [group, items] of Object.entries(data)) {
        normalized[group] = sortItems(group, items.filter(s => !HIDDEN_KEYS.includes(s.key)))
          .map(s => ({ ...s, _dirty: false }));
      }
      setGroups(normalized);
    } catch {
      setMessage({ type: 'danger', text: 'Errore nel caricamento delle impostazioni.' });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(group, key, value) {
    setGroups(prev => ({
      ...prev,
      [group]: prev[group].map(s => s.key === key ? { ...s, value, _dirty: true } : s),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const allSettings = Object.values(groups).flat().map(s => ({ key: s.key, value: s.value }));
    try {
      await api.put('/settings', { settings: allSettings });
      setMessage({ type: 'success', text: 'Impostazioni salvate correttamente.' });
      setGroups(prev => {
        const updated = {};
        for (const [g, items] of Object.entries(prev)) {
          updated[g] = items.map(s => ({ ...s, _dirty: false }));
        }
        return updated;
      });
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Errore nel salvataggio.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    if (!testEmail) return;
    setTesting(true);
    setMessage(null);
    try {
      const { data } = await api.post('/settings/smtp/test', { email: testEmail });
      setMessage({ type: 'success', text: data.message });
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Errore durante il test SMTP.' });
    } finally {
      setTesting(false);
    }
  }

  async function handleTestFic() {
    setTestingFic(true);
    setMessage(null);
    try {
      const { data } = await api.post('/billing/test');
      setMessage({
        type: 'success',
        text: `Connessione FiC riuscita${data.company ? ` — Azienda: ${data.company}` : ''}.`,
      });
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Errore connessione Fatture in Cloud.' });
    } finally {
      setTestingFic(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
          <div className="spinner-border" style={{ color: 'var(--mo-purple)' }} />
        </div>
      </Layout>
    );
  }

  const hasDirty = Object.values(groups).flat().some(s => s._dirty);

  // Ordine visualizzazione gruppi
  const orderedGroups = [
    ...GROUP_ORDER.filter(g => groups[g]),
    ...Object.keys(groups).filter(g => !GROUP_ORDER.includes(g)),
  ];

  return (
    <Layout>
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mo-page-title mb-0">Impostazioni</h4>
          <p className="text-muted small mb-0">Configurazione sistema, dati aziendali e SMTP</p>
        </div>
        <button className="mo-btn mo-btn-primary" onClick={handleSave} disabled={saving || !hasDirty}>
          {saving
            ? <><span className="spinner-border spinner-border-sm me-2" />Salvataggio...</>
            : <><i className="bi bi-floppy me-2" />Salva modifiche</>}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type} alert-dismissible`} role="alert">
          <i className={`bi ${message.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`} />
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)} />
        </div>
      )}

      {/* LOGO */}
      <div className="mo-card mb-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <i className="bi bi-image" style={{ color: 'var(--mo-purple)', fontSize: '1.1rem' }} />
          <h6 className="mb-0" style={{ fontWeight: 600 }}>Logo aziendale</h6>
        </div>
        <div className="d-flex align-items-center gap-4 flex-wrap">
          <div style={{
            width: 180, height: 90,
            border: '1.5px dashed #d1d5db',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f9fafb', overflow: 'hidden',
          }}>
            {logoSrc
              ? <img src={logoSrc} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : <span className="text-muted small">Nessun logo</span>}
          </div>
          <div className="d-flex flex-column gap-2">
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml"
              style={{ display: 'none' }} onChange={handleLogoUpload} />
            <button className="mo-btn mo-btn-primary" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
              {logoUploading
                ? <><span className="spinner-border spinner-border-sm me-2" />Caricamento...</>
                : <><i className="bi bi-upload me-2" />{logoSrc ? 'Sostituisci logo' : 'Carica logo'}</>}
            </button>
            {logoSrc && (
              <button className="mo-btn mo-btn-danger" onClick={handleLogoDelete}>
                <i className="bi bi-trash me-2" />Rimuovi logo
              </button>
            )}
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>PNG, JPG o SVG — max 2 MB</div>
          </div>
        </div>
      </div>

      {/* GRUPPI SETTINGS */}
      {orderedGroups.map(group => {
        const items = groups[group] || [];
        return (
          <div className="mo-card mb-4" key={group}>
            <div className="d-flex align-items-center gap-2 mb-4">
              <i className={`bi ${TYPE_ICONS[group] || 'bi-sliders'}`} style={{ color: 'var(--mo-purple)', fontSize: '1.1rem' }} />
              <h6 className="mb-0" style={{ fontWeight: 600 }}>{GROUP_LABELS[group] || group}</h6>
            </div>

            <div className="row g-3">
              {items.map(setting => (
                <SettingField
                  key={setting.key}
                  setting={setting}
                  onChange={value => handleChange(group, setting.key, value)}
                />
              ))}
            </div>

            {group === 'fatturazione' && (
              <div className="mt-4 p-3" style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                <h6 className="mb-1" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  <i className="bi bi-plug me-2" style={{ color: 'var(--mo-purple)' }} />
                  Test connessione Fatture in Cloud
                </h6>
                <p className="text-muted mb-3" style={{ fontSize: '0.82rem' }}>
                  Salva prima le modifiche, poi verifica che il token e il Company ID siano corretti.
                </p>
                <button className="mo-btn mo-btn-outline" onClick={handleTestFic} disabled={testingFic}>
                  {testingFic
                    ? <><span className="spinner-border spinner-border-sm me-2" />Verifica...</>
                    : <><i className="bi bi-lightning me-2" />Testa connessione FiC</>}
                </button>
              </div>
            )}
            {group === 'smtp' && (
              <div className="mt-4 p-3" style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                <h6 className="mb-1" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  <i className="bi bi-send-check me-2" style={{ color: 'var(--mo-purple)' }} />
                  Test connessione SMTP
                </h6>
                <p className="text-muted mb-3" style={{ fontSize: '0.82rem' }}>
                  Usa i valori <strong>salvati nel DB</strong> — salva prima le modifiche, poi testa.
                </p>
                <div className="d-flex gap-2">
                  <input
                    type="email"
                    className="mo-form-control form-control"
                    placeholder="Email destinatario test"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    style={{ maxWidth: 360 }}
                  />
                  <button className="mo-btn mo-btn-outline" onClick={handleTestSmtp} disabled={testing || !testEmail}>
                    {testing
                      ? <><span className="spinner-border spinner-border-sm me-2" />Invio...</>
                      : <><i className="bi bi-lightning me-2" />Testa SMTP</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
    </Layout>
  );
}

const COUNTRY_OPTIONS = [
  { code: 'it', label: '🇮🇹 Italia' },
  { code: 'fr', label: '🇫🇷 Francia' },
  { code: 'ch', label: '🇨🇭 Svizzera' },
  { code: 'at', label: '🇦🇹 Austria' },
  { code: 'si', label: '🇸🇮 Slovenia' },
  { code: 'hr', label: '🇭🇷 Croazia' },
  { code: 'de', label: '🇩🇪 Germania' },
  { code: 'es', label: '🇪🇸 Spagna' },
  { code: 'pt', label: '🇵🇹 Portogallo' },
  { code: 'nl', label: '🇳🇱 Olanda' },
  { code: 'be', label: '🇧🇪 Belgio' },
  { code: 'pl', label: '🇵🇱 Polonia' },
  { code: 'sm', label: '🇸🇲 San Marino' },
  { code: 'va', label: '🇻🇦 Vaticano' },
];

function MapsCountriesField({ value, onChange }) {
  const selected = (value || '').split(',').map(s => s.trim()).filter(Boolean);
  const toggle = (code) => {
    const next = selected.includes(code)
      ? selected.filter(c => c !== code)
      : [...selected, code];
    onChange(next.join(','));
  };
  return (
    <div className="d-flex flex-wrap gap-2 mt-1">
      {COUNTRY_OPTIONS.map(({ code, label }) => (
        <label key={code} style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          cursor: 'pointer', userSelect: 'none',
          padding: '0.25rem 0.6rem', borderRadius: '8px',
          border: `1px solid ${selected.includes(code) ? 'var(--mo-purple)' : 'var(--mo-border)'}`,
          background: selected.includes(code) ? 'var(--mo-purple-light)' : 'transparent',
          fontSize: '0.85rem',
        }}>
          <input type="checkbox" checked={selected.includes(code)} onChange={() => toggle(code)} style={{ display: 'none' }} />
          {label}
        </label>
      ))}
    </div>
  );
}

function SettingField({ setting, onChange }) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword  = setting.type === 'password';
  const isTextarea  = TEXTAREA_KEYS.includes(setting.key);
  const isFullWidth = FULL_WIDTH_KEYS.includes(setting.key);
  const colClass    = isFullWidth ? 'col-12' : 'col-md-6';

  return (
    <div className={colClass}>
      <label className="mo-form-label d-block mb-1">
        {setting.label}
        {setting._dirty && (
          <span className="ms-2 badge bg-warning text-dark" style={{ fontSize: '0.6rem', verticalAlign: 'middle' }}>
            modificato
          </span>
        )}
      </label>

      {isPassword ? (
        <div className="input-group">
          <input
            type={showPwd ? 'text' : 'password'}
            className="mo-form-control form-control"
            value={setting.value}
            onChange={e => onChange(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <button className="btn btn-outline-secondary" type="button"
            onClick={() => setShowPwd(p => !p)} title={showPwd ? 'Nascondi' : 'Mostra'}>
            <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
          </button>
        </div>
      ) : isTextarea ? (
        <textarea
          className="mo-form-control form-control"
          rows={3}
          value={setting.value}
          onChange={e => onChange(e.target.value)}
        />
      ) : setting.key === 'maps_countries' ? (
        <MapsCountriesField value={setting.value} onChange={onChange} />
      ) : setting.key === 'smtp_encryption' ? (
        <select className="mo-form-control form-select" value={setting.value} onChange={e => onChange(e.target.value)}>
          <option value="tls">TLS (porta 587)</option>
          <option value="ssl">SSL (porta 465)</option>
          <option value="">Nessuna (porta 25)</option>
        </select>
      ) : setting.key === 'smtp_port' ? (
        <input
          type="number"
          className="mo-form-control form-control"
          value={setting.value}
          onChange={e => onChange(e.target.value)}
          min="1" max="65535"
        />
      ) : (
        <input
          type="text"
          className="mo-form-control form-control"
          value={setting.value}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {setting.description && (
        <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>{setting.description}</div>
      )}
    </div>
  );
}
