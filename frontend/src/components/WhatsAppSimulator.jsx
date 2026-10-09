import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  FileText,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  Stethoscope,
  Volume2,
  Play,
  Pause,
  Zap,
} from 'lucide-react';
import apiClient from '../api/client';

export default function WhatsAppSimulator({ patient, currentFollowup, onFollowupUpdated }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const chatEndRef = useRef(null);

  // Initialize conversation when patient/followup changes
  useEffect(() => {
    if (patient) {
      const initialOutbound =
        currentFollowup?.ai_metadata?.tam_message ||
        `வணக்கம் ${patient.name} அவர்களே! FertiFlow கிளினிக்கில் உங்கள் அடுத்த follow-up திட்டமிடப்பட்டுள்ளது.\n\nதயவுசெய்து பதிலளிக்கவும்:\n1️⃣ - வருகிறேன் (Confirm)\n2️⃣ - தேதி மாற்ற வேண்டும் (Reschedule)\n3️⃣ - உதவி தேவை (Assistance)`;

      setMessages([
        {
          id: 'out-1',
          sender: 'clinic',
          text: initialOutbound,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
        },
      ]);
      setLastAnalysis(null);
    }
  }, [patient?.id, currentFollowup?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textOverride, attachmentMeta = null) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || !patient) return;

    const userMsgObj = {
      id: `user-${Date.now()}`,
      sender: 'patient',
      text: textToSend,
      attachment: attachmentMeta,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsgObj]);
    if (!textOverride) setInputText('');
    setLoading(true);

    try {
      const payload = {
        phone: patient.phone,
        message: textToSend,
        channel: 'whatsapp',
        patient_id: patient.id,
        followup_id: currentFollowup?.id,
      };

      if (attachmentMeta) {
        payload.attachment_type = attachmentMeta.type;
        payload.attachment_data = attachmentMeta.data;
      }

      const res = await apiClient.post('/webhooks/whatsapp', payload);
      const reply = res.data;
      setLastAnalysis(reply);

      // Add Clinic / AI Auto-reply with slight delay for realistic simulation
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `reply-${Date.now()}`,
            sender: 'clinic',
            text: reply.reply_message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read',
            slotsAvailable: reply.workflow_action === 'RESCHEDULE_SLOTS_OFFERED',
          },
        ]);
        setLoading(false);
        if (onFollowupUpdated) onFollowupUpdated();
      }, 600);
    } catch (err) {
      console.error('Webhook processing failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'clinic',
          text: 'Error processing message via AI router. Please check backend connection.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setLoading(false);
    }
  };

  const handleSelectSlot = (slotNumber) => {
    handleSendMessage(`${slotNumber}. Book Option ${slotNumber}`);
  };

  const handleSendVoiceNote = () => {
    handleSendMessage(
      '🎙️ [Voice Memo - 0:14]: "டாக்டர், ஊசி போட்ட இடத்துல வலி அதிகமா இருக்கு, இன்னைக்கு வர முடியாது..."',
      {
        type: 'voice_note',
        data: { duration_sec: 14, audio_sample: 'tamil_rural_patient_query' },
      }
    );
  };

  const handleSendLabReport = () => {
    handleSendMessage(
      '🧪 [Lab Report Document Attached]: Day-14 Serum Beta-hCG = 520 mIU/mL (Positive)',
      {
        type: 'lab_report',
        data: { test: 'Serum Beta-hCG', value: '520 mIU/mL', result: 'Positive Pregnancy' },
      }
    );
  };

  // Grouped Clinical Scenarios
  const scenarios = [
    {
      category: 'Routine Responses',
      items: [
        { label: '✅ 1 - Confirm (வருகிறேன்)', text: '1. வருகிறேன்' },
        { label: '👍 Confirm in English', text: 'Yes, I will attend the appointment tomorrow at 10 AM' },
      ],
    },
    {
      category: 'Rescheduling Scenarios',
      items: [
        { label: '📅 Request Monday Slot', text: 'நாளைக்கு வர முடியாது. Monday காலை வரலாமா?' },
        { label: '🕒 Request Afternoon', text: 'Can I come in the afternoon after 2 PM?' },
        { label: '1️⃣ Pick Slot 1 (Monday 10 AM)', text: '1' },
        { label: '2️⃣ Pick Slot 2 (Tuesday 11:30 AM)', text: '2' },
      ],
    },
    {
      category: '🚨 Clinical Escalations (L3 Safety)',
      items: [
        { label: '🚨 Severe Pelvic Pain (வயிறு வலி)', text: 'ரொம்ப அடிவயிறு வலிக்குது, bleeding ஆகுது டாக்டர்' },
        { label: '🩸 Post-ET Spotting Alert', text: 'Transfer முடிஞ்சு 5 நாள் ஆகுது, லேசா blood வருது, பயமா இருக்கு' },
        { label: '💉 Missed Progesterone Injection', text: 'நேத்து நைட் progesterone injection போட மறந்துட்டேன்' },
      ],
    },
    {
      category: '💰 Financial & Support',
      items: [
        { label: '💳 Treatment Cost & EMI Query', text: 'அடுத்த cycle-க்கு மொத்தமா பணம் கட்டணுமா இல்லை EMI option இருக்கா?' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* PHONE FRAME MOCKUP */}
      <div className="lg:col-span-7 flex justify-center">
        <div className="w-full max-w-[400px] h-[670px] bg-[#0b141a] rounded-[44px] border-[8px] border-slate-800 shadow-2xl flex flex-col overflow-hidden relative ring-1 ring-white/10">
          {/* Phone Speaker Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-800 rounded-full z-30" />

          {/* WhatsApp Header */}
          <div className="bg-[#1f2c34] px-4 pt-8 pb-3 flex items-center justify-between border-b border-slate-800 text-slate-100 z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-sm ring-1 ring-teal-400">
                {patient ? patient.name.charAt(0) : 'P'}
              </div>
              <div className="leading-tight">
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>{patient?.name || 'Patient'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-teal-400 font-mono">
                  {patient?.district} • {patient?.phone}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              <Video className="w-4 h-4 cursor-pointer hover:text-white" />
              <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
              <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] bg-opacity-95">
            <div className="text-center my-1">
              <span className="text-[9px] bg-[#182229] text-slate-400 px-3 py-1 rounded-md shadow-sm border border-slate-800">
                🔒 End-to-end encrypted AI Patient Channel
              </span>
            </div>

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'patient' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-md ${
                    m.sender === 'patient'
                      ? 'bg-[#005c4b] text-white rounded-br-none'
                      : 'bg-[#202c33] text-slate-100 rounded-bl-none border border-slate-700/40'
                  }`}
                >
                  {/* Voice Note Bubble */}
                  {m.attachment?.type === 'voice_note' && (
                    <div className="p-2 mb-2 rounded-xl bg-teal-900/40 border border-teal-500/30 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPlayingAudioId(playingAudioId === m.id ? null : m.id)}
                        className="w-7 h-7 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center flex-shrink-0"
                      >
                        {playingAudioId === m.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      </button>
                      <div className="flex-1">
                        <div className="h-1.5 bg-teal-800 rounded-full overflow-hidden">
                          <div className={`h-full bg-teal-300 rounded-full ${playingAudioId === m.id ? 'w-2/3 animate-pulse' : 'w-1/4'}`} />
                        </div>
                        <div className="text-[9px] text-teal-300 mt-1 flex justify-between">
                          <span>0:14 Tamil Voice Memo</span>
                          <span className="font-mono">Audio Note</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lab Report Bubble */}
                  {m.attachment?.type === 'lab_report' && (
                    <div className="p-2.5 mb-2 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-start gap-2.5">
                      <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-[11px] text-indigo-200">Serum Beta-hCG Quantitative</div>
                        <div className="text-[10px] text-slate-300">Result: <strong className="text-emerald-400">520 mIU/mL (Positive)</strong></div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Verified Lab Pathology Document</div>
                      </div>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Interactive slot booking chips if slots offered */}
                  {m.slotsAvailable && (
                    <div className="mt-3 pt-2 border-t border-slate-700/60 space-y-1.5">
                      <div className="text-[10px] text-teal-300 font-bold uppercase tracking-wider">
                        Tap an option to book slot:
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        <button
                          type="button"
                          onClick={() => handleSelectSlot(1)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 text-[10px] text-left border border-teal-500/40 transition-colors flex items-center justify-between"
                        >
                          <span>1️⃣ Option 1: Monday 10:00 AM</span>
                          <CheckCircle2 className="w-3 h-3 text-teal-300" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSlot(2)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 text-[10px] text-left border border-teal-500/40 transition-colors flex items-center justify-between"
                        >
                          <span>2️⃣ Option 2: Tuesday 11:30 AM</span>
                          <CheckCircle2 className="w-3 h-3 text-teal-300" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSlot(3)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 text-[10px] text-left border border-teal-500/40 transition-colors flex items-center justify-between"
                        >
                          <span>3️⃣ Option 3: Wednesday 03:00 PM</span>
                          <CheckCircle2 className="w-3 h-3 text-teal-300" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 mt-1">
                    <span>{m.time}</span>
                    {m.sender === 'patient' && <CheckCheck className="w-3 h-3 text-teal-300" />}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-teal-400 bg-[#202c33] p-2 rounded-xl w-fit">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Gemini 2.5 NLU is classifying intent...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Media Quick Action Buttons */}
          <div className="bg-[#182229] px-3 py-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-300">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendVoiceNote}
                disabled={loading}
                className="px-2 py-0.5 rounded-md bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1 transition-colors"
              >
                <Mic className="w-3 h-3 text-teal-400" />
                <span>Simulate Voice Note</span>
              </button>
              <button
                type="button"
                onClick={handleSendLabReport}
                disabled={loading}
                className="px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 transition-colors"
              >
                <FileText className="w-3 h-3 text-indigo-400" />
                <span>Attach Beta-hCG Report</span>
              </button>
            </div>
            <span className="text-slate-400 text-[9px]">TN Multilingual</span>
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="bg-[#1f2c34] p-3 flex items-center gap-2 border-t border-slate-800"
          >
            <Smile className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-200" />
            <Paperclip className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-200" />
            <input
              type="text"
              placeholder="Type message in Tamil or English..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#2a3942] border-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-full transition-colors shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: REAL-TIME NLU TELEMETRY & CLINICAL SCENARIOS */}
      <div className="lg:col-span-5 space-y-4">
        {/* Real-time State & Live Links Card */}
        <div className="p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Gemini 2.5 Real-time Intent Telemetry</span>
            </div>
            {lastAnalysis && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                Live State Active
              </span>
            )}
          </div>

          {lastAnalysis ? (
            <div className="space-y-3 text-xs">
              {/* Intent Card */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Extracted Intent
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md font-bold font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs">
                    {lastAnalysis.intent_analysis?.intent}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Language / Dialect
                  </span>
                  <span className="text-indigo-400 font-semibold">
                    {lastAnalysis.intent_analysis?.language_detected === 'ta'
                      ? 'தமிழ் (Tamil)'
                      : lastAnalysis.intent_analysis?.language_detected === 'mixed'
                      ? 'Tanglish (Romanized Tamil)'
                      : 'English'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    AI Confidence
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {(lastAnalysis.intent_analysis?.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>

                {lastAnalysis.intent_analysis?.patient_reason && (
                  <div className="pt-2 text-slate-300 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-500 font-medium">Extracted Clinical Reason:</span>{' '}
                    {lastAnalysis.intent_analysis.patient_reason}
                  </div>
                )}
              </div>

              {/* State Machine Transition & Status */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Workflow Engine Action
                </div>
                <div className="font-bold text-amber-300 font-mono text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lastAnalysis.workflow_action}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400">Updated Follow-up Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      lastAnalysis.new_status === 'escalated'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : lastAnalysis.new_status === 'rescheduled'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {lastAnalysis.new_status}
                  </span>
                </div>
              </div>

              {/* ACTION LINKS: Direct navigation into the corresponding module */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Test In Other Dashboards
                </div>
                <div className="flex flex-col gap-1.5">
                  {lastAnalysis.new_status === 'escalated' && (
                    <button
                      type="button"
                      onClick={() => navigate('/exceptions')}
                      className="w-full py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-between transition-colors"
                    >
                      <span>🚨 View in Exception Queue (Doctor/Nurse Escalation)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {(lastAnalysis.new_status === 'rescheduled' || lastAnalysis.new_status === 'completed') && (
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="w-full py-2 px-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center justify-between transition-colors"
                    >
                      <span>📅 View in Today's Follow-up Queue</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate('/doctor')}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium flex items-center justify-between transition-colors"
                  >
                    <span>🩺 View in Doctor Clinical Summary</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800/80 space-y-2">
              <Bot className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs">
                Select a test scenario below or send a message from the mobile phone on the left to see live Gemini classification, state transitions, and appointment booking.
              </p>
            </div>
          )}
        </div>

        {/* CLINICAL SCENARIO LAUNCHER PANEL */}
        <div className="p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 shadow-xl space-y-3.5">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Interactive Scenario Launcher</span>
          </div>

          <div className="space-y-3">
            {scenarios.map((grp, i) => (
              <div key={i} className="space-y-1.5">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {grp.category}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {grp.items.map((item, j) => (
                    <button
                      key={j}
                      type="button"
                      disabled={loading}
                      onClick={() => handleSendMessage(item.text)}
                      className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 hover:border-teal-500/50 border border-slate-800 text-xs text-left text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="font-medium group-hover:text-teal-300 transition-colors">
                        {item.label}
                      </span>
                      <Send className="w-3 h-3 text-slate-500 group-hover:text-teal-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
