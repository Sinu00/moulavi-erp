const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedHotelMaster() {
  console.log('🏨 Seeding Hotel Master data...');

  // First, get destination IDs
  const makkah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'MAK' } });
  const madinah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'MED' } });
  const jeddah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'JED' } });

  if (!makkah || !madinah || !jeddah) {
    console.error('❌ Required destinations not found. Please run destination master seeding first.');
    process.exit(1);
  }

  // Simplified hotel data - removed category, capacity, amenities, description
  const hotelData = [
    // Makkah Hotels
    { hotelCode: 'MAK001', hotelName: 'Makkah Clock Royal Tower', locationId: makkah.id },
    { hotelCode: 'MAK002', hotelName: 'Fairmont Makkah Clock Royal Tower', locationId: makkah.id },
    { hotelCode: 'MAK003', hotelName: 'Swissotel Makkah', locationId: makkah.id },
    { hotelCode: 'MAK004', hotelName: 'Conrad Makkah', locationId: makkah.id },
    { hotelCode: 'MAK005', hotelName: 'Pullman Zamzam Makkah', locationId: makkah.id },
    { hotelCode: 'MAK006', hotelName: 'Makkah Hilton Towers', locationId: makkah.id },
    { hotelCode: 'MAK007', hotelName: 'Raffles Makkah Palace', locationId: makkah.id },
    { hotelCode: 'MAK008', hotelName: 'Hyatt Regency Makkah', locationId: makkah.id },
    { hotelCode: 'MAK009', hotelName: 'Makkah Millennium Hotel', locationId: makkah.id },
    { hotelCode: 'MAK010', hotelName: 'Al Kiswah Towers Hotel', locationId: makkah.id },

    // Madinah Hotels
    { hotelCode: 'MED001', hotelName: 'Madinah Hilton', locationId: madinah.id },
    { hotelCode: 'MED002', hotelName: 'Dar Al Hijra InterContinental', locationId: madinah.id },
    { hotelCode: 'MED003', hotelName: 'Madinah Millennium Hotel', locationId: madinah.id },
    { hotelCode: 'MED004', hotelName: 'Pullman Madinah Al Madinah', locationId: madinah.id },
    { hotelCode: 'MED005', hotelName: 'Madinah Marriott Hotel', locationId: madinah.id },
    { hotelCode: 'MED006', hotelName: 'Crowne Plaza Madinah', locationId: madinah.id },
    { hotelCode: 'MED007', hotelName: 'Madinah Holiday Inn', locationId: madinah.id },
    { hotelCode: 'MED008', hotelName: 'Al Madinah Concorde', locationId: madinah.id },
    { hotelCode: 'MED009', hotelName: 'Madinah Golden Tulip', locationId: madinah.id },
    { hotelCode: 'MED010', hotelName: 'Al Eman Royal Hotel', locationId: madinah.id },

    // Jeddah Hotels
    { hotelCode: 'JED001', hotelName: 'Jeddah Hilton', locationId: jeddah.id },
    { hotelCode: 'JED002', hotelName: 'Four Seasons Hotel Jeddah', locationId: jeddah.id },
    { hotelCode: 'JED003', hotelName: 'Jeddah Marriott Hotel', locationId: jeddah.id },
    { hotelCode: 'JED004', hotelName: 'Pullman Jeddah Al Hamra', locationId: jeddah.id },
    { hotelCode: 'JED005', hotelName: 'Jeddah Holiday Inn', locationId: jeddah.id },
    { hotelCode: 'JED006', hotelName: 'Crowne Plaza Jeddah', locationId: jeddah.id },
    { hotelCode: 'JED007', hotelName: 'Jeddah Millennium Hotel', locationId: jeddah.id },
    { hotelCode: 'JED008', hotelName: 'Al Hamra Hotel Jeddah', locationId: jeddah.id },
  ];

  for (const data of hotelData) {
    await prisma.hotelMaster.upsert({
      where: { hotelCode: data.hotelCode },
      update: data,
      create: data,
    });
  }

  console.log(`✅ Created ${hotelData.length} hotel master records`);
  console.log('🏨 Hotel Master seeding completed successfully!');
}

seedHotelMaster()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
