import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../services/api.js";
import Button from "../components/ui/Button.jsx";
import {
  FolderGit2,
  Users,
  Clock,
  PlusCircle,
  ArrowRight,
  Check,
  X,
  AlertCircle,
  Loader2,
  Send,
  Inbox,
  Star,
  ExternalLink,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [joinedProjects, setJoinedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqsRes, projectsRes] = await Promise.all([
        api.get("/applications/me?limit=50"),
        api.get("/projects?limit=50"),
      ]);

      const allReqs = reqsRes.data.data || [];
      setRequests(allReqs);

      const allProjects = projectsRes.data.data || [];
      const currentUserId = user?._id;

      // Filter projects owned by current user
      const owned = allProjects.filter(
        (p) => (p.owner?._id || p.owner) === currentUserId
      );
      setMyProjects(owned);

      // Filter projects where current user is an active member
      const joined = allProjects.filter(
        (p) =>
          (p.owner?._id || p.owner) !== currentUserId &&
          p.members?.some(
            (m) => (m.user?._id || m.user) === currentUserId && m.status === "active"
          )
      );
      setJoinedProjects(joined);
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequestAction = async (requestId, action) => {
    setActionLoading(requestId);
    setActionError("");
    try {
      await api.put(`/applications/${requestId}/${action}`);
      await fetchData();
    } catch (err) {
      setActionError(err.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRequestsForMe = requests.filter((r) => {
    if (r.status !== "pending") return false;
    const isOwner = (r.owner?._id || r.owner) === user?._id;
    const isApplicant = (r.applicant?._id || r.applicant) === user?._id;

    // As owner: applications sent to my projects awaiting my decision
    if (isOwner && r.type === "application") return true;
    // As developer: invitations sent to me awaiting my decision
    if (isApplicant && r.type === "invitation") return true;
    return false;
  });

  const myOutgoingPending = requests.filter((r) => {
    if (r.status !== "pending") return false;
    const isOwner = (r.owner?._id || r.owner) === user?._id;
    const isApplicant = (r.applicant?._id || r.applicant) === user?._id;

    // Outgoing applications from me
    if (isApplicant && r.type === "application") return true;
    // Outgoing invitations sent by me
    if (isOwner && r.type === "invitation") return true;
    return false;
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-xs">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Welcome back, {user?.fullName?.split(" ")[0]}.
          </h1>
          <p className="mt-1 font-mono text-xs sm:text-sm text-ink-muted">
            @{user?.username} &bull; {user?.experienceLevel || "Developer"} &bull; {user?.availability || 0} hrs/week
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/profile">
            <Button variant="ghost" className="border border-border">
              View Profile
            </Button>
          </Link>
          <Link to="/projects/new">
            <Button variant="accent">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
          <span className="font-mono text-xs text-ink-muted uppercase">Created Projects</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold text-ink">{myProjects.length}</span>
            <FolderGit2 className="h-5 w-5 text-accent" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
          <span className="font-mono text-xs text-ink-muted uppercase">Collaborations</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold text-ink">{joinedProjects.length}</span>
            <Users className="h-5 w-5 text-link" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
          <span className="font-mono text-xs text-ink-muted uppercase">Pending Requests</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold text-ink">{pendingRequestsForMe.length}</span>
            <Inbox className="h-5 w-5 text-amber-600" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
          <span className="font-mono text-xs text-ink-muted uppercase">Reputation</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold text-ink">
              {user?.rating ? user.rating.toFixed(1) : "5.0"}
            </span>
            <Star className="h-5 w-5 fill-accent text-accent" />
          </div>
        </div>
      </div>

      {/* Actionable Requests (Incoming & Needs Attention) */}
      {pendingRequestsForMe.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Inbox className="h-5 w-5 text-accent-ink" />
            <h2 className="font-display text-base font-bold text-ink">
              Action Required ({pendingRequestsForMe.length} Collaboration Requests)
            </h2>
          </div>

          <div className="divide-y divide-amber-200/60 bg-white rounded-xl border border-amber-200/80 shadow-2xs overflow-hidden">
            {pendingRequestsForMe.map((req) => (
              <div key={req._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-ink">
                      {req.type === "application" ? (
                        <>
                          <span className="font-semibold">{req.applicant?.fullName}</span> wants to join{" "}
                          <span className="font-semibold text-link">{req.project?.title}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{req.owner?.fullName}</span> invited you to join{" "}
                          <span className="font-semibold text-link">{req.project?.title}</span>
                        </>
                      )}
                    </span>
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-ink uppercase">
                      {req.type}
                    </span>
                  </div>
                  {req.message && (
                    <p className="mt-1 text-xs text-ink-muted italic">"{req.message}"</p>
                  )}
                  <span className="font-mono text-[10px] text-ink-muted mt-1 block">
                    Received {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRequestAction(req._id, "accept")}
                    disabled={actionLoading === req._id}
                    className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white hover:bg-success/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRequestAction(req._id, "reject")}
                    disabled={actionLoading === req._id}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg-subtle transition-colors disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Sections: My Projects & Team Collaborations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-ink" />
              Projects You Lead
            </h2>
            <Link to="/projects/new" className="text-xs font-semibold text-link hover:underline">
              + New Project
            </Link>
          </div>

          {myProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
              <FolderGit2 className="mx-auto h-8 w-8 text-ink-muted/50 mb-3" />
              <p className="text-sm font-medium text-ink">You haven't created any projects yet</p>
              <p className="text-xs text-ink-muted mt-1 mb-4">
                Start a project and find matched developers using our algorithmic scoring.
              </p>
              <Link to="/projects/new">
                <Button variant="accent" className="text-xs">Create First Project</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myProjects.map((project) => (
                <div
                  key={project._id}
                  className="rounded-xl border border-border bg-white p-5 shadow-2xs hover:border-ink/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/projects/${project._id}`}
                        className="font-display text-base font-semibold text-ink hover:text-link transition-colors"
                      >
                        {project.title}
                      </Link>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                          project.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : project.status === "Recruiting"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-ink-muted line-clamp-2">
                      {project.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.requiredSkills?.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="rounded bg-bg-subtle px-2 py-0.5 font-mono text-[10px] text-ink"
                        >
                          {skill}
                        </span>
                      ))}
                      {project.requiredSkills?.length > 4 && (
                        <span className="font-mono text-[10px] text-ink-muted self-center">
                          +{project.requiredSkills.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="font-mono text-ink-muted">
                      Team: {project.members?.length + 1}/{project.teamSize}
                    </span>
                    <Link
                      to={`/projects/${project._id}`}
                      className="font-semibold text-link hover:underline flex items-center gap-1"
                    >
                      Manage Team & Tasks
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Joined Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <Users className="h-5 w-5 text-ink" />
              Active Collaborations
            </h2>
            <Link to="/projects" className="text-xs font-semibold text-link hover:underline">
              Browse More
            </Link>
          </div>

          {joinedProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-ink-muted/50 mb-3" />
              <p className="text-sm font-medium text-ink">You are not in any teams yet</p>
              <p className="text-xs text-ink-muted mt-1 mb-4">
                Browse open projects seeking your skills and submit an application.
              </p>
              <Link to="/projects">
                <Button variant="primary" className="text-xs">Discover Open Projects</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {joinedProjects.map((project) => (
                <div
                  key={project._id}
                  className="rounded-xl border border-border bg-white p-5 shadow-2xs hover:border-ink/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/projects/${project._id}`}
                        className="font-display text-base font-semibold text-ink hover:text-link transition-colors"
                      >
                        {project.title}
                      </Link>
                      <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-link uppercase">
                        Member
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-ink-muted line-clamp-2">
                      {project.description}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
                      <span>Owner: <strong className="text-ink">{project.owner?.fullName}</strong></span>
                      <span>&bull;</span>
                      <span>Difficulty: <strong className="text-ink">{project.difficulty}</strong></span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="font-mono text-ink-muted">
                      Status: {project.status}
                    </span>
                    <Link
                      to={`/projects/${project._id}`}
                      className="font-semibold text-link hover:underline flex items-center gap-1"
                    >
                      Open Workspace
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outgoing Requests Tracked */}
      {myOutgoingPending.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Send className="h-4 w-4 text-ink-muted" />
            <h3 className="font-display text-sm font-semibold text-ink">
              Sent Requests Awaiting Response ({myOutgoingPending.length})
            </h3>
          </div>

          <div className="divide-y divide-border">
            {myOutgoingPending.map((req) => (
              <div key={req._id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-ink">
                    {req.type === "application" ? "Application to" : "Invitation to"}{" "}
                    <strong className="text-ink">{req.project?.title}</strong>
                  </span>
                  <span className="ml-2 font-mono text-[10px] text-ink-muted">
                    Sent on {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-800">
                    Pending
                  </span>
                  <button
                    onClick={() => handleRequestAction(req._id, "cancel")}
                    disabled={actionLoading === req._id}
                    className="text-xs text-danger hover:underline font-medium disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
