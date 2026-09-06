import React, { useState } from 'react';
import { Activity, Sparkles, SlidersHorizontal, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmotionMetric } from '../types';

interface EmotionSpectrumPanelProps {
  emotions: EmotionMetric[];
  primaryEmotionName: string;
  secondaryEmotionName?: string | null;
  valenceScore: number;
  arousalScore: number;
  expressiveness: number;
}

export const EmotionSpectrumPanel: React.FC<EmotionSpectrumPanelProps> = ({
  emotions,
  primaryEmotionName,
  secondaryEmotionName,
  valenceScore,
  arousalScore,
  expressiveness,
}) => {
  const [viewMode, setViewMode] = useState<'top' | 'all'>('top');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCircumplex, setShowCircumplex] = useState<boolean>(false);

  const primaryEmotion = emotions.find((e) => e.id === primaryEmotionName || e.label.toLowerCase() === primaryEmotionName.toLowerCase()) || emotions[0];
  const secondaryEmotion = emotions.find((e) => e.id === secondaryEmotionName || e.label.toLowerCase() === secondaryEmotionName?.toLowerCase()) || null;

  // Filter emotions
  const filteredEmotions = emotions.filter((e) => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) {
      return false;
    }
    if (viewMode === 'top') {
      // Top detected emotions (score >= 0.12 or top 4)
      return e.score >= 0.12 || emotions.indexOf(e) < 4;
    }
    return true;
  });

  // Calculate coordinates for the 2D Valence-Arousal circumplex
  // valenceScore: -1.0 to 1.0 -> 0% to 100%
  // arousalScore: 0.0 to 1.0 -> 100% to 0% (high arousal is top)
  const circumplexX = 50 + valenceScore * 42;
  const circumplexY = 90 - arousalScore * 80;

  const categories = [
    { id: 'all', label: 'All (18)' },
    { id: 'joy', label: 'Joy' },
    { id: 'calm', label: 'Calm' },
    { id: 'cognitive', label: 'Mind' },
    { id: 'tension', label: 'Tension' },
  ];

  return (
    <div
      id="emotion-spectrum-panel"
      className="w-full bg-black/40 backdrop-blur-md border border-white/20 p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-3"
      title="Complete human emotion spectrum analyzed via facial action units and ocular metrics"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-white/80" />
          <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
            Affective State & Emotion Spectrum
          </h3>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-white/5 border border-white/10 p-0.5 font-mono text-[8px]">
          <button
            onClick={() => setViewMode('top')}
            className={`px-1.5 py-0.5 uppercase tracking-wider transition-colors ${
              viewMode === 'top'
                ? 'bg-white text-black font-bold shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-1.5 py-0.5 uppercase tracking-wider transition-colors ${
              viewMode === 'all'
                ? 'bg-white text-black font-bold shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            All 18
          </button>
        </div>
      </div>

      {/* Dominant Primary Emotion Hero Card */}
      {primaryEmotion && (
        <div
          className="relative p-3 border border-white/15 bg-white/[0.03] overflow-hidden"
          style={{ borderLeft: `3px solid ${primaryEmotion.color}` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl select-none" role="img" aria-label={primaryEmotion.name}>
                {primaryEmotion.emoji}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    {primaryEmotion.name}
                  </h4>
                  <span
                    className="text-[8px] font-mono px-1.5 py-0.2 border uppercase tracking-wider"
                    style={{
                      borderColor: `${primaryEmotion.color}66`,
                      backgroundColor: `${primaryEmotion.color}22`,
                      color: primaryEmotion.color,
                    }}
                  >
                    {Math.round(primaryEmotion.score * 100)}% Match
                  </span>
                </div>
                <p className="text-[9px] text-white/60 font-mono mt-0.5 line-clamp-1">
                  {primaryEmotion.description}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCircumplex(!showCircumplex)}
              className="text-[8px] text-white/40 hover:text-white/80 font-mono flex items-center gap-1 shrink-0 p-1 bg-white/5 border border-white/10"
              title="Toggle 2D Russell Affect Circumplex (Valence & Arousal map)"
            >
              <span>AFFECT MAP</span>
              {showCircumplex ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          </div>

          {/* Co-occurring secondary emotion tag */}
          {secondaryEmotion && secondaryEmotion.score > 0.18 && (
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono">
              <div className="flex items-center gap-1.5 text-white/70">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>CO-OCCURRING:</span>
                <span className="text-white font-bold">{secondaryEmotion.emoji} {secondaryEmotion.name}</span>
              </div>
              <span className="text-white/50">{Math.round(secondaryEmotion.score * 100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Expandable 2D Affect Circumplex Radar (Valence vs Arousal) */}
      <AnimatePresence>
        {showCircumplex && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border border-white/10 bg-black/60 p-2.5 flex flex-col gap-2 font-mono"
          >
            <div className="flex justify-between items-center text-[8px] text-white/40">
              <span>RUSSELL 2D CIRCUMPLEX</span>
              <span>EXPRESSIVENESS: {Math.round(expressiveness * 100)}%</span>
            </div>

            <div className="relative w-full h-24 border border-white/10 bg-white/[0.02] flex items-center justify-center overflow-hidden">
              {/* Center Crosshairs */}
              <div className="absolute w-full h-[1px] bg-white/10" />
              <div className="absolute h-full w-[1px] bg-white/10" />

              {/* Quadrant Labels */}
              <span className="absolute top-1 right-2 text-[7px] text-cyan-400/50">EXCITED / HIGH AROUSAL</span>
              <span className="absolute top-1 left-2 text-[7px] text-red-400/50">TENSE / ANXIOUS</span>
              <span className="absolute bottom-1 left-2 text-[7px] text-blue-400/50">DEPRESSED / TIRED</span>
              <span className="absolute bottom-1 right-2 text-[7px] text-emerald-400/50">SERENE / RELAXED</span>

              {/* Valence Axis Labels */}
              <span className="absolute left-1 text-[7px] text-white/30">UNPLEASANT</span>
              <span className="absolute right-1 text-[7px] text-white/30">PLEASANT</span>

              {/* Moving Affect Dot */}
              <motion.div
                className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                animate={{ left: `${circumplexX}%`, top: `${circumplexY}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] animate-pulse"
                  style={{
                    backgroundColor: primaryEmotion?.color || '#ffffff',
                    color: primaryEmotion?.color || '#ffffff',
                  }}
                />
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[8px] text-white/60">
              <div className="flex justify-between">
                <span>VALENCE:</span>
                <span className={valenceScore > 0 ? 'text-emerald-400' : valenceScore < 0 ? 'text-rose-400' : 'text-white'}>
                  {valenceScore > 0 ? `+${valenceScore}` : valenceScore} ({valenceScore > 0.2 ? 'Pleasant' : valenceScore < -0.2 ? 'Unpleasant' : 'Neutral'})
                </span>
              </div>
              <div className="flex justify-between">
                <span>AROUSAL:</span>
                <span className="text-white">
                  {Math.round(arousalScore * 100)}% ({arousalScore > 0.6 ? 'High' : arousalScore < 0.35 ? 'Low' : 'Moderate'})
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Pills (When in 'all' view) */}
      {viewMode === 'all' && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 font-mono text-[8px]">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 uppercase tracking-wider border whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-white/20 text-white border-white'
                  : 'bg-white/5 text-white/40 border-white/10 hover:text-white/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Emotion Breakdown List */}
      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
        {filteredEmotions.map((item, idx) => {
          const isPrimary = item.id === primaryEmotion?.id;
          const scorePercent = Math.round(item.score * 100);

          return (
            <div
              key={item.id}
              className={`group flex flex-col p-1.5 transition-colors border ${
                isPrimary
                  ? 'bg-white/10 border-white/30'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs select-none">{item.emoji}</span>
                  <span className={`uppercase tracking-wider ${isPrimary ? 'text-white font-bold' : 'text-white/70'}`}>
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-white/30 font-mono hidden sm:inline">
                    {item.facsActionUnits.split('+')[0]}
                  </span>
                  <span
                    className="font-bold text-right w-8"
                    style={{ color: item.score > 0.25 ? item.color : '#ffffff99' }}
                  >
                    {scorePercent}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-[2px] bg-white/10 overflow-hidden w-full">
                <motion.div
                  className="h-full"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: item.score > 0.3 ? `0 0 6px ${item.color}` : 'none',
                  }}
                  animate={{ width: `${scorePercent}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
