-- Migration: Add status and party_name columns to umrah_visa_details table
-- This will make queries simpler and avoid joins

-- Add status column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'umrah_visa_details' 
                   AND column_name = 'status') THEN
        ALTER TABLE umrah_visa_details 
        ADD COLUMN status VARCHAR(50) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'completed'));
    END IF;
END $$;

-- Add party_name column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'umrah_visa_details' 
                   AND column_name = 'party_name') THEN
        ALTER TABLE umrah_visa_details 
        ADD COLUMN party_name VARCHAR(255);
    END IF;
END $$;

-- Add index for status column (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_umrah_visa_details_status ON umrah_visa_details(status);

-- Add index for party_name column (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_umrah_visa_details_party_name ON umrah_visa_details(party_name);

-- Update existing records with party_name from parties table
UPDATE umrah_visa_details 
SET party_name = p.party_name
FROM services s, parties p
WHERE umrah_visa_details.service_id = s.id 
AND s.party_id = p.id
AND umrah_visa_details.party_name IS NULL;

-- Update existing records with status from services table (if status is NULL)
UPDATE umrah_visa_details 
SET status = COALESCE(umrah_visa_details.status, s.status, 'pending')
FROM services s
WHERE umrah_visa_details.service_id = s.id 
AND umrah_visa_details.status IS NULL;
