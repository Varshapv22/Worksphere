<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetEmployeePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('employee'));
    }

    public function rules(): array
    {
        return [
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
