<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: DejaVu Sans, sans-serif;
    font-size: 9pt;
    color: #111;
    padding: 20px 24px 130px 24px;
  }

  /* ---- INTESTAZIONE ---- */
  .header-table { width: 100%; margin-bottom: 18px; }
  .logo-cell { width: 140px; vertical-align: top; }
  .logo-cell img { max-width: 130px; max-height: 70px; }
  .logo-placeholder {
    width: 130px; height: 70px;
    border: 1px dashed #bbb;
    display: block;
  }
  .company-cell { vertical-align: top; text-align: right; }
  .company-name { font-size: 11pt; font-weight: bold; }
  .company-info { font-size: 8.5pt; color: #333; line-height: 1.6; }

  /* ---- TITOLO ---- */
  .doc-title {
    text-align: center;
    font-size: 11pt;
    font-weight: bold;
    border: 1px solid #111;
    padding: 7px 0;
    margin-bottom: 0;
    letter-spacing: 0.5px;
  }

  /* ---- TABELLA DATI ---- */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
  }
  .data-table th {
    background: #f2f2f2;
    font-weight: bold;
    font-size: 8.5pt;
    text-align: center;
    border: 1px solid #111;
    padding: 5px 6px;
  }
  .data-table td {
    border: 1px solid #111;
    padding: 5px 6px;
    text-align: center;
    font-size: 9pt;
    min-height: 20px;
  }
  .data-table td.left { text-align: left; }

  /* ---- BLOCCO NOTE / PAGAMENTO ---- */
  .payment-block {
    border: 1px solid #111;
    border-top: none;
    padding: 6px 8px;
    font-size: 8.5pt;
    font-weight: bold;
    text-align: center;
  }
  .note-block {
    border: 1px solid #111;
    border-top: none;
    padding: 6px 8px;
    font-size: 8.5pt;
    font-style: italic;
    text-align: center;
  }

  /* ---- FOOTER FISSO ---- */
  .pdf-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px 24px 8px 24px;
    border-top: 1.5px solid #111;
    font-size: 7.5pt;
    color: #333;
  }
  .footer-table { width: 100%; }
  .footer-left { vertical-align: top; text-align: left; width: 55%; }
  .footer-right { vertical-align: top; text-align: right; width: 45%; }
  .footer-company { font-weight: bold; font-size: 8pt; margin-bottom: 2px; }
  .footer-line { line-height: 1.7; }
</style>
</head>
<body>

{{-- FOOTER FISSO (dompdf lo processa per primo se è fixed) --}}
<div class="pdf-footer">
  <table class="footer-table">
    <tr>
      <td class="footer-left">
        @if($company['company_legal_name'])
          <div class="footer-company">{{ $company['company_legal_name'] }}</div>
        @endif
        @if($company['company_capitale_sociale'])
          <div class="footer-line">Capitale Sociale {{ $company['company_capitale_sociale'] }}</div>
        @endif
        @if($company['company_sede_legale'])
          <div class="footer-line">Sede legale {{ $company['company_sede_legale'] }}</div>
        @endif
        @if($company['company_registro_imprese'])
          <div class="footer-line">Registro Imprese / C.F. / P. IVA {{ $company['company_registro_imprese'] }}</div>
        @endif
        @if($company['company_email'])
          <div class="footer-line">{{ $company['company_email'] }}</div>
        @endif
      </td>
      <td class="footer-right">
        @if($company['company_rea'])
          <div class="footer-line"><strong>R.E.A.</strong> {{ $company['company_rea'] }}</div>
        @endif
        @if($company['company_albo_autotrasportatori'])
          <div class="footer-line"><strong>Iscrizione Albo Autotrasportatori</strong> {{ $company['company_albo_autotrasportatori'] }}</div>
        @endif
        @if($company['company_albo_spedizionieri'])
          <div class="footer-line"><strong>Albo Spedizionieri</strong> {{ $company['company_albo_spedizionieri'] }}</div>
        @endif
        @if($company['company_website'])
          <div class="footer-line">{{ $company['company_website'] }}</div>
        @endif
      </td>
    </tr>
  </table>
</div>

{{-- INTESTAZIONE --}}
<table class="header-table">
  <tr>
    <td class="logo-cell">
      @if($logoBase64)
        <img src="data:{{ $logoMime }};base64,{{ $logoBase64 }}" alt="Logo" />
      @else
        <div class="logo-placeholder"></div>
      @endif
    </td>
    <td class="company-cell">
      @if($company['company_name'])
        <div class="company-name">{{ $company['company_name'] }}</div>
      @endif
      <div class="company-info">
        @if($company['company_address'])<div>{{ $company['company_address'] }}</div>@endif
        @if($company['company_city'])<div>{{ $company['company_city'] }}</div>@endif
        @if($company['company_piva'])<div>P.IVA : {{ $company['company_piva'] }}</div>@endif
      </div>
    </td>
  </tr>
</table>

{{-- TITOLO --}}
<div class="doc-title">ORDINE DI TRASPORTO A SUB VETTORE</div>

{{-- N° DOCUMENTO / DATA --}}
<table class="data-table">
  <tr>
    <th style="width:50%">N° Documento</th>
    <th style="width:50%">Data Documento</th>
  </tr>
  <tr>
    <td>{{ $order->numero_ordine ?? $order->numero_tmp }}</td>
    <td>{{ \Carbon\Carbon::parse($order->data_ordine)->format('d/m/Y') }}</td>
  </tr>
</table>

