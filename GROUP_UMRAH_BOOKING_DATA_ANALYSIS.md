# Group Umrah Visa Booking - Data Analysis

## Backend Expected Data Structure

### 1. UmrahVisaBooking (Main Booking Table)
**Required Fields:**
- `serviceId` (UUID) - Linked to Service table
- `groupNumber` (String, required for group)
- `groupName` (String, required for group)
- `hasGroupNumber` (Boolean, always `true` for group)
- `passengerCount` (Int, 1-50)
- `status` (Enum: 'pending' | 'group_assigned' | 'voucher') - Always `'voucher'` for group bookings
- `visaType` (Enum: 'individual_visa' | 'group_visa') - Always `'group_visa'` for group
- `accommodationType` (Enum: 'hotel' | 'iqama') - Always `'hotel'` for group
- `hasTransportation` (Boolean) - Calculated from transport segments

### 2. UmrahTravelDetails (From Step 2)
**Required Fields:**
- `bookingId` (UUID)
- `arrivalDate` (Date)
- `arrivalTime` (Time)
- `arrivalAirportId` (UUID - LocationMaster ID)
- `arrivalFlightNumber` (String, format: XX-1234)
- `departureDate` (Date)
- `departureTime` (Time)
- `departureAirportId` (UUID - LocationMaster ID)
- `departureFlightNumber` (String, format: XX-1234)

### 3. UmrahAccommodationDetails
**Required Fields:**
- `bookingId` (UUID)
- `accommodationType` (Enum) - Always `'hotel'` for group

### 4. UmrahHotelBooking[] (Currently expects in step3Data)
**Required Fields per booking:**
- `accommodationId` (UUID)
- `locationId` (UUID - LocationMaster ID)
- `hotelId` (UUID - LocationMaster ID)
- `checkInDate` (Date)
- `checkOutDate` (Date)

### 5. UmrahTransportBooking[] (From step3Data.transportSegments OR step2Data.transportBookings)
**Required Fields per segment:**
- `bookingId` (UUID)
- `fromLocationId` (UUID)
- `toLocationId` (UUID)
- `vehicleType` (String)
- `paxCount` (Int, min 1)
- `price` (Decimal, min 0)
- `travelDate` (Date, optional)
- `travelTime` (Time, optional)

**Note:** Backend schema shows `fromHotelId` and `toHotelId` fields, but backend code doesn't use them when creating transport bookings!

### 6. UmrahPassenger[]
**Required Fields per passenger:**
- `bookingId` (UUID)
- `fullName` (String, max 255)
- `isLeadPassenger` (Boolean)
- Documents are stored separately in `PassengerDocument` table

### 7. TripInfo
**Required Fields:**
- `bookingId` (UUID)
- `groupNumber` (String)
- `groupName` (String)
- `partyName` (String)
- `arrivalDate` (Date)
- `departureDate` (Date)
- `updatedBy` (UUID - User ID)
- `status` (String) - Always `'voucher'` for group

### 8. BookingStatusHistory
**Required Fields:**
- `bookingId` (UUID)
- `oldStatus` (null for new booking)
- `newStatus` (String) - `'voucher'` for group
- `changedBy` (UUID - User ID)
- `reason` (String) - `'Group booking created'`

---

## Current Frontend Data Structure

### Step 1 Data (step1Data)
✅ **Matches Backend:**
- `groupNumber` (String)
- `groupName` (String)

### Step 2 Data (step2Data)
✅ **Matches Backend:**
- `arrivalDate` (String)
- `arrivalTime` (String)
- `arrivalAirportId` (String)
- `arrivalFlightNumber` (String)
- `departureDate` (String)
- `departureTime` (String)
- `departureAirportId` (String)
- `departureFlightNumber` (String)
- `transportBookings` (Array) - Optional, used if no step3 transportSegments

❌ **EXTRA (Not in Backend Schema):**
- `hotelBookings` (Array) - **MOVED FROM STEP 3 TO STEP 2**
  - `locationId`, `hotelId`, `checkInDate`, `checkOutDate`

### Step 3 Data (step3Data)
✅ **Matches Backend:**
- `accommodationType` (Enum: 'hotel') - Always 'hotel' for group
- `transportSegments` (Array) - Optional
  - Fields: `fromLocationId`, `toLocationId`, `vehicleType`, `paxCount`, `price`, `travelDate`, `travelTime`

