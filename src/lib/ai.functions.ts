import { createServerFn } from "@tanstack/react-start";

export type AIPlan = {
  timeline: { time: string; item: string }[];
  budget_suggestions: { category: string; estimate: number; note?: string }[];
  food_ideas: string[];
  decoration_ideas: string[];
  shopping_checklist: string[];
  planning_tips: string[];
};

const SYSTEM = `You are EventGenie AI, an expert event planner. Given an event brief, return a complete, practical, creative plan. Respond ONLY with a JSON object matching this TypeScript type:
{
  "timeline": { "time": string, "item": string }[],
  "budget_suggestions": { "category": string, "estimate": number, "note"?: string }[],
  "food_ideas": string[],
  "decoration_ideas": string[],
  "shopping_checklist": string[],
  "planning_tips": string[]
}
Keep each list 5-10 items. Use the same currency scale as the provided budget. No prose outside the JSON.`;

export const generateEventPlan = createServerFn({ method: "POST" })
  .inputValidator((data: {
    name: string; event_type: string; event_date: string;
    location?: string | null; guest_count?: number | null; budget?: number | null; description?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const userPrompt = `Event: ${data.name}
Type: ${data.event_type}
Date: ${data.event_date}
Location: ${data.location ?? "TBD"}
Guests: ${data.guest_count ?? "TBD"}
Total budget: ${data.budget ?? "TBD"}
Notes: ${data.description ?? "—"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in your workspace billing.");
    if (!res.ok) throw new Error(`AI error: ${res.status} ${await res.text()}`);

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let plan: AIPlan;
    try { plan = JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }
    return plan;
  });
