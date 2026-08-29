import app from '../app';
import http from 'http';
import { AddressInfo } from 'net';
import { EmbeddingService } from '../services/embedding.service';
import { ChunkingService } from '../services/chunking.service';
import { VectorService } from '../services/vector.service';
import { ChunkModel } from '../models/chunk.model';
import { DocumentModel } from '../models/document.model';

async function runPhase6AdminSecurityTests() {
  console.log('🧪 Running Phase 6 Admin Analytics, RAG Evaluation & Vector Purge Tests...\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://localhost:${address.port}/api`;

  let adminToken = '';
  let studentToken = '';

  try {
    // Setup Admin & Student Accounts
    const adminReg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase6 Admin',
        email: 'p6admin@college.edu',
        password: 'AdminPassword123!',
        role: 'admin',
      }),
    });
    const adminData = (await adminReg.json()) as any;
    adminToken = adminData.token;

    const studentReg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase6 Student',
        email: 'p6student@college.edu',
        password: 'StudentPassword123!',
        role: 'student',
      }),
    });
    const studentData = (await studentReg.json()) as any;
    studentToken = studentData.token;

    // 1. Security Headers Check
    console.log('1️⃣  Testing Response Security Headers (Helmet/Security Middleware)...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const nosniff = healthRes.headers.get('x-content-type-options');
    const xframe = healthRes.headers.get('x-frame-options');

    if (nosniff === 'nosniff' && xframe === 'DENY') {
      console.log('   ✅ Security headers present: nosniff and DENY verified.');
    } else {
      throw new Error(`Security headers missing! nosniff: ${nosniff}, xframe: ${xframe}`);
    }

    // 2. Admin System Statistics API (GET /api/admin/stats)
    console.log('\n2️⃣  Testing Admin Stats API (GET /api/admin/stats) & Role Guards...');

    // Unauth -> 401
    const unauthStats = await fetch(`${baseUrl}/admin/stats`);
    if (unauthStats.status === 401) {
      console.log('   ✅ Unauthenticated GET /api/admin/stats rejected with 401.');
    }

    // Student -> 403
    const studentStats = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (studentStats.status === 403) {
      console.log('   ✅ Student GET /api/admin/stats rejected with 403 Forbidden.');
    }

    // Admin -> 200
    const adminStats = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = (await adminStats.json()) as any;
    if (adminStats.status === 200 && statsData.success && statsData.stats) {
      console.log(`   ✅ Admin stats fetched successfully: ${statsData.stats.total_documents} docs, ${statsData.stats.total_messages} messages, ${statsData.stats.positive_feedback_percentage}% positive feedback.`);
    } else {
      throw new Error(`Admin stats API failed: ${JSON.stringify(statsData)}`);
    }

    // 3. Ingest In-Scope Benchmark Documents for Evaluation
    console.log('\n3️⃣  Ingesting College Knowledge Base for RAG Evaluation Benchmark...');
    const academicPages = [
      { page_number: 14, text: 'Academic Regulations 2025. Attendance Requirements: Every student must maintain 75% attendance to sit for semester examinations.' },
      { page_number: 18, text: 'CGPA Calculation: CGPA is calculated by multiplying credit points with grade points divided by total units.' },
    ];
    const doc1 = await DocumentModel.create({ title: 'Academic Regulations 2025', filename: 'Academic_Regulations_2025.pdf', file_size: 1048576, uploaded_by: 'admin-id' });
    await DocumentModel.updateStatus(doc1.id, 'processing');
    const chunks1 = ChunkingService.createDocumentChunks(academicPages, doc1.id, doc1.title, doc1.filename);
    const emb1 = await EmbeddingService.generateBatchEmbeddings(chunks1.map((c) => c.content));
    await ChunkModel.createMany(doc1.id, chunks1, emb1);
    await DocumentModel.updateStatus(doc1.id, 'indexed', { total_pages: 2, total_chunks: chunks1.length });

    const examPages = [{ page_number: 22, text: 'Examination Handbook 2024. Re-evaluation Policy: Fee is $50 per paper within 14 days.' }];
    const doc2 = await DocumentModel.create({ title: 'Examination Handbook 2024', filename: 'Examination_Handbook_2024.pdf', file_size: 1048576, uploaded_by: 'admin-id' });
    await DocumentModel.updateStatus(doc2.id, 'processing');
    const chunks2 = ChunkingService.createDocumentChunks(examPages, doc2.id, doc2.title, doc2.filename);
    const emb2 = await EmbeddingService.generateBatchEmbeddings(chunks2.map((c) => c.content));
    await ChunkModel.createMany(doc2.id, chunks2, emb2);
    await DocumentModel.updateStatus(doc2.id, 'indexed', { total_pages: 1, total_chunks: chunks2.length });

    const feePages = [{ page_number: 3, text: 'Fee Structure 2025. Final tuition fee deadline is August 31, 2025.' }];
    const doc3 = await DocumentModel.create({ title: 'Fee Structure 2025', filename: 'Fee_Structure_2025.pdf', file_size: 1048576, uploaded_by: 'admin-id' });
    await DocumentModel.updateStatus(doc3.id, 'processing');
    const chunks3 = ChunkingService.createDocumentChunks(feePages, doc3.id, doc3.title, doc3.filename);
    const emb3 = await EmbeddingService.generateBatchEmbeddings(chunks3.map((c) => c.content));
    await ChunkModel.createMany(doc3.id, chunks3, emb3);
    await DocumentModel.updateStatus(doc3.id, 'indexed', { total_pages: 1, total_chunks: chunks3.length });

    const admissionPages = [{ page_number: 5, text: 'Admissions Prospectus 2025. B.Tech eligibility minimum aggregate marks of 60%.' }];
    const doc4 = await DocumentModel.create({ title: 'Admissions Prospectus 2025', filename: 'Admissions_Prospectus_2025.pdf', file_size: 1048576, uploaded_by: 'admin-id' });
    await DocumentModel.updateStatus(doc4.id, 'processing');
    const chunks4 = ChunkingService.createDocumentChunks(admissionPages, doc4.id, doc4.title, doc4.filename);
    const emb4 = await EmbeddingService.generateBatchEmbeddings(chunks4.map((c) => c.content));
    await ChunkModel.createMany(doc4.id, chunks4, emb4);
    await DocumentModel.updateStatus(doc4.id, 'indexed', { total_pages: 1, total_chunks: chunks4.length });

    // 4. RAG Evaluation Engine API (POST /api/admin/evaluation/run)
    console.log('\n4️⃣  Testing Admin RAG Evaluation Benchmark Execution (POST /api/admin/evaluation/run)...');
    const evalRes = await fetch(`${baseUrl}/admin/evaluation/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const evalData = (await evalRes.json()) as any;

    if (evalRes.status === 200 && evalData.success && evalData.summary.overall_score_percentage === 100) {
      console.log(`   ✅ RAG Benchmark Evaluation passed with Overall Score: ${evalData.summary.overall_score_percentage}%, Recall@4: ${evalData.summary.recall_at_4_percentage}%, Citation Accuracy: ${evalData.summary.citation_accuracy_percentage}%.`);
    } else {
      throw new Error(`RAG evaluation failed: ${JSON.stringify(evalData)}`);
    }

    // 5. Document Deletion & Vector Purge Verification
    console.log('\n5️⃣  Testing Document Deletion Safety & Vector Cleanup Verification...');
    const purgePages = [{ page_number: 1, text: 'Secret Special Campus Discount Regulation Code XYZ-999.' }];
    const docPurge = await DocumentModel.create({ title: 'Purge Test Regulation', filename: 'Purge_Test.pdf', file_size: 512000, uploaded_by: 'admin-id' });
    await DocumentModel.updateStatus(docPurge.id, 'processing');
    const chunksPurge = ChunkingService.createDocumentChunks(purgePages, docPurge.id, docPurge.title, docPurge.filename);
    const embPurge = await EmbeddingService.generateBatchEmbeddings(chunksPurge.map((c) => c.content));
    await ChunkModel.createMany(docPurge.id, chunksPurge, embPurge);
    await DocumentModel.updateStatus(docPurge.id, 'indexed', { total_pages: 1, total_chunks: chunksPurge.length });

    // Verify vector search finds purge document content prior to deletion
    const searchBefore = await VectorService.searchRelevantChunks('Secret Special Campus Discount Regulation Code', { topK: 4, threshold: 0.30 });
    if (searchBefore.results.length === 0 || !searchBefore.results.some((r) => r.document_id === docPurge.id)) {
      throw new Error(`Vector search failed to retrieve purge test document before deletion.`);
    }
    console.log(`   ✅ Vector search successfully retrieved purge test document prior to deletion.`);

    // Execute Admin Document Delete
    const deleteRes = await fetch(`${baseUrl}/admin/documents/${docPurge.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (deleteRes.status !== 200) {
      throw new Error(`Admin document delete failed with status ${deleteRes.status}`);
    }

    // Verify document record deleted
    const deletedRecord = await DocumentModel.findById(docPurge.id);
    const remainingChunks = await ChunkModel.findByDocumentId(docPurge.id);
    if (deletedRecord || remainingChunks.length > 0) {
      throw new Error(`Document record or chunks still exist in database after deletion!`);
    }

    // Verify vector search CANNOT retrieve deleted document content
    const searchAfter = await VectorService.searchRelevantChunks('Secret Special Campus Discount Regulation Code', { topK: 4, threshold: 0.30 });
    if (searchAfter.results.some((r) => r.document_id === docPurge.id)) {
      throw new Error(`RAG INTEGRITY VIOLATION: Deleted document content was still returned by vector search!`);
    }
    console.log('   ✅ Document deletion safety verified: Document record, chunks, and vectors permanently purged. Search returned 0 matches for deleted content.');

    // Cleanup Benchmark documents
    await ChunkModel.deleteByDocumentId(doc1.id);
    await ChunkModel.deleteByDocumentId(doc2.id);
    await ChunkModel.deleteByDocumentId(doc3.id);
    await ChunkModel.deleteByDocumentId(doc4.id);
    await DocumentModel.delete(doc1.id);
    await DocumentModel.delete(doc2.id);
    await DocumentModel.delete(doc3.id);
    await DocumentModel.delete(doc4.id);

    console.log('\n🎉 ALL PHASE 6 ADMIN ANALYTICS, EVALUATION & SECURITY TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('\n❌ PHASE 6 TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runPhase6AdminSecurityTests();
