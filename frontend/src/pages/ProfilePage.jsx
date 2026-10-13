import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";
import EditProfileModal from "../components/EditProfileModal.jsx";
import Button from "../components/ui/Button.jsx";
import {
  MapPin,
  Clock,
  Globe,
  Star,
  CheckCircle2,
  Edit3,
  Loader2,
  Award,
  MessageSquare,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "../components/ui/Icons.jsx";

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const isSelf = !id || id === currentUser?._id;

  const [profile, setProfile] = useState(isSelf ? currentUser : null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(!isSelf);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (isSelf) {
      setProfile(currentUser);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      api
        .get(`/users/${id}`)
        .then((res) => {
          setProfile(res.data.data);
          setError("");
        })
        .catch((err) => {
          setError(err.response?.data?.message || "Developer not found");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isSelf, currentUser]);

  useEffect(() => {
    const targetUserId = isSelf ? currentUser?._id : id;
    if (!targetUserId) return;

    setReviewsLoading(true);
    api
      .get(`/users/${targetUserId}/reviews`)
      .then((res) => {
        setReviews(res.data.data);
      })
      .catch(() => {
        // reviews might fail silently
      })
      .finally(() => {
        setReviewsLoading(false);
      });
  }, [id, isSelf, currentUser?._id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="font-display text-xl font-semibold text-ink">User Not Found</h2>
        <p className="mt-2 text-sm text-ink-muted">{error || "This developer profile does not exist or has been removed."}</p>
        <Link to="/developers" className="mt-6 inline-block">
          <Button variant="primary">Browse Developers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner / Card */}
      <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profile.fullName}
                className="h-24 w-24 rounded-2xl border border-border object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-ink font-display text-3xl font-bold text-white shadow-xs">
                {profile.fullName?.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold text-ink">{profile.fullName}</h1>
                <span className="font-mono text-sm text-ink-muted">@{profile.username}</span>
                {profile.role === "admin" && (
                  <span className="rounded bg-accent/20 px-2 py-0.5 font-mono text-xs font-semibold text-accent-ink">
                    ADMIN
                  </span>
                )}
              </div>

              {profile.bio && (
                <p className="mt-2.5 max-w-2xl text-sm text-ink-muted leading-relaxed">
                  {profile.bio}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
                {profile.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {profile.availability ?? 0} hrs/week availability
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  <Award className="h-3.5 w-3.5 text-accent" />
                  {profile.experienceLevel} Level
                </span>
              </div>
            </div>
          </div>

          {isSelf && (
            <Button
              variant="ghost"
              onClick={() => setIsEditModalOpen(true)}
              className="border border-border self-stretch sm:self-auto"
            >
              <Edit3 className="h-4 w-4 mr-1.5" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Stats Row */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-6">
          <div className="rounded-xl bg-bg-subtle p-3.5">
            <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider block">Rating</span>
            <div className="mt-1 flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-display text-lg font-bold text-ink">
                {profile.rating > 0 ? profile.rating.toFixed(1) : "N/A"}
              </span>
              <span className="text-xs text-ink-muted">({reviews.length})</span>
            </div>
          </div>

          <div className="rounded-xl bg-bg-subtle p-3.5">
            <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider block">Completed</span>
            <div className="mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-display text-lg font-bold text-ink">
                {profile.completedProjects || 0}
              </span>
              <span className="text-xs text-ink-muted">projects</span>
            </div>
          </div>

          <div className="rounded-xl bg-bg-subtle p-3.5">
            <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider block">Skills</span>
            <div className="mt-1 font-display text-lg font-bold text-ink">
              {profile.skills?.length || 0}
            </div>
          </div>

          <div className="rounded-xl bg-bg-subtle p-3.5">
            <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider block">Links</span>
            <div className="mt-2 flex items-center gap-3 text-ink-muted">
              {profile.githubUsername && (
                <a
                  href={`https://github.com/${profile.githubUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-ink transition-colors"
                  title={`GitHub: ${profile.githubUsername}`}
                >
                  <GithubIcon className="h-4 w-4" />
                </a>
              )}
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-link transition-colors"
                  title="LinkedIn"
                >
                  <LinkedinIcon className="h-4 w-4" />
                </a>
              )}
              {profile.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-ink transition-colors"
                  title="Portfolio"
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
              {!profile.githubUsername && !profile.linkedinUrl && !profile.portfolioUrl && (
                <span className="text-xs italic text-ink-muted">None specified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Skills & Roles */}
        <div className="space-y-6 md:col-span-1">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
            <h3 className="font-display text-sm font-semibold text-ink uppercase tracking-wider">
              Technical Skills
            </h3>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {profile.skills?.length > 0 ? (
                profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg bg-bg-subtle border border-border/80 px-2.5 py-1 font-mono text-xs font-medium text-ink"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-xs text-ink-muted italic">No skills listed</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
            <h3 className="font-display text-sm font-semibold text-ink uppercase tracking-wider">
              Preferred Roles
            </h3>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {profile.preferredRoles?.length > 0 ? (
                profile.preferredRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-medium text-link"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <p className="text-xs text-ink-muted italic">Open to all roles</p>
              )}
            </div>
          </div>

          {profile.interests?.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
              <h3 className="font-display text-sm font-semibold text-ink uppercase tracking-wider">
                Interests
              </h3>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-lg bg-bg-subtle px-2.5 py-1 text-xs text-ink-muted"
                  >
                    #{interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Reviews & Project Feedback */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-accent" />
                <h3 className="font-display text-base font-semibold text-ink">
                  Peer Reviews & Reputation
                </h3>
              </div>
              <span className="font-mono text-xs text-ink-muted">
                {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
              </span>
            </div>

            {reviewsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center text-sm text-ink-muted">
                No reviews recorded yet. Reviews are awarded by teammates when collaborative projects reach completion.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border space-y-4">
                {reviews.map((r) => (
                  <div key={r._id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        {r.reviewer?.profileImage ? (
                          <img
                            src={r.reviewer.profileImage}
                            alt={r.reviewer.fullName}
                            className="h-8 w-8 rounded-full border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs text-white">
                            {r.reviewer?.fullName?.charAt(0) || "U"}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-ink">{r.reviewer?.fullName}</p>
                          <p className="text-[11px] text-ink-muted">
                            Project: <span className="font-medium text-ink">{r.project?.title}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 border border-amber-200">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        <span className="font-mono text-xs font-bold text-ink">{r.rating}</span>
                      </div>
                    </div>

                    {r.comment && (
                      <p className="text-xs text-ink-muted italic pl-10">"{r.comment}"</p>
                    )}

                    {/* Breakdown pill tags */}
                    <div className="flex flex-wrap gap-2 pl-10 pt-1 text-[10px] font-mono text-ink-muted">
                      {r.technicalSkills && <span>Tech: {r.technicalSkills}/5</span>}
                      {r.communication && <span>Comm: {r.communication}/5</span>}
                      {r.teamwork && <span>Team: {r.teamwork}/5</span>}
                      {r.reliability && <span>Reliability: {r.reliability}/5</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <EditProfileModal onClose={() => setIsEditModalOpen(false)} />
      )}
    </div>
  );
}
