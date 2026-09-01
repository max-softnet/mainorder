<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CarrierRoute extends Model
{
    protected $fillable = [
        'carrier_id', 'provincia_da', 'provincia_a',
        'costo', 'km_totali', 'note', 'last_work_order_id',
    ];

    protected function casts(): array
    {
        return [
            'costo'    => 'decimal:2',
            'km_totali'=> 'decimal:2',
        ];
    }

    public function carrier()       { return $this->belongsTo(Carrier::class); }
    public function lastWorkOrder() { return $this->belongsTo(WorkOrder::class, 'last_work_order_id'); }
}
