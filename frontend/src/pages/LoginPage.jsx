import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, DEMO_PRESETS, ROLE_CONFIG } from '../context/AuthContext';
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Database,
  Sparkles,
  UserCheck,
  Stethoscope,
  Users,
  Activity,
  KeyRound,
} from 'lucide-react';
import { isSupabaseConfigured, setSupabaseAnonKey } from '../api/supabase';

export default function LoginPage() {
  const { login, quickDemoLogin, isSupabaseDirectConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [anonKeyInput, setAnonKeyInput] = useState('');

  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const loggedUser = await login(email, password);
      const roleCfg = ROLE_CONFIG[loggedUser.role?.toLowerCase()] || ROLE_CONFIG.coordinator;
      const target = redirectPath === '/login' || redirectPath === '/' ? roleCfg.defaultPath : redirectPath;
      navigate(target, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Login failed. Please verify credentials.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const user = await quickDemoLogin(role);
      const roleCfg = ROLE_CONFIG[role] || ROLE_CONFIG.coordinator;
      navigate(roleCfg.defaultPath, { replace: true });
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Demo login failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnonKey = () => {
    if (anonKeyInput.trim()) {
      setSupabaseAnonKey(anonKeyInput);
      setShowKeyModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center relative overflow-hidden font-sans selection:bg-teal-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Brand Context & Overview */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Next-Gen Fertility Care Orchestration</span>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/25 ring-1 ring-white/20">
                <HeartPulse className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  FertiFlow AI
                </h1>
                <p className="text-xs text-slate-400 font-medium">Role-Based Clinical Access Control</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              Secure, HIPAA-aligned follow-up automation, patient journey tracking, and AI triage for modern reproductive healthcare clinics.
            </p>

            {/* Supabase & Security Architecture Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    Supabase PostgreSQL
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-slate-400 text-[11px]">Database & Auth integration active</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Role-Based Access (RBAC)</div>
                  <div className="text-slate-400 text-[11px]">Admin • Doctor • Coordinator • Nurse</div>
                </div>
              </div>
            </div>

            {/* Supabase Anon Key Config Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                className="text-[11px] text-slate-400 hover:text-teal-300 transition-colors inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>
                  Supabase Auth Status:{' '}
                  <strong className={isSupabaseDirectConfigured ? 'text-emerald-400' : 'text-amber-400'}>
                    {isSupabaseDirectConfigured ? 'Direct Client Active' : 'Connected via PostgreSQL'}
                  </strong>
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Sign In Card & 1-Click Demo Personas */}
          <div className="lg:col-span-7 space-y-5">
            <div className="p-8 rounded-3xl bg-[#0d1424]/90 border border-slate-800/90 backdrop-blur-2xl shadow-2xl shadow-slate-950/80">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white tracking-tight">Staff Sign In</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Authenticate with your clinic credentials or pick a demo role below.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Clinical Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. dr.subha@fertiflow.ai"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Password</label>
                    <span className="text-[11px] text-teal-400 hover:underline cursor-pointer">
                      Forgot Password?
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <>
                      <span>Enter FertiFlow Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* 1-CLICK DEMO ROLES SELECTOR */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                    1-Click Role-Based Demo Logins
                  </span>
                  <span className="text-[10px] text-slate-400">Instant test</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DEMO_PRESETS.map((demo) => {
                    const cfg = ROLE_CONFIG[demo.role];
                    const icons = {
                      admin: ShieldCheck,
                      doctor: Stethoscope,
                      coordinator: Users,
                      nurse: Activity,
                    };
                    const Icon = icons[demo.role] || Users;

                    return (
                      <button
                        key={demo.role}
                        type="button"
                        onClick={() => handleQuickLogin(demo.role)}
                        disabled={loading}
                        className="group p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all text-left flex flex-col justify-between hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Icon className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                        </div>
                        <div className="text-xs font-bold text-white capitalize">{cfg.shortLabel}</div>
                        <div className="text-[10px] text-slate-400 truncate">{demo.name.split(' ')[0]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sign up navigation */}
              <div className="mt-6 text-center text-xs text-slate-400">
                New staff member or doctor?{' '}
                <Link to="/signup" className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-2">
                  Register new staff account
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Supabase Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Configure Supabase Anon Key
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Your Supabase project URL is <code className="text-teal-300">https://ufewrzrelrvdvuhhumde.supabase.co</code>. If you have your Supabase Anon API key from the Supabase dashboard (Project Settings &gt; API), you can paste it here:
            </p>
            <input
              type="text"
              value={anonKeyInput}
              onChange={(e) => setAnonKeyInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAnonKey}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
