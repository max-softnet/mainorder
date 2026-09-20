<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'fic_id',
        'ragione_sociale',
        'indirizzo', 'citta', 'cap', 'provincia',
        'email', 'telefono', 'sito_web', 'referente', 'note',
        'fatturazione_indirizzo', 'fatturazione_citta', 'fatturazione_cap', 'fatturazione_provincia',
        'sdi', 'codice_fiscale', 'partita_iva',
        'supplemento_carico', 'supplemento_scarico',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'supplemento_carico' => 'decimal:2',
            'supplemento_scarico' => 'decimal:2',
        ];
    }

    public function workOrders()
    {
        return $this->hasMany(WorkOrder::class);
    }

    // Restituisce i dati di fatturazione, usando la sede operativa se quella legale è vuota
    public function getFatturazioneIndirizzoCompletoAttribute(): string
    {
        $ind = $this->fatturazione_indirizzo ?: $this->indirizzo;
        $cap = $this->fatturazione_cap ?: $this->cap;
        $citta = $this->fatturazione_citta ?: $this->citta;
        $prov = $this->fatturazione_provincia ?: $this->provincia;
        return trim("$ind, $cap $citta ($prov)");
    }
}
