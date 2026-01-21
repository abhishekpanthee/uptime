"use client";

import { User } from "lucide-react";

export default function SettingsPage() {
  // In a real app, you would fetch the 'user' object from an API
  // For now, we'll just show the static UI structure
  
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
        
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
              <User className="w-8 h-8" />
            </div>
            <div>
              <button className="text-sm font-medium text-black border border-zinc-300 px-3 py-1.5 rounded-md hover:bg-zinc-50 transition-colors">
                Change Avatar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Full Name
              </label>
              <input 
                type="text" 
                disabled 
                value="Administrator" 
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
                value="admin@tcioe.edu.np" 
                className="w-full px-3 py-2 border border-zinc-200 rounded-md bg-zinc-50 text-zinc-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}