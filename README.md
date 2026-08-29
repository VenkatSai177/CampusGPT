# CampusGPT - RAG-Based College Chatbot

CampusGPT is an enterprise-grade, retrieval-augmented generation (RAG) college assistant system designed to answer student inquiries strictly using official college documents and policies.

---

## Technical Stack & Architectural Status

* **Frontend**: React (v18+) + TypeScript + Vite + Tailwind CSS
* **Backend**: Node.js + Express + TypeScript
* **Database & Vector Storage**: Supabase (PostgreSQL + `pgvector` extension)
* **Authentication**: JWT stateless authentication + `bcryptjs` password hashing (cost factor 12)
* **PDF Extraction**: `pdf-parse` (Page-aware extraction preserving `page_number`)
* **Text Chunking**: Recursive character splitter ($1000$ characters size, $200$ characters overlap)
* **Architecture**: Monorepo (`client/` and `server/`)

---

## Project Structure

```
CampusGPT/
├── client/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         # ProtectedRoute, UploadDropzone, DocumentTable
│   │   ├── context/            # AuthContext (state management)
│   │   ├── pages/              # LoginPage, RegisterPage, StudentShell, AdminPage
│   │   ├── services/           # api.ts (Axios wrapper with JWT interceptor)
│   │   ├── types/              # TypeScript interfaces (User, DocumentRecord)
│   │   ├── App.tsx             # React Router configuration
│   │   └── main.tsx            # React DOM root
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/             # env.ts, db.ts
│   │   ├── controllers/        # auth.controller.ts, admin.controller.ts
│   │   ├── middleware/         # authMiddleware.ts, adminGuard.ts, uploadMiddleware.ts, errorHandler.ts
│   │   ├── models/             # user.model.ts, document.model.ts, chunk.model.ts
│   │   ├── routes/             # auth.routes.ts, health.routes.ts, admin.routes.ts
│   │   ├── services/           # auth.service.ts, pdf.service.ts, chunking.service.ts, document.service.ts
│   │   ├── tests/              # auth.test.ts (Phase 1), document.test.ts (Phase 2)
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

*(Note: If Supabase credentials are omitted during development, the server automatically uses an in-memory repository for local testing).*

### 4. Running the Backend Server
```bash
cd server
npm install
npm run dev
```
Backend API will start at: `http://localhost:5000`
* Health Check: `GET http://localhost:5000/api/health`

### 5. Running the Backend Test Suites
```bash
cd server
npm test               # Runs Phase 1 Authentication & Infrastructure tests
npm run test:phase2    # Runs Phase 2 PDF Extraction & Chunking Pipeline tests
```

### 6. Running the Frontend Application
```bash
cd client
npm install
npm run dev
```
Frontend App will start at: `http://localhost:5173`

---

## Phase 2 Document Ingestion Architecture

### File Upload & Storage Strategy
* **File Validation**: MIME type `application/pdf`, extension `.pdf`, max file size limit $15\text{MB}$ (configurable via `MAX_FILE_SIZE_MB`).
* **Temporary Processing Storage**: PDF files are streamed into temporary server storage (`uploads/temp`) during extraction. Files are automatically unlinked and cleaned up immediately after ingestion completes or fails.

### Ingestion Workflow
1. **Admin Upload**: Admin submits PDF via `POST /api/admin/documents`.
2. **Record Creation**: `documents` table record created with `status = 'pending'`.
3. **Status Transition**: Status updated to `status = 'processing'`.
4. **Page-Aware PDF Parsing**: `pdf-parse` extracts text page-by-page, preserving 1-indexed `page_number` for every extracted page object.
5. **Text Cleaning**: Normalizes excessive whitespace and control characters while preserving paragraph breaks and headings.
6. **Page-Aware Recursive Chunking**: Text is split recursively (1000 characters chunk size, 200 characters overlap). Every generated chunk preserves `document_id`, `document_title`, `filename`, `page_number`, and sequential `chunk_index`.
7. **Database Persistence**: Chunks are stored in `document_chunks` table leaving `embedding VECTOR(768)` field null (ready for Phase 3 vector computation).
8. **Final Status Update**: Document status updated to `status = 'indexed'` with `total_pages` and `total_chunks`.

---

## Admin API Endpoints

### Authentication & Admin Role Required (`Authorization: Bearer <JWT_TOKEN>`)

#### `POST /api/admin/documents`
* **Content-Type**: `multipart/form-data` (`file` field)
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Document ingested and processed successfully into page-aware text chunks.",
    "document": {
      "id": "doc-uuid",
      "title": "Academic Regulations 2025",
      "filename": "Academic_Regulations_2025.pdf",
      "file_size": 1048576,
      "status": "indexed",
      "total_pages": 14,
      "total_chunks": 42
    },
    "total_chunks": 42
  }
  ```

#### `GET /api/admin/documents`
* **Response (200 OK)**: `{ "success": true, "count": 1, "documents": [...] }`

#### `GET /api/admin/documents/:id`
* **Response (200 OK)**: `{ "success": true, "document": { ... }, "chunk_count": 42, "chunks": [...] }`

#### `DELETE /api/admin/documents/:id`
* **Response (200 OK)**: `{ "success": true, "message": "Document and associated page chunks successfully deleted.", "id": "doc-uuid" }`
