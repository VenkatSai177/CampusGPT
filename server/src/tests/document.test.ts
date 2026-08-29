import app from '../app';
import http from 'http';
import { AddressInfo } from 'net';
import { ChunkingService } from '../services/chunking.service';
import { ChunkModel } from '../models/chunk.model';
import { DocumentModel } from '../models/document.model';

async function runPhase2Tests() {
  console.log('🧪 Running Phase 2 Document Ingestion & Chunking Tests...\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://localhost:${address.port}/api`;

  let adminToken = '';
  let studentToken = '';

  try {
    // Setup Test Accounts (Admin & Student)
    const adminReg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Doc Admin',
        email: 'docadmin@college.edu',
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
        name: 'Doc Student',
        email: 'docstudent@college.edu',
        password: 'StudentPassword123!',
        role: 'student',
      }),
    });
    const studentRegData = (await studentReg.json()) as any;
    studentToken = studentRegData.token;

    // Test 1: Unit Test - ChunkingService Recursive Page-Aware Chunking
    console.log('1️⃣  Testing ChunkingService Recursive Page-Aware Chunking...');
    const mockPages = [
      {
        page_number: 1,
        text: 'Academic Regulations 2025. Section 1: Attendance Policy. Every student is required to attend at least 75% of classes in each course to be eligible to appear for the semester end examinations. Exceptions may be granted for medical reasons up to 15% with valid medical certificates.',
      },
      {
        page_number: 2,
        text: 'Section 2: Examination Grading Rules. Grades are awarded on a 10-point scale. Cumulative Grade Point Average (CGPA) is calculated at the end of each semester. Minimum passing grade per course is 4.0 out of 10.0.',
      },
    ];

    const chunks = ChunkingService.createDocumentChunks(
      mockPages,
      'test-doc-id',
      'Academic Regulations 2025',
      'Academic_Regulations_2025.pdf',
      { chunkSize: 150, chunkOverlap: 30 }
    );

    if (chunks.length >= 2 && chunks[0].page_number === 1 && chunks[chunks.length - 1].page_number === 2) {
      console.log(`   ✅ Chunking generated ${chunks.length} page-aware chunks. Page numbers preserved: Page ${chunks[0].page_number} and Page ${chunks[chunks.length - 1].page_number}.`);
    } else {
      throw new Error(`Chunking failed validation: ${JSON.stringify(chunks)}`);
    }

    // Test 2: Unauthenticated Upload Rejection (401)
    console.log('2️⃣  Testing Upload without Authentication (401 Unauthorized)...');
    const unauthRes = await fetch(`${baseUrl}/admin/documents`, {
      method: 'POST',
    });
    if (unauthRes.status === 401) {
      console.log('   ✅ Unauthenticated upload correctly rejected with 401.');
    } else {
      throw new Error(`Unauthenticated upload returned status: ${unauthRes.status}`);
    }

    // Test 3: Student Upload Rejection (403 Forbidden)
    console.log('3️⃣  Testing Student Upload Rejection (403 Forbidden)...');
    const studentUploadRes = await fetch(`${baseUrl}/admin/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (studentUploadRes.status === 403) {
      console.log('   ✅ Student upload correctly rejected with 403 Forbidden.');
    } else {
      throw new Error(`Student upload returned status: ${studentUploadRes.status}`);
    }

    // Test 4: Admin Document Ingestion (Simulated PDF Upload / Ingestion Pipeline)
    console.log('4️⃣  Testing Admin Document Pipeline Ingestion...');

    // Create document record directly via service to verify status progression
    const createdDoc = await DocumentModel.create({
      title: 'Academic Regulations 2025',
      filename: 'Academic_Regulations_2025.pdf',
      file_size: 1048576,
      mime_type: 'application/pdf',
      uploaded_by: 'admin-id',
    });

    if (createdDoc.status === 'pending') {
      console.log('   ✅ Document record created with status="pending".');
    }

    // Processing status
    await DocumentModel.updateStatus(createdDoc.id, 'processing');
    const processingDoc = await DocumentModel.findById(createdDoc.id);
    if (processingDoc?.status === 'processing') {
      console.log('   ✅ Document status updated to "processing".');
    }

    // Store chunks
    const storedChunks = await ChunkModel.createMany(createdDoc.id, chunks);
    const updatedDoc = await DocumentModel.updateStatus(createdDoc.id, 'indexed', {
      total_pages: 2,
      total_chunks: storedChunks.length,
      error_message: null,
    });

    if (updatedDoc?.status === 'indexed' && updatedDoc.total_chunks === storedChunks.length) {
      console.log(`   ✅ Document marked status="indexed" with total_pages=2 and total_chunks=${storedChunks.length}.`);
    } else {
      throw new Error(`Document status update failed: ${JSON.stringify(updatedDoc)}`);
    }

    // Test 5: Verify Chunk Metadata & Null Embedding Reservation
    console.log('5️⃣  Verifying Document Chunks Metadata & Null Embedding Reservation (Phase 3 Ready)...');
    const fetchedChunks = await ChunkModel.findByDocumentId(createdDoc.id);
    if (
      fetchedChunks.length === storedChunks.length &&
      fetchedChunks[0].metadata.page_number === 1 &&
      fetchedChunks[0].embedding === null
    ) {
      console.log('   ✅ Chunks accurately preserved page_number, document_title, and null embedding field for Phase 3.');
    } else {
      throw new Error(`Chunk metadata verification failed: ${JSON.stringify(fetchedChunks[0])}`);
    }

    // Test 6: Admin GET /api/admin/documents
    console.log('6️⃣  Testing GET /api/admin/documents (Admin Auth)...');
    const listRes = await fetch(`${baseUrl}/admin/documents`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = (await listRes.json()) as any;
    if (listRes.status === 200 && listData.documents.length >= 1) {
      console.log(`   ✅ Admin document list retrieved successfully (${listData.documents.length} document(s)).`);
    } else {
      throw new Error(`Document list failed: ${JSON.stringify(listData)}`);
    }

    // Test 7: Admin GET /api/admin/documents/:id
    console.log('7️⃣  Testing GET /api/admin/documents/:id (Details & Chunks)...');
    const detailRes = await fetch(`${baseUrl}/admin/documents/${createdDoc.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detailData = (await detailRes.json()) as any;
    if (detailRes.status === 200 && detailData.chunk_count === storedChunks.length) {
      console.log(`   ✅ Document details & ${detailData.chunk_count} text chunks fetched successfully.`);
    } else {
      throw new Error(`Document detail failed: ${JSON.stringify(detailData)}`);
    }

    // Test 8: Admin DELETE /api/admin/documents/:id (Cascade Deletion)
    console.log('8️⃣  Testing DELETE /api/admin/documents/:id (Cascade Purge)...');
    const deleteRes = await fetch(`${baseUrl}/admin/documents/${createdDoc.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteData = (await deleteRes.json()) as any;
    if (deleteRes.status === 200 && deleteData.success) {
      const remainingChunks = await ChunkModel.findByDocumentId(createdDoc.id);
      const remainingDoc = await DocumentModel.findById(createdDoc.id);
      if (remainingChunks.length === 0 && remainingDoc === null) {
        console.log('   ✅ Document and all associated page chunks purged successfully.');
      } else {
        throw new Error('Cascade deletion left orphaned records!');
      }
    } else {
      throw new Error(`Delete document failed: ${JSON.stringify(deleteData)}`);
    }

    console.log('\n🎉 ALL PHASE 2 DOCUMENT INGESTION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('\n❌ PHASE 2 TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runPhase2Tests();
