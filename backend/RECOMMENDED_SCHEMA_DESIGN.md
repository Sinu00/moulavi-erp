# Recommended Database Schema Design

## Current Issues
1. **Duplicate Umrah visa storage**: Both `UmrahVisaDetail` and `UmrahVisaBooking` tables
2. **Service table coupling**: Service table tightly coupled to Umrah visa
3. **Scalability issues**: Adding new services requires modifying Service table

## Recommended Solution: Service-Specific Tables Pattern

### 1. Generic Service Table (Keep Simple)
```sql
Service {
  id: UUID (PK)
  serviceType: String (enum: 'umrah_visa', 'hajj', 'flight', 'hotel', etc.)
  partyId: UUID (FK to Party)
  status: ServiceStatus (pending, processing, completed, cancelled)
  submittedAt: DateTime
  createdAt: DateTime
  updatedAt: DateTime
  -- NO service-specific fields here
}
```

### 2. Service-Specific Tables
```sql
UmrahVisaBooking {
  id: UUID (PK)
  serviceId: UUID (FK to Service, UNIQUE)
  -- All Umrah-specific fields
}

HajjBooking {
  id: UUID (PK)
  serviceId: UUID (FK to Service, UNIQUE)
  -- All Hajj-specific fields
}

FlightBooking {
  id: UUID (PK)
  serviceId: UUID (FK to Service, UNIQUE)
  -- All Flight-specific fields
}
```

### 3. Benefits
- **Scalable**: Add new services without touching Service table
- **Clean separation**: Each service has its own data structure
- **Maintainable**: Service-specific logic isolated
- **Flexible**: Different services can have different fields

## Migration Strategy

### Phase 1: Clean Up Current Schema
1. Remove `UmrahVisaDetail` table (legacy)
2. Keep `UmrahVisaBooking` as the main Umrah visa table
3. Simplify `Service` table to be generic

### Phase 2: Implement New Pattern
1. Create service-specific tables for future services
2. Update Service table to be generic
3. Update application logic accordingly

## Example Implementation

### Service Table (Simplified)
```prisma
model Service {
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serviceType ServiceType  @map("service_type")
  partyId     String       @map("party_id") @db.Uuid
  status      ServiceStatus @default(pending)
  submittedAt DateTime     @default(now()) @map("submitted_at")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @default(now()) @updatedAt @map("updated_at")
  
  party       Party        @relation(fields: [partyId], references: [id])
  documents   Document[]
  
  // Service-specific relations
  umrahVisaBooking UmrahVisaBooking?
  hajjBooking     HajjBooking?
  flightBooking   FlightBooking?
  
  @@map("services")
}

enum ServiceType {
  umrah_visa
  hajj
  flight
  hotel
  transport
  other
}
```

### Service-Specific Tables
```prisma
model UmrahVisaBooking {
  id                String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serviceId         String            @unique @map("service_id") @db.Uuid
  // All Umrah-specific fields...
  
  service           Service           @relation(fields: [serviceId], references: [id])
  passengers        UmrahPassenger[]
  
  @@map("umrah_visa_bookings")
}

model HajjBooking {
  id                String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serviceId         String            @unique @map("service_id") @db.Uuid
  // Hajj-specific fields...
  
  service           Service           @relation(fields: [serviceId], references: [id])
  
  @@map("hajj_bookings")
}
```

## Next Steps
1. **Remove UmrahVisaDetail table** (legacy)
2. **Keep current UmrahVisaBooking** as is
3. **Simplify Service table** to be generic
4. **Plan for future services** using this pattern
