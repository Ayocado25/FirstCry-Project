'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    const migrationDir = path.join(__dirname, '../../database/migrations');
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await client.query(sql);
      console.log(`✓ ${file}`);
    }
    console.log('\nAll migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
