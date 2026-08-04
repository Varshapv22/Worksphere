"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, HourglassIcon, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { AuthShowcase } from "@/components/AuthShowcase";

export default function RegisterCompanyPage() {
  const { registerCompany } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const res = await registerCompany({
        company_name: companyName,
        company_slug: companySlug,
        company_email: companyEmail,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
      });
      setSubmittedMessage(res.message);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ?? { general: [err.message] });
      } else {
        setErrors({ general: ["Something went wrong. Please try again."] });
      }
    } finally {
      setLoading(false);
    }
  }

  if (submittedMessage) {
    return (
      <div className="flex min-h-screen">
        <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
          <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-warning-50 text-warning-600">
              <HourglassIcon className="size-7" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold text-gray-900">Registration submitted</h1>
            <p className="mt-2 text-sm text-gray-600">{submittedMessage}</p>
            <p className="mt-1 text-sm text-gray-500">
              You&apos;ll be able to sign in as soon as a WorkSphere admin approves{" "}
              <span className="font-medium text-gray-700">{companyName}</span>.
            </p>
            <Link href="/login" className="mt-8 w-full">
              <Button size="lg" className="w-full rounded-full">
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>

        <AuthShowcase
          eyebrow="Almost there"
          title="Sit tight — approval is quick."
          description="A WorkSphere admin reviews every new workspace before it goes live, so your team's data stays protected from day one."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 text-lg font-bold text-brand-700">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
              W
            </span>
            WorkSphere
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">Register your company</h1>
          <p className="mt-2 text-sm text-gray-500">Set up your company workspace and admin account</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Company name"
                name="company_name"
                className="rounded-full"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                error={errors["company_name"]?.[0]}
              />
              <Input
                label="Company slug"
                name="company_slug"
                className="rounded-full"
                required
                value={companySlug}
                onChange={(e) => setCompanySlug(e.target.value)}
                error={errors["company_slug"]?.[0]}
              />
            </div>
            <Input
              label="Company email"
              name="company_email"
              type="email"
              className="rounded-full"
              required
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              error={errors["company_email"]?.[0]}
            />

            <div className="my-1 flex items-center gap-3">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Admin account
              </span>
              <hr className="flex-1 border-gray-200" />
            </div>

            <Input
              label="Admin name"
              name="admin_name"
              className="rounded-full"
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              error={errors["admin_name"]?.[0]}
            />
            <Input
              label="Admin email"
              name="admin_email"
              type="email"
              className="rounded-full"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              error={errors["admin_email"]?.[0]}
            />
            <Input
              label="Admin password"
              name="admin_password"
              type={showPassword ? "text" : "password"}
              className="rounded-full"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              error={errors["admin_password"]?.[0]}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              }
            />
            {errors.general && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {errors.general[0]}
              </div>
            )}
            <Button type="submit" size="lg" isLoading={loading} className="mt-2 w-full rounded-full">
              Create company
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="rounded-sm font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <AuthShowcase
        eyebrow="Get started"
        title="Set up your workspace in minutes."
        description="Bring your team on board and start tracking employees, attendance, and leave from day one."
      />
    </div>
  );
}
