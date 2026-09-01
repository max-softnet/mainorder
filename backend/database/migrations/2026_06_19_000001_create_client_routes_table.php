<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clients')->cascadeOnDelete();
            $table->string('provincia_da', 5);
            $table->string('provincia_a', 5);
            $table->decimal('prezzo', 10, 2)->nullable();
            $table->text('note')->nullable();
            $table->foreignId('last_work_order_id')->nullable()->constrained('work_orders')->nullOnDelete();
            $table->timestamps();

            $table->unique(['cliente_id', 'provincia_da', 'provincia_a']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_routes');
    }
};
