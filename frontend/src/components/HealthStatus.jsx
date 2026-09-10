import { useEffect, useState } from "react";
import { api } from "../services/api";

// Purpose for Phase 1 ONLY: prove the full chain works —
// React -> Axios -> Express -> MongoDB -> back to React.
// This component will be deleted/replaced once real pages exist.
export default function HealthStatus() {
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let isMounted = true;

    api
      .get("/health")
      .then((res) => {
        if (!isMounted) return;
        setStatus("ok");
        setDetails(res.data.data);
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      {status === "loading" && (
        <p className="text-slate-500">Checking backend connection…</p>
      )}
      {status === "error" && (
        <p className="text-red-600">
          Unable to reach the API. Is the backend server running on port 5000?
        </p>
      )}
      {status === "ok" && details && (
        <div className="space-y-1">
          <p className="font-medium text-emerald-600">Backend connected ✓</p>
          <p className="text-slate-600">Database: {details.database}</p>
          <p className="text-slate-600">Uptime: {details.uptimeSeconds}s</p>
        </div>
      )}
    </div>
  );
}
