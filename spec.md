# Technical Specification: CampusGPT - RAG-Based College Chatbot

**Document Version:** 1.1.0 (Updated with Verification & RAG Evaluation Suite)  
**Status:** Pending User Approval (Spec-First Phase)  
**Author:** Lead Software Architect  
**Project:** CampusGPT  

---

## 1. Project Overview

**CampusGPT** is an enterprise-grade, retrieval-augmented generation (RAG) college assistant system designed to provide students with accurate, authoritative, and source-attributed answers derived strictly from official college documents (e.g., academic handbooks, fee structures, exam rules, course syllabi, campus policies).

Unlike standard conversational AI systems that generate responses based on general pre-trained web data, CampusGPT enforces a **strict Retrieval-Augmented Generation (RAG) pipeline**. Every query is converted into a vector embedding, matched against indexed college documents in a vector database, and passed as grounded context to a Large Language Model (LLM). If relevant information is absent from the knowledge base, the system explicitly reports that the information is unavailable, preventing hallucinations.

---

## 2. Problem Statement

College students frequently struggle to find accurate, up-to-date information across dozens of fragmented PDFs, department notices, policy handbooks, and administrative web pages. Administrative staff face repetitive inquiries regarding timetables, grading rules, admission criteria, and fee structures.

Existing solutions rely either on basic keyword search (which fails on natural language questions) or generic chatbot APIs (which hallucinate policies, mix up college rules, and expose institutions to compliance risks).

**CampusGPT solves this by:**
1. Ingesting, parsing, chunking, and vectorizing official college documentation into a searchable knowledge base while preserving exact page-level provenance.
2. Answering student inquiries using semantic vector search and context-grounded LLM synthesis.
3. Citing the precise source documents and page numbers for complete verification.
4. Preserving administrative control via a protected management portal for document uploads, re-indexing, and query feedback monitoring.

---

## 3. Goals

### Primary Objectives
* **Zero-Hallucination Guardrails:** Restrict AI responses strictly to retrieved college documentation context with fallback mechanisms when information is missing.
* **Page-Level Source Attribution:** Attach source document names and page numbers (e.g., `[Doc: Academic Regulations 2025.pdf, Page: 14]`) to every generated answer.
* **Production RAG Pipeline:** Deliver a genuine end-to-end RAG architecture (Document → Page Extraction → Chunking → Embedding → Vector Search → Context Assembly → LLM Prompt → Answer + Sources).
* **Configurable Retrieval Cutoff:** Support configurable similarity thresholds (`RAG_SIMILARITY_THRESHOLD`) evaluated against a benchmark RAG dataset.
* **Locked Technology Stack:** React + TypeScript + Vite + Tailwind CSS frontend coupled with a Node.js + Express + TypeScript backend.
* **Role-Based Security:** Provide distinct, secure interfaces for Students (chat & history) and Admins (document management & knowledge indexing).
* **Cloud-Native Deployment:** Deploy cleanly on public cloud infrastructure (Vercel frontend, Render backend, Supabase / MongoDB Atlas DB & Vector Store).

---

## 4. User Roles & Capabilities

| Role | Permissions & Actions |
| :--- | :--- |
| **Student** | • Register & Authenticate (JWT-based session).<br>• Access protected chat interface.<br>• Submit natural language questions.<br>• View grounded answers with explicit document source citations and page numbers.<br>• Maintain multi-session conversation history.<br>• Provide thumbs up / thumbs down feedback on answers.<br>• Clear or delete conversation history. |
| **Administrator** | • Admin Login with elevated security credentials.<br>• View dashboard analytics (total docs, chunk count, query metrics).<br>• Upload official PDF / TXT / Markdown college documents.<br>• Trigger manual or automated document parsing, chunking, and indexing.<br>• Monitor document processing status (`pending`, `processing`, `indexed`, `failed`).<br>• Delete outdated documents (purges document records and corresponding vector embeddings).<br>• View student feedback logs to identify knowledge base gaps. |

