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
  .label { color: #888; font-size: 12px; width: 130px; }
  .badge-carico  { display:inline-block; background:#dcfce7; color:#166534; padding:1px 8px; border-radius:12px; font-size:11px; font-weight:600; margin-right:6px; }
  .badge-scarico { display:inline-block; background:#fef9c3; color:#854d0e; padding:1px 8px; border-radius:12px; font-size:11px; font-weight:600; margin-right:6px; }
  .footer { padding: 18px 32px; background: #f9f9f9; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  .badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .tariffa { background: #f3f0ff; border-left: 4px solid #6d28d9; padding: 12px 16px; border-radius: 4px; margin: 18px 0; }
  .tariffa .label-t { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6d28d9; margin-bottom: 4px; }
  .tariffa .valore { font-size: 22px; font-weight: 700; color: #1e1b4b; }
  .btn-update { display: inline-block; background: #6d28d9; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 18px 0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Ordine di trasporto</h1>
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
      @if($order->data_carico)
      <tr>
        <td class="label">Data carico</td>
        <td>{{ $order->data_carico->format('d/m/Y') }}@if($order->ora_carico) &nbsp;·&nbsp; {{ $order->ora_carico }}@endif</td>
      </tr>
      @endif
      @if($order->data_scarico)
      <tr>
        <td class="label">Data scarico</td>
        <td>{{ $order->data_scarico->format('d/m/Y') }}@if($order->ora_scarico) &nbsp;·&nbsp; {{ $order->ora_scarico }}@endif</td>
      </tr>
      @endif
    </table>

    {{-- Tappe in sequenza ordine --}}
    @php $allStops = $order->stops->sortBy('sequenza')->values(); @endphp
    @if($allStops->isNotEmpty())
    <table class="table">
      <tr><th colspan="2">Tappe</th></tr>
      @foreach($allStops as $stop)
      <tr>
        <td class="label" style="vertical-align:top; padding-top:10px;">
          <span class="{{ $stop->tipo === 'carico' ? 'badge-carico' : 'badge-scarico' }}">
            {{ $stop->tipo === 'carico' ? 'Carico' : 'Scarico' }}
          </span>
        </td>
        <td>
          @if($stop->ragione_sociale)<strong>{{ $stop->ragione_sociale }}</strong><br>@endif
          {{ $stop->indirizzo_completo ?? ($stop->citta . ($stop->provincia ? ' (' . $stop->provincia . ')' : '')) }}
          @if($stop->note_tappa)
            <br><span style="color:#888; font-size:12px;">{{ $stop->note_tappa }}</span>
          @endif
        </td>
      </tr>
      @endforeach
    </table>
    @endif

    {{-- Tariffa trasportatore --}}
    @php
      $tariffa = (float)($order->costo_trasportatore ?? 0) + (float)($order->supplemento_trasportatore ?? 0);
    @endphp
    @if($tariffa > 0)
    <div class="tariffa">
      <div class="label-t">Tariffa</div>
      <div class="valore">€ {{ number_format($tariffa, 2, ',', '.') }}</div>
    </div>
    @endif

    @if($order->annotazioni_mail || $order->annotazioni)
    <table class="table">
      <tr><th colspan="2">Note</th></tr>
      <tr>
        <td colspan="2">{{ $order->annotazioni_mail ?: $order->annotazioni }}</td>
      </tr>
    </table>
    @endif

    <p style="margin-top:20px;">
      <span class="badge">✓ Confermato</span>
    </p>

    {{-- Link aggiornamento dati mezzo --}}
    @if($order->carrier_token)
    <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
    <p style="margin-bottom:8px; font-weight:600;">Aggiorna i dati del mezzo</p>
    <p style="color:#555; font-size:13px; margin-bottom:12px;">
      Clicca il pulsante qui sotto per inserire o aggiornare i dati del conducente e del mezzo (nome autista, targa motrice, targa rimorchio).
    </p>
    <a class="btn-update" href="{{ config('app.frontend_url') }}/carrier-update/{{ $order->carrier_token }}">
      Inserisci dati mezzo
    </a>
    @endif
  </div>
  <div class="footer">
    Questo messaggio è stato generato automaticamente da <strong>MainOrder</strong>. Non rispondere a questa email.
  </div>
</div>
</body>
</html>
