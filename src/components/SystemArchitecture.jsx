import React from "react";
import {
  Database,
  ShieldCheck,
  Cpu,
  Smartphone,
  Lock,
  Activity,
  ArrowRight,
} from "lucide-react";

export default function SystemArchitecture({ activeStep = "none" }) {
  const steps = [
    {
      id: "manufacturer",
      title: "Manufacturer Portal",
      desc: "Cryptographic QR Generation & Single-Use Tokens",
      icon: Cpu,
      color: "bg-blue-600",
      borderColor: "border-blue-500",
      glowColor: "shadow-blue-500/50",
    },
    {
      id: "cloud",
      title: "Secure Cloud DB",
      desc: "Immutable Register & Multi-Scan Detection Engine",
      icon: Database,
      color: "bg-indigo-600",
      borderColor: "border-indigo-500",
      glowColor: "shadow-indigo-500/50",
    },
    {
      id: "user",
      title: "Android User App",
      desc: "Viewfinder scan + GPS Capture & Hardware Telemetry",
      icon: Smartphone,
      color: "bg-emerald-600",
      borderColor: "border-emerald-500",
      glowColor: "shadow-emerald-500/50",
    },
    {
      id: "verify",
      title: "OTP SMS Check",
      desc: "Prevents cloning by validating unique physical scan sessions",
      icon: Lock,
      color: "bg-purple-600",
      borderColor: "border-purple-500",
      glowColor: "shadow-purple-500/50",
    },
    {
      id: "admin",
      title: "Admin Control Center",
      desc: "Bridges Geo-Anomaly AI with Realtime Threat Intel",
      icon: ShieldCheck,
      color: "bg-red-600",
      borderColor: "border-red-500",
      glowColor: "shadow-red-500/50",
    },
  ];

  return (
    <div
      className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden"
      id="architecture-diagram"
    >
      {/* Decorative minimal grid lines */}
      <div className="absolute inset-0 bg-minimal-grid opacity-100 pointer-events-none" />

    

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id || activeStep === "none";
          return (
            <React.Fragment key={step.id}>
              <div
                className={`p-4 rounded-xl border transition-all duration-500 flex flex-col justify-between ${
                  isActive
                    ? `border-zinc-300 bg-white shadow-xs`
                    : "border-zinc-200 bg-zinc-50/50 opacity-45"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 px-2 py-0.5 rounded bg-zinc-50 border border-zinc-250">
                      SYS-0{idx + 1}
                    </span>
                    <div
                      className={`p-1.5 rounded-lg ${isActive ? step.color : "bg-zinc-205"} text-white`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h4 className="text-zinc-800 text-xs font-bold font-sans tracking-tight mb-1">
                    {step.title}
                  </h4>
                  <p className="text-[10px] leading-relaxed text-zinc-500 font-sans">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-zinc-400 font-bold">
                    {isActive ? "● OPERATIONAL" : "○ STANDBY"}
                  </span>
                  {idx < 4 && (
                    <ArrowRight className="w-3 h-3 text-zinc-300 hidden md:block animate-pulse" />
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Dynamic Explanation Panel reflecting the system flow */}
      <div className="mt-6 p-5 rounded-xl bg-zinc-50 border border-zinc-200 font-sans text-xs text-zinc-650 space-y-3 relative z-10 leading-relaxed shadow-2xs">
        <div className="flex items-center gap-2 text-zinc-700 font-mono text-xs font-bold border-b border-zinc-200 pb-2 mb-1">
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          <span>CYBERSECURITY LOGISTICS BLUEPRINT</span>
        </div>
        <div>
          <span className="text-indigo-600 font-bold font-sans">
            1. Cryptographic Single-Use:
          </span>{" "}
          Genuine medicines receive an encrypted one-time verification token
          mapped into a QR matrix. Traditional barcodes are copyable; our QR
          token is marked{" "}
          <span className="text-emerald-600 font-semibold">"REDEEMED"</span>{" "}
          instantly upon its official initial check.
        </div>
        <div>
          <span className="text-indigo-600 font-bold font-sans">
            2. Dual-Factor Verification (OTP):
          </span>{" "}
          To prevent store clerks or malicious actors from dry-scanning packs
          prior to patient purchase, scanning triggers a real-time OTP request
          sent to the validated purchaser&apos;s handset, authorizing the
          single-use burn process on the ledger.
        </div>
        <div>
          <span className="text-indigo-600 font-bold font-sans">
            3. Geo-Anomaly Intelligence Flagging:
          </span>{" "}
          If the exact same one-time token is scanned across disparate cities
          (e.g. Scanned in Mumbai, then re-scanned in Jaipur 10 minutes later),
          the cloud database flags a{" "}
          <span className="text-rose-600 font-bold">CLONE THREAT</span> alert to
          the Admin Panel, including strict GPS telemetry to pinpoint
          counterfeiting warehouses.
        </div>
      </div>
    </div>
  );
}