---

## 5. Functional Requirements

### 5.1 Student Functional Requirements
* **FR-STU-01 (Authentication):** Students can register with email and password, log in, and maintain session authorization via JWT stored securely.
* **FR-STU-02 (Chat Interface):** Interface supports real-time streaming or message-by-message rendering with markdown formatting, code blocks, and lists.
* **FR-STU-03 (RAG Query Execution):** Questions pass through semantic similarity search to retrieve relevant document chunks before generation.
* **FR-STU-04 (Source Verification):** Answers include expandable UI chips showing source document titles, relevant page numbers, and chunk snippets.
* **FR-STU-05 (Fallback Notice):** If top similarity score is below the configurable threshold (`RAG_SIMILARITY_THRESHOLD`, default `0.65`), display: *"I could not find relevant official college information to answer your question. Please contact student services."*
* **FR-STU-06 (History Management):** Conversations are auto-saved. Students can switch between historical threads or start a new chat.

### 5.2 Admin Functional Requirements
* **FR-ADM-01 (Admin Auth):** Restricted routes verified by `role === 'admin'` claims in JWT tokens.
* **FR-ADM-02 (Document Ingestion):** Admin can upload single or batch PDF/TXT files (up to 15MB per file).
* **FR-ADM-03 (Processing Pipeline Status):** Real-time or polling status updates during text extraction, page tracking, chunking, and embedding generation.
* **FR-ADM-04 (Knowledge Base Purge):** Deleting a document removes metadata, raw text, and all associated vector embeddings from the vector store in a single atomic operation.
* **FR-ADM-05 (Feedback Audit):** Review student feedback (downvotes + optional comments) to identify missing topics in the knowledge base.

### 5.3 RAG Engine Requirements
* **FR-RAG-01 (Page-Aware Parsing):** Extract clean plaintext from PDF files while preserving page boundaries (`page_number`).
* **FR-RAG-02 (Intelligent Chunking):** Implement overlapping window chunking (1000 characters per chunk with 200 character overlap) attached to source page metadata.
* **FR-RAG-03 (Embedding Model Verification):** Generate dense vector representations using **Google Gemini `text-embedding-004` (768 dimensions)** via the official Google Gen AI SDK (`@google/genai`).
* **FR-RAG-04 (Vector Store):** Index embeddings using HNSW (Hierarchical Navigable Small World) cosine distance index in Supabase (`pgvector`).
* **FR-RAG-05 (Context Window Optimization):** Retrieve top-K ($K=4$) highest-scoring chunks, format them with explicit document and page tags, and inject into the system prompt.

---

## 6. Non-Functional Requirements

* **NFR-SEC-01 (Security):** Passwords hashed using `bcrypt` (salt factor 12). JWT tokens signed with SHA-256 secret. CORS restricted to designated frontend domains.
* **NFR-PERF-01 (Latency):** Vector retrieval latency $< 300\text{ ms}$. Total response time (retrieval + LLM generation) $< 3.5\text{ seconds}$.
* **NFR-REL-01 (Reliability):** Document processing failure in one file does not halt batch processing of other files. Failed states captured in DB with detailed error messages.
* **NFR-USA-01 (Usability):** Fully responsive UI supporting Desktop (1920x1080), Tablet (768x1024), and Mobile (375x812) viewports. Accessible contrast compliance (WCAG 2.1 AA).
* **NFR-MNT-01 (Maintainability):** Modular architecture with clean separation of layers (Routes → Controllers → Services → RAG Pipeline → Database Models).

---

## 7. Locked Technology Stack & Rationale

> [!IMPORTANT]
> The technology stack defined below is **explicitly locked** and will be maintained consistently across all phases of implementation.

