<?php

namespace Database\Seeders;

use App\Models\VehicleType;
use Illuminate\Database\Seeder;

class VehicleTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            'Bilico',
            'Bilico Aperto',
            'Bilico Centinato',
            'CNT 40" HC',
            'Motrice',
            'Cingolato',
        ];

        foreach ($types as $i => $nome) {
            VehicleType::firstOrCreate(
                ['nome' => $nome],
                ['ordine' => $i + 1, 'active' => true]
            );
        }
    }
}
