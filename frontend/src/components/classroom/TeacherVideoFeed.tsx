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
        setSimliStatusText('High-Fidelity AI Professor Active');
        setTimeout(() => setSimliStatusText(null), 4000);
      }
    } catch (err) {
      console.warn('Simli toggle error:', err);
      setIsSimliConnecting(false);
      setWebRtcActive(false);
      setSimliStatusText('High-Fidelity AI Professor Active');
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
        audioRef.current.play().catch((e) => console.log('Audio autoplay notice:', e));
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

  // High-Fidelity Animated Humanoid AI Professor Canvas
  useEffect(() => {
    let animationFrameId: number;
    let phase = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ambient floating particles
    const particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 300,
      radius: Math.random() * 2 + 1,
      speed: Math.random() * 0.4 + 0.2,
      opacity: Math.random() * 0.4 + 0.2,
    }));

    const render = () => {
      phase += 0.04;

      // Handle Retina / HiDPI Displays for crisp rendering
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 400;
      const height = rect.height || 260;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const isPraising = avatarEmotion === 'encouraging' && !isRemediating;

      // ─── 1. Cinematic Studio Background ───
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.35,
        30,
        width / 2,
        height * 0.5,
        width * 0.75
      );
      if (isRemediating) {
        bgGrad.addColorStop(0, '#fef9c3');
        bgGrad.addColorStop(0.6, '#fde68a');
        bgGrad.addColorStop(1, '#e2e8f0');
      } else if (isPraising) {
        bgGrad.addColorStop(0, '#ecfdf5');
        bgGrad.addColorStop(0.6, '#a7f3d0');
        bgGrad.addColorStop(1, '#cbd5e1');
      } else {
        bgGrad.addColorStop(0, '#f1f5f9');
        bgGrad.addColorStop(0.55, '#e2e8f0');
        bgGrad.addColorStop(1, '#94a3b8');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle ambient particles
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) p.y = height;
        ctx.beginPath();
        ctx.arc(p.x * (width / 400), p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.5})`;
        ctx.fill();
      });

      // ─── 2. Breathing & Micro-Movement Calculations ───
      const breathOffset = Math.sin(phase * 1.4) * 2;
      const headTilt = Math.sin(phase * 0.8) * 0.025;
      const cx = width / 2;
      const cy = height * 0.42 + breathOffset;

      // ─── 3. Soft Studio Aura / Keylight Halo ───
      ctx.beginPath();
      const auraRadius = 80 + (isSpeaking ? Math.sin(phase * 5) * 5 : 0);
      const auraGrad = ctx.createRadialGradient(cx, cy, 25, cx, cy, auraRadius);
      if (isRemediating) {
        auraGrad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
      } else if (isPraising) {
        auraGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
      } else {
        auraGrad.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
      }
      auraGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = auraGrad;
      ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
      ctx.fill();

      // Save context for head rotation / tilt
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(headTilt);
      ctx.translate(-cx, -cy);

      // ─── 4. Professor Torso & Tailored Academic Blazer ───
      // Torso / Shoulders
      ctx.beginPath();
      ctx.moveTo(cx - 95, height);
      ctx.quadraticCurveTo(cx - 75, cy + 42, cx - 35, cy + 32);
      ctx.lineTo(cx + 35, cy + 32);
      ctx.quadraticCurveTo(cx + 75, cy + 42, cx + 95, height);
      ctx.closePath();
      const blazerGrad = ctx.createLinearGradient(cx - 80, cy + 30, cx + 80, height);
      blazerGrad.addColorStop(0, '#1e293b');
      blazerGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = blazerGrad;
      ctx.fill();

      // Shirt Collar & Tie / Scarf
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy + 28);
      ctx.lineTo(cx, cy + 44);
      ctx.lineTo(cx + 24, cy + 28);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Silk Professor Scarf / Accent
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 38);
      ctx.lineTo(cx + 6, cy + 38);
      ctx.lineTo(cx + 10, cy + 65);
      ctx.lineTo(cx, cy + 72);
      ctx.lineTo(cx - 10, cy + 65);
      ctx.closePath();
      ctx.fillStyle = isRemediating ? '#d97706' : isPraising ? '#059669' : '#4338ca';
      ctx.fill();

      // Blazer Lapels
      ctx.beginPath();
      ctx.moveTo(cx - 36, cy + 32);
      ctx.lineTo(cx - 14, cy + 60);
      ctx.lineTo(cx - 30, cy + 68);
      ctx.fillStyle = '#334155';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + 36, cy + 32);
      ctx.lineTo(cx + 14, cy + 60);
      ctx.lineTo(cx + 30, cy + 68);
      ctx.fillStyle = '#334155';
      ctx.fill();

      // ─── 5. Neck with Natural Anatomy ───
      ctx.beginPath();
      ctx.rect(cx - 14, cy + 10, 28, 26);
      const neckGrad = ctx.createLinearGradient(cx, cy + 10, cx, cy + 36);
      neckGrad.addColorStop(0, '#f6c3a5');
      neckGrad.addColorStop(1, '#e2aa88');
      ctx.fillStyle = neckGrad;
      ctx.fill();

      // ─── 6. Head Shape & Natural Skin Tones ───
      ctx.beginPath();
      ctx.ellipse(cx, cy - 8, 40, 48, 0, 0, Math.PI * 2);
      const skinGrad = ctx.createRadialGradient(cx - 6, cy - 14, 10, cx, cy - 8, 44);
      skinGrad.addColorStop(0, '#fed7aa');
      skinGrad.addColorStop(0.7, '#fdb98a');
      skinGrad.addColorStop(1, '#f09d6b');
      ctx.fillStyle = skinGrad;
      ctx.fill();

      // Subtle cheek blush
      ctx.beginPath();
      ctx.ellipse(cx - 24, cy - 4, 10, 6, -0.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.22)';
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(cx + 24, cy - 4, 10, 6, 0.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.22)';
      ctx.fill();

      // ─── 7. Styled Academic Hair (Back layer & Top Volume) ───
      // Top hair volume
      ctx.beginPath();
      ctx.moveTo(cx - 44, cy - 18);
      ctx.quadraticCurveTo(cx - 48, cy - 56, cx - 12, cy - 62);
      ctx.quadraticCurveTo(cx + 16, cy - 64, cx + 44, cy - 54);
      ctx.quadraticCurveTo(cx + 48, cy - 20, cx + 44, cy - 12);
      ctx.quadraticCurveTo(cx + 22, cy - 44, cx, cy - 40);
      ctx.quadraticCurveTo(cx - 24, cy - 44, cx - 44, cy - 18);
      ctx.closePath();
      const hairGrad = ctx.createLinearGradient(cx - 30, cy - 60, cx + 30, cy - 10);
      hairGrad.addColorStop(0, '#292524');
      hairGrad.addColorStop(0.5, '#44403c');
      hairGrad.addColorStop(1, '#1c1917');
      ctx.fillStyle = hairGrad;
      ctx.fill();

      // ─── 8. Expressive Eyebrows ───
      const browOffset = avatarEmotion === 'enthusiastic' ? -4 : avatarEmotion === 'thoughtful' ? -2 : 0;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#292524';
      ctx.lineCap = 'round';

      // Left eyebrow
      ctx.beginPath();
      ctx.moveTo(cx - 26, cy - 20 + browOffset);
      ctx.quadraticCurveTo(cx - 16, cy - 24 + browOffset, cx - 6, cy - 20 + browOffset);
      ctx.stroke();

      // Right eyebrow (slightly arched if thoughtful)
      const rightBrowOffset = avatarEmotion === 'thoughtful' ? browOffset - 2 : browOffset;
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy - 20 + rightBrowOffset);
      ctx.quadraticCurveTo(cx + 16, cy - 24 + rightBrowOffset, cx + 26, cy - 20 + rightBrowOffset);
      ctx.stroke();

      // ─── 9. Expressive Eyes & Natural Blinking ───
      // Natural blink cycle: blinks every ~3.5 seconds for 8 frames
      const blinkCounter = (phase * 20) % 70;
      const isBlinking = blinkCounter > 67;
      const eyeHeight = isBlinking ? 1 : 6.5;

      // Left Eye
      ctx.beginPath();
      ctx.ellipse(cx - 16, cy - 12, 8, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      if (!isBlinking) {
        // Hazel-Green Iris
        ctx.beginPath();
        ctx.arc(cx - 16, cy - 12, 4.5, 0, Math.PI * 2);
        const irisGrad = ctx.createRadialGradient(cx - 16, cy - 12, 1, cx - 16, cy - 12, 4.5);
        irisGrad.addColorStop(0, '#047857');
        irisGrad.addColorStop(0.7, '#065f46');
        irisGrad.addColorStop(1, '#022c22');
        ctx.fillStyle = irisGrad;
        ctx.fill();

        // Pupil
        ctx.beginPath();
        ctx.arc(cx - 16, cy - 12, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#09090b';
        ctx.fill();

        // Gleaming Cornea Catchlights (Intelligence reflections)
        ctx.beginPath();
        ctx.arc(cx - 17.5, cy - 13.5, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx - 14.5, cy - 10.5, 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
      }

      // Right Eye
      ctx.beginPath();
      ctx.ellipse(cx + 16, cy - 12, 8, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      if (!isBlinking) {
        // Iris
        ctx.beginPath();
        ctx.arc(cx + 16, cy - 12, 4.5, 0, Math.PI * 2);
        const irisGrad = ctx.createRadialGradient(cx + 16, cy - 12, 1, cx + 16, cy - 12, 4.5);
        irisGrad.addColorStop(0, '#047857');
        irisGrad.addColorStop(0.7, '#065f46');
        irisGrad.addColorStop(1, '#022c22');
        ctx.fillStyle = irisGrad;
        ctx.fill();

        // Pupil
        ctx.beginPath();
        ctx.arc(cx + 16, cy - 12, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#09090b';
        ctx.fill();

        // Catchlights
        ctx.beginPath();
        ctx.arc(cx + 14.5, cy - 13.5, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx + 17.5, cy - 10.5, 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
      }

      // ─── 10. Modern Professor Glasses ───
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#1e293b';

      // Left Frame
      ctx.beginPath();
      ctx.roundRect(cx - 26, cy - 19, 20, 15, 4);
      ctx.stroke();

      // Right Frame
      ctx.beginPath();
      ctx.roundRect(cx + 6, cy - 19, 20, 15, 4);
      ctx.stroke();

      // Nose Bridge
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 12);
      ctx.lineTo(cx + 6, cy - 12);
      ctx.stroke();

      // Lens Reflection Sheen (Subtle diagonal glass reflection)
      ctx.beginPath();
      ctx.moveTo(cx - 23, cy - 17);
      ctx.lineTo(cx - 15, cy - 6);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 9, cy - 17);
      ctx.lineTo(cx + 17, cy - 6);
      ctx.stroke();

      // ─── 11. Subtle Nose ───
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 1.5, cy + 3);
      ctx.lineTo(cx - 3, cy + 5);
      ctx.strokeStyle = 'rgba(194, 117, 72, 0.5)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // ─── 12. Dynamic Multi-Phoneme Lip-Syncing Mouth ───
      const mouthY = cy + 18;
      if (isSpeaking) {
        // Multi-phoneme viseme simulation
        const mouthOpen = Math.abs(Math.sin(phase * 7)) * 7 + 2.5;
        const mouthWidth = 9 + Math.sin(phase * 5) * 3;

        // Dark inner mouth depth
        ctx.beginPath();
        ctx.ellipse(cx, mouthY, mouthWidth, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#450a0a';
        ctx.fill();

        // Upper white teeth line
        ctx.beginPath();
        ctx.roundRect(cx - mouthWidth * 0.6, mouthY - mouthOpen * 0.6, mouthWidth * 1.2, 2.5, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Lip outline
        ctx.beginPath();
        ctx.ellipse(cx, mouthY, mouthWidth, mouthOpen, 0, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#be123c';
        ctx.stroke();
      } else {
        // Resting welcoming smile
        ctx.beginPath();
        ctx.moveTo(cx - 12, mouthY);
        ctx.quadraticCurveTo(cx, mouthY + (isPraising ? 5 : 3), cx + 12, mouthY);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#be123c';
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.restore();

      // Waveform bars telemetry
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
              {isSpeaking ? 'Dr. Sophia' : 'Listening'}
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
            title="Toggle Simli WebRTC Video Stream vs High-Fidelity Avatar"
          >
            {isSimliConnecting ? (
              <div className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : webRtcActive ? (
              <Video className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-indigo-500" />
            )}
            <span>{webRtcActive ? 'Simli Live' : 'AI Avatar'}</span>
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700 text-xs hover:bg-white shadow-sm font-['Inter']"
            >
              <Globe className="w-3 h-3 text-slate-500" />
              <span>{language}</span>
            </button>

            {showLanguageMenu && onSwitchLanguage && (
              <div className="absolute right-0 mt-1 w-28 py-1 rounded-xl bg-white border border-slate-200 shadow-lg z-30 font-['Inter']">
                {(['English', 'Hindi', 'Hinglish', 'Spanish'] as LanguageCode[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      onSwitchLanguage(lang);
                      setShowLanguageMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors ${
                      language === lang ? 'font-semibold text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mute/Unmute */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200 text-slate-700 transition-colors shadow-sm"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Video / Canvas Feed */}
      <div className="relative flex-1 w-full h-full min-h-[160px] flex items-center justify-center bg-slate-100">
        {/* Simli WebRTC Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${
            webRtcActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* High-Fidelity Animated AI Professor Avatar Canvas */}
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            webRtcActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {/* Optional Status Toast */}
        {simliStatusText && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/90 text-white text-[11px] font-medium backdrop-blur-md border border-slate-700 shadow-md z-20">
            {simliStatusText}
          </div>
        )}
      </div>

      {/* Dynamic Subtitle / Speech Caption Drawer */}
      <div className="p-3 bg-white/90 border-t border-slate-100 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-slate-700 leading-relaxed font-normal min-h-[32px] line-clamp-2 font-['Inter']">
            {displayedCaption || 'Listening attentively to your response...'}
          </p>
        </div>

        {/* Telemetry / Speech Activity Bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-sans font-medium text-slate-700">Professor:</span>
            <span>Dr. Sophia</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Waveform Bars */}
            <div className="flex items-center gap-0.5 h-3">
              {audioWaves.map((height, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(4, height * 0.15)}px` }}
                  className={`w-0.5 rounded-full transition-all duration-75 ${
                    isSpeaking ? 'bg-slate-700' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>

            {onInterrupt && (
              <button
                onClick={() => onInterrupt()}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition-colors ml-2"
              >
                <Hand className="w-2.5 h-2.5" />
                <span>Raise Hand</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
