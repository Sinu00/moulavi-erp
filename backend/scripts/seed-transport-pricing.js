const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const transportPricingData = [
  // Jeddah to Makkah
  { routeId: 'jeddah_to_makkah', transportType: 'lexus_es_250', paxCount: 3, price: 150 },
  { routeId: 'jeddah_to_makkah', transportType: 'staria', paxCount: 8, price: 250 },
  { routeId: 'jeddah_to_makkah', transportType: 'gmc', paxCount: 7, price: 220 },
  { routeId: 'jeddah_to_makkah', transportType: 'hiace', paxCount: 10, price: 220 },

  // Jeddah to Madina
  { routeId: 'jeddah_to_madina', transportType: 'lexus_es_250', paxCount: 3, price: 200 },
  { routeId: 'jeddah_to_madina', transportType: 'staria', paxCount: 8, price: 350 },
  { routeId: 'jeddah_to_madina', transportType: 'gmc', paxCount: 7, price: 320 },
  { routeId: 'jeddah_to_madina', transportType: 'hiace', paxCount: 10, price: 320 },

  // Jeddah - Makkah - Madina - Jeddah (Full Route)
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'lexus_es_250', paxCount: 3, price: 400 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'staria', paxCount: 8, price: 700 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'gmc', paxCount: 7, price: 650 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'hiace', paxCount: 10, price: 650 },

  // Jeddah to Jeddah
  { routeId: 'jeddah_to_jeddah', transportType: 'lexus_es_250', paxCount: 3, price: 100 },
  { routeId: 'jeddah_to_jeddah', transportType: 'staria', paxCount: 8, price: 150 },
  { routeId: 'jeddah_to_jeddah', transportType: 'gmc', paxCount: 7, price: 150 },
  { routeId: 'jeddah_to_jeddah', transportType: 'hiace', paxCount: 10, price: 180 },

  // Additional PAX options for flexibility
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'lexus_es_250', paxCount: 1, price: 400 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'lexus_es_250', paxCount: 2, price: 400 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'staria', paxCount: 4, price: 700 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'staria', paxCount: 5, price: 700 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'staria', paxCount: 6, price: 700 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'staria', paxCount: 7, price: 700 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'gmc', paxCount: 4, price: 650 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'gmc', paxCount: 5, price: 650 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'gmc', paxCount: 6, price: 650 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'hiace', paxCount: 4, price: 650 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'hiace', paxCount: 5, price: 650 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'hiace', paxCount: 6, price: 650 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'hiace', paxCount: 7, price: 650 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'hiace', paxCount: 8, price: 650 },
  { routeId: 'jeddah_makkah_madina_jeddah', transportType: 'hiace', paxCount: 9, price: 650 },
];

async function seedTransportPricing() {
  try {
    console.log('🌱 Seeding transport pricing data...');

    // Clear existing data
    await prisma.transportPricing.deleteMany({});
    console.log('✅ Cleared existing transport pricing data');

    // Insert new pricing data
    const validFrom = new Date();
    validFrom.setFullYear(validFrom.getFullYear() - 1); // Valid from 1 year ago

    const pricingRecords = transportPricingData.map(data => ({
      ...data,
      validFrom,
      validTo: null, // No expiration
      isActive: true
    }));

    const result = await prisma.transportPricing.createMany({
      data: pricingRecords
    });

    console.log(`✅ Created ${result.count} transport pricing records`);

    // Display summary
    const summary = await prisma.transportPricing.groupBy({
      by: ['routeId', 'transportType'],
      _count: { routeId: true },
      _avg: { price: true }
    });

    console.log('\n📊 Transport Pricing Summary:');
    summary.forEach(item => {
      console.log(`  ${item.routeId} - ${item.transportType}: ${item._count.routeId} options, avg price: ${item._avg.price}`);
    });

    console.log('\n🎉 Transport pricing seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding transport pricing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedTransportPricing()
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTransportPricing };
