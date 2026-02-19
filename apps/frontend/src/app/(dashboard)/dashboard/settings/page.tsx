"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LogOut, Mail, UserRound } from "lucide-react";
import { api } from "@/lib/api";

export default function SettingsPage() {
	const router = useRouter();
	const [userData, setUserData] = useState({ name: "", email: "" });
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const response = await api.get("/auth/me");
				setUserData(response.data.user);
			} catch (error) {
				console.error("Failed to fetch user data:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchUserData();
	}, []);

	const handleSignOut = () => {
		localStorage.removeItem("uptimeToken");
		router.push("/login");
	};
	return (
		<div className="space-y-6">
			<div className="surface-panel fade-up overflow-hidden">
				<div className="border-b border-[var(--border)] bg-gradient-to-r from-[#0f4c81] to-[#1b6aa8] px-6 py-7 text-white sm:px-8">
					<h1 className="text-2xl font-bold">Account Settings</h1>
					<p className="mt-2 text-sm text-[#d6e8fb]">
						Manage administrator profile information and session access.
					</p>
				</div>

				<div className="space-y-5 px-6 py-6 sm:px-8">
					<div>
						<label className="mb-2 block text-sm font-semibold text-[var(--ink)]">Full Name</label>
						<div className="relative">
							<UserRound className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[var(--ink-soft)]" />
							<input
								type="text"
								disabled
								value={loading ? "Loading..." : userData.name}
								className="input-field cursor-not-allowed pl-10 text-[var(--ink-soft)]"
							/>
						</div>
					</div>

					<div>
						<label className="mb-2 block text-sm font-semibold text-[var(--ink)]">Email Address</label>
						<div className="relative">
							<Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[var(--ink-soft)]" />
							<input
								type="text"
								disabled
								value={loading ? "Loading..." : userData.email}
								className="input-field cursor-not-allowed pl-10 text-[var(--ink-soft)]"
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="surface-panel fade-up max-w-2xl p-6" style={{ animationDelay: "80ms" }}>
				<p className="mb-4 text-sm text-[var(--ink-soft)]">
					Signing out will end the current admin session on this device.
				</p>
				<div>
					<button
						onClick={handleSignOut}
						className="inline-flex items-center gap-2 rounded-xl bg-[#c23b31] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ad3128]"
					>
						<LogOut className="h-4 w-4" />
						Sign Out
					</button>
				</div>
			</div>
		</div>
	);
}
