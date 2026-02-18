"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { X, Loader2, AlertCircle } from "lucide-react";

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) {
      return response.data.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to add monitor";
}

export function AddMonitorModal({ isOpen, onClose, onSuccess }: AddMonitorModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const url = formData.get("url") as string;

    try {
      await api.post("/websites", { 
        url, 
        is_public: false
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2239]/45 p-4 backdrop-blur-sm">
      <div className="surface-panel w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h3 className="text-lg font-semibold text-[var(--ink)]">Add New Monitor</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--ink-soft)] transition-colors hover:bg-[#f1f5fb] hover:text-[var(--ink)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-[#f0c5c1] bg-[#fdebea] p-3 text-sm text-[#b22d24]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
              Website URL
            </label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://example.com"
              className="input-field"
            />
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Include the full URL with https:// or http://
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:bg-[#eef3fa] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Adding...' : 'Add Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
