"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { X, Loader2, AlertCircle } from "lucide-react";

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add monitor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-[#2a5a8c] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">

        <div className="flex items-center justify-between px-8 py-6 border-b border-white/30 bg-gradient-to-r from-zinc-50 to-white">
          <h3 className="font-bold text-lg text-white">Add New Monitor</h3>
          <button onClick={onClose} className="text-gray-100 hover:text-gray-100 transition-colors p-1 hover:bg-white/15 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="text-sm text-red-300 bg-red-900/30 p-3.5 rounded-lg border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Website URL
            </label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://example.com"
              className="input-field"
            />
            <p className="text-xs text-gray-100 mt-2">
              Include the full URL with https:// or http://
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-100 hover:bg-white/15 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold bg-[#2563a0] text-white hover:bg-[#2e6fb0] rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Adding...' : 'Add Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}