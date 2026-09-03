'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Checkpoint,
  StudentResponse,
  DiagnosticEvaluation,
  CheckpointType,
} from '@/types';
import {
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Send,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Lightbulb,
  Mic,
  MicOff,
  Radio,
  Zap,
} from 'lucide-react';

interface CheckpointDrawerProps {
  checkpoint: Checkpoint | null;
  sessionId: string;
  moduleId: string;
  diagnostic: DiagnosticEvaluation | null;
  followUpCheckpoint?: Checkpoint | null;
  isEvaluating: boolean;
  onSubmitAnswer: (response: StudentResponse) => void;
  onSubmitFollowUp?: (selectedOptionId: string | null, text: string) => void;
  onAdvance: () => void;
}

export const CheckpointDrawer: React.FC<CheckpointDrawerProps> = ({
  checkpoint,
  sessionId,
  moduleId,
  diagnostic,
  followUpCheckpoint,
  isEvaluating,
  onSubmitAnswer,
  onSubmitFollowUp,
  onAdvance,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [writtenExplanation, setWrittenExplanation] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  
  // Follow-up sub-state
  const [followUpOptionId, setFollowUpOptionId] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState('');

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setWrittenExplanation((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        recognition.onerror = (err: any) => {
          console.error('Speech recognition error:', err);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const activeQuestion = followUpCheckpoint || checkpoint;
  if (!activeQuestion) {
    return null;
  }

  const handleSubmitPrimary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId && !writtenExplanation.trim()) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    onSubmitAnswer({
      session_id: sessionId,
      module_id: moduleId,
      question_id: activeQuestion.question_id,
      selected_option_id: selectedOptionId,
      written_explanation: writtenExplanation,
      response_time_seconds: 5.0,
    });
  };

  const handleSubmitFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpOptionId && !followUpText.trim()) return;

    if (onSubmitFollowUp) {
      onSubmitFollowUp(followUpOptionId, followUpText);
    }
  };

  const handleReset = () => {
    setSelectedOptionId(null);
    setWrittenExplanation('');
    setFollowUpOptionId(null);
    setFollowUpText('');
  };

  return (
    <div className="flex flex-col h-full liquid-glass-subtle rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg border ${
            followUpCheckpoint 
              ? 'bg-amber-500/10 border-amber-400/20 text-amber-300' 
              : 'bg-white/[0.04] border-white/[0.1] text-neutral-300'
          }`}>
            {followUpCheckpoint ? <Zap className="w-4 h-4 animate-pulse" /> : <HelpCircle className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-['Inter'] font-semibold text-neutral-100 flex items-center gap-2">
              {followUpCheckpoint ? 'Remediation Verification Check' : 'Socratic Checkpoint'}
              {followUpCheckpoint && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/20 rounded-full">
                  Re-Test
                </span>
              )}
            </h3>
            <p className="text-[11px] text-neutral-500 font-['Inter']">
              {activeQuestion.question_type === 'mcq'
                ? 'Select the best conceptual choice'
                : 'Explain your intuition (type or use your voice)'}
            </p>
          </div>
        </div>

        {diagnostic && !followUpCheckpoint && (
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-['Inter'] font-semibold ${
              diagnostic.is_correct
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-400/20 animate-pulse'
            }`}
          >
            {diagnostic.is_correct ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {diagnostic.is_correct ? 'Concept Mastered' : 'Misconception Detected'}
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-5 overflow-y-auto">
        {/* Active Question Text */}
        <div className="mb-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-xs sm:text-sm font-['Inter'] font-medium text-neutral-200 leading-relaxed">
            {activeQuestion.question_text}
          </p>
        </div>

        {/* 1. Follow-Up Re-Test Mode */}
        {followUpCheckpoint ? (
          <form onSubmit={handleSubmitFollowUp} className="space-y-4">
            {followUpCheckpoint.question_type === 'mcq' && followUpCheckpoint.options ? (
              <div className="space-y-2.5">
                {followUpCheckpoint.options.map((opt) => {
                  const isSelected = followUpOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFollowUpOptionId(opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                        isSelected
                          ? 'bg-white/10 border-white/20 text-white shadow-[0_0_30px_rgba(245,158,11,0.2)] ring-1 ring-white/20'
                          : 'bg-white/[0.02] border-white/[0.08] text-neutral-300 hover:bg-white/[0.05] hover:border-white/[0.12]'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-amber-400 text-neutral-950'
                            : 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="text-xs sm:text-sm font-['Inter'] font-medium mt-0.5 leading-relaxed">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="Explain the re-evaluated concept in your own words..."
                rows={3}
                className="w-full p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-neutral-200 placeholder-neutral-600 text-xs sm:text-sm font-['Inter'] focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all resize-none"
              />
            )}

            <button
              type="submit"
              disabled={isEvaluating || (!followUpOptionId && !followUpText.trim())}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full liquid-glass font-['Inter'] font-semibold text-xs sm:text-sm text-white disabled:opacity-50 transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)]"
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Remediation...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Verify Understanding & Resume Lesson
                </>
              )}
            </button>
          </form>
        ) : !diagnostic ? (
          /* 2. Primary Question Form (MCQ or Open-Ended with Voice STT) */
          <form onSubmit={handleSubmitPrimary} className="space-y-4">
            {activeQuestion.question_type === 'mcq' && activeQuestion.options ? (
              <div className="space-y-2.5">
                {activeQuestion.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                        isSelected
                          ? 'bg-white/10 border-white/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
                          : 'bg-white/[0.02] border-white/[0.08] text-neutral-300 hover:bg-white/[0.05] hover:border-white/[0.12]'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="text-xs sm:text-sm font-['Inter'] font-medium mt-0.5 leading-relaxed">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    value={writtenExplanation}
                    onChange={(e) => setWrittenExplanation(e.target.value)}
                    placeholder="Explain the mechanism in your own words... (e.g. 'Because scaling prevents the dot products from saturating softmax...')"
                    rows={4}
                    className="w-full p-3.5 pr-12 rounded-xl bg-white/[0.02] border border-white/[0.08] text-neutral-200 placeholder-neutral-600 text-xs sm:text-sm font-['Inter'] focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all resize-none"
                  />

                  {/* Speech-to-Text Microphone Button */}
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`absolute right-3 bottom-3.5 p-2 rounded-xl border transition-all ${
                        isRecording
                          ? 'bg-rose-500 text-white border-rose-400 animate-pulse ring-2 ring-rose-500/50'
                          : 'bg-white/[0.05] text-neutral-400 hover:text-white border-white/[0.1]'
                      }`}
                      title={isRecording ? 'Stop Voice Recording' : 'Speak Your Answer (Web Speech STT)'}
                    >
                      {isRecording ? <Radio className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {isRecording && (
                  <div className="flex items-center gap-2 text-[11px] text-rose-400 font-['Inter'] font-medium px-2 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Listening to your voice... Speak naturally.
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isEvaluating || (!selectedOptionId && !writtenExplanation.trim())}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full liquid-glass font-['Inter'] font-semibold text-xs sm:text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing Cognitive Mental Model...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Answer for Socratic Feedback
                </>
              )}
            </button>
          </form>
        ) : (
          /* 3. Diagnostic Feedback Card */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div
              className={`p-4 rounded-xl bg-white/[0.03] border border-white/[0.1] ${
                diagnostic.is_correct ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 font-['Inter'] font-semibold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4" />
                {diagnostic.is_correct ? 'Concept Mastered!' : 'Diagnostic Misconception Analysis'}
              </div>

              {diagnostic.identified_misconception && (
                <div className="mb-2 text-xs font-['Inter']">
                  <span className="font-semibold text-neutral-300">Identified Misconception: </span>
                  <span className="text-amber-300">{diagnostic.identified_misconception}</span>
                </div>
              )}

              {diagnostic.root_cause && (
                <div className="mb-2 text-xs font-['Inter']">
                  <span className="font-semibold text-neutral-300">Cognitive Root Cause: </span>
                  <span className="text-neutral-400">{diagnostic.root_cause}</span>
                </div>
              )}

              {diagnostic.corrective_strategy && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-['Inter'] font-medium text-amber-300 capitalize">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Strategy: {diagnostic.corrective_strategy.replace(/_/g, ' ')}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {!diagnostic.is_correct && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full font-['Inter'] font-medium text-xs sm:text-sm text-neutral-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Answering Again
                </button>
              )}

              <button
                type="button"
                onClick={onAdvance}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full liquid-glass font-['Inter'] font-semibold text-xs sm:text-sm text-white transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              >
                Continue Curriculum
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
