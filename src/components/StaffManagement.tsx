import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, User, Phone, Mail, DoorOpen, X, Building } from 'lucide-react';
import { storage } from '../services/storage';
import { EventStaff, Gate, EventItem } from '../types';

interface StaffManagementProps {
  event: EventItem | undefined;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ event }) => {
  const [staffList, setStaffList] = useState<EventStaff[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Scanner Staff' | 'Security' | 'Event Manager'>('Scanner Staff');
  const [gateId, setGateId] = useState('');

  const loadData = () => {
    if (!event) return;
    const s = storage.getStaff(event.id);
    const g = storage.getGates(event.id);
    setStaffList(s);
    setGates(g);
    if (!gateId && g.length > 0) {
      setGateId(g[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('eventpass:data_updated', handleUpdate);
    return () => window.removeEventListener('eventpass:data_updated', handleUpdate);
  }, [event]);

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !event) return;

    const assignedGate = gates.find(g => g.id === gateId) || gates[0];

    const newStaff: EventStaff = {
      id: `staff-${Date.now()}`,
      event_id: event.id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || '+234 800 000 0000',
      role: role,
      gate_id: assignedGate?.id || 'gate-default',
      gate_name: assignedGate?.name || 'Main Concourse Gate',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    storage.saveStaff(newStaff);
    storage.logAudit(
      'Organizer',
      'Event Organizer',
      event.id,
      'Staff Assigned',
      `Assigned ${newStaff.full_name} as ${newStaff.role} at ${newStaff.gate_name}`
    );

    setFullName('');
    setEmail('');
    setPhone('');
    setShowAddModal(false);
    loadData();
  };

  const handleToggleStaffActive = (staff: EventStaff) => {
    const updated = { ...staff, is_active: !staff.is_active };
    storage.saveStaff(updated);
    loadData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Personnel & Access Control</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">{staffList.length} Stationed Operators</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Scanner & Security Staff Roster
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign security officers and entrance operators to designated gate terminals with role-based access.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Operator Name</th>
                <th className="py-3.5 px-4">System Role</th>
                <th className="py-3.5 px-4">Assigned Entrance Gate</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{member.full_name}</div>
                    <div className="text-[11px] text-slate-500">{member.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>{member.gate_name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">
                    {member.phone}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        member.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {member.is_active ? 'On Duty' : 'Off Duty'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleStaffActive(member)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      {member.is_active ? 'Mark Off Duty' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm tracking-wide">ADD SCANNER / SECURITY PERSONNEL</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Officer Ekpenyong Udoh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="officer@eventpass.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+234 802 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Station Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Scanner Staff">Scanner Staff</option>
                    <option value="Security">Security</option>
                    <option value="Event Manager">Event Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Gate *
                  </label>
                  <select
                    value={gateId}
                    onChange={(e) => setGateId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  >
                    {gates.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
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
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
