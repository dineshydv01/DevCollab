import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import {
  Users,
  Search,
  Star,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [page, setPage] = useState(1);

  const fetchDevelopers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/users?page=${page}&limit=12`);
      let list = res.data.data || [];

      if (search.trim()) {
        const query = search.toLowerCase();
        list = list.filter(
          (u) =>
            u.fullName?.toLowerCase().includes(query) ||
            u.username?.toLowerCase().includes(query) ||
            u.skills?.some((s) => s.toLowerCase().includes(query))
        );
      }

      if (levelFilter !== "All") {
        list = list.filter((u) => u.experienceLevel === levelFilter);
      }

      setDevelopers(list);
      setMeta({
        page: res.data.page || 1,
        totalPages: res.data.totalPages || 1,
        total: res.data.total || 0,
      });
    } catch (err) {
      console.error("Failed to load developers", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, levelFilter]);

  useEffect(() => {
    fetchDevelopers();
  }, [fetchDevelopers]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Developer Directory</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Connect with builders, engineers, and designers open to team collaborations
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-border bg-white p-4 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by developer name, username, or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg-subtle pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:bg-white focus:outline-none"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink focus:border-ink focus:outline-none"
        >
          <option value="All">All Experience Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      {/* Developers Grid */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        </div>
      ) : developers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center text-xs text-ink-muted">
          No developers found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {developers.map((dev) => (
            <div
              key={dev._id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-xs hover:border-ink/30 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    {dev.profileImage ? (
                      <img
                        src={dev.profileImage}
                        alt=""
                        className="h-12 w-12 rounded-2xl border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink font-display text-lg font-bold text-white">
                        {dev.fullName?.charAt(0) || "D"}
                      </div>
                    )}
                    <div>
                      <Link
                        to={`/profile/${dev._id}`}
                        className="font-display text-base font-bold text-ink group-hover:text-link transition-colors block"
                      >
                        {dev.fullName}
                      </Link>
                      <span className="font-mono text-xs text-ink-muted">@{dev.username}</span>
                    </div>
                  </div>

                  <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-link uppercase">
                    {dev.experienceLevel}
                  </span>
                </div>

                {dev.bio && (
                  <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed mb-4">
                    {dev.bio}
                  </p>
                )}

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5">
                  {dev.skills?.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      className="rounded bg-bg-subtle border border-border/70 px-2 py-0.5 font-mono text-[10px] text-ink font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {dev.skills?.length > 5 && (
                    <span className="font-mono text-[10px] text-ink-muted self-center">
                      +{dev.skills.length - 5}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-ink-muted">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    {dev.rating > 0 ? dev.rating.toFixed(1) : "N/A"}
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono">{dev.availability || 0} hrs/wk</span>
                </div>

                <Link
                  to={`/profile/${dev._id}`}
                  className="font-semibold text-link group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1"
                >
                  View Profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="font-mono text-xs text-ink-muted">
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40 hover:bg-bg-subtle"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page >= meta.totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40 hover:bg-bg-subtle"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
