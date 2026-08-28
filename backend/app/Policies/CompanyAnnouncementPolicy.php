<?php

namespace App\Policies;

use App\Models\CompanyAnnouncement;
use App\Models\User;

class CompanyAnnouncementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('announcements.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('announcements.manage');
    }

    public function update(User $user, CompanyAnnouncement $announcement): bool
    {
        return $user->company_id === $announcement->company_id
            && $user->can('announcements.manage');
    }

    public function delete(User $user, CompanyAnnouncement $announcement): bool
    {
        return $user->company_id === $announcement->company_id
            && $user->can('announcements.manage');
    }
}
