const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMinimumMasterData() {
  console.log('🌱 Starting minimum master data seeding...');

  try {
    // 1. Seed Airport Masters
    console.log('✈️  Seeding Airport Masters...');
    const airports = [
      {
        airportCode: 'JED',
        airportName: 'King Abdulaziz International Airport',
        city: 'Jeddah',
        country: 'Saudi Arabia',
        isActive: true
      },
      {
        airportCode: 'MED',
        airportName: 'Prince Mohammad Bin Abdulaziz Airport',
        city: 'Medina',
        country: 'Saudi Arabia',
        isActive: true
      },
      {
        airportCode: 'RUH',
        airportName: 'King Khalid International Airport',
        city: 'Riyadh',
        country: 'Saudi Arabia',
        isActive: true
      }
    ];

    for (const airport of airports) {
      const existingAirport = await prisma.airportMaster.findUnique({
        where: { airportCode: airport.airportCode }
      });

      if (!existingAirport) {
        await prisma.airportMaster.create({
          data: airport
        });
        console.log(`✅ Created airport: ${airport.airportCode} - ${airport.airportName}`);
      } else {
        console.log(`⏭️  Airport already exists: ${airport.airportCode}`);
      }
    }

    // 2. Seed Destination Masters
    console.log('🏛️  Seeding Destination Masters...');
    const destinations = [
      {
        destinationCode: 'MAK',
        destinationName: 'Makkah',
        city: 'Makkah',
        country: 'Saudi Arabia',
        isActive: true
      },
      {
        destinationCode: 'MAD',
        destinationName: 'Madina',
        city: 'Madina',
        country: 'Saudi Arabia',
        isActive: true
      }
    ];

    const createdDestinations = [];
    for (const destination of destinations) {
      const existingDestination = await prisma.destinationMaster.findUnique({
        where: { destinationCode: destination.destinationCode }
      });

      if (!existingDestination) {
        const created = await prisma.destinationMaster.create({
          data: destination
        });
        createdDestinations.push(created);
        console.log(`✅ Created destination: ${destination.destinationCode} - ${destination.destinationName}`);
      } else {
        createdDestinations.push(existingDestination);
        console.log(`⏭️  Destination already exists: ${destination.destinationCode}`);
      }
    }

    // 3. Seed Hotel Masters
    console.log('🏨 Seeding Hotel Masters...');
    const hotels = [
      {
        hotelCode: 'HILTON_MAK',
        hotelName: 'Hilton Makkah',
        category: '5 Star',
        capacity: 500,
        destinationId: createdDestinations.find(d => d.destinationCode === 'MAK')?.id,
        isActive: true
      },
      {
        hotelCode: 'HILTON_MAD',
        hotelName: 'Madinah Hilton',
        category: '5 Star',
        capacity: 300,
        destinationId: createdDestinations.find(d => d.destinationCode === 'MAD')?.id,
        isActive: true
      },
      {
        hotelCode: 'CLOCK_MAK',
        hotelName: 'Makkah Clock Royal Tower',
        category: '5 Star',
        capacity: 1000,
        destinationId: createdDestinations.find(d => d.destinationCode === 'MAK')?.id,
        isActive: true
      },
      {
        hotelCode: 'PULLMAN_MAD',
        hotelName: 'Pullman Zamzam Madina',
        category: '5 Star',
        capacity: 400,
        destinationId: createdDestinations.find(d => d.destinationCode === 'MAD')?.id,
        isActive: true
      }
    ];

    for (const hotel of hotels) {
      if (hotel.destinationId) {
        const existingHotel = await prisma.hotelMaster.findFirst({
          where: { 
            hotelName: hotel.hotelName,
            destinationId: hotel.destinationId
          }
        });

        if (!existingHotel) {
          await prisma.hotelMaster.create({
            data: hotel
          });
          console.log(`✅ Created hotel: ${hotel.hotelName}`);
        } else {
          console.log(`⏭️  Hotel already exists: ${hotel.hotelName}`);
        }
      } else {
        console.log(`❌ Skipped hotel ${hotel.hotelName} - destination not found`);
      }
    }

    // 4. Seed Country Masters (for nationality selection)
    console.log('🌍 Seeding Country Masters...');
    const countries = [
      {
        countryCode: 'SA',
        countryName: 'Saudi Arabia',
        nationality: 'Saudi',
        isActive: true
      },
      {
        countryCode: 'IN',
        countryName: 'India',
        nationality: 'Indian',
        isActive: true
      },
      {
        countryCode: 'PK',
        countryName: 'Pakistan',
        nationality: 'Pakistani',
        isActive: true
      },
      {
        countryCode: 'BD',
        countryName: 'Bangladesh',
        nationality: 'Bangladeshi',
        isActive: true
      },
      {
        countryCode: 'EG',
        countryName: 'Egypt',
        nationality: 'Egyptian',
        isActive: true
      }
    ];

    for (const country of countries) {
      const existingCountry = await prisma.countryMaster.findUnique({
        where: { countryCode: country.countryCode }
      });

      if (!existingCountry) {
        await prisma.countryMaster.create({
          data: country
        });
        console.log(`✅ Created country: ${country.countryCode} - ${country.countryName}`);
      } else {
        console.log(`⏭️  Country already exists: ${country.countryCode}`);
      }
    }

    // 5. Seed Currency Masters
    console.log('💰 Seeding Currency Masters...');
    const currencies = [
      {
        currencyCode: 'SAR',
        currencyName: 'Saudi Riyal',
        symbol: 'ر.س',
        isActive: true
      },
      {
        currencyCode: 'USD',
        currencyName: 'US Dollar',
        symbol: '$',
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
      const existingCurrency = await prisma.currencyMaster.findUnique({
        where: { currencyCode: currency.currencyCode }
      });

      if (!existingCurrency) {
        await prisma.currencyMaster.create({
          data: currency
        });
        console.log(`✅ Created currency: ${currency.currencyCode} - ${currency.currencyName}`);
      } else {
        console.log(`⏭️  Currency already exists: ${currency.currencyCode}`);
      }
    }

    console.log('🎉 Minimum master data seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Airport Masters: 3 airports (JED, MED, RUH)');
    console.log('✅ Destination Masters: 2 destinations (MAK, MAD)');
    console.log('✅ Hotel Masters: 4 hotels (2 in Makkah, 2 in Madina)');
    console.log('✅ Country Masters: 5 countries');
    console.log('✅ Currency Masters: 3 currencies');
    console.log('\n🚀 Your Umrah visa booking workflow is now ready!');

  } catch (error) {
    console.error('❌ Error seeding master data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedMinimumMasterData()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedMinimumMasterData };
