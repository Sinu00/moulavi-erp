# Umrah Visa Booking Schema Cleanup - Summary

## Overview
This document summarizes the major cleanup and reorganization of the Umrah visa booking system to remove unnecessary complexity and streamline the workflow.

---

## 🗑️ Removed Master Tables

### 1. **CountryMaster** ❌
- **Reason**: Only dealing with Saudi Arabia for Umrah service
- **Impact**: Removed 200+ countries that were not needed
- **Alternative**: Hardcoded "Saudi Arabia" where needed

### 2. **UserRoleMaster** ❌
- **Reason**: Already have `UserRole` enum (admin, staff, party)
- **Impact**: Simplified role management
- **Alternative**: Use existing enum

### 3. **AirportRouteMaster** ❌
- **Reason**: Redundant with `AirportMaster`
- **Impact**: Removed complex route mapping
- **Alternative**: Direct airport-to-airport references

---

## ✂️ Simplified Master Tables

### 1. **HotelMaster** (Simplified)
**Before:**
```prisma
- hotelCode
- hotelName
- destinationId
- category (5-star, 4-star, etc.)
- capacity (room count)
- amenities (array)
- description
```

**After:**
```prisma
- hotelCode
- hotelName
- locationId (renamed from destinationId)
```

**Removed**: category, capacity, amenities, description (unnecessary for basic booking)

---

### 2. **DestinationMaster** (City-focused)
**Before:**
- Included 75+ international destinations
- Had `description` field
- Country field was variable

**After:**
- Only 5 Saudi cities: Makkah, Madinah, Jeddah, Riyadh, Taif
- Removed `description` field
- Default country: "Saudi Arabia"

---

### 3. **AirportMaster** (Saudi only)
**Before:**
- International airports (Dubai, Mumbai, Delhi, etc.)

**After:**
- Only 8 Saudi airports:
  - JED (Jeddah)
  - MED (Medina)
  - RUH (Riyadh)
  - DMM (Dammam)
  - TIF (Taif)
  - AHB (Abha)
  - GIZ (Jazan)
  - ELQ (Gassim/Buraidah)

---

### 4. **TransportMaster** (Improved)
**Changes:**
- Renamed `pax` → `paxCount` (clearer naming)
- Added `paxCount` index for better querying
- Vehicle types: Lexus ES 250 (3-PAX), GMC (5-PAX), Staria (8-PAX), Hiace (9-PAX)
- Pricing structure based on route + vehicle type

**Routes:**
- JED → MAK, JED → MED
- MAK → MED, MED → MAK
- MAK → JED, MED → JED

---

## ✨ Enhanced Booking Workflow

### **UmrahVisaBooking** (Main Table)
**Added:**
- `hasGroupNumber` (Boolean) - Indicates if booking has group ID
- Index on `hasGroupNumber` for filtering

**Workflow:**
1. Party selects: "Do you have Group ID?" → Yes/No
2. If Yes: Capture `groupNumber` + `groupName` + travel details
3. If No: Only travel details

---

### **UmrahTravelDetails**
**Changes:**
- Made departure details **required** (was optional)
- Now captures:
  - Arrival: Airport, Date, Flight Number
  - Departure: Airport, Date, Flight Number
  
**Fields:**
```prisma
- arrivalAirportId (required)
- arrivalDate (required)
- arrivalFlightNumber (required)
- departureAirportId (required) ← Changed from optional
- departureDate (required) ← Changed from optional
- departureFlightNumber (required) ← Changed from optional
```

---

### **UmrahTransportBooking**
**Changes:**
- Renamed `transportType` → `vehicleType` (clearer naming)
- Made `price` **required** (was optional)
- Added `vehicleType` index

**Purpose:**
- Multiple transport routes per booking
- Based on arrival airport (JED/MED) → destination (MAK/MED/JED)

---

### **UmrahHotelBooking**
**Removed:**
- `roomCount` (unnecessary)
- `guestCount` (unnecessary)

**Retained:**
- Hotel selection
- Check-in/out dates
- Location (Makkah/Madinah/Jeddah)
- Support for multiple hotels (+ icon to add more)

---

### **PassengerDocument**
**Document Rules:**
- **All Passengers**: `passport_front` + `passport_back`
- **Lead Passenger Only**: + `pan_card`

---

## 📋 Final Master Tables Structure

### **Kept Masters:**
1. ✅ **CurrencyMaster** (SAR, INR) - For future expansion
2. ✅ **ServiceTypeMaster** (UMRAH_VISA, HAJJ_VISA, etc.) - For future services
3. ✅ **DestinationMaster** (5 Saudi cities)
4. ✅ **AirportMaster** (8 Saudi airports)
5. ✅ **HotelMaster** (Simplified)
6. ✅ **TransportMaster** (Any-to-any routing)

---

## 🔄 Migration Changes

