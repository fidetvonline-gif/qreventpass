import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  DoorOpen,
  Calendar,
  Building
} from 'lucide-react';
import { storage } from '../services/storage';
import { EventItem, AttendanceLog, Gate, Guest } from '../types';

interface ReportsViewProps {
  event: EventItem | undefined;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ event }) => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGate, setSelectedGate] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [guests, setGuests] = useState<Guest[]>([]);

  const loadData = async () => {
    if (!event) return;
    const [logsList, gatesList, guestsList] = await Promise.all([
      storage.getAttendanceLogs(event.id),
      storage.getGates(event.id),
      storage.getGuests(event.id)
    ]);
    setLogs(logsList);
    setGates(gatesList);
    setGuests(guestsList);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => { loadData(); };
    window.addEventListener('eventpass:data_updated', handleUpdate);
    return () => window.removeEventListener('eventpass:data_updated', handleUpdate);
  }, [event]);
  const totalGuests = guests.length;
  const checkedInCount = guests.filter(g => g.check_in_status === 'checked_in').length;
  const pendingCount = totalGuests - checkedInCount;
  const dupeCount = logs.filter(l => l.status === 'duplicate').length;
  const invalidCount = logs.filter(l => l.status === 'invalid' || l.status === 'cancelled').length;

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (log.guest_name && log.guest_name.toLowerCase().includes(q)) ||
      log.qr_token.toLowerCase().includes(q) ||
      log.gate_name.toLowerCase().includes(q) ||
      log.scanner_user_name.toLowerCase().includes(q);

    const matchesGate = selectedGate === 'all' || log.gate_id === selectedGate;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;

    return matchesSearch && matchesGate && matchesStatus;
  });

  const handleExportCSV = () => {
    const headers = ['Scan ID', 'Event', 'Guest Name', 'Category', 'Organization', 'QR Token', 'Gate', 'Scanner Staff', 'Status', 'Timestamp', 'Notes'];
    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${event?.name || 'Event'}"`,
      `"${l.guest_name || 'N/A'}"`,
      `"${l.guest_category || 'N/A'}"`,
      `"${l.guest_organization || 'N/A'}"`,
      `"${l.qr_token}"`,
      `"${l.gate_name}"`,
      `"${l.scanner_user_name}"`,
      `"${l.status}"`,
      `"${new Date(l.scan_time).toLocaleString()}"`,
      `"${l.notes || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `EventPass_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs print:border-none print:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Godswill Akpabio Event Centre ukana</span>
              <span>•</span>
              <span className="text-slate-900 font-bold">OFFICIAL ATTENDANCE REPORT</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Event Verification & Attendance Audit
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive entrance logs, verification timestamps, and gate distribution reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Registered</span>
            <span className="text-xl font-black text-slate-900 block mt-1">{totalGuests}</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Checked In</span>
            <span className="text-xl font-black text-emerald-800 block mt-1">{checkedInCount}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Remaining</span>
            <span className="text-xl font-black text-slate-700 block mt-1">{pendingCount}</span>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Duplicate Scans</span>
            <span className="text-xl font-black text-amber-800 block mt-1">{dupeCount}</span>
          </div>
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Invalid / Denied</span>
            <span className="text-xl font-black text-rose-800 block mt-1">{invalidCount}</span>
          </div>
        </div>

        {/* Gate Breakdown Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Entrance Gate Breakdown
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {gates.map(gate => {
              const count = logs.filter(l => l.gate_id === gate.id && l.status === 'valid').length;
              return (
                <div key={gate.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 flex justify-between items-center">
                  <span className="font-semibold text-slate-800 truncate pr-1">{gate.name}</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center gap-3 print:hidden">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by guest, token, gate or staff operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 w-full md:w-44"
            >
              <option value="all">All Entrance Gates</option>
              {gates.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 w-full md:w-36"
            >
              <option value="all">All Statuses</option>
              <option value="valid">Valid Entry</option>
              <option value="duplicate">Duplicate Attempt</option>
              <option value="invalid">Invalid QR</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Verification Result</th>
                <th className="py-3.5 px-4">Attendee Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Credential Token</th>
                <th className="py-3.5 px-4">Entrance Gate</th>
                <th className="py-3.5 px-4">Staff Operator</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Details / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No attendance records match the selected parameters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.guest_name || 'Unknown Guest'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.guest_category || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      {log.qr_token}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.gate_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.scanner_user_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(log.scan_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {log.notes || log.device_info || 'Authenticated successfully'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
