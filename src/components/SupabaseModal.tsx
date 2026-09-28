import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Zap, 
  ShieldCheck,
  Terminal,
  Activity
} from 'lucide-react';
import { checkSupabaseConnection, isSupabaseConfigured, SupabaseConnectionStatus } from '../lib/supabase';
import { storage } from '../services/storage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'schema' | 'guide'>('status');
  const [status, setStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const checkStatus = async () => {
    setIsChecking(true);
    const res = await checkSupabaseConnection();
    setStatus(res);
    setIsChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setSyncFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    const res = await storage.syncWithSupabase();
    setSyncFeedback(res.message);
    setIsSyncing(false);
    checkStatus();
  };

  const schemaSQL = `-- ==============================================================================
-- EVENTPASS DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- Case Study: Godswill Akpabio Event Centre, Uyo, Akwa Ibom State
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Events Table
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

-- 2. Gates Table
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

-- 3. Guests Table
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
    check_in_status TEXT DEFAULT 'pending',
    first_check_in_time TIMESTAMPTZ,
    first_check_in_gate TEXT,
    check_in_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Event Staff & Security Personnel
CREATE TABLE IF NOT EXISTS event_staff (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,
    gate_id TEXT,
    gate_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Attendance Logs Table (Gate Scans & Audit)
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
    status TEXT NOT NULL,
    device_info TEXT,
    notes TEXT
);

-- 6. Immutable Security Audit Trail
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

-- 7. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_guests_qr_token ON guests(qr_token);
CREATE INDEX IF NOT EXISTS idx_guests_event_email ON guests(event_id, email);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_logs(status);
CREATE INDEX IF NOT EXISTS idx_attendance_time ON attendance_logs(scan_time DESC);

-- 8. Row Level Security Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

-- 9. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs, guests, events, gates;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide">SUPABASE CLOUD DATABASE INTEGRATION</h2>
              <p className="text-[11px] text-slate-400">PostgreSQL Backend & Realtime Multi-Gate Sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Connection Status</span>
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'schema'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SQL Schema (DDL)</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Setup Guide</span>
          </button>
        </div>

        {/* Tab 1: Connection Status */}
        {activeTab === 'status' && (
          <div className="p-6 space-y-5">
            {/* Status Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              status?.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : status?.isConfigured
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              {status?.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : status?.isConfigured ? (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Database className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-xs">
                  {status?.connected
                    ? 'Connected to Supabase PostgreSQL & Realtime Engine'
                    : status?.isConfigured
                    ? 'Credentials Detected — Tables Pending Setup'
                    : 'Running in Local Cache Mode (Supabase not configured)'}
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {status?.message || 'Detecting backend status...'}
                </p>
                {status?.url && (
                  <div className="text-[11px] font-mono opacity-80 pt-1">
                    Project Endpoint: {status.url}
                  </div>
                )}
              </div>
            </div>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Realtime Broadcast</span>
                <span className="font-bold text-slate-800 mt-1 block">
                  {status?.connected ? 'Active WebSocket Channel' : 'Local Event Bus'}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Multi-gate sync across Gate A, B, C, D terminals.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Offline Fallback</span>
                <span className="font-bold text-emerald-700 mt-1 block">
                  Always-On Local Cache
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Zero downtime even if network connection drops.
                </p>
              </div>
            </div>

            {syncFeedback && (
              <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-800 border border-slate-200 font-mono">
                {syncFeedback}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={checkStatus}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              {status?.isConfigured && (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Data with Supabase</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: SQL Schema */}
        {activeTab === 'schema' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-900">PostgreSQL Schema & Security Policies</h3>
                <p className="text-[11px] text-slate-500">Run this in your Supabase project's SQL Editor</p>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy SQL Script'}</span>
              </button>
            </div>

            <div className="bg-slate-950 text-slate-200 font-mono text-[11px] p-4 rounded-xl max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
              <pre>{schemaSQL}</pre>
            </div>

            <p className="text-[11px] text-slate-500">
              Creates <code>events</code>, <code>gates</code>, <code>guests</code>, <code>event_staff</code>, <code>attendance_logs</code>, and <code>audit_logs</code> tables with sub-second indexes and Realtime replication.
            </p>
          </div>
        )}

        {/* Tab 3: Setup Guide */}
        {activeTab === 'guide' && (
          <div className="p-6 space-y-4 text-xs text-slate-600">
            <h3 className="font-bold text-slate-900 text-sm">How to Connect Your Supabase Project</h3>

            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-slate-900 block">Create or Open your Supabase Project</strong>
                  <span>Go to your Supabase dashboard at <code className="text-slate-800 font-mono">supabase.com</code>.</span>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-slate-900 block">Run the SQL Schema Script</strong>
                  <span>In your Supabase project, navigate to <strong>SQL Editor</strong> &rarr; <strong>New Query</strong>, paste the script from the <strong>SQL Schema</strong> tab above, and click <strong>Run</strong>.</span>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-slate-900 block">Configure Environment Secrets</strong>
                  <span>In AI Studio, open <strong>Settings &rarr; Secrets</strong> (or your <code>.env</code> file) and set:</span>
                  <div className="mt-2 p-2 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] space-y-1">
                    <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
                    <div>VITE_SUPABASE_ANON_KEY=your-anon-public-key</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 text-slate-500 text-[11px]">
              Once configured, all scanner stations, guest registrations, and dashboard charts automatically synchronize across devices in real time.
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
