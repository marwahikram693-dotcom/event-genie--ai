import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listEvents } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { CalendarPlus, Calendar, Users, Wallet, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const eventsQO = queryOptions({ queryKey: ["events"], queryFn: listEvents });
const statsQO = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: async () => {
    const [{ data: expenses }, { data: guests }, { data: tasks }] = await Promise.all([
      supabase.from("expenses").select("amount"),
      supabase.from("guests").select("id"),
      supabase.from("tasks").select("id, completed"),
    ]);
    const spent = (expenses ?? []).reduce((s, e: { amount: number }) => s + Number(e.amount ?? 0), 0);
    const doneTasks = (tasks ?? []).filter((t: { completed: boolean }) => t.completed).length;
    return { spent, guests: (guests ?? []).length, doneTasks, totalTasks: (tasks ?? []).length };
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EventGenie AI" }, { name: "description", content: "Your events, budget, guests and tasks at a glance." }] }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(eventsQO),
    context.queryClient.ensureQueryData(statsQO),
  ]),
  component: Dashboard,
});

function Dashboard() {
  const { data: events } = useSuspenseQuery(eventsQO);
  const { data: stats } = useSuspenseQuery(statsQO);
  const totalBudget = events.reduce((s, e) => s + Number(e.budget ?? 0), 0);
  const upcoming = events.filter((e) => new Date(e.event_date) >= new Date());

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Welcome back 👋</h1>
          <p className="mt-1 text-muted-foreground">Here's what's happening with your events.</p>
        </div>
        <Link to="/events/new"><Button size="lg" className="shadow-glow"><CalendarPlus className="mr-2 h-4 w-4" />Create new event</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Calendar} label="Upcoming events" value={upcoming.length.toString()} tint="primary" />
        <StatCard icon={Wallet} label="Total budget" value={`$${totalBudget.toLocaleString()}`} sub={`$${stats.spent.toLocaleString()} spent`} tint="accent" />
        <StatCard icon={Users} label="Guests" value={stats.guests.toString()} tint="primary" />
        <StatCard icon={CheckCircle2} label="Tasks done" value={`${stats.doneTasks}/${stats.totalTasks}`} tint="accent" />
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">Your events</h2>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-gradient-card p-12 text-center shadow-soft">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">No events yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create your first event and let AI build the plan.</p>
            <Link to="/events/new"><Button className="mt-6 shadow-glow"><CalendarPlus className="mr-2 h-4 w-4" />Create event</Button></Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }}
                className="group rounded-2xl border border-border bg-gradient-card p-5 shadow-soft transition hover:shadow-glow hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-primary">{e.event_type}</div>
                    <h3 className="mt-1 font-display text-lg font-semibold group-hover:text-primary">{e.name}</h3>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2 text-primary"><Calendar className="h-4 w-4" /></div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <div>📅 {format(new Date(e.event_date), "MMM d, yyyy · h:mm a")}</div>
                  {e.location && <div>📍 {e.location}</div>}
                  <div className="flex justify-between pt-2">
                    <span>👥 {e.guest_count ?? 0} guests</span>
                    <span className="font-medium text-foreground">${Number(e.budget ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tint }: { icon: typeof Calendar; label: string; value: string; sub?: string; tint: "primary" | "accent" }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tint === "primary" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
