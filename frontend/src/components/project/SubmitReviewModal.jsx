import { useState } from "react";
import { api } from "../../services/api.js";
import Button from "../ui/Button.jsx";
import { Star, X, Loader2 } from "lucide-react";

export default function SubmitReviewModal({ projectId, eligibleTeammates = [], onClose, onReviewSubmitted }) {
  const [reviewedUserId, setReviewedUserId] = useState(eligibleTeammates[0]?._id || "");
  const [rating, setRating] = useState(5);
  const [technicalSkills, setTechnicalSkills] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [teamwork, setTeamwork] = useState(5);
  const [reliability, setReliability] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reviewedUserId) {
      setError("Please select a teammate to review");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await api.post(`/projects/${projectId}/reviews`, {
        reviewedUser: reviewedUserId,
        rating: Number(rating),
        technicalSkills: Number(technicalSkills),
        communication: Number(communication),
        teamwork: Number(teamwork),
        reliability: Number(reliability),
        comment: comment.trim(),
      });
      onReviewSubmitted?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-display text-base font-bold text-ink">Submit Peer Review</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-ink block mb-1">Select Teammate</label>
            <select
              value={reviewedUserId}
              onChange={(e) => setReviewedUserId(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              required
            >
              {eligibleTeammates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.fullName} (@{t.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-ink block mb-1">Overall Rating (1 - 5 Stars)</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating ? "fill-accent text-accent" : "text-border"
                    }`}
                  />
                </button>
              ))}
              <span className="font-mono text-sm font-bold text-ink ml-2">{rating}/5</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-ink-muted block mb-1">Technical Skills: {technicalSkills}/5</label>
              <input
                type="range"
                min="1"
                max="5"
                value={technicalSkills}
                onChange={(e) => setTechnicalSkills(Number(e.target.value))}
                className="w-full accent-ink"
              />
            </div>

            <div>
              <label className="text-ink-muted block mb-1">Communication: {communication}/5</label>
              <input
                type="range"
                min="1"
                max="5"
                value={communication}
                onChange={(e) => setCommunication(Number(e.target.value))}
                className="w-full accent-ink"
              />
            </div>

            <div>
              <label className="text-ink-muted block mb-1">Teamwork: {teamwork}/5</label>
              <input
                type="range"
                min="1"
                max="5"
                value={teamwork}
                onChange={(e) => setTeamwork(Number(e.target.value))}
                className="w-full accent-ink"
              />
            </div>

            <div>
              <label className="text-ink-muted block mb-1">Reliability: {reliability}/5</label>
              <input
                type="range"
                min="1"
                max="5"
                value={reliability}
                onChange={(e) => setReliability(Number(e.target.value))}
                className="w-full accent-ink"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-ink block mb-1">Feedback / Testimonial</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what it was like collaborating with this developer..."
              maxLength={1000}
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
