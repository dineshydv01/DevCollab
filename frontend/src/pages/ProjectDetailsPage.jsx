import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";
import Button from "../components/ui/Button.jsx";
import TaskBoard from "../components/project/TaskBoard.jsx";
import ProjectChat from "../components/project/ProjectChat.jsx";
import CandidateMatches from "../components/project/CandidateMatches.jsx";
import ProjectTeam from "../components/project/ProjectTeam.jsx";
import SubmitReviewModal from "../components/project/SubmitReviewModal.jsx";
import {
  FolderGit2,
  Users,
  Clock,
  Sparkles,
  MessageSquare,
  CheckSquare,
  Star,
  GitFork,
  AlertCircle,
  ExternalLink,
  Loader2,
  Send,
  Trash2,
  CheckCircle2,
  Archive,
  ArrowLeft,
  X,
} from "lucide-react";
import { GithubIcon } from "../components/ui/Icons.jsx";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview | tasks | chat | matches | team | reviews

  // Apply modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState("");

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Status update loading
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchProjectDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/projects/${id}`);
      const proj = res.data.data;
      setProject(proj);
      setError("");

      // Fetch GitHub info if repositoryUrl is provided
      if (proj.repositoryUrl) {
        setGithubLoading(true);
        api
          .get(`/projects/${id}/github`)
          .then((ghRes) => {
            setGithubData(ghRes.data.data);
          })
          .catch(() => {
            // Silently degrade if repo is not found or rate limited
          })
          .finally(() => {
            setGithubLoading(false);
          });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load project details");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-danger mb-3" />
        <h2 className="font-display text-xl font-bold text-ink">Project Not Found</h2>
        <p className="mt-2 text-sm text-ink-muted">{error || "This project does not exist or was deleted."}</p>
        <Link to="/projects" className="mt-6 inline-block">
          <Button variant="primary">Browse All Projects</Button>
        </Link>
      </div>
    );
  }

  const isOwner = (project.owner?._id || project.owner) === user?._id;
  const isMember = project.members?.some(
    (m) => (m.user?._id || m.user) === user?._id && m.status === "active"
  );
  const canAccessTeamFeatures = isOwner || isMember;

  const handleApply = async (e) => {
    e.preventDefault();
    setIsApplying(true);
    try {
      await api.post(`/projects/${id}/apply`, {
        message: applyMessage.trim(),
      });
      setApplySuccess("Application submitted successfully!");
      setIsApplyModalOpen(false);
      setApplyMessage("");
      setTimeout(() => setApplySuccess(""), 5000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit application");
    } finally {
      setIsApplying(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change project status to ${newStatus}?`)) return;
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/projects/${id}/status`, { status: newStatus });
      await fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update project status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm("Are you sure? This will permanently delete the project and all associated tasks, messages, and requests.")) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete project");
    }
  };

  // Teammates eligible for reviews
  const eligibleTeammates = [
    ...(isOwner ? [] : [project.owner]),
    ...project.members
      .filter((m) => m.status === "active" && (m.user?._id || m.user) !== user?._id)
      .map((m) => m.user),
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {applySuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-xs font-semibold text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{applySuccess}</span>
        </div>
      )}

      {/* Project Banner Header */}
      <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md bg-bg-subtle px-2.5 py-1 font-mono text-xs font-medium text-ink-muted">
                {project.category}
              </span>
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
              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-link uppercase">
                {project.difficulty}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
              {project.title}
            </h1>

            <p className="font-mono text-xs text-ink-muted">
              Project Lead:{" "}
              <Link to={`/profile/${project.owner?._id}`} className="font-semibold text-ink hover:underline">
                {project.owner?.fullName}
              </Link>{" "}
              (@{project.owner?.username}) &bull; Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            {!isOwner && !isMember && (
              <Button
                variant="accent"
                onClick={() => setIsApplyModalOpen(true)}
                disabled={project.status === "Completed" || project.status === "Archived"}
              >
                <Send className="h-4 w-4 mr-1.5" />
                Apply to Join Team
              </Button>
            )}

            {isOwner && (
              <>
                {project.status !== "Completed" && (
                  <Button
                    variant="ghost"
                    onClick={() => handleStatusChange("Completed")}
                    disabled={isUpdatingStatus}
                    className="border border-border text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1 text-success" />
                    Mark Completed
                  </Button>
                )}

                {project.status !== "Archived" && (
                  <Button
                    variant="ghost"
                    onClick={() => handleStatusChange("Archived")}
                    disabled={isUpdatingStatus}
                    className="border border-border text-xs"
                  >
                    <Archive className="h-4 w-4 mr-1 text-ink-muted" />
                    Archive
                  </Button>
                )}

                <button
                  onClick={handleDeleteProject}
                  className="rounded-lg border border-red-200 bg-white p-2.5 text-danger hover:bg-red-50 transition-colors"
                  title="Delete Project (Cascade)"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}

            {canAccessTeamFeatures && project.status === "Completed" && (
              <Button variant="accent" onClick={() => setIsReviewModalOpen(true)}>
                <Star className="h-4 w-4 mr-1.5 fill-accent-ink" />
                Review Teammates
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-semibold transition-colors ${
              activeTab === "overview" ? "bg-ink text-white" : "text-ink-muted hover:bg-bg-subtle"
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "team" ? "bg-ink text-white" : "text-ink-muted hover:bg-bg-subtle"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Team ({project.members?.length + 1}/{project.teamSize})</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setActiveTab("matches")}
              className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "matches" ? "bg-ink text-white" : "text-ink-muted hover:bg-bg-subtle"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Matching Candidates</span>
            </button>
          )}

          {canAccessTeamFeatures && (
            <>
              <button
                onClick={() => setActiveTab("tasks")}
                className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === "tasks" ? "bg-ink text-white" : "text-ink-muted hover:bg-bg-subtle"
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Task Board</span>
              </button>

              <button
                onClick={() => setActiveTab("chat")}
                className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === "chat" ? "bg-ink text-white" : "text-ink-muted hover:bg-bg-subtle"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Team Chat</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Description */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-xs">
              <h3 className="font-display text-base font-bold text-ink mb-4">About the Project</h3>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>

              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider mb-3">
                  Required Technical Stack
                </h4>
                <div className="flex flex-wrap gap-2">
                  {project.requiredSkills?.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-bg-subtle border border-border px-3 py-1 font-mono text-xs font-medium text-ink"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {project.preferredRoles?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider mb-3">
                    Preferred Roles Needed
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {project.preferredRoles.map((role) => (
                      <span
                        key={role}
                        className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-medium text-link"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Info Cards */}
          <div className="space-y-6">
            {/* Project Quick Specs */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-xs space-y-4">
              <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
                Project Parameters
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-ink-muted">Team Capacity</span>
                  <span className="font-mono font-semibold text-ink">
                    {(project.members?.length || 0) + 1} / {project.teamSize} members
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-ink-muted">Expected Duration</span>
                  <span className="font-semibold text-ink">{project.duration || "Flexible"}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-ink-muted">Difficulty Level</span>
                  <span className="font-semibold text-ink">{project.difficulty}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Status</span>
                  <span className="font-mono font-semibold text-ink">{project.status}</span>
                </div>
              </div>
            </div>

            {/* GitHub Repository Live Stats Card */}
            {project.repositoryUrl && (
              <div className="rounded-2xl border border-border bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                    <GithubIcon className="h-4 w-4" />
                    GitHub Repository
                  </h3>
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link hover:underline text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {githubLoading ? (
                  <div className="py-4 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-ink-muted" />
                  </div>
                ) : githubData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-bg-subtle p-2">
                        <span className="text-[10px] text-ink-muted block">Stars</span>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          <strong className="font-mono text-xs">{githubData.stars || 0}</strong>
                        </div>
                      </div>

                      <div className="rounded-xl bg-bg-subtle p-2">
                        <span className="text-[10px] text-ink-muted block">Forks</span>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <GitFork className="h-3 w-3 text-ink-muted" />
                          <strong className="font-mono text-xs">{githubData.forks || 0}</strong>
                        </div>
                      </div>

                      <div className="rounded-xl bg-bg-subtle p-2">
                        <span className="text-[10px] text-ink-muted block">Issues</span>
                        <strong className="font-mono text-xs mt-0.5 block">
                          {githubData.openIssues || 0}
                        </strong>
                      </div>
                    </div>

                    {githubData.language && (
                      <p className="text-xs text-ink-muted">
                        Primary Language: <strong className="text-ink">{githubData.language}</strong>
                      </p>
                    )}

                    {githubData.lastCommit && (
                      <div className="pt-2 border-t border-border/60 text-[11px] text-ink-muted">
                        <span className="block font-medium text-ink truncate">
                          "{githubData.lastCommit.message}"
                        </span>
                        <span className="font-mono text-[10px]">
                          By {githubData.lastCommit.author} &bull;{" "}
                          {new Date(githubData.lastCommit.date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">
                    Repository stats currently unavailable or private.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "team" && (
        <ProjectTeam
          projectId={project._id}
          isOwner={isOwner}
          ownerUser={project.owner}
          onTeamUpdated={fetchProjectDetails}
        />
      )}

      {activeTab === "matches" && isOwner && (
        <CandidateMatches projectId={project._id} />
      )}

      {activeTab === "tasks" && canAccessTeamFeatures && (
        <TaskBoard
          projectId={project._id}
          isOwner={isOwner}
          teamMembers={project.members}
        />
      )}

      {activeTab === "chat" && canAccessTeamFeatures && (
        <ProjectChat projectId={project._id} />
      )}

      {/* Application Dialog */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink">
                Apply to Join "{project.title}"
              </h3>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <p className="text-xs text-ink-muted">
                Your profile skills and experience will be submitted to the project lead for review.
              </p>

              <div>
                <label className="text-sm font-medium text-ink block mb-1">
                  Intro Note / Why you want to contribute (Optional)
                </label>
                <textarea
                  rows={3}
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="I have experience with React and would love to build the frontend task board..."
                  maxLength={500}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsApplyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" disabled={isApplying}>
                  {isApplying ? "Submitting..." : "Send Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <SubmitReviewModal
          projectId={project._id}
          eligibleTeammates={eligibleTeammates}
          onClose={() => setIsReviewModalOpen(false)}
          onReviewSubmitted={() => {
            alert("Peer review recorded successfully! Ratings have been updated.");
          }}
        />
      )}
    </div>
  );
}
