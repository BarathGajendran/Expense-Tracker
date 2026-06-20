export type Category =
  | "Food" | "Transport" | "Shopping" | "Entertainment"
  | "Bills" | "Education" | "Healthcare" | "Others";

export const CATEGORIES: Category[] = [
  "Food","Transport","Shopping","Entertainment","Bills","Education","Healthcare","Others",
];

export const PAYMENT_METHODS = ["Cash","Card","UPI","Bank Transfer","Wallet"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  description?: string;
  receipt?: string;
}
export interface Income {
  id: string; source: string; amount: number; date: string; notes?: string;
}
export interface Budget {
  monthly: number;
  categories: Partial<Record<Category, number>>;
}
export interface User {
  id: string; name: string; email: string; avatar?: string;
  currency: string; monthlyIncome?: number; goals?: string;
}
