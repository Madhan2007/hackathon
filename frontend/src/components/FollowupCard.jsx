import React, { useState } from 'react';
import {
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  MapPin,
  Languages,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import PriorityBadge from './PriorityBadge';

export default function FollowupCard({ followup, patient, onUpdateStatus }) {
  const [revealed, setRevealed] = useState(false);
  const activeCycle = patient?.cycles?.[0];

  const displayPhone = patient?.privacy_mode && !revealed
    ? patient?.phone?.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
    : patient?.phone;

  const getStageColor = (stage) => {
    switch (stage) {
      case 'embryo_transfer':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'ivf_stimulation':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'beta_hcg':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Scheduled</span>;
      case 'sent':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Sent</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>;
      case 'retry':
      case 'escalated':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Attention</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">Pending</span>;
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md group relative overflow-hidden">
      {/* Priority Indicator Bar */}
      <div
        className={`absolute top-0 left-0 bottom-0 w-1.5 ${
          followup.priority_score >= 90
            ? 'bg-rose-500'
            : followup.priority_score >= 75
            ? 'bg-amber-500'
            : 'bg-teal-500'
        }`}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pl-2">
        {/* Left Info */}
        <div className="space-y-2.5 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-lg text-white group-hover:text-teal-300 transition-colors">
              {patient?.name || 'Patient'}
            </span>

            {/* Phone */}
            <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
              <Phone className="w-3 h-3 text-slate-500" />
              {displayPhone}
              {patient?.privacy_mode && (
                <button
                  onClick={() => setRevealed(!revealed)}
                  className="text-slate-400 hover:text-slate-200 ml-1"
                >
                  {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              )}
            </span>

            {/* District */}
            <span className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
              <MapPin className="w-3 h-3 text-teal-400" />
              {patient?.district}
            </span>

            {/* Language */}
            <span className="flex items-center gap-1 text-xs text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/40">
              <Languages className="w-3 h-3 text-indigo-400" />
              {patient?.language === 'ta' ? 'தமிழ்' : 'English'}
            </span>

            {/* Cycle Stage */}
            {activeCycle && (
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded border ${getStageColor(activeCycle.stage)}`}>
                {activeCycle.stage.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>

          {/* AI Personalized Message Snippet */}
          {followup.ai_metadata?.tam_message && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-teal-400 text-[10px] uppercase">
                <Sparkles className="w-3 h-3" />
                AI Outreach Preview (Tamil)
              </div>
              <p className="text-slate-200 leading-relaxed font-normal">{followup.ai_metadata.tam_message}</p>
              {followup.ai_metadata?.medication_name && (
                <div className="text-[11px] text-amber-300/90 font-medium pt-0.5">
                  💊 Rx: {followup.ai_metadata.medication_name}
                </div>
              )}
            </div>
          )}

          {followup.missed_reason && (
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span><strong>Delay Reason:</strong> {followup.missed_reason}</span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 min-w-[200px] border-t lg:border-t-0 border-slate-800 pt-3 lg:pt-0">
          <div className="flex items-center gap-3">
            <PriorityBadge score={followup.priority_score} />
            {getStatusBadge(followup.status)}
          </div>

          <div className="flex items-center gap-2 w-full justify-end">
            {followup.status !== 'sent' && followup.status !== 'completed' && (
              <button
                onClick={() => onUpdateStatus(followup.id, 'sent')}
                className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            )}

            {followup.status !== 'completed' && (
              <button
                onClick={() => onUpdateStatus(followup.id, 'completed')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
