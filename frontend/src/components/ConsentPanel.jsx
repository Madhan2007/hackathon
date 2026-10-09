import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, X, Check, Lock, Smartphone, MessageSquare, PhoneCall } from 'lucide-react';
import { patientsApi } from '../api/client';

export default function ConsentPanel({ isOpen, onClose, patient, onUpdated }) {
  const [privacyMode, setPrivacyMode] = useState(patient?.privacy_mode ?? false);
  const [whatsappConsent, setWhatsappConsent] = useState(patient?.consent_status ?? true);
  const [smsConsent, setSmsConsent] = useState(true);
  const [researchConsent, setResearchConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSaveConsent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await patientsApi.update(patient.id, {
        privacy_mode: privacyMode,
        consent_status: whatsappConsent,
      });
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      alert('Failed to update patient consent');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            Patient Consent & Privacy Governance
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveConsent} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <div>Patient: <strong className="text-white">{patient.name}</strong> ({patient.district})</div>
            <div>Phone: <span className="font-mono text-slate-400">{patient.phone}</span></div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Communication Channels
            </div>

            {/* WhatsApp */}
            <label className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">WhatsApp Notifications</div>
                  <div className="text-[11px] text-slate-400">Primary channel for clinical reminders & test instructions</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="w-4 h-4 text-teal-500 rounded bg-slate-800 border-slate-700 focus:ring-0"
              />
            </label>

            {/* SMS */}
            <label className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-xs font-bold text-white">SMS Fallback Channel</div>
                  <div className="text-[11px] text-slate-400">Secondary fallback if WhatsApp delivery fails</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                className="w-4 h-4 text-teal-500 rounded bg-slate-800 border-slate-700 focus:ring-0"
              />
            </label>

            {/* Privacy Mode */}
            <label className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-900/40 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-teal-400" />
                <div>
                  <div className="text-xs font-bold text-teal-300">Privacy Mode (Discreet Notifications)</div>
                  <div className="text-[11px] text-slate-400">Masks sensitive fertility terms from lock-screen previews</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={privacyMode}
                onChange={(e) => setPrivacyMode(e.target.checked)}
                className="w-4 h-4 text-teal-500 rounded bg-slate-800 border-slate-700 focus:ring-0"
              />
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20"
            >
              {submitting ? 'Saving...' : 'Save Consent Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
