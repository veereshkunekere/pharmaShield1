import { useState } from "react";
import { Shield, Factory, Laptop, Smartphone, Activity, Server, Database } from "lucide-react";

export default function RoleSelector({ onSelectRole, totals, medicines = [], scans = [] }) {
  const [activeTab, setActiveTab] = useState("batches"); // "batches" or "scans"

  // Get latest 3 registered medicines
  const latestMedicines = (medicines || []).slice(0, 3);
  // Get latest 3 verification attempts
  const latestScans = (scans || []).slice(0, 3);

  return (
    <div
      className="max-w-7xl mx-auto space-y-8 animate-fade-in"
      id="project-portal"
    >
      {/* Header Banner */}
      <div className="relative bg-white border border-zinc-200/80 rounded-3xl p-8 md:p-12 overflow-hidden shadow-xs">
        {/* Minimal grid lines */}
        <div className="absolute inset-0 bg-minimal-grid opacity-100 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-600 font-semibold">
              <Shield className="w-3.5 h-3.5 text-zinc-500" />
              AUTHENTICATION PRESENTATION ECOSYSTEM
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold font-sans leading-none tracking-tight text-zinc-900">
              Pharma<span className="text-indigo-600">Shield</span>
            </h1>
            <p className="text-indigo-950 font-bold antialiased max-w-xl text-md leading-relaxed font-sans mt-2">
              One scan to protect people from fake medicine.
            </p>
            <p className="text-zinc-550 max-w-xl text-xs leading-relaxed font-sans">
              A comprehensive cryptographic verification ecosystem designed to
              halt pharmaceutical counterfeiting. By combining single-use QR
              technology and timed OTP handshakes, we eliminate code-duplication
              and retail cloning attacks.
            </p>

            {/* Tech Badges */}
            <div className="pt-2 flex flex-wrap gap-2 text-zinc-500 text-xs font-mono">
              <span className="bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded">
                Vite & React
              </span>
              <span className="bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded">
                One-Time QRs
              </span>
              <span className="bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded">
                Two-Factor OTP
              </span>
              <span className="bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded">
                GPS Telemetry
              </span>
              <span className="bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded">
                Cloud DB Sync
              </span>
            </div>
          </div>

          {/* Quick Metrics of Ledger State */}
          <div className="bg-zinc-50 backdrop-blur border border-zinc-200 rounded-2xl p-6 space-y-4 font-mono shadow-xs w-full">
            <div className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200 pb-2 flex justify-between items-center font-bold">
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                LEDGER SYSTEM REGISTRY
              </span>
              <span className="text-emerald-600 flex items-center gap-1 text-[10px]">
                ● LIVE SYNC
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase font-bold">
                  REGISTERED DRUGS
                </span>
                <span className="text-xl font-bold text-zinc-800">
                  {totals.medicines}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase font-bold">
                  TOTAL VALID SCANS
                </span>
                <span className="text-xl font-bold text-zinc-800">
                  {totals.scans}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase font-bold">
                  GENUINE LABELS
                </span>
                <span className="text-xl font-bold text-emerald-600">
                  {totals.genuine}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase font-bold">
                  THREAT FLAGGED
                </span>
                <span className="text-xl font-bold text-rose-600 font-mono animate-pulse">
                  {totals.fakes}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-550 bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg leading-relaxed">
              Real-time synchronization active. Choose a gateway module below to begin ledger actions.
            </div>
          </div>
        </div>
      </div>

      {/* Module Selection Grid */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-800 tracking-tight">
            Access System Modules & Interfaces
          </h2>
          <p className="text-xs text-zinc-500">
            Select any module role below to interact with the matching
            customized system client.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* USER APP CARD */}
          <div
            onClick={() => onSelectRole("USER")}
            className="group cursor-pointer bg-white hover:bg-zinc-50/60 border border-zinc-200 hover:border-blue-400 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-[230px] shadow-xs"
            id="role-btn-user"
          >
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-12 h-12 flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-800 group-hover:text-blue-600 transition-colors">
                Patient / User App
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Simulated mobile app for patients. Perform GPS-linked QR scans,
                complete instant SMS OTP codes, inspect expiration alerts, and
                report counterfeit box packages.
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-blue-600 border-t border-zinc-100 pt-3 mt-4 font-bold">
              <span>LAUNCH CLIENT VIEWPORT</span>
              <span>→</span>
            </div>
          </div>

          {/* MANUFACTURER CARD */}
          <div
            onClick={() => onSelectRole("MANUFACTURER")}
            className="group cursor-pointer bg-white hover:bg-zinc-50/60 border border-zinc-200 hover:border-violet-400 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-[230px] shadow-xs"
            id="role-btn-manufacturer"
          >
            <div className="space-y-3">
              <div className="p-3 bg-violet-50 text-violet-600 rounded-xl w-12 h-12 flex items-center justify-center border border-violet-100 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                <Factory className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-800 group-hover:text-violet-600 transition-colors">
                Manufacturer Portal
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Secure factory console. Register upcoming drug batches, generate
                unique one-time encryption tokens, view active storage matrices,
                and review batch download history.
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-violet-600 border-t border-zinc-100 pt-3 mt-4 font-bold">
              <span>MANAGE PHARMA LABELS</span>
              <span>→</span>
            </div>
          </div>

          {/* ADMIN CARD */}
          <div
            onClick={() => onSelectRole("ADMIN")}
            className="group cursor-pointer bg-white hover:bg-zinc-50/60 border border-zinc-200 hover:border-rose-450 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-[230px] shadow-xs"
            id="role-btn-admin"
          >
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-12 h-12 flex items-center justify-center border border-rose-100 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-800 group-hover:text-rose-600 transition-colors">
                Admin Audit Command
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Central control tower monitoring telemetry reports, analyzing
                duplicate-scan location maps, reviewing flagged counterfeit
                threats, and triggering enforcement alerts.
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-rose-600 border-t border-zinc-100 pt-3 mt-4 font-bold">
              <span>LAUNCH WEB CONSOLE</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
