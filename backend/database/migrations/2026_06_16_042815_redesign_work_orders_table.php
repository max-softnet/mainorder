<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Disabilita FK per permettere il drop su MySQL
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        Schema::dropIfExists('work_order_carrier_contact');
        Schema::dropIfExists('work_order_updates');
        Schema::dropIfExists('order_stops');
        Schema::dropIfExists('work_orders');
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();

            // Numerazione
            $table->string('numero_tmp')->nullable();
            $table->string('numero_ordine')->nullable()->unique(); // es. 26-0001

            // Stato
            $table->enum('status', ['in_attesa', 'confermato', 'annullato', 'chiuso', 'fatturato'])
                  ->default('in_attesa');

            // Intestazione
            $table->date('data_ordine');
            $table->foreignId('cliente_id')->constrained('clients');
            $table->foreignId('carrier_id')->constrained('carriers');
            $table->foreignId('created_by')->constrained('users');

            // Date carico/scarico sull'ordine
            $table->date('data_carico')->nullable();
            $table->time('ora_carico')->nullable();
            $table->date('data_scarico')->nullable();
            $table->time('ora_scarico')->nullable();

            // Economico cliente
            $table->decimal('prezzo_cliente', 10, 2)->nullable();
            $table->decimal('supplemento_cliente', 10, 2)->default(0);
            $table->decimal('totale_cliente', 10, 2)->virtualAs('prezzo_cliente + supplemento_cliente');

            // Economico trasportatore
            $table->decimal('costo_trasportatore', 10, 2)->nullable();
            $table->decimal('supplemento_trasportatore', 10, 2)->default(0);
            $table->decimal('totale_trasportatore', 10, 2)->virtualAs('costo_trasportatore + supplemento_trasportatore');

            // Dettagli trasporto
            $table->foreignId('vehicle_type_id')->nullable()->constrained('vehicle_types')->nullOnDelete();
            $table->integer('n_bancali')->nullable();
            $table->string('tipologia_merce')->nullable();
            $table->string('peso')->nullable();
            $table->string('metri_lineari')->nullable();
            $table->decimal('km_totali', 8, 2)->nullable();
            $table->text('rif_ddt')->nullable();
            $table->text('annotazioni')->nullable();

            // Dati fornitore (compilati dal trasportatore)
            $table->string('nome_autista')->nullable();
            $table->string('targa_motrice')->nullable();
            $table->string('targa_rimorchio')->nullable();

            // Invio ordine
            $table->boolean('inviato')->default(false);
            $table->string('inviato_da')->nullable();
            $table->string('inviato_a')->nullable();
            $table->datetime('inviato_il')->nullable();
            $table->boolean('confermato_da_fornitore')->default(false);
            $table->string('numero_documento')->nullable();
            $table->text('annotazioni_mail')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        // Ricrea le tabelle dipendenti
        Schema::create('work_order_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->string('status_from')->nullable();
            $table->string('status_to')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('order_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->enum('tipo', ['carico', 'scarico']);
            $table->unsignedSmallInteger('sequenza');
            $table->string('indirizzo')->nullable();
            $table->string('citta')->nullable();
            $table->string('cap', 10)->nullable();
            $table->string('provincia', 5)->nullable();
            $table->string('provincia_nome')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('place_id')->nullable();
            $table->date('data')->nullable();
            $table->time('ora_da')->nullable();
            $table->time('ora_a')->nullable();
            $table->text('note')->nullable();
            $table->decimal('km_da_precedente', 8, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('work_order_carrier_contact', function (Blueprint $table) {
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('carrier_contact_id')->constrained()->cascadeOnDelete();
            $table->primary(['work_order_id', 'carrier_contact_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_order_carrier_contact');
        Schema::dropIfExists('order_stops');
        Schema::dropIfExists('work_order_updates');
        Schema::dropIfExists('work_orders');
    }
};
