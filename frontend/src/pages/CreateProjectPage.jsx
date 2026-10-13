import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api.js";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { FolderGit2, Plus, X, Loader2, ArrowLeft } from "lucide-react";

const CATEGORIES = [
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

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function CreateProjectPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Web Development",
    teamSize: 4,
    difficulty: "Intermediate",
    duration: "2-3 months",
    repositoryUrl: "",
  });

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");

  const [preferredRoles, setPreferredRoles] = useState([]);
  const [roleInput, setRoleInput] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    const trimmed = roleInput.trim();
    if (trimmed && !preferredRoles.includes(trimmed)) {
      setPreferredRoles([...preferredRoles, trimmed]);
      setRoleInput("");
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setPreferredRoles(preferredRoles.filter((r) => r !== roleToRemove));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (skills.length === 0) {
      setError("Please add at least one required skill for your project.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        teamSize: Number(form.teamSize),
        difficulty: form.difficulty,
        duration: form.duration.trim(),
        repositoryUrl: form.repositoryUrl.trim(),
        requiredSkills: skills,
        preferredRoles: preferredRoles,
      };

      const res = await api.post("/projects", payload);
      const createdId = res.data.data._id;
      navigate(`/projects/${createdId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-accent">
            <FolderGit2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">Create New Project</h1>
            <p className="text-xs text-ink-muted">
              Define your project details, required tech stack, and recruit teammates
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          <Input
            label="Project Title"
            id="title"
            name="title"
            placeholder="e.g. AI-Powered Code Reviewer"
            value={form.title}
            onChange={handleChange}
            required
            minLength={3}
            maxLength={120}
          />

          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Project Description</label>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              placeholder="Explain the problem, technical architecture, goals, and who you're looking for (minimum 20 characters)..."
              required
              minLength={20}
              maxLength={3000}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              {form.description.length}/3000 characters (min. 20)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-ink block mb-1.5">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-ink block mb-1.5">Difficulty</label>
              <select
                name="difficulty"
                value={form.difficulty}
                onChange={handleChange}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {DIFFICULTIES.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Team Size"
              id="teamSize"
              name="teamSize"
              type="number"
              min={1}
              max={50}
              value={form.teamSize}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Estimated Duration"
              id="duration"
              name="duration"
              placeholder="e.g. 1 month, Ongoing, 4-6 weeks"
              value={form.duration}
              onChange={handleChange}
            />

            <Input
              label="GitHub Repository URL (Optional)"
              id="repositoryUrl"
              name="repositoryUrl"
              placeholder="https://github.com/user/repo"
              value={form.repositoryUrl}
              onChange={handleChange}
            />
          </div>

          {/* Required Skills Tag Input */}
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">
              Required Skills (Powers the matching algorithm)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. React, Docker, Python, MongoDB, Tailwind..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill(e))}
                className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
              />
              <Button type="button" variant="primary" onClick={handleAddSkill}>
                <Plus className="h-4 w-4" />
                Add Skill
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 bg-bg-subtle rounded-md border border-border/70">
              {skills.length === 0 ? (
                <span className="text-xs text-ink-muted italic">
                  At least one required skill is needed for candidate matching.
                </span>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-border px-2.5 py-1 font-mono text-xs text-ink"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-ink-muted hover:text-danger ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Preferred Roles Tag Input */}
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">
              Preferred Roles Needed (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Fullstack Engineer, DevOps Lead, UI Designer..."
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRole(e))}
                className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
              />
              <Button type="button" variant="ghost" onClick={handleAddRole}>
                <Plus className="h-4 w-4" />
                Add Role
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 bg-bg-subtle rounded-md border border-border/70">
              {preferredRoles.length === 0 ? (
                <span className="text-xs text-ink-muted italic">No preferred roles added</span>
              ) : (
                preferredRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-border px-2.5 py-1 text-xs text-ink"
                  >
                    {role}
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="text-ink-muted hover:text-danger ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Link to="/projects">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Creating Project...
                </>
              ) : (
                "Launch Project"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
