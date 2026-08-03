<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Employee::class);
    }

    public function rules(): array
    {
        $companyId = $this->user()->company_id;

        return [
            'employee_code' => [
                'required', 'string', 'max:50',
                Rule::unique('employees', 'employee_code')->where('company_id', $companyId),
            ],
            'user_id' => ['nullable', Rule::exists('users', 'id')->where('company_id', $companyId)],
            'department_id' => ['nullable', Rule::exists('departments', 'id')->where('company_id', $companyId)],
            'designation_id' => ['nullable', Rule::exists('designations', 'id')->where('company_id', $companyId)],
            'manager_id' => ['nullable', Rule::exists('employees', 'id')->where('company_id', $companyId)],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'email', 'max:255',
                Rule::unique('employees', 'email')->where('company_id', $companyId),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:50'],
            'date_of_joining' => ['required', 'date'],
            'employment_status' => ['sometimes', Rule::in(['active', 'on_leave', 'terminated'])],
            'address' => ['nullable', 'array'],
            'emergency_contact' => ['nullable', 'array'],
        ];
    }
}
