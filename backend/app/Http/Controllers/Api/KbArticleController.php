<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\KbArticle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KbArticleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = KbArticle::with('author:id,name')->published();

        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where(function ($w) use ($q) {
                $w->where('title', 'like', "%{$q}%")
                    ->orWhere('body', 'like', "%{$q}%");
            });
        }

        if ($request->filled('category') && $request->string('category') !== 'all') {
            $query->where('category', $request->string('category'));
        }

        $articles = $query->orderByDesc('updated_at')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => $articles->map(fn (KbArticle $a) => $this->toListResource($a)),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'last_page'    => $articles->lastPage(),
                'total'        => $articles->total(),
                'per_page'     => $articles->perPage(),
            ],
        ]);
    }

    public function categories(): JsonResponse
    {
        $categories = KbArticle::published()
            ->selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->orderBy('category')
            ->get()
            ->map(fn ($row) => ['name' => $row->category, 'count' => (int) $row->count]);

        return response()->json(['data' => $categories]);
    }

    public function show(KbArticle $kbArticle): JsonResponse
    {
        $kbArticle->increment('views');
        $kbArticle->load('author:id,name');

        return response()->json(['data' => $this->toFullResource($kbArticle)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'        => ['required', 'string', 'max:255'],
            'category'     => ['required', 'string', 'max:100'],
            'body'         => ['required', 'string'],
            'tags'         => ['nullable', 'array'],
            'tags.*'       => ['string', 'max:50'],
            'is_published' => ['boolean'],
        ]);

        $article = KbArticle::create([
            ...$data,
            'company_id' => $request->user()->company_id,
            'author_id'  => $request->user()->id,
        ]);

        $article->load('author:id,name');

        return response()->json(['data' => $this->toFullResource($article)], 201);
    }

    public function update(Request $request, KbArticle $kbArticle): JsonResponse
    {
        $data = $request->validate([
            'title'        => ['sometimes', 'string', 'max:255'],
            'category'     => ['sometimes', 'string', 'max:100'],
            'body'         => ['sometimes', 'string'],
            'tags'         => ['nullable', 'array'],
            'tags.*'       => ['string', 'max:50'],
            'is_published' => ['boolean'],
        ]);

        $kbArticle->update($data);
        $kbArticle->load('author:id,name');

        return response()->json(['data' => $this->toFullResource($kbArticle)]);
    }

    public function destroy(KbArticle $kbArticle): JsonResponse
    {
        $kbArticle->delete();

        return response()->json(null, 204);
    }

    private function toListResource(KbArticle $a): array
    {
        return [
            'id'           => $a->id,
            'title'        => $a->title,
            'category'     => $a->category,
            'tags'         => $a->tags ?? [],
            'author'       => $a->author ? ['id' => $a->author->id, 'name' => $a->author->name] : null,
            'is_published' => $a->is_published,
            'views'        => $a->views,
            'excerpt'      => mb_substr(strip_tags($a->body), 0, 160),
            'created_at'   => $a->created_at?->toIso8601String(),
            'updated_at'   => $a->updated_at?->toIso8601String(),
        ];
    }

    private function toFullResource(KbArticle $a): array
    {
        return array_merge($this->toListResource($a), ['body' => $a->body]);
    }
}
