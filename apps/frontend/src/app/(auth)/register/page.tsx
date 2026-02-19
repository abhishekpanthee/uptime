"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { AlertCircle, LayoutDashboard, Loader2 } from "lucide-react";
import { CollegeBrand } from "@/components/brand/CollegeBrand";

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
    if (response?.data?.error) {
      return response.data.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Registration failed";
}

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
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface-panel grid w-full max-w-4xl overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="hidden bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] p-8 text-white lg:block">
          <div className="max-w-sm">
            <CollegeBrand tone="light" subtitle="Service Status Portal" />
            <div className="mb-6 mt-6 inline-flex rounded-xl bg-white/15 p-3">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d5e9ff]">
              Setup Admin Account
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight">
              Start managing official status communication
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#d6e8fb]">
              Create an administrator account to configure monitors and publish service health.
            </p>
          </div>
        </aside>

        <div className="p-7 sm:p-9">
          <CollegeBrand
            href="/"
            compact
            subtitle="Admin Registration"
            className="mb-5 lg:hidden"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            Register
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--ink)]">Create admin account</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Set up access for monitor management.</p>

          {error && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#f0c5c1] bg-[#fdebea] px-3 py-2 text-sm text-[#b22d24]">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--ink)]">Full Name</label>
              <input name="name" type="text" required placeholder="Admin Name" className="input-field" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--ink)]">Email</label>
              <input name="email" type="email" required placeholder="admin@tcioe.edu.np" className="input-field" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--ink)]">Password</label>
              <input name="password" type="password" required placeholder="••••••••" className="input-field" />
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          <p className="mt-5 text-sm text-[var(--ink-soft)]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[var(--brand)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
