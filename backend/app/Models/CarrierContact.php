<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CarrierContact extends Model
{
    protected $fillable = [
        'carrier_id', 'cognome', 'nome', 'email', 'telefono', 'ruolo', 'note',
    ];

    public function carrier()
    {
        return $this->belongsTo(Carrier::class);
    }

    public function workOrders()
    {
        return $this->belongsToMany(WorkOrder::class, 'work_order_carrier_contact');
    }

    public function getNomeCompletoAttribute(): string
    {
        return trim("{$this->cognome} {$this->nome}");
    }
}
