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
     * Restituisce la lista clienti da FiC con lo stato (nuovo / aggiornabile / uguale).
     */
    public function preview(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

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
        if (!$request->user()->isAdmin()) abort(403);

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
                $mapped   = $this->mapFields($fc);
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

    private function mapFields(array $fc): array
    {
        // provincia è varchar(5) — tronca a 5 caratteri per sicurezza
        $provincia = mb_substr($fc['address_province'] ?? '', 0, 5) ?: null;

        return [
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
    }

    private function hasDiff(Client $existing, array $mapped): bool
    {
        foreach ($mapped as $key => $value) {
            if ((string)($existing->$key ?? '') !== (string)($value ?? '')) {
                return true;
            }
        }
        return false;
    }
}
