<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderDocument extends Model
{
    protected $fillable = ['work_order_id', 'nome_originale', 'path', 'dimensione', 'uploaded_by'];

    public function workOrder() { return $this->belongsTo(WorkOrder::class); }
    public function uploader() { return $this->belongsTo(User::class, 'uploaded_by'); }

    public function getDimensioneFormattataAttribute(): string
    {
        $bytes = $this->dimensione;
        if ($bytes < 1024) return "{$bytes} B";
        if ($bytes < 1048576) return round($bytes / 1024, 1) . ' KB';
        return round($bytes / 1048576, 1) . ' MB';
    }
}