| Layer | Technology | Status | Selection Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend UI Framework** | **React (v18+)** | **LOCKED** | Component-driven, declarative UI building block. |
| **Language (Frontend & Backend)**| **TypeScript (v5+)** | **LOCKED** | Type-safe API contracts, database interfaces, and RAG data models. |
| **Build Tooling & Dev Server** | **Vite** | **LOCKED** | Lightning-fast HMR, optimized production bundler for React. |
| **Styling Framework** | **Tailwind CSS** | **LOCKED** | Utility-first CSS for sleek, responsive, modern dark/light UI design. |
| **Backend Framework** | **Node.js + Express** | **LOCKED** | Asynchronous I/O for file streams, REST endpoints, and AI SDK integration. |
| **Database & Vector Store** | **Supabase (PostgreSQL + `pgvector`)** | **LOCKED** | Combined relational database and vector store with HNSW index support. |
| **Embedding Model** | **Google Gemini `text-embedding-004`** | **VERIFIED** | Official 768-dim model supported in `@google/genai` SDK (`embedContent`). |
| **LLM Engine** | **Google Gemini 2.0 Flash (`gemini-2.0-flash`)** | **VERIFIED** | Fast inference, grounded prompt execution, 1M token context capacity. |
| **PDF Parsing (Page-Aware)** | **`pdf-parse` (with page render hooks)** | **LOCKED** | Page-by-page text extraction for exact page citation provenance. |
| **Text Chunking** | **LangChain Text Splitters** | **LOCKED** | `RecursiveCharacterTextSplitter` preserving sentence & page boundaries. |

---

## 8. System Architecture

```
                                  +-----------------------+
                                  |     Student / Admin   |
                                  |     Web Browser       |
                                  +-----------+-----------+
                                              |
                                              | HTTP / HTTPS (REST API)
                                              v
                                  +-----------------------+
                                  |   Vercel (Frontend)   |
                                  | React + TS + Vite App |
                                  +-----------+-----------+
                                              |
                                              | API Calls (Bearer Token)
                                              v
                                  +-----------------------+
                                  |   Render (Backend)    |
                                  | Node.js / Express API |
                                  +-----+-----+-----+-----+
                                        |     |     |
              +-------------------------+     |     +-------------------------+
              |                               |                               |
              v                               v                               v
  +-----------------------+       +-----------------------+       +-----------------------+
  |  Supabase / Postgres  |       | Google Gemini API     |       | Document Pipeline     |
  |  - Auth & User Data   |       | - text-embedding-004  |       | - pdf-parse (Pages)   |
  |  - Chat & History     |       | - gemini-2.0-flash    |       | - Recursive Splitter  |
  |  - pgvector HNSW      |       +-----------------------+       +-----------------------+
  +-----------------------+
```

---

## 9. RAG Architecture & Page Provenance Strategy

```
+-----------------------------------------------------------------------------------+
|                     PAGE-PRESERVING DOCUMENT INGESTION PIPELINE                    |
| PDF File --> [pdf-parse (Page Split)] --> Pages [1..N] --> [Cleaner]               |
|                                                              |                    |
|                                                              v                    |
| Vector Store <-- [Metadata (Doc + Page) + Vector] <-- [text-embedding-004]       |
+-----------------------------------------------------------------------------------+

+-----------------------------------------------------------------------------------+
|                              RETRIEVAL & GENERATION PIPELINE                      |
| User Query --> [Gemini Embedding] --> Query Vector                               |
|                                               |                                   |
|                                               v                                   |
|                         [pgvector Cosine Search (Top-4)]                          |
|                                               |                                   |
|                  Score >= RAG_SIMILARITY_THRESHOLD (Default: 0.65)                |
|                                               |                                   |
|                     +-------------------------+-------------------------+         |
|                     | Match Found                                       | Below   |
|                     v                                                   v Threshold
|       [System Prompt Assembly]                                [Fallback Response] |
| (Page Context + User Query + Rules)                             "Information not  |
|                     |                                          found in college   |
|                     v                                           records."         |
|         [Gemini 2.0 Flash LLM]                                                    |
|                     |                                                             |
|                     v                                                             |
|   [Answer + Doc Name + Page Reference]                                            |
+-----------------------------------------------------------------------------------+
```

