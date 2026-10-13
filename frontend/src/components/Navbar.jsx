import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import NotificationDropdown from "./NotificationDropdown.jsx";
import {
  Code2,
  FolderGit2,
  Users,
  PlusCircle,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  Compass,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-ink text-white"
        : "text-ink-muted hover:text-ink hover:bg-bg-subtle"
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-ink text-white"
        : "text-ink-muted hover:text-ink hover:bg-bg-subtle"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2.5 font-display text-lg font-bold text-ink">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
              <Code2 className="h-5 w-5 text-accent" />
            </div>
            <span>DevCollab</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            <NavLink to="/dashboard" className={navLinkClass}>
              <Compass className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/projects" className={navLinkClass}>
              <FolderGit2 className="h-4 w-4" />
              <span>Discover</span>
            </NavLink>
            <NavLink to="/developers" className={navLinkClass}>
              <Users className="h-4 w-4" />
              <span>Developers</span>
            </NavLink>
            {user?.role === "admin" && (
              <NavLink to="/admin" className={navLinkClass}>
                <Shield className="h-4 w-4 text-accent" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          <Link
            to="/projects/new"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 font-sans text-xs font-semibold text-accent-ink transition-colors hover:bg-accent/90"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Project</span>
          </Link>

          <NotificationDropdown />

          {/* User profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-bg-subtle focus:outline-none"
            >
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.fullName}
                  className="h-8 w-8 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                  {user?.fullName?.charAt(0).toUpperCase() || "D"}
                </div>
              )}
              <span className="hidden lg:inline text-xs font-medium text-ink max-w-[120px] truncate">
                {user?.fullName}
              </span>
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-white shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-xs font-semibold text-ink truncate">{user?.fullName}</p>
                  <p className="font-mono text-[11px] text-ink-muted truncate">@{user?.username}</p>
                  {user?.role === "admin" && (
                    <span className="mt-1 inline-block rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-ink">
                      ADMIN
                    </span>
                  )}
                </div>

                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-ink hover:bg-bg-subtle"
                >
                  <User className="h-4 w-4 text-ink-muted" />
                  Your Profile
                </Link>

                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-ink hover:bg-bg-subtle"
                  >
                    <Shield className="h-4 w-4 text-accent" />
                    Admin Portal
                  </Link>
                )}

                <div className="my-1 border-t border-border" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-danger hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-muted hover:bg-bg-subtle"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 py-3 space-y-2">
          <NavLink
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            <Compass className="h-4 w-4" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/projects"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            <FolderGit2 className="h-4 w-4" />
            <span>Discover Projects</span>
          </NavLink>
          <NavLink
            to="/developers"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            <Users className="h-4 w-4" />
            <span>Find Teammates</span>
          </NavLink>
          <Link
            to="/projects/new"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-accent-ink bg-accent rounded-md"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Project</span>
          </Link>
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <Shield className="h-4 w-4 text-accent" />
              <span>Admin Portal</span>
            </NavLink>
          )}
        </div>
      )}
    </header>
  );
}
