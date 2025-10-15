const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Master seeding script - Seeds all master data in correct order
 * Run this after migrations to populate initial data
 */

async function seedAll() {
  console.log('🌱 Starting comprehensive data seeding...\n');

  try {
    // 1. Seed Currency Master (SAR, INR)
    console.log('1️⃣ Seeding Currency Master...');
    const currencies = [
      { 
        currencyCode: 'SAR', 
        currencyName: 'Saudi Riyal', 
        symbol: 'SR',
        isActive: true
      },
      { 
        currencyCode: 'INR', 
        currencyName: 'Indian Rupee', 
        symbol: '₹',
        isActive: true
      }
    ];
    for (const currency of currencies) {
      await prisma.currencyMaster.upsert({
        where: { currencyCode: currency.currencyCode },
        update: currency,
        create: currency
      });
    }
    console.log(`✅ Created ${currencies.length} currencies\n`);

    // 2. Seed Country Master (Saudi Arabia, India)
    console.log('2️⃣ Seeding Country Master...');
    const countries = [
      { 
        countryCode: 'SAU', 
        countryName: 'Saudi Arabia', 
        currencyCode: 'SAR',
        isActive: true
      },
      { 
        countryCode: 'IND', 
        countryName: 'India', 
        currencyCode: 'INR',
        isActive: true
      }
    ];
    for (const country of countries) {
      await prisma.countryMaster.upsert({
        where: { countryCode: country.countryCode },
        update: country,
        create: country
      });
    }
    console.log(`✅ Created ${countries.length} countries\n`);


    // 3. Seed Destination Master (Saudi cities)
    console.log('3️⃣ Seeding Destination Master...');
    const destinations = [
      { destinationCode: 'MAK', destinationName: 'Makkah (Holy City)', city: 'Makkah', country: 'Saudi Arabia' },
      { destinationCode: 'MED', destinationName: 'Madinah (Prophet\'s City)', city: 'Madinah', country: 'Saudi Arabia' },
      { destinationCode: 'JED', destinationName: 'Jeddah (Port City)', city: 'Jeddah', country: 'Saudi Arabia' },
      { destinationCode: 'RUH', destinationName: 'Riyadh (Capital)', city: 'Riyadh', country: 'Saudi Arabia' },
      { destinationCode: 'TAF', destinationName: 'Taif (Mountain City)', city: 'Taif', country: 'Saudi Arabia' }
    ];
    for (const dest of destinations) {
      await prisma.destinationMaster.upsert({
        where: { destinationCode: dest.destinationCode },
        update: dest,
        create: dest
      });
    }
    console.log(`✅ Created ${destinations.length} destinations\n`);

    // 5. Seed Airport Master (Saudi airports)
    console.log('4️⃣ Seeding Airport Master...');
    
    // Delete related records first to avoid foreign key constraints
    await prisma.umrahTravelDetails.deleteMany({});
    console.log('   Cleared travel details...');
    
    // Now safe to delete airports
    await prisma.airportMaster.deleteMany({});
    console.log('   Cleared existing airports...');
    
    const airports = [
      { airportCode: 'JED', airportName: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia' },
      { airportCode: 'MED', airportName: 'Prince Mohammad Bin Abdulaziz Airport', city: 'Medina', country: 'Saudi Arabia' },
      { airportCode: 'RUH', airportName: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia' },
      { airportCode: 'DMM', airportName: 'King Fahd International Airport', city: 'Dammam', country: 'Saudi Arabia' },
      { airportCode: 'TIF', airportName: 'Taif Regional Airport', city: 'Taif', country: 'Saudi Arabia' },
      { airportCode: 'AHB', airportName: 'Abha Regional Airport', city: 'Abha', country: 'Saudi Arabia' },
      { airportCode: 'GIZ', airportName: 'Jazan Regional Airport', city: 'Jazan', country: 'Saudi Arabia' },
      { airportCode: 'ELQ', airportName: 'Gassim Regional Airport', city: 'Buraidah', country: 'Saudi Arabia' }
    ];
    await prisma.airportMaster.createMany({ data: airports });
    console.log(`✅ Created ${airports.length} airports\n`);

    // 6. Seed Hotel Master
    console.log('5️⃣ Seeding Hotel Master...');
    const makkah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'MAK' } });
    const madinah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'MED' } });
    const jeddah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'JED' } });

    const hotels = [
      // Makkah Hotels
      { hotelCode: 'MAK001', hotelName: 'Makkah Clock Royal Tower', locationId: makkah.id },
      { hotelCode: 'MAK002', hotelName: 'Fairmont Makkah', locationId: makkah.id },
      { hotelCode: 'MAK003', hotelName: 'Swissotel Makkah', locationId: makkah.id },
      { hotelCode: 'MAK004', hotelName: 'Conrad Makkah', locationId: makkah.id },
      { hotelCode: 'MAK005', hotelName: 'Pullman Zamzam Makkah', locationId: makkah.id },
      // Madinah Hotels
      { hotelCode: 'MED001', hotelName: 'Madinah Hilton', locationId: madinah.id },
      { hotelCode: 'MED002', hotelName: 'Dar Al Hijra InterContinental', locationId: madinah.id },
      { hotelCode: 'MED003', hotelName: 'Madinah Millennium Hotel', locationId: madinah.id },
      { hotelCode: 'MED004', hotelName: 'Pullman Madinah', locationId: madinah.id },
      { hotelCode: 'MED005', hotelName: 'Madinah Marriott Hotel', locationId: madinah.id },
      // Jeddah Hotels
      { hotelCode: 'JED001', hotelName: 'Jeddah Hilton', locationId: jeddah.id },
      { hotelCode: 'JED002', hotelName: 'Four Seasons Jeddah', locationId: jeddah.id },
      { hotelCode: 'JED003', hotelName: 'Jeddah Marriott', locationId: jeddah.id }
    ];
    for (const hotel of hotels) {
      await prisma.hotelMaster.upsert({
        where: { hotelCode: hotel.hotelCode },
        update: hotel,
        create: hotel
      });
    }
    console.log(`✅ Created ${hotels.length} hotels\n`);

    // 7. Seed Transport Master
    console.log('6️⃣ Seeding Transport Master...');
    
    // Delete related records first
    await prisma.umrahTransportBooking.deleteMany({});
    console.log('   Cleared transport bookings...');
    
    await prisma.transportMaster.deleteMany({});
    console.log('   Cleared existing transport masters...');
    
    const destMap = {
      MAK: makkah.id,
      MED: madinah.id,
      JED: jeddah.id
    };

    const vehicles = [
      { type: 'Lexus ES 250', paxCount: 3 },
      { type: 'GMC', paxCount: 5 },
      { type: 'Staria', paxCount: 8 },
      { type: 'Hiace', paxCount: 9 }
    ];

    const routes = [
      { from: 'JED', to: 'MAK', basePrice: 559 },
      { from: 'JED', to: 'MED', basePrice: 700 },
      { from: 'MAK', to: 'MED', basePrice: 500 },
      { from: 'MED', to: 'MAK', basePrice: 500 },
      { from: 'MAK', to: 'JED', basePrice: 559 },
      { from: 'MED', to: 'JED', basePrice: 700 }
    ];

    const transportData = [];
    routes.forEach(route => {
      vehicles.forEach(vehicle => {
        const priceMultiplier = vehicle.paxCount <= 3 ? 1 : vehicle.paxCount <= 5 ? 1.3 : vehicle.paxCount <= 8 ? 1.5 : 1.8;
        const price = Math.round(route.basePrice * priceMultiplier);

        transportData.push({
          fromLocationId: destMap[route.from],
          toLocationId: destMap[route.to],
          vehicleType: vehicle.type,
          paxCount: vehicle.paxCount,
          price: price
        });
      });
    });

    await prisma.transportMaster.createMany({ data: transportData });
    console.log(`✅ Created ${transportData.length} transport options\n`);

    console.log('🎉 All master data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${currencies.length} Currencies`);
    console.log(`   - ${countries.length} Countries`);
    console.log(`   - ${services.length} Service Types`);
    console.log(`   - ${destinations.length} Destinations`);
    console.log(`   - ${airports.length} Airports`);
    console.log(`   - ${hotels.length} Hotels`);
    console.log(`   - ${transportData.length} Transport Options`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('\n✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedAll;

