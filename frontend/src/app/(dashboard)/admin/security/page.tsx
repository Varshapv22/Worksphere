"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import type { AllowedIp } from "@/lib/types";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function AdminSecurityPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Security" description="Two-factor authentication and IP restrictions for platform access" />
      <TwoFactorCard />
      <IpAllowlistCard />
    </div>
  );
}

function TwoFactorCard() {
  const toast = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setupData, setSetupData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ enabled: boolean }>("/admin/2fa/status");
      setEnabled(res.enabled);
    } catch {
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function startSetup() {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ secret: string; otpauth_url: string }>("/admin/2fa/setup", { method: "POST" });
      setSetupData(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start 2FA setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ recovery_codes: string[] }>("/admin/2fa/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setRecoveryCodes(res.recovery_codes);
      setSetupData(null);
      setCode("");
      setEnabled(true);
      toast.success("Two-factor authentication enabled.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await apiFetch("/admin/2fa/disable", { method: "POST" });
      setEnabled(false);
      setRecoveryCodes(null);
      toast.success("Two-factor authentication disabled.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to disable 2FA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Two-factor authentication" description="Require a TOTP code (Google Authenticator, 1Password, etc.) when you sign in">
      {enabled === null ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : recoveryCodes ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="font-medium text-gray-900 dark:text-gray-100">Save these recovery codes somewhere safe:</p>
          <p className="text-gray-500">Each can be used once if you lose access to your authenticator app.</p>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 font-mono text-xs dark:bg-gray-900">
            {recoveryCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <Button size="sm" className="w-fit" onClick={() => setRecoveryCodes(null)}>
            Done
          </Button>
        </div>
      ) : enabled ? (
        <div className="flex items-center justify-between">
          <Badge variant="success" dot>
            Enabled
          </Badge>
          <Button size="sm" variant="danger" disabled={busy} onClick={disable}>
            Disable
          </Button>
        </div>
      ) : setupData ? (
        <form onSubmit={confirmSetup} className="flex flex-col gap-4 sm:max-w-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add this key to your authenticator app, or paste the setup URL directly:
          </p>
          <div className="rounded-lg bg-gray-50 p-3 font-mono text-sm dark:bg-gray-900">{setupData.secret}</div>
          <p className="break-all text-xs text-gray-400">{setupData.otpauth_url}</p>
          <Input
            label="Enter the 6-digit code to confirm"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setSetupData(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={busy}>
              Confirm & enable
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between">
          <Badge variant="neutral" dot>
            Disabled
          </Badge>
          <Button size="sm" disabled={busy} onClick={startSetup}>
            <KeyRound className="size-3.5" aria-hidden="true" />
            Set up 2FA
          </Button>
        </div>
      )}
    </Card>
  );
}

function IpAllowlistCard() {
  const toast = useToast();
  const confirm = useConfirm();
  const [ips, setIps] = useState<AllowedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [ip, setIp] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ allowed_ips: AllowedIp[] }>("/admin/security/allowed-ips");
      setIps(res.allowed_ips);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load IP allowlist.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (ips.length === 0) {
      const ok = await confirm({
        title: "Restrict platform access to specific IPs?",
        description:
          "Once you add the first entry, only listed IP addresses can access company management, billing, and other platform routes. Make sure this includes your own current IP.",
        confirmLabel: "Add anyway",
        variant: "danger",
      });
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/admin/security/allowed-ips", {
        method: "POST",
        body: JSON.stringify({ ip_address: ip, label: label || undefined }),
      });
      setIp("");
      setLabel("");
      toast.success("IP added.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add IP.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(entry: AllowedIp) {
    const ok = await confirm({ title: `Remove ${entry.ip_address} from the allowlist?`, variant: "danger" });
    if (!ok) return;
    try {
      await apiFetch(`/admin/security/allowed-ips/${entry.id}`, { method: "DELETE" });
      toast.success("Removed.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove IP.");
    }
  }

  return (
    <Card
      title="IP allowlist"
      description="Restrict platform-management access to specific IP addresses. Empty = no restriction."
    >
      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input label="IP address" placeholder="203.0.113.5" required value={ip} onChange={(e) => setIp(e.target.value)} />
        </div>
        <div className="flex-1">
          <Input label="Label (optional)" placeholder="Office" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <Button type="submit" isLoading={submitting}>
          Add
        </Button>
      </form>
      {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : ips.length === 0 ? (
        <EmptyState message="No restrictions — platform management is reachable from any IP." />
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
          {ips.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <span className="font-mono text-gray-900 dark:text-gray-100">{entry.ip_address}</span>
                {entry.label && <span className="ml-2 text-gray-500">{entry.label}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(entry)}
                className="inline-flex items-center gap-1 rounded-sm text-danger-600 transition-colors hover:text-danger-700 hover:underline"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
