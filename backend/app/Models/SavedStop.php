<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SavedStop extends Model
{
    protected $fillable = [
        'cliente_id', 'ragione_sociale', 'indirizzo', 'citta', 'cap',
        'provincia', 'provincia_nome', 'lat', 'lng', 'place_id', 'note',
    ];
}
