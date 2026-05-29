import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Activity, 
  Flame, 
  Sparkles, 
  ChevronRight, 
  Maximize2, 
  Info, 
  ShieldAlert, 
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface FluidWearColliderProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

export const FluidWearCollider: React.FC<FluidWearColliderProps> = ({
  theme,
  isLight,
  addToast
}) => {
  const [shearForce, setShearForce] = useState<number>(68); // Overload percentage
  const [bondStrength, setBondStrength] = useState<number>(45); // PVD Matrix attachment GPa
  const [particleLifespan, setParticleLifespan] = useState<number>(80); 
  const [coatingType, setCoatingType] = useState<'DLC' | 'CrN' | 'TiAlN'>('DLC');
  const [isColliding, setIsColliding] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Particle interface representing atom chips peeling away under high shear friction
  interface Microchip {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
    angle: number;
    spin: number;
  }

  const chipsRef = useRef<Microchip[]>([]);

  // Simulation effect loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw technical futuristic background grid
      ctx.strokeStyle = isLight ? 'rgba(11, 69, 150, 0.04)' : 'rgba(236, 72, 153, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 20;
      for (let i = 0; i < w; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      }
      for (let j = 0; j < h; j += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
      }

      // Draw active stress contact zone / sliding piston block (Stempel i matryca)
      const contactY = h / 2 + 10;
      
      // Upper sliding boundary (The mechanical punch steel)
      ctx.fillStyle = isLight ? '#f1f5f9' : '#090d16';
      ctx.strokeStyle = isLight ? '#94a3b8' : 'rgba(34, 211, 238, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(40, contactY - 80, w - 80, 80);
      ctx.fill(); ctx.stroke();

      // Lower base (The pharmaceutical compression die)
      ctx.fillStyle = isLight ? '#e2e8f0' : '#05070a';
      ctx.beginPath();
      ctx.rect(40, contactY, w - 80, 80);
      ctx.fill(); ctx.stroke();

      // Draw the thin nano-coating molecular line (glowing DLC structure layers)
      const dlcGradient = ctx.createLinearGradient(40, contactY, w - 40, contactY);
      dlcGradient.addColorStop(0, '#22d3ee');
      dlcGradient.addColorStop(0.5, '#ec4899');
      dlcGradient.addColorStop(1, '#a855f7');
      
      ctx.strokeStyle = dlcGradient;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(40, contactY);
      ctx.lineTo(w - 40, contactY);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset glow

      // Dynamic chip spawning depending on force versus bond strength
      const wearTriggerRate = shearForce / bondStrength; // Ratio
      if (isColliding && Math.random() * 10 < wearTriggerRate) {
        // Spawn flakes at the sliding friction line
        const spawnX = 60 + Math.random() * (w - 120);
        const energyColor = coatingType === 'DLC' ? '#22d3ee' : coatingType === 'CrN' ? '#3b82f6' : '#f59e0b';
        
        chipsRef.current.push({
          x: spawnX,
          y: contactY,
          vx: (Math.random() - 0.5) * (shearForce * 0.12),
          vy: -(Math.random() * (shearForce * 0.08) + 1),
          size: 1.5 + Math.random() * 4,
          color: Math.random() > 0.6 ? '#f43f5e' : energyColor, // red representing hot localized spots
          life: particleLifespan,
          maxLife: particleLifespan,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.2
        });
      }

      // Update and draw floating peeling microchips
      chipsRef.current = chipsRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.032; // subtle downward gravity on separated physical flakes
        p.life -= 1;
        p.angle += p.spin;

        const ratio = p.life / p.maxLife;

        // Render flake with rotate translation
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = ratio;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        return p.life > 0 && p.x > 0 && p.x < w;
      });
      ctx.globalAlpha = 1.0;

      // Draw sliding shear vector arrow indicating dynamic shear load direction
      const pulseArrowX = w / 2 + Math.sin(Date.now() * 0.005) * 60;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pulseArrowX - 35, contactY - 40);
      ctx.lineTo(pulseArrowX + 35, contactY - 40);
      ctx.moveTo(pulseArrowX + 35, contactY - 40);
      ctx.lineTo(pulseArrowX + 22, contactY - 48);
      ctx.moveTo(pulseArrowX + 35, contactY - 40);
      ctx.lineTo(pulseArrowX + 22, contactY - 32);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = '8px monospace';
      ctx.fillText(`SHEAR FRICTION FORCE VECTOR: ${shearForce * 1.5} GPa`, pulseArrowX - 70, contactY - 52);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [shearForce, bondStrength, particleLifespan, coatingType, isColliding, isLight]);

  const predictedPeelTimeHours = React.useMemo(() => {
    // Formula calculating bonding durability under sliding shear pressure
    const rawVal = bondStrength * 333 / (shearForce + 1);
    return Math.max(12, Math.floor(rawVal));
  }, [shearForce, bondStrength]);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className={`rounded-2xl p-6 relative overflow-hidden transition-all ${
        isLight ? 'bg-white border border-slate-200' : 'bg-biofarm-dark text-white border border-white/5 bg-grid-pattern-dark'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl shrink-0 ${isLight ? 'bg-slate-100' : 'bg-cyan-500/10 text-cyan-400'}`}>
                <Activity className="w-5 h-5 text-rose-400" />
              </span>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  AWARD-WINNING INTERACTIVE GRAPHICS
                </span>
                <h1 className={`text-xl lg:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Fluid Dynamic Wear Collider (Rozpad Powłoki)
                </h1>
              </div>
            </div>
            <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Modelowanie fizyczne oddziaływań ścinających na granicy faz stal-powłoka antyadhezyjna.
              Zasymuluj odrywanie się mikro-płatków DLC w skrajnych temperaturach i przeciążeniach mechanicznych.
            </p>
          </div>
        </div>
      </div>

      {/* CORE COLLIDER GRAPHICS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* INTERACTIVE COMPACTION FRICTION BOX */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`rounded-xl p-5 relative overflow-hidden flex flex-col items-center ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-slate-700/10">
              <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                <Flame className="w-4 h-4 text-rose-500 animate-pulse" /> Kinetyczna Strefa Ścinania (Shear Layer Collision)
              </h3>
              
              <div className="flex gap-1.5">
                {['DLC', 'CrN', 'TiAlN'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setCoatingType(type as any);
                      if (type === 'DLC') setBondStrength(65);
                      else if (type === 'CrN') setBondStrength(42);
                      else setBondStrength(54);
                    }}
                    className={`px-2.5 py-1 text-[9px] font-mono font-bold rounded ${
                      coatingType === type 
                        ? 'bg-biofarm-blue text-white' 
                        : isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {type} MATRIX
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated interactive fluid viewport */}
            <div className={`w-full p-4 flex items-center justify-center rounded-xl border relative overflow-hidden ${
              isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950 border-white/5'
            }`}>
              <canvas
                ref={canvasRef}
                width={550}
                height={280}
                className="max-w-full h-auto"
              />

              {/* Hologram details */}
              <div className="absolute bottom-4 left-4 flex flex-col gap-0.5 text-[8px] font-mono text-cyan-400 bg-slate-900/60 p-2.5 rounded border border-white/10">
                <div>FRICTION_STATE: {shearForce > bondStrength ? 'CRITICAL_FLAKE_SPALLING' : 'STABLE_BOUNDARY'}</div>
                <div>BOND_ENERGY: {bondStrength * 1.5} N/mm²</div>
                <div>PEEL_PROB: {((shearForce/bondStrength)*10).toFixed(1)}% / s</div>
              </div>
            </div>

            {/* CONTROLS AREA */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 pt-4 border-t border-slate-700/15">
              
              {/* SHEAR FRICTION FORCE Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Siła Tarcia Ścinającego:</span>
                  <span className="font-extrabold text-cyan-400">{shearForce} %</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={shearForce}
                  onChange={(e) => setShearForce(Number(e.target.value))}
                  className="w-full h-1.5 cursor-col-resize accent-cyan-400"
                />
              </div>

              {/* COATING ATTACHMENT BOND STRENGTH */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Wytrzymałość Powłoki (Adhezja):</span>
                  <span className="font-extrabold text-[#0b4596] dark:text-cyan-400">{bondStrength} GPa</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={bondStrength}
                  onChange={(e) => setBondStrength(Number(e.target.value))}
                  className="w-full h-1.5 cursor-col-resize accent-indigo-500"
                />
              </div>

              {/* CHIP LIFESPAN */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Czas Życia Cząsteczek Flaków:</span>
                  <span className="font-extrabold text-[#0b4596] dark:text-cyan-400">{particleLifespan} frames</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="180"
                  value={particleLifespan}
                  onChange={(e) => setParticleLifespan(Number(e.target.value))}
                  className="w-full h-1.5 cursor-col-resize accent-emerald-500"
                />
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREDICTED WEAR TIMES AND SCIENTIFIC GMP CRITIQUE */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* DURABILITY TELEMETRY METRICS */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Activity className="w-4 h-4 text-biofarm-cyan" /> Wytrzymałość Powłoki DLC
            </h3>

            <div className="space-y-3 font-mono text-[10px] leading-relaxed">
              <div className="flex justify-between items-center py-2 border-b border-slate-700/10">
                <span className="text-slate-500">Przewidywana trwałość czoła stempla:</span>
                <span className={`font-extrabold text-xs ${predictedPeelTimeHours < 50 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                  ~ {predictedPeelTimeHours} godzin pracy
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-700/10">
                <span className="text-slate-500">Wydajność powłoki ślizgowej:</span>
                <span className="font-extrabold text-xs">
                  {(100 - (shearForce / bondStrength) * 12).toFixed(1)}% EFF
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500">Prawdopodobieństwo przyklejania proszku:</span>
                <span className={`font-extrabold text-xs ${shearForce > bondStrength ? 'text-red-500' : 'text-emerald-500'}`}>
                  {shearForce > bondStrength ? 'ALARM STICKING' : 'Niskie (Safe)'}
                </span>
              </div>
            </div>
          </div>

          {/* HAZARDS LOG OF MICRO-PVD FAILURES */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <ShieldAlert className="w-4 h-4 text-rose-500" /> Analiza Spallingu i Uszkodzeń Powłok
            </h3>
            <p className={`text-[10px] leading-relaxed font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Jeżeli siła tarcia ścinającego przekroczy energię szczepną adhezji mikroskopijnej powłoki, następuje gwałtowny rozpad struktury DLC
              (Amorficzna faza węglowa). Wolne drobiny metalu oraz tlenku chromu stają się zarodnikami czarnego zaproszkowania serii tabletkowej, co wymusza natychmiastowe kwestionowanie całości wdrożonej partii sterylnej.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
