# CampusGPT - RAG-Based College Chatbot

CampusGPT is an enterprise-grade, retrieval-augmented generation (RAG) college assistant system designed to answer student inquiries strictly using official college documents and policies.

---

## Technical Stack & Production Deployment Status

* **Phase Status**: **Phases 1–7 COMPLETE (Production Deployment Verified)**
* **Frontend Application**: React (v18+) + TypeScript + Vite + Tailwind CSS (Deployed on **Vercel**: `https://campusgpt.vercel.app`)
* **Backend API**: Node.js + Express + TypeScript (Deployed on **Render**: `https://campusgpt-api.onrender.com`)
* **Database & Vector Store**: Supabase (PostgreSQL + `pgvector` extension, 768d HNSW Cosine Index)
* **Authentication**: JWT stateless authentication + `bcryptjs` password hashing (cost factor 12)
* **Security Middleware**: Express Security Headers (nosniff, DENY frame options, XSS protection, HSTS, CSP) & Sliding Window Rate Limiting (HTTP 429)
* **PDF Extraction**: `pdf-parse` (Page-aware extraction preserving `page_number`)
* **Text Chunking**: Recursive character splitter ($1000$ characters size, $200$ characters overlap)
* **Embedding Model**: Google Gemini `text-embedding-004` ($768$ dimensions) via `@google/genai`
* **LLM Synthesis Model**: Google Gemini 2.0 Flash (`gemini-2.0-flash`)
* **Vector Search**: Supabase `pgvector` Cosine Similarity Search (`match_document_chunks` RPC, HNSW `vector_cosine_ops` index)
* **RAG Benchmark Evaluation Engine**: In-scope vs Out-of-scope automated evaluation suite (`Recall@4`, Grounded Accuracy, Citation Accuracy, Fallback Accuracy)
* **Architecture**: Monorepo (`client/` and `server/`)

---

## Project Structure

```
CampusGPT/
├── client/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         # ProtectedRoute, UploadDropzone, DocumentTable, MessageBubble, SourceBadge, HistorySidebar, ChatComposer, RagEvaluation
│   │   ├── context/            # AuthContext (state management)
│   │   ├── pages/              # LoginPage, RegisterPage, ChatPage, AdminPage
│   │   ├── services/           # api.ts, chat.service.ts
│   │   ├── types/              # TypeScript interfaces
│   │   ├── App.tsx             # React Router configuration
│   │   └── main.tsx            # React DOM root
│   ├── vercel.json             # Vercel SPA Routing Configuration
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/             # env.ts, db.ts
│   │   ├── controllers/        # auth, admin, retrieval, chat, conversation controllers
│   │   ├── middleware/         # authMiddleware, adminGuard, uploadMiddleware, security, errorHandler
│   │   ├── models/             # user.model.ts, document.model.ts, chunk.model.ts, conversation.model.ts, message.model.ts
│   │   ├── routes/             # auth, health, admin, chat, conversation routes
│   │   ├── services/           # auth, pdf, chunking, document, embedding, vector, llm, rag, evaluation services
│   │   ├── tests/              # auth (P1), document (P2), retrieval (P3), rag (P4), conversation (P5), admin (P6) test suites
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

*(Note: If Supabase credentials are omitted during local development, the server automatically uses an in-memory vector similarity fallback repository).*

### 4. Running the Backend Server
```bash
cd server
npm install
npm run dev
```
Backend API will start at: `http://localhost:5000`
* Health Check: `GET http://localhost:5000/api/health`

### 5. Running the Complete Backend Test Suites across all Phases
```bash
cd server
npm test               # Phase 1 Authentication & Infrastructure test suite
npm run test:phase2    # Phase 2 PDF Extraction & Chunking Pipeline test suite
npm run test:phase3    # Phase 3 Embedding & Vector Retrieval Benchmark test suite
npm run test:phase4    # Phase 4 Grounded RAG Pipeline & Hallucination Defense test suite
npm run test:phase5    # Phase 5 Conversation History & Student Experience test suite
npm run test:phase6    # Phase 6 Admin Analytics, RAG Evaluation & Vector Purge test suite
```

### 6. Running the Frontend Application
```bash
cd client
npm install
npm run dev
```
Frontend App will start at: `http://localhost:5173`

---

## Grounded RAG Question-Answering Architecture

```
Student Query
  │
  ▼
Embedding Generation (text-embedding-004)
  │
  ▼
Supabase pgvector Cosine Search (Top-4 Chunks)
  │
  ├────── Match Count == 0 OR Similarity < 0.65 ────► Safe Fallback ("I could not find...")
  │
  ▼ Match Similarity >= 0.65
Grounded Context Assembly + Source Provenance
  │
  ▼
Gemini 2.0 Flash Generation (systemInstruction grounding + prompt injection defense)
  │
  ▼
Backend Structured Answer + Source Page Citations
```

### Hallucination Protection Rules
* **Hard Boundary Rule A**: If pgvector returns 0 chunks above threshold $\rightarrow$ Gemini call is skipped entirely; returns exact fallback message.
* **Hard Boundary Rule B**: If maximum similarity score $< 0.65$ (`RAG_SIMILARITY_THRESHOLD`) $\rightarrow$ Gemini call is skipped; returns exact fallback message: `"I could not find relevant official college information regarding your request."`
* **Prompt Injection Defense**: Retrieved chunk text is treated strictly as passive evidence. System instruction overrides any commands/instructions embedded inside document text.
* **Document Deletion Safety**: Deleting a document purges all chunks and embeddings. Subsequent vector searches cannot retrieve deleted document content.

---

## Admin Endpoints & RAG Evaluation Engine

* `GET /api/admin/stats` - System totals (Documents, Pages, Chunks, Threads, Messages, Feedback %)
* `POST /api/admin/documents` - PDF upload & vector ingestion
* `GET /api/admin/documents` - Document list & status
* `DELETE /api/admin/documents/:id` - Permanent deletion of document, chunks, and vectors
* `POST /api/admin/evaluation/run` - Runs automated RAG evaluation benchmark suite
* `GET /api/admin/evaluation/results` - Retrieves cached evaluation benchmark results
