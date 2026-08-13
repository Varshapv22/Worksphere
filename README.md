# WorkSphere

Multi-tenant HR SaaS. Backend: Laravel 11 (PHP 8.2, MySQL). Frontend: Next.js 15.

This README covers running the app locally (with and without Docker), deploying it to a
Docker Swarm cluster, and the repeatable pattern for building out the remaining HR modules
on top of the foundation.

---

## Features

Multi-tenant SaaS core:

- **Authentication & tenancy** — Laravel Sanctum token auth, per-company tenant isolation
  (`IdentifyTenant` middleware), separate super-admin area (`/admin`) with its own auth
  guard.
- **Internal App Marketplace** — company admins enable/disable HR modules from a catalog
  (`/modules`); super admins manage the module catalog itself (`/admin/modules`).
  Module-gated pages fall back to a "not enabled" screen when a module is off.
- **Platform admin** — super-admin dashboard, company management, subscription plans.

Employee & org management:

- **Employees** — employee directory and records.
- **Org Chart** — drag-and-drop organization chart builder.
- **Departments** — department management.
- **Employee 360 Profile** — comprehensive multi-tab employee profile view.
- **AI Advisor** — AI-assisted HR guidance.

HR modules (each gated by the App Marketplace, module slug in parens):

- **Attendance** (`attendance`) — clock in/out and attendance tracking.
- **Leave** — leave/time-off requests and approvals.
- **Recruitment / Resume Parser** (`recruitment`) — applicant/resume intake.
- **Skills Matrix** (`skills-matrix`) — employee skills tracking.
- **Knowledge Base** (`knowledge-base`) — internal documentation/articles.
- **Recognition** (`recognition`) — employee recognition and kudos.
- **Career Roadmap** (`career-roadmap`) — career progression planning.
- **Meetings** (`meetings`) — meeting scheduling.
- **Asset Management** (`asset-management`) — company asset tracking and assignment.
- **Compliance** (`compliance`) — compliance tracking.
- **Analytics** (`analytics`) — HR analytics and reporting.
- **Payroll** (`payroll`) — Payroll Simulator and Payroll Config.
- **Developer API** (`developer-api`) — API access for integrations.
- **White Label** (`white-label`) — custom branding (`/settings/branding`).

---

## 1. Prerequisites

- PHP 8.2+ and the usual Laravel extensions (`pdo_mysql`, `mbstring`, `bcmath`, `exif`,
  `pcntl`, `zip`, `gd`)
