import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Check, X, RefreshCw, Sparkles, MapPin } from 'lucide-react';
import apiClient from '../api/client';

export default function SlotPicker({ isOpen, onClose, followup, onRescheduled }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('ALL');

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
    }
  }, [isOpen]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/appointments/slots');
      setSlots(res.data || []);
      if (res.data?.length > 0) {
        setSelectedSlot(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot || !followup) return;
    setSubmitting(true);
    try {
      await apiClient.post('/appointments/reschedule', {
        followup_id: followup.id,
        target_slot_datetime: selectedSlot.datetime,
        reason: 'Staff Coordinator rescheduled via Slot Picker',
        doctor_name: selectedSlot.doctor_name,
        changed_by: 'coordinator',
      });
      if (onRescheduled) onRescheduled();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Reschedule failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredSlots = slots.filter((s) => {
    if (periodFilter === 'ALL') return true;
    return s.period === periodFilter;
  });

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-white text-base">Select Alternative Clinic Slot</h3>
              <p className="text-xs text-slate-400">Atomic rescheduling with real-time calendar lock & reminder sync</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {['ALL', 'MORNING', 'AFTERNOON', 'EVENING'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                periodFilter === p
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Slots List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
              <span>Checking clinic provider calendars...</span>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">No slots found matching preference.</div>
          ) : (
            filteredSlots.map((slot) => {
              const isSelected = selectedSlot?.slot_id === slot.slot_id;
              return (
                <div
                  key={slot.slot_id}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-950/40 to-indigo-950/40 border-teal-500 shadow-md ring-1 ring-teal-500/50'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{slot.formatted_date}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-teal-300 border border-slate-700">
                        {slot.formatted_time}
                      </span>
                      <span className="text-[10px] text-indigo-400 font-semibold uppercase">{slot.period}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {slot.doctor_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {slot.location}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'bg-teal-500 border-teal-400 text-slate-950'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {selectedSlot ? (
              <span>Selected: <strong className="text-teal-300">{selectedSlot.formatted_date} ({selectedSlot.formatted_time})</strong></span>
            ) : (
              <span>Select an available slot above</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submitting || !selectedSlot}
              onClick={handleConfirmReschedule}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center gap-1.5"
            >
              {submitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              Confirm Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
