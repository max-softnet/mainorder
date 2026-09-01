<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_order_carrier_contact', function (Blueprint $table) {
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('carrier_contact_id')->constrained()->cascadeOnDelete();
            $table->primary(['work_order_id', 'carrier_contact_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_order_carrier_contact');
    }
};
