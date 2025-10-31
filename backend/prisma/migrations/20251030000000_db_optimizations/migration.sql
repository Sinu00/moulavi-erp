-- Add helpful indexes on foreign keys
CREATE INDEX IF NOT EXISTS parties_created_by_idx ON public.parties("created_by");
CREATE INDEX IF NOT EXISTS trip_info_documents_downloaded_by_idx ON public.trip_info("documents_downloaded_by");

-- Drop duplicate unique index on transport_masters (keep the canonical one)
DROP INDEX IF EXISTS public.transport_masters_from_location_id_to_location_id_vehicle__key;

-- Drop legacy transport_pricing table if unused
DROP TABLE IF EXISTS public.transport_pricing;


