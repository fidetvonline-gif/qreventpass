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
}

export const LandingPage: React.FC<LandingPageProps> = ({ events, activeEvent, onNavigate }) => {
  return (
    <div className="space-y-12 max-w-6xl mx-auto py-4">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-4 sm:pt-8 pb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
          <Building className="w-3.5 h-3.5 text-slate-600" />
          <span>Case Study: Godswill Akpabio Event Centre</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-bold">Production MVP</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight max-w-3xl mx-auto leading-[1.15]">
          Fast. Secure. Digital Event Check-In & Authentication.
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Streamline guest registration, generate tamper-proof QR passes, eliminate duplicate ticket fraud, and track multi-gate attendee arrivals in real time.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('scanner')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:shadow-lg"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Open Entrance Scanner</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-slate-600" />
            <span>Live Organizer Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('public_register')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Attendee Pass Portal</span>
          </button>
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

      {/* Featured Summit Section */}
      {activeEvent && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                Active Showcase Session
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {activeEvent.name}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeEvent.description}
              </p>

              <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{new Date(activeEvent.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{activeEvent.start_time} - {activeEvent.end_time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{activeEvent.venue}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center space-y-3 shrink-0">
              <div className="text-xs font-semibold text-slate-500">Attendee Pass Desk</div>
              <div className="text-2xl font-black text-slate-900">Digital QR Admission</div>
              <p className="text-[11px] text-slate-500 max-w-[220px]">
                Instant pass generation for VIPs, speakers, media, and general attendees.
              </p>
              <button
                onClick={() => onNavigate('public_register')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Register For Pass
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Case Study Context Footer Strip */}
      <section className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-bold text-slate-900 block">Academic Research Project Benchmark</span>
          <span className="text-slate-500">
            Godswill Akpabio Event Centre case study — reducing guest verification latency from 45 seconds manual queueing to under 2 seconds.
          </span>
        </div>
        <button
          onClick={() => onNavigate('scanner')}
          className="inline-flex items-center gap-1.5 font-bold text-slate-900 hover:text-emerald-700 transition-colors shrink-0"
        >
          <span>Test Entrance Verification</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>
    </div>
  );
};
