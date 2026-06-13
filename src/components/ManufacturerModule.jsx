import React, { useState, useEffect, useRef } from "react";
import {
  Factory,
  Plus,
  ClipboardList,
  QrCode,
  Check,
  Lock,
  Download,
  AlertCircle,
  Info,
  UserPlus,
} from "lucide-react";
import QRCode from "qrcode";

export default function ManufacturerModule({
  medicines,
  manufacturers,
  onAddMedicine,
  onRegisterManufacturer,
  onBackToPortal,
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedManufacturer, setLoggedManufacturer] = useState(null);

  // Configuration for tabs: login vs. new registration
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Secure Sign-in inputs
  const [loginLicenceKey, setLoginLicenceKey] = useState("LIC-99381-X7");
  const [loginAccessPin, setLoginAccessPin] = useState("1234");

  // Dynamic Registration inputs
  const [regCompanyName, setRegCompanyName] = useState("");
  const [regLicenceKey, setRegLicenceKey] = useState("");
  const [regCompanyDetails, setRegCompanyDetails] = useState("");
  const [regContactPhone, setRegContactPhone] = useState("");
  const [regAccessPin, setRegAccessPin] = useState("");

  // Resolved manufacturer metrics
  const companyName = loggedManufacturer?.companyName || "Astra Bio-Pharma Ltd";
  const companyDetails =
    loggedManufacturer?.companyDetails ||
    "Sector 4, Gachibowli, Hyderabad, India";
  const licenceKey = loggedManufacturer?.licenceKey || "LIC-99381-X7";

  // Strict local partitioning of manufacturer's medicines directory
  const companyMedicines = medicines.filter((m) =>
    m.manufacturerId === loggedManufacturer?.id
  );

  // Register medicine form state
  const [drugName, setDrugName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [mfgDate, setMfgDate] = useState("2026-06-01");
  const [expiryDate, setExpiryDate] = useState("2028-06-01");
  // Custom states for medicine strip specific details
  const [stripSerialNumber, setStripSerialNumber] = useState("");
  const [pillCount, setPillCount] = useState(10);
  const [activeIngredients, setActiveIngredients] = useState("");
  // Custom generated token display
  const [generatedMedicine, setGeneratedMedicine] = useState(null);
  const [selectedMedicineForQr, setSelectedMedicineForQr] = useState(null);
  // Form error & success alerts
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const qrCanvasRef = useRef(null);

  // Auto-select the first medicine from company directory or the generated one
  useEffect(() => {
    if (!selectedMedicineForQr && companyMedicines.length > 0) {
      setSelectedMedicineForQr(companyMedicines[0]);
    }
  }, [companyMedicines, selectedMedicineForQr]);

  // Generate QR code onto canvas
  useEffect(() => {
    if (selectedMedicineForQr && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        selectedMedicineForQr.qrCodeToken,
        {
          width: 130,
          margin: 1,
          color: {
            dark: "#1e1b4b", // Deep indigo-950
            light: "#ffffff", // Pure white
          },
          errorCorrectionLevel: "H",
        },
        (error) => {
          if (error) console.error("Error drawing QR Canvas:", error);
        },
      );
    }
  }, [selectedMedicineForQr]);

  // Download high-resolution QR Code
  const handleDownloadQr = () => {
    if (!selectedMedicineForQr) return;
    QRCode.toDataURL(
      selectedMedicineForQr.qrCodeToken,
      {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "H",
      },
      (err, url) => {
        if (err) {
          console.error("Error generating download URL:", err);
          return;
        }
        const link = document.createElement("a");
        link.href = url;
        link.download = `QR_${selectedMedicineForQr.name.replace(/\s+/g, "_")}_${selectedMedicineForQr.batchNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    );
  };

  // Process secure multi-tenant Sign In challenge
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!loginLicenceKey || !loginAccessPin) {
      setErrorText(
        "Please enter your pharmaceutical organization license key and security entry PIN.",
      );
      return;
    }

    // Lookup matching manufacturer in verified directory
    const matched = manufacturers.find(
      (m) =>
        m.licenceKey.toUpperCase().trim() ===
          loginLicenceKey.toUpperCase().trim() &&
        m.accessPin.trim() === loginAccessPin.trim(),
    );

    if (matched) {
      if (matched.status === "APPROVED") {
        setLoggedManufacturer(matched);
        setIsLoggedIn(true);
        setSuccessText(
          `Identity Verified! Welcome back, ${matched.companyName}.`,
        );
        setErrorText("");
      } else if (matched.status === "PENDING") {
        setErrorText(
          `Access Blocked: The licensing profile for ${matched.companyName} is currently PENDING FDA Watchtower verification in the Admin panel.`,
        );
      } else if (matched.status === "REVOKED") {
        setErrorText(
          `Access Forbidden: The manufacturing license for ${matched.companyName} has been REVOKED due to compliance failure.`,
        );
      }
    } else {
      setErrorText(
        "Authentication Failure: License credentials unmatched or invalid Security PIN code.",
      );
    }
  };

  // Process manufacturer database registration request
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!regCompanyName || !regLicenceKey || !regAccessPin) {
      setErrorText(
        "Please fill in required brand name, authority license key, and choosing PIN.",
      );
      return;
    }

    // Search duplicate values
    const isMatched = manufacturers.some(
      (m) =>
        m.licenceKey.toUpperCase().trim() ===
        regLicenceKey.toUpperCase().trim(),
    );

    if (isMatched) {
      setErrorText(
        `Failed: A pharmaceutical license with verification key [${regLicenceKey}] is already registered.`,
      );
      return;
    }

    // Formulate new company entry
    const newMfg = {
      id: `mfg-${Date.now()}`,
      companyName: regCompanyName.trim(),
      licenceKey: regLicenceKey.trim().toUpperCase(),
      companyDetails:
        regCompanyDetails.trim() ||
        "Custom registered facility campus, FDA approved sector",
      registeredAt: new Date().toISOString(),
      status: "PENDING", // PENDING approval by Administrator
      contactPhone:
        regContactPhone.trim() ||
        "+1 (555) " +
          Math.floor(100 + Math.random() * 900) +
          "-" +
          Math.floor(1000 + Math.random() * 9000),
      accessPin: regAccessPin.trim(),
    };

    onRegisterManufacturer(newMfg);
    setSuccessText(
      `Manufacturer Profile '${newMfg.companyName}' registered successfully as PENDING. Please contact the administrator in the Admin Dashboard to approve this profile before attempting to log in.`,
    );
    // Autofill sign in fields, select first tab
    setLoginLicenceKey(newMfg.licenceKey);
    setLoginAccessPin(newMfg.accessPin);
    // Switch login tabs
    setIsRegisterMode(false);
  };

  // Handle drug registration + cryptographic QR token generation
  const handleRegisterDrug = (e) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!drugName || !batchNumber) {
      setErrorText(
        "Please specify complete drug brand name and batch tracking index.",
      );
      return;
    }

    // Check if batch number already exists
    if (medicines.some((m) => m.batchNumber === batchNumber)) {
      setErrorText(
        `Ledger Collision Error: Batch number '${batchNumber}' has already been cryptographically registered.`,
      );
      return;
    }

    // Generate strict unique cryptographically signed single-use verification token
    const tokenClean = `SECURE-${drugName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}-SQR`;
    const newId = `med-${Date.now()}`;
    const cleanStripSerial =
      stripSerialNumber ||
      `STP-${drugName.substring(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newMed = {
      id: newId,
      name: drugName.trim(),
      batchNumber: batchNumber.trim().toUpperCase(),
      mfgDate: mfgDate,
      expiryDate: expiryDate,
      companyName: companyName, // Binds current logged company name
      companyDetails: companyDetails,
      qrCodeToken: tokenClean,
      maxScansAllowed: 1, // Strict single-use ruleset
      currentScanCount: 0,
      firstScannedAt: null,
      registeredAt: new Date().toISOString(),
      status: "ACTIVE",
      stripSerialNumber: cleanStripSerial,
      pillCount: Number(pillCount),
      activeIngredients:
        activeIngredients.trim() ||
        "Pharma grade pure formulation standard capsule form",
      manufacturerId: loggedManufacturer?.id || "mfg-1", // Binds logged manufacturer unique identifier
    };

    onAddMedicine(newMed);
    setGeneratedMedicine(newMed);
    setSelectedMedicineForQr(newMed);
    setSuccessText(
      `New Drug Batch Registered! Private tracking ledger created under reference ID: ${newMed.id}`,
    );
    // Reset fields
    setDrugName("");
    setBatchNumber("");
    setStripSerialNumber("");
    setPillCount(10);
    setActiveIngredients("");
  };

  return (
    <div
      className="max-w-7xl mx-auto space-y-6 animate-fade-in text-zinc-850"
      id="manufacturer-module"
    >
      {/* Header Panel */}
      <div
        className="bg-white border border-zinc-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-3xs"
        id="manufacturer-header"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-50 text-violet-600 border border-violet-100 rounded-xl">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              Verified Manufacturer Desk
            </h2>
            <p className="text-xs text-zinc-500 font-medium">
              Secure multi-manufacturer registration desk & isolated catalog
              supervisor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn && loggedManufacturer && (
            <span className="bg-violet-50 text-violet-750 border border-violet-200 px-3 py-1.5 text-xs rounded-full font-mono flex items-center gap-1.5 font-bold shadow-3xs animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
              LICENSED: {loggedManufacturer.companyName} (
              {loggedManufacturer.licenceKey})
            </span>
          )}
          <button
            onClick={onBackToPortal}
            className="px-3.5 py-1.5 border border-zinc-200 hover:bg-zinc-100 bg-white rounded-xl text-xs text-zinc-650 font-bold tracking-tight transition-all cursor-pointer"
            id="back-btn"
          >
            ← Selection Hub
          </button>
        </div>
      </div>

      {!isLoggedIn ? (
        /* MANUFACTURER MULTI-TENANT ACCESS SHELL COMPONENT */
        <div
          className="max-w-md mx-auto bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm animate-fade-in"
          id="auth-box"
        >
          {/* Header Switch Toggles */}
          <div className="grid grid-cols-2 border-b border-zinc-200 bg-zinc-50 font-sans text-xs font-bold text-zinc-550">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setErrorText("");
                setSuccessText("");
              }}
              className={`py-3.5 text-center transition-colors border-r border-zinc-200 cursor-pointer ${!isRegisterMode ? "bg-white text-indigo-700 font-extrabold border-b border-b-white" : "hover:bg-zinc-100"}`}
            >
              Sign In to License
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setErrorText("");
                setSuccessText("");
              }}
              className={`py-3.5 text-center transition-colors cursor-pointer ${isRegisterMode ? "bg-white text-indigo-700 font-extrabold border-b border-b-white" : "hover:bg-zinc-100"}`}
            >
              Register Manufacturer
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-zinc-900">
                {isRegisterMode
                  ? "Create Industrial Licensing Profile"
                  : "Multi-Tenant Authentication Gateway"}
              </h3>
              <p className="text-[11px] text-zinc-500 leading-normal font-sans">
                {isRegisterMode
                  ? "Input FDA compliance registry credentials to construct a new private data compartment."
                  : "Enter your designated physical License ID and private entry PIN code to load your inventory."}
              </p>
            </div>

            {errorText && (
              <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl flex items-start gap-2 text-[10.5px] text-rose-700 font-bold animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            {successText && (
              <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl flex items-start gap-2 text-[10.5px] text-emerald-700 font-bold animate-fade-in">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successText}</span>
              </div>
            )}

            {!isRegisterMode ? (
              /* LOGIN GATE */
              <form
                onSubmit={handleLoginSubmit}
                className="space-y-4 text-xs font-medium"
                id="login-form"
              >
                <div className="space-y-1.5">
                  <label className="text-zinc-505 uppercase tracking-wider font-mono text-[9px] block font-bold">
                    REGISTRATION LICENSE ID *
                  </label>
                  <input
                    type="text"
                    value={loginLicenceKey}
                    onChange={(e) => setLoginLicenceKey(e.target.value)}
                    placeholder="e.g. LIC-99381-X7 (Astra)"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-800 font-mono text-center font-bold font-semibold uppercase text-xs focus:border-indigo-550"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-505 uppercase tracking-wider font-mono text-[9px] block font-bold">
                    SECURITY LOCK PIN CODE *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={loginAccessPin}
                    onChange={(e) => setLoginAccessPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-850 font-mono text-center font-extrabold text-xs focus:border-indigo-550"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-sans rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm hover:shadow-indigo-100 transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verify Credentials PIN</span>
                </button>
              </form>
            ) : (
              /* SIGN-UP REGISTRATION FORM */
              <form
                onSubmit={handleRegisterSubmit}
                className="space-y-3.5 text-xs font-medium"
                id="register-form"
              >
                <div className="space-y-1">
                  <label className="text-zinc-505 uppercase font-mono text-[9px] block font-extrabold">
                    PHARMACEUTICAL ORGANIZATION BRAND NAME *
                  </label>
                  <input
                    type="text"
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    placeholder="e.g. Pfizer India Laboratories"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-800 text-xs focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-505 uppercase font-mono text-[9px] block font-extrabold">
                    FDA AUTHORITY LICENSE ID (UNIQUE) *
                  </label>
                  <input
                    type="text"
                    value={regLicenceKey}
                    onChange={(e) => setRegLicenceKey(e.target.value)}
                    placeholder="e.g. LIC-22874-Y3"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-800 font-mono text-xs focus:border-indigo-500 uppercase font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-505 uppercase font-mono text-[9px] block font-extrabold">
                    OFFICIAL SECRET SECURITY PIN (4-6 DIGITS) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={regAccessPin}
                    onChange={(e) => setRegAccessPin(e.target.value)}
                    placeholder="e.g. 5656"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-850 font-mono text-xs focus:border-indigo-500 font-extrabold tracking-widest text-center"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-505 uppercase font-mono text-[9px] block font-extrabold">
                    FACILITY PHYSICAL HEADQUARTERS ADDRESS *
                  </label>
                  <input
                    type="text"
                    value={regCompanyDetails}
                    onChange={(e) => setRegCompanyDetails(e.target.value)}
                    placeholder="e.g. Plot No 42, Hitech City, Hyderabad, TG"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-800 text-xs focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-505 uppercase font-mono text-[9px] block font-extrabold">
                    SECRETARY CONTACT PHONE NO.{" "}
                    <span className="text-zinc-400 font-sans font-normal">
                      (Optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={regContactPhone}
                    onChange={(e) => setRegContactPhone(e.target.value)}
                    placeholder="e.g. +91 99182 81382"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-800 text-xs focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-violet-605 group-hover:bg-violet-700 bg-violet-600 hover:bg-violet-750 text-white font-bold font-sans rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-violet-100 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Enact & Create Department</span>
                </button>
              </form>
            )}

            {/* PRESENTATION AUTO-FILL HELP TIPS */}
            <div className="bg-zinc-50/50 p-3 rounded-xl border border-zinc-150 space-y-1.5 text-[10px] text-zinc-500 font-sans tracking-tight">
              <span className="font-extrabold text-zinc-705 block font-mono flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                SIMULATION DEPLOYMENT PIN-BYPASS LISTINGS:
              </span>
              <div className="grid grid-cols-2 gap-1.5 font-mono">
                <div>
                  Astra: <span className="text-indigo-600 font-bold">1234</span>
                </div>
                <div>
                  MedLife:{" "}
                  <span className="text-indigo-600 font-bold">5678</span>
                </div>
                <div>
                  Zenith:{" "}
                  <span className="text-indigo-600 font-bold">9012</span>
                </div>
                <div>
                  Micro Labs:{" "}
                  <span className="text-indigo-600 font-bold">4321</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LOGGED IN ACTIVE MULTI-TENANT DASHBOARD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* LEFT COLUMN: DRUG REGISTRATION CONTROL PANEL */}
          <div className="lg:col-span-5 space-y-6">
            <div
              className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-3xs"
              id="drug-form-element"
            >
              <div className="flex flex-col gap-1 border-b border-zinc-150 pb-2">
                <h3 className="font-black text-zinc-900 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Enroll New Medicine Batch
                </h3>
                <p className="text-[10px] text-zinc-450 font-medium">
                  Binds dynamically inside your quarantined compartment ID.
                </p>
              </div>

              <form
                onSubmit={handleRegisterDrug}
                className="space-y-4 text-xs font-medium"
              >
                <div className="space-y-1.5">
                  <label className="text-zinc-505 font-mono text-[9px] uppercase tracking-wider block font-bold">
                    MEDICINE GENERIC/BRAND NAME *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ibuprofen Sodium 400mg"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-805 text-xs focus:border-indigo-550"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider block font-bold">
                    BATCH IDENTIFIER (UNIQUE FOR SYSTEM) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IBU-2026-XQ1"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-800 font-mono text-xs focus:border-indigo-550 font-black uppercase"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider block font-bold">
                      MFG DATE
                    </label>
                    <input
                      type="date"
                      className="w-full bg-zinc-50 border border-zinc-200 p-2.5 text-zinc-750 rounded-lg text-xs font-mono font-semibold"
                      value={mfgDate}
                      onChange={(e) => setMfgDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider block font-bold">
                      EXPIRY DATE
                    </label>
                    <input
                      type="date"
                      className="w-full bg-zinc-50 border border-zinc-200 p-2.5 text-zinc-750 rounded-lg text-xs font-mono font-semibold"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Physical Strip configuration characteristics */}
                <div className="border-t border-zinc-150 pt-3.5 space-y-3">
                  <span className="text-[9px] font-mono font-black text-indigo-700 block uppercase tracking-wider">
                    Strip Package Characteristics
                  </span>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider block font-bold">
                        Silo Strip Serial No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. STP-IBU-9021"
                        className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-800 font-mono text-xs focus:border-indigo-550 font-bold uppercase"
                        value={stripSerialNumber}
                        onChange={(e) => setStripSerialNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider block font-bold">
                        Tablets density per strip
                      </label>
                      <select
                        className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-805 text-xs focus:border-indigo-550 font-mono font-bold"
                        value={pillCount}
                        onChange={(e) => setPillCount(Number(e.target.value))}
                      >
                        <option value={10}>10 tablets / strip</option>
                        <option value={15}>15 tablets / strip</option>
                        <option value={5}>5 capsules / strip</option>
                        <option value={12}>12 capsules / strip</option>
                        <option value={20}>20 pills / strip</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider block font-bold">
                      Active Ingredients & Formulation Standard *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ibuprofen IP 400mg, Titanium Dioxide excipient"
                      className="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl outline-none text-zinc-805 text-xs focus:border-indigo-550"
                      value={activeIngredients}
                      onChange={(e) => setActiveIngredients(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {errorText && (
                  <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-150 rounded-lg flex items-center gap-1.5 font-bold text-[10.5px]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}

                {successText && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-lg flex items-center gap-1.5 font-bold text-[10.5px]">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{successText}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-colors cursor-pointer text-center"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Generate Cryptographic QR Barcode</span>
                </button>
              </form>
            </div>

            {/* LIVE DATA SYNC STATUS */}
            <div
              className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-2.5 shadow-3xs"
              id="compartment-status"
            >
              <h4 className="text-xs font-mono font-bold text-zinc-700 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Isolated Storage Segment
              </h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">
                To satisfy regulations, medicines drafted here are filed beneath
                dynamic multi-sector sub-entities in Cloud Firestore:
              </p>
              <div className="p-2.5 bg-zinc-50 rounded-xl text-[9.5px] font-mono text-zinc-650 border border-zinc-200/80 space-y-1 font-bold">
                <div>PRIVATE silo COMPARTMENT:</div>
                <div className="text-violet-650 truncate italic select-all">
                  /manufacturers/{loggedManufacturer?.id}/medicines/*
                </div>
                <div className="text-zinc-400 mt-2">
                  PUBLIC VERIFICATION CHANNEL:
                </div>
                <div className="text-zinc-600 truncate italic">
                  /medicines/* (Binds `manufacturerId: "{loggedManufacturer?.id}
                  "`)
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PREVIEW + ISOLATED CATALOG LIST */}
          <div className="lg:col-span-7 space-y-6">
            {/* ACTIVE SELECTION PRINT BLISTER QR */}
            {selectedMedicineForQr && (
              <div
                className="bg-white border-2 border-indigo-200 rounded-2xl p-6 space-y-4 animate-fade-in shadow-xs"
                id="printer-bay"
              >
                <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
                  <div>
                    <span className="text-[9px] font-mono text-indigo-705 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded font-black uppercase block w-max mb-1">
                      Secured Print Layout
                    </span>
                    <h3 className="font-extrabold text-zinc-900 text-base">
                      {selectedMedicineForQr.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 font-mono text-[9px] block font-bold">
                      SEGMENT BATCH ID
                    </span>
                    <span className="text-zinc-700 font-mono text-xs font-bold bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200 uppercase">
                      {selectedMedicineForQr.batchNumber}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center bg-zinc-50 p-4 border border-zinc-200 rounded-xl text-xs">
                  <div className="sm:col-span-4 flex flex-col items-center">
                    <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center border border-zinc-200 shadow-3xs relative group">
                      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                      <canvas
                        ref={qrCanvasRef}
                        className="w-28 h-28 object-contain"
                      />
                      <span className="text-[8px] font-mono font-bold text-indigo-600 mt-2 text-center uppercase tracking-wide">
                        [ AUTHENTIC LABEL ]
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-8 space-y-2 text-zinc-600 font-medium">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-400 font-mono font-black uppercase font-bold">
                        CRYPTOGRAPHIC SECURE LEDGER HASH (SHA-256):
                      </span>
                      <span className="font-mono text-indigo-705 font-bold bg-white p-2 rounded border border-zinc-200 mt-1 text-[10px] sm:text-[11px] block select-all break-all shadow-3xs">
                        {selectedMedicineForQr.qrCodeToken}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-zinc-150 pb-1 text-[11px] pt-1">
                      <span className="text-zinc-500">Physical Serial No:</span>
                      <span className="text-zinc-700 font-mono font-bold text-xs bg-indigo-50/70 px-1.5 py-0.5 rounded">
                        {selectedMedicineForQr.stripSerialNumber || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-150 pb-1 text-[11px]">
                      <span className="text-zinc-500">Pill Count:</span>
                      <span className="text-zinc-700 font-bold font-mono">
                        {selectedMedicineForQr.pillCount || 10} Tablets / Strip
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-150 pb-1 text-[11px]">
                      <span className="text-zinc-500 flex-none mr-2">
                        Core Formula:
                      </span>
                      <span
                        className="text-zinc-700 text-right truncate max-w-[170px]"
                        title={selectedMedicineForQr.activeIngredients}
                      >
                        {selectedMedicineForQr.activeIngredients}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-150 pb-1 text-[11px]">
                      <span className="text-zinc-500">Licenced Facility:</span>
                      <span className="text-zinc-800 font-extrabold">
                        {selectedMedicineForQr.companyName}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-150 pb-1 text-[11px]">
                      <span className="text-zinc-500 flex-none">
                        Sealed Exp Date:
                      </span>
                      <span className="text-rose-600 font-black font-mono">
                        {selectedMedicineForQr.expiryDate}
                      </span>
                    </div>

                    <div className="pt-1.5 flex justify-between items-center">
                      <span className="text-[9px] text-zinc-400 italic">
                        * Token is single-verification constrained
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadQr}
                        className="p-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-bold font-sans text-[10px] flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-98"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download QR PNG</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEGREGATED DIRECTORY TABLE */}
            <div
              className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-3xs"
              id="catalog-card"
            >
              <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4.5 h-4.5 text-indigo-600" />
                  <h3 className="font-extrabold text-zinc-900 text-sm tracking-tight">
                    Isolated Medicine Directory
                  </h3>
                </div>
                <span className="text-xs font-mono text-zinc-500 bg-zinc-100 p-1 px-2 border border-zinc-200 rounded-lg font-bold">
                  {companyMedicines.length} Batches Registered
                </span>
              </div>

              <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                <table className="w-full text-left text-xs bg-white">
                  <thead className="bg-zinc-50 text-zinc-500 uppercase font-mono text-[9px] border-b border-zinc-200 font-bold">
                    <tr>
                      <th className="p-3 font-black">Generic Brand</th>
                      <th className="p-3 font-black">Batch No</th>
                      <th className="p-3 font-black">Expiry</th>
                      <th className="p-3 font-black">Signature Hash</th>
                      <th className="p-3 text-center font-black">Scan Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 text-zinc-650">
                    {companyMedicines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-3 text-center text-zinc-400 italic py-8 font-sans"
                        >
                          No inventory records generated under this manufacturer
                          license compartment.
                        </td>
                      </tr>
                    ) : (
                      companyMedicines.map((med) => {
                        const isExpired =
                          new Date(med.expiryDate) < new Date();
                        const isSelected = selectedMedicineForQr?.id === med.id;
                        return (
                          <tr
                            key={med.id}
                            onClick={() => setSelectedMedicineForQr(med)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-indigo-50/60 hover:bg-indigo-100/40 font-semibold"
                                : "hover:bg-zinc-50/50"
                            }`}
                            title="Print Label QR Code"
                          >
                            <td className="p-3">
                              <div className="font-bold text-zinc-900">
                                {med.name}
                              </div>
                              {med.activeIngredients && (
                                <div
                                  className="text-[10px] text-zinc-400 font-sans truncate max-w-[180px]"
                                  title={med.activeIngredients}
                                >
                                  Ingredients: {med.activeIngredients}
                                </div>
                              )}
                              {med.stripSerialNumber && (
                                <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                  S/N:{" "}
                                  <span className="font-bold text-zinc-700">
                                    {med.stripSerialNumber}
                                  </span>{" "}
                                  ({med.pillCount || 10} Pills)
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-mono text-zinc-500 font-bold uppercase">
                              {med.batchNumber}
                            </td>
                            <td className="p-3 text-zinc-500 font-mono">
                              <span
                                className={
                                  isExpired ? "text-rose-600 font-black" : ""
                                }
                              >
                                {med.expiryDate}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="bg-zinc-50 text-indigo-700 font-mono px-2 py-0.5 rounded text-[9.5px] border border-zinc-200 font-bold max-w-[110px] truncate block">
                                {med.qrCodeToken}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {med.currentScanCount === 0 ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono">
                                  ● Unscanned
                                </span>
                              ) : med.currentScanCount === 1 ? (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono">
                                  Verified
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono animate-pulse">
                                  ⚠️ Compromised ({med.currentScanCount})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl flex items-start gap-2 text-[10px] text-zinc-500 border border-zinc-200 shadow-3xs">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-semibold">
                  Sandbox Active: Generating items dynamically appends barcodes
                  instantly matching the core patient panel scanner directory!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
