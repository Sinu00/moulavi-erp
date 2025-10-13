const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDestinationMaster() {
  console.log('🏛️ Seeding Destination Master data...');

  const destinationData = [
    // Saudi Arabia destinations
    { destinationCode: 'MAK', destinationName: 'Makkah', city: 'Makkah', country: 'Saudi Arabia', description: 'The holy city of Makkah' },
    { destinationCode: 'MAD', destinationName: 'Madinah', city: 'Madinah', country: 'Saudi Arabia', description: 'The holy city of Madinah' },
    { destinationCode: 'JED', destinationName: 'Jeddah', city: 'Jeddah', country: 'Saudi Arabia', description: 'Gateway city to Makkah and Madinah' },
    { destinationCode: 'RUH', destinationName: 'Riyadh', city: 'Riyadh', country: 'Saudi Arabia', description: 'Capital city of Saudi Arabia' },
    { destinationCode: 'DMM', destinationName: 'Dammam', city: 'Dammam', country: 'Saudi Arabia', description: 'Eastern province city' },
    { destinationCode: 'MED', destinationName: 'Medina', city: 'Medina', country: 'Saudi Arabia', description: 'Alternative name for Madinah' },
    
    // UAE destinations
    { destinationCode: 'DXB', destinationName: 'Dubai', city: 'Dubai', country: 'UAE', description: 'Major commercial hub' },
    { destinationCode: 'AUH', destinationName: 'Abu Dhabi', city: 'Abu Dhabi', country: 'UAE', description: 'Capital of UAE' },
    { destinationCode: 'SHJ', destinationName: 'Sharjah', city: 'Sharjah', country: 'UAE', description: 'Cultural capital of UAE' },
    
    // Other Gulf countries
    { destinationCode: 'KWI', destinationName: 'Kuwait City', city: 'Kuwait City', country: 'Kuwait', description: 'Capital of Kuwait' },
    { destinationCode: 'DOH', destinationName: 'Doha', city: 'Doha', country: 'Qatar', description: 'Capital of Qatar' },
    { destinationCode: 'BAH', destinationName: 'Manama', city: 'Manama', country: 'Bahrain', description: 'Capital of Bahrain' },
    { destinationCode: 'MCT', destinationName: 'Muscat', city: 'Muscat', country: 'Oman', description: 'Capital of Oman' },
    
    // Major international destinations
    { destinationCode: 'DEL', destinationName: 'New Delhi', city: 'New Delhi', country: 'India', description: 'Capital of India' },
    { destinationCode: 'BOM', destinationName: 'Mumbai', city: 'Mumbai', country: 'India', description: 'Financial capital of India' },
    { destinationCode: 'KHI', destinationName: 'Karachi', city: 'Karachi', country: 'Pakistan', description: 'Largest city of Pakistan' },
    { destinationCode: 'ISB', destinationName: 'Islamabad', city: 'Islamabad', country: 'Pakistan', description: 'Capital of Pakistan' },
    { destinationCode: 'DAC', destinationName: 'Dhaka', city: 'Dhaka', country: 'Bangladesh', description: 'Capital of Bangladesh' },
    { destinationCode: 'CMB', destinationName: 'Colombo', city: 'Colombo', country: 'Sri Lanka', description: 'Commercial capital of Sri Lanka' },
    { destinationCode: 'KTM', destinationName: 'Kathmandu', city: 'Kathmandu', country: 'Nepal', description: 'Capital of Nepal' },
    { destinationCode: 'KBL', destinationName: 'Kabul', city: 'Kabul', country: 'Afghanistan', description: 'Capital of Afghanistan' },
    
    // Middle East
    { destinationCode: 'THR', destinationName: 'Tehran', city: 'Tehran', country: 'Iran', description: 'Capital of Iran' },
    { destinationCode: 'BGW', destinationName: 'Baghdad', city: 'Baghdad', country: 'Iraq', description: 'Capital of Iraq' },
    { destinationCode: 'AMM', destinationName: 'Amman', city: 'Amman', country: 'Jordan', description: 'Capital of Jordan' },
    { destinationCode: 'BEY', destinationName: 'Beirut', city: 'Beirut', country: 'Lebanon', description: 'Capital of Lebanon' },
    { destinationCode: 'DAM', destinationName: 'Damascus', city: 'Damascus', country: 'Syria', description: 'Capital of Syria' },
    { destinationCode: 'CAI', destinationName: 'Cairo', city: 'Cairo', country: 'Egypt', description: 'Capital of Egypt' },
    
    // North Africa
    { destinationCode: 'RBA', destinationName: 'Rabat', city: 'Rabat', country: 'Morocco', description: 'Capital of Morocco' },
    { destinationCode: 'TUN', destinationName: 'Tunis', city: 'Tunis', country: 'Tunisia', description: 'Capital of Tunisia' },
    { destinationCode: 'ALG', destinationName: 'Algiers', city: 'Algiers', country: 'Algeria', description: 'Capital of Algeria' },
    { destinationCode: 'TIP', destinationName: 'Tripoli', city: 'Tripoli', country: 'Libya', description: 'Capital of Libya' },
    { destinationCode: 'KRT', destinationName: 'Khartoum', city: 'Khartoum', country: 'Sudan', description: 'Capital of Sudan' },
    
    // East Africa
    { destinationCode: 'ADD', destinationName: 'Addis Ababa', city: 'Addis Ababa', country: 'Ethiopia', description: 'Capital of Ethiopia' },
    { destinationCode: 'NBO', destinationName: 'Nairobi', city: 'Nairobi', country: 'Kenya', description: 'Capital of Kenya' },
    { destinationCode: 'EBB', destinationName: 'Kampala', city: 'Kampala', country: 'Uganda', description: 'Capital of Uganda' },
    { destinationCode: 'DAR', destinationName: 'Dar es Salaam', city: 'Dar es Salaam', country: 'Tanzania', description: 'Commercial capital of Tanzania' },
    { destinationCode: 'LOS', destinationName: 'Lagos', city: 'Lagos', country: 'Nigeria', description: 'Commercial capital of Nigeria' },
    { destinationCode: 'ABJ', destinationName: 'Abidjan', city: 'Abidjan', country: 'Côte d\'Ivoire', description: 'Commercial capital of Côte d\'Ivoire' },
    { destinationCode: 'ACC', destinationName: 'Accra', city: 'Accra', country: 'Ghana', description: 'Capital of Ghana' },
    { destinationCode: 'CPT', destinationName: 'Cape Town', city: 'Cape Town', country: 'South Africa', description: 'Legislative capital of South Africa' },
    { destinationCode: 'JNB', destinationName: 'Johannesburg', city: 'Johannesburg', country: 'South Africa', description: 'Commercial capital of South Africa' },
    
    // Southeast Asia
    { destinationCode: 'JKT', destinationName: 'Jakarta', city: 'Jakarta', country: 'Indonesia', description: 'Capital of Indonesia' },
    { destinationCode: 'KUL', destinationName: 'Kuala Lumpur', city: 'Kuala Lumpur', country: 'Malaysia', description: 'Capital of Malaysia' },
    { destinationCode: 'BKK', destinationName: 'Bangkok', city: 'Bangkok', country: 'Thailand', description: 'Capital of Thailand' },
    { destinationCode: 'MNL', destinationName: 'Manila', city: 'Manila', country: 'Philippines', description: 'Capital of Philippines' },
    { destinationCode: 'SGN', destinationName: 'Ho Chi Minh City', city: 'Ho Chi Minh City', country: 'Vietnam', description: 'Commercial capital of Vietnam' },
    { destinationCode: 'HAN', destinationName: 'Hanoi', city: 'Hanoi', country: 'Vietnam', description: 'Capital of Vietnam' },
    { destinationCode: 'RGN', destinationName: 'Yangon', city: 'Yangon', country: 'Myanmar', description: 'Commercial capital of Myanmar' },
    { destinationCode: 'PNH', destinationName: 'Phnom Penh', city: 'Phnom Penh', country: 'Cambodia', description: 'Capital of Cambodia' },
    { destinationCode: 'VTE', destinationName: 'Vientiane', city: 'Vientiane', country: 'Laos', description: 'Capital of Laos' },
    { destinationCode: 'THB', destinationName: 'Thimphu', city: 'Thimphu', country: 'Bhutan', description: 'Capital of Bhutan' },
    { destinationCode: 'MLE', destinationName: 'Malé', city: 'Malé', country: 'Maldives', description: 'Capital of Maldives' },
  ];

  for (const data of destinationData) {
    await prisma.destinationMaster.upsert({
      where: { destinationCode: data.destinationCode },
      update: data,
      create: data,
    });
  }

  console.log(`✅ Created ${destinationData.length} destination master records`);
  console.log('🏛️ Destination Master seeding completed successfully!');
}

seedDestinationMaster()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
