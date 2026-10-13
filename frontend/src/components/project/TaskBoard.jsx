import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api.js";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import {
  Plus,
  Loader2,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const COLUMNS = [
  { id: "TODO", label: "To Do", bg: "bg-slate-100" },
  { id: "IN_PROGRESS", label: "In Progress", bg: "bg-blue-50" },
  { id: "REVIEW", label: "Review", bg: "bg-amber-50" },
  { id: "COMPLETED", label: "Completed", bg: "bg-green-50" },
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export default function TaskBoard({ projectId, isOwner, teamMembers = [] }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium",
    assignedTo: "",
    deadline: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/tasks?limit=100`);
      setTasks(res.data.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load project tasks");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update task status");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        assignedTo: newTask.assignedTo || null,
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null,
      };

      const res = await api.post(`/projects/${projectId}/tasks`, payload);
      setTasks((prev) => [res.data.data, ...prev]);
      setIsCreateModalOpen(false);
      setNewTask({
        title: "",
        description: "",
        priority: "Medium",
        assignedTo: "",
        deadline: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
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
      {/* Board Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-ink">Project Task Board</h3>
          <p className="text-xs text-ink-muted">Manage workflow across 4 status stages</p>
        </div>

        {isOwner && (
          <Button variant="accent" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Task
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-danger">
          {error}
        </div>
      )}

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col, colIdx) => {
          const colTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl border border-border bg-bg-subtle/70 p-4 shadow-2xs min-h-[480px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-3">
                <span className="font-display text-sm font-semibold text-ink">
                  {col.label}
                </span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white border border-border font-mono text-[11px] font-bold text-ink">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px]">
                {colTasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-ink-muted">
                    No tasks in {col.label}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task._id}
                      className="rounded-xl border border-border bg-white p-3.5 shadow-2xs hover:shadow-xs transition-shadow space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display text-xs font-semibold text-ink leading-snug">
                          {task.title}
                        </h4>
                        {isOwner && (
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="text-ink-muted hover:text-danger p-0.5"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-ink-muted line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] pt-1 border-t border-border/60">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono font-medium ${
                            task.priority === "Critical"
                              ? "bg-red-100 text-red-700"
                              : task.priority === "High"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {task.priority}
                        </span>

                        {task.deadline && (
                          <span className="inline-flex items-center gap-1 font-mono text-ink-muted">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.deadline).toLocaleDateString([], {
                              month: "numeric",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      {task.assignedTo && (
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-ink">
                          {task.assignedTo.profileImage ? (
                            <img
                              src={task.assignedTo.profileImage}
                              alt=""
                              className="h-4 w-4 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-ink text-white text-[9px] flex items-center justify-center font-bold">
                              {task.assignedTo.fullName?.charAt(0)}
                            </div>
                          )}
                          <span className="truncate">{task.assignedTo.fullName}</span>
                        </div>
                      )}

                      {/* Status Transition Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        {colIdx > 0 ? (
                          <button
                            onClick={() => handleStatusChange(task._id, COLUMNS[colIdx - 1].id)}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-ink-muted hover:text-ink"
                            title={`Move to ${COLUMNS[colIdx - 1].label}`}
                          >
                            <ChevronLeft className="h-3 w-3" />
                            Prev
                          </button>
                        ) : (
                          <span />
                        )}

                        {colIdx < COLUMNS.length - 1 ? (
                          <button
                            onClick={() => handleStatusChange(task._id, COLUMNS[colIdx + 1].id)}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-link hover:underline"
                            title={`Move to ${COLUMNS[colIdx + 1].label}`}
                          >
                            Next
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        ) : (
                          <span />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink">Create New Task</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <Input
                label="Task Title"
                id="taskTitle"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
                minLength={2}
                maxLength={150}
                placeholder="e.g. Implement authentication middleware"
              />

              <div>
                <label className="text-sm font-medium text-ink block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task specifications, test requirements, notes..."
                  className="w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink block mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full rounded-md border border-border bg-white px-2.5 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-ink block mb-1">Assignee</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="w-full rounded-md border border-border bg-white px-2.5 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((member) => (
                      <option key={member.user?._id || member.user} value={member.user?._id || member.user}>
                        {member.user?.fullName || "Member"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Deadline (Optional)"
                id="deadline"
                type="date"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Add to Board"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
