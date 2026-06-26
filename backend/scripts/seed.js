'use strict';
require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, query } = require('../src/config/database');

async function seed() {
  console.log('Seeding database with sample data...');
  try {
    const fs = require('fs');
    const path = require('path');

    // Hash passwords properly at runtime
    const passwords = {
      admin:   await bcrypt.hash('Admin@123',   12),
      head:    await bcrypt.hash('Head@123',    12),
      teacher: await bcrypt.hash('Teacher@123', 12),
      parent:  await bcrypt.hash('Parent@123',  12),
    };

    console.log('Inserting users...');
    const insertUsersSQL = `
      INSERT INTO users (id, email, password_hash, full_name, phone, role)
      VALUES
        ('00000000-0000-0000-0000-000000000001','admin@intellitots.com','${passwords.admin}','Admin User','+91-9000000001','admin'),
        ('00000000-0000-0000-0000-000000000002','head@intellitots.com','${passwords.head}','Priya Sharma','+91-9000000002','centre_head'),
        ('00000000-0000-0000-0000-000000000003','teacher@intellitots.com','${passwords.teacher}','Anjali Mehta','+91-9000000003','teacher'),
        ('00000000-0000-0000-0000-000000000004','teacher2@intellitots.com','${passwords.teacher}','Ravi Kumar','+91-9000000004','teacher'),
        ('00000000-0000-0000-0000-000000000005','parent@intellitots.com','${passwords.parent}','Rohit Gupta','+91-9000000005','parent'),
        ('00000000-0000-0000-0000-000000000006','parent2@intellitots.com','${passwords.parent}','Sneha Reddy','+91-9000000006','parent')
      ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `;
    await pool.query(insertUsersSQL);
    console.log('✓ Users inserted');

    console.log('Inserting sample data...');
    const seedSql = fs.readFileSync(
      path.join(__dirname, '../../database/seeds/001_sample_data.sql'), 'utf8'
    );
    // Skip the INSERT INTO users block since we just handled it with real hashes
    const withoutUsers = seedSql.replace(/INSERT INTO users[\s\S]*?;\n/m, '');
    await pool.query(withoutUsers);
    console.log('✓ Sample data inserted');

    console.log('\n✓✓✓ Database seeded successfully! ✓✓✓');
    console.log('\nYou can now log in with these demo accounts:');
    console.log('  📧 admin@intellitots.com   / 🔑 Admin@123');
    console.log('  📧 head@intellitots.com    / 🔑 Head@123');
    console.log('  📧 teacher@intellitots.com / 🔑 Teacher@123');
    console.log('  📧 parent@intellitots.com  / 🔑 Parent@123');
  } catch (err) {
    console.error('\n❌ Seed failed with error:');
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
seed();
