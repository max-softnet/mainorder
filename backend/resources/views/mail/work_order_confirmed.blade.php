<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; color: #222; margin: 0; padding: 0; background: #f5f5f5; }
  .wrap { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #6d28d9; color: #fff; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 28px 32px; }
  .body p { margin: 0 0 14px; line-height: 1.6; }
  .table { width: 100%; border-collapse: collapse; margin: 18px 0; }
  .table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6d28d9; padding: 6px 10px; background: #f3f0ff; }
  .table td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .table tr:last-child td { border-bottom: none; }
  .label { color: #888; font-size: 12px; }
  .footer { padding: 18px 32px; background: #f9f9f9; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  .badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Ordine confermato</h1>
    <p>N° {{ $order->numero_ordine ?? $order->numero_tmp }} &mdash; {{ now()->format('d/m/Y') }}</p>
  </div>
  <div class="body">
    <p>In allegato trovi il documento PDF relativo all'ordine di trasporto.</p>

    <table class="table">
      <tr><th colspan="2">Dettagli ordine</th></tr>
      <tr>
        <td class="label">Numero ordine</td>
        <td><strong>{{ $order->numero_ordine ?? $order->numero_tmp }}</strong></td>
      </tr>
      <tr>
        <td class="label">Data ordine</td>
        <td>{{ $order->data_ordine?->format('d/m/Y') ?? '—' }}</td>
      </tr>
      <tr>
        <td class="label">Cliente</td>
        <td>{{ $order->cliente?->ragione_sociale ?? '—' }}</td>
      </tr>
      <tr>
        <td class="label">Trasportatore</td>
        <td>{{ $order->carrier?->denominazione ?? '—' }}</td>
      </tr>
      @if($order->data_carico)
      <tr>
        <td class="label">Data carico</td>
        <td>{{ $order->data_carico->format('d/m/Y') }}</td>
      </tr>
      @endif
      @if($order->data_scarico)
      <tr>
        <td class="label">Data scarico</td>
        <td>{{ $order->data_scarico->format('d/m/Y') }}</td>
      </tr>
      @endif
      @php $carichi = $order->stops->where('tipo','carico')->sortBy('sequenza')->values(); @endphp
      @php $scarichi = $order->stops->where('tipo','scarico')->sortBy('sequenza')->values(); @endphp
      @if($carichi->isNotEmpty())
      <tr>
        <th colspan="2" style="text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6d28d9;padding:6px 10px;background:#f3f0ff;">Tappe di carico</th>
      </tr>
      @foreach($carichi as $i => $stop)
      <tr>
        <td class="label">Carico {{ $i + 1 }}</td>
        <td>
          @if($stop->ragione_sociale)<strong>{{ $stop->ragione_sociale }}</strong> — @endif
          {{ $stop->citta }}{{ $stop->provincia ? ' (' . $stop->provincia . ')' : '' }}
          @if($stop->data) <br><span style="color:#888;font-size:12px;">{{ \Carbon\Carbon::parse($stop->data)->format('d/m/Y') }}@if($stop->ora_da) &nbsp;{{ $stop->ora_da }}@endif</span>@endif
        </td>
      </tr>
      @endforeach
      @endif
      @if($scarichi->isNotEmpty())
      <tr>
        <th colspan="2" style="text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6d28d9;padding:6px 10px;background:#f3f0ff;">Tappe di scarico</th>
      </tr>
      @foreach($scarichi as $i => $stop)
      <tr>
        <td class="label">Scarico {{ $i + 1 }}</td>
        <td>
          @if($stop->ragione_sociale)<strong>{{ $stop->ragione_sociale }}</strong> — @endif
          {{ $stop->citta }}{{ $stop->provincia ? ' (' . $stop->provincia . ')' : '' }}
          @if($stop->data) <br><span style="color:#888;font-size:12px;">{{ \Carbon\Carbon::parse($stop->data)->format('d/m/Y') }}@if($stop->ora_da) &nbsp;{{ $stop->ora_da }}@endif</span>@endif
        </td>
      </tr>
      @endforeach
      @endif
      @if($order->annotazioni_mail)
      <tr>
        <td class="label">Note</td>
        <td>{{ $order->annotazioni_mail }}</td>
      </tr>
      @endif
    </table>

    <p style="margin-top:20px;">
      <span class="badge">✓ Confermato</span>
    </p>
  </div>
  <div class="footer">
    Questo messaggio è stato generato automaticamente da <strong>MainOrder</strong>. Non rispondere a questa email.
  </div>
</div>
</body>
</html>
