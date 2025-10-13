const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedServiceTypeMaster() {
  console.log('🔧 Seeding Service Type Master data...');

  const serviceTypeData = [
    // Visa Services
    { serviceCode: 'UMRAH_VISA', serviceName: 'Umrah Visa', category: 'Visa', description: 'Umrah pilgrimage visa service' },
    { serviceCode: 'HAJJ_VISA', serviceName: 'Hajj Visa', category: 'Visa', description: 'Hajj pilgrimage visa service' },
    { serviceCode: 'TOURIST_VISA', serviceName: 'Tourist Visa', category: 'Visa', description: 'General tourist visa service' },
    { serviceCode: 'BUSINESS_VISA', serviceName: 'Business Visa', category: 'Visa', description: 'Business travel visa service' },
    { serviceCode: 'TRANSIT_VISA', serviceName: 'Transit Visa', category: 'Visa', description: 'Transit visa service' },
    { serviceCode: 'WORK_VISA', serviceName: 'Work Visa', category: 'Visa', description: 'Employment visa service' },
    { serviceCode: 'STUDENT_VISA', serviceName: 'Student Visa', category: 'Visa', description: 'Educational visa service' },
    { serviceCode: 'FAMILY_VISA', serviceName: 'Family Visa', category: 'Visa', description: 'Family reunion visa service' },

    // Travel Services
    { serviceCode: 'FLIGHT_BOOKING', serviceName: 'Flight Booking', category: 'Travel', description: 'Airline ticket booking service' },
    { serviceCode: 'HOTEL_BOOKING', serviceName: 'Hotel Booking', category: 'Travel', description: 'Accommodation booking service' },
    { serviceCode: 'TRANSPORT_BOOKING', serviceName: 'Transport Booking', category: 'Travel', description: 'Ground transportation service' },
    { serviceCode: 'PACKAGE_TOUR', serviceName: 'Package Tour', category: 'Travel', description: 'Complete travel package service' },
    { serviceCode: 'CUSTOM_TOUR', serviceName: 'Custom Tour', category: 'Travel', description: 'Personalized tour service' },
    { serviceCode: 'GROUP_TRAVEL', serviceName: 'Group Travel', category: 'Travel', description: 'Group travel arrangement service' },

    // Accommodation Services
    { serviceCode: 'HOTEL_RESERVATION', serviceName: 'Hotel Reservation', category: 'Accommodation', description: 'Hotel room reservation service' },
    { serviceCode: 'APARTMENT_RENTAL', serviceName: 'Apartment Rental', category: 'Accommodation', description: 'Apartment rental service' },
    { serviceCode: 'HOSTEL_BOOKING', serviceName: 'Hostel Booking', category: 'Accommodation', description: 'Hostel accommodation service' },
    { serviceCode: 'HOMESTAY', serviceName: 'Homestay', category: 'Accommodation', description: 'Homestay accommodation service' },

    // Transportation Services
    { serviceCode: 'AIRPORT_TRANSFER', serviceName: 'Airport Transfer', category: 'Transportation', description: 'Airport pickup and drop service' },
    { serviceCode: 'CITY_TRANSPORT', serviceName: 'City Transport', category: 'Transportation', description: 'City transportation service' },
    { serviceCode: 'INTERCITY_TRANSPORT', serviceName: 'Intercity Transport', category: 'Transportation', description: 'Intercity transportation service' },
    { serviceCode: 'CAR_RENTAL', serviceName: 'Car Rental', category: 'Transportation', description: 'Vehicle rental service' },
    { serviceCode: 'BUS_BOOKING', serviceName: 'Bus Booking', category: 'Transportation', description: 'Bus ticket booking service' },
    { serviceCode: 'TAXI_SERVICE', serviceName: 'Taxi Service', category: 'Transportation', description: 'Taxi booking service' },

    // Religious Services
    { serviceCode: 'UMRAH_PACKAGE', serviceName: 'Umrah Package', category: 'Religious', description: 'Complete Umrah pilgrimage package' },
    { serviceCode: 'HAJJ_PACKAGE', serviceName: 'Hajj Package', category: 'Religious', description: 'Complete Hajj pilgrimage package' },
    { serviceCode: 'RELIGIOUS_GUIDE', serviceName: 'Religious Guide', category: 'Religious', description: 'Religious guidance service' },
    { serviceCode: 'PRAYER_ARRANGEMENT', serviceName: 'Prayer Arrangement', category: 'Religious', description: 'Prayer time and location service' },

    // Support Services
    { serviceCode: 'TRAVEL_INSURANCE', serviceName: 'Travel Insurance', category: 'Support', description: 'Travel insurance service' },
    { serviceCode: 'DOCUMENT_ASSISTANCE', serviceName: 'Document Assistance', category: 'Support', description: 'Document preparation assistance' },
    { serviceCode: 'CURRENCY_EXCHANGE', serviceName: 'Currency Exchange', category: 'Support', description: 'Foreign currency exchange service' },
    { serviceCode: 'SIM_CARD', serviceName: 'SIM Card', category: 'Support', description: 'Local SIM card service' },
    { serviceCode: 'WIFI_SERVICE', serviceName: 'WiFi Service', category: 'Support', description: 'Internet connectivity service' },
    { serviceCode: 'LUGGAGE_SERVICE', serviceName: 'Luggage Service', category: 'Support', description: 'Luggage handling service' },

    // Premium Services
    { serviceCode: 'VIP_SERVICE', serviceName: 'VIP Service', category: 'Premium', description: 'VIP treatment and assistance' },
    { serviceCode: 'CONCIERGE_SERVICE', serviceName: 'Concierge Service', category: 'Premium', description: 'Personal concierge service' },
    { serviceCode: 'LUXURY_TRANSPORT', serviceName: 'Luxury Transport', category: 'Premium', description: 'Premium transportation service' },
    { serviceCode: 'PRIVATE_GUIDE', serviceName: 'Private Guide', category: 'Premium', description: 'Personal guide service' },

    // Emergency Services
    { serviceCode: 'EMERGENCY_ASSISTANCE', serviceName: 'Emergency Assistance', category: 'Emergency', description: '24/7 emergency support service' },
    { serviceCode: 'MEDICAL_ASSISTANCE', serviceName: 'Medical Assistance', category: 'Emergency', description: 'Medical emergency support' },
    { serviceCode: 'LEGAL_ASSISTANCE', serviceName: 'Legal Assistance', category: 'Emergency', description: 'Legal support service' },
  ];

  for (const data of serviceTypeData) {
    await prisma.serviceTypeMaster.upsert({
      where: { serviceCode: data.serviceCode },
      update: data,
      create: data,
    });
  }

  console.log(`✅ Created ${serviceTypeData.length} service type master records`);
  console.log('🔧 Service Type Master seeding completed successfully!');
}

seedServiceTypeMaster()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
