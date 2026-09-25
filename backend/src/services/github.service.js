// WHAT: Fetches live GitHub repository stats for a project's attached
//       repositoryUrl, with a persisted cache and graceful failure
//       handling.
// WHY caching matters here specifically: GitHub's unauthenticated API
//      allows only 60 requests/hour per IP. Without caching, a
//      modestly-viewed project page would exhaust that almost
//      immediately. The cache lives on the Project document itself
//      (see Project.model.js) rather than in memory, because this
//      data is worth surviving a server restart and worth showing
//      as "last known good" if a live refresh fails.

import { parseGitHubUrl } from "../utils/parseGitHubUrl.js";
import { env } from "../config/env.js";
import { createHttpError } from "../utils/httpError.js";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "DevCollab-App",
  };
  if (env.githubToken) {
    headers.Authorization = `Bearer ${env.githubToken}`;
  }
  return headers;
}

/**
 * Fetches the contributor COUNT (not the full list) cheaply, by
 * asking for 1 result per page and reading the total page count off
 * the pagination Link header — avoids downloading every contributor
 * just to count them. Never throws: contributor count is a nice-to-
 * have, and its failure shouldn't break the rest of the repo card.
 */
async function fetchContributorCount(owner, repo) {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=true`, {
      headers: githubHeaders(),
    });
    if (!res.ok) return null;

    const linkHeader = res.headers.get("link");
    if (linkHeader) {
      const match = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/);
      if (match) return parseInt(match[1], 10);
    }

    const list = await res.json();
    return Array.isArray(list) ? list.length : null;
  } catch {
    return null;
  }
}

async function fetchFromGitHubApi(owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: githubHeaders() });

  if (res.status === 404) {
    throw createHttpError(404, "Repository not found (it may be private, renamed, or deleted)");
  }

  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw createHttpError(429, "GitHub API rate limit exceeded — please try again later");
    }
    throw createHttpError(403, "Access to this repository was forbidden by GitHub");
  }

  if (!res.ok) {
    throw createHttpError(502, `GitHub API returned an unexpected error (status ${res.status})`);
  }

  const data = await res.json();
  const contributors = await fetchContributorCount(owner, repo);

  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    primaryLanguage: data.language,
    openIssues: data.open_issues_count,
    contributors,
    lastUpdated: data.updated_at,
    url: data.html_url,
    defaultBranch: data.default_branch,
  };
}

/**
 * Public entry point. Returns cached data if fresh AND for the SAME
 * repositoryUrl currently attached to the project; otherwise attempts
 * a live refresh. On failure, falls back to stale cached data if any
 * exists (marking it `stale: true`) rather than surfacing an error.
 *
 * BUG FIX (caught by verifyGithubLive.js): the cache must be checked
 * against project.repositoryUrl, not just its own age. Without that
 * check, changing which repo is attached would keep serving the OLD
 * repo's cached stats for up to CACHE_TTL_MS, because a fresh
 * timestamp alone doesn't mean the cached DATA still corresponds to
 * the CURRENT repositoryUrl.
 */
export async function getProjectGithubInfo(project) {
  if (!project.repositoryUrl) {
    throw createHttpError(400, "This project has no GitHub repository attached");
  }

  const parsed = parseGitHubUrl(project.repositoryUrl);
  if (!parsed) {
    throw createHttpError(400, "repositoryUrl is not a valid GitHub repository URL");
  }

  const cacheIsFresh =
    project.githubCacheUpdatedAt &&
    project.githubCacheUrl === project.repositoryUrl &&
    Date.now() - project.githubCacheUpdatedAt.getTime() < CACHE_TTL_MS;

  if (cacheIsFresh) {
    return { ...project.githubCache, cached: true, stale: false, fetchedAt: project.githubCacheUpdatedAt };
  }

  try {
    const data = await fetchFromGitHubApi(parsed.owner, parsed.repo);
    project.githubCache = data;
    project.githubCacheUpdatedAt = new Date();
    project.githubCacheUrl = project.repositoryUrl;
    await project.save();
    return { ...data, cached: false, stale: false, fetchedAt: project.githubCacheUpdatedAt };
  } catch (err) {
    // Only fall back to the stale cache if it's for the SAME repo —
    // serving Hello-World's stats as a "stale" fallback for a
    // completely different repo would be actively misleading, not
    // graceful degradation.
    if (project.githubCache && project.githubCacheUrl === project.repositoryUrl) {
      return {
        ...project.githubCache,
        cached: true,
        stale: true,
        fetchedAt: project.githubCacheUpdatedAt,
        error: err.message,
      };
    }
    throw err;
  }
}
