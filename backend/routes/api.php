<?php

use App\Http\Controllers\Api\Admin\CompanyController as AdminCompanyController;
use App\Http\Controllers\Api\Admin\ModuleController as AdminModuleController;
use App\Http\Controllers\Api\Admin\PlatformStatsController;
use App\Http\Controllers\Api\Admin\SubscriptionPlanController as AdminSubscriptionPlanController;
use App\Http\Controllers\Api\AdvisorController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\CareerRoadmapController;
use App\Http\Controllers\Api\ChatbotController;
use App\Http\Controllers\Api\ComplianceController;
use App\Http\Controllers\Api\DeveloperApiController;
use App\Http\Controllers\Api\KbArticleController;
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\OrgChartController;
use App\Http\Controllers\Api\PayrollConfigController;
use App\Http\Controllers\Api\PayrollSimulatorController;
use App\Http\Controllers\Api\RecognitionController;
use App\Http\Controllers\Api\WhiteLabelController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DesignationController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\LeaveTypeController;
use App\Http\Controllers\Api\Employee360Controller;
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

        // Employee 360 Profile
        Route::get('/employees/{employee}/360', [Employee360Controller::class, 'show']);
        Route::post('/employees/{employee}/notes', [Employee360Controller::class, 'storeNote']);
        Route::delete('/employees/{employee}/notes/{note}', [Employee360Controller::class, 'destroyNote']);
        Route::post('/employees/{employee}/projects', [Employee360Controller::class, 'storeProject']);
        Route::delete('/employees/{employee}/projects/{project}', [Employee360Controller::class, 'destroyProject']);
        Route::post('/employees/{employee}/assets', [Employee360Controller::class, 'storeAsset']);
        Route::delete('/employees/{employee}/assets/{asset}', [Employee360Controller::class, 'destroyAsset']);
        Route::post('/employees/{employee}/training', [Employee360Controller::class, 'storeTraining']);
        Route::delete('/employees/{employee}/training/{training}', [Employee360Controller::class, 'destroyTraining']);
        Route::post('/employees/{employee}/certificates', [Employee360Controller::class, 'storeCertificate']);
        Route::delete('/employees/{employee}/certificates/{certificate}', [Employee360Controller::class, 'destroyCertificate']);
        Route::post('/employees/{employee}/documents', [Employee360Controller::class, 'storeDocument']);
        Route::delete('/employees/{employee}/documents/{document}', [Employee360Controller::class, 'destroyDocument']);

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

        // Organisation Chart
        Route::get('/org-chart', [OrgChartController::class, 'index']);
        Route::patch('/employees/{employee}/manager', [OrgChartController::class, 'updateManager']);

        // Knowledge Base (requires Knowledge Base module)
        Route::middleware('module:knowledge-base')->group(function () {
            Route::get('/knowledge-base/categories', [KbArticleController::class, 'categories']);
            Route::apiResource('knowledge-base', KbArticleController::class);
        });

        // Employee Recognition (requires Recognition module)
        Route::middleware('module:recognition')->group(function () {
            Route::get('/badges', [RecognitionController::class, 'badges']);
            Route::get('/recognitions', [RecognitionController::class, 'index']);
            Route::post('/recognitions', [RecognitionController::class, 'store']);
            Route::delete('/recognitions/{recognition}', [RecognitionController::class, 'destroy']);
        });

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

        // ── Feature 12: Career Roadmap ────────────────────────────────────────
        Route::middleware('module:career-roadmap')->group(function () {
            Route::get('/career-tracks', [CareerRoadmapController::class, 'index']);
            Route::post('/career-tracks', [CareerRoadmapController::class, 'store']);
            Route::get('/career-tracks/{careerTrack}', [CareerRoadmapController::class, 'show']);
            Route::put('/career-tracks/{careerTrack}', [CareerRoadmapController::class, 'update']);
            Route::delete('/career-tracks/{careerTrack}', [CareerRoadmapController::class, 'destroy']);
            Route::post('/career-tracks/{careerTrack}/enroll', [CareerRoadmapController::class, 'enroll']);
            Route::patch('/career-enrollments/{employeeCareerTrack}/progress', [CareerRoadmapController::class, 'updateProgress']);
            Route::get('/my-roadmap', [CareerRoadmapController::class, 'myRoadmap']);
        });

        // ── Feature 13: Meetings ──────────────────────────────────────────────
        Route::middleware('module:meetings')->group(function () {
            Route::apiResource('meetings', MeetingController::class);
            Route::post('/meetings/{meeting}/action-items', [MeetingController::class, 'storeActionItem']);
            Route::patch('/action-items/{actionItem}', [MeetingController::class, 'updateActionItem']);
            Route::delete('/action-items/{actionItem}', [MeetingController::class, 'destroyActionItem']);
        });

        // ── Feature 14: Asset Lifecycle ───────────────────────────────────────
        Route::middleware('module:asset-management')->group(function () {
            Route::get('/assets/stats', [AssetController::class, 'stats']);
            Route::apiResource('assets', AssetController::class);
        });

        // ── Feature 15: Compliance Dashboard ─────────────────────────────────
        Route::middleware('module:compliance')->group(function () {
            Route::get('/compliance/summary', [ComplianceController::class, 'summary']);
            Route::get('/compliance', [ComplianceController::class, 'index']);
            Route::post('/compliance', [ComplianceController::class, 'store']);
            Route::put('/compliance/{complianceItem}', [ComplianceController::class, 'update']);
            Route::delete('/compliance/{complianceItem}', [ComplianceController::class, 'destroy']);
        });

        // ── Feature 16: Payroll Simulator ─────────────────────────────────────
        Route::middleware('module:payroll')->group(function () {
            Route::post('/payroll/simulate', [PayrollSimulatorController::class, 'simulate']);
            Route::post('/payroll/simulate-bulk', [PayrollSimulatorController::class, 'bulkSimulate']);
        });

        // ── Feature 17: Company Analytics ────────────────────────────────────
        Route::middleware('module:analytics')->group(function () {
            Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
            Route::get('/analytics/hiring-trends', [AnalyticsController::class, 'hiringTrends']);
            Route::get('/analytics/attrition', [AnalyticsController::class, 'attrition']);
            Route::get('/analytics/department-breakdown', [AnalyticsController::class, 'departmentBreakdown']);
            Route::get('/analytics/payroll-trends', [AnalyticsController::class, 'payrollTrends']);
        });

        // ── Feature 18: Multi-Country Payroll Config ──────────────────────────
        Route::middleware('module:payroll')->group(function () {
            Route::get('/payroll-configs', [PayrollConfigController::class, 'index']);
            Route::post('/payroll-configs', [PayrollConfigController::class, 'store']);
            Route::put('/payroll-configs/{payrollConfig}', [PayrollConfigController::class, 'update']);
            Route::delete('/payroll-configs/{payrollConfig}', [PayrollConfigController::class, 'destroy']);
        });

        // ── Feature 19: Developer API ────────────────────────────────────────
        Route::middleware('module:developer-api')->group(function () {
            Route::get('/developer/keys', [DeveloperApiController::class, 'listKeys']);
            Route::post('/developer/keys', [DeveloperApiController::class, 'createKey']);
            Route::patch('/developer/keys/{apiKey}', [DeveloperApiController::class, 'updateKey']);
            Route::delete('/developer/keys/{apiKey}', [DeveloperApiController::class, 'revokeKey']);
            Route::get('/developer/webhooks', [DeveloperApiController::class, 'listWebhooks']);
            Route::post('/developer/webhooks', [DeveloperApiController::class, 'createWebhook']);
            Route::patch('/developer/webhooks/{webhook}', [DeveloperApiController::class, 'updateWebhook']);
            Route::delete('/developer/webhooks/{webhook}', [DeveloperApiController::class, 'deleteWebhook']);
            Route::get('/developer/events', [DeveloperApiController::class, 'availableEvents']);
        });

        // ── Feature 20: White Label ───────────────────────────────────────────
        Route::middleware('module:white-label')->group(function () {
            Route::get('/white-label', [WhiteLabelController::class, 'show']);
            Route::patch('/white-label', [WhiteLabelController::class, 'update']);
        });

        // AI Assistant (requires AI Assistant module)
        Route::middleware('module:ai-assistant')->group(function () {
            Route::post('/chatbot/ask', [ChatbotController::class, 'ask']);
        });
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
