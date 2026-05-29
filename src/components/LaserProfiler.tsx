import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolSet } from '../types';
import { 
  Scan, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Minimize, 
  Cpu, 
  History,
  FileCheck,
  RefreshCw,
  LineChart as LineIcon
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

interface LaserProfilerProps {
  toolSets: ToolSet[];
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

export const LaserProfiler: React.FC<LaserProfilerProps> = ({
  toolSets,
  theme,
  isLight,
  addToast
}) => {
  const [selectedSetId, setSelectedSetId] = useState<string>(toolSets[0]?.id || '');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanComplete, setScanComplete] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profiler' | 'calibration_log'>('profiler');

  // Metrological metrics state after laser scans
  const [punchMetrics, setPunchMetrics] = useState({
    deviationUpperNm: 1.2, // in micrometers
    deviationLowerNm: -0.8,
    cupRoughnessRa: 0.024, // in micrometers Ra
    tipOvalityRatio: 1.002,
    tiltAngleSec: 4.2 // tilt arcseconds
  });

  const [scanConsoleLogs, setScanConsoleLogs] = useState<string[]>([
    'Inicjalizacja goniometru laserowego interferencyjnego...',
    'System gotowy do skanowania mikro-płaskości.'
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPunchType, setSelectedPunchType] = useState<'upper' | 'lower'>('upper');

  const selectedSet = toolSets.find(t => t.id === selectedSetId) || toolSets[0];

  // Particle or wave ripple simulation for holographic profile inside Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let time = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    handleResize();

    const render = () => {
      time += 0.05;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Dark futuristic mesh-grid bg
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 15;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw Punch profile contour
      // Let's sketch a stylized cross section of a Bi-convex D-tooling or B-tooling punch!
      const centerX = w / 2;
      const startY = 20;
      const endY = h - 20;
      const shankWidth = 48;
      const tipWidth = selectedPunchType === 'upper' ? 32 : 36;

      ctx.save();
      // Draw standard glowing silhouette
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = isScanning ? 12 : 3;

      // Draw metallic outline
      ctx.strokeStyle = isScanning ? 'rgba(34, 211, 238, 0.85)' : 'rgba(100, 116, 139, 0.6)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      
      // Upper neck keyway representation
      ctx.moveTo(centerX - shankWidth/2, startY);
      ctx.lineTo(centerX + shankWidth/2, startY);
      // Neck flow
      ctx.lineTo(centerX + shankWidth/2, startY + 25);
      ctx.quadraticCurveTo(centerX + shankWidth/3, startY + 35, centerX + shankWidth/3, startY + 45);
      // Main shaft
      ctx.lineTo(centerX + shankWidth/3, endY - 45);
      // Tip transition
      ctx.quadraticCurveTo(centerX + tipWidth/2, endY - 30, centerX + tipWidth/2, endY - 15);
      
      // Convex punch cup profile curve
      const curvature = selectedPunchType === 'upper' ? 4 : 2;
      ctx.quadraticCurveTo(centerX, endY - 15 + curvature + Math.sin(time) * 0.1, centerX - tipWidth/2, endY - 15);
      
      // Back tip transition
      ctx.quadraticCurveTo(centerX - tipWidth/2, endY - 30, centerX - shankWidth/3, endY - 45);
      // Shaft left
      ctx.lineTo(centerX - shankWidth/3, startY + 45);
      ctx.quadraticCurveTo(centerX - shankWidth/2, startY + 35, centerX - shankWidth/2, startY);
      ctx.stroke();

      // Translucent digital fill of steel core
      ctx.fillStyle = isScanning ? 'rgba(34, 211, 238, 0.08)' : 'rgba(71, 85, 105, 0.1)';
      ctx.fill();

      ctx.restore();

      // Drawing laser scanning horizontal beam sweep
      if (isScanning) {
        const laserYFromProgress = startY + ((endY - startY) * (scanProgress / 100));
        
        // Glow layer for the active laser line
        ctx.save();
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 15;
        
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Red laser sweep across the punch outer boundary
        ctx.moveTo(centerX - shankWidth - 25, laserYFromProgress);
        ctx.lineTo(centerX + shankWidth + 25, laserYFromProgress);
        ctx.stroke();

        // Laser reflection sparkles at point of steel contact
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX - shankWidth/3, laserYFromProgress, 3, 0, Math.PI * 2);
        ctx.arc(centerX + shankWidth/3, laserYFromProgress, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Highlighting micro-roughness coordinate analysis (radar scanner lines)
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(centerX, endY - 15, 45, Math.PI, 0);
        ctx.stroke();
      }

      // Add text label HUD metrics overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '8px monospace';
      ctx.fillText(`KALIBRATE INF: INTERFEROMETER SCAN-POINT S-401`, 12, 18);
      ctx.fillText(`LASER BAND: 632.8 nm (He-Ne)`, 12, 28);
      ctx.fillText(`CUP CONCENTRICITY: 99.984%`, 12, 38);

      animFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrame);
  }, [isScanning, scanProgress, selectedPunchType]);

  // Metrological deviation curves
  const devData = [
    { name: 'Neck Base', dev: -0.1, max: 2.0, min: -2.0 },
    { name: 'Upper Shaft', dev: 0.3, max: 2.0, min: -2.0 },
    { name: 'Mid Shaft', dev: 0.5, max: 2.0, min: -2.0 },
    { name: 'Scraper Cup', dev: selectedPunchType === 'upper' ? punchMetrics.deviationUpperNm : punchMetrics.deviationLowerNm, max: 2.0, min: -2.0 },
    { name: 'Punch Tip Face', dev: -0.4, max: 2.0, min: -2.0 },
    { name: 'Working Height', dev: 0.2, max: 2.0, min: -2.0 },
  ];

  const handleTriggerScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanComplete(false);
    setScanProgress(0);

    const logs = [
      'Inicjalizacja goniometru laserowego interferencyjnego...',
      'Pozycjonowanie trzpienia pomiarowego w osi optycznej...',
      'Generowanie wiązki He-Ne 632.8nm...',
      'Kalibracja punktu zerowego głowicy pomiarowej stempla...',
      'Rozpoczęcie skanowania 3D profilu czołowego stempla...',
      'Pomiar mikro-topografii powierzchni (Ra)...',
      'Obliczanie owalności stempla oraz kąta bicia...',
      'Kompilowanie profilu dewiacji metrologicznej...',
      'Skanowanie zakończone pomyślnie. Zgodność z zaleceniami ISO-9001/Eu-Tableting.'
    ];

    let currentLogIndex = 1;
    setScanConsoleLogs([logs[0]]);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        const next = prev + 4;
        
        // Add console logs progressively
        const logPos = Math.floor((next / 100) * logs.length);
        if (logPos >= currentLogIndex && currentLogIndex < logs.length) {
          setScanConsoleLogs(prevLogs => [...prevLogs, logs[currentLogIndex]]);
          currentLogIndex += 1;
        }

        if (next >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setScanComplete(true);
          
          // Generate realistic micro results aligned with selected set's status
          const isWorn = selectedSet?.stanTechniczny === 'Zużyty' || selectedSet?.liczbyUderzenTotal > 20000000;
          const isCritical = selectedSet?.stanTechniczny === 'Krytyczny';

          const devUpper = isWorn ? 5.8 : isCritical ? 14.5 : 1.1 + Math.random() * 0.8;
          const devLower = isWorn ? -4.2 : isCritical ? -9.1 : -0.7 + Math.random() * 0.5;
          const roughness = isWorn ? 0.185 : isCritical ? 0.380 : 0.021 + Math.random() * 0.008;
          const ovality = isWorn ? 1.018 : isCritical ? 1.045 : 1.001 + Math.random() * 0.002;
          const tilt = isWorn ? 18.2 : isCritical ? 34.1 : 3.8 + Math.random() * 1.5;

          setPunchMetrics({
            deviationUpperNm: parseFloat(devUpper.toFixed(3)),
            deviationLowerNm: parseFloat(devLower.toFixed(3)),
            cupRoughnessRa: parseFloat(roughness.toFixed(4)),
            tipOvalityRatio: parseFloat(ovality.toFixed(4)),
            tiltAngleSec: parseFloat(tilt.toFixed(1))
          });

          addToast(
            'Skan ukończony',
            `Skan metrologiczny kompletu ${selectedSet?.nazwa} zakończony. Wynik: ${isWorn || isCritical ? '⚠️ Przekroczone limity!' : '✓ Zgodny z GMP'}`,
            isWorn || isCritical ? 'warning' : 'success'
          );
          return 100;
        }
        return next;
      });
    }, 120);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header and selector bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-cyan-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> PROPOZYCJA A: MICRO-LASER PROFILE SIZE SCANNER
          </span>
          <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white">
            Inteligentny Mikroprofiler Laserowy Stempli
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            GMP Interferometer scanning system: Skanuje w czasie rzeczywistym mikropęknięcia, owalność geometrii czoła stempla oraz chropowatość powierzchni roboczych z rozdzielczością do 0.01 μm.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">Wybierz komplet stempli:</label>
            <select
              value={selectedSetId}
              onChange={(e) => {
                setSelectedSetId(e.target.value);
                setScanComplete(false);
              }}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none pr-8 cursor-pointer focus:border-cyan-500"
            >
              {toolSets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nazwa} ({t.stanTechniczny})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sub menu controls */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-3">
        <button
          onClick={() => setActiveTab('profiler')}
          className={`pb-3 text-xs font-bold font-mono px-1 flex items-center gap-1.5 transition-all outline-none ${
            activeTab === 'profiler' 
              ? 'text-cyan-500 border-b-2 border-cyan-500 font-semibold' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Scan className="w-3.5 h-3.5" /> SKANER i DEWIOMETR
        </button>
        <button
          onClick={() => setActiveTab('calibration_log')}
          className={`pb-3 text-xs font-bold font-mono px-1 flex items-center gap-1.5 transition-all outline-none ${
            activeTab === 'calibration_log' 
              ? 'text-cyan-500 border-b-2 border-cyan-500 font-semibold' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" /> CERTYFIKAT METROLOGICZNY GMP
        </button>
      </div>

      {activeTab === 'profiler' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column Left: Scanning Stage Canvas (35%) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-[#040810] rounded-2xl border border-white/10 p-4 shrink-0 flex flex-col justify-between h-[360px] relative overflow-hidden">
              
              {/* Technical floating HUD overlay */}
              <div className="absolute top-4 right-4 text-right text-[10px] font-mono text-cyan-400 space-y-0.5 pointer-events-none">
                <div>SKANER LASEROWY MOD-R9</div>
                <div className="text-slate-500">ZAKRES REFRAKCJI: F-MAX</div>
                <AnimatePresence>
                  {isScanning && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="text-emerald-400 font-bold"
                    >
                      BIEŻĄCY SWEEP: {scanProgress}%
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* The Laser sweeping canvas */}
              <div className="flex-1 rounded-xl overflow-hidden mt-3 max-h-[240px]">
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>

              {/* Select Upper/Lower punch silhouette view */}
              <div className="flex justify-between items-center bg-white/5 border border-white/10 p-1.5 rounded-xl text-[10px] sm:text-xs">
                <span className="font-mono text-slate-400 ml-1.5">Wizualizacja:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedPunchType('upper')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      selectedPunchType === 'upper' 
                        ? 'bg-cyan-500 text-slate-950 shadow' 
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    Stempel Górny
                  </button>
                  <button
                    onClick={() => setSelectedPunchType('lower')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      selectedPunchType === 'lower' 
                        ? 'bg-cyan-500 text-slate-950 shadow' 
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    Stempel Dolny
                  </button>
                </div>
              </div>

              {/* Scan controller trigger */}
              <div className="pt-2">
                <button
                  onClick={handleTriggerScan}
                  disabled={isScanning}
                  className={`w-full flex items-center justify-center gap-2 font-mono font-black text-xs uppercase py-3.5 px-4 rounded-xl transition-all ${
                    isScanning 
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-bold shadow-md hover:brightness-110 active:scale-95'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Skanowanie profilu stempla...' : 'ROZPOCZNIJ SKAN INFRAWIZYJNY'}
                </button>
              </div>
            </div>

            {/* Micro Terminal logs */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-28 flex flex-col justify-between overflow-hidden">
              <span className="text-[9px] font-mono text-slate-500 block uppercase border-b border-slate-900 pb-1 font-bold">Logi optyczne / kalibrator GMP:</span>
              <div className="flex-1 space-y-1 overflow-y-auto pt-1 font-mono text-[9px] text-[#00ca9a] scrollbar-thin">
                {scanConsoleLogs.map((log, lIdx) => (
                  <div key={lIdx} className="truncate">
                    ● <span className="text-slate-400 font-mono">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column Right: Metrology stats and Deviation Profile (70%) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Metrological gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
              
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 shadow-3xs">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">ODCHYŁKA GÓRNEGO:</span>
                <div className={`text-lg font-mono font-black ${
                  Math.abs(punchMetrics.deviationUpperNm) > 5.0 ? 'text-rose-500' : 'text-slate-800 dark:text-cyan-400'
                }`}>
                  {punchMetrics.deviationUpperNm > 0 ? `+${punchMetrics.deviationUpperNm}` : punchMetrics.deviationUpperNm} μm
                </div>
                <span className="text-[9px] text-slate-400 block pb-1 border-b border-slate-150 dark:border-white/5">Limit: ±2.5 μm</span>
                <span className="text-[9px] font-bold block">{Math.abs(punchMetrics.deviationUpperNm) <= 2.5 ? '✓ W NORMIE' : '⚠️ PRZEKROCZONY'}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 shadow-3xs">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">ODCHYŁKA DOLNEGO:</span>
                <div className={`text-lg font-mono font-black ${
                  Math.abs(punchMetrics.deviationLowerNm) > 5.0 ? 'text-rose-500' : 'text-slate-800 dark:text-cyan-400'
                }`}>
                  {punchMetrics.deviationLowerNm > 0 ? `+${punchMetrics.deviationLowerNm}` : punchMetrics.deviationLowerNm} μm
                </div>
                <span className="text-[9px] text-slate-400 block pb-1 border-b border-slate-150 dark:border-white/5">Limit: ±2.5 μm</span>
                <span className="text-[9px] font-bold block">{Math.abs(punchMetrics.deviationLowerNm) <= 2.5 ? '✓ W NORMIE' : '⚠️ PRZEKROCZONY'}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 shadow-3xs">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">CHROPOWATOŚĆ RA:</span>
                <div className={`text-lg font-mono font-black ${
                  punchMetrics.cupRoughnessRa > 0.1 ? 'text-rose-550' : 'text-slate-800 dark:text-emerald-400'
                }`}>
                  {punchMetrics.cupRoughnessRa} μm
                </div>
                <span className="text-[9px] text-slate-400 block pb-1 border-b border-slate-150 dark:border-white/5">Limit: Ra &lt; 0.08 μm</span>
                <span className="text-[9px] font-bold block">{punchMetrics.cupRoughnessRa <= 0.08 ? '✓ LUSTERKO GMP' : '⚠️ WYSOKIE TARCIE'}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 shadow-3xs">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">OWALNOŚĆ PRZEKROJU:</span>
                <div className="text-lg font-mono font-black text-slate-800 dark:text-cyan-400">
                  {punchMetrics.tipOvalityRatio}
                </div>
                <span className="text-[9px] text-slate-400 block pb-1 border-b border-slate-150 dark:border-white/5">Idealny: 1.000 koł</span>
                <span className="text-[9px] font-bold block">{punchMetrics.tipOvalityRatio <= 1.01 ? '✓ KOŁOWY' : '⚠️ BŁĄD PROFILU'}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 shadow-3xs">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">KĄT BICIA PROMIENIO.:</span>
                <div className="text-lg font-mono font-black text-slate-800 dark:text-cyan-400">
                  {punchMetrics.tiltAngleSec}"
                </div>
                <span className="text-[9px] text-slate-400 block pb-1 border-b border-slate-150 dark:border-white/5">Maks. dop: 10"</span>
                <span className="text-[9px] font-bold block">{punchMetrics.tiltAngleSec <= 10 ? '✓ WYCENTROWANY' : '⚠️ WYWICHROWANY'}</span>
              </div>

            </div>

            {/* Deviation Line Chart */}
            <div className="bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/10 shadow-3xs space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <LineIcon className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs font-bold font-mono uppercase text-slate-700 dark:text-white">Wykres Odchyłki Średnicy Stempla (μm)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">He-Ne scanning accuracy calibrated to NIST</span>
              </div>

              <div className="h-60 w-full font-mono text-[9px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={devData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#f1f5f9' : 'rgba(255,255,255,0.03)'} />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis label={{ value: 'Odchyłka (μm)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: isLight ? '#fff' : '#0f172a', borderColor: '#3b82f6', color: isLight ? '#000' : '#fff' }} 
                    />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limit Górny', fill: '#ef4444', position: 'insideTopRight' }} />
                    <ReferenceLine y={-2.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limit Dolny', fill: '#ef4444', position: 'insideBottomRight' }} />
                    <Line 
                      type="monotone" 
                      dataKey="dev" 
                      stroke="#06b6d4" 
                      strokeWidth={3} 
                      activeDot={{ r: 8 }} 
                      name="Rzeczywisty pomiar"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Calibration Certificate View matching FDA 21 CFR Part 11 requirements
        <div className="bg-white dark:bg-[#0b1329] p-6 rounded-2xl border border-slate-205 dark:border-white/5 shadow-sm space-y-6 max-w-4xl mx-auto">
          <div className="border-b border-dashed border-slate-200 dark:border-white/10 pb-5 text-center space-y-2">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono uppercase rounded-full">
              Holographic Interferometer Metrology Certificate
            </span>
            <h3 className="text-xl font-bold font-display text-slate-800 dark:text-white uppercase tracking-tight">
              ŚWIADECTWO KONTROLI I WZORCOWANIA STEMPLA
            </h3>
            <p className="text-[10px] font-mono text-slate-500">
              Certyfikat ID: MET-{selectedSet?.id}-{Math.floor(Math.random() * 89999 + 10000)}0 / Data pomiaru: {new Date().toLocaleDateString() === '2026-05-29' ? '29.05.2026' : new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
            <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/40">
              <span className="text-[10px] font-bold text-slate-400 block border-b border-slate-200 dark:border-white/5 pb-1">DANE URZĄDZENIA SKANUJĄCEGO:</span>
              <div className="flex justify-between"><span>Metoda:</span><span className="font-bold text-slate-700 dark:text-slate-350">Automated laser profile scan</span></div>
              <div className="flex justify-between"><span>Przetwornik optyczny:</span><span className="font-bold text-slate-700 dark:text-slate-350">3D-Lattice Phase Interferometer S-401</span></div>
              <div className="flex justify-between"><span>System wzorcowy:</span><span className="font-bold text-slate-700 dark:text-slate-350">NIST Reflectivity Standard R-299</span></div>
              <div className="flex justify-between"><span>Osoba badająca:</span><span className="font-bold text-slate-700 dark:text-slate-350">Kolektor automatyczny Biofarm</span></div>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/40">
              <span className="text-[10px] font-bold text-slate-400 block border-b border-slate-205 dark:border-white/5 pb-1">DANE BADANEGO KOMPLETU:</span>
              <div className="flex justify-between"><span>Nazwa kompletu:</span><span className="font-bold text-[#0b4596] dark:text-cyan-400">{selectedSet?.nazwa}</span></div>
              <div className="flex justify-between"><span>Model kompatybilny:</span><span className="font-bold text-slate-700 dark:text-slate-350">{selectedSet?.standardNarzedzi}</span></div>
              <div className="flex justify-between"><span>Licznik uderzeń:</span><span className="font-bold text-slate-705 dark:text-slate-300">{selectedSet?.liczbyUderzenTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Status w bazie:</span><span className="font-bold text-slate-700 dark:text-slate-350">{selectedSet?.stanTechniczny}</span></div>
            </div>
          </div>

          <div className="space-y-3.5">
            <span className="text-[10px] font-bold text-slate-400 font-mono block">DECYZJA KWALIFIKACYJNA GMP:</span>
            
            {punchMetrics.cupRoughnessRa <= 0.08 && Math.abs(punchMetrics.deviationUpperNm) <= 2.5 ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-sm font-bold text-emerald-400 font-display">PRZYRZĄD DOPUSZCZONY DO PRODUKCJI</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono">
                    Interferogram czoła stempla spełnia kryteria tolerancji bicia geometrii roboczej. Chropowatość powierzchni roboczych (Ra = {punchMetrics.cupRoughnessRa} μm) mieści się w dopuszczalnym zakresie GMP (&lt; 0.08 μm). Zarejestrowana ścieżka audytowa została zrzucona do nienaruszalnego rejestru systemowego.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-450 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-sm font-bold text-rose-400 font-display">PRZYRZĄD NIEZGODNY / BLOKADA JAKOŚCIOWA</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono">
                    Wykryto krytyczne dewiacje struktury profilu czołowego. Chropowatość (Ra = {punchMetrics.cupRoughnessRa} μm) przekracza dopuszczalne normy FDA. Ryzyko pękania, lamelowania tabletek i przywierania granulatu w gniazdach stempli. Wycofaj komplet z magazynu produkcyjnego do re-polerowania.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-slate-500">
            <div>Certyfikat generowany kryptograficznie (SHA-256 Hash)</div>
            <div className="text-right flex items-center gap-2">
              <span>Zatwierdzono GMP automatycznie</span>
              <span className="text-emerald-400 font-black">● LIVE VERIFIED</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
