import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Set to true since configuration is hardcoded directly below
export const isFirebaseEnabled = typeof window !== "undefined";

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseEnabled) {
  try {
    const firebaseConfig = {
      apiKey: "AIzaSyCpp7g8QJ1C-cj2TR-Bd_BAbV-V9uOBiRU",
      authDomain: "smartspend-f7ac5.firebaseapp.com",
      projectId: "smartspend-f7ac5",
      storageBucket: "smartspend-f7ac5.firebasestorage.app",
      messagingSenderId: "646676697536",
      appId: "1:646676697536:web:93fde93a0d70ce22b53825"
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    console.log("Firebase initialized successfully in Cloud mode.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;

export function cleanData(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(cleanData);
  
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = cleanData(val);
    }
  });
  return cleaned;
}
