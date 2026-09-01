<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();

            // Anagrafica
            $table->string('ragione_sociale');
            $table->string('indirizzo')->nullable();
            $table->string('citta')->nullable();
            $table->string('cap', 10)->nullable();
            $table->string('provincia', 5)->nullable();
            $table->string('email')->nullable();
            $table->string('telefono')->nullable();
            $table->string('sito_web')->nullable();
            $table->string('referente')->nullable();
            $table->text('note')->nullable();

            // Sede Legale / Fatturazione
            $table->string('fatturazione_indirizzo')->nullable();
            $table->string('fatturazione_citta')->nullable();
            $table->string('fatturazione_cap', 10)->nullable();
            $table->string('fatturazione_provincia', 5)->nullable();
            $table->string('sdi', 20)->nullable();
            $table->string('codice_fiscale', 20)->nullable();
            $table->string('partita_iva', 20)->nullable();

            // Supplementi (prezzi fissi da conteggiare negli ordini)
            $table->decimal('supplemento_carico', 8, 2)->nullable();
            $table->decimal('supplemento_scarico', 8, 2)->nullable();

            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
