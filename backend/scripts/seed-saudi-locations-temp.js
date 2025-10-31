const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Temporary seed file for Saudi Arabia locations and hotels
 * Seeds all airports in Saudi Arabia and 2 hotels in each major city
 * 
 * Usage: node scripts/seed-saudi-locations-temp.js
 */

async function seedSaudiLocations() {
  console.log('🌱 Starting Saudi Arabia location and hotel seeding...\n');

  try {
    // Get Saudi Arabia country
    const saudiArabia = await prisma.countryMaster.findUnique({ 
      where: { countryCode: 'SAU' } 
    });
    
    if (!saudiArabia) {
      throw new Error('Saudi Arabia country not found. Please ensure country master is seeded first.');
    }

    // 1. Seed Location Master - Destinations (Major Saudi cities)
    console.log('1️⃣ Seeding Location Master - Destinations...');
    const destinations = [
      { code: 'MAK', name: 'Makkah (Holy City)', city: 'Makkah', locationType: 'DESTINATION' },
      { code: 'MED', name: 'Madinah (Prophet\'s City)', city: 'Madinah', locationType: 'DESTINATION' },
      { code: 'JED', name: 'Jeddah (Port City)', city: 'Jeddah', locationType: 'DESTINATION' },
      { code: 'RUH', name: 'Riyadh (Capital)', city: 'Riyadh', locationType: 'DESTINATION' },
      { code: 'DMM', name: 'Dammam (Eastern Province)', city: 'Dammam', locationType: 'DESTINATION' },
      { code: 'TAF', name: 'Taif (Mountain City)', city: 'Taif', locationType: 'DESTINATION' },
      { code: 'AHB', name: 'Abha (Asir Region)', city: 'Abha', locationType: 'DESTINATION' },
      { code: 'GIZ', name: 'Jazan (Southern Region)', city: 'Jazan', locationType: 'DESTINATION' },
      { code: 'ELQ', name: 'Buraidah (Qassim Region)', city: 'Buraidah', locationType: 'DESTINATION' },
      { code: 'TUU', name: 'Tabuk (Northern Region)', city: 'Tabuk', locationType: 'DESTINATION' },
      { code: 'AJF', name: 'Al Jouf (Northern Region)', city: 'Al Jouf', locationType: 'DESTINATION' },
      { code: 'URY', name: 'Hail (Central Region)', city: 'Hail', locationType: 'DESTINATION' }
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
    console.log(`✅ Created/Updated ${destinations.length} destination locations\n`);

    // 2. Seed Location Master - Airports (All Saudi airports)
    console.log('2️⃣ Seeding Location Master - Airports...');
    const airports = [
      { code: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah', locationType: 'AIRPORT' },
      { code: 'MED', name: 'Prince Mohammad Bin Abdulaziz Airport', city: 'Medina', locationType: 'AIRPORT' },
      { code: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', locationType: 'AIRPORT' },
      { code: 'DMM', name: 'King Fahd International Airport', city: 'Dammam', locationType: 'AIRPORT' },
      { code: 'TIF', name: 'Taif Regional Airport', city: 'Taif', locationType: 'AIRPORT' },
      { code: 'AHB', name: 'Abha Regional Airport', city: 'Abha', locationType: 'AIRPORT' },
      { code: 'GIZ', name: 'Jazan Regional Airport', city: 'Jazan', locationType: 'AIRPORT' },
      { code: 'ELQ', name: 'Gassim Regional Airport', city: 'Buraidah', locationType: 'AIRPORT' },
      { code: 'TUU', name: 'Tabuk Regional Airport', city: 'Tabuk', locationType: 'AIRPORT' },
      { code: 'AJF', name: 'Al Jouf Airport', city: 'Al Jouf', locationType: 'AIRPORT' },
      { code: 'URY', name: 'Hail Regional Airport', city: 'Hail', locationType: 'AIRPORT' },
      { code: 'HAS', name: 'Ha\'il Airport', city: 'Ha\'il', locationType: 'AIRPORT' },
      { code: 'YNB', name: 'Yanbu Airport', city: 'Yanbu', locationType: 'AIRPORT' },
      { code: 'ABT', name: 'Al-Baha Airport', city: 'Al-Baha', locationType: 'AIRPORT' },
      { code: 'RAH', name: 'Rafha Airport', city: 'Rafha', locationType: 'AIRPORT' },
      { code: 'RAE', name: 'Arar Airport', city: 'Arar', locationType: 'AIRPORT' },
      { code: 'DWD', name: 'Dawadmi Airport', city: 'Dawadmi', locationType: 'AIRPORT' },
      { code: 'SHW', name: 'Sharurah Airport', city: 'Sharurah', locationType: 'AIRPORT' }
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
    console.log(`✅ Created/Updated ${airports.length} airport locations\n`);

    // 3. Seed Airport Master (legacy table for backward compatibility)
    console.log('3️⃣ Seeding Airport Master (legacy table)...');
    const airportMasterData = [
      { airportCode: 'JED', airportName: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia' },
      { airportCode: 'MED', airportName: 'Prince Mohammad Bin Abdulaziz Airport', city: 'Medina', country: 'Saudi Arabia' },
      { airportCode: 'RUH', airportName: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia' },
      { airportCode: 'DMM', airportName: 'King Fahd International Airport', city: 'Dammam', country: 'Saudi Arabia' },
      { airportCode: 'TIF', airportName: 'Taif Regional Airport', city: 'Taif', country: 'Saudi Arabia' },
      { airportCode: 'AHB', airportName: 'Abha Regional Airport', city: 'Abha', country: 'Saudi Arabia' },
      { airportCode: 'GIZ', airportName: 'Jazan Regional Airport', city: 'Jazan', country: 'Saudi Arabia' },
      { airportCode: 'ELQ', airportName: 'Gassim Regional Airport', city: 'Buraidah', country: 'Saudi Arabia' },
      { airportCode: 'TUU', airportName: 'Tabuk Regional Airport', city: 'Tabuk', country: 'Saudi Arabia' },
      { airportCode: 'AJF', airportName: 'Al Jouf Airport', city: 'Al Jouf', country: 'Saudi Arabia' },
      { airportCode: 'URY', airportName: 'Hail Regional Airport', city: 'Hail', country: 'Saudi Arabia' },
      { airportCode: 'YNB', airportName: 'Yanbu Airport', city: 'Yanbu', country: 'Saudi Arabia' },
      { airportCode: 'ABT', airportName: 'Al-Baha Airport', city: 'Al-Baha', country: 'Saudi Arabia' }
    ];

    // Upsert airports
    for (const airport of airportMasterData) {
      await prisma.airportMaster.upsert({
        where: { airportCode: airport.airportCode },
        update: airport,
        create: airport
      });
    }
    console.log(`✅ Created/Updated ${airportMasterData.length} airports (legacy table)\n`);

    // 4. Seed Hotel Master (2 hotels per major city)
    console.log('4️⃣ Seeding Hotel Master...');
    
    // Get all destination locations
    const locationMap = {};
    for (const dest of destinations) {
      const location = await prisma.locationMaster.findUnique({
        where: { code_locationType: { code: dest.code, locationType: 'DESTINATION' } }
      });
      if (location) {
        locationMap[dest.code] = location.id;
      }
    }

    console.log('   Found destination locations:', Object.keys(locationMap).join(', '));

    const hotels = [
      // Makkah - 2 hotels
      { hotelCode: 'MAK001', hotelName: 'Makkah Clock Royal Tower', locationId: locationMap['MAK'] },
      { hotelCode: 'MAK002', hotelName: 'Fairmont Makkah Clock Royal Tower', locationId: locationMap['MAK'] },
      
      // Madinah - 2 hotels
      { hotelCode: 'MED001', hotelName: 'Madinah Hilton', locationId: locationMap['MED'] },
      { hotelCode: 'MED002', hotelName: 'Dar Al Hijra InterContinental', locationId: locationMap['MED'] },
      
      // Jeddah - 2 hotels
      { hotelCode: 'JED001', hotelName: 'Jeddah Hilton', locationId: locationMap['JED'] },
      { hotelCode: 'JED002', hotelName: 'Four Seasons Hotel Jeddah', locationId: locationMap['JED'] },
      
      // Riyadh - 2 hotels
      { hotelCode: 'RUH001', hotelName: 'Riyadh Marriott Hotel', locationId: locationMap['RUH'] },
      { hotelCode: 'RUH002', hotelName: 'Riyadh Hilton', locationId: locationMap['RUH'] },
      
      // Dammam - 2 hotels
      { hotelCode: 'DMM001', hotelName: 'Dammam Holiday Inn', locationId: locationMap['DMM'] },
      { hotelCode: 'DMM002', hotelName: 'Dammam Marriott Hotel', locationId: locationMap['DMM'] },
      
      // Taif - 2 hotels
      { hotelCode: 'TAF001', hotelName: 'Taif Millennium Hotel', locationId: locationMap['TAF'] },
      { hotelCode: 'TAF002', hotelName: 'Taif Plaza Hotel', locationId: locationMap['TAF'] },
      
      // Abha - 2 hotels
      { hotelCode: 'AHB001', hotelName: 'Abha Palace Hotel', locationId: locationMap['AHB'] },
      { hotelCode: 'AHB002', hotelName: 'Abha InterContinental', locationId: locationMap['AHB'] },
      
      // Jazan - 2 hotels
      { hotelCode: 'GIZ001', hotelName: 'Jazan Hilton', locationId: locationMap['GIZ'] },
      { hotelCode: 'GIZ002', hotelName: 'Jazan Marriott Hotel', locationId: locationMap['GIZ'] },
      
      // Buraidah - 2 hotels
      { hotelCode: 'ELQ001', hotelName: 'Buraidah Golden Tulip', locationId: locationMap['ELQ'] },
      { hotelCode: 'ELQ002', hotelName: 'Buraidah Holiday Inn', locationId: locationMap['ELQ'] },
      
      // Tabuk - 2 hotels
      { hotelCode: 'TUU001', hotelName: 'Tabuk Hilton', locationId: locationMap['TUU'] },
      { hotelCode: 'TUU002', hotelName: 'Tabuk Marriott Hotel', locationId: locationMap['TUU'] },
      
      // Al Jouf - 2 hotels
      { hotelCode: 'AJF001', hotelName: 'Al Jouf Plaza Hotel', locationId: locationMap['AJF'] },
      { hotelCode: 'AJF002', hotelName: 'Al Jouf Millennium Hotel', locationId: locationMap['AJF'] },
      
      // Hail - 2 hotels
      { hotelCode: 'URY001', hotelName: 'Hail Grand Hotel', locationId: locationMap['URY'] },
      { hotelCode: 'URY002', hotelName: 'Hail InterContinental', locationId: locationMap['URY'] }
    ];

    // Filter out hotels with missing locations
    const validHotels = hotels.filter(h => h.locationId);
    
    if (validHotels.length < hotels.length) {
      console.log(`   ⚠️  Warning: ${hotels.length - validHotels.length} hotels skipped due to missing locations`);
    }

    // Upsert hotels
    for (const hotel of validHotels) {
      await prisma.hotelMaster.upsert({
        where: { hotelCode: hotel.hotelCode },
        update: hotel,
        create: hotel
      });
    }
    console.log(`✅ Created/Updated ${validHotels.length} hotels\n`);

    // Summary
    console.log('🎉 Saudi Arabia location and hotel seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`   - ${destinations.length} Destination Locations`);
    console.log(`   - ${airports.length} Airport Locations`);
    console.log(`   - ${airportMasterData.length} Airports (legacy table)`);
    console.log(`   - ${validHotels.length} Hotels (2 per city)`);
    console.log('\n📍 Cities with hotels:');
    const citiesWithHotels = [...new Set(validHotels.map(h => {
      const cityCode = h.hotelCode.substring(0, 3);
      const city = destinations.find(d => d.code === cityCode)?.city || cityCode;
      return city;
    }))];
    citiesWithHotels.forEach(city => console.log(`   - ${city}`));

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  seedSaudiLocations()
    .then(() => {
      console.log('\n✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedSaudiLocations;