- [Composer](https://getcomposer.org/) 2.x
- Node.js 20+ and npm
- MySQL 8 (for non-Docker local dev) or Docker
- Docker Engine with Swarm mode, if you plan to use `docker-stack.yml`:

  ```bash
  docker swarm init
  ```

  (Skip if `docker info` already shows `Swarm: active` — this machine only needs to run
  it once.)

---

## 2. Local development (no Docker)

**Backend:**

```bash
cd backend
cp .env.example .env
# Edit .env: set DB_CONNECTION=mysql and DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD
# to point at a MySQL instance you have running locally.
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The API is now at `http://localhost:8000`.

**Frontend:**

```bash
cd frontend
npm install
# Create frontend/.env.local with:
#   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
```

The app is now at `http://localhost:3000`.

**Demo login:** `admin@worksphere.test` / `password` — this comes from the database
seeder. The backend scaffold is expected to ship a seeder that creates this account; if
`php artisan migrate --seed` doesn't produce it, check `backend/database/seeders/` for a
`DatabaseSeeder` (or a dedicated `AdminUserSeeder`) and add one before relying on this
login.

---

## 3. Local development with Docker Compose

```bash
cp .env.example .env   # edit MYSQL_*, NEXT_PUBLIC_API_URL as needed
docker compose up --build
```

Once the containers are healthy, run migrations inside the running backend container:

```bash
docker compose exec backend php artisan migrate --seed
```

- App: `http://localhost:5393`
- API: `http://localhost:5393/api/v1`
- MySQL (for a DB client): `localhost:5394`
- Redis: `localhost:5395`
- Backend directly (bypassing the proxy): `http://localhost:5396`
- Frontend directly: `http://localhost:5397`

| Service           | Host port | Container port |
|--------------------|-----------|-----------------|
| nginx (app entry)  | 5393      | 80              |
| mysql              | 5394      | 3306            |
| redis              | 5395      | 6379            |
| backend (direct)   | 5396      | 8080            |
| frontend (direct)  | 5397      | 3000            |

The `backend`, `queue-worker`, and `scheduler` services all bind-mount `./backend`, and
`frontend` bind-mounts `./frontend` and runs `next dev` (see comments in
`docker-compose.yml` for why the frontend container targets the Dockerfile's `deps` stage
instead of the full production build) — so source edits are picked up without rebuilding.

---

## 4. Building images for Swarm

Build both images from the repo root (build context matters — the Dockerfiles expect it):

```bash
docker build -f docker/backend.Dockerfile -t worksphere-backend:latest .

docker build -f docker/frontend.Dockerfile -t worksphere-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1 .
```

`NEXT_PUBLIC_API_URL` is baked into the frontend's client JS at build time — if it
changes, you must rebuild the image, not just restart the container.

> **Note:** `docker/frontend.Dockerfile` assumes `output: 'standalone'` is set in
> `frontend/next.config.ts`. If the frontend scaffold didn't already include it, add:
> ```ts
> const nextConfig: NextConfig = {
>   output: 'standalone',
> };
> ```

---

## 5. Deploying to Swarm

```bash
docker swarm init   # if not already done
cp .env.example .env   # edit values
docker stack deploy -c docker-stack.yml --env-file .env worksphere
```

Run migrations once against the live stack (only needs to happen once per deploy, not per
replica):

```bash
docker exec -it $(docker ps -q -f name=worksphere_backend | head -1) php artisan migrate --seed --force
```

Same port map as Compose applies here: app at `http://<host>:5393`, MySQL at `<host>:5394`,
Redis at `<host>:5395`, backend direct at `<host>:5396`, frontend direct at `<host>:5397`.
Publishing MySQL/Redis to the host is convenient for debugging but widens the attack
surface on a real deployment — see the caution comment above the `mysql`/`redis` `ports:`
blocks in `docker-stack.yml` if you want to lock that down (remove the block, or restrict
with a firewall/security group).

Verify:

```bash
docker service ls
docker stack ps worksphere
```

**Secrets, the simple way vs. the hardened way:** `docker-stack.yml` reads
`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, etc. as plain environment variables sourced from
`.env` at deploy time (`--env-file .env`). That's the default here — it's simple and fine
for a single-manager / learning deployment. Docker Swarm also supports first-class
**secrets** (`docker secret create`, mounted as files under `/run/secrets/<name>`) for
production hardening later. Laravel doesn't natively read `_FILE`-suffixed env vars the
way some images do, so adopting secrets means either:

- a small entrypoint script that does `export DB_PASSWORD=$(cat /run/secrets/mysql_password)`
  before `php-fpm`/`artisan` starts, or
- reading the secret file directly in `config/database.php` via `file_get_contents()`.

Example of what the advanced version looks like (not wired into `docker-stack.yml`):

```yaml
secrets:
  mysql_root_password:
    external: true
  mysql_password:
    external: true
  app_key:
    external: true

services:
  backend:
    secrets:
      - mysql_password
      - app_key
```

```bash
echo "rootsecret" | docker secret create mysql_root_password -
echo "secret"     | docker secret create mysql_password -
php artisan --no-ansi key:generate --show | docker secret create app_key -
```

Adopt this once you're running WorkSphere somewhere that matters.

---

## 6. Scaling

```bash
docker service scale worksphere_backend=4
```

(Any service works the same way: `worksphere_frontend`, `worksphere_nginx`, etc.)

---

## 7. Rolling updates

```bash
docker build -f docker/backend.Dockerfile -t worksphere-backend:new-tag .
docker service update --image worksphere-backend:new-tag worksphere_backend
```

`docker-stack.yml` sets `order: start-first` on `backend`, `frontend`, and `nginx`, so
Swarm starts the new replica and waits for it to be healthy before stopping the old one —
zero-downtime as long as your `HEALTHCHECK` (both Dockerfiles have one) reflects real
readiness.

---

## 8. Logs / troubleshooting

```bash
docker service logs worksphere_backend
docker service logs worksphere_frontend
docker service logs worksphere_nginx
docker service ps worksphere_backend --no-trunc   # see why a task exited/restarted
```

---

## 9. Extending to the remaining modules

This foundation pass wires up auth, tenancy, and the deployment pipeline. The other 15+
HR modules (Payroll, Recruitment/ATS, Assets, Performance, Learning, Time Off,
Onboarding, etc.) all follow the same shape. Repeatable checklist per module:

1. **Migration** — new table(s), always including a `company_id` foreign key for tenant
   scoping.
2. **Model** — Eloquent model using the `BelongsToTenant` trait (auto-scopes queries to
   the current tenant).
3. **Policy** — authorization rules (`viewAny`, `view`, `create`, `update`, `delete`).
4. **FormRequest** — validation for create/update endpoints.
5. **API Resource** — shapes the JSON response.
6. **Controller** — thin, delegates to the model/policy/resource.
7. **Route registration** — add to `routes/api.php`, grouped under
   `auth:sanctum` + tenant middleware.
8. **Next.js page** — corresponding UI under `src/app/(dashboard)/<module>/`.

### Worked example: Assets module

Table: `assets` — `id`, `company_id`, `employee_id` (nullable), `category`, `name`,
`serial_number`, `status` (enum: `available`, `assigned`, `retired`), `assigned_at`,
`purchased_at`, `warranty_expires_at`.

**1. Migration** — `database/migrations/2026_08_03_000000_create_assets_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('category');
            $table->string('name');
            $table->string('serial_number')->unique();
            $table->enum('status', ['available', 'assigned', 'retired'])->default('available');
            $table->timestamp('assigned_at')->nullable();
            $table->date('purchased_at')->nullable();
            $table->date('warranty_expires_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
```

**2. Model** — `app/Models/Asset.php`

```php
<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'company_id',
        'employee_id',
        'category',
        'name',
        'serial_number',
        'status',
        'assigned_at',
        'purchased_at',
        'warranty_expires_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'purchased_at' => 'date',
        'warranty_expires_at' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
```

**3. Policy** — `app/Policies/AssetPolicy.php`

```php
<?php

namespace App\Policies;

use App\Models\Asset;
use App\Models\User;

class AssetPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('assets.view');
    }

    public function view(User $user, Asset $asset): bool
    {
        return $user->company_id === $asset->company_id && $user->can('assets.view');
    }

    public function create(User $user): bool
    {
        return $user->can('assets.create');
    }

    public function update(User $user, Asset $asset): bool
    {
        return $user->company_id === $asset->company_id && $user->can('assets.update');
    }

    public function delete(User $user, Asset $asset): bool
    {
        return $user->company_id === $asset->company_id && $user->can('assets.delete');
    }
}
```

**4. FormRequest** — `app/Http/Requests/StoreAssetRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Asset::class);
    }

    public function rules(): array
    {
        return [
            'employee_id' => ['nullable', 'exists:employees,id'],
            'category' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'serial_number' => ['required', 'string', 'max:100', 'unique:assets,serial_number'],
            'status' => ['required', Rule::in(['available', 'assigned', 'retired'])],
            'assigned_at' => ['nullable', 'date'],
            'purchased_at' => ['nullable', 'date'],
            'warranty_expires_at' => ['nullable', 'date', 'after_or_equal:purchased_at'],
        ];
    }
}
```

**5. API Resource** — `app/Http/Resources/AssetResource.php`

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category' => $this->category,
            'name' => $this->name,
            'serial_number' => $this->serial_number,
            'status' => $this->status,
            'employee' => $this->whenLoaded('employee', fn () => [
                'id' => $this->employee->id,
                'name' => $this->employee->name,
            ]),
            'assigned_at' => $this->assigned_at?->toIso8601String(),
            'purchased_at' => $this->purchased_at?->toDateString(),
            'warranty_expires_at' => $this->warranty_expires_at?->toDateString(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

**6. Controller** — `app/Http/Controllers/Api/AssetController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Asset::class);

        $assets = Asset::query()
            ->with('employee')
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return AssetResource::collection($assets);
    }

    public function store(StoreAssetRequest $request)
    {
        $asset = Asset::create($request->validated() + [
            'company_id' => $request->user()->company_id,
        ]);

        return new AssetResource($asset->load('employee'));
    }

    public function show(Asset $asset)
    {
        $this->authorize('view', $asset);

        return new AssetResource($asset->load('employee'));
    }

    public function update(UpdateAssetRequest $request, Asset $asset)
    {
        $this->authorize('update', $asset);

        $asset->update($request->validated());

        return new AssetResource($asset->load('employee'));
    }

    public function destroy(Asset $asset)
    {
        $this->authorize('delete', $asset);

        $asset->delete();

        return response()->noContent();
    }
}
```

**7. Route registration** — `routes/api.php`

```php
Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::apiResource('assets', \App\Http\Controllers\Api\AssetController::class);
});
```

**8. Next.js page** — `src/app/(dashboard)/assets/page.tsx` (list view fetching from
`NEXT_PUBLIC_API_URL + '/assets'`, following the same data-fetching/table pattern as
whatever other module pages already exist in the scaffold).

Copy this pattern for each remaining module, swapping in the module's fields, permission
names, and route prefix.
# Worksphere
