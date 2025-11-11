# Umrah Visa Booking Status Flow Documentation

## Overview
This document describes the complete status flow for both **Individual Umrah Visa** and **Group Umrah Visa** bookings.

## Status Enum Values
```typescript
enum UmrahVisaStatus {
  pending              // Initial status for individual bookings without group number
  documents_downloaded // Documents have been downloaded by admin/staff
  group_assigned      // Group number and name assigned
  voucher             // Ready for voucher generation
  bill                // Voucher generated, ready for bill
  booking_success     // Final success status
  cancelled          // Booking cancelled
}
```

---

## 📋 Individual Umrah Visa Booking Flow

### Initial Status (on Booking Creation)
The initial status depends on whether the booking has a group number:

| Condition | Initial Status |
|-----------|---------------|
| `hasGroupNumber = false` | `pending` |
| `hasGroupNumber = true` AND `accommodationType = 'iqama'` | `group_assigned` |
| `hasGroupNumber = true` AND `accommodationType = 'hotel'` | `voucher` |

### Booking Steps (Frontend)
1. **Step 1:** Booking Mode (individual/group_number) + Passenger Count + Umrah Visa Provider (if group_number)
2. **Step 2:** Travel Details (arrival/departure airports, dates, flight numbers)
3. **Step 3:** Accommodation Type (hotel or iqama)
   - If hotel: Select hotels with check-in/check-out dates
   - If iqama: Enter iqama details (number, name, DOB, mobile, **national short address**)
4. **Step 4:** Transport Vehicle Selection (optional)
   - **Required only if:** `arrivalAirport = Jeddah` AND `accommodationType = 'hotel'`
   - Otherwise: Can skip
5. **Step 5:** Passenger Documents Upload
   - Submit all data → Creates booking in database

### Status Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    INDIVIDUAL BOOKING FLOW                      │
└─────────────────────────────────────────────────────────────────┘

CASE 1: No Group Number (hasGroupNumber = false)
────────────────────────────────────────────────
[pending]
    │
    │ Admin/Staff: Download Documents
    ▼
[documents_downloaded]
    │
    │ Admin/Staff: Add Group Data
    │ (groupNumber, groupName)
    │
    ├─ IF accommodationType = 'iqama' ──► [group_assigned]
    │                                         │
    │                                         │ Admin/Staff: Upload Confirmation Image
    │                                         │
    │                                         ├─ IF hasTransportation = true ──► [voucher]
    │                                         │                                    │
    │                                         │                                    │ Admin/Staff: Generate Voucher
    │                                         │                                    ▼
    │                                         │                                 [bill]
    │                                         │                                    │
    │                                         │                                    │ Admin/Staff: Generate Bill
    │                                         │                                    ▼
    │                                         │                              [booking_success] ✅
    │                                         │
    │                                         └─ IF hasTransportation = false ──► [bill]
    │                                                                              │
    │                                                                              │ Admin/Staff: Generate Bill
    │                                                                              ▼
    │                                                                         [booking_success] ✅
    │
    └─ IF accommodationType = 'hotel' ──► [voucher]
                                              │
                                              │ Admin/Staff: Generate Voucher
                                              ▼
                                           [bill]
                                              │
                                              │ Admin/Staff: Generate Bill
                                              ▼
                                        [booking_success] ✅


CASE 2: Has Group Number + Hotel (hasGroupNumber = true, accommodationType = 'hotel')
─────────────────────────────────────────────────────────────────────────────────────
[voucher] (Initial status)
    │
    │ Admin/Staff: Generate Voucher
    ▼
[bill]
    │
    │ Admin/Staff: Generate Bill
    ▼
[booking_success] ✅


