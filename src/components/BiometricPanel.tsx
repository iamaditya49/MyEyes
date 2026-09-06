import React, { useState } from 'react';
import { ScanFace, Eye } from 'lucide-react';

interface BiometricPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCameraActive: boolean;
  activeView: 'face' | 'eyes';
  onViewChange: (view: 'face' | 'eyes') => void;
}

export const BiometricPanel: React.FC<BiometricPanelProps> = ({
  canvasRef,
  isCameraActive,
  activeView,
  onViewChange,
}) => {
  return (
    <div
      id="biometric-panel"
      className="bg-black/40 backdrop-blur-md border border-white/20 p-4 w-full shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col h-64 shrink-0"
      title="Real-time biometric facial landmark and ocular iris tracking"
    >
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
          <ScanFace className="w-3 h-3" />
          Biometric Scan
        </h3>

        {/* Mode Toggle: Face vs Ocular Focus */}
        <div className="flex items-center bg-white/5 border border-white/10 p-0.5 font-mono text-[8px]">
          <button
            onClick={() => onViewChange('face')}
            className={`px-1.5 py-0.5 uppercase tracking-wider transition-colors ${
              activeView === 'face'
                ? 'bg-white text-black font-bold shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Face
          </button>
          <button
            onClick={() => onViewChange('eyes')}
            className={`px-1.5 py-0.5 uppercase tracking-wider flex items-center gap-1 transition-colors ${
              activeView === 'eyes'
                ? 'bg-white text-black font-bold shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Eye className="w-2.5 h-2.5" />
            Ocular
          </button>
        </div>
      </div>

      <div className="relative w-full flex-1 border border-white/10 flex items-center justify-center bg-white/5 min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={320}
          height={260}
          className={`w-full h-full object-contain transition-opacity duration-500 ${
            isCameraActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {!isCameraActive && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/30 uppercase tracking-widest">
            Scan Inactive
          </div>
        )}
      </div>
    </div>
  );
};
