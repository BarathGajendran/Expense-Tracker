import type { User } from "@/lib/types";
import { isFirebaseEnabled, auth, db, cleanData } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const USERS_KEY = "smartspend.users";
const SESSION_KEY = "smartspend.session";

interface StoredUser extends User { password?: string; }

function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}
function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const authService = {
  async login(email: string, password: string): Promise<User> {
    if (isFirebaseEnabled && auth && db) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      const userDoc = await getDoc(doc(db, "users", fbUser.uid));
      if (userDoc.exists()) {
        const u = userDoc.data() as User;
        const safe = { id: fbUser.uid, name: u.name || fbUser.displayName || "User", email: fbUser.email!, currency: u.currency || "INR" };
        localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
        return safe;
      } else {
        const safe = { id: fbUser.uid, name: fbUser.displayName || "User", email: fbUser.email!, currency: "INR" };
        await setDoc(doc(db, "users", fbUser.uid), safe);
        localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
        return safe;
      }
    }

    await delay();
    const users = loadUsers();
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.password !== password) throw new Error("Invalid email or password");
    const { password: _p, ...safe } = u;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    return safe;
  },

  async signup(name: string, email: string, password: string): Promise<User> {
    if (isFirebaseEnabled && auth && db) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      await firebaseUpdateProfile(fbUser, { displayName: name });
      
      const safe: User = { id: fbUser.uid, name, email: fbUser.email!, currency: "INR" };
      await setDoc(doc(db, "users", fbUser.uid), safe);
      localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
      return safe;
    }

    await delay();
    const users = loadUsers();
    if (users.some((x) => x.email.toLowerCase() === email.toLowerCase()))
      throw new Error("An account with this email already exists");
    const user: StoredUser = { id: crypto.randomUUID(), name, email, password, currency: "INR" };
    users.push(user); saveUsers(users);
    const { password: _p, ...safe } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    return safe;
  },

  async loginWithGoogle(): Promise<User> {
    if (isFirebaseEnabled && auth && db) {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      
      const userDoc = await getDoc(doc(db, "users", fbUser.uid));
      if (userDoc.exists()) {
        const u = userDoc.data() as User;
        const safe = { id: fbUser.uid, name: u.name || fbUser.displayName || "User", email: fbUser.email!, currency: u.currency || "INR" };
        localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
        return safe;
      } else {
        const safe = { id: fbUser.uid, name: fbUser.displayName || "User", email: fbUser.email!, currency: "INR" };
        await setDoc(doc(db, "users", fbUser.uid), safe);
        localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
        return safe;
      }
    }

    await delay(800);
    const user: User = { id: "google-demo", name: "Aarav Sharma", email: "demo@smartspend.ai", currency: "INR" };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  async forgotPassword(email: string) {
    if (isFirebaseEnabled && auth) {
      await sendPasswordResetEmail(auth, email);
      return { sent: true };
    }
    await delay();
    if (!email) throw new Error("Email required");
    return { sent: true };
  },

  async resetPasswordDirectly(email: string, newPw: string) {
    if (isFirebaseEnabled) {
      throw new Error("Direct password reset is disabled in Cloud Mode. Please check your email inbox for the Firebase reset link.");
    }
    await delay();
    const users = loadUsers();
    const idx = users.findIndex((x) => x.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) throw new Error("No user found with this email");
    users[idx].password = newPw;
    saveUsers(users);
    return { success: true };
  },

  async logout() {
    if (isFirebaseEnabled && auth) {
      await signOut(auth);
    }
    localStorage.removeItem(SESSION_KEY);
  },

  getSession(): User | null {
    if (typeof window === "undefined") return null;
    try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },

  async updateProfile(patch: Partial<User>): Promise<User> {
    const current = this.getSession();
    if (!current) throw new Error("Not authenticated");
    const updated = { ...current, ...patch };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));

    if (isFirebaseEnabled && db) {
      await updateDoc(doc(db, "users", current.id), cleanData(patch));
    } else {
      const users = loadUsers();
      const idx = users.findIndex((u) => u.id === current.id);
      if (idx >= 0) { users[idx] = { ...users[idx], ...patch }; saveUsers(users); }
    }
    return updated;
  },
};
