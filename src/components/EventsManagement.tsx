import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Plus, CheckCircle2, Clock, Building, X, Sparkles } from 'lucide-react';
import { storage } from '../services/storage';
import { EventItem, EventStatus } from '../types';

interface EventsManagementProps {
  onSelectEvent: (eventId: string) => void;
  activeEventId: string;
}

export const EventsManagement: React.FC<EventsManagementProps> = ({ onSelectEvent, activeEventId }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('Main Event Hall');
  const [city, setCity] = useState('Central City');
  const [eventDate, setEventDate] = useState('2026-10-15');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [organizerName, setOrganizerName] = useState('Event Management Board');
  const [contactEmail, setContactEmail] = useState('contact@example.com');
  const [contactPhone, setContactPhone] = useState('+000 000 000 000');
  const [maxGuests, setMaxGuests] = useState<number>(1000);
  const [status, setStatus] = useState<EventStatus>('published');

  const [eventStats, setEventStats] = useState<{[key: string]: {registered: number, checkedIn: number}}>({});

  const loadEvents = async () => {
    const list = await storage.getEvents();
    setEvents(list);
    
    // Load stats for each event
    const stats: {[key: string]: {registered: number, checkedIn: number}} = {};
    for (const evt of list) {
      const gList = await storage.getGuests(evt.id);
      stats[evt.id] = {
        registered: gList.length,
        checkedIn: gList.filter(g => g.check_in_status === 'checked_in').length
      };
    }
    setEventStats(stats);
  };

  useEffect(() => {
    loadEvents();
    const handleUpdate = () => { loadEvents(); };
    window.addEventListener('eventpass:data_updated', handleUpdate);
    return () => window.removeEventListener('eventpass:data_updated', handleUpdate);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Official conference and gathering hosted at the Godswill Akpabio Event Centre ukana.',
      venue: venue.trim(),
      city: city.trim(),
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      organizer_name: organizerName.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim(),
      max_guests: Number(maxGuests) || 1000,
      status: status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await storage.saveEvent(newEvent);
    storage.setActiveEventId(newEvent.id);
    onSelectEvent(newEvent.id);

    setName('');
    setDescription('');
    setShowCreateModal(false);
    loadEvents();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>Event Management</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">Event Roster</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Events Directory & Scheduling
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Switch between ongoing summit sessions, manage guest quotas, and coordinate access schedules.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.map((evt) => {
          const isCurrent = evt.id === activeEventId;
          const stats = eventStats[evt.id] || { registered: 0, checkedIn: 0 };

          return (
            <div
              key={evt.id}
              className={`bg-white rounded-2xl border p-6 shadow-xs transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-slate-900 ring-2 ring-slate-900/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      evt.status === 'ongoing'
                        ? 'bg-emerald-100 text-emerald-800'
                        : evt.status === 'published'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {evt.status}
                  </span>

                  {isCurrent && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active Work Session
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-900 mt-3 leading-snug">
                  {evt.name}
                </h2>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {evt.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(evt.event_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-slate-300">•</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{evt.start_time} - {evt.end_time}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{evt.venue}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      <strong>{stats.registered}</strong> registered / <strong>{stats.checkedIn}</strong> checked in (Max {evt.max_guests})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Organized by: <strong className="text-slate-700 font-semibold">{evt.organizer_name}</strong>
                </span>

                <button
                  onClick={() => {
                    storage.setActiveEventId(evt.id);
                    onSelectEvent(evt.id);
                  }}
                  disabled={isCurrent}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                  }`}
                >
                  {isCurrent ? 'Current Event' : 'Select Event'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm tracking-wide">CREATE EVENT</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Akwa Ibom Investment & Commerce Summit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief synopsis of event purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatus)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    placeholder="09:00 AM"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    placeholder="05:00 PM"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Hall / Venue
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organizer Name
                  </label>
                  <input
                    type="text"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capacity (Max Guests)
                  </label>
                  <input
                    type="number"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Create & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
