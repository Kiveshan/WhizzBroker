-- Migration: Add effective date columns to m5_driver_rate table
-- This enables rate versioning based on effective dates

-- Add effective_from column with default historical date
-- Using '2020-01-01' ensures all existing rates are valid for historical legs
ALTER TABLE m5_driver_rate 
ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT '2020-01-01';

-- Add effective_to column (nullable - no expiration by default)
ALTER TABLE m5_driver_rate 
ADD COLUMN IF NOT EXISTS effective_to DATE;

-- Create index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_driver_rate_effective_dates 
ON m5_driver_rate(startingpoint, destination, effective_from);

-- Update all existing rates to have effective_from = '2020-01-01'
-- This ensures backward compatibility with existing legs
UPDATE m5_driver_rate 
SET effective_from = '2020-01-01' 
WHERE effective_from IS NULL OR effective_from = '2020-01-01';

-- Verify the migration
SELECT 
    COUNT(*) as total_rates,
    COUNT(effective_from) as rates_with_effective_from,
    COUNT(effective_to) as rates_with_effective_to,
    MIN(effective_from) as earliest_effective_from,
    MAX(effective_from) as latest_effective_from
FROM m5_driver_rate;