{{-- INDIRIZZO CARICO / SCARICO --}}
@php
  $indirizzoCarico = $carichi->map(fn($s) => trim(implode(', ', array_filter([$s->ragione_sociale, $s->indirizzo_completo]))))->filter()->implode(' — ');
  $indirizzoScarico = $scarichi->map(fn($s) => trim(implode(', ', array_filter([$s->ragione_sociale, $s->indirizzo_completo]))))->filter()->implode(' — ');
  if (!$indirizzoCarico) $indirizzoCarico = $stopCarico?->indirizzo_completo ?? '';
  if (!$indirizzoScarico) $indirizzoScarico = $stopScarico?->indirizzo_completo ?? '';
@endphp
<table class="data-table">
  <tr>
    <th style="width:50%">Indirizzo Carico</th>
    <th style="width:50%">Indirizzo Scarico</th>
  </tr>
  <tr>
    <td>{{ $indirizzoCarico }}</td>
    <td>{{ $indirizzoScarico }}</td>
  </tr>
</table>

{{-- DATA/ORA CARICO / SCARICO --}}
<table class="data-table">
  <tr>
    <th style="width:50%">Data/Ora Carico</th>
    <th style="width:50%">Data/Ora Scarico</th>
  </tr>
  <tr>
    <td>
      @if($stopCarico && $stopCarico->data)
        {{ \Carbon\Carbon::parse($stopCarico->data)->format('d/m/Y') }}
        @if($stopCarico->ora_da) - {{ $stopCarico->ora_da }}@endif
      @elseif($order->data_carico)
        {{ \Carbon\Carbon::parse($order->data_carico)->format('d/m/Y') }}
        @if($order->ora_carico) - {{ $order->ora_carico }}@endif
      @endif
    </td>
    <td>
      @if($stopScarico && $stopScarico->data)
        {{ \Carbon\Carbon::parse($stopScarico->data)->format('d/m/Y') }}
        @if($stopScarico->ora_da) - {{ $stopScarico->ora_da }}@endif
      @elseif($order->data_scarico)
        {{ \Carbon\Carbon::parse($order->data_scarico)->format('d/m/Y') }}
        @if($order->ora_scarico) - {{ $order->ora_scarico }}@endif
      @endif
    </td>
  </tr>
</table>

{{-- TIPO MEZZO / TARGA / AUTISTA --}}
<table class="data-table">
  <tr>
    <th style="width:25%">Tipo Mezzo</th>
    <th style="width:25%">Targa Motrice</th>
    <th style="width:25%">Targa Rimorchio</th>
    <th style="width:25%">Nome Autista</th>
  </tr>
  <tr>
    <td>{{ $order->vehicleType?->nome ?? '' }}</td>
    <td>{{ $order->targa_motrice ?? '' }}</td>
    <td>{{ $order->targa_rimorchio ?? '' }}</td>
    <td>{{ $order->nome_autista ?? '' }}</td>
  </tr>
</table>

{{-- ALLESTIMENTO / PESO / METRI / KM --}}
<table class="data-table">
  <tr>
    <th style="width:25%">Allestimento</th>
    <th style="width:25%">Peso</th>
    <th style="width:25%">Metri Lineari</th>
    <th style="width:25%">KM</th>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>{{ $order->peso ?? '' }}</td>
    <td>{{ $order->metri_lineari ?? '' }}</td>
    <td>{{ $order->km_totali ? number_format($order->km_totali, 0, ',', '.') : '' }}</td>
  </tr>
</table>

{{-- BANCALI / TIPOLOGIA / ANNOTAZIONI --}}
<table class="data-table">
  <tr>
    <th style="width:20%">N° Bancali</th>
    <th style="width:35%">Tipologia Merce</th>
    <th style="width:45%">Annotazioni</th>
  </tr>
  <tr>
    <td>{{ $order->n_bancali ?? '' }}</td>
    <td class="left">{{ $order->tipologia_merce ?? '' }}</td>
    <td class="left">{{ $order->annotazioni ?? '' }}</td>
  </tr>
</table>

{{-- TARIFFA / SUPPLEMENTO / TOTALE --}}
<table class="data-table">
  <tr>
    <th style="width:25%">Tariffa</th>
    <th style="width:25%">Supplemento</th>
    <th style="width:50%">Totale Tariffa convenuto da Subvettore</th>
  </tr>
  <tr>
    <td>{{ $order->costo_trasportatore !== null ? number_format($order->costo_trasportatore, 2, ',', '.') . ' €' : '' }}</td>
    <td>{{ $order->supplemento_trasportatore !== null ? number_format($order->supplemento_trasportatore, 2, ',', '.') . ' €' : '0,00 €' }}</td>
    <td style="font-weight:bold">{{ $order->totale_trasportatore !== null ? number_format($order->totale_trasportatore, 2, ',', '.') . ' €' : '' }}</td>
  </tr>
</table>

{{-- CONDIZIONI DI PAGAMENTO --}}
@if($company['company_payment_terms'])
<div class="payment-block">
  {{ strtoupper($company['company_payment_terms']) }}
</div>
@endif

{{-- NOTE FATTURE --}}
@php $invoiceNote = 'FATTURE E DDT RIFERITI AI TRASPORTI VANNO INVIATI TUTTI ENTRO IL 05 DI OGNI MESE PRESSO LA SEDE DI ' . ($company['company_city'] ? strtoupper(explode(' ', $company['company_city'])[1] ?? $company['company_city']) : 'SEDE'); @endphp
<div class="note-block" style="font-weight:bold; font-style:normal;">
  FATTURE E DDT RIFERITI AI TRASPORTI VANNO INVIATI TUTTI ENTRO IL 05 DI OGNI MESE PRESSO LA SEDE
</div>

{{-- NOTA CONTRATTO --}}
@if($company['company_contract_note'])
<div class="note-block" style="margin-top: 16px; border: none; text-align: left; padding: 0 0;">
  <strong>{{ $company['company_contract_note'] }}</strong>
</div>
@endif

</body>
</html>
