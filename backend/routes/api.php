<?php

use App\Http\Controllers\Api\AdvisorController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DesignationController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\LeaveTypeController;
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

        Route::post('/attendance/clock-in', [AttendanceController::class, 'clockIn']);
        Route::post('/attendance/clock-out', [AttendanceController::class, 'clockOut']);
        Route::get('/attendance', [AttendanceController::class, 'index']);

        Route::apiResource('leave-types', LeaveTypeController::class);

        Route::apiResource('leave-requests', LeaveRequestController::class)
            ->only(['index', 'store', 'show']);
        Route::post('/leave-requests/{leave_request}/approve', [LeaveRequestController::class, 'approve']);
        Route::post('/leave-requests/{leave_request}/reject', [LeaveRequestController::class, 'reject']);

        Route::get('/advisor/insights', [AdvisorController::class, 'insights']);
    });
});
