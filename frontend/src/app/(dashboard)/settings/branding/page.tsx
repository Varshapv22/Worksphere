"use client";

import { useEffect, useState } from "react";
import {
  Palette,
  Globe,
  Mail,
  Image,
  Save,
  Loader2,
  Eye,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import type { WhiteLabelConfig } from "@/lib/types";

// ── Color picker ──────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#16a34a", "#2563eb", "#7c3aed", "#dc2626", "#ea580c",
  "#0891b2", "#0d9488", "#d97706", "#db2777", "#1f2937",
];

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || "#16a34a"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white p-0.5 dark:border-gray-600 dark:bg-gray-800"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          placeholder="#000000"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              "size-6 rounded-full border-2 transition-transform hover:scale-110",
              value === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent"
            )}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

// ── Preview ───────────────────────────────────────────────────────────────────

function BrandingPreview({ config }: { config: Partial<WhiteLabelConfig> }) {
  const color = config.primary_color || "#16a34a";
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Live Preview</p>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        {/* Mock nav */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          {config.logo_url ? (
            <img src={config.logo_url} alt="Logo" className="h-7 w-auto object-contain" />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-lg text-sm text-white font-bold" style={{ backgroundColor: color }}>W</span>
          )}
          <span className="font-bold text-sm text-gray-900 dark:text-gray-100" style={{ color }}>
            {config.app_name || "WorkSphere"}
          </span>
        </div>

        {/* Mock login */}
        <div className="p-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Welcome back</p>
          {config.login_message && <p className="text-sm text-gray-500 mb-3">{config.login_message}</p>}
          <div className="space-y-2">
            <div className="h-8 rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="h-8 rounded-lg bg-gray-100 dark:bg-gray-800" />
            <button
              className="w-full h-8 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: color }}
            >
              Sign In
            </button>
          </div>
          {config.support_email && (
            <p className="mt-3 text-xs text-gray-400">Support: {config.support_email}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BrandingPage() {
  const toast = useToast();
  const [config, setConfig] = useState<Partial<WhiteLabelConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ data: WhiteLabelConfig }>("/white-label")
      .then((res) => setConfig(res.data ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(field: keyof WhiteLabelConfig, value: string) {
    setConfig((c) => ({ ...c, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ data: WhiteLabelConfig }>("/white-label", {
        method: "PATCH",
        body: JSON.stringify(config),
      });
      setConfig(res.data);
      toast.success("Branding settings saved!");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="White Label Branding"
        description="Customise your app name, logo, colours, and login page for a branded experience"
      />

      <form onSubmit={handleSave}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Settings */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Identity */}
            <Card>
              <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Image className="size-4 text-brand-500" />
                App Identity
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">App Name</label>
                  <input value={config.app_name ?? ""} onChange={(e) => set("app_name", e.target.value)} className={inp} placeholder="WorkSphere" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Logo URL</label>
                  <input type="url" value={config.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} className={inp} placeholder="https://cdn.example.com/logo.png" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Favicon URL</label>
                  <input type="url" value={config.favicon_url ?? ""} onChange={(e) => set("favicon_url", e.target.value)} className={inp} />
                </div>
              </div>
            </Card>

            {/* Colors */}
            <Card>
              <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Palette className="size-4 text-brand-500" />
                Brand Colours
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <ColorPicker
                  label="Primary Colour"
                  value={config.primary_color ?? ""}
                  onChange={(v) => set("primary_color", v)}
                />
                <ColorPicker
                  label="Secondary Colour"
                  value={config.secondary_color ?? ""}
                  onChange={(v) => set("secondary_color", v)}
                />
              </div>
            </Card>

            {/* Login page */}
            <Card>
              <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Eye className="size-4 text-brand-500" />
                Login Page
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Welcome Message</label>
                  <textarea value={config.login_message ?? ""} onChange={(e) => set("login_message", e.target.value)} rows={2} className={inp} placeholder="Welcome to Acme Corp HR Portal" />
                </div>
              </div>
            </Card>

            {/* Domain & Support */}
            <Card>
              <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Globe className="size-4 text-brand-500" />
                Domain & Support
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Custom Domain</label>
                  <input value={config.custom_domain ?? ""} onChange={(e) => set("custom_domain", e.target.value)} className={inp} placeholder="hr.yourcompany.com" />
                  <p className="text-xs text-gray-400 mt-0.5">Point a CNAME at our servers after saving.</p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Support Email</label>
                  <input type="email" value={config.support_email ?? ""} onChange={(e) => set("support_email", e.target.value)} className={inp} placeholder="support@yourcompany.com" />
                </div>
              </div>
            </Card>
          </div>

          {/* Preview */}
          <div className="flex flex-col gap-4">
            <BrandingPreview config={config} />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" isLoading={saving} size="lg">
            <Save className="size-4" /> Save Branding
          </Button>
        </div>
      </form>
    </div>
  );
}
