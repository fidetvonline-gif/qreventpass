import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, LogIn } from 'lucide-react';
import { UserRole } from '../types';

interface AccessDeniedProps {
  requiredRole: string;
  currentRole: UserRole;
  currentUser: { name: string; email: string; role: UserRole } | null;
  onOpenLoginModal: () => void;
  onGoHome: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  requiredRole,
  currentRole,
  currentUser,
  onOpenLoginModal,
  onGoHome,
}) => {
  return (
    <div className="max-w-lg mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-inner">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider rounded-full">
          Access Restricted
        </span>
        <h2 className="text-xl font-bold text-slate-900">Administrator Authorization Required</h2>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          This feature is restricted to <strong>{requiredRole}</strong> account holders.
          {!currentUser ? (
            <span> You are currently browsing as an unauthenticated guest.</span>
          ) : (
            <span> Your current account (<strong>{currentUser.email}</strong>) is assigned the <strong>{currentRole.replace('_', ' ')}</strong> role.</span>
          )}
        </p>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1 text-left">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <Lock className="w-4 h-4 text-slate-400" />
          <span>Role-Based Security Policy</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          Godswill Akpabio Event Centre enforces strict multi-role permission boundaries to prevent unauthorized guest list modifications, staff changes, or gate security overrides.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={onOpenLoginModal}
          className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-emerald-400" />
          <span>Sign In as Admin</span>
        </button>

        <button
          onClick={onGoHome}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};
