const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const transportData = [
  // Jeddah to Jeddah routes
  { vehicleRoute: 'jeddah_to_jeddah', vehicleType: 'Lexus ES 250', pax: 3, price: 150 },
  { vehicleRoute: 'jeddah_to_jeddah', vehicleType: 'Staria', pax: 8, price: 250 },
  { vehicleRoute: 'jeddah_to_jeddah', vehicleType: 'GMC', pax: 7, price: 220 },
  { vehicleRoute: 'jeddah_to_jeddah', vehicleType: 'Hiace', pax: 10, price: 350 },
  
  // Jeddah to Makkah routes
  { vehicleRoute: 'jeddah_to_makkah', vehicleType: 'Lexus ES 250', pax: 3, price: 180 },
  { vehicleRoute: 'jeddah_to_makkah', vehicleType: 'Staria', pax: 8, price: 300 },
  { vehicleRoute: 'jeddah_to_makkah', vehicleType: 'GMC', pax: 7, price: 260 },
  { vehicleRoute: 'jeddah_to_makkah', vehicleType: 'Hiace', pax: 10, price: 420 },
  
  // Jeddah to Madina routes
  { vehicleRoute: 'jeddah_to_madina', vehicleType: 'Lexus ES 250', pax: 3, price: 200 },
  { vehicleRoute: 'jeddah_to_madina', vehicleType: 'Staria', pax: 8, price: 350 },
  { vehicleRoute: 'jeddah_to_madina', vehicleType: 'GMC', pax: 7, price: 300 },
  { vehicleRoute: 'jeddah_to_madina', vehicleType: 'Hiace', pax: 10, price: 500 },
  
  // Jeddah - Makkah - Madina - Jeddah routes
  { vehicleRoute: 'jeddah_makkah_madina_jeddah', vehicleType: 'Lexus ES 250', pax: 3, price: 400 },
  { vehicleRoute: 'jeddah_makkah_madina_jeddah', vehicleType: 'Staria', pax: 8, price: 700 },
  { vehicleRoute: 'jeddah_makkah_madina_jeddah', vehicleType: 'GMC', pax: 7, price: 600 },
  { vehicleRoute: 'jeddah_makkah_madina_jeddah', vehicleType: 'Hiace', pax: 10, price: 1000 },
  
  // Makkah to Jeddah routes (optional transport)
  { vehicleRoute: 'makkah_to_jeddah', vehicleType: 'Lexus ES 250', pax: 3, price: 180 },
  { vehicleRoute: 'makkah_to_jeddah', vehicleType: 'Staria', pax: 8, price: 300 },
  { vehicleRoute: 'makkah_to_jeddah', vehicleType: 'GMC', pax: 7, price: 260 },
  { vehicleRoute: 'makkah_to_jeddah', vehicleType: 'Hiace', pax: 10, price: 420 },
  
  // Madina to Jeddah routes (optional transport)
  { vehicleRoute: 'madina_to_jeddah', vehicleType: 'Lexus ES 250', pax: 3, price: 200 },
  { vehicleRoute: 'madina_to_jeddah', vehicleType: 'Staria', pax: 8, price: 350 },
  { vehicleRoute: 'madina_to_jeddah', vehicleType: 'GMC', pax: 7, price: 300 },
  { vehicleRoute: 'madina_to_jeddah', vehicleType: 'Hiace', pax: 10, price: 500 },
];

async function seedTransportMaster() {
  try {
    console.log('🌱 Seeding Transport Master data...');
    
    // Clear existing data
    await prisma.transportMaster.deleteMany({});
    console.log('✅ Cleared existing transport master data');
    
    // Insert new data
    const createdTransports = await prisma.transportMaster.createMany({
      data: transportData,
    });
    
    console.log(`✅ Created ${createdTransports.count} transport master records`);
    
    // Display summary
    const summary = await prisma.transportMaster.groupBy({
      by: ['vehicleRoute'],
      _count: {
        vehicleRoute: true,
      },
    });
    
    console.log('\n📊 Summary by Route:');
    summary.forEach(item => {
      console.log(`  ${item.vehicleRoute}: ${item._count.vehicleRoute} options`);
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
