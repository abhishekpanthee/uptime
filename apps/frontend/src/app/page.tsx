import Link from "next/link";
import { Activity, ShieldCheck, ArrowRight, Server, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#2a5a8c] via-[#1e4a7a] to-[#2a5a8c] selection:bg-[#2563a0] selection:text-white">
      <header className="px-6 py-4 flex items-center justify-between bg-[#2a5a8c]/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#2563a0] to-[#1d4f85] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">↗</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Uptime Monitor
          </span>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/login" 
            className="text-sm font-medium text-gray-100 hover:text-[#2563a0] transition-colors px-4 py-2 rounded-lg hover:bg-white/15/50"
          >
            Admin Login
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center pt-16 pb-32">
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Real-time Uptime <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-200 to-indigo-300">
              Monitoring System
            </span>
          </h1>

          <p className="text-lg text-gray-100 max-w-2xl mx-auto leading-relaxed">
            Monitor your web services with real-time uptime tracking. Get instant notifications and detailed analytics for all your critical services.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link 
              href="/status" 
              className="group w-full sm:w-auto px-8 py-3.5 bg-[#2563a0] text-white rounded-lg font-semibold hover:bg-[#2e6fb0] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5"
            >
              <Activity className="w-5 h-5 group-hover:animate-pulse" />
              View System Status
            </Link>
            
            <Link 
              href="/dashboard" 
              className="w-full sm:w-auto px-8 py-3.5 bg-[#2a5a8c] border border-white/30 text-white rounded-lg font-semibold hover:bg-[#14335c] hover:border-white/30 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-5 h-5" />
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>

      <div className="bg-[#2a5a8c] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-16">Why Choose Us?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="card p-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-[#2563a0]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Real-time Monitoring</h3>
              <p className="text-gray-100 leading-relaxed">
                Services are checked every 60 seconds for instant outage detection and rapid incident response.
              </p>
            </div>

            <div className="card p-8">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl flex items-center justify-center mb-6">
                <Server className="w-6 h-6 text-[#2563a0]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Multi-Service Tracking</h3>
              <p className="text-gray-100 leading-relaxed">
                Monitor exam portals, library systems, department websites, and internal services separately.
              </p>
            </div>

            <div className="card p-8">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6 text-[#2563a0]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Public Transparency</h3>
              <p className="text-gray-100 leading-relaxed">
                No login required. Students can verify service status anytime without authentication.
              </p>
            </div>

          </div>
        </div>
      </div>

      <footer className="bg-[#183d6a]/50 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-100">
          <p>Uptime Monitoring System © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}