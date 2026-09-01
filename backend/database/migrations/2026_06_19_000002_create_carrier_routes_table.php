<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carrier_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('carrier_id')->constrained('carriers')->cascadeOnDelete();
            $table->string('provincia_da', 5);
            $table->string('provincia_a', 5);
            $table->decimal('costo', 10, 2)->nullable();
            $table->decimal('km_totali', 8, 2)->nullable();
            $table->text('note')->nullable();
            $table->foreignId('last_work_order_id')->nullable()->constrained('work_orders')->nullOnDelete();
            $table->timestamps();

            $table->unique(['carrier_id', 'provincia_da', 'provincia_a']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carrier_routes');
    }
};
