import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, HeartPulse, LogOut } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading, role, roleConfig, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-200">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center animate-pulse shadow-xl shadow-teal-500/20">
            <HeartPulse className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl border border-teal-400/40 animate-ping opacity-25" />
        </div>
        <p className="mt-5 text-sm font-medium text-slate-400 animate-pulse tracking-wide">
          Verifying Clinical Credentials & Supabase Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required and user's role is not admin and not permitted
  if (allowedRoles && allowedRoles.length > 0 && role !== 'admin') {
    const hasPermission = allowedRoles.map((r) => r.toLowerCase()).includes(role?.toLowerCase());
    if (!hasPermission) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/80 border border-rose-500/30 backdrop-blur-xl text-center shadow-2xl shadow-rose-950/40 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Access Restricted</h2>
              <p className="text-sm text-slate-400">
                Your current role <span className="text-rose-400 font-semibold uppercase">{roleConfig?.shortLabel || role}</span> does not have authorization to view this clinical module.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 text-left space-y-1.5">
              <div className="text-slate-400 font-medium">Required Roles:</div>
              <div className="flex flex-wrap gap-1.5">
                {allowedRoles.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 uppercase font-mono text-[10px]">
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                to={roleConfig?.defaultPath || '/'}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to My Dashboard
              </Link>
              <button
                onClick={logout}
                className="w-full py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700 flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out & Switch Account
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
}
