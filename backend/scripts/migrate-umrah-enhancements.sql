-- Migration script for Umrah Visa Booking enhancements
-- Run this after updating the Prisma schema

-- Add soft delete fields to umrah_visa_bookings table
ALTER TABLE umrah_visa_bookings 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP;

-- Add soft delete fields to umrah_passengers table
ALTER TABLE umrah_passengers 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP;

-- Add soft delete fields to documents table
ALTER TABLE documents 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP;

-- Create transport_pricing table
CREATE TABLE transport_pricing (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    route_id VARCHAR(100) NOT NULL,
    transport_id VARCHAR(100) NOT NULL,
    pax INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT transport_pricing_pkey PRIMARY KEY (id),
    CONSTRAINT transport_pricing_unique UNIQUE (route_id, transport_id, pax)
);

-- Add indexes for better performance
CREATE INDEX idx_umrah_visa_bookings_arrival_date ON umrah_visa_bookings(arrival_date);
CREATE INDEX idx_umrah_visa_bookings_departure_date ON umrah_visa_bookings(departure_date);
CREATE INDEX idx_umrah_visa_bookings_booking_mode ON umrah_visa_bookings(booking_mode);
CREATE INDEX idx_umrah_visa_bookings_accommodation_type ON umrah_visa_bookings(accommodation_type);
CREATE INDEX idx_umrah_visa_bookings_is_deleted ON umrah_visa_bookings(is_deleted);
CREATE INDEX idx_umrah_visa_bookings_created_at ON umrah_visa_bookings(created_at);

CREATE INDEX idx_umrah_passengers_is_deleted ON umrah_passengers(is_deleted);
CREATE INDEX idx_umrah_passengers_passport_number ON umrah_passengers(passport_number);
CREATE INDEX idx_umrah_passengers_nationality ON umrah_passengers(nationality);

CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_is_deleted ON documents(is_deleted);

CREATE INDEX idx_transport_pricing_route_id ON transport_pricing(route_id);
CREATE INDEX idx_transport_pricing_transport_id ON transport_pricing(transport_id);
CREATE INDEX idx_transport_pricing_is_active ON transport_pricing(is_active);

-- Insert default transport pricing data
INSERT INTO transport_pricing (route_id, transport_id, pax, price) VALUES
-- Jeddah to Makkah
('jeddah_to_makkah', 'lexus_es_250', 3, 150.00),
('jeddah_to_makkah', 'staria', 8, 250.00),
('jeddah_to_makkah', 'gmc', 7, 220.00),
('jeddah_to_makkah', 'hiace', 10, 220.00),

-- Jeddah to Madina
('jeddah_to_madina', 'lexus_es_250', 3, 200.00),
('jeddah_to_madina', 'staria', 8, 350.00),
('jeddah_to_madina', 'gmc', 7, 320.00),
('jeddah_to_madina', 'hiace', 10, 320.00),

-- Jeddah - Makkah - Madina - Jeddah
('jeddah_makkah_madina_jeddah', 'lexus_es_250', 3, 400.00),
('jeddah_makkah_madina_jeddah', 'staria', 8, 700.00),
('jeddah_makkah_madina_jeddah', 'gmc', 7, 650.00),
('jeddah_makkah_madina_jeddah', 'hiace', 10, 650.00),

-- Jeddah to Jeddah
('jeddah_to_jeddah', 'lexus_es_250', 3, 100.00),
('jeddah_to_jeddah', 'staria', 8, 150.00),
('jeddah_to_jeddah', 'gmc', 7, 150.00),
('jeddah_to_jeddah', 'hiace', 10, 180.00);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_transport_pricing_updated_at 
    BEFORE UPDATE ON transport_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE transport_pricing IS 'Transport pricing configuration for different routes and vehicle types';
COMMENT ON COLUMN umrah_visa_bookings.is_deleted IS 'Soft delete flag for umrah visa bookings';
COMMENT ON COLUMN umrah_visa_bookings.deleted_at IS 'Timestamp when booking was soft deleted';
COMMENT ON COLUMN umrah_passengers.is_deleted IS 'Soft delete flag for passengers';
COMMENT ON COLUMN umrah_passengers.deleted_at IS 'Timestamp when passenger was soft deleted';
COMMENT ON COLUMN documents.is_deleted IS 'Soft delete flag for documents';
COMMENT ON COLUMN documents.deleted_at IS 'Timestamp when document was soft deleted';
