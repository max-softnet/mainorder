import { useState } from 'react';
import AddressAutocomplete from './AddressAutocomplete';

const EMPTY_STOP = {
  tipo: 'carico',
  sequenza: 1,
  ragione_sociale: '',
  indirizzo: '', citta: '', cap: '', provincia: '', provincia_nome: '',
  lat: null, lng: null, place_id: '',
  data: '', ora_da: '', ora_a: '', note: '',
  km_da_precedente: null,
};

// Geocodifica un indirizzo via Nominatim — arricchisce lat/lng e provincia
async function geocodificaTappa(stop) {
  // Salta solo se ha già sia coordinate che provincia
  if (stop.lat && stop.lng && stop.provincia) return stop;
  const q = [stop.indirizzo, stop.citta, stop.provincia].filter(Boolean).join(', ');
  if (!q) return stop;
  try {
    const params = new URLSearchParams({ q, format: 'json', addressdetails: '1', countrycodes: 'it', limit: '1' });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'MainOrder/1.0' },
    });
    if (!res.ok) return stop;
    const [item] = await res.json();
    if (!item) return stop;
    const a = item.address || {};
    const iso = item['ISO3166-2-lvl6'] || a['ISO3166-2-lvl6'] || '';
    const provincia = iso.includes('-') ? iso.split('-').pop() : (stop.provincia || '');
    const citta = stop.citta || a.city || a.town || a.village || a.municipality || '';
    const cap   = stop.cap  || a.postcode || '';
    return { ...stop, lat: parseFloat(item.lat), lng: parseFloat(item.lon), provincia, citta, cap };
  } catch {
    return stop;
  }
}

