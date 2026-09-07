<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailLog extends Model
{
    protected $fillable = ['work_order_id', 'tipo', 'destinatari', 'stato', 'errore', 'inviata_da'];

    public function workOrder() { return $this->belongsTo(WorkOrder::class); }
    public function mittente()  { return $this->belongsTo(User::class, 'inviata_da'); }
}
