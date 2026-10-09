import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Phone,
  MapPin,
  Flame,
  Languages,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { followupsApi, patientsApi } from '../api/client';

export default function QueuePage() {
  const [followups, setFollowups] = useState([]);
  const [patients, setPatients] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [revealedPhones, setRevealedPhones] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [followupsData, patientsData] = await Promise.all([
        followupsApi.list({ limit: 50 }),
        patientsApi.list({ limit: 50 }),
      ]);

      const patientMap = {};
      patientsData.forEach((p) => {
        patientMap[p.id] = p;
      });

      setFollowups(followupsData);
      setPatients(patientMap);
    } catch (err) {
      console.error('Failed to load queue data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await followupsApi.update(id, { status: newStatus });
      setFollowups((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      );
    } catch (err) {
      alert('Error updating follow-up status');
    }
  };

  const togglePhoneReveal = (id) => {
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFollowups = followups.filter((f) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'high_priority') return f.priority_score >= 85;
    if (activeFilter === 'medication') return f.type === 'medication';
    if (activeFilter === 'tests') return f.type === 'pregnancy_test' || f.type === 'investigation';
    return f.status === activeFilter;
  });

  const getStageBadgeColor = (stage) => {
    switch (stage) {
      case 'embryo_transfer':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'ivf_stimulation':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'beta_hcg':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'consultation':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'investigation':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Scheduled</span>;
      case 'sent':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Sent</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>;
      case 'retry':
      case 'escalated':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Attention Required</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarClock className="w-7 h-7 text-teal-400" />
            Today's Priority Follow-up Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time AI orchestrated follow-ups prioritized by clinical urgency and medication schedules.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/60 border border-slate-800 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Follow-ups</div>
          <div className="text-3xl font-extrabold text-white mt-2">{followups.length}</div>
          <div className="text-xs text-teal-400 mt-1 font-medium">All active queue tasks</div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/60 border border-slate-800 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">High Priority (&ge;85)</div>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">
            {followups.filter((f) => f.priority_score >= 85).length}
          </div>
          <div className="text-xs text-rose-300/80 mt-1 font-medium">Clinical critical timing</div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/60 border border-slate-800 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tamil Notifications</div>
          <div className="text-3xl font-extrabold text-indigo-400 mt-2">
            {followups.filter((f) => patients[f.patient_id]?.language === 'ta').length}
          </div>
          <div className="text-xs text-indigo-300/80 mt-1 font-medium">Tamil Nadu Regional Language</div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/60 border border-slate-800 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Scheduled / Sent</div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">
            {followups.filter((f) => f.status === 'scheduled' || f.status === 'sent').length}
          </div>
          <div className="text-xs text-emerald-300/80 mt-1 font-medium">Auto-dispatch engaged</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'high_priority', label: '🔥 High Priority' },
          { id: 'scheduled', label: '⏳ Scheduled' },
          { id: 'medication', label: '💊 Medication' },
          { id: 'tests', label: '🧪 Tests & Scans' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === tab.id
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue List Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-400 mb-3" />
          Loading patient priority queue...
        </div>
      ) : filteredFollowups.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
          No follow-ups matching this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFollowups.map((f) => {
            const patient = patients[f.patient_id] || { name: 'Unknown', district: 'Tamil Nadu', language: 'ta' };
            const activeCycle = patient.cycles?.[0];
            const isRevealed = revealedPhones[f.id];
            const maskedPhone = patient.privacy_mode && !isRevealed
              ? patient.phone?.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
              : patient.phone;

            return (
              <div
                key={f.id}
                className="p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md group relative overflow-hidden"
              >
                {/* Priority Glow Bar */}
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                    f.priority_score >= 90
                      ? 'bg-rose-500'
                      : f.priority_score >= 80
                      ? 'bg-amber-500'
                      : 'bg-teal-500'
                  }`}
                />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pl-2">
                  {/* Left: Patient & Clinical Context */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-bold text-lg text-white group-hover:text-teal-300 transition-colors">
                        {patient.name}
                      </span>

                      {/* Phone with Privacy Masking */}
                      <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {maskedPhone}
                        {patient.privacy_mode && (
                          <button
                            onClick={() => togglePhoneReveal(f.id)}
                            className="text-slate-400 hover:text-slate-200 ml-1"
                            title="Toggle Privacy Mask"
                          >
                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        )}
                      </span>

                      {/* District Badge */}
                      <span className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
                        <MapPin className="w-3 h-3 text-teal-400" />
                        {patient.district}
                      </span>

                      {/* Language Badge */}
                      <span className="flex items-center gap-1 text-xs text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/40">
                        <Languages className="w-3 h-3 text-indigo-400" />
                        {patient.language === 'ta' ? 'தமிழ் (Tamil)' : 'English'}
                      </span>

                      {/* Cycle Stage Badge */}
                      {activeCycle && (
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded border ${getStageBadgeColor(activeCycle.stage)}`}>
                          Stage: {activeCycle.stage.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* AI Follow-up Message Preview */}
                    {f.ai_metadata?.tam_message && (
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-sm text-slate-300 flex items-start gap-2.5 mt-2">
                        <Sparkles className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-[11px] font-semibold text-teal-400 mb-0.5 uppercase tracking-wide">
                            AI Personalized Outreach (Tamil)
                          </div>
                          <p className="text-slate-200 font-normal leading-relaxed">{f.ai_metadata.tam_message}</p>
                          {f.ai_metadata.medication_name && (
                            <div className="text-xs text-amber-300/90 font-medium mt-1">
                              💊 Rx: {f.ai_metadata.medication_name}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {f.ai_metadata?.eng_message && (
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-sm text-slate-300 flex items-start gap-2.5 mt-2">
                        <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-[11px] font-semibold text-indigo-400 mb-0.5 uppercase tracking-wide">
                            AI Personalized Outreach (English)
                          </div>
                          <p className="text-slate-200 font-normal leading-relaxed">{f.ai_metadata.eng_message}</p>
                        </div>
                      </div>
                    )}

                    {f.missed_reason && (
                      <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span><strong>Delay / Missed Reason:</strong> {f.missed_reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Urgency Score & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 min-w-[200px] border-t lg:border-t-0 border-slate-800 pt-3 lg:pt-0">
                    <div className="flex items-center gap-3">
                      {/* Priority Score Metric */}
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/90 border border-slate-700">
                        <Flame className={`w-4 h-4 ${f.priority_score >= 85 ? 'text-rose-400' : 'text-amber-400'}`} />
                        <span className="text-xs text-slate-400">Score:</span>
                        <span className="text-sm font-bold text-white">{f.priority_score}</span>
                      </div>
                      {getStatusBadge(f.status)}
                    </div>

                    {/* Coordinator Quick Action Buttons */}
                    <div className="flex items-center gap-2 w-full justify-end">
                      {f.status !== 'sent' && f.status !== 'completed' && (
                        <button
                          onClick={() => handleUpdateStatus(f.id, 'sent')}
                          className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send Now
                        </button>
                      )}

                      {f.status !== 'completed' && (
                        <button
                          onClick={() => handleUpdateStatus(f.id, 'completed')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
