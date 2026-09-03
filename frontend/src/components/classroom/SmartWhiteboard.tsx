'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartDataPoint, VisualAction, VisualType } from '@/types';
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

  // Initialize Mermaid with Academic Light palette
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: false,
        background: 'transparent',
        primaryColor: '#f1f5f9',
        primaryTextColor: '#0f172a',
        primaryBorderColor: '#cbd5e1',
        lineColor: '#64748b',
        secondaryColor: '#ffffff',
        tertiaryColor: '#f8fafc',
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
        console.warn('KaTeX rendering error:', err);
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
          console.warn('Mermaid rendering error:', err);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = `<pre class="text-rose-600 p-4 font-mono text-sm">${visualAction.raw_payload}</pre>`;
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
        visualAction?.execution_result ||
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
        return <Sigma className="w-4 h-4 text-slate-700" />;
      case 'mermaid':
        return <GitGraph className="w-4 h-4 text-slate-700" />;
      case 'code':
        return <Code2 className="w-4 h-4 text-slate-700" />;
      case 'chart':
        return <BarChart3 className="w-4 h-4 text-slate-700" />;
      case 'callout':
      default:
        return <Lightbulb className="w-4 h-4 text-slate-700" />;
    }
  };

  const sampleChartData = [
    { step: '0', loss: 2.84, accuracy: 0.12 },
    { step: '100', loss: 1.95, accuracy: 0.45 },
    { step: '200', loss: 1.22, accuracy: 0.68 },
    { step: '300', loss: 0.76, accuracy: 0.82 },
    { step: '400', loss: 0.43, accuracy: 0.91 },
    { step: '500', loss: 0.28, accuracy: 0.96 },
  ];

  const chartData: ChartDataPoint[] = visualAction?.chart_data?.length
    ? visualAction.chart_data
    : (() => {
        if (visualAction?.type !== 'chart' || !visualAction.raw_payload?.trim()) {
          return sampleChartData;
        }
        try {
          const parsed = JSON.parse(visualAction.raw_payload);
          return Array.isArray(parsed) && parsed.length ? parsed : sampleChartData;
        } catch {
          return sampleChartData;
        }
      })();
  const chartSeries = Object.keys(chartData[0] || {}).filter((key) => key !== 'step');
  const seriesColors = ['#e11d48', '#059669', '#2563eb', '#d97706', '#7c3aed'];

  return (
    <div
      ref={whiteboardContainerRef}
      className={`relative flex flex-col h-full rounded-2xl liquid-glass ${
        isRemediating
          ? 'shadow-[0_8px_30px_rgba(245,158,11,0.2)] border-amber-300/80'
          : 'shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)]'
      } overflow-hidden transition-all duration-300`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white/60 border-b border-slate-200/80 backdrop-blur-md z-10 text-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
            {getVisualIcon(visualAction?.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-slate-900 tracking-wide font-['Inter']">
                {visualAction?.title || topicTitle}
              </h2>
              {isRemediating && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 rounded-full animate-pulse">
                  Remediation Focus
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-light capitalize">
              Smart Whiteboard · {visualAction?.type || 'Overview'} Mode
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {visualAction?.type === 'code' && (
            <>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm"
                title="Copy code"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleSimulateCodeRun}
                disabled={isExecutingCode}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isExecutingCode ? 'Running...' : 'Run Simulation'}
              </button>
            </>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 flex flex-col p-6 overflow-auto bg-white/40">
        <AnimatePresence mode="wait">
          {!visualAction ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 font-light"
            >
              <div className="w-14 h-14 mb-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              <h3 className="text-base font-['Instrument_Serif'] text-slate-900 mb-1">Whiteboard Ready</h3>
              <p className="text-xs max-w-sm text-slate-500 font-light">
                Your AI Teacher will render formulas, architectural diagrams, and code execution right here.
              </p>
            </motion.div>
          ) : visualAction.type === 'katex' ? (
            <motion.div
              key="katex"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200/80 shadow-sm"
            >
              <div className="w-full text-center overflow-x-auto py-6 text-slate-900" ref={katexRef} />
              {visualAction.explanation_notes && (
                <div className="mt-6 max-w-2xl px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm text-center leading-relaxed font-light">
                  <span className="font-medium text-slate-900">Teacher Note: </span>
                  {visualAction.explanation_notes}
                </div>
              )}
            </motion.div>
          ) : visualAction.type === 'mermaid' ? (
            <motion.div
              key="mermaid"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-auto min-h-[350px]"
            >
              <div ref={mermaidRef} className="w-full flex justify-center py-4 [&_svg]:max-w-full [&_svg]:h-auto [&_text]:!fill-slate-900" />
              {visualAction.explanation_notes && (
                <div className="mt-4 max-w-2xl px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm text-center leading-relaxed font-light">
                  <span className="font-medium text-slate-900">Architecture Insight: </span>
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
              className="flex-1 flex flex-col rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex-1 min-h-[300px]">
                <Editor
                  height="100%"
                  language={visualAction.language_or_config || 'python'}
                  theme="vs-light"
                  value={visualAction.raw_payload}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'Fira Code', 'Inter', monospace",
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
                  className="bg-slate-900 border-t border-slate-800 p-4 font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed"
                >
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Simulated Console Output
                  </div>
                  {codeOutput}
                </motion.div>
              )}
            </motion.div>
          ) : visualAction.type === 'chart' ? (
            <motion.div
              key="chart"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex-1 flex flex-col p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm min-h-[350px]"
            >
              <div className="flex-1 w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="step" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', color: '#0f172a' }}
                    />
                    <Legend />
                    {chartSeries.map((series, index) => (
                      <Line
                        key={series}
                        type="monotone"
                        dataKey={series}
                        stroke={seriesColors[index % seriesColors.length]}
                        strokeWidth={2}
                        name={series.replace(/_/g, ' ')}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {visualAction.explanation_notes && (
                <div className="mt-4 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm text-center font-light">
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
              className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200/80 shadow-sm"
            >
              <div className="max-w-xl w-full p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3 mb-4 text-slate-900">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-['Instrument_Serif'] text-slate-900">{visualAction.title || 'Core Principle'}</h3>
                </div>
                <div className="text-slate-700 text-sm leading-relaxed font-light whitespace-pre-wrap">
                  {visualAction.raw_payload}
                </div>
                {visualAction.explanation_notes && (
                  <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 italic">
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
