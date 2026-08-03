import { Users2 } from "lucide-react";

interface AuthShowcaseProps {
  eyebrow: string;
  title: string;
  description: string;
}

function IsometricArt() {
  return (
    <svg viewBox="0 0 200 220" className="h-56 w-56" aria-hidden="true">
      {/* Outer cube */}
      <polygon points="100,10 175,52 100,94 25,52" fill="white" fillOpacity="0.9" />
      <polygon points="25,52 100,94 100,180 25,138" fill="white" fillOpacity="0.55" />
      <polygon points="175,52 100,94 100,180 175,138" fill="white" fillOpacity="0.7" />
      {/* Inner offset cube for depth */}
      <polygon points="100,62 137,83 100,104 63,83" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" />
    </svg>
  );
}

export function AuthShowcase({ eyebrow, title, description }: AuthShowcaseProps) {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 lg:flex lg:w-1/2 lg:items-center lg:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(white 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden="true"
      />

      <div className="relative flex w-full max-w-md flex-col gap-10">
        <div>
          <p className="text-sm font-medium text-brand-100">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">{title}</h2>
          <p className="mt-3 text-sm text-brand-100">{description}</p>
        </div>

        <div className="flex items-center justify-center">
          <IsometricArt />
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Users2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">One place for HR</p>
            <p className="text-xs text-gray-500">Employees, attendance, and leave — organized for every team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
