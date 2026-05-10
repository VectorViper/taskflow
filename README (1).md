# TaskFlow — Team Task Manager

A full-stack team project and task management web application with role-based access control, built as an internship assessment project.

---

## 🖥️ Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Frontend   | React 18 + Vite             |
| Backend    | Node.js + Express           |
| Database   | SQLite (better-sqlite3)     |
| Auth       | JWT + bcryptjs              |
| Styling    | Custom CSS (no UI library)  |
| Deployment | Railway                     |

---

## ✅ Features

- **Authentication** — Signup, Login, JWT-based session management
- **Role-Based Access Control** — Global Admin and Member roles
- **Projects** — Create, view, update, archive projects
- **Team Management** — Add/remove members per project with project-level roles (Admin/Member)
- **Tasks** — Create tasks with title, description, status, priority, assignee, and due date
- **Kanban Board** — Visual board per project with To Do / In Progress / Review / Done columns
- **My Tasks** — Personal task list with status/priority/project filters
- **Dashboard** — Stats overview, task progress breakdown, recent activity
- **Overdue Detection** — Tasks past due date are highlighted in red
- **Toast Notifications** — Success/error feedback on all actions

---

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── db/
│   │   └── database.js        # SQLite setup & schema
│   ├── middleware/
│   │   └── auth.js            # JWT auth + RBAC middleware
│   ├── routes/
│   │   ├── auth.js            # /api/auth/*
│   │   ├── projects.js        # /api/projects/*
│   │   └── tasks.js           # /api/tasks/* + /api/dashboard
│   ├── seed.js                # Demo data seeder
│   ├── server.js              # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Layout, TaskModal
│   │   ├── context/           # AuthContext, ToastContext
│   │   ├── pages/             # Dashboard, Projects, Tasks, Login, Signup
│   │   ├── styles/            # Global CSS design system
│   │   ├── api.js             # Axios instance with JWT interceptor
│   │   └── App.jsx            # Router + protected routes
│   └── package.json
├── nixpacks.toml              # Railway build config
├── railway.json               # Railway deploy config
└── README.md
```

---

## 🚀 Local Development

### Prerequisites
- **Node.js v20 LTS** (required — v20.20.2 recommended)
- npm

### 1. Install dependencies

Open two terminals in VS Code:

**Terminal 1 — Backend:**
```bash
cd backend
npm install
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
```

### 2. Seed demo data (optional but recommended)
```bash
cd backend
node seed.js
```

### 3. Start both servers

**Backend** (Terminal 1):
```bash
npm run dev
# Running at http://localhost:5000
```

**Frontend** (Terminal 2):
```bash
npm run dev
# Running at http://localhost:5173
```

### 4. Open in browser
```
http://localhost:5173
```

> The frontend Vite dev server proxies all `/api` requests to `localhost:5000` automatically — no CORS issues.

---

## 👤 Demo Accounts

After running `node seed.js`:

| Role   | Email             | Password   |
|--------|-------------------|------------|
| Admin  | admin@demo.com    | admin123   |
| Member | alice@demo.com    | member123  |
| Member | bob@demo.com      | member123  |

> **Note:** The very first user to register via the app UI is automatically assigned the Admin role.

---

## 🔐 Role-Based Access Control

| Action                        | Admin | Member |
|-------------------------------|-------|--------|
| View all projects (global)    | ✅    | ❌     |
| Create project                | ✅    | ✅     |
| Edit / delete own project     | ✅    | ✅     |
| Add / remove project members  | ✅    | Project Admin only |
| Create tasks                  | ✅    | ✅     |
| Edit any task in project      | ✅    | Own tasks only |
| Delete any task               | ✅    | Own tasks only |

---

## 📡 API Reference

### Auth
| Method | Endpoint           | Auth | Description        |
|--------|--------------------|------|--------------------|
| POST   | `/api/auth/signup` | ❌   | Register new user  |
| POST   | `/api/auth/login`  | ❌   | Login              |
| GET    | `/api/auth/me`     | ✅   | Get current user   |

### Projects
| Method | Endpoint                          | Auth         | Description          |
|--------|-----------------------------------|--------------|----------------------|
| GET    | `/api/projects`                   | ✅           | List my projects     |
| POST   | `/api/projects`                   | ✅           | Create project       |
| GET    | `/api/projects/:id`               | ✅ Member    | Project + members    |
| PUT    | `/api/projects/:id`               | Project Admin| Update project       |
| DELETE | `/api/projects/:id`               | Project Admin| Delete project       |
| POST   | `/api/projects/:id/members`       | Project Admin| Add member by email  |
| DELETE | `/api/projects/:id/members/:uid`  | Project Admin| Remove member        |

### Tasks
| Method | Endpoint                    | Auth         | Description       |
|--------|-----------------------------|--------------|-------------------|
| GET    | `/api/projects/:id/tasks`   | ✅ Member    | List tasks        |
| POST   | `/api/projects/:id/tasks`   | ✅ Member    | Create task       |
| PUT    | `/api/tasks/:id`            | ✅ Member    | Update task       |
| DELETE | `/api/tasks/:id`            | ✅ Member    | Delete task       |

### Other
| Method | Endpoint         | Auth | Description              |
|--------|------------------|------|--------------------------|
| GET    | `/api/dashboard` | ✅   | Stats + recent tasks     |
| GET    | `/api/users`     | ✅   | All users (for assignee) |
| GET    | `/api/health`    | ❌   | Health check             |

---

## 🌐 Deploy to Railway

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: TaskFlow app"
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### Step 2: Create Railway project
1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo**
3. Choose your `taskflow` repository

### Step 3: Set environment variables
In Railway → your service → **Variables**:

| Key          | Value                              |
|--------------|------------------------------------|
| `JWT_SECRET` | `any_long_random_string_here`      |
| `NODE_ENV`   | `production`                       |
| `DB_PATH`    | `/app/data/taskflow.db`            |

### Step 4: Add persistent storage (recommended)
1. Railway → your service → **Volumes**
2. Add a volume mounted at `/app/data`

> Without a volume, the database resets on every redeploy. The volume keeps your data persistent.

### Step 5: Deploy
Railway auto-deploys on every `git push`. The `nixpacks.toml` handles everything:
1. Installs backend + frontend dependencies
2. Builds the React app (`npm run build`)
3. Starts Express server — serves both the API and the built React frontend from one port

Your live URL will be shown in the Railway dashboard (e.g. `https://taskflow-production.up.railway.app`).

---

## ⚠️ Known Requirements

- **Node.js v20 LTS is required** for `better-sqlite3` on Windows. Node 22/24 will fail to install due to missing prebuilt binaries and requiring Visual Studio C++ build tools.
- If you must use Node 22+, install Visual Studio Build Tools with the "Desktop development with C++" workload from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/).

---

## 📝 License

Built for internship assessment purposes.
