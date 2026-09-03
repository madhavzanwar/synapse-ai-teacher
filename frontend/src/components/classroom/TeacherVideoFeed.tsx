'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Hand,
  MessageSquare,
  Radio,
  Globe,
  Video,
  VideoOff,
} from 'lucide-react';
import { parseEmotionFromScript } from '@/lib/utils';
import { LanguageCode } from '@/types';

interface TeacherVideoFeedProps {
  script: string;
  isSpeaking: boolean;
  isRemediating?: boolean;
  onInterrupt?: () => void;
  onSwitchLanguage?: (newLang: LanguageCode) => void;
  language?: string;
  audioBase64?: string | null;
}

export const TeacherVideoFeed: React.FC<TeacherVideoFeedProps> = ({
  script,
  isSpeaking,
  isRemediating = false,
  onInterrupt,
  onSwitchLanguage,
  language = 'English',
  audioBase64 = null,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [displayedCaption, setDisplayedCaption] = useState('');
  const [avatarEmotion, setAvatarEmotion] = useState<
    'enthusiastic' | 'thoughtful' | 'encouraging' | 'curious' | 'empathetic' | 'neutral'
  >('enthusiastic');
  const [audioWaves, setAudioWaves] = useState<number[]>([15, 25, 45, 60, 30, 75, 40, 20]);
  const [webRtcActive, setWebRtcActive] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Parse emotion and clean text from raw script
  useEffect(() => {
    if (!script) {
      setDisplayedCaption('');
      return;
    }

    const { cleanText, emotion } = parseEmotionFromScript(script);
    setDisplayedCaption(cleanText);
    setAvatarEmotion(emotion);

    // If backend sent synthesized Base64 audio, play via HTML5 Audio
    if (audioBase64 && !isMuted) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current = audio;
      audio.play().catch((e) => console.log('Audio autoplay prevented:', e));
      return;
    }

    // Fallback: Browser Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);

      const voices = window.speechSynthesis.getVoices();
      if (language === 'Hindi' || language === 'Hinglish') {
        const hiVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('IN'));
        if (hiVoice) utterance.voice = hiVoice;
      } else if (language === 'Spanish') {
        const esVoice = voices.find((v) => v.lang.includes('es'));
        if (esVoice) utterance.voice = esVoice;
      }

      utterance.rate = emotion === 'enthusiastic' ? 1.05 : emotion === 'thoughtful' ? 0.95 : 1.0;
      utterance.pitch = 1.04;
      speechSynthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [script, isMuted, language, audioBase64]);

  // Animated procedural avatar canvas drawing & audio telemetry
  useEffect(() => {
    let animationFrameId: number;
    let phase = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      phase += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      // Dynamic glow tint based on pedagogical state
      const isPraising = avatarEmotion === 'encouraging' && !isRemediating;
      
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        20,
        width / 2,
        height / 2,
        width * 0.7
      );
      if (isRemediating) {
        bgGrad.addColorStop(0, '#1c1306');
      } else if (isPraising) {
        bgGrad.addColorStop(0, '#061f14');
      } else {
        bgGrad.addColorStop(0, '#0f172a');
      }
      bgGrad.addColorStop(1, '#050811');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Procedural Teacher Avatar Halo
      ctx.beginPath();
      const haloRadius = 75 + (isSpeaking ? Math.sin(phase * 4) * 6 : 0);
      const haloGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.42,
        35,
        width / 2,
        height * 0.42,
        haloRadius
      );

      if (isRemediating) {
        haloGrad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
      } else if (isPraising) {
        haloGrad.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
      } else {
        haloGrad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
      }
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.arc(width / 2, height * 0.42, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Stylized Avatar Head
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.42, 48, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isRemediating
        ? '#f59e0b'
        : isPraising
        ? '#10b981'
        : '#6366f1';
      ctx.stroke();

      // Avatar Eyes
      const eyeOffset = Math.sin(phase * 1.5) * 1.5;
      ctx.fillStyle = isPraising ? '#34d399' : '#38bdf8';
      // Left eye
      ctx.beginPath();
      ctx.arc(width / 2 - 16, height * 0.40 + eyeOffset, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // Right eye
      ctx.beginPath();
      ctx.arc(width / 2 + 16, height * 0.40 + eyeOffset, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Avatar Mouth (Lip-sync simulation when speaking)
      ctx.beginPath();
      const mouthOpen = isSpeaking ? Math.abs(Math.sin(phase * 6.5)) * 9 + 2 : 2;
      ctx.ellipse(width / 2, height * 0.48, 10, mouthOpen, 0, 0, Math.PI * 2);
      ctx.fillStyle = isRemediating ? '#f59e0b' : '#f43f5e';
      ctx.fill();

      // Shoulders / Torso
      ctx.beginPath();
      ctx.moveTo(width / 2 - 60, height);
      ctx.quadraticCurveTo(width / 2 - 40, height * 0.65, width / 2, height * 0.65);
      ctx.quadraticCurveTo(width / 2 + 40, height * 0.65, width / 2 + 60, height);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      // Waveform bars
      if (isSpeaking) {
        setAudioWaves((prev) =>
          prev.map((_, i) => Math.floor(Math.sin(phase * 4 + i) * 35 + 45))
        );
      } else {
        setAudioWaves([10, 10, 10, 10, 10, 10, 10, 10]);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking, isRemediating, avatarEmotion]);

  const toggleMute = () => {
    if (!isMuted) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    setIsMuted(!isMuted);
  };

  const getEmotionBadge = () => {
    switch (avatarEmotion) {
      case 'empathetic':
        return { label: 'Empathetic Reassurance', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse' };
      case 'enthusiastic':
        return { label: 'Enthusiastic', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'thoughtful':
        return { label: 'Thoughtful', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'encouraging':
        return { label: 'Encouraging', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'curious':
        return { label: 'Curious', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
      default:
        return { label: 'Engaged', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  const badge = getEmotionBadge();

  // Dynamic Audio-Reactive Border Glow Class
  const borderGlowClass = avatarEmotion === 'empathetic'
    ? 'border-sky-400/80 shadow-[0_0_40px_rgba(56,189,248,0.5)] ring-1 ring-sky-400/50'
    : isRemediating
    ? 'border-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.35)]'
    : avatarEmotion === 'encouraging'
    ? 'border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.35)]'
    : 'border-indigo-500/40 shadow-[0_0_35px_rgba(99,102,241,0.25)]';

  return (
    <div
      className={`relative flex flex-col h-full rounded-2xl bg-slate-950 border ${borderGlowClass} overflow-hidden shadow-2xl transition-all duration-300`}
    >
      {/* Top Header Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-md">
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span className="text-[11px] font-semibold text-slate-200">
              {isSpeaking ? 'Synapse Live' : 'Listening'}
            </span>
          </div>

          <span
            className={`px-2 py-0.5 text-[10px] font-medium rounded-full border backdrop-blur-md ${badge.color}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Dynamic Language Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] transition-colors"
              title="Switch Instruction Language"
            >
              <Globe className="w-3 h-3 text-indigo-400" />
              <span>{language}</span>
            </button>

            {showLanguageMenu && (
              <div className="absolute right-0 mt-1 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-30">
                {(['English', 'Hindi', 'Hinglish', 'Spanish'] as LanguageCode[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      if (onSwitchLanguage) onSwitchLanguage(lang);
                      setShowLanguageMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Avatar Stage Canvas / WebRTC Viewport */}
      <div className="relative flex-1 flex items-center justify-center min-h-[220px]">
        {webRtcActive ? (
          <video
            id="webrtc-avatar-video"
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={360}
            height={260}
            className="w-full h-full object-cover"
          />
        )}

        {/* Audio Spectrum Waveform Bar */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1 px-4 pointer-events-none">
          {audioWaves.map((height, idx) => (
            <motion.div
              key={idx}
              className={`w-1 rounded-full ${
                isRemediating
                  ? 'bg-amber-400'
                  : avatarEmotion === 'encouraging'
                  ? 'bg-emerald-400'
                  : 'bg-indigo-400'
              }`}
              animate={{ height: `${Math.max(height * 0.35, 4)}px` }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />
          ))}
        </div>
      </div>

      {/* Synchronized Closed Caption Drawer */}
      <div className="p-4 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md">
        <div className="flex items-start gap-2.5">
          <div className="p-1 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-500/30 shrink-0 mt-0.5">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 max-h-24 overflow-y-auto pr-1">
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {displayedCaption || 'Preparing personalized lesson delivery...'}
            </p>
          </div>
        </div>

        {/* Interactive Hand-raise Action */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            TTS Mode: <span className="text-indigo-400 font-medium">{audioBase64 ? 'ElevenLabs Sonic' : 'Neural Web Voice'}</span>
          </span>

          <button
            onClick={onInterrupt}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Hand className="w-3.5 h-3.5 text-amber-400" />
            Raise Hand
          </button>
        </div>
      </div>
    </div>
  );
};
