import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  HeartPulse,
  Activity,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { patientsApi, cyclesApi } from '../api/client';
import AuditTrail from '../components/AuditTrail';
import PatientTimeline from '../components/PatientTimeline';

export default function DoctorSummary() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await patientsApi.list();
      setPatients(data);
      if (data.length > 0 && !selectedPatient) {
        setSelectedPatient(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const activeCycle = selectedPatient?.cycles?.[0];

  const handleAdvanceStage = async (nextStage, eventName) => {
    if (!activeCycle) return;
    setTransitioning(true);
    try {
      await cyclesApi.recordEvent(activeCycle.id, {
        event_type: eventName,
        new_stage: nextStage,
        note: `Doctor advanced patient milestone to ${nextStage}`,
        metadata: { physician_action: true, timestamp: new Date().toISOString() },
      });
      await fetchPatients();
      const updated = patients.find((p) => p.id === selectedPatient.id);
      if (updated) setSelectedPatient(updated);
    } catch (err) {
      alert('Failed to advance cycle stage');
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Stethoscope className="w-7 h-7 text-teal-400" />
            Physician Summary & Clinical Station
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Compact clinical dashboard for consulting doctors, embryologists, and duty nurses.
          </p>
        </div>

        <button
          onClick={() => setIsAuditOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition-all self-start md:self-auto"
        >
          <History className="w-4 h-4 text-teal-400" />
          View Immutable Audit Logs
        </button>
      </div>

      {/* Main Grid: Patient List on Left, Comprehensive Clinical Chart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Patient Selection List */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
            Active Treatment Cohort ({patients.length})
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {patients.map((p) => {
              const cycle = p.cycles?.[0];
              const isSelected = selectedPatient?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-950/40 to-indigo-950/40 border-teal-500 shadow-md ring-1 ring-teal-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{p.name}</span>
                    <span className="text-[10px] font-mono text-teal-300 bg-slate-800 px-2 py-0.5 rounded">
                      {p.district}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                    <span className="text-teal-400 font-semibold capitalize">
                      {cycle ? cycle.stage.replace('_', ' ') : 'No cycle'}
                    </span>
                    <span className="text-[11px]">{p.language === 'ta' ? 'தமிழ்' : 'English'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Patient Clinical Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {selectedPatient ? (
            <>
              {/* Doctor Action Panel */}
              <div className="p-6 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      {selectedPatient.name}
                      <span className="text-xs px-2.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
                        {selectedPatient.phone}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      District: <strong className="text-slate-200">{selectedPatient.district}</strong> • Privacy Mode: <strong className="text-teal-400">{selectedPatient.privacy_mode ? 'Enforced' : 'Off'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Protocol: {activeCycle?.protocol || 'Antagonist Protocol'}
                    </span>
                  </div>
                </div>

                {/* Quick Doctor Stage Transition Actions */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    One-Click Stage Milestone Progression
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      disabled={transitioning}
                      onClick={() => handleAdvanceStage('egg_retrieval', 'EGG_RETRIEVAL_COMPLETED')}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 text-left text-xs space-y-1 transition-all group"
                    >
                      <div className="font-bold text-white group-hover:text-teal-300 flex items-center justify-between">
                        <span>Egg Retrieval Done</span>
                        <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                      </div>
                      <p className="text-[11px] text-slate-400">Trigger embryology report</p>
                    </button>

                    <button
                      disabled={transitioning}
                      onClick={() => handleAdvanceStage('embryo_transfer', 'EMBRYO_TRANSFER_COMPLETED')}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-left text-xs space-y-1 transition-all group"
                    >
                      <div className="font-bold text-white group-hover:text-purple-300 flex items-center justify-between">
                        <span>Embryo Transfer Done</span>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <p className="text-[11px] text-slate-400">Auto-schedules Day-14 Beta-hCG</p>
                    </button>

                    <button
                      disabled={transitioning}
                      onClick={() => handleAdvanceStage('beta_hcg', 'BETA_HCG_ORDERED')}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-left text-xs space-y-1 transition-all group"
                    >
                      <div className="font-bold text-white group-hover:text-rose-300 flex items-center justify-between">
                        <span>Order Beta-hCG Test</span>
                        <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <p className="text-[11px] text-slate-400">Triggers urgent lab booking</p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Patient Timeline Component Integration */}
              <PatientTimeline patient={selectedPatient} />
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
              Select a patient on the left to review their clinical station chart.
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Audit Trail Drawer */}
      <AuditTrail
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        recordId={selectedPatient?.id}
        tableName="patients"
      />
    </div>
  );
}
