<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Carrier extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'denominazione', 'indirizzo', 'citta', 'cap', 'provincia',
        'telefono', 'email', 'sito_web',
        'partita_iva', 'codice_fiscale', 'n_iscrizione_albo',
        'note', 'active',
    ];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function contacts()
    {
        return $this->hasMany(CarrierContact::class);
    }

    public function workOrders()
    {
        return $this->hasMany(WorkOrder::class);
    }

    // Garantisce che il trasportatore abbia almeno 1 referente
    public function hasAtLeastOneContact(): bool
    {
        return $this->contacts()->count() > 0;
    }
}
