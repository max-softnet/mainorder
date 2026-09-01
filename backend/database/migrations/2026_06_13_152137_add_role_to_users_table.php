<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'operatore', 'cliente', 'trasportatore'])->default('cliente')->after('email');
            $table->string('phone')->nullable()->after('role');
            $table->string('company')->nullable()->after('phone');
            $table->boolean('active')->default(true)->after('company');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'phone', 'company', 'active']);
        });
    }
};
