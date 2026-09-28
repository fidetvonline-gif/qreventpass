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
import { storage } from './services/storage';
import { isSupabaseConfigured } from './lib/supabase';
import { UserRole, EventItem } from './types';
import { ShieldCheck, Building, CheckCircle2, Database } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('organizer');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

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
  }, []);

  const activeEvent = events.find((e) => e.id === activeEventId) || events[0];

  const handleSelectEvent = (id: string) => {
    setActiveEventId(id);
    storage.setActiveEventId(id);
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
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">EventPass System</span>
            <span>—</span>
            <span>Case Study: Godswill Akpabio Event Centre, Uyo, Akwa Ibom State</span>
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
