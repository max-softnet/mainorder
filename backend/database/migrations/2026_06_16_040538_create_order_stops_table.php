<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->enum('tipo', ['carico', 'scarico']);
            $table->unsignedSmallInteger('sequenza'); // ordine della tappa

            // Indirizzo (compilato da Google Places)
            $table->string('indirizzo')->nullable();
            $table->string('citta')->nullable();
            $table->string('cap', 10)->nullable();
            $table->string('provincia', 5)->nullable(); // sigla, es. "LT"
            $table->string('provincia_nome')->nullable(); // nome esteso, es. "Latina"

            // Coordinate Google
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('place_id')->nullable(); // Google Place ID

            // Logistica
            $table->date('data')->nullable();
            $table->time('ora_da')->nullable();
            $table->time('ora_a')->nullable();
            $table->text('note')->nullable();

            // Km dal punto precedente (calcolato da Distance Matrix)
            $table->decimal('km_da_precedente', 8, 2)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_stops');
    }
};
