const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDestinationMaster() {
  console.log('🏛️ Seeding Destination Master data...');

  // Simplified to Saudi Arabia cities only for Umrah service
  const destinationData = [
    { destinationCode: 'MAK', destinationName: 'Makkah (Holy City)', city: 'Makkah', country: 'Saudi Arabia' },
    { destinationCode: 'MED', destinationName: 'Madinah (Prophet\'s City)', city: 'Madinah', country: 'Saudi Arabia' },
    { destinationCode: 'JED', destinationName: 'Jeddah (Port City)', city: 'Jeddah', country: 'Saudi Arabia' },
    { destinationCode: 'RUH', destinationName: 'Riyadh (Capital)', city: 'Riyadh', country: 'Saudi Arabia' },
    { destinationCode: 'TAF', destinationName: 'Taif (Mountain City)', city: 'Taif', country: 'Saudi Arabia' },
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
