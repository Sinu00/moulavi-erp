const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTransportMaster() {
  try {
    console.log('🌱 Seeding Transport Master data...');
    
    // First, get the destination IDs we need
    const destinations = await prisma.destinationMaster.findMany({
      where: {
        destinationCode: {
          in: ['MAK', 'MED', 'JED']
        }
      },
      select: {
        id: true,
        destinationCode: true,
        destinationName: true
      }
    });

    console.log('📍 Found destinations:', destinations);

    if (destinations.length === 0) {
      throw new Error('No destinations found. Please run seed-minimum-master-data.js first.');
    }

    // Create a mapping for easy lookup
    const destMap = {};
    destinations.forEach(dest => {
      destMap[dest.destinationCode] = dest.id;
    });

    // Clear existing data
    await prisma.transportMaster.deleteMany({});
    console.log('✅ Cleared existing transport master data');
    
    // Define transport routes with proper location IDs
    const transportData = [];
    
    // Vehicle types and their passenger capacity
    const vehicles = [
      { type: 'Lexus ES 250', paxCount: 3 },
      { type: 'GMC', paxCount: 5 },
      { type: 'Staria', paxCount: 8 },
      { type: 'Hiace', paxCount: 9 }
    ];

    // Route definitions with pricing (in SAR)
    const routes = [
      { from: 'JED', to: 'MAK', basePrice: 559 }, // Jeddah to Makkah
      { from: 'JED', to: 'MED', basePrice: 700 }, // Jeddah to Madina
      { from: 'MAK', to: 'MED', basePrice: 500 }, // Makkah to Madina
      { from: 'MED', to: 'MAK', basePrice: 500 }, // Madina to Makkah
      { from: 'MAK', to: 'JED', basePrice: 559 }, // Makkah to Jeddah
      { from: 'MED', to: 'JED', basePrice: 700 }  // Madina to Jeddah
    ];

    // Generate transport options
    routes.forEach(route => {
      if (destMap[route.from] && destMap[route.to]) {
        vehicles.forEach(vehicle => {
          // Price varies by vehicle type and capacity
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
      }
    });

    console.log(`📋 Generated ${transportData.length} transport options`);
    
    // Insert new data
    if (transportData.length > 0) {
      const createdTransports = await prisma.transportMaster.createMany({
        data: transportData,
      });
      
      console.log(`✅ Created ${createdTransports.count} transport master records`);
    } else {
      console.log('⚠️  No transport data to insert');
    }
    
    // Display summary
    const summary = await prisma.transportMaster.findMany({
      include: {
        fromLocation: { select: { destinationName: true } },
        toLocation: { select: { destinationName: true } }
      }
    });
    
    console.log('\n📊 Transport Options Summary:');
    const routeGroups = {};
    summary.forEach(item => {
      const routeKey = `${item.fromLocation.destinationName} → ${item.toLocation.destinationName}`;
      if (!routeGroups[routeKey]) routeGroups[routeKey] = 0;
      routeGroups[routeKey]++;
    });

    Object.entries(routeGroups).forEach(([route, count]) => {
      console.log(`  ${route}: ${count} vehicle options`);
    });
    
    console.log('\n🎉 Transport Master seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding transport master:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTransportMaster()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
