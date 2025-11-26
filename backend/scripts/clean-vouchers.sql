-- Clean all existing voucher records
-- This will cascade delete related records in voucher_movements, voucher_hotels, voucher_flights
-- Run this script to clean the voucher table before using normalized structure

DELETE FROM vouchers;

-- Verify deletion
SELECT COUNT(*) as remaining_vouchers FROM vouchers;

