<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Skill;
use Illuminate\Http\Request;

class SkillMatrixController extends Controller
{
    /**
     * Return the full matrix:
     * { skills: [...], employees: [{ id, full_name, department, skill_map: { skill_id: proficiency } }] }
     */
    public function index(Request $request)
    {
        $skills = Skill::orderBy('category')->orderBy('name')->get();

        $employeesQuery = Employee::query()
            ->with(['department', 'skills'])
            ->where('employment_status', 'active');

        if ($request->filled('department_id')) {
            $employeesQuery->where('department_id', $request->integer('department_id'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $employeesQuery->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        $employees = $employeesQuery->orderBy('first_name')->get();

        $employeeData = $employees->map(function (Employee $employee) {
            $skillMap = $employee->skills->mapWithKeys(fn ($skill) => [
                $skill->id => $skill->pivot->proficiency,
            ]);

            return [
                'id' => $employee->id,
                'full_name' => $employee->full_name,
                'employee_code' => $employee->employee_code,
                'department' => $employee->department?->name,
                'skill_map' => $skillMap,
            ];
        });

        return response()->json([
            'skills' => $skills,
            'employees' => $employeeData,
        ]);
    }

    /**
     * Batch-update an employee's skill ratings.
     * Body: { ratings: [ { skill_id: 1, proficiency: 4 }, ... ] }
     * Proficiency of 0 removes the skill entry.
     */
    public function update(Request $request, Employee $employee)
    {
        $request->validate([
            'ratings' => ['required', 'array'],
            'ratings.*.skill_id' => ['required', 'integer', 'exists:skills,id'],
            'ratings.*.proficiency' => ['required', 'integer', 'min:0', 'max:5'],
        ]);

        $sync = [];
        foreach ($request->input('ratings') as $row) {
            $proficiency = (int) $row['proficiency'];
            if ($proficiency === 0) {
                $employee->skills()->detach($row['skill_id']);
            } else {
                $sync[$row['skill_id']] = ['proficiency' => $proficiency];
            }
        }

        if (! empty($sync)) {
            $employee->skills()->syncWithoutDetaching($sync);
        }

        // Return updated skill_map for this employee
        $employee->load('skills');
        $skillMap = $employee->skills->mapWithKeys(fn ($skill) => [
            $skill->id => $skill->pivot->proficiency,
        ]);

        return response()->json(['skill_map' => $skillMap]);
    }
}
