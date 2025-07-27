-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Location Types Table
CREATE TABLE IF NOT EXISTS location_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Location Reports Table (without telegram_sent column)
CREATE TABLE IF NOT EXISTS location_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_name VARCHAR(255) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    image_url VARCHAR(500),
    image_size_kb DECIMAL(10, 2),
    image_format VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_location_reports_employee_name ON location_reports(employee_name);
CREATE INDEX IF NOT EXISTS idx_location_reports_timestamp ON location_reports(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_reports_location_type ON location_reports(location_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_location_reports_updated_at ON location_reports;
DROP TRIGGER IF EXISTS update_location_types_updated_at ON location_types;

-- Create triggers
CREATE TRIGGER update_location_reports_updated_at 
  BEFORE UPDATE ON location_reports 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_location_types_updated_at 
  BEFORE UPDATE ON location_types 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();