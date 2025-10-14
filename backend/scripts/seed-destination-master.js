const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDestinationMaster() {
  console.log('🏛️ Seeding Destination Master data...');

  // Simplified to Saudi Arabia cities only for Umrah service
  const destinationData = [
    { destinationCode: 'MAK', destinationName: 'Makkah', city: 'Makkah', country: 'Saudi Arabia' },
    { destinationCode: 'MED', destinationName: 'Madinah', city: 'Madinah', country: 'Saudi Arabia' },
    { destinationCode: 'JED', destinationName: 'Jeddah', city: 'Jeddah', country: 'Saudi Arabia' },
    { destinationCode: 'RUH', destinationName: 'Riyadh', city: 'Riyadh', country: 'Saudi Arabia' },
    { destinationCode: 'TAF', destinationName: 'Taif', city: 'Taif', country: 'Saudi Arabia' },
  ];

  for (const data of destinationData) {
    await prisma.destinationMaster.upsert({
      where: { destinationCode: data.destinationCode },
      update: data,
      create: data,
    });
  }

  console.log(`✅ Created ${destinationData.length} destination master records`);
  console.log('🏛️ Destination Master seeding completed successfully!');
}

seedDestinationMaster()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
