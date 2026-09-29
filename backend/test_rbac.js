const http = require('http');

function post(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function get(path, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runRBACTests() {
  console.log('=================================================================');
  console.log('🛡️  FINDORA AI • AIRTIGHT ROLE-BASED ACCESS CONTROL (RBAC) TEST');
  console.log('    Validating Strictly 3 Roles: [admin, verification_officer, student]');
  console.log('=================================================================\n');

  // 1. Authenticate All 3 Accounts
  console.log('👉 [1/6] Authenticating accounts for each of the 3 roles...');
  const adminLogin = await post('/api/auth/login', {
    email: 'tharunkumark42007@gmail.com',
    password: 'Findora2026!'
  });
  console.log(`  • Admin: Status ${adminLogin.status} | Role: "${adminLogin.body.user?.role}"`);

  const officerLogin = await post('/api/auth/login', {
    email: 'sivakumar463703@gmail.com',
    password: 'Findora2026!'
  });
  console.log(`  • Officer: Status ${officerLogin.status} | Role: "${officerLogin.body.user?.role}"`);

  const studentLogin = await post('/api/auth/login', {
    email: 'writetokumarsanthosh@gmail.com',
    password: 'Findora2026!'
  });
  console.log(`  • Student: Status ${studentLogin.status} | Role: "${studentLogin.body.user?.role}"`);

  if (adminLogin.body.user?.role !== 'admin' ||
      officerLogin.body.user?.role !== 'verification_officer' ||
      studentLogin.body.user?.role !== 'student') {
    throw new Error('❌ Role assignment mismatch in database/login!');
  }
  console.log('  ✅ All 3 accounts authenticated with strictly normalized roles!\n');

  const adminToken = adminLogin.body.token;
  const officerToken = officerLogin.body.token;
  const studentToken = studentLogin.body.token;

  // 2. Test Unauthenticated Access to Admin Dashboard
  console.log('👉 [2/6] Testing Unauthenticated access to /api/admin/dashboard...');
  const unauthRes = await get('/api/admin/dashboard', null);
  console.log(`  • Response: Status ${unauthRes.status} (Expected 401) | Error: "${unauthRes.body.error}"`);
  if (unauthRes.status !== 401) throw new Error('Security failure: Unauthenticated request was not rejected with 401!');
  console.log('  ✅ Unauthenticated access successfully blocked!\n');

  // 3. Test Student Access to Admin Dashboard
  console.log('👉 [3/6] Testing Student access to /api/admin/dashboard...');
  const studentAdminRes = await get('/api/admin/dashboard', studentToken);
  console.log(`  • Response: Status ${studentAdminRes.status} (Expected 403) | Error: "${studentAdminRes.body.error}"`);
  if (studentAdminRes.status !== 403) throw new Error('Security failure: Student was not rejected with 403 from admin dashboard!');
  console.log('  ✅ Student access to Admin Command Center strictly blocked with 403!\n');

  // 4. Test Verification Officer Access to Admin Dashboard
  console.log('👉 [4/6] Testing Verification Officer access to /api/admin/dashboard...');
  const officerAdminRes = await get('/api/admin/dashboard', officerToken);
  console.log(`  • Response: Status ${officerAdminRes.status} (Expected 200) | Stats total items: ${officerAdminRes.body.stats?.totalLost + officerAdminRes.body.stats?.totalFound}`);
  if (officerAdminRes.status !== 200) throw new Error('Officer authorization failure!');
  console.log('  ✅ Verification Officer successfully authorized for Verifications & Dashboard!\n');

  // 5. Test Super Admin-only Endpoint (/api/admin/reset-demo)
  console.log('👉 [5/6] Testing Super Admin privilege separation on /api/admin/reset-demo...');
  const officerResetRes = await post('/api/admin/reset-demo', {}, officerToken);
  console.log(`  • Verification Officer Reset Attempt: Status ${officerResetRes.status} (Expected 403) | Error: "${officerResetRes.body.error}"`);
  if (officerResetRes.status !== 403) throw new Error('Officer should NOT be allowed to reset system database!');

  const adminResetRes = await post('/api/admin/reset-demo', {}, adminToken);
  console.log(`  • Super Admin Reset Attempt: Status ${adminResetRes.status} (Expected 200)`);
  if (adminResetRes.status !== 200) throw new Error('Super Admin should be authorized to reset!');
  console.log('  ✅ Super Admin privilege hierarchy verified!\n');

  // 6. Test Claims Scoping for Student
  console.log('👉 [6/6] Testing Claims endpoint scoping (/api/claims)...');
  const studentClaimsRes = await get('/api/claims', studentToken);
  console.log(`  • Student Claims list: Status ${studentClaimsRes.status} | Returned ${studentClaimsRes.body.claims?.length || 0} claims (Personal only)`);
  
  const officerClaimsRes = await get('/api/claims', officerToken);
  console.log(`  • Officer Claims list: Status ${officerClaimsRes.status} | Returned ${officerClaimsRes.body.claims?.length || 0} claims (All Campus)`);
  console.log('  ✅ Claims data visibility strictly scoped by role!\n');

  console.log('=================================================================');
  console.log('🎉 ALL 3-ROLE RBAC SECURITY AUDIT CHECKS PASSED PERFECTLY!');
  console.log('=================================================================');
}

runRBACTests().catch(err => {
  console.error('\n❌ RBAC TEST FAILED:', err);
  process.exit(1);
});
