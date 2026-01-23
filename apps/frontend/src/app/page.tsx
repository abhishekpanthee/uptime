import Link from "next/link";
import { Activity, ShieldCheck, ArrowRight, Server, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-50 selection:bg-[#002147] selection:text-white">
      <header className="px-6 py-4 flex items-center justify-between border-b border-zinc-100/50 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#002147] to-[#005bb5] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">↗</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-[#002147]">
            Uptime Monitor
          </span>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/login" 
            className="text-sm font-medium text-zinc-600 hover:text-[#002147] transition-colors px-4 py-2 rounded-lg hover:bg-zinc-100/50"
          >
            Admin Login
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center pt-16 pb-32">
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-green-200 bg-green-50/80 text-sm font-medium text-green-700 mb-6 shadow-sm">
            <span className="relative flex h-2.5 w-2.5 mr-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            All Systems Operational
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-950 leading-[1.1]">
            Real-time Uptime <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#002147] via-[#005bb5] to-[#003d7a]">
              Monitoring System
            </span>
          </h1>

          <p className="text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Monitor your web services with real-time uptime tracking. Get instant notifications and detailed analytics for all your critical services.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link 
              href="/status" 
              className="group w-full sm:w-auto px-8 py-3.5 bg-[#002147] text-white rounded-lg font-semibold hover:bg-[#003366] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5"
            >
              <Activity className="w-5 h-5 group-hover:animate-pulse" />
              View System Status
            </Link>
            
            <Link 
              href="/dashboard" 
              className="w-full sm:w-auto px-8 py-3.5 bg-white border border-zinc-200 text-zinc-900 rounded-lg font-semibold hover:bg-zinc-50 hover:border-zinc-300 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-5 h-5" />
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>

      <div className="border-t border-zinc-100/50 bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-zinc-900 mb-16">Why Choose Us?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="card p-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-[#002147]" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-3">Real-time Monitoring</h3>
              <p className="text-zinc-600 leading-relaxed">
                Services are checked every 60 seconds for instant outage detection and rapid incident response.
              </p>
            </div>

            <div className="card p-8">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl flex items-center justify-center mb-6">
                <Server className="w-6 h-6 text-[#002147]" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-3">Multi-Service Tracking</h3>
              <p className="text-zinc-600 leading-relaxed">
                Monitor exam portals, library systems, department websites, and internal services separately.
              </p>
            </div>

            <div className="card p-8">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6 text-[#002147]" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-3">Public Transparency</h3>
              <p className="text-zinc-600 leading-relaxed">
                No login required. Students can verify service status anytime without authentication.
              </p>
            </div>

          </div>
        </div>
      </div>

      <footer className="border-t border-zinc-100/50 bg-zinc-50/50 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-zinc-600">
          <p>Uptime Monitoring System © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}