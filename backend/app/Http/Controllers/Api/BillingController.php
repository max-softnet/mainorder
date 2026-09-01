<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use App\Models\WorkOrderUpdate;
use App\Services\FattureInCloudService;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function __construct(private FattureInCloudService $fic) {}

    /**
     * POST /billing/send
     * Invia gli ordini selezionati a Fatture in Cloud.
     * Raggruppa per cliente → una fattura per cliente.
     */
    public function send(Request $request)
    {
        $this->authorizeAdminOrOperatore($request);

        $data = $request->validate([
            'order_ids'   => 'required|array|min:1',
            'order_ids.*' => 'integer|exists:work_orders,id',
        ]);

        $orders = WorkOrder::with(['cliente', 'stops'])
            ->whereIn('id', $data['order_ids'])
            ->where('status', 'confermato')
            ->get();

        if ($orders->isEmpty()) {
            return response()->json(['message' => 'Nessun ordine confermato trovato tra gli ID forniti.'], 422);
        }

        $grouped = $orders->groupBy('cliente_id');
        $results = [];

        foreach ($grouped as $clienteId => $clientOrders) {
            $client = $clientOrders->first()->cliente;

            try {
                $invoice = $this->fic->createInvoice($client, $clientOrders->all());

                // Marca gli ordini come fatturati
                foreach ($clientOrders as $order) {
                    $order->update(['status' => 'fatturato']);

                    WorkOrderUpdate::create([
                        'work_order_id' => $order->id,
                        'user_id'       => $request->user()->id,
                        'status_from'   => 'confermato',
                        'status_to'     => 'fatturato',
                    ]);
                }

                $results[] = [
                    'cliente_id'    => $clienteId,
                    'ragione_sociale' => $client->ragione_sociale,
                    'ordini'        => $clientOrders->count(),
                    'success'       => true,
                    'fic_id'        => $invoice['id'] ?? null,
                    'fic_number'    => $invoice['number'] ?? null,
                    'fic_doc_number' => isset($invoice['number'], $invoice['numeration'])
                        ? $invoice['number'] . $invoice['numeration']
                        : null,
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'cliente_id'     => $clienteId,
                    'ragione_sociale' => $client->ragione_sociale,
                    'ordini'         => $clientOrders->count(),
                    'success'        => false,
                    'error'          => $e->getMessage(),
                ];
            }
        }

        $allOk = collect($results)->every(fn($r) => $r['success']);

        return response()->json([
            'results' => $results,
            'summary' => [
                'total'   => collect($results)->sum('ordini'),
                'success' => collect($results)->where('success', true)->sum('ordini'),
                'failed'  => collect($results)->where('success', false)->sum('ordini'),
            ],
        ], $allOk ? 200 : 207);
    }

    /**
     * POST /billing/test
     * Verifica la connessione con Fatture in Cloud.
     */
    public function testConnection(Request $request)
    {
        $this->authorizeAdminOrOperatore($request);

        try {
            $info = $this->fic->testConnection();
            return response()->json([
                'success' => true,
                'message' => 'Connessione riuscita.',
                'company' => $info['name'] ?? null,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    private function authorizeAdminOrOperatore(Request $request): void
    {
        $user = $request->user();
        if (!$user->isAdmin() && !$user->isOperatore()) abort(403);
    }
}
