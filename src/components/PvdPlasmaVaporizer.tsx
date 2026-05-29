import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Wind, 
  Settings, 
  Gauge, 
  Activity, 
  RotateCw, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

interface PvdPlasmaVaporizerProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

export const PvdPlasmaVaporizer: React.FC<PvdPlasmaVaporizerProps> = ({
  theme,
  isLight,
  addToast
}) => {
  // Scientific parameters for vacuum plasma deposition
  const [magneticField, setMagneticField] = useState<number>(180); // magnetic field in mT (milliTesla)
  const [argonPressure, setArgonPressure] = useState<number>(0.24); // Argon gas pressure in Pascals (Pa)
  const [arcCurrent, setArcCurrent] = useState<number>(45); // Arc discharge current in Amperes (A)
  const [coatingTarget, setCoatingTarget] = useState<'DLC' | 'TiAlN' | 'CrN'>('DLC');
  
  // Simulation and running states
  const [isDepositing, setIsDepositing] = useState<boolean>(true);
  const [depositedThickness, setDepositedThickness] = useState<number>(12); // in nanometers (nm)
  const [chamberStatus, setChamberStatus] = useState<'vacuum' | 'purging' | 'plasma_glow'>('plasma_glow');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  
  // Microscopic sputtered ionized atom class representation
  interface PlasmaIon {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    energy: number; // velocity excitation rating
    alpha: number;
  }

  const ionsRef = useRef<PlasmaIon[]>([]);

  // Keep track of total elapsed time for background waves
  const timeRef = useRef<number>(0);

  // Growth process of nano-molecular layers depending on active currents
  useEffect(() => {
    let growthInterval: number | null = null;
    if (isDepositing && chamberStatus === 'plasma_glow') {
      growthInterval = window.setInterval(() => {
        setDepositedThickness((prev) => {
          // grow thickness based on current and pressure formulas
          const rateCoeff = (arcCurrent * 0.05) * (0.5 + Math.random() * 0.5);
          const limit = coatingTarget === 'DLC' ? 800 : 1200; // max thickness
          if (prev >= limit) return limit;
          return Number((prev + rateCoeff).toFixed(1));
        });
      }, 300) as unknown as number;
    }
    return () => {
      if (growthInterval) clearInterval(growthInterval);
    };
  }, [isDepositing, chamberStatus, arcCurrent, coatingTarget]);

  // Chamber purge trigger
  const handlePurgeChamber = () => {
    setChamberStatus('purging');
    setIsDepositing(false);
    setDepositedThickness(0);
    addToast(
      'KOMORA ROZPRĘŻONA / WYDMUCH',
      'Wprowadzono suchy azot do komory PVD celem usunięcia domieszek szlachetnych. Reaktor zresetowany.',
      'info'
    );
    
    setTimeout(() => {
      setChamberStatus('plasma_glow');
      setIsDepositing(true);
      addToast(
        'RE-INICJALIZACJA PROCESU',
        'Zassano próżnię ultra-wysoką (1.2 x 10^-5 Pa). Zapłon łuku plazmowego powiódł się.',
        'success'
      );
    }, 2800);
  };

  // Main Plasma physics canvas rendering loop (Aurora Plasma Glow Effect)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Buffer to hold initialized excitation ions initially
    if (ionsRef.current.length === 0) {
      for (let i = 0; i < 120; i++) {
        ionsRef.current.push({
          x: Math.random() * canvas.width,
          y: canvas.height - 40 - Math.random() * 80, // emanate from cathode bottom plate
          vx: (Math.random() - 0.5) * 4,
          vy: -1.5 - Math.random() * 5,
          size: 1 + Math.random() * 3,
          color: coatingTarget === 'DLC' ? '#06b6d4' : coatingTarget === 'TiAlN' ? '#f59e0b' : '#ec4899',
          energy: 0.2 + Math.random() * 0.8,
          alpha: 0.15 + Math.random() * 0.75
        });
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Update cosmic temporal flow
      timeRef.current += 0.04;
      const t = timeRef.current;

      // 1. Draw vacuum chamber circular glass viewport boundary and neon grid
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(34, 211, 238, 0.07)';
      ctx.lineWidth = 1;
      const ringCount = 5;
      for (let r = 50; r <= 220; r += 35) {
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw cross quadrants
      ctx.beginPath();
      ctx.moveTo(w / 2 - 240, h / 2); ctx.lineTo(w / 2 + 240, h / 2);
      ctx.moveTo(w / 2, h / 2 - 200); ctx.lineTo(w / 2, h / 2 + 200);
      ctx.stroke();

      // Mirror-polished stencil punch target holding fixture (Mount inside high-voltage anode at Top area)
      const topPlateY = 50;
      ctx.fillStyle = isLight ? '#e2e8f0' : '#111827';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 100, topPlateY, 200, 24, 6);
      ctx.fill(); ctx.stroke();
      
      // Stamp holder tag
      ctx.fillStyle = isLight ? '#0f172a' : '#22d3ee';
      ctx.font = '8px monospace';
      ctx.fillText('ANODE_PLATE (SUBSTRATE INDUCTION -350V)', w / 2 - 90, topPlateY + 14);

      // Cathode plate at bottom holding pure metal targeting material (target)
      const botPlateY = h - 60;
      ctx.fillStyle = isLight ? '#f1f5f9' : '#0a0f1d';
      ctx.strokeStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 110, botPlateY, 220, 20, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ec4899';
      ctx.fillText(`SPUTTERING CATHODE (${coatingTarget} CARRIER METAL)`, w / 2 - 100, botPlateY + 12);

      // 2. Draw Aurora Plasma Glow behind everything (Dynamic sinusoidal fluid clouds)
      if (chamberStatus === 'plasma_glow') {
        const glowIntensity = (arcCurrent / 100) * (1.2 - argonPressure * 0.4);
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        // Linear plasma aura wave representation
        const auraCount = 4;
        for (let i = 0; i < auraCount; i++) {
          const shift = i * Math.PI / 2;
          const auraGlow = ctx.createLinearGradient(0, topPlateY + 24, 0, botPlateY);
          
          // Aurora color map matching vacuum target
          const activeColor1 = coatingTarget === 'DLC' ? 'rgba(6, 182, 212,' : coatingTarget === 'TiAlN' ? 'rgba(245, 158, 11,' : 'rgba(236, 72, 153,';
          const activeColor2 = 'rgba(99, 102, 241,';

          auraGlow.addColorStop(0, `${activeColor1} ${0.1 * glowIntensity})`);
          auraGlow.addColorStop(0.35 + Math.sin(t + shift) * 0.15, `${activeColor2} ${0.45 * glowIntensity * (magneticField / 200)})`);
          auraGlow.addColorStop(0.7 + Math.cos(t * 0.8 + shift) * 0.1, `${activeColor1} ${0.3 * glowIntensity})`);
          auraGlow.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = auraGlow;
          ctx.beginPath();
          // Draw a curved wave shape matching excited plasma streams
          ctx.moveTo(w / 2 - 140, topPlateY + 24);
          for (let py = topPlateY + 24; py < botPlateY; py += 10) {
            const waveXOffset = Math.sin(py * 0.015 - t * 2 + shift) * (12 + (magneticField * 0.08));
            ctx.lineTo(w / 2 - 120 + waveXOffset, py);
          }
          ctx.lineTo(w / 2 + 120, botPlateY);
          for (let py = botPlateY; py > topPlateY + 24; py -= 10) {
            const waveXOffset = Math.sin(py * 0.015 - t * 2 + shift) * (12 + (magneticField * 0.08));
            ctx.lineTo(w / 2 + 120 + waveXOffset, py);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 3. Update and render energized micro-ion particles
      if (chamberStatus === 'plasma_glow' && isDepositing) {
        
        // Spawn rate proportional to gas pressure & impact currents
        const spawnProbability = argonPressure * 3.5;
        if (Math.random() < spawnProbability) {
          ionsRef.current.push({
            x: w / 2 - 90 + Math.random() * 180,
            y: botPlateY - 4, // arise from cathode
            vx: (Math.random() - 0.5) * (magneticField * 0.02 + 1), // magnetic field focuses vectors laterally
            vy: -2.2 - (arcCurrent * 0.1) - (Math.random() * 5), // faster at higher arc current
            size: 1 + Math.random() * 3,
            color: coatingTarget === 'DLC' ? '#06b6d4' : coatingTarget === 'TiAlN' ? '#f59e0b' : '#ec4899',
            energy: 0.5 + Math.random() * 0.5,
            alpha: 0.5 + Math.random() * 0.5
          });
        }
      }

      // Particle physics & wrapping boundaries
      ionsRef.current = ionsRef.current.filter((ion) => {
        // move ion up towards the negative bias anode plate
        ion.y += ion.vy;
        ion.x += ion.vx;

        // apply magnetic vector focusing curve (lorentz drift force on positive ions)
        const centralForce = (w / 2 - ion.x) * (magneticField * 0.00018);
        ion.vx += centralForce;

        // Render energized neon circle represent
        ctx.beginPath();
        ctx.arc(ion.x, ion.y, ion.size, 0, Math.PI * 2);
        
        ctx.fillStyle = ion.color;
        ctx.globalAlpha = ion.alpha;
        ctx.shadowColor = ion.color;
        ctx.shadowBlur = ion.energy * 10;
        ctx.fill();
        
        ctx.shadowBlur = 0; // reset
        ctx.globalAlpha = 1.0;

        // Boundary constraint: check if ion successfully landed/condensed on the punch anode mould holder (Top)
        const hitStem = ion.y <= topPlateY + 24 && Math.abs(ion.x - w / 2) < 100;
        if (hitStem) {
          // ionized carbon condenses forming beautiful coating layer structure!
          return false;
        }

        // expire if out of chamber boundaries
        return ion.y > 0 && ion.y < h && ion.x > 0 && ion.x < w;
      });

      // Purging notification state render
      if (chamberStatus === 'purging') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WARNING: COMMENCING PVD VACUUM CHAMBER RE-PURGE SEQUENCE', w / 2, h / 2 - 10);
        ctx.font = '8px monospace';
        ctx.fillText('EVACUATING PRE-CHARGED RADICALS AND RESETTING MAGNETIC GRID...', w / 2, h / 2 + 12);
        ctx.textAlign = 'left'; // reset
      }

      // Interactive blueprint dynamic tag coordinates
      ctx.fillStyle = isLight ? '#0f172a' : '#22d3ee';
      ctx.font = '8px monospace';
      ctx.fillText(`MAGNETIC INDUCTION grid: ${magneticField} mT`, 20, 24);
      ctx.fillText(`VACUUM INTENSITY (P): ${argonPressure.toFixed(3)} Pa`, 20, 36);
      ctx.fillText(`IONIZED ATOM COLLISION REACTION RATE: ${(ionsRef.current.length)} A/cm²`, 20, 48);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [magneticField, argonPressure, arcCurrent, coatingTarget, chamberStatus, isDepositing, isLight]);

  // Calculations for structural durability of the synthesized layer
  const layerHardnessGpa = useMemo(() => {
    // Formula for coating hardness based on magnetic plasma excitation strength
    const factor = coatingTarget === 'DLC' ? 80 : coatingTarget === 'TiAlN' ? 32 : 24;
    return (factor + (magneticField * 0.12) + (arcCurrent * 0.15) - (argonPressure * 10)).toFixed(1);
  }, [magneticField, arcCurrent, argonPressure, coatingTarget]);

  const microStressMpa = useMemo(() => {
    // residual internal atomic stress in mechanical layers
    return Math.floor(1500 + (magneticField * 3) - (arcCurrent * 4));
  }, [magneticField, arcCurrent]);

  return (
    <div className="space-y-6">
      
      {/* GLOWING HEADER PANEL */}
      <div className={`rounded-2xl p-6 relative overflow-hidden transition-all ${
        isLight ? 'bg-white border border-slate-200 shadow-sm' : 'bg-biofarm-dark text-white border border-white/5 bg-grid-pattern-dark'
      }`}>
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1.5 border-l-2 border-cyan-400 pl-4">
            <span className={`text-[9px] font-mono uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-cyan-400 font-extrabold'}`}>
              NANO-COMPOSITE PLASMA TARGET EXCITATION SYSTEM
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight uppercase">
              PVD Plasma Vaporizer Hologram (Napylanie Próżniowe)
            </h1>
            <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Zasymuluj próżniowe napylanie twardych powłok z tarczy magnetycznej z dynamicznym rozświetleniem 
              <strong className="text-cyan-400"> Aurora Plasma Glow</strong>. Reżyseruj energię jonów argonu wpływających na twardość warstwy.
            </p>
          </div>
        </div>
      </div>

      {/* CORE EXPERIMENTATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COMPREHENSIVE INTERACTIVE PLASMA VIEWPORT */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`rounded-xl p-5 relative overflow-hidden flex flex-col items-center ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            
            {/* Viewport Header tools list */}
            <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-700/10">
              <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" /> Reaktor Plazmowy Próżniowy (PVD Sputterer)
              </h3>

              <div className="flex items-center gap-1.5">
                {(['DLC', 'TiAlN', 'CrN'] as const).map((tgt) => (
                  <button
                    key={tgt}
                    onClick={() => {
                      setCoatingTarget(tgt);
                      setDepositedThickness(0);
                      addToast(
                        'ZMIANA MATRYCY CELU',
                        `Załadowano cele stopu metalicznego ${tgt}. Szybkość rozpalania i struktura zmienione.`,
                        'info'
                      );
                    }}
                    className={`px-3 py-1 text-[9px] font-mono font-bold rounded ${
                      coatingTarget === tgt 
                        ? 'bg-cyan-500 text-slate-950 font-black' 
                        : isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    TARGET {tgt}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Sputtering Canvas */}
            <div className={`w-full p-4 flex items-center justify-center rounded-xl border relative overflow-hidden ${
              isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950 border-white/5'
            }`}>
              <canvas
                ref={canvasRef}
                width={550}
                height={320}
                className="max-w-full h-auto drop-shadow-lg"
              />

              {/* Hologram coordinates readouts overlay list */}
              <div className="absolute top-4 right-4 text-right flex flex-col gap-0.5 text-[8.5px] font-mono text-cyan-400 bg-slate-900/60 p-2 border border-white/10 rounded">
                <div>CHAMBER_STAGE: {chamberStatus.toUpperCase()}</div>
                <div>NANO_THICKNESS: {depositedThickness} nm</div>
                <div>GROWTH_RATE: {((arcCurrent * 0.05) * 3.3).toFixed(1)} nm / min</div>
                <div>ESTIMATED_HARDNESS: {layerHardnessGpa} GPa</div>
              </div>
            </div>

            {/* PROCESS CONTROL ADJUSTMENT SLIDERS */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 pt-4 border-t border-slate-700/15">
              
              {/* MAGNETIC INDUCTION GRID SLIDER */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Siła Tarcz Magnetycznych:</span>
                  <span className="font-extrabold text-cyan-400">{magneticField} mT</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="350"
                  value={magneticField}
                  onChange={(e) => setMagneticField(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 cursor-col-resize rounded bg-slate-900/40"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Słaba Spójność</span>
                  <span className="text-cyan-400">High Density limit</span>
                </div>
              </div>

              {/* ARC DISCHARGE CURRENT (A) */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Natężenie Łuku (Prąd):</span>
                  <span className="font-extrabold text-[#0b4596] dark:text-cyan-400">{arcCurrent} A</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="120"
                  value={arcCurrent}
                  onChange={(e) => setArcCurrent(Number(e.target.value))}
                  className="w-full accent-indigo-505 h-1.5 cursor-col-resize rounded bg-slate-900/40"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Brak wyładowania</span>
                  <span className="text-red-500">Przegrzanie katody</span>
                </div>
              </div>

              {/* ARGON PRESSURE Pa */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Ciśnienie Gazu Argon:</span>
                  <span className="font-extrabold text-[#0b4596] dark:text-cyan-400">{argonPressure.toFixed(3)} Pa</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.85"
                  step="0.01"
                  value={argonPressure}
                  onChange={(e) => setArgonPressure(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 cursor-col-resize rounded bg-slate-900/40"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Próżnia ultra-wysoka</span>
                  <span className="text-red-400">Ryzyko gaszenia</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TECHNICAL COEFFICIENT LOGS */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* TECHNICAL CHARACTERISTICS FILE METER */}
          <div className={`rounded-xl p-5 space-y-4 border ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-white/5'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Wind className="w-4 h-4 text-emerald-400" /> Charakterystyka powłoki PVD
            </h3>

            <div className="space-y-3.5 text-[10px] font-mono leading-relaxed">
              <div className="p-3 bg-cyan-900/20 text-[#22d3ee] font-black rounded text-center text-xs">
                AKTUALNA GRUBOŚĆ: {depositedThickness} nm
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-700/10">
                <span className="text-slate-500">Twardość nanokompozytu:</span>
                <span className="font-black text-xs text-emerald-500">{layerHardnessGpa} GPa</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-700/10">
                <span className="text-slate-500">Naprężenia własne (residual):</span>
                <span className="font-extrabold text-xs">{microStressMpa} MPa</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500">Rezystancja mechaniczna:</span>
                <span className="font-extrabold text-xs">WYBITNA (&ge;3.6Gpa)</span>
              </div>
            </div>

            {/* ACTION DIRECT PROCESS PURGE TRIGGER */}
            <button
              onClick={handlePurgeChamber}
              className="w-full py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-widest border transition-colors cursor-pointer bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
            >
              WYKONAJ DEKOMPRESJĘ / ZEROWANIE REAKTORA
            </button>
          </div>

          {/* CRITICAL SOLID COMPOSITIONS LAB NOTE */}
          <div className={`rounded-xl p-5 space-y-3 border ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-white/5'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Weryfikacja Jakościowa DLC i TiAlN
            </h3>
            <p className={`text-[10px] leading-relaxed font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Wyższa siła pól magnetycznych (mT) ułatwia kolimacyjne ukierunkowanie trajektorii spadku jonów argonu na tarcze. Przeciwdziała 
              to ucieczce atomów węgla i zabezpiecza jednolity współczynnik tarcia (CoF &approx; 0.1). 
              Optimum do prasowania leków w Biofarm to powłoka o grubości 800-1200nm.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
