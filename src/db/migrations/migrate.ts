#!/usr/bin/env tsx

import { pool } from '../../../src/config/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration(filename: string): Promise<void> {
  const sql = readFileSync(join(__dirname, filename), 'utf-8');

  try {
    console.log(`Running migration: ${filename}`);
    await pool.query(sql);
    console.log(`✅ Migration complete: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting database migrations...\n');

    // Run migrations in order
    await runMigration('001_initial_schema.sql');
    await runMigration('002_add_username_and_password_reset.sql');
    await runMigration('003_add_shape_id_counter.sql');

    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
