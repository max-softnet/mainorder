<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'phone', 'company', 'active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
        ];
    }

    public function isAdmin(): bool { return $this->role === 'admin'; }
    public function isOperatore(): bool { return $this->role === 'operatore'; }
    public function isCliente(): bool { return $this->role === 'cliente'; }
    public function isTrasportatore(): bool { return $this->role === 'trasportatore'; }

    public function workOrdersAsCliente()
    {
        return $this->hasMany(WorkOrder::class, 'cliente_id');
    }

    public function workOrdersAsTrasportatore()
    {
        return $this->hasMany(WorkOrder::class, 'trasportatore_id');
    }

    public function workOrdersCreated()
    {
        return $this->hasMany(WorkOrder::class, 'created_by');
    }
}
