<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class OrderSequence extends Model
{
    protected $fillable = ['anno', 'ultimo_progressivo'];

    // Genera il prossimo numero ordine confermato in modo atomico
    public static function nextForYear(int $anno): string
    {
        return DB::transaction(function () use ($anno) {
            $seq = self::lockForUpdate()->firstOrCreate(
                ['anno' => $anno],
                ['ultimo_progressivo' => 0]
            );
            $seq->increment('ultimo_progressivo');
            $seq->refresh();

            $aa = substr((string) $anno, -2); // es. "26"
            $prog = str_pad($seq->ultimo_progressivo, 4, '0', STR_PAD_LEFT);

            return "{$aa}-{$prog}";
        });
    }
}
