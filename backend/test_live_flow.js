const db = require('./database/db');
const telegramBot = require('./services/telegramBot');

async function testLiveFlow() {
  console.log('--- 🧪 STARTING LIVE DATA & 1-TIME CODE VERIFICATION TEST ---');
  
  const BASE_URL = 'http://localhost:5000/api';

  // 1. Authenticate as Student
  console.log('\n1. Logging in as Student...');
  const studentRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'writetokumarsanthosh@gmail.com',
      password: 'Findora2026!'
    })
  });
  const studentData = await studentRes.json();
  if (!studentRes.ok) throw new Error(`Student login failed: ${studentData.error}`);
  console.log(`✅ Logged in as: ${studentData.user.name} (${studentData.user.role})`);
  const studentToken = studentData.token;

  // 2. Student reports a live Lost item
  console.log('\n2. Student reporting Lost Item with live GPS & metadata...');
  const lostItemPayload = {
    title: 'Dell XPS 15 9520 Laptop',
    category: 'Electronics',
    brand: 'Dell',
    model: 'XPS 15 9520',
    color: 'Silver',
    building: 'Library',
    floor: 2,
    location: 'Central Library Floor 2 stacks near cubicle 14',
    event_time: new Date().toISOString(),
    description: 'Silver 15-inch Dell laptop left on desk near quiet stacks.',
    image: '/uploads/sample_dell.jpg',
    latitude: 10.7100,
    longitude: 78.5989,
    serial_number: 'CN-0X9827-DELL',
    unique_marks: 'Small white circular sticker near exhaust vent',
    damage_details: 'Tiny scratch on bottom edge',
    condition: 'Operational'
  };

  const reportRes = await fetch(`${BASE_URL}/items/lost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify(lostItemPayload)
  });
  const reportData = await reportRes.json();
  if (!reportRes.ok) throw new Error(`Lost item report failed: ${reportData.error}`);
  console.log(`✅ Lost item reported: ID=${reportData.itemId}`);
  console.log(`🔑 1-Time Handover Code Generated: ${reportData.close_code}`);

  const lostItemId = reportData.itemId;
  const closeCode = reportData.close_code;

  if (!closeCode || !closeCode.startsWith('FND-')) {
    throw new Error('Failed: close_code was not properly generated');
  }

  // 3. Test Student retrieves their 1-time code via my-reports
  console.log('\n3. Student fetching their active reports & codes...');
  const myReportsRes = await fetch(`${BASE_URL}/items/my-reports`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const myReportsData = await myReportsRes.json();
  const myItem = myReportsData.items.find(i => i.id === lostItemId);
  if (!myItem || myItem.close_code !== closeCode) {
    throw new Error('Failed: close_code mismatch in student my-reports');
  }
  console.log(`✅ Student successfully retrieved their 1-Time Code: ${myItem.close_code}`);

  // 4. Test Telegram Bot /status and /code command simulation
  console.log('\n4. Testing Telegram Bot /status & /code commands...');
  await telegramBot.simulateMessage('chat_999', `/status ${lostItemId}`, 'StudentKumar');
  await telegramBot.simulateMessage('chat_999', `/code ${lostItemId}`, 'StudentKumar');
  console.log('✅ Telegram bot command simulation successful');

  // 5. Authenticate as Verification Officer
  console.log('\n5. Logging in as Verification Officer...');
  const officerRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sivakumar463703@gmail.com',
      password: 'Findora2026!'
    })
  });
  const officerData = await officerRes.json();
  if (!officerRes.ok) throw new Error(`Officer login failed: ${officerData.error}`);
  console.log(`✅ Logged in as: ${officerData.user.name} (${officerData.user.role})`);
  const officerToken = officerData.token;

  // 6. Verification Officer enters the 1-time code recited by the student
  console.log(`\n6. Officer verifying 1-Time Code "${closeCode}" to close search...`);
  const closeSearchRes = await fetch(`${BASE_URL}/items/close-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      closeCode: closeCode,
      notes: 'Student presented physical identification and recited secret 1-time code.'
    })
  });
  const closeSearchData = await closeSearchRes.json();
  if (!closeSearchRes.ok) throw new Error(`Close search failed: ${closeSearchData.error}`);
  console.log(`✅ Success message: ${closeSearchData.message}`);
  console.log(`✅ Updated Item Status: ${closeSearchData.item.status}`);
  console.log(`✅ Closed By: ${closeSearchData.item.closed_by}`);
  console.log(`✅ Closed At: ${closeSearchData.item.closed_at}`);

  // 7. Verify in database that item is RECOVERED and search is closed
  const verifyDb = db.prepare('SELECT status, closed_by, closed_at FROM items WHERE id = ?').get(lostItemId);
  if (verifyDb.status !== 'RECOVERED') {
    throw new Error(`Failed: DB status is ${verifyDb.status}, expected RECOVERED`);
  }
  console.log(`✅ Database confirmation: status is RECOVERED, closed by "${verifyDb.closed_by}"`);

  // 8. Test Telegram Bot /close command for a second item
  console.log('\n8. Testing Telegram Bot /close command directly...');
  // Report a second test item
  const item2Payload = {
    ...lostItemPayload,
    title: 'Blue Campus Backpack'
  };
  const report2Res = await fetch(`${BASE_URL}/items/lost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
    body: JSON.stringify(item2Payload)
  });
  const report2Data = await report2Res.json();
  const code2 = report2Data.close_code;
  console.log(`Second item created with code: ${code2}`);

  // Officer invokes /close <code> via Telegram
  await telegramBot.simulateMessage('officer_chat_1', `/close ${code2}`, 'OfficerSivakumar');
  const verifyDb2 = db.prepare('SELECT status, closed_by FROM items WHERE id = ?').get(report2Data.itemId);
  if (verifyDb2.status !== 'RECOVERED') {
    throw new Error('Failed: Second item not marked RECOVERED by Telegram /close command');
  }
  console.log(`✅ Telegram /close command successfully closed search in DB! Closed by: ${verifyDb2.closed_by}`);

  console.log('\n🎉 ALL LIVE DATA, 1-TIME CODE, AND TELEGRAM BOT TESTS PASSED WITH 100% SUCCESS!');
}

testLiveFlow().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
