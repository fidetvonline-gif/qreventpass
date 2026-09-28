import React, { useState, useEffect } from 'react';
import { Shield, Clock, Search, History, User } from 'lucide-react';
import { storage } from '../services/storage';
import { AuditLog, EventItem } from '../types';

interface AuditLogsViewProps {
  event: EventItem | undefined;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ event }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    if (!event) return;
    setLogs(storage.getAuditLogs(event.id));
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('eventpass:data_updated', handleUpdate);
    return () => window.removeEventListener('eventpass:data_updated', handleUpdate);
  }, [event]);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q) ||
      log.user_name.toLowerCase().includes(q) ||
      log.user_role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Compliance & Accountability</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">{logs.length} System Records</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            System Security & Action Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of gate operations, duplicate credential detections, and administrative actions.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No audit records matching search parameters.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{log.action}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {log.user_role}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{log.description}</p>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="flex items-center sm:justify-end gap-1 text-slate-700 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{log.user_name}</span>
                  </div>
                  <div className="flex items-center sm:justify-end gap-1 text-slate-400 font-mono text-[11px] mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
