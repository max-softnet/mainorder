<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkOrderUpdate extends Model
{
    protected $fillable = ['work_order_id', 'user_id', 'status_from', 'status_to', 'note'];

    public function workOrder() { return $this->belongsTo(WorkOrder::class); }
    public function user() { return $this->belongsTo(User::class); }
}