CASE 3: Has Group Number + Iqama (hasGroupNumber = true, accommodationType = 'iqama')
─────────────────────────────────────────────────────────────────────────────────────
[group_assigned] (Initial status)
    │
    │ Admin/Staff: Upload Confirmation Image
    │
    ├─ IF hasTransportation = true ──► [voucher]
    │                                    │
    │                                    │ Admin/Staff: Generate Voucher
    │                                    ▼
    │                                 [bill]
    │                                    │
    │                                    │ Admin/Staff: Generate Bill
    │                                    ▼
    │                              [booking_success] ✅
    │
    └─ IF hasTransportation = false ──► [bill]
                                           │
                                           │ Admin/Staff: Generate Bill
                                           ▼
                                        [booking_success] ✅
```

### Status Transition Details

#### 1. `pending` → `documents_downloaded`
- **Action:** Admin/Staff downloads passenger documents
- **Endpoint:** `POST /api/umrah-visa/:bookingId/download-documents`
- **Requirements:**
  - Status must be `pending`
  - `documentsDownloadCount` must be 0 (no previous downloads)
- **Updates:**
  - `documentsDownloadCount` += 1
  - `documentsDownloadedBy` = user.id
  - Status → `documents_downloaded`

#### 2. `documents_downloaded` → `group_assigned` OR `voucher`
- **Action:** Admin/Staff adds group data (groupNumber, groupName)
- **Endpoint:** `POST /api/umrah-visa/:bookingId/add-group-data`
- **Requirements:**
  - Status must be `documents_downloaded`
- **Next Status Logic:**
  - If `accommodationType = 'iqama'` → `group_assigned`
  - If `accommodationType = 'hotel'` → `voucher`
- **Updates:**
  - `groupNumber` = provided value
  - `groupName` = provided value
  - `hasGroupNumber` = true
  - Status → `group_assigned` or `voucher`

#### 3. `group_assigned` → `voucher` OR `bill`
- **Action:** Admin/Staff uploads confirmation image (for iqama bookings only)
- **Endpoint:** `POST /api/umrah-visa/:bookingId/upload-confirmation`
- **Requirements:**
  - Status must be `group_assigned`
  - `accommodationType` must be `'iqama'`
  - `sponsorIqamaDetails` must exist
- **Next Status Logic:**
  - If `hasTransportation = true` → `voucher`
  - If `hasTransportation = false` → `bill`
- **Updates:**
  - `sponsorIqamaDetails.confirmationImagePath` = provided path
  - `sponsorIqamaDetails.confirmationUploadedAt` = current timestamp
  - Status → `voucher` or `bill`

#### 4. `voucher` → `bill`
- **Action:** Admin/Staff generates transport voucher
- **Endpoint:** `POST /api/umrah-visa/:bookingId/generate-voucher`
- **Requirements:**
  - Status must be `voucher`
- **Updates:**
  - Creates `Voucher` record with voucher number
  - `voucherGeneratedAt` = current timestamp
  - `voucherGeneratedBy` = user.id
  - Status → `bill`

#### 5. `bill` → `booking_success`
- **Action:** Admin/Staff generates bill (not yet implemented)
- **Endpoint:** `POST /api/umrah-visa/:bookingId/generate-bill` (placeholder)
- **Status:** Not implemented yet

#### 6. Any Status → `cancelled`
- **Action:** Cancel booking (not yet implemented)
- **Status:** Not implemented yet

---

## 👥 Group Umrah Visa Booking Flow

### Initial Status (on Booking Creation)
- **Always:** `voucher` (Group bookings always have hotel accommodation and group number)

### Booking Steps (Frontend)
1. **Step 1:** Group Details (groupNumber, groupName, passengerCount, umrahVisaProviderId)
2. **Step 2:** Travel & Hotel Details
   - Travel details (arrival/departure airports, dates, flight numbers)
   - Hotel bookings (multiple hotels with check-in/check-out dates)
3. **Step 3:** Movement Details (transport segments between locations)
4. **Step 4:** Transport Vehicle Selection (select vehicles for each route)
5. **Step 5:** PAN Cards Upload (ZIP file with all passenger PAN cards)

### Status Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      GROUP BOOKING FLOW                          │
└─────────────────────────────────────────────────────────────────┘

[voucher] (Initial status - always starts here)
    │
    │ Admin/Staff: Generate Voucher
    │ (Creates Voucher record with voucher number)
    ▼
[bill]
    │
    │ Admin/Staff: Generate Bill
    │ (Not yet implemented)
    ▼
[booking_success] ✅
```

