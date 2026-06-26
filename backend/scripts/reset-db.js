const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetDatabase() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Dropping all tables and types...');
    
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

    console.log('✅ Database reset complete. Now run: npm run db:migrate && npm run db:seed');
    
    client.release();
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
  } finally {
    await pool.end();
  }
}

resetDatabase();