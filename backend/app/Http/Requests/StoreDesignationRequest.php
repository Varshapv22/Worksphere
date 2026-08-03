<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDesignationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('departments.manage');
    }

    public function rules(): array
    {
        $companyId = $this->user()->company_id;

        return [
            'department_id' => ['required', Rule::exists('departments', 'id')->where('company_id', $companyId)],
            'title' => ['required', 'string', 'max:255'],
        ];
    }
}
