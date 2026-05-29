import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolSet } from '../types';
import { 
  Wind, 
  Flame, 
  ShieldAlert, 
  Activity, 
  Sliders, 
  Gauge, 
  RefreshCw, 
  Binary, 
  CheckCircle, 
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';

interface CleanroomFlowSimulatorProps {
  toolSets: ToolSet[];
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success', toolsetId?: string) => void;
}

export const CleanroomFlowSimulator: React.FC<CleanroomFlowSimulatorProps> = ({
  toolSets,
  theme,
  isLight,
  addToast
}) => {
  // Airflow and cleanroom physics states
  const [laminarVelocity, setLaminarVelocity] = useState<number>(0.45); // Standard requirement is 0.45 m/s +/- 20%
  const [frictionHeat, setFrictionHeat] = useState<number>(36.5); // degree Celsius, heating due to sliding punch heads
  const [hepaEfficiency, setHepaEfficiency] = useState<number>(99.997); // HEPA H14 percentage efficiency
  const [particleDensity, setParticleDensity] = useState<number>(18); // air density of particulate traces
  const [isFlowActive, setIsFlowActive] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; speedY: number; size: number; alpha: number }>>([]);

  // Trigger HEPA purge pulse
  const handleHepaPurge = () => {
    addToast(
      'HEPA H14 PULSE AIR PURGE',
      'Uruchomiono tryb sterylnego przedmuchu nadciśnieniowego śluzy GMP. Pyły tabletkowe odprowadzone do kolektora ssącego.',
      'success'
    );
    setParticleDensity(2); // drop particulate index drastically
  };

  // Main canvas particle and heat simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize particles initially
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 80; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speedY: 1.5 + Math.random() * 2,
          size: 1 + Math.random() * 2.5,
          alpha: 0.15 + Math.random() * 0.65
        });
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw technical ambient structure background
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(34, 211, 238, 0.07)';
      ctx.lineWidth = 1;
      for (let i = 25; i < width; i += 25) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for (let j = 25; j < height; j += 25) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
      }

      // Draw Punch Outline Representation (Hologram of punch die area)
      const px = width / 2;
      const py = height / 2;

      // Draw thermal friction gradient background glow around main mechanical pivot
      const thermalRadius = 30 + (frictionHeat - 20) * 2.2;
      const rGradient = ctx.createRadialGradient(px, py, 10, px, py, thermalRadius);
      rGradient.addColorStop(0, `rgba(239, 68, 68, ${0.45 * (frictionHeat / 50)})`);
      rGradient.addColorStop(0.5, `rgba(249, 115, 22, ${0.15 * (frictionHeat / 50)})`);
      rGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = rGradient;
      ctx.beginPath();
      ctx.arc(px, py, thermalRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw the mechanical stamp profile hologram lines
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.25)' : 'rgba(34, 211, 238, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Upper punch stem
      ctx.moveTo(px - 15, py - 90);
      ctx.lineTo(px + 15, py - 90);
      ctx.lineTo(px + 10, py - 15);
      // Punch head tip
      ctx.lineTo(px + 24, py - 15);
      ctx.lineTo(px + 24, py + 15);
      ctx.lineTo(px - 24, py + 15);
      ctx.lineTo(px - 24, py - 15);
      ctx.lineTo(px - 10, py - 15);
      ctx.closePath();
      ctx.stroke();

      // Internal laser beam scanner checking laminar cleanliness
      const laserY = py + Math.sin(Date.now() * 0.002) * 60;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(20, laserY); ctx.lineTo(width - 20, laserY); ctx.stroke();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.font = '7px monospace';
      ctx.fillText('PARTICLE_LASER_GATE_ACTIVE', 25, laserY - 3);

      // 2. Draw Laminar Airflow Particles
      // Clean laminar airflow streams from top to bottom
      const flowSpeedBase = laminarVelocity * 14; // scale velocity parameter

      particlesRef.current.forEach((p) => {
        // Render particulate vector circle list
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Heat temperature color shifting of the particles
        const distToHeat = Math.sqrt((p.x - px) * (p.x - px) + (p.y - py) * (p.y - py));
        let pColor = isLight ? 'rgba(11, 69, 150, ' : 'rgba(34, 211, 238, ';
        if (distToHeat < thermalRadius && frictionHeat > 32) {
          pColor = 'rgba(239, 68, 68, '; // shift to warning red
        }
        ctx.fillStyle = pColor + p.alpha + ')';
        ctx.fill();

        // Particle physics translation
        if (isFlowActive) {
          // move downwards representing laminar flow currents
          p.y += p.speedY * (flowSpeedBase / 2 + 0.3);
          
          // boundary conditions wrapping
          if (p.y > height) {
            p.y = 0;
            p.x = Math.random() * width;
          }
        }
      });

      // 3. Dynamic indicators on layout
      ctx.fillStyle = isLight ? '#0f172a' : '#22d3ee';
      ctx.font = '8px monospace';
      ctx.fillText(`AIR VELOCITY: V = ${laminarVelocity.toFixed(2)} m/s`, 20, 25);
      
      const velocityStatus = laminarVelocity >= 0.36 && laminarVelocity <= 0.54 ? 'OPTIMUM' : 'WARNING';
      ctx.fillStyle = velocityStatus === 'OPTIMUM' ? '#10b981' : '#f59e0b';
      ctx.fillText(`FLOW CODE: ${velocityStatus} (FDA REQ: 0.45 m/s)`, 20, 36);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [laminarVelocity, frictionHeat, particleDensity, isFlowActive, isLight]);

  // Compute GMP class and particles calculated indexes
  const measuredParticulates = useMemo(() => {
    // scale particles based on density and HEPA H14 bypass values
    const bypassMultiplier = (100 - hepaEfficiency) * 33333; // higher HEPA efficiency leads to less particles
    return Math.floor(particleDensity * (1 + bypassMultiplier));
  }, [particleDensity, hepaEfficiency]);

  const isoClass = useMemo(() => {
    if (measuredParticulates < 10) return 'ISO Class 4 (Very Clean)';
    if (measuredParticulates < 100) return 'ISO Class 5 (Class A Sterile)';
    if (measuredParticulates < 352) return 'ISO Class 6 (Class B Support)';
    return 'ISO Class 7 (Class C Limit Exceeded)';
  }, [measuredParticulates]);

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR TITLE */}
      <div className={`rounded-2xl p-6 relative overflow-hidden transition-all ${
        isLight ? 'bg-white border border-slate-200 shadow-sm' : 'bg-biofarm-dark text-white border border-white/5 bg-grid-pattern-dark'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl shrink-0 ${isLight ? 'bg-slate-100' : 'bg-cyan-500/10 text-cyan-400'}`}>
                <Wind className="w-5 h-5 animate-pulse text-indigo-400" />
              </span>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ISO-14644-1 Annex A Cleanroom Monitor
                </span>
                <h1 className={`text-xl lg:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Termowizja i Przepływ Laminarny Cleanroomu
                </h1>
              </div>
            </div>
            <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Trójwymiarowy model termohydrauliczny do badania prędkości wiatru laminarnego w strefie tabletkowania.
              Monitoruj lokalny wzrost temperatury głowic od seryjnego tarcia i filtrację pyłów HEPA H14.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 text-[9px] font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 uppercase">
              HEPA H14 VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* COMPONENT BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PARALLEL PHYSICS CANVAS */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`rounded-xl p-5 relative overflow-hidden flex flex-col items-center ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-slate-700/10">
              <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                <Binary className="w-4 h-4 text-biofarm-cyan" /> Radiometr Optyczny i Przepływ Powietrza
              </h3>
              
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <button
                  onClick={() => setIsFlowActive(!isFlowActive)}
                  className={`px-3 py-1 rounded font-bold border ${
                    isFlowActive 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}
                >
                  {isFlowActive ? 'LAMINAR ACTIVE' : 'LAMINAR PAUSED'}
                </button>
              </div>
            </div>

            {/* Interactive Vector Canvas */}
            <div className={`w-full p-4 flex items-center justify-center rounded-xl border relative overflow-hidden ${
              isLight ? 'bg-slate-5).border-slate-100' : 'bg-slate-950 border-white/5'
            }`}>
              <canvas
                ref={canvasRef}
                width={550}
                height={320}
                className="max-w-full h-auto"
              />

              {/* Hologram details list */}
              <div className="absolute top-4 right-4 flex flex-col gap-0.5 text-[8px] font-mono text-cyan-400 opacity-80 pointer-events-none text-right">
                <div>CLEANROOM_CLASS: {isoClass}</div>
                <div>LOCAL_HEAT_MAX: {frictionHeat.toFixed(1)} °C</div>
                <div>HEPA_AIR_EFFICIENCY: {hepaEfficiency.toFixed(3)}%</div>
              </div>
            </div>

            {/* CALIBRATION / SLIDERS */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 pt-4 border-t border-slate-700/15">
              
              {/* LAMINAR AIR VELOCITY SLIDER */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Prędkość wiatru pionowego:</span>
                  <span className="font-extrabold text-[#0b4596] dark:text-cyan-400">{laminarVelocity.toFixed(2)} m/s</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.85"
                  step="0.01"
                  value={laminarVelocity}
                  onChange={(e) => setLaminarVelocity(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Limit GMP: 0.36 - 0.54 m/s</span>
                </div>
              </div>

              {/* FRICTION HEAT SLIDER */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Temperatura czoła stempla:</span>
                  <span className={`font-extrabold ${frictionHeat > 42 ? 'text-rose-500 animate-pulse' : 'text-cyan-400'}`}>
                    {frictionHeat.toFixed(1)} °C
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="55"
                  step="0.5"
                  value={frictionHeat}
                  onChange={(e) => setFrictionHeat(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Optimum: &le; 40°C</span>
                  <span className="text-red-400">Degradacja API &gt; 45°C</span>
                </div>
              </div>

              {/* FILTER EFFICIENCY SLIDER */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Wydajność Filtru HEPA:</span>
                  <span className="font-extrabold text-emerald-500">{hepaEfficiency.toFixed(3)}%</span>
                </div>
                <input
                  type="range"
                  min="99.95"
                  max="99.999"
                  step="0.001"
                  value={hepaEfficiency}
                  onChange={(e) => setHepaEfficiency(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>H13 (99.95%)</span>
                  <span>H14 (99.997%)</span>
                  <span>U15 ULTRA (99.999%)</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: READINGS & AIR CLARITY METER */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* GMP CLARITY METER CARD */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Gauge className="w-4 h-4 text-biofarm-cyan" /> Stan Czystości Mikroklimatu
            </h2>

            <div className="space-y-4 text-[10px] font-mono text-center">
              <div className={`p-4 rounded-xl ${isLight ? 'bg-slate-50 border border-slate-200' : 'bg-slate-950/70'}`}>
                <div className="text-[9px] text-slate-500 uppercase">Pyły Tabletki / m³</div>
                <div className={`font-black text-2xl tracking-tight my-1 ${
                  measuredParticulates < 100 ? 'text-emerald-500' : measuredParticulates < 352 ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {measuredParticulates} PPB
                </div>
                <div className="text-[8px] text-slate-400 font-bold uppercase">
                  REKOMENDACJA: <span className="text-cyan-400">{isoClass}</span>
                </div>
              </div>

              {/* PURGE TRIGGER */}
              <button
                onClick={handleHepaPurge}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-biofarm-blue text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer"
              >
                <Wind className="w-4 h-4 shrink-0" /> WYKONAJ STERYLNY PRZEDMUCH HEPA
              </button>
            </div>

          </div>

          {/* SIMULATION READOUT SCENARIOS */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <ShieldAlert className="w-4 h-4 text-rose-500" /> Anomalie & Stany Alarmowe
            </h2>

            <div className="space-y-3 text-[10px] font-mono leading-relaxed">
              {laminarVelocity < 0.36 || laminarVelocity > 0.54 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg flex items-start gap-1.5">
                  <span>
                    BŁĄD PRĘDKOŚCI LAMINARNEJ: Prędkość obiegowa {laminarVelocity}m/s poza bezpiecznym standardem FDA (0.45m/s ± 20%). Ryzyko powstawania turbulencji i uwięzienia pyłów w strefie tabletki.
                  </span>
                </div>
              ) : null}

              {frictionHeat > 42 ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-start gap-1.5">
                  <span>
                    ALARM FRICTION_HEAT_OVR: Ciepło tarcia trzpienia przekracza {frictionHeat}°C! Ryzyko topnienia lub klejenia substancji aktywnej API (np. Paracetamol, Ibuprofen) do formy stempla.
                  </span>
                </div>
              ) : null}

              {laminarVelocity >= 0.36 && laminarVelocity <= 0.54 && frictionHeat <= 42 ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg flex items-start gap-1.2 font-sans font-medium text-center">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>
                    Mikroklimat strefy tabletkowania Biofarm w pełni stabilny. Wszystkie parametry hydrauliczne laminaru i pyłów w optymalnym pasmie GMP.
                  </span>
                </div>
              ) : null}
            </div>
          </div>

        </div>

      </div>

      {/* METROTECHNICAL FOOTNOTE */}
      <div className={`rounded-xl p-5 ${
        isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
      }`}>
        <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 mb-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> Certyfikacja HEPA / HVAC GMP Annex 1
        </h4>
        <p className={`text-[10px] font-mono leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Zgodnie ze zaktualizowanym standardem EU Annex 1, strefa jałowa (Grade A) wokół matrycy tabletkarki zobowiązana jest do stałego
          monitorowania prędkości wiatru oraz natychmiastowego detektowania wstrzymania przepływu. Integracja radiometrycznej simulacji
          przepływu z bazą stempli pozwala na automatyczne odrzucanie serii produkcyjnych w wypadku wykrycia długotrwałego ogrzewania stempli.
        </p>
      </div>

    </div>
  );
};
