<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use Illuminate\Http\Request;

class SkillController extends Controller
{
    public function index()
    {
        $skills = Skill::orderBy('category')->orderBy('name')->get();

        return response()->json(['data' => $skills]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
        ]);

        $companyId = $request->user()->company_id;

        if (Skill::where('company_id', $companyId)->where('name', $data['name'])->exists()) {
            return response()->json(['message' => 'A skill with this name already exists.'], 422);
        }

        $skill = Skill::create($data);

        return response()->json(['data' => $skill], 201);
    }

    public function update(Request $request, Skill $skill)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
        ]);

        $skill->update($data);

        return response()->json(['data' => $skill]);
    }

    public function destroy(Skill $skill)
    {
        $skill->delete();

        return response()->json(null, 204);
    }
}
