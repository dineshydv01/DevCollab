// WHAT: Handles OAuth2 authorization code flow and user provisioning
//       for Google authentication.
// WHY isolated in a service: keeps controllers thin and allows pure
//      provider communication logic to be tested or extended without
//      touching HTTP routing.

import { env } from "../config/env.js";
import { User } from "../models/User.model.js";
import { createHttpError } from "../utils/httpError.js";

function getBackendBaseUrl(req) {
  // Respect forwarded protocol/host if running behind reverse proxy
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host") || `localhost:${env.port}`;
  return `${protocol}://${host}`;
}

async function generateUniqueUsername(base) {
  let cleaned = (base || "dev")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

  if (cleaned.length < 3) cleaned = `dev_${cleaned || "user"}`;

  let candidate = cleaned;
  let counter = 1;
  while (await User.exists({ username: candidate })) {
    candidate = `${cleaned.slice(0, 20)}_${counter}`;
    counter++;
  }
  return candidate;
}

// -----------------------------------------------------------------------------
// Google OAuth URL Generator
// -----------------------------------------------------------------------------
export function getGoogleOAuthUrl(req) {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw createHttpError(
      501,
      "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env"
    );
  }

  const callbackUrl = `${getBackendBaseUrl(req)}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid profile email",
    access_type: "offline",
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// -----------------------------------------------------------------------------
// Google OAuth Callback Handler
// -----------------------------------------------------------------------------
export async function handleGoogleCallback(code, req) {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw createHttpError(501, "Google OAuth is not configured");
  }

  const callbackUrl = `${getBackendBaseUrl(req)}/api/auth/google/callback`;

  // 1. Exchange authorization code for token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error || !tokenData.access_token) {
    throw createHttpError(
      400,
      tokenData.error_description || "Failed to exchange authorization code with Google"
    );
  }

  // 2. Fetch user profile from Google
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    throw createHttpError(502, "Failed to fetch user profile from Google");
  }

  const gUser = await userRes.json();
  const email = (gUser.email || "").toLowerCase().trim();

  if (!email) {
    throw createHttpError(400, "Unable to retrieve email from Google account");
  }

  // 3. Find or link user
  // Security rule: If an existing account matches by email:
  // - If it was created with local credentials (or another provider) and has no googleId,
  //   do NOT automatically link or take over without password verification.
  // - If it already has this specific googleId, authenticate that user.
  let user = await User.findOne({ googleId: String(gUser.id) });

  if (user) {
    // Known Google-linked account; update picture if changed
    if (!user.profileImage && gUser.picture) {
      user.profileImage = gUser.picture;
      await user.save();
    }
    return user;
  }

  // If no user with this googleId exists, check if email is already taken
  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    // Conflict protection: Account exists with this email but not linked to this Google ID
    throw createHttpError(
      409,
      "An account with this email already exists. Please log in with your email and password."
    );
  }

  // 4. Create new Google user
  const baseUsername = email.split("@")[0] || "google_user";
  const username = await generateUniqueUsername(baseUsername);

  user = await User.create({
    fullName: gUser.name || baseUsername,
    username,
    email,
    googleId: String(gUser.id),
    profileImage: gUser.picture || "",
    authProvider: "google",
    role: "developer",
  });

  return user;
}
