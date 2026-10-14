// WHAT: Handles OAuth2 authorization code flows and user provisioning
//       for GitHub and Google authentication.
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
// GitHub OAuth
// -----------------------------------------------------------------------------
export function getGitHubOAuthUrl(req) {
  if (!env.githubClientId || !env.githubClientSecret) {
    throw createHttpError(
      501,
      "GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env"
    );
  }

  const callbackUrl = `${getBackendBaseUrl(req)}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: env.githubClientId,
    redirect_uri: callbackUrl,
    scope: "user:email read:user",
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function handleGitHubCallback(code, req) {
  if (!env.githubClientId || !env.githubClientSecret) {
    throw createHttpError(501, "GitHub OAuth is not configured");
  }

  const callbackUrl = `${getBackendBaseUrl(req)}/api/auth/github/callback`;

  // 1. Exchange authorization code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "DevCollab-App",
    },
    body: JSON.stringify({
      client_id: env.githubClientId,
      client_secret: env.githubClientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error || !tokenData.access_token) {
    throw createHttpError(
      400,
      tokenData.error_description || "Failed to exchange authorization code with GitHub"
    );
  }

  const accessToken = tokenData.access_token;

  // 2. Fetch user profile from GitHub
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DevCollab-App",
    },
  });

  if (!userRes.ok) {
    throw createHttpError(502, "Failed to fetch user profile from GitHub");
  }

  const ghUser = await userRes.json();

  // 3. Resolve primary verified email
  let email = ghUser.email;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "DevCollab-App",
      },
    });

    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      if (Array.isArray(emails)) {
        const primary = emails.find((e) => e.primary && e.verified) || emails[0];
        if (primary) email = primary.email;
      }
    }
  }

  if (!email) {
    throw createHttpError(400, "Unable to retrieve verified email address from GitHub account");
  }

  email = email.toLowerCase().trim();

  // 4. Find or create user
  let user = await User.findOne({
    $or: [{ githubId: String(ghUser.id) }, { email }],
  });

  if (user) {
    let changed = false;
    if (!user.githubId) {
      user.githubId = String(ghUser.id);
      changed = true;
    }
    if (!user.githubUsername && ghUser.login) {
      user.githubUsername = ghUser.login;
      changed = true;
    }
    if (!user.profileImage && ghUser.avatar_url) {
      user.profileImage = ghUser.avatar_url;
      changed = true;
    }
    if (changed) await user.save();
    return user;
  }

  const username = await generateUniqueUsername(ghUser.login);
  user = await User.create({
    fullName: ghUser.name || ghUser.login,
    username,
    email,
    githubId: String(ghUser.id),
    githubUsername: ghUser.login,
    profileImage: ghUser.avatar_url || "",
    bio: (ghUser.bio || "").slice(0, 300),
    authProvider: "github",
    role: "developer",
  });

  return user;
}

// -----------------------------------------------------------------------------
// Google OAuth
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

  // 3. Find or create user
  let user = await User.findOne({
    $or: [{ googleId: String(gUser.id) }, { email }],
  });

  if (user) {
    let changed = false;
    if (!user.googleId) {
      user.googleId = String(gUser.id);
      changed = true;
    }
    if (!user.profileImage && gUser.picture) {
      user.profileImage = gUser.picture;
      changed = true;
    }
    if (changed) await user.save();
    return user;
  }

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

// -----------------------------------------------------------------------------
// Development Simulation (Runs ONLY when NODE_ENV === 'development' & no keys set)
// -----------------------------------------------------------------------------
export async function getOrCreateDevOAuthUser(provider) {
  if (provider === "google") {
    let user = await User.findOne({ googleId: "dev_google_id_1001" });
    if (!user) {
      user = await User.findOne({ email: "google.developer@example.com" });
    }
    if (!user) {
      user = await User.create({
        fullName: "Google Developer",
        username: "google_dev",
        email: "google.developer@example.com",
        googleId: "dev_google_id_1001",
        profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        bio: "Full-stack engineer using Google OAuth authentication.",
        skills: ["React", "Node.js", "TypeScript", "Google Cloud"],
        experienceLevel: "Intermediate",
        availability: 20,
        preferredRoles: ["Fullstack Developer"],
        authProvider: "google",
        role: "developer",
      });
    }
    return user;
  }

  // provider === 'github'
  let user = await User.findOne({ githubId: "dev_github_id_2002" });
  if (!user) {
    user = await User.findOne({ email: "github.developer@example.com" });
  }
  if (!user) {
    user = await User.create({
      fullName: "GitHub Developer",
      username: "github_dev",
      email: "github.developer@example.com",
      githubId: "dev_github_id_2002",
      githubUsername: "github_dev",
      profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      bio: "Open-source contributor signed in via GitHub OAuth.",
      skills: ["React", "Express", "MongoDB", "Git"],
      experienceLevel: "Advanced",
      availability: 25,
      preferredRoles: ["Backend Engineer"],
      authProvider: "github",
      role: "developer",
    });
  }
  return user;
}
