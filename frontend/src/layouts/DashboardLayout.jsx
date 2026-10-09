import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  AlertTriangle,
  Users,
  BarChart3,
  Bot,
  HeartPulse,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  LogOut,
  ChevronDown,
  UserCheck,
  UserCog,
  Shield,
  Activity,
} from 'lucide-react';
import { systemApi } from '../api/client';
import { useAuth, DEMO_PRESETS, ROLE_CONFIG } from '../context/AuthContext';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, roleConfig, logout, canAccess, quickDemoLogin } = useAuth();
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: '' });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    systemApi.health()
      .then(() => setBackendHealth({ status: 'online', message: 'API Connected' }))
      .catch(() => setBackendHealth({ status: 'offline', message: 'API Offline' }));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allNavItems = [
    {
      name: "Today's Queue",
      path: "/",
      icon: CalendarClock,
      badge: "Active",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      name: "Exception Queue",
      path: "/exceptions",
      icon: AlertTriangle,
      badge: "High Priority",
      badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    {
      name: "Doctor Summary",
      path: "/doctor",
      icon: Stethoscope,
      badge: "Clinical",
      badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    },
    {
      name: "Patients & Cycles",
      path: "/patients",
      icon: Users,
    },
    {
      name: "Analytics",
      path: "/analytics",
      icon: BarChart3,
    },
    {
      name: "Patient Simulator",
      path: "/simulator",
      icon: Bot,
      badge: "AI Test",
      badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    {
      name: "Staff & RBAC",
      path: "/admin/users",
      icon: UserCog,
      badge: "Admin",
      badgeColor: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    },
  ];

  // Filter based on user's active role permissions
  const authorizedNavItems = allNavItems.filter((item) => canAccess(item.path));

  const handleRoleSwitch = async (targetRole) => {
    setDropdownOpen(false);
    await quickDemoLogin(targetRole);
    const targetCfg = ROLE_CONFIG[targetRole] || ROLE_CONFIG.coordinator;
    navigate(targetCfg.defaultPath);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'FF';

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0d1424]/90 backdrop-blur-xl border-r border-slate-800/80 flex flex-col flex-shrink-0 z-20">
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20 ring-1 ring-white/20">
            <HeartPulse className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-300 via-indigo-200 to-white bg-clip-text text-transparent">
                FertiFlow AI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Fertility Follow-up Engine</p>
          </div>
        </div>

        {/* User Role Badge in Sidebar */}
        <div className="px-4 pt-4 pb-1">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${roleConfig?.dotClass || 'bg-teal-400'}`} />
              <div className="leading-tight">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  {roleConfig?.shortLabel || role || 'Coordinator'}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                  {user?.department || 'Reproductive Med'}
                </div>
              </div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleConfig?.badgeClass || 'bg-teal-500/10 text-teal-300'}`}>
              RBAC
            </span>
          </div>
        </div>

        {/* Navigation Items (Role-Filtered) */}
        <div className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Authorized Modules</span>
            <span className="text-[10px] font-mono text-slate-400">{authorizedNavItems.length} active</span>
          </div>

          {authorizedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500/20 to-indigo-600/20 text-white border border-teal-500/30 shadow-sm shadow-teal-900/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* System Health & Regional Mode Status */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${backendHealth.status === 'online' ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                <span className="font-medium text-slate-300">
                  {backendHealth.status === 'online' ? 'Supabase Connected' : 'Connecting Engine...'}
                </span>
              </div>
              <span className="text-[11px] text-teal-400 font-mono">TN Hub</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Auth & RBAC
              </span>
              <span className="text-emerald-400 font-semibold">Protected</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP NAVBAR */}
        <header className="h-16 px-8 bg-[#0d1424]/60 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 z-10">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="hover:text-slate-300 transition-colors">FertiFlow AI</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-white font-medium capitalize">
              {location.pathname === '/' ? "Today's Follow-up Queue" : location.pathname.replace('/', '').replace('-', ' ')}
            </span>
          </div>

          {/* Right status & User Profile Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-lingual AI (Tamil / English)</span>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            {/* Profile Dropdown & Role Switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer group"
              >
                <div className="text-right leading-tight hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white flex items-center gap-1 justify-end">
                    <span>{user?.full_name || 'Staff User'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-[10px] text-teal-400 font-medium">
                    {roleConfig?.shortLabel || role || 'Coordinator'} • {user?.department || 'Reproductive Med'}
                  </div>
                </div>

                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-tr ${
                    roleConfig?.avatarBg || 'from-teal-500 to-indigo-600'
                  } text-white font-bold text-xs flex items-center justify-center ring-2 ring-teal-500/30 shadow-md`}
                >
                  {initials}
                </div>
              </button>

              {/* DROPDOWN MENU */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/80 p-3 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Active User Card */}
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div className="text-xs font-bold text-white truncate">{user?.full_name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleConfig?.badgeClass}`}>
                        {roleConfig?.label}
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Persona Switcher for Quick Evaluation */}
                  <div>
                    <div className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-teal-400" />
                      <span>Switch Demo Persona (Fast Test)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DEMO_PRESETS.map((demo) => {
                        const isCurrent = demo.role === role;
                        const cfg = ROLE_CONFIG[demo.role];
                        return (
                          <button
                            key={demo.role}
                            type="button"
                            onClick={() => handleRoleSwitch(demo.role)}
                            className={`p-2 rounded-lg text-left text-xs transition-colors border cursor-pointer ${
                              isCurrent
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-semibold'
                                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                              <span className="capitalize font-bold text-[11px]">{cfg.shortLabel}</span>
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">{demo.name.split(' ')[0]}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* OUTLET / MAIN WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-[#070b14] to-[#0a0f1d]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
