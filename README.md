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
* **Embedding Model**: Google Gemini `text-embedding-004` ($768$ dimensions) via `@google/genai`
* **Vector Search**: Supabase `pgvector` Cosine Similarity Search (`match_document_chunks` RPC, HNSW `vector_cosine_ops` index)
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
│   │   ├── controllers/        # auth, admin, retrieval controllers
│   │   ├── middleware/         # authMiddleware, adminGuard, uploadMiddleware, errorHandler
│   │   ├── models/             # user.model.ts, document.model.ts, chunk.model.ts (pgvector search)
│   │   ├── routes/             # auth.routes.ts, health.routes.ts, admin.routes.ts
│   │   ├── services/           # auth, pdf, chunking, document, embedding, vector services
│   │   ├── tests/              # auth.test.ts (P1), document.test.ts (P2), retrieval.test.ts (P3)
│   │   ├── types/              # Backend TypeScript definitions
│   │   ├── app.ts              # Express application configuration
│   │   └── index.ts            # Server entry point
│   ├── schema.sql              # Supabase PostgreSQL DDL & match_document_chunks RPC script
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

### 3. Database & Vector Setup (Supabase PostgreSQL + pgvector)
1. Create a Supabase project at [https://supabase.com](https://supabase.com).
2. Open the SQL Editor in Supabase Dashboard.
3. Run the SQL DDL script contained in [`server/schema.sql`](file:///e:/CampusGPT/server/schema.sql). This enables `vector`, builds the HNSW cosine index, and registers the `match_document_chunks` RPC function.
4. Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `server/.env`.

*(Note: If Supabase credentials are omitted during development, the server automatically uses an in-memory vector similarity fallback repository).*

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
npm test               # Phase 1 Authentication & Infrastructure test suite
npm run test:phase2    # Phase 2 PDF Extraction & Chunking Pipeline test suite
npm run test:phase3    # Phase 3 Embedding & Vector Retrieval Benchmark test suite
```

### 6. Running the Frontend Application
```bash
cd client
npm install
npm run dev
```
Frontend App will start at: `http://localhost:5173`

---

## Phase 3 Vector Embedding & Retrieval Architecture

### Embedding Model
* **Model**: Google Gemini `text-embedding-004`
* **Dimensions**: $768$ dimensions (verified in `@google/genai` SDK `embedContent` API)
* **Batch Strategy**: Concurrency-controlled batching ($10$ chunks per batch) with exponential backoff retries.

### Supabase pgvector Indexing & Search
* **Vector Index**: HNSW index using Cosine Distance (`vector_cosine_ops`).
* **Database RPC Function**: `match_document_chunks(query_embedding, match_count, similarity_threshold)`
* **Similarity Calculation**: $\text{Cosine Similarity} = 1 - (\text{embedding} \Leftrightarrow \text{query\_embedding})$
* **Cutoff Threshold**: Configurable via `RAG_SIMILARITY_THRESHOLD` (Default: `0.65`). Results with similarity $< 0.65$ are filtered out.
* **Top-K Limit**: Configurable via `TOP_K` (Default: `4`).

---

## Admin Retrieval Diagnostic API

### `POST /api/admin/retrieval/test`
* **Auth Required**: Bearer JWT (`role === 'admin'`)
* **Request Body**:
  ```json
  {
    "query": "What is the minimum attendance requirement for final exams?",
    "top_k": 4,
    "threshold": 0.65
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "query": "What is the minimum attendance requirement for final exams?",
    "top_k": 4,
    "similarity_threshold": 0.65,
    "total_matches": 1,
    "results": [
      {
        "chunk_id": "chunk-uuid",
        "document_id": "doc-uuid",
        "document_title": "Academic Regulations 2025",
        "filename": "Academic_Regulations_2025.pdf",
        "page_number": 14,
        "chunk_index": 3,
        "content": "Attendance Requirement: Students must maintain a minimum of 75%...",
        "similarity": 0.8724
      }
    ]
  }
  ```
