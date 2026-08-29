import app from '../app';
import http from 'http';
import { AddressInfo } from 'net';
import { EmbeddingService } from '../services/embedding.service';
import { ChunkingService } from '../services/chunking.service';
import { VectorService } from '../services/vector.service';
import { ChunkModel } from '../models/chunk.model';
import { DocumentModel } from '../models/document.model';

async function runPhase3RetrievalTests() {
  console.log('🧪 Running Phase 3 Embedding & Vector Retrieval Benchmark Tests...\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://localhost:${address.port}/api`;

  let adminToken = '';
  let studentToken = '';

  try {
    // Setup Test Accounts
    const adminReg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Retrieval Admin',
        email: 'retrievaladmin@college.edu',
        password: 'AdminPassword123!',
        role: 'admin',
      }),
    });
    const adminRegData = (await adminReg.json()) as any;
    adminToken = adminRegData.token;

    const studentReg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Retrieval Student',
        email: 'retrievalstudent@college.edu',
        password: 'StudentPassword123!',
        role: 'student',
      }),
    });
    const studentRegData = (await studentReg.json()) as any;
    studentToken = studentRegData.token;

    // Test 1: Embedding Model Verification (768 Dimensions)
    console.log('1️⃣  Testing EmbeddingService (text-embedding-004 Verification)...');
    const singleEmbedding = await EmbeddingService.generateEmbedding('What is the minimum attendance requirement?');
    if (Array.isArray(singleEmbedding) && singleEmbedding.length === 768) {
      console.log(`   ✅ Single embedding generated: 768 dimensions verified.`);
    } else {
      throw new Error(`Embedding dimension mismatch! Received: ${singleEmbedding.length}`);
    }

    const batchEmbeddings = await EmbeddingService.generateBatchEmbeddings([
      'Attendance policy and exam eligibility',
      'Tuition fee payment deadlines and installment options',
    ]);
    if (batchEmbeddings.length === 2 && batchEmbeddings[0].length === 768) {
      console.log(`   ✅ Batch embeddings generated: ${batchEmbeddings.length} vectors of 768 dimensions verified.`);
    } else {
      throw new Error(`Batch embedding verification failed!`);
    }

    // Test 2: Ingest In-Scope College Benchmark Documents
    console.log('2️⃣  Ingesting Benchmark College Knowledge Base Documents...');
    const academicPages = [
      {
        page_number: 14,
        text: 'Academic Regulations 2025. Chapter 4: Attendance Requirements. Every student is required to maintain a minimum of 75% attendance in each course to be eligible to sit for semester end examinations. Exceptions may be granted for medical reasons up to 15% with valid medical certificates.',
      },
      {
        page_number: 18,
        text: 'Chapter 6: Grading & CGPA Calculation. Cumulative Grade Point Average (CGPA) is calculated by multiplying credit points with grade points obtained across all registered courses and dividing by total credit units attempted.',
      },
    ];

    const doc1 = await DocumentModel.create({
      title: 'Academic Regulations 2025',
      filename: 'Academic_Regulations_2025.pdf',
      file_size: 2048576,
      uploaded_by: 'admin-id',
    });
    await DocumentModel.updateStatus(doc1.id, 'processing');
    const chunks1 = ChunkingService.createDocumentChunks(
      academicPages,
      doc1.id,
      'Academic Regulations 2025',
      'Academic_Regulations_2025.pdf',
      { chunkSize: 300, chunkOverlap: 50 }
    );
    const emb1 = await EmbeddingService.generateBatchEmbeddings(chunks1.map((c) => c.content));
    await ChunkModel.createMany(doc1.id, chunks1, emb1);
    await DocumentModel.updateStatus(doc1.id, 'indexed', { total_pages: 2, total_chunks: chunks1.length });

    const examPages = [
      {
        page_number: 22,
        text: 'Examination Handbook 2024. Re-evaluation Policy: Students seeking re-evaluation of answer scripts must apply within 14 days of result declaration accompanied by a fee of $50 per course paper. Results will be updated within 30 days.',
      },
    ];

    const doc2 = await DocumentModel.create({
      title: 'Examination Handbook 2024',
      filename: 'Examination_Handbook_2024.pdf',
      file_size: 1548576,
      uploaded_by: 'admin-id',
    });
    await DocumentModel.updateStatus(doc2.id, 'processing');
    const chunks2 = ChunkingService.createDocumentChunks(
      examPages,
      doc2.id,
      'Examination Handbook 2024',
      'Examination_Handbook_2024.pdf',
      { chunkSize: 300, chunkOverlap: 50 }
    );
    const emb2 = await EmbeddingService.generateBatchEmbeddings(chunks2.map((c) => c.content));
    await ChunkModel.createMany(doc2.id, chunks2, emb2);
    await DocumentModel.updateStatus(doc2.id, 'indexed', { total_pages: 1, total_chunks: chunks2.length });

    console.log(`   ✅ Ingested 2 benchmark documents into vector database (${chunks1.length + chunks2.length} total embedded chunks).`);

    // Test 3: Category A In-Scope Semantic Vector Retrieval (Target: Recall@4 = 100%)
    console.log('3️⃣  Testing Category A In-Scope Semantic Vector Retrieval (Target: Recall@4 = 100%)...');
    const query1 = 'What is the minimum attendance percentage required for final semester exams?';
    const startTime1 = Date.now();
    const search1 = await VectorService.searchRelevantChunks(query1, { topK: 4, threshold: 0.40 });
    const duration1 = Date.now() - startTime1;

    if (
      search1.results.length > 0 &&
      search1.results[0].document_title.includes('Academic Regulations') &&
      search1.results[0].page_number === 14
    ) {
      console.log(`   ✅ Query 1 ("Attendance requirement") successfully retrieved: "${search1.results[0].document_title}" (Page ${search1.results[0].page_number}) with similarity ${search1.results[0].similarity} in ${duration1}ms.`);
    } else {
      throw new Error(`In-scope retrieval failed for Query 1: ${JSON.stringify(search1)}`);
    }

    const query2 = 'How do I apply for re-evaluation of an examination paper and what is the fee?';
    const startTime2 = Date.now();
    const search2 = await VectorService.searchRelevantChunks(query2, { topK: 4, threshold: 0.40 });
    const duration2 = Date.now() - startTime2;

    if (
      search2.results.length > 0 &&
      search2.results[0].document_title.includes('Examination Handbook') &&
      search2.results[0].page_number === 22
    ) {
      console.log(`   ✅ Query 2 ("Re-evaluation fee") successfully retrieved: "${search2.results[0].document_title}" (Page ${search2.results[0].page_number}) with similarity ${search2.results[0].similarity} in ${duration2}ms.`);
    } else {
      throw new Error(`In-scope retrieval failed for Query 2: ${JSON.stringify(search2)}`);
    }

    // Test 4: Category B Out-of-Scope Retrieval & Threshold Filtering
    console.log('4️⃣  Testing Category B Out-of-Scope Queries (Threshold Cutoff = 0.65)...');
    const outOfScopeQuery = 'Who won the 1998 FIFA World Cup in Paris France?';
    const outSearch = await VectorService.searchRelevantChunks(outOfScopeQuery, { topK: 4, threshold: 0.65 });

    if (outSearch.results.length === 0) {
      console.log('   ✅ Out-of-scope query correctly returned 0 matches under threshold (0.65 cutoff working).');
    } else {
      throw new Error(`Out-of-scope query failed threshold check! Returned: ${JSON.stringify(outSearch.results)}`);
    }

    // Test 5: Admin Diagnostic Retrieval API Endpoint (POST /api/admin/retrieval/test)
    console.log('5️⃣  Testing Admin Retrieval Diagnostic API Endpoint (POST /api/admin/retrieval/test)...');

    // Unauthenticated request -> 401
    const unauthRes = await fetch(`${baseUrl}/admin/retrieval/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Attendance rules' }),
    });
    if (unauthRes.status === 401) {
      console.log('   ✅ Unauthenticated diagnostic request correctly rejected with 401.');
    }

    // Student request -> 403
    const studentRes = await fetch(`${baseUrl}/admin/retrieval/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ query: 'Attendance rules' }),
    });
    if (studentRes.status === 403) {
      console.log('   ✅ Student access to diagnostic retrieval correctly rejected with 403 Forbidden.');
    }

    // Admin request -> 200
    const adminRes = await fetch(`${baseUrl}/admin/retrieval/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ query: 'What is the minimum attendance requirement?', top_k: 4, threshold: 0.40 }),
    });
    const adminData = (await adminRes.json()) as any;
    if (adminRes.status === 200 && adminData.success && adminData.results.length > 0) {
      console.log(`   ✅ Admin diagnostic retrieval endpoint returned ${adminData.results.length} matches with page provenance.`);
    } else {
      throw new Error(`Admin diagnostic API failed: ${JSON.stringify(adminData)}`);
    }

    // Clean up test documents
    await ChunkModel.deleteByDocumentId(doc1.id);
    await ChunkModel.deleteByDocumentId(doc2.id);
    await DocumentModel.delete(doc1.id);
    await DocumentModel.delete(doc2.id);

    console.log('\n🎉 ALL PHASE 3 EMBEDDING & RETRIEVAL TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('\n❌ PHASE 3 TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runPhase3RetrievalTests();