// Calcola i km tra tappe consecutive via OSRM (gratuito, nessuna API key)
async function calcolaKmTappe(stops) {
  const withCoords = stops.filter(s => s.lat && s.lng);
  if (withCoords.length < 2) return stops;

  // OSRM vuole le coordinate come "lon,lat;lon,lat;..."
  const coords = withCoords.map(s => `${parseFloat(s.lng).toFixed(6)},${parseFloat(s.lat).toFixed(6)}`).join(';');

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=false`,
      { headers: { 'User-Agent': 'MainOrder/1.0' } }
    );
    if (!res.ok) return stops;
    const data = await res.json();
    const legs = data.routes?.[0]?.legs;
    if (!legs) return stops;

    // legs[i].distance = metri da coordStop[i] a coordStop[i+1]
    const updated = [...stops];
    let coordIdx = 0;
    let legIdx   = 0;

    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].lat || !updated[i].lng) continue;
      if (coordIdx === 0) { coordIdx++; continue; }
      if (legs[legIdx]?.distance != null) {
        updated[i] = { ...updated[i], km_da_precedente: (legs[legIdx].distance / 1000).toFixed(2) };
      }
      coordIdx++;
      legIdx++;
    }

    return updated;
  } catch {
    return stops;
  }
}

function StopCard({ stop, idx, colIdx, totalInCol, totalStops, onUpdate, onUpdateAddress, onMove, onRemove }) {
  const isCarico = stop.tipo === 'carico';
  const bg     = isCarico ? '#f0fdf4' : '#fff7ed';
  const border = isCarico ? '#bbf7d0' : '#fed7aa';

  return (
    <div className="mb-2 p-3" style={{ borderRadius: 10, background: bg, border: `1.5px solid ${border}` }}>
      {/* Header riga */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className={`mo-badge ${isCarico ? 'mo-badge-consegnato' : 'mo-badge-in_lavorazione'}`}>
          {isCarico ? 'Carico' : 'Scarico'} {colIdx + 1}
        </span>
        {stop.provincia && (
          <span className="mo-badge mo-badge-in_transito">{stop.provincia}</span>
        )}
        <div className="ms-auto d-flex gap-1">
          <button type="button" className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.5rem' }}
            onClick={() => onMove(idx, -1)} disabled={idx === 0} title="Sposta su">
            <i className="bi bi-chevron-up" />
          </button>
          <button type="button" className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.5rem' }}
            onClick={() => onMove(idx, 1)} disabled={idx === totalStops - 1} title="Sposta giù">
            <i className="bi bi-chevron-down" />
          </button>
          {totalInCol > 1 && (
            <button type="button" className="mo-btn mo-btn-ghost" style={{ padding: '0.2rem 0.5rem', color: '#ef4444' }}
              onClick={() => onRemove(idx)} title="Rimuovi tappa">
              <i className="bi bi-trash" />
            </button>
          )}
        </div>
      </div>

      <div className="row g-2">
        <div className="col-12">
          <label className="mo-form-label">Ragione sociale / Nome luogo</label>
          <input className="mo-form-control" value={stop.ragione_sociale || ''}
            onChange={e => onUpdate(idx, 'ragione_sociale', e.target.value)}
            placeholder="Es. GVM, Lucart, Magazzino..." />
        </div>
        <div className="col-12">
          <label className="mo-form-label">Indirizzo</label>
          <AddressAutocomplete
            value={stop.indirizzo}
            placeholder={`Cerca indirizzo ${stop.tipo}...`}
            onChange={(data) => onUpdateAddress(idx, data)}
          />
          {stop.indirizzo && !stop.provincia && (
            <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 3 }}>
              <i className="bi bi-exclamation-triangle me-1" />
              Provincia non rilevata — seleziona l'indirizzo dal suggerimento.
            </div>
          )}
        </div>
        {(stop.citta || stop.cap || stop.provincia) && (
          <div className="col-12">
            <div className="d-flex gap-2 flex-wrap" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              {stop.citta && <span><i className="bi bi-geo-alt me-1" />{stop.citta}</span>}
              {stop.cap && <span>CAP {stop.cap}</span>}
              {stop.provincia && <span>({stop.provincia})</span>}
            </div>
          </div>
        )}
        <div className="col-12">
          <label className="mo-form-label">Note tappa</label>
          <input className="mo-form-control" value={stop.note ?? ''}
            onChange={e => onUpdate(idx, 'note', e.target.value)}
            placeholder="Istruzioni per il trasportatore..." />
        </div>
      </div>
    </div>
  );
}

export default function OrderStops({ stops, onChange }) {
  const [calculating, setCalculating] = useState(false);

  const addStop = (tipo) => {
    const nextSeq = stops.length + 1;
    onChange([...stops, { ...EMPTY_STOP, tipo, sequenza: nextSeq }]);
  };

  const removeStop = (idx) => {
    if (stops.length <= 1) return;
    const updated = stops.filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, sequenza: i + 1 }));
    onChange(updated);
  };

  const updateStop = (idx, field, value) => {
    const updated = stops.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    onChange(updated);
  };

  const updateStopAddress = async (idx, addressData) => {
    const updated = stops.map((s, i) => i === idx ? { ...s, ...addressData } : s);
    // Se la tappa selezionata ha coordinate e ci sono ≥2 tappe con indirizzo, ricalcola
    if (addressData.lat && updated.filter(s => s.indirizzo).length >= 2) {
      setCalculating(true);
      const geocoded = await Promise.all(updated.map(geocodificaTappa));
      const withKm = await calcolaKmTappe(geocoded);
      onChange(withKm);
      setCalculating(false);
    } else {
      onChange(updated);
    }
  };

  const moveStop = (idx, dir) => {
    const newStops = [...stops];
    const target = idx + dir;
    if (target < 0 || target >= newStops.length) return;
    [newStops[idx], newStops[target]] = [newStops[target], newStops[idx]];
    onChange(newStops.map((s, i) => ({ ...s, sequenza: i + 1 })));
  };

  const handleCalcolaKm = async () => {
    setCalculating(true);
    // Geocodifica le tappe senza coordinate, poi calcola i km
    const geocoded = await Promise.all(stops.map(geocodificaTappa));
    const withKm = await calcolaKmTappe(geocoded);
    onChange(withKm);
    setCalculating(false);
  };

  // Ricava provincia_da e provincia_a per il suggerimento tratta
  const firstCarico = stops.find(s => s.tipo === 'carico');
  const lastScarico = [...stops].reverse().find(s => s.tipo === 'scarico');
  const provinciaDa = firstCarico?.provincia || '';
  const provinciaA = lastScarico?.provincia || '';
  const kmTotali = stops.reduce((sum, s) => sum + (parseFloat(s.km_da_precedente) || 0), 0).toFixed(2);

  const carichi  = stops.map((s, i) => ({ ...s, _idx: i })).filter(s => s.tipo === 'carico');
  const scarichi = stops.map((s, i) => ({ ...s, _idx: i })).filter(s => s.tipo === 'scarico');

  return (
    <div>
      {/* Riepilogo tratta */}
      {stops.filter(s => s.indirizzo).length >= 2 && (
        <div className="d-flex align-items-center gap-3 mb-3 p-2"
          style={{ background: '#f0ebfa', borderRadius: '10px', fontSize: '0.875rem' }}>
          <span>
            <strong>Tratta:</strong>{' '}
            {provinciaDa || firstCarico?.citta || '?'} → {provinciaA || lastScarico?.citta || '?'}
          </span>
          {parseFloat(kmTotali) > 0 && (
            <span className="mo-badge mo-badge-in_transito">
              <i className="bi bi-signpost me-1" />{kmTotali} km totali
            </span>
          )}
          {stops.filter(s => s.indirizzo).length >= 2 && (
            <button type="button" className="mo-btn mo-btn-ghost ms-auto" style={{ fontSize: '0.8rem' }}
              onClick={handleCalcolaKm} disabled={calculating}>
              {calculating
                ? <><i className="bi bi-arrow-repeat me-1" />Calcolo...</>
                : <><i className="bi bi-calculator me-1" />Calcola km</>}
            </button>
          )}
        </div>
      )}

      {/* Layout due colonne: carico | scarico */}
      <div className="row g-3">
        {/* Colonna CARICO */}
        <div className="col-md-6">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span style={{ fontWeight: 600, color: '#065f46', fontSize: '0.9rem' }}>
              <i className="bi bi-box-arrow-in-down me-1" />Carico
            </span>
            <button type="button" className="mo-btn mo-btn-ghost"
              style={{ fontSize: '0.78rem', background: '#f0fdf4', border: '1.5px dashed #86efac', color: '#065f46', padding: '0.25rem 0.65rem' }}
              onClick={() => addStop('carico')}>
              <i className="bi bi-plus-lg me-1" />Aggiungi
            </button>
          </div>
          {carichi.length === 0 && (
            <div className="text-center py-3" style={{ border: '1.5px dashed #bbf7d0', borderRadius: 10, color: '#9ca3af', fontSize: '0.85rem' }}>
              Nessun punto di carico
            </div>
          )}
          {carichi.map((stop, colIdx) => (
            <StopCard key={stop._idx} stop={stop} idx={stop._idx} colIdx={colIdx}
              totalInCol={carichi.length} totalStops={stops.length}
              onUpdate={updateStop} onUpdateAddress={updateStopAddress}
              onMove={moveStop} onRemove={removeStop} />
          ))}
        </div>

        {/* Colonna SCARICO */}
        <div className="col-md-6">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span style={{ fontWeight: 600, color: '#92400e', fontSize: '0.9rem' }}>
              <i className="bi bi-box-arrow-up me-1" />Scarico
            </span>
            <button type="button" className="mo-btn mo-btn-ghost"
              style={{ fontSize: '0.78rem', background: '#fff7ed', border: '1.5px dashed #fcd34d', color: '#92400e', padding: '0.25rem 0.65rem' }}
              onClick={() => addStop('scarico')}>
              <i className="bi bi-plus-lg me-1" />Aggiungi
            </button>
          </div>
          {scarichi.length === 0 && (
            <div className="text-center py-3" style={{ border: '1.5px dashed #fed7aa', borderRadius: 10, color: '#9ca3af', fontSize: '0.85rem' }}>
              Nessun punto di scarico
            </div>
          )}
          {scarichi.map((stop, colIdx) => (
            <StopCard key={stop._idx} stop={stop} idx={stop._idx} colIdx={colIdx}
              totalInCol={scarichi.length} totalStops={stops.length}
              onUpdate={updateStop} onUpdateAddress={updateStopAddress}
              onMove={moveStop} onRemove={removeStop} />
          ))}
        </div>
      </div>

      {/* Pulsanti legacy rimossi — ora nei header colonna */}
      <div className="d-flex gap-2 mt-2 d-md-none">
        <button type="button" className="mo-btn mo-btn-ghost" style={{ fontSize: '0.85rem', background: '#f0fdf4', border: '1.5px dashed #86efac', color: '#065f46' }}
          onClick={() => addStop('carico')}>
          <i className="bi bi-plus-lg me-1" />Aggiungi carico
        </button>
        <button type="button" className="mo-btn mo-btn-ghost" style={{ fontSize: '0.85rem', color: '#92400e', background: '#fff7ed', border: '1.5px dashed #fcd34d' }}
          onClick={() => addStop('scarico')}>
          <i className="bi bi-plus-lg me-1" />Aggiungi scarico
        </button>
      </div>
    </div>
  );
}
