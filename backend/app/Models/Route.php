<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Route extends Model
{
    protected $fillable = [
        'cliente_id', 'carrier_id',
        'provincia_da', 'provincia_a',
        'prezzo_cliente', 'costo_trasportatore',
        'km_totali', 'last_work_order_id',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'prezzo_cliente' => 'decimal:2',
            'costo_trasportatore' => 'decimal:2',
            'km_totali' => 'decimal:2',
        ];
    }

    public function cliente() { return $this->belongsTo(Client::class); }
    public function carrier() { return $this->belongsTo(Carrier::class); }
    public function lastWorkOrder() { return $this->belongsTo(WorkOrder::class, 'last_work_order_id'); }

    // Cerca una tratta esistente e la restituisce come suggerimento
    public static function findSuggestion(int $clienteId, int $carrierId, string $daP, string $aP): ?self
    {
        return self::where('cliente_id', $clienteId)
            ->where('carrier_id', $carrierId)
            ->where('provincia_da', strtoupper($daP))
            ->where('provincia_a', strtoupper($aP))
            ->first();
    }
}
