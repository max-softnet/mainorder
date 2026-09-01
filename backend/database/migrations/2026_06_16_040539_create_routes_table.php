<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routes', function (Blueprint $table) {
            $table->id();

            // Chiave della tratta
            $table->foreignId('cliente_id')->constrained('clients');
            $table->foreignId('carrier_id')->constrained('carriers');
            $table->string('provincia_da', 5); // sigla prima provincia carico
            $table->string('provincia_a', 5);  // sigla ultima provincia scarico

            // Valori economici
            $table->decimal('prezzo_cliente', 10, 2)->nullable();
            $table->decimal('costo_trasportatore', 10, 2)->nullable();

            // Dati di riferimento (dall'ultimo ordine che ha usato questa tratta)
            $table->decimal('km_totali', 8, 2)->nullable();
            $table->foreignId('last_work_order_id')->nullable()->constrained('work_orders')->nullOnDelete();

            $table->text('note')->nullable();
            $table->timestamps();

            // Una tratta è unica per cliente + trasportatore + da + a
            $table->unique(['cliente_id', 'carrier_id', 'provincia_da', 'provincia_a'], 'routes_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
