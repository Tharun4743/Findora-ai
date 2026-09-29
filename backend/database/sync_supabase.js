require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function syncToSupabase(customPassword = null) {
  let connString = process.env.DATABASE_URL;

  if (customPassword) {
    connString = connString.replace(/\[YOUR-PASSWORD\]|:[^@:]+@aws-0/, `:${encodeURIComponent(customPassword)}@aws-0`);
  }

  console.log('[SUPABASE SYNC] Attempting connection to Supabase pooler...');
  const client = new Client({
    connectionString: connString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[SUPABASE SYNC] Connected to Supabase PostgreSQL successfully!');

    const sqlPath = path.resolve(__dirname, 'supabase_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('[SUPABASE SYNC] Applying schema migrations and syncing roles...');
    await client.query(sql);

    const res = await client.query('SELECT id, name, email, role FROM users ORDER BY created_at ASC');
    console.log('[SUPABASE SYNC] Synced users in Supabase:');
    console.table(res.rows);

    await client.end();
    return { success: true, count: res.rowCount };
  } catch (err) {
    console.error('[SUPABASE SYNC ERROR]:', err.message);
    return { success: false, error: err.message };
  }
}

if (require.main === module) {
  const pwd = process.argv[2] || null;
  syncToSupabase(pwd);
}

module.exports = { syncToSupabase };
