import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({ meta: [{ title: "Create event — EventGenie AI" }, { name: "description", content: "Add a new event and let AI plan every detail." }] }),
  component: NewEvent,
});

const TYPES = ["Birthday", "Wedding", "Meeting", "Party", "University Event", "Conference", "Other"];

function NewEvent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", event_type: "Birthday", event_date: "",
    location: "", guest_count: "", budget: "", description: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return toast.error("Not signed in"); }
    const { data, error } = await supabase.from("events").insert({
      user_id: userData.user.id,
      name: form.name,
      event_type: form.event_type,
      event_date: new Date(form.event_date).toISOString(),
      location: form.location || null,
      guest_count: form.guest_count ? Number(form.guest_count) : 0,
      budget: form.budget ? Number(form.budget) : 0,
      description: form.description || null,
    }).select("id").single();
    setLoading(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
    toast.success("Event created!");
    navigate({ to: "/events/$eventId", params: { eventId: data.id } });
  };

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      <h1 className="font-display text-3xl font-bold">Create a new event</h1>
      <p className="mt-1 text-muted-foreground">Fill in the details. You can edit anything later.</p>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-border bg-gradient-card p-6 shadow-soft">
        <div className="space-y-2">
          <Label htmlFor="name">Event name *</Label>
          <Input id="name" required value={form.name} onChange={upd("name")} placeholder="Sarah's 30th Birthday" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Event type *</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date & time *</Label>
            <Input id="date" type="datetime-local" required value={form.event_date} onChange={upd("event_date")} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="loc">Location</Label>
          <Input id="loc" value={form.location} onChange={upd("location")} placeholder="123 Main St or venue name" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="g">Number of guests</Label>
            <Input id="g" type="number" min={0} value={form.guest_count} onChange={upd("guest_count")} placeholder="50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b">Budget ($)</Label>
            <Input id="b" type="number" min={0} step="0.01" value={form.budget} onChange={upd("budget")} placeholder="2000" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="d">Description / notes</Label>
          <Textarea id="d" rows={4} value={form.description} onChange={upd("description")} placeholder="Theme, vibe, must-haves…" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" size="lg" className="shadow-glow" disabled={loading}>{loading ? "Creating…" : "Create event"}</Button>
          <Link to="/dashboard"><Button type="button" variant="outline" size="lg">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
