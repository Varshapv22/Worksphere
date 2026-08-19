"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { ApiError } from "@/lib/api";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors",
          "hover:bg-gray-100 dark:hover:bg-gray-700/60",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        )}
      >
        <span className="hidden text-sm text-gray-600 dark:text-gray-400 sm:inline">{user.name}</span>
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
          {initials(user.name)}
        </span>
        <ChevronDown
          className={cn("hidden size-4 text-gray-400 transition-transform sm:block", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg animate-[fade-in_0.1s_ease-out] dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setEditOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/30"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      )}

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}

function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name);
    setEmail(user.email);
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirmation("");
    setErrors({});
  }, [open, user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      await updateProfile({
        name,
        email,
        ...(newPassword
          ? {
              current_password: currentPassword,
              new_password: newPassword,
              new_password_confirmation: newPasswordConfirmation,
            }
          : {}),
      });
      toast.success("Profile updated.");
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ?? { general: [err.message] });
      } else {
        setErrors({ general: ["Something went wrong."] });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit profile" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name?.[0]} />
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email?.[0]}
        />

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Change password <span className="font-normal">(optional)</span>
          </p>
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={errors.current_password?.[0]}
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.new_password?.[0]}
            hint="Leave blank to keep your current password."
          />
          <Input
            label="Confirm new password"
            type="password"
            value={newPasswordConfirmation}
            onChange={(e) => setNewPasswordConfirmation(e.target.value)}
          />
        </div>

        {errors.general && <p className="text-sm text-danger-600">{errors.general[0]}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
