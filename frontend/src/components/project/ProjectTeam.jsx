import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api.js";
import Button from "../ui/Button.jsx";
import {
  Users,
  Shield,
  UserX,
  Edit2,
  Check,
  X,
  Loader2,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function ProjectTeam({ projectId, isOwner, ownerUser, onTeamUpdated }) {
  const [team, setTeam] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState("members"); // 'members' | 'applications'
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleInput, setRoleInput] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchTeamData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [teamRes, appsRes] = await Promise.all([
        api.get(`/projects/${projectId}/team`),
        isOwner ? api.get(`/projects/${projectId}/applications?limit=50`) : Promise.resolve({ data: { data: [] } }),
      ]);
      setTeam(teamRes.data.data?.members || []);
      setApplications(appsRes.data.data || []);
    } catch (err) {
      console.error("Failed to load team data", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isOwner]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleUpdateRole = async (userId) => {
    try {
      await api.put(`/projects/${projectId}/team/${userId}/role`, {
        role: roleInput.trim(),
      });
      setEditingRoleId(null);
      fetchTeamData();
      onTeamUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update role");
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;
    try {
      await api.delete(`/projects/${projectId}/team/${userId}`);
      fetchTeamData();
      onTeamUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleApplicationAction = async (requestId, action) => {
    setActionLoading(requestId);
    try {
      await api.put(`/applications/${requestId}/${action}`);
      await fetchTeamData();
      onTeamUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  const pendingApps = applications.filter((a) => a.status === "pending");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-3 font-display text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "members"
              ? "border-ink text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Active Team Members ({team.length + 1})
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab("applications")}
            className={`pb-3 font-display text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "applications"
                ? "border-ink text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            <span>Applications & Requests</span>
            {pendingApps.length > 0 && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-ink">
                {pendingApps.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Members List */}
      {activeTab === "members" && (
        <div className="space-y-3">
          {/* Owner Card */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              {ownerUser?.profileImage ? (
                <img
                  src={ownerUser.profileImage}
                  alt=""
                  className="h-10 w-10 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-bold text-sm text-white">
                  {ownerUser?.fullName?.charAt(0) || "O"}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${ownerUser?._id || ownerUser}`}
                    className="font-display text-sm font-bold text-ink hover:underline flex items-center gap-1"
                  >
                    {ownerUser?.fullName}
                    <ExternalLink className="h-3 w-3 text-ink-muted" />
                  </Link>
                  <span className="rounded bg-accent/20 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-ink">
                    Project Lead
                  </span>
                </div>
                <p className="font-mono text-xs text-ink-muted">@{ownerUser?.username}</p>
              </div>
            </div>
            <span className="text-xs text-ink-muted font-medium">Founder</span>
          </div>

          {/* Regular Members */}
          {team.map((member) => {
            const memberUser = member.user;
            const isEditing = editingRoleId === memberUser?._id;

            return (
              <div
                key={memberUser?._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-white p-4 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  {memberUser?.profileImage ? (
                    <img
                      src={memberUser.profileImage}
                      alt=""
                      className="h-10 w-10 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-bold text-sm text-white">
                      {memberUser?.fullName?.charAt(0) || "M"}
                    </div>
                  )}
                  <div>
                    <Link
                      to={`/profile/${memberUser?._id}`}
                      className="font-display text-sm font-bold text-ink hover:underline flex items-center gap-1"
                    >
                      {memberUser?.fullName}
                      <ExternalLink className="h-3 w-3 text-ink-muted" />
                    </Link>
                    <p className="font-mono text-xs text-ink-muted">@{memberUser?.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value)}
                        placeholder="e.g. Frontend Dev"
                        className="rounded-md border border-border px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
                      />
                      <button
                        onClick={() => handleUpdateRole(memberUser._id)}
                        className="rounded bg-success p-1 text-white hover:bg-success/90"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingRoleId(null)}
                        className="rounded border border-border p-1 text-ink-muted hover:bg-bg-subtle"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-bg-subtle px-2 py-0.5 font-mono text-xs font-medium text-ink">
                        {member.role || "Contributor"}
                      </span>
                      {isOwner && (
                        <button
                          onClick={() => {
                            setEditingRoleId(memberUser._id);
                            setRoleInput(member.role || "");
                          }}
                          className="text-ink-muted hover:text-ink p-1"
                          title="Change Role"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {isOwner && (
                    <button
                      onClick={() => handleRemoveMember(memberUser._id, memberUser.fullName)}
                      className="rounded-lg p-1 text-ink-muted hover:text-danger hover:bg-red-50 transition-colors"
                      title="Remove Member"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Applications & Requests Tab (Owner Only) */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-xs text-ink-muted">
              No collaboration requests or applications on record for this project.
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-white shadow-2xs overflow-hidden">
              {applications.map((app) => (
                <div key={app._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-ink">
                        {app.applicant?.fullName}
                      </span>
                      <span className="font-mono text-xs text-ink-muted">
                        @{app.applicant?.username}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold uppercase ${
                          app.type === "application"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {app.type}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold uppercase ${
                          app.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : app.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    {app.message && (
                      <p className="mt-1 text-xs text-ink-muted italic">"{app.message}"</p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1">
                      {app.applicant?.skills?.map((s) => (
                        <span key={s} className="rounded bg-bg-subtle px-1.5 py-0.2 font-mono text-[9px] text-ink">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {app.status === "pending" && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {app.type === "application" ? (
                        <>
                          <button
                            onClick={() => handleApplicationAction(app._id, "accept")}
                            disabled={actionLoading === app._id}
                            className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white hover:bg-success/90 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleApplicationAction(app._id, "reject")}
                            disabled={actionLoading === app._id}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg-subtle disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                            Decline
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleApplicationAction(app._id, "cancel")}
                          disabled={actionLoading === app._id}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-50"
                        >
                          Cancel Invite
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
