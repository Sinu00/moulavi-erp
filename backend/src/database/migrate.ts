import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    console.log('Default admin credentials:');
    console.log('Email: admin@moulavi.com');
    console.log('Password: Admin@123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