⚠️ **BACKWARD COMPATIBILITY:**
- `hotelBookings` (Array) - Still exists but should be moved to step2Data

❌ **EXTRA (New Features - Not Handled by Backend):**
- `selectedFullTripId` (String | undefined) - **NEW: Full trip selection**
- `ziyarahDates` (Array) - **NEW: Ziyarat dates when full trip selected**
  - Format: `{ cityId: string, cityName: string, date: string }`

### Step 4 Data (step4Data)
✅ **Matches Backend:**
- `passengerCount` (Number) - Calculated from passengers.length
- `passengers` (Array)
  - `fullName` (String)
  - `isLeadPassenger` (Boolean)
  - `panCardPhoto` (File | null) - Only lead passenger needs this

---

## Issues Found

### ❌ **CRITICAL ISSUE #1: Hotel Bookings Location Mismatch**
- **Backend expects:** `hotelBookings` in `step3Data`
- **Frontend stores:** `hotelBookings` in `step2Data` (after our restructuring)
- **Impact:** Backend won't find hotel bookings when creating the booking
- **Fix needed:** In `submitStep4()`, copy `step2Data.hotelBookings` to `step3Data.hotelBookings` before sending

### ❌ **CRITICAL ISSUE #2: Full Trip Selection Not Handled**
- **Backend doesn't know about:** `selectedFullTripId` or `ziyarahDates`
- **Impact:** When user selects a full trip, we need to:
  1. Generate transport segments from the full trip route
  2. Optionally store ziyarat dates (might need separate handling)
- **Fix needed:** 
  - When `selectedFullTripId` exists, fetch the full trip
  - Generate transport segments from full trip route
  - Map full trip toCities sequence to transport segments

### ❌ **ISSUE #3: Transport Segments Missing Hotel References**
- **Backend schema has:** `fromHotelId` and `toHotelId` fields in `UmrahTransportBooking`
- **Backend code doesn't use:** These fields when creating transport bookings
- **Frontend sends:** `fromHotelId` and `toHotelId` in transport segments
- **Impact:** Fields are ignored, but might be needed for future features

### ⚠️ **ISSUE #4: Ziyarat Dates Storage**
- **Current:** `ziyarahDates` stored in step3Data but not saved to database
- **Options:**
  1. Store as additional fields in transport segments (if they represent transport)
  2. Create separate table for ziyarat dates
  3. Store as metadata/comments in booking
  4. Include in TripInfo or create custom field

### ✅ **GOOD: Everything Else Matches**
- Travel details structure matches
- Passenger structure matches
- All required validations in place

---

## Required Fixes

### Fix 1: Map step2Data.hotelBookings to step3Data.hotelBookings
**Location:** `frontend/hooks/useGroupUmrahBooking.ts` - `submitStep4()` function

```typescript
const payload = {
  partyId,
  step1: bookingState.step1Data,
  step2: bookingState.step2Data,
  step3: {
    ...bookingState.step3Data,
    // Copy hotelBookings from step2Data to step3Data for backend compatibility
    hotelBookings: bookingState.step2Data.hotelBookings || bookingState.step3Data.hotelBookings || [],
  },
  step4: { ... }
};
```

### Fix 2: Handle Full Trip Selection
**Location:** `frontend/hooks/useGroupUmrahBooking.ts` - `submitStep4()` function

When `selectedFullTripId` exists:
1. Fetch full trip details from API
2. Generate transport segments from full trip route:
   - `fromCityId` → first `toCity`
   - Each `toCity` → next `toCity` in sequence
   - Last `toCity` → back to `fromCityId` (if circular) or departure airport
3. Replace `step3Data.transportSegments` with generated segments

### Fix 3: Handle Ziyarat Dates
**Options:**
- Option A: Include ziyarat dates as metadata in TripInfo (if schema allows)
- Option B: Store in transport segments as special segments (from hotel to ziyarat location)
- Option C: Add ziyaratDates field to UmrahAccommodationDetails (requires schema change)
- **Recommendation:** Option B - Create transport segments for ziyarat movements

---

## Summary

**✅ Working:**
- All basic booking data structures
- Travel details
- Passenger data
- Transport segments (when manually created)

**❌ Not Working:**
- Hotel bookings location (step2 vs step3 mismatch)
- Full trip selection (not generating transport segments)
- Ziyarat dates (not being saved)

**⚠️ Needs Decision:**
- Where to store ziyarat dates permanently
- Whether to use fromHotelId/toHotelId in transport bookings

