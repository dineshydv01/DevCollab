// WHAT: Extracts { owner, repo } from a GitHub repository URL.
// WHY a dedicated parser instead of a regex inline where it's used:
//      URL parsing has real edge cases (trailing slashes, a `.git`
//      suffix, `www.` vs bare `github.com`, extra path segments like
//      `/tree/main`) that are easy to get subtly wrong with a hand
//      rolled regex. Using the built-in URL class to actually parse
//      the hostname and path, rather than pattern-matching the whole
//      string, means we correctly REJECT non-GitHub URLs (a common
//      mistake would be a regex that just checks for "github.com"
//      appearing anywhere in the string, which a malicious or
//      careless input like "evil.com/?redirect=github.com/x/y" would
//      pass).

export function parseGitHubUrl(url) {
  if (typeof url !== "string" || !url.trim()) return null;

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null; // not a valid URL at all
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");

  if (!owner || !repo) return null;

  return { owner, repo };
}
