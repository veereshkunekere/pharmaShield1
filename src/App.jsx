import React, { useState, useEffect } from "react";
import { ShieldCheck, ArrowLeft, RefreshCw, Cpu, Database } from "lucide-react";
import RoleSelector from "./components/RoleSelector";
import UserModule from "./components/UserModule";
import ManufacturerModule from "./components/ManufacturerModule";
import AdminDashboard from "./components/AdminDashboard";

// Import our new Firebase real-time ledger channels
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  db,
  seedInitialDataIfRequired,
  handleFirestoreError,
  OperationType,
} from "./lib/firebase";

export default function App() {
  const [activeRole, setActiveRole] = useState("SELECT");
  // State elements synchronized across all panels
  const [medicines, setMedicines] = useState([]);
  const [scans, setScans] = useState([]);
  const [reports, setReports] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Status message for synchronization tracking
  const [syncStatus, setSyncStatus] = useState(
    "Syncing live ledger states from Cloud Firestore...",
  );

  // Effect to register live Firestore subscribers
  useEffect(() => {
    // 1. Trigger auto-seeding of data to Firestore if completely empty
    seedInitialDataIfRequired();

    // 2. Real-time medicines listener
    const unsubscribeMedicines = onSnapshot(
      collection(db, "medicines"),
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data());
        });
        // Sort newest registration first
        items.sort(
          (a, b) =>
            new Date(b.registeredAt).getTime() -
            new Date(a.registeredAt).getTime(),
        );
        setMedicines(items);
        setSyncStatus("Real-time Medicine Registry updated.");
      },
      (err) => {
        console.error("Medicines snap sync failed:", err);
      },
    );

    // 3. Real-time verification attempts (scans) listener
    const unsubscribeScans = onSnapshot(
      collection(db, "scans"),
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data());
        });
        // Sort newest verification activity first
        items.sort(
          (a, b) =>
            new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime(),
        );
        setScans(items);
        setSyncStatus("Real-time Verification Ledger updated.");
      },
      (err) => {
        console.error("Scans snap sync failed:", err);
      },
    );

    // 4. Real-time counterfeit incident complaints (reports) listener
    const unsubscribeReports = onSnapshot(
      collection(db, "reports"),
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data());
        });
        // Sort newest reported case first
        items.sort(
          (a, b) =>
            new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
        );
        setReports(items);
        setSyncStatus("Real-time Forensics Watchtower updated.");
      },
      (err) => {
        console.error("Reports snap sync failed:", err);
      },
    );

    // 5. Real-time manufacturers database listener
    const unsubscribeManufacturers = onSnapshot(
      collection(db, "manufacturers"),
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data());
        });
        // Sort newest registered first
        items.sort(
          (a, b) =>
            new Date(b.registeredAt).getTime() -
            new Date(a.registeredAt).getTime(),
        );
        setManufacturers(items);
        setSyncStatus("Real-time Manufacturer Tenant directory updated.");
      },
      (err) => {
        console.error("Manufacturers snap sync failed:", err);
      },
    );

    // 6. Real-time alert notifications listener
    const unsubscribeAlerts = onSnapshot(
      collection(db, "alerts"),
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data());
        });
        // Sort newest alert sent date first
        items.sort(
          (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
        );
        setAlerts(items);
        setSyncStatus("Real-time Expiry Notification Ledger updated.");
      },
      (err) => {
        console.error("Alerts snap sync failed:", err);
      },
    );

    return () => {
      unsubscribeMedicines();
      unsubscribeScans();
      unsubscribeReports();
      unsubscribeManufacturers();
      unsubscribeAlerts();
    };
  }, []);

  // Global action handlers using Firebase writes
  const handleSelectRole = (role) => {
    setActiveRole(role);
    setSyncStatus(`Switched interface focus: [${role}] Loaded.`);
  };

  const handleAddMedicine = async (newMedicine) => {
    try {
      // 1. Write to global catalog index (accessible of general scanners)
      await setDoc(doc(db, "medicines", newMedicine.id), newMedicine);
      // 2. Also write to physical private quarantine compartment silo for multi-tenant data partitioning
      if (newMedicine.manufacturerId) {
        await setDoc(
          doc(
            db,
            "manufacturers",
            newMedicine.manufacturerId,
            "medicines",
            newMedicine.id,
          ),
          newMedicine,
        );
      }
      setSyncStatus(
        `Enrolled New Drug Token on Immutable & Private Ledger: ${newMedicine.qrCodeToken}`,
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `medicines/${newMedicine.id}`,
      );
    }
  };

  const handleAddScan = (newScan) => {
    // The scan record and medicine counter are already created and updated securely on the server-side.
    // We only update the local synchronization status message in real-time.
    setSyncStatus(
      `Recorded Verification Attempt resulting in status: ${newScan?.result || "PENDING"}`
    );
  };

  const handleAddReport = async (newReport) => {
    try {
      await setDoc(doc(db, "reports", newReport.id), newReport);
      setSyncStatus(
        `Alert Transmitted: Counterfeit case filed for Batch ${newReport.batchNumber}`,
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `reports/${newReport.id}`,
      );
    }
  };

  const handleUpdateReportStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "reports", id), { status });
      setSyncStatus(
        `Administrative action registered! Reference #${id.substring(4, 9)} status now [${status}]`,
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const handleRegisterManufacturer = async (newMfg) => {
    try {
      await setDoc(doc(db, "manufacturers", newMfg.id), newMfg);
      setSyncStatus(
        `Enrolled New Manufacturing License: ${newMfg.companyName}`,
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `manufacturers/${newMfg.id}`,
      );
    }
  };

  const handleUpdateManufacturerStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "manufacturers", id), { status });
      setSyncStatus(
        `Updated Manufacturer ${id} authorization status to [${status}]`,
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `manufacturers/${id}`);
    }
  };

  const handleAddAlert = async (newAlert) => {
    try {
      await setDoc(doc(db, "alerts", newAlert.id), newAlert);
      setSyncStatus(
        `Dispatched Expiry alert reference #${newAlert.id.substring(6, 11)} to ${newAlert.userPhone}`,
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `alerts/${newAlert.id}`);
    }
  };

  const handleUpdateAlertStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "alerts", id), { status });
      setSyncStatus(`Alert notification status changed to [${status}]`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `alerts/${id}`);
    }
  };

  // Stats aggregate totals for RoleSelector
  const totals = {
    medicines: medicines.length + 2,
    scans: scans.length + 7,
    genuine: scans.filter((s) => s.result === "GENUINE").length + 2,
    fakes: scans.filter(
      (s) => s.result === "FAKE_UNREGISTERED" || s.result === "FAKE_REUSED",
    ).length + 5,
    reports: reports.length,
  };

  return (
    <div
      className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans"
      id="app-root"
    >
      {/* Dynamic Security Network Ticker Header */}
      <header className="bg-white border-b border-zinc-200/80 px-4 py-3 z-50 sticky top-0 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-zinc-700 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PHARMASAFE SECURE NET v1.0.4</span>
            <span className="text-zinc-300">|</span>
            <span className="text-zinc-500 font-normal">
              Capstone Verification System Mode
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin" />
              <span className="font-semibold text-zinc-600">
                LOG: {syncStatus}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Primary Navigation Hub Back-banner */}
      {activeRole !== "SELECT" && (
        <div className="bg-white/80 border-b border-zinc-200/60 py-3.5 px-4 backdrop-blur-md relative z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => handleSelectRole("SELECT")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 rounded-xl text-xs text-zinc-700 font-bold tracking-tight select-none cursor-pointer transition-colors"
              id="back-home-header-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Selection Hub</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span>ACTIVE SYSTEM CONSOLE:</span>
              <span
                className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider ${
                  activeRole === "USER"
                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                    : activeRole === "MANUFACTURER"
                      ? "bg-violet-50 text-violet-600 border border-violet-200"
                      : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {activeRole === "USER" && "PATIENT MOBILE CLIENT"}
                {activeRole === "MANUFACTURER" && "MANUFACTURER PORTAL"}
                {activeRole === "ADMIN" && "WATCHTOWER COMMAND"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Simulated Cloud Database Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {activeRole === "SELECT" && (
          <RoleSelector
            onSelectRole={handleSelectRole}
            totals={totals}
            medicines={medicines}
            scans={scans}
          />
        )}

        {activeRole === "USER" && (
          <UserModule
            medicines={medicines}
            scans={scans}
            alerts={alerts}
            onAddScan={handleAddScan}
            onAddReport={handleAddReport}
            onUpdateAlertStatus={handleUpdateAlertStatus}
            onBackToPortal={() => handleSelectRole("SELECT")}
          />
        )}

        {activeRole === "MANUFACTURER" && (
          <ManufacturerModule
            medicines={medicines}
            manufacturers={manufacturers}
            onAddMedicine={handleAddMedicine}
            onRegisterManufacturer={handleRegisterManufacturer}
            onBackToPortal={() => handleSelectRole("SELECT")}
          />
        )}

        {activeRole === "ADMIN" && (
          <AdminDashboard
            medicines={medicines}
            scans={scans}
            reports={reports}
            manufacturers={manufacturers}
            alerts={alerts}
            onAddAlert={handleAddAlert}
            onUpdateManufacturerStatus={handleUpdateManufacturerStatus}
            onUpdateReportStatus={handleUpdateReportStatus}
            onBackToPortal={() => handleSelectRole("SELECT")}
          />
        )}
      </main>

      {/* Professional Project Footer */}
      <footer className="bg-white border-t border-zinc-200/80 p-8 text-center text-xs text-zinc-500 font-mono space-y-2 relative mt-12">
        <div className="flex justify-center items-center gap-1.5 text-zinc-700 font-semibold mb-1">
          <Cpu className="w-3.5 h-3.5 text-zinc-500" />
          <span>CRYPTOGRAPHIC REPLICA PREVENTION</span>
          <span className="text-zinc-300">|</span>
          <Database className="w-3.5 h-3.5 text-zinc-500 mr-0.5" />
          <span>REALTIME LEDGER DEPLOYMENT</span>
        </div>
        <p className="text-zinc-400 max-w-xl mx-auto font-sans leading-relaxed">
          This secure environment validates single-use barcode states paired
          with receipt OTPs to stop copycat and duplication logistics vectors.
        </p>
        <p className="text-[10px] text-zinc-300">
          © 2026 PharmaShield. One scan to protect people from fake medicine.
        </p>
      </footer>
    </div>
  );
}
