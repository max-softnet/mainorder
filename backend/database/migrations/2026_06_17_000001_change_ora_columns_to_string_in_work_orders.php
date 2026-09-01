<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->string('ora_carico', 20)->nullable()->change();
            $table->string('ora_scarico', 20)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->time('ora_carico')->nullable()->change();
            $table->time('ora_scarico')->nullable()->change();
        });
    }
};