### Database Changes:
1. Drop tables: `country_masters`, `user_role_masters`, `airport_route_masters`
2. Add column: `has_group_number` to `umrah_visa_bookings`
3. Rename: `pax` → `pax_count` in `transport_masters`
4. Rename: `transport_type` → `vehicle_type` in `umrah_transport_bookings`
5. Remove columns from `hotel_masters`: `category`, `capacity`, `amenities`, `description`
6. Rename: `destination_id` → `location_id` in `hotel_masters`
7. Remove columns from `destination_masters`: `description`
8. Make required: `departure_airport_id`, `departure_flight_number` in `umrah_travel_details`
9. Make required: `price` in `umrah_transport_bookings`
10. Remove columns from `umrah_hotel_bookings`: `room_count`, `guest_count`

---

## 📦 Seed Scripts

### Updated Scripts:
1. ✅ `seed-destination-master.js` - Only 5 Saudi cities
2. ✅ `seed-airport-master.js` - Only 8 Saudi airports
3. ✅ `seed-hotel-master.js` - Simplified structure
4. ✅ `seed-transport-master.js` - Updated to use `paxCount`

### Removed Scripts:
1. ❌ `seed-country-master.js`
2. ❌ `seed-user-role-master.js`
3. ❌ `seed-airport-route-master.js`

### New Script:
- ✅ `seed-all.js` - Comprehensive seeding in correct order

---

## 🚀 Benefits of Cleanup

### 1. **Reduced Complexity**
- 3 fewer master tables to manage
- Simpler relationships
- Less data to maintain

### 2. **Improved Performance**
- Fewer joins needed
- Smaller dataset (5 cities vs 75+)
- Better query performance

### 3. **Clearer Workflow**
- Explicit group number handling
- Required departure details (no ambiguity)
- Simplified hotel/transport selection

### 4. **Better Maintainability**
- Focused on Umrah service only
- Easy to understand structure
- Clear naming conventions

### 5. **Easier Frontend Development**
- Fewer dropdowns to populate
- Simpler form flows
- Less complex validation

---

## 📝 Next Steps

### For Backend:
1. ✅ Update schema
2. ✅ Create migration
3. ✅ Update seed scripts
4. ⏳ Update API routes to use new field names
5. ⏳ Update validation logic
6. ⏳ Test all endpoints

### For Frontend:
1. ⏳ Update types to match new schema
2. ⏳ Add "hasGroupNumber" toggle
3. ⏳ Update airport/destination dropdowns
4. ⏳ Update transport/hotel selection
5. ⏳ Update document upload rules
6. ⏳ Test complete booking flow

---

## 🎯 Umrah Booking Flow (Finalized)

### Step 1: Group Details or Travel Details
**Question**: "Do you have a Group Number?"
- **Yes** → Capture: Group Number + Group Name + Travel Details (below)
- **No** → Only Travel Details (below)

### Step 2: Travel Details (Always Required)
- Arrival Airport (8 options)
- Arrival Date
- Arrival Flight Number
- Departure Airport (8 options)
- Departure Date
- Departure Flight Number

### Step 3: Transportation (If arrival = JED or MED)
- From: Arrival Airport
- To: Destination (Makkah/Madinah/Jeddah)
- Vehicle Type: Lexus/GMC/Staria/Hiace
- PAX Count: 3/5/8/9
- Price: Auto-calculated

### Step 4: Accommodation
**Option A: Iqama Holder** (Max 5 passengers)
- Iqama Number
- Iqama Name
- Iqama DOB
- Iqama Mobile

**Option B: Hotel Booking**
- Select Location (Makkah/Madinah/Jeddah)
- Select Hotel
- Check-in Date
- Check-out Date
- (Can add multiple hotels with + icon)

### Step 5: Passenger Documents
For each passenger:
- Passport Front
- Passport Back

For lead passenger additionally:
- PAN Card

---

## 📊 Database Statistics

### Before Cleanup:
- Master Tables: 11
- Destination Records: 75+
- Airport Records: 10+
- Hotel Fields: 8
- Relationships: Complex web

### After Cleanup:
- Master Tables: 6
- Destination Records: 5
- Airport Records: 8
- Hotel Fields: 4
- Relationships: Streamlined

**Reduction**: ~45% fewer master tables, ~93% fewer destination records

---

## ✅ Validation Rules

### Party Limits:
- Max Passengers (Normal): 50
- Max Passengers (Iqama): 5
- Max Travel Days: 80

### Document Requirements:
- All Passengers: 2 documents (passport front + back)
- Lead Passenger: 3 documents (+ PAN card)

### Transportation:
- Required if arrival airport is JED or MED
- Price auto-calculated based on route + vehicle

### Accommodation:
- Either Iqama OR Hotel (not both)
- Iqama: Max 5 passengers
- Hotel: Multiple hotels allowed

---

## 📞 Support

For questions or issues related to this cleanup:
1. Check migration file: `migrations/20251014000000_cleanup_master_tables/`
2. Review seed scripts: `scripts/seed-*.js`
3. Test with: `npm run seed:all` (in backend directory)

---

**Last Updated**: October 14, 2025
**Migration Version**: 20251014000000

