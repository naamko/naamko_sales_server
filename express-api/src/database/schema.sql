-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Location Reports Table (production-safe)
CREATE TABLE IF NOT EXISTS location_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id VARCHAR(6) UNIQUE NOT NULL,
    employee_name TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location_type VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    image_url TEXT,
    image_size_kb DECIMAL(10, 2),
    image_format VARCHAR(10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_location_reports_location_id ON location_reports(location_id);
CREATE INDEX IF NOT EXISTS idx_location_reports_employee_name ON location_reports(employee_name);
CREATE INDEX IF NOT EXISTS idx_location_reports_timestamp ON location_reports(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_reports_location_type ON location_reports(location_type);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_location_reports_updated_at ON location_reports;

-- Create trigger
CREATE TRIGGER update_location_reports_updated_at
   BEFORE UPDATE ON location_reports
   FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();