### 9.1 Page-Level Provenance & Pipeline Flow
1. **Page-Aware PDF Extraction**: `pdf-parse` extracts text page by page. Each page text object is tagged with `page_number` (1-indexed).
2. **Page-Bounded Chunking**: Text chunking is executed per page (or across pages with explicit page tag tracking). Every chunk record maintains:
   * `document_id`: Parent document UUID
   * `document_title`: Display filename (e.g. `Academic_Regulations_2025.pdf`)
   * `page_number`: Original PDF page number (e.g. `14`)
   * `chunk_index`: Sequential integer index
   * `content`: Clean text payload
3. **Embedding Generation**: `text-embedding-004` computes 768d vector array for each chunk.
4. **Context Injection Template**: Retrieved chunks format page metadata explicitly for LLM synthesis:
   ```text
   ---
   Source: Academic_Regulations_2025.pdf | Page: 14 | Chunk: 3
   Content: Attendance Requirement: Every student is required to attend a minimum of 75% of classes in each subject to appear for semester end examinations.
   ---
   ```
5. **LLM Citation Generation**: The system prompt instructs Gemini 2.0 Flash to cite sources using `[Doc: <document_title>, Page: <page_number>]`.

---

## 10. Configurable Retrieval Threshold

To prevent hallucination while allowing post-deployment optimization, the similarity cutoff score is **dynamically configurable via environment variables**:

* **Environment Variable**: `RAG_SIMILARITY_THRESHOLD=0.65`
* **Configuration Module**: Exported via `server/src/config/env.ts` as `config.rag.similarityThreshold`.
* **Runtime Behavior**:
  * If $\max(\text{Cosine Similarity Scores}) \ge \texttt{RAG\_SIMILARITY\_THRESHOLD}$, assemble context and trigger LLM response.
  * If $\max(\text{Cosine Similarity Scores}) < \texttt{RAG\_SIMILARITY\_THRESHOLD}$, return the safe fallback message without executing LLM generation.
* **Tuning Protocol**: The threshold value will be benchmarked and calibrated using the RAG Evaluation Suite (Section 17).

---

## 11. Database Schema (Supabase PostgreSQL / `pgvector`)

### 11.1 Table: `users`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default `gen_random_uuid()` | Unique user identifier |
| `name` | `VARCHAR(100)` | NOT NULL | User's full name |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE, Indexed | User login email |
| `password_hash`| `VARCHAR(255)` | NOT NULL | Bcrypt hashed password |
| `role` | `VARCHAR(20)` | NOT NULL, Check `('student', 'admin')` | User access role |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Registration timestamp |

### 11.2 Table: `documents`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default `gen_random_uuid()` | Unique document identifier |
| `title` | `VARCHAR(255)` | NOT NULL | Display document name |
| `filename` | `VARCHAR(255)` | NOT NULL | Storage filename |
| `file_size` | `INTEGER` | NOT NULL | Size in bytes |
| `mime_type` | `VARCHAR(50)` | Default `'application/pdf'` | File type |
| `status` | `VARCHAR(20)` | NOT NULL, Check `('pending','processing','indexed','failed')` | Status |
| `total_pages` | `INTEGER` | Default `0` | Total extracted page count |
| `total_chunks` | `INTEGER` | Default `0` | Total chunk count |
| `error_message`| `TEXT` | Nullable | Ingestion error details |
| `uploaded_by` | `UUID` | Foreign Key `users(id)` | Admin user ID |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Upload timestamp |

