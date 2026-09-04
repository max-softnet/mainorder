<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insertOrIgnore([
            'group'       => 'general',
            'key'         => 'google_maps_key',
            'value'       => '',
            'type'        => 'password',
            'label'       => 'Google Maps API Key',
            'description' => 'Chiave API per autocompletamento indirizzi. Richiede Maps JavaScript API e Places API (New) abilitati.',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'google_maps_key')->delete();
    }
};
