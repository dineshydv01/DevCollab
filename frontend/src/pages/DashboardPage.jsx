import { useAuth } from "../hooks/useAuth.js";
import Button from "../components/ui/Button.jsx";

// Phase F1 placeholder — proves register -> login -> protected route ->
// logout works end to end. Real dashboard content (recommended
// projects, pending requests, etc.) arrives in Phase F2.
export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Welcome back, {user?.fullName?.split(" ")[0]}.
        </h1>
        <Button variant="ghost" onClick={logout}>
          Log out
        </Button>
      </div>
      <p className="mt-2 font-mono text-sm text-ink-muted">@{user?.username}</p>
      <div className="mt-8 rounded-md border border-border bg-bg-subtle p-6">
        <p className="text-sm text-ink-muted">
          This is a placeholder. Recommended projects, your applications, and notifications will
          appear here in Phase F2.
        </p>
      </div>
    </div>
  );
}
