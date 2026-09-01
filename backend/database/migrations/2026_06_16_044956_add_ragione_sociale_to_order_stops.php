<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_stops', function (Blueprint $table) {
            $table->string('ragione_sociale')->nullable()->after('work_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('order_stops', function (Blueprint $table) {
            $table->dropColumn('ragione_sociale');
        });
    }
};
