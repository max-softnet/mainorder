import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export default function CarrierUpdatePage() {
  const { token } = useParams();
  const [order, setOrder]   = useState(null);
  const [form, setForm]     = useState({ nome_autista: '', targa_motrice: '', targa_rimorchio: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/carrier-update/${token}`)
      .then(({ data }) => {
        setOrder(data);
        setForm({
          nome_autista:    data.nome_autista    || '',
          targa_motrice:   data.targa_motrice   || '',
          targa_rimorchio: data.targa_rimorchio || '',
        });
      })
      .catch(err => {
        if (err.response?.status === 410) {
          setError('Questo link non è più valido. L\'ordine è stato chiuso.');
        } else if (err.response?.status === 404) {
          setError('Link non valido o già scaduto.');
        } else {
          setError('Errore nel caricamento dei dati. Riprova più tardi.');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/carrier-update/${token}`, form);
      setSuccess(true);
    } catch (err) {
      setError('Errore nel salvataggio. Riprova più tardi.');
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#6d28d9', padding: '20px 0' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {order?.logo_url && (
            <img src={order.logo_url} alt="logo" style={{ height: 40, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          )}
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
              {order?.company_name || order?.app_name || 'Main Order'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Portale trasportatori</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '32px auto', padding: '0 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>Caricamento...</div>
        )}

        {!loading && error && !success && (
          <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>{error}</div>
          </div>
        )}

        {!loading && order && !success && (
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {/* Info ordine */}
            <div style={{ background: '#f3f0ff', padding: '16px 24px', borderBottom: '1px solid #e9e3ff' }}>
              <div style={{ fontSize: 12, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Ordine di trasporto
              </div>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1e1b4b' }}>
                N° {order.numero_ordine}
              </div>
              <div style={{ color: '#555', fontSize: 13, marginTop: 2 }}>
                Data ordine: {order.data_ordine}
                {order.data_carico && <> &nbsp;·&nbsp; Carico: {order.data_carico}</>}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#374151' }}>
                Dati fornitore / mezzo
              </div>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
                Inserisci o aggiorna i dati del conducente e del mezzo utilizzato per questo trasporto.
              </div>

              <Field label="Nome autista">
                <input
                  style={inputStyle}
                  value={form.nome_autista}
                  onChange={set('nome_autista')}
                  placeholder="Nome e cognome"
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <Field label="Targa motrice">
                  <input
                    style={inputStyle}
                    value={form.targa_motrice}
                    onChange={set('targa_motrice')}
                    placeholder="AB 123 CD"
                    maxLength={20}
                  />
                </Field>
                <Field label="Targa rimorchio">
                  <input
                    style={inputStyle}
                    value={form.targa_rimorchio}
                    onChange={set('targa_rimorchio')}
                    placeholder="AB 123 CD"
                    maxLength={20}
                  />
                </Field>
              </div>

              {error && (
                <div style={{ color: '#ef4444', fontSize: 13, marginTop: 16 }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  marginTop: 24, width: '100%', background: saving ? '#a78bfa' : '#6d28d9',
                  color: '#fff', border: 'none', borderRadius: 6, padding: '12px 0',
                  fontWeight: 600, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Salvataggio...' : 'Salva dati'}
              </button>
            </form>
          </div>
        )}

        {success && (
          <div style={{ background: '#fff', borderRadius: 8, padding: 40, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#065f46', marginBottom: 8 }}>
              Dati salvati con successo
            </div>
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              I dati del mezzo per l'ordine <strong>{order?.numero_ordine}</strong> sono stati aggiornati.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
  outline: 'none', fontFamily: 'Arial, sans-serif',
};

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
