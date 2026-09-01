<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStop extends Model
{
    protected $fillable = [
        'work_order_id', 'ragione_sociale', 'tipo', 'sequenza',
        'indirizzo', 'citta', 'cap', 'provincia', 'provincia_nome',
        'lat', 'lng', 'place_id',
        'data', 'ora_da', 'ora_a', 'note',
        'km_da_precedente',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'km_da_precedente' => 'decimal:2',
        ];
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function getIndirizzoCompletoAttribute(): string
    {
        $parts = [];
        if ($this->ragione_sociale) $parts[] = $this->ragione_sociale . ' -';
        if ($this->indirizzo)       $parts[] = $this->indirizzo;
        if ($this->citta)           $parts[] = $this->citta;
        if ($this->provincia)       $parts[] = '(' . $this->provincia . ')';
        return implode(' ', $parts);
    }
}
