'use strict';
require('dotenv').config();
const { pool } = require('../src/config/database');

async function reset() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Cannot reset production database!');
    process.exit(1);
  }
  const client = await pool.connect();
  try {
    console.log('Dropping all tables...');
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('Schema reset. Run npm run db:migrate && npm run db:seed to rebuild.');
  } finally {
    client.release();
    await pool.end();
  }
}
reset();
