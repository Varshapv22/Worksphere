<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('employee'));
    }

    public function rules(): array
    {
        $companyId = $this->user()->company_id;
        $employeeId = $this->route('employee')?->id;

        return [
            'employee_code' => [
                'sometimes', 'required', 'string', 'max:50',
                Rule::unique('employees', 'employee_code')->where('company_id', $companyId)->ignore($employeeId),
            ],
            'user_id' => ['nullable', Rule::exists('users', 'id')->where('company_id', $companyId)],
            'department_id' => ['nullable', Rule::exists('departments', 'id')->where('company_id', $companyId)],
            'designation_id' => ['nullable', Rule::exists('designations', 'id')->where('company_id', $companyId)],
            'manager_id' => ['nullable', Rule::exists('employees', 'id')->where('company_id', $companyId)],
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes', 'required', 'email', 'max:255',
                Rule::unique('employees', 'email')->where('company_id', $companyId)->ignore($employeeId),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:50'],
            'date_of_joining' => ['sometimes', 'required', 'date'],
            'employment_status' => ['sometimes', Rule::in(['active', 'on_leave', 'terminated'])],
            'address' => ['nullable', 'array'],
            'emergency_contact' => ['nullable', 'array'],
        ];
    }
}
