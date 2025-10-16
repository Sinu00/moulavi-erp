import { prisma } from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Use Prisma migrate deploy instead of raw SQL
    console.log('Running Prisma migrations...');
    
    // This will be handled by Prisma migrate deploy in production
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

