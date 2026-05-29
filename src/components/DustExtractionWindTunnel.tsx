import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, 
  Settings, 
  TrendingUp, 
  Activity, 
  HelpCircle, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface DustExtractionWindTunnelProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

export const DustExtractionWindTunnel: React.FC<DustExtractionWindTunnelProps> = ({
  theme,
  isLight,
  addToast
}) => {
  // Input parameters
  const [airVelocity, setAirVelocity] = useState<number>(34); // m/s (airflow speed)
  const [vacuumPressure, setVacuumPressure] = useState<number>(2400); // Pa (static suction)
  const [dustLoad, setDustLoad] = useState<number>(45); // mg/m3
  const [separationType, setSeparationType] = useState<'standard_shroud' | 'cyclone_vortex' | 'dual_stage_hepa'>('cyclone_vortex');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [efficiency, setEfficiency] = useState<number>(99.85);
  const [turbulenceIndex, setTurbulenceIndex] = useState<number>(12);
  const [isSystemActive, setIsSystemActive] = useState<boolean>(true);

  // Math models on parameters change
  useEffect(() => {
    // Dynamic efficiency calculation (dust collection vs speed and pressure)
    // Sweet spot is centered. Too high speed causes turbulence bypassing, too low speed fails to lift dust particles.
    const optimalSpeed = separationType === 'cyclone_vortex' ? 42 : separationType === 'dual_stage_hepa' ? 28 : 50;
    const speedDeviation = Math.abs(airVelocity - optimalSpeed);
    
    let baseEff = 99.9;
    if (separationType === 'standard_shroud') baseEff = 92.5;
    else if (separationType === 'cyclone_vortex') baseEff = 98.8;
    else baseEff = 99.96;

    const penalty = (speedDeviation * 0.12) + (Math.max(0, 1800 - vacuumPressure) * 0.0015);
    const calculatedEff = Math.max(74.5, baseEff - penalty);
    setEfficiency(parseFloat(calculatedEff.toFixed(2)));

    // Turbulence level increases with speed squared
    const turb = Math.min(100, Math.floor((airVelocity * airVelocity * 0.015) + (dustLoad * 0.15)));
    setTurbulenceIndex(turb);

    if (calculatedEff < 88.0) {
      addToast(
        'Spadek wydajności odpylania!',
        `Wydajność filtru spadła do ${calculatedEff.toFixed(2)}%. Ryzyko zanieczyszczenia krzyżowego w komorze tabletkarki.`,
        'warning'
      );
    }
  }, [airVelocity, vacuumPressure, dustLoad, separationType]);

  // Particle Engine & Streamline Vector math
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

    // Dust particles array
    interface DustParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      color: string;
      life: number;
    }

    const particles: DustParticle[] = [];
    const maxParticles = 120;

    const render = () => {
      if (isSystemActive) {
        time += 0.04;
      }
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Cyber Blueprint canvas grid
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#0d1527';
      ctx.lineWidth = 1;
      const gridSize = 14;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Drawing the glass cyclone deduster outer boundaries
      const nozzleX = w * 0.7;
      const nozzleY = 35;
      const nozzleRadius = 24;

      // Draw spiral tablet slide (deduster column)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h - 30);
      ctx.bezierCurveTo(w * 0.4, h - 50, w * 0.5, h - 120, w * 0.3, h - 180);
      ctx.bezierCurveTo(w * 0.15, h - 220, w * 0.4, h - 260, w * 0.6, h - 220);
      ctx.stroke();

      // Tablet silhouettes rolling down the spiraling wireframe
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      const tabletPositions = [
        { x: w * 0.22, y: h - 35 },
        { x: w * 0.38, y: h - 85 },
        { x: w * 0.36, y: h - 155 },
        { x: w * 0.24, y: h - 200 },
        { x: w * 0.52, y: h - 230 }
      ];

      tabletPositions.forEach((tab, index) => {
        ctx.save();
        ctx.translate(tab.x, tab.y);
        ctx.rotate(time * 0.15 * (index + 1));
        // Isometric tablet look
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Air flow streamlines (glowing vectors rushing towards the suction mouth)
      ctx.lineWidth = 1.0;
      const streamLinesCount = 8;
      for (let i = 0; i < streamLinesCount; i++) {
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.15 + (i % 3) * 0.05})`;
        ctx.beginPath();
        
        const startX = w * 0.1;
        const startY = h * 0.1 + (i * (h * 0.8) / streamLinesCount);
        ctx.moveTo(startX, startY);

        // Curving vector fields towards suction orifice
        const controlX1 = w * 0.45;
        const controlY1 = startY + Math.sin(time + i) * 12;
        const controlX2 = nozzleX - 30;
        const controlY2 = nozzleY + 50;

        ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, nozzleX, nozzleY);
        ctx.stroke();
      }

      // Draw active metallic vacuum extraction collector (Nozzle)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Trumpet shaped mouth
      ctx.moveTo(nozzleX - nozzleRadius - 10, 0);
      ctx.lineTo(nozzleX - nozzleRadius, nozzleY);
      ctx.quadraticCurveTo(nozzleX, nozzleY + 8, nozzleX + nozzleRadius, nozzleY);
      ctx.lineTo(nozzleX + nozzleRadius + 10, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Cyclonic spin airflow animation inside suction pipe if cyclone_vortex selected
      if (separationType === 'cyclone_vortex') {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const spinRadius = 15;
        for (let sy = 5; sy < nozzleY; sy += 3) {
          const sx = nozzleX + Math.sin(time * 3 + sy * 0.5) * spinRadius;
          if (sy === 5) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // 4. Update and draw dust microparticles escaping striptablets
      const activeSpawnRate = (dustLoad / 100) * (isSystemActive ? 0.8 : 0);
      if (particles.length < maxParticles && Math.random() < activeSpawnRate) {
        // Spawn particles either on tablets or floating from left
        const sourceTab = tabletPositions[Math.floor(Math.random() * tabletPositions.length)];
        particles.push({
          x: sourceTab.x + (Math.random() - 0.5) * 12,
          y: sourceTab.y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 0.8 + Math.random() * 1.8,
          alpha: 1.0,
          color: separationType === 'dual_stage_hepa' ? '#a78bfa' : '#22d3ee', // violet for hepa micronized dust
          life: 1.0
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Computational vacuum pull vector calculation
        // Force vector pointing straight to nozzle (nozzleX, nozzleY)
        const dx = nozzleX - p.x;
        const dy = (nozzleY + 5) - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Gravitational and air velocity modifiers
        const pullPower = (airVelocity * 0.015) / (0.01 + distance * 0.002);
        const vxPull = (dx / (distance || 1)) * pullPower;
        const vyPull = (dy / (distance || 1)) * pullPower;

        // Turbulence noise
        const noiseX = Math.sin(time * 1.5 + p.y * 0.1) * (turbulenceIndex * 0.012);
        const noiseY = Math.cos(time * 1.5 + p.x * 0.1) * (turbulenceIndex * 0.012);

        p.vx += (vxPull - p.vx) * 0.1 + noiseX * 0.1;
        p.vy += (vyPull - p.vy) * 0.1 + noiseY * 0.1;

        p.x += p.vx;
        p.y += p.vy;

        // Diminish opacity when reaching close to suction center
        if (distance < 20) {
          p.alpha -= 0.08;
        }

        // Render particle with glow
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Remove dead particles
        if (p.alpha <= 0.05 || p.y < -10 || p.x > w + 10) {
          particles.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1.0; // Reset alpha

      // HUD indicators directly in viewport
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '7.5px monospace';
      ctx.fillText(`AIR VELOCITY VECTOR: ${airVelocity} M/S`, w - 160, h - 30);
      ctx.fillText(`STATIC VACUUM HEAD: ${vacuumPressure} PA`, w - 160, h - 20);

      animFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrame);
  }, [isSystemActive, airVelocity, vacuumPressure, dustLoad, separationType, turbulenceIndex]);

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-cyan-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> PROPOZYCJA I: HIGH-SPEED DUST EXTRACTION WIND-TUNNEL
          </span>
          <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white">
            Holograficzny Tunel Powietrzny i Aerodynamika Odpylacza
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Inżynieryjna symulacja przepływu laminarnego i aerometrii cząstek stałych w układzie odpylania grawitacyjnego Biofarm. Zoptymalizuj prędkość uderzenia strugi i odsys podciśnieniowy.
          </p>
        </div>

        {/* Separator filter presets */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
          {[
            { id: 'standard_shroud', label: 'Dysza Shroud' },
            { id: 'cyclone_vortex', label: 'Cyklon Wirowy 3D' },
            { id: 'dual_stage_hepa', label: 'Dwustopniowy HEPA' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSeparationType(type.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all outline-none ${
                separationType === type.id 
                  ? 'bg-cyan-500 text-slate-950 shadow' 
                  : 'text-slate-550 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Flow Controls (40%) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-3xs space-y-5">
            <span className="text-xs font-bold font-mono text-[#0b4596] dark:text-cyan-400 uppercase block border-b border-slate-100 dark:border-white/5 pb-2.5 flex items-center gap-1.5">
              <Settings className="w-4 h-4" /> Parametry Przepływowca
            </span>

            <div className="space-y-4">
              {/* Slider 1: Air velocity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    Szybkość powietrza strugi badawczej:
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-cyan-400">{airVelocity} m/s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  value={airVelocity}
                  onChange={(e) => setAirVelocity(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Słaby cug (5 m/s)</span>
                  <span>Huraganowy odciąg (80 m/s)</span>
                </div>
              </div>

              {/* Slider 2: Vacuum static pressure */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    Podciśnienie statyczne filtra głównego:
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-cyan-400">{vacuumPressure} Pa</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="4500"
                  step="100"
                  value={vacuumPressure}
                  onChange={(e) => setVacuumPressure(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Niskie ssanie (500 Pa)</span>
                  <span>Kompresor turbinowy (4500 Pa)</span>
                </div>
              </div>

              {/* Slider 3: Dust Load */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    Zapylenie luźne tabletek (Dust Load):
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-cyan-400">{dustLoad} mg/m³</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={dustLoad}
                  onChange={(e) => setDustLoad(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Praca bezpyłowa</span>
                  <span>Ekstremalna kruszliwość</span>
                </div>
              </div>
            </div>
          </div>

          {/* Efficiency diagnostics */}
          <div className="bg-[#0b1329] text-white p-5 rounded-2xl border border-white/5 space-y-4">
            <span className="text-[10px] font-mono text-cyan-400 block font-bold uppercase tracking-wider">
              Analityka czystości strefy odpylania GMP:
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">SPRAWNOŚĆ FILTRACJI:</span>
                <span className={`text-xl font-mono font-black ${
                  efficiency > 95.0 ? 'text-emerald-400' : 'text-rose-500'
                }`}>{efficiency}%</span>
                <p className="text-[9px] text-slate-500 mt-1">SOP norma: &gt;98.5%</p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">TURBULENCJA WYLOTOWA:</span>
                <span className={`text-xl font-mono font-black ${
                  turbulenceIndex > 45 ? 'text-amber-500 font-bold' : 'text-cyan-350 font-bold'
                }`}>{turbulenceIndex}%</span>
                <p className="text-[9px] text-slate-500 mt-1">Laminarny sweetspot &lt;30%</p>
              </div>
            </div>

            {efficiency >= 98.5 ? (
              <div className="bg-emerald-500/15 border border-emerald-500/35 p-3.5 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10px] font-mono text-slate-300 leading-relaxed">
                  ✓ PRZEPŁYW POWIETRZA OPTYMALNY. Cząstki stałe leku są w pełni pochłaniane i separowane przez bęben wirnika cyklonowego, eliminując zrywanie strugi.
                </p>
              </div>
            ) : (
              <div className="bg-rose-500/15 border border-rose-500/35 p-3.5 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-450 shrink-0 mt-0.5" />
                <p className="text-[10px] font-mono text-slate-300 leading-relaxed">
                  ⚠️ DRYF TURBULENCJI! Szybkość strużna zrywa podciśnienie. Dochodzi do odkładania pyłu na formacie tabletkarki. Skoryguj RPM sprężarki.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Vector View (60%) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-[#05070d] border border-slate-805 rounded-2xl p-4 h-[320px] flex flex-col justify-between overflow-hidden relative">
            <span className="text-[10px] font-mono text-cyan-400 block border-b border-white/5 pb-1">
              WIND-TUNNEL RENDERER: Wizualizacja wektorowa odsysania laminarno-turbulentnego
            </span>

            <div className="flex-1 my-3 rounded-xl overflow-hidden relative">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>Sonda pneumatyczna Biofarm</span>
              <div className="flex items-center gap-1.5">
                <span>Status czujnika:</span>
                <button 
                  onClick={() => setIsSystemActive(!isSystemActive)}
                  className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold text-slate-950 font-sans cursor-pointer ${
                    isSystemActive ? 'bg-cyan-500' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isSystemActive ? '● AKTYWNY' : '● ZATRZYMANY'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0b1329] p-4 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-500 font-mono flex items-center gap-3">
            <Activity className="w-4 h-4 text-cyan-500 animate-pulse shrink-0" />
            <span>
              <strong>Zalecenie technologiczne:</strong> Prowadź odpylanie cyklonowe ze stałym podciśnieniem 2200-2600 Pa. Zbyt wysokie ciśnienie powoduje przedwczesne wycieranie mechaniczne rantów grawerunkowych stempli.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
