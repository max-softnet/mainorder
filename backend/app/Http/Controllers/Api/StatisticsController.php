<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    public function index(Request $request)
    {
        $anno   = $request->input('anno', date('Y'));
        $mese   = $request->input('mese');
        $giorno = $request->input('giorno');

        // Data di riferimento = data del primo stop di carico per sequenza
        $dc = '(SELECT data FROM order_stops WHERE work_order_id = work_orders.id AND tipo = "carico" ORDER BY sequenza ASC LIMIT 1)';

        $baseAll = WorkOrder::whereRaw("YEAR({$dc}) = ?", [$anno])
            ->when($mese,   fn($q) => $q->whereRaw("MONTH({$dc}) = ?", [$mese]))
            ->when($giorno, fn($q) => $q->whereRaw("DAY({$dc}) = ?", [$giorno]));

        $baseEco = (clone $baseAll)->whereIn('status', ['confermato', 'chiuso', 'fatturato']);

        // KPI
        $totaleOrdini = (clone $baseAll)->count();
        $confermati   = (clone $baseEco)->count();
        $fatturati    = (clone $baseAll)->where('status', 'fatturato')->count();
        $annullati    = (clone $baseAll)->where('status', 'annullato')->count();
        $inAttesa     = (clone $baseAll)->where('status', 'in_attesa')->count();
        $venduto      = (clone $baseEco)->sum(DB::raw('COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)'));
        $costo        = (clone $baseEco)->sum(DB::raw('COALESCE(costo_trasportatore,0) + COALESCE(supplemento_trasportatore,0)'));

        // Andamento mensile (solo vista anno intero)
        $mensile = [];
        if (!$mese) {
            $rows = WorkOrder::whereRaw("YEAR({$dc}) = ?", [$anno])
                ->whereIn('status', ['confermato', 'chiuso', 'fatturato'])
                ->selectRaw("
                    MONTH({$dc}) as mese,
                    COUNT(*) as ordini,
                    SUM(COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)) as venduto,
                    SUM(COALESCE(costo_trasportatore,0) + COALESCE(supplemento_trasportatore,0)) as costo
                ")
                ->groupByRaw("MONTH({$dc})")
                ->orderByRaw("MONTH({$dc})")
                ->get()
                ->keyBy('mese');

            $nomiMesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
            foreach ($nomiMesi as $i => $nome) {
                $n = $i + 1;
                $r = $rows[$n] ?? null;
                $v = $r ? round((float)$r->venduto, 2) : 0;
                $c = $r ? round((float)$r->costo, 2) : 0;
                $mensile[] = [
                    'label'   => $nome,
                    'ordini'  => $r ? (int) $r->ordini : 0,
                    'venduto' => $v,
                    'costo'   => $c,
                    'margine' => round($v - $c, 2),
                ];
            }
        }

        // Trend
        $trend = [];
        if ($mese && $giorno) {
            $rows = WorkOrder::whereYear('data_ordine', $anno)
                ->whereMonth('data_ordine', $mese)
                ->whereDay('data_ordine', $giorno)
                ->whereIn('status', ['confermato', 'chiuso', 'fatturato'])
                ->selectRaw("
                    HOUR(created_at) as ora,
                    COUNT(*) as ordini,
                    SUM(COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)) as venduto
                ")
                ->groupByRaw("HOUR(created_at)")
                ->orderByRaw("HOUR(created_at)")
                ->get()
                ->keyBy('ora');

            for ($h = 0; $h <= 23; $h++) {
                $r = $rows[$h] ?? null;
                $trend[] = [
                    'label'   => sprintf('%02d:00', $h),
                    'ordini'  => $r ? (int) $r->ordini : 0,
                    'venduto' => $r ? round((float)$r->venduto, 2) : 0,
                ];
            }
        } elseif ($mese) {
            $giorni = (int) date('t', mktime(0, 0, 0, (int)$mese, 1, (int)$anno));
            $rows = WorkOrder::whereRaw("YEAR({$dc}) = ?", [$anno])
                ->whereRaw("MONTH({$dc}) = ?", [$mese])
                ->whereIn('status', ['confermato', 'chiuso', 'fatturato'])
                ->selectRaw("
                    DAY({$dc}) as giorno,
                    COUNT(*) as ordini,
                    SUM(COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)) as venduto
                ")
                ->groupByRaw("DAY({$dc})")
                ->orderByRaw("DAY({$dc})")
                ->get()
                ->keyBy('giorno');

            for ($d = 1; $d <= $giorni; $d++) {
                $r = $rows[$d] ?? null;
                $trend[] = [
                    'label'   => (string) $d,
                    'ordini'  => $r ? (int) $r->ordini : 0,
                    'venduto' => $r ? round((float)$r->venduto, 2) : 0,
                ];
            }
        } else {
            $trend = array_map(fn($m) => [
                'label'   => $m['label'],
                'ordini'  => $m['ordini'],
                'venduto' => $m['venduto'],
            ], $mensile);
        }

        // Top 10 clienti per fatturato
        $topClienti = (clone $baseEco)
            ->whereNotNull('work_orders.cliente_id')
            ->join('clients', 'clients.id', '=', 'work_orders.cliente_id')
            ->selectRaw("work_orders.cliente_id, clients.ragione_sociale, COUNT(*) as ordini, SUM(COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)) as venduto, AVG(COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)) as media_prezzo")
            ->groupBy('work_orders.cliente_id', 'clients.ragione_sociale')
            ->orderByDesc('venduto')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'nome'        => $r->ragione_sociale ?? '—',
                'ordini'      => $r->ordini,
                'venduto'     => round((float)$r->venduto, 2),
                'media_prezzo'=> round((float)$r->media_prezzo, 2),
            ]);

        // Top 10 clienti per numero ordini
        $topClientiOrdini = (clone $baseEco)
            ->whereNotNull('work_orders.cliente_id')
            ->join('clients', 'clients.id', '=', 'work_orders.cliente_id')
            ->selectRaw("work_orders.cliente_id, clients.ragione_sociale, COUNT(*) as ordini, AVG(COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)) as media_prezzo")
            ->groupBy('work_orders.cliente_id', 'clients.ragione_sociale')
            ->orderByDesc('ordini')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'nome'         => $r->ragione_sociale ?? '—',
                'ordini'       => $r->ordini,
                'media_prezzo' => round((float)$r->media_prezzo, 2),
            ]);

        // Top 10 trasportatori per costo
        $topCarrier = (clone $baseEco)
            ->whereNotNull('work_orders.carrier_id')
            ->join('carriers', 'carriers.id', '=', 'work_orders.carrier_id')
            ->selectRaw("work_orders.carrier_id, carriers.denominazione, COUNT(*) as ordini, SUM(COALESCE(costo_trasportatore,0) + COALESCE(supplemento_trasportatore,0)) as costo, AVG(COALESCE(costo_trasportatore,0) + COALESCE(supplemento_trasportatore,0)) as media_costo")
            ->groupBy('work_orders.carrier_id', 'carriers.denominazione')
            ->orderByDesc('costo')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'nome'        => $r->denominazione ?? '—',
                'ordini'      => $r->ordini,
                'costo'       => round((float)$r->costo, 2),
                'media_costo' => round((float)$r->media_costo, 2),
            ]);

        // Top 10 trasportatori per numero ordini
        $topCarrierOrdini = (clone $baseEco)
            ->whereNotNull('work_orders.carrier_id')
            ->join('carriers', 'carriers.id', '=', 'work_orders.carrier_id')
            ->selectRaw("work_orders.carrier_id, carriers.denominazione, COUNT(*) as ordini, AVG(COALESCE(costo_trasportatore,0) + COALESCE(supplemento_trasportatore,0)) as media_costo")
            ->groupBy('work_orders.carrier_id', 'carriers.denominazione')
            ->orderByDesc('ordini')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'nome'        => $r->denominazione ?? '—',
                'ordini'      => $r->ordini,
                'media_costo' => round((float)$r->media_costo, 2),
            ]);

        return response()->json([
            'kpi' => [
                'totale_ordini' => $totaleOrdini,
                'confermati'    => $confermati,
                'fatturati'     => $fatturati,
                'annullati'     => $annullati,
                'in_attesa'     => $inAttesa,
                'venduto'       => round((float)$venduto, 2),
                'costo'         => round((float)$costo, 2),
                'margine'       => round((float)$venduto - (float)$costo, 2),
            ],
            'mensile'     => $mensile,
            'trend'       => $trend,
            'top_clienti'        => $topClienti,
            'top_carrier'        => $topCarrier,
            'top_clienti_ordini' => $topClientiOrdini,
            'top_carrier_ordini' => $topCarrierOrdini,
        ]);
    }
}
