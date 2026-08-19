"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Code2,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  Trash2,
  Webhook,
  CheckCircle2,
  AlertCircle,
  Globe,
  Pencil,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import type { ApiKey, Webhook as WebhookType } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={copy} className="rounded p-1 text-gray-400 hover:text-brand-500">
      {copied ? <CheckCircle2 className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
    </button>
  );
}

// ── API Key Row ───────────────────────────────────────────────────────────────

function ApiKeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: (id: number) => void }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
        <Key className="size-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{apiKey.name}</p>
          {!apiKey.is_active && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Revoked</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {apiKey.key_preview}
          </code>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-400">Last used: {fmtDate(apiKey.last_used_at)}</span>
          {apiKey.expires_at && (
            <>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">Expires: {fmtDate(apiKey.expires_at)}</span>
            </>
          )}
        </div>
        {apiKey.scopes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {apiKey.scopes.map((s) => (
              <span key={s} className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRevoke(apiKey.id)}
        className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        title="Revoke key"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ── Create Key Modal ──────────────────────────────────────────────────────────

const SCOPES = [
  "employees.read", "employees.write",
  "leave.read", "leave.write",
  "attendance.read",
  "payroll.read",
  "assets.read", "assets.write",
];

function CreateKeyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (key: ApiKey & { key: string }) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleScope(s: string) {
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ data: ApiKey & { key: string } }>("/developer/keys", {
        method: "POST",
        body: JSON.stringify({ name, scopes, expires_at: expiresAt || null }),
      });
      toast.success("API key created!");
      onCreated(res.data);
      setName(""); setScopes([]); setExpiresAt("");
    } catch {
      toast.error("Failed to create key.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create API Key">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Key Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            placeholder="e.g. Mobile App Integration" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scopes</label>
          <div className="grid grid-cols-2 gap-2">
            {SCOPES.map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} className="size-4 rounded border-gray-300 text-brand-600" />
                <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">{s}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expiry (optional)</label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving} disabled={!name}><Key className="size-4" /> Generate Key</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Newly created key dialog ──────────────────────────────────────────────────

function NewKeyDialog({ apiKey, onClose }: { apiKey: (ApiKey & { key: string }) | null; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  if (!apiKey) return null;
  return (
    <Modal open={true} onClose={onClose} title="API Key Created">
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="inline mr-1.5 size-4" />
            Copy this key now — it will never be shown again.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <code className={cn("flex-1 font-mono text-sm break-all", !shown && "blur-sm select-none")}>{apiKey.key}</code>
          <button type="button" onClick={() => setShown(!shown)} className="shrink-0 text-gray-400 hover:text-brand-500">
            {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <CopyButton text={apiKey.key} />
        </div>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}

// ── Webhook row ───────────────────────────────────────────────────────────────

function WebhookRow({ webhook, onDelete }: { webhook: WebhookType; onDelete: (id: number) => void }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
        <Webhook className="size-4 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{webhook.name}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", webhook.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500")}>
            {webhook.is_active ? "Active" : "Inactive"}
          </span>
          {webhook.failure_count > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">{webhook.failure_count} failures</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-400 truncate">{webhook.url}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {webhook.events.map((ev) => (
            <span key={ev} className="rounded bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              {ev}
            </span>
          ))}
        </div>
        {webhook.last_triggered_at && (
          <p className="mt-1 text-xs text-gray-400">Last triggered: {fmtDate(webhook.last_triggered_at)}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDelete(webhook.id)}
        className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ── Create Webhook Modal ──────────────────────────────────────────────────────

function CreateWebhookModal({
  open,
  availableEvents,
  onClose,
  onCreated,
}: {
  open: boolean;
  availableEvents: string[];
  onClose: () => void;
  onCreated: (w: WebhookType) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleEvent(ev: string) {
    setEvents((prev) => prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (events.length === 0) { toast.error("Select at least one event."); return; }
    setSaving(true);
    try {
      const res = await apiFetch<{ data: WebhookType }>("/developer/webhooks", {
        method: "POST",
        body: JSON.stringify({ name, url, events }),
      });
      toast.success("Webhook created!");
      onCreated(res.data);
      setName(""); setUrl(""); setEvents([]);
    } catch {
      toast.error("Failed to create webhook.");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  return (
    <Modal open={open} onClose={onClose} title="Create Webhook" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inp} placeholder="e.g. Slack Notifications" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Endpoint URL *</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required className={inp} placeholder="https://…" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Events *</label>
          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
            {availableEvents.map((ev) => (
              <label key={ev} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={events.includes(ev)} onChange={() => toggleEvent(ev)} className="size-4 rounded border-gray-300 text-brand-600" />
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{ev}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving} disabled={!name || !url}><Globe className="size-4" /> Create Webhook</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeveloperPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newKey, setNewKey] = useState<(ApiKey & { key: string }) | null>(null);
  const [tab, setTab] = useState<"keys" | "webhooks">("keys");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, whRes, evRes] = await Promise.all([
        apiFetch<{ data: ApiKey[] }>("/developer/keys"),
        apiFetch<{ data: WebhookType[] }>("/developer/webhooks"),
        apiFetch<{ data: string[] }>("/developer/events"),
      ]);
      setApiKeys(keysRes.data);
      setWebhooks(whRes.data);
      setAvailableEvents(evRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRevokeKey(id: number) {
    const ok = await confirm({
      title: "Revoke this API key?",
      description: "Apps using it will lose access.",
      confirmLabel: "Revoke",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/developer/keys/${id}`, { method: "DELETE" });
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("Key revoked.");
    } catch {
      toast.error("Failed to revoke.");
    }
  }

  async function handleDeleteWebhook(id: number) {
    const ok = await confirm({ title: "Delete this webhook?", variant: "danger" });
    if (!ok) return;
    try {
      await apiFetch(`/developer/webhooks/${id}`, { method: "DELETE" });
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success("Webhook deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Developer API"
        description="Manage API keys and webhooks to integrate WorkSphere with your systems"
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit dark:border-gray-700 dark:bg-gray-800">
        {(["keys", "webhooks"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t ? "bg-brand-600 text-white shadow" : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
            )}
          >
            {t === "keys" ? <Key className="size-4" /> : <Webhook className="size-4" />}
            {t === "keys" ? "API Keys" : "Webhooks"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-gray-400" /></div>
      ) : tab === "keys" ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowKeyModal(true)}><Plus className="size-4" /> New API Key</Button>
          </div>
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
              <Key className="size-10 text-gray-300" />
              <p className="text-sm text-gray-400">No API keys yet. Create one to start integrating.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {apiKeys.map((key) => (
                <ApiKeyRow key={key.id} apiKey={key} onRevoke={handleRevokeKey} />
              ))}
            </div>
          )}

          {/* Docs hint */}
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Usage</p>
            <code className="block rounded bg-gray-900 p-3 text-xs text-green-400 leading-relaxed">
              {`curl -H "Authorization: Bearer <YOUR_KEY>" \\
     -H "Accept: application/json" \\
     https://api.worksphere.io/v1/employees`}
            </code>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowWebhookModal(true)}><Plus className="size-4" /> New Webhook</Button>
          </div>
          {webhooks.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
              <Webhook className="size-10 text-gray-300" />
              <p className="text-sm text-gray-400">No webhooks yet. Add one to receive real-time events.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {webhooks.map((wh) => (
                <WebhookRow key={wh.id} webhook={wh} onDelete={handleDeleteWebhook} />
              ))}
            </div>
          )}
        </div>
      )}

      <CreateKeyModal
        open={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onCreated={(k) => {
          setShowKeyModal(false);
          setApiKeys((prev) => [k, ...prev]);
          setNewKey(k);
        }}
      />
      <CreateWebhookModal
        open={showWebhookModal}
        availableEvents={availableEvents}
        onClose={() => setShowWebhookModal(false)}
        onCreated={(w) => { setShowWebhookModal(false); setWebhooks((prev) => [w, ...prev]); }}
      />
      <NewKeyDialog apiKey={newKey} onClose={() => setNewKey(null)} />
    </div>
  );
}
