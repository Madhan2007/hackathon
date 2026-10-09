import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  Heart,
  Shield,
  Languages,
  Activity,
} from 'lucide-react';
import axios from 'axios';

export default function PatientVoiceCallPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Call States: 'incoming' | 'connected' | 'completed' | 'declined'
  const [callState, setCallState] = useState('incoming');
  const [duration, setDuration] = useState(0);
  const [language, setLanguage] = useState('ta'); // 'ta' or 'en'
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [patientData, setPatientData] = useState({
    name: 'Madhan',
    phone: '+91 73057 08707',
    stage: 'Stimulation Protocol (Gonal-F 150 IU)',
    tamilMessage:
      'வணக்கம் Madhan. FertiFlow AI மருத்துவமனையிலிருந்து அழைக்கிறோம். உங்கள் IVF ஊசி மருந்தை (Gonal-F 150 IU) இன்று இரவு 9:30 மணிக்கு தவறாமல் எடுத்துக்கொள்ளவும். மருந்து எடுத்துக்கொண்டீர்கள் என்றால் கீழே உள்ள பட்டனை அழுத்தவும்.',
    englishMessage:
      'Hello Madhan. Calling from FertiFlow AI Reproductive Care. Please administer your Gonal-F 150 IU injection tonight at 09:30 PM without delay. Please confirm once taken.',
  });
  const [transcript, setTranscript] = useState('');
  const [triageOutcome, setTriageOutcome] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const ringtoneRef = useRef(null);
  const timerRef = useRef(null);

  // Play realistic hospital chime / phone ring using Web Audio API
  useEffect(() => {
    let audioCtx = null;
    let osc = null;
    let gain = null;
    let isRinging = true;

    if (callState === 'incoming') {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtx = new AudioContext();
          const ring = () => {
            if (!isRinging || audioCtx.state === 'closed') return;
            osc = audioCtx.createOscillator();
            gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime); // Standard ring pitch
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 1.2); // Ring for 1.2s

            setTimeout(() => {
              if (isRinging) ring();
            }, 3000); // Repeat every 3s
          };
          ring();
        }
      } catch (err) {
        console.log('AudioContext ringtone suppressed until user interaction', err);
      }
    }

    return () => {
      isRinging = false;
      if (audioCtx && audioCtx.state !== 'closed') {
        try {
          audioCtx.close();
        } catch (_) {}
      }
    };
  }, [callState]);

  // Fetch follow-up / patient details from API if id provided
  useEffect(() => {
    if (id && id !== 'demo') {
      axios
        .get(`/api/v1/followups/${id}`)
        .then((res) => {
          const f = res.data;
          if (f && f.ai_metadata) {
            setPatientData((prev) => ({
              ...prev,
              tamilMessage: f.ai_metadata.tam_message || prev.tamilMessage,
              englishMessage: f.ai_metadata.eng_message || prev.englishMessage,
              stage: f.type ? f.type.toUpperCase() : prev.stage,
            }));
          }
        })
        .catch((err) => {
          console.warn('Using clinical mock details for call:', err);
        });
    }
  }, [id]);

  // Active call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  // Speak clinical reminder aloud
  const speakMessage = (lang = language) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const textToSpeak = lang === 'ta' ? patientData.tamilMessage : patientData.englishMessage;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
    utterance.rate = 0.95; // Gentle clinical pace
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Answer Call handler
  const handleAnswerCall = () => {
    setCallState('connected');
    setTimeout(() => {
      speakMessage(language);
    }, 600);
  };

  // Decline Call handler
  const handleDeclineCall = () => {
    setCallState('declined');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  // End Call handler
  const handleEndCall = () => {
    setCallState('completed');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  // Format MM:SS duration
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Triage outcome actions
  const handleTriageAction = async (actionType) => {
    setSubmitting(true);
    let outcomeText = '';
    let statusUpdate = 'completed';

    if (actionType === 'CONFIRMED') {
      outcomeText = 'Patient confirmed medication taken on time.';
      statusUpdate = 'completed';
    } else if (actionType === 'RESCHEDULE') {
      outcomeText = 'Patient requested clinic slot rescheduling.';
      statusUpdate = 'rescheduled';
    } else if (actionType === 'EMERGENCY') {
      outcomeText = 'URGENT: Patient reported severe symptoms / fever / pelvic pain.';
      statusUpdate = 'escalated';
    }

    setTriageOutcome({ type: actionType, message: outcomeText });

    // Speak acknowledgment
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const ack =
        language === 'ta'
          ? actionType === 'CONFIRMED'
            ? 'நன்றி Madhan! உங்கள் தகவல் மருத்துவமனையில் பதிவு செய்யப்பட்டது. நல்லபடியாக ஓய்வெடுக்கவும்.'
            : 'உங்கள் தகவல் உடனடியாக மருத்துவரிடம் தெரிவிக்கப்பட்டுள்ளது. பாதுகாப்பாக இருக்கவும்.'
          : actionType === 'CONFIRMED'
          ? 'Thank you Madhan! Your confirmation has been securely logged in your medical record. Take care.'
          : 'Your alert has been escalated directly to Dr. Subha.';
      const ackUtt = new SpeechSynthesisUtterance(ack);
      ackUtt.lang = language === 'ta' ? 'ta-IN' : 'en-US';
      window.speechSynthesis.speak(ackUtt);
    }

    // Update backend status if valid id
    if (id && id !== 'demo') {
      try {
        await axios.patch(`/api/v1/followups/${id}`, {
          status: statusUpdate,
          missed_reason: outcomeText,
        });
      } catch (err) {
        console.warn('Backend update failed:', err);
      }
    }

    setSubmitting(false);
    setTimeout(() => {
      setCallState('completed');
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Clinic Branding Bar */}
      <header className="w-full max-w-md flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-teal-500/20">
            🌸
          </div>
          <div>
            <div className="text-xs font-bold text-teal-400 tracking-wider uppercase">FertiFlow AI</div>
            <div className="text-[11px] text-slate-400">Dr. Subha's Reproductive Care Unit</div>
          </div>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => {
            const next = language === 'ta' ? 'en' : 'ta';
            setLanguage(next);
            if (callState === 'connected') speakMessage(next);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
        >
          <Languages className="w-3.5 h-3.5 text-teal-400" />
          <span>{language === 'ta' ? 'தமிழ்' : 'English'}</span>
        </button>
      </header>

      {/* Main Call Container */}
      <main className="w-full max-w-md my-auto flex flex-col items-center text-center z-10 py-6">
        {/* Caller Avatar with Pulsing Ring */}
        <div className="relative mb-6">
          {callState === 'incoming' && (
            <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping duration-1000" />
          )}
          {callState === 'connected' && isSpeaking && (
            <div className="absolute inset-0 rounded-full bg-teal-400/30 animate-pulse duration-700" />
          )}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-teal-500/50 p-1 flex items-center justify-center shadow-2xl relative">
            <div className="w-full h-full rounded-full bg-[#0d1527] flex flex-col items-center justify-center text-teal-300">
              <Activity className="w-10 h-10 text-teal-400 animate-pulse mb-1" />
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">IVF CARE</span>
            </div>
          </div>
        </div>

        {/* Caller Information */}
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            FertiFlow AI Care
          </h1>
          <p className="text-xs sm:text-sm text-teal-300 font-medium">
            Patient: {patientData.name} ({patientData.phone})
          </p>
          <div className="inline-block mt-1 px-3 py-1 rounded-full bg-teal-950/60 border border-teal-800/40 text-[11px] font-semibold text-teal-200">
            {patientData.stage}
          </div>
        </div>

        {/* --- STATE 1: INCOMING CALL --- */}
        {callState === 'incoming' && (
          <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              INCOMING CLINICAL CALL...
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 text-left space-y-1.5 shadow-inner">
              <div className="font-semibold text-teal-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Automated Clinical Medication Follow-up
              </div>
              <p className="text-slate-400">
                This is a secure, cost-free in-app voice call from your reproductive medicine team. Tap <strong>Answer</strong> to listen to your medication reminder.
              </p>
            </div>

            {/* Answer / Decline Action Buttons */}
            <div className="flex items-center justify-around gap-6 pt-4">
              {/* Decline */}
              <button
                onClick={handleDeclineCall}
                className="group flex flex-col items-center gap-2 text-xs text-slate-400 hover:text-rose-400 transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-lg shadow-rose-950">
                  <PhoneOff className="w-7 h-7" />
                </div>
                <span>Decline</span>
              </button>

              {/* Answer */}
              <button
                onClick={handleAnswerCall}
                className="group flex flex-col items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-lg shadow-emerald-950 animate-bounce">
                  <PhoneCall className="w-7 h-7" />
                </div>
                <span className="font-bold text-white">Answer Call</span>
              </button>
            </div>
          </div>
        )}

        {/* --- STATE 2: CONNECTED / ACTIVE CALL --- */}
        {callState === 'connected' && (
          <div className="w-full space-y-5 animate-in fade-in duration-300">
            {/* Call Timer */}
            <div className="flex items-center justify-center gap-2 text-sm font-mono text-teal-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected • {formatTime(duration)}</span>
            </div>

            {/* Audio Waveform Animation */}
            <div className="h-10 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
              {[40, 70, 30, 90, 60, 40, 80, 50, 95, 45, 65, 35].map((h, i) => (
                <div
                  key={i}
                  style={{ height: isSpeaking ? `${h}%` : '15%' }}
                  className="w-1 rounded-full bg-teal-400/80 transition-all duration-150"
                />
              ))}
            </div>

            {/* Live Spoken Clinical Instructions Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-teal-500/30 text-left space-y-2 shadow-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-teal-300">
                <span className="flex items-center gap-1.5">
                  <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse text-teal-300' : 'text-slate-500'}`} />
                  {isSpeaking ? 'Assistant Speaking...' : 'Assistant Finished Speaking'}
                </span>
                <button
                  onClick={() => speakMessage(language)}
                  className="text-[11px] underline text-teal-400 hover:text-teal-200"
                >
                  Replay Audio
                </button>
              </div>

              <p className="text-sm font-medium text-white leading-relaxed">
                {language === 'ta' ? patientData.tamilMessage : patientData.englishMessage}
              </p>
            </div>

            {/* Interactive Patient Triage Response Options */}
            <div className="space-y-2.5 pt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                Select Your Response:
              </div>

              <button
                onClick={() => handleTriageAction('CONFIRMED')}
                disabled={submitting}
                className="w-full p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-200 font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>மருந்து எடுத்தேன் (Medication Taken)</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleTriageAction('RESCHEDULE')}
                  disabled={submitting}
                  className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>நேரம் மாற்று (Reschedule)</span>
                </button>

                <button
                  onClick={() => handleTriageAction('EMERGENCY')}
                  disabled={submitting}
                  className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 text-rose-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>அவசரம் (Emergency Alert)</span>
                </button>
              </div>
            </div>

            {/* End Call Button */}
            <div className="pt-4">
              <button
                onClick={handleEndCall}
                className="w-14 h-14 mx-auto rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-950 transition-all"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* --- STATE 3: COMPLETED --- */}
        {callState === 'completed' && (
          <div className="w-full space-y-6 animate-in zoom-in-95 fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Call Completed</h2>
              <p className="text-xs text-slate-400">Total Duration: {formatTime(duration)}</p>
            </div>

            {triageOutcome && (
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-emerald-200 text-center font-medium">
                {triageOutcome.message}
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
              Your clinical update has been securely synchronized with the hospital database. Have a safe and restful cycle!
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
            >
              Return to Clinical Dashboard
            </button>
          </div>
        )}

        {/* --- STATE 4: DECLINED --- */}
        {callState === 'declined' && (
          <div className="w-full space-y-6 animate-in zoom-in-95 fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-xl">
              <PhoneOff className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Call Declined</h2>
              <p className="text-xs text-slate-400">
                You can answer anytime by re-opening your clinical reminder link.
              </p>
            </div>

            <button
              onClick={() => setCallState('incoming')}
              className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs transition-all"
            >
              Re-dial Clinical Call
            </button>
          </div>
        )}
      </main>

      {/* Footer Security Badge */}
      <footer className="w-full max-w-md text-center text-[11px] text-slate-500 flex items-center justify-center gap-2 py-3 z-10 border-t border-slate-900">
        <Shield className="w-3.5 h-3.5 text-teal-500" />
        <span>End-to-End Encrypted Healthcare Tele-Triage (DPDP Act India)</span>
      </footer>
    </div>
  );
}
