<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\WorkOrderConfirmed;
use App\Models\Client;
use App\Models\ClientRoute;
use App\Models\CarrierRoute;
use App\Models\Setting;
use App\Models\WorkOrder;
use App\Models\WorkOrderUpdate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class WorkOrderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $relations = ['cliente', 'carrier', 'vehicleType', 'creator'];
        if ($request->boolean('with_stops')) {
            $relations[] = 'stops';
        }

        $query = WorkOrder::with($relations)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->cliente_id, fn($q) => $q->where('cliente_id', $request->cliente_id))
            ->when($request->carrier_id, fn($q) => $q->where('carrier_id', $request->carrier_id))
            ->when($request->data_carico, fn($q) => $q->whereDate('data_carico', $request->data_carico))
            ->when($request->data_da, fn($q) => $q->whereDate('data_carico', '>=', $request->data_da))
            ->when($request->data_a, fn($q) => $q->whereDate('data_carico', '<=', $request->data_a))
            ->when($request->search, fn($q) => $q
                ->where('numero_ordine', 'like', "%{$request->search}%")
                ->orWhere('numero_tmp', 'like', "%{$request->search}%")
            );

        if ($user->isCliente()) {
            $query->where('cliente_id', $user->id);
        } elseif ($user->isTrasportatore()) {
            $query->where('carrier_id', $user->id);
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function store(Request $request)
    {
        $this->authorizeAdminOrOperatore($request);
        $data = $this->validateOrder($request);

        $data = $this->normalizeNumericFields($data);

        $order = WorkOrder::create([
            ...$data,
            'created_by' => $request->user()->id,
            'status'     => 'in_attesa',
        ]);

        // Assegna numero TMP
        $order->update(['numero_tmp' => WorkOrder::generateTmp($order->id)]);

        // Salva tappe
        if (!empty($data['stops'])) {
            $order->stops()->createMany($data['stops']);
        }

        // Salva referenti selezionati
        if (!empty($data['carrier_contact_ids'])) {
            $order->carrierContacts()->sync($data['carrier_contact_ids']);
        }

        // Aggiorna listino tratte
        $this->syncRoute($order);

        return response()->json($this->loadFull($order), 201);
    }

    public function show(Request $request, WorkOrder $workOrder)
    {
        $user = $request->user();
        if ($user->isCliente() && $workOrder->cliente_id !== $user->id) abort(403);
        if ($user->isTrasportatore() && $workOrder->carrier_id !== $user->id) abort(403);

        return response()->json($this->loadFull($workOrder));
    }

    public function update(Request $request, WorkOrder $workOrder)
    {
        $user = $request->user();

        // Trasportatore: solo campi permessi
        if ($user->isTrasportatore()) {
            abort_if($workOrder->carrier_id !== $user->id, 403);
            $data = $request->validate([
                'nome_autista'            => 'nullable|string',
                'targa_motrice'           => 'nullable|string',
                'targa_rimorchio'         => 'nullable|string',
                'confermato_da_fornitore' => 'boolean',
            ]);
            $workOrder->update(array_intersect_key($data, array_flip(WorkOrder::CARRIER_FIELDS)));
            return response()->json($workOrder->fresh());
        }

        $this->authorizeAdminOrOperatore($request);
        $data = $this->validateOrder($request, $workOrder->id);

        $oldStatus = $workOrder->status;
        $newStatus = $data['status'] ?? $oldStatus;

        // Gestione cambio stato → confermato
        if ($newStatus === 'confermato' && $oldStatus === 'in_attesa') {
            $mittente    = $user->email;
            $contacts    = $workOrder->carrierContacts()->get();
            $destinatari = $contacts->pluck('email')->filter()->implode(', ');
            $workOrder->conferma($mittente, $destinatari ?: '—');
            unset($data['status']);

            // Invio email con PDF allegato
            try {
                Setting::applySmtp();
                $workOrder->load(['cliente', 'carrier', 'vehicleType', 'stops']);
                $mailable = new WorkOrderConfirmed($workOrder);

                // Al mittente (utente che conferma)
                Mail::to($user->email)->send($mailable);

                // Ai contatti del trasportatore
                $emailsContatti = $contacts->pluck('email')->filter()->values();
                if ($emailsContatti->isNotEmpty()) {
                    Mail::to($emailsContatti->toArray())->send(new WorkOrderConfirmed($workOrder));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Invio mail ordine fallito: ' . $e->getMessage());
            }
        }

        // Traccia altri cambi stato
        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            WorkOrderUpdate::create([
                'work_order_id' => $workOrder->id,
                'user_id'       => $user->id,
                'status_from'   => $oldStatus,
                'status_to'     => $data['status'],
            ]);
        }

        $data = $this->normalizeNumericFields($data);

        $workOrder->update(array_diff_key($data, ['stops' => 1, 'carrier_contact_ids' => 1]));

        // Aggiorna tappe
        if (isset($data['stops'])) {
            $workOrder->stops()->delete();
            $workOrder->stops()->createMany($data['stops']);
        }

        // Aggiorna referenti
        if (isset($data['carrier_contact_ids'])) {
            $workOrder->carrierContacts()->sync($data['carrier_contact_ids']);
        }

        $this->syncRoute($workOrder->fresh());

        return response()->json($this->loadFull($workOrder->fresh()));
    }

    public function destroy(Request $request, WorkOrder $workOrder)
    {
        if (!$request->user()->isAdmin()) abort(403);
        $workOrder->delete();
        return response()->json(['message' => 'Ordine eliminato.']);
    }

    // Endpoint per ottenere suggerimento tratta + supplementi cliente
    public function prepareData(Request $request)
    {
        $this->authorizeAdminOrOperatore($request);

        $request->validate([
            'cliente_id'   => 'required|exists:clients,id',
            'carrier_id'   => 'required|exists:carriers,id',
            'provincia_da' => 'nullable|string|max:5',
            'provincia_a'  => 'nullable|string|max:5',
        ]);

        $cliente = Client::find($request->cliente_id);
        $result = [
            'supplemento_cliente'      => $cliente->supplemento_carico ?? 0,
            'supplemento_trasportatore' => 0,
            'route_suggestion'         => null,
        ];

        if ($request->provincia_da && $request->provincia_a) {
            $da = strtoupper($request->provincia_da);
            $a  = strtoupper($request->provincia_a);

            $clientRoute = ClientRoute::where('cliente_id', $request->cliente_id)
                ->where('provincia_da', $da)
                ->where('provincia_a', $a)
                ->first();

            $carrierRoute = CarrierRoute::where('carrier_id', $request->carrier_id)
                ->where('provincia_da', $da)
                ->where('provincia_a', $a)
                ->first();

            if ($clientRoute || $carrierRoute) {
                $result['route_suggestion'] = [
                    'prezzo_cliente'      => $clientRoute?->prezzo,
                    'costo_trasportatore' => $carrierRoute?->costo,
                    'km_totali'           => $carrierRoute?->km_totali,
                    'last_used'           => ($clientRoute?->updated_at ?? $carrierRoute?->updated_at)?->format('d/m/Y'),
                ];
            }
        }

        return response()->json($result);
    }

    private function normalizeNumericFields(array $data): array
    {
        foreach (['prezzo_cliente', 'supplemento_cliente', 'costo_trasportatore', 'supplemento_trasportatore'] as $field) {
            $data[$field] = isset($data[$field]) && $data[$field] !== null ? $data[$field] : 0;
        }
        return $data;
    }

    private function geocodeProvincia($stop): string
    {
        $q = implode(', ', array_filter([$stop->indirizzo, $stop->citta]));
        if (!$q) return '';
        try {
            $res = \Illuminate\Support\Facades\Http::withHeaders(['User-Agent' => 'MainOrder/1.0'])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'q' => $q, 'format' => 'json', 'addressdetails' => 1,
                    'countrycodes' => 'it', 'limit' => 1,
                ]);
            $item = $res->json()[0] ?? null;
            if (!$item) return '';
            $iso = $item['ISO3166-2-lvl6'] ?? ($item['address']['ISO3166-2-lvl6'] ?? '');
            if (str_contains($iso, '-')) {
                $prov = explode('-', $iso)[1] ?? '';
                // Salva per evitare di geocodificare di nuovo
                $stop->update(['provincia' => $prov]);
                return $prov;
            }
        } catch (\Exception $e) {}
        return '';
    }

    private function syncRoute(WorkOrder $order): void
    {
        // Solo ordini confermati aggiornano il listino
        if (!in_array($order->status, ['confermato', 'chiuso', 'fatturato'])) return;

        $stops = $order->stops()->get();
        $firstCarico = $stops->where('tipo', 'carico')->sortBy('sequenza')->first();
        $lastScarico = $stops->where('tipo', 'scarico')->sortByDesc('sequenza')->first();

        if (!$firstCarico || !$lastScarico) return;

        // Se manca la provincia, prova a geocodificarla via Nominatim
        if (!$firstCarico->provincia) $firstCarico->provincia = $this->geocodeProvincia($firstCarico);
        if (!$lastScarico->provincia)  $lastScarico->provincia  = $this->geocodeProvincia($lastScarico);

        if (!$firstCarico->provincia || !$lastScarico->provincia) return;

        $da = strtoupper($firstCarico->provincia);
        $a  = strtoupper($lastScarico->provincia);

        // Listino cliente
        ClientRoute::updateOrCreate(
            ['cliente_id' => $order->cliente_id, 'provincia_da' => $da, 'provincia_a' => $a],
            ['prezzo' => $order->prezzo_cliente, 'last_work_order_id' => $order->id]
        );

        // Listino trasportatore
        CarrierRoute::updateOrCreate(
            ['carrier_id' => $order->carrier_id, 'provincia_da' => $da, 'provincia_a' => $a],
            ['costo' => $order->costo_trasportatore, 'km_totali' => $order->km_totali, 'last_work_order_id' => $order->id]
        );
    }

    private function validateOrder(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'data_ordine'              => 'required|date',
            'cliente_id'               => 'required|exists:clients,id',
            'carrier_id'               => 'required|exists:carriers,id',
            'status'                   => 'sometimes|in:in_attesa,confermato,annullato,chiuso,fatturato',
            'data_carico'              => 'nullable|date',
            'ora_carico'               => 'nullable|string|max:20',
            'data_scarico'             => 'nullable|date',
            'ora_scarico'              => 'nullable|string|max:20',
            'prezzo_cliente'           => 'nullable|numeric|min:0',
            'supplemento_cliente'      => 'nullable|numeric|min:0',
            'costo_trasportatore'      => 'nullable|numeric|min:0',
            'supplemento_trasportatore'=> 'nullable|numeric|min:0',
            'vehicle_type_id'          => 'nullable|exists:vehicle_types,id',
            'n_bancali'                => 'nullable|integer|min:0',
            'tipologia_merce'          => 'nullable|string',
            'peso'                     => 'nullable|string',
            'metri_lineari'            => 'nullable|string',
            'km_totali'                => 'nullable|numeric|min:0',
            'rif_ddt'                  => 'nullable|string',
            'annotazioni'              => 'nullable|string',
            'nome_autista'             => 'nullable|string',
            'targa_motrice'            => 'nullable|string',
            'targa_rimorchio'          => 'nullable|string',
            'annotazioni_mail'         => 'nullable|string',
            'numero_documento'         => 'nullable|string',
            'carrier_contact_ids'      => 'nullable|array',
            'carrier_contact_ids.*'    => 'exists:carrier_contacts,id',
            'stops'                    => 'nullable|array',
            'stops.*.tipo'             => 'required_with:stops|in:carico,scarico',
            'stops.*.sequenza'         => 'required_with:stops|integer|min:1',
            'stops.*.ragione_sociale'  => 'nullable|string',
            'stops.*.indirizzo'        => 'nullable|string',
            'stops.*.citta'            => 'nullable|string',
            'stops.*.cap'              => 'nullable|string',
            'stops.*.provincia'        => 'nullable|string|max:5',
            'stops.*.provincia_nome'   => 'nullable|string',
            'stops.*.lat'              => 'nullable|numeric',
            'stops.*.lng'              => 'nullable|numeric',
            'stops.*.place_id'         => 'nullable|string',
            'stops.*.data'             => 'nullable|date',
            'stops.*.ora_da'           => 'nullable|date_format:H:i',
            'stops.*.ora_a'            => 'nullable|date_format:H:i',
            'stops.*.note'             => 'nullable|string',
            'stops.*.km_da_precedente' => 'nullable|numeric',
        ]);
    }

    private function loadFull(WorkOrder $order): WorkOrder
    {
        return $order->load([
            'cliente', 'carrier', 'vehicleType', 'creator',
            'stops', 'documents.uploader', 'carrierContacts',
            'updates.user',
        ]);
    }

    private function authorizeAdminOrOperatore(Request $request): void
    {
        $user = $request->user();
        if (!$user->isAdmin() && !$user->isOperatore()) abort(403);
    }
}
