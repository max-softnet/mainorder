<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\FattureInCloudService;
use Illuminate\Http\Request;

class FicSyncController extends Controller
{
    public function __construct(private FattureInCloudService $fic) {}

    /**
     * Aggiorna fic_default_vat su tutti i clienti locali con fic_id.
     */
    public function syncVat(Request $request)
    {
        if (!$request->user()->isAdmin() && !$request->user()->isOperatore()) abort(403);

        $request->validate(['fic_ids' => 'nullable|array', 'fic_ids.*' => 'integer']);

        $query   = Client::whereNotNull('fic_id');
        if ($request->filled('fic_ids')) {
            $query->whereIn('fic_id', $request->fic_ids);
        }
        $clients = $query->get();
        $updated = 0;
        $errors  = [];

        foreach ($clients as $client) {
            try {
                $detail = $this->fic->getClient((int) $client->fic_id);
                $vat    = $detail['default_vat']['value'] ?? null;
                $vatId  = isset($detail['default_vat']['id']) ? (int) $detail['default_vat']['id'] : null;
                if ($vat !== null) {
                    $client->update(['fic_default_vat' => (float) $vat, 'fic_default_vat_id' => $vatId]);
                    $updated++;
                }
            } catch (\Exception $e) {
                $errors[] = "{$client->ragione_sociale}: {$e->getMessage()}";
            }
        }

        return response()->json(['updated' => $updated, 'errors' => $errors]);
    }

    /**
     * Restituisce la lista clienti da FiC con lo stato (nuovo / aggiornabile / uguale).
     */
    public function preview(Request $request)
    {
        if (!$request->user()->isAdmin() && !$request->user()->isOperatore()) abort(403);

        $ficClients = $this->fic->listClients();
        $result     = [];

        foreach ($ficClients as $fc) {
            $ficId    = $fc['id'] ?? null;
            $existing = $ficId ? Client::withTrashed()->where('fic_id', $ficId)->first() : null;

            $mapped = $this->mapFields($fc);

            if (!$existing) {
                $status = 'new';
            } else {
                $diff = $this->hasDiff($existing, $mapped);
                $status = $diff ? 'update' : 'same';
            }

            $result[] = [
                'fic_id'          => $ficId,
                'ragione_sociale' => $fc['name'] ?? '',
                'partita_iva'     => $fc['vat_number'] ?? '',
                'email'           => $fc['email'] ?? '',
                'citta'           => $fc['address_city'] ?? '',
                'status'          => $status,
                'local_id'        => $existing?->id,
                'deleted'         => $existing?->deleted_at !== null,
            ];
        }

        return response()->json($result);
    }

    /**
     * Importa o aggiorna i clienti selezionati.
     * Body: { fic_ids: [1, 2, ...] }
     */
    public function import(Request $request)
    {
        if (!$request->user()->isAdmin() && !$request->user()->isOperatore()) abort(403);

        $request->validate([
            'fic_ids'   => 'required|array|min:1',
            'fic_ids.*' => 'integer',
        ]);

        $ficClients = $this->fic->listClients();
        $byId       = collect($ficClients)->keyBy('id');

        $imported = 0;
        $updated  = 0;
        $errors   = [];

        foreach ($request->fic_ids as $ficId) {
            $fc = $byId->get($ficId);
            if (!$fc) {
                $errors[] = "ID FiC {$ficId} non trovato.";
                continue;
            }

            try {
                $detail   = $this->fic->getClient($ficId);
                $mapped   = $this->mapFields($detail ?: $fc);
                $existing = Client::withTrashed()->where('fic_id', $ficId)->first();

                if ($existing) {
                    if ($existing->deleted_at) $existing->restore();
                    $existing->update($mapped);
                    $updated++;
                } else {
                    Client::create(array_merge($mapped, ['fic_id' => $ficId, 'active' => true]));
                    $imported++;
                }
            } catch (\Exception $e) {
                $errors[] = "Errore su {$fc['name']}: {$e->getMessage()}";
            }
        }

        return response()->json([
            'imported' => $imported,
            'updated'  => $updated,
            'errors'   => $errors,
        ]);
    }

