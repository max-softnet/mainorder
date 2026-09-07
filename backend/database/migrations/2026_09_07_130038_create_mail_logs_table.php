<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('tipo')->default('conferma_ordine'); // conferma_ordine, reinvio
            $table->text('destinatari');
            $table->enum('stato', ['inviata', 'errore'])->default('inviata');
            $table->text('errore')->nullable();
            $table->foreignId('inviata_da')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_logs');
    }
};
