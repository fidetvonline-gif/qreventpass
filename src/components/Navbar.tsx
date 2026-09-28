import React from 'react';
import { 
  Shield, 
  QrCode, 
  LayoutDashboard, 
  Users, 
  DoorOpen, 
  FileText, 
  History, 
  Calendar, 
  RotateCcw, 
  Building,
  UserCheck,
  ChevronDown,
  Database,
  User,
  LogIn,
  LogOut
} from 'lucide-react';
import { UserRole, EventItem } from '../types';
import { storage } from '../services/storage';
import { isSupabaseConfigured } from '../lib/supabase';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  events: EventItem[];
  activeEvent: EventItem | undefined;
  onSelectEvent: (eventId: string) => void;
  onOpenSupabaseModal: () => void;
  currentUser: { name: string; email: string; role: UserRole } | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentRole,
  onChangeRole,
  events,
  activeEvent,
  onSelectEvent,
  onOpenSupabaseModal,
  currentUser,
  onOpenLoginModal,
  onLogout,
}) => {
  const isCloudConnected = isSupabaseConfigured();
  const handleResetData = () => {
    if (confirm('Reset system data to original Godswill Akpabio Event Centre demo state? All scans and guests will be refreshed.')) {
      storage.resetAll();
      window.location.reload();
    }
  };

  // Define nav links based on role
  const getNavLinks = () => {
    if (currentRole === 'guest') {
      return [
        { id: 'landing', label: 'Home', icon: Building },
        { id: 'public_register', label: 'Register / Pass', icon: QrCode },
      ];
    }

    if (currentRole === 'scanner_staff') {
      return [
        { id: 'scanner', label: 'Entrance Scanner', icon: QrCode },
        { id: 'reports', label: 'Recent Gate Scans', icon: FileText },
      ];
    }

    // super_admin and organizer
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'scanner', label: 'QR Scanner', icon: QrCode },
      { id: 'guests', label: 'Guests', icon: Users },
      { id: 'gates', label: 'Gates', icon: DoorOpen },
      { id: 'staff', label: 'Staff', icon: UserCheck },
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'audit', label: 'Audit Log', icon: History },
      { id: 'events', label: 'Events', icon: Calendar },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top microbar with Case study badge & Role switcher */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-white tracking-wide">EventPass</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-[11px] truncate">
            Godswill Akpabio Event Centre (Ukana, Akwa Ibom)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Event Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Event:</span>
            <select
              value={activeEvent?.id || ''}
              onChange={(e) => onSelectEvent(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2 py-0.5 text-[11px] font-medium focus:outline-hidden focus:ring-1 focus:ring-slate-400"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name.length > 28 ? `${evt.name.substring(0, 28)}...` : evt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Perspective:</span>
            <select
              value={currentRole}
              onChange={(e) => {
                const newRole = e.target.value as UserRole;
                onChangeRole(newRole);
                if (newRole === 'scanner_staff') onNavigate('scanner');
                else if (newRole === 'guest') onNavigate('public_register');
                else onNavigate('dashboard');
              }}
              className="bg-slate-800 border border-slate-700 text-emerald-400 rounded-md px-2 py-0.5 text-[11px] font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-400"
            >
              <option value="super_admin">Super Administrator</option>
              <option value="organizer">Event Organizer</option>
              <option value="scanner_staff">Entrance Gate Staff</option>
              <option value="guest">Guest Attendee</option>
            </select>
          </div>

          {/* User Auth Info / Login button */}
          <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] border border-emerald-500/30">
                    {currentUser.name.charAt(0)}
                  </div>
                  <span className="text-[11px] font-medium hidden md:inline truncate max-w-[100px]">{currentUser.name}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          <button
            onClick={onOpenSupabaseModal}
            className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
            title="Supabase Cloud Connection & SQL Schema"
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Supabase</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
          </button>

          <button
            onClick={handleResetData}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            title="Reset system to original sample data"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden md:inline">Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div 
            onClick={() => onNavigate(currentRole === 'guest' ? 'landing' : 'dashboard')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">EventPass</span>
              <span className="text-[10px] text-slate-500 font-semibold ml-1.5 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                QR Auth
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick CTA */}
          <div className="flex items-center gap-2">
            {currentRole !== 'scanner_staff' && (
              <button
                onClick={() => onNavigate('scanner')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Launch Scanner</span>
              </button>
            )}

            {currentRole === 'guest' && (
              <button
                onClick={() => onNavigate('public_register')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                <span>Get Pass</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100 scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
