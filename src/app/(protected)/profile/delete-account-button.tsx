"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/app/actions/account";
import { signOut } from "@/services/auth";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      setError("Type DELETE to confirm.");
      return;
    }

    setLoading(true);
    setError("");

    const { success, error: deleteError } = await deleteAccount();

    if (!success) {
      setError(deleteError || "Failed to delete account.");
      setLoading(false);
      return;
    }

    await signOut();
    router.push("/login");
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive transition-all hover:border-destructive/40 hover:bg-destructive/10"
      >
        <Trash2 className="size-4.5" aria-hidden />
        Delete account
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-destructive">
        This permanently deletes your account and all personal fitness data.
        This cannot be undone.
      </p>
      <div>
        <label
          htmlFor="confirmDelete"
          className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          Type DELETE to confirm
        </label>
        <input
          id="confirmDelete"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-destructive focus:ring-2 focus:ring-destructive/20"
          placeholder="DELETE"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading || confirmText !== "DELETE"}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Deleting…" : "Permanently delete"}
        </button>
        <button
          onClick={() => {
            setShowConfirm(false);
            setConfirmText("");
            setError("");
          }}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
