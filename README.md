# CampusGPT - RAG-Based College Chatbot

CampusGPT is an enterprise-grade, retrieval-augmented generation (RAG) college assistant system designed to answer student inquiries strictly using official college documents and policies.

---

## Technical Stack (Phase 1 Approved Shell)

* **Frontend**: React (v18+) + TypeScript + Vite + Tailwind CSS
* **Backend**: Node.js + Express + TypeScript
* **Database & Vector Storage**: Supabase (PostgreSQL + `pgvector`)
* **Authentication**: JWT (JSON Web Tokens) stateless auth + `bcryptjs` password hashing (salt factor 12)
* **Architecture**: Monorepo (`client/` and `server/`)

---

## Project Structure

```
CampusGPT/
├── client/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         # ProtectedRoute, UI components
│   │   ├── context/            # AuthContext (state management)
│   │   ├── pages/              # LoginPage, RegisterPage, StudentShell, AdminShell
│   │   ├── services/           # api.ts (Axios wrapper with JWT interceptor)
│   │   ├── types/              # TypeScript interfaces
│   │   ├── App.tsx             # React Router configuration
│   │   └── main.tsx            # React DOM root
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/             # env.ts, db.ts
│   │   ├── controllers/        # auth.controller.ts
│   │   ├── middleware/         # authMiddleware.ts, adminGuard.ts, errorHandler.ts
│   │   ├── models/             # user.model.ts (Supabase & fallback memory repository)
│   │   ├── routes/             # auth.routes.ts, health.routes.ts
│   │   ├── services/           # auth.service.ts
│   │   ├── tests/              # auth.test.ts (Phase 1 test suite)
│   │   ├── types/              # Backend TypeScript definitions
│   │   ├── app.ts              # Express application configuration
│   │   └── index.ts            # Server entry point
│   ├── schema.sql              # Supabase PostgreSQL DDL script
│   ├── package.json
│   └── tsconfig.json
│
├── spec.md                     # Authoritative Technical Specification
└── README.md                   # Project Documentation
```

---

## Local Setup & Quick Start

### 1. Prerequisites
* Node.js v18+ and npm v9+

### 2. Environment Configuration
Copy environment templates:
```bash
# Server Environment
cp server/.env.example server/.env

# Client Environment
cp client/.env.example client/.env
```

### 3. Database Setup (Supabase PostgreSQL)
1. Create a Supabase project at [https://supabase.com](https://supabase.com).
2. Open the SQL Editor in Supabase Dashboard.
3. Run the SQL DDL script contained in [`server/schema.sql`](file:///e:/CampusGPT/server/schema.sql).
4. Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `server/.env`.

*(Note: If Supabase credentials are omitted during development, the server automatically uses a local in-memory mock repository for seamless offline testing).*

### 4. Running the Backend Server
```bash
cd server
npm install
npm run dev
```
Backend API will start at: `http://localhost:5000`
* Health Check: `GET http://localhost:5000/api/health`

### 5. Running the Backend Test Suite
```bash
cd server
npm test
```

### 6. Running the Frontend App
```bash
cd client
npm install
npm run dev
```
Frontend App will start at: `http://localhost:5173`

---

## Phase 1 Authentication API Reference

### `GET /api/health`
* **Access**: Public
* **Response**: `{ "status": "ok", "system": "CampusGPT Backend API", "phase": "Phase 1" }`

### `POST /api/auth/register`
* **Access**: Public
* **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@college.edu",
    "password": "Password123!",
    "role": "student"
  }
  ```
* **Response (201 Created)**: `{ "success": true, "token": "...", "user": { "id": "...", "name": "...", "email": "...", "role": "student" } }`

### `POST /api/auth/login`
* **Access**: Public
* **Body**: `{ "email": "jane@college.edu", "password": "Password123!" }`
* **Response (200 OK)**: `{ "success": true, "token": "...", "user": { ... } }`

### `GET /api/auth/me`
* **Access**: Protected (Header: `Authorization: Bearer <JWT_TOKEN>`)
* **Response (200 OK)**: `{ "success": true, "user": { ... } }`
