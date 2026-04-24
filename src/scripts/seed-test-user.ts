#!/usr/bin/env tsx

import { pool } from '../config/database';
import bcrypt from 'bcrypt';

const TEST_USER = {
  username: 'tannerbroberts',
  email: 'tannerbroberts@gmail.com',
  password: '19Brain96',
};

async function seedTestUser() {
  try {
    console.log('🌱 Seeding test user...');

    // Check if user exists
    const existing = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [TEST_USER.email]
    );

    if (existing.rows.length > 0) {
      console.log('✅ Test user already exists:', TEST_USER.email);
      console.log('   User ID:', existing.rows[0].id);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, created_at, last_login, last_active)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW())
       RETURNING id, username, email`,
      [TEST_USER.username, TEST_USER.email, hashedPassword]
    );

    const user = result.rows[0];

    console.log('✅ Test user created successfully!');
    console.log('   User ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Email:', user.email);
  } catch (error) {
    console.error('❌ Failed to seed test user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedTestUser();
