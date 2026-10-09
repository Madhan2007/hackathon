import React from 'react';
import { Flame, ShieldAlert, Sparkles } from 'lucide-react';

export default function PriorityBadge({ score }) {
  let badgeStyle = "bg-teal-500/10 text-teal-400 border-teal-500/30";
  let icon = <Flame className="w-3.5 h-3.5 text-teal-400" />;
  let label = "Standard";

  if (score >= 90) {
    badgeStyle = "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-950";
    icon = <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
    label = "Critical";
  } else if (score >= 75) {
    badgeStyle = "bg-amber-500/15 text-amber-300 border-amber-500/30";
    icon = <Flame className="w-3.5 h-3.5 text-amber-400" />;
    label = "High";
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${badgeStyle}`}>
      {icon}
      <span className="font-mono">{score}</span>
      <span className="text-[10px] opacity-75 font-normal">({label})</span>
    </div>
  );
}
