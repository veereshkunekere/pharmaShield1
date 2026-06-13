import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDocs,
  collection,
  query,
  limit,
  writeBatch,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  INITIAL_MEDICINES,
  INITIAL_SCANS,
  INITIAL_REPORTS,
  INITIAL_MANUFACTURERS,
  INITIAL_ALERTS,
} from "../types";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore using the unique project Database ID key
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Firestore Error logging definitions
export let OperationType = /*#__PURE__*/ (function (OperationType) {
  OperationType["CREATE"] = "create";
  OperationType["UPDATE"] = "update";
  OperationType["DELETE"] = "delete";
  OperationType["LIST"] = "list";
  OperationType["GET"] = "get";
  OperationType["WRITE"] = "write";
  return OperationType;
})({});

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
    },
    operationType,
    path,
  };
  console.error("Firestore Error Triggerred: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check database connection live on mount
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "system", "connection"));
    console.log("Firebase connection response successful.");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error("Please check your active Firebase offline status.");
    }
  }
}

// Seeder logic to populate the cloud collections if empty
export async function seedInitialDataIfRequired() {
  try {
    const medQuery = await getDocs(
      query(collection(db, "medicines"), limit(1)),
    );
    if (medQuery.empty) {
      console.log("Seeding default data records to Cloud Firestore...");
      const batch = writeBatch(db);
      INITIAL_MEDICINES.forEach((med) => {
        const docRef = doc(db, "medicines", med.id);
        batch.set(docRef, med);
      });

      INITIAL_SCANS.forEach((scan) => {
        const docRef = doc(db, "scans", scan.id);
        batch.set(docRef, scan);
      });

      INITIAL_REPORTS.forEach((rep) => {
        const docRef = doc(db, "reports", rep.id);
        batch.set(docRef, rep);
      });

      INITIAL_MANUFACTURERS.forEach((mfg) => {
        const docRef = doc(db, "manufacturers", mfg.id);
        batch.set(docRef, mfg);
      });

      INITIAL_ALERTS.forEach((al) => {
        const docRef = doc(db, "alerts", al.id);
        batch.set(docRef, al);
      });

      await batch.commit();
      console.log(
        "Database seeded successfully with default pharmaceutical items, manufacturers, and alerts.",
      );
    }
  } catch (err) {
    console.warn(
      "Auto-seeding skipped or blocked by security policy rules:",
      err,
    );
  }
}
