import { supabase } from "@/integrations/supabase/client";

export type EventRow = {
  id: string;
  user_id: string;
  name: string;
  event_type: string;
  event_date: string;
  location: string | null;
  guest_count: number | null;
  budget: number | null;
  description: string | null;
  created_at: string;
};

export async function listEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function getEvent(id: string): Promise<EventRow> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) throw error;
  return data as EventRow;
}

export async function listGuests(eventId: string) {
  const { data, error } = await supabase.from("guests").select("*").eq("event_id", eventId).order("created_at");
  if (error) throw error;
  return data ?? [];
}
export async function listExpenses(eventId: string) {
  const { data, error } = await supabase.from("expenses").select("*").eq("event_id", eventId).order("created_at");
  if (error) throw error;
  return data ?? [];
}
export async function listTasks(eventId: string) {
  const { data, error } = await supabase.from("tasks").select("*").eq("event_id", eventId).order("created_at");
  if (error) throw error;
  return data ?? [];
}
export async function getLatestPlan(eventId: string) {
  const { data, error } = await supabase.from("ai_plans").select("*").eq("event_id", eventId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}
