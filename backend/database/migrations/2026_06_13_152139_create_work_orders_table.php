<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // es. ORD-2026-0001
            $table->enum('status', ['bozza', 'confermato', 'in_lavorazione', 'in_transito', 'consegnato', 'annullato'])->default('bozza');

            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('cliente_id')->constrained('users');
            $table->foreignId('trasportatore_id')->nullable()->constrained('users');

            // Ritiro
            $table->string('pickup_address');
            $table->string('pickup_city');
            $table->string('pickup_cap')->nullable();
            $table->date('pickup_date')->nullable();
            $table->time('pickup_time_from')->nullable();
            $table->time('pickup_time_to')->nullable();

            // Consegna
            $table->string('delivery_address');
            $table->string('delivery_city');
            $table->string('delivery_cap')->nullable();
            $table->date('delivery_date')->nullable();
            $table->time('delivery_time_from')->nullable();
            $table->time('delivery_time_to')->nullable();

            // Merce
            $table->text('goods_description')->nullable();
            $table->decimal('weight_kg', 8, 2)->nullable();
            $table->integer('packages')->nullable();
            $table->string('dimensions')->nullable();

            // Campi aggiornabili dal trasportatore
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->string('delivery_signature')->nullable();
            $table->text('trasportatore_notes')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
