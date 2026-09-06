import React from 'react';
import { Eye, Compass, Waves, Sparkles, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { OcularData } from '../types';

interface OcularTelemetryCardProps {
  ocular: OcularData;
  isCameraActive: boolean;
}

export const OcularTelemetryCard: React.FC<OcularTelemetryCardProps> = ({
  ocular,
  isCameraActive,
}) => {
  // Map gazeX (-1 to 1) and gazeY (-1 to 1) into percentage (0% to 100%) for radar dot
  // Note: gazeY positive is UP, so top is 50% - gazeY * 40%
  const radarX = 50 + ocular.gazeX * 38;
  const radarY = 50 - ocular.gazeY * 38;

  return (
    <div
      id="ocular-telemetry-panel"
      className="w-full bg-black/40 backdrop-blur-md border border-white/20 p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-3.5"
      title="Real-time ocular metrics modulating soundscape and visual tracking"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-white/80" />
          Ocular Tracking & Modulation
        </h3>
        <span
          className={`text-[9px] px-2 py-0.5 uppercase tracking-wider font-mono border ${
            ocular.isClosed
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              : ocular.isWinkingLeft || ocular.isWinkingRight
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : ocular.wide > 0.25
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-white/10 text-white/80 border-white/20'
          }`}
        >
          {ocular.eyeStateLabel}
        </span>
      </div>

      {/* Main Grid: 2D Gaze Radar + Openness Meters */}
      <div className="grid grid-cols-2 gap-3 items-center">
        {/* 2D Gaze Radar */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 border border-white/20 bg-white/5 flex items-center justify-center overflow-hidden">
            {/* Grid Crosshairs */}
            <div className="absolute w-full h-[1px] bg-white/10" />
            <div className="absolute h-full w-[1px] bg-white/10" />
            <div className="absolute w-16 h-16 rounded-full border border-white/10" />
            <div className="absolute w-8 h-8 rounded-full border border-dashed border-white/15" />

            {/* Quadrant Markers */}
            <span className="absolute top-1 text-[7px] text-white/30 font-mono">UP</span>
            <span className="absolute bottom-1 text-[7px] text-white/30 font-mono">DOWN</span>
            <span className="absolute left-1 text-[7px] text-white/30 font-mono">L</span>
            <span className="absolute right-1 text-[7px] text-white/30 font-mono">R</span>

            {/* Moving Pupil / Iris Gaze Cursor */}
            {isCameraActive && (
              <motion.div
                className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                animate={{ left: `${radarX}%`, top: `${radarY}%` }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    ocular.isClosed
                      ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]'
                      : ocular.isWinkingLeft || ocular.isWinkingRight
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                      : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                  }`}
                />
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[9px] text-white/60 font-mono">
            <Compass className="w-2.5 h-2.5" />
            <span>GAZE: {ocular.gazeDirection}</span>
          </div>
        </div>

        {/* Dual Eye Openness Gauges */}
        <div className="flex flex-col gap-2.5 justify-center">
          {/* Left Eye */}
          <div>
            <div className="flex justify-between text-[10px] mb-1 font-mono">
              <span className="text-white/60">LEFT EYE</span>
              <span className="font-bold text-white/90">
                {ocular.isWinkingLeft ? 'WINK' : `${Math.round(ocular.leftOpenness * 100)}%`}
              </span>
            </div>
            <div className="h-[3px] bg-white/10 overflow-hidden">
              <motion.div
                className={`h-full ${
                  ocular.isWinkingLeft ? 'bg-amber-400' : 'bg-white'
                } shadow-[0_0_6px_rgba(255,255,255,0.8)]`}
                animate={{ width: `${ocular.leftOpenness * 100}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
          </div>

          {/* Right Eye */}
          <div>
            <div className="flex justify-between text-[10px] mb-1 font-mono">
              <span className="text-white/60">RIGHT EYE</span>
              <span className="font-bold text-white/90">
                {ocular.isWinkingRight ? 'WINK' : `${Math.round(ocular.rightOpenness * 100)}%`}
              </span>
            </div>
            <div className="h-[3px] bg-white/10 overflow-hidden">
              <motion.div
                className={`h-full ${
                  ocular.isWinkingRight ? 'bg-amber-400' : 'bg-white'
                } shadow-[0_0_6px_rgba(255,255,255,0.8)]`}
                animate={{ width: `${ocular.rightOpenness * 100}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
          </div>

          {/* Blink & Dynamic Stats */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10 text-[9px] font-mono">
            <div className="flex flex-col">
              <span className="text-white/40">BLINKS</span>
              <span className="font-bold text-white/90">{ocular.blinkCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40">PACE</span>
              <span className="font-bold text-white/90">{ocular.blinkRate} /min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Reactive Modulators Row */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-white/60 font-mono">
        <div className="flex items-center gap-1.5">
          <Waves className="w-3 h-3 text-white/80" />
          <span>FILTER: {Math.round(400 + Math.pow(ocular.averageOpenness, 1.8) * 3200)}Hz</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-white/80" />
          <span>PAN: {ocular.gazeX < -0.2 ? 'L' : ocular.gazeX > 0.2 ? 'R' : 'CTR'}</span>
        </div>
        {ocular.isClosed && (
          <span className="text-indigo-300 font-bold animate-pulse flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" /> MEDITATIVE
          </span>
        )}
      </div>
    </div>
  );
};
