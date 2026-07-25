import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithPlanner, type ChatMsg, type EventContext } from "@/lib/ai-chat.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Send, Loader2, Bot, User, Wand2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant · EventGenie AI" },
      { name: "description", content: "Chat with EventGenie AI to plan timelines, budgets, food, decor, and checklists." },
      { property: "og:title", content: "AI Assistant · EventGenie AI" },
      { property: "og:description", content: "Chat with EventGenie AI to plan your event end-to-end." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

const EVENT_TYPES = ["Birthday", "Wedding", "Meeting", "Party", "University Event", "Conference", "Other"];

function AssistantPage() {
  const chat = useServerFn(chatWithPlanner);
  const [ctx, setCtx] = useState<EventContext & { guest_count_str: string; budget_str: string }>({
    event_type: "Birthday",
    guest_count_str: "",
    budget_str: "",
    location: "",
    theme: "",
  });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = (): EventContext => ({
    event_type: ctx.event_type,
    guest_count: ctx.guest_count_str ? Number(ctx.guest_count_str) : null,
    budget: ctx.budget_str ? Number(ctx.budget_str) : null,
    location: ctx.location,
    theme: ctx.theme,
  });

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chat({ data: { messages: next, context: buildContext() } });
      setMessages([...next, { role: "assistant", content: res.content }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reach AI");
      setMessages(next.slice(0, -1));
      setInput(content);
    } finally {
      setLoading(false);
    }
  };

  const startPlan = () => {
    const c = buildContext();
    const prompt = `Please create a complete event plan for me. Include:
1. Planning timeline
2. Budget breakdown suggestions
3. Food & drink recommendations
4. Decoration ideas
5. Task checklist

My event details:
- Type: ${c.event_type || "not set"}
- Guests: ${c.guest_count ?? "not set"}
- Budget: ${c.budget ? `$${c.budget}` : "not set"}
- Location: ${c.location || "not set"}
- Theme: ${c.theme || "not set"}`;
    send(prompt);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Context sidebar */}
      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero text-primary-foreground shadow-glow">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Event brief</h2>
              <p className="text-xs text-muted-foreground">Shared with the assistant</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Event type</Label>
              <Select value={ctx.event_type} onValueChange={(v) => setCtx({ ...ctx, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Number of guests</Label>
              <Input type="number" min="0" placeholder="e.g. 50" value={ctx.guest_count_str}
                onChange={(e) => setCtx({ ...ctx, guest_count_str: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Budget ($)</Label>
              <Input type="number" min="0" placeholder="e.g. 2000" value={ctx.budget_str}
                onChange={(e) => setCtx({ ...ctx, budget_str: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="e.g. Rooftop, Berlin" value={ctx.location}
                onChange={(e) => setCtx({ ...ctx, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Textarea rows={2} placeholder="e.g. Tropical sunset, boho, retro 90s"
                value={ctx.theme} onChange={(e) => setCtx({ ...ctx, theme: e.target.value })} />
            </div>
            <Button onClick={startPlan} disabled={loading} className="w-full shadow-glow">
              <Wand2 className="mr-2 h-4 w-4" />Generate full plan
            </Button>
          </div>
        </div>
      </aside>

      {/* Chat */}
      <section className="flex h-[calc(100vh-9rem)] flex-col rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-gradient-card px-5 py-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground shadow-glow">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display font-semibold">EventGenie Assistant</div>
            <div className="text-xs text-muted-foreground">Powered by Gemini · Ask anything about your event</div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border p-8 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-display text-lg font-semibold">Hi! I'm your event planner.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill in your event brief on the left, then hit <b>Generate full plan</b> — or ask me anything below.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["Suggest a menu", "Help me pick decor", "Draft a timeline"].map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>{s}</Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          {loading && (
            <div className="flex items-start gap-3">
              <Avatar role="assistant" />
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="border-t border-border bg-background p-3"
        >
          <div className="flex gap-2">
            <Input
              placeholder="Ask about timeline, budget, food, decor…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()} className="shadow-glow">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <div className={cn(
      "grid h-8 w-8 shrink-0 place-items-center rounded-lg shadow-soft",
      role === "assistant" ? "bg-gradient-hero text-primary-foreground shadow-glow" : "bg-muted text-foreground"
    )}>
      {role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <Avatar role={msg.role} />
      <div className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-soft",
        isUser
          ? "rounded-tr-sm bg-primary text-primary-foreground"
          : "rounded-tl-sm bg-muted text-foreground"
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
