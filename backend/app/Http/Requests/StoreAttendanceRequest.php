<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('attendance.manage');
    }

    public function rules(): array
    {
        $companyId = $this->user()->company_id;

        return [
            'employee_id' => ['required', Rule::exists('employees', 'id')->where('company_id', $companyId)],
            'date' => ['required', 'date'],
            'clock_in' => ['nullable', 'date'],
            'clock_out' => ['nullable', 'date', 'after_or_equal:clock_in'],
            'status' => ['sometimes', Rule::in(['present', 'late', 'half_day', 'absent', 'on_leave'])],
            'work_minutes' => ['nullable', 'integer', 'min:0'],
            'source' => ['sometimes', Rule::in(['web', 'gps', 'qr'])],
            'notes' => ['nullable', 'string'],
        ];
    }
}
