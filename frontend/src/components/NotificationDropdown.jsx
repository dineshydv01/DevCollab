import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications.js";
import { Link } from "react-router-dom";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead } =
    useNotifications();
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink focus:outline-none"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-white shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-bg-subtle/50">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm text-ink">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent/20 px-2 py-0.5 font-mono text-xs font-semibold text-accent-ink">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-xs text-link hover:underline font-medium"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-ink-muted">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-xs">Loading updates...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                No notifications yet. You're all caught up!
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markAsRead(n._id)}
                  className={`flex flex-col gap-1 p-3.5 text-xs transition-colors hover:bg-bg-subtle cursor-pointer ${
                    !n.isRead ? "bg-amber-500/5 font-medium" : "text-ink-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`line-clamp-2 ${!n.isRead ? "text-ink font-medium" : "text-ink-muted"}`}>
                      {n.message}
                    </p>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-accent shrink-0 mt-1" />
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-ink-muted/70">
                    {new Date(n.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border p-2 bg-bg-subtle/50 text-center">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="text-xs text-link font-medium hover:underline"
            >
              View Dashboard Activity
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
