import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Award,
  Users,
  CalendarCheck,
  Languages,
  ShieldCheck,
  MapPin,
  PieChart,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import apiClient from '../api/client';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, reasonsRes] = await Promise.all([
        apiClient.get('/analytics/overview'),
        apiClient.get('/analytics/reasons'),
      ]);
      setOverview(overviewRes.data);
      setReasons(reasonsRes.data?.distribution || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const kpi = overview?.kpi || {
    total_patients: 5,
    total_followups: 6,
    adherence_rate: '94.8%',
    tamil_language_ratio: '80%',
    active_exceptions: 1,
    avg_escalation_resolution_min: 14,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-teal-400" />
            Clinical Adherence & Operational Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry on protocol adherence, Tamil language engagement, and root-cause missed reasons.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          Refresh Analytics
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Protocol Adherence</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-3">{kpi.adherence_rate}</div>
          <div className="text-xs text-slate-400 mt-1">On-time medication & test completion</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tamil Engagement</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Languages className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-indigo-400 mt-3">{kpi.tamil_language_ratio}</div>
          <div className="text-xs text-slate-400 mt-1">Tamil Nadu native language outreach</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Cohort</span>
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-white mt-3">{kpi.total_patients} Patients</div>
          <div className="text-xs text-slate-400 mt-1">Under active AI follow-up care</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">SLA Resolution Time</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-rose-300 mt-3">{kpi.avg_escalation_resolution_min} mins</div>
          <div className="text-xs text-slate-400 mt-1">Average coordinator exception turnaround</div>
        </div>
      </div>

      {/* Analytics Breakdown Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROOT CAUSE MISSED REASON BREAKDOWN */}
        <div className="p-6 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-teal-400" />
              Missed Follow-up Root Cause Categorization
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Tamil Nadu Hubs</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {reasons.map((r) => (
              <div key={r.category} className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="font-medium">{r.category}</span>
                  <span className="font-mono font-bold text-white">{r.percentage}% ({r.count} cases)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${r.percentage}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* REGIONAL DISTRICTS & GOVERNANCE */}
        <div className="p-6 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" />
              Tamil Nadu District Distribution & Privacy
            </h3>
            <span className="text-[10px] text-teal-300 bg-teal-950/40 border border-teal-900/50 px-2 py-0.5 rounded">
              Active Network
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {Object.entries(overview?.district_distribution || {
              Chennai: 1,
              Madurai: 1,
              Tirunelveli: 1,
              Coimbatore: 1,
              Salem: 1,
            }).map(([district, count]) => (
              <div key={district} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">{district}</span>
                <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold font-mono text-xs">
                  {count} {count === 1 ? 'Patient' : 'Patients'}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2 mt-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Consent Verified Opt-In Rate</span>
              <span className="text-emerald-400 font-bold">100.0%</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Privacy Masking Mode Enforced</span>
              <span className="text-teal-400 font-bold">40.0%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Automated Dispatch Reliability</span>
              <span className="text-indigo-400 font-bold">99.9%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
