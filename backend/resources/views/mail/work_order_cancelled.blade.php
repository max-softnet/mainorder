<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; color: #222; margin: 0; padding: 0; background: #f5f5f5; }
  .wrap { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #dc2626; color: #fff; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 28px 32px; }
  .body p { margin: 0 0 14px; line-height: 1.6; }
  .numero { font-size: 18px; font-weight: 700; color: #dc2626; }
  .footer { padding: 18px 32px; background: #f9f9f9; font-size: 12px; color: #999; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Ordine annullato</h1>
    <p>N° {{ $order->numero_ordine ?? $order->numero_tmp }}</p>
  </div>
  <div class="body">
    <p>Gentile trasportatore,</p>
    <p>La informiamo che il N° ordine <span class="numero">{{ $order->numero_ordine ?? $order->numero_tmp }}</span> è stato annullato.</p>
    <p>Grazie.</p>
  </div>
  <div class="footer">
    Messaggio generato automaticamente &mdash; si prega di non rispondere a questa email.
  </div>
</div>
</body>
</html>