### 11.3 Table: `document_chunks` (With Page Metadata & Vectors)
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default `gen_random_uuid()` | Unique chunk identifier |
| `document_id` | `UUID` | Foreign Key `documents(id)` ON DELETE CASCADE | Parent document reference |
| `chunk_index` | `INTEGER` | NOT NULL | Sequential chunk index |
| `page_number` | `INTEGER` | NOT NULL | **Original PDF page number (1-indexed)** |
| `content` | `TEXT` | NOT NULL | Raw text content of chunk |
| `metadata` | `JSONB` | NOT NULL | `{ document_title, page_number, chunk_index, section_title }` |
| `embedding` | `VECTOR(768)` | Index `HNSW (cosine)` | Gemini `text-embedding-004` vector |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp |

### 11.4 Table: `conversations`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default `gen_random_uuid()` | Thread ID |
| `user_id` | `UUID` | Foreign Key `users(id)` ON DELETE CASCADE | Student ID |
| `title` | `VARCHAR(255)` | Default `'New Conversation'` | Title |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Start time |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()` | Last message time |

### 11.5 Table: `messages`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default `gen_random_uuid()` | Message ID |
| `conversation_id`| `UUID` | Foreign Key `conversations(id)` ON DELETE CASCADE | Thread reference |
| `sender` | `VARCHAR(10)` | Check `('user', 'assistant')` | Message sender |
| `text` | `TEXT` | NOT NULL | Content |
| `sources` | `JSONB` | Nullable | Array of source metadata `[{ document_title, page_number, snippet }]` |
| `feedback` | `VARCHAR(10)` | Nullable, Check `('like', 'dislike')` | Student feedback |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp |

---

## 12. API Specification

### 12.1 Authentication Routes (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
* **Auth:** Public
* **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@college.edu",
    "password": "SecurePassword123!",
    "role": "student"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@college.edu", "role": "student" }
  }
  ```

#### `POST /api/v1/auth/login`
* **Auth:** Public
* **Request Body:** `{"email": "jane@college.edu", "password": "SecurePassword123!"}`
* **Response (200 OK):** `{ "success": true, "token": "...", "user": { ... } }`

---

### 12.2 Chat & RAG Routes (`/api/v1/chat`)

#### `POST /api/v1/chat/query`
* **Auth:** Bearer JWT (Student)
* **Request Body:**
  ```json
  {
    "conversation_id": "uuid-v4",
    "question": "What is the minimum attendance required for final exams?"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "answer": "According to official policy, students must maintain a minimum of 75% attendance in each subject to be eligible for end-semester examinations [Doc: Academic Regulations 2025.pdf, Page: 14].",
    "sources": [
      {
        "document_title": "Academic Regulations 2025.pdf",
        "page_number": 14,
        "snippet": "Attendance Requirement: Every student is required to attend a minimum of 75%..."
      }
    ],
    "message_id": "uuid-v4"
  }
  ```

---

### 12.3 Document Ingestion & Admin Routes (`/api/v1/admin/documents`)

#### `POST /api/v1/admin/documents/upload`
* **Auth:** Bearer JWT (Admin)
* **Content-Type:** `multipart/form-data`
* **Response (202 Accepted):** `{ "success": true, "document": { "id": "doc-uuid", "title": "Handbook.pdf", "status": "processing" } }`

#### `DELETE /api/v1/admin/documents/:id`
* **Auth:** Bearer JWT (Admin)
* **Response (200 OK):** `{ "success": true, "message": "Document and all associated page embeddings purged successfully" }`

---

## 13. Frontend Pages & UI Architecture

1. **Landing & Auth Page (`/login`, `/register`)**: React + Tailwind forms for Login/Register with role switcher.
2. **Student Chat Interface (`/chat`)**: Sidebar for conversation history, main chat area with markdown, interactive source chips displaying **Document Name + Page Number**, feedback thumbs up/down, suggested questions.
3. **Admin Dashboard (`/admin`)**: Analytics cards, PDF drag & drop upload zone, document status table with live status tags, deletion action trigger.

---

## 14. Backend Architecture & Layers

