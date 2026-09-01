<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RestoreDataSeeder extends Seeder
{
    public function run(): void
    {
        // --- CARRIER ---
        DB::table('carriers')->insertOrIgnore([
            'id'           => 1,
            'denominazione' => 'Sara Logistics',
            'citta'        => 'Gaeta',
            'cap'          => '04024',
            'provincia'    => 'LT',
            'telefono'     => '00002334444',
            'active'       => 1,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        DB::table('carrier_contacts')->insertOrIgnore([
            [
                'id'         => 1,
                'carrier_id' => 1,
                'nome'       => 'Sara',
                'cognome'    => 'Di Cecca',
                'ruolo'      => 'Logistica',
                'email'      => 'massimo.ronza@gmail.com',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id'         => 2,
                'carrier_id' => 1,
                'nome'       => 'Paolo',
                'cognome'    => 'Di Cecca',
                'ruolo'      => null,
                'email'      => 'web@max-soft.net',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // --- CLIENT ---
        DB::table('clients')->insertOrIgnore([
            'id'                     => 1,
            'ragione_sociale'        => 'max-soft.net srl',
            'indirizzo'              => 'P.zza S. Erasmo, 17',
            'citta'                  => 'Formia',
            'cap'                    => '04023',
            'provincia'              => 'LT',
            'email'                  => 'web@max-soft.net',
            'telefono'               => '+393393719925',
            'referente'              => 'Massimo Ronza',
            'fatturazione_indirizzo' => 'P.zza S. Erasmo, 17',
            'fatturazione_citta'     => 'Formia',
            'fatturazione_cap'       => '04023',
            'fatturazione_provincia' => 'LT',
            'supplemento_carico'     => 100.00,
            'supplemento_scarico'    => 10.00,
            'active'                 => 1,
            'created_at'             => now(),
            'updated_at'             => now(),
        ]);

        // --- WORK ORDERS ---
        $orders = [
            [
                'id'                      => 1,
                'numero_ordine'           => '26-0001',
                'status'                  => 'confermato',
                'data_ordine'             => '2026-06-17',
                'cliente_id'              => 1,
                'carrier_id'              => 1,
                'created_by'              => 1,
                'data_carico'             => '2026-06-17',
                'data_scarico'            => '2026-06-19',
                'prezzo_cliente'          => 120.00,
                'supplemento_cliente'     => 110.00,
                'costo_trasportatore'     => 150.00,
                'supplemento_trasportatore' => 11.84,
                'vehicle_type_id'         => 1,
                'n_bancali'               => 1,
                'tipologia_merce'         => 'Scatole',
                'peso'                    => '1000',
                'nome_autista'            => 'Massimo Ronza',
                'rif_ddt'                 => 'sda',
                'inviato'                 => 0,
            ],
            [
                'id'                      => 2,
                'numero_tmp'              => 'TMP-2-1706',
                'status'                  => 'in_attesa',
                'data_ordine'             => '2026-06-17',
                'cliente_id'              => 1,
                'carrier_id'              => 1,
                'created_by'              => 1,
                'data_carico'             => '2026-06-17',
                'data_scarico'            => '2026-06-20',
                'prezzo_cliente'          => 100.00,
                'supplemento_cliente'     => 110.00,
                'costo_trasportatore'     => 99.99,
                'supplemento_trasportatore' => 0,
                'vehicle_type_id'         => 2,
                'nome_autista'            => 'Massimo Ronza',
                'inviato'                 => 0,
            ],
            [
                'id'                      => 3,
                'numero_tmp'              => 'TMP-3-1906',
                'status'                  => 'in_attesa',
                'data_ordine'             => '2026-06-19',
                'cliente_id'              => 1,
                'carrier_id'              => 1,
                'created_by'              => 1,
                'prezzo_cliente'          => 0.10,
                'supplemento_cliente'     => 220.00,
                'costo_trasportatore'     => 0,
                'supplemento_trasportatore' => 0,
                'inviato'                 => 0,
            ],
            [
                'id'                      => 4,
                'numero_ordine'           => '26-0002',
                'status'                  => 'confermato',
                'data_ordine'             => '2026-06-19',
                'cliente_id'              => 1,
                'carrier_id'              => 1,
                'created_by'              => 1,
                'data_carico'             => '2026-06-19',
                'data_scarico'            => '2026-06-21',
                'prezzo_cliente'          => 123.00,
                'supplemento_cliente'     => 110.00,
                'costo_trasportatore'     => 0,
                'supplemento_trasportatore' => 0,
                'inviato'                 => 1,
                'inviato_da'              => 'admin@mainorder.it',
                'inviato_a'               => '—',
                'inviato_il'              => '2026-06-19 05:01:57',
            ],
            [
                'id'                      => 5,
                'numero_ordine'           => '26-0003',
                'status'                  => 'confermato',
                'data_ordine'             => '2026-06-19',
                'cliente_id'              => 1,
                'carrier_id'              => 1,
                'created_by'              => 1,
                'data_carico'             => '2026-06-19',
                'data_scarico'            => '2026-06-20',
                'prezzo_cliente'          => 120.00,
                'supplemento_cliente'     => 110.00,
                'costo_trasportatore'     => 200.00,
                'supplemento_trasportatore' => 0,
                'vehicle_type_id'         => 1,
                'inviato'                 => 1,
                'inviato_da'              => 'admin@mainorder.it',
                'inviato_a'               => '—',
                'inviato_il'              => '2026-06-19 14:51:47',
            ],
            [
                'id'                      => 6,
                'numero_ordine'           => '26-0004',
                'status'                  => 'confermato',
                'data_ordine'             => '2026-06-19',
                'cliente_id'              => 1,
                'carrier_id'              => 1,
                'created_by'              => 1,
                'prezzo_cliente'          => 220.00,
                'supplemento_cliente'     => 110.00,
                'costo_trasportatore'     => 120.00,
                'supplemento_trasportatore' => 12.00,
                'inviato'                 => 1,
                'inviato_da'              => 'admin@mainorder.it',
                'inviato_a'               => 'massimo.ronza@gmail.com',
                'inviato_il'              => '2026-06-19 15:10:22',
            ],
        ];

        foreach ($orders as $order) {
            DB::table('work_orders')->insertOrIgnore(array_merge([
                'supplemento_cliente'       => 0,
                'supplemento_trasportatore' => 0,
                'inviato'                   => 0,
                'confermato_da_fornitore'   => 0,
                'created_at'                => now(),
                'updated_at'                => now(),
            ], $order));
        }

        // Sequenza ordini (anno 2026, ultimo numero = 4)
        DB::table('order_sequences')->insertOrIgnore([
            'anno'               => 2026,
            'ultimo_progressivo' => 4,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        // --- ORDER STOPS ---
        $stops = [
            [9,  1, 'carico',  1, 'max-soft.net srl', 'P.zza S. Erasmo, 17', null,    null,    null],
            [10, 1, 'scarico', 2, 'Di cecca',          'Gaeta',               null,    null,    null],
            [11, 2, 'carico',  1, 'max-soft.net srl', 'P.zza S. Erasmo, 17', null,    null,    null],
            [12, 2, 'scarico', 2, 'Gaeta',             'Via Appi',            null,    null,    null],
            [17, 3, 'carico',  1, 'max-soft.net',     'Piazza San Erasmo, 17','Formia','04023','LT'],
            [18, 3, 'carico',  2, null,               'Via Appia Lato Itri', 'Fondi', '04022','LT'],
            [19, 3, 'scarico', 3, null,               'Lungomare Giovanni Caboto','Gaeta','04024','LT'],
            [20, 3, 'scarico', 4, null,               'Via Scarlatti Napoli', null,    null,    null],
            [23, 4, 'carico',  1, null,               'Via Roma, 04010 Sonnino LT','Sonnino','04010','LT'],
            [24, 4, 'scarico', 2, null,               'Via Cassino, 00158 Roma RM','Roma','00158','RM'],
            [27, 5, 'carico',  1, null,               'P.za Giuseppe Garibaldi, Napoli NA','Napoli',null,'NA'],
            [28, 5, 'scarico', 2, null,               'Piazza Milano, 30016 Lido di Jesolo VE','Lido di Jesolo','30016','VE'],
            [31, 6, 'carico',  1, null,               'P.za Pasquale Mattei, 04023 Formia LT','Formia','04023','LT'],
            [32, 6, 'scarico', 2, null,               'Via Napoli, 81030 Cellole CE','Cellole','81030','CE'],
        ];

        foreach ($stops as [$id, $wo, $tipo, $seq, $rs, $ind, $citta, $cap, $prov]) {
            DB::table('order_stops')->insertOrIgnore([
                'id'             => $id,
                'work_order_id'  => $wo,
                'tipo'           => $tipo,
                'sequenza'       => $seq,
                'ragione_sociale' => $rs,
                'indirizzo'      => $ind,
                'citta'          => $citta,
                'cap'            => $cap,
                'provincia'      => $prov,
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }

        // --- SETTINGS ---
        $settings = [
            'smtp_port'             => '587',
            'smtp_encryption'       => 'tls',
            'mail_from_name'        => 'MainOrder',
            'app_name'              => 'MainOrder',
            'company_payment_terms' => 'PAGAMENTO CON BONIFICO BANCARIO O RI.BA. A 60 DFFM + 15GG (75GG)',
            'company_contract_note' => 'Il presente ordine di trasporto è regolamentato attraverso il contratto di sub-vettore inviatovi attraverso posta elettronica certificata al momento del primo trasporto effettuato tra le nostre aziende.',
            'fic_vat_id'            => '3',
        ];

        foreach ($settings as $key => $value) {
            DB::table('settings')->where('key', $key)->update(['value' => $value]);
        }
    }
}
