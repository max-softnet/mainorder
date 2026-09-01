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

        $baseAll = WorkOrder::whereYear('data_ordine', $anno)
            ->when($mese,   fn($q) => $q->whereMonth('data_ordine', $mese))
            ->when($giorno, fn($q) => $q->whereDay('data_ordine', $giorno));

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
            $rows = WorkOrder::whereYear('data_ordine', $anno)
                ->whereIn('status', ['confermato', 'chiuso', 'fatturato'])
                ->selectRaw("
                    MONTH(data_ordine) as mese,
                    COUNT(*) as ordini,
                    SUM(COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)) as venduto,
                    SUM(COALESCE(costo_trasportatore,0) + COALESCE(supplemento_trasportatore,0)) as costo
                ")
                ->groupByRaw("MONTH(data_ordine)")
                ->orderByRaw("MONTH(data_ordine)")
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
            $rows = WorkOrder::whereYear('data_ordine', $anno)
                ->whereMonth('data_ordine', $mese)
                ->whereIn('status', ['confermato', 'chiuso', 'fatturato'])
                ->selectRaw("
                    DAY(data_ordine) as giorno,
                    COUNT(*) as ordini,
                    SUM(COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)) as venduto
                ")
                ->groupByRaw("DAY(data_ordine)")
                ->orderByRaw("DAY(data_ordine)")
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

        // Top 10 clienti
        $topClienti = (clone $baseEco)
            ->whereNotNull('cliente_id')
            ->selectRaw("cliente_id, COUNT(*) as ordini, SUM(COALESCE(prezzo_cliente,0) + COALESCE(supplemento_cliente,0)) as venduto")
            ->groupBy('cliente_id')
            ->orderByDesc('venduto')
            ->limit(10)
            ->with('cliente:id,ragione_sociale')
            ->get()
            ->map(fn($r) => [
                'nome'    => $r->cliente?->ragione_sociale ?? '—',
                'ordini'  => $r->ordini,
                'venduto' => round((float)$r->venduto, 2),
            ]);

        // Top 10 trasportatori
        $topCarrier = (clone $baseEco)
            ->whereNotNull('carrier_id')
            ->selectRaw("carrier_id, COUNT(*) as ordini, SUM(COALESCE(costo_trasportatore,0) + COALESCE(supplemento_trasportatore,0)) as costo")
            ->groupBy('carrier_id')
            ->orderByDesc('costo')
            ->limit(10)
            ->with('carrier:id,denominazione')
            ->get()
            ->map(fn($r) => [
                'nome'   => $r->carrier?->denominazione ?? '—',
                'ordini' => $r->ordini,
                'costo'  => round((float)$r->costo, 2),
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
            'top_clienti' => $topClienti,
            'top_carrier' => $topCarrier,
        ]);
    }
}
