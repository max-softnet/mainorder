<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clients')->cascadeOnDelete();
            $table->string('ragione_sociale');
            $table->string('indirizzo')->nullable();
            $table->string('citta')->nullable();
            $table->string('cap', 10)->nullable();
            $table->string('provincia', 5)->nullable();
            $table->string('provincia_nome')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('place_id')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['cliente_id', 'ragione_sociale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_stops');
    }
};
