<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResetEmployeePasswordRequest;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Employee::class);

        $employees = Employee::query()
            ->with('department', 'designation', 'manager')
            ->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->when($request->filled('designation_id'), fn ($q) => $q->where('designation_id', $request->integer('designation_id')))
            ->when($request->filled('employment_status'), fn ($q) => $q->where('employment_status', $request->string('employment_status')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->string('search');
                $q->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->paginate($request->integer('per_page', 15));

        return EmployeeResource::collection($employees);
    }

    public function store(StoreEmployeeRequest $request)
    {
        $employee = Employee::create($request->validated());

        return new EmployeeResource($employee->fresh(['department', 'designation', 'manager']));
    }

    public function show(Employee $employee)
    {
        $this->authorize('view', $employee);

        return new EmployeeResource($employee->load('department', 'designation', 'manager', 'leaveBalances.leaveType'));
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee)
    {
        $employee->update($request->validated());

        return new EmployeeResource($employee->fresh(['department', 'designation', 'manager']));
    }

    public function destroy(Employee $employee)
    {
        $this->authorize('delete', $employee);

        $employee->delete();

        return response()->json(null, 204);
    }

    /**
     * Set a new login password for this employee. Only employees with an
     * account (a linked user) can have one — plain employee records with no
     * login access have nothing to reset.
     */
    public function resetPassword(ResetEmployeePasswordRequest $request, Employee $employee)
    {
        abort_unless($employee->user_id, 422, 'This employee does not have login access.');

        $employee->user->update(['password' => Hash::make($request->validated()['password'])]);

        return response()->json(['message' => "Password updated for {$employee->first_name} {$employee->last_name}."]);
    }
}