    public function clientPreview(Request $request, Client $client)
    {
        if (!$request->user()->isAdmin() && !$request->user()->isOperatore()) abort(403);
        if (!$client->fic_id) return response()->json(['error' => 'Cliente non collegato a FiC.'], 422);

        $detail = $this->fic->getClient((int) $client->fic_id);
        $mapped = $this->mapFields($detail);

        $labels = [
            'ragione_sociale'        => 'Ragione sociale',
            'partita_iva'            => 'P.IVA',
            'codice_fiscale'         => 'Cod. Fiscale',
            'sdi'                    => 'Codice SDI',
            'email'                  => 'Email',
            'telefono'               => 'Telefono',
            'indirizzo'              => 'Indirizzo',
            'citta'                  => 'Città',
            'cap'                    => 'CAP',
            'provincia'              => 'Provincia',
            'fatturazione_indirizzo' => 'Ind. fatturazione',
            'fatturazione_citta'     => 'Città fatturazione',
            'fatturazione_cap'       => 'CAP fatturazione',
            'fatturazione_provincia' => 'Prov. fatturazione',
            'fic_default_vat'        => 'Aliquota IVA',
            'fic_default_vat_id'     => 'ID IVA FiC',
        ];

        $diff = [];
        foreach ($mapped as $key => $ficValue) {
            $localValue = $client->$key ?? null;
            if ($this->normalize($localValue) !== $this->normalize($ficValue)) {
                $diff[] = [
                    'field'  => $key,
                    'label'  => $labels[$key] ?? $key,
                    'local'  => $localValue,
                    'fic'    => $ficValue,
                ];
            }
        }

        return response()->json(['diff' => $diff, 'fic_data' => $mapped]);
    }

    public function clientSync(Request $request, Client $client)
    {
        if (!$request->user()->isAdmin() && !$request->user()->isOperatore()) abort(403);
        if (!$client->fic_id) return response()->json(['error' => 'Cliente non collegato a FiC.'], 422);

        $detail = $this->fic->getClient((int) $client->fic_id);
        $mapped = $this->mapFields($detail);
        $client->update($mapped);

        return response()->json(['success' => true, 'client' => $client->fresh()]);
    }

    private function mapFields(array $fc): array
    {
        $provincia = mb_substr($fc['address_province'] ?? '', 0, 5) ?: null;

        $mapped = [
            'ragione_sociale'          => $fc['name'] ?? '',
            'partita_iva'              => $fc['vat_number'] ?? null,
            'codice_fiscale'           => $fc['tax_code'] ?? null,
            'sdi'                      => $fc['ei_code'] ?? null,
            'email'                    => $fc['email'] ?? null,
            'telefono'                 => $fc['phone'] ?? null,
            'indirizzo'                => $fc['address_street'] ?? null,
            'citta'                    => $fc['address_city'] ?? null,
            'cap'                      => mb_substr($fc['address_postal_code'] ?? '', 0, 10) ?: null,
            'provincia'                => $provincia,
            'fatturazione_indirizzo'   => $fc['address_street'] ?? null,
            'fatturazione_citta'       => $fc['address_city'] ?? null,
            'fatturazione_cap'         => mb_substr($fc['address_postal_code'] ?? '', 0, 10) ?: null,
            'fatturazione_provincia'   => $provincia,
        ];

        // default_vat è presente solo nella risposta getClient (dettaglio), non nella lista
        if (array_key_exists('default_vat', $fc)) {
            $mapped['fic_default_vat']    = $fc['default_vat']['value'] !== null ? (float) $fc['default_vat']['value'] : null;
            $mapped['fic_default_vat_id'] = isset($fc['default_vat']['id']) ? (int) $fc['default_vat']['id'] : null;
        }

        return $mapped;
    }

    private function normalize($value): string
    {
        if ($value === null || $value === '') return '';
        if (is_numeric($value)) return (string)(float)$value;
        return (string)$value;
    }

    private function hasDiff(Client $existing, array $mapped): bool
    {
        foreach ($mapped as $key => $value) {
            if ($this->normalize($existing->$key ?? null) !== $this->normalize($value)) {
                return true;
            }
        }
        return false;
    }
}
