import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getEvent, listGuests, listExpenses, listTasks, getLatestPlan, type EventRow } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { generateEventPlan, type AIPlan } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Sparkles, Trash2, Wand2, Pencil, Plus, Calendar, MapPin, Users, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const eventQO = (id: string) => queryOptions({ queryKey: ["event", id], queryFn: () => getEvent(id) });
const guestsQO = (id: string) => queryOptions({ queryKey: ["guests", id], queryFn: () => listGuests(id) });
const expensesQO = (id: string) => queryOptions({ queryKey: ["expenses", id], queryFn: () => listExpenses(id) });
const tasksQO = (id: string) => queryOptions({ queryKey: ["tasks", id], queryFn: () => listTasks(id) });
const planQO = (id: string) => queryOptions({ queryKey: ["plan", id], queryFn: () => getLatestPlan(id) });

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: ({ params }) => ({ meta: [{ title: "Event · EventGenie AI" }, { name: "description", content: `Manage event ${params.eventId}` }] }),
  loader: ({ context, params }) => Promise.all([
    context.queryClient.ensureQueryData(eventQO(params.eventId)),
    context.queryClient.ensureQueryData(guestsQO(params.eventId)),
    context.queryClient.ensureQueryData(expensesQO(params.eventId)),
    context.queryClient.ensureQueryData(tasksQO(params.eventId)),
    context.queryClient.ensureQueryData(planQO(params.eventId)),
  ]),
  component: EventPage,
});

function EventPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: event } = useSuspenseQuery(eventQO(eventId));

  const deleteEvent = async () => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    qc.invalidateQueries();
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="rounded-2xl border border-border bg-gradient-hero p-8 text-primary-foreground shadow-glow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{event.event_type}</div>
            <h1 className="mt-1 font-display text-4xl font-bold">{event.name}</h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-90">
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{format(new Date(event.event_date), "PPP · p")}</span>
              {event.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.location}</span>}
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{event.guest_count ?? 0} guests</span>
              <span className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4" />${Number(event.budget ?? 0).toLocaleString()}</span>
            </div>
            {event.description && <p className="mt-4 max-w-2xl text-sm opacity-90">{event.description}</p>}
          </div>
          <div className="flex gap-2">
            <EditEventDialog event={event} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete this event?</AlertDialogTitle><AlertDialogDescription>This will also remove all guests, expenses, tasks and AI plans.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteEvent}>Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai"><Wand2 className="mr-2 h-4 w-4 hidden sm:inline" />AI Planner</TabsTrigger>
          <TabsTrigger value="guests">Guests</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>
        <TabsContent value="ai" className="mt-4"><AIPanel eventId={eventId} event={event} /></TabsContent>
        <TabsContent value="guests" className="mt-4"><GuestsPanel eventId={eventId} /></TabsContent>
        <TabsContent value="budget" className="mt-4"><BudgetPanel eventId={eventId} budget={Number(event.budget ?? 0)} /></TabsContent>
        <TabsContent value="checklist" className="mt-4"><ChecklistPanel eventId={eventId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function EditEventDialog({ event }: { event: EventRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: event.name, event_type: event.event_type,
    event_date: event.event_date.slice(0, 16),
    location: event.location ?? "", guest_count: String(event.guest_count ?? ""), budget: String(event.budget ?? ""),
    description: event.description ?? "",
  });
  const save = async () => {
    const { error } = await supabase.from("events").update({
      name: f.name, event_type: f.event_type,
      event_date: new Date(f.event_date).toISOString(),
      location: f.location || null,
      guest_count: f.guest_count ? Number(f.guest_count) : 0,
      budget: f.budget ? Number(f.budget) : 0,
      description: f.description || null,
      updated_at: new Date().toISOString(),
    }).eq("id", event.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
    toast.success("Updated");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary" size="sm"><Pencil className="mr-2 h-4 w-4" />Edit</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={f.event_type} onValueChange={(v) => setF({ ...f, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Birthday","Wedding","Meeting","Party","University Event","Conference","Other"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="datetime-local" value={f.event_date} onChange={(e) => setF({ ...f, event_date: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Location</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Guests</Label><Input type="number" value={f.guest_count} onChange={(e) => setF({ ...f, guest_count: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Budget</Label><Input type="number" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AIPanel({ eventId, event }: { eventId: string; event: EventRow }) {
  const { data: plan } = useSuspenseQuery(planQO(eventId));
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const gen = useServerFn(generateEventPlan);

  const run = async () => {
    setLoading(true);
    try {
      const result = await gen({ data: {
        name: event.name, event_type: event.event_type, event_date: event.event_date,
        location: event.location, guest_count: event.guest_count, budget: event.budget, description: event.description,
      }});
      const { error } = await supabase.from("ai_plans").insert({ event_id: eventId, content: result });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["plan", eventId] });
      toast.success("Plan ready!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate plan");
    } finally { setLoading(false); }
  };

  const content = plan?.content as AIPlan | undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-hero text-primary-foreground shadow-glow"><Sparkles className="h-5 w-5" /></div>
          <div>
            <div className="font-display text-lg font-semibold">AI Event Planner</div>
            <div className="text-sm text-muted-foreground">Generate timeline, budget, food, decor, shopping & tips.</div>
          </div>
        </div>
        <Button onClick={run} disabled={loading} className="shadow-glow"><Wand2 className="mr-2 h-4 w-4" />{loading ? "Generating…" : content ? "Regenerate" : "Generate plan"}</Button>
      </div>

      {!content && !loading && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Click <b>Generate plan</b> to let AI create your complete event plan.
        </div>
      )}

      {content && (
        <div className="grid gap-4 lg:grid-cols-2">
          <PlanCard title="🗓️ Timeline">
            <ol className="space-y-2">
              {content.timeline?.map((t, i) => (
                <li key={i} className="flex gap-3 text-sm"><span className="font-mono font-medium text-primary min-w-[70px]">{t.time}</span><span>{t.item}</span></li>
              ))}
            </ol>
          </PlanCard>
          <PlanCard title="💰 Budget suggestions">
            <ul className="space-y-2 text-sm">
              {content.budget_suggestions?.map((b, i) => (
                <li key={i} className="flex justify-between gap-3"><span><b>{b.category}</b>{b.note && <span className="text-muted-foreground"> — {b.note}</span>}</span><span className="font-mono">${b.estimate}</span></li>
              ))}
            </ul>
          </PlanCard>
          <PlanCard title="🍽️ Food ideas"><UL items={content.food_ideas} /></PlanCard>
          <PlanCard title="🎨 Decoration ideas"><UL items={content.decoration_ideas} /></PlanCard>
          <PlanCard title="🛒 Shopping checklist"><UL items={content.shopping_checklist} /></PlanCard>
          <PlanCard title="💡 Planning tips"><UL items={content.planning_tips} /></PlanCard>
        </div>
      )}
    </div>
  );
}
function PlanCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-soft"><h3 className="mb-3 font-display font-semibold">{title}</h3>{children}</div>;
}
function UL({ items }: { items: string[] }) {
  return <ul className="space-y-1.5 text-sm">{items?.map((x, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{x}</li>)}</ul>;
}

function GuestsPanel({ eventId }: { eventId: string }) {
  const { data: guests } = useSuspenseQuery(guestsQO(eventId));
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("guests").insert({ event_id: eventId, name, email: email || null });
    if (error) return toast.error(error.message);
    setName(""); setEmail(""); qc.invalidateQueries({ queryKey: ["guests", eventId] });
  };
  const setRsvp = async (id: string, status: string) => {
    await supabase.from("guests").update({ rsvp_status: status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["guests", eventId] });
  };
  const del = async (id: string) => {
    await supabase.from("guests").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["guests", eventId] });
  };
  const counts = guests.reduce((a, g: { rsvp_status: string }) => ({ ...a, [g.rsvp_status]: (a[g.rsvp_status] || 0) + 1 }), {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[["Total", guests.length], ["Yes", counts.yes || 0], ["No", counts.no || 0], ["Pending", counts.pending || 0]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-4 text-center shadow-soft">
            <div className="text-2xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-2xl border border-border bg-gradient-card p-4 shadow-soft">
        <Input required placeholder="Guest name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[160px]" />
        <Input type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 min-w-[160px]" />
        <Button type="submit"><Plus className="mr-1 h-4 w-4" />Add</Button>
      </form>
      <div className="rounded-2xl border border-border bg-card shadow-soft divide-y divide-border">
        {guests.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No guests yet.</div>}
        {guests.map((g: { id: string; name: string; email: string | null; rsvp_status: string }) => (
          <div key={g.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{g.name}</div>
              {g.email && <div className="text-xs text-muted-foreground truncate">{g.email}</div>}
            </div>
            <Select value={g.rsvp_status} onValueChange={(v) => setRsvp(g.id, v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="yes">Attending</SelectItem>
                <SelectItem value="no">Declined</SelectItem>
                <SelectItem value="maybe">Maybe</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => del(g.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetPanel({ eventId, budget }: { eventId: string; budget: number }) {
  const { data: expenses } = useSuspenseQuery(expensesQO(eventId));
  const qc = useQueryClient();
  const [label, setLabel] = useState(""); const [amount, setAmount] = useState(""); const [category, setCategory] = useState("");
  const total = expenses.reduce((s, e: { amount: number }) => s + Number(e.amount ?? 0), 0);
  const remaining = budget - total;
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("expenses").insert({ event_id: eventId, label, amount: Number(amount), category: category || null });
    if (error) return toast.error(error.message);
    setLabel(""); setAmount(""); setCategory("");
    qc.invalidateQueries({ queryKey: ["expenses", eventId] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };
  const del = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["expenses", eventId] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-soft">
        <div className="flex flex-wrap justify-between gap-4 text-sm">
          <div><div className="text-muted-foreground">Budget</div><div className="text-2xl font-bold">${budget.toLocaleString()}</div></div>
          <div><div className="text-muted-foreground">Spent</div><div className="text-2xl font-bold">${total.toLocaleString()}</div></div>
          <div><div className="text-muted-foreground">Remaining</div><div className={`text-2xl font-bold ${remaining < 0 ? "text-destructive" : "text-primary"}`}>${remaining.toLocaleString()}</div></div>
        </div>
        <Progress value={pct} className="mt-4" />
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <Input required placeholder="Expense" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1 min-w-[140px]" />
        <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-40" />
        <Input required type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
        <Button type="submit"><Plus className="mr-1 h-4 w-4" />Add</Button>
      </form>
      <div className="rounded-2xl border border-border bg-card shadow-soft divide-y divide-border">
        {expenses.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No expenses logged.</div>}
        {expenses.map((e: { id: string; label: string; category: string | null; amount: number }) => (
          <div key={e.id} className="flex items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{e.label}</div>
              {e.category && <div className="text-xs text-muted-foreground">{e.category}</div>}
            </div>
            <div className="font-mono font-semibold">${Number(e.amount).toLocaleString()}</div>
            <Button variant="ghost" size="icon" onClick={() => del(e.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistPanel({ eventId }: { eventId: string }) {
  const { data: tasks } = useSuspenseQuery(tasksQO(eventId));
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("tasks").insert({ event_id: eventId, title });
    if (error) return toast.error(error.message);
    setTitle("");
    qc.invalidateQueries({ queryKey: ["tasks", eventId] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };
  const toggle = async (id: string, completed: boolean) => {
    await supabase.from("tasks").update({ completed }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks", eventId] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };
  const del = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks", eventId] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };
  const done = tasks.filter((t: { completed: boolean }) => t.completed).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-soft">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold">{done} / {tasks.length}</span>
        </div>
        <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} className="mt-3" />
      </div>
      <form onSubmit={add} className="flex gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <Input required placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit"><Plus className="mr-1 h-4 w-4" />Add</Button>
      </form>
      <div className="rounded-2xl border border-border bg-card shadow-soft divide-y divide-border">
        {tasks.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No tasks yet.</div>}
        {tasks.map((t: { id: string; title: string; completed: boolean }) => (
          <div key={t.id} className="flex items-center gap-3 p-4">
            <Checkbox checked={t.completed} onCheckedChange={(v) => toggle(t.id, Boolean(v))} />
            <span className={`flex-1 ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
            <Button variant="ghost" size="icon" onClick={() => del(t.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
