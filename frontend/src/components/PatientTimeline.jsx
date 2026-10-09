import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Sparkles,
  HeartPulse,
  Activity,
} from 'lucide-react';

export default function PatientTimeline({ patient }) {
  const activeCycle = patient?.cycles?.[0];
  const currentStage = activeCycle?.stage || 'enquiry';

  const STAGES = [
    { key: 'enquiry', label: 'Initial Enquiry' },
    { key: 'consultation', label: 'Doctor Consultation' },
    { key: 'investigation', label: 'Diagnostic Workup' },
    { key: 'treatment_decision', label: 'Protocol Decision' },
    { key: 'ivf_stimulation', label: 'IVF Stimulation' },
    { key: 'egg_retrieval', label: 'Egg Retrieval (OPU)' },
    { key: 'embryo_transfer', label: 'Embryo Transfer (ET)' },
    { key: 'post_transfer', label: 'Luteal Support' },
    { key: 'beta_hcg', label: 'Beta-hCG Blood Test' },
    { key: 'outcome', label: 'Outcome & Ongoing Care' },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="p-6 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <HeartPulse className="w-5 h-5 text-teal-400" />
          <div>
            <h3 className="font-bold text-white text-base">Fertility Journey & Milestone Timeline</h3>
            <p className="text-xs text-slate-400">
              Protocol: <span className="text-teal-300 font-semibold">{activeCycle?.protocol || 'Standard Clinical Protocol'}</span>
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
          Cycle Stage: {currentStage.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {STAGES.map((st, index) => {
          const isPassed = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isUpcoming = index > currentStageIndex;

          return (
            <div key={st.key} className="relative flex items-start gap-4">
              {/* Stepper Node Icon */}
              <div
                className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-[#111827] ${
                  isPassed
                    ? 'bg-emerald-500 text-slate-950'
                    : isCurrent
                    ? 'bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/30 animate-pulse'
                    : 'bg-slate-800 text-slate-600'
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                ) : isCurrent ? (
                  <Activity className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <Circle className="w-2.5 h-2.5" />
                )}
              </div>

              {/* Milestone Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${
                      isCurrent
                        ? 'text-teal-300'
                        : isPassed
                        ? 'text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    {st.label}
                  </span>

                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      CURRENT ACTIVE
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  {isPassed
                    ? 'Completed clinical milestone and verified'
                    : isCurrent
                    ? 'Active clinical milestone with scheduled automated reminders'
                    : 'Upcoming milestone stage'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
