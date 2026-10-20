# DevCollab — Developer Collaboration & Team Finder

> A full-stack platform for developers to discover projects, find compatible teammates, manage Kanban tasks, chat in real time, and build high-impact software together.

[![CI Status](https://img.shields.io/badge/tests-65%20passed-success)](https://github.com/dineshydv01/DevCollab)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue)](./LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Installation & Setup](#local-installation--setup)
- [Environment Variables](#environment-variables)
- [Authentication Architecture](#authentication-architecture)
- [API Documentation](#api-documentation)
- [Database Models](#database-models)
- [Deployment Guide](#deployment-guide)
  - [Recommended Architecture (Vercel + Render + Atlas)](#recommended-architecture)
  - [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
  - [Backend Deployment (Render)](#backend-deployment-render)
  - [MongoDB Atlas Configuration](#mongodb-atlas-configuration)
  - [Google OAuth Cloud Console Setup](#google-oauth-cloud-console-setup)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Security Hardening](#security-hardening)
- [Roadmap & Future Enhancements](#roadmap--future-enhancements)
- [Contributing & License](#contributing--license)

---

## Overview

Finding committed teammates with the right technical skills and complementary availability is one of the biggest bottlenecks for developers building open-source tools, side projects, and hackathon prototypes.

**DevCollab** solves this through:
- **Intelligent Team Matching:** A custom min-heap scoring engine evaluates candidate developers against required project skills, experience levels, and weekly time commitments.
- **Full Collaboration Lifecycle:** From project discovery and applications to real-time chat, Kanban task boards, peer reviews, and reputation scores.
- **Enterprise-Grade Security:** HTTP-only JWT cookies, bcrypt password hashing, Google OAuth 2.0 with account-takeover protection, and centralized Zod request validation.

---

## Key Features

### 1. Dual Authentication & Session Management
- **Email & Password:** Registration with bcrypt (`SALT_ROUNDS = 10`), email/username login, password complexity validation, and secure session management.
- **Google OAuth 2.0:** One-click "Continue with Google" sign-in via OAuth 2.0 authorization code flow.
- **Account Takeover Protection:** Prevents OAuth collision attacks if an email matches an unlinked local account.
- **Secure Sessions:** Stored in browser HTTP-only cookies (`devcollab_token`, `SameSite: "none"` in production, `SameSite: "lax"` in development).

### 2. Developer Profiles & Reputation
- Customizable developer profiles with bio, location, preferred roles, weekly availability (hours/week), and skills.
- Star ratings and peer reviews calculated dynamically after project completion.
- Direct linking to personal portfolio and LinkedIn accounts.

### 3. Project Discovery & Management
- Search, filter by category (Web, Mobile, AI/ML, DevOps, Blockchain, etc.), difficulty (Beginner, Intermediate, Advanced), and recruiting status.
- Rich project details with required tech stack, GitHub repository statistics caching, team slots, and lead organizer details.
- Project status lifecycles: `Recruiting`, `Active`, `Completed`, and `Archived`.

### 4. Algorithmic Teammate Matching
- Built-in **MinHeap matching algorithm** (`backend/src/utils/minHeap.js`) that scores candidate developers for project leads.
- Match scores compute:
  - Exact & normalized skill overlaps
  - Experience level suitability
  - Availability hours match
- Project owners can directly invite candidates; developers can submit applications with custom notes.

### 5. Interactive Kanban Task Board
- Real-time project task board organized into columns: `TODO`, `IN_PROGRESS`, `REVIEW`, and `COMPLETED`.
- Task creation, editing, assignment to active team members, deadline tracking, and priority levels (`Low`, `Medium`, `High`, `Critical`).
- Strict authorization: only project owners and active team collaborators can view or modify project boards.

### 6. Real-Time Project Chat & Notifications
- Socket.IO-powered group chat for project teams with persistent message history stored in MongoDB.
- Real-time typing indicators and online presence tracking.
- In-app notification center for team invitations, application status updates, and mentions.

### 7. Platform Moderation & Admin Portal
- Admin telemetry dashboard with platform stats (active users, total projects, reports).
- User moderation actions (suspend and restore user accounts).
- Community reporting system for inappropriate projects or behavior.

---

## System Architecture

```mermaid
flowchart TD
    Client["Client Browser (React 19 + Vite SPA)"]
    Vercel["Frontend CDN (Vercel / Netlify)"]
    API["Express API Server (Node.js on Render / Railway)"]
    Socket["Socket.IO Server (WebSocket Engine)"]
    Mongo[("MongoDB Atlas Database")]
    Google["Google OAuth 2.0 API"]
    GitHubAPI["GitHub REST API (Repo Telemetry)"]

    Client -->|Static Assets| Vercel
    Client -->|REST API with HTTP-only Cookie| API
    Client <-->|Real-time Events & Presence| Socket
    API -->|Mongoose Queries| Mongo
    Socket -->|Persist Chat & State| Mongo
    API <-->|Auth Code Exchange| Google
    API -->|Fetch Stars, Forks, Commits| GitHubAPI
```

---

## Technology Stack

| Domain | Technology | Description |
|---|---|---|
| **Frontend Framework** | React 19 + Vite 8 | Fast single-page application with code-splitting chunks |
| **Routing** | React Router v7 | Client-side routing with protected route guards |
| **Styling** | Tailwind CSS v4 | Custom dev-tool design tokens, IBM Plex Sans, Space Grotesk |
| **Icons** | Lucide React | Clean, consistent developer icon set |
| **Backend Runtime** | Node.js (>=20) + Express 5 | High-performance asynchronous REST API |
| **Real-time WebSockets** | Socket.IO 4 | Ephemeral room-based chat, typing states, and presence |
| **Database** | MongoDB & Mongoose 9 | Document store with indexed schemas and cascade cleanup |
| **Authentication** | JWT + HTTP-only Cookies + Bcrypt | Stateless tokens in secure cookies |
| **OAuth** | Google OAuth 2.0 (Authorization Code Flow) | Identity verification and automated account provisioning |
| **Validation** | Zod 4 | Centralized request schema validation middleware |
| **Security** | Helmet, Express Rate Limit, Input Sanitizer | Defense-in-depth protection against XSS and NoSQL injection |
| **Testing** | Vitest 5 + Supertest | Unit test algorithms and full integration test suite |

---

## Project Structure

```text
devcollab/
├── backend/
│   ├── src/
│   │   ├── config/             # DB connection, environment loaders
│   │   ├── controllers/        # Express request/response handlers
│   │   ├── middleware/         # authenticate, errorHandler, rateLimiters, sanitizeInput, validate
│   │   ├── models/             # Mongoose schemas: User, Project, Task, Application, Message, Report, Notification
│   │   ├── routes/             # REST route declarations (/api/auth, /api/projects, etc.)
│   │   ├── services/           # Business logic: oauth.service, github.service, matching.service, notification.service
│   │   ├── sockets/            # Socket.IO connection and room event management
│   │   ├── utils/              # MinHeap algorithm, JWT helpers, cookie options, skill normalizer
│   │   ├── validators/         # Zod schemas for validation
│   │   ├── app.js              # Express app factory with middleware stack
│   │   └── index.js            # HTTP + Socket.IO server startup
│   ├── tests/
│   │   ├── unit/               # minHeap, matching, normalizeSkill, pagination, projectAuth
│   │   └── integration/        # auth, googleOAuth, projects, tasks, applications
│   ├── .env.example            # Backend environment template
│   └── package.json
├── frontend/
│   ├── public/                 # Static assets, Netlify _redirects
│   ├── src/
│   │   ├── components/         # Reusable UI, Navbar, Modals, TaskBoard, ProjectChat
│   │   ├── context/            # AuthContext, NotificationContext
│   │   ├── hooks/              # useAuth hook
│   │   ├── layouts/            # AppLayout
│   │   ├── pages/              # Login, Register, Dashboard, Profile, Projects, Admin, Developers
│   │   ├── services/           # Axios instance (api.js), Socket client (socket.js)
│   │   ├── App.jsx             # Route definitions
│   │   ├── index.css           # Tailwind v4 configuration & global styles
│   │   └── main.jsx            # Entry point
│   ├── .env.example            # Frontend environment template
│   ├── vercel.json             # Vercel SPA routing rewrite rules
│   ├── vite.config.js          # Vite config with proxy settings
│   └── package.json
└── README.md
```

---

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **MongoDB Atlas** account (or local MongoDB >= 6.x)
- **Google Cloud Console** account (for Google OAuth)

---

## Local Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/dineshydv01/DevCollab.git
cd DevCollab
```

### 2. Configure Backend
```bash
cd backend
npm install
cp .env.example .env
```
Open `backend/.env` and configure:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/devcollab?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
JWT_EXPIRES_IN=7d

# Google OAuth (leave empty to use local development mock login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 3. Configure Frontend
```bash
cd ../frontend
npm install
```
*(In local development, Vite automatically proxies `/api` and `/socket.io` to `http://localhost:5000`, so no frontend `.env` is required).*

### 4. Run Locally
**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `PORT` | No | Port for Express and Socket.IO (defaults to 5000) | `5000` |
| `MONGO_URI` | **Yes** | MongoDB connection string (Atlas or local) | `mongodb+srv://user:pass@cluster.mongodb.net/devcollab` |
| `CLIENT_URL` | **Yes** | Deployed frontend origin (used for CORS and cookies) | `https://devcollab.vercel.app` |
| `NODE_ENV` | **Yes** | `development` or `production` | `production` |
| `JWT_SECRET` | **Yes** | Secret key for signing authentication JWTs | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | No | JWT validity duration (defaults to `7d`) | `7d` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Web Client ID | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Web Client Secret | `GOCSPX-xxxx` |
| `GITHUB_TOKEN` | No | Personal access token raising GitHub API limits to 5000/hr | `ghp_xxxx` |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | In Production | Full backend API URL (including `/api`) | `https://devcollab-api.onrender.com/api` |
| `VITE_SOCKET_URL` | In Production | Full backend root URL for WebSocket connection | `https://devcollab-api.onrender.com` |

---

## Authentication Architecture

DevCollab uses a modern **stateless session architecture**:
1. When a user registers or logs in (either via password or Google OAuth), the server issues a JSON Web Token signed with `JWT_SECRET`.
2. The token is sent to the client in an **HTTP-only cookie** (`devcollab_token`):
   - `httpOnly: true` (prevents JavaScript/XSS access)
   - `secure: true` in production (enforces HTTPS)
   - `sameSite: "none"` in production (enables cross-site cookie transmission between frontend on Vercel and backend on Render)
   - `maxAge: 7 days`
3. Axios and Socket.IO use `withCredentials: true` to attach the cookie to all outgoing requests.
4. On browser reload, the frontend calls `GET /api/auth/me` to automatically restore the user session.

---

## API Documentation

All API responses follow a consistent envelope:
```json
{
  "success": true,
  "message": "Optional status message",
  "data": { ... }
}
```

### Core Endpoints

#### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`fullName`, `username`, `email`, `password`, `confirmPassword`).
- `POST /api/auth/login` — Sign in with email or username + password.
- `POST /api/auth/logout` — Clear auth cookie.
- `GET /api/auth/me` — Return currently authenticated user profile.
- `GET /api/auth/google` — Initiate Google OAuth authorization code flow.
- `GET /api/auth/google/callback` — Google OAuth redirect target.

#### Users & Profiles (`/api/users`)
- `GET /api/users` — Browse developer directory with search & filters.
- `GET /api/users/:id` — View developer profile.
- `PUT /api/users/profile` — Update logged-in developer's profile.
- `GET /api/users/:id/reviews` — Fetch peer reviews received by developer.

#### Projects (`/api/projects`)
- `GET /api/projects` — Search and filter projects with pagination (`q`, `category`, `difficulty`, `status`, `page`, `limit`).
- `POST /api/projects` — Create a new project.
- `GET /api/projects/:id` — Fetch complete project details.
- `PUT /api/projects/:id` — Update project details (owner only).
- `DELETE /api/projects/:id` — Delete project and cascade-delete tasks, applications, and messages.
- `GET /api/projects/:id/github` — Fetch cached repository stars, forks, and language stats.
- `GET /api/projects/:id/matches` — Get MinHeap candidate teammate recommendations for project.

#### Collaboration & Teams (`/api/applications`, `/api/projects/:id/team`)
- `POST /api/projects/:id/apply` — Apply to join a project team.
- `GET /api/applications/me` — View incoming and outgoing collaboration requests.
- `PUT /api/applications/:id/status` — Accept or reject an application (`status: "accepted" | "rejected"`).
- `GET /api/projects/:id/team` — List active project team members.
- `PUT /api/projects/:id/team/:userId/role` — Update member role (owner only).
- `DELETE /api/projects/:id/team/:userId` — Remove collaborator from team.

#### Kanban Tasks (`/api/projects/:id/tasks`, `/api/tasks`)
- `GET /api/projects/:id/tasks` — List tasks for project board.
- `POST /api/projects/:id/tasks` — Create task (`title`, `description`, `priority`, `assignedTo`, `deadline`).
- `PATCH /api/tasks/:id/status` — Move task status (`TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`).
- `DELETE /api/tasks/:id` — Delete task.

#### Platform Health & Admin
- `GET /api/health` — Returns system uptime and MongoDB connection state (`connected`).
- `GET /api/admin/stats` — Platform telemetry overview (admin only).
- `PATCH /api/admin/users/:id/suspend` — Suspend or restore user account (admin only).

---

## Database Models

- **User:** `fullName`, `username`, `email`, `password` (hashed, hidden by default), `googleId`, `authProvider`, `role`, `bio`, `location`, `skills`, `availability`, `experienceLevel`, `rating`, `completedProjects`, `isSuspended`.
- **Project:** `title`, `description`, `category`, `skillsRequired`, `teamSize`, `difficulty`, `duration`, `status`, `repositoryUrl`, `owner` (ref: User), `members` (array of { user, role, status }).
- **Task:** `project` (ref: Project), `title`, `description`, `priority`, `status`, `assignedTo` (ref: User), `createdBy`, `deadline`.
- **Application:** `project` (ref: Project), `applicant` (ref: User), `owner` (ref: User), `type` (`application` | `invitation`), `status` (`pending` | `accepted` | `rejected`), `message`.
- **Message:** `project` (ref: Project), `sender` (ref: User), `content`, `readBy` (array of ref: User).
- **Review:** `project` (ref: Project), `reviewer` (ref: User), `reviewee` (ref: User), `rating` (1-5), `feedback`.
- **Notification:** `recipient` (ref: User), `type`, `message`, `referenceId`, `isRead`.

---

## Deployment Guide

### Recommended Architecture

| Component | Platform | Plan | Notes |
|---|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Free Tier | High-speed global edge network, automated builds from git |
| **Backend API + Sockets** | [Render](https://render.com) | Free / Starter | Full Node.js runtime, native WebSocket support for Socket.IO |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) | M0 Free Shared | 512MB managed database, automatic SSL & backups |

---

### Step 1: MongoDB Atlas Configuration
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Under **Network Access**, ensure IP `0.0.0.0/0` (Allow Access from Anywhere) is whitelisted so cloud hosting providers can connect.
3. Under **Database Access**, verify your database user has read/write privileges on the `devcollab` database.
4. Obtain your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/devcollab?retryWrites=true&w=majority
   ```

---

### Step 2: Backend Deployment (Render)
1. Log in to [Render](https://render.com/) and click **New → Web Service**.
2. Connect your GitHub repository `https://github.com/dineshydv01/DevCollab`.
3. Configure settings:
   - **Name:** `devcollab-api`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. In the **Environment Variables** tab, add:
   ```env
   NODE_ENV=production
   PORT=10000
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/devcollab?retryWrites=true&w=majority
   CLIENT_URL=https://devcollab.vercel.app
   JWT_SECRET=generate_a_random_32_char_hex_string
   JWT_EXPIRES_IN=7d
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```
5. Click **Create Web Service**.
6. Note down your backend URL once live:
   `https://devcollab-api.onrender.com`

---

### Step 3: Frontend Deployment (Vercel)
1. Log in to [Vercel](https://vercel.com/) and click **Add New → Project**.
2. Select the `DevCollab` repository.
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** click Edit and choose `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add **Environment Variables**:
   ```env
   VITE_API_URL=https://devcollab-api.onrender.com/api
   VITE_SOCKET_URL=https://devcollab-api.onrender.com
   ```
5. Click **Deploy**.
6. After deployment completes, note down your live frontend URL (e.g., `https://devcollab.vercel.app`).
7. Update `CLIENT_URL` in your Render backend settings to match this exact Vercel URL.

---

### Step 4: Google OAuth Cloud Console Setup
1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Edit your OAuth 2.0 Web Client ID.
3. Under **Authorized JavaScript Origins**, add:
   - `http://localhost:5173`
   - `https://devcollab.vercel.app` (your Vercel URL)
4. Under **Authorized Redirect URIs**, add:
   - `http://localhost:5000/api/auth/google/callback`
   - `https://devcollab-api.onrender.com/api/auth/google/callback` (your Render backend URL)
5. Save changes.

---

## Testing & Quality Assurance

DevCollab includes an automated test suite executed with Vitest:

```bash
cd backend
npm test
```

### Verified Test Coverage (65 Tests Across 10 Suites)
- **Unit Tests:**
  - `matching.test.js`: MinHeap ranking logic, skill overlap calculations, experience weights.
  - `minHeap.test.js`: Priority queue insertion, extraction, and sorting.
  - `normalizeSkill.test.js`: Skill canonicalization (`react.js` → `React`, `nodejs` → `Node.js`).
  - `pagination.test.js`: Page offset and limit calculation.
  - `projectAuth.test.js`: Owner and team member authorization checks.
- **Integration Tests:**
  - `auth.test.js`: Registration, duplicate user conflict rejection, invalid credentials rejection, login success, authenticated `/me`, and logout cookie clearance.
  - `googleOAuth.test.js`: OAuth callback handling, cancelled authorization handling, password-less Google user provisioning, safe `comparePassword`, and verification that GitHub OAuth endpoints return 404.
  - `projects.test.js`: Project creation, authorization rules, search and filtering.
  - `tasks.test.js`: Task board lifecycle and unauthorized access prevention.
  - `applications.test.js`: Applying to projects, accepting members, team size caps.

---

## Security Hardening

- **No Plaintext Passwords:** Passwords hashed with bcrypt before persistence; `select: false` prevents accidental exposure in database queries.
- **XSS Mitigation:** JWT authentication stored exclusively in HTTP-only cookies; cannot be extracted by client-side scripts.
- **CSRF & Cross-Origin Cookies:** Production cookies enforce `sameSite: "none"` and `secure: true`.
- **NoSQL Injection Defense:** Centralized `sanitizeInput` middleware strips `$` and `.` operators from request bodies and query parameters.
- **Rate Limiting:**
  - Global API: 150 requests per 15-minute window.
  - Auth Endpoints: 10 login attempts per 15 minutes, 5 registrations per hour per IP.
- **Payload Size Capping:** Request bodies restricted to 100kb to mitigate payload-based DoS attacks.
- **Safe Error Responses:** Stack traces and internal server error details are suppressed in production mode.

---

## Roadmap & Future Enhancements

- [ ] Automated email notifications via Resend / SendGrid
- [ ] Direct image upload to Cloudinary or AWS S3 for profile avatars
- [ ] Interactive Hackathon Team matching rooms with countdown timers
- [ ] Integrated audio/video rooms for teammate interviews via WebRTC

---

## Contributing & License

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/dineshydv01/DevCollab/issues).

This project is licensed under the **ISC License**.
