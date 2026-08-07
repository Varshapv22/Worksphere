<?php

use App\Http\Controllers\Api\Admin\CompanyController as AdminCompanyController;
use App\Http\Controllers\Api\Admin\ModuleController as AdminModuleController;
use App\Http\Controllers\Api\Admin\PlatformStatsController;
use App\Http\Controllers\Api\Admin\SubscriptionPlanController as AdminSubscriptionPlanController;
use App\Http\Controllers\Api\AdvisorController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DesignationController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\LeaveTypeController;
use App\Http\Controllers\Api\ModuleController;
use App\Http\Controllers\Api\ResumeParserController;
use App\Http\Controllers\Api\SkillController;
use App\Http\Controllers\Api\SkillMatrixController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Public
    Route::post('/auth/register-company', [AuthController::class, 'registerCompany']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Protected
    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        Route::get('/company', [CompanyController::class, 'show']);
        Route::put('/company', [CompanyController::class, 'update']);
        Route::patch('/company', [CompanyController::class, 'update']);

        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('designations', DesignationController::class);
        Route::apiResource('employees', EmployeeController::class);

        Route::middleware('module:attendance')->group(function () {
            Route::post('/attendance/clock-in', [AttendanceController::class, 'clockIn']);
            Route::post('/attendance/clock-out', [AttendanceController::class, 'clockOut']);
            Route::get('/attendance', [AttendanceController::class, 'index']);
        });

        Route::apiResource('leave-types', LeaveTypeController::class);

        Route::apiResource('leave-requests', LeaveRequestController::class)
            ->only(['index', 'store', 'show']);
        Route::post('/leave-requests/{leave_request}/approve', [LeaveRequestController::class, 'approve']);
        Route::post('/leave-requests/{leave_request}/reject', [LeaveRequestController::class, 'reject']);

        Route::get('/advisor/insights', [AdvisorController::class, 'insights']);

        // Skills Matrix (requires Skills Matrix module)
        Route::middleware('module:skills-matrix')->group(function () {
            Route::get('/skills', [SkillController::class, 'index']);
            Route::post('/skills', [SkillController::class, 'store']);
            Route::put('/skills/{skill}', [SkillController::class, 'update']);
            Route::delete('/skills/{skill}', [SkillController::class, 'destroy']);
            Route::get('/skills/matrix', [SkillMatrixController::class, 'index']);
            Route::post('/skills/matrix/{employee}', [SkillMatrixController::class, 'update']);
        });

        // Resume Parser (requires Recruitment module)
        Route::middleware('module:recruitment')->group(function () {
            Route::get('/resumes', [ResumeParserController::class, 'index']);
            Route::post('/resumes/parse', [ResumeParserController::class, 'store']);
            Route::get('/resumes/{parsedResume}', [ResumeParserController::class, 'show']);
            Route::delete('/resumes/{parsedResume}', [ResumeParserController::class, 'destroy']);
        });

        // App marketplace - which modules this company has installed.
        Route::get('/modules', [ModuleController::class, 'index']);
        Route::patch('/modules/{module}/toggle', [ModuleController::class, 'toggle']);
    });

    // Super admin only - platform management, not scoped to any tenant.
    Route::middleware(['auth:sanctum', 'super-admin'])->prefix('admin')->group(function () {
        Route::get('/stats', [PlatformStatsController::class, 'index']);

        Route::get('/companies', [AdminCompanyController::class, 'index']);
        Route::get('/companies/{company}', [AdminCompanyController::class, 'show']);
        Route::patch('/companies/{company}', [AdminCompanyController::class, 'update']);
        Route::post('/companies/{company}/approve', [AdminCompanyController::class, 'approve']);
        Route::post('/companies/{company}/reject', [AdminCompanyController::class, 'reject']);

        Route::apiResource('subscription-plans', AdminSubscriptionPlanController::class)
            ->parameters(['subscription-plans' => 'subscriptionPlan'])
            ->except(['show']);

        Route::apiResource('modules', AdminModuleController::class)->except(['show']);
    });
});
