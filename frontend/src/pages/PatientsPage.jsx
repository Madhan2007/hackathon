import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MapPin,
  Mail,
  Languages,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  X,
  Plus,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { patientsApi } from '../api/client';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revealedPhones, setRevealedPhones] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    language: 'ta',
    district: 'Chennai',
    privacy_mode: false,
    consent_status: true,
  });

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await patientsApi.list({
        search: searchTerm || undefined,
        district: districtFilter || undefined,
        language: languageFilter || undefined,
        limit: 50,
      });
      setPatients(data);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [districtFilter, languageFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients();
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newPatient = await patientsApi.create(formData);
      // Auto-create initial cycle for new patient
      await patientsApi.createCycle(newPatient.id, {
        stage: 'consultation',
        protocol: 'Initial Consultation & Fertility Workup',
        status: 'active',
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        language: 'ta',
        district: 'Chennai',
        privacy_mode: false,
        consent_status: true,
      });
      fetchPatients();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePhone = (id) => {
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const tnDistricts = [
    'Chennai',
    'Madurai',
    'Tirunelveli',
    'Coimbatore',
    'Salem',
    'Tiruchirappalli',
    'Erode',
    'Vellore',
    'Thanjavur',
  ];

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-teal-400" />
            Patient Directory & Clinical Cycles
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Registered fertility patients across Tamil Nadu hubs with stage tracking and consent protocols.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Register Patient
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#111827]/80 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient name, phone (+91...) or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </form>

        <div className="flex items-center gap-2.5">
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Districts</option>
            {tnDistricts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Languages</option>
            <option value="ta">Tamil (தமிழ்)</option>
            <option value="en">English</option>
          </select>

          <button
            onClick={fetchPatients}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-400 mb-3" />
          Loading patient directory...
        </div>
      ) : patients.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
          No patients found matching the criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {patients.map((p) => {
            const activeCycle = p.cycles?.[0];
            const isRevealed = revealedPhones[p.id];
            const displayPhone = p.privacy_mode && !isRevealed
              ? p.phone?.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
              : p.phone;

            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-[#111827]/90 border border-slate-800/90 hover:border-teal-500/40 transition-all shadow-md flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-lg group-hover:text-teal-300 transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                        <span>{displayPhone}</span>
                        {p.privacy_mode && (
                          <button
                            onClick={() => togglePhone(p.id)}
                            className="text-slate-500 hover:text-slate-300"
                            title="Toggle Privacy Mask"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-teal-400 font-mono mt-1">
                        <Mail className="w-3 h-3 text-teal-500" />
                        <span className="truncate max-w-[220px]">{p.email || 'No email registered'}</span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                      {p.language === 'ta' ? 'தமிழ்' : 'English'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="flex items-center gap-1 text-slate-300 bg-slate-800/70 px-2.5 py-1 rounded-md border border-slate-700/60">
                      <MapPin className="w-3 h-3 text-teal-400" />
                      {p.district}
                    </span>

                    {p.privacy_mode ? (
                      <span className="flex items-center gap-1 text-teal-300 bg-teal-950/30 px-2.5 py-1 rounded-md border border-teal-900/40">
                        <ShieldCheck className="w-3 h-3 text-teal-400" />
                        Privacy Mode
                      </span>
                    ) : (
                      <span className="text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded-md">
                        Standard Mode
                      </span>
                    )}
                  </div>

                  {/* Active Cycle Milestone */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Cycle Protocol</div>
                    <div className="font-semibold text-teal-300 capitalize">
                      {activeCycle ? activeCycle.stage.replace('_', ' ') : 'No active cycle'}
                    </div>
                    {activeCycle?.protocol && (
                      <div className="text-slate-400 text-[11px] truncate">{activeCycle.protocol}</div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Consent Verified
                  </span>
                  <span>{p.followups?.length || 0} Follow-ups</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-400" />
                Register New Fertility Patient
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Patient or Couple Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Kousalya & Rajesh"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone (WhatsApp) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98421 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Patient Email (Reminders)
                  </label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  District (Tamil Nadu) *
                </label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    {tnDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Preferred Communication Language
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: 'ta' })}
                    className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      formData.language === 'ta'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    தமிழ் (Tamil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: 'en' })}
                    className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      formData.language === 'en'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.privacy_mode}
                    onChange={(e) => setFormData({ ...formData, privacy_mode: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-0 focus:ring-offset-0 bg-slate-800 border-slate-700"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    Enable Privacy Masking (Discreet notification headers)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.consent_status}
                    onChange={(e) => setFormData({ ...formData, consent_status: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-500 focus:ring-0 focus:ring-offset-0 bg-slate-800 border-slate-700"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    WhatsApp & SMS Clinical Consent Confirmed
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold shadow-lg shadow-teal-500/20 transition-all"
                >
                  {submitting ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
