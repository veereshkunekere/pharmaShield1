import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  QrCode,
  AlertTriangle,
  MapPin,
  History,
  LogOut,
  Check,
  Phone,
  Send,
  RefreshCw,
  AlertCircle,
  Lock,
  ClipboardCheck,
  Info,
  Sparkles,
  Camera,
  VideoOff,
  Mail,
  Shield,
  Bell,
} from "lucide-react";
import jsQR from "jsqr";

// Import our new Firebase client write helpers
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function UserModule({
  medicines,
  scans,
  alerts,
  onAddScan,
  onAddReport,
  onUpdateAlertStatus,
  onBackToPortal,
}) {
  const [screen, setScreen] = useState("LOGIN");
  const [phone, setPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [isLoginOtpVerifying, setIsLoginOtpVerifying] = useState(false);
  const [simulatedRegisteredPhone, setSimulatedRegisteredPhone] =
    useState("+1 (555) 724-1100");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [sessionId, setSessionId] = useState("");

  // Scanner state
  const [selectedTokenInput, setSelectedTokenInput] = useState("");
  const [scannedMedicine, setScannedMedicine] = useState(null);
  const [scanResultType, setScanResultType] = useState(null);
  const [scanOtp, setScanOtp] = useState("");
  const [isScanOtpVerifying, setIsScanOtpVerifying] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Real-time SMS OTP states
  const [generatedScanOtp, setGeneratedScanOtp] = useState("");
  const [isLoginOtpSending, setIsLoginOtpSending] = useState(false);
  const [isScanOtpSending, setIsScanOtpSending] = useState(false);
  const [otpProvider, setOtpProvider] = useState("");
  const [otpSendError, setOtpSendError] = useState("");

  // GPS Simulation state
  const [gpsCoords, setGpsCoords] = useState({
    lat: 19.076,
    lng: 72.8777,
    city: "Mumbai Central, India",
  });
  const [isCapturingGps, setIsCapturingGps] = useState(false);

  // Report fake medicine Form state
  const [reportMedicineName, setReportMedicineName] = useState("");
  const [reportBatchNumber, setReportBatchNumber] = useState("");
  const [lookupSearchQuery, setLookupSearchQuery] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Direct Inline Reporting within Result pages
  const [isExpandingReportForm, setIsExpandingReportForm] = useState(false);
  const [inlineReason, setInlineReason] = useState("Duplicate QR reuse");
  const [inlineReportComment, setInlineReportComment] = useState("");
  const [inlineReportSubmitted, setInlineReportSubmitted] = useState(false);

  // Generate random city location to test scans
  const MOCK_LOCATIONS = [
    { city: "Mumbai South, India", lat: 18.922, lng: 72.8347 },
    { city: "Gachibowli, Hyderabad, India", lat: 17.4483, lng: 78.3488 },
    { city: "Indiranagar, Bengaluru, India", lat: 12.9784, lng: 77.6408 },
    { city: "Connaught Place, New Delhi, India", lat: 28.6304, lng: 77.2177 },
    { city: "Salt Lake Sector V, Kolkata, India", lat: 22.5735, lng: 88.4331 },
    { city: "Adyar, Chennai, India", lat: 13.0033, lng: 80.255 },
  ];

  // Capture simulated or real location on load and when reporting
  useEffect(() => {
    autofillUserLocation();
  }, []);

  useEffect(() => {
    if (screen === "REPORTS") {
      autofillUserLocation();
    }
  }, [screen]);

  // Web camera active stream variables
  const [isUsingRealCamera, setIsUsingRealCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanLoopRef = useRef(null);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000 Hz beep
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // play for 0.15s
    } catch (e) {
      console.log("AudioContext beep ignored:", e);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current
          .play()
          .catch((err) => console.error("Video playback failed:", err));
      }
      startScanningLoop();
    } catch (err) {
      console.error("Camera acquisition failed:", err);
      setCameraError(
        "Permission denied or web camera hardware not present/ready.",
      );
      setIsUsingRealCamera(false);
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startScanningLoop = () => {
    const checkFrame = () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          try {
            const decoded = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              {
                inversionAttempts: "dontInvert",
              },
            );
            if (decoded && decoded.data) {
              console.log("FGP Decoder Success:", decoded.data);
              setSelectedTokenInput(decoded.data);
              playBeep();
              stopCamera();
              handleScannedResultSubmit(decoded.data);
              return; // End thread
            }
          } catch (qcErr) {
            console.error("QR decode error:", qcErr);
          }
        }
      }
      if (screen === "SCANNER" && isUsingRealCamera) {
        scanLoopRef.current = requestAnimationFrame(checkFrame);
      }
    };
    scanLoopRef.current = requestAnimationFrame(checkFrame);
  };

  useEffect(() => {
    if (screen === "SCANNER" && isUsingRealCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [screen, isUsingRealCamera]);

  const autofillUserLocation = () => {
    if (navigator.geolocation) {
      setIsCapturingGps(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          let city = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
          
          try {
            // Reverse geocode using OpenStreetMap's Nominatim
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
              headers: { "Accept-Language": "en" }
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name) {
                // Shorten name if too descriptive
                city = data.display_name.split(",").slice(0, 3).join(", ");
              } else if (data && data.address) {
                city = data.address.city || data.address.town || data.address.village || data.address.suburb || city;
              }
            }
          } catch (err) {
            console.error("Reverse geocoding error:", err);
          }
          
          setGpsCoords({
            lat: Number(lat.toFixed(4)),
            lng: Number(lng.toFixed(4)),
            city: city,
          });
          setIsCapturingGps(false);
        },
        (error) => {
          console.error("User blocked or failed geolocation access:", error);
          setIsCapturingGps(false);
          // Fallback to simulation
          simulateGpsCapture();
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      simulateGpsCapture();
    }
  };

  const simulateGpsCapture = () => {
    setIsCapturingGps(true);
    setTimeout(() => {
      const randomLoc =
        MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
      setGpsCoords({
        lat: Number((randomLoc.lat + (Math.random() - 0.5) * 0.01).toFixed(4)),
        lng: Number((randomLoc.lng + (Math.random() - 0.5) * 0.01).toFixed(4)),
        city: randomLoc.city,
      });
      setIsCapturingGps(false);
    }, 1000);
  };

  // Login handler using Server API
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!phone) {
      setErrorText("Please enter your mobile or email credentials.");
      return;
    }
    setErrorText("");
    setOtpSendError("");
    setOtpProvider("");
    setIsLoginOtpSending(true);
    setSimulatedRegisteredPhone(phone);

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedOtp(data.otp);
        setSessionId(data.sessionId);
        setOtpProvider(data.provider);
        if (data.error) {
          setOtpSendError(data.error);
        }
        console.log(`[Full-Stack Login Code Dispatch] Code generated: ${data.otp}`);
      } else {
        setOtpSendError(data.error || "Server error deploying verification text.");
      }
    } catch (err) {
      console.error("Failed to request backend passwordless session:", err);
      setOtpSendError(err.message || "Central verification dispatch gateway is offline.");
    } finally {
      setIsLoginOtpSending(false);
    }

    setScreen("LOGIN_OTP");
  };

  const handleLoginOtpVerify = async (e) => {
    e.preventDefault();
    setIsLoginOtpVerifying(true);
    setErrorText("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: loginOtp, sessionId }),
      });
      const data = await response.json();
      if (data.success) {
        setScreen("HOME");
        setErrorText("");
      } else {
        setErrorText(data.error || "Identity challenge failed. Enter correct verification code.");
      }
    } catch (err) {
      console.error("Login verification failed:", err);
      setErrorText("Authentication system rejected verify attempt.");
    } finally {
      setIsLoginOtpVerifying(false);
    }
  };

  // Viewfinder simulation scanner trigger using Server API
  const handleScannedResultSubmit = async (tokenToScan) => {
    if (!tokenToScan) {
      setErrorText("Please select or specify a barcode scenario.");
      return;
    }

    // Reset direct inline reporting states for fresh scan
    setIsExpandingReportForm(false);
    setInlineReportComment("");
    setInlineReportSubmitted(false);
    setInlineReason("Duplicate QR reuse");

    setErrorText("");
    setOtpSendError("");
    setOtpProvider("");
    setIsScanOtpSending(true);

    try {
      const response = await fetch("/api/scan/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scannedToken: tokenToScan,
          userPhone: simulatedRegisteredPhone,
          location: gpsCoords,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedScanOtp(data.otp);
        setScanResultType(data.calculatedResult);
        setScannedMedicine(data.medicine || null);
        setSessionId(data.sessionId);
        setSelectedTokenInput(tokenToScan);
        setOtpProvider(data.provider);
        if (data.error) {
          setOtpSendError(data.error);
        }
        console.log(`[Full-Stack Scan Check] Results calculated: ${data.calculatedResult} | verification OTP dispatched.`);
      } else {
        setOtpSendError(data.error || "Server validation gateway denied scanning verification.");
      }
    } catch (err) {
      console.error("Scan verification request failed:", err);
      setOtpSendError("All delivery mechanisms offline. Safe mode fallback active.");
    } finally {
      setIsScanOtpSending(false);
    }

    setScreen("SCAN_OTP");
  };

  // Submit scan OTP verification and lock in permanent transaction report via the server
  const handleScanOtpVerify = async (e) => {
    e.preventDefault();
    setIsScanOtpVerifying(true);
    setErrorText("");

    try {
      const response = await fetch("/api/scan/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          otp: scanOtp,
          scannedToken: selectedTokenInput,
          userPhone: simulatedRegisteredPhone,
          location: gpsCoords,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setErrorText("");
        
        // Propagate changes to parent view lists so stats change immediately
        if (onAddScan && data.scan) {
          onAddScan(data.scan);
        }

        if (data.result === "GENUINE") {
          setScreen("RESULT_GENUINE");
        } else {
          setScreen("RESULT_FAKE");
        }
      } else {
        setErrorText(data.error || "Verification failed. Incorrect verification code entered.");
      }
    } catch (err) {
      console.error("Scanning challenge authorization failed:", err);
      setErrorText("Ledger system transaction rejected. Try regular sandbox backdoors.");
    } finally {
      setIsScanOtpVerifying(false);
    }
  };

  // File Report Handler
  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!reportMedicineName || !reportBatchNumber) {
      setErrorText("Please fill in medicine name and batch number!");
      return;
    }

    const newReport = {
      id: "rep-" + Date.now(),
      medicineName: reportMedicineName,
      batchNumber: reportBatchNumber,
      companyName: scannedMedicine
        ? scannedMedicine.companyName
        : "Pending Forensic Analysis",
      location: {
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        city: gpsCoords.city,
      },
      reportedAt: new Date().toISOString(),
      comment:
        reportComment ||
        "Automatic warning triggered via Patient Scan application.",
      reporterPhone: simulatedRegisteredPhone,
      status: "PENDING",
    };

    onAddReport(newReport);
    setReportSubmitted(true);
    setReportMedicineName("");
    setReportBatchNumber("");
    setReportComment("");
    setErrorText("");

    setTimeout(() => {
      setReportSubmitted(false);
      setScreen("HOME");
    }, 2000);
  };

  const userScans = scans.filter(
    (s) => s.userPhone === simulatedRegisteredPhone,
  );

  const matchedMedicines = lookupSearchQuery.trim()
    ? (medicines || []).filter(
        (m) =>
          m.name?.toLowerCase().includes(lookupSearchQuery.toLowerCase()) ||
          m.batchNumber?.toLowerCase().includes(lookupSearchQuery.toLowerCase()) ||
          m.qrCodeToken?.toLowerCase().includes(lookupSearchQuery.toLowerCase()) ||
          m.id?.toLowerCase().includes(lookupSearchQuery.toLowerCase())
      )
    : [];

  const myAlerts = (alerts || []).filter((al) => {
    if (!al.userPhone) return false;
    // Normalize both for robust comparison to account for formatting mismatch (+1, brackets, dashes)
    const normAl = al.userPhone.replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
    const normUser = simulatedRegisteredPhone
      .replace(/[^0-9a-zA-Z]/g, "")
      .toLowerCase();
    return normAl.includes(normUser) || normUser.includes(normAl);
  });

  return (
    <div
      className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in text-zinc-800"
      id="user-module"
    >
      {/* Mobile Smartphone Frame Wrapper */}
      <div className="lg:col-span-5 flex justify-center">
        <div className="relative w-[340px] h-[680px] bg-zinc-900 rounded-[50px] border-[10px] border-zinc-900 shadow-xl overflow-hidden flex flex-col select-none ring-1 ring-zinc-200">
          {/* Front camera cutout */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-950 rounded-full z-[100] flex items-center justify-around px-4">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-850" />
            <span className="w-12 h-1 bg-zinc-850 rounded-sm" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-900/10" />
          </div>

          {/* Phone Screen Status Bar */}
          <div className="bg-zinc-150 pt-8 pb-3 px-6 flex justify-between items-center text-[10px] font-mono text-zinc-500 font-bold tracking-tight border-b border-zinc-200/50">
            <span>9:41 AM</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-600 font-mono">
                5G NETWORK
              </span>
              <div className="w-4 h-2.5 bg-zinc-300 rounded-sm relative flex items-center p-0.5">
                <span className="bg-zinc-800 h-full w-4/5 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Dynamic Mobile Interface Screen Body */}
          <div className="flex-1 bg-zinc-50 flex flex-col overflow-y-auto px-5 py-4 text-zinc-800">
            {/* LOGIN SCREEN */}
            {screen === "LOGIN" && (
              <div
                className="flex-1 flex flex-col justify-between py-4 animate-fade-in"
                id="screen-user-login"
              >
                <div className="space-y-6 pt-6">
                  <div className="text-center space-y-2">
                    <div className="mx-auto bg-indigo-50 text-indigo-600 border border-indigo-100 w-14 h-14 rounded-full flex items-center justify-center">
                      <Smartphone className="w-6 h-6 animate-bounce" />
                    </div>
                    <h2 className="text-xl font-bold font-sans tracking-tight text-zinc-900 mt-2">
                      PharmaGuard
                    </h2>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      Patient cryptographic identity and medicine authorization
                      client.
                    </p>
                  </div>

                  <form onSubmit={handlePhoneSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                        {phone.includes("@")
                          ? "Enter Email Address"
                          : "Enter Mobile or Email"}
                      </label>
                      <div className="relative">
                        {phone.includes("@") ? (
                          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-indigo-500" />
                        ) : (
                          <Phone className="absolute left-3 top-3.5 w-4 h-4 text-zinc-400" />
                        )}
                        <input
                          type="text"
                          placeholder="e.g. patient@test.com or +1..."
                          className="w-full bg-white border border-zinc-200 focus:border-indigo-550 outline-none rounded-xl pl-10 pr-4 py-3 text-xs font-mono text-zinc-800"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <p className="text-[9px] text-zinc-400">
                        Credentials required to retrieve prescription OTP
                        registry.
                      </p>
                    </div>

                    {errorText && (
                      <div className="text-[10px] text-red-650 bg-red-50 p-2 rounded border border-red-105 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 animate-shake" />
                        <span>{errorText}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold font-sans py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                    >
                      <span>
                        {phone.includes("@")
                          ? "Request Email Security OTP"
                          : "Request Mobile SMS OTP"}
                      </span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                <div className="p-3 bg-white rounded-xl border border-zinc-200 text-[10px] text-zinc-500 space-y-1 font-sans shadow-3xs">
                  <div className="font-bold text-zinc-700 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-indigo-500" /> HYBRID IDENTITY
                    HUB:
                  </div>
                  <p className="leading-relaxed">
                    Supports real-time Firebase syncing. Enter your email or
                    mobile to receive a simulated cryptographic security code.
                  </p>
                </div>
              </div>
            )}

            {/* OTP SECURITY CHALLENGE SCREEN */}
            {screen === "LOGIN_OTP" && (
              <div
                className="flex-1 flex flex-col justify-between py-4 animate-fade-in"
                id="screen-user-login-otp"
              >
                <div className="space-y-6 pt-6">
                  <div className="text-center space-y-2">
                    <div className="mx-auto bg-zinc-100 text-zinc-700 border border-zinc-200 w-14 h-14 rounded-full flex items-center justify-center">
                      <Lock className="w-6 h-6 animate-pulse" />
                    </div>
                    <h2 className="text-lg font-bold font-sans tracking-tight text-zinc-900 mt-2">
                      Enter validation key
                    </h2>
                    <p className="text-[11px] text-zinc-500 leading-tight">
                      A secure passcode has been logged to Cloud Firestore for{" "}
                      <span className="font-mono text-zinc-700 font-bold underline truncate max-w-[180px] block mx-auto">
                        {simulatedRegisteredPhone}
                      </span>
                    </p>
                  </div>

                  <form onSubmit={handleLoginOtpVerify} className="space-y-4">
                    <div className="space-y-1.5 text-center">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                        VERIFICATION CODE
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="______"
                        value={loginOtp}
                        onChange={(e) => setLoginOtp(e.target.value)}
                        className="w-40 bg-white text-center tracking-[8px] border border-zinc-200 focus:border-indigo-550 outline-none rounded-xl py-2.5 text-base font-bold text-zinc-800 font-mono"
                      />

                      {/* Interactive dispatch banner helper! */}
                      <div className="mt-2.5 p-2 bg-indigo-50/70 border border-indigo-150 rounded-lg text-left text-[9px] text-indigo-805 space-y-1 leading-normal font-sans">
                        <div className="font-bold uppercase tracking-wider text-[8px] text-indigo-700 font-mono flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />{" "}
                          Real-time Security Carrier
                        </div>
                        <p>
                          Active Security OTP:{" "}
                          <span className="font-mono font-black text-rose-600 underline text-xs">
                            {generatedOtp && !phone?.includes("@") ? generatedOtp : "••••• (Sent to secure channel)"}
                          </span>
                        </p>
                        {isLoginOtpSending ? (
                          <div className="text-[8px] text-indigo-600 font-mono font-bold flex items-center gap-1 mt-1">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            <span>
                              Routing verification payload to mobile network...
                            </span>
                          </div>
                        ) : otpSendError ? (
                          <div className="text-[8.5px] text-amber-700 font-bold bg-amber-50 p-1.5 rounded border border-amber-200 flex flex-col gap-0.5 mt-1">
                            <span className="flex items-center gap-1 font-mono text-[7.5px] text-amber-800">
                              <AlertCircle className="w-2.5 h-2.5" /> SECURE
                              GATEWAY FALLBACK:
                            </span>
                            <span>{otpSendError}</span>
                          </div>
                        ) : otpProvider ? (
                          <div className="text-[8px] text-emerald-700 font-bold bg-emerald-50/80 p-1.5 rounded border border-emerald-200 flex items-center gap-1 mt-1">
                            <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                            <span>
                              Delivered successfully via{" "}
                              {otpProvider === "textbelt"
                                ? "Textbelt limits provider"
                                : otpProvider === "fast2sms"
                                  ? "Fast2SMS India Route"
                                  : otpProvider === "email_simulation"
                                    ? "Verified SMTP gateway"
                                    : otpProvider === "dev_sandbox"
                                      ? "Local Dev Sandbox"
                                      : "Twilio SMS gateway"}
                              .
                            </span>
                          </div>
                        ) : (
                          <p className="text-[8px] text-zinc-400">
                            Secure carrier message successfully dispatched.
                            Enter code to enter database.
                          </p>
                        )}
                        {generatedOtp && !phone?.includes("@") && (
                          <p className="text-[8px] text-zinc-400 leading-tight border-t border-indigo-100 pt-1 mt-1">
                            * Since you are in a sandbox / dev environment, you can use{" "}
                            <span className="font-bold">
                              {generatedOtp}
                            </span>.
                          </p>
                        )}
                      </div>
                    </div>

                    {errorText && (
                      <div className="text-[10px] text-red-650 bg-red-50 p-2.5 rounded border border-red-105 flex items-center gap-1.5 justify-center">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errorText}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoginOtpVerifying}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold font-sans py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isLoginOtpVerifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying Identity...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Complete Secure Entry</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <button
                  onClick={() => setScreen("LOGIN")}
                  className="text-center font-mono text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  ← Edit Phone number
                </button>
              </div>
            )}

            {/* PATIENT HOMEPAGE */}
            {screen === "HOME" && (
              <div className="space-y-5 animate-fade-in" id="screen-user-home">
                {/* User Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold font-mono text-indigo-650">
                      PT
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-450 block uppercase font-bold tracking-tight">
                        ACTIVE REGISTRY
                      </span>
                      <span className="text-xs font-mono font-bold text-zinc-805">
                        {simulatedRegisteredPhone}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setScreen("LOGIN")}
                    className="p-1.5 px-2.5 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-zinc-550 hover:text-rose-600 text-[10px] font-mono flex items-center gap-1 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Exit</span>
                  </button>
                </div>

                {/* Simulated GPS Bar */}
                <div className="p-2.5 bg-white rounded-xl border border-zinc-200/80 flex items-center justify-between text-[10px] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span className="font-mono text-[9px] max-w-[150px] truncate font-bold">
                      {gpsCoords.city}
                    </span>
                  </div>
                  <button
                    onClick={simulateGpsCapture}
                    disabled={isCapturingGps}
                    className="text-indigo-650 font-bold hover:text-indigo-500 flex items-center gap-1 font-mono text-[9px] shrink-0"
                  >
                    {isCapturingGps ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Mock Location</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Primary QR Scanning Card */}
                <div
                  onClick={() => {
                    setSelectedTokenInput("");
                    setScreen("SCANNER");
                  }}
                  className="bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer hover:bg-zinc-100/30 transition-all space-y-3 shadow-2xs group"
                >
                  <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-s">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-zinc-800 text-sm">
                      Scan Medicine QR Code
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Launch optical camera viewfinder to authenticate strip
                      signatures.
                    </p>
                  </div>
                </div>

                {/* Notification Area: Patient Custom Expiry & Recall Alerts */}
                <div className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <div className="flex items-center gap-1.5 text-amber-700 font-mono text-[10px] font-bold">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <span>
                        OFFICIAL ALERTS PANEL (
                        {myAlerts.filter((a) => a.status === "UNREAD").length}{" "}
                        NEW)
                      </span>
                    </div>
                  </div>

                  {myAlerts.length === 0 ? (
                    <div className="p-2 bg-zinc-50 rounded-lg text-center text-[10px] text-zinc-400">
                      No matching pharmaceutical expiry warnings historically
                      pushed for your phone state.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-0.5">
                      {myAlerts.map((al) => (
                        <div
                          key={al.id}
                          className={`p-2.5 rounded-lg border text-[10.5px] space-y-1.5 transition-all text-xs ${
                            al.severity === "CRITICAL"
                              ? "bg-rose-50/75 border-rose-150 text-rose-850"
                              : al.severity === "WARNING"
                                ? "bg-amber-50/75 border-amber-150 text-amber-850"
                                : "bg-blue-50/75 border-blue-150 text-blue-850"
                          }`}
                        >
                          <div className="flex justify-between items-center font-sans font-bold">
                            <span className="font-extrabold text-zinc-800 leading-tight block">
                              {al.medicineName}
                            </span>
                            {al.status === "UNREAD" ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateAlertStatus(al.id, "READ");
                                }}
                                className="text-[9px] font-mono text-indigo-600 hover:text-indigo-500 bg-white border border-indigo-200 px-1.5 py-0.5 rounded font-black transition-all shadow-3xs cursor-pointer inline-block"
                              >
                                Mark Read
                              </button>
                            ) : (
                              <span className="text-[8px] font-mono text-zinc-450 uppercase font-black">
                                Read ✓
                              </span>
                            )}
                          </div>

                          <div className="font-mono text-[9px] text-zinc-550 space-y-0.5 leading-tight font-semibold">
                            <div>
                              Batch:{" "}
                              <span className="font-bold underline text-zinc-650">
                                {al.batchNumber}
                              </span>
                            </div>
                            <div>
                              Expiration threshold:{" "}
                              <span className="font-bold text-red-600">
                                {al.expiryDate}
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] leading-relaxed italic bg-white/75 p-2 rounded border border-zinc-150 shadow-3xs text-zinc-700">
                            &ldquo;{al.alertMessage}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Grid Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setReportSubmitted(false);
                      setScreen("REPORTS");
                    }}
                    className="p-3 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 text-left space-y-1.5 transition-colors shadow-2xs"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-550" />
                    <div>
                      <div className="text-[11px] font-bold text-zinc-800">
                        Report Replica
                      </div>
                      <div className="text-[9px] text-zinc-450 leading-tight">
                        File suspicious drug alerts
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setScreen("HISTORY")}
                    className="p-3 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 text-left space-y-1.5 transition-colors shadow-2xs"
                  >
                    <History className="w-4 h-4 text-indigo-550" />
                    <div>
                      <div className="text-[11px] font-bold text-zinc-800">
                        Recent Checks
                      </div>
                      <div className="text-[9px] text-zinc-450 leading-tight">
                        {userScans.length} previous scans logged
                      </div>
                    </div>
                  </button>
                </div>

                {/* Recent scan banner */}
                <div className="pt-3 border-t border-zinc-200 space-y-2">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                    LAST CHECK SUMMARY
                  </h4>
                  {userScans.length > 0 ? (
                    <div className="p-2.5 bg-white rounded-xl border border-zinc-200 flex items-center justify-between text-[11px] shadow-3xs">
                      <div>
                        <span className="font-bold text-zinc-800 block max-w-[140px] truncate">
                          {userScans[0].medicineName}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono font-semibold">
                          Code: {userScans[0].scannedToken.substring(0, 11)}...
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                          userScans[0].result === "GENUINE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                        }`}
                      >
                        {userScans[0].result === "GENUINE"
                          ? "GENUINE"
                          : "THREAT"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-400 italic">
                      No drug test logs on this handset.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* SCANNER VIEWPORT SCREEN */}
            {screen === "SCANNER" && (
              <div
                className="flex-1 flex flex-col justify-between animate-fade-in"
                id="screen-user-scanner"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                      {isUsingRealCamera
                        ? "Device Camera Stream"
                        : "Simulation Mode"}
                    </span>
                    <button
                      onClick={() => setScreen("HOME")}
                      className="text-xs text-zinc-400 hover:text-zinc-650 font-bold"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Camera / Viewfinder Box */}
                  <div className="relative aspect-[4/3] bg-zinc-100 border border-zinc-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center">
                    {isUsingRealCamera ? (
                      <>
                        <video
                          ref={videoRef}
                          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                          playsInline
                          muted
                        />

                        <canvas ref={canvasRef} className="hidden" />

                        {cameraError && (
                          <div className="absolute inset-0 bg-zinc-900/90 text-white p-4 flex flex-col items-center justify-center text-center gap-2 z-30">
                            <VideoOff className="w-8 h-8 text-rose-500" />
                            <p className="text-[11px] font-medium leading-relaxed">
                              {cameraError}
                            </p>
                            <button
                              onClick={() => {
                                setIsUsingRealCamera(false);
                                setCameraError(null);
                              }}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-550 text-[10px] rounded-lg text-white font-bold cursor-pointer"
                            >
                              Okay, Use Simulator
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center p-4 space-y-2 opacity-50 z-0">
                        <QrCode className="w-10 h-10 text-zinc-650 mx-auto" />
                        <p className="text-[10px] font-mono text-zinc-500">
                          Center QR inside target frame
                        </p>
                      </div>
                    )}

                    {/* Scanning Feedback Animations (laser & crosshair) */}
                    {(!isUsingRealCamera || !cameraError) && (
                      <>
                        {/* Animated Red Laser Scanning Line */}
                        <div className="absolute left-0 right-0 h-0.5 bg-indigo-600 shadow-md animate-scanner-laser z-20" />

                        {/* Retro Crosshairs */}
                        <div className="absolute w-2/3 h-2/3 border border-dashed border-indigo-400/30 rounded-xl flex items-center justify-center z-10 pointer-events-none font-sans">
                          <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-500 absolute top-0 left-0 rounded-tl" />
                          <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-500 absolute top-0 right-0 rounded-tr" />
                          <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-500 absolute bottom-0 left-0 rounded-bl" />
                          <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-500 absolute bottom-0 right-0 rounded-br" />
                        </div>
                      </>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 z-20 bg-white/90 py-1 px-2 rounded-lg text-[9px] font-mono text-zinc-500 flex items-center gap-1 text-center justify-center border border-zinc-200">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>
                        GPS MATCH: {gpsCoords.lat.toFixed(2)},{" "}
                        {gpsCoords.lng.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Multi-mode Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setCameraError(null);
                        setIsUsingRealCamera((prev) => !prev);
                      }}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isUsingRealCamera ? (
                        <>
                          <VideoOff className="w-4 h-4" />
                          <span>Switch to Simulator Mode</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Use Live Device Camera Stream</span>
                        </>
                      )}
                    </button>

                    {/* Dropdown Simulation Fallback */}
                    {(!isUsingRealCamera || cameraError) && (
                      <div className="p-3 bg-white rounded-xl border border-zinc-200 text-zinc-650 space-y-3 shadow-3xs">
                        <div className="text-[11px] font-mono font-bold text-indigo-600 flex items-center gap-1 uppercase">
                          <Sparkles className="w-3.5 h-3.5" /> Barcode
                          Scenarios:
                        </div>

                        <div className="space-y-1.5">
                          <select
                            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs rounded-lg p-2 outline-none font-medium focus:border-indigo-450"
                            value={selectedTokenInput}
                            onChange={(e) =>
                              setSelectedTokenInput(e.target.value)
                            }
                          >
                            <option value="">-- Select scan scenario --</option>
                            <option value="SECURE-AMX-9821-XQR">
                              Amoxicillin 500mg [NEW GENUINE TEST]
                            </option>
                            <option value="SECURE-DOL-5582-WQR">
                              Paracetamol 650mg [RE-SCANNED COPIED BLOCK -
                              FAILS]
                            </option>
                            <option value="SECURE-ATO-0938-PQR">
                              Atorvastatin Tab [GENUINE BUT EXPIRED - DANGER]
                            </option>
                            <option value="MALICIOUS-TOKEN-999">
                              Counterfeit Clone Token [NOT REGISTERED - FAILS]
                            </option>
                            {/* Dynamic generated medicines options for scanning */}
                            {medicines.map((m) => (
                              <option key={m.id} value={m.qrCodeToken}>
                                {m.name} [{m.batchNumber}]
                              </option>
                            ))}
                          </select>
                        </div>

                        {errorText && (
                          <p className="text-[9px] text-red-650 text-center font-bold">
                            {errorText}
                          </p>
                        )}

                        <button
                          onClick={() =>
                            handleScannedResultSubmit(selectedTokenInput)
                          }
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded-lg font-sans flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Simulate Hardware Read</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-zinc-400 italic text-center p-2 font-mono">
                  Decrypting barcode parameters live
                </div>
              </div>
            )}

            {/* SCAN OTP REALTIME CHALLENGE */}
            {screen === "SCAN_OTP" && (
              <div
                className="flex-1 flex flex-col justify-between py-4 animate-fade-in"
                id="screen-user-scan-otp"
              >
                <div className="space-y-6 pt-4">
                  <div className="text-center space-y-2">
                    <div className="mx-auto bg-zinc-150 text-zinc-700 border border-zinc-200 w-11 h-11 rounded-full flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-bold font-sans tracking-tight text-zinc-900 mt-1">
                      Receipt OTP Step
                    </h2>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Enter the one-time authentication code printed on your
                      prescription bill to register the hardware scan
                      redemption.
                    </p>
                  </div>

                  <form onSubmit={handleScanOtpVerify} className="space-y-4">
                    <div className="space-y-2 text-center bg-white p-4 border border-zinc-200 rounded-xl shadow-3xs">
                      <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">
                        RECEIPT OTP CODE
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="____"
                        value={scanOtp}
                        onChange={(e) => setScanOtp(e.target.value)}
                        className="w-32 bg-zinc-50 border border-zinc-250 text-zinc-805 font-bold font-mono tracking-[10px] text-center p-2 rounded-lg focus:border-indigo-550 outline-none text-base"
                      />

                      {/* Interactive dynamic scan-based OTP delivery logger */}
                      <div className="mt-2.5 p-2.5 bg-indigo-50/70 border border-indigo-150 rounded-lg text-left text-[9px] text-indigo-805 space-y-1 leading-normal font-sans">
                        <div className="font-bold uppercase tracking-wider text-[8px] text-indigo-700 font-mono flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />{" "}
                          Secure Rx Delivery Log
                        </div>
                        <p className="mt-1">
                          Active redemption OTP:{" "}
                          <span className="font-mono font-black text-rose-600 underline text-xs">
                            {generatedScanOtp && !simulatedRegisteredPhone?.includes("@") ? generatedScanOtp : "•••• (Sent to secure destination)"}
                          </span>
                        </p>
                        {isScanOtpSending ? (
                          <div className="text-[8px] text-indigo-650 font-bold flex items-center gap-1 mt-1 font-mono">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            <span>Routing confirmation SMS payload...</span>
                          </div>
                        ) : otpSendError ? (
                          <div className="text-[8px] text-amber-700 font-bold bg-amber-50 p-1 rounded border border-amber-100 flex items-center gap-1 mt-1 leading-normal">
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                            <span>Routing Fallback: {otpSendError}</span>
                          </div>
                        ) : otpProvider ? (
                          <div className="text-[8px] text-emerald-700 font-bold bg-emerald-50/80 p-1.5 rounded border border-emerald-150 flex items-center gap-1 mt-1">
                            <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                            <span>
                              OTP sent via{" "}
                              {otpProvider === "textbelt"
                                ? "Textbelt limits provider"
                                : otpProvider === "fast2sms"
                                  ? "Fast2SMS Gateway"
                                  : otpProvider === "email_simulation"
                                    ? "SMTP Sandbox"
                                    : otpProvider === "dev_sandbox"
                                      ? "Local Dev Sandbox"
                                      : "Twilio SMS Network"}
                              !
                            </span>
                          </div>
                        ) : (
                          <p className="text-[8px] text-indigo-650 font-medium">
                            Message routed successfully to{" "}
                            {simulatedRegisteredPhone}.
                          </p>
                        )}
                        {generatedScanOtp && !simulatedRegisteredPhone?.includes("@") && (
                          <p className="text-[8px] text-zinc-400 font-normal leading-tight border-t border-indigo-100 pt-1 mt-1">
                            * Since you are in a sandbox / dev environment, you can use{" "}
                            <span className="font-bold">
                              {generatedScanOtp}
                            </span>.
                          </p>
                        )}
                      </div>
                    </div>

                    {errorText && (
                      <div className="text-[10px] text-red-650 text-center font-bold">
                        {errorText}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isScanOtpVerifying}
                      className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm font-sans"
                    >
                      {isScanOtpVerifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying Ledger state...</span>
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Authenticate Medicine</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <button
                  onClick={() => setScreen("SCANNER")}
                  className="text-center font-mono text-[9px] text-zinc-400 mt-2"
                >
                  Cancel and return
                </button>
              </div>
            )}

            {/* RESPONSE RESULT: GENUINE GREEN SCREEN */}
            {screen === "RESULT_GENUINE" && scannedMedicine && (
              <div
                className="flex-1 flex flex-col justify-between py-2 animate-fade-in"
                id="screen-user-genuine"
              >
                <div className="space-y-4">
                  {/* Green Header */}
                  <div className="text-center bg-emerald-50 border border-emerald-250 rounded-2xl p-5 space-y-2 shadow-xs">
                    <div className="mx-auto bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-emerald-800 tracking-tight">
                      Genuine Medicine Verified
                    </h3>
                    <p className="text-[9px] text-emerald-600 font-medium">
                      This package registration is verified on the secure cloud
                      database.
                    </p>
                  </div>

                  {/* Detailed Medicine Data */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-2 text-xs shadow-3xs">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                      <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">
                        DRUG NAME
                      </span>
                      <span className="font-bold text-zinc-800">
                        {scannedMedicine.name}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                      <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">
                        BATCH ID
                      </span>
                      <span className="font-mono text-zinc-700 font-bold">
                        {scannedMedicine.batchNumber}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                      <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">
                        MANUFACTURER
                      </span>
                      <span className="text-right text-zinc-700 font-semibold">
                        {scannedMedicine.companyName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-zinc-100 pb-1.5">
                      <div>
                        <span className="text-[8px] font-mono text-zinc-400 font-bold block uppercase">
                          Mfg Date
                        </span>
                        <span className="text-zinc-650 font-mono font-bold">
                          {scannedMedicine.mfgDate}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-mono text-zinc-400 font-bold block uppercase">
                          Expiry Date
                        </span>
                        <span className="text-emerald-700 font-mono font-bold">
                          {scannedMedicine.expiryDate}
                        </span>
                      </div>
                    </div>

                    {/* Packaging Strip Cross-verification */}
                    <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-150 space-y-1.5 text-xs">
                      <div className="font-mono font-bold text-[9px] text-indigo-700 uppercase tracking-wide flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-indigo-650" />
                        Strip Packaging Validation
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500 font-medium">
                          Strip Serial No:
                        </span>
                        <span className="font-mono font-bold text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                          {scannedMedicine.stripSerialNumber || "N/A"}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500 font-medium">
                          Pill Configuration:
                        </span>
                        <span className="font-bold text-zinc-705">
                          {scannedMedicine.pillCount
                            ? `${scannedMedicine.pillCount} Tablets`
                            : "10 Tablets"}
                        </span>
                      </div>

                      <div className="flex flex-col text-[11px] pt-1.5 border-t border-indigo-100/50">
                        <span className="text-[9px] font-mono text-indigo-600 font-semibold uppercase mb-0.5">
                          Ingredients & Strength:
                        </span>
                        <span className="text-zinc-650 leading-relaxed bg-white/80 p-1.5 rounded border border-indigo-100 italic text-[11px]">
                          {scannedMedicine.activeIngredients ||
                            "Pure standard pharmaceutical compound"}
                        </span>
                      </div>
                    </div>

                    <div className="text-[9px] text-zinc-500 font-mono bg-zinc-50 p-2.5 rounded border border-zinc-150 leading-relaxed font-medium">
                      <Info className="w-3 h-3 text-indigo-500 inline mr-1" />
                      Redemption logged. Re-scanning this physical strip will
                      alert administrative auditors.
                    </div>

                    {/* Discrepancy report option even for genuine */}
                    <div className="pt-2 border-t border-zinc-100 mt-2">
                      {inlineReportSubmitted ? (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-lg text-[10px] font-semibold animate-fade-in">
                          <Check className="w-3 h-3 text-emerald-600 inline mr-1 stroke-[3]" />
                          <span>
                            Discrepancy case reported! Security teams will
                            inspect this batch.
                          </span>
                        </div>
                      ) : isExpandingReportForm ? (
                        <div className="bg-rose-50/40 border border-rose-150 p-2.5 rounded-lg space-y-2 text-[10px] text-zinc-700 animate-fade-in">
                          <div className="font-bold text-rose-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Report Packaging/Pill Discrepancy
                          </div>

                          <div className="space-y-1">
                            <span className="text-[8px] font-mono font-bold text-zinc-400 block uppercase">
                              Issue Observed
                            </span>
                            <select
                              value={inlineReason}
                              onChange={(e) => setInlineReason(e.target.value)}
                              className="w-full bg-white border border-zinc-200 p-1 rounded text-[10px] font-sans text-zinc-805"
                            >
                              <option value="Tampered package">
                                Tampered Outer Packaging / Decals
                              </option>
                              <option value="Atypical pill shape / suspected replacement">
                                Atypical Pill Appearance / Form
                              </option>
                              <option value="Differing tablet count/strip size">
                                Differing Tablet Count/Strip Size
                              </option>
                              <option value="Poor print quality on details">
                                Faded/Irregular Inkjet Coding
                              </option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[8px] font-mono font-bold text-zinc-400 block uppercase">
                              Comments
                            </span>
                            <textarea
                              rows={1.5}
                              value={inlineReportComment}
                              onChange={(e) =>
                                setInlineReportComment(e.target.value)
                              }
                              placeholder="Why do you suspect this is counterfeit?"
                              className="w-full bg-white border border-zinc-200 p-1 rounded text-[10px] outline-none text-zinc-850"
                            />
                          </div>

                          <div className="flex gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsExpandingReportForm(false)}
                              className="flex-1 py-1 bg-zinc-200 hover:bg-zinc-250 text-zinc-700 rounded font-semibold text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newReport = {
                                  id: "rep-" + Date.now(),
                                  medicineName: scannedMedicine
                                    ? scannedMedicine.name
                                    : "Unknown Counterfeit",
                                  batchNumber: scannedMedicine
                                    ? scannedMedicine.batchNumber
                                    : "N/A",
                                  companyName: scannedMedicine
                                    ? scannedMedicine.companyName
                                    : "Pending Forensic Analysis",
                                  location: {
                                    lat: gpsCoords.lat,
                                    lng: gpsCoords.lng,
                                    city: gpsCoords.city,
                                  },
                                  reportedAt: new Date().toISOString(),
                                  comment: `[Genuine Scan Discrepancy - Reason: ${inlineReason}] ${inlineReportComment || "No additional comments."}`,
                                  reporterPhone: simulatedRegisteredPhone,
                                  status: "PENDING",
                                };
                                onAddReport(newReport);
                                setInlineReportSubmitted(true);
                              }}
                              className="flex-1 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] cursor-pointer"
                            >
                              Send Alert
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsExpandingReportForm(true);
                            setInlineReportComment("");
                            setInlineReason("Tampered package");
                          }}
                          className="w-full text-center text-rose-600 hover:text-rose-700 hover:underline text-[10px] font-bold flex items-center justify-center gap-1 transition-all py-0.5 cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>
                            Suspect replica? File physical discrepancy report
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setScreen("HOME")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs font-sans shadow-sm"
                >
                  Return to Panel
                </button>
              </div>
            )}

            {/* RESPONSE RESULT: FAKE WARNING RED SHIELD SCREEN */}
            {screen === "RESULT_FAKE" && (
              <div
                className="flex-1 flex flex-col justify-between py-2 animate-fade-in"
                id="screen-user-counterfeit"
              >
                <div className="space-y-4">
                  {/* Red/Amber Warning Box */}
                  <div className="text-center bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 space-y-2 shadow-xs">
                    <div className="mx-auto bg-rose-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    {scanResultType === "FAKE_REUSED" ? (
                      <>
                        <h3 className="text-sm font-bold text-rose-800 tracking-tight">
                          Warning: Duplicate QR reuse
                        </h3>
                        <p className="text-[9px] text-rose-700 font-medium leading-relaxed">
                          This QR token was already REDEEMED on our ledger.
                          Possible duplicate reproduction copy!
                        </p>
                      </>
                    ) : scanResultType === "EXPIRED" ? (
                      <>
                        <h3 className="text-sm font-bold text-amber-800 tracking-tight">
                          Warning: Expired Medicine
                        </h3>
                        <p className="text-[9px] text-amber-700 font-medium leading-relaxed">
                          This medicine strip is authentic, but is past its
                          clinical expiration date.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-rose-800 tracking-tight">
                          Warning: Registry Match Fail
                        </h3>
                        <p className="text-[9px] text-rose-700 font-medium leading-relaxed">
                          This barcode token is unregistered. Severe
                          pharmaceutical clinical hazard.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Danger Details */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-2 text-xs shadow-3xs">
                    {scannedMedicine ? (
                      <>
                        <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                          <span className="text-[9px] font-mono text-rose-600 font-bold uppercase">
                            Identified Drug:
                          </span>
                          <span className="font-bold text-zinc-800">
                            {scannedMedicine.name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                          <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">
                            Batch ID:
                          </span>
                          <span className="font-mono text-zinc-750 font-semibold">
                            {scannedMedicine.batchNumber}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                          <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">
                            First Checked:
                          </span>
                          <span className="font-mono text-rose-600 font-bold">
                            {scannedMedicine.firstScannedAt
                              ? new Date(
                                  scannedMedicine.firstScannedAt,
                                ).toLocaleDateString()
                              : "A moment ago"}
                          </span>
                        </div>
                        <div className="text-[9px] text-zinc-550 leading-relaxed bg-zinc-50 p-2 border border-zinc-150 rounded">
                          Central system logged this physical pack as purchased.
                          Counterfeiters often photo-copy valid keys. Do not
                          consume.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                          <span className="text-[9px] font-mono text-rose-600 font-bold uppercase">
                            Scanned Code:
                          </span>
                          <span className="font-mono text-zinc-800 text-right truncate max-w-[140px] font-bold">
                            {selectedTokenInput}
                          </span>
                        </div>
                        <div className="text-[9px] text-rose-700 bg-rose-50/50 p-2.5 border border-rose-100 rounded leading-relaxed">
                          This code matches zero registered states. Consuming
                          this item presents clinical hazard risks. File a
                          complaint below.
                        </div>
                      </>
                    )}
                  </div>

                  {/* Complaint Option */}
                  {inlineReportSubmitted ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl space-y-1 animate-fade-in text-xs font-semibold">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        <span>Threat Report Dispatched</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-normal">
                        Your threat dossier has been saved on the secure
                        tamper-proof ledger. Watchtower notified.
                      </p>
                    </div>
                  ) : isExpandingReportForm ? (
                    <div className="bg-rose-50/50 border border-rose-200/80 p-3.5 rounded-xl space-y-3 animate-fade-in text-xs font-medium">
                      <div className="flex items-center gap-1.5 text-rose-700 font-bold border-b border-rose-100 pb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-550 -mt-0.5" />
                        <span>Submit Threat Report</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-500 block font-mono font-bold uppercase">
                          Classification
                        </span>
                        <select
                          value={inlineReason}
                          onChange={(e) => setInlineReason(e.target.value)}
                          className="w-full bg-white border border-rose-200 p-2 rounded-lg text-xs outline-none focus:border-rose-450 text-zinc-805 font-sans"
                        >
                          <option value="Duplicate QR reuse">
                            Duplicate QR Reuse Copycat Alert
                          </option>
                          <option value="Unregistered counterfeit">
                            Unregistered Counterfeit Barcode
                          </option>
                          <option value="Expired medicine">
                            Clinical Medicine Past Expiration Date
                          </option>
                          <option value="Tampered package">
                            Tampered Outer Packaging / Decals
                          </option>
                          <option value="Atypical pill shape / suspected replacement">
                            Atypical Pill Appearance / Form
                          </option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-500 block font-mono font-bold uppercase">
                          GPS BOUNDS PINNED
                        </span>
                        <div className="bg-white border border-zinc-150 p-2 rounded text-[10px] font-mono flex items-center justify-between text-zinc-650 select-none">
                          <span className="truncate max-w-[125px] font-bold">
                            {gpsCoords.city}
                          </span>
                          <span className="text-zinc-400">
                            [{gpsCoords.lat.toFixed(2)},{" "}
                            {gpsCoords.lng.toFixed(2)}]
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-500 block font-mono font-bold uppercase">
                          Comments
                        </span>
                        <textarea
                          rows={2}
                          value={inlineReportComment}
                          onChange={(e) =>
                            setInlineReportComment(e.target.value)
                          }
                          placeholder="Store name, packaging defects, pricing, etc..."
                          className="w-full bg-white border border-rose-200 p-2 rounded-lg text-xs outline-none focus:border-rose-450 text-zinc-850"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsExpandingReportForm(false)}
                          className="flex-1 py-1.5 bg-zinc-200 hover:bg-zinc-250 text-zinc-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newReport = {
                              id: "rep-" + Date.now(),
                              medicineName: scannedMedicine
                                ? scannedMedicine.name
                                : "Unknown Counterfeit: " +
                                  selectedTokenInput.substring(0, 10),
                              batchNumber: scannedMedicine
                                ? scannedMedicine.batchNumber
                                : "N/A",
                              companyName: scannedMedicine
                                ? scannedMedicine.companyName
                                : "Pending Forensic Analysis",
                              location: {
                                lat: gpsCoords.lat,
                                lng: gpsCoords.lng,
                                city: gpsCoords.city,
                              },
                              reportedAt: new Date().toISOString(),
                              comment: `[Inline Scan Threat Report - Reason: ${inlineReason}] ${inlineReportComment || "No additional details."}`,
                              reporterPhone: simulatedRegisteredPhone,
                              status: "PENDING",
                            };
                            onAddReport(newReport);
                            setInlineReportSubmitted(true);
                          }}
                          className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 font-bold" />
                          <span>Submit Report</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setIsExpandingReportForm(true);
                          setInlineReportComment("");
                        }}
                        className="w-full py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>File Instant Counterfeit Report</span>
                      </button>

                      <button
                        onClick={() => {
                          setReportMedicineName(
                            scannedMedicine
                              ? scannedMedicine.name
                              : "Suspicious Barcode Strip: " +
                                  selectedTokenInput.substring(0, 10),
                          );
                          setReportBatchNumber(
                            scannedMedicine
                              ? scannedMedicine.batchNumber
                              : "UNKNOWN",
                          );
                          setReportComment(
                            scanResultType === "FAKE_REUSED"
                              ? "Duplicate QR reuse detected. App indicated code already redeemeed."
                              : "Unregistered code flagged during purchase check.",
                          );
                          setScreen("REPORTS");
                        }}
                        className="w-full py-1.5 text-zinc-500 hover:text-rose-600 text-[10px] font-mono font-bold flex items-center justify-center gap-1 hover:underline transition-colors cursor-pointer"
                      >
                        <span>Open detailed complaint form &rarr;</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setScreen("HOME")}
                  className="w-full bg-zinc-850 hover:bg-zinc-800 text-slate-100 font-semibold py-2 rounded-xl text-xs font-sans mt-3"
                >
                  Return to Home
                </button>
              </div>
            )}

            {/* REPORT SUSPICIOUS PHARMA FORM SCREEN */}
            {screen === "REPORTS" && (
              <div
                className="space-y-4 animate-fade-in"
                id="screen-user-reports"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span className="text-[11px] font-mono font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> COMPLAINT GATEWAY
                  </span>
                  <button
                    onClick={() => setScreen("HOME")}
                    className="text-xs text-zinc-400 hover:text-zinc-600 font-bold"
                  >
                    Cancel
                  </button>
                </div>

                {reportSubmitted ? (
                  <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in">
                    <div className="mx-auto w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                    <h3 className="font-bold text-emerald-800 text-xs">
                      Security Report Dispatched
                    </h3>
                    <p className="text-[9px] text-zinc-600 leading-relaxed font-medium">
                      Incident logged in Cloud tracker. Handset GPS{" "}
                      <span className="font-mono text-zinc-800 font-bold">
                        [{gpsCoords.lat.toFixed(2)}, {gpsCoords.lng.toFixed(2)}]
                      </span>{" "}
                      pinned on WatchtowerCommand logs.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleReportSubmit}
                    className="space-y-3 text-xs text-zinc-800"
                  >
                    {/* SERVER RETRIEVED LOOKUP SEARCH AUTOFILL */}
                    <div className="space-y-1 relative">
                      <label className="text-[10px] text-zinc-500 block font-bold leading-none uppercase tracking-wide">
                        🔍 Lookup & Autofill from Server
                      </label>
                      <input
                        type="text"
                        placeholder="Search by brand name, batch#, or QR token..."
                        className="w-full bg-indigo-50/60 border border-indigo-100 p-2.5 rounded-lg outline-none focus:border-indigo-300 text-zinc-805 text-xs font-medium"
                        value={lookupSearchQuery}
                        onChange={(e) => setLookupSearchQuery(e.target.value)}
                      />
                      {lookupSearchQuery.trim() !== "" && (
                        <div className="absolute z-10 w-full bg-white border border-zinc-200 rounded-lg shadow-md max-h-40 overflow-y-auto mt-1 p-1 text-left">
                          {matchedMedicines.length > 0 ? (
                            matchedMedicines.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                className="w-full text-left p-2 hover:bg-zinc-50 rounded text-[11px] font-medium border-b border-zinc-100 last:border-0 flex justify-between items-center"
                                onClick={() => {
                                  setReportMedicineName(m.name || "");
                                  setReportBatchNumber(m.batchNumber || "");
                                  setLookupSearchQuery("");
                                }}
                              >
                                <div>
                                  <span className="font-bold text-zinc-800">{m.name}</span>
                                  <span className="text-[9px] text-zinc-500 ml-2 font-mono">[{m.batchNumber}]</span>
                                </div>
                                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                  Autofill
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-2 text-[10px] text-zinc-400 italic">
                              Not found on server - leave blank for manual entry.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 block font-bold leading-none uppercase tracking-wide">
                        Medicine Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Paracetamol Dolo"
                        className="w-full bg-white border border-zinc-200 p-2.5 rounded-lg outline-none focus:border-rose-300 text-zinc-800 text-xs font-medium"
                        value={reportMedicineName}
                        onChange={(e) => setReportMedicineName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 block font-bold leading-none uppercase tracking-wide">
                        Batch Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DOL-2026-774"
                        className="w-full bg-white border border-zinc-200 p-2.5 rounded-lg outline-none focus:border-rose-300 text-zinc-800 text-xs font-mono font-semibold"
                        value={reportBatchNumber}
                        onChange={(e) => setReportBatchNumber(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-zinc-500 block font-bold leading-none uppercase tracking-wide">
                          GPS Location
                        </label>
                        <button
                          type="button"
                          onClick={autofillUserLocation}
                          disabled={isCapturingGps}
                          className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 font-mono flex items-center gap-1"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${isCapturingGps ? "animate-spin" : ""}`} />
                          Sync Core GPS
                        </button>
                      </div>
                      <div className="bg-zinc-100 border border-zinc-200 p-2.5 rounded-lg text-[9px] font-mono text-zinc-700 flex items-center justify-between font-bold">
                        <span className="truncate max-w-[170px]">
                          {gpsCoords.city}
                        </span>
                        <span className="text-rose-600 font-sans font-bold">
                          [{gpsCoords.lat.toFixed(4)},{" "}
                          {gpsCoords.lng.toFixed(4)}]
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 block font-bold leading-none uppercase tracking-wide">
                        Report details
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Print inconsistencies or barcode read failures..."
                        className="w-full bg-white border border-zinc-200 p-2.5 rounded-lg outline-none focus:border-rose-300 text-zinc-800 text-xs font-medium"
                        value={reportComment}
                        onChange={(e) => setReportComment(e.target.value)}
                      />
                    </div>

                    {errorText && (
                      <p className="text-[10px] text-red-600 font-bold">
                        {errorText}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm font-sans"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit Forensics Data</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* SCAN LOGS HISTORY SCREEN */}
            {screen === "HISTORY" && (
              <div
                className="space-y-4 animate-fade-in"
                id="screen-user-history"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span className="text-[11px] font-mono font-bold text-indigo-600 flex items-center gap-1.5">
                    <History className="w-4 h-4" /> SCAN VERIFICATION LOG
                  </span>
                  <button
                    onClick={() => setScreen("HOME")}
                    className="text-xs text-zinc-400 hover:text-zinc-600 font-bold"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {userScans.length === 0 ? (
                    <p className="text-[10px] text-zinc-455 italic text-center py-8 font-sans">
                      No verification scans mapped to handset.
                    </p>
                  ) : (
                    userScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="p-2.5 bg-white rounded-lg border border-zinc-200 text-[10px] space-y-1.5 shadow-3xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-800 truncate max-w-[160px]">
                            {scan.medicineName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              scan.result === "GENUINE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            }`}
                          >
                            {scan.result === "GENUINE" ? "GENUINE" : "THREAT"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[8px] text-zinc-450 font-mono font-bold">
                          <span>Batch: {scan.batchNumber}</span>
                          <span>
                            {new Date(scan.scannedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-medium">
                          <MapPin className="w-2.5 h-2.5 text-rose-500" />
                          <span className="truncate">{scan.location.city}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Android Home Navigation Pill Bottom Bar */}
          <div className="bg-zinc-100 py-3 px-6 border-t border-zinc-200 flex justify-around items-center">
            <button
              onClick={() => {
                if (screen !== "LOGIN" && screen !== "LOGIN_OTP")
                  setScreen("HOME");
              }}
              className={`p-2 rounded-lg transition-colors ${screen === "HOME" ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600"}`}
            >
              <Smartphone className="w-5 h-5" />
            </button>
            <div className="w-24 h-1 bg-zinc-300 rounded-full" />
            <button
              onClick={() => {
                if (screen !== "LOGIN" && screen !== "LOGIN_OTP")
                  setScreen("HISTORY");
              }}
              className={`p-2 rounded-lg transition-colors ${screen === "HISTORY" ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600"}`}
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Description Instructions / College project Poster Style Info */}
      <div className="lg:col-span-7 space-y-6 lg:pl-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-zinc-200 pb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-zinc-800 text-sm">
                Consumer Android Simulator Console
              </h3>
              <p className="text-xs text-zinc-450">
                Validate physical medicine security checkpoints securely.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-zinc-650 leading-relaxed font-sans">
            <p>
              In practical deployment, patients capture the 2D matrix layout
              printed on tablet strips. This console maps scan requests to
              simulate exact cloud ledger synchronization outcomes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 font-sans space-y-1 shadow-3xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block font-mono">
                  Scenario A: Genuine
                </span>
                <p className="text-[10px] text-zinc-500 leading-snug">
                  Select{" "}
                  <span className="text-zinc-800 font-semibold font-mono">
                    Amoxicillin
                  </span>
                  . Input pin verification code{" "}
                  <span className="font-semibold text-zinc-800">4321</span>.
                  Result verifies registration status safely.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 font-sans space-y-1 shadow-3xs">
                <span className="text-[10px] font-bold text-rose-700 uppercase block font-mono">
                  Scenario B: Re-Used Clone
                </span>
                <p className="text-[10px] text-zinc-500 leading-snug">
                  Select{" "}
                  <span className="text-zinc-800 font-semibold font-mono">
                    Paracetamol
                  </span>
                  . Highlights copycat duplication threats, noting code was
                  checked by another handset zone prior.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 font-sans space-y-1 shadow-3xs">
                <span className="text-[10px] font-bold text-amber-700 uppercase block font-mono">
                  Scenario C: Expired
                </span>
                <p className="text-[10px] text-zinc-500 leading-snug">
                  Select{" "}
                  <span className="text-zinc-800 font-semibold font-mono">
                    Atorvastatin
                  </span>
                  . Evaluates valid signature states but immediately checks and
                  reports clinical expiration dates.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 font-sans space-y-1 shadow-3xs">
                <span className="text-[10px] font-bold text-red-700 uppercase block font-mono">
                  Scenario D: Malicious QR
                </span>
                <p className="text-[10px] text-zinc-500 leading-snug">
                  Select{" "}
                  <span className="text-zinc-800 font-semibold font-mono">
                    Counterfeit Clone Token
                  </span>
                  . Rejects the lookup instantly because the cryptographic hash
                  was never registered.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-50/50 border border-indigo-150 rounded-xl flex items-start gap-2.5 shadow-3xs">
              <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-snug">
                <span className="text-[11px] font-bold text-indigo-700 block font-sans">
                  DUAL-FACTOR REDEMPTION THEORY
                </span>
                <p className="text-[10px] text-zinc-500 font-medium">
                  OTP constraints protect buyers. If a counterfeiter mirrors a
                  genuine code on 1,000 copycat boxes, the validation is burnt
                  instantly on the ledger on its very first check, locking up
                  future copycats.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center text-[10px] font-mono border-t border-zinc-200/60 text-zinc-400">
            <span>Handset Architecture: Android API 34</span>
            <button
              onClick={onBackToPortal}
              className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
            >
              ← System Portal Hub
            </button>
          </div>
        </div>

        {/* Dynamic diagram mapping for Active view */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-xs">
          <p className="text-xs font-mono font-bold text-zinc-500 mb-2">
            TELEMETRY DECODE STATUS FLOW
          </p>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-zinc-400 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
            <span className="text-zinc-600 px-1 py-0.5 rounded bg-white border border-zinc-250">
              Scan Attempt
            </span>
            <span>→</span>
            <span
              className={`px-1 py-0.5 rounded border font-semibold ${screen === "SCAN_OTP" ? "text-indigo-600 bg-indigo-50 border-indigo-200" : "bg-white border-zinc-250"}`}
            >
              Check Receipt OTP
            </span>
            <span>→</span>
            <span
              className={`px-1 py-0.5 rounded border font-semibold ${screen === "RESULT_GENUINE" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : screen === "RESULT_FAKE" ? "text-rose-600 bg-rose-50 border-rose-200" : "bg-white border-zinc-250"}`}
            >
              Commit Burn Token
            </span>
            <span>→</span>
            <span
              className={`px-1 py-0.5 rounded border font-semibold ${screen === "REPORTS" ? "text-rose-600 bg-rose-50 border-rose-200" : "bg-white border-zinc-250"}`}
            >
              Log Threat Map
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
