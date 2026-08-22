<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CompanyDataController extends Controller
{
    /**
     * A full JSON dump of this company's data (GDPR-style data export).
     */
    public function export(Company $company)
    {
        $data = [
            'company' => $company->toArray(),
            'users' => $company->users()->get()->toArray(),
            'departments' => $company->departments()->get()->toArray(),
            'designations' => $company->designations()->get()->toArray(),
            'employees' => $company->employees()->get()->toArray(),
            'attendances' => $company->attendances()->get()->toArray(),
            'leave_types' => $company->leaveTypes()->get()->toArray(),
            'leave_balances' => $company->leaveBalances()->get()->toArray(),
            'leave_requests' => $company->leaveRequests()->get()->toArray(),
            'invoices' => $company->invoices()->get()->toArray(),
            'support_tickets' => $company->supportTickets()->with('messages')->get()->toArray(),
            'exported_at' => now()->toIso8601String(),
        ];

        AdminActivityLog::record('company.export', $company, [], $company->name);

        $filename = Str::slug($company->slug).'-export-'.now()->format('Y-m-d').'.json';

        return response()->json($data)
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }

    /**
     * Permanently delete a company and all of its data. Irreversible - the
     * frontend gates this behind typing the company's name to confirm.
     */
    public function purge(Request $request, Company $company)
    {
        $request->validate([
            'confirm_name' => ['required', 'string'],
        ]);

        abort_unless($request->input('confirm_name') === $company->name, 422, 'Company name does not match.');

        $name = $company->name;
        AdminActivityLog::record('company.purge', null, ['company_id' => $company->id, 'name' => $name], $name);

        $company->delete();

        return response()->noContent();
    }
}
