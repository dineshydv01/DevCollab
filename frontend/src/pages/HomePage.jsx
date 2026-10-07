import { Link } from "react-router-dom";
import Button from "../components/ui/Button.jsx";

// Minimal placeholder — the real marketing landing page (hero,
// features, matching algorithm explainer, etc. per spec section 30)
// arrives in Phase F2.
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink">DevCollab</h1>
      <p className="max-w-md text-ink-muted">
        Developer project collaboration & team matching platform. Landing page coming in Phase F2.
      </p>
      <div className="flex gap-3">
        <Link to="/login">
          <Button variant="ghost">Log in</Button>
        </Link>
        <Link to="/register">
          <Button variant="accent">Create account</Button>
        </Link>
      </div>
    </div>
  );
}
