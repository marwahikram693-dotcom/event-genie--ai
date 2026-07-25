import { createServerFn } from "@tanstack/react-start";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type EventContext = {
  event_type?: string;
  guest_count?: number | null;
  budget?: number | null;
  location?: string;
  theme?: string;
};

const SYSTEM = `You are EventGenie AI, a friendly, expert event planner assistant.
Help the user plan their event conversationally. When useful, provide:
- A planning timeline (with times / dates)
- Budget suggestions broken down by category
- Food & drink recommendations
- Decoration & theme ideas
- A practical task checklist

Format responses with clean Markdown (headings, bullet lists, tables when helpful).
Be concise, warm, and specific to the user's event context. Ask clarifying questions when details are missing.`;

export const chatWithPlanner = createServerFn({ method: "POST" })
  .inputValidator((data: { messages: ChatMsg[]; context?: EventContext }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const ctx = data.context ?? {};
    const ctxLines = [
      ctx.event_type && `Event type: ${ctx.event_type}`,
      ctx.guest_count != null && `Guests: ${ctx.guest_count}`,
      ctx.budget != null && `Budget: $${ctx.budget}`,
      ctx.location && `Location: ${ctx.location}`,
      ctx.theme && `Theme: ${ctx.theme}`,
    ].filter(Boolean);

    const systemContent = ctxLines.length
      ? `${SYSTEM}\n\nCurrent event context:\n${ctxLines.join("\n")}`
      : SYSTEM;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "system", content: systemContent }, ...data.messages],
      }),
    });

    if (res.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in your workspace billing.");
    if (!res.ok) throw new Error(`AI error: ${res.status} ${await res.text()}`);

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    return { content };
  });
