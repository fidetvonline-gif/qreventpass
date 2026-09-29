import React, { useState, useEffect } from 'react';
import { DoorOpen, Plus, CheckCircle2, Shield, MapPin, X, Building } from 'lucide-react';
import { storage } from '../services/storage';
import { Gate, GuestCategory, EventItem } from '../types';

interface GatesManagementProps {
  event: EventItem | undefined;
}

export const GatesManagement: React.FC<GatesManagementProps> = ({ event }) => {
  const [gates, setGates] = useState<Gate[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<GuestCategory[]>(['General Guest']);

  const loadGates = async () => {
    if (!event) return;
    const [g, logs] = await Promise.all([
      storage.getGates(event.id),
      storage.getAttendanceLogs(event.id)
    ]);
    // Enrich with scan count
    const enriched = g.map(item => ({
      ...item,
      total_scans: logs.filter(l => l.gate_id === item.id && l.status === 'valid').length,
    }));
    setGates(enriched);
  };

  useEffect(() => {
    loadGates();
    const handleUpdate = () => { loadGates(); };
    window.addEventListener('eventpass:data_updated', handleUpdate);
    return () => window.removeEventListener('eventpass:data_updated', handleUpdate);
  }, [event]);

  const allCategories: GuestCategory[] = [
    'VIP', 'Speaker', 'Government Official', 'Partner', 'Media', 'Staff', 'Student', 'General Guest'
  ];

  const toggleCategory = (cat: GuestCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !event) return;

    const newGate: Gate = {
      id: `gate-${Date.now()}`,
      event_id: event.id,
      name: name.trim(),
      location: location.trim() || 'Entrance Concourse',
      assigned_categories: selectedCategories.length > 0 ? selectedCategories : ['General Guest'],
      is_active: true,
      created_at: new Date().toISOString(),
    };

    await storage.saveGate(newGate);
    storage.logAudit(
      'Organizer',
      'Event Organizer',
      event.id,
      'Gate Added',
      `Configured entrance gate: ${newGate.name}`
    );

    setName('');
    setLocation('');
    setSelectedCategories(['General Guest']);
    setShowAddModal(false);
    loadGates();
  };

  const handleToggleGateActive = async (gate: Gate) => {
    const updated = { ...gate, is_active: !gate.is_active };
    await storage.saveGate(updated);
    loadGates();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>Event Management</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">Entrance Architecture</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Gate & Terminal Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure access control points, assigned guest tiers, and monitor per-gate security traffic.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Entrance Gate</span>
        </button>
      </div>

      {/* Gates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {gates.map((gate) => (
          <div
            key={gate.id}
            className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
              gate.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-800">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <button
                  onClick={() => handleToggleGateActive(gate)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    gate.is_active
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {gate.is_active ? 'Active' : 'Offline'}
                </button>
              </div>

              <h2 className="text-base font-bold text-slate-900 mt-3">{gate.name}</h2>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{gate.location}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Assigned Tiers
                </span>
                <div className="flex flex-wrap gap-1">
                  {gate.assigned_categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Check-Ins:</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {gate.total_scans || 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Gate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm tracking-wide">ADD NEW GATE / TERMINAL</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gate Identifier / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gate E — South Annex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. East Concourse, Hall B"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Allowed Attendee Categories
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {allCategories.map((cat) => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`p-2 rounded-lg text-xs font-medium text-left border transition-colors flex items-center justify-between ${
                          isChecked
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Create Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
