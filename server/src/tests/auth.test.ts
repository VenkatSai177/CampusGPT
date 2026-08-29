import app from '../app';
import http from 'http';
import { AddressInfo } from 'net';

async function runTests() {
  console.log('🧪 Running Phase 1 Backend Integration Tests...\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://localhost:${address.port}/api`;

  let studentToken = '';
  let adminToken = '';

  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing GET /api/health ...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = (await healthRes.json()) as any;
    if (healthRes.status === 200 && healthData.status === 'ok') {
      console.log('   ✅ Health endpoint returned 200 OK.');
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }

    // Test 2: Student Registration
    console.log('2️⃣  Testing POST /api/auth/register (Student) ...');
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: 'student@test.edu',
        password: 'Password123!',
        role: 'student',
      }),
    });
    const regData = (await regRes.json()) as any;
    if (regRes.status === 201 && regData.token && regData.user.role === 'student') {
      studentToken = regData.token;
      console.log('   ✅ Student registered successfully. JWT issued.');
      if (regData.user.password_hash) {
        throw new Error('❌ Password hash leaked in registration response!');
      }
    } else {
      throw new Error(`Student registration failed: ${JSON.stringify(regData)}`);
    }

    // Test 3: Duplicate Registration Rejection
    console.log('3️⃣  Testing Duplicate Email Rejection (409 Conflict) ...');
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: 'student@test.edu',
        password: 'Password123!',
      }),
    });
    if (dupRes.status === 409) {
      console.log('   ✅ Duplicate email correctly rejected with 409 Conflict.');
    } else {
      throw new Error(`Duplicate check failed with status: ${dupRes.status}`);
    }

    // Test 4: Student Login
    console.log('4️⃣  Testing POST /api/auth/login (Valid credentials) ...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@test.edu',
        password: 'Password123!',
      }),
    });
    const loginData = (await loginRes.json()) as any;
    if (loginRes.status === 200 && loginData.token) {
      console.log('   ✅ Login successful with valid password.');
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }

    // Test 5: Invalid Password Rejection
    console.log('5️⃣  Testing Invalid Password Rejection (401 Unauthorized) ...');
    const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@test.edu',
        password: 'WrongPassword!',
      }),
    });
    if (badLoginRes.status === 401) {
      console.log('   ✅ Invalid password correctly rejected with 401 Unauthorized.');
    } else {
      throw new Error(`Bad password login returned unexpected status: ${badLoginRes.status}`);
    }

    // Test 6: GET /api/auth/me with Bearer Token
    console.log('6️⃣  Testing GET /api/auth/me (Protected Route with JWT) ...');
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const meData = (await meRes.json()) as any;
    if (meRes.status === 200 && meData.user.email === 'student@test.edu') {
      console.log('   ✅ Profile fetched successfully via JWT authorization header.');
    } else {
      throw new Error(`Me endpoint failed: ${JSON.stringify(meData)}`);
    }

    // Test 7: GET /api/auth/me without Token
    console.log('7️⃣  Testing GET /api/auth/me without Token (401 Unauthorized) ...');
    const noTokenRes = await fetch(`${baseUrl}/auth/me`);
    if (noTokenRes.status === 401) {
      console.log('   ✅ Missing token correctly rejected with 401 Unauthorized.');
    } else {
      throw new Error(`Unauthenticated request returned status: ${noTokenRes.status}`);
    }

    // Test 8: Admin Registration & Admin Role Verification
    console.log('8️⃣  Testing Admin Registration & Role Assignment ...');
    const adminRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'System Admin',
        email: 'admin@college.edu',
        password: 'AdminPassword123!',
        role: 'admin',
      }),
    });
    const adminRegData = (await adminRegRes.json()) as any;
    if (adminRegRes.status === 201 && adminRegData.user.role === 'admin') {
      adminToken = adminRegData.token;
      console.log('   ✅ Admin account created with role="admin".');
    } else {
      throw new Error(`Admin registration failed: ${JSON.stringify(adminRegData)}`);
    }

    console.log('\n🎉 ALL PHASE 1 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
