<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientRoute extends Model
{
    protected $fillable = [
        'cliente_id', 'provincia_da', 'provincia_a',
        'prezzo', 'note', 'last_work_order_id',
    ];

    protected function casts(): array
    {
        return ['prezzo' => 'decimal:2'];
    }

    public function cliente()       { return $this->belongsTo(Client::class); }
    public function lastWorkOrder() { return $this->belongsTo(WorkOrder::class, 'last_work_order_id'); }
}
