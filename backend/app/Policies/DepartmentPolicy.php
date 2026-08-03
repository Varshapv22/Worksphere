<?php

namespace App\Policies;

use App\Models\Department;
use App\Models\User;

class DepartmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('departments.manage') || $user->can('employees.view');
    }

    public function view(User $user, Department $department): bool
    {
        return $user->company_id === $department->company_id
            && ($user->can('departments.manage') || $user->can('employees.view'));
    }

    public function create(User $user): bool
    {
        return $user->can('departments.manage');
    }

    public function update(User $user, Department $department): bool
    {
        return $user->company_id === $department->company_id
            && $user->can('departments.manage');
    }

    public function delete(User $user, Department $department): bool
    {
        return $user->company_id === $department->company_id
            && $user->can('departments.manage');
    }
}
