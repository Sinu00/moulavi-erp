const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const admin = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@moulavi.com',
        password: hashedPassword,
        role: 'admin'
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@moulavi.com');
    console.log('Password: Admin@123');
    console.log('User ID:', admin.id);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️  Admin user already exists');
      console.log('Email: admin@moulavi.com');
      console.log('Password: Admin@123');
    } else {
      console.error('❌ Error creating admin:', error);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
