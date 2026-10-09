import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  UserCheck,
  RotateCcw,
  Clock,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Tag,
  X,
} from 'lucide-react';
import { followupsApi, patientsApi } from '../api/client';
import apiClient from '../api/client';
import SlotPicker from '../components/SlotPicker';

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState([]);
  const [patients, setPatients] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedFollowupForReschedule, setSelectedFollowupForReschedule] = useState(null);
  const [isSlotPickerOpen, setIsSlotPickerOpen] = useState(false);

  // Missed reason tagger modal
  const [taggingFollowup, setTaggingFollowup] = useState(null);
  const [selectedReasonCode, setSelectedReasonCode] = useState('TRAVEL');
  const [reasonNotes, setReasonNotes] = useState('');
  const [submittingReason, setSubmittingReason] = useState(false);

  const fetchExceptions = async () => {
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

      const exceptionTasks = followupsData.filter(
        (f) =>
          f.status === 'retry' ||
          f.status === 'escalated' ||
          f.status === 'reschedule_requested' ||
          f.status === 'missed' ||
          Boolean(f.missed_reason)
      );

      setExceptions(exceptionTasks);
      setPatients(patientMap);
    } catch (err) {
      console.error('Failed to load exception queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const handleOpenReschedule = (followup) => {
    setSelectedFollowupForReschedule(followup);
    setIsSlotPickerOpen(true);
  };

  const handleOpenTagReason = (followup) => {
    setTaggingFollowup(followup);
    setSelectedReasonCode('TRAVEL');
    setReasonNotes('');
  };

  const handleSaveReasonAndResolve = async (e) => {
    e.preventDefault();
    if (!taggingFollowup) return;
    setSubmittingReason(true);
    try {
      await apiClient.post('/analytics/record-missed-reason', null, {
        params: {
          followup_id: taggingFollowup.id,
          reason_code: selectedReasonCode,
          notes: reasonNotes,
        },
      });

      await followupsApi.update(taggingFollowup.id, { status: 'completed' });
      setTaggingFollowup(null);
      fetchExceptions();
    } catch (err) {
      alert('Failed to record reason and resolve');
    } finally {
      setSubmittingReason(false);
    }
  };

  const reasonCategories = [
    { code: 'TRAVEL', label: 'Travel / Distance Delay (Pollachi / Tenkasi / Outer district)' },
    { code: 'WORK_LEAVE', label: 'Work / Leave Constraint' },
    { code: 'COST', label: 'Financial / Cost Query (EMI assistance)' },
    { code: 'FORGOT', label: 'Forgot Date / Timing' },
    { code: 'PRIVACY', label: 'Privacy Discretion' },
    { code: 'PARTNER', label: 'Spouse / Partner Availability' },
    { code: 'UNCLEAR', label: 'Unclear Preparation Instructions' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-rose-400" />
            Exception & Escalation Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Critical follow-up drops, missed medication windows, and patient reschedule requests requiring coordinator action.
          </p>
        </div>

        <button
          onClick={fetchExceptions}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          Refresh Exceptions
        </button>
      </div>

      {/* Exception Alert Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-900/40 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-rose-300">Zero Drop-Off Clinical Guardrail Active:</span> Patients flagged in this queue have encountered schedule barriers (e.g. inter-district travel delays, missed morning hCG blood draw). Clinical coordinators must intervene or re-route sample collections.
        </div>
      </div>

      {/* Exceptions List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-400 mb-3" />
          Analyzing exception queue...
        </div>
      ) : exceptions.length === 0 ? (
        <div className="p-12 text-center text-slate-300 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <div className="text-lg font-semibold text-white">All Clear! No Active Exceptions</div>
          <p className="text-xs text-slate-400">All patient follow-ups and tests are progressing on schedule.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exceptions.map((ex) => {
            const patient = patients[ex.patient_id] || { name: 'Unknown', district: 'Tamil Nadu', phone: '' };

            return (
              <div
                key={ex.id}
                className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#131b2e] to-slate-900 border border-rose-900/50 shadow-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-lg font-bold text-white">{patient.name}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded">
                      <MapPin className="w-3 h-3 text-teal-400" />
                      {patient.district}
                    </span>
                    <span className="text-xs text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded font-mono font-bold">
                      Priority {ex.priority_score}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-400">
                    Status: <strong className="text-rose-400 uppercase">{ex.status}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/30 text-sm space-y-1">
                  <div className="text-xs font-semibold text-rose-400 uppercase tracking-wide">
                    Root Cause / Exception Context
                  </div>
                  <p className="text-slate-200">{ex.missed_reason || 'Automated follow-up retry threshold exceeded without patient acknowledgment.'}</p>
                  {ex.ai_metadata?.escalated_to && (
                    <div className="text-xs text-slate-400 pt-1">
                      Assigned to: <span className="text-teal-300">{ex.ai_metadata.escalated_to}</span>
                    </div>
                  )}
                </div>

                {/* Coordinator Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Contact:</span>
                    <a
                      href={`tel:${patient.phone}`}
                      className="text-teal-300 hover:underline flex items-center gap-1 font-mono"
                    >
                      <PhoneCall className="w-3 h-3" /> {patient.phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleOpenReschedule(ex)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                      Reschedule via Slot Picker
                    </button>

                    <button
                      onClick={() => handleOpenTagReason(ex)}
                      className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Tag Root Cause & Resolve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SLOT PICKER MODAL INTEGRATION */}
      <SlotPicker
        isOpen={isSlotPickerOpen}
        onClose={() => setIsSlotPickerOpen(false)}
        followup={selectedFollowupForReschedule}
        onRescheduled={fetchExceptions}
      />

      {/* MISSED REASON TAGGER MODAL */}
      {taggingFollowup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <Tag className="w-5 h-5 text-teal-400" />
                Tag Root Cause & Resolve Exception
              </div>
              <button onClick={() => setTaggingFollowup(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReasonAndResolve} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Verified Root Cause Reason Category
                </label>
                <select
                  value={selectedReasonCode}
                  onChange={(e) => setSelectedReasonCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  {reasonCategories.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Coordinator Resolution Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Called patient; arranged evening sample collection at local center in Pollachi."
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTaggingFollowup(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReason}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20"
                >
                  {submittingReason ? 'Saving...' : 'Save & Mark Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
