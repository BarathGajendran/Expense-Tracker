import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Budget, Category, Expense, Income } from "@/lib/types";
import { financeService } from "@/services/finance";
import { isFirebaseEnabled } from "@/lib/firebase";
import { toast } from "sonner";

interface UserFinanceData {
  expenses: Expense[];
  incomes: Income[];
  budget: Budget;
}

interface FinanceState {
  byUser: Record<string, UserFinanceData>;
  activeUserId: string | null;
  expenses: Expense[];
  incomes: Income[];
  budget: Budget;
  addExpense: (e: Omit<Expense, "id">) => Promise<void>;
  updateExpense: (id: string, patch: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addIncome: (i: Omit<Income, "id">) => Promise<void>;
  updateIncome: (id: string, patch: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  setMonthlyBudget: (amount: number) => Promise<void>;
  setCategoryBudget: (c: Category, amount: number) => Promise<void>;
  seedDemo: () => Promise<void>;
  loadUser: (userId: string, forceClean?: boolean) => Promise<void>;
  clearUser: () => void;
}

const tMinus = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString(); };

const demoExpenses: Expense[] = [
  { id: "e1", amount: 850, category: "Food", date: tMinus(1), paymentMethod: "UPI", description: "Dinner at Punjab Grill" },
  { id: "e2", amount: 320, category: "Transport", date: tMinus(2), paymentMethod: "UPI", description: "Ola & auto rides" },
  { id: "e3", amount: 4499, category: "Shopping", date: tMinus(3), paymentMethod: "Card", description: "Sneakers on Myntra" },
  { id: "e4", amount: 2200, category: "Entertainment", date: tMinus(5), paymentMethod: "Card", description: "PVR movie + dinner" },
  { id: "e5", amount: 3280, category: "Bills", date: tMinus(8), paymentMethod: "Bank Transfer", description: "BESCOM electricity" },
  { id: "e6", amount: 480, category: "Healthcare", date: tMinus(11), paymentMethod: "UPI", description: "Apollo Pharmacy" },
  { id: "e7", amount: 1999, category: "Education", date: tMinus(14), paymentMethod: "Card", description: "Udemy course" },
  { id: "e8", amount: 1250, category: "Food", date: tMinus(16), paymentMethod: "UPI", description: "BigBasket groceries" },
  { id: "e9", amount: 1100, category: "Food", date: tMinus(20), paymentMethod: "Card", description: "Sunday brunch" },
  { id: "e10", amount: 250, category: "Transport", date: tMinus(22), paymentMethod: "UPI", description: "Metro recharge" },
];
const demoIncomes: Income[] = [
  { id: "i1", source: "Salary", amount: 85000, date: tMinus(3) },
  { id: "i2", source: "Freelance", amount: 22000, date: tMinus(12) },
];

const updateUserData = (s: FinanceState, patch: Partial<UserFinanceData>) => {
  if (!s.activeUserId) return {};
  const currentData = s.byUser[s.activeUserId] || { expenses: [], incomes: [], budget: { monthly: 0, categories: {} } };
  return {
    byUser: {
      ...s.byUser,
      [s.activeUserId]: {
        ...currentData,
        ...patch,
      },
    },
  };
};

export const useFinance = create<FinanceState>()(
  persist(
    (set) => ({
      byUser: {},
      activeUserId: null,
      expenses: [],
      incomes: [],
      budget: { monthly: 0, categories: {} },
      addExpense: async (e) => {
        const activeUserId = useFinance.getState().activeUserId;
        if (!activeUserId) return;
        
        let newExpense: Expense;
        if (isFirebaseEnabled) {
          try {
            newExpense = await financeService.createExpense(e, activeUserId);
          } catch (err: any) {
            console.error("Firebase write error for addExpense:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Saved locally.`);
            newExpense = { ...e, id: crypto.randomUUID() };
          }
        } else {
          newExpense = { ...e, id: crypto.randomUUID() };
        }

        set((s) => {
          const expenses = [newExpense, ...s.expenses];
          return { expenses, ...updateUserData(s, { expenses }) };
        });
      },
      updateExpense: async (id, patch) => {
        if (isFirebaseEnabled) {
          try {
            await financeService.updateExpense(id, patch);
          } catch (err: any) {
            console.error("Firebase write error for updateExpense:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Updated locally.`);
          }
        }
        set((s) => {
          const expenses = s.expenses.map((x) => (x.id === id ? { ...x, ...patch } : x));
          return { expenses, ...updateUserData(s, { expenses }) };
        });
      },
      deleteExpense: async (id) => {
        if (isFirebaseEnabled) {
          try {
            await financeService.deleteExpense(id);
          } catch (err: any) {
            console.error("Firebase write error for deleteExpense:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Deleted locally.`);
          }
        }
        set((s) => {
          const expenses = s.expenses.filter((x) => x.id !== id);
          return { expenses, ...updateUserData(s, { expenses }) };
        });
      },
      addIncome: async (i) => {
        const activeUserId = useFinance.getState().activeUserId;
        if (!activeUserId) return;
        
        let newIncome: Income;
        if (isFirebaseEnabled) {
          try {
            newIncome = await financeService.createIncome(i, activeUserId);
          } catch (err: any) {
            console.error("Firebase write error for addIncome:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Saved locally.`);
            newIncome = { ...i, id: crypto.randomUUID() };
          }
        } else {
          newIncome = { ...i, id: crypto.randomUUID() };
        }

        set((s) => {
          const incomes = [newIncome, ...s.incomes];
          return { incomes, ...updateUserData(s, { incomes }) };
        });
      },
      updateIncome: async (id, patch) => {
        if (isFirebaseEnabled) {
          try {
            await financeService.updateIncome(id, patch);
          } catch (err: any) {
            console.error("Firebase write error for updateIncome:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Updated locally.`);
          }
        }
        set((s) => {
          const incomes = s.incomes.map((x) => (x.id === id ? { ...x, ...patch } : x));
          return { incomes, ...updateUserData(s, { incomes }) };
        });
      },
      deleteIncome: async (id) => {
        if (isFirebaseEnabled) {
          try {
            await financeService.deleteIncome(id);
          } catch (err: any) {
            console.error("Firebase write error for deleteIncome:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Deleted locally.`);
          }
        }
        set((s) => {
          const incomes = s.incomes.filter((x) => x.id !== id);
          return { incomes, ...updateUserData(s, { incomes }) };
        });
      },
      setMonthlyBudget: async (amount) => {
        const activeUserId = useFinance.getState().activeUserId;
        const budget = { ...useFinance.getState().budget, monthly: amount };
        
        set((s) => ({ budget, ...updateUserData(s, { budget }) }));

        if (activeUserId && isFirebaseEnabled) {
          try {
            await financeService.updateBudget(activeUserId, budget);
          } catch (err: any) {
            console.error("Firebase write error for setMonthlyBudget:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Budget updated locally.`);
          }
        }
      },
      setCategoryBudget: async (c, amount) => {
        const activeUserId = useFinance.getState().activeUserId;
        const currentBudget = useFinance.getState().budget;
        const budget = { ...currentBudget, categories: { ...currentBudget.categories, [c]: amount } };
        
        set((s) => ({ budget, ...updateUserData(s, { budget }) }));

        if (activeUserId && isFirebaseEnabled) {
          try {
            await financeService.updateBudget(activeUserId, budget);
          } catch (err: any) {
            console.error("Firebase write error for setCategoryBudget:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Budget updated locally.`);
          }
        }
      },
      seedDemo: async () => {
        const activeUserId = useFinance.getState().activeUserId;
        if (!activeUserId) return;
        
        if (isFirebaseEnabled) {
          try {
            // Clear cloud data
            const currentExpenses = await financeService.listExpenses(activeUserId);
            const currentIncomes = await financeService.listIncomes(activeUserId);
            for (const e of currentExpenses) {
              await financeService.deleteExpense(e.id);
            }
            for (const i of currentIncomes) {
              await financeService.deleteIncome(i.id);
            }
            
            // Seed cloud data
            const seededExpenses: Expense[] = [];
            for (const e of demoExpenses) {
              const saved = await financeService.createExpense(e, activeUserId);
              seededExpenses.push(saved);
            }
            const seededIncomes: Income[] = [];
            for (const i of demoIncomes) {
              const saved = await financeService.createIncome(i, activeUserId);
              seededIncomes.push(saved);
            }
            const seededBudget = { monthly: 60000, categories: { Food: 12000, Transport: 5000, Shopping: 8000, Entertainment: 5000, Bills: 15000 } };
            await financeService.updateBudget(activeUserId, seededBudget);
            
            set((s) => ({
              expenses: seededExpenses,
              incomes: seededIncomes,
              budget: seededBudget,
              ...updateUserData(s, { expenses: seededExpenses, incomes: seededIncomes, budget: seededBudget })
            }));
          } catch (err: any) {
            console.error("Firebase write error for seedDemo:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Seeding demo locally.`);
            set((s) => {
              const expenses = demoExpenses;
              const incomes = demoIncomes;
              const budget = { monthly: 60000, categories: { Food: 12000, Transport: 5000, Shopping: 8000, Entertainment: 5000, Bills: 15000 } };
              return { expenses, incomes, budget, ...updateUserData(s, { expenses, incomes, budget }) };
            });
          }
        } else {
          set((s) => {
            const expenses = demoExpenses;
            const incomes = demoIncomes;
            const budget = { monthly: 60000, categories: { Food: 12000, Transport: 5000, Shopping: 8000, Entertainment: 5000, Bills: 15000 } };
            return { expenses, incomes, budget, ...updateUserData(s, { expenses, incomes, budget }) };
          });
        }
      },
      loadUser: async (userId, forceClean = false) => {
        if (forceClean) {
          set((s) => {
            const cleanData = { expenses: [], incomes: [], budget: { monthly: 0, categories: {} } };
            return {
              activeUserId: userId,
              expenses: [],
              incomes: [],
              budget: cleanData.budget,
              byUser: { ...s.byUser, [userId]: cleanData }
            };
          });
          if (isFirebaseEnabled) {
            try {
              await financeService.updateBudget(userId, { monthly: 0, categories: {} });
            } catch (err: any) {
              console.error("Failed to reset budget on forceClean:", err);
            }
          }
          return;
        }

        if (isFirebaseEnabled) {
          try {
            const serverExpenses = await financeService.listExpenses(userId);
            const serverIncomes = await financeService.listIncomes(userId);
            const serverBudget = await financeService.getBudget(userId) || { monthly: 0, categories: {} };

            set((s) => ({
              activeUserId: userId,
              expenses: serverExpenses,
              incomes: serverIncomes,
              budget: serverBudget,
              byUser: {
                ...s.byUser,
                [userId]: { expenses: serverExpenses, incomes: serverIncomes, budget: serverBudget }
              }
            }));
            return;
          } catch (err: any) {
            console.error("Failed to load user data from Firestore:", err);
            toast.error(`Database Sync Failed: ${err.message || "Unknown error"}. Loading local storage.`);
          }
        }

        // Local storage fallback
        set((s) => {
          const defaultUserData: UserFinanceData = {
            expenses: [],
            incomes: [],
            budget: { monthly: 0, categories: {} }
          };
          const userData = s.byUser[userId] || defaultUserData;
          return {
            activeUserId: userId,
            expenses: userData.expenses,
            incomes: userData.incomes,
            budget: userData.budget,
            byUser: {
              ...s.byUser,
              [userId]: userData
            }
          };
        });
      },
      clearUser: () => set({
        activeUserId: null,
        expenses: [],
        incomes: [],
        budget: { monthly: 0, categories: {} }
      }),
    }),
    { name: "smartspend.finance" },
  ),
);
