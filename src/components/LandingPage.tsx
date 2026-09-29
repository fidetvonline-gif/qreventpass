import React from 'react';
import { 
  ShieldCheck, 
  QrCode, 
  DoorOpen, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight, 
  Building, 
  Lock, 
  Users, 
  Sparkles,
  Zap,
  Calendar,
  Clock,
  MapPin
} from 'lucide-react';
import { EventItem } from '../types';

interface LandingPageProps {
  events: EventItem[];
  activeEvent: EventItem | undefined;
  onNavigate: (view: string) => void;
  onSelectEvent: (id: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ events, activeEvent, onNavigate, onSelectEvent }) => {
  return (
    <div className="space-y-12 max-w-6xl mx-auto py-4">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-4 sm:pt-8 pb-4">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight max-w-3xl mx-auto leading-[1.15]">
          Godswill Akpabio Event Centre ukana aks
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Official digital guest authentication, QR pass generation, multi-gate check-in, and real-time attendance tracking system.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('public_register')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Register for Event Pass</span>
          </button>

          <button
            onClick={() => onNavigate('scanner')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:shadow-lg cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Open Entrance Scanner</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-slate-600" />
            <span>Live Organizer Dashboard</span>
          </button>
        </div>
      </section>

      {/* Events & Registration Catalog */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              <Building className="w-4 h-4" />
              <span>Godswill Akpabio Event Centre ukana aks</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">Available Events & Registrations</h2>
          </div>
          <button
            onClick={() => onNavigate('events')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Create / Manage Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((evt) => {
            const isSelected = activeEvent?.id === evt.id;
            return (
              <div 
                key={evt.id}
                className={`rounded-xl border p-5 transition-all space-y-3 ${isSelected ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600/30' : 'border-slate-200 bg-slate-50/50 hover:bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      {evt.status}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{evt.name}</h3>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Active Event
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{evt.description || 'Official gathering at Godswill Akpabio Event Centre ukana aks.'}</p>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{evt.event_date || 'Upcoming'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{evt.start_time || '10:00 AM'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  {!isSelected && (
                    <button
                      onClick={() => onSelectEvent(evt.id)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Select Event
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onSelectEvent(evt.id);
                      onNavigate('public_register');
                    }}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Register for Pass</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4 Pillars Grid (Anti-slop, clean architectural layout) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900">
            <QrCode className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Cryptographic QR Pass</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Unique random token payload prevents spoofing or ticket harvesting, hiding sensitive PII from QR contents.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-100">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Duplicate Check-In Lock</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Instant multi-gate synchronization blocks passes already scanned elsewhere, displaying original entry time and gate.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900">
            <DoorOpen className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Multi-Gate Architecture</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Support for Gate A, Gate B (VIP), Gate C (Media), and Gate D (Crew) with real-time throughput metrics.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Live Attendance Audit</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Live headcount, hourly peak pacing charts, CSV report exports, and security audit log tracing every attempt.
          </p>
        </div>
      </section>
    </div>
  );
};
