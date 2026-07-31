-- Migration: Add sholat column to student_monthly_reports
-- This tracks daily prayer performance (Sholat 5 waktu)
-- Values: 'Ya'/'Tidak'/'Belum' or a JSON like {"subuh":true,"dzuhur":true,...}

ALTER TABLE student_monthly_reports
ADD COLUMN IF NOT EXISTS sholat varchar DEFAULT NULL;

COMMENT ON COLUMN student_monthly_reports.sholat IS 'Sholat prayer status for the month (e.g. Ya/Tidak/Belum or structured data)';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'student_monthly_reports' AND column_name = 'sholat';
