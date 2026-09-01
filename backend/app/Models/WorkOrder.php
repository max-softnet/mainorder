<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkOrder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'numero_tmp', 'numero_ordine', 'status', 'data_ordine',
        'cliente_id', 'carrier_id', 'created_by',
        'data_carico', 'ora_carico', 'data_scarico', 'ora_scarico',
        'prezzo_cliente', 'supplemento_cliente',
        'costo_trasportatore', 'supplemento_trasportatore',
        'vehicle_type_id', 'n_bancali', 'tipologia_merce',
        'peso', 'metri_lineari', 'km_totali', 'rif_ddt', 'annotazioni',
        'nome_autista', 'targa_motrice', 'targa_rimorchio',
        'inviato', 'inviato_da', 'inviato_a', 'inviato_il',
        'confermato_da_fornitore', 'numero_documento', 'annotazioni_mail',
    ];

    // Campi aggiornabili dal trasportatore
    public const CARRIER_FIELDS = [
        'nome_autista', 'targa_motrice', 'targa_rimorchio',
        'confermato_da_fornitore',
    ];

    protected function casts(): array
    {
        return [
            'data_ordine'             => 'date',
            'data_carico'             => 'date',
            'data_scarico'            => 'date',
            'inviato_il'              => 'datetime',
            'inviato'                 => 'boolean',
            'confermato_da_fornitore' => 'boolean',
            'prezzo_cliente'          => 'decimal:2',
            'supplemento_cliente'     => 'decimal:2',
            'totale_cliente'          => 'decimal:2',
            'costo_trasportatore'     => 'decimal:2',
            'supplemento_trasportatore' => 'decimal:2',
            'totale_trasportatore'    => 'decimal:2',
            'km_totali'               => 'decimal:2',
        ];
    }

    public function cliente()       { return $this->belongsTo(Client::class); }
    public function carrier()       { return $this->belongsTo(Carrier::class); }
    public function creator()       { return $this->belongsTo(User::class, 'created_by'); }
    public function vehicleType()   { return $this->belongsTo(VehicleType::class); }
    public function stops()         { return $this->hasMany(OrderStop::class)->orderBy('sequenza'); }
    public function documents()     { return $this->hasMany(OrderDocument::class); }
    public function updates()       { return $this->hasMany(WorkOrderUpdate::class); }
    public function carrierContacts() {
        return $this->belongsToMany(CarrierContact::class, 'work_order_carrier_contact');
    }

    // Genera numero TMP alla creazione
    public static function generateTmp(int $id): string
    {
        return 'TMP-' . $id . '-' . date('dm'); // es. TMP-42-1606
    }

    // Promuove a confermato assegnando il numero progressivo e registra invio
    public function conferma(string $mittente, string $destinatari): void
    {
        if ($this->status !== 'in_attesa') return;

        $numero = OrderSequence::nextForYear((int) date('Y'));

        $this->update([
            'status'        => 'confermato',
            'numero_ordine' => $numero,
            'numero_tmp'    => null,
            'inviato'       => true,
            'inviato_da'    => $mittente,
            'inviato_a'     => $destinatari,
            'inviato_il'    => now(),
        ]);

        WorkOrderUpdate::create([
            'work_order_id' => $this->id,
            'user_id'       => auth()->id(),
            'status_from'   => 'in_attesa',
            'status_to'     => 'confermato',
        ]);
    }
}
