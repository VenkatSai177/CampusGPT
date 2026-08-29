import app from '../app';
import http from 'http';
import { AddressInfo } from 'net';
import { EmbeddingService } from '../services/embedding.service';
import { ChunkingService } from '../services/chunking.service';
import { ChunkModel } from '../models/chunk.model';
import { DocumentModel } from '../models/document.model';

async function runPhase5ConversationTests() {
  console.log('🧪 Running Phase 5 Conversation History & Interactive Student Experience Tests...\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://localhost:${address.port}/api`;

  let tokenUserA = '';
  let tokenUserB = '';

  try {
    // Setup 2 Student Accounts for Ownership Isolation Verification
    const regA = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Alpha',
        email: 'alpha@college.edu',
        password: 'PasswordAlpha123!',
        role: 'student',
      }),
    });
    const dataA = (await regA.json()) as any;
    tokenUserA = dataA.token;

    const regB = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Beta',
        email: 'beta@college.edu',
        password: 'PasswordBeta123!',
        role: 'student',
      }),
    });
    const dataB = (await regB.json()) as any;
    tokenUserB = dataB.token;

    // 1. Authentication Security Check
    console.log('1️⃣  Testing Unauthenticated Access Rejection (401 Unauthorized)...');
    const unauthRes = await fetch(`${baseUrl}/conversations`);
    if (unauthRes.status === 401) {
      console.log('   ✅ Unauthenticated GET /api/conversations rejected with 401 Unauthorized.');
    } else {
      throw new Error(`Unauth check failed: ${unauthRes.status}`);
    }

    // 2. Conversation Creation & Listing
    console.log('\n2️⃣  Testing Conversation Thread Creation & User Listing...');
    const createRes = await fetch(`${baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ title: 'Attendance Policy Thread' }),
    });
    const createData = (await createRes.json()) as any;
    const convIdA = createData.conversation?.id;

    if (createRes.status === 201 && convIdA && createData.conversation.title === 'Attendance Policy Thread') {
      console.log(`   ✅ User A created conversation: "${createData.conversation.title}" (ID: ${convIdA}).`);
    } else {
      throw new Error(`Failed to create conversation: ${JSON.stringify(createData)}`);
    }

    const listResA = await fetch(`${baseUrl}/conversations`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    const listDataA = (await listResA.json()) as any;
    if (listResA.status === 200 && listDataA.conversations.length === 1 && listDataA.conversations[0].id === convIdA) {
      console.log(`   ✅ User A listed conversations (Returned 1 thread).`);
    } else {
      throw new Error(`User A list failed: ${JSON.stringify(listDataA)}`);
    }

    // 3. Conversation Ownership Isolation Check
    console.log('\n3️⃣  Testing Conversation Ownership Isolation (User B cannot access User A)...');
    const crossAccessRes = await fetch(`${baseUrl}/conversations/${convIdA}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    if (crossAccessRes.status === 404 || crossAccessRes.status === 403) {
      console.log(`   ✅ User B access to User A's thread correctly rejected with ${crossAccessRes.status}.`);
    } else {
      throw new Error(`Ownership isolation breach! User B accessed User A's thread with status ${crossAccessRes.status}`);
    }

    // 4. Ingest Benchmark Document & Execute Chat Message Persistence
    console.log('\n4️⃣  Testing RAG Chat Query Message Persistence (POST /api/chat)...');
    const academicPages = [
      {
        page_number: 14,
        text: 'Academic Regulations 2025. Chapter 4: Attendance Requirements. Every student is required to maintain a minimum of 75% attendance in each course to be eligible to sit for semester end examinations.',
      },
    ];
    const doc = await DocumentModel.create({
      title: 'Academic Regulations 2025',
      filename: 'Academic_Regulations_2025.pdf',
      file_size: 1048576,
      uploaded_by: 'admin-id',
    });
    await DocumentModel.updateStatus(doc.id, 'processing');
    const chunks = ChunkingService.createDocumentChunks(academicPages, doc.id, doc.title, doc.filename);
    const emb = await EmbeddingService.generateBatchEmbeddings(chunks.map((c) => c.content));
    await ChunkModel.createMany(doc.id, chunks, emb);
    await DocumentModel.updateStatus(doc.id, 'indexed', { total_pages: 1, total_chunks: chunks.length });

    const chatRes = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        query: 'What is the minimum attendance requirement?',
        conversation_id: convIdA,
      }),
    });
    const chatData = (await chatRes.json()) as any;
    const assistantMsgId = chatData.assistant_message_id;

    if (
      chatRes.status === 200 &&
      chatData.success &&
      chatData.grounded &&
      chatData.sources.length > 0 &&
      assistantMsgId
    ) {
      console.log(`   ✅ POST /api/chat executed RAG & persisted messages to conversation ID: ${convIdA}.`);
    } else {
      throw new Error(`Chat query persistence failed: ${JSON.stringify(chatData)}`);
    }

    // 5. History Retrieval & Chronological Order
    console.log('\n5️⃣  Testing GET /api/conversations/:id (History Retrieval)...');
    const historyRes = await fetch(`${baseUrl}/conversations/${convIdA}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    const historyData = (await historyRes.json()) as any;
    if (
      historyRes.status === 200 &&
      historyData.messages.length === 2 &&
      historyData.messages[0].sender === 'user' &&
      historyData.messages[1].sender === 'assistant' &&
      historyData.messages[1].sources.length > 0
    ) {
      console.log(`   ✅ Conversation history retrieved 2 chronological messages with preserved source citations.`);
    } else {
      throw new Error(`History retrieval failed: ${JSON.stringify(historyData)}`);
    }

    // 6. Fallback Message Persistence
    console.log('\n6️⃣  Testing Fallback Message Persistence (Out-of-Scope Query)...');
    const outChatRes = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        query: 'Who won the 1998 FIFA World Cup?',
        conversation_id: convIdA,
      }),
    });
    const outChatData = (await outChatRes.json()) as any;
    if (outChatData.fallback && outChatData.sources.length === 0) {
      console.log('   ✅ Out-of-scope query fallback persisted with empty sources array.');
    } else {
      throw new Error(`Fallback persistence test failed: ${JSON.stringify(outChatData)}`);
    }

    // 7. Message Feedback & Feedback Ownership Security
    console.log('\n7️⃣  Testing Message Feedback & Feedback Security (PATCH /api/messages/:id/feedback)...');
    // User A likes their assistant message
    const feedbackResA = await fetch(`${baseUrl}/messages/${assistantMsgId}/feedback`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ feedback: 'like' }),
    });
    const feedbackDataA = (await feedbackResA.json()) as any;

    if (feedbackResA.status === 200 && feedbackDataA.message.feedback === 'like') {
      console.log(`   ✅ User A successfully liked assistant message.`);
    } else {
      throw new Error(`User A feedback failed: ${JSON.stringify(feedbackDataA)}`);
    }

    // User B attempts to change feedback on User A's message -> 403 Forbidden Rejection!
    const feedbackResB = await fetch(`${baseUrl}/messages/${assistantMsgId}/feedback`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserB}`,
      },
      body: JSON.stringify({ feedback: 'dislike' }),
    });
    if (feedbackResB.status === 403) {
      console.log(`   ✅ User B feedback modification attempt on User A's message correctly rejected with 403 Forbidden.`);
    } else {
      throw new Error(`Feedback security breach! Status returned: ${feedbackResB.status}`);
    }

    // Cleanup test document
    await ChunkModel.deleteByDocumentId(doc.id);
    await DocumentModel.delete(doc.id);

    console.log('\n🎉 ALL PHASE 5 CONVERSATION & INTERACTIVE STUDENT TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('\n❌ PHASE 5 TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runPhase5ConversationTests();
