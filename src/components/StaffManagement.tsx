import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  DoorOpen, 
  X, 
  Building,
  KeyRound,
  CheckCircle2,
  Edit2,
  Lock,
  UserCheck,
  Shield
} from 'lucide-react';
import { storage } from '../services/storage';
import { accountService, UserAccount } from '../services/accountService';
import { EventStaff, Gate, EventItem, UserRole } from '../types';

interface StaffManagementProps {
  event: EventItem | undefined;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ event }) => {
  const [staffList, setStaffList] = useState<EventStaff[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<EventStaff | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stationRole, setStationRole] = useState<'Organizer' | 'Scanner Staff' | 'Security' | 'Event Manager'>('Scanner Staff');
  const [gateId, setGateId] = useState('');
  
  // Account creation / role assignment states
  const [createAccount, setCreateAccount] = useState(true);
  const [password, setPassword] = useState('');
  const [systemRole, setSystemRole] = useState<UserRole>('scanner_staff');

  const loadData = () => {
    if (!event) return;
    const s = storage.getStaff(event.id);
    const g = storage.getGates(event.id);
    const u = accountService.getUsers();
    setStaffList(s);
    setGates(g);
    setUsers(u);
    if (!gateId && g.length > 0) {
      setGateId(g[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('eventpass:data_updated', handleUpdate);
    window.addEventListener('eventpass:users_updated', handleUpdate);
    return () => {
      window.removeEventListener('eventpass:data_updated', handleUpdate);
      window.removeEventListener('eventpass:users_updated', handleUpdate);
    };
  }, [event]);

  const openAddModal = () => {
    setEditingStaff(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setStationRole('Scanner Staff');
    setCreateAccount(true);
    setPassword('');
    setSystemRole('scanner_staff');
    setShowAddModal(true);
  };

  const openEditModal = (staff: EventStaff) => {
    setEditingStaff(staff);
    setFullName(staff.full_name);
    setEmail(staff.email);
    setPhone(staff.phone || '');
    setStationRole(staff.role);
    setGateId(staff.gate_id || (gates[0]?.id || ''));

    const existingAccount = accountService.getUserByEmail(staff.email);
    if (existingAccount) {
      setCreateAccount(true);
      setPassword(existingAccount.pass);
      setSystemRole(existingAccount.role);
    } else {
      setCreateAccount(false);
      setPassword('');
      setSystemRole(
        staff.role === 'Event Manager' ? 'organizer' :
        staff.role === 'Organizer' ? 'super_admin' : 'scanner_staff'
      );
    }

    setShowAddModal(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !event) return;

    const assignedGate = gates.find(g => g.id === gateId) || gates[0];
    const cleanEmail = email.trim().toLowerCase();

    const targetStaff: EventStaff = {
      id: editingStaff ? editingStaff.id : `staff-${Date.now()}`,
      event_id: event.id,
      full_name: fullName.trim(),
      email: cleanEmail,
      phone: phone.trim() || '+234 800 000 0000',
      role: stationRole,
      system_role: systemRole,
      gate_id: assignedGate?.id || 'gate-default',
      gate_name: assignedGate?.name || 'Main Concourse Gate',
      is_active: editingStaff ? editingStaff.is_active : true,
      has_account: createAccount,
      created_at: editingStaff ? editingStaff.created_at : new Date().toISOString(),
    };

    // Save Staff to Event Storage
    storage.saveStaff(targetStaff);

    // Save or update User Account in Account Service if requested
    if (createAccount) {
      accountService.saveAccount({
        name: fullName.trim(),
        email: cleanEmail,
        pass: password || 'password123',
        role: systemRole,
      });
    }

    storage.logAudit(
      'Super Admin',
      'Super Administrator',
      event.id,
      editingStaff ? 'Staff Account Modified' : 'Staff Member & Account Created',
      `Super Admin ${editingStaff ? 'updated' : 'created'} staff ${targetStaff.full_name} (${cleanEmail}) with system role [${systemRole}] at ${targetStaff.gate_name}`
    );

    setShowAddModal(false);
    setEditingStaff(null);
    loadData();
  };

  const handleToggleStaffActive = (staff: EventStaff) => {
    const updated = { ...staff, is_active: !staff.is_active };
    storage.saveStaff(updated);
    loadData();
  };

  const handleQuickCreateAccount = (staff: EventStaff) => {
    const assignedRole: UserRole = 
      staff.role === 'Event Manager' ? 'organizer' : 'scanner_staff';
    
    accountService.saveAccount({
      name: staff.full_name,
      email: staff.email,
      pass: 'password123',
      role: assignedRole,
    });

    const updated = { ...staff, system_role: assignedRole, has_account: true };
    storage.saveStaff(updated);

    storage.logAudit(
      'Super Admin',
      'Super Administrator',
      event?.id || '',
      'Staff Account Provisioned',
      `Super Admin provisioned login account for ${staff.full_name} (${staff.email}) with role [${assignedRole}]`
    );

    loadData();
  };

  const getRoleBadgeColor = (role: UserRole | undefined) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'organizer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scanner_staff':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'guest':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getRoleLabel = (role: UserRole | undefined) => {
    switch (role) {
      case 'super_admin': return 'Super Administrator';
      case 'organizer': return 'Event Organizer';
      case 'scanner_staff': return 'Entrance Gate Staff';
      case 'guest': return 'Guest Attendee';
      default: return 'No System Role';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span>SUPER ADMIN PERSONNEL MANAGEMENT</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">{staffList.length} Staff Members</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Staff Roster & Account Role Assignment
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Super Admins can create staff members, assign system access roles, provision login accounts, and map gate stations.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff & Create Account</span>
        </button>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Staff Operator Name</th>
                <th className="py-3.5 px-4">Station Duty</th>
                <th className="py-3.5 px-4">Login Account & System Role</th>
                <th className="py-3.5 px-4">Gate Terminal</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Super Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No staff members registered yet. Click <strong>"Add Staff & Create Account"</strong> to assign personnel.
                  </td>
                </tr>
              ) : (
                staffList.map((member) => {
                  const account = accountService.getUserByEmail(member.email);
                  const effectiveSystemRole = account?.role || member.system_role;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{member.full_name}</span>
                          {account && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Sign-in Account"></span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{member.email}</span>
                          <span className="text-slate-300">•</span>
                          <span>{member.phone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                          {member.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {account ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRoleBadgeColor(effectiveSystemRole)}`}>
                              <KeyRound className="w-3 h-3" />
                              <span>{getRoleLabel(effectiveSystemRole)}</span>
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">Pass: {account.pass}</div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleQuickCreateAccount(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Create Login Account</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                          <span>{member.gate_name}</span>
                        </div>
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Staff & Assign Role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStaffActive(member)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                          >
                            {member.is_active ? 'Mark Off Duty' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm tracking-wide uppercase">
                  {editingStaff ? 'EDIT STAFF MEMBER & ASSIGN ROLE' : 'ADD STAFF & CREATE LOGIN ACCOUNT'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                    Station Duty Role *
                  </label>
                  <select
                    value={stationRole}
                    onChange={(e) => setStationRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Scanner Staff">Scanner Staff</option>
                    <option value="Security">Security</option>
                    <option value="Event Manager">Event Manager</option>
                    <option value="Organizer">Organizer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Gate Terminal *
                  </label>
                  <select
                    value={gateId}
                    onChange={(e) => setGateId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  >
                    {gates.length === 0 ? (
                      <option value="gate-default">Main Entrance Terminal</option>
                    ) : (
                      gates.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Super Admin Account Creation & Role Assignment Section */}
              <div className="p-4 bg-purple-50/80 rounded-xl border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                    <KeyRound className="w-4 h-4 text-purple-600" />
                    <span>User Login Credentials & System Role Assignment</span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-purple-900">
                    <input
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Active Login Account</span>
                  </label>
                </div>

                {createAccount && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                        Assigned System Role *
                      </label>
                      <select
                        value={systemRole}
                        onChange={(e) => setSystemRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-lg text-purple-950 font-bold focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="super_admin">Super Administrator</option>
                        <option value="organizer">Event Organizer</option>
                        <option value="scanner_staff">Entrance Gate Staff</option>
                        <option value="guest">Guest Attendee</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                        Sign-In Password *
                      </label>
                      <input
                        type="text"
                        required={createAccount}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Set password..."
                        className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
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
                  className="px-5 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {editingStaff ? 'Update Staff Member' : 'Save Staff & Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
