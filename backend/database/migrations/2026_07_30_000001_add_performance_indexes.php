<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // work_orders — colonne usate in WHERE, ORDER BY e JOIN
        Schema::table('work_orders', function (Blueprint $table) {
            $table->index('status');
            $table->index('cliente_id');
            $table->index('carrier_id');
            $table->index('data_carico');
            $table->index('deleted_at');
            $table->index('created_at');
            $table->index(['status', 'cliente_id']);
            $table->index(['status', 'data_carico']);
        });

        // order_stops — FK senza indice: full scan per ogni ordine caricato
        Schema::table('order_stops', function (Blueprint $table) {
            $table->index('work_order_id');
        });

        // clients
        Schema::table('clients', function (Blueprint $table) {
            $table->index('ragione_sociale');
            $table->index('deleted_at');
            $table->index('active');
        });

        // carriers
        Schema::table('carriers', function (Blueprint $table) {
            $table->index('denominazione');
            $table->index('deleted_at');
        });

        // carrier_contacts — caricati con ogni trasportatore
        Schema::table('carrier_contacts', function (Blueprint $table) {
            $table->index('carrier_id');
        });

        // client_routes / carrier_routes — usati nel listino tratte
        Schema::table('client_routes', function (Blueprint $table) {
            $table->index('cliente_id');
            $table->index(['cliente_id', 'provincia_da', 'provincia_a']);
        });

        Schema::table('carrier_routes', function (Blueprint $table) {
            $table->index('carrier_id');
            $table->index(['carrier_id', 'provincia_da', 'provincia_a']);
        });

        // Abilita WAL mode su SQLite: letture non bloccano le scritture
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA journal_mode=WAL');
            DB::statement('PRAGMA synchronous=NORMAL');
            DB::statement('PRAGMA cache_size=-64000'); // 64MB cache
            DB::statement('PRAGMA temp_store=MEMORY');
        }
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['cliente_id']);
            $table->dropIndex(['carrier_id']);
            $table->dropIndex(['data_carico']);
            $table->dropIndex(['deleted_at']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['status', 'cliente_id']);
            $table->dropIndex(['status', 'data_carico']);
        });

        Schema::table('order_stops', function (Blueprint $table) {
            $table->dropIndex(['work_order_id']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex(['ragione_sociale']);
            $table->dropIndex(['deleted_at']);
            $table->dropIndex(['active']);
        });

        Schema::table('carriers', function (Blueprint $table) {
            $table->dropIndex(['denominazione']);
            $table->dropIndex(['deleted_at']);
        });

        Schema::table('carrier_contacts', function (Blueprint $table) {
            $table->dropIndex(['carrier_id']);
        });

        Schema::table('client_routes', function (Blueprint $table) {
            $table->dropIndex(['cliente_id']);
            $table->dropIndex(['cliente_id', 'provincia_da', 'provincia_a']);
        });

        Schema::table('carrier_routes', function (Blueprint $table) {
            $table->dropIndex(['carrier_id']);
            $table->dropIndex(['carrier_id', 'provincia_da', 'provincia_a']);
        });

    }
};
