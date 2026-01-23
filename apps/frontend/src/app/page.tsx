import Link from "next/link";
import { Activity, ShieldCheck, ArrowRight, Server, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white selection:bg-[#002147] selection:text-white">
      <header className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#002147] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-[#002147]">
            TCIOE Monitor
          </span>
        </div>
        <div className="flex gap-4">
          <Link 
            href="/login" 
            className="text-sm font-medium text-zinc-600 hover:text-[#002147] transition-colors px-4 py-2 rounded-md hover:bg-zinc-50"
          >
            Admin Login
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center pt-20 pb-32">
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-green-200 bg-green-50 text-sm font-medium text-green-700 mb-6 shadow-sm">
            <span className="relative flex h-2.5 w-2.5 mr-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            System Operational
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
            Real-time status for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#002147] to-[#005bb5]">
              IOE Thapathali Campus
            </span>
          </h1>

          <p className="text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            The official uptime monitor for college services. Check the availability of the Exam Control Division, Library, and internal networks instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-8">
            <Link 
              href="/status" 
              className="group w-full sm:w-auto px-8 py-4 bg-[#002147] text-white rounded-lg font-semibold hover:bg-[#003366] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5"
            >
              <Activity className="w-5 h-5 group-hover:animate-pulse" />
              Check System Status
            </Link>
            
            <Link 
              href="/dashboard" 
              className="w-full sm:w-auto px-8 py-4 bg-white border border-zinc-200 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-50 hover:border-zinc-300 transition-all flex items-center justify-center gap-3"
            >
              <ShieldCheck className="w-5 h-5" />
              Manage Monitors
            </Link>
          </div>
        </div>
      </main>

      <div className="border-t border-zinc-100 bg-zinc-50/50 py-24">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
          
          <div className="bg-white p-8 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-[#002147]" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Real-time Tracking</h3>
            <p className="text-zinc-500 leading-relaxed">
              Services are pinged every 60 seconds to ensure immediate outage detection and rapid response from IT admin.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
              <Server className="w-6 h-6 text-[#002147]" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Subdomain Monitoring</h3>
            <p className="text-zinc-500 leading-relaxed">
              Separate tracking for critical subdomains like Exam Control, Library, and Department portals.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
              <CheckCircle2 className="w-6 h-6 text-[#002147]" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Public Transparency</h3>
            <p className="text-zinc-500 leading-relaxed">
              No login required for students. Anyone can verify if the system is down or if it's just their internet.
            </p>
          </div>

        </div>
      </div>

      <footer className="py-10 text-center border-t border-zinc-200 bg-white">
        <p className="text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} Tribhuvan University, IOE Thapathali Campus. All rights reserved.
        </p>
      </footer>
    </div>
  );
}