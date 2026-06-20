import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  range: z.enum(["weekly", "monthly", "yearly"]),
  currency: z.string().default("USD"),
  totals: z.object({
    income: z.number(),
    expenses: z.number(),
    net: z.number(),
  }),
  byCategory: z.array(z.object({ name: z.string(), value: z.number() })),
  topExpenses: z.array(
    z.object({
      date: z.string(),
      category: z.string(),
      description: z.string().optional().default(""),
      amount: z.number(),
    }),
  ),
});

function getLocalReport(data: {
  range: "weekly" | "monthly" | "yearly";
  currency: string;
  totals: { income: number; expenses: number; net: number };
  byCategory: { name: string; value: number }[];
  topExpenses: { date: string; category: string; description: string; amount: number }[];
}) {
  const categoriesList = data.byCategory
    .map(c => `* **${c.name}**: ₹${c.value.toLocaleString("en-IN")} (${((c.value / (data.totals.expenses || 1)) * 100).toFixed(1)}%)`)
    .join("\n");

  const transactionsList = data.topExpenses
    .slice(0, 3)
    .map(e => `* **₹${e.amount.toLocaleString("en-IN")}** on ${e.category} (${e.description || 'No description'}) - *${new Date(e.date).toLocaleDateString("en-IN")}*`)
    .join("\n");

  const netSavingsRate = data.totals.income ? ((data.totals.net / data.totals.income) * 100).toFixed(1) : "0.0";

  const content = `## Overview
This is your ${data.range} financial report. During this period, your total income was ₹${data.totals.income.toLocaleString("en-IN")} and total expenses were ₹${data.totals.expenses.toLocaleString("en-IN")}, resulting in a net savings of ₹${data.totals.net.toLocaleString("en-IN")}. Your savings rate is **${netSavingsRate}%**.

## Spending Breakdown
Here is the summary of your spending by category:
${categoriesList || "*No category data logged yet.*"}

## Key Insights
* Your net savings of ₹${data.totals.net.toLocaleString("en-IN")} indicates a ${data.totals.net >= 0 ? "surplus" : "deficit"} for this period.
* Your highest transactions include:
${transactionsList || "*No top expenses found.*"}

## Recommendations
* Review your top spending categories to find areas to optimize.
* Automate savings via a Systematic Investment Plan (SIP) at the start of the month.
* Maintain a buffer of at least 3-6 months of essential expenses.

## Outlook
Based on your current savings rate, you are on track to save approximately ₹${(data.totals.net * (data.range === 'weekly' ? 52 : data.range === 'monthly' ? 12 : 1)).toLocaleString("en-IN")} over the next 12 months. Keep tweaking your budgets to improve this score!`;

  return {
    report: content,
    generatedAt: new Date().toISOString(),
  };
}

export const generateAIReport = createServerFn({ method: "POST" })
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.warn("LOVABLE_API_KEY is not configured. Using local fallback.");
      return getLocalReport(data);
    }

    const prompt = `You are a personal finance analyst for an Indian user. Write a concise, friendly ${data.range} financial report in Markdown. All amounts are in Indian Rupees (₹, currency code ${data.currency}). Always show amounts with ₹ and Indian number formatting (e.g. ₹1,25,000). Reference Indian context where relevant (UPI, EMIs, SIPs, festival spending, GST). Structure with these sections using ## headings:

## Overview
2-3 sentence summary of the period.

## Spending Breakdown
Bullet points on top categories with percentages of total expenses.

## Key Insights
3-5 bullet points highlighting notable patterns, anomalies, or risks.

## Recommendations
3-4 actionable, specific suggestions to improve savings or budget discipline.

## Outlook
1-2 sentences predicting next period if trends continue.

Data:
Income: ${data.totals.income}
Expenses: ${data.totals.expenses}
Net: ${data.totals.net}
By category: ${JSON.stringify(data.byCategory)}
Top expenses: ${JSON.stringify(data.topExpenses)}

Keep it under 350 words. Do not include code fences. Use ₹ for every amount.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a precise, encouraging personal finance analyst for Indian users. Always use ₹ and Indian number formatting." },
            { role: "user", content: prompt },
          ],
        }),
        signal: controller.signal,
      });
    } catch (err) {
      console.error("AI Report Request aborted or failed. Using local fallback:", err);
      return getLocalReport(data);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.warn(`AI Report Gateway returned status ${res.status}. Using local fallback.`);
      return getLocalReport(data);
    }

    try {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content ?? "";
      return { report: content, generatedAt: new Date().toISOString() };
    } catch (err) {
      console.error("AI Report parsing failed. Using local fallback:", err);
      return getLocalReport(data);
    }
  });