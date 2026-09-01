<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $rows = [
            [
                'group'       => 'fatturazione',
                'key'         => 'fic_access_token',
                'value'       => null,
                'type'        => 'password',
                'label'       => 'Access Token',
                'description' => 'Token OAuth2 ottenuto dal portale Fatture in Cloud → Impostazioni → API.',
            ],
            [
                'group'       => 'fatturazione',
                'key'         => 'fic_company_id',
                'value'       => null,
                'type'        => 'string',
                'label'       => 'Company ID',
                'description' => 'ID numerico dell\'azienda in Fatture in Cloud (visibile nell\'URL del portale).',
            ],
            [
                'group'       => 'fatturazione',
                'key'         => 'fic_vat_id',
                'value'       => '3',
                'type'        => 'string',
                'label'       => 'ID Aliquota IVA',
                'description' => 'ID dell\'aliquota IVA in FiC (default 3 = 22%). Verificare nelle impostazioni di FiC → IVA.',
            ],
            [
                'group'       => 'fatturazione',
                'key'         => 'fic_payment_method_id',
                'value'       => null,
                'type'        => 'string',
                'label'       => 'ID Metodo di Pagamento',
                'description' => 'Opzionale. ID del metodo di pagamento da associare alla fattura (es. bonifico bancario).',
            ],
        ];

        foreach ($rows as $row) {
            DB::table('settings')->insertOrIgnore(array_merge($row, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', [
            'fic_access_token', 'fic_company_id', 'fic_vat_id', 'fic_payment_method_id',
        ])->delete();
    }
};
