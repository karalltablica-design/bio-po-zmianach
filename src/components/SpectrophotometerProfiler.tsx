import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolSet, ToolStatus } from '../types';
import { 
  Sparkles, 
  Compass, 
  RotateCcw, 
  Maximize2, 
  AlertTriangle, 
  Activity, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  CheckCircle,
  Wrench,
  Gauge,
  Camera,
  Binary,
  Flame,
  Zap,
  Check,
  Plus,
  Trash2
} from 'lucide-react';

interface SpectrophotometerProfilerProps {
  toolSets: ToolSet[];
  onUpdateToolSet: (updated: ToolSet) => void;
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success', toolsetId?: string) => void;
}

export const SpectrophotometerProfiler: React.FC<SpectrophotometerProfilerProps> = ({
  toolSets,
  onUpdateToolSet,
  theme,
  isLight,
  addToast
}) => {
  // Navigation & selection
  const [selectedToolsetId, setSelectedToolsetId] = useState<string>(toolSets[0]?.id || '');

  const selectedToolset = useMemo(() => {
    return toolSets.find(t => t.id === selectedToolsetId);
  }, [toolSets, selectedToolsetId]);

  // Calibration states
  const [laserSensitivity, setLaserSensitivity] = useState<number>(75); // 0-100% laser detection
  const [scanWavelength, setScanWavelength] = useState<number>(632.8); // 400nm to 800nm (He-Ne red laser default is 632.8nm)
  const [interactiveRotation, setInteractiveRotation] = useState<number>(35); // Degrees of virtual rotation
  const [interactivePitch, setInteractivePitch] = useState<number>(25); // Degrees of virtual pitch angle
  
  // Animation/Scanning state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [activeTabSub, setActiveTabSub] = useState<'3d' | 'heatmap' | 'pvd'>('3d');

  // Custom added defects
  const [defectX, setDefectX] = useState<number>(50);
  const [defectY, setDefectY] = useState<number>(50);
  const [defectZ, setDefectZ] = useState<number>(0.12);
  const [defectOpis, setDefectOpis] = useState<string>('Pitting krawędziowy powłoki CrN');
  const [defectStopien, setDefectStopien] = useState<'Słaby' | 'Umiarkowany' | 'Krytyczny'>('Słaby');

  // Canvas Ref
  const 	canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Sound generator for the laser scan frequency sweeps
  const playLaserSound = (frequencyStart: number, frequencyEnd: number, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequencyStart, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequencyEnd, audioCtx.currentTime + duration);

      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Automated Scanning Process
  const handleStartLaserScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    playLaserSound(220, 1880, 2.8);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          addToast(
            'SKANOWANIE UKOŃCZONE',
            `Zakończono interferometryczną analizę topocentryczną kompletu #${selectedToolsetId}. Wykryto i skatalogowano anomalie powłoki antyadhezyjnej.`,
            'success',
            selectedToolsetId
          );
          return 100;
        }
        return prev + 4;
      });
    }, 100);
  };

  // Add custom micro-defect
  const handleAddDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToolset) return;

    const newDefect = {
      id: 'DEF-' + Date.now().toString().slice(-4),
      x: defectX,
      y: defectY,
      z: defectZ,
      opis: defectOpis,
      stopien: defectStopien,
      data: new Date().toLocaleDateString('pl-PL'),
      powiekszenie: '500x SEM',
      kompletnyOpis: `Zarejestrowane przez spektrofotometr 3D. Laser λ = ${scanWavelength}nm. Chropowatość Ra lokalna: ${(defectZ * 8.5).toFixed(3)} µm.`
    };

    const currentDefects = selectedToolset.mikroskopDefekty || [];
    const updatedToolset: ToolSet = {
      ...selectedToolset,
      mikroskopDefekty: [...currentDefects, newDefect]
    };

    onUpdateToolSet(updatedToolset);
    addToast('ZAREJESTROWANO DEFEKT', 'Dodano mikroskopijny ubytek do metryki GMP.', 'info', selectedToolset.id);
  };

  // Remove defect
  const handleRemoveDefect = (defectId: string) => {
    if (!selectedToolset) return;
    const currentDefects = selectedToolset.mikroskopDefekty || [];
    const updatedToolset: ToolSet = {
      ...selectedToolset,
      mikroskopDefekty: currentDefects.filter(d => d.id !== defectId)
    };
    onUpdateToolSet(updatedToolset);
    addToast('DEFEKT USUNIĘTY', 'Usunięto defekt z bazy metrologicznej.', 'info', selectedToolset.id);
  };

  // Core Canvas 3D Plot loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localAngle = interactiveRotation;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw technical grid helper
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(13, 148, 136, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 20; i < width; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
      }

      // Projection values
      const radRot = (localAngle * Math.PI) / 180;
      const radPitch = (interactivePitch * Math.PI) / 180;

      // Define standard 3D cylinder shape points representing the Punch (stempel)
      const segmentsNum = 32;
      const rOuter = 75;
      const cylinderHeight = 110;

      // Plot mesh grid representing punch pressure face with wear simulation
      const draw3dPunchMesh = () => {
        // We draw the grid of the punch face
        const gridRows = 16;
        const gridCols = 16;

        for (let r = 0; r <= gridRows; r++) {
          ctx.beginPath();
          for (let c = 0; c <= gridCols; c++) {
            // Isometric mapping
            const u = (c / gridCols) - 0.5;
            const v = (r / gridRows) - 0.5;
            
            // Limit points within circular punch edge profile
            const distFromCenter = Math.sqrt(u * u + v * v);
            if (distFromCenter > 0.5) continue;

            // Wear depth simulated deformation based on laser sensitivity
            let zWave = Math.sin(u * 8 + radRot) * Math.cos(v * 8 + radPitch) * 4;
            // Inject defect bump if defects exist
            if (selectedToolset && selectedToolset.mikroskopDefekty) {
              selectedToolset.mikroskopDefekty.forEach((d) => {
                // convert coordinates
                const dx = (d.x - 50) / 100;
                const dy = (d.y - 50) / 100;
                const distanceToDefect = Math.sqrt((u - dx) * (u - dx) + (v - dy) * (v - dy));
                if (distanceToDefect < 0.16) {
                  const strength = d.stopien === 'Krytyczny' ? 24 : d.stopien === 'Umiarkowany' ? 14 : 7;
                  zWave -= (0.16 - distanceToDefect) * strength * (laserSensitivity / 45); // crack/pitting is vertical deformation
                }
              });
            }

            // Transform 3D to 2D screen coords
            const x3d = u * rOuter * 1.8;
            const y3d = zWave - 20; // top face elevation
            const z3d = v * rOuter * 1.8;

            // Isometric projection formula
            const rotX = x3d * Math.cos(radRot) - z3d * Math.sin(radRot);
            const rotZ = x3d * Math.sin(radRot) + z3d * Math.cos(radRot);

            const screenX = centerX + rotX;
            const screenY = centerY - 15 + (y3d * Math.cos(radPitch) - rotZ * Math.sin(radPitch));

            if (c === 0) ctx.moveTo(screenX, screenY);
            else ctx.lineTo(screenX, screenY);
          }
          // color according to laser wavelength
          ctx.strokeStyle = activeTabSub === 'heatmap' 
            ? 'rgba(239, 68, 68, 0.25)' 
            : isLight ? 'rgba(11, 69, 150, 0.14)' : 'rgba(6, 182, 212, 0.22)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw complementary cylinder lower body lines
        for (let s = 0; s < segmentsNum; s += 2) {
          const theta = (s / segmentsNum) * Math.PI * 2;
          const u = Math.cos(theta) * 0.5;
          const v = Math.sin(theta) * 0.5;

          const x3d = u * rOuter * 1.8;
          const z3d = v * rOuter * 1.8;

          const rotX = x3d * Math.cos(radRot) - z3d * Math.sin(radRot);
          const rotZ = x3d * Math.sin(radRot) + z3d * Math.cos(radRot);

          // Top rim screen position
          const screenXTop = centerX + rotX;
          const screenYTop = centerY - 32 + (- 20 * Math.cos(radPitch) - rotZ * Math.sin(radPitch));

          // Base rim screen position
          const screenYBase = screenYTop + cylinderHeight;

          ctx.beginPath();
          ctx.moveTo(screenXTop, screenYTop);
          ctx.lineTo(screenXTop, screenYBase);
          ctx.strokeStyle = activeTabSub === 'heatmap' 
            ? 'rgba(239, 68, 68, 0.12)' 
            : isLight ? 'rgba(11, 69, 150, 0.08)' : 'rgba(34, 211, 238, 0.12)';
          ctx.stroke();
        }

        // Interactive dynamic laser scan bar indicator
        if (isScanning) {
          const laserY = centerY - 55 + (scanProgress / 100) * 140;
          ctx.beginPath();
          ctx.moveTo(centerX - 95, laserY);
          ctx.lineTo(centerX + 95, laserY);
          ctx.strokeStyle = `hsl(${(scanWavelength - 400) * 0.8}, 90%, 55%)`;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = `hsl(${(scanWavelength - 400) * 0.8}, 90%, 55%)`;
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0; // reset shadow
        }
      };

      // Draw defects positions as fluorescent glowing coordinates with degree lines
      const drawMicroDefectsAnnotations = () => {
        if (!selectedToolset || !selectedToolset.mikroskopDefekty) return;

        selectedToolset.mikroskopDefekty.forEach((d) => {
          // coordinate conversion mapping
          const u = (d.x - 50) / 100;
          const v = (d.y - 50) / 100;

          const x3d = u * rOuter * 1.8;
          const y3d = -20 - (d.z * 18); // height deviation depth
          const z3d = v * rOuter * 1.8;

          const rotX = x3d * Math.cos(radRot) - z3d * Math.sin(radRot);
          const rotZ = x3d * Math.sin(radRot) + z3d * Math.cos(radRot);

          const screenX = centerX + rotX;
          const screenY = centerY - 15 + (y3d * Math.cos(radPitch) - rotZ * Math.sin(radPitch));

          // Draw pinpoint dot
          ctx.beginPath();
          ctx.arc(screenX, screenY, d.stopien === 'Krytyczny' ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = d.stopien === 'Krytyczny' 
            ? 'rgba(239, 68, 68, 0.85)' 
            : d.stopien === 'Umiarkowany' 
              ? 'rgba(245, 158, 11, 0.85)' 
              : 'rgba(59, 130, 246, 0.85)';
          ctx.fill();

          // Defect glowing ring
          ctx.beginPath();
          ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
          ctx.strokeStyle = d.stopien === 'Krytyczny' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Connective line to side tag text
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX + 35, screenY - 25);
          ctx.strokeStyle = isLight ? '#64748b' : 'rgba(148, 163, 184, 0.6)';
          ctx.stroke();

          // Small tag container
          ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
          ctx.fillRect(screenX + 35, screenY - 37, 85, 16);
          ctx.strokeStyle = d.stopien === 'Krytyczny' ? '#ef4444' : '#64748b';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX + 35, screenY - 37, 85, 16);

          ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
          ctx.font = '7px monospace';
          ctx.fillText(`ID:${d.id} Z:${d.z}mm`, screenX + 39, screenY - 26);
        });
      };

      draw3dPunchMesh();
      drawMicroDefectsAnnotations();

      // Slow dynamic spin simulation when idle/non-interacted
      if (!isScanning) {
        localAngle = (localAngle + 0.05) % 360;
      }
      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [selectedToolset, interactiveRotation, interactivePitch, laserSensitivity, scanWavelength, activeTabSub, isScanning, scanProgress, isLight]);

  // Calibration standards
  const computedRoughness = useMemo(() => {
    if (!selectedToolset) return 0.045;
    const count = selectedToolset.mikroskopDefekty?.length || 0;
    return 0.02 + count * 0.038;
  }, [selectedToolset]);

  return (
    <div className="space-y-6">
      {/* HEADER ROW */}
      <div className={`rounded-2xl p-6 relative overflow-hidden transition-all ${
        isLight ? 'bg-white border border-slate-200 shadow-sm' : 'bg-biofarm-dark text-white border border-white/5 bg-grid-pattern-dark'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl shrink-0 ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-cyan-500/10 text-cyan-400'}`}>
                <Activity className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ISO Class 5 - Spectroscopic Interferometry
                </span>
                <h1 className={`text-xl lg:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Spektrofotometria 3D & Profiler Krawędzi Stempli
                </h1>
              </div>
            </div>
            <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              System trójwymiarowego badania topologii gniazd i krawędzi formującej. Wykorzystaj laser interferancyjny λ = 400-800 nm do pomiaru mikro-pittingu powłok DLC / CrN oraz chropowatości stali.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedToolsetId}
              onChange={(e) => setSelectedToolsetId(e.target.value)}
              className={`p-2 rounded-lg text-xs font-mono border focus:outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-white/10 text-slate-200'
              }`}
            >
              {toolSets.map(t => (
                <option key={t.id} value={t.id}>
                  Komplet #{t.id} ({t.nazwaProduktu.substring(0, 16)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: INTERACTIVE VISUALIZER */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`rounded-xl p-5 relative overflow-hidden flex flex-col items-center ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            {/* Visualizer Header Controls */}
            <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-slate-700/10">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTabSub('3d')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider ${
                    activeTabSub === '3d' 
                      ? 'bg-biofarm-blue text-white' 
                      : isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  Siatka Topograficzna 3D
                </button>
                <button
                  onClick={() => setActiveTabSub('heatmap')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider ${
                    activeTabSub === 'heatmap' 
                      ? 'bg-rose-500 text-white shadow shadow-rose-500/20' 
                      : isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  Rozkład Zużycia (Pitting)
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-400">
                  KOD POWŁOKI: <strong className="text-cyan-400">HARD-DLC (Amorph-C)</strong>
                </span>
              </div>
            </div>

            {/* Core Interactive Canvas Area */}
            <div className={`relative flex items-center justify-center p-4 w-full rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950 border-white/5'
            }`}>
              <canvas 
                ref={canvasRef} 
                width={500} 
                height={320} 
                className="max-w-full h-auto cursor-grab active:cursor-grabbing"
              />

              {/* Angle orientation display badge */}
              <div className="absolute bottom-3 left-3 flex flex-col gap-1 text-[8px] font-mono text-slate-400 bg-black/40 backdrop-blur px-2.5 py-1.5 rounded border border-white/15">
                <div>ROTATION OIE: {interactiveRotation.toFixed(1)}°</div>
                <div>PITCH TILT: {interactivePitch.toFixed(1)}°</div>
                <div>SEM REZ: 0.18 µm / px</div>
              </div>

              {/* Status scanning alert overlay */}
              {isScanning && (
                <div className="absolute inset-0 bg-cyan-950/20 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-10 transition-all">
                  <Cpu className="w-10 h-10 text-cyan-400 animate-spin" />
                  <div className="text-xs font-mono tracking-widest text-[#22d3ee] font-extrabold uppercase">
                    ANALIZA LASEROWA GMP W TOKU... {scanProgress}%
                  </div>
                  <div className="w-48 bg-slate-950/70 h-1 rounded-full overflow-hidden border border-white/10">
                    <div className="bg-cyan-500 h-full transition-all duration-100" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Slider control boards */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-700/15">
              
              {/* LASER WAVELENGTH CONTROLLER */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>λ Lasera Interferencyjnego:</span>
                  <span className="font-extrabold text-cyan-400">{scanWavelength} nm</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="800"
                  step="0.5"
                  value={scanWavelength}
                  onChange={(e) => setScanWavelength(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span className="text-violet-500">400nm (UV)</span>
                  <span className="text-emerald-500">534nm (Zielony)</span>
                  <span className="text-rose-500">632.8nm (Hel-Neon)</span>
                  <span className="text-red-700">800nm (IR)</span>
                </div>
              </div>

              {/* ANGLE ORIENTATION SLIDERS */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Ręczny Kąt Obrotu Siatki:</span>
                  <span className="font-extrabold text-[#0b4596] dark:text-cyan-400">{interactiveRotation}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={interactiveRotation}
                  onChange={(e) => setInteractiveRotation(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Dynamiczne auto-obroty przy braku aktywności operatora</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DEFECT MANAGEMENT MATRIX & SPECTRA DATA */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* CRITICAL SPECTRO-METRICS READINGS */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Gauge className="w-4 h-4 text-biofarm-cyan" /> Odczyty Spektrometryczne
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg text-center ${isLight ? 'bg-slate-50' : 'bg-slate-950/50'}`}>
                <div className="text-[9px] font-mono text-slate-500 uppercase">Chropowatość Ra</div>
                <div className="font-extrabold text-lg text-emerald-500 font-mono">
                  {computedRoughness.toFixed(3)} µm
                </div>
                <div className="text-[7px] text-slate-400 uppercase font-bold mt-1">Norma GMP: &le; 0.12µm</div>
              </div>

              <div className={`p-3 rounded-lg text-center ${isLight ? 'bg-slate-50' : 'bg-slate-950/50'}`}>
                <div className="text-[9px] font-mono text-slate-500 uppercase">Ubytek DLC Matrix</div>
                <div className="font-extrabold text-lg text-amber-500 font-mono">
                  {selectedToolset ? (((selectedToolset.mikroskopDefekty?.length || 0) * 1.6 + 1.2)).toFixed(1) : 0}%
                </div>
                <div className="text-[7px] text-slate-400 uppercase font-bold mt-1">Powłoka Antyadhezyjna</div>
              </div>
            </div>

            {/* QUICK SCAN BUTTON */}
            <button
              onClick={handleStartLaserScan}
              disabled={isScanning || !selectedToolset}
              className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isScanning
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-gradient-to-r from-cyan-500 to-biofarm-blue hover:scale-[1.01] text-white shadow-md'
              }`}
            >
              <Zap className="w-4 h-4 shrink-0" />
              {isScanning ? 'POMIAR LASEROWY W TOKU...' : 'WYKONAJ INTERFEROMETRIĘ 3D'}
            </button>
          </div>

          {/* MICROSCOPIC INSPECTION LOG & CREATION */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Layers className="w-4 h-4 text-biofarm-cyan" /> Mikroskopowa Metryka Anomalii
            </h2>

            {/* List of micro defects */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {!selectedToolset || !selectedToolset.mikroskopDefekty || selectedToolset.mikroskopDefekty.length === 0 ? (
                <div className="text-center py-4 text-[10px] text-slate-500 font-mono">
                  Brak defektów. Wykonaj skan lub użyj poniższego formularza aby wskazać ubytek krawędzi.
                </div>
              ) : (
                selectedToolset.mikroskopDefekty.map((def) => (
                  <div key={def.id} className={`p-2.5 rounded border text-[10px] font-mono flex items-start justify-between gap-1 ${
                    def.stopien === 'Krytyczny' 
                      ? 'bg-red-500/10 border-red-500/20 text-red-900 dark:text-red-200' 
                      : def.stopien === 'Umiarkowany' 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200' 
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-900 dark:text-indigo-200'
                  }`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <span className={`px-1 rounded text-[8px] font-bold ${
                          def.stopien === 'Krytyczny' ? 'bg-red-500/20' : 'bg-slate-200 dark:bg-slate-800'
                        }`}>
                          {def.id}
                        </span>
                        <span>({def.stopien.toUpperCase()})</span>
                      </div>
                      <p className="font-sans font-medium text-slate-700 dark:text-slate-300">{def.opis}</p>
                      <div className="text-[8px] text-slate-500">
                        X:{def.x}% Y:{def.y}% | Głębokość: {def.z} mm
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDefect(def.id)}
                      className="p-1 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* FORM TO MANUALLY ADD NOTCH DEFECT */}
            <form onSubmit={handleAddDefect} className="pt-3 border-t border-slate-700/20 space-y-3">
              <span className={`text-[9px] font-mono uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Dodaj ubytek / Pitting (Symulacja Laserowa):
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[8px] font-mono text-slate-500">POZYCJA X (%)</span>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={defectX}
                    onChange={(e) => setDefectX(Number(e.target.value))}
                    className={`w-full p-1.5 rounded text-[10px] font-mono border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-mono text-slate-500">POZYCJA Y (%)</span>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={defectY}
                    onChange={(e) => setDefectY(Number(e.target.value))}
                    className={`w-full p-1.5 rounded text-[10px] font-mono border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[8px] font-mono text-slate-500">GŁĘBOKOŚĆ (mm)</span>
                  <input
                    type="number"
                    min="0.01"
                    max="0.99"
                    step="0.01"
                    value={defectZ}
                    onChange={(e) => setDefectZ(Number(e.target.value))}
                    className={`w-full p-1.5 rounded text-[10px] font-mono border focus:outline-none ${
                       isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-mono text-slate-500">STOPIEŃ ALERTU</span>
                  <select
                    value={defectStopien}
                    onChange={(e: any) => setDefectStopien(e.target.value)}
                    className={`w-full p-1.2 rounded text-[10px] font-mono border focus:outline-none ${
                       isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/10 text-white'
                    }`}
                  >
                    <option value="Słaby">Słaby</option>
                    <option value="Umiarkowany">Umiarkowany</option>
                    <option value="Krytyczny">Krytyczny</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-mono text-slate-500">MIEJSCOWY DETAL POZOSTAŁYCH USZKODZEŃ</span>
                <input
                  type="text"
                  value={defectOpis}
                  onChange={(e) => setDefectOpis(e.target.value)}
                  placeholder="e.g. Mikropęknięcie ścinające rdzenia"
                  className={`w-full p-1.5 rounded text-[10px] border focus:outline-none ${
                     isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/10 text-white'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={!selectedToolset}
                className="w-full py-2 rounded-lg bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 hover:scale-[1.01] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Dodaj Punkt Skanu SEM
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* FOOTER METROLOGY NOTE */}
      <div className={`rounded-xl p-5 ${
        isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
      }`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
          <ShieldAlert className="w-4 h-4 text-rose-500" /> Standard Klasyfikacyjny ISO-9001 & GMP
        </h3>
        <p className={`text-[10px] leading-relaxed font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Każdy zarejestrowany mikroubytek powłoki stempla o stopniu <strong className="text-red-500">Krytyczny</strong> automatycznie blokuje możliwość wydania kompletu z magazynu jako "Gotowy do produkcji".
          Wymagane jest skierowanie zestawu na mycie ultradźwiękowe, ponowne polerowanie (polishing) lub regenerację antyadhezyjną.
          Ścieżka audytowa i dane spektralne są trwale asygnowane do modułu Zapewnienia Jakości Biofarm.
        </p>
      </div>

    </div>
  );
};
