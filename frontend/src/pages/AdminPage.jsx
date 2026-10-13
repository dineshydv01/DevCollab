import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { Navigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import {
  Shield,
  Users,
  FolderGit2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  UserX,
  UserCheck,
  Loader2,
  TrendingUp,
} from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [activeTab, setActiveTab] = useState("stats"); // stats | users | projects | reports
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, projRes, reportsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users?limit=50"),
        api.get("/admin/projects?limit=50"),
        api.get("/admin/reports?limit=50"),
      ]);

      setStats(statsRes.data.data);
      setUsersList(usersRes.data.data || []);
      setProjectsList(projRes.data.data || []);
      setReportsList(reportsRes.data.data || []);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleToggleSuspend = async (targetUser) => {
    const action = targetUser.isSuspended ? "restore" : "suspend";
    if (!window.confirm(`Are you sure you want to ${action} user @${targetUser.username}?`)) return;

    setActionLoading(targetUser._id);
    try {
      await api.put(`/admin/users/${targetUser._id}/${action}`);
      await fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveProject = async (projectId, projectTitle) => {
    if (!window.confirm(`Delete project "${projectTitle}" permanently with cascade?`)) return;

    setActionLoading(projectId);
    try {
      await api.delete(`/admin/projects/${projectId}`);
      await fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove project");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportAction = async (reportId, action) => {
    setActionLoading(reportId);
    try {
      await api.put(`/admin/reports/${reportId}/${action}`);
      await fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} report`);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-accent">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">
              Admin Platform Console
            </h1>
            <p className="text-xs text-ink-muted">
              Platform governance, moderation, telemetry, and security oversight
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("stats")}
          className={`pb-3 font-display text-sm font-semibold transition-colors border-b-2 -mb-px px-2 ${
            activeTab === "stats"
              ? "border-ink text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Telemetry & Stats
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 font-display text-sm font-semibold transition-colors border-b-2 -mb-px px-2 ${
            activeTab === "users"
              ? "border-ink text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Users ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`pb-3 font-display text-sm font-semibold transition-colors border-b-2 -mb-px px-2 ${
            activeTab === "projects"
              ? "border-ink text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Projects ({projectsList.length})
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 font-display text-sm font-semibold transition-colors border-b-2 -mb-px px-2 flex items-center gap-1.5 ${
            activeTab === "reports"
              ? "border-ink text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <span>Reports Queue</span>
          {reportsList.filter((r) => r.status === "pending").length > 0 && (
            <span className="rounded-full bg-danger px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
              {reportsList.filter((r) => r.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === "stats" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-2xs">
            <span className="font-mono text-xs text-ink-muted uppercase">Total Users</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-ink">{stats.totalUsers}</span>
              <Users className="h-5 w-5 text-link" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-ink-muted">
              Active: {stats.activeUsers} | Suspended: {stats.suspendedUsers}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-2xs">
            <span className="font-mono text-xs text-ink-muted uppercase">Total Projects</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-ink">{stats.totalProjects}</span>
              <FolderGit2 className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-ink-muted">
              Active: {stats.activeProjects} | Completed: {stats.completedProjects}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-2xs">
            <span className="font-mono text-xs text-ink-muted uppercase">Suspended Accounts</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-danger">{stats.suspendedUsers}</span>
              <UserX className="h-5 w-5 text-danger" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-ink-muted">
              Moderated developers
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-2xs">
            <span className="font-mono text-xs text-ink-muted uppercase">Reported Items</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-amber-600">{stats.reportedProjects}</span>
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-ink-muted">
              Items with pending reports
            </p>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-subtle/80 border-b border-border text-ink-muted font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Developer</th>
                  <th className="p-3.5">Username</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-bg-subtle/30">
                    <td className="p-3.5 font-medium text-ink">{u.fullName}</td>
                    <td className="p-3.5 font-mono text-ink-muted">@{u.username}</td>
                    <td className="p-3.5">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                          u.role === "admin"
                            ? "bg-accent/20 text-accent-ink"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {u.isSuspended ? (
                        <span className="rounded bg-red-100 px-2 py-0.5 font-mono text-[10px] font-bold text-danger">
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="rounded bg-green-100 px-2 py-0.5 font-mono text-[10px] font-bold text-success">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {u.role !== "admin" && u._id !== user._id && (
                        <button
                          onClick={() => handleToggleSuspend(u)}
                          disabled={actionLoading === u._id}
                          className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                            u.isSuspended
                              ? "bg-success text-white hover:bg-success/90"
                              : "border border-red-200 text-danger hover:bg-red-50"
                          }`}
                        >
                          {u.isSuspended ? "Restore" : "Suspend"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === "projects" && (
        <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-subtle/80 border-b border-border text-ink-muted font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Owner</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projectsList.map((p) => (
                  <tr key={p._id} className="hover:bg-bg-subtle/30">
                    <td className="p-3.5 font-medium text-ink max-w-[200px] truncate">{p.title}</td>
                    <td className="p-3.5 font-mono text-ink-muted">@{p.owner?.username}</td>
                    <td className="p-3.5 text-ink-muted">{p.category}</td>
                    <td className="p-3.5">
                      <span className="rounded bg-bg-subtle px-2 py-0.5 font-mono text-[10px] font-medium text-ink">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleRemoveProject(p._id, p.title)}
                        disabled={actionLoading === p._id}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          {reportsList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center text-xs text-ink-muted">
              No reports filed yet. The platform is clean!
            </div>
          ) : (
            reportsList.map((rep) => (
              <div
                key={rep._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-white p-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800 uppercase">
                      {rep.targetType} report
                    </span>
                    <span className="font-semibold text-xs text-ink">{rep.reason}</span>
                    <span
                      className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold uppercase ${
                        rep.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : rep.status === "resolved"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>

                  {rep.details && (
                    <p className="mt-1.5 text-xs text-ink-muted italic">"{rep.details}"</p>
                  )}
                </div>

                {rep.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReportAction(rep._id, "resolve")}
                      disabled={actionLoading === rep._id}
                      className="inline-flex items-center gap-1 rounded bg-success px-2.5 py-1 text-xs font-semibold text-white hover:bg-success/90"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Resolve
                    </button>
                    <button
                      onClick={() => handleReportAction(rep._id, "dismiss")}
                      disabled={actionLoading === rep._id}
                      className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-semibold text-ink hover:bg-bg-subtle"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
