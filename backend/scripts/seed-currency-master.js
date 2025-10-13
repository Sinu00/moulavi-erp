const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCurrencyMaster() {
  console.log('💰 Seeding Currency Master data...');

  const currencyData = [
    // Major currencies
    { currencyCode: 'USD', currencyName: 'US Dollar', symbol: '$' },
    { currencyCode: 'EUR', currencyName: 'Euro', symbol: '€' },
    { currencyCode: 'INR', currencyName: 'Indian Rupee', symbol: '₹' },
    { currencyCode: 'SAR', currencyName: 'Saudi Riyal', symbol: '﷼' },
    { currencyCode: 'AED', currencyName: 'UAE Dirham', symbol: 'د.إ' },
    { currencyCode: 'QAR', currencyName: 'Qatari Riyal', symbol: '﷼' },
    { currencyCode: 'BHD', currencyName: 'Bahraini Dinar', symbol: 'د.ب' },
    { currencyCode: 'OMR', currencyName: 'Omani Riyal', symbol: '﷼' },
    { currencyCode: 'KWD', currencyName: 'Kuwaiti Dinar', symbol: 'د.ك' },
  ];

  for (const data of currencyData) {
    await prisma.currencyMaster.upsert({
      where: { currencyCode: data.currencyCode },
      update: data,
      create: data,
    });
  }

  console.log(`✅ Created ${currencyData.length} currency master records`);
  console.log('💰 Currency Master seeding completed successfully!');
}

seedCurrencyMaster()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
