# AirportMaster Usage Report

This document lists all places where `AirportMaster` is currently used and needs to be migrated to `LocationMaster` with `AIRPORT` type.

## 📋 Summary

**Total locations found:** 25+ references across backend and frontend

---

## 🔴 Backend Files (Need Migration)

### 1. **`backend/src/routes/airportMaster.routes.ts`** ⚠️ ENTIRE FILE
   - **Status:** Complete replacement needed
   - **Usage:**
     - Line 54: `prisma.airportMaster.findMany()` - GET all airports
     - Line 60: `prisma.airportMaster.count()` - Count airports
     - Line 81: `prisma.airportMaster.findMany()` - GET active airports
     - Line 105: `prisma.airportMaster.findUnique()` - GET airport by ID
     - Line 134: `prisma.airportMaster.findUnique()` - POST create airport (duplicate check)
     - Line 142: `prisma.airportMaster.create()` - POST create airport
     - Line 163: `prisma.airportMaster.findUnique()` - PUT update airport
     - Line 173: `prisma.airportMaster.findUnique()` - PUT update airport (duplicate check)
     - Line 182: `prisma.airportMaster.update()` - PUT update airport
     - Line 203: `prisma.airportMaster.findUnique()` - DELETE airport
     - Line 223: `prisma.airportMaster.update()` - DELETE airport (soft delete)
     - Line 234: `prisma.airportMaster.delete()` - DELETE airport (hard delete)
     - Line 273: `prisma.airportMaster.findMany()` - GET search airports
   
   **Migration Notes:**
   - Change all queries to `prisma.locationMaster` with `where: { locationType: 'AIRPORT' }`
   - Field mapping:
     - `airportCode` → `code`
     - `airportName` → `name`
     - `city` → `city` (same)
     - `country` → `country.countryName` (from relation)
     - `isActive` → `isActive` (same)
   - Validation schemas need to include `locationType: 'AIRPORT'` and `countryId` instead of `country` string
   - Unique constraint: `code_locationType` instead of just `airportCode`

### 2. **`backend/src/routes/umrahVisa.routes.ts`** ⚠️ 2 LOCATIONS
   - **Line 917:** `prisma.airportMaster.findUnique()` - GET transport options endpoint
     ```typescript
     const airport = await prisma.airportMaster.findUnique({
       where: { id: airportId },
     });
     ```
     **Replace with:**
     ```typescript
     const airport = await prisma.locationMaster.findUnique({
       where: { 
         id: airportId,
         locationType: 'AIRPORT'
       },
     });
     ```
   
   - **Line 1098:** `prisma.airportMaster.findMany()` - GET masters/airports endpoint
     ```typescript
     const rows = await prisma.airportMaster.findMany({
       where: q ? { airportName: { contains: q, mode: 'insensitive' } } : undefined,
     });
     ```
     **Replace with:**
     ```typescript
     const rows = await prisma.locationMaster.findMany({
       where: {
         locationType: 'AIRPORT',
         ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
       },
     });
     ```

### 3. **`backend/src/server.ts`** ⚠️ 2 LOCATIONS
   - **Line 20:** `import airportMasterRoutes from './routes/airportMaster.routes';`
   - **Line 65:** `app.use('/api/airport-masters', airportMasterRoutes);`
   
   **Migration Notes:**
   - Decide whether to:
     - **Option A:** Keep route but redirect to location-masters with filter
     - **Option B:** Remove route and update frontend to use location-masters endpoint
     - **Option C:** Keep route but update it to use LocationMaster internally

### 4. **`backend/prisma/schema.prisma`** ⚠️ CRITICAL - SCHEMA CHANGES
   - **Line 353-370:** `AirportMaster` model definition
   - **Line 385, 387:** `UmrahTravelDetails` relations to `AirportMaster`
     ```prisma
     arrivalAirport    AirportMaster    @relation("ArrivalAirport", fields: [arrivalAirportId], references: [id])
     departureAirport  AirportMaster    @relation("DepartureAirport", fields: [departureAirportId], references: [id])
     ```
   
   **Migration Notes:**
   - **Option 1:** Update `UmrahTravelDetails` to reference `LocationMaster` instead
     - Change `arrivalAirportId` and `departureAirportId` to reference `location_masters.id`
     - Add constraint: `locationType = 'AIRPORT'`
     - Update relations to `LocationMaster`
   - **Option 2:** Keep `AirportMaster` for backward compatibility but sync with `LocationMaster`
   - Requires migration to update foreign keys

---

## 🟡 Frontend Files (Need Updates)

### 1. **`frontend/hooks/useAirportMaster.ts`** ⚠️ ENTIRE FILE
   - Uses `airportMasterAPI` from `@/lib/api`
   - All functions need to switch to `locationMasterAPI` with `locationType: 'AIRPORT'` filter
   - Interface `AirportMaster` needs to match `LocationMaster` structure

### 2. **`frontend/lib/api.ts`** ⚠️ LINES 333-342
   - **`airportMasterAPI`** object (lines 333-342)
   - All endpoints point to `/airport-masters/*`
   - Need to either:
     - Keep and update backend to redirect
     - Change to use `/location-masters` with query params

### 3. **`frontend/types/index.ts`**
   - Check for `AirportMaster` interface definition
   - Update to match `LocationMaster` with airport-specific fields

