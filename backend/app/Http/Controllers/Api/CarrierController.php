<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrier;
use Illuminate\Http\Request;

class CarrierController extends Controller
{
    public function index(Request $request)
    {
        $query = Carrier::withCount('contacts')
            ->when($request->search, fn($q) => $q
                ->where('denominazione', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%")
            )
            ->when($request->has('active'), fn($q) => $q->where('active', $request->boolean('active')))
            ->orderBy('denominazione');

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $this->authorizeAdminOrOperatore($request);

        $data = $this->validateCarrier($request);
        $contacts = $this->validateContacts($request);

        $carrier = Carrier::create($data);
        $carrier->contacts()->createMany($contacts);

        return response()->json($carrier->load('contacts'), 201);
    }

    public function show(Request $request, Carrier $carrier)
    {
        return response()->json($carrier->load('contacts'));
    }

    public function update(Request $request, Carrier $carrier)
    {
        $this->authorizeAdminOrOperatore($request);

        $data = $this->validateCarrier($request);
        $carrier->update($data);

        return response()->json($carrier->fresh('contacts'));
    }

    public function destroy(Request $request, Carrier $carrier)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $carrier->delete();
        return response()->json(['message' => 'Trasportatore eliminato.']);
    }

    private function authorizeAdminOrOperatore(Request $request): void
    {
        $user = $request->user();
        if (!$user->isAdmin() && !$user->isOperatore()) {
            abort(403, 'Non autorizzato.');
        }
    }

    private function validateCarrier(Request $request): array
    {
        return $request->validate([
            'denominazione'      => 'required|string|max:255',
            'indirizzo'          => 'nullable|string|max:255',
            'citta'              => 'nullable|string|max:100',
            'cap'                => 'nullable|string|max:10',
            'provincia'          => 'nullable|string|max:5',
            'telefono'           => 'nullable|string|max:30',
            'email'              => 'nullable|email|max:255',
            'sito_web'           => 'nullable|url|max:255',
            'partita_iva'        => 'nullable|string|max:20',
            'codice_fiscale'     => 'nullable|string|max:20',
            'n_iscrizione_albo'  => 'nullable|string|max:100',
            'note'               => 'nullable|string',
            'active'             => 'boolean',
        ]);
    }

    private function validateContacts(Request $request): array
    {
        $request->validate([
            'contacts'             => 'required|array|min:1',
            'contacts.*.cognome'   => 'required|string|max:100',
            'contacts.*.nome'      => 'required|string|max:100',
            'contacts.*.email'     => 'nullable|email|max:255',
            'contacts.*.telefono'  => 'nullable|string|max:30',
            'contacts.*.ruolo'     => 'nullable|string|max:100',
            'contacts.*.note'      => 'nullable|string',
        ]);

        return $request->input('contacts');
    }
}
