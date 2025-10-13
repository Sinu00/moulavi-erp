const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCountryMaster() {
  console.log('🌍 Seeding Country Master data...');

  const countryData = [
    // Major countries for Umrah visa
    { countryCode: 'IN', countryName: 'India', nationality: 'Indian' },
    { countryCode: 'SA', countryName: 'Saudi Arabia', nationality: 'Saudi' },
    { countryCode: 'AE', countryName: 'United Arab Emirates', nationality: 'Emirati' },
    { countryCode: 'KW', countryName: 'Kuwait', nationality: 'Kuwaiti' },
    { countryCode: 'QA', countryName: 'Qatar', nationality: 'Qatari' },
    { countryCode: 'BH', countryName: 'Bahrain', nationality: 'Bahraini' },
    { countryCode: 'OM', countryName: 'Oman', nationality: 'Omani' },
    { countryCode: 'YE', countryName: 'Yemen', nationality: 'Yemeni' },
  ];

  for (const data of countryData) {
    await prisma.countryMaster.upsert({
      where: { countryCode: data.countryCode },
      update: data,
      create: data,
    });
  }

  console.log(`✅ Created ${countryData.length} country master records`);
  console.log('🌍 Country Master seeding completed successfully!');
}

seedCountryMaster()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
