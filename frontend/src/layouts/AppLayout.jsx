import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink selection:bg-accent/30 selection:text-ink">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-white py-6 text-center text-xs text-ink-muted">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 font-mono text-[11px]">
          <div>DevCollab &copy; {new Date().getFullYear()} — Developer Project Collaboration & Matching</div>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
              API Online
            </span>
            <span>REST &bull; Socket.IO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
