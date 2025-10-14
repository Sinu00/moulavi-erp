# New Umrah Visa Booking Schema Design

## Problem with Current Schema
The current `UmrahVisaBooking` table is too chunky and contains mixed concerns:
- Travel details (flights, dates)
- Transport details (routes, pricing)
- Accommodation details (hotels, iqama)
- Basic booking info (group, status)

## Proposed New Schema Structure

### 1. Core Booking Table (Simplified)
```prisma
model UmrahVisaBooking {
  id                String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serviceId         String            @unique @map("service_id") @db.Uuid
  groupNumber       String?           @map("group_number") @db.VarChar(100)
  groupName         String?           @map("group_name") @db.VarChar(255)
  passengerCount    Int               @map("passenger_count")
  status            UmrahVisaStatus   @default(pending)
  isDeleted         Boolean           @default(false) @map("is_deleted")
  deletedAt         DateTime?         @map("deleted_at") @db.Timestamp(6)
  createdAt         DateTime          @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime          @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  
  // Relationships
  service           Service           @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  travelDetails     UmrahTravelDetails?
  accommodationDetails UmrahAccommodationDetails?
  transportBookings UmrahTransportBooking[]
  passengers        UmrahPassenger[]
  statusHistory     BookingStatusHistory[]
}
```

### 2. Travel Details (Separate Table)
```prisma
model UmrahTravelDetails {
  id                String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId         String            @unique @map("booking_id") @db.Uuid
  arrivalDate       DateTime          @map("arrival_date") @db.Date
  arrivalAirportId  String            @map("arrival_airport_id") @db.Uuid
  arrivalFlightNumber String          @map("arrival_flight_number") @db.VarChar(50)
  departureDate     DateTime          @map("departure_date") @db.Date
  departureAirportId String?          @map("departure_airport_id") @db.Uuid
  departureFlightNumber String?       @map("departure_flight_number") @db.VarChar(50)
  createdAt         DateTime          @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime          @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  
  // Relationships
  booking           UmrahVisaBooking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  arrivalAirport    AirportMaster     @relation("ArrivalAirport", fields: [arrivalAirportId], references: [id])
  departureAirport  AirportMaster?    @relation("DepartureAirport", fields: [departureAirportId], references: [id])
}
```

### 3. Accommodation Details (Separate Table)
```prisma
model UmrahAccommodationDetails {
  id                String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId         String            @unique @map("booking_id") @db.Uuid
  accommodationType AccommodationType @map("accommodation_type")
  
  // Iqama Details
  iqamaNumber       String?           @map("iqama_number") @db.VarChar(50)
  iqamaName         String?           @map("iqama_name") @db.VarChar(255)
  iqamaDob          DateTime?         @map("iqama_dob") @db.Date
  iqamaMobile       String?           @map("iqama_mobile") @db.VarChar(20)
  
  createdAt         DateTime          @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime          @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  
  // Relationships
  booking           UmrahVisaBooking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  hotelBookings     UmrahHotelBooking[]
}
```

### 4. Hotel Bookings (Multiple Hotels Support)
```prisma
model UmrahHotelBooking {
  id                String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  accommodationId   String            @map("accommodation_id") @db.Uuid
  locationId        String            @map("location_id") @db.Uuid
  hotelId           String            @map("hotel_id") @db.Uuid
  checkInDate       DateTime          @map("checkin_date") @db.Date
  checkOutDate      DateTime          @map("checkout_date") @db.Date
  roomCount         Int               @default(1) @map("room_count")
  guestCount        Int               @default(1) @map("guest_count")
  createdAt         DateTime          @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime          @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  
  // Relationships
  accommodation     UmrahAccommodationDetails @relation(fields: [accommodationId], references: [id], onDelete: Cascade)
  location          DestinationMaster @relation(fields: [locationId], references: [id])
  hotel             HotelMaster       @relation(fields: [hotelId], references: [id])
}
```

