import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where 
} from "firebase/firestore";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Firestore from config file
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
  };
  console.error("Firestore Error Trace: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to query medicine by token
async function findMedicineByToken(token) {
  const pathForQuery = "medicines";
  try {
    const q = query(collection(db, pathForQuery), where("qrCodeToken", "==", token));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    let medicine = null;
    snap.forEach((d) => {
      medicine = { id: d.id, ...d.data() };
    });
    return medicine;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathForQuery);
  }
}

// Helper to query latest OTP matching a phone/email and type (in-memory sort to prevent custom index errors)
async function getLatestOtp(emailOrPhone, type) {
  const pathForQuery = "otps";
  try {
    const q = query(collection(db, pathForQuery), where("emailOrPhone", "==", emailOrPhone));
    const snap = await getDocs(q);
    const items = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
    });
    // Sort descending by createdAt in memory
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items.find((itm) => itm.type === type);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathForQuery);
  }
}

// Nodemailer transporter helper
function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (!user || !pass) {
    console.warn("[Nodemailer] Warning: No SMTP credentials set in environment variables. Falling back to console simulation.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    family:4,
    auth: {
      user,
      pass,
    },
  });
}

// Nodemailer sender logic
async function sendEmailOtp(to, otp, type) {
  const purpose = type === "SCAN" ? "redemption verification" : "login authentication";
  const msgContent = `[SecureRx] Your real-time medicine authentication code for ${purpose} is: ${otp}. Do not share this under any circumstances.`;
  
  const transporter = getMailTransporter();
  const fromAddress = process.env.SMTP_FROM || "no-reply@pharmaguard.com";

  if (!transporter) {
    console.log(`[Email Simulated Dispatch] To: ${to} | Content: ${msgContent}`);
    return {
      success: true,
      provider: "email_simulation",
      message: `Prescription OTP generated: ${otp} (Logged to server console due to missing SMTP credentials).`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"PharmaGuard Secure" <${fromAddress}>`,
      to,
      subject: `[SecureRx] Security OTP for Medicine ${type === "SCAN" ? "Redemption Verification" : "Auth"}`,
      text: msgContent,
      html: `
        <div style="font-family: sans-serif; padding: 25px; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto; background-color: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px; font-weight: bold; border-bottom: 2px solid #eef2f6; padding-bottom: 12px;">PharmaGuard Secure</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-top: 16px;">A medicine validation scan or authentication attempt has been initialized. Please use the following cryptographic OTP to proceed:</p>
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 28px; font-weight: 800; color: #e11d48; letter-spacing: 4px;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 11px; line-height: 1.4; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 20px;">This security code is extremely sensitive and is valid for exactly 10 minutes. <strong>NEVER</strong> share this code with anyone, including representatives claiming to be from our health networks.</p>
        </div>
      `,
    });
    console.log(`[Email Dispatched via Nodemailer] To: ${to} | MessageId: ${info.messageId}`);
    return {
      success: true,
      provider: isEmailServerSimulation() ? "email_simulation" : "nodemailer",
      message: `Prescription OTP successfully transmitted to ${to}`,
    };
  } catch (err) {
    console.error("[Nodemailer Transmission Failed]", err);
    return {
      success: false,
      error: `Nodemailer failed: ${err.message}`,
    };
  }
}

function isEmailServerSimulation() {
  return !process.env.SMTP_USER || !process.env.SMTP_PASS;
}

// Reusable Multi-Gateway OTP Dispatcher Logic
async function dispatchOtpSms(to, otp, type) {
  const cleanTo = to.trim();
  const isEmail = cleanTo.includes("@");
  const currentEnv = (process.env.NODE_ENVIRONMENT || "development").toLowerCase();
  
  console.log(`[OTP Engine] Dispatching for target: ${cleanTo} (Is Email?: ${isEmail}) [Environment: ${currentEnv}]`);

  if (isEmail) {
    return await sendEmailOtp(cleanTo, otp, type);
  } else {
    // If phone number
    if (currentEnv === "deployment") {
      // In production we will use twilio api
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioSid || !twilioToken || !twilioFrom) {
        const errMsg = "Twilio credentials missing in production environment. Unable to send live SMS.";
        console.error(`[Twilio Error] ${errMsg}`);
        return {
          success: false,
          error: errMsg,
        };
      }

      try {
        const purpose = type === "SCAN" ? "redemption verify" : "secure entry";
        const msgContent = `[SecureRx] Your real-time medicine authentication code for ${purpose} is: ${otp}. Do not share this under any circumstances.`;
        
        const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
        const params = new URLSearchParams();
       // Normalize phone number to E.164 format
const smsTarget = cleanTo.startsWith("+")
  ? cleanTo
  : `+91${cleanTo}`;

params.append("To", smsTarget);
params.append("From", twilioFrom);
params.append("Body", msgContent);

console.log("SID:", twilioSid);
console.log("From:", twilioFrom);
console.log("Original To:", cleanTo);
console.log("Normalized To:", smsTarget);
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${basicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          }
        );

        const twilioData = await twilioRes.json();
        if (twilioRes.ok) {
          console.log(`[Twilio Live SMS Sent] OTP ${otp} to ${cleanTo} successfully. ID:`, twilioData.sid);
          return { success: true, provider: "twilio", sid: twilioData.sid };
        } else {
          console.error("[Twilio Live SMS Failed]", twilioData);
          return {
            success: false,
            error: twilioData.message || "Twilio gateway rejected transmission.",
          };
        }
      } catch (err) {
        console.error("[Twilio Production Connection Failed]", err);
        return {
          success: false,
          error: `Twilio network transmission failure: ${err.message}`,
        };
      }
    } else {
      // If its development we will use present otp showing on user screen
      console.log(`[Dev Sandbox Phone] Simulated phone SMS verification code for ${cleanTo} is: ${otp}`);
      return {
        success: true,
        provider: "dev_sandbox",
        message: "SMS sandboxed: showing code directly on client screen",
      };
    }
  }
}

// Legacy API route: Keep for compatibility
app.post("/api/send-otp", async (req, res) => {
  const { to, otp, type } = req.body;
  if (!to || !otp) {
    return res.status(400).json({ success: false, error: "Missing 'to' or 'otp' parameter." });
  }
  const result = await dispatchOtpSms(to, otp, type);
  return res.json(result);
});

// 1. Passwordless Register/Login request OTP secure server endpoint
app.post("/api/auth/request-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: "Credentials (phone/email) are mandatory." });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const otpId = "otp-" + Date.now();

  try {
    // Persist OTP record in Firestore securely on server side
    await setDoc(doc(db, "otps", otpId), {
      id: otpId,
      emailOrPhone: phone,
      otpCode: code,
      createdAt: new Date().toISOString(),
      expiredAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      type: "LOGIN",
    });

    // Send the code through our dispatchers
    const dispatchResult = await dispatchOtpSms(phone, code, "LOGIN");

    const isDev = (process.env.NODE_ENVIRONMENT || "development").toLowerCase() === "development";

    return res.json({
      success: true,
      sessionId: otpId,
      otp: isDev ? code : "", // Only render to screen in development sandbox
      provider: dispatchResult.provider || "sandbox_mode",
      error: dispatchResult.error || null,
    });
  } catch (err) {
    console.error("Firestore security session write failed:", err);
    return res.status(500).json({ success: false, error: "Database transaction failed on server.", details: err.message });
  }
});

// 2. Validate Passwordless Login OTP code secure server endpoint
app.post("/api/auth/verify-otp", async (req, res) => {
  const { phone, otp, sessionId } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: "Both phone/email and validation code are required." });
  }

  const isDev = (process.env.NODE_ENVIRONMENT || "development").toLowerCase() === "development";

  // Support sandbox test codes in development only
  if (isDev && (otp === "1234" || otp === "9999")) {
    return res.json({ success: true, sandbox: true });
  }

  try {
    const latestDoc = await getLatestOtp(phone, "LOGIN");
    if (!latestDoc) {
      return res.status(400).json({ success: false, error: "No active verification sessions found for this identity." });
    }

    if (latestDoc.otpCode !== otp) {
      return res.status(400).json({ success: false, error: "Incorrect authentication passcode." });
    }

    const isExpired = new Date() > new Date(latestDoc.expiredAt);
    if (isExpired) {
      return res.status(400).json({ success: false, error: "Authentication passcode has expired (10 min limit)." });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("OTP verification error:", err);
    return res.status(500).json({ success: false, error: "Server failed to verify OTP session." });
  }
});

// 3. Secure scan check & 4-digit code dispatch endpoint
app.post("/api/scan/verify", async (req, res) => {
  const { scannedToken, userPhone, location } = req.body;
  if (!scannedToken || !userPhone) {
    return res.status(400).json({ success: false, error: "Scanned QR token and phone identification are required." });
  }

  try {
    const foundMed = await findMedicineByToken(scannedToken);
    
    // Determine target scans outcome
    let calculatedResult = "FAKE_UNREGISTERED";
    if (!foundMed) {
      calculatedResult = "FAKE_UNREGISTERED";
    } else {
      const expirationDate = new Date(foundMed.expiryDate);
      const currentDate = new Date(); // Dynamic compare
      
      if (expirationDate <= currentDate) {
        calculatedResult = "EXPIRED";
      } else if (foundMed.currentScanCount >= foundMed.maxScansAllowed) {
        calculatedResult = "FAKE_REUSED";
      } else {
        calculatedResult = "GENUINE";
      }
    }

    // Generate scan code
    const scanCode = Math.floor(1000 + Math.random() * 9000).toString();
    const otpId = "otp-scan-" + Date.now();

    // Persist session to Cloud Firestore securely
    await setDoc(doc(db, "otps", otpId), {
      id: otpId,
      emailOrPhone: userPhone,
      otpCode: scanCode,
      createdAt: new Date().toISOString(),
      expiredAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      type: "SCAN",
      scannedToken,
      calculatedResult,
    });

    // Send scan code via gateway
    const dispatchResult = await dispatchOtpSms(userPhone, scanCode, "SCAN");

    const isDev = (process.env.NODE_ENVIRONMENT || "development").toLowerCase() === "development";

    return res.json({
      success: true,
      sessionId: otpId,
      otp: isDev ? scanCode : "", // Only show on user screen in development sandbox
      calculatedResult,
      medicine: foundMed,
      provider: dispatchResult.provider || "sandbox_mode",
      error: dispatchResult.error || null,
    });
  } catch (err) {
    console.error("Scanning validation setup error:", err);
    return res.status(500).json({ success: false, error: "Server scanning system error." });
  }
});

// 4. Confirm scan verification with OTP and write secure immutable transaction ledger
app.post("/api/scan/confirm", async (req, res) => {
  const { sessionId, otp, scannedToken, userPhone, location } = req.body;
  if (!sessionId || !otp || !scannedToken || !userPhone) {
    return res.status(400).json({ success: false, error: "Missing required parameters for scan confirmation." });
  }

  try {
    // 1. Verify OTP code
    let valid = false;
    let calculatedResult = "FAKE_UNREGISTERED";

    const isDev = (process.env.NODE_ENVIRONMENT || "development").toLowerCase() === "development";

    if (isDev && (otp === "4321" || otp === "8888")) {
      valid = true;
      // Get state from token
      const foundMed = await findMedicineByToken(scannedToken);
      if (!foundMed) {
        calculatedResult = "FAKE_UNREGISTERED";
      } else {
        const expirationDate = new Date(foundMed.expiryDate);
        if (expirationDate <= new Date()) {
          calculatedResult = "EXPIRED";
        } else if (foundMed.currentScanCount >= foundMed.maxScansAllowed) {
          calculatedResult = "FAKE_REUSED";
        } else {
          calculatedResult = "GENUINE";
        }
      }
    } else {
      const latestDoc = await getLatestOtp(userPhone, "SCAN");
      if (latestDoc && latestDoc.otpCode === otp && latestDoc.scannedToken === scannedToken) {
        valid = true;
        calculatedResult = latestDoc.calculatedResult;
      }
    }

    if (!valid) {
      return res.status(400).json({ success: false, error: "Incorrect scan redemption passcode." });
    }

    // 2. Fetch the medicine token
    const foundMed = await findMedicineByToken(scannedToken);
    const scanId = "scan-" + Date.now();

    const newScan = {
      id: scanId,
      medicineId: foundMed ? foundMed.id : null,
      scannedToken,
      medicineName: foundMed ? foundMed.name : "Unknown Counterfeit Pill",
      batchNumber: foundMed ? foundMed.batchNumber : "N/A",
      scannedAt: new Date().toISOString(),
      userPhone,
      location: {
        lat: location?.lat || 19.076,
        lng: location?.lng || 72.8777,
        city: location?.city || "Mumbai Central, India",
      },
      result: calculatedResult,
      verifiedWithOtp: true,
    };

    // 3. Write permanent scan record to immutable collection
    await setDoc(doc(db, "scans", scanId), newScan);

    // 4. Update medicine scan counter locked in Firestore
    if (foundMed && calculatedResult === "GENUINE") {
      const medRef = doc(db, "medicines", foundMed.id);
      const updateData = {
        currentScanCount: foundMed.currentScanCount + 1,
      };
      if (!foundMed.firstScannedAt) {
        updateData.firstScannedAt = new Date().toISOString();
      }
      await updateDoc(medRef, updateData);
    }

    return res.json({
      success: true,
      scan: newScan,
      result: calculatedResult,
    });
  } catch (err) {
    console.error("Scan confirmation write error:", err);
    return res.status(500).json({ success: false, error: "Server failed to log permanent scan verification." });
  }
});

async function startServer() {
  // Vite developer middleware / distribution context loading
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack dev server running on http://localhost:${PORT}`);
  });
}

startServer();