```
server/
├── src/
│   ├── config/             # env.ts (includes RAG_SIMILARITY_THRESHOLD), db.ts, gemini.ts
│   ├── controllers/        # auth.controller.ts, chat.controller.ts, admin.controller.ts
│   ├── middleware/         # authMiddleware.ts, adminGuard.ts, errorHandler.ts, upload.ts
│   ├── models/             # user.model.ts, document.model.ts, chunk.model.ts
│   ├── routes/             # auth.routes.ts, chat.routes.ts, admin.routes.ts
│   ├── services/           # Business logic: rag.service.ts, pdf.service.ts, embedding.service.ts
│   ├── utils/              # textCleaner.ts, logger.ts
│   └── index.ts            # Entry point
```

---

## 15. Complete Folder Structure

```
CampusGPT/
├── client/                     # Frontend (React + TypeScript + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Chat (MessageBubble, SourceBadge, PromptInput), Admin (DocumentTable, UploadDropzone)
│   │   ├── context/            # AuthContext, ChatContext
│   │   ├── pages/              # LoginPage, RegisterPage, ChatPage, AdminPage
│   │   ├── services/           # api.ts (Axios wrapper with JWT interceptor)
│   │   ├── types/              # index.ts (User, Message, Source, Document)
│   │   ├── App.tsx             # Router configuration
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── server/                     # Backend (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/             # env.ts, db.ts, gemini.ts
│   │   ├── controllers/        # auth, chat, admin controllers
│   │   ├── middleware/         # auth, adminGuard, errorHandler, multer
│   │   ├── routes/             # auth, chat, admin routes
│   │   ├── services/           # ragService, pdfService, embeddingService, llmService
│   │   ├── types/              # custom Express & RAG types
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
├── README.md
└── spec.md                     # Technical Specification
```

---

## 16. Development Phases

### Phase 1: Foundation, Authentication & Core Infrastructure
* **Objective**: React + TS + Vite + Tailwind frontend shell, Node + Express + TS server setup, Supabase DB connection, `users` table, JWT auth API.

### Phase 2: Page-Aware Document Ingestion & Chunking Engine
* **Objective**: Admin upload endpoint, page-by-page PDF extraction with `pdf-parse`, page metadata preservation, recursive text chunking.

### Phase 3: Embedding Pipeline & Vector Database Search
* **Objective**: Compute Google Gemini `text-embedding-004` (768d) vectors via `@google/genai`, store in `document_chunks` table with `pgvector`, build cosine similarity match algorithm.

### Phase 4: Grounded LLM Synthesis, Threshold Tuning & RAG Pipeline
* **Objective**: Integrate Gemini 2.0 Flash LLM, implement grounded system prompt, integrate configurable `RAG_SIMILARITY_THRESHOLD` (default `0.65`), execute initial evaluation.

### Phase 5: Student Chat Interface & Page Citation UI
* **Objective**: Build chat UI with sidebar history, interactive markdown, expandable source badges (Doc Title + Page Number), feedback buttons.

### Phase 6: Admin Portal, System Polish & RAG Evaluation Benchmark
* **Objective**: Admin dashboard, document delete with vector purge, error boundaries, execution of full RAG Evaluation Suite (Section 17).

### Phase 7: Deployment, Verification & Final Documentation
* **Objective**: Deploy client to Vercel, server to Render, Supabase production database, live end-to-end evaluation, README documentation.

---

## 17. RAG Evaluation Dataset & Testing Strategy

To guarantee zero hallucination, retrieval accuracy, and precise page citations, CampusGPT requires testing against a benchmark **RAG Evaluation Suite** before final deployment.

### 17.1 Evaluation Dataset Categories

#### Category A: In-Scope Evaluation Dataset (Grounded College Queries)
Queries derived directly from ingested college handbooks and policies:
1. **Attendance Requirement**: *"What is the minimum attendance percentage required to be eligible for end-semester exams?"*
   * *Expected Retrieval*: Chunks from `Academic Regulations 2025.pdf` (Page 14).
   * *Expected Citation*: `[Doc: Academic Regulations 2025.pdf, Page: 14]`.