### 4. **`frontend/app/dashboard/masters/airport/page.tsx`** ⚠️ ENTIRE PAGE
   - Airport master management page
   - Uses `useAirportMaster` hook
   - Form fields need to include `countryId` instead of `country` string
   - Auto-set `locationType: 'AIRPORT'`

### 5. **`frontend/components/airport/`** ⚠️ ALL COMPONENTS
   - `AirportForm.tsx` - Form component
   - `AirportCard.tsx` - Display component
   - `AirportDeleteConfirmationModal.tsx` - Delete confirmation
   - All need field mapping updates

### 6. **`frontend/lib/umrah/constants.ts`** ⚠️ LINE 79
   - `AIRPORTS: '/airport-masters/active'`
   - Update to `/location-masters/active?locationType=AIRPORT`

---

## 🔧 Migration Strategy Options

### **Option A: Backend-Only Migration (Recommended)**
- Update `airportMaster.routes.ts` to use `LocationMaster` internally
- Keep API endpoints the same (`/api/airport-masters/*`)
- Map between AirportMaster interface and LocationMaster data
- **Pros:** Minimal frontend changes
- **Cons:** Backend complexity, two data sources

### **Option B: Full Migration**
- Remove `AirportMaster` model completely
- Update `UmrahTravelDetails` to use `LocationMaster`
- Update all frontend to use `locationMasterAPI` with filters
- **Pros:** Single source of truth, cleaner architecture
- **Cons:** More extensive changes, requires data migration

### **Option C: Hybrid Approach**
- Keep `AirportMaster` table for backward compatibility
- Create sync mechanism between `AirportMaster` and `LocationMaster`
- Gradually migrate frontend
- **Pros:** No breaking changes
- **Cons:** Data duplication, sync complexity

---

## 📝 Key Field Mappings

| AirportMaster | LocationMaster | Notes |
|--------------|----------------|-------|
| `id` | `id` | UUID, same |
| `airportCode` | `code` | Unique within type |
| `airportName` | `name` | Full name |
| `city` | `city` | Same |
| `country` (string) | `country.countryName` | Now via relation |
| `isActive` | `isActive` | Same |
| N/A | `locationType` | Must be `'AIRPORT'` |
| N/A | `countryId` | Foreign key to CountryMaster |

---

## 🚨 Critical Dependencies

1. **`UmrahTravelDetails`** model has foreign keys to `AirportMaster`
   - Must update schema and create migration
   - Existing booking data needs migration

2. **Database Migration Required:**
   - Update `umrah_travel_details.arrival_airport_id` to reference `location_masters.id`
   - Update `umrah_travel_details.departure_airport_id` to reference `location_masters.id`
   - Add constraint to ensure referenced locations are `AIRPORT` type

3. **Data Migration:**
   - Copy existing `airport_masters` data to `location_masters` with `locationType = 'AIRPORT'`
   - Map `country` string to `countryId` UUID

---

## 📍 Additional Airport References

### Backend (`backend/src/routes/umrahVisa.routes.ts`)
- **Line 116-117:** `include: { arrivalAirport: true, departureAirport: true }` - In booking queries
- **Line 197, 207:** Validation schemas for `arrivalAirportId` and `departureAirportId`
- **Line 483, 487:** Creating travel details with airport IDs
- **Line 634-635:** Include airport relations in queries
- **Line 717-718:** Updating airport IDs
- **Line 1419-1420:** Include airports in export queries
- **Line 1509, 1520:** Accessing `booking.travelDetails.arrivalAirport.airportCode` and `departureAirport.airportCode`
- **Line 2023, 2027:** Creating travel details with airport IDs

**Field Access Patterns:**
- `arrivalAirport.airportCode` → Should become `arrivalAirport.code`
- `arrivalAirport.airportName` → Should become `arrivalAirport.name`
- `departureAirport.airportCode` → Should become `departureAirport.code`
- `departureAirport.airportName` → Should become `departureAirport.name`

### Frontend Airport References
- **`frontend/types/index.ts`:** `arrivalAirport`, `departureAirport` fields
- **`frontend/hooks/useUmrahBooking.ts`:** State management for airport IDs
- **`frontend/hooks/useGroupUmrahBooking.ts`:** Group booking airport IDs
- **`frontend/components/umrah-booking/steps/TravelDetailsStep.tsx`:** Airport selection handlers
- **`frontend/components/umrah-booking/components/TravelDetailsForm.tsx`:** Airport form fields
- **`frontend/app/dashboard/umrah-visa/visa-management/view/[id]/page.tsx`:** Displaying airport names
- **`frontend/app/dashboard/umrah-visa/visa-management/edit/[id]/page.tsx`:** Editing airport selections
- **Multiple files:** Accessing `booking.travelDetails?.arrivalAirport?.airportName` pattern

---

## ✅ Next Steps

1. **Decide on migration strategy** (A, B, or C)
2. **Update Prisma schema** to change `UmrahTravelDetails` relations
3. **Create database migration**
4. **Update backend routes** to use `LocationMaster`
5. **Update all field access patterns** (`airportCode` → `code`, `airportName` → `name`)
6. **Update frontend components** and API calls
7. **Test thoroughly** with existing booking data

