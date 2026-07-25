import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Calendar, Users, Wallet, CheckCircle2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EventGenie AI — Plan events effortlessly" },
      { name: "description", content: "AI-powered planning for birthdays, weddings, meetings and parties. Timeline, budget, guests and checklist in one place." },
      { property: "og:title", content: "EventGenie AI — Plan events effortlessly" },
      { property: "og:description", content: "AI-powered planning for birthdays, weddings, meetings and parties. Timeline, budget, guests and checklist in one place." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 backdrop-blur bg-background/70 sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">EventGenie <span className="text-primary">AI</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/dashboard"><Button>Open app</Button></Link>
          </div>

        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <Wand2 className="h-3.5 w-3.5 text-primary" /> AI-powered event planning
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold tracking-tight md:text-6xl">
            Plan unforgettable events,<br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">powered by AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Timelines, budgets, food ideas, decorations, shopping lists — generated in seconds. Made for students, families, and professionals.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard"><Button size="lg" className="shadow-glow">Start planning free</Button></Link>
            <Link to="/assistant"><Button size="lg" variant="outline">Try AI Assistant</Button></Link>
          </div>

        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Calendar, title: "Smart timelines", desc: "AI generates a full event schedule tailored to your date and type." },
            { icon: Wallet, title: "Budget tracker", desc: "Set a budget, log expenses, and see what's left in real time." },
            { icon: Users, title: "Guest management", desc: "Invite guests and track RSVPs from a single dashboard." },
            { icon: CheckCircle2, title: "Task checklist", desc: "Never forget a detail. Check tasks off as you go." },
            { icon: Sparkles, title: "Decor & food ideas", desc: "Creative suggestions matched to your theme and audience." },
            { icon: Wand2, title: "Shopping lists", desc: "AI-built lists you can copy into any store or app." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft transition hover:shadow-glow">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} EventGenie AI
      </footer>
    </div>
  );
}
