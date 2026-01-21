"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { X, Loader2 } from "lucide-react";

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // To refresh the list after adding
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
        is_public: false // Default to private
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">Add New Monitor</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Website URL
            </label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://google.com"
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Must include https:// or http://
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 rounded-md transition-colors flex items-center"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Monitor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}