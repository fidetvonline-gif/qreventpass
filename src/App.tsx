import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { GuestsList } from './components/GuestsList';
import { GatesManagement } from './components/GatesManagement';
import { StaffManagement } from './components/StaffManagement';
import { ReportsView } from './components/ReportsView';
import { AuditLogsView } from './components/AuditLogsView';
import { EventsManagement } from './components/EventsManagement';
import { PublicRegistration } from './components/PublicRegistration';
import { SupabaseModal } from './components/SupabaseModal';
import { LoginModal } from './components/LoginModal';
import { storage } from './services/storage';
import { isSupabaseConfigured } from './lib/supabase';
import { UserRole, EventItem } from './types';
import { ShieldCheck, Building, CheckCircle2, Database } from 'lucide-react';

const DEMO_EMAILS = [
  'admin@godswillakpabioec.ng',
  'organizer@eventpass.ng',
  'emmanuel@gate.ng',
  'guest@attendee.ng'
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: UserRole } | null>(() => {
    try {
      const saved = localStorage.getItem('eventpass_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && DEMO_EMAILS.includes(parsed.email.toLowerCase().trim())) {
          localStorage.removeItem('eventpass_current_user');
          return null;
        }
        return parsed;
      }
    } catch {}
    return null;
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('eventpass_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && !DEMO_EMAILS.includes(parsed.email.toLowerCase().trim())) {
          return parsed.role || 'organizer';
        }
      }
    } catch {}
    return 'organizer';
  });
  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('eventpass_current_user');
      if (saved) return 'dashboard';
    } catch {}
    return 'landing';
  });
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('eventpass_current_user');
      return !saved; // Open login modal automatically on first visit if not logged in
    } catch {}
    return true;
  });

  const loadData = () => {
    const allEvents = storage.getEvents();
    setEvents(allEvents);
    const activeId = storage.getActiveEventId();
    setActiveEventId(activeId);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('eventpass:data_updated', handleUpdate);
    return () => window.removeEventListener('eventpass:data_updated', handleUpdate);
  }, [currentUser]);

  const activeEvent = events.find((e) => e.id === activeEventId) || events[0] || {
    id: 'empty-event',
    name: 'Godswill Akpabio Event Centre',
    description: 'No events created yet. Please create your event in Events Management.',
    venue: 'Godswill Akpabio Event Centre, Ukana, Akwa Ibom',
    city: 'Uyo, Akwa Ibom State',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '09:00 AM',
    end_time: '05:00 PM',
    organizer_name: 'Godswill Akpabio Event Centre',
    contact_email: 'events@godswillakpabioec.ng',
    contact_phone: '+234 803 123 4567',
    max_guests: 1000,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const handleSelectEvent = (id: string) => {
    setActiveEventId(id);
    storage.setActiveEventId(id);
  };

  const handleLoginSuccess = (user: { name: string; email: string; role: UserRole }) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    try {
      localStorage.setItem('eventpass_current_user', JSON.stringify(user));
    } catch {}
    if (user.role === 'scanner_staff') setCurrentView('scanner');
    else if (user.role === 'guest') setCurrentView('public_register');
    else setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('eventpass_current_user');
    } catch {}
    setIsLoginModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white antialiased">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        events={events}
        activeEvent={activeEvent}
        onSelectEvent={handleSelectEvent}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {!currentUser && (
          <div className="mb-6 p-4 sm:p-6 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-lg sm:text-xl font-bold">Welcome to EventPass Authentication</h2>
              <p className="text-xs text-slate-300">Please sign in to your account or create a new account to access the system.</p>
            </div>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all shrink-0 cursor-pointer"
            >
              Sign In / Create Account
            </button>
          </div>
        )}

        {currentView === 'landing' && (
          <LandingPage
            events={events}
            activeEvent={activeEvent}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            event={activeEvent}
            onNavigateToScanner={() => setCurrentView('scanner')}
            onNavigateToGuests={() => setCurrentView('guests')}
            onNavigateToReports={() => setCurrentView('reports')}
          />
        )}

        {currentView === 'scanner' && (
          <Scanner
            event={activeEvent}
            staffName={currentRole === 'scanner_staff' ? 'Officer Emmanuel Udoh' : 'Security Supervisor'}
          />
        )}

        {currentView === 'guests' && (
          <GuestsList event={activeEvent} />
        )}

        {currentView === 'gates' && (
          <GatesManagement event={activeEvent} />
        )}

        {currentView === 'staff' && (
          <StaffManagement event={activeEvent} />
        )}

        {currentView === 'reports' && (
          <ReportsView event={activeEvent} />
        )}

        {currentView === 'audit' && (
          <AuditLogsView event={activeEvent} />
        )}

        {currentView === 'events' && (
          <EventsManagement
            onSelectEvent={handleSelectEvent}
            activeEventId={activeEventId}
          />
        )}

        {currentView === 'public_register' && (
          <PublicRegistration event={activeEvent} />
        )}
      </main>

      {/* Supabase Connection & Schema Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* User Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">EventPass System</span>
            <span>—</span>
            <span>Digital QR Check-In & Gate Verification Platform</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors border border-slate-200 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Supabase {isSupabaseConfigured() ? 'Connected' : 'Database Settings'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            </button>
            <span className="text-slate-300">•</span>
            <span>Cryptographic QR Credential Engine</span>
            <span className="text-slate-300">•</span>
            <span>Multi-Gate Synchronization</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
