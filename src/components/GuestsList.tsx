import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  UploadCloud, 
  Download, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal, 
  Trash2, 
  RefreshCw, 
  Power, 
  Eye, 
  Copy, 
  Check, 
  X, 
  Building,
  UserCheck
} from 'lucide-react';
import { storage } from '../services/storage';
import { generateToken, generateReferenceNumber } from '../services/qr';
import { Guest, GuestCategory, CheckInStatus, EventItem } from '../types';
import { DigitalPassModal } from './DigitalPassModal';
import { BulkImportModal } from './BulkImportModal';

interface GuestsListProps {
  event: EventItem | undefined;
}

export const GuestsList: React.FC<GuestsListProps> = ({ event }) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [checkInFilter, setCheckInFilter] = useState<string>('all');
  const [selectedGuestForPass, setSelectedGuestForPass] = useState<Guest | null>(null);
  const [showAddGuestModal, setShowAddGuestModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // New Guest Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newCategory, setNewCategory] = useState<GuestCategory>('General Guest');

  const loadGuests = async () => {
    if (!event) return;
    const g = await storage.getGuests(event.id);
    setGuests(g);
  };

  useEffect(() => {
    loadGuests();
    const handleUpdate = () => { loadGuests(); };
    window.addEventListener('eventpass:data_updated', handleUpdate);
    return () => window.removeEventListener('eventpass:data_updated', handleUpdate);
  }, [event]);

  // Filtering
  const filteredGuests = guests.filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      g.full_name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.phone.toLowerCase().includes(q) ||
      g.qr_token.toLowerCase().includes(q) ||
      g.reference_number.toLowerCase().includes(q) ||
      g.organization.toLowerCase().includes(q);

    const matchesCategory = categoryFilter === 'all' || g.category === categoryFilter;
    const matchesCheckIn =
      checkInFilter === 'all' ||
      (checkInFilter === 'checked_in' && g.check_in_status === 'checked_in') ||
      (checkInFilter === 'pending' && g.check_in_status === 'pending');

    return matchesQuery && matchesCategory && matchesCheckIn;
  });

  const handleCopyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const handleToggleActive = async (id: string) => {
    await storage.toggleGuestActive(id);
    loadGuests();
  };

  const handleRegenerateQR = async (id: string) => {
    if (confirm('Regenerate QR pass for this attendee? The previous QR code will immediately stop working.')) {
      await storage.regenerateGuestToken(id);
      loadGuests();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from this event?`)) {
      await storage.deleteGuest(id);
      loadGuests();
    }
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !event) return;

    const newGuest: Guest = {
      id: `gst-${Date.now()}`,
      event_id: event.id,
      full_name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || '+234 800 000 0000',
      organization: newOrg.trim() || 'Invited Attendee',
      category: newCategory,
      reference_number: generateReferenceNumber(),
      qr_token: generateToken(),
      is_active: true,
      check_in_status: 'pending',
      check_in_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await storage.saveGuest(newGuest);
    storage.logAudit(
      'Organizer',
      'Event Organizer',
      event.id,
      'Guest Added',
      `Registered attendee ${newGuest.full_name} (${newGuest.category})`
    );

    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewOrg('');
    setNewCategory('General Guest');
    setShowAddGuestModal(false);
    loadGuests();
  };

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Email', 'Phone', 'Organization', 'Category', 'QR Token', 'Ref Number', 'Check-In Status', 'Check-In Time', 'Gate', 'Active Status'];
    const rows = filteredGuests.map(g => [
      `"${g.full_name}"`,
      `"${g.email}"`,
      `"${g.phone}"`,
      `"${g.organization}"`,
      `"${g.category}"`,
      `"${g.qr_token}"`,
      `"${g.reference_number}"`,
      `"${g.check_in_status}"`,
      `"${g.first_check_in_time ? new Date(g.first_check_in_time).toLocaleString() : ''}"`,
      `"${g.first_check_in_gate || ''}"`,
      `"${g.is_active ? 'Active' : 'Deactivated'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `EventPass_Guests_${event?.name?.replace(/\s+/g, '_') || 'Event'}.csv`;
    link.click();
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'VIP':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Speaker':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Government Official':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Media':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'Staff':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'Partner':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Attendee Management</span>
              <span>•</span>
              <span className="text-slate-900 font-bold">{guests.length} Registered Guests</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Guest Database & Pass Generation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage invitation credentials, track real-time attendance, and generate secure passes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddGuestModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Guest</span>
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              <UploadCloud className="w-4 h-4 text-slate-500" />
              <span>Bulk CSV Import</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email, phone, organization, or QR token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 w-full md:w-44 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Categories</option>
              <option value="VIP">VIP</option>
              <option value="Speaker">Speaker</option>
              <option value="Government Official">Government Official</option>
              <option value="Media">Media</option>
              <option value="Partner">Partner</option>
              <option value="Student">Student</option>
              <option value="General Guest">General Guest</option>
            </select>

            {/* Check-in filter */}
            <select
              value={checkInFilter}
              onChange={(e) => setCheckInFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 w-full md:w-36 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Statuses</option>
              <option value="checked_in">Checked In</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Guest Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Attendee</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Organization</th>
                <th className="py-3.5 px-4">QR Credential Token</th>
                <th className="py-3.5 px-4">Check-In Status</th>
                <th className="py-3.5 px-4">Entry Gate & Time</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No attendees match the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr
                    key={guest.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !guest.is_active ? 'opacity-50 bg-slate-50/50' : ''
                    }`}
                  >
                    {/* Attendee */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{guest.full_name}</div>
                      <div className="text-[11px] text-slate-500">{guest.email}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{guest.phone}</div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                          guest.category
                        )}`}
                      >
                        {guest.category}
                      </span>
                    </td>

                    {/* Organization */}
                    <td className="py-3.5 px-4 text-slate-700">
                      {guest.organization || '—'}
                    </td>

                    {/* QR Token */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                          {guest.qr_token}
                        </span>
                        <button
                          onClick={() => handleCopyToken(guest.qr_token, guest.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                          title="Copy Token"
                        >
                          {copiedTokenId === guest.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Ref: {guest.reference_number}
                      </span>
                    </td>

                    {/* Check-In Status */}
                    <td className="py-3.5 px-4">
                      {guest.check_in_status === 'checked_in' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Checked In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3 text-slate-400" /> Pending
                        </span>
                      )}
                      {!guest.is_active && (
                        <span className="block mt-1 text-[10px] font-bold text-rose-600">
                          Pass Deactivated
                        </span>
                      )}
                    </td>

                    {/* Entry Gate & Time */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {guest.first_check_in_time ? (
                        <div>
                          <div className="font-semibold text-slate-800">{guest.first_check_in_gate}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(guest.first_check_in_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedGuestForPass(guest)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                          title="View Digital QR Pass"
                        >
                          <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pass</span>
                        </button>

                        <button
                          onClick={() => handleRegenerateQR(guest.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                          title="Regenerate QR Token"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleActive(guest.id)}
                          className={`p-1.5 rounded-lg hover:bg-slate-100 ${
                            guest.is_active ? 'text-slate-400 hover:text-rose-600' : 'text-rose-600 hover:text-emerald-600'
                          }`}
                          title={guest.is_active ? 'Deactivate Pass' : 'Reactivate Pass'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(guest.id, guest.full_name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                          title="Delete Attendee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital Pass Modal */}
      {selectedGuestForPass && (
        <DigitalPassModal
          guest={selectedGuestForPass}
          event={event}
          onClose={() => setSelectedGuestForPass(null)}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && event && (
        <BulkImportModal
          eventId={event.id}
          onClose={() => setShowBulkModal(false)}
          onSuccess={(count) => {
            loadGuests();
          }}
        />
      )}

      {/* Add Single Guest Modal */}
      {showAddGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-sm tracking-wide">REGISTER INDIVIDUAL GUEST</h3>
                <p className="text-xs text-slate-400 mt-0.5">Event Management Portal</p>
              </div>
              <button
                onClick={() => setShowAddGuestModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGuest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kufre Ekanem"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="kufre@organization.ng"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+234 803 000 0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization / Affiliation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ministry / Tech Firm"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Access Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as GuestCategory)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="VIP">VIP</option>
                    <option value="Speaker">Speaker</option>
                    <option value="Government Official">Government Official</option>
                    <option value="Partner">Partner</option>
                    <option value="Media">Media</option>
                    <option value="Staff">Staff</option>
                    <option value="Student">Student</option>
                    <option value="General Guest">General Guest</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddGuestModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Generate Pass & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
