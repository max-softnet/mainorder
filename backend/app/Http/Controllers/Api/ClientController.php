<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::query()
            ->when($request->search, fn($q) => $q
                ->where('ragione_sociale', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%")
                ->orWhere('referente', 'like', "%{$request->search}%")
            )
            ->when($request->has('active'), fn($q) => $q->where('active', $request->boolean('active')))
            ->orderBy('ragione_sociale');

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $this->authorizeAdminOrOperatore($request);

        $data = $this->validate($request);
        $client = Client::create($data);

        return response()->json($client, 201);
    }

    public function show(Request $request, Client $client)
    {
        return response()->json($client);
    }

    public function update(Request $request, Client $client)
    {
        $this->authorizeAdminOrOperatore($request);

        $data = $this->validate($request, $client->id);
        $client->update($data);

        return response()->json($client->fresh());
    }

    public function destroy(Request $request, Client $client)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $client->delete();
        return response()->json(['message' => 'Cliente eliminato.']);
    }

    private function authorizeAdminOrOperatore(Request $request)
    {
        $user = $request->user();
        if (!$user->isAdmin() && !$user->isOperatore()) {
            abort(403, 'Non autorizzato.');
        }
    }

    private function validate(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'ragione_sociale'          => 'required|string|max:255',
            'indirizzo'                => 'nullable|string|max:255',
            'citta'                    => 'nullable|string|max:100',
            'cap'                      => 'nullable|string|max:10',
            'provincia'                => 'nullable|string|max:5',
            'email'                    => 'nullable|email|max:255',
            'telefono'                 => 'nullable|string|max:30',
            'sito_web'                 => 'nullable|url|max:255',
            'referente'                => 'nullable|string|max:255',
            'note'                     => 'nullable|string',
            'fatturazione_indirizzo'   => 'nullable|string|max:255',
            'fatturazione_citta'       => 'nullable|string|max:100',
            'fatturazione_cap'         => 'nullable|string|max:10',
            'fatturazione_provincia'   => 'nullable|string|max:5',
            'sdi'                      => 'nullable|string|max:20',
            'codice_fiscale'           => 'nullable|string|max:20',
            'partita_iva'              => 'nullable|string|max:20',
            'supplemento_carico'       => 'nullable|numeric|min:0',
            'supplemento_scarico'      => 'nullable|numeric|min:0',
            'active'                   => 'boolean',
        ]);
    }
}
