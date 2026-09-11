// WHAT: Turns messy, inconsistent skill strings into one canonical form.
// WHY: Without this, "ReactJS", "React.js", and "react" would all be
//      treated as different skills — breaking the matching algorithm's
//      skill-intersection logic in Phase 7, and cluttering search/filter
//      UI with near-duplicate tags.
// HOW: Lowercase + trim the input, then look it up in a known-aliases
//      map. If it's a known alias, return its canonical display form.
//      If it's not in the map (a skill we didn't anticipate), we still
//      normalize casing/spacing so at least repeated entries of the
//      SAME unknown skill collapse into one.

// key: normalized lowercase alias -> canonical display form
const SKILL_ALIASES = {
  "reactjs": "React",
  "react.js": "React",
  "react": "React",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "node": "Node.js",
  "expressjs": "Express",
  "express.js": "Express",
  "express": "Express",
  "js": "JavaScript",
  "javascript": "JavaScript",
  "ts": "TypeScript",
  "typescript": "TypeScript",
  "mongodb": "MongoDB",
  "mongo": "MongoDB",
  "postgresql": "PostgreSQL",
  "postgres": "PostgreSQL",
  "sql": "SQL",
  "html": "HTML",
  "html5": "HTML",
  "css": "CSS",
  "css3": "CSS",
  "c++": "C++",
  "cpp": "C++",
  "python": "Python",
  "py": "Python",
  "java": "Java",
  "aws": "AWS",
  "docker": "Docker",
  "git": "Git",
  "github": "GitHub",
  "figma": "Figma",
  "ml": "Machine Learning",
  "machine learning": "Machine Learning",
  "ai": "AI",
  "ui/ux": "UI/UX",
  "uiux": "UI/UX",
};

/**
 * Normalizes a single skill string to its canonical display form.
 * Falls back to Title Case for unrecognized skills so at least
 * casing/spacing stays consistent.
 */
export function normalizeSkill(raw) {
  if (typeof raw !== "string") return "";

  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return "";

  if (SKILL_ALIASES[cleaned]) {
    return SKILL_ALIASES[cleaned];
  }

  // Unknown skill — Title Case it as a reasonable default
  // e.g. "graphql" -> "Graphql" (not perfect, but consistent)
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Normalizes an array of skills AND removes duplicates that only
 * differed by casing/spacing/aliasing.
 *
 * WHY a Set here: this is the same HashSet-based deduplication
 * technique we'll formalize in Phase 7's matching algorithm — an
 * O(n) way to eliminate duplicates instead of nested-loop comparison.
 */
export function normalizeSkills(skillsArray) {
  if (!Array.isArray(skillsArray)) return [];

  const seen = new Set();
  const result = [];

  for (const skill of skillsArray) {
    const normalized = normalizeSkill(skill);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}
