import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolSet } from '../types';
import { 
  Zap, 
  Cpu, 
  RotateCw, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  Gauge, 
  Maximize2, 
  Info,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface KineticTurretSimulatorProps {
  toolSets: ToolSet[];
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success', toolsetId?: string) => void;
}

export const KineticTurretSimulator: React.FC<KineticTurretSimulatorProps> = ({
  toolSets,
  theme,
  isLight,
  addToast
}) => {
  // Simulator config states
  const [rpm, setRpm] = useState<number>(65); // Rotations per minute
  const [targetForce, setTargetForce] = useState<number>(38); // kN
  const [vibrationNoise, setVibrationNoise] = useState<number>(12); // noise amplitude
  const [activeStationCount, setActiveStationCount] = useState<number>(36); // number of punch-die stations on turret
  const [selectedToolsetId, setSelectedToolsetId] = useState<string>(toolSets[0]?.id || '');

  // Simulation run state
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  const selectedToolset = useMemo(() => {
    return toolSets.find(t => t.id === selectedToolsetId);
  }, [toolSets, selectedToolsetId]);

  // Handle sensor recalibration trigger
  const handleRecalibrate = () => {
    addToast(
      'AUTO-KALIBRACJA AKCELEROMETRU',
      'Zakończono zerowanie czujników drgań łożysk głównych wokół wirnika tabletkarki. Szum zredukowany do optimum (FDA Compliant).',
      'success',
      selectedToolsetId
    );
    setVibrationNoise(6); // reset to clean state
  };

  // Live turret kinematics canvas calculation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // Update kinetic virtual timeline
      if (isSimulating) {
        timeRef.current += (rpm / 60) * 0.05; // speed parameter
      }

      const time = timeRef.current;

      // 1. Draw blueprint style coordinates and background radial tracks
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(22, 182, 212, 0.06)';
      ctx.lineWidth = 1.5;
      
      // concentric circle tracks representing the revolving turret rings
      for (let r = 50; r <= 140; r += 30) {
        ctx.beginPath();
        ctx.arc(cx, cy - 10, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Quadrant crosslines
      ctx.beginPath();
      ctx.moveTo(cx - 160, cy - 10); ctx.lineTo(cx + 160, cy - 10);
      ctx.moveTo(cx, cy - 170); ctx.lineTo(cx, cy + 150);
      ctx.stroke();

      // 2. Draw revolving Turret Base plate shadow & structure
      // Drawing dynamic glass turret overlay
      ctx.beginPath();
      ctx.arc(cx, cy - 10, 145, 0, Math.PI * 2);
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(6, 182, 212, 0.18)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw Main Cam Track (Krzywka sprowadzająca stempli)
      ctx.beginPath();
      ctx.arc(cx, cy - 10, 110, 0, Math.PI * 2);
      ctx.strokeStyle = isLight ? 'rgba(11, 69, 150, 0.15)' : 'rgba(236, 72, 153, 0.18)'; // dynamic cam track representation
      ctx.lineWidth = 4;
      ctx.stroke();

      // Compression rollers indicators (Prasowanie wstępne i główne)
      // Main compression roller at Top-Right quadrant (~45 degrees / 0.78 rad)
      const roller1Angle = Math.PI / 4;
      const rx1 = cx + Math.cos(roller1Angle) * 110;
      const ry1 = (cy - 10) + Math.sin(roller1Angle) * 110;
      
      // Draw Main Roller Wheel overlay
      ctx.beginPath();
      ctx.arc(rx1, ry1, 24, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(239, 68, 68, 0.15)';
      ctx.strokeStyle = isLight ? '#0f172a' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Label roller
      ctx.fillStyle = isLight ? '#0f172a' : '#ef4444';
      ctx.font = '8px monospace';
      ctx.fillText('COMPRESSION_ROLLER', rx1 + 28, ry1 - 4);
      ctx.fillText(`${targetForce.toFixed(0)} kN FORCE`, rx1 + 28, ry1 + 6);

      // Pre-compression roller at Bottom-Left quadrant (5 * PI / 4)
      const roller2Angle = (5 * Math.PI) / 4;
      const rx2 = cx + Math.cos(roller2Angle) * 110;
      const ry2 = (cy - 10) + Math.sin(roller2Angle) * 110;
      
      ctx.beginPath();
      ctx.arc(rx2, ry2, 18, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? 'rgba(75, 85, 99, 0.08)' : 'rgba(59, 130, 246, 0.15)';
      ctx.strokeStyle = isLight ? '#4b5563' : '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
      ctx.fillText('PRE_ROLLER', rx2 - 76, ry2 - 2);

      // 3. Draw single punches as orbital revolving points with dynamic vectors
      const numPunchesOnScreen = Math.min(activeStationCount, 40);
      for (let i = 0; i < numPunchesOnScreen; i++) {
        // distribute punches evenly around turret circle
        const baseAngle = (i / numPunchesOnScreen) * Math.PI * 2;
        const currentAngle = baseAngle + time;

        const radius = 110;
        const px = cx + Math.cos(currentAngle) * radius;
        const py = (cy - 10) + Math.sin(currentAngle) * radius;

        // Calculate load spike if punch is currently passing through the main compression roller (at roller1Angle)
        let angleDiff = Math.abs(currentAngle % (Math.PI * 2) - roller1Angle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        // Calculate load spike for pre-compression roller too
        let preAngleDiff = Math.abs(currentAngle % (Math.PI * 2) - roller2Angle);
        if (preAngleDiff > Math.PI) preAngleDiff = Math.PI * 2 - preAngleDiff;

        let forceLevel = 0.5; // residual base friction force
        let isCompressing = false;
        
        if (angleDiff < 0.28) {
          // high gaussian load spike
          const scale = (0.28 - angleDiff) / 0.28;
          forceLevel = scale * targetForce;
          isCompressing = true;
        } else if (preAngleDiff < 0.22) {
          // lower pre-compression spike
          const scale = (0.22 - preAngleDiff) / 0.22;
          forceLevel = scale * (targetForce * 0.35);
          isCompressing = true;
        }

        // Base punch representation
        ctx.beginPath();
        // larger diameter if under compression load
        const dotSize = isCompressing ? 5.5 : 3.5;
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        
        // dynamic color representing stress vector heat map
        if (isCompressing) {
          ctx.fillStyle = `hsl(${Math.max(0, 200 - (forceLevel / targetForce) * 200)}, 100%, 55%)`;
          
          // emit light energy pulse lines
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(currentAngle) * (forceLevel * 0.5), py + Math.sin(currentAngle) * (forceLevel * 0.5));
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else {
          ctx.fillStyle = isLight ? '#0d9488' : '#34d399';
        }
        ctx.fill();

        // draw small numerical labels for critical punch stations
        if (i % 6 === 0) {
          ctx.fillStyle = isLight ? '#64748b' : '#64748b';
          ctx.font = '6px monospace';
          ctx.fillText(`ST-${i+1}`, px + 6, py + 2);
        }
      }

      // 4. Live vibration jitter noise readout overlay on bottom axis
      const noiseOffset = Math.sin(time * 12) * vibrationNoise * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy + 120 + noiseOffset, 4, 0, Math.PI * 2);
      ctx.fillStyle = vibrationNoise > 15 ? '#ef4444' : '#10b981';
      ctx.fill();

      // Rotational Status Tag
      ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
      ctx.font = '9px monospace';
      ctx.fillText(`MAIN TURRET REVOLUTIONS: R_SPEED = ${rpm} RPM`, 20, 24);
      ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
      ctx.fillText(`FREQUENCY: f = ${(rpm / 60).toFixed(2)} Hz`, 20, 36);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [rpm, targetForce, vibrationNoise, activeStationCount, isSimulating, isLight]);

  // Derived calculations
  const tablethourCapacity = useMemo(() => {
    return (rpm * activeStationCount * 60).toLocaleString('pl-PL');
  }, [rpm, activeStationCount]);

  const peakStressPascal = useMemo(() => {
    // calculation based on punch size & compression force
    const diameterPx = selectedToolset?.standardNarzedzi === 'EU-D' ? 44.1 : 19.0;
    const radiusM = (diameterPx / 2) / 1000;
    const areaM2 = Math.PI * Math.pow(radiusM, 2);
    // Force kN / Area m^2 = MPa
    const forceN = targetForce * 1000;
    return (forceN / areaM2 / 1000000).toFixed(1);
  }, [targetForce, selectedToolset]);

  return (
    <div className="space-y-6">
      
      {/* INTRO TITLE BANNER */}
      <div className={`rounded-2xl p-6 relative overflow-hidden transition-all ${
        isLight ? 'bg-white border border-slate-200' : 'bg-biofarm-dark text-white border border-white/5 bg-grid-pattern-dark'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl shrink-0 ${isLight ? 'bg-slate-100' : 'bg-cyan-500/10 text-cyan-400'}`}>
                <RotateCw className="w-5 h-5 animate-spin-slow text-biofarm-cyan" />
              </span>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  TOP 5 WORLD WEB DESIGN WORKSPACE
                </span>
                <h1 className={`text-xl lg:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Kinetyczny Symulator Drgań i Nacisku Wirnika
                </h1>
              </div>
            </div>
            <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Kinematyczny model dynamicznych naprężeń stempli w trakcie pełnego obrotu wirnika roboczego.
              Precyzyjna analiza wektorowa nacisku strefy prasowania i pre-prasowania w czasie rzeczywistym.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 text-[9px] font-mono uppercase rounded bg-red-500/10 text-red-400 border border-red-500/15">
              REAL-TIME FORCE TRACER
            </span>
          </div>
        </div>
      </div>

      {/* CORE WORKBENCH GRAPHICS AND PLOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ROTATIONAL KINETICS GRAPHIC STAGE */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`rounded-xl p-5 relative overflow-hidden flex flex-col items-center ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            
            {/* Stage Toolbar */}
            <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-slate-700/10">
              <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                <Cpu className="w-4 h-4 text-biofarm-cyan" /> Podgląd Wektorowy Wirnika Tabletkarki
              </h3>

              <div className="flex items-center gap-2 text-[10px] font-mono">
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  className={`px-3 py-1 rounded font-bold border ${
                    isSimulating 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}
                >
                  {isSimulating ? 'SIMULATION RUNNING' : 'PAUSED'}
                </button>
              </div>
            </div>

            {/* Revolving Canvas Container */}
            <div className={`w-full p-4 flex items-center justify-center rounded-xl border relative overflow-hidden ${
              isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950 border-white/5'
            }`}>
              <canvas
                ref={canvasRef}
                width={550}
                height={320}
                className="max-w-full h-auto drop-shadow-md"
              />

              {/* Holographic system info matrix overlay */}
              <div className="absolute top-4 right-4 flex flex-col gap-0.5 text-[8px] font-mono text-cyan-400 opacity-80 pointer-events-none text-right">
                <div>TURRET_STATIONS: {activeStationCount} EA</div>
                <div>CAPACITY: {tablethourCapacity} Tab/h</div>
                <div>PRE_ROLLER_RATIO: 35.0% SAFE</div>
              </div>
            </div>

            {/* CALIBRATION / SLIDER ADJUSTMENT BOARDS */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 pt-4 border-t border-slate-700/15">
              
              {/* SPEED RPM */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Prędkość Rotacji Wirnika:</span>
                  <span className="font-extrabold text-[#0b4596] dark:text-cyan-400">{rpm} RPM</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="1"
                  value={rpm}
                  onChange={(e) => setRpm(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>20 RPM (Rozbieg)</span>
                  <span>120 RPM (Maks. Limit)</span>
                </div>
              </div>

              {/* COMPRESSION kN FORCE */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Siła Prasowania Głównego:</span>
                  <span className="font-extrabold text-red-500">{targetForce} kN</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="0.5"
                  value={targetForce}
                  onChange={(e) => setTargetForce(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>5 kN (Słaba twardość)</span>
                  <span className="text-red-500 font-bold">60 kN (Limit głowicy)</span>
                </div>
              </div>

              {/* VIBRATION AMBIENT NOISE */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Szum drgań łożysk wirnika:</span>
                  <span className={`font-extrabold ${vibrationNoise > 15 ? 'text-red-400 animate-pulse' : 'text-emerald-500'}`}>
                    {(vibrationNoise * 0.12).toFixed(2)} g (RMS)
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="0.5"
                  value={vibrationNoise}
                  onChange={(e) => setVibrationNoise(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Low vibration</span>
                  <span className="text-red-500">Warning: &gt; 1.8g</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: THERMAL / MECHANICAL STRESS METERS */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* CRITICAL VEKTOR PHYSICS READINGS */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Gauge className="w-4 h-4 text-biofarm-cyan" /> Odczyty Naprężeń i Wytrzymałości
            </h2>

            <div className="space-y-3.5 text-[10px] font-mono">
              <div className="flex justify-between items-center py-2 border-b border-slate-700/10">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Naprężenie Ściskające Max:</span>
                <span className="font-extrabold text-[#0b4596] dark:text-cyan-400 text-xs">
                  {peakStressPascal} MPa
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-700/10">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Prędkość Liniowa Obwodowa:</span>
                <span className="font-extrabold text-xs">
                  {((rpm * 2 * Math.PI * 0.165) / 60).toFixed(2)} m / s
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-700/10">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Zużycie Łożysk Głównych:</span>
                <span className="font-extrabold text-emerald-500 text-xs">OPTIMUM (0.12 rms)</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Temperatura Wiru Maszyny:</span>
                <span className={`font-extrabold text-xs ${rpm > 90 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {(21 + (rpm * 0.14) + (targetForce * 0.08)).toFixed(1)} °C
                </span>
              </div>
            </div>

            {/* VIBRATION RESET / RECALIBRATE METRIC */}
            <button
              onClick={handleRecalibrate}
              className="w-full py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider border flex items-center justify-center gap-2 transition-colors cursor-pointer bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" /> AUTO-KALIBRACJA CZUJNIKÓW DRGAŃ
            </button>
          </div>

          {/* ACTIVE TOOLSET STRESS EVALUATION */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Info className="w-4 h-4 text-biofarm-cyan" /> Bezpieczeństwo Zamontowanych Stempli
            </h2>

            <div className="space-y-1.5">
              <label className={`text-[9px] font-mono uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Monitorowany Komplet Stempli:
              </label>
              <select
                value={selectedToolsetId}
                onChange={(e) => setSelectedToolsetId(e.target.value)}
                className={`w-full p-2 rounded text-xs font-mono border focus:outline-none ${
                   isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/10 text-white'
                }`}
              >
                {toolSets.slice(0, 5).map(t => (
                  <option key={t.id} value={t.id}>
                    SET-{t.id} : {t.nazwaProduktu.substring(0, 16)} ({t.standardNarzedzi})
                  </option>
                ))}
              </select>
            </div>

            {selectedToolset && (
              <div className="space-y-3 pt-3 border-t border-slate-700/15 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Maks. Obciążenie Narzędzia:</span>
                  <span className="font-extrabold">{selectedToolset.silaNacisku} kN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stan Bezpieczeństwa:</span>
                  <span className={`font-extrabold uppercase ${
                    targetForce > selectedToolset.silaNacisku 
                      ? 'text-red-500 animate-pulse' 
                      : targetForce > selectedToolset.silaNacisku * 0.8
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                  }`}>
                    {targetForce > selectedToolset.silaNacisku ? 'PRZECIĄŻENIE STREFA ENERGII!' : 'CZYSTY MARGINES'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sugerowana Prędkość RPM:</span>
                  <span className="font-extrabold text-cyan-400">
                    {Math.min(95, Math.floor(selectedToolset.silaNacisku * 2.2))} RPM
                  </span>
                </div>

                {targetForce > selectedToolset.silaNacisku && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-1.5 leading-relaxed text-[9px]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      SYSTEM ALARMOWY COMPACTION EXPIRED: Zadana siła ({targetForce}kN) przekracza maksymalną dopuszczalną siłę uderzenia stempla ({selectedToolset.silaNacisku}kN) wg normy ISO!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* DETAILED TECHNICAL SUMMARY STATS */}
      <div className={`rounded-xl p-5 ${
        isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
      }`}>
        <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 mb-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> Wektory Naprężeń Zgodne z Wytycznymi FDA
        </h4>
        <p className={`text-[10px] font-mono leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Moduł rotacji symuluje przesunięcie stempla pod rolką prasującą na bazie splotu fali sinusoidalnej. Chwilowy wektor obciążenia
          bocznego wpływa na zużycie uszczelnień dławnic i powstawanie mikro-pęknięć na czole stempla. Zachowanie czystych drgań w zakresie
          poniżej 1.5g gwarantuje wieloletnią precyzję dawkowania substancji aktywnej API w tabletkarce Biofarm.
        </p>
      </div>

    </div>
  );
};
