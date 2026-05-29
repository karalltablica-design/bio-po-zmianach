import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dribbble, 
  Gauge, 
  HelpCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Flame, 
  RotateCw,
  TrendingUp,
  Sliders,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface PowderCompressionSimProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

export const PowderCompressionSim: React.FC<PowderCompressionSimProps> = ({
  theme,
  isLight,
  addToast
}) => {
  // Compression Parameters
  const [rpm, setRpm] = useState<number>(65); // Turret RPM
  const [preCompForce, setPreCompForce] = useState<number>(4.5); // Pre-compression force kN
  const [mainCompForce, setMainCompForce] = useState<number>(32.0); // Main compression force kN
  const [powderPlasticity, setPowderPlasticity] = useState<number>(60); // Powder plastic response (%)
  const [selectedGranulate, setSelectedGranulate] = useState<'ibuprofen' | 'paracetamol' | 'vitamin_c'>('paracetamol');

  // Interactive Live compaction player state
  const [simPhase, setSimPhase] = useState<'resting' | 'pre_compression' | 'main_compression' | 'dwell' | 'ejection'>('resting');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simCounter, setSimCounter] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Constants mapping according to pharmaceutical standard
  // head flat width (B-tooling is approx 9.5mm, D-tooling approx 11.5mm)
  const headFlatWidthMm = selectedGranulate === 'ibuprofen' ? 9.5 : 11.5; 

  // Calculations:
  // Turret speed V (linear) = pi * pitch_diameter * RPM / 60
  // pitch_diameter of typical press is approx 0.41 meters (e.g. Fette 1200 or Killian 500)
  const pitchDiameterM = 0.41;
  const linearSpeedMPerS = (Math.PI * pitchDiameterM * rpm) / 60;
  
  // Dwell time dt = head_flat_width / linear_speed (in milliseconds)
  const dwellTimeMs = (headFlatWidthMm / (linearSpeedMPerS * 1000)) * 1000;

  // Capping and lamination risk formula:
  // Poor plasticity, ultra-low dwell-time (due to high RPM), and too high pressure trigger structural fracture
  const dwellTimeRiskFactor = Math.max(0, (15 - dwellTimeMs) * 4); // higher risk if under 15ms dwell
  const pressureRiskFactor = Math.abs(mainCompForce - 28) * 1.2; // deviation from sweet spot
  const poorPlasticityRiskFactor = (100 - powderPlasticity) * 0.45;
  const rawCappingRisk = Math.min(98, Math.max(2, (dwellTimeRiskFactor + pressureRiskFactor + poorPlasticityRiskFactor) / 1.5));
  const cappingRisk = parseFloat(rawCappingRisk.toFixed(1));

  // Determine critical thresholds
  const cappingThreshold = selectedGranulate === 'ibuprofen' ? 55 : selectedGranulate === 'vitamin_c' ? 70 : 65;

  // 1. Dynamic Area chart points representing compression force vs time profile
  const generateForceCurve = () => {
    const data = [];
    // 50-point cycle
    for (let i = 0; i < 50; i++) {
      let t = i * 2; // ms equivalent
      let f = 0;
      
      // Pre-compression spike (around i=15)
      if (i >= 10 && i <= 20) {
        const peakDist = Math.abs(i - 15);
        f = preCompForce * Math.exp(-Math.pow(peakDist / 2.5, 2));
      }
      
      // Main compression spike (around i=35), flat top represent dwell-time
      if (i >= 25 && i <= 45) {
        const dwellWidth = Math.max(1, Math.floor(dwellTimeMs / 2.5));
        const peakDist = Math.max(0, Math.abs(i - 35) - (dwellWidth / 5));
        f = mainCompForce * Math.exp(-Math.pow(peakDist / 3.5, 2));
      }

      data.push({
        time: `${t} ms`,
        force: parseFloat(f.toFixed(2))
      });
    }
    return data;
  };

  const forceCurveData = generateForceCurve();

  // 2. Continuous particle state physics inside canvas representing powder compact deforming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let frameCount = 0;

    // Sizing canvas to high-DPI
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    handleResize();

    // Generate loose powder granules (initial uncompressed state)
    interface GranuleItem {
      x: number;
      y: number;
      ox: number; // original relative offset
      oy: number;
      radius: number;
      color: string;
      deformatRatioX: number;
      deformatRatioY: number;
    }

    const granules: GranuleItem[] = [];
    const rows = 4;
    const cols = 9;
    const baseGapX = 24;
    const baseGapY = 15;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // slight deterministic offset for a realistic granular pile distribution
        const rx = (Math.random() - 0.5) * 6;
        const ry = (Math.random() - 0.5) * 3;
        granules.push({
          x: 0,
          y: 0,
          ox: c * baseGapX + 45 + rx,
          oy: r * baseGapY + 115 + ry,
          radius: 4.5 + Math.random() * 2.5,
          color: selectedGranulate === 'vitamin_c' ? '#fde047' : selectedGranulate === 'ibuprofen' ? '#93c5fd' : '#cbd5e1',
          deformatRatioX: 1,
          deformatRatioY: 1
        });
      }
    }

    const render = () => {
      if (isPlaying) {
        frameCount += 1;
      }
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Clean Tech space background with subtle grid lines
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let dx = 0; dx < w; dx += 16) {
        ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx, h); ctx.stroke();
      }

      // Cyclic loop mapping of the rotation press punch cycle
      // Phase angle maps:
      // Interval 0 - 180: Sinusoidal downward stroke of upper punch
      const cyclePos = (frameCount % 180) / 180; // 0.0 to 1.0
      
      // Determine physical position of upper and lower punch faces
      const restYUpper = 65;
      const strokeLimitUpper = 42; // maximum downward extension
      
      // Compute sinus compression curve shape
      let pressHeightProgress = 0; // 0 is uncompressed, 1 is fully squeezed
      let currentPhaseStr = 'Sypanie proszku (Feeding)';

      if (cyclePos < 0.25) {
        // Punch descending - pre-compression
        pressHeightProgress = Math.sin((cyclePos / 0.25) * Math.PI / 2) * 0.22;
        currentPhaseStr = 'Pre-kompresja (Odpowietrzanie)';
      } else if (cyclePos >= 0.25 && cyclePos < 0.50) {
        // Main compression & flat dwell peak
        const ratio = (cyclePos - 0.25) / 0.25;
        pressHeightProgress = 0.22 + Math.sin(ratio * Math.PI / 2) * 0.78;
        currentPhaseStr = 'Kompresja Główna (Squeeze)';
      } else if (cyclePos >= 0.50 && cyclePos < 0.65) {
        // Dwell Peak bonding
        pressHeightProgress = 1.0;
        currentPhaseStr = 'Czas Dwell-Time (Formowanie wiązań)';
      } else if (cyclePos >= 0.65 && cyclePos < 0.85) {
        // Decompression & elastic recovery
        const ratio = (cyclePos - 0.65) / 0.20;
        pressHeightProgress = 1.0 - ratio;
        currentPhaseStr = 'Dekompresja i Ekstruzja';
      } else {
        // Tablet ejection
        pressHeightProgress = 0;
        currentPhaseStr = 'Ejection (Wyrzut gotowej tabletki)';
      }

      // Draw Die walls (outer frame)
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // left die wall
      ctx.moveTo(35, 45);
      ctx.lineTo(35, 195);
      // right die wall
      ctx.moveTo(w - 35, 45);
      ctx.lineTo(w - 35, 195);
      ctx.stroke();

      // Punch models
      const upperPunchY = restYUpper + (pressHeightProgress * strokeLimitUpper);
      const lowerPunchY = 185 - (pressHeightProgress * 8); // Lower punch holds solid foundation

      // Drawing upper punch metal tooling nose
      ctx.fillStyle = '#4b5563';
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(38, upperPunchY - 80, w - 76, 80);
      ctx.fill(); ctx.stroke();

      // Drawing convex tip of upper punch face
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(w / 2, upperPunchY, (w - 76) / 2, Math.PI, 0, true);
      ctx.fill(); ctx.stroke();

      // Lower punch face
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.rect(38, lowerPunchY, w - 76, 80);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.arc(w / 2, lowerPunchY, (w - 76) / 2, 0, Math.PI, false);
      ctx.fill(); ctx.stroke();

      // Drawing/updating the compressed chemical powder granules
      const midSqueezeY = (upperPunchY + lowerPunchY) / 2;
      const compressionScale = 1 - (pressHeightProgress * 0.42); // compression ratio

      granules.forEach((g) => {
        // Project position inside the compact matrix
        const relativeYDist = g.oy - 135;
        g.x = g.ox;
        g.y = midSqueezeY + (relativeYDist * compressionScale);
        
        // Deformation modeling: spheres flatten into hexagons as pressure peaks
        g.deformatRatioY = 1 - (pressHeightProgress * 0.35);
        g.deformatRatioX = 1 + (pressHeightProgress * 0.28);

        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.scale(g.deformatRatioX, g.deformatRatioY);
        ctx.fillStyle = g.color;
        
        // If high force, increase cohesion glow
        if (pressHeightProgress > 0.85) {
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 8;
        }

        ctx.beginPath();
        // As compression becomes dense, make them flatter
        if (pressHeightProgress > 0.8) {
          ctx.rect(-g.radius, -g.radius + 1, g.radius * 2, g.radius * 2 - 2);
        } else {
          ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      });

      // 3. Render a CAPPING FLASH CRACK representing structural matrix mechanical failure if risk is extremely high
      if (cappingRisk > cappingThreshold && pressHeightProgress > 0.7) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        
        // Jagged crack splitting the middle of the tablet
        ctx.beginPath();
        ctx.moveTo(40, midSqueezeY - 5);
        const segments = 6;
        const segWidth = (w - 80) / segments;
        for (let idx = 1; idx <= segments; idx++) {
          const rx = 40 + (idx * segWidth);
          const ry = midSqueezeY + (Math.random() - 0.5) * 8 - 4;
          ctx.lineTo(rx, ry);
        }
        ctx.stroke();

        ctx.shadowBlur = 0; // reset glow

        // Bouncing HUD Warning sign
        if (Math.sin(frameCount * 0.15) > 0) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'black 9px monospace';
          ctx.fillText('⚠️ OSTRZEŻENIE: ROZWARSTWIENIE (CAPPING DETECTED)', 46, midSqueezeY - 24);
        }
      }

      // Interactive labels
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px monospace';
      ctx.fillText(`FAZA CYKLU: ${currentPhaseStr.toUpperCase()}`, 12, h - 14);
      ctx.fillText(`OBJĘTOŚĆ NASYPU: 100% | SZCZELINA PRE: ${(12 - (pressHeightProgress * 3)).toFixed(2)}mm`, w - 210, h - 14);

      animFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, rpm, pPreCompForce => preCompForce, pMainCompForce => mainCompForce, powderPlasticity, selectedGranulate, cappingRisk, cappingThreshold]);

  // Toast dynamic warning
  useEffect(() => {
    if (cappingRisk > cappingThreshold) {
      addToast(
        'Krytyczne ryzyko cappingu',
        `Symulator wykazał ryzyko rozwarstwienia (${cappingRisk}%). Obniż prędkość obrotową (RPM) lub zwiększ plastyczność proszku.`,
        'warning'
      );
    }
  }, [cappingRisk > cappingThreshold]);

  return (
    <div className="space-y-6 text-left">
      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-purple-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" /> PROPOZYCJA B: POWDER COMPACTION & DWELL SIMULATOR
          </span>
          <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white">
            Symulator Zagęszczania Proszku i Siły Kompresji
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Zasymuluj zachowanie lepkosprężyste substancji czynnych (API). Zobacz, jak prędkość głowicy obrotowej (RPM) i siła nacisku głównego wpływają na rozchodzenie się powietrza w strukturze oraz wiązanie cząstek.
          </p>
        </div>

        {/* Selected Granulate Type */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-white/10">
          {[
            { id: 'paracetamol', label: 'Paracetamol 500mg' },
            { id: 'ibuprofen', label: 'Ibuprofen (Trudny)' },
            { id: 'vitamin_c', label: 'Kwas askorbinowy (Kruchy)' }
          ].map((gran) => (
            <button
              key={gran.id}
              onClick={() => setSelectedGranulate(gran.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all outline-none ${
                selectedGranulate === gran.id 
                  ? 'bg-purple-600 text-white shadow' 
                  : 'text-slate-550 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
              }`}
            >
              {gran.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Parameter sliders (40%) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-3xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
              <span className="text-xs font-bold font-mono uppercase text-[#0b4596] dark:text-purple-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-400" /> Parametry Maszyny i Granulatu
              </span>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono outline-none transition-all ${
                  isPlaying ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {isPlaying ? 'PAUZA SIM' : 'WZNOW SIM'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Slider 1: RPM */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                    Prędkość Matrycy (RPM):
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-cyan-400">{rpm} obr./min</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="115"
                  value={rpm}
                  onChange={(e) => setRpm(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-505"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Wolno (Wysoki Dwell)</span>
                  <span>Maks. prędkość prasy</span>
                </div>
              </div>

              {/* Slider 2: Pre-compression Force */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    Nacisk Wstępny (Pre-compression):
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-cyan-400">{preCompForce.toFixed(1)} kN</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.5"
                  value={preCompForce}
                  onChange={(e) => setPreCompForce(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Odpowietrzanie 0.5 kN</span>
                  <span>Wykruszanie 15 kN</span>
                </div>
              </div>

              {/* Slider 3: Main Compression Force */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    Nacisk Główny (Main-compression):
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-cyan-400">{mainCompForce.toFixed(1)} kN</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="60.0"
                  step="1.0"
                  value={mainCompForce}
                  onChange={(e) => setMainCompForce(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Słabe matowanie</span>
                  <span>Maksymalny zgniot</span>
                </div>
              </div>

              {/* Slider 4: Powder Plasticity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-sans">
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    Spoiwo / Plastyczność proszku:
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-cyan-400">{powderPlasticity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={powderPlasticity}
                  onChange={(e) => setPowderPlasticity(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Substancja sprężysta (ryzyko)</span>
                  <span>Plastyczne spajanie</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="bg-[#0b1329] text-white p-5 rounded-2xl border border-white/5 space-y-4">
            <span className="text-[10px] font-mono text-cyan-400 block uppercase font-bold tracking-wider">
              Analityka Kohezji i Zgniotu (Pharma Engineering Output):
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">DWELL TIME:</span>
                <span className="text-xl font-mono font-black text-cyan-300">{dwellTimeMs.toFixed(1)} ms</span>
                <p className="text-[8.5px] text-slate-500 mt-1">Zalecany min: 14.0 ms dla API</p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">RYZYKO CAPPINGU:</span>
                <span className={`text-xl font-mono font-black ${
                  cappingRisk > cappingThreshold ? 'text-rose-500' : 'text-emerald-400'
                }`}>{cappingRisk}%</span>
                <p className="text-[8.5px] text-slate-500 mt-1">Górny limit bezpieczny: {cappingThreshold}%</p>
              </div>
            </div>

            {cappingRisk > cappingThreshold ? (
              <div className="bg-rose-500/15 border border-rose-500/30 p-2.5 rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-450 shrink-0 mt-0.5" />
                <div className="text-[9px] text-slate-350 leading-relaxed font-mono">
                  ZAGROŻENIE WADAMI FORMOWANIA! Zmniejsz prędkość prasy (RPM) o minimum 15%, aby wydłużyć czas stempla nad spłaszczeniem główki (Dwell Time) i ułatwić ujście gazów.
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/15 border border-emerald-500/30 p-2.5 rounded-xl flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[9px] text-slate-350 leading-relaxed font-mono">
                  PARAMETRY ROBOCZE STRUKTURALNIE STABILNE. Czas ściskania cząstek w gniazdach matrycy wystarczający do utworzenia trwałych wiązań krystalicznych bez rozwarstwień czołowych.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live micro-cavity canvas and Force curves (60%) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Microscopic visual chamber */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 h-[240px] flex flex-col justify-between overflow-hidden">
            <span className="text-[10px] font-mono text-purple-400 block pb-1 border-b border-white/5">
              MICRO-GEOMETRY CHAMBER: Zbliżenie na prasowanie mikro-granulatu paracetamolu/API
            </span>

            <div className="flex-1 my-3 rounded-lg overflow-hidden relative">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Matryca: Górny rylec bębna</span>
              <span>Symulacja fizyki GMP 1:1</span>
            </div>
          </div>

          {/* Area charts of the curve compression force profiles */}
          <div className="bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/10 shadow-3xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold font-mono uppercase text-slate-700 dark:text-white">
                  Krzywa Profilu Siły Nacisku (Compaction Curve)
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400">Wycentrowanie uderzenia stempli dolnego/górnego</span>
            </div>

            <div className="h-44 w-full font-mono text-[9px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forceCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#f1f5f9' : 'rgba(255,255,255,0.03)'} />
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis label={{ value: 'Nacisk (kN)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: isLight ? '#fff' : '#0f172a', borderColor: '#a855f7', color: isLight ? '#000' : '#fff' }}
                  />
                  <Area type="monotone" dataKey="force" stroke="#c084fc" fillOpacity={1} fill="url(#colorComp)" name="Bieżący profil" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
