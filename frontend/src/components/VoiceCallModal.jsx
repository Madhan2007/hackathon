import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  HeartPulse,
  User,
  X,
} from 'lucide-react';
import { followupsApi } from '../api/client';

export default function VoiceCallModal({ followup, patient, onClose, onCallCompleted }) {
  const [callState, setCallState] = useState('calling'); // 'calling', 'connected', 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [patientSpeaking, setPatientSpeaking] = useState(false);
  const [triageAction, setTriageAction] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(patient?.language || 'ta');

  const timerRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  // Default greetings
  const greetings = {
    ta: `வணக்கம் ${patient?.name || 'நோயாளி'}. FertiFlow AI மருத்துவமனையிலிருந்து அழைக்கிறோம். உங்கள் கரு மாற்றத்திற்கு பிந்தைய மருந்துகளை சரியாக உட்கொண்டீர்களா? உங்களுக்கு ஏதேனும் வலி அல்லது அசௌகரியம் உள்ளதா?`,
    en: `Hello ${patient?.name || 'Patient'}. This is FertiFlow AI Clinical Care Team. We are calling regarding your ${followup?.cycle?.stage?.replace('_', ' ') || 'fertility'} protocol to ensure you took your prescribed medication on schedule.`,
  };

  // Speak AI text aloud
  const speakText = (text, lang = selectedLanguage) => {
    if (!synthRef.current) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => setAiSpeaking(false);
      utterance.onerror = () => setAiSpeaking(false);

      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      setAiSpeaking(false);
    }
  };

  // Start call simulation
  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setCallState('connected');
      const initialGreeting = greetings[selectedLanguage] || greetings.en;
      setTranscript([
        {
          speaker: 'AI Nurse',
          text: initialGreeting,
          time: '00:01',
        },
      ]);
      speakText(initialGreeting);
    }, 2200);

    return () => {
      clearTimeout(connectTimer);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Patient Simulated Voice Responses
  const handlePatientResponse = async (patientSpeech, intentType) => {
    setPatientSpeaking(true);
    if (synthRef.current) synthRef.current.cancel();

    const timestamp = formatDuration(callDuration);
    setTranscript((prev) => [
      ...prev,
      { speaker: patient?.name || 'Patient', text: patientSpeech, time: timestamp },
    ]);

    setTimeout(async () => {
      setPatientSpeaking(false);
      let aiReply = '';

      if (intentType === 'MEDICATION_CONFIRMED') {
        aiReply =
          selectedLanguage === 'ta'
            ? 'மிக்க மகிழ்ச்சி! மருந்துகளை சரியான நேரத்தில் உட்கொண்டது நன்று. அடுத்த பரிசோதனை விவரங்கள் உங்கள் திரையில் புதுப்பிக்கப்பட்டுள்ளது.'
            : 'Excellent! Thank you for adhering to your medication timing. Your protocol compliance has been recorded in your clinical chart.';
        setTriageAction('COMPLETED');
        if (followup?.id) {
          try {
            await followupsApi.update(followup.id, { status: 'completed' });
            if (onCallCompleted) onCallCompleted(followup.id, 'completed');
          } catch (e) {
            console.error(e);
          }
        }
      } else if (intentType === 'EMERGENCY_SYMPTOM') {
        aiReply =
          selectedLanguage === 'ta'
            ? 'கவனம்! உங்கள் அறிகுறிகள் உடனடியாக எங்கள் தலைமை மருத்துவரிடம் எச்சரிக்கையாக அனுப்பப்பட்டுள்ளது. தயவுசெய்து ஓய்வெடுக்கவும், எங்கள் மருத்துவக் குழு உடனடியாக உங்களை அழைக்கும்.'
            : 'Alert! We have escalated your acute symptoms immediately to Dr. Subha on our emergency doctor board. Please rest; a doctor will reach you shortly.';
        setTriageAction('ESCALATED_DOCTOR');
        if (followup?.id) {
          try {
            await followupsApi.update(followup.id, {
              status: 'escalated',
              missed_reason: 'Voice Call: Patient reported acute pain/symptoms during AI outreach',
            });
            if (onCallCompleted) onCallCompleted(followup.id, 'escalated');
          } catch (e) {
            console.error(e);
          }
        }
      } else if (intentType === 'RESCHEDULE') {
        aiReply =
          selectedLanguage === 'ta'
            ? 'சரி, உங்கள் புதிய சந்திப்பு நேரம் திங்கட்கிழமை காலை 10:00 மணிக்கு மாற்றியமைக்கப்பட்டுள்ளது.'
            : 'Understood. We have rescheduled your clinical ultrasound slot for Monday at 10:00 AM.';
        setTriageAction('RESCHEDULED');
        if (followup?.id) {
          try {
            await followupsApi.update(followup.id, {
              status: 'rescheduled',
              missed_reason: 'Voice Call: Patient requested reschedule slot',
            });
            if (onCallCompleted) onCallCompleted(followup.id, 'rescheduled');
          } catch (e) {
            console.error(e);
          }
        }
      }

      setTranscript((prev) => [
        ...prev,
        { speaker: 'AI Nurse', text: aiReply, time: formatDuration(callDuration + 2) },
      ]);
      speakText(aiReply);
    }, 1200);
  };

  const endCall = () => {
    if (synthRef.current) synthRef.current.cancel();
    setCallState('ended');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
              <HeartPulse className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              FertiFlow AI Clinical Voice Call
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedLanguage((prev) => (prev === 'ta' ? 'en' : 'ta'))}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-teal-300 border border-slate-700 hover:bg-slate-700 transition-all"
            >
              {selectedLanguage === 'ta' ? 'தமிழ் (Tamil)' : 'English'}
            </button>
            <button
              onClick={() => {
                endCall();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Call Visualizer Area */}
        <div className="p-6 text-center bg-gradient-to-b from-slate-900/80 to-slate-950 flex flex-col items-center">
          {/* Pulsing Avatar */}
          <div className="relative my-4">
            <div
              className={`absolute -inset-3 rounded-full transition-all duration-700 opacity-60 ${
                aiSpeaking
                  ? 'bg-teal-500 animate-ping'
                  : patientSpeaking
                  ? 'bg-indigo-500 animate-ping'
                  : callState === 'calling'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-teal-500/20'
              }`}
            />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-xl">
              <User className="w-12 h-12 text-slate-300" />
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-white">{patient?.name || 'Madhan'}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{patient?.phone || '+91 7305708707'}</p>

          {/* Status Indicator */}
          <div className="mt-3 flex items-center gap-2">
            {callState === 'calling' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Connecting Voice Line...
              </span>
            ) : callState === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Connected • {formatDuration(callDuration)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                Call Completed
              </span>
            )}
          </div>

          {/* Speaking Indicator */}
          {callState === 'connected' && (
            <p className="text-xs text-teal-400 mt-2 font-medium h-4">
              {aiSpeaking ? 'AI Voice Assistant speaking...' : patientSpeaking ? 'Listening to patient response...' : 'Listening...'}
            </p>
          )}
        </div>

        {/* Live Conversation Transcript */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/30 border-y border-slate-800/80 min-h-[160px] max-h-[220px]">
          {transcript.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.speaker === 'AI Nurse' ? 'items-start' : 'items-end'
              }`}
            >
              <span className="text-[10px] text-slate-400 font-semibold mb-0.5">
                {msg.speaker} • {msg.time}
              </span>
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.speaker === 'AI Nurse'
                    ? 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/60'
                    : 'bg-teal-600 text-white rounded-tr-none font-medium'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Response Triggers */}
        {callState === 'connected' && (
          <div className="p-4 bg-slate-950 border-b border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Simulate Patient Verbal Response:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() =>
                  handlePatientResponse(
                    selectedLanguage === 'ta'
                      ? 'ஆம், புரோஜெஸ்டிரோன் மருந்தை எடுத்துக் கொண்டேன்.'
                      : 'Yes, I took my progesterone medication on schedule.',
                    'MEDICATION_CONFIRMED'
                  )
                }
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-emerald-300 font-semibold text-left transition-all hover:border-emerald-500/50 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Confirm Medication Taken</span>
              </button>

              <button
                onClick={() =>
                  handlePatientResponse(
                    selectedLanguage === 'ta'
                      ? 'எனக்கு அடிவயிறு வலி மற்றும் லேசான உதிரப்போக்கு உள்ளது!'
                      : 'I am experiencing acute lower abdominal pain and spotting!',
                    'EMERGENCY_SYMPTOM'
                  )
                }
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-rose-300 font-semibold text-left transition-all hover:border-rose-500/50 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>Report Severe Pain (Escalate)</span>
              </button>

              <button
                onClick={() =>
                  handlePatientResponse(
                    selectedLanguage === 'ta'
                      ? 'திங்கட்கிழமைக்கு எனது அப்பாயிண்ட்மென்ட்டை மாற்ற முடியுமா?'
                      : 'Can I please reschedule my ultrasound scan to Monday morning?',
                    'RESCHEDULE'
                  )
                }
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-amber-300 font-semibold text-left transition-all hover:border-amber-500/50 flex items-start gap-2"
              >
                <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>Request Reschedule</span>
              </button>
            </div>
          </div>
        )}

        {/* Triage Summary Badge if finished */}
        {triageAction && (
          <div className="mx-4 my-2 p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-400">Clinical Action Taken:</span>
            <span
              className={`font-bold uppercase ${
                triageAction === 'COMPLETED'
                  ? 'text-emerald-400'
                  : triageAction === 'ESCALATED_DOCTOR'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {triageAction.replace('_', ' ')}
            </span>
          </div>
        )}

        {/* Call Action Bar */}
        <div className="p-4 bg-slate-950 flex items-center justify-around">
          <button
            onClick={() => setMuted((prev) => !prev)}
            className={`p-3.5 rounded-full transition-all ${
              muted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {callState !== 'ended' ? (
            <button
              onClick={endCall}
              className="px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-900/40 transition-all active:scale-95"
            >
              <PhoneOff className="w-5 h-5" />
              End Call
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-3.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-900/40 transition-all active:scale-95"
            >
              Close & Update Queue
            </button>
          )}

          <button
            onClick={() => {
              if (synthRef.current) synthRef.current.cancel();
            }}
            className="p-3.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
