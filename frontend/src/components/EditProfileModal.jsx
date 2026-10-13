import { useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { X, Loader2, Plus } from "lucide-react";
import Input from "./ui/Input.jsx";
import Button from "./ui/Button.jsx";

export default function EditProfileModal({ onClose }) {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    profileImage: user?.profileImage || "",
    experienceLevel: user?.experienceLevel || "Beginner",
    availability: user?.availability || 10,
    githubUsername: user?.githubUsername || "",
    linkedinUrl: user?.linkedinUrl || "",
    portfolioUrl: user?.portfolioUrl || "",
  });

  const [skills, setSkills] = useState(user?.skills || []);
  const [skillInput, setSkillInput] = useState("");

  const [preferredRoles, setPreferredRoles] = useState(user?.preferredRoles || []);
  const [roleInput, setRoleInput] = useState("");

  const [interests, setInterests] = useState(user?.interests || []);
  const [interestInput, setInterestInput] = useState("");

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

  const handleAddInterest = (e) => {
    e.preventDefault();
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
      setInterestInput("");
    }
  };

  const handleRemoveInterest = (item) => {
    setInterests(interests.filter((i) => i !== item));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        profileImage: formData.profileImage.trim(),
        experienceLevel: formData.experienceLevel,
        availability: Number(formData.availability),
        githubUsername: formData.githubUsername.trim(),
        linkedinUrl: formData.linkedinUrl.trim(),
        portfolioUrl: formData.portfolioUrl.trim(),
        skills,
        preferredRoles,
        interests,
      };

      await api.put("/users/profile", payload);
      await refreshUser();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-white shadow-2xl my-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-bg-subtle/50">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Edit Developer Profile</h2>
            <p className="text-xs text-ink-muted">Update your technical skills, availability, and portfolio</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <Input
              label="Location"
              id="location"
              name="location"
              placeholder="e.g. San Francisco, CA or Remote"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Bio</label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Write a brief intro about yourself, your background, and what you love building..."
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-ink block mb-1.5">Experience Level</label>
              <select
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value="Beginner">Beginner (1-2 yrs)</option>
                <option value="Intermediate">Intermediate (3-5 yrs)</option>
                <option value="Advanced">Advanced (5+ yrs)</option>
              </select>
            </div>

            <Input
              label="Weekly Availability (Hours/Week)"
              id="availability"
              name="availability"
              type="number"
              min={0}
              max={168}
              value={formData.availability}
              onChange={handleChange}
            />
          </div>

          {/* Technical Skills */}
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">
              Skills (Normalized for Matching Algorithm)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. React, Node.js, TypeScript, Python..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill(e))}
                className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
              <Button type="button" variant="primary" onClick={handleAddSkill}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-bg-subtle rounded-md border border-border/60">
              {skills.length === 0 ? (
                <span className="text-xs text-ink-muted italic">No skills added yet</span>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-border px-2.5 py-1 font-mono text-xs text-ink shadow-2xs"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-ink-muted hover:text-danger"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Preferred Roles */}
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Preferred Roles</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Frontend Developer, Backend Engineer, UI Designer..."
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRole(e))}
                className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
              <Button type="button" variant="ghost" onClick={handleAddRole}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-bg-subtle rounded-md border border-border/60">
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
                      className="text-ink-muted hover:text-danger"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Social and Portfolio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="GitHub Username"
              id="githubUsername"
              name="githubUsername"
              placeholder="octocat"
              value={formData.githubUsername}
              onChange={handleChange}
            />
            <Input
              label="LinkedIn URL"
              id="linkedinUrl"
              name="linkedinUrl"
              placeholder="https://linkedin.com/in/..."
              value={formData.linkedinUrl}
              onChange={handleChange}
            />
            <Input
              label="Portfolio URL"
              id="portfolioUrl"
              name="portfolioUrl"
              placeholder="https://mywebsite.dev"
              value={formData.portfolioUrl}
              onChange={handleChange}
            />
          </div>

          <Input
            label="Avatar Image URL (Optional)"
            id="profileImage"
            name="profileImage"
            placeholder="https://..."
            value={formData.profileImage}
            onChange={handleChange}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