### Status Transition Details

#### 1. `voucher` → `bill`
- **Action:** Admin/Staff generates transport voucher
- **Endpoint:** `POST /api/umrah-visa/:bookingId/generate-voucher`
- **Requirements:**
  - Status must be `voucher`
- **Updates:**
  - Creates `Voucher` record with voucher number
  - `voucherGeneratedAt` = current timestamp
  - `voucherGeneratedBy` = user.id
  - Status → `bill`

#### 2. `bill` → `booking_success`
- **Action:** Admin/Staff generates bill (not yet implemented)
- **Endpoint:** `POST /api/umrah-visa/:bookingId/generate-bill` (placeholder)
- **Status:** Not implemented yet

---

## 🔑 Key Differences

| Aspect | Individual Booking | Group Booking |
|--------|-------------------|---------------|
| **Initial Status** | `pending` (no group) OR `group_assigned` (iqama with group) OR `voucher` (hotel with group) | Always `voucher` |
| **Accommodation** | Hotel OR Iqama | Always Hotel |
| **Group Number** | Optional (can be added later) | Required (from Step 1) |
| **Transport** | Optional (only required if Jeddah arrival + hotel) | Required (movement segments) |
| **Documents** | Individual passenger documents | PAN cards in ZIP file |
| **Status Flow** | Complex (multiple paths based on accommodation/transport) | Simple (voucher → bill → success) |

---

## 📊 Status Summary Table

| Status | Individual (No Group) | Individual (With Group + Hotel) | Individual (With Group + Iqama) | Group Booking |
|--------|----------------------|--------------------------------|----------------------------------|---------------|
| **Initial** | `pending` | `voucher` | `group_assigned` | `voucher` |
| **After Doc Download** | `documents_downloaded` | N/A | N/A | N/A |
| **After Group Assign** | `group_assigned` (iqama) OR `voucher` (hotel) | N/A | N/A | N/A |
| **After Confirmation Upload** | N/A | N/A | `voucher` (with transport) OR `bill` (no transport) | N/A |
| **After Voucher Generate** | `bill` | `bill` | `bill` | `bill` |
| **Final** | `booking_success` | `booking_success` | `booking_success` | `booking_success` |

---

## 🛠️ Available Actions by Status

### `pending`
- ✅ Download Documents (Admin/Staff only)

### `documents_downloaded`
- ✅ Add Group Data (Admin/Staff only)

### `group_assigned`
- ✅ Upload Confirmation Image (Admin/Staff only, iqama only)

### `voucher`
- ✅ Generate Voucher (Admin/Staff only)

### `bill`
- ⏳ Generate Bill (Admin/Staff only, not yet implemented)

### `booking_success`
- No actions available (final status)

### `cancelled`
- No actions available

---

## 📝 Notes

1. **Transport Requirement:**
   - Individual bookings: Transport is only **mandatory** if `arrivalAirport = Jeddah` AND `accommodationType = 'hotel'`
   - Group bookings: Transport is always required (movement segments)

2. **Iqama Accommodation:**
   - Only available for individual bookings
   - Maximum 5 passengers allowed
   - Requires confirmation image upload before moving to voucher/bill

3. **Group Number:**
   - Individual bookings: Can be added during booking (Step 1) or later by admin
   - Group bookings: Required from Step 1

4. **Status History:**
   - All status changes are tracked in `BookingStatusHistory` table
   - Includes: `oldStatus`, `newStatus`, `changedBy`, `reason`, `createdAt`

5. **Voucher Generation:**
   - Only available when status is `voucher`
   - Creates a `Voucher` record with unique voucher number
   - Includes hotel schedules, movement details, and flight details

6. **Bill Generation:**
   - Currently not implemented
   - Will transition from `bill` to `booking_success`

