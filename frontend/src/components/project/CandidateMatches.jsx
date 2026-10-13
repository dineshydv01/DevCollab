import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api.js";
import Button from "../ui/Button.jsx";
import {
  Sparkles,
  Award,
  Clock,
  Send,
  Loader2,
  CheckCircle,
  X,
  ExternalLink,
} from "lucide-react";

export default function CandidateMatches({ projectId }) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [inviteModalUser, setInviteModalUser] = useState(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");

  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/matches?limit=10`);
      setMatches(res.data.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load matching candidates");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteModalUser) return;

    setIsInviting(true);
    try {
      await api.post(`/projects/${projectId}/invite`, {
        userId: inviteModalUser.user._id,
        message: inviteMessage.trim(),
      });
      setInviteSuccess(`Invitation sent to ${inviteModalUser.user.fullName}!`);
      setInviteModalUser(null);
      setInviteMessage("");
      setTimeout(() => setInviteSuccess(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Top Matching Candidates
          </h3>
          <p className="text-xs text-ink-muted">
            Algorithmically scored via MinHeap based on skills, experience level, availability, and preferred roles
          </p>
        </div>
      </div>

      {inviteSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-xs font-semibold text-success flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{inviteSuccess}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-danger">
          {error}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center text-xs text-ink-muted">
          No matching candidates available right now. Other developers may already be members or have pending invites.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((item) => {
            const candidate = item.user;

            return (
              <div
                key={candidate._id}
                className="rounded-2xl border border-border bg-white p-5 shadow-2xs hover:border-ink/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {candidate.profileImage ? (
                        <img
                          src={candidate.profileImage}
                          alt=""
                          className="h-10 w-10 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-bold text-xs text-white">
                          {candidate.fullName?.charAt(0) || "D"}
                        </div>
                      )}
                      <div>
                        <Link
                          to={`/profile/${candidate._id}`}
                          className="font-display text-sm font-bold text-ink hover:text-link transition-colors inline-flex items-center gap-1"
                        >
                          {candidate.fullName}
                          <ExternalLink className="h-3 w-3 text-ink-muted" />
                        </Link>
                        <p className="font-mono text-xs text-ink-muted">@{candidate.username}</p>
                      </div>
                    </div>

                    {/* Match Score Badge */}
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 font-mono text-xs font-bold text-accent-ink">
                        <span>{item.matchScore}%</span>
                        <span className="text-[10px] font-normal text-ink-muted">Match</span>
                      </div>
                    </div>
                  </div>

                  {/* Score Breakdown Pill Bar */}
                  <div className="mt-3.5 grid grid-cols-4 gap-1.5 rounded-xl bg-bg-subtle p-2 text-center font-mono text-[10px]">
                    <div>
                      <span className="text-ink-muted block text-[9px] uppercase">Skills</span>
                      <strong className="text-ink">{item.skillScore}/50</strong>
                    </div>
                    <div>
                      <span className="text-ink-muted block text-[9px] uppercase">Level</span>
                      <strong className="text-ink">{item.experienceScore}/20</strong>
                    </div>
                    <div>
                      <span className="text-ink-muted block text-[9px] uppercase">Avail</span>
                      <strong className="text-ink">{item.availabilityScore}/15</strong>
                    </div>
                    <div>
                      <span className="text-ink-muted block text-[9px] uppercase">Role</span>
                      <strong className="text-ink">{item.roleScore}/15</strong>
                    </div>
                  </div>

                  {/* Matched Skills */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {item.matchedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800"
                        >
                          &check; {skill}
                        </span>
                      ))}
                      {item.missingSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-500"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-ink-muted">
                    {candidate.experienceLevel} &bull; {candidate.availability} hrs/wk
                  </span>

                  <button
                    onClick={() => setInviteModalUser(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink/90 transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    Invite
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {inviteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink">
                Invite {inviteModalUser.user.fullName} to Team
              </h3>
              <button
                onClick={() => setInviteModalUser(null)}
                className="text-ink-muted hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <p className="text-xs text-ink-muted">
                Send a personalized invitation message. The candidate has a{" "}
                <strong className="text-ink">{inviteModalUser.matchScore}%</strong> compatibility score.
              </p>

              <div>
                <label className="text-sm font-medium text-ink block mb-1">
                  Invitation Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Hey, we'd love for you to join our project to work on..."
                  className="w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  maxLength={500}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInviteModalUser(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" disabled={isInviting}>
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
