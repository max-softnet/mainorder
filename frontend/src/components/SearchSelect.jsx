import { useState, useRef, useEffect } from 'react';

/**
 * Campo di selezione con ricerca per stringa parziale.
 * Props:
 *   options   : [{ value, label }]
 *   value     : valore selezionato (id numerico o stringa)
 *   onChange  : (value) => void
 *   placeholder: string
 *   disabled  : bool
 */
export default function SearchSelect({ options = [], value, onChange, placeholder = 'Cerca...', disabled = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  // Filtra opzioni per query
  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Chiudi cliccando fuori
  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleOpen() {
    if (disabled) return;
    setQuery('');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(opt) {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Campo display / input ricerca */}
      {open ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <input
            ref={inputRef}
            className="mo-form-control"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Digita per cercare..."
            onKeyDown={e => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0]);
            }}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.9rem',
            }}
          >
            <i className="bi bi-chevron-up" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className="mo-form-control"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            textAlign: 'left', cursor: disabled ? 'default' : 'pointer',
            color: selected ? 'var(--mo-text)' : '#9ca3af',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {selected ? selected.label : placeholder}
          </span>
          <span style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 4 }}>
            {selected && (
              <i className="bi bi-x" onClick={handleClear}
                style={{ color: '#9ca3af', fontSize: '1rem' }} />
            )}
            <i className="bi bi-chevron-down" style={{ color: '#9ca3af', fontSize: '0.85rem' }} />
          </span>
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff',
          border: '1.5px solid var(--mo-purple)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          zIndex: 500,
          maxHeight: 260,
          overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.875rem' }}>
              Nessun risultato
            </div>
          ) : filtered.map(opt => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt)}
              style={{
                padding: '0.6rem 1rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: String(opt.value) === String(value) ? 'var(--mo-purple)' : 'var(--mo-text)',
                background: String(opt.value) === String(value) ? 'var(--mo-purple-light)' : 'transparent',
                fontWeight: String(opt.value) === String(value) ? 600 : 400,
                borderBottom: '1px solid #f3f4f6',
              }}
              onMouseEnter={e => { if (String(opt.value) !== String(value)) e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { if (String(opt.value) !== String(value)) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
