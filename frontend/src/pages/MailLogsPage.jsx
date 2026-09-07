import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

const TIPO_LABELS = {
  conferma_ordine: 'Conferma ordine',
  reinvio:         'Reinvio',
};

const TIPO_BADGE = {
  conferma_ordine: { bg: '#ede9fe', color: '#5b21b6' },
  reinvio:         { bg: '#dbeafe', color: '#1e40af' },
};

export default function MailLogsPage() {
  usePageTitle('Log email');
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/mail-logs').then(({ data }) => {
      setLogs(data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mo-page-title mb-0">Log email</h4>
          <p className="text-muted small mb-0">Storico invii email ordini</p>
        </div>
      </div>

      <div className="mo-card">
        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border" style={{ color: 'var(--mo-purple)' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-5 text-muted">Nessun log disponibile.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th className="mo-form-label pb-2">Data</th>
                  <th className="mo-form-label pb-2">Tipo</th>
                  <th className="mo-form-label pb-2">Ordine</th>
                  <th className="mo-form-label pb-2">Destinatari</th>
                  <th className="mo-form-label pb-2">Stato</th>
                  <th className="mo-form-label pb-2">Inviata da</th>
                  <th className="mo-form-label pb-2">Errore</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const tipoStyle = TIPO_BADGE[log.tipo] || { bg: '#f3f4f6', color: '#374151' };
                  const ordineLabel = log.work_order?.numero_ordine || log.work_order?.numero_tmp || '—';
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>
                        {new Date(log.created_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td>
                        <span className="badge" style={{ background: tipoStyle.bg, color: tipoStyle.color, fontWeight: 600, fontSize: '0.75rem' }}>
                          {TIPO_LABELS[log.tipo] || log.tipo}
                        </span>
                      </td>
                      <td>
                        {log.work_order ? (
                          <button className="btn btn-link p-0" style={{ color: 'var(--mo-purple)', fontSize: '0.85rem' }}
                            onClick={() => navigate(`/work-orders/${log.work_order_id}`)}>
                            {ordineLabel}
                          </button>
                        ) : '—'}
                      </td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={log.destinatari}>
                        {log.destinatari}
                      </td>
                      <td>
                        {log.stato === 'inviata'
                          ? <span style={{ color: '#059669', fontWeight: 600 }}><i className="bi bi-check-circle me-1" />Inviata</span>
                          : <span style={{ color: '#dc2626', fontWeight: 600 }}><i className="bi bi-x-circle me-1" />Errore</span>}
                      </td>
                      <td style={{ color: '#6b7280' }}>{log.mittente?.name || '—'}</td>
                      <td style={{ color: '#dc2626', fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={log.errore || ''}>
                        {log.errore || ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
