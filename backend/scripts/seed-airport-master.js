const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Saudi Arabia airports only for Umrah service
const airports = [
  {
    airportCode: 'JED',
    airportName: 'King Abdulaziz International Airport',
    city: 'Jeddah',
    country: 'Saudi Arabia'
  },
  {
    airportCode: 'MED',
    airportName: 'Prince Mohammad Bin Abdulaziz Airport',
    city: 'Medina',
    country: 'Saudi Arabia'
  },
  {
    airportCode: 'RUH',
    airportName: 'King Khalid International Airport',
    city: 'Riyadh',
    country: 'Saudi Arabia'
  },
  {
    airportCode: 'DMM',
    airportName: 'King Fahd International Airport',
    city: 'Dammam',
    country: 'Saudi Arabia'
  },
  {
    airportCode: 'TIF',
    airportName: 'Taif Regional Airport',
    city: 'Taif',
    country: 'Saudi Arabia'
  },
  {
    airportCode: 'AHB',
    airportName: 'Abha Regional Airport',
    city: 'Abha',
    country: 'Saudi Arabia'
  },
  {
    airportCode: 'GIZ',
    airportName: 'Jazan Regional Airport',
    city: 'Jazan',
    country: 'Saudi Arabia'
  },
  {
    airportCode: 'ELQ',
    airportName: 'Gassim Regional Airport',
    city: 'Buraidah',
    country: 'Saudi Arabia'
  }
];

async function seedAirportMaster() {
  console.log('✈️ Seeding Airport Master data...');

  try {
    // Clear existing data
    await prisma.airportMaster.deleteMany({});
    console.log('🗑️ Cleared existing airport data');

    // Insert new data
    for (const airport of airports) {
      await prisma.airportMaster.create({
        data: airport
      });
      console.log(`✅ Added airport: ${airport.airportCode} - ${airport.airportName}`);
    }

    console.log(`🎉 Successfully seeded ${airports.length} airports`);
  } catch (error) {
    console.error('❌ Error seeding airport master data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedAirportMaster()
    .then(() => {
      console.log('✅ Airport Master seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Airport Master seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedAirportMaster;
