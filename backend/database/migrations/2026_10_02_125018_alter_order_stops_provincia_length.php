<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_stops', function (Blueprint $table) {
            $table->string('provincia', 100)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('order_stops', function (Blueprint $table) {
            $table->string('provincia', 5)->nullable()->change();
        });
    }
};
