import React, { useState } from "react";
import {
  Laptop,
  Shield,
  ShieldCheck,
  MapPin,
  Users,
  FileText,
  Map,
  Bell,
  RefreshCw,
  Send,
  Lock,
  Search,
  AlertCircle,
  Activity,
} from "lucide-react";

export default function AdminDashboard({
  medicines,
  scans,
  reports,
  manufacturers,
  alerts,
  onAddAlert,
  onUpdateManufacturerStatus,
  onUpdateReportStatus,
  onBackToPortal,
}) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState("admin_auth_vector");
  const [adminPass, setAdminPass] = useState("password");
  const [errorText, setErrorText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected report for map highlighting
  const [selectedReportId, setSelectedReportId] = useState(
    reports[0]?.id || null,
  );

  // Security Report generation trigger
  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);
  const [auditDocument, setAuditDocument] = useState(null);

  // Core Expiry alert dispatch states
  const [selectedScanId, setSelectedScanId] = useState("");
  const [targetPhone, setTargetPhone] = useState("");
  const [alertDrugName, setAlertDrugName] = useState("");
  const [alertBatchNum, setAlertBatchNum] = useState("");
  const [alertExpiryDate, setAlertExpiryDate] = useState("");
  const [customAlertMsg, setCustomAlertMsg] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("WARNING");
  const [alertStatusMessage, setAlertStatusMessage] = useState("");

  // Handle auto-populating fields when a purchase scan is selected
  const handleSelectPurchaseScan = (scanId) => {
    setSelectedScanId(scanId);
    if (!scanId) {
      setTargetPhone("");
      setAlertDrugName("");
      setAlertBatchNum("");
      setAlertExpiryDate("");
      setCustomAlertMsg("");
      return;
    }
    const selected = scans.find((s) => s.id === scanId);
    if (selected) {
      setTargetPhone(selected.userPhone || "");
      setAlertDrugName(selected.medicineName || "");
      setAlertBatchNum(selected.batchNumber || "");
      // Look up medicine to find its expiry date if possible
      const med = medicines.find(
        (m) => m.id === selected.medicineId || m.name === selected.medicineName,
      );
      const expDate = med ? med.expiryDate : "2027-01-10";
      setAlertExpiryDate(expDate);

      // Set standard pre-baked message matching the expiry
      setCustomAlertMsg(
        `Important Watchtower Notice: The medicine strip of ${selected.medicineName} (Batch: ${selected.batchNumber}) that you bought has been flagged by the administrator because its expiry date is scheduled for ${expDate}. Please review or return to pharmacy if unused.`,
      );
    }
  };

  const handleSendExpiryAlert = (e) => {
    e.preventDefault();
    if (!targetPhone || !alertDrugName) {
      setAlertStatusMessage(
        "Please load or specify a target purchaser phone and medicine detail.",
      );
      return;
    }

    const newAlert = {
      id: "alert-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      userPhone: targetPhone,
      medicineName: alertDrugName,
      batchNumber: alertBatchNum || "N/A",
      expiryDate: alertExpiryDate || "Unknown",
      alertMessage:
        customAlertMsg || `System alert regarding medicine expiry date.`,
      severity: alertSeverity,
      sentAt: new Date().toISOString(),
      status: "UNREAD",
    };

    onAddAlert(newAlert);
    setAlertStatusMessage(
      `Success! Expiry alerts successfully dispatched to patient phone: ${targetPhone}.`,
    );
    // Reset form states
    setSelectedScanId("");
    setTargetPhone("");
    setAlertDrugName("");
    setAlertBatchNum("");
    setAlertExpiryDate("");
    setCustomAlertMsg("");
    setTimeout(() => setAlertStatusMessage(""), 5000);
  };

  // Stats calculation
  const totalRegistered = medicines.length;
  const totalScans = scans.length;
  const totalGenuine = scans.filter((s) => s.result === "GENUINE").length;
  const totalFakeBlocked = scans.filter(
    (s) => s.result === "FAKE_UNREGISTERED" || s.result === "FAKE_REUSED",
  ).length;
  const totalExpired = scans.filter((s) => s.result === "EXPIRED").length;
  const totalReports = reports.length;

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (!adminUser || !adminPass) {
      setErrorText("Please fill in complete core administration keys.");
      return;
    }
    setIsAdminLoggedIn(true);
    setErrorText("");
  };

  const triggerSecurityAuditReport = () => {
    setIsGeneratingAudit(true);
    setTimeout(() => {
      setIsGeneratingAudit(false);
      const randomDocNum = Math.floor(1000 + Math.random() * 9000);
      const rep = `PHARMACEUTICAL REGISTER INCIDENT ACTION REPORT #${randomDocNum}
Report Generated Date: ${new Date().toLocaleDateString()}
Total Database Records Audited: ${totalRegistered} Enrolled Batches
Suspected Counterfeiting Flags: ${totalFakeBlocked} Blocked Incidents

CRITICAL CYBERSECURITY METRICS:
1. High-Density Alert Coordinates: Blocked re-use pins flagged in Mumbai Central, MH.
2. Clonal Duplicity Index: ${((totalFakeBlocked / (totalScans || 1)) * 100).toFixed(1)}% of scanner hits contain duplicated hashes.
3. Active License Audit: Compliance verification complete. Astra Bio-Pharma listed as COMPLIANT.

Actionable Recommendations:
- Trigger automated serial blacklist on the global ledger for flagged batches.
- Forward localized geographic telemetry coordinates to regional regulatory enforcement offices.`;
      setAuditDocument(rep);
    }, 1200);
  };

  // Coordinates data for mapping preview
  const MAP_PINS = [
    {
      city: "Mumbai Central",
      lat: 19.076,
      lng: 72.8777,
      x: 130,
      y: 310,
      isFake: true,
      desc: "Clonal scans caught!",
    },
    {
      city: "New Delhi North",
      lat: 28.7041,
      lng: 77.1025,
      x: 210,
      y: 110,
      isFake: true,
      desc: "Unregistered hash lookup attempts",
    },
    {
      city: "Gachibowli, Hyderabad",
      lat: 17.385,
      lng: 78.4867,
      x: 230,
      y: 340,
      isFake: false,
      desc: "Healthy checks registered",
    },
    {
      city: "Indiranagar, Bengaluru",
      lat: 12.9716,
      lng: 77.5946,
      x: 220,
      y: 410,
      isFake: false,
      desc: "Healthy checks registered",
    },
    {
      city: "Chennai West",
      lat: 13.0827,
      lng: 80.2707,
      x: 260,
      y: 410,
      isFake: true,
      desc: "Suspected batch duplication",
    },
  ];

  // Selected report geolocation highlights
  const highlightedReport = reports.find((r) => r.id === selectedReportId);

  // Filtered reports list
  const filteredReports = reports.filter(
    (r) =>
      r.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.city.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className="max-w-7xl mx-auto space-y-6 animate-fade-in text-zinc-900"
      id="admin-dashboard"
    >
      {/* Header element */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-650 border border-red-105 rounded-xl">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              Audit Watchtower Command
            </h2>
            <p className="text-xs text-zinc-500 font-medium">
              Counterfeit forensics registry & localized geographic intelligence
              tracker.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdminLoggedIn && (
            <button
              onClick={triggerSecurityAuditReport}
              disabled={isGeneratingAudit}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {isGeneratingAudit ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Create Security Audit</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={onBackToPortal}
            className="px-3.5 py-1.5 border border-zinc-200 bg-white hover:bg-zinc-100 rounded-xl text-xs text-zinc-650 font-bold transition-all cursor-pointer"
          >
            ← Selection Hub
          </button>
        </div>
      </div>

      {!isAdminLoggedIn ? (
        /* ADMIN LOGIN */
        <div
          className="max-w-md mx-auto bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-sm"
          id="admin-login"
        >
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-105 shadow-3xs">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 font-sans leading-tight">
              Watchtower Authentication
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Clearance logs track entry histories. Admin credentials required.
            </p>
          </div>

          <form
            onSubmit={handleAdminLogin}
            className="space-y-4 text-xs font-medium"
          >
            <div className="space-y-1.5">
              <label className="text-zinc-550 uppercase font-mono text-[9px] block font-bold">
                SECURITY IDENTIFICATION PROTOCOL
              </label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                placeholder="Admin username"
                className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-800 focus:border-red-500 font-sans"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-550 uppercase font-mono text-[9px] block font-bold">
                IMMUTABLE KEYS PASSWORD
              </label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-800 focus:border-red-500 font-mono font-semibold"
                required
              />
            </div>

            {errorText && (
              <p className="text-[10px] text-red-655 font-bold">{errorText}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Validate Credentials</span>
            </button>
          </form>

          <p className="text-[10px] text-zinc-400 text-center font-medium leading-relaxed font-sans">
            Preset keys are pre-loaded to facilitate rapid presentation testing.
            Click directly.
          </p>
        </div>
      ) : (
        /* CORE ADMIN INTERFACE */
        <div className="space-y-6">
          {/* TOP SUMMARY STATS CARD GRID */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] text-zinc-450 font-mono block uppercase font-bold">
                REGISTERED DRUGS
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-zinc-800 font-sans tracking-tight">
                  {totalRegistered}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 font-bold">
                  Batches
                </span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] text-zinc-455 font-mono block uppercase font-bold">
                VERIFICATION SCANS
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-zinc-800 tracking-tight">
                  {totalScans}
                </span>
                <span className="text-[10px] font-mono text-indigo-600 font-bold">
                  Checked
                </span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] text-zinc-455 font-mono block uppercase font-bold">
                GENUINE LABELS
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-emerald-700 tracking-tight">
                  {totalGenuine}
                </span>
                <span className="text-[10px] text-emerald-600 font-mono font-bold">
                  Redeemed
                </span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] text-zinc-455 font-mono block uppercase font-bold">
                SUSPECTED BLOCKS
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-rose-600 tracking-tight">
                  {totalFakeBlocked}
                </span>
                <span className="text-[10px] text-rose-500 font-mono font-bold">
                  Flagged
                </span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1 shadow-3xs">
              <span className="text-[10px] text-zinc-455 font-mono block uppercase font-bold">
                COMPLAINT REGISTRY
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-amber-600 tracking-tight">
                  {totalReports}
                </span>
                <span className="text-[10px] text-amber-500 font-mono font-bold">
                  Reports
                </span>
              </div>
            </div>
          </div>

          {/* AUDIT SECURITY REPORT EXPORT DRAWER */}
          {auditDocument && (
            <div className="bg-white border-2 border-red-200 rounded-2xl p-6 space-y-4 animate-fade-in relative z-20 shadow-xs">
              <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
                <h4 className="text-xs font-mono font-bold text-red-650 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Generated Forensic Security Audit
                </h4>
                <button
                  onClick={() => setAuditDocument(null)}
                  className="text-zinc-400 hover:text-zinc-600 font-mono text-[10.5px] font-bold"
                >
                  [Dismiss Output]
                </button>
              </div>
              <pre className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-[11px] leading-relaxed text-zinc-805 overflow-x-auto whitespace-pre-wrap">
                {auditDocument}
              </pre>
              <div className="flex justify-end gap-2 text-xs font-mono">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-650 rounded-lg transition-all font-bold cursor-pointer"
                >
                  Print Hardcopy
                </button>
                <button
                  onClick={() => setAuditDocument(null)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded-lg transition-all font-bold cursor-pointer"
                >
                  Archive Log
                </button>
              </div>
            </div>
          )}

          {/* LOWER SECTION: INTERACTIVE REGIONAL THREAT MAP & CITATION LIST */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: COMPLAINTS & MONITOR STREAM */}
            <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-3xs">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-150 pb-3">
                <h3 className="font-extrabold text-zinc-800 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
                  Incident Log Watch
                </h3>

                {/* Search Complaints */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-450 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search medicines or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-zinc-50 text-zinc-800 text-[11px] font-medium rounded-lg pl-8 pr-3 py-1.5 w-full sm:w-[190px] border border-zinc-200 outline-none focus:border-red-505"
                  />
                </div>
              </div>

              {/* Citations List */}
              <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
                {filteredReports.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic text-center py-12 font-sans font-medium">
                    No suspicious reports matching search query.
                  </p>
                ) : (
                  filteredReports.map((item) => {
                    const isSelected = item.id === selectedReportId;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedReportId(item.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-rose-50/50 border-red-400/80 shadow-xs"
                            : "bg-zinc-50/40 border-zinc-200 hover:border-zinc-3 w-full"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono text-rose-700 font-bold block bg-rose-50/85 p-1 px-2.5 rounded border border-rose-200/50 mb-1.5 w-max">
                              {item.medicineName}
                            </span>
                            <span className="text-xs text-zinc-550 font-bold font-sans">
                              Batch Token:{" "}
                              <span className="text-zinc-800 font-mono font-bold uppercase">
                                {item.batchNumber}
                              </span>
                            </span>
                          </div>

                          <select
                            value={item.status}
                            onChange={(e) =>
                              onUpdateReportStatus(item.id, e.target.value)
                            }
                            className="bg-white text-zinc-700 text-[10px] font-bold border border-zinc-200 rounded-lg px-2 py-1 outline-none text-right focus:border-red-500 cursor-pointer"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="INVESTIGATING">INVESTIGATING</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="COMPROMISED">COMPROMISED</option>
                          </select>
                        </div>

                        <p className="text-xs text-zinc-650 mt-2.5 leading-relaxed italic bg-white p-2.5 rounded border border-zinc-200 shadow-3xs">
                          &ldquo;{item.comment}&rdquo;
                        </p>

                        <div className="mt-3.5 pt-2 border-t border-zinc-150 flex justify-between items-center text-[10px] font-mono text-zinc-400 font-semibold">
                          <span className="flex items-center gap-1 text-zinc-600 font-bold">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            {item.location.city}
                          </span>
                          <span className="text-[9px]">
                            {new Date(item.reportedAt).toLocaleDateString()} at{" "}
                            {new Date(item.reportedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT: INTERACTIVE VECTOR REGIONAL THREAT MAP */}
            <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-3xs">
              <div>
                <h3 className="font-extrabold text-zinc-800 text-sm flex items-center gap-2">
                  <Map className="w-4.5 h-4.5 text-red-600" />
                  Vantage Telemetry Vector map
                </h3>
                <p className="text-xs text-zinc-550">
                  Simulated incident distribution on geographic segments.
                </p>
              </div>

              {/* CUSTOM SVG GEOGRAPHIC MAP DESIGN */}
              <div className="relative border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50 h-[380px] flex items-center justify-center p-2 shadow-3xs">
                <div className="absolute inset-0 bg-minimal-grid opacity-100 pointer-events-none" />

                {/* SVG Visual Contour Map Outline */}
                <svg
                  className="w-full h-full text-zinc-200 max-w-[340px]"
                  viewBox="0 0 400 500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  {/* Country outline representation */}
                  <path
                    d="M 200 40 L 260 70 L 290 120 L 310 180 L 330 220 L 300 270 L 280 320 L 250 380 L 230 420 L 210 460 L 190 460 L 170 420 L 150 380 L 130 330 L 110 270 L 80 230 L 60 180 L 80 130 L 110 100 L 160 50 Z"
                    className="fill-white/80 stroke-zinc-250"
                    strokeWidth="2"
                  />
                  {/* Regional state grids */}
                  <path
                    d="M 110 100 Q 200 150 290 120"
                    stroke="currentColor"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M 80 230 Q 200 280 300 270"
                    stroke="currentColor"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M 130 330 Q 200 370 280 320"
                    stroke="currentColor"
                    strokeOpacity="0.4"
                  />

                  {/* Render simulated city pin targets */}
                  {MAP_PINS.map((pin, i) => (
                    <g key={i} className="cursor-pointer group">
                      {/* pulse rings */}
                      {pin.isFake ? (
                        <>
                          <circle
                            cx={pin.x}
                            cy={pin.y}
                            r="10"
                            className="fill-red-500/10 stroke-red-500/20 stroke-[1.5] animate-ping"
                          />
                          <circle
                            cx={pin.x}
                            cy={pin.y}
                            r="4.5"
                            className="fill-red-600 stroke-white"
                            strokeWidth="1.5"
                          />
                        </>
                      ) : (
                        <circle
                          cx={pin.x}
                          cy={pin.y}
                          r="4.5"
                          className="fill-emerald-600 stroke-white"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Tooltip */}
                      <text
                        x={pin.x + 8}
                        y={pin.y + 3}
                        className="fill-zinc-500 font-mono font-bold text-[8px]"
                        stroke="none"
                      >
                        {pin.city}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Simulated coordinates info overlay */}
                {highlightedReport ? (
                  <div className="absolute bottom-3 left-3 right-3 bg-white border border-red-200 p-2.5 rounded-xl space-y-1 z-15 shadow-sm">
                    <span className="text-[10px] font-mono text-red-605 font-bold uppercase block">
                      COMPROMISE PINPOINT DETECTED:
                    </span>
                    <span className="text-xs text-zinc-800 font-extrabold block">
                      {highlightedReport.medicineName}
                    </span>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                      <span className="font-semibold">
                        GPS: {highlightedReport.location.lat.toFixed(3)},{" "}
                        {highlightedReport.location.lng.toFixed(3)}
                      </span>
                      <span className="text-red-600 font-bold">
                        {highlightedReport.location.city}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute bottom-3 left-3 right-3 bg-white border border-zinc-200 p-2.5 rounded-xl text-center text-[10px] text-zinc-500 font-semibold shadow-3xs">
                    Select any complaint watch item to highlight core forensics
                    coordinates.
                  </div>
                )}
              </div>

              {/* HIGH RISK INFOCARD */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 shadow-3xs text-xs font-sans leading-relaxed text-zinc-600">
                <span className="text-[11px] font-mono text-amber-650 font-black uppercase tracking-wider block flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-500" /> High-Risk
                  Sectors Identified:
                </span>
                <p className="font-medium">
                  Scan duplication anomalies suggest counterfeiting centers
                  located near{" "}
                  <span className="text-zinc-800 font-bold">
                    Mumbai Central, MH
                  </span>
                  . Target pharmacies have been scheduled for physical FDA
                  compliance watch audits.
                </p>
              </div>
            </div>
          </div>

          {/* EXPIRY AND RECALL ALERTS PUSH COMMAND CHANNEL */}
          <div
            className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-3xs hover:border-zinc-300 transition-all"
            id="expiry-recall-pushes"
          >
            <div className="flex items-center gap-2 border-b border-zinc-150 pb-3 justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-750 border border-amber-205 rounded-lg">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-800 text-sm">
                    Patient Expiry & Recall Alert Dispatcher
                  </h3>
                  <p className="text-xs text-zinc-550">
                    Push dynamic alerts directly to the specific cell phones of
                    users who scanned/purchased medicine strips.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 border border-zinc-200 p-1 px-2.5 rounded-lg">
                Active Alerts: {alerts.length}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: CRITICAL ADVISORY FORM */}
              <form
                onSubmit={handleSendExpiryAlert}
                className="lg:col-span-7 space-y-4 text-xs font-medium bg-zinc-50/50 p-5 rounded-2xl border border-zinc-200/80"
              >
                <h4 className="text-[10.5px] font-mono text-zinc-700 font-bold uppercase tracking-wider">
                  Formulate Advisory Alert Dispatch
                </h4>

                {/* 1. Quick Selector from scanned receipts / purchases */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 uppercase font-mono text-[9px] block font-bold">
                    Select Active Strip Purchase (Recent client scans)
                  </label>
                  <select
                    value={selectedScanId}
                    onChange={(e) => handleSelectPurchaseScan(e.target.value)}
                    className="w-full bg-white border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-805 focus:border-amber-500 font-sans text-xs cursor-pointer"
                  >
                    <option value="">
                      -- Or enter custom details manually below --
                    </option>
                    {scans
                      .filter((s) => s.userPhone)
                      .map((scan) => (
                        <option key={scan.id} value={scan.id}>
                          {scan.medicineName} (Batch:{" "}
                          {scan.batchNumber || "N/A"}) - scanned by{" "}
                          {scan.userPhone}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 2. Target Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 uppercase font-mono text-[9px] block font-bold">
                      Target Purchaser Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 019-2834"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      className="w-full bg-white border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-805 focus:border-amber-500 font-mono text-zinc-750"
                      required
                    />
                  </div>

                  {/* 3. Medicine Name */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 uppercase font-mono text-[9px] block font-bold">
                      Medicine Brand Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Amoxicillin 500mg"
                      value={alertDrugName}
                      onChange={(e) => setAlertDrugName(e.target.value)}
                      className="w-full bg-white border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-805 focus:border-amber-500 font-sans"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 4. Batch Control */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 uppercase font-mono text-[9px] block font-bold">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AMX-2026-042"
                      value={alertBatchNum}
                      onChange={(e) => setAlertBatchNum(e.target.value)}
                      className="w-full bg-white border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-805 focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  {/* 5. Expiration Date */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 uppercase font-mono text-[9px] block font-bold">
                      Expiration Date Threshold
                    </label>
                    <input
                      type="date"
                      value={alertExpiryDate}
                      onChange={(e) => setAlertExpiryDate(e.target.value)}
                      className="w-full bg-white border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-805 focus:border-amber-500"
                    />
                  </div>

                  {/* 6. Alert Severity */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 uppercase font-mono text-[9px] block font-bold">
                      Advisory Severity
                    </label>
                    <select
                      value={alertSeverity}
                      onChange={(e) => setAlertSeverity(e.target.value)}
                      className="w-full bg-white border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-805 focus:border-amber-500 cursor-pointer font-bold"
                    >
                      <option value="WARNING">
                        ⚠️ WARNING (Upcoming Expiry)
                      </option>
                      <option value="CRITICAL">
                        🚨 CRITICAL (Already Expired / Recall)
                      </option>
                      <option value="INFO">
                        ℹ️ INFO (Routine Notification)
                      </option>
                    </select>
                  </div>
                </div>

                {/* 7. Custom Advisory SMS Alert Message */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 uppercase font-mono text-[9px] block font-bold">
                    Advisory Alert Message (Max 250 characters)
                  </label>
                  <textarea
                    value={customAlertMsg}
                    onChange={(e) => setCustomAlertMsg(e.target.value)}
                    placeholder="Provide explicit shelf-life warnings, drug recall codes, safe usage guidelines, or clinical disposal processes here..."
                    className="w-full bg-white border border-zinc-200 p-2.5 h-20 rounded-xl outline-none text-zinc-850 focus:border-amber-500 text-xs font-sans leading-normal resize-none"
                    maxLength={250}
                    required
                  />
                </div>

                {alertStatusMessage && (
                  <p className="p-2.5 bg-amber-50 text-amber-850 border border-amber-200 rounded-lg font-mono text-[10.5px] font-bold">
                    {alertStatusMessage}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Real-time Advisory Notification</span>
                </button>
              </form>

              {/* RIGHT COLUMN: RECENT DISPATCH LOGS */}
              <div className="lg:col-span-5 space-y-4">
                <h4 className="text-[10.5px] font-mono text-zinc-700 font-bold uppercase tracking-wider">
                  Live Dispensed Alert History
                </h4>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50 text-zinc-400">
                      <p className="text-xs italic font-medium">
                        No alerts historically logged yet.
                      </p>
                    </div>
                  ) : (
                    alerts.map((al) => (
                      <div
                        key={al.id}
                        className="p-3.5 bg-zinc-50/50 border border-zinc-205 hover:border-zinc-300 rounded-xl shadow-3xs space-y-2 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded font-black ${
                              al.severity === "CRITICAL"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : al.severity === "WARNING"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {al.severity}
                          </span>
                          <span className="text-[9.5px] text-zinc-400 font-mono font-bold">
                            Ref: #{al.id.substring(6, 11) || "SYSTEM"}
                          </span>
                        </div>

                        <div className="text-xs">
                          <span className="font-extrabold text-zinc-800 block leading-tight">
                            {al.medicineName}
                          </span>
                          <span className="text-[10px] text-zinc-450 block font-semibold mt-0.5">
                            Batch:{" "}
                            <span className="font-mono text-zinc-650 uppercase font-bold">
                              {al.batchNumber}
                            </span>{" "}
                            | Expire:{" "}
                            <span className="text-zinc-700 font-bold">
                              {al.expiryDate}
                            </span>
                          </span>
                        </div>

                        <p className="text-[10.5px] text-zinc-650 leading-relaxed font-sans italic bg-white p-2.5 border border-zinc-150 rounded shadow-3xs">
                          &ldquo;{al.alertMessage}&rdquo;
                        </p>

                        <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-100">
                          <span className="text-zinc-500 font-black">
                            To: {al.userPhone}
                          </span>
                          <span>
                            {new Date(al.sentAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* REGISTRY COMPLIANCE CHANNELS */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-3xs">
            <h3 className="font-extrabold text-zinc-850 text-sm flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-indigo-600" />
              Administrative Registry & Permissions Auditing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-650 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-indigo-650 font-black block mb-2.5 uppercase">
                    Registered Manufacturers Directory
                  </span>
                  <div className="space-y-2.5 max-h-[150px] overflow-y-auto pr-1">
                    {manufacturers.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 italic font-sans text-center py-6">
                        No manufacturers enrolled yet.
                      </p>
                    ) : (
                      manufacturers.map((mfg) => (
                        <div
                          key={mfg.id}
                          className="bg-white p-2.5 rounded-xl border border-zinc-200 shadow-3xs flex flex-col sm:flex-row justify-between sm:items-center gap-2"
                        >
                          <div className="space-y-0.5">
                            <span className="text-zinc-800 font-extrabold text-[11px] block">
                              {mfg.companyName}
                            </span>
                            <span className="text-[9.5px] text-zinc-500 font-medium block">
                              License:{" "}
                              <span className="font-mono text-zinc-700 font-bold">
                                {mfg.licenceKey}
                              </span>
                            </span>
                            <p className="text-[9px] text-zinc-400 leading-normal max-w-xs">
                              {mfg.companyDetails}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={mfg.status}
                              onChange={(e) =>
                                onUpdateManufacturerStatus(
                                  mfg.id,
                                  e.target.value,
                                )
                              }
                              className={`text-[9px] font-mono font-bold rounded-lg px-2 py-0.5 outline-none border cursor-pointer ${
                                mfg.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : mfg.status === "PENDING"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-zinc-100 text-zinc-600 border-zinc-300"
                              }`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="APPROVED">APPROVED</option>
                              <option value="REVOKED">REVOKED</option>
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-650 font-mono font-bold leading-normal">
                <span className="text-[10px] font-mono text-indigo-600 font-black block mb-2 uppercase font-sans">
                  Security Tunnel Livelogs
                </span>
                <div className="text-[9px] text-zinc-500 space-y-2 max-h-[155px] overflow-y-auto font-mono">
                  <div>
                    [16:40:11] Establish handshake with Ledger instance...
                  </div>
                  <div>
                    [16:45:00] Flag Anomaly: Token duplicator caught in Mumbai.
                  </div>
                  <div>
                    [16:55:23] Verification receipt OTP verified from PT
                    identity channel.
                  </div>
                  <div className="text-indigo-600">
                    [17:02:40] Manufacturer Astra Enroll: Batch registered and
                    cryptographically signed.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
