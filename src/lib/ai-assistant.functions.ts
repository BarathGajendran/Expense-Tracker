import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
  context: z
    .object({
      currency: z.string().default("INR"),
      totals: z
        .object({
          income: z.number(),
          expenses: z.number(),
          savingsRate: z.number(),
        })
        .optional(),
      monthlyBudget: z.number().optional(),
      byCategory: z
        .array(z.object({ name: z.string(), value: z.number() }))
        .optional(),
    })
    .optional(),
});

function getLocalAssistantReply(messages: { role: string; content: string }[], context?: {
  currency: string;
  totals?: { income: number; expenses: number; savingsRate: number };
  monthlyBudget?: number;
  byCategory?: { name: string; value: number }[];
}) {
  const lastMsg = (messages[messages.length - 1]?.content || "").toLowerCase();
  let reply = "";

  if (lastMsg.includes("budget") || lastMsg.includes("cap")) {
    reply = "Budgets help you track your monthly spending. You can view your current budget limits in the **Budgets** section. Setting category-wise caps (e.g. Food, Shopping) will help you monitor where your money goes!";
  } else if (lastMsg.includes("expense") || lastMsg.includes("spend") || lastMsg.includes("transaction")) {
    reply = "You can record and edit all daily transactions on the **Expenses** page. Keeping track of daily cash or UPI spending is key to controlling impulse purchases.";
  } else if (lastMsg.includes("income") || lastMsg.includes("salary") || lastMsg.includes("earn")) {
    reply = "Enter all your earnings (Salary, Freelance, passive income) in the **Income** tab. This allows us to calculate your Savings Rate and project your future wealth growth.";
  } else if (lastMsg.includes("insight") || lastMsg.includes("ai")) {
    reply = "The **AI Insights** page analyzes your spending patterns. It calculates your Financial Health Score (0-100) and displays personalized recommendations based on your savings rate and budgets.";
  } else if (lastMsg.includes("report") || lastMsg.includes("breakdown") || lastMsg.includes("pdf")) {
    reply = "Go to the **Reports** page to view and export a markdown report of your weekly, monthly, or yearly financial snapshots. It shows your biggest transaction spikes and category details.";
  } else if (lastMsg.includes("hello") || lastMsg.includes("hi") || lastMsg.includes("hey")) {
    reply = "Hello! I am your SmartSpend AI assistant. How can I help you manage your budget, log transactions, or view your financial insights today?";
  } else if (lastMsg.includes("who are you") || lastMsg.includes("your name") || lastMsg.includes("robot")) {
    reply = "I am the SmartSpend AI robot helper! I guide you through the app features and give tips on tracking expenses.";
  } else {
    // General help based on context
    const income = context?.totals?.income ?? 0;
    const expenses = context?.totals?.expenses ?? 0;
    const savings = income ? Math.max(0, (income - expenses) / income) : 0;
    reply = `I am your SmartSpend AI assistant. Currently in offline demo mode. 

Your financial snapshot:
* **Income**: ₹${income.toLocaleString("en-IN")}
* **Expenses**: ₹${expenses.toLocaleString("en-IN")}
* **Savings Rate**: ${(savings * 100).toFixed(1)}%

You can ask me questions about **budgets**, **expenses**, **income**, or **AI insights** and I'll explain how they work!`;
  }

  return {
    reply,
    at: new Date().toISOString(),
  };
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.warn("LOVABLE_API_KEY is not configured. Using local fallback.");
      return getLocalAssistantReply(data.messages, data.context);
    }

    const ctx = data.context;
    const ctxBlock = ctx
      ? `\n\nUser financial snapshot (currency ${ctx.currency}):\n- Income: ₹${ctx.totals?.income ?? 0}\n- Expenses: ₹${ctx.totals?.expenses ?? 0}\n- Savings rate: ${((ctx.totals?.savingsRate ?? 0) * 100).toFixed(1)}%\n- Monthly budget: ₹${ctx.monthlyBudget ?? 0}\n- By category: ${JSON.stringify(ctx.byCategory ?? [])}`
      : "";

    const system = `You are SmartSpend AI's helpful in-app robot assistant for Indian users. You guide users around the app (Dashboard, Expenses, Income, Budgets, AI Insights, Reports, Settings), answer personal finance questions, and give actionable tips. Use ₹ with Indian formatting (e.g. ₹1,25,000). Reference UPI, SIPs, EMIs, GST, and festive spending where relevant. Keep replies short, friendly, and scannable — use short paragraphs or bullet points. Never invent numbers; if you don't have data, say so.${ctxBlock}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: system }, ...data.messages],
        }),
        signal: controller.signal,
      });
    } catch (err) {
      console.error("Assistant Request aborted or failed. Using local fallback:", err);
      return getLocalAssistantReply(data.messages, data.context);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.warn(`Assistant Gateway returned status ${res.status}. Using local fallback.`);
      return getLocalAssistantReply(data.messages, data.context);
    }

    try {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!reply) throw new Error("Assistant returned an empty response.");
      return { reply, at: new Date().toISOString() };
    } catch (err) {
      console.error("Assistant parsing failed. Using local fallback:", err);
      return getLocalAssistantReply(data.messages, data.context);
    }
  });