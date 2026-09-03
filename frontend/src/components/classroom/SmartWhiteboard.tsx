'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisualAction, VisualType } from '@/types';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import Editor from '@monaco-editor/react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Maximize2,
  Minimize2,
  Sparkles,
  Code2,
  Sigma,
  GitGraph,
  BarChart3,
  Lightbulb,
  Play,
  CheckCircle2,
  Copy,
} from 'lucide-react';

interface SmartWhiteboardProps {
  visualAction: VisualAction | null;
  topicTitle?: string;
  isRemediating?: boolean;
}

export const SmartWhiteboard: React.FC<SmartWhiteboardProps> = ({
  visualAction,
  topicTitle = 'Interactive Blackboard',
  isRemediating = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [codeOutput, setCodeOutput] = useState<string | null>(null);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const katexRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const whiteboardContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Mermaid with dark theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: true,
        background: '#0d1322',
        primaryColor: '#6366f1',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#818cf8',
        lineColor: '#38bdf8',
        secondaryColor: '#10b981',
        tertiaryColor: '#1e293b',
      },
    });
  }, []);

  // Render KaTeX when visualAction changes
  useEffect(() => {
    if (visualAction?.type === 'katex' && katexRef.current) {
      try {
        katex.render(visualAction.raw_payload, katexRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (err) {
        console.error('KaTeX rendering error:', err);
      }
    }
  }, [visualAction]);

  // Render Mermaid when visualAction changes
  useEffect(() => {
    if (visualAction?.type === 'mermaid' && mermaidRef.current) {
      const renderDiagram = async () => {
        try {
          const uniqueId = `mermaid-${Date.now()}`;
          const { svg } = await mermaid.render(uniqueId, visualAction.raw_payload);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
          }
        } catch (err) {
          console.error('Mermaid rendering error:', err);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = `<pre class="text-rose-400 p-4 font-mono text-sm">${visualAction.raw_payload}</pre>`;
          }
        }
      };
      renderDiagram();
    }
  }, [visualAction]);

  // Reset code output when visual changes
  useEffect(() => {
    setCodeOutput(null);
  }, [visualAction]);

  const handleSimulateCodeRun = () => {
    setIsExecutingCode(true);
    setTimeout(() => {
      setIsExecutingCode(false);
      setCodeOutput(
        `>>> Executing ${visualAction?.title || 'Script'}...\n[Tensor Flow Initialized]\nOutput Shape: torch.Size([2, 8, 64])\nAttention Weights Matrix Shape: torch.Size([2, 8, 8])\nExecution Succeeded in 12.4ms (CUDA Device 0)`
      );
    }, 600);
  };

  const handleCopyCode = () => {
    if (visualAction?.raw_payload) {
      navigator.clipboard.writeText(visualAction.raw_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFullscreen = () => {
    if (!whiteboardContainerRef.current) return;
    if (!isFullscreen) {
      if (whiteboardContainerRef.current.requestFullscreen) {
        whiteboardContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const getVisualIcon = (type?: VisualType) => {
    switch (type) {
      case 'katex':
        return <Sigma className="w-5 h-5 text-indigo-400" />;
      case 'mermaid':
        return <GitGraph className="w-5 h-5 text-sky-400" />;
      case 'code':
        return <Code2 className="w-5 h-5 text-emerald-400" />;
      case 'chart':
        return <BarChart3 className="w-5 h-5 text-amber-400" />;
      case 'callout':
      default:
        return <Lightbulb className="w-5 h-5 text-amber-400" />;
    }
  };

  // Sample chart data for chart visualizer mode
  const sampleChartData = [
    { step: '0', loss: 2.84, accuracy: 0.12 },
    { step: '100', loss: 1.95, accuracy: 0.45 },
    { step: '200', loss: 1.22, accuracy: 0.68 },
    { step: '300', loss: 0.76, accuracy: 0.82 },
    { step: '400', loss: 0.43, accuracy: 0.91 },
    { step: '500', loss: 0.28, accuracy: 0.96 },
  ];

  return (
    <div
      ref={whiteboardContainerRef}
      className={`relative flex flex-col h-full rounded-2xl bg-[#090d16] border ${
        isRemediating ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : 'border-indigo-500/20'
      } overflow-hidden shadow-2xl transition-all duration-300 blackboard-grid`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
            {getVisualIcon(visualAction?.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100 tracking-wide">
                {visualAction?.title || topicTitle}
              </h2>
              {isRemediating && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full animate-pulse">
                  Remediation Focus
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 capitalize">
              Smart Whiteboard • {visualAction?.type || 'Overview'} Mode
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {visualAction?.type === 'code' && (
            <>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                title="Copy code"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleSimulateCodeRun}
                disabled={isExecutingCode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isExecutingCode ? 'Running...' : 'Run Simulation'}
              </button>
            </>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 flex flex-col p-6 overflow-auto">
        <AnimatePresence mode="wait">
          {!visualAction ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col items-center justify-center text-center text-slate-500"
            >
              <div className="w-16 h-16 mb-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-base font-medium text-slate-300 mb-1">Whiteboard Ready</h3>
              <p className="text-xs max-w-sm text-slate-500">
                Your AI Teacher will draw equations, architecture diagrams, and executable code right here.
              </p>
            </motion.div>
          ) : visualAction.type === 'katex' ? (
            <motion.div
              key="katex"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/60 rounded-xl border border-slate-800/80 shadow-inner"
            >
              <div className="w-full text-center overflow-x-auto py-6" ref={katexRef} />
              {visualAction.explanation_notes && (
                <div className="mt-6 max-w-2xl px-5 py-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-xs sm:text-sm text-center leading-relaxed">
                  <span className="font-semibold text-indigo-300">Teacher Note: </span>
                  {visualAction.explanation_notes}
                </div>
              )}
            </motion.div>
          ) : visualAction.type === 'mermaid' ? (
            <motion.div
              key="mermaid"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 shadow-inner overflow-auto min-h-[350px]"
            >
              <div ref={mermaidRef} className="w-full flex justify-center py-4 [&_svg]:max-w-full [&_svg]:h-auto" />
              {visualAction.explanation_notes && (
                <div className="mt-4 max-w-2xl px-4 py-2.5 rounded-xl bg-sky-950/30 border border-sky-500/30 text-sky-200 text-xs sm:text-sm text-center leading-relaxed">
                  <span className="font-semibold text-sky-300">Architecture Insight: </span>
                  {visualAction.explanation_notes}
                </div>
              )}
            </motion.div>
          ) : visualAction.type === 'code' ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-[#1e1e1e]"
            >
              <div className="flex-1 min-h-[300px]">
                <Editor
                  height="100%"
                  language={visualAction.language_or_config || 'python'}
                  theme="vs-dark"
                  value={visualAction.raw_payload}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'Fira Code', monospace",
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                  }}
                />
              </div>

              {/* Terminal / Code execution output drawer */}
              {codeOutput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="bg-black/90 border-t border-slate-800 p-4 font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed"
                >
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Simulated Console Output
                  </div>
                  {codeOutput}
                </motion.div>
              )}
            </motion.div>
          ) : visualAction.type === 'chart' ? (
            <motion.div
              key="chart"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col p-4 bg-slate-950/60 rounded-xl border border-slate-800 min-h-[350px]"
            >
              <div className="flex-1 w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sampleChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="step" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={2} name="Training Loss" />
                    <Line type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={2} name="Validation Accuracy" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {visualAction.explanation_notes && (
                <div className="mt-4 px-4 py-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs sm:text-sm text-center">
                  {visualAction.explanation_notes}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="callout"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/60 rounded-xl border border-slate-800"
            >
              <div className="max-w-xl w-full p-6 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 shadow-xl">
                <div className="flex items-center gap-3 mb-4 text-indigo-400">
                  <Lightbulb className="w-6 h-6" />
                  <h3 className="text-base font-semibold text-slate-100">{visualAction.title || 'Core Principle'}</h3>
                </div>
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {visualAction.raw_payload}
                </div>
                {visualAction.explanation_notes && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-indigo-300 italic">
                    💡 {visualAction.explanation_notes}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
