# Phase 18 — Performance & Optimization Review

Spec section 46 is explicit: "do not prematurely optimize... explain optimization
decisions." Most of the real optimization work in this project happened
incrementally, as each feature was built — indexes were added alongside the
models that needed them, pagination was built once in Phase 4 and reused
everywhere, the matching algorithm's Top-K selection was designed around
complexity from day one (Phase 7), and GitHub caching was part of that
feature's original design (Phase 13). This phase is a deliberate audit of
those decisions, plus two small, well-justified changes — not a pass to
invent busywork.

## Index audit (every index in the project, and why)

| Model | Index | Purpose |
|---|---|---|
| User | `email` (unique) | Enforces unique accounts; backs login lookups by email. |
| User | `username` (unique) | Enforces unique usernames; backs profile URL lookups. |
| User | `skills` | Backs "search developers by skill" and the matching algorithm's candidate pool query. |
| Project | `title, description` (text) | Powers the discovery page's full-text search (Phase 6). |
| Project | `category` | Backs the discovery page's category filter. |
| Project | `status` | Backs status filtering and internal queries (e.g. "all Active projects" in admin stats). |
| Project | `requiredSkills` | Backs the discovery page's skill filter (`$in` query). |
| Project | `owner` | Backs "my projects" queries and ownership checks. |
| CollaborationRequest | `project, applicant, type, status` (compound) | Backs the duplicate-pending-request check — the single most frequent query against this collection. |
| CollaborationRequest | `owner, status` | Backs "requests I own" in the personal dashboard. |
| CollaborationRequest | `applicant, status` | Backs "requests about me" in the personal dashboard. |
| Task | `project, status` (compound) | Backs the Kanban board's per-column queries. |
| Task | `assignedTo` | Backs "my assigned tasks." |
| Message | `project, createdAt desc` (compound) | Backs chat history pagination — the dominant query shape for this collection. |
| Notification | `recipient, isRead, createdAt desc` (compound) | Backs the notification bell's unread-first, newest-first listing. |
| Review | `project, reviewer, reviewedUser` (compound, unique) | Database-level duplicate-review prevention (backstop behind the application-level check). |
| Review | `reviewedUser` | Backs "reviews this developer has received" on a public profile. |
| Report | `status, createdAt desc` (compound) | Backs the admin report queue. |
| Report | `targetType, targetId` (compound) | Backs "does this target already have reports?" and the stats endpoint's distinct-reported-projects count. |

Every index here was added in the same phase as the query it serves, with its
reasoning documented inline in that model's file at the time. No new indexes
were added this phase — the audit confirmed the existing set already covers
every real query pattern in the app.

## Two changes made this phase

### 1. Matching endpoint: field projection on the candidate query
`GET /api/projects/:id/matches` previously fetched **every field** on every
candidate developer — bio, location, interests, githubUsername, linkedinUrl,
portfolioUrl, rating, and more — none of which `computeMatchScore()` or the
response actually use. Added `.select("fullName username profileImage skills
experienceLevel availability preferredRoles")` to the query. This:
- Reduces data transferred from MongoDB and held in memory during scoring.
- Shrinks the response payload sent to the client.
- Changes **zero** matching behavior — every candidate still participates,
  scoring is identical, only unused fields are no longer fetched.
- Brings the response shape closer to spec section 14's own minimal example
  (`{ id, name, skills }`-style), rather than a full user profile dump.

### 2. Project responses: hide internal GitHub cache bookkeeping
`githubCache`, `githubCacheUpdatedAt`, and `githubCacheUrl` (Phase 13) are
internal state for the caching strategy — read directly off the Mongoose
*document* by `github.service.js`, never through JSON. Excluding them from
`Project`'s `toJSON` transform:
- Shrinks every project list/detail response (a GitHub API snapshot can be a
  non-trivial chunk of JSON).
- Has **zero** effect on server-side logic, verified directly: a project
  document's raw `.githubCache` field remains fully readable in code; only
  what gets serialized to API responses changes.
- Steers API consumers toward the dedicated `GET /:id/github` endpoint, which
  correctly reasons about staleness — rather than reading a cache blob
  embedded in an unrelated response with no freshness indication at all.

Both changes were verified directly (not just asserted) — see the commit for
the exact checks run against a live document and against the existing test
suite.

## Deliberate non-changes (and why)

### The matching algorithm fetches the full developer pool, not a DB-pre-filtered subset
It would be possible to add `skills: { $in: project.requiredSkills }` to the
candidate query, using the existing `skills` index, to shrink the candidate
set before scoring. This was deliberately **not** done: it would silently
change behavior, not just performance — a developer with zero skill overlap
but excellent availability and experience fit currently still appears in
results (correctly scored low, but visible). A hard DB-level skill filter
would exclude them entirely before scoring ever runs. That's a product
decision about what "matching" means, not a safe performance change, so it's
left as explicitly out of scope here — a candidate for a future phase if the
product direction calls for it, with its own tests.

### `report.controller.js`'s per-report target lookup (N+1 pattern)
`listReports` does one query for the page of reports, then one more query
*per report* to fetch a snapshot of its target (since `targetId` is a
polymorphic reference — see Phase 15's reasoning). This is a textbook N+1
pattern. It's accepted as-is because it's **bounded**: this is an
admin-only, paginated endpoint capped at 50 results per page, so the
absolute worst case is 51 queries on a low-traffic internal screen — not a
pattern that scales badly with user traffic the way an N+1 on a public,
high-traffic endpoint would.

### `.lean()` on read-only list queries
Mongoose's `.lean()` returns plain JavaScript objects instead of full
Document instances, skipping document-method overhead — a real, well-known
optimization for read-only queries. It was deliberately **not** applied
here: `.lean()` bypasses each schema's `toJSON` transform (the thing
stripping `__v`, passwords, and now GitHub cache internals), so applying it
correctly would mean manually replicating that stripping logic at every lean
query site — real new surface area for a subtle data-leak bug, late in the
build, for a performance gain this project's scale doesn't currently need.
Documented here as a known, applicable technique to reach for first if real
load testing ever shows document hydration as an actual bottleneck — not
applied speculatively now.

### Frontend lazy loading
Not applicable yet — every phase through Phase 17 has been backend-only; no
frontend exists in this build yet to apply lazy loading to. This will be
revisited once frontend work begins.

## Already-optimized, confirmed during this audit (no changes needed)
- **Discovery search** (Phase 6) already uses a single `$facet` aggregation
  to get paginated data AND the total count in one round trip, and its
  `$project` stage already excludes the GitHub cache fields (it predates
  them, but the explicit field whitelist meant nothing needed to change).
- **Every list endpoint** consistently uses `Promise.all([find(), countDocuments()])`
  to run the data query and count query in parallel, not sequentially.
- **Top-K selection** (Phase 7) already avoids sorting the full candidate
  list — O(n log k) via a min-heap instead of O(n log n) via a full sort.
- **`authenticate` re-fetching the user on every request** (a query per
  authenticated request) is intentional, not an oversight — it's what makes
  admin suspension (Phase 15) take effect immediately rather than requiring
  separate session invalidation. A primary-key lookup by `_id` is about as
  cheap as a database read gets; the correctness this buys is worth that
  cost.
