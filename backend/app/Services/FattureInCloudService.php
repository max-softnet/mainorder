<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Setting;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FattureInCloudService
{
    private string $baseUrl = 'https://api.fattureincloud.it/v2';

    private function token(): string
    {
        $token = Setting::get('fic_access_token');
        if (empty($token)) {
            throw new \RuntimeException('Access Token Fatture in Cloud non configurato.');
        }
        return $token;
    }

    private function companyId(): string
    {
        $id = Setting::get('fic_company_id');
        if (empty($id)) {
            throw new \RuntimeException('Company ID Fatture in Cloud non configurato.');
        }
        return $id;
    }

    private function vatId(): int
    {
        return (int) (Setting::get('fic_vat_id') ?: 3);
    }

    private function paymentMethodId(): ?int
    {
        $id = Setting::get('fic_payment_method_id');
        return filled($id) ? (int) $id : null;
    }

    private function headers(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->token(),
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
        ];
    }

    /**
     * Verifica la connessione all'API FiC.
     * Restituisce info sull'azienda o lancia eccezione.
     */
    public function testConnection(): array
    {
        $response = Http::withHeaders($this->headers())
            ->get("{$this->baseUrl}/c/{$this->companyId()}/info");

        if ($response->failed()) {
            $msg = $response->json('error.message') ?? $response->body();
            throw new \RuntimeException("Errore connessione FiC: {$msg}");
        }

        return $response->json('data') ?? [];
    }

    /**
     * Crea una fattura per un cliente con la lista degli ordini.
     * Restituisce i dati della fattura creata.
     */
    public function createInvoice(Client $client, array $orders): array
    {
        $items = [];
        $vatId = $this->vatId();

        foreach ($orders as $order) {
            $tratta   = $this->buildTratta($order);
            $dataStr  = $order->data_carico
                ? $order->data_carico->format('d/m/Y')
                : '—';

            $nomeTrasporto = trim("Trasporto {$order->numero_ordine} – {$tratta} del {$dataStr}");
            if ($order->rif_ddt) {
                $nomeTrasporto .= " (DDT: {$order->rif_ddt})";
            }

            $items[] = [
                'name'      => $nomeTrasporto,
                'qty'       => 1,
                'net_price' => (float) ($order->prezzo_cliente ?? 0),
                'vat'       => ['id' => $vatId],
            ];

            // Riga supplemento se presente
            if ($order->supplemento_cliente > 0) {
                $items[] = [
                    'name'      => "Supplemento ordine {$order->numero_ordine}",
                    'qty'       => 1,
                    'net_price' => (float) $order->supplemento_cliente,
                    'vat'       => ['id' => $vatId],
                ];
            }
        }

        $body = [
            'data' => [
                'type'   => 'invoice',
                'date'   => now()->format('Y-m-d'),
                'entity' => $this->buildEntity($client),
                'items_list' => $items,
                'currency' => ['id' => 'EUR', 'exchange_rate' => '1.00000', 'symbol' => '€'],
                'language' => ['code' => 'it', 'name' => 'Italiano'],
            ],
        ];

        // Aggiungi metodo di pagamento se configurato
        $pmId = $this->paymentMethodId();
        if ($pmId) {
            $body['data']['payment_method'] = ['id' => $pmId];
        }

        // Abilita e-invoice se il cliente ha SDI
        if (filled($client->sdi)) {
            $body['data']['e_invoice'] = true;
            $body['data']['ei_data']   = ['vat_kind' => 'I'];
        }

        $response = Http::withHeaders($this->headers())
            ->post("{$this->baseUrl}/c/{$this->companyId()}/issued_documents", $body);

        if ($response->failed()) {
            $msg = $response->json('error.message') ?? $response->body();
            Log::error('FiC createInvoice error', ['client' => $client->id, 'body' => $response->body()]);
            throw new \RuntimeException("Errore creazione fattura FiC: {$msg}");
        }

        return $response->json('data') ?? [];
    }

    private function buildEntity(Client $client): array
    {
        $entity = [
            'name'                 => $client->ragione_sociale,
            'address_street'       => $client->fatturazione_indirizzo ?: $client->indirizzo,
            'address_postal_code'  => $client->fatturazione_cap ?: $client->cap,
            'address_city'         => $client->fatturazione_citta ?: $client->citta,
            'address_province'     => $client->fatturazione_provincia ?: $client->provincia,
            'country'              => 'Italia',
        ];

        if (filled($client->partita_iva)) {
            $entity['vat_number'] = $client->partita_iva;
        }
        if (filled($client->codice_fiscale)) {
            $entity['tax_code'] = $client->codice_fiscale;
        }
        if (filled($client->sdi)) {
            $entity['e_invoice'] = true;
            $entity['ei_code']   = $client->sdi;
        }

        return $entity;
    }

    private function buildTratta(WorkOrder $order): string
    {
        $stops = $order->relationLoaded('stops') ? $order->stops : collect();
        $carico  = $stops->where('tipo', 'carico')->sortBy('sequenza')->first();
        $scarico = $stops->where('tipo', 'scarico')->sortByDesc('sequenza')->first();

        $da = $carico?->provincia ?: ($carico?->citta ?: null);
        $a  = $scarico?->provincia ?: ($scarico?->citta ?: null);

        if ($da && $a) return "{$da}→{$a}";
        if ($da)      return "da {$da}";
        if ($a)       return "a {$a}";

        return '';
    }
}
