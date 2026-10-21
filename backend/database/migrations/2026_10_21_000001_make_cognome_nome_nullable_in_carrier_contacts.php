<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('carrier_contacts', function (Blueprint $table) {
            $table->string('cognome')->nullable()->change();
            $table->string('nome')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('carrier_contacts', function (Blueprint $table) {
            $table->string('cognome')->nullable(false)->change();
            $table->string('nome')->nullable(false)->change();
        });
    }
};
