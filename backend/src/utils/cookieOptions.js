// WHAT: The exact cookie settings used to store the JWT in the browser.
// WHY centralize this: the SAME options used to SET a cookie must be
//      used to CLEAR it, or the browser won't recognize it as the same
//      cookie and logout silently fails. Also keeps security-relevant
//      settings (httpOnly, secure, sameSite) in exactly one place to
//      review/audit.

import { env } from "../config/env.js";

export const AUTH_COOKIE_NAME = "devcollab_token";

export function getAuthCookieOptions() {
  const isProduction = env.nodeEnv === "production";

  return {
    httpOnly: true, // JavaScript cannot read this cookie — blocks XSS token theft
    secure: isProduction, // only sent over HTTPS in production; allows plain HTTP in local dev
    sameSite: isProduction ? "none" : "lax", // "none" needed for separate-domain deploys (Phase 19); "lax" is fine and simpler for local dev
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, in milliseconds — matches JWT_EXPIRES_IN default
    path: "/",
  };
}
