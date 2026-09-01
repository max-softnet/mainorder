import { useRef, useState } from 'react';
import api from '../api/axios';

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function OrderDocuments({ workOrderId, documents, onUpdate }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError('');

    if (file.type !== 'application/pdf') {
      setUploadError('Solo file PDF sono accettati.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`Il file supera il limite di ${MAX_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(
        `/work-orders/${workOrderId}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      onUpdate([...documents, data]);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Errore durante il caricamento.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Eliminare "${doc.nome_originale}"?`)) return;
    try {
      await api.delete(`/work-orders/${workOrderId}/documents/${doc.id}`);
      onUpdate(documents.filter(d => d.id !== doc.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Errore durante l\'eliminazione.');
    }
  };

  const handleDownload = (doc) => {
    window.open(
      `${import.meta.env.VITE_API_URL}/work-orders/${workOrderId}/documents/${doc.id}/download`,
      '_blank'
    );
  };

  return (
    <div>
      {/* Lista documenti */}
      {documents.length === 0 ? (
        <p className="mo-text-muted" style={{ fontSize: '0.875rem' }}>Nessun documento allegato.</p>
      ) : (
        <div className="d-flex flex-column gap-2 mb-3">
          {documents.map(doc => (
            <div key={doc.id} className="d-flex align-items-center justify-content-between p-2"
              style={{ background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-pdf" style={{ fontSize: '1.3rem', color: '#ef4444' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{doc.nome_originale}</div>
                  <div className="mo-text-muted" style={{ fontSize: '0.75rem' }}>
                    {formatBytes(doc.dimensione)}
                    {doc.uploader && <span className="ms-2">· caricato da {doc.uploader.name}</span>}
                    {doc.created_at && (
                      <span className="ms-2">
                        · {new Date(doc.created_at).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="d-flex gap-1">
                <button type="button" className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                  onClick={() => handleDownload(doc)} title="Scarica">
                  <i className="bi bi-download" />
                </button>
                <button type="button" className="mo-btn mo-btn-ghost"
                  style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}
                  onClick={() => handleDelete(doc)} title="Elimina">
                  <i className="bi bi-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload */}
      {documents.length < 10 && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button type="button" className="mo-btn mo-btn-ghost"
            style={{ border: '1.5px dashed #d1d5db', fontSize: '0.875rem' }}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}>
            {uploading
              ? <><i className="bi bi-arrow-repeat me-2" />Caricamento...</>
              : <><i className="bi bi-paperclip me-2" />Allega PDF (max {MAX_SIZE_MB}MB)</>}
          </button>
          <span className="mo-text-muted ms-3" style={{ fontSize: '0.78rem' }}>
            {documents.length}/10 documenti
          </span>
        </div>
      )}

      {documents.length >= 10 && (
        <p className="mo-text-muted" style={{ fontSize: '0.8rem' }}>
          <i className="bi bi-info-circle me-1" />Limite massimo di 10 documenti raggiunto.
        </p>
      )}

      {uploadError && (
        <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.5rem' }}>
          <i className="bi bi-exclamation-circle me-1" />{uploadError}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
