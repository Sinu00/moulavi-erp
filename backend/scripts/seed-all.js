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

    // 3. Seed City Master (Saudi cities)
    console.log('3️⃣ Seeding City Master...');
    const saudiArabia = await prisma.countryMaster.findUnique({ where: { countryCode: 'SAU' } });
    if (!saudiArabia) {
      throw new Error('Saudi Arabia country not found. Please ensure country master is seeded first.');
    }

    const cities = [
      { name: 'Makkah' },
      { name: 'Madinah' },
      { name: 'Jeddah' },
      { name: 'Riyadh' },
      { name: 'Dammam' },
      { name: 'Taif' },
      { name: 'Abha' },
      { name: 'Jazan' },
      { name: 'Buraidah' },
      { name: 'Khobar' },
      { name: 'Tabuk' },
      { name: 'Najran' },
      { name: 'Hail' },
      { name: 'Yanbu' },
      { name: 'Khamis Mushait' }
    ];

    const cityMap = {};
    for (const city of cities) {
      const created = await prisma.cityMaster.upsert({
        where: { 
          name_countryId: { 
            name: city.name, 
            countryId: saudiArabia.id 
          } 
        },
        update: { name: city.name, countryId: saudiArabia.id, isActive: true },
        create: { 
          name: city.name, 
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      cityMap[city.name] = created;
    }
    console.log(`✅ Created ${cities.length} cities\n`);

    // 4. Seed Location Master - Airports (linked to cities)
    console.log('4️⃣ Seeding Location Master - Airports...');
    
    const airports = [
      { code: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah' },
      { code: 'MED', name: 'Prince Mohammad Bin Abdulaziz Airport', city: 'Madinah' },
      { code: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh' },
      { code: 'DMM', name: 'King Fahd International Airport', city: 'Dammam' },
      { code: 'TIF', name: 'Taif Regional Airport', city: 'Taif' },
      { code: 'AHB', name: 'Abha Regional Airport', city: 'Abha' },
      { code: 'GIZ', name: 'Jazan Regional Airport', city: 'Jazan' },
      { code: 'ELQ', name: 'Gassim Regional Airport', city: 'Buraidah' },
      { code: 'TUU', name: 'Tabuk Regional Airport', city: 'Tabuk' },
      { code: 'EAM', name: 'Najran Regional Airport', city: 'Najran' },
      { code: 'HAS', name: 'Hail Regional Airport', city: 'Hail' },
      { code: 'YNB', name: 'Yanbu Airport', city: 'Yanbu' }
    ];

    let airportCount = 0;
    for (const airport of airports) {
      const city = cityMap[airport.city];
      if (!city) {
        console.warn(`   ⚠️  City ${airport.city} not found, skipping airport ${airport.code}`);
        continue;
      }

      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: airport.code, 
            locationType: 'AIRPORT' 
          } 
        },
        update: { 
          name: airport.name, 
          city: airport.city,
          cityId: city.id,
          countryId: saudiArabia.id 
        },
        create: { 
          code: airport.code, 
          name: airport.name, 
          city: airport.city,
          cityId: city.id,
          locationType: 'AIRPORT',
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      airportCount++;
    }
    console.log(`✅ Created ${airportCount} airport locations\n`);

    // 5. Seed Location Master - Hotels (linked to cities)
    console.log('5️⃣ Seeding Location Master - Hotels...');
    
    // Delete related records first to avoid foreign key constraints
    await prisma.umrahHotelBooking.deleteMany({});
    console.log('   Cleared existing hotel bookings...');

    const hotels = [
      // Makkah Hotels
      { code: 'MAK001', name: 'Makkah Clock Royal Tower', city: 'Makkah' },
      { code: 'MAK002', name: 'Fairmont Makkah Clock Royal Tower', city: 'Makkah' },
      { code: 'MAK003', name: 'Swissotel Makkah', city: 'Makkah' },
      { code: 'MAK004', name: 'Conrad Makkah', city: 'Makkah' },
      { code: 'MAK005', name: 'Pullman Zamzam Makkah', city: 'Makkah' },
      { code: 'MAK006', name: 'Makkah Hilton Towers', city: 'Makkah' },
      { code: 'MAK007', name: 'Raffles Makkah Palace', city: 'Makkah' },
      { code: 'MAK008', name: 'Hyatt Regency Makkah', city: 'Makkah' },
      { code: 'MAK009', name: 'Makkah Millennium Hotel', city: 'Makkah' },
      { code: 'MAK010', name: 'Al Kiswah Towers Hotel', city: 'Makkah' },
      { code: 'MAK011', name: 'Shaza Makkah', city: 'Makkah' },
      { code: 'MAK012', name: 'Makkah Movenpick', city: 'Makkah' },
      // Madinah Hotels
      { code: 'MED001', name: 'Madinah Hilton', city: 'Madinah' },
      { code: 'MED002', name: 'Dar Al Hijra InterContinental', city: 'Madinah' },
      { code: 'MED003', name: 'Madinah Millennium Hotel', city: 'Madinah' },
      { code: 'MED004', name: 'Pullman Madinah Al Madinah', city: 'Madinah' },
      { code: 'MED005', name: 'Madinah Marriott Hotel', city: 'Madinah' },
      { code: 'MED006', name: 'Crowne Plaza Madinah', city: 'Madinah' },
      { code: 'MED007', name: 'Madinah Holiday Inn', city: 'Madinah' },
      { code: 'MED008', name: 'Al Madinah Concorde', city: 'Madinah' },
      { code: 'MED009', name: 'Madinah Golden Tulip', city: 'Madinah' },
      { code: 'MED010', name: 'Al Eman Royal Hotel', city: 'Madinah' },
      { code: 'MED011', name: 'Anwar Al Madinah Mövenpick', city: 'Madinah' },
      { code: 'MED012', name: 'Shaza Al Madina', city: 'Madinah' },
      // Jeddah Hotels
      { code: 'JED001', name: 'Jeddah Hilton', city: 'Jeddah' },
      { code: 'JED002', name: 'Four Seasons Hotel Jeddah', city: 'Jeddah' },
      { code: 'JED003', name: 'Jeddah Marriott Hotel', city: 'Jeddah' },
      { code: 'JED004', name: 'Pullman Jeddah Al Hamra', city: 'Jeddah' },
      { code: 'JED005', name: 'Jeddah Holiday Inn', city: 'Jeddah' },
      { code: 'JED006', name: 'Crowne Plaza Jeddah', city: 'Jeddah' },
      { code: 'JED007', name: 'Jeddah Millennium Hotel', city: 'Jeddah' },
      { code: 'JED008', name: 'Al Hamra Hotel Jeddah', city: 'Jeddah' },
      { code: 'JED009', name: 'Jeddah Sheraton', city: 'Jeddah' },
      { code: 'JED010', name: 'Ramada by Wyndham Jeddah', city: 'Jeddah' },
      // Riyadh Hotels
      { code: 'RUH001', name: 'Riyadh Marriott Hotel', city: 'Riyadh' },
      { code: 'RUH002', name: 'Four Seasons Hotel Riyadh', city: 'Riyadh' },
      { code: 'RUH003', name: 'Riyadh Hilton', city: 'Riyadh' },
      { code: 'RUH004', name: 'InterContinental Riyadh', city: 'Riyadh' },
      { code: 'RUH005', name: 'Crowne Plaza Riyadh', city: 'Riyadh' },
      { code: 'RUH006', name: 'Riyadh Holiday Inn', city: 'Riyadh' },
      // Dammam Hotels
      { code: 'DMM001', name: 'Dammam Marriott Hotel', city: 'Dammam' },
      { code: 'DMM002', name: 'Dammam Hilton', city: 'Dammam' },
      { code: 'DMM003', name: 'Crowne Plaza Dammam', city: 'Dammam' },
      { code: 'DMM004', name: 'Dammam Holiday Inn', city: 'Dammam' },
      // Taif Hotels
      { code: 'TAF001', name: 'Taif InterContinental', city: 'Taif' },
      { code: 'TAF002', name: 'Taif Hilton', city: 'Taif' },
      { code: 'TAF003', name: 'Al Hada Resort', city: 'Taif' },
      // Abha Hotels
      { code: 'ABH001', name: 'Abha Palace Hotel', city: 'Abha' },
      { code: 'ABH002', name: 'Mercure Abha', city: 'Abha' },
      { code: 'ABH003', name: 'Abha Grand Hotel', city: 'Abha' }
    ];

    let hotelCount = 0;
    for (const hotel of hotels) {
      const city = cityMap[hotel.city];
      if (!city) {
        console.warn(`   ⚠️  City ${hotel.city} not found, skipping hotel ${hotel.code}`);
        continue;
      }

      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: hotel.code, 
            locationType: 'HOTEL' 
          } 
        },
        update: { 
          name: hotel.name, 
          city: hotel.city,
          cityId: city.id,
          countryId: saudiArabia.id 
        },
        create: { 
          code: hotel.code, 
          name: hotel.name, 
          city: hotel.city,
          cityId: city.id,
          locationType: 'HOTEL',
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      hotelCount++;
    }
    console.log(`✅ Created ${hotelCount} hotel locations\n`);

    // 5.5. Seed Location Master - Ziyarat Locations
    console.log('5.5️⃣ Seeding Location Master - Ziyarat Locations...');
    
    const ziyaratLocations = [
      { code: 'MAK_ZIY', name: 'Makkah Ziyarah', city: 'Makkah' },
      { code: 'MAD_ZIY', name: 'Madinah Ziyarath', city: 'Madinah' }
    ];

    let ziyaratCount = 0;
    for (const ziyarat of ziyaratLocations) {
      const city = cityMap[ziyarat.city];
      if (!city) {
        console.warn(`   ⚠️  City ${ziyarat.city} not found, skipping ziyarat ${ziyarat.code}`);
        continue;
      }

      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: ziyarat.code, 
            locationType: 'ZIYARAT' 
          } 
        },
        update: { 
          name: ziyarat.name, 
          city: ziyarat.city,
          cityId: city.id,
          countryId: saudiArabia.id 
        },
        create: { 
          code: ziyarat.code, 
          name: ziyarat.name, 
          city: ziyarat.city,
          cityId: city.id,
          locationType: 'ZIYARAT',
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      ziyaratCount++;
    }
    console.log(`✅ Created ${ziyaratCount} ziyarat locations\n`);

    // 5.6. Seed Location Master - City Centers
    console.log('5.6️⃣ Seeding Location Master - City Centers...');
    
    const cityCenters = [
      { code: 'JEDCC', name: 'Jeddah City Center', city: 'Jeddah' },
      { code: 'MEDCC', name: 'Madinah City Center', city: 'Madinah' },
      { code: 'MAKCC', name: 'Makkah City Center', city: 'Makkah' }
    ];

    let cityCenterCount = 0;
    for (const center of cityCenters) {
      const city = cityMap[center.city];
      if (!city) {
        console.warn(`   ⚠️  City ${center.city} not found, skipping city center ${center.code}`);
        continue;
      }

      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: center.code, 
            locationType: 'OTHERS' 
          } 
        },
        update: { 
          name: center.name, 
          city: center.city,
          cityId: city.id,
          countryId: saudiArabia.id 
        },
        create: { 
          code: center.code, 
          name: center.name, 
          city: center.city,
          cityId: city.id,
          locationType: 'OTHERS',
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      cityCenterCount++;
    }
    console.log(`✅ Created ${cityCenterCount} city center locations\n`);

    // 6. Seed Vehicle Type Master
    console.log('6️⃣ Seeding Vehicle Type Master...');
    
    const vehicleTypes = [
      { vehicleName: 'Lexus ES 250', paxCount: 3 },
      { vehicleName: 'GMC', paxCount: 5 },
      { vehicleName: 'Staria', paxCount: 8 },
      { vehicleName: 'Hiace', paxCount: 9 },
      { vehicleName: 'Coaster Bus', paxCount: 25 },
      { vehicleName: 'Coach Bus Vip', paxCount: 30 },
      { vehicleName: 'Large Bus', paxCount: 45 }
    ];

    const vehicleTypeMap = {};
    for (const vt of vehicleTypes) {
      const created = await prisma.vehicleTypeMaster.upsert({
        where: { vehicleName: vt.vehicleName },
        update: { paxCount: vt.paxCount, isActive: true },
        create: { 
          vehicleName: vt.vehicleName, 
          paxCount: vt.paxCount,
          isActive: true
        }
      });
      vehicleTypeMap[vt.vehicleName] = created;
    }
    console.log(`✅ Created ${vehicleTypes.length} vehicle types\n`);

    // 7. Seed Transport Master
    console.log('7️⃣ Seeding Transport Master...');
    
    // Delete related records first
    await prisma.umrahTransportBooking.deleteMany({});
    console.log('   Cleared transport bookings...');
    
    await prisma.transportMaster.deleteMany({});
    console.log('   Cleared existing transport masters...');

    // Get location IDs for city centers and airport
    const jeddahCityCenter = await prisma.locationMaster.findUnique({
      where: { code_locationType: { code: 'JEDCC', locationType: 'OTHERS' } }
    });
    const makkahCityCenter = await prisma.locationMaster.findUnique({
      where: { code_locationType: { code: 'MAKCC', locationType: 'OTHERS' } }
    });
    const madinahCityCenter = await prisma.locationMaster.findUnique({
      where: { code_locationType: { code: 'MEDCC', locationType: 'OTHERS' } }
    });
    const jeddahAirport = await prisma.locationMaster.findUnique({
      where: { code_locationType: { code: 'JED', locationType: 'AIRPORT' } }
    });

    if (!jeddahCityCenter || !makkahCityCenter || !madinahCityCenter || !jeddahAirport) {
      console.warn('   ⚠️  Some reference locations not found, skipping transport routes');
    } else {
      // Seed actual transport routes from database
      const coasterBus = vehicleTypeMap['Coaster Bus'];
      if (!coasterBus) {
        console.warn('   ⚠️  Coaster Bus vehicle type not found');
      } else {
        const transportRoutes = [
          { from: jeddahCityCenter.id, to: madinahCityCenter.id, price: 44400 },
          { from: jeddahCityCenter.id, to: makkahCityCenter.id, price: 32400 },
          { from: jeddahAirport.id, to: jeddahCityCenter.id, price: 25200 },
          { from: madinahCityCenter.id, to: jeddahCityCenter.id, price: 44400 },
          { from: madinahCityCenter.id, to: makkahCityCenter.id, price: 44000 },
          { from: makkahCityCenter.id, to: madinahCityCenter.id, price: 44400 }
        ];

        const transportData = transportRoutes.map(route => ({
          fromLocationId: route.from,
          toLocationId: route.to,
          vehicleTypeId: coasterBus.id,
          price: route.price,
          isActive: true
        }));

        await prisma.transportMaster.createMany({ data: transportData });
        console.log(`✅ Created ${transportData.length} transport routes\n`);
      }
    }

    // 8. Seed Full Trip Master
    console.log('8️⃣ Seeding Full Trip Master...');
    
    // Delete related records first
    await prisma.fullTripMasterToCity.deleteMany({});
    console.log('   Cleared full trip master to cities...');
    
    await prisma.fullTripMaster.deleteMany({});
    console.log('   Cleared existing full trip masters...');

    const jeddahCity = cityMap['Jeddah'];
    const makkahCity = cityMap['Makkah'];
    const madinahCity = cityMap['Madinah'];
    const coachBusVip = vehicleTypeMap['Coach Bus Vip'];

    if (!jeddahCity || !makkahCity || !madinahCity || !coachBusVip) {
      console.warn('   ⚠️  Required cities or vehicle type not found, skipping full trip masters');
    } else {
      // Seed actual full trip masters from database
      const fullTripMasters = [
        {
          fromCityId: jeddahCity.id,
          vehicleTypeId: coachBusVip.id,
          price: 97200,
          toCities: [
            { cityId: makkahCity.id, sequenceOrder: 1 },
            { cityId: madinahCity.id, sequenceOrder: 2 },
            { cityId: madinahCity.id, sequenceOrder: 3 }
          ]
        },
        {
          fromCityId: jeddahCity.id,
          vehicleTypeId: coachBusVip.id,
          price: 109200,
          toCities: [
            { cityId: madinahCity.id, sequenceOrder: 1 },
            { cityId: makkahCity.id, sequenceOrder: 2 },
            { cityId: jeddahCity.id, sequenceOrder: 3 }
          ]
        },
        {
          fromCityId: jeddahCity.id,
          vehicleTypeId: coachBusVip.id,
          price: 109200,
          toCities: [
            { cityId: makkahCity.id, sequenceOrder: 1 },
            { cityId: madinahCity.id, sequenceOrder: 2 },
            { cityId: jeddahCity.id, sequenceOrder: 3 }
          ]
        }
      ];

      let fullTripCount = 0;
      for (const trip of fullTripMasters) {
        const createdTrip = await prisma.fullTripMaster.create({
          data: {
            fromCityId: trip.fromCityId,
            vehicleTypeId: trip.vehicleTypeId,
            price: trip.price,
            isActive: true,
            toCities: {
              create: trip.toCities
            }
          }
        });
        fullTripCount++;
      }
      console.log(`✅ Created ${fullTripCount} full trip masters\n`);
    }

    console.log('🎉 All master data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${currencies.length} Currencies`);
    console.log(`   - ${countries.length} Countries`);
    console.log(`   - ${cities.length} Cities`);
    console.log(`   - ${airportCount} Airport Locations`);
    console.log(`   - ${hotelCount} Hotel Locations`);
    console.log(`   - ${ziyaratCount} Ziyarat Locations`);
    console.log(`   - ${cityCenterCount} City Center Locations`);
    console.log(`   - ${vehicleTypes.length} Vehicle Types`);
    
    // Count transport options and full trip masters
    const transportCount = await prisma.transportMaster.count();
    const fullTripCount = await prisma.fullTripMaster.count();
    console.log(`   - ${transportCount} Transport Options`);
    console.log(`   - ${fullTripCount} Full Trip Masters`);

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

