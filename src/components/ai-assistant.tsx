import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, X, Loader2, Sparkles, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { askAssistant } from "@/lib/ai-assistant.functions";
import { useFinance } from "@/store/finance";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

type ChatMsg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How am I doing this month?",
  "Where can I cut expenses?",
  "Explain my biggest category",
  "Tips to save for an SIP",
];

const WELCOME: ChatMsg = {
  role: "assistant",
  content:
    "Hi! I'm your SmartSpend AI assistant 🤖. Ask me about your spending in ₹, budgeting tips, or how to use the app.",
};

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { user } = useAuth();
  const { expenses, incomes, budget } = useFinance();

  const context = useMemo(() => {
    const now = new Date();
    const monthExp = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthInc = incomes.filter((i) => {
      const d = new Date(i.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const exp = monthExp.reduce((s, e) => s + e.amount, 0);
    const inc = monthInc.reduce((s, i) => s + i.amount, 0);
    const byCatMap = new Map<string, number>();
    monthExp.forEach((e) => byCatMap.set(e.category, (byCatMap.get(e.category) ?? 0) + e.amount));
    return {
      currency: user?.currency ?? "INR",
      totals: { income: inc, expenses: exp, savingsRate: inc > 0 ? (inc - exp) / inc : 0 },
      monthlyBudget: budget.monthly,
      byCategory: Array.from(byCatMap, ([name, value]) => ({ name, value })),
    };
  }, [expenses, incomes, budget, user?.currency]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        inputRef.current?.focus();
      });
    }
  }, [open, messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const payload = next.filter((m) => m !== WELCOME).slice(-12);
      const res = await askAssistant({ data: { messages: payload, context } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      setMessages((m) => m.filter((x) => x !== lastUser));
      void send(lastUser.content);
    }
  };

  const reset = () => {
    setMessages([WELCOME]);
    setError(null);
    setInput("");
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        aria-label={open ? "Close assistant" : "Open AI assistant"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
          "gradient-primary text-white hover:scale-105 active:scale-95",
          open && "rotate-90",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full bg-secondary" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="SmartSpend AI assistant"
          className="fixed bottom-24 right-4 z-50 flex h-[min(560px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 gradient-primary text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">SmartSpend Assistant</p>
                <p className="text-[11px] opacity-90">Powered by Gemini AI</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="h-7 px-2 text-white hover:bg-white/20"
              title="New chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex w-full",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="text-xs">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span className="truncate">{error}</span>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={retry}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {messages.length <= 1 && !loading && (
              <div className="space-y-1.5 pt-1">
                <p className="px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Try asking
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="flex w-full items-center gap-2 rounded-lg border bg-card/50 px-3 py-2 text-left text-xs hover:bg-accent transition-colors"
                  >
                    <Sparkles className="h-3 w-3 text-primary shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="border-t bg-background p-2"
          >
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Ask about your ₹ spending…"
                rows={1}
                className="min-h-[40px] max-h-32 resize-none text-sm"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                className="gradient-primary text-white shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}