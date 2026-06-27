'use strict';

require('dotenv').config();
const { pool } = require('../src/config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

async function migrate() {
  try {
    const migrationsPath = path.join(__dirname, '../database/migrations');
    const files = fs.readdirSync(migrationsPath).sort();

    for (const file of files) {
      const filePath = path.join(migrationsPath, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Running migration: ${file}`);
      await pool.query(sql);
    }

    console.log('✅ Migrations complete');
    await pool.end();
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();