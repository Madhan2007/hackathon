import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';
import { supabase, isSupabaseConfigured } from '../api/supabase';

const AuthContext = createContext(null);

export const ROLE_CONFIG = {
  admin: {
    id: 'admin',
    label: 'Clinic Administrator',
    shortLabel: 'Admin',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    dotClass: 'bg-purple-400',
    description: 'Full Clinic Access • User Role Management • System Operations',
    allowedPaths: ['/', '/exceptions', '/doctor', '/patients', '/analytics', '/simulator', '/admin/users'],
    defaultPath: '/',
    avatarBg: 'from-purple-600 to-indigo-600',
  },
  doctor: {
    id: 'doctor',
    label: 'Fertility Specialist / Doctor',
    shortLabel: 'Doctor',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    dotClass: 'bg-teal-400',
    description: 'Doctor Summary • Clinical Cycles • Medical Exception Escalations',
    allowedPaths: ['/doctor', '/exceptions', '/patients', '/analytics'],
    defaultPath: '/doctor',
    avatarBg: 'from-teal-600 to-emerald-600',
  },
  coordinator: {
    id: 'coordinator',
    label: 'Clinical Coordinator',
    shortLabel: 'Coordinator',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    dotClass: 'bg-indigo-400',
    description: 'Daily Follow-up Queue • Patient Rescheduling • AI Channel Simulator',
    allowedPaths: ['/', '/exceptions', '/patients', '/simulator'],
    defaultPath: '/',
    avatarBg: 'from-indigo-600 to-sky-600',
  },
  nurse: {
    id: 'nurse',
    label: 'Clinical Staff / Nurse',
    shortLabel: 'Nurse',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-400',
    description: 'Today’s Patient Queue • Check-ins & Reminders • Cycle Oversight',
    allowedPaths: ['/', '/exceptions', '/patients'],
    defaultPath: '/',
    avatarBg: 'from-emerald-600 to-teal-600',
  },
};

export const DEMO_PRESETS = [
  {
    role: 'admin',
    name: 'Dr. Subha Ramanathan',
    email: 'admin@fertiflow.ai',
    password: 'Password@123',
    department: 'Clinic Directorate',
  },
  {
    role: 'doctor',
    name: 'Dr. Subha Lakshmi',
    email: 'dr.subha@fertiflow.ai',
    password: 'Password@123',
    department: 'Reproductive Medicine',
  },
  {
    role: 'coordinator',
    name: 'Priya Sundaram',
    email: 'coordinator@fertiflow.ai',
    password: 'Password@123',
    department: 'Patient Care Hub',
  },
  {
    role: 'nurse',
    name: 'Kavitha Rajan',
    email: 'nurse@fertiflow.ai',
    password: 'Password@123',
    department: 'OPD & Injections',
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fertiflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('fertiflow_token') || null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Validate session on boot
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('fertiflow_token');
      if (savedToken) {
        try {
          const profile = await authApi.me();
          setUser(profile);
          localStorage.setItem('fertiflow_user', JSON.stringify(profile));
        } catch (err) {
          console.warn('[FertiFlow Auth] Session verification failed, clearing stale tokens.');
          localStorage.removeItem('fertiflow_token');
          localStorage.removeItem('fertiflow_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const saveAuthSession = (tokenStr, userObj) => {
    setToken(tokenStr);
    setUser(userObj);
    localStorage.setItem('fertiflow_token', tokenStr);
    localStorage.setItem('fertiflow_user', JSON.stringify(userObj));
  };

  const login = async (email, password) => {
    // Standard FertiFlow Supabase-backed API login
    const res = await authApi.login({ email, password });
    saveAuthSession(res.access_token, res.user);
    return res.user;
  };

  const signup = async ({ email, password, full_name, role, department }) => {
    // If Supabase Auth is enabled on project, optionally attempt Supabase signup in parallel
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name, role, department },
          },
        });
      } catch (sbErr) {
        console.warn('[Supabase Direct Auth Warning]:', sbErr);
      }
    }

    const res = await authApi.signup({
      email,
      password,
      full_name,
      role: role.toLowerCase(),
      department,
    });
    saveAuthSession(res.access_token, res.user);
    return res.user;
  };

  const quickDemoLogin = async (targetRole) => {
    const preset = DEMO_PRESETS.find((p) => p.role === targetRole) || DEMO_PRESETS[0];
    return await login(preset.email, preset.password);
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signout notice:', err);
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('fertiflow_token');
    localStorage.removeItem('fertiflow_user');
  };

  const currentRole = user?.role?.toLowerCase() || null;
  const currentRoleConfig = currentRole ? ROLE_CONFIG[currentRole] || ROLE_CONFIG.coordinator : null;

  const hasRole = (allowedRoles) => {
    if (!currentRole) return false;
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.map((r) => r.toLowerCase()).includes(currentRole);
    }
    return currentRole === allowedRoles.toLowerCase();
  };

  const canAccess = (path) => {
    if (!user) return false;
    if (currentRole === 'admin') return true;
    const allowed = currentRoleConfig?.allowedPaths || [];
    return allowed.includes(path);
  };

  const value = {
    user,
    token,
    role: currentRole,
    roleConfig: currentRoleConfig,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    signup,
    logout,
    quickDemoLogin,
    hasRole,
    canAccess,
    isSupabaseDirectConfigured: isSupabaseConfigured(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
