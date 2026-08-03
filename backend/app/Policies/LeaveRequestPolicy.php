<?php

namespace App\Policies;

use App\Models\LeaveRequest;
use App\Models\User;

class LeaveRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('leave.manage') || $user->can('leave.approve') || $user->can('leave.request');
    }

    public function view(User $user, LeaveRequest $leaveRequest): bool
    {
        if ($user->company_id !== $leaveRequest->company_id) {
            return false;
        }

        return $user->can('leave.manage')
            || $user->can('leave.approve')
            || ($user->can('leave.request') && $user->employee && $user->employee->id === $leaveRequest->employee_id);
    }

    public function create(User $user): bool
    {
        return $user->can('leave.request') || $user->can('leave.manage');
    }

    public function update(User $user, LeaveRequest $leaveRequest): bool
    {
        return $user->company_id === $leaveRequest->company_id
            && ($user->can('leave.manage') || $user->can('leave.approve'));
    }

    public function delete(User $user, LeaveRequest $leaveRequest): bool
    {
        return $user->company_id === $leaveRequest->company_id
            && $user->can('leave.manage');
    }

    public function approve(User $user, LeaveRequest $leaveRequest): bool
    {
        return $user->company_id === $leaveRequest->company_id
            && ($user->can('leave.approve') || $user->can('leave.manage'));
    }
}
