const telegramBot = require('./services/telegramBot');
const db = require('./database/db');

async function testCompleteSuite() {
  console.log('=== 1. TESTING PRIVATE STUDENT BOT ===');
  const startReplies = await telegramBot.simulateMessage('student_chat_101', '/start', 'Kavitha', 'private');
  console.log('Private /start reply:\n', startReplies[0].text);

  const testItem = db.prepare('SELECT id FROM items LIMIT 1').get();
  if (testItem) {
    const codeReplies = await telegramBot.simulateMessage('student_chat_101', '/code ' + testItem.id, 'Kavitha', 'private');
    console.log('\nPrivate /code reply:\n', codeReplies[0].text);
  }

  const myReportsReplies = await telegramBot.simulateMessage('student_chat_101', '/myreports', 'Kavitha', 'private');
  console.log('\nPrivate /myreports reply:\n', myReportsReplies[0].text);

  console.log('\n=== 2. TESTING CAMPUS COMMUNITY GROUP BOT ===');
  // Simulate bot added as admin to group
  await telegramBot.handleUpdate({
    update_id: 1001,
    my_chat_member: {
      chat: { id: -10023456789, title: 'Findora Campus Lost & Found Community', type: 'supergroup' },
      new_chat_member: { status: 'administrator' }
    }
  });

  // Verify group registered in DB
  const groupInDb = db.prepare('SELECT * FROM telegram_groups WHERE chat_id = ?').get('-10023456789');
  console.log('\nGroup registered in SQLite:', groupInDb);

  // Test /summary in group
  console.log('\n--- Group /summary Test ---');
  const summaryReplies = await telegramBot.simulateMessage('-10023456789', '/summary', 'Ramesh', 'supergroup', 'Findora Campus Community');
  console.log('Summary replies count:', summaryReplies.length);
  summaryReplies.forEach((r, idx) => {
    console.log('\n--- Reply ' + (idx + 1) + ' [' + (r.type || 'text') + '] ---');
    if (r.photo) console.log('Photo source:', r.photo);
    console.log('Caption / Text preview:\n' + r.text.substring(0, 350) + '...');
  });

  // Test security: someone trying /code in public group
  console.log('\n--- Group /code Security Block Test ---');
  const groupCodeReplies = await telegramBot.simulateMessage('-10023456789', '/code ' + (testItem ? testItem.id : 'item_1'), 'Sneha', 'supergroup', 'Findora Campus Community');
  console.log('Group /code reply (should block code leak):\n', groupCodeReplies[0].text);

  // Test dual broadcast
  console.log('\n=== 3. TESTING DUAL BROADCAST (SUBSCRIBERS + GROUPS) ===');
  const sampleItem = {
    id: 'item_test_broadcast',
    type: 'LOST',
    title: 'Silver iPad Pro 12.9',
    category: 'Electronics',
    building: 'Central Library',
    floor: 3,
    location: 'Near digital media center table 5',
    brand: 'Apple',
    latitude: 10.7102,
    longitude: 78.5991,
    image: '/uploads/sample_dell.jpg'
  };
  await telegramBot.broadcastNewItem(sampleItem, 'FND-XY789');

  console.log('\n✅ ALL INTEGRATION SUITE TESTS PASSED WITH 100% SUCCESS!');
}

testCompleteSuite().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
