<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // SMTP
            [
                'group'       => 'smtp',
                'key'         => 'smtp_host',
                'value'       => env('MAIL_HOST', ''),
                'type'        => 'string',
                'label'       => 'Server SMTP',
                'description' => 'Hostname del server SMTP (es. smtp.gmail.com)',
            ],
            [
                'group'       => 'smtp',
                'key'         => 'smtp_port',
                'value'       => env('MAIL_PORT', '587'),
                'type'        => 'integer',
                'label'       => 'Porta SMTP',
                'description' => '587 per TLS, 465 per SSL, 25 per nessuna cifratura',
            ],
            [
                'group'       => 'smtp',
                'key'         => 'smtp_encryption',
                'value'       => env('MAIL_ENCRYPTION', 'tls'),
                'type'        => 'string',
                'label'       => 'Cifratura',
                'description' => 'tls, ssl oppure lasciare vuoto',
            ],
            [
                'group'       => 'smtp',
                'key'         => 'smtp_username',
                'value'       => env('MAIL_USERNAME', ''),
                'type'        => 'string',
                'label'       => 'Username SMTP',
                'description' => 'Di solito l\'indirizzo email mittente',
            ],
            [
                'group'       => 'smtp',
                'key'         => 'smtp_password',
                'value'       => env('MAIL_PASSWORD', ''),
                'type'        => 'password',
                'label'       => 'Password SMTP',
                'description' => 'Password o App Password (es. Google)',
            ],
            [
                'group'       => 'smtp',
                'key'         => 'mail_from_address',
                'value'       => env('MAIL_FROM_ADDRESS', ''),
                'type'        => 'string',
                'label'       => 'Indirizzo mittente',
                'description' => 'Email visualizzata come mittente nelle notifiche',
            ],
            [
                'group'       => 'smtp',
                'key'         => 'mail_from_name',
                'value'       => env('MAIL_FROM_NAME', 'MainOrder'),
                'type'        => 'string',
                'label'       => 'Nome mittente',
                'description' => 'Nome visualizzato come mittente',
            ],

            // Generale
            [
                'group'       => 'general',
                'key'         => 'app_name',
                'value'       => 'MainOrder',
                'type'        => 'string',
                'label'       => 'Nome applicazione',
                'description' => 'Mostrato nelle email e nell\'intestazione',
            ],
            [
                'group'       => 'general',
                'key'         => 'app_logo_path',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Logo aziendale',
                'description' => 'Path interno del logo caricato (gestito automaticamente)',
            ],

            // Dati aziendali (intestazione e piè di pagina PDF)
            [
                'group'       => 'company',
                'key'         => 'company_name',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Nome azienda',
                'description' => 'Visualizzato in alto a destra nel PDF',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_address',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Indirizzo',
                'description' => 'Es. Via Roma 1',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_city',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'CAP, Città (Provincia)',
                'description' => 'Es. 00137 Roma (RM)',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_piva',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'P.IVA',
                'description' => 'Es. 12345678901',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_legal_name',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Ragione sociale legale',
                'description' => 'Visualizzata nel footer del PDF (es. Di Cecca S.r.l.)',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_capitale_sociale',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Capitale sociale',
                'description' => 'Es. 100.000,00 € i.v.',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_sede_legale',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Sede legale',
                'description' => 'Indirizzo completo sede legale per footer PDF',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_registro_imprese',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Registro Imprese / CF / P.IVA',
                'description' => 'Codice fiscale/partita IVA per footer',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_email',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Email aziendale',
                'description' => 'Visualizzata nel footer del PDF',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_rea',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'R.E.A.',
                'description' => 'Es. LT153000',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_albo_autotrasportatori',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Iscrizione Albo Autotrasportatori',
                'description' => 'Es. LT6205101E',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_albo_spedizionieri',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Albo Spedizionieri',
                'description' => 'Es. RM639',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_website',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Sito web',
                'description' => 'Es. www.azienda.it',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_payment_terms',
                'value'       => 'PAGAMENTO CON BONIFICO BANCARIO O RI.BA. A 60 DFFM + 15GG (75GG)',
                'type'        => 'string',
                'label'       => 'Condizioni di pagamento',
                'description' => 'Testo libero — stampato nel PDF',
            ],
            [
                'group'       => 'company',
                'key'         => 'company_contract_note',
                'value'       => 'Il presente ordine di trasporto è regolamentato attraverso il contratto di sub-vettore inviatovi attraverso posta elettronica certificata al momento del primo trasporto effettuato tra le nostre aziende.',
                'type'        => 'string',
                'label'       => 'Nota contratto (PDF)',
                'description' => 'Testo libero — stampato nel PDF sotto le condizioni di pagamento',
            ],
        ];

        foreach ($settings as $s) {
            Setting::firstOrCreate(['key' => $s['key']], $s);
        }
    }
}
