# Voucher Requirements Analysis - Group Umrah Visa Booking

## Voucher Display Requirements (From Screenshot)

### 1. Hotel Schedules Table ✅
**Required Data:**
- Serial number (#)
- Location (City name: "Makkah", "Madinah")
- Hotel Name ("ROYAL BAKKAH", "Roudha AL Mukthara")
- Number of Days (calculated)
- Check In date
- Check Out date

**Current Status:** ✅ **WORKING**
- We have `UmrahHotelBooking` with `locationId` (city), `hotelId` (hotel), `checkInDate`, `checkOutDate`
- Backend correctly maps: `hb.location.name` = city, `hb.hotel.name` = hotel name

---

### 2. Movement Details Table ❌ **MAJOR ISSUES**

**Voucher Shows TWO LEVELS per From/To:**
- **Level 1: City** (e.g., "Jeddah", "Makkah", "Madinah")
- **Level 2: Specific Location** (e.g., "Jeddah Airport", "ROYAL BAKKAH", "Makkah Ziyarat With Jeerana")

**Example from Screenshot:**
```
Sr 1: Jeddah (Jeddah Airport) → Makkah (ROYAL BAKKAH)
Sr 2: Makkah (ROYAL BAKKAH) → Makkah (Makkah Ziyarat With Jeerana)
Sr 3: Makkah (ROYAL BAKKAH) → Madinah (Roudha AL Mukthara)
Sr 4: Madinah (Roudha AL Mukthara) → Madinah (Madinah Ziyarat)
Sr 5: Madinah (Roudha AL Mukthara) → Via Badar (Via Badar Jeddah Airport)
```

**Current Backend Code (Line 1524-1533):**
```typescript
movementDetails: booking.transportBookings.map((tb, idx) => ({
  fromLocation: tb.fromLocation.name,  // ❌ Only shows LocationMaster name
  toLocation: tb.toLocation.name,      // ❌ Only shows LocationMaster name
}))
```

**Problem:** 
- `UmrahTransportBooking` only stores `fromLocationId` and `toLocationId`
- These point to LocationMaster, which could be:
  - A city (LocationMaster with city data)
  - An airport (LocationMaster with locationType='AIRPORT')
  - A hotel (LocationMaster with locationType='HOTEL')
  - A ziyarat location (LocationMaster with locationType='ZIYARAT')

**But we need:**
- City name (can get from LocationMaster.city OR LocationMaster.name)
- Specific location name (hotel name, airport name, ziyarat name)

**Current Schema Has Fields But Backend Doesn't Use Them:**
- Schema shows `fromHotelId` and `toHotelId` fields exist in `TransportBooking` interface
- But `UmrahTransportBooking` schema **DOES NOT HAVE** these fields!
- Backend creation code (line 2097-2107) **DOES NOT SAVE** fromHotelId/toHotelId

---

### 3. Flight Details Table ✅
**Required Data:**
- Type (AA = Arrival, AD = Departure)
- Date
- Carrier (airline code, e.g., "6E")
- Number (flight number, e.g., "065")
- From (airport code, e.g., "CCJ")
- To (airport code, e.g., "JED")
- ETD/ETA

**Current Status:** ✅ **WORKING**
- Backend correctly extracts carrier and number from `arrivalFlightNumber` and `departureFlightNumber`
- Uses airport codes from `arrivalAirport.code` and `departureAirport.code`

---

### 4. Route Numbers ✅
**Required:** Auto-generated route numbers (16469, 16470, etc.)
**Current Status:** ✅ **WORKING**
- `generateRouteNumbers()` function generates sequential route numbers
- Assigned during voucher generation (line 1649-1656)

---

## Critical Issues Found

### ❌ **ISSUE #1: Missing Hotel/Ziyarat References in Transport Bookings**

**Problem:**
- Voucher needs to show: "Makkah (ROYAL BAKKAH)" but we only have city location
- We need to know WHICH hotel within the city
- We need to know WHICH ziyarat location

**Schema Gap:**
```prisma
model UmrahTransportBooking {
  fromLocationId  // Points to city/airport/ziyarat
  toLocationId    // Points to city/airport/ziyarat
  // ❌ NO fromHotelId field
  // ❌ NO toHotelId field
}
```

**Frontend Has But Backend Ignores:**
```typescript
// Frontend TransportBooking interface HAS these:
fromHotelId?: string;  // ✅ Exists in frontend
toHotelId?: string;    // ✅ Exists in frontend

// But backend schema DOESN'T HAVE them!
// Backend creation code IGNORES them!
```

---

### ❌ **ISSUE #2: Full Trip Selection Not Generating Transport Segments**

**When User Selects Full Trip:**
- Frontend stores `selectedFullTripId` 
- But backend doesn't know about it
- Transport segments are NOT generated from full trip route
- Result: No movement details in voucher

**What Should Happen:**
1. Fetch full trip: `Jeddah → Makkah → Madinah → Jeddah`
2. Generate transport segments:
   - Jeddah Airport → Makkah (first hotel)
   - Makkah (hotel) → Makkah (ziyarat)
   - Makkah (hotel) → Madinah (hotel)
   - Madinah (hotel) → Madinah (ziyarat)
   - Madinah (hotel) → Jeddah Airport

---

### ❌ **ISSUE #3: Ziyarat Segments Missing Hotel Context**

**Current Ziyarat Generation:**
- Creates segment: `fromLocationId: cityId, toLocationId: cityId, toHotelId: ziyaratHotelId`
- But voucher needs: City name + Hotel name (from hotel booking) → City name + Ziyarat name

**Example Needed:**
```
From: Makkah (ROYAL BAKKAH)  ← Need hotel name from hotel booking
To: Makkah (Makkah Ziyarat With Jeerana)  ← Need ziyarat location name
```

**Current Problem:**
- `fromLocationId` = city location (Makkah)
- `toLocationId` = city location (Makkah) 
- `toHotelId` = ziyarat hotel (but backend doesn't save this!)

---

### ❌ **ISSUE #4: Hotel Bookings in Wrong Step**

**Backend Expects:**
- `step3Data.hotelBookings`

**Frontend Stores:**
- `step2Data.hotelBookings` (after restructuring)

**Impact:**
- When submitting, `step3Data.hotelBookings` is empty
- Backend creates booking but NO hotel bookings are saved
- Voucher has empty hotel schedules

---

## Data Flow for Voucher Generation

### Required Data Structure:

```typescript
// Transport Booking Should Have:
{
  fromLocationId: "city-uuid",        // City level
  fromHotelId: "hotel-uuid",          // Specific hotel/airport/ziyarat (NEW)
  toLocationId: "city-uuid",          // City level  
  toHotelId: "hotel-uuid",            // Specific hotel/airport/ziyarat (NEW)
  travelDate: Date,
  travelTime: Time,
  vehicleType: string,
  paxCount: number,
  price: number
}
```

### Voucher Mapping Logic Needed:

```typescript
// For "From" column:
fromCity = fromLocation.city || fromLocation.name
fromSpecific = 
  - If fromHotelId exists: Get hotel name from UmrahHotelBooking or LocationMaster
  - If fromLocationId is airport: Get airport name
  - If fromLocationId is ziyarat: Get ziyarat location name

// For "To" column:
toCity = toLocation.city || toLocation.name
toSpecific = 
  - If toHotelId exists: Get hotel name from UmrahHotelBooking or LocationMaster
  - If toLocationId is airport: Get airport name
  - If toLocationId is ziyarat: Get ziyarat location name
```

---

## What's Missing vs What's Extra

### ❌ **MISSING:**

1. **fromHotelId/toHotelId in UmrahTransportBooking schema**
   - Frontend sends these but backend schema doesn't have them
   - Backend ignores them when creating transport bookings

2. **Hotel bookings in step3Data**
   - We moved them to step2Data but backend still expects step3Data

3. **Full trip transport segment generation**
   - When `selectedFullTripId` exists, we need to:
     - Fetch full trip route
     - Generate transport segments with proper hotel references
     - Include ziyarat segments based on `ziyarahDates`

4. **Voucher logic to resolve hotel/ziyarat names**
   - Need to join with UmrahHotelBooking to get hotel names
   - Need to resolve ziyarat location names from LocationMaster

### ⚠️ **EXTRA (Not Needed for Basic Voucher):**

1. **selectedFullTripId** - Not stored, but used to generate segments
2. **ziyarahDates** - Not stored, but used to generate ziyarat segments
3. **fromHotelId/toHotelId in frontend** - Exists but backend ignores

---

## Solutions Required

### Solution 1: Add fromHotelId/toHotelId to Database Schema
```prisma
model UmrahTransportBooking {
  // ... existing fields ...
  fromHotelId String? @map("from_hotel_id") @db.Uuid
  toHotelId   String? @map("to_hotel_id") @db.Uuid
  
  fromHotel LocationMaster? @relation("TransportFromHotel", fields: [fromHotelId], references: [id])
  toHotel   LocationMaster? @relation("TransportToHotel", fields: [toHotelId], references: [id])
}
```

### Solution 2: Update Backend to Save fromHotelId/toHotelId
```typescript
// In create-booking endpoint
tx.umrahTransportBooking.create({
  data: {
    // ... existing fields ...
    fromHotelId: transport.fromHotelId || null,
    toHotelId: transport.toHotelId || null,
  }
})
```

### Solution 3: Fix Hotel Bookings Location
```typescript
// In submitStep4()
step3: {
  ...bookingState.step3Data,
  hotelBookings: bookingState.step2Data.hotelBookings || [], // Copy from step2
}
```

### Solution 4: Generate Transport Segments from Full Trip
```typescript
// When selectedFullTripId exists:
1. Fetch full trip
2. For each segment in full trip route:
   - Map city to actual hotel (from hotel bookings)
   - Create transport segment with proper fromHotelId/toHotelId
3. Add ziyarat segments based on ziyarahDates
```

### Solution 5: Update Voucher Data Generation
```typescript
// Join transport bookings with hotel bookings to get hotel names
// Resolve city names from LocationMaster.city
// Resolve specific locations from fromHotelId/toHotelId
```

---

## Summary

**✅ Working:**
- Hotel schedules (if hotelBookings are in correct step)
- Flight details
- Route number generation

**❌ Broken:**
- Movement details showing only city names (missing hotel/ziyarat names)
- Hotel bookings not saved (wrong step location)
- Full trip selection not generating transport segments
- Ziyarat segments missing proper hotel references

**🔧 Required Changes:**
1. Add fromHotelId/toHotelId to UmrahTransportBooking schema
2. Update backend to save these fields
3. Fix hotel bookings step location
4. Generate transport segments from full trip
5. Update voucher generation to resolve hotel/ziyarat names

