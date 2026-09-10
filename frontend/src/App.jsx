import HealthStatus from "./components/HealthStatus";

// Phase 1 placeholder. React Router and real pages arrive in later
// phases (Landing, Login, Dashboard, etc. per spec section 29).
export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900">DevCollab</h1>
        <p className="text-slate-500">Developer Project Collaboration & Team Matching Platform</p>
      </div>
      <div className="w-full max-w-sm">
        <HealthStatus />
      </div>
    </main>
  );
}
