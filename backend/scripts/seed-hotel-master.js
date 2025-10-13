const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedHotelMaster() {
  console.log('🏨 Seeding Hotel Master data...');

  // First, get destination IDs
  const makkah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'MAK' } });
  const madinah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'MAD' } });
  const jeddah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'JED' } });

  if (!makkah || !madinah || !jeddah) {
    console.error('❌ Required destinations not found. Please run destination master seeding first.');
    process.exit(1);
  }

  const hotelData = [
    // Makkah Hotels
    { hotelCode: 'MAK001', hotelName: 'Makkah Clock Royal Tower', destinationId: makkah.id, category: '5-star', capacity: 2000, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Airport Shuttle'], description: 'Luxury hotel near Haram' },
    { hotelCode: 'MAK002', hotelName: 'Fairmont Makkah Clock Royal Tower', destinationId: makkah.id, category: '5-star', capacity: 1500, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Spa'], description: 'Premium luxury hotel' },
    { hotelCode: 'MAK003', hotelName: 'Swissotel Makkah', destinationId: makkah.id, category: '5-star', capacity: 1200, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Business Center'], description: 'International luxury hotel' },
    { hotelCode: 'MAK004', hotelName: 'Conrad Makkah', destinationId: makkah.id, category: '4-star', capacity: 800, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Comfortable 4-star accommodation' },
    { hotelCode: 'MAK005', hotelName: 'Pullman Zamzam Makkah', destinationId: makkah.id, category: '4-star', capacity: 600, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Fitness Center'], description: 'Modern 4-star hotel' },
    { hotelCode: 'MAK006', hotelName: 'Makkah Hilton Towers', destinationId: makkah.id, category: '5-star', capacity: 1000, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Pool'], description: 'Iconic Hilton hotel' },
    { hotelCode: 'MAK007', hotelName: 'Raffles Makkah Palace', destinationId: makkah.id, category: '5-star', capacity: 700, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Spa', 'Butler Service'], description: 'Ultra-luxury palace hotel' },
    { hotelCode: 'MAK008', hotelName: 'Hyatt Regency Makkah', destinationId: makkah.id, category: '4-star', capacity: 500, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Reliable 4-star hotel' },
    { hotelCode: 'MAK009', hotelName: 'Makkah Millennium Hotel', destinationId: makkah.id, category: '3-star', capacity: 400, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Budget-friendly 3-star hotel' },
    { hotelCode: 'MAK010', hotelName: 'Al Kiswah Towers Hotel', destinationId: makkah.id, category: '3-star', capacity: 300, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Affordable accommodation' },

    // Madinah Hotels
    { hotelCode: 'MAD001', hotelName: 'Madinah Hilton', destinationId: madinah.id, category: '5-star', capacity: 1200, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Pool'], description: 'Luxury hotel near Prophet\'s Mosque' },
    { hotelCode: 'MAD002', hotelName: 'Dar Al Hijra InterContinental', destinationId: madinah.id, category: '5-star', capacity: 1000, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Spa'], description: 'Premium luxury hotel' },
    { hotelCode: 'MAD003', hotelName: 'Madinah Millennium Hotel', destinationId: madinah.id, category: '4-star', capacity: 800, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Comfortable 4-star hotel' },
    { hotelCode: 'MAD004', hotelName: 'Pullman Madinah Al Madinah', destinationId: madinah.id, category: '4-star', capacity: 600, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Fitness Center'], description: 'Modern 4-star hotel' },
    { hotelCode: 'MAD005', hotelName: 'Madinah Marriott Hotel', destinationId: madinah.id, category: '4-star', capacity: 500, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Reliable Marriott hotel' },
    { hotelCode: 'MAD006', hotelName: 'Crowne Plaza Madinah', destinationId: madinah.id, category: '4-star', capacity: 400, amenities: ['WiFi', 'Restaurant', 'Prayer Room', 'Business Center'], description: 'Business-friendly hotel' },
    { hotelCode: 'MAD007', hotelName: 'Madinah Holiday Inn', destinationId: madinah.id, category: '3-star', capacity: 350, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Budget-friendly 3-star hotel' },
    { hotelCode: 'MAD008', hotelName: 'Al Madinah Concorde', destinationId: madinah.id, category: '3-star', capacity: 300, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Affordable accommodation' },
    { hotelCode: 'MAD009', hotelName: 'Madinah Golden Tulip', destinationId: madinah.id, category: '3-star', capacity: 250, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Comfortable 3-star hotel' },
    { hotelCode: 'MAD010', hotelName: 'Al Eman Royal Hotel', destinationId: madinah.id, category: '2-star', capacity: 200, amenities: ['WiFi', 'Restaurant', 'Prayer Room'], description: 'Basic accommodation' },

    // Jeddah Hotels
    { hotelCode: 'JED001', hotelName: 'Jeddah Hilton', destinationId: jeddah.id, category: '5-star', capacity: 800, amenities: ['WiFi', 'Restaurant', 'Pool', 'Spa', 'Beach Access'], description: 'Luxury beachfront hotel' },
    { hotelCode: 'JED002', hotelName: 'Four Seasons Hotel Jeddah', destinationId: jeddah.id, category: '5-star', capacity: 600, amenities: ['WiFi', 'Restaurant', 'Pool', 'Spa', 'Beach Access'], description: 'Ultra-luxury beachfront hotel' },
    { hotelCode: 'JED003', hotelName: 'Jeddah Marriott Hotel', destinationId: jeddah.id, category: '4-star', capacity: 500, amenities: ['WiFi', 'Restaurant', 'Pool', 'Fitness Center'], description: 'Modern 4-star hotel' },
    { hotelCode: 'JED004', hotelName: 'Pullman Jeddah Al Hamra', destinationId: jeddah.id, category: '4-star', capacity: 400, amenities: ['WiFi', 'Restaurant', 'Pool', 'Business Center'], description: 'Business-friendly hotel' },
    { hotelCode: 'JED005', hotelName: 'Jeddah Holiday Inn', destinationId: jeddah.id, category: '3-star', capacity: 300, amenities: ['WiFi', 'Restaurant', 'Pool'], description: 'Budget-friendly 3-star hotel' },
    { hotelCode: 'JED006', hotelName: 'Crowne Plaza Jeddah', destinationId: jeddah.id, category: '4-star', capacity: 350, amenities: ['WiFi', 'Restaurant', 'Pool', 'Fitness Center'], description: 'Comfortable 4-star hotel' },
    { hotelCode: 'JED007', hotelName: 'Jeddah Millennium Hotel', destinationId: jeddah.id, category: '3-star', capacity: 250, amenities: ['WiFi', 'Restaurant', 'Pool'], description: 'Affordable 3-star hotel' },
    { hotelCode: 'JED008', hotelName: 'Al Hamra Hotel Jeddah', destinationId: jeddah.id, category: '3-star', capacity: 200, amenities: ['WiFi', 'Restaurant'], description: 'Basic accommodation' },
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
