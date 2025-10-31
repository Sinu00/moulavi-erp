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


    // 3. Seed Location Master - Destinations (Saudi cities)
    console.log('3️⃣ Seeding Location Master - Destinations...');
    const saudiArabia = await prisma.countryMaster.findUnique({ where: { countryCode: 'SAU' } });
    if (!saudiArabia) {
      throw new Error('Saudi Arabia country not found. Please ensure country master is seeded first.');
    }

    const destinations = [
      { code: 'MAK', name: 'Makkah (Holy City)', city: 'Makkah', locationType: 'DESTINATION' },
      { code: 'MED', name: 'Madinah (Prophet\'s City)', city: 'Madinah', locationType: 'DESTINATION' },
      { code: 'JED', name: 'Jeddah (Port City)', city: 'Jeddah', locationType: 'DESTINATION' },
      { code: 'RUH', name: 'Riyadh (Capital)', city: 'Riyadh', locationType: 'DESTINATION' },
      { code: 'TAF', name: 'Taif (Mountain City)', city: 'Taif', locationType: 'DESTINATION' }
    ];
    for (const dest of destinations) {
      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: dest.code, 
            locationType: dest.locationType 
          } 
        },
        update: { name: dest.name, city: dest.city, countryId: saudiArabia.id },
        create: { 
          code: dest.code, 
          name: dest.name, 
          city: dest.city, 
          locationType: dest.locationType,
          countryId: saudiArabia.id,
          isActive: true
        }
      });
    }
    console.log(`✅ Created ${destinations.length} destination locations\n`);

    // 4. Seed Location Master - Airports (Saudi airports)
    console.log('4️⃣ Seeding Location Master - Airports...');
    const airports = [
      { code: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah', locationType: 'AIRPORT' },
      { code: 'MED', name: 'Prince Mohammad Bin Abdulaziz Airport', city: 'Medina', locationType: 'AIRPORT' },
      { code: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', locationType: 'AIRPORT' },
      { code: 'DMM', name: 'King Fahd International Airport', city: 'Dammam', locationType: 'AIRPORT' },
      { code: 'TIF', name: 'Taif Regional Airport', city: 'Taif', locationType: 'AIRPORT' },
      { code: 'AHB', name: 'Abha Regional Airport', city: 'Abha', locationType: 'AIRPORT' },
      { code: 'GIZ', name: 'Jazan Regional Airport', city: 'Jazan', locationType: 'AIRPORT' },
      { code: 'ELQ', name: 'Gassim Regional Airport', city: 'Buraidah', locationType: 'AIRPORT' }
    ];
    for (const airport of airports) {
      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: airport.code, 
            locationType: airport.locationType 
          } 
        },
        update: { name: airport.name, city: airport.city, countryId: saudiArabia.id },
        create: { 
          code: airport.code, 
          name: airport.name, 
          city: airport.city, 
          locationType: airport.locationType,
          countryId: saudiArabia.id,
          isActive: true
        }
      });
    }
    console.log(`✅ Created ${airports.length} airport locations\n`);

    // 5. Seed Airport Master (for backward compatibility with existing code)
    console.log('5️⃣ Seeding Airport Master (legacy table)...');
    await prisma.umrahTravelDetails.deleteMany({});
    await prisma.airportMaster.deleteMany({});
    
    const airportMasterData = [
      { airportCode: 'JED', airportName: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia' },
      { airportCode: 'MED', airportName: 'Prince Mohammad Bin Abdulaziz Airport', city: 'Medina', country: 'Saudi Arabia' },
      { airportCode: 'RUH', airportName: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia' },
      { airportCode: 'DMM', airportName: 'King Fahd International Airport', city: 'Dammam', country: 'Saudi Arabia' },
      { airportCode: 'TIF', airportName: 'Taif Regional Airport', city: 'Taif', country: 'Saudi Arabia' },
      { airportCode: 'AHB', airportName: 'Abha Regional Airport', city: 'Abha', country: 'Saudi Arabia' },
      { airportCode: 'GIZ', airportName: 'Jazan Regional Airport', city: 'Jazan', country: 'Saudi Arabia' },
      { airportCode: 'ELQ', airportName: 'Gassim Regional Airport', city: 'Buraidah', country: 'Saudi Arabia' }
    ];
    await prisma.airportMaster.createMany({ data: airportMasterData });
    console.log(`✅ Created ${airportMasterData.length} airports\n`);

    // 6. Seed Hotel Master
    console.log('6️⃣ Seeding Hotel Master...');
    
    // Delete related records first to avoid foreign key constraints
    await prisma.umrahHotelBooking.deleteMany({});
    await prisma.hotelMaster.deleteMany({});
    console.log('   Cleared existing hotel bookings and hotels...');
    
    const makkah = await prisma.locationMaster.findUnique({ 
      where: { code_locationType: { code: 'MAK', locationType: 'DESTINATION' } } 
    });
    const madinah = await prisma.locationMaster.findUnique({ 
      where: { code_locationType: { code: 'MED', locationType: 'DESTINATION' } } 
    });
    const jeddah = await prisma.locationMaster.findUnique({ 
      where: { code_locationType: { code: 'JED', locationType: 'DESTINATION' } } 
    });

    if (!makkah || !madinah || !jeddah) {
      console.error('   Error: Missing location data:');
      console.error(`   Makkah: ${makkah ? 'Found (ID: ' + makkah.id + ')' : 'NOT FOUND'}`);
      console.error(`   Madinah: ${madinah ? 'Found (ID: ' + madinah.id + ')' : 'NOT FOUND'}`);
      console.error(`   Jeddah: ${jeddah ? 'Found (ID: ' + jeddah.id + ')' : 'NOT FOUND'}`);
      throw new Error('Required destination locations not found. Please ensure location master destinations are seeded first.');
    }
    
    console.log(`   Found locations: MAK(${makkah.id}), MED(${madinah.id}), JED(${jeddah.id})`);

    const hotels = [
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
      { hotelCode: 'JED008', hotelName: 'Al Hamra Hotel Jeddah', locationId: jeddah.id }
    ];
    // Use createMany instead of upsert since we cleared the table
    await prisma.hotelMaster.createMany({ data: hotels });
    console.log(`✅ Created ${hotels.length} hotels\n`);

    // 7. Seed Transport Master
    console.log('7️⃣ Seeding Transport Master...');
    
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
    console.log(`   - ${destinations.length} Destination Locations`);
    console.log(`   - ${airports.length} Airport Locations`);
    console.log(`   - ${airportMasterData.length} Airports (legacy table)`);
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

