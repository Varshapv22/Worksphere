<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParsedResume;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ResumeParserController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->can('employees.manage'), 403, 'Only a company admin can view parsed resumes.');

        $resumes = ParsedResume::query()
            ->where('company_id', $request->user()->company_id)
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => $resumes->map(fn (ParsedResume $r) => $this->toResource($r)),
            'meta' => [
                'current_page' => $resumes->currentPage(),
                'last_page' => $resumes->lastPage(),
                'total' => $resumes->total(),
                'per_page' => $resumes->perPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('employees.manage'), 403, 'Only a company admin can parse resumes.');

        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();

        // Store the PDF temporarily so pdftotext can read it
        $path = $file->store('resumes/temp', 'local');
        $absolutePath = Storage::disk('local')->path($path);

        // Create a DB record immediately so the client can show progress
        $resume = ParsedResume::create([
            'company_id' => $request->user()->company_id,
            'file_name' => $originalName,
            'file_path' => $path,
            'status' => 'processing',
        ]);

        try {
            $text = $this->extractText($absolutePath);

            if (empty(trim($text))) {
                throw new \RuntimeException('No readable text found in the PDF. The file may be scanned or image-based.');
            }

            $parsed = $this->parseWithClaude($text);

            $resume->update([
                'status' => 'completed',
                'raw_text' => mb_substr($text, 0, 65535),
                'candidate_name' => $parsed['name'] ?? null,
                'email' => $parsed['email'] ?? null,
                'phone' => $parsed['phone'] ?? null,
                'summary' => $parsed['summary'] ?? null,
                'skills' => $parsed['skills'] ?? [],
                'experience' => $parsed['experience'] ?? [],
                'education' => $parsed['education'] ?? [],
                'companies' => $parsed['companies'] ?? [],
                'projects' => $parsed['projects'] ?? [],
                'certifications' => $parsed['certifications'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error('Resume parsing failed', ['resume_id' => $resume->id, 'error' => $e->getMessage()]);
            $resume->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        } finally {
            // Clean up temp file
            Storage::disk('local')->delete($path);
        }

        return response()->json(['data' => $this->toResource($resume->fresh())], 201);
    }

    public function show(Request $request, ParsedResume $parsedResume)
    {
        abort_unless($request->user()->can('employees.manage'), 403, 'Only a company admin can view parsed resumes.');
        abort_unless($parsedResume->company_id === $request->user()->company_id, 404);

        return response()->json(['data' => $this->toResource($parsedResume)]);
    }

    public function destroy(Request $request, ParsedResume $parsedResume)
    {
        abort_unless($request->user()->can('employees.manage'), 403, 'Only a company admin can delete parsed resumes.');
        abort_unless($parsedResume->company_id === $request->user()->company_id, 404);

        $parsedResume->delete();

        return response()->json(null, 204);
    }

    private function extractText(string $filePath): string
    {
        // Use pdftotext (poppler-utils) – available on the host
        $escaped = escapeshellarg($filePath);
        $output = shell_exec("pdftotext -layout {$escaped} - 2>/dev/null");

        return $output ?? '';
    }

    private function parseWithClaude(string $text): array
    {
        $apiKey = config('services.gemini.key');

        if (empty($apiKey)) {
            throw new \RuntimeException('Gemini API key is not configured. Please set GEMINI_API_KEY in your environment. Get a free key at https://aistudio.google.com/app/apikey');
        }

        $prompt = <<<PROMPT
You are an expert resume parser. Extract structured information from the following resume text and return ONLY a valid JSON object with these exact keys:

{
  "name": "Full name of the candidate",
  "email": "Email address or null",
  "phone": "Phone number or null",
  "summary": "Professional summary or objective (1-3 sentences) or null",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "e.g. Jan 2020 – Mar 2023",
      "description": "Brief description of responsibilities"
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "University/College name",
      "year": "Graduation year or duration",
      "gpa": "GPA if mentioned or null"
    }
  ],
  "companies": ["Company A", "Company B", ...],
  "projects": [
    {
      "name": "Project name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "certifications": ["Certification 1", "Certification 2", ...]
}

Rules:
- Return ONLY the JSON object, no markdown, no explanation, no code fences.
- If a field has no data, use null for strings or [] for arrays.
- Keep all text concise and clean.
- The "companies" array should contain unique company names from the work experience.

Resume text:
PROMPT;

        $response = Http::timeout(60)->post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='.$apiKey,
            [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt."\n\n".mb_substr($text, 0, 12000)],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.1,
                    'maxOutputTokens' => 2048,
                ],
            ]
        );

        if ($response->failed()) {
            throw new \RuntimeException('Gemini API request failed: '.$response->body());
        }

        $content = $response->json('candidates.0.content.parts.0.text', '');

        // Strip markdown code fences if Gemini wraps the JSON
        $content = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
        $content = preg_replace('/\s*```$/', '', $content);

        $decoded = json_decode(trim($content), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            // Try to extract JSON from the response if there's extra text
            if (preg_match('/\{[\s\S]+\}/m', $content, $matches)) {
                $decoded = json_decode($matches[0], true);
            }
        }

        if (! is_array($decoded)) {
            throw new \RuntimeException('Could not parse structured data from resume. The AI response was not valid JSON.');
        }

        return $decoded;
    }

    private function toResource(ParsedResume $resume): array
    {
        return [
            'id' => $resume->id,
            'file_name' => $resume->file_name,
            'status' => $resume->status,
            'error_message' => $resume->error_message,
            'candidate_name' => $resume->candidate_name,
            'email' => $resume->email,
            'phone' => $resume->phone,
            'summary' => $resume->summary,
            'skills' => $resume->skills ?? [],
            'experience' => $resume->experience ?? [],
            'education' => $resume->education ?? [],
            'companies' => $resume->companies ?? [],
            'projects' => $resume->projects ?? [],
            'certifications' => $resume->certifications ?? [],
            'created_at' => $resume->created_at?->toIso8601String(),
        ];
    }
}
