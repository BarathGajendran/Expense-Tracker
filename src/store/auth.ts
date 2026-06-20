import { create } from "zustand";
import type { User } from "@/lib/types";
import { authService } from "@/services/auth";
import { useFinance } from "./finance";
import { isFirebaseEnabled, auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface AuthState {
  user: User | null;
  loading: boolean;
  init: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  setUser: (u: User | null) => void;
}

let isListenerSet = false;

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  init: () => {
    if (isFirebaseEnabled && auth && db) {
      if (isListenerSet) return;
      isListenerSet = true;
      
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            const userDoc = await getDoc(doc(db, "users", fbUser.uid));
            let name = fbUser.displayName || "User";
            let currency = "INR";
            if (userDoc.exists()) {
              const data = userDoc.data();
              name = data.name || name;
              currency = data.currency || currency;
            }
            const u: User = { id: fbUser.uid, name, email: fbUser.email!, currency };
            localStorage.setItem("smartspend.session", JSON.stringify(u));
            await useFinance.getState().loadUser(u.id);
            set({ user: u, loading: false });
          } catch (e) {
            console.error("Firebase auth sync error:", e);
            set({ loading: false });
          }
        } else {
          localStorage.removeItem("smartspend.session");
          useFinance.getState().clearUser();
          set({ user: null, loading: false });
        }
      });
      return;
    }

    const u = authService.getSession();
    if (u) {
      void useFinance.getState().loadUser(u.id);
    } else {
      useFinance.getState().clearUser();
    }
    set({ user: u, loading: false });
  },
  login: async (email, password) => {
    const u = await authService.login(email, password);
    await useFinance.getState().loadUser(u.id);
    set({ user: u });
  },
  signup: async (name, email, password) => {
    const u = await authService.signup(name, email, password);
    await useFinance.getState().loadUser(u.id, true); // force clean slate / reset on first-time signup
    set({ user: u });
  },
  loginWithGoogle: async () => {
    const u = await authService.loginWithGoogle();
    await useFinance.getState().loadUser(u.id);
    set({ user: u });
  },
  logout: async () => {
    await authService.logout();
    useFinance.getState().clearUser();
    set({ user: null });
  },
  setUser: (u) => {
    if (u) {
      void useFinance.getState().loadUser(u.id);
    } else {
      useFinance.getState().clearUser();
    }
    set({ user: u });
  },
}));