### 5. Transport Bookings (Multiple Routes Support)
```prisma
model UmrahTransportBooking {
  id                String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId         String            @map("booking_id") @db.Uuid
  fromLocationId    String            @map("from_location_id") @db.Uuid
  toLocationId      String            @map("to_location_id") @db.Uuid
  transportType     String            @map("transport_type") @db.VarChar(50)
  paxCount          Int               @map("pax_count")
  price             Decimal?          @map("price") @db.Decimal(10, 2)
  travelDate        DateTime?         @map("travel_date") @db.Date
  createdAt         DateTime          @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime          @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  
  // Relationships
  booking           UmrahVisaBooking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  fromLocation      DestinationMaster @relation("TransportFrom", fields: [fromLocationId], references: [id])
  toLocation        DestinationMaster @relation("TransportTo", fields: [toLocationId], references: [id])
}
```

### 6. Airport Master (New Table)
```prisma
model AirportMaster {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  airportCode  String   @unique @map("airport_code") @db.VarChar(10)
  airportName  String   @map("airport_name") @db.VarChar(255)
  city         String   @db.VarChar(100)
  country      String   @db.VarChar(100)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  
  // Relationships
  arrivalFlights   UmrahTravelDetails[] @relation("ArrivalAirport")
  departureFlights UmrahTravelDetails[] @relation("DepartureAirport")
}
```

### 7. Updated Transport Master (Location-based)
```prisma
model TransportMaster {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  fromLocationId String @map("from_location_id") @db.Uuid
  toLocationId   String @map("to_location_id") @db.Uuid
  vehicleType  String   @map("vehicle_type") @db.VarChar(50)
  pax          Int
  price        Decimal  @db.Decimal(10, 2)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)

  // Relationships
  fromLocation DestinationMaster @relation("TransportMasterFrom", fields: [fromLocationId], references: [id])
  toLocation   DestinationMaster @relation("TransportMasterTo", fields: [toLocationId], references: [id])
  
  @@unique([fromLocationId, toLocationId, vehicleType, pax])
}
```

### 8. Simplified Passenger Model
```prisma
model UmrahPassenger {
  id              String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId       String           @map("booking_id") @db.Uuid
  isLeadPassenger Boolean          @default(false) @map("is_lead_passenger")
  fullName        String           @map("full_name") @db.VarChar(255)
  isDeleted       Boolean          @default(false) @map("is_deleted")
  deletedAt       DateTime?        @map("deleted_at") @db.Timestamp(6)
  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt       DateTime         @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  
  // Relationships
  booking         UmrahVisaBooking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  documents       PassengerDocument[]
}
```

### 9. Passenger Documents (New Table)
```prisma
model PassengerDocument {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  passengerId  String   @map("passenger_id") @db.Uuid
  documentType String   @map("document_type") @db.VarChar(100) // passport, visa, etc.
  fileName     String   @map("file_name") @db.VarChar(255)
  filePath     String   @map("file_path") @db.VarChar(500)
  fileSize     Int?
  mimeType     String?  @map("mime_type") @db.VarChar(100)
  uploadedAt   DateTime @default(now()) @map("uploaded_at") @db.Timestamp(6)
  isDeleted    Boolean  @default(false) @map("is_deleted")
  deletedAt    DateTime? @map("deleted_at") @db.Timestamp(6)
  
  // Relationships
  passenger    UmrahPassenger @relation(fields: [passengerId], references: [id], onDelete: Cascade)
}
```

## Benefits of New Design

1. **Separation of Concerns**: Each table has a single responsibility
2. **Better Performance**: Smaller tables with focused indexes
3. **Flexibility**: Can have multiple hotels, transport routes per booking
4. **Maintainability**: Easier to modify individual aspects
5. **Scalability**: Better query performance with normalized data
6. **Data Integrity**: Better foreign key relationships

## Migration Strategy

1. Create new tables alongside existing ones
2. Migrate data from old UmrahVisaBooking to new structure
3. Update API endpoints to use new schema
4. Update frontend to work with new API structure
5. Remove old table after verification
