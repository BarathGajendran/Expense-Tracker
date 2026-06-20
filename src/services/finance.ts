import type { Budget, Expense, Income } from "@/lib/types";
import { isFirebaseEnabled, db, cleanData } from "@/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from "firebase/firestore";

export const financeService = {
  // --- EXPENSES ---
  async listExpenses(userId: string): Promise<Expense[]> {
    if (isFirebaseEnabled && db) {
      const q = query(collection(db, "expenses"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const items: Expense[] = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          amount: data.amount,
          category: data.category,
          date: data.date,
          paymentMethod: data.paymentMethod,
          description: data.description || ""
        });
      });
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return [];
  },

  async createExpense(e: Omit<Expense, "id">, userId: string): Promise<Expense> {
    if (isFirebaseEnabled && db) {
      const data = cleanData({
        ...e,
        userId,
        createdAt: new Date().toISOString()
      });
      const docRef = await addDoc(collection(db, "expenses"), data);
      return { ...e, id: docRef.id };
    }
    throw new Error("Local fallback handles mutations internally in Zustand store.");
  },

  async updateExpense(id: string, patch: Partial<Expense>): Promise<void> {
    if (isFirebaseEnabled && db) {
      await updateDoc(doc(db, "expenses", id), cleanData(patch));
    }
  },

  async deleteExpense(id: string): Promise<void> {
    if (isFirebaseEnabled && db) {
      await deleteDoc(doc(db, "expenses", id));
    }
  },

  // --- INCOMES ---
  async listIncomes(userId: string): Promise<Income[]> {
    if (isFirebaseEnabled && db) {
      const q = query(collection(db, "incomes"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const items: Income[] = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          amount: data.amount,
          source: data.source,
          date: data.date
        });
      });
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return [];
  },

  async createIncome(i: Omit<Income, "id">, userId: string): Promise<Income> {
    if (isFirebaseEnabled && db) {
      const data = cleanData({
        ...i,
        userId,
        createdAt: new Date().toISOString()
      });
      const docRef = await addDoc(collection(db, "incomes"), data);
      return { ...i, id: docRef.id };
    }
    throw new Error("Local fallback handles mutations internally in Zustand store.");
  },

  async updateIncome(id: string, patch: Partial<Income>): Promise<void> {
    if (isFirebaseEnabled && db) {
      await updateDoc(doc(db, "incomes", id), cleanData(patch));
    }
  },

  async deleteIncome(id: string): Promise<void> {
    if (isFirebaseEnabled && db) {
      await deleteDoc(doc(db, "incomes", id));
    }
  },

  // --- BUDGETS ---
  async getBudget(userId: string): Promise<Budget | null> {
    if (isFirebaseEnabled && db) {
      const d = await getDoc(doc(db, "budgets", userId));
      if (d.exists()) {
        return d.data() as Budget;
      }
    }
    return null;
  },

  async updateBudget(userId: string, b: Budget): Promise<void> {
    if (isFirebaseEnabled && db) {
      await setDoc(doc(db, "budgets", userId), cleanData(b));
    }
  }
};

export const aiService = {
  async getInsights(): Promise<{ tip: string; severity: "info" | "warn" | "success" }[]> { return []; },
  async getSpendingScore(): Promise<number> { return 0; },
};