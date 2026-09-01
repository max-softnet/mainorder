<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['group', 'key', 'value', 'type', 'label', 'description'];

    // Legge un valore dal DB, con fallback al .env
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("setting_{$key}", 300, function () use ($key, $default) {
            $setting = self::where('key', $key)->first();
            return $setting?->value ?? $default;
        });
    }

    // Salva un valore e invalida la cache
    public static function set(string $key, mixed $value): void
    {
        self::where('key', $key)->update(['value' => $value]);
        Cache::forget("setting_{$key}");
    }

    // Restituisce tutti i settings di un gruppo come array key→value
    public static function group(string $group): array
    {
        return self::where('group', $group)
            ->get()
            ->mapWithKeys(fn($s) => [$s->key => $s->value])
            ->toArray();
    }

    // Applica la config SMTP al mail driver a runtime
    public static function applySmtp(): void
    {
        $cfg = self::group('smtp');

        if (empty($cfg['smtp_host'])) return;

        config([
            'mail.default'                    => 'smtp',
            'mail.mailers.smtp.host'          => $cfg['smtp_host'],
            'mail.mailers.smtp.port'          => (int) ($cfg['smtp_port'] ?? 587),
            'mail.mailers.smtp.encryption'    => $cfg['smtp_encryption'] ?? 'tls',
            'mail.mailers.smtp.username'      => $cfg['smtp_username'] ?? '',
            'mail.mailers.smtp.password'      => $cfg['smtp_password'] ?? '',
            'mail.from.address'               => $cfg['mail_from_address'] ?? '',
            'mail.from.name'                  => $cfg['mail_from_name'] ?? 'MainOrder',
        ]);
    }
}
