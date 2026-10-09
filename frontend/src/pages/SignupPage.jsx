import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, ROLE_CONFIG } from '../context/AuthContext';
import {
  HeartPulse,
  Mail,
  Lock,
  User,
  Building2,
  ShieldCheck,
  Stethoscope,
  Users,
  Activity,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'coordinator',
    department: 'Reproductive Medicine',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const rolesList = [
    {
      id: 'admin',
      title: 'Clinic Administrator',
      icon: ShieldCheck,
      badge: 'Full Access',
      desc: 'Supervision, all modules, patient records, user role permissions.',
      accent: 'border-purple-500/40 text-purple-400',
    },
    {
      id: 'doctor',
      title: 'Fertility Doctor / Specialist',
      icon: Stethoscope,
      badge: 'Clinical Authority',
      desc: 'Doctor summary, IVF cycle protocols, medical escalations, analytics.',
      accent: 'border-teal-500/40 text-teal-400',
    },
    {
      id: 'coordinator',
      title: 'Clinical Coordinator',
      icon: Users,
      badge: 'Patient Hub',
      desc: 'Follow-up queues, patient WhatsApp chat, rescheduling & AI simulator.',
      accent: 'border-indigo-500/40 text-indigo-400',
    },
    {
      id: 'nurse',
      title: 'Staff Nurse / Clinical Care',
      icon: Activity,
      badge: 'Care Unit',
      desc: 'Daily patient queue, injection tracking, vitals, exception review.',
      accent: 'border-emerald-500/40 text-emerald-400',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const newUser = await signup(formData);
      const roleCfg = ROLE_CONFIG[newUser.role?.toLowerCase()] || ROLE_CONFIG.coordinator;
      navigate(roleCfg.defaultPath, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Signup failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center relative overflow-hidden font-sans selection:bg-teal-500 selection:text-white py-12 px-4">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>FertiFlow AI • Clinical Onboarding</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/25 ring-1 ring-white/20">
              <HeartPulse className="w-6 h-6 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Register Clinic Staff Account
            </h1>
          </div>

          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create an account with role-based access to the fertility follow-up orchestration platform.
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl bg-[#0d1424]/90 border border-slate-800/90 backdrop-blur-2xl shadow-2xl shadow-slate-950/80">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Role Selection Cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                1. Select Your Clinical Role (Role-Based Access)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {rolesList.map((r) => {
                  const Icon = r.icon;
                  const isSelected = formData.role === r.id;

                  return (
                    <div
                      key={r.id}
                      onClick={() => setFormData({ ...formData, role: r.id })}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all relative ${
                        isSelected
                          ? 'bg-gradient-to-b from-teal-500/15 to-indigo-600/15 border-teal-500 ring-2 ring-teal-500/30 shadow-lg shadow-teal-950/40'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        </div>
                      )}

                      <div className={`w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center mb-2.5 ${r.accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="text-xs font-bold text-white mb-1">{r.title}</div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 inline-block mb-2">
                        {r.badge}
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{r.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Account Details */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                2. Professional Information
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="e.g. Dr. Subha Lakshmi"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Department / Unit</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g. Reproductive Medicine"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Clinic Work Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. staff@fertiflow.ai"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Clinical Account...
                </span>
              ) : (
                <>
                  <span>Complete Registration & Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 text-center text-xs text-slate-400 pt-4 border-t border-slate-800">
            Already have an active staff account?{' '}
            <Link to="/login" className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-2">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
