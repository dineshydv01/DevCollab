import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import Button from "../components/ui/Button.jsx";
import {
  Code2,
  FolderGit2,
  Users,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink selection:bg-accent/30 selection:text-ink">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold text-ink">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
              <Code2 className="h-5 w-5 text-accent" />
            </div>
            <span>DevCollab</span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="accent">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button variant="accent">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 lg:px-8 text-center bg-radial from-amber-500/5 to-transparent">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1 text-xs font-semibold text-ink shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Algorithm-driven developer matchmaking & collaboration</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.1]">
            Build Better Teams.<br />
            Ship Great Projects Together.
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-ink-muted leading-relaxed">
            Stop searching randomly for teammates. DevCollab matches you with developers who have the exact
            skills, experience level, and availability your project needs using an intelligent MinHeap scoring engine.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link to="/register">
              <Button variant="accent" className="h-11 px-6 text-sm font-semibold shadow-xs">
                Create Free Account
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="h-11 px-6 text-sm font-semibold border border-border">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-16 bg-bg-subtle/50 border-y border-border px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
              The Complete Developer Teaming Workflow
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-ink-muted">
              From teammate discovery to live real-time execution in one cohesive platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-border bg-white p-8 shadow-xs space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-accent">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">Weighted Matching Engine</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Skill overlap (50%), experience level alignment (20%), availability (15%), and preferred roles (15%)
                are scored using an optimal MinHeap algorithm to surface top candidates.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-8 shadow-xs space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-accent">
                <FolderGit2 className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">Kanban Task Board & Chat</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Coordinate sprints directly inside each project with four-stage Kanban boards,
                integrated real-time Socket.IO chat, presence indicators, and live typing alerts.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-8 shadow-xs space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-accent">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">Reputation & GitHub Stats</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Connect GitHub repositories with cached telemetry, earn peer reviews on completed projects,
                and build verifiable collaboration reputation over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-8 text-center text-xs text-ink-muted">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 font-mono text-[11px]">
          <div>DevCollab &copy; {new Date().getFullYear()} — Built for Developers</div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:underline">Login</Link>
            <Link to="/register" className="hover:underline">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
