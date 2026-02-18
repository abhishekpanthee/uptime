"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
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
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
				<p className="text-zinc-500 text-sm">Manage your account and preferences.</p>
			</div>

			<div className="bg-white border border-zinc-200 rounded-lg shadow-sm max-w-2xl">
				<div className="p-6 border-b border-zinc-100">
					<h2 className="text-lg font-semibold text-zinc-900">Profile Information</h2>
					<p className="text-sm text-zinc-500">Your account details.</p>
				</div>

				<div className="p-6">
					<div className="grid grid-cols-1 gap-4">
						<div>
							<label className="block text-sm font-medium text-zinc-700 mb-1">
								Full Name
							</label>
							<input
								type="text"
								disabled
								value={loading ? "Loading..." : userData.name}
								className="w-full px-3 py-2 border border-zinc-200 rounded-md bg-zinc-50 text-zinc-500 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-zinc-700 mb-1">
								Email Address
							</label>
							<input
								type="text"
								disabled
								value={loading ? "Loading..." : userData.email}
								className="w-full px-3 py-2 border border-zinc-200 rounded-md bg-zinc-50 text-zinc-500 cursor-not-allowed"
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Sign Out Section */}
			<div className="bg-white border border-zinc-200 rounded-lg shadow-sm max-w-2xl mt-6">
				<div className="p-6">
					<button
						onClick={handleSignOut}
						className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
					>
						<LogOut className="w-4 h-4" />
						Sign Out
					</button>
				</div>
			</div>
		</div>
	);
}
