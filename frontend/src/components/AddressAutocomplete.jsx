import { useEffect, useRef, useState, useCallback } from 'react';

// --- Google Maps loader ---
let googleLoaderPromise = null;
let googleApiWorks = true; // false dopo il primo 403, persiste per tutta la sessione
let resolvedApiKey = null;
let resolvedCountries = null;

async function resolveConfig() {
  if (resolvedApiKey !== null) return;
  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const res = await fetch(`${baseUrl}/config`);
    if (res.ok) {
      const data = await res.json();
      if (data.google_maps_key) resolvedApiKey = data.google_maps_key;
      if (data.maps_countries)  resolvedCountries = data.maps_countries.split(',').map(s => s.trim()).filter(Boolean);
    }
  } catch (_) {}
  if (!resolvedApiKey)   resolvedApiKey   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  if (!resolvedCountries) resolvedCountries = ['it', 'fr', 'ch', 'at', 'si', 'sm', 'va', 'es'];
}

async function resolveApiKey() {
  await resolveConfig();
  return resolvedApiKey;
}

function loadGoogleMaps(apiKey) {
  if (googleLoaderPromise) return googleLoaderPromise;
  googleLoaderPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) return resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&language=it&region=IT`;
    script.async = true;
    script.defer = true;
    script.onload  = () => resolve();
    script.onerror = () => { googleLoaderPromise = null; reject(); };
    document.head.appendChild(script);
  });
  return googleLoaderPromise;
}

function parseGoogleComponents(components) {
  const get = (type, short = false) => {
    const c = components.find(c => c.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : '';
  };
  return {
    indirizzo:      [get('route'), get('street_number')].filter(Boolean).join(', '),
    citta:          get('locality') || get('administrative_area_level_3'),
    cap:            get('postal_code'),
    provincia:      get('administrative_area_level_2', true),
    provincia_nome: get('administrative_area_level_2'),
  };
}

// --- Nominatim (OpenStreetMap) ---
async function nominatimSearch(text) {
  const params = new URLSearchParams({
    q: text, format: 'json', addressdetails: '1',
    countrycodes: 'it', limit: '6', 'accept-language': 'it',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'MainOrder/1.0' },
  });
  if (!res.ok) return [];
  return res.json();
}

function parseNominatimResult(item) {
  const a = item.address || {};
  const indirizzo = [a.road, a.house_number].filter(Boolean).join(' ');
  const citta = a.city || a.town || a.village || a.municipality || a.hamlet || '';
  const cap = a.postcode || '';
  const provincia_nome = a.county
    ? a.county.replace(/^Città Metropolitana di /i, '').replace(/^Provincia di /i, '').trim()
    : '';
  // Nominatim mette ISO3166-2-lvl6 a volte nel root, a volte dentro address
  const iso = item['ISO3166-2-lvl6'] || a['ISO3166-2-lvl6'] || '';
  const provincia = iso.includes('-') ? iso.split('-').pop() : '';
  return {
    indirizzo: indirizzo || item.display_name?.split(',')[0] || '',
    citta, cap, provincia, provincia_nome,
    lat: parseFloat(item.lat), lng: parseFloat(item.lon),
    place_id: String(item.place_id),
  };
}

function nominatimLabel(item) {
  const a = item.address || {};
  const main = [a.road, a.house_number].filter(Boolean).join(' ')
    || item.display_name?.split(',')[0] || '';
  const secondary = [a.postcode, a.city || a.town || a.village].filter(Boolean).join(' ');
  return { main, secondary };
}

// ─────────────────────────────────────────────
export default function AddressAutocomplete({
  value, onChange, placeholder = 'Cerca indirizzo...', disabled = false,
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [useGoogle, setUseGoogle] = useState(false);

  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    resolveApiKey().then(key => {
      if (!key) return;
      setUseGoogle(true);
      loadGoogleMaps(key)
        .then(() => setGoogleReady(true))
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNominatim = useCallback(async (text) => {
    if (text.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const results = await nominatimSearch(text);
      setSuggestions(results.map(r => ({ _type: 'nominatim', ...r })));
      setOpen(true);
      setActiveIdx(-1);
    } catch (_) {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const fetchGoogle = useCallback(async (text) => {
    if (text.length < 3) { setSuggestions([]); return; }
    try {
      const { suggestions: preds } = await window.google.maps.places.AutocompleteSuggestion
        .fetchAutocompleteSuggestions({ input: text, includedRegionCodes: resolvedCountries || ['it'], language: 'it' });
      setSuggestions((preds || []).filter(p => p.placePrediction).map(p => ({ _type: 'google', _pred: p.placePrediction })));
      setOpen(true);
      setActiveIdx(-1);
    } catch (_) {
      googleApiWorks = false;
      fetchNominatim(text);
    }
  }, [fetchNominatim]);

  const handleInput = (e) => {
    const v = e.target.value;
    setInputValue(v);
    onChange({ indirizzo: v });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (useGoogle && googleReady && googleApiWorks) {
        fetchGoogle(v);
      } else {
        fetchNominatim(v);
      }
    }, 350);
  };

  const selectGoogle = async (pred) => {
    const label = pred.structuredFormat?.mainText?.text || pred.text?.text || '';
    setInputValue(label);
    setSuggestions([]);
    setOpen(false);
    try {
      const place = pred.toPlace();
      await place.fetchFields({ fields: ['addressComponents', 'location', 'id', 'formattedAddress'] });
      const components = (place.addressComponents || []).map(c => ({
        types: c.types, long_name: c.longText, short_name: c.shortText,
      }));
      const parsed = parseGoogleComponents(components);
      onChange({
        ...parsed,
        lat: place.location?.lat(), lng: place.location?.lng(),
        place_id: place.id, indirizzo: place.formattedAddress || parsed.indirizzo,
      });
    } catch (_) {}
  };

  const selectNominatim = (item) => {
    const parsed = parseNominatimResult(item);
    const { main, secondary } = nominatimLabel(item);
    setInputValue([main, secondary].filter(Boolean).join(', '));
    setSuggestions([]);
    setOpen(false);
    onChange(parsed);
  };

  const selectSuggestion = (item) => {
    if (item._type === 'google') selectGoogle(item._pred);
    else selectNominatim(item);
  };

  const handleKeyDown = (e) => {
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeIdx]); }
    if (e.key === 'Escape') setOpen(false);
  };

  const getLabel = (item) => {
    if (item._type === 'google') {
      const p = item._pred;
      return {
        main:      p?.structuredFormat?.mainText?.text || p?.text?.text || '',
        secondary: p?.structuredFormat?.secondaryText?.text || '',
      };
    }
    return nominatimLabel(item);
  };

  const useOsm = !useGoogle || !googleApiWorks;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="mo-form-control"
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {searching && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: 2 }} />
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 9999, top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)', margin: 0, padding: '0.25rem 0',
          listStyle: 'none', maxHeight: 260, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => {
            const { main, secondary } = getLabel(s);
            const key = (s._type === 'google' ? 'g' : s.place_id) + '_' + i;
            return (
              <li
                key={key}
                onMouseDown={() => selectSuggestion(s)}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  padding: '0.5rem 0.85rem', cursor: 'pointer', fontSize: '0.85rem',
                  background: i === activeIdx ? '#f3f4f6' : 'transparent',
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                }}
              >
                <i className="bi bi-geo-alt" style={{ color: '#9ca3af', marginTop: 2, flexShrink: 0 }} />
                <span>
                  <span style={{ fontWeight: 500 }}>{main}</span>
                  {secondary && (
                    <span style={{ color: '#9ca3af', marginLeft: 4, fontSize: '0.78rem' }}>{secondary}</span>
                  )}
                </span>
              </li>
            );
          })}
          <li style={{ padding: '0.3rem 0.85rem', fontSize: '0.7rem', color: '#d1d5db', borderTop: '1px solid #f3f4f6' }}>
            {useOsm ? '© OpenStreetMap contributors' : '© Google Maps'}
          </li>
        </ul>
      )}
    </div>
  );
}
