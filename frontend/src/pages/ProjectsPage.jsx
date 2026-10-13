import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import Button from "../components/ui/Button.jsx";
import {
  Search,
  Filter,
  PlusCircle,
  FolderGit2,
  Users,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
} from "lucide-react";

const CATEGORIES = [
  "All",
  "Web Development",
  "Mobile Development",
  "AI/ML",
  "Data Science",
  "DevOps",
  "Blockchain",
  "Cybersecurity",
  "Open Source",
  "Other",
];

const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];
const STATUSES = ["All", "Recruiting", "Active", "Completed", "Archived"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", "9");
      if (search.trim()) params.append("q", search.trim());
      if (category !== "All") params.append("category", category);
      if (difficulty !== "All") params.append("difficulty", difficulty);
      if (status !== "All") params.append("status", status);
      if (sort) params.append("sort", sort);

      const res = await api.get(`/projects?${params.toString()}`);
      setProjects(res.data.data || []);
      setMeta({
        page: res.data.page || 1,
        totalPages: res.data.totalPages || 1,
        total: res.data.total || 0,
      });
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, category, difficulty, status, sort]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProjects();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Discover Projects</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Find active open-source collaborations and projects matching your skills
          </p>
        </div>
        <Link to="/projects/new">
          <Button variant="accent">
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Create Project
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by title, description, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-subtle pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:bg-white focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          <div>
            <label className="text-[11px] font-mono text-ink-muted uppercase block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-ink-muted uppercase block mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-ink-muted uppercase block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-ink-muted uppercase block mb-1">Sort By</label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center">
          <FolderGit2 className="mx-auto h-12 w-12 text-ink-muted/40 mb-3" />
          <h3 className="font-display text-base font-semibold text-ink">No projects matched your criteria</h3>
          <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
            Try resetting your filters or search keywords to view other available opportunities.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setCategory("All");
              setDifficulty("All");
              setStatus("All");
              setPage(1);
            }}
            className="mt-4 text-xs font-semibold text-link hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project._id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-xs hover:border-ink/40 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded-md bg-bg-subtle px-2 py-0.5 font-mono text-[11px] font-medium text-ink-muted">
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
                </div>

                <Link
                  to={`/projects/${project._id}`}
                  className="font-display text-lg font-bold text-ink group-hover:text-link transition-colors block"
                >
                  {project.title}
                </Link>

                <p className="mt-2 text-xs text-ink-muted line-clamp-3 leading-relaxed">
                  {project.description}
                </p>

                {/* Skills Tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.requiredSkills?.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      className="rounded bg-bg-subtle border border-border/60 px-2 py-0.5 font-mono text-[10px] text-ink font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {project.requiredSkills?.length > 5 && (
                    <span className="font-mono text-[10px] text-ink-muted self-center">
                      +{project.requiredSkills.length - 5}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-ink-muted">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Users className="h-3.5 w-3.5" />
                    {(project.members?.length || 0) + 1}/{project.teamSize}
                  </span>
                  <span>&bull;</span>
                  <span className="font-medium text-ink">{project.difficulty}</span>
                </div>

                <Link
                  to={`/projects/${project._id}`}
                  className="font-semibold text-link group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1"
                >
                  View Details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
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
