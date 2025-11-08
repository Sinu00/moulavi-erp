# Umrah Visa Routes Refactoring Recommendation

## Current State Analysis

### Services Table - **KEEP IT** ✅
**Purpose**: Generic service container for extensibility

**Current Usage**:
- Links bookings to parties (`party.services`)
- Used in `service.routes.ts` to list all services by party
- Links documents to services (`documents.serviceId`)
- Enables filtering by `serviceType` (currently only 'umrah_visa', but extensible)
- Used for party dashboards and service history

**Benefits**:
- ✅ Supports future service types (e.g., 'hajj_visa', 'tour_package')
- ✅ Centralized service management
- ✅ Unified document storage per service
- ✅ Service-level status tracking

**Verdict**: **Keep the services table** - it's useful for extensibility and party service management.

---

### Route File Structure - **NEEDS REFACTORING** ⚠️

**Current State**:
- `umrahVisa.routes.ts`: **2,802 lines** with **32 routes**
- Mixing individual and group visa logic
- Hard to navigate and maintain

**Recommendation**: Split into separate route files

---

## Proposed Structure

### Option 1: Split by Visa Type (Recommended) ⭐

```
backend/src/routes/
├── umrahVisa.routes.ts              (SHARED - Common routes)
│   ├── GET /bookings                (List all bookings - both types)
│   ├── GET /:bookingId              (Get booking details)
│   ├── GET /stats                   (Statistics)
│   ├── GET /masters/*               (Master data endpoints)
│   └── Common utilities/helpers
│
├── umrahVisaIndividual.routes.ts    (INDIVIDUAL VISA)
│   ├── POST /step1                  (Validation)
│   ├── POST /step2                  (Validation)
│   ├── POST /step3                  (Validation)
│   ├── POST /create-booking         (Create booking - visaType: 'individual_visa')
│   └── Individual-specific routes
│
├── umrahVisaGroup.routes.ts         (GROUP VISA)
│   ├── POST /group/step1            (Validation)
│   ├── POST /group/step2            (Validation)
│   ├── POST /group/step3            (Validation)
│   ├── POST /group/create-booking   (Create booking - visaType: 'group_visa')
│   └── Group-specific routes
│
└── umrahVisaWorkflow.routes.ts      (WORKFLOW - Shared)
    ├── POST /:bookingId/add-group-data
    ├── POST /:bookingId/download-documents
    ├── POST /:bookingId/upload-confirmation
    ├── GET /:bookingId/voucher-data
    ├── POST /:bookingId/generate-voucher
    ├── GET /:bookingId/available-actions
    ├── GET /:bookingId/trip-info
    └── Workflow-related routes
```

### Option 2: Split by Feature Area

```
backend/src/routes/
├── umrahVisa.routes.ts              (Main routes)
├── umrahVisaBooking.routes.ts       (Booking CRUD)
├── umrahVisaWorkflow.routes.ts      (Workflow operations)
└── umrahVisaMasters.routes.ts      (Master data)
```

---

## Route Categorization

### **Shared Routes** (umrahVisa.routes.ts)
- `GET /bookings` - List all bookings (both types)
- `GET /:bookingId` - Get booking details
- `GET /stats` - Statistics
- `GET /masters/*` - Master data endpoints
- `GET /transport-options/:airportId`
- `GET /hotels/:cityId`
- `POST /seed-ziyarah-hotels` (admin only)

### **Individual Visa Routes** (umrahVisaIndividual.routes.ts)
- `POST /step1` - Step 1 validation
- `POST /step2` - Step 2 validation
- `POST /step3` - Step 3 validation
- `POST /create-booking` - Create individual booking
- `PATCH /:bookingId/travel-details` - Update travel details
- `PATCH /:bookingId/accommodation` - Update accommodation
- `PATCH /:bookingId/passengers` - Update passengers

### **Group Visa Routes** (umrahVisaGroup.routes.ts)
- `POST /group/step1` - Step 1 validation
- `POST /group/step2` - Step 2 validation
- `POST /group/step3` - Step 3 validation
- `POST /group/create-booking` - Create group booking

### **Workflow Routes** (umrahVisaWorkflow.routes.ts)
- `POST /:bookingId/add-group-data`
- `POST /:bookingId/download-documents`
- `POST /:bookingId/upload-confirmation`
- `GET /:bookingId/voucher-data`
- `POST /:bookingId/generate-voucher`
- `GET /:bookingId/available-actions`
- `GET /:bookingId/trip-info`
- `PATCH /:bookingId/transport-bookings`
- `POST /:bookingId/transport-bookings`
- `DELETE /transport-bookings/:id`
- `POST /:bookingId/hotel-bookings`
- `DELETE /hotel-bookings/:id`

---

## Implementation Steps

1. **Create shared utilities file**:
   ```typescript
   // backend/src/routes/umrahVisa/shared.ts
   export const validateDateRange = (arrivalDate: Date, departureDate: Date) => { ... }
   export const findCityByName = async (cityName: string) => { ... }
   // Common schemas, helpers, etc.
   ```

2. **Split routes**:
   - Move individual routes to `umrahVisaIndividual.routes.ts`
   - Move group routes to `umrahVisaGroup.routes.ts`
   - Move workflow routes to `umrahVisaWorkflow.routes.ts`
   - Keep shared routes in `umrahVisa.routes.ts`

3. **Update main router**:
   ```typescript
   // backend/src/app.ts or index.ts
   app.use('/api/umrah-visa', umrahVisaRoutes);
   app.use('/api/umrah-visa', umrahVisaIndividualRoutes);
   app.use('/api/umrah-visa', umrahVisaGroupRoutes);
   app.use('/api/umrah-visa', umrahVisaWorkflowRoutes);
   ```

4. **Benefits**:
   - ✅ Better code organization
   - ✅ Easier to maintain
   - ✅ Reduced merge conflicts
   - ✅ Clear separation of concerns
   - ✅ Easier to test
   - ✅ Better developer experience

---

## Key Differences: Individual vs Group Visa

| Feature | Individual Visa | Group Visa |
|---------|----------------|------------|
| **Visa Type** | `individual_visa` | `group_visa` |
| **Group Number** | Optional | Required |
| **Accommodation** | Hotel OR Iqama | Always Hotel |
| **Documents** | Individual passport docs | ZIP file with PAN cards |
| **Passenger Names** | Required | Optional (use group name) |
| **Initial Status** | `pending` or `group_assigned` or `voucher` | Always `voucher` |
| **Provider** | Optional | Optional (`umrahVisaProviderId`) |

---

## Summary

1. **Services Table**: ✅ **KEEP** - Useful for extensibility
2. **Route Files**: ⚠️ **SPLIT** - Current 2,802 line file is too large
3. **Recommended Split**: By visa type (individual/group) + workflow routes

This refactoring will improve maintainability, reduce merge conflicts, and make the codebase more scalable.

