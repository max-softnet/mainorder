<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insertOrIgnore([
            'group'       => 'general',
            'key'         => 'maps_countries',
            'label'       => 'Nazioni abilitate (Google Maps)',
            'value'       => 'it,fr,ch,at,si,sm,va,es',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'maps_countries')->delete();
    }
};
