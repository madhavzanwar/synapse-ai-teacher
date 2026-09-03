'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Hand,
  Globe,
  Video,
  User,
} from 'lucide-react';
import { parseEmotionFromScript } from '@/lib/utils';
import { LanguageCode } from '@/types';
import { SimliClientManager } from '@/lib/simli';

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
  const [isSimliConnecting, setIsSimliConnecting] = useState(false);
  const [simliStatusText, setSimliStatusText] = useState<string | null>(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const simliClientRef = useRef<SimliClientManager | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Toggle official Simli WebRTC Video Avatar
  const handleToggleSimliAvatar = async () => {
    if (webRtcActive) {
      if (simliClientRef.current) {
        simliClientRef.current.stop();
        simliClientRef.current = null;
      }
      setWebRtcActive(false);
      setSimliStatusText(null);
      return;
    }

    if (!videoRef.current || !audioRef.current) return;
    setIsSimliConnecting(true);
    setSimliStatusText('Connecting to Simli WebRTC...');

    try {
      const client = new SimliClientManager({
        videoElement: videoRef.current,
        audioElement: audioRef.current,
      });
      simliClientRef.current = client;

      const success = await client.start();
      setIsSimliConnecting(false);

      if (success) {
        setWebRtcActive(true);
        setSimliStatusText('Simli Live Avatar Connected');
        setTimeout(() => setSimliStatusText(null), 4000);
      } else {
        setWebRtcActive(false);
        setSimliStatusText('Interactive 2D Canvas Active (Fallback)');
        setTimeout(() => setSimliStatusText(null), 4000);
      }
    } catch (err) {
      console.warn('Simli toggle error:', err);
      setIsSimliConnecting(false);
      setWebRtcActive(false);
      setSimliStatusText('Interactive 2D Canvas Active');
      setTimeout(() => setSimliStatusText(null), 4000);
    }
  };

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
        audioRef.current.src = `data:audio/mp3;base64,${audioBase64}`;
        audioRef.current.play().catch((e) => console.log('Audio autoplay prevented:', e));
      }
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

      const isPraising = avatarEmotion === 'encouraging' && !isRemediating;

      // Clean light canvas background gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        20,
        width / 2,
        height / 2,
        width * 0.7
      );
      if (isRemediating) {
        bgGrad.addColorStop(0, '#fef3c7');
      } else if (isPraising) {
        bgGrad.addColorStop(0, '#d1fae5');
      } else {
        bgGrad.addColorStop(0, '#f8fafc');
      }
      bgGrad.addColorStop(1, '#e2e8f0');
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
        haloGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
      } else if (isPraising) {
        haloGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      } else {
        haloGrad.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
      }
      haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = haloGrad;
      ctx.arc(width / 2, height * 0.42, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Stylized Avatar Head
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.42, 48, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isRemediating
        ? '#f59e0b'
        : isPraising
        ? '#10b981'
        : '#6366f1';
      ctx.stroke();

      // Avatar Eyes
      const eyeOffset = Math.sin(phase * 1.5) * 1.5;
      ctx.fillStyle = isPraising ? '#059669' : '#0f172a';
      ctx.beginPath();
      ctx.arc(width / 2 - 16, height * 0.40 + eyeOffset, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width / 2 + 16, height * 0.40 + eyeOffset, 4, 0, Math.PI * 2);
      ctx.fill();

      // Avatar Mouth
      ctx.beginPath();
      const mouthOpen = isSpeaking ? Math.abs(Math.sin(phase * 6.5)) * 9 + 2 : 2;
      ctx.ellipse(width / 2, height * 0.48, 9, mouthOpen, 0, 0, Math.PI * 2);
      ctx.fillStyle = isRemediating ? '#d97706' : '#e11d48';
      ctx.fill();

      // Shoulders / Torso
      ctx.beginPath();
      ctx.moveTo(width / 2 - 60, height);
      ctx.quadraticCurveTo(width / 2 - 40, height * 0.65, width / 2, height * 0.65);
      ctx.quadraticCurveTo(width / 2 + 40, height * 0.65, width / 2 + 60, height);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      // Waveform simulation
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

  const isPraising = avatarEmotion === 'encouraging' && !isRemediating;

  const shadowGlowClass = isRemediating
    ? 'shadow-[0_8px_30px_rgba(245,158,11,0.2)] border-amber-300'
    : isPraising
    ? 'shadow-[0_8px_30px_rgba(16,185,129,0.2)] border-emerald-300'
    : 'shadow-[0_8px_30px_rgba(99,102,241,0.15)] border-slate-200';

  const getEmotionBadge = () => {
    switch (avatarEmotion) {
      case 'empathetic':
        return { label: 'Empathetic', color: 'bg-sky-100 text-sky-800 border-sky-200' };
      case 'enthusiastic':
        return { label: 'Enthusiastic', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'thoughtful':
        return { label: 'Thoughtful', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'encouraging':
        return { label: 'Encouraging', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'curious':
        return { label: 'Curious', color: 'bg-teal-100 text-teal-800 border-teal-200' };
      default:
        return { label: 'Engaged', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const badge = getEmotionBadge();

  return (
    <div
      className={`relative flex flex-col h-full rounded-2xl liquid-glass ${shadowGlowClass} overflow-hidden transition-all duration-300`}
    >
      {/* Hidden Audio Element for WebRTC / TTS streams */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {/* Top Header Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-slate-200 backdrop-blur-md shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="text-[11px] font-medium text-slate-900 tracking-wide font-['Inter']">
              {isSpeaking ? 'Synapse Live' : 'Listening'}
            </span>
          </div>

          <span
            className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full border backdrop-blur-md ${badge.color}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Simli WebRTC Video Avatar Toggle */}
          <button
            onClick={handleToggleSimliAvatar}
            disabled={isSimliConnecting}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all shadow-sm ${
              webRtcActive
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200'
            }`}
            title="Toggle Simli WebRTC Video Stream vs 2D Avatar"
          >
            {isSimliConnecting ? (
              <div className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : webRtcActive ? (
              <Video className="w-3 h-3 text-emerald-400" />
            ) : (
              <User className="w-3 h-3 text-slate-500" />
            )}
            <span>{webRtcActive ? 'Simli Live' : 'Simli Stream'}</span>
          </button>

          {/* Dynamic Language Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 hover:bg-white border border-slate-200 text-slate-700 text-[11px] transition-colors shadow-sm"
              title="Switch Instruction Language"
            >
              <Globe className="w-3 h-3 text-slate-500" />
              <span>{language}</span>
            </button>

            {showLanguageMenu && (
              <div className="absolute right-0 mt-1 w-28 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30">
                {(['English', 'Hindi', 'Hinglish', 'Spanish'] as LanguageCode[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      if (onSwitchLanguage) onSwitchLanguage(lang);
                      setShowLanguageMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-light"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200 text-slate-700 transition-colors shadow-sm"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Avatar Stage Canvas / Viewport */}
      <div className="relative flex-1 flex items-center justify-center min-h-[200px] bg-slate-900 overflow-hidden">
        {/* Simli WebRTC Video Stream Element */}
        <video
          ref={videoRef}
          id="webrtc-avatar-video"
          autoPlay
          playsInline
          muted={false}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            webRtcActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
          }`}
        />

        {/* 2D Canvas Procedural Avatar Fallback */}
        <canvas
          ref={canvasRef}
          width={360}
          height={260}
          className="w-full h-full object-cover z-5"
        />

        {/* Non-intrusive status toast */}
        {simliStatusText && (
          <div className="absolute top-12 left-4 right-4 z-20 flex justify-center">
            <div className="px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-[11px] font-medium backdrop-blur-md shadow-lg border border-slate-700 animate-fade-in">
              {simliStatusText}
            </div>
          </div>
        )}

        {/* Audio Spectrum Waveform Bar */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1 px-4 pointer-events-none z-20">
          {audioWaves.map((height, idx) => (
            <motion.div
              key={idx}
              className={`w-1 rounded-full ${webRtcActive ? 'bg-emerald-400' : 'bg-slate-700'}`}
              animate={{ height: `${Math.max(height * 0.35, 4)}px` }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />
          ))}
        </div>
      </div>

      {/* Closed-Caption Pill */}
      <div className="p-3 bg-white/60 border-t border-slate-200/80 backdrop-blur-md">
        <div className="bg-white/90 border border-slate-200 rounded-xl p-3 shadow-sm max-h-24 overflow-y-auto">
          <p className="text-xs text-slate-900 font-['Inter'] font-light tracking-wide leading-relaxed text-center">
            {displayedCaption || 'Preparing personalized lesson delivery...'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-light">
            Engine: <span className="text-slate-900 font-medium">{webRtcActive ? 'Simli WebRTC Stream' : audioBase64 ? 'ElevenLabs Sonic' : 'Neural Speech'}</span>
          </span>

          <button
            onClick={onInterrupt}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm"
          >
            <Hand className="w-3.5 h-3.5 text-slate-600" />
            Raise Hand
          </button>
        </div>
      </div>
    </div>
  );
};
