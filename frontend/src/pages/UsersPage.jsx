import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import usePageTitle from '../hooks/usePageTitle';
import api from '../api/axios';

const ROLE_LABELS = { admin: 'Admin', operatore: 'Operatore', cliente: 'Cliente', trasportatore: 'Trasportatore' };
const ROLE_BADGE = { admin: '#7c3aed', operatore: '#2563eb', cliente: '#059669', trasportatore: '#d97706' };

const emptyForm = { name: '', email: '', password: '', role: 'operatore', phone: '', company: '', active: true };

export default function UsersPage() {
  usePageTitle('Gestione utenti');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit', user?: {} }
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async (s = search, r = roleFilter, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', {
        params: { search: s || undefined, role: r || undefined, page: p },
      });
      setUsers(data.data);
      setMeta(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setForm(emptyForm); setError(''); setModal({ mode: 'create' }); };
  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', company: u.company || '', active: !!u.active });
    setError('');
    setModal({ mode: 'edit', user: u });
  };
  const closeModal = () => setModal(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (modal.mode === 'create') {
        await api.post('/users', payload);
      } else {
        await api.put(`/users/${modal.user.id}`, payload);
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors
        ? Object.values(err.response.data.errors || {}).flat().join(' ') : 'Errore nel salvataggio.';
      setError(typeof msg === 'string' ? msg : 'Errore nel salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u) => {
    await api.put(`/users/${u.id}`, { active: !u.active });
    fetchUsers();
  };

  const handleDelete = async (u) => {
    if (!confirm(`Eliminare l'utente "${u.name}"? L'operazione non è reversibile.`)) return;
    await api.delete(`/users/${u.id}`);
    fetchUsers();
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchUsers(search, roleFilter, 1); };

  return (
    <Layout>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mo-page-title">Gestione utenti</h1>
        <button className="mo-btn mo-btn-primary" onClick={openCreate}>
          <i className="bi bi-person-plus" /> Nuovo utente
        </button>
      </div>

      {/* Filtri */}
      <div className="mo-card mb-3">
        <form onSubmit={handleSearch} className="d-flex gap-2 flex-wrap">
          <div className="mo-search-wrap flex-grow-1">
            <i className="bi bi-search" />
            <input className="mo-search w-100" type="text"
              placeholder="Cerca per nome, email, azienda..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="mo-form-control" style={{ width: 'auto', minWidth: '160px' }}
            value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); fetchUsers(search, e.target.value, 1); }}>
            <option value="">Tutti i ruoli</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="mo-btn mo-btn-primary">Cerca</button>
          {(search || roleFilter) && (
            <button type="button" className="mo-btn mo-btn-ghost"
              onClick={() => { setSearch(''); setRoleFilter(''); fetchUsers('', '', 1); }}>
              Azzera
            </button>
          )}
        </form>
      </div>

      {/* Tabella */}
      <div className="mo-card">
        {loading ? (
          <div className="text-center py-4 mo-text-muted">Caricamento...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-4 mo-text-muted">Nessun utente trovato.</div>
        ) : (
          <div className="mo-table-wrap"><table className="mo-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Ruolo</th>
                <th>Azienda</th>
                <th>Telefono</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>{u.email}</td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                      fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.03em',
                      background: ROLE_BADGE[u.role] + '22', color: ROLE_BADGE[u.role],
                    }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>{u.company || <span className="mo-text-muted">—</span>}</td>
                  <td>{u.phone || <span className="mo-text-muted">—</span>}</td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                      fontSize: '0.78rem', fontWeight: 600,
                      background: u.active ? '#d1fae5' : '#fee2e2',
                      color: u.active ? '#065f46' : '#991b1b',
                    }}>
                      {u.active ? 'Attivo' : 'Disattivato'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1 justify-content-end">
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                        title={u.active ? 'Disattiva' : 'Attiva'}
                        onClick={() => handleToggleActive(u)}>
                        <i className={`bi ${u.active ? 'bi-toggle-on' : 'bi-toggle-off'}`} />
                      </button>
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem' }}
                        onClick={() => openEdit(u)}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="mo-btn mo-btn-ghost" style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}
                        onClick={() => handleDelete(u)}>
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3"
            style={{ borderTop: '1px solid #f3f4f6' }}>
            <span className="mo-text-muted">{meta.from}–{meta.to} di {meta.total} utenti</span>
            <div className="d-flex gap-1">
              <button className="mo-btn mo-btn-ghost" disabled={page === 1}
                onClick={() => { setPage(p => p - 1); fetchUsers(search, roleFilter, page - 1); }}>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mo-btn" style={{ cursor: 'default' }}>{page} / {meta.last_page}</span>
              <button className="mo-btn mo-btn-ghost" disabled={page === meta.last_page}
                onClick={() => { setPage(p => p + 1); fetchUsers(search, roleFilter, page + 1); }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(2px)',
        }} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{
            background: 'var(--mo-surface)', borderRadius: 16,
            width: '100%', maxWidth: 580, maxHeight: '92vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--mo-border)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--mo-purple-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className="bi bi-person" style={{ color: 'var(--mo-purple)', fontSize: '1.1rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {modal.mode === 'create' ? 'Nuovo utente' : `Modifica utente`}
                </div>
                {modal.mode === 'edit' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--mo-text-muted)' }}>{modal.user.name}</div>
                )}
              </div>
              <button className="mo-btn mo-btn-ghost" style={{ padding: '0.35rem 0.6rem' }} onClick={closeModal}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {error && (
                <div className="alert alert-danger mb-3" style={{ fontSize: '0.875rem' }}>{error}</div>
              )}

              <form onSubmit={handleSave} id="user-modal-form">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="mo-form-label">Nome *</label>
                    <input className="mo-form-control" required value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="mo-form-label">Email *</label>
                    <input className="mo-form-control" type="email" required value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="mo-form-label">
                      {modal.mode === 'create' ? 'Password *' : 'Nuova password'}
                    </label>
                    <input className="mo-form-control" type="password"
                      required={modal.mode === 'create'}
                      placeholder={modal.mode === 'edit' ? 'Lascia vuoto per non cambiare' : ''}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      autoComplete="new-password" />
                  </div>
                  <div className="col-md-6">
                    <label className="mo-form-label">Ruolo *</label>
                    <select className="mo-form-control" value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="mo-form-label">Telefono</label>
                    <input className="mo-form-control" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="mo-form-label">Azienda</label>
                    <input className="mo-form-control" value={form.company}
                      onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.active}
                        onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                      <span className="mo-form-label" style={{ margin: 0 }}>Utente attivo</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--mo-border)',
              display: 'flex', gap: '0.5rem', justifyContent: 'flex-end',
              background: 'var(--mo-surface)',
            }}>
              <button type="button" className="mo-btn mo-btn-ghost" onClick={closeModal}>Annulla</button>
              <button type="submit" form="user-modal-form" className="mo-btn mo-btn-primary" disabled={saving}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm me-2" />{modal.mode === 'create' ? 'Creazione...' : 'Salvataggio...'}</>
                  : <><i className={`bi ${modal.mode === 'create' ? 'bi-plus-lg' : 'bi-check-lg'} me-1`} />{modal.mode === 'create' ? 'Crea utente' : 'Salva modifiche'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
