-- ==============================================================================
-- EVENTPASS DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- Case Study: Godswill Akpabio Event Centre, Uyo, Akwa Ibom State
-- ==============================================================================

-- 1. Enable UUID Extension (optional for id generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    venue TEXT NOT NULL,
    city TEXT NOT NULL,
    event_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    organizer_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    max_guests INTEGER NOT NULL DEFAULT 1000,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Gates Table
CREATE TABLE IF NOT EXISTS gates (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'Main Concourse',
    assigned_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    total_scans INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Guests Table
CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    organization TEXT,
    category TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    qr_token TEXT NOT NULL UNIQUE,
    assigned_gate_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    check_in_status TEXT DEFAULT 'pending', -- 'pending', 'checked_in'
    first_check_in_time TIMESTAMPTZ,
    first_check_in_gate TEXT,
    check_in_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Event Staff & Security Personnel Table
CREATE TABLE IF NOT EXISTS event_staff (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL, -- 'Scanner Staff', 'Security', 'Event Manager'
    gate_id TEXT,
    gate_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Attendance Logs Table (Scans & Check-in attempts)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    guest_id TEXT,
    guest_name TEXT,
    guest_category TEXT,
    guest_organization TEXT,
    qr_token TEXT NOT NULL,
    gate_id TEXT NOT NULL,
    gate_name TEXT NOT NULL,
    scanner_user_id TEXT,
    scanner_user_name TEXT,
    scan_time TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL, -- 'valid', 'duplicate', 'invalid', 'cancelled'
    device_info TEXT,
    notes TEXT
);

-- 7. Audit Logs Table (Immutable security log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    event_id TEXT,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT
);

-- ------------------------------------------------------------------------------
-- Indexes for Sub-Second QR Authentication & Real-Time Lookups
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_guests_qr_token ON guests(qr_token);
CREATE INDEX IF NOT EXISTS idx_guests_event_email ON guests(event_id, email);
CREATE INDEX IF NOT EXISTS idx_guests_reference ON guests(reference_number);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_logs(status);
CREATE INDEX IF NOT EXISTS idx_attendance_time ON attendance_logs(scan_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_id);

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow Public read/write for event demo & verification access
CREATE POLICY "Public Read Events" ON events FOR SELECT USING (true);
CREATE POLICY "Public Insert Events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Events" ON events FOR UPDATE USING (true);

CREATE POLICY "Public Read Gates" ON gates FOR SELECT USING (true);
CREATE POLICY "Public Insert Gates" ON gates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Gates" ON gates FOR UPDATE USING (true);

CREATE POLICY "Public Read Guests" ON guests FOR SELECT USING (true);
CREATE POLICY "Public Insert Guests" ON guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Guests" ON guests FOR UPDATE USING (true);

CREATE POLICY "Public Read Staff" ON event_staff FOR SELECT USING (true);
CREATE POLICY "Public Insert Staff" ON event_staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Staff" ON event_staff FOR UPDATE USING (true);

CREATE POLICY "Public Read Attendance" ON attendance_logs FOR SELECT USING (true);
CREATE POLICY "Public Insert Attendance" ON attendance_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Audit" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Public Insert Audit" ON audit_logs FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- Enable Supabase Realtime for Multi-Gate Synchronization
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs, guests, events, gates;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- ------------------------------------------------------------------------------
-- Seed Initial Godswill Akpabio Event Centre Data
-- ------------------------------------------------------------------------------
INSERT INTO events (id, name, description, venue, city, event_date, start_time, end_time, organizer_name, contact_email, contact_phone, max_guests, status)
VALUES 
(
    'evt-gaec-2026-001',
    'Akwa Ibom Tech & Leadership Summit 2026',
    'Flagship pan-African governance, technological innovation, and investment summit convening at the Godswill Akpabio International Event Complex.',
    'Godswill Akpabio Event Centre, Main Grand Auditorium',
    'Uyo, Akwa Ibom State',
    '2026-10-15',
    '08:30 AM',
    '05:30 PM',
    'Akwa Ibom State Ministry of Science & Digital Economy',
    'summit@godswillakpabioec.ng',
    '+234 803 123 4567',
    1200,
    'ongoing'
),
(
    'evt-gaec-2026-002',
    'South-South Enterprise & Innovation Gala Awards',
    'Annual corporate banquet honoring industrial excellence, entrepreneurship, and creative industry pioneers across the Niger Delta region.',
    'Godswill Akpabio Event Centre, Banquet Hall B',
    'Uyo, Akwa Ibom State',
    '2026-11-20',
    '06:00 PM',
    '11:00 PM',
    'South-South Commerce Chamber',
    'awards@godswillakpabioec.ng',
    '+234 802 987 6543',
    800,
    'published'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO gates (id, event_id, name, location, is_active, assigned_categories, total_scans)
VALUES 
('gate-01', 'evt-gaec-2026-001', 'Gate A — Main Concourse Entrance', 'North Concourse, West Wing', true, ARRAY['General Guest', 'Student', 'Partner'], 0),
('gate-02', 'evt-gaec-2026-001', 'Gate B — VIP & Executive Pavilion', 'East Wing Private Driveway', true, ARRAY['VIP', 'Government Official', 'Speaker'], 0),
('gate-03', 'evt-gaec-2026-001', 'Gate C — Media & Press Gate', 'South Media Terrace', true, ARRAY['Media', 'Staff'], 0),
('gate-04', 'evt-gaec-2026-001', 'Gate D — Logistics & Crew Gate', 'Service Quadrangle', true, ARRAY['Staff'], 0)
ON CONFLICT (id) DO NOTHING;
