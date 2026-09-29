require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const tables = ['audit_logs', 'items', 'users', 'notifications', 'matches'];
  for (const t of tables) {
    const r = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [t]
    );
    console.log(`\n== ${t} ==`);
    r.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
  }
  await pool.end();
})().catch(e => { console.error(e.message); pool.end(); });
