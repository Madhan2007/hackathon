import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Zap,
  Smartphone,
  Layers,
  MapPin,
} from 'lucide-react';
import { patientsApi, cyclesApi, followupsApi } from '../api/client';
import WhatsAppSimulator from '../components/WhatsAppSimulator';

export default function SimulatorPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' or 'events'
  const [eventType, setEventType] = useState('EMBRYO_TRANSFER_COMPLETED');
  const [newStage, setNewStage] = useState('embryo_transfer');
  const [clinicalNote, setClinicalNote] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [patientFollowups, setPatientFollowups] = useState([]);

  const loadData = async () => {
    try {
      const data = await patientsApi.list();
      setPatients(data);
      if (data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadFollowups = async (patientId) => {
    if (!patientId) return;
    try {
      const flist = await followupsApi.list({ patient_id: patientId });
      setPatientFollowups(flist);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadFollowups(selectedPatientId);
    }
  }, [selectedPatientId]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const activeCycle = selectedPatient?.cycles?.[0];
  const activeFollowup = patientFollowups[0] || selectedPatient?.followups?.[0];

  const handleSimulateEvent = async (e) => {
    e.preventDefault();
    if (!activeCycle) {
      alert('Selected patient does not have an active cycle.');
      return;
    }

    setSimulating(true);
    setSimulationResult(null);
    try {
      const res = await cyclesApi.recordEvent(activeCycle.id, {
        event_type: eventType,
        new_stage: newStage,
        note: clinicalNote || `Clinical milestone ${eventType} logged for ${selectedPatient.name}`,
        metadata: {
          simulated: true,
          triggered_by: 'coordinator_simulator',
          timestamp: new Date().toISOString(),
        },
      });
      setSimulationResult(res);
      await loadData();
      await loadFollowups(selectedPatient.id);
    } catch (err) {
      alert(err.response?.data?.detail || 'Simulation event failed');
    } finally {
      setSimulating(false);
    }
  };

  const stages = [
    { value: 'enquiry', label: 'Enquiry' },
    { value: 'consultation', label: 'Doctor Consultation' },
    { value: 'investigation', label: 'Pre-cycle Investigation' },
    { value: 'diagnosis', label: 'Diagnosis & Workup' },
    { value: 'treatment_decision', label: 'Treatment Decision' },
    { value: 'iui_prep', label: 'IUI Preparation' },
    { value: 'ivf_stimulation', label: 'IVF Stimulation' },
    { value: 'egg_retrieval', label: 'Egg Retrieval (OPU)' },
    { value: 'embryo_transfer', label: 'Embryo Transfer (ET)' },
    { value: 'post_transfer', label: 'Post-Transfer Luteal Support' },
    { value: 'beta_hcg', label: 'Beta hCG Pregnancy Test' },
    { value: 'outcome', label: 'Cycle Outcome' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Patient Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-indigo-400" />
            Patient Follow-up & AI Outreach Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Interactive multi-channel testbed: Trigger clinical events and test multilingual Gemini NLU intent classification.
          </p>
        </div>

        {/* Global Patient Switcher */}
        <div className="flex items-center gap-2 bg-[#111827] p-1.5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 pl-2">Active Demo Patient:</span>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-teal-300 focus:outline-none focus:border-teal-500"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.district} • {p.language === 'ta' ? 'தமிழ்' : 'English'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Clinical Context Card */}
      {selectedPatient && (
        <div className="p-4 rounded-2xl bg-[#0d1424]/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 font-bold flex items-center justify-center text-sm">
              {selectedPatient.name.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>{selectedPatient.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-slate-700">
                  {selectedPatient.language === 'ta' ? 'தமிழ் (Tamil)' : 'English'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Consent: Active
                </span>
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                Phone: <span className="font-mono text-slate-300">{selectedPatient.phone}</span> • District: {selectedPatient.district}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Cycle Stage</div>
              <div className="font-bold text-teal-300 capitalize">{activeCycle?.stage?.replace('_', ' ') || 'None'}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Follow-up Status</div>
              <div className="font-bold text-amber-300 uppercase">{activeFollowup?.status || 'Sent'}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Priority Score</div>
              <div className="font-bold text-rose-400 font-mono">{activeFollowup?.priority_score || '75'}/100</div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'whatsapp'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          📱 WhatsApp Mobile Simulator & Gemini NLU
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'events'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          ⚡ Clinical Stage Event & Task Generator
        </button>
      </div>

      {/* TAB 1: WHATSAPP MOBILE SIMULATOR */}
      {activeTab === 'whatsapp' && (
        <WhatsAppSimulator
          patient={selectedPatient}
          currentFollowup={activeFollowup}
          onFollowupUpdated={() => loadFollowups(selectedPatientId)}
        />
      )}

      {/* TAB 2: CLINICAL EVENT TRIGGER TESTBENCH */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Trigger Configuration */}
          <div className="lg:col-span-6 p-6 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-5">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
              <Zap className="w-5 h-5 text-teal-400" />
              Log Clinical Stage Event
            </div>

            <form onSubmit={handleSimulateEvent} className="space-y-4">
              {selectedPatient && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div>Patient: <strong className="text-white">{selectedPatient.name}</strong> ({selectedPatient.district})</div>
                  <div>Current Stage: <strong className="text-teal-300 capitalize">{activeCycle?.stage || 'None'}</strong></div>
                  <div>Protocol: <span className="text-slate-400">{activeCycle?.protocol || 'Standard'}</span></div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Clinical Event Trigger Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => {
                    setEventType(e.target.value);
                    if (e.target.value === 'EMBRYO_TRANSFER_COMPLETED') setNewStage('embryo_transfer');
                    else if (e.target.value === 'IVF_STIMULATION_STARTED') setNewStage('ivf_stimulation');
                    else if (e.target.value === 'EGG_RETRIEVAL_COMPLETED') setNewStage('egg_retrieval');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="EMBRYO_TRANSFER_COMPLETED">EMBRYO_TRANSFER_COMPLETED (Auto-triggers Beta-hCG + Progesterone)</option>
                  <option value="IVF_STIMULATION_STARTED">IVF_STIMULATION_STARTED (Auto-triggers Follicular Scan)</option>
                  <option value="EGG_RETRIEVAL_COMPLETED">EGG_RETRIEVAL_COMPLETED (Auto-triggers Fertilization Review)</option>
                  <option value="CONSULTATION_COMPLETED">CONSULTATION_COMPLETED (Auto-triggers Baseline Investigation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Cycle Stage
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                >
                  {stages.map((st) => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Doctor / Embryologist Clinical Note
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Day-5 Grade 4AA Blastocyst transferred under ultrasound guidance..."
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={simulating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
              >
                {simulating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-slate-950" />
                )}
                Log Event & Auto-Generate Tasks
              </button>
            </form>
          </div>

          {/* Right: Event & Task Generation Telemetry */}
          <div className="lg:col-span-6 p-6 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Event Telemetry & Generated Follow-ups
            </div>

            {simulationResult ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-xs text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>{simulationResult.message}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-2 text-slate-300 overflow-x-auto">
                  <div className="text-teal-400 font-bold mb-1">// Event Execution Payload</div>
                  <pre>{JSON.stringify(simulationResult, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800/80 space-y-2">
                <Bot className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs">Select an event and click Log Event to view real-time stage progression and automated tasks generated.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
