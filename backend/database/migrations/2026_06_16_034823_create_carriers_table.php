<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carriers', function (Blueprint $table) {
            $table->id();

            // Dati principali
            $table->string('denominazione');
            $table->string('indirizzo')->nullable();
            $table->string('citta')->nullable();
            $table->string('cap', 10)->nullable();
            $table->string('provincia', 5)->nullable();
            $table->string('telefono')->nullable();
            $table->string('email')->nullable();
            $table->string('sito_web')->nullable();

            // Dati fiscali
            $table->string('partita_iva', 20)->nullable();
            $table->string('codice_fiscale', 20)->nullable();
            $table->string('n_iscrizione_albo')->nullable();

            $table->text('note')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carriers');
    }
};
