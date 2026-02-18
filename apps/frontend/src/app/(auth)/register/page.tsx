"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { LayoutDashboard, Loader2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const res = await api.post("/auth/register", { name, email, password });

      localStorage.setItem("uptimeToken", res.data.token);

      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2a5a8c] via-[#1e4a7a] to-[#2a5a8c] px-4">
      <div className="w-full max-w-md bg-[#2a5a8c] border border-white/30 rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-[#2563a0] rounded-full">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create an account
          </h1>
          <p className="text-gray-100 mt-2 text-sm">
            Start monitoring your websites today.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500/30 rounded-md flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-100 mb-1">
              Full Name
            </label>
            <input
              name="name"
              type="text"
              required
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-white/30 rounded-md bg-[#1e4a7a] text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-100 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-white/30 rounded-md bg-[#1e4a7a] text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-100 mb-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-white/30 rounded-md bg-[#1e4a7a] text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563a0] hover:bg-[#1d4f85] text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-100">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}