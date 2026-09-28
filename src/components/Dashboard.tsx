import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  DoorOpen, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  Download, 
  QrCode, 
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { storage } from '../services/storage';
import { EventItem, Guest, AttendanceLog, Gate } from '../types';

interface DashboardProps {
  event: EventItem | undefined;
  onNavigateToScanner: () => void;
  onNavigateToGuests: () => void;
  onNavigateToReports: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  event,
  onNavigateToScanner,
  onNavigateToGuests,
  onNavigateToReports,
}) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');

  const loadData = () => {
    if (!event) return;
    setGuests(storage.getGuests(event.id));
    setLogs(storage.getAttendanceLogs(event.id));
    setGates(storage.getGates(event.id));
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('eventpass:data_updated', handleUpdate);
    return () => window.removeEventListener('eventpass:data_updated', handleUpdate);
  }, [event]);

  // Calculations
  const totalGuests = guests.length;
  const checkedInCount = guests.filter(g => g.check_in_status === 'checked_in').length;
  const pendingCount = totalGuests - checkedInCount;
  const checkInRate = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;
  
  const vipCount = guests.filter(g => g.category === 'VIP' || g.category === 'Government Official').length;
  const duplicateAttempts = logs.filter(l => l.status === 'duplicate').length;
  const invalidAttempts = logs.filter(l => l.status === 'invalid' || l.status === 'cancelled').length;

  // Gate breakdown
  const gateStats = gates.map(gate => {
    const gateLogs = logs.filter(l => l.gate_id === gate.id);
    const validCount = gateLogs.filter(l => l.status === 'valid').length;
    const dupeCount = gateLogs.filter(l => l.status === 'duplicate').length;
    return {
      gate,
      total: gateLogs.length,
      valid: validCount,
      duplicates: dupeCount,
    };
  });

  // Category breakdown
  const categories = ['VIP', 'Speaker', 'Government Official', 'Partner', 'Media', 'Student', 'General Guest'];
  const categoryCounts = categories.map(cat => ({
    name: cat,
    total: guests.filter(g => g.category === cat).length,
    checkedIn: guests.filter(g => g.category === cat && g.check_in_status === 'checked_in').length,
  })).filter(c => c.total > 0);

  // Hourly arrival mock/distribution based on logs
  const hoursMap: { [hour: string]: number } = {
    '08:00 AM': 0,
    '09:00 AM': 0,
    '10:00 AM': 0,
    '11:00 AM': 0,
    '12:00 PM': 0,
    '01:00 PM': 0,
    '02:00 PM': 0,
  };

  logs.forEach(l => {
    if (l.status === 'valid') {
      const date = new Date(l.scan_time);
      const h = date.getHours();
      if (h <= 8) hoursMap['08:00 AM'] += 1;
      else if (h === 9) hoursMap['09:00 AM'] += 1;
      else if (h === 10) hoursMap['10:00 AM'] += 1;
      else if (h === 11) hoursMap['11:00 AM'] += 1;
      else if (h === 12) hoursMap['12:00 PM'] += 1;
      else if (h === 13) hoursMap['01:00 PM'] += 1;
      else hoursMap['02:00 PM'] += 1;
    }
  });

  const maxHourValue = Math.max(...Object.values(hoursMap), 5);

  const filteredLogs = logs.filter(l => {
    if (statusFilter === 'all') return true;
    return l.status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Event Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Godswill Akpabio Event Centre, Uyo</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">ORGANIZER DASHBOARD</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
              {event?.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {event?.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onNavigateToScanner}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Open Scanner</span>
            </button>
            <button
              onClick={onNavigateToGuests}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Manage Guests</span>
            </button>
            <button
              onClick={onNavigateToReports}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Guests */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Registered</span>
            <div className="text-3xl font-black text-slate-900 mt-2">{totalGuests}</div>
            <span className="text-xs text-slate-400 mt-1 block">Max capacity: {event?.max_guests || 1500}</span>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Checked In */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Checked In</span>
            <div className="text-3xl font-black text-emerald-700 mt-2">{checkedInCount}</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{checkInRate}% attendance rate</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Arrival */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Awaiting Entry</span>
            <div className="text-3xl font-black text-slate-800 mt-2">{pendingCount}</div>
            <span className="text-xs text-slate-400 mt-1 block">{100 - checkInRate}% remaining</span>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Security / Duplicates Flagged */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Duplicate Scans Blocked</span>
            <div className="text-3xl font-black text-amber-700 mt-2">{duplicateAttempts}</div>
            <span className="text-xs text-slate-400 mt-1 block">
              {invalidAttempts} invalid/cancelled scans
            </span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Visuals: Hourly Progression & Gate Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Check-In Progression Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Arrivals Progression By Hour
              </h2>
              <p className="text-xs text-slate-500">Live check-in throughput at Godswill Akpabio Event Centre gates</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
              Peak: 08:00 - 10:00 AM
            </span>
          </div>

          <div className="h-48 pt-6 pb-2 flex items-end justify-between gap-3 border-b border-slate-100">
            {Object.entries(hoursMap).map(([hour, count]) => {
              const heightPercent = Math.max(8, Math.round((count / maxHourValue) * 100));
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[11px] font-bold text-slate-700 opacity-80 group-hover:opacity-100">
                    {count}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-32 flex items-end justify-center p-1">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[36px] bg-slate-900 group-hover:bg-emerald-600 rounded-t-md transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono rotate-[-35deg] sm:rotate-0 mt-1">
                    {hour.replace(':00', '')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3">
            <span>Entry Gates Open: 08:00 AM</span>
            <span>Total Logged Entries: {checkedInCount}</span>
          </div>
        </div>

        {/* Gate Performance Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Gate Traffic & Staffing
            </h2>
            <span className="text-xs text-slate-500">{gates.length} Gates Active</span>
          </div>

          <div className="space-y-3 mt-4">
            {gateStats.map(({ gate, total, valid, duplicates }) => {
              const percent = checkedInCount > 0 ? Math.round((valid / checkedInCount) * 100) : 0;
              return (
                <div key={gate.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-slate-900">{gate.name}</span>
                    <span className="font-bold text-slate-700">{valid} check-ins ({percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(5, percent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
                    <span className="truncate max-w-[200px]">{gate.location}</span>
                    {duplicates > 0 && (
                      <span className="text-amber-700 font-semibold">{duplicates} dupe flagged</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Breakdown & Live Scan Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Guest Categories (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Attendance by Category
          </h2>

          <div className="space-y-3">
            {categoryCounts.map((cat) => {
              const pct = cat.total > 0 ? Math.round((cat.checkedIn / cat.total) * 100) : 0;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-800">{cat.name}</span>
                    <span className="text-slate-500">
                      <strong className="text-slate-900">{cat.checkedIn}</strong> / {cat.total} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Scan Ticker Feed (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Real-Time Attendance Audit Feed
              </h2>
              <p className="text-xs text-slate-500">Latest scans across all entrance gates</p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'valid', 'duplicate', 'invalid'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    statusFilter === filter
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Guest / Credential</th>
                  <th className="pb-2.5">Category</th>
                  <th className="pb-2.5">Gate</th>
                  <th className="pb-2.5">Staff Operator</th>
                  <th className="pb-2.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No scans matching filter
                    </td>
                  </tr>
                ) : (
                  filteredLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.status === 'valid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'duplicate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status === 'valid' && <CheckCircle2 className="w-3 h-3" />}
                          {log.status === 'duplicate' && <AlertTriangle className="w-3 h-3" />}
                          {log.status !== 'valid' && log.status !== 'duplicate' && <XCircle className="w-3 h-3" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-slate-900">{log.guest_name || 'Unregistered'}</div>
                        <div className="font-mono text-[10px] text-slate-500">{log.qr_token}</div>
                      </td>
                      <td className="py-3 text-slate-600">
                        {log.guest_category || '—'}
                      </td>
                      <td className="py-3 text-slate-700 font-medium">
                        {log.gate_name}
                      </td>
                      <td className="py-3 text-slate-500">
                        {log.scanner_user_name}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-500">
                        {new Date(log.scan_time).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
