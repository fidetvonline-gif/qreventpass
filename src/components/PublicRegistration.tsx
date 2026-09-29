import React, { useState } from 'react';
import { 
  Building, 
  CheckCircle2, 
  QrCode, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertCircle, 
  ArrowRight,
  Shield,
  Search,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { storage } from '../services/storage';
import { generateToken, generateReferenceNumber } from '../services/qr';
import { EventItem, Guest, GuestCategory } from '../types';
import { DigitalPassModal } from './DigitalPassModal';

interface PublicRegistrationProps {
  event: EventItem | undefined;
}

export const PublicRegistration: React.FC<PublicRegistrationProps> = ({ event }) => {
  const [activeTab, setActiveTab] = useState<'register' | 'lookup'>('register');
  
  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState<GuestCategory>('General Guest');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedGuest, setGeneratedGuest] = useState<Guest | null>(null);

  // Lookup Form State
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">No active event selected for registration.</p>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const guestsList = await storage.getGuests(event.id);
    const existing = guestsList.find(g => g.email.toLowerCase() === cleanEmail);

    if (existing) {
      setErrorMsg(`An invitation pass has already been generated for ${cleanEmail}. Click 'Retrieve Existing Pass' to access your QR pass.`);
      return;
    }

    const newGuest: Guest = {
      id: `gst-${Date.now()}`,
      event_id: event.id,
      full_name: fullName.trim(),
      email: cleanEmail,
      phone: phone.trim() || '+234 800 000 0000',
      organization: organization.trim() || 'Invited Attendee',
      category: category,
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
      newGuest.full_name,
      'Guest',
      event.id,
      'Online Guest Registration',
      `Registered for ${event.name} as ${newGuest.category}.`
    );

    setGeneratedGuest(newGuest);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    const q = lookupQuery.trim().toLowerCase();
    if (!q) return;

    const guestsList = await storage.getGuests(event.id);
    const guest = guestsList.find(
      g => g.email.toLowerCase() === q || g.qr_token.toLowerCase() === q || g.reference_number.toLowerCase() === q
    );

    if (!guest) {
      setLookupError('No attendee pass found matching that email, token, or reference number.');
      return;
    }

    setGeneratedGuest(guest);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Event Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span>Godswill Akpabio Event Centre ukana</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">
          {event.name}
        </h1>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          {event.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date</span>
              <span className="font-semibold text-slate-800">
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Time</span>
              <span className="font-semibold text-slate-800">{event.start_time} - {event.end_time}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Venue</span>
              <span className="font-semibold text-slate-800 truncate block">{event.venue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Register vs Retrieve */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
        <button
          onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'register'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1. New Guest Registration
        </button>
        <button
          onClick={() => { setActiveTab('lookup'); setLookupError(null); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'lookup'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          2. Retrieve My Digital QR Pass
        </button>
      </div>

      {/* Tab 1: Registration Form */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Official Attendee Registration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in your details to immediately generate your encrypted QR admission pass.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kufre Ekanem"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="kufre@organization.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="+234 803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization / Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g. University of Uyo / Tech Firm"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guest Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GuestCategory)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                >
                  <option value="General Guest">General Guest</option>
                  <option value="VIP">VIP</option>
                  <option value="Speaker">Speaker</option>
                  <option value="Government Official">Government Official</option>
                  <option value="Partner">Partner</option>
                  <option value="Media">Media</option>
                  <option value="Student">Student</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant QR credential issued upon submission</span>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Register & Get Pass
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Pass Lookup */}
      {activeTab === 'lookup' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Find Existing Digital Pass
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your registered email address, token, or reference code to view or print your digital badge.
            </p>
          </div>

          {lookupError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{lookupError}</span>
            </div>
          )}

          <form onSubmit={handleLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="Enter email or QR token (e.g. john@email.com or EVP-...)"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Retrieve Pass
            </button>
          </form>
        </div>
      )}

      {/* Pass Modal popup */}
      {generatedGuest && (
        <DigitalPassModal
          guest={generatedGuest}
          event={event}
          onClose={() => setGeneratedGuest(null)}
        />
      )}
    </div>
  );
};
