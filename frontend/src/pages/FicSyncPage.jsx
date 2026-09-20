import { useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import usePageTitle from '../hooks/usePageTitle';

const STATUS_LABEL = { new: 'Nuovo', update: 'Aggiornabile', same: 'Uguale' };
const STATUS_BADGE = {
  new:    { bg: '#dcfce7', color: '#166534' },
  update: { bg: '#fef9c3', color: '#854d0e' },
  same:   { bg: '#f3f4f6', color: '#6b7280' },
};

export default function FicSyncPage() {
  usePageTitle('Sync clienti FiC');
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    setSelected(new Set());
    setResult(null);
    try {
      const { data } = await api.get('/fic/clients/preview');
      setPreview(data);
      // Pre-seleziona nuovi e aggiornabili
      const toSelect = new Set(data.filter(r => r.status !== 'same').map(r => r.fic_id));
      setSelected(toSelect);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Errore durante il caricamento.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    const selectable = preview.filter(r => r.status !== 'same').map(r => r.fic_id);
    if (selectable.every(id => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectable));
    }
  };

  const toggle = (ficId, status) => {
    if (status === 'same') return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(ficId) ? next.delete(ficId) : next.add(ficId);
      return next;
    });
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    setError(null);
    try {
      const { data } = await api.post('/fic/clients/import', { fic_ids: [...selected] });
      setResult(data);
      setPreview(null);
      setSelected(new Set());
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Errore durante l\'importazione.');
    } finally {
      setImporting(false);
    }
  };

  const newCount    = preview?.filter(r => r.status === 'new').length ?? 0;
  const updateCount = preview?.filter(r => r.status === 'update').length ?? 0;
  const sameCount   = preview?.filter(r => r.status === 'same').length ?? 0;

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mo-page-title">Sincronizzazione clienti da Fatture in Cloud</h1>
      </div>

      <div className="mo-card mb-4">
        <p className="mo-text-muted mb-3">
          Legge l'anagrafica clienti da Fatture in Cloud e mostra quali sono nuovi o aggiornabili rispetto al database locale.
          I clienti marcati come <strong>Uguale</strong> non vengono modificati.
        </p>
        <button className="mo-btn mo-btn-primary" onClick={loadPreview} disabled={loading}>
          {loading
            ? <><span className="spinner-border spinner-border-sm me-2" />Caricamento da FiC...</>
            : <><i className="bi bi-cloud-download me-2" />Carica anteprima da Fatture in Cloud</>}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" style={{ borderRadius: 8 }}>
          <i className="bi bi-exclamation-triangle me-2" />{error}
        </div>
      )}

      {result && (
        <div className="mo-card mb-4">
          <div className="d-flex align-items-center gap-3">
            <span style={{ color: '#166534', fontWeight: 600 }}>
              <i className="bi bi-check-circle me-1" />{result.imported} nuovi importati
            </span>
            <span style={{ color: '#854d0e', fontWeight: 600 }}>
              <i className="bi bi-arrow-repeat me-1" />{result.updated} aggiornati
            </span>
          </div>
          {result.errors?.length > 0 && (
            <ul className="mt-2 mb-0" style={{ color: '#991b1b', fontSize: 13 }}>
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <button className="mo-btn mo-btn-ghost mt-3" onClick={loadPreview}>
            <i className="bi bi-arrow-repeat me-1" />Ricarica anteprima
          </button>
        </div>
      )}

      {preview && (
        <>
          <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
            <span className="mo-text-muted">
              {preview.length} clienti da FiC —
              <span style={{ color: '#166534', fontWeight: 600 }}> {newCount} nuovi</span>,
              <span style={{ color: '#854d0e', fontWeight: 600 }}> {updateCount} aggiornabili</span>,
              <span style={{ color: '#6b7280' }}> {sameCount} uguali</span>
            </span>
            <button
              className="mo-btn mo-btn-primary ms-auto"
              disabled={selected.size === 0 || importing}
              onClick={handleImport}>
              {importing
                ? <><span className="spinner-border spinner-border-sm me-2" />Importazione...</>
                : <><i className="bi bi-download me-1" />Importa selezionati ({selected.size})</>}
            </button>
          </div>

          <div className="mo-card">
            <div className="mo-table-wrap">
              <table className="mo-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox"
                        checked={preview.filter(r => r.status !== 'same').every(r => selected.has(r.fic_id))}
                        onChange={toggleAll} />
                    </th>
                    <th>Ragione sociale</th>
                    <th>P.IVA</th>
                    <th>Email</th>
                    <th>Città</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map(row => {
                    const badge = STATUS_BADGE[row.status];
                    const isSelectable = row.status !== 'same';
                    return (
                      <tr key={row.fic_id}
                        style={{ opacity: row.status === 'same' ? 0.5 : 1, cursor: isSelectable ? 'pointer' : 'default' }}
                        onClick={() => toggle(row.fic_id, row.status)}>
                        <td onClick={e => e.stopPropagation()}>
                          {isSelectable && (
                            <input type="checkbox"
                              checked={selected.has(row.fic_id)}
                              onChange={() => toggle(row.fic_id, row.status)} />
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{row.ragione_sociale}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.partita_iva || '—'}</td>
                        <td>{row.email || '—'}</td>
                        <td>{row.citta || '—'}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            background: badge.bg, color: badge.color,
                            padding: '2px 10px', borderRadius: 12,
                            fontSize: 12, fontWeight: 600,
                          }}>
                            {STATUS_LABEL[row.status]}
                          </span>
                          {row.deleted && (
                            <span style={{ fontSize: 11, color: '#991b1b', marginLeft: 6 }}>(eliminato localmente)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
