const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAirportRouteMaster() {
  console.log('✈️ Seeding Airport Route Master data...');

  // First, get destination IDs
  const makkah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'MAK' } });
  const madinah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'MAD' } });
  const jeddah = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'JED' } });
  const dubai = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'DXB' } });
  const delhi = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'DEL' } });
  const mumbai = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'BOM' } });
  const karachi = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'KHI' } });
  const dhaka = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'DAC' } });
  const colombo = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'CMB' } });
  const kathmandu = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'KTM' } });
  const kabul = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'KBL' } });
  const cairo = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'CAI' } });
  const jakarta = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'JKT' } });
  const kualaLumpur = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'KUL' } });
  const bangkok = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'BKK' } });
  const manila = await prisma.destinationMaster.findUnique({ where: { destinationCode: 'MNL' } });

  if (!makkah || !madinah || !jeddah) {
    console.error('❌ Required destinations not found. Please run destination master seeding first.');
    process.exit(1);
  }

  const airportRouteData = [
    // Major Umrah routes
    { routeCode: 'JED-MAK', routeName: 'Jeddah to Makkah', fromAirport: 'Jeddah', toAirport: 'Makkah', fromDestinationId: jeddah.id, toDestinationId: makkah.id, description: 'Primary route from Jeddah airport to Makkah' },
    { routeCode: 'JED-MAD', routeName: 'Jeddah to Madinah', fromAirport: 'Jeddah', toAirport: 'Madinah', fromDestinationId: jeddah.id, toDestinationId: madinah.id, description: 'Route from Jeddah airport to Madinah' },
    { routeCode: 'MAK-MAD', routeName: 'Makkah to Madinah', fromAirport: 'Makkah', toAirport: 'Madinah', fromDestinationId: makkah.id, toDestinationId: madinah.id, description: 'Intercity route between holy cities' },
    { routeCode: 'MAD-MAK', routeName: 'Madinah to Makkah', fromAirport: 'Madinah', toAirport: 'Makkah', fromDestinationId: madinah.id, toDestinationId: makkah.id, description: 'Intercity route between holy cities' },
    { routeCode: 'MAK-JED', routeName: 'Makkah to Jeddah', fromAirport: 'Makkah', toAirport: 'Jeddah', fromDestinationId: makkah.id, toDestinationId: jeddah.id, description: 'Return route from Makkah to Jeddah airport' },
    { routeCode: 'MAD-JED', routeName: 'Madinah to Jeddah', fromAirport: 'Madinah', toAirport: 'Jeddah', fromDestinationId: madinah.id, toDestinationId: jeddah.id, description: 'Return route from Madinah to Jeddah airport' },

    // International routes to Jeddah
    { routeCode: 'DXB-JED', routeName: 'Dubai to Jeddah', fromAirport: 'Dubai', toAirport: 'Jeddah', fromDestinationId: dubai?.id, toDestinationId: jeddah.id, description: 'International route from Dubai to Jeddah' },
    { routeCode: 'DEL-JED', routeName: 'Delhi to Jeddah', fromAirport: 'Delhi', toAirport: 'Jeddah', fromDestinationId: delhi?.id, toDestinationId: jeddah.id, description: 'International route from Delhi to Jeddah' },
    { routeCode: 'BOM-JED', routeName: 'Mumbai to Jeddah', fromAirport: 'Mumbai', toAirport: 'Jeddah', fromDestinationId: mumbai?.id, toDestinationId: jeddah.id, description: 'International route from Mumbai to Jeddah' },
    { routeCode: 'KHI-JED', routeName: 'Karachi to Jeddah', fromAirport: 'Karachi', toAirport: 'Jeddah', fromDestinationId: karachi?.id, toDestinationId: jeddah.id, description: 'International route from Karachi to Jeddah' },
    { routeCode: 'DAC-JED', routeName: 'Dhaka to Jeddah', fromAirport: 'Dhaka', toAirport: 'Jeddah', fromDestinationId: dhaka?.id, toDestinationId: jeddah.id, description: 'International route from Dhaka to Jeddah' },
    { routeCode: 'CMB-JED', routeName: 'Colombo to Jeddah', fromAirport: 'Colombo', toAirport: 'Jeddah', fromDestinationId: colombo?.id, toDestinationId: jeddah.id, description: 'International route from Colombo to Jeddah' },
    { routeCode: 'KTM-JED', routeName: 'Kathmandu to Jeddah', fromAirport: 'Kathmandu', toAirport: 'Jeddah', fromDestinationId: kathmandu?.id, toDestinationId: jeddah.id, description: 'International route from Kathmandu to Jeddah' },
    { routeCode: 'KBL-JED', routeName: 'Kabul to Jeddah', fromAirport: 'Kabul', toAirport: 'Jeddah', fromDestinationId: kabul?.id, toDestinationId: jeddah.id, description: 'International route from Kabul to Jeddah' },
    { routeCode: 'CAI-JED', routeName: 'Cairo to Jeddah', fromAirport: 'Cairo', toAirport: 'Jeddah', fromDestinationId: cairo?.id, toDestinationId: jeddah.id, description: 'International route from Cairo to Jeddah' },
    { routeCode: 'JKT-JED', routeName: 'Jakarta to Jeddah', fromAirport: 'Jakarta', toAirport: 'Jeddah', fromDestinationId: jakarta?.id, toDestinationId: jeddah.id, description: 'International route from Jakarta to Jeddah' },
    { routeCode: 'KUL-JED', routeName: 'Kuala Lumpur to Jeddah', fromAirport: 'Kuala Lumpur', toAirport: 'Jeddah', fromDestinationId: kualaLumpur?.id, toDestinationId: jeddah.id, description: 'International route from Kuala Lumpur to Jeddah' },
    { routeCode: 'BKK-JED', routeName: 'Bangkok to Jeddah', fromAirport: 'Bangkok', toAirport: 'Jeddah', fromDestinationId: bangkok?.id, toDestinationId: jeddah.id, description: 'International route from Bangkok to Jeddah' },
    { routeCode: 'MNL-JED', routeName: 'Manila to Jeddah', fromAirport: 'Manila', toAirport: 'Jeddah', fromDestinationId: manila?.id, toDestinationId: jeddah.id, description: 'International route from Manila to Jeddah' },
    // Return routes (Jeddah to international destinations)
    { routeCode: 'JED-DXB', routeName: 'Jeddah to Dubai', fromAirport: 'Jeddah', toAirport: 'Dubai', fromDestinationId: jeddah.id, toDestinationId: dubai?.id, description: 'International return route from Jeddah to Dubai' },
    { routeCode: 'JED-DEL', routeName: 'Jeddah to Delhi', fromAirport: 'Jeddah', toAirport: 'Delhi', fromDestinationId: jeddah.id, toDestinationId: delhi?.id, description: 'International return route from Jeddah to Delhi' },
    { routeCode: 'JED-BOM', routeName: 'Jeddah to Mumbai', fromAirport: 'Jeddah', toAirport: 'Mumbai', fromDestinationId: jeddah.id, toDestinationId: mumbai?.id, description: 'International return route from Jeddah to Mumbai' },
    { routeCode: 'JED-KHI', routeName: 'Jeddah to Karachi', fromAirport: 'Jeddah', toAirport: 'Karachi', fromDestinationId: jeddah.id, toDestinationId: karachi?.id, description: 'International return route from Jeddah to Karachi' },
    { routeCode: 'JED-DAC', routeName: 'Jeddah to Dhaka', fromAirport: 'Jeddah', toAirport: 'Dhaka', fromDestinationId: jeddah.id, toDestinationId: dhaka?.id, description: 'International return route from Jeddah to Dhaka' },
    { routeCode: 'JED-CMB', routeName: 'Jeddah to Colombo', fromAirport: 'Jeddah', toAirport: 'Colombo', fromDestinationId: jeddah.id, toDestinationId: colombo?.id, description: 'International return route from Jeddah to Colombo' },
    { routeCode: 'JED-KTM', routeName: 'Jeddah to Kathmandu', fromAirport: 'Jeddah', toAirport: 'Kathmandu', fromDestinationId: jeddah.id, toDestinationId: kathmandu?.id, description: 'International return route from Jeddah to Kathmandu' },
    { routeCode: 'JED-KBL', routeName: 'Jeddah to Kabul', fromAirport: 'Jeddah', toAirport: 'Kabul', fromDestinationId: jeddah.id, toDestinationId: kabul?.id, description: 'International return route from Jeddah to Kabul' },
    { routeCode: 'JED-CAI', routeName: 'Jeddah to Cairo', fromAirport: 'Jeddah', toAirport: 'Cairo', fromDestinationId: jeddah.id, toDestinationId: cairo?.id, description: 'International return route from Jeddah to Cairo' },
    { routeCode: 'JED-JKT', routeName: 'Jeddah to Jakarta', fromAirport: 'Jeddah', toAirport: 'Jakarta', fromDestinationId: jeddah.id, toDestinationId: jakarta?.id, description: 'International return route from Jeddah to Jakarta' },
    { routeCode: 'JED-KUL', routeName: 'Jeddah to Kuala Lumpur', fromAirport: 'Jeddah', toAirport: 'Kuala Lumpur', fromDestinationId: jeddah.id, toDestinationId: kualaLumpur?.id, description: 'International return route from Jeddah to Kuala Lumpur' },
    { routeCode: 'JED-BKK', routeName: 'Jeddah to Bangkok', fromAirport: 'Jeddah', toAirport: 'Bangkok', fromDestinationId: jeddah.id, toDestinationId: bangkok?.id, description: 'International return route from Jeddah to Bangkok' },
    { routeCode: 'JED-MNL', routeName: 'Jeddah to Manila', fromAirport: 'Jeddah', toAirport: 'Manila', fromDestinationId: jeddah.id, toDestinationId: manila?.id, description: 'International return route from Jeddah to Manila' },
  ];

  for (const data of airportRouteData) {
    await prisma.airportRouteMaster.upsert({
      where: { routeCode: data.routeCode },
      update: data,
      create: data,
    });
  }

  console.log(`✅ Created ${airportRouteData.length} airport route master records`);
  console.log('✈️ Airport Route Master seeding completed successfully!');
}

seedAirportRouteMaster()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