2. **Examination Policy**: *"What is the process and fee for re-evaluating a semester exam paper?"*
   * *Expected Retrieval*: Chunks from `Examination_Handbook_2024.pdf` (Page 22).
3. **Fee Structure**: *"When is the final deadline for paying odd-semester tuition fees?"*
   * *Expected Retrieval*: Chunks from `Fee_Structure_2024_25.pdf` (Page 3).
4. **Admission Criteria**: *"What are the minimum eligibility criteria for admission into the M.Tech Computer Science program?"*
   * *Expected Retrieval*: Chunks from `Admissions_Prospectus_2025.pdf` (Page 8).
5. **Grading & CGPA**: *"How is the semester grade point average (SGPA) calculated?"*
   * *Expected Retrieval*: Chunks from `Academic Regulations 2025.pdf` (Page 18).

#### Category B: Out-of-Scope Evaluation Dataset (Fallback & Anti-Hallucination)
Queries whose answers are NOT present in the college knowledge base:
1. **General Trivia**: *"Who won the 1998 FIFA World Cup?"*
2. **Unrelated Technical Query**: *"How do I implement a red-black tree in C++?"*
3. **World Knowledge**: *"What is the distance between the Earth and the Moon?"*
4. **Un-indexed Policy**: *"What is the campus dress code for weekend sporting events?"* (Assuming sports policy PDF was not uploaded).

### 17.2 Evaluation Metrics & Verification Protocol

| Metric | Target Goal | Verification Method |
| :--- | :--- | :--- |
| **Retrieval Recall@4** | $\ge 95\%$ | Verify correct source chunk ranks in top-4 retrieved results for Category A. |
| **Grounded Synthesis Accuracy** | $100\%$ | Verify facts in LLM answer match retrieved context without adding unverified claims. |
| **Page Citation Accuracy** | $100\%$ | Verify `page_number` in UI chip matches exact page of source PDF. |
| **Fallback Trigger Accuracy** | $100\%$ | Verify Category B queries fail similarity threshold and return exact fallback string. |
| **Zero Hallucination Rate** | $100\%$ | Verify no fabricated policies or ungrounded statements are produced. |

---

## 18. Deployment Architecture

```
                    [GitHub Repository]
                           |
            +--------------+--------------+
            |                             |
            v                             v
     [Vercel Cloud]                [Render Cloud]
   Frontend Application          Backend REST API
  (React + TS + Vite)           (Node.js + Express)
            |                             |
            +--------------+--------------+
                           |
                           v
              [Supabase Cloud Database]
         PostgreSQL + pgvector Vector Search
```

---

## 19. Environment Variables Specification

### Server (`server/.env`)
```env
PORT=5000
NODE_ENV=development

# Database Configuration (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=super_secret_jwt_key_campusgpt_2026_prod
JWT_EXPIRES_IN=7d

# Google Gemini AI Config
GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here
EMBEDDING_MODEL=text-embedding-004
LLM_MODEL=gemini-2.0-flash

# RAG Configuration
RAG_SIMILARITY_THRESHOLD=0.65

# CORS Configuration
CLIENT_URL=http://localhost:5173
```

### Client (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 20. Final Expected Outcome

A production-ready, fully responsive web application called **CampusGPT** featuring:
1. Genuine, fully functional RAG pipeline grounded in college documents.
2. Page-level source provenance displaying document names and page numbers in the chat UI.
3. Zero hallucinations with clear fallback state when information is missing.
4. Dynamically configurable similarity threshold (`RAG_SIMILARITY_THRESHOLD`).
5. Validated against an in-scope and out-of-scope RAG Evaluation Suite.
6. Explicitly locked stack: React + TypeScript + Vite + Tailwind CSS (Client) + Node.js + Express + TypeScript (Server) + Supabase (Database).
7. Deployed public URLs (Vercel + Render + Supabase) ready for evaluation.
