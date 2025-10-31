# Seed Scripts

## 🎯 Main Seed Script

**Use only this one script for seeding:**

```bash
node scripts/seed-all.js
```

This comprehensive script seeds everything in the correct order:
1. ✅ Currency Master (SAR, INR)
2. ✅ Country Master (Saudi Arabia, India)
3. ✅ Location Master - Destinations (MAK, MED, JED, RUH, TAF)
4. ✅ Location Master - Airports (JED, MED, RUH, DMM, TIF, AHB, GIZ, ELQ)
5. ✅ Airport Master (legacy table for backward compatibility)
6. ✅ Hotel Master (28 hotels across Makkah, Madinah, Jeddah)
7. ✅ Transport Master (transport routes with various vehicle types)

## 🗑️ Deprecated Scripts

The following individual seed scripts are **deprecated** but kept for reference:

- ❌ `seed-currency-master.js` - Use `seed-all.js` instead
- ❌ `seed-destination-master.js` - No longer needed (DestinationMaster removed)
- ❌ `seed-hotel-master.js` - Use `seed-all.js` instead
- ❌ `seed-transport-master.js` - Use `seed-all.js` instead
- ❌ `seed-airport-master.js` - Use `seed-all.js` instead
- ❌ `seed-location-master.js` - Use `seed-all.js` instead (this was for migration)
- ❌ `seed-minimum-master-data.js` - Use `seed-all.js` instead

## 🚀 Quick Start

After running migrations:

```bash
# Seed all master data
node scripts/seed-all.js

# Create admin user (optional)
node scripts/create-admin.js
```

That's it! No need to run multiple scripts.

