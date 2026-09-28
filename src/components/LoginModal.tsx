import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, Lock, Mail, User, CheckCircle2, ArrowRight, X, Building } from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string; role: UserRole }) => void;
}

interface UserAccount {
  name: string;
  email: string;
  pass: string;
  role: UserRole;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@godswillakpabioec.ng');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Chief Administrator');
  const [role, setRole] = useState<UserRole>('super_admin');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getLocalUsers = (): UserAccount[] => {
    try {
      const stored = localStorage.getItem('eventpass_custom_users');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { name: 'Chief Administrator', email: 'admin@godswillakpabioec.ng', pass: 'password123', role: 'super_admin' },
      { name: 'Akwa Ibom Event Director', email: 'organizer@eventpass.ng', pass: 'password123', role: 'organizer' },
      { name: 'Emmanuel Udoh (Gate A)', email: 'emmanuel@gate.ng', pass: 'password123', role: 'scanner_staff' },
      { name: 'Registered Attendee', email: 'guest@attendee.ng', pass: 'password123', role: 'guest' }
    ];
  };

  const saveLocalUser = (user: UserAccount) => {
    try {
      const users = getLocalUsers();
      const existingIdx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
      if (existingIdx >= 0) {
        users[existingIdx] = user;
      } else {
        users.push(user);
      }
      localStorage.setItem('eventpass_custom_users', JSON.stringify(users));
    } catch {}
  };

  const handleQuickDemoLogin = (demoRole: UserRole, demoName: string, demoEmail: string) => {
    setRole(demoRole);
    setFullName(demoName);
    setEmail(demoEmail);
    onLoginSuccess({ name: demoName, email: demoEmail, role: demoRole });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let resolvedName = fullName;
      let resolvedRole = role;

      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          if (isRegistering) {
            const { error: signUpErr } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: fullName, role }
              }
            });
            if (signUpErr) {
              console.warn('Supabase sign up notice:', signUpErr.message);
            }
            saveLocalUser({ name: fullName, email, pass: password, role });
          } else {
            const { error: signInErr } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (signInErr) {
              // fallback to local users check
              const users = getLocalUsers();
              const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pass === password);
              if (!found) {
                if (isRegistering) {
                  saveLocalUser({ name: fullName, email, pass: password, role });
                } else {
                  throw new Error(signInErr.message || 'Invalid email or password.');
                }
              } else {
                resolvedName = found.name;
                resolvedRole = found.role;
              }
            }
          }
        }
      } else {
        // Local storage authentication mode
        const users = getLocalUsers();
        if (isRegistering) {
          saveLocalUser({ name: fullName, email, pass: password, role });
          resolvedName = fullName;
          resolvedRole = role;
        } else {
          const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pass === password);
          if (!found) {
            // Auto-create account if not found for convenience in prototype mode
            const newUser = {
              name: fullName || email.split('@')[0],
              email,
              pass: password,
              role
            };
            saveLocalUser(newUser);
            resolvedName = newUser.name;
            resolvedRole = newUser.role;
          } else {
            resolvedName = found.name;
            resolvedRole = found.role;
          }
        }
      }

      onLoginSuccess({
        name: resolvedName || email.split('@')[0],
        email,
        role: resolvedRole
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isRegistering ? 'Create EventPass Account' : 'Sign In to EventPass'}
              </h2>
              <p className="text-xs text-slate-400">Godswill Akpabio Event Centre</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {!isRegistering && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick Demo Login Profiles
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('super_admin', 'Godswill Admin', 'admin@godswillakpabioec.ng')}
                  className="p-2.5 text-left border border-slate-200 hover:border-slate-900 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-xs group"
                >
                  <div className="font-bold text-slate-900 group-hover:text-emerald-700">Super Admin</div>
                  <div className="text-[10px] text-slate-500 truncate">admin@godswill...</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('organizer', 'Akwa Ibom Event Director', 'organizer@eventpass.ng')}
                  className="p-2.5 text-left border border-slate-200 hover:border-slate-900 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-xs group"
                >
                  <div className="font-bold text-slate-900 group-hover:text-emerald-700">Organizer</div>
                  <div className="text-[10px] text-slate-500 truncate">organizer@...</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('scanner_staff', 'Emmanuel Udoh (Gate A)', 'emmanuel@gate.ng')}
                  className="p-2.5 text-left border border-slate-200 hover:border-slate-900 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-xs group"
                >
                  <div className="font-bold text-slate-900 group-hover:text-emerald-700">Gate Scanner</div>
                  <div className="text-[10px] text-slate-500 truncate">emmanuel@gate.ng</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('guest', 'Registered Attendee', 'guest@attendee.ng')}
                  className="p-2.5 text-left border border-slate-200 hover:border-slate-900 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-xs group"
                >
                  <div className="font-bold text-slate-900 group-hover:text-emerald-700">Guest Pass</div>
                  <div className="text-[10px] text-slate-500 truncate">guest@attendee.ng</div>
                </button>
              </div>
            </div>
          )}

          {!isRegistering && (
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-[11px] uppercase tracking-wider">or sign in with email</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {(isRegistering || fullName) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required={isRegistering}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Ini Akpabio"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@godswillakpabioec.ng"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium"
              >
                <option value="super_admin">Super Administrator</option>
                <option value="organizer">Event Organizer</option>
                <option value="scanner_staff">Gate Scanner / Staff</option>
                <option value="guest">Guest Attendee</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : isRegistering ? 'Create New Account' : 'Sign In to EventPass'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
            >
              {isRegistering ? 'Already have an account? Sign In' : 'Need a new account? Create one here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
