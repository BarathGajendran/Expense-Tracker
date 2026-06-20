export function formatCurrency(amount: number, currency = "INR") {
  try {
    const locale = currency === "INR" ? "en-IN" : undefined;
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch { return `${currency === "INR" ? "₹" : "$"}${amount.toFixed(2)}`; }
}
export function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch { return iso; }
}
