import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  currency: z.string().default("INR"),
  totals: z.object({ income: z.number(), expenses: z.number(), savingsRate: z.number() }),
  byCategory: z.array(z.object({ name: z.string(), value: z.number() })),
  monthlyBudget: z.number().default(0),
});

const OutputSchema = z.object({
  score: z.number().min(0).max(100),
  healthLabel: z.string(),
  headline: z.string(),
  insights: z
    .array(
      z.object({
        tone: z.enum(["info", "success", "warn"]),
        title: z.string(),
        text: z.string(),
      }),
    )
    .min(3)
    .max(6),
  recommendations: z.array(z.string()).min(3).max(5),
});

function getLocalInsights(data: {
  currency: string;
  totals: { income: number; expenses: number; savingsRate: number };
  byCategory: { name: string; value: number }[];
  monthlyBudget: number;
}) {
  const savingsRatePct = data.totals.savingsRate * 100;
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        40 +
          (data.totals.savingsRate * 50) +
          (data.monthlyBudget && data.totals.expenses <= data.monthlyBudget ? 10 : 0) -
          (data.totals.expenses > data.totals.income ? 15 : 0)
      )
    )
  );

  const healthLabel =
    score >= 80
      ? "Excellent"
      : score >= 60
      ? "Healthy"
      : score >= 40
      ? "Watchful"
      : "At risk";

  const topCategory = data.byCategory.reduce(
    (max, c) => (c.value > max.value ? c : max),
    { name: "None", value: 0 }
  );

  const headline =
    savingsRatePct > 20
      ? "Excellent financial discipline! You are saving a healthy portion of your income."
      : savingsRatePct > 5
      ? "Healthy start. You are saving, but there is room to optimize your major expense categories."
      : "Watchful spending needed. Your expenses are eating up almost all your income.";

  const insights = [
    {
      tone: savingsRatePct > 10 ? ("success" as const) : ("warn" as const),
      title: "Savings Rate",
      text: `Your savings rate is ${savingsRatePct.toFixed(1)}%. An ideal rate is 20%+ for long-term goals.`,
    },
  ];

  if (topCategory.value > 0) {
    const topPct = (topCategory.value / (data.totals.expenses || 1)) * 100;
    insights.push({
      tone: topPct > 30 ? ("warn" as const) : ("info" as const),
      title: `${topCategory.name} Spending`,
      text: `${topCategory.name} is your top expense at ₹${topCategory.value.toLocaleString("en-IN")} (${topPct.toFixed(1)}% of total expenses).`,
    });
  }

  if (data.monthlyBudget > 0) {
    const budgetPct = (data.totals.expenses / data.monthlyBudget) * 100;
    insights.push({
      tone: data.totals.expenses > data.monthlyBudget ? ("warn" as const) : ("success" as const),
      title: "Budget Cap Status",
      text: data.totals.expenses > data.monthlyBudget
        ? `You have exceeded your monthly budget of ₹${data.monthlyBudget.toLocaleString("en-IN")} by ${budgetPct.toFixed(0)}%.`
        : `You are utilizing ${budgetPct.toFixed(0)}% of your monthly budget of ₹${data.monthlyBudget.toLocaleString("en-IN")}.`,
    });
  } else {
    insights.push({
      tone: "info" as const,
      title: "Budget Cap",
      text: "Set a monthly budget cap in the Budgets section to activate budget tracking.",
    });
  }

  // Ensure we have at least 3 insights
  if (insights.length < 3) {
    insights.push({
      tone: "info" as const,
      title: "SIP & Investments",
      text: "Automate your savings by setting up a monthly SIP at the beginning of each month.",
    });
  }

  const recommendations = [
    "Build a 6-month emergency buffer in a liquid mutual fund or high-interest account.",
    "Auto-debit savings via a Systematic Investment Plan (SIP) at the start of the month.",
    "Review UPI transactions weekly to control minor impulse purchases."
  ];

  if (topCategory.value > 0) {
    recommendations.push(`Try to reduce ${topCategory.name} spending by 10% next month.`);
  }

  return {
    score,
    healthLabel,
    headline,
    insights: insights.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
  };
}

export const generateAIInsights = createServerFn({ method: "POST" })
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.warn("LOVABLE_API_KEY is not configured. Using local fallback.");
      return getLocalInsights(data);
    }

    const prompt = `You are a friendly personal finance coach for an Indian user. Amounts are in ₹ (${data.currency}); use Indian number formatting (e.g. ₹1,25,000). Reference UPI, SIPs, EMIs, festivals, or GST when relevant.

Given this user's data, return STRICT JSON (no markdown, no code fences) matching this shape:
{
  "score": number 0-100 (financial health),
  "healthLabel": one of "Excellent" | "Healthy" | "Watchful" | "At risk",
  "headline": one short sentence (<=90 chars) summarizing the situation,
  "insights": 3-5 items, each { "tone": "info" | "success" | "warn", "title": short title, "text": one or two sentences with ₹ amounts where helpful },
  "recommendations": 3-5 short, actionable bullets tailored to Indian users
}

Data:
Income: ₹${data.totals.income}
Expenses: ₹${data.totals.expenses}
Savings rate: ${(data.totals.savingsRate * 100).toFixed(1)}%
Monthly budget cap: ₹${data.monthlyBudget}
Spending by category: ${JSON.stringify(data.byCategory)}

Return ONLY JSON.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a precise personal finance coach for Indian users. Always reply with strict JSON when asked." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      console.error("AI Request aborted or failed. Using local fallback:", err);
      return getLocalInsights(data);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.warn(`AI Gateway returned status ${res.status}. Using local fallback.`);
      return getLocalInsights(data);
    }

    try {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content ?? "{}";
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("AI returned malformed response.");
        parsed = JSON.parse(m[0]);
      }
      return OutputSchema.parse(parsed);
    } catch (err) {
      console.error("AI parsing failed. Using local fallback:", err);
      return getLocalInsights(data);
    }
  });