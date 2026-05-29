import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Droplets, 
  Wind, 
  Thermometer, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle,
  Lightbulb,
  Maximize2,
  RefreshCw,
  Info
} from 'lucide-react';

interface GranuleMoistureSimulatorProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

export const GranuleMoistureSimulator: React.FC<GranuleMoistureSimulatorProps> = ({
  theme,
  isLight,
  addToast
}) => {
  // Environmental control parameters for granule moisture equilibrium
  const [humidity, setHumidity] = useState<number>(45); // RH % (Relative Humidity)
  const [temperature, setTemperature] = useState<number>(22); // °C
  const [dryAirFlow, setDryAirFlow] = useState<number>(55); // Air velocity flow rate %
  const [activeGranuleType, setActiveGranuleType] = useState<'Hydrophilic' | 'Hydrophobic' | 'Starch-based'>('Hydrophilic');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  
  // Water molecule particles list that orbit or bounce off the granule core
  interface MoistureMolecule {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    state: 'floating' | 'absorbed' | 'evaporating';
    angle: number;
    speed: number;
  }

  const moleculesRef = useRef<MoistureMolecule[]>([]);
  const cycleTimeRef = useRef<number>(0);

  // Triggering custom optimization preset
  const handleApplyPreset = (type: 'dry' | 'moist' | 'gmp') => {
    if (type === 'dry') {
      setHumidity(15);
      setTemperature(35);
      setDryAirFlow(90);
      addToast('TRYB SUPER SUCHEGO RDZENIA', 'Parametry laminarne ustawione na maksymalne osuszanie granulatu wrażliwego.', 'success');
    } else if (type === 'moist') {
      setHumidity(75);
      setTemperature(18);
      setDryAirFlow(15);
      addToast('ALARM EXTREME HUMIDITY', 'Zasymulowano awarię filtrów HVAC. Krytyczna wilgoć & ryzyko lepienia tabletek!', 'warning');
    } else {
      setHumidity(45);
      setTemperature(21);
      setDryAirFlow(50);
      addToast('KORZYSTNE WARUNKI GMP', 'Optymalny punkt rosy przywrócony. Stabilna faza mikroskopowa.', 'info');
    }
  };

  // Canvas molecular simulation renderer (Award-Winning microfluidic visuals)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pre-initialize a steady stream of moisture molecules
    if (moleculesRef.current.length === 0) {
      for (let i = 0; i < 80; i++) {
        moleculesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: 1.5 + Math.random() * 3,
          color: '#38bdf8',
          state: Math.random() > 0.6 ? 'absorbed' : 'floating',
          angle: Math.random() * Math.PI * 2,
          speed: 0.8 + Math.random() * 1.2
        });
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw modern aesthetic fine target crosshairs
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Granule central cellular boundary core (Lekki kryształ leku)
      const centerX = w / 2;
      const centerY = h / 2;
      const coreRadius = 75;

      cycleTimeRef.current += 0.02;
      const t = cycleTimeRef.current;

      // Draw the central organic pulse representing gelatine/starch crystalline granule
      const bounceScalar = 1 + Math.sin(t * 1.5) * 0.02;
      const activeRadius = coreRadius * bounceScalar;

      // Glow backing
      const glowGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, activeRadius + 40);
      const baseGlowColor = humidity > 60 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.12)';
      glowGrad.addColorStop(0, baseGlowColor);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, activeRadius + 40, 0, Math.PI * 2);
      ctx.fill();

      // Render the core cellular polygon representing the active pharmaceutical granule under microscope
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(t * 0.15);
      
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = isLight ? '#f8fafc' : '#030712';
      
      ctx.beginPath();
      // Draw 8-sided elegant crystal
      const numPoints = 8;
      for (let i = 0; i < numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        // add wave noise simulating rough raw material surface
        const noise = Math.sin(theta * 5 + t * 4) * (humidity * 0.08); 
        const r = activeRadius + noise;
        const px = Math.cos(theta) * r;
        const py = Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Intricate core molecular pattern lines (hologram nodes on the granule surface)
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < numPoints; i += 2) {
        const theta1 = (i / numPoints) * Math.PI * 2;
        const theta2 = ((i + 3) / numPoints) * Math.PI * 2;
        ctx.moveTo(Math.cos(theta1) * (activeRadius - 15), Math.sin(theta1) * (activeRadius - 15));
        ctx.lineTo(Math.cos(theta2) * (activeRadius - 15), Math.sin(theta2) * (activeRadius - 15));
      }
      ctx.stroke();

      // Pulse color-indicator for surface stickiness
      ctx.fillStyle = humidity > 62 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(34, 211, 238, 0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, activeRadius - 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // restore translation

      // Dynamic flow of floating, condensation and evaporation water molecules
      // Spawn new particles depending on humidity value
      if (moleculesRef.current.length < humidity + 15) {
        // Air dry flow blows some away from left to right, or humidity injects them
        moleculesRef.current.push({
          x: Math.random() > 0.5 ? 0 : w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: 1.2 + Math.random() * 2.5,
          color: '#38bdf8',
          state: 'floating',
          angle: Math.random() * Math.PI * 2,
          speed: 1.0 + Math.random() * 1.0
        });
      }

      // Physics loop for particles orbiting or getting sucked into the molecular matrix
      moleculesRef.current = moleculesRef.current.filter((mol) => {
        // Calculate vector distance from center core
        const dx = mol.x - centerX;
        const dy = mol.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Dry air flow pushes molecules to the right
        const windAcceleration = (dryAirFlow * 0.01) * 0.45;
        mol.x += mol.vx + windAcceleration;
        mol.y += mol.vy;

        // Temperature increases thermal vibration jitter
        const thermalJitter = (temperature / 10) * 0.35;
        mol.x += (Math.random() - 0.5) * thermalJitter;
        mol.y += (Math.random() - 0.5) * thermalJitter;

        // State Machine logic
        if (mol.state === 'floating') {
          // Attracted to crystal at higher relative humidity
          if (dist < activeRadius + 45) {
            const pullCoeff = (humidity * 0.00015);
            mol.vx -= (dx / dist) * pullCoeff;
            mol.vy -= (dy / dist) * pullCoeff;
          }

          // Transition to ABSORBED if close enough
          if (dist < activeRadius) {
            mol.state = 'absorbed';
            mol.vx = 0;
            mol.vy = 0;
          }
        } 
        else if (mol.state === 'absorbed') {
          // Stays on core or evaporates based on temperature vs humidity
          const evapThresh = (temperature * 1.5) / (humidity + 1);
          if (Math.random() * 200 < evapThresh + (dryAirFlow * 0.02)) {
            mol.state = 'evaporating';
            // eject outwards with speed
            mol.vx = (dx / (dist || 1)) * 2.2;
            mol.vy = (dy / (dist || 1)) * 2.2;
          }
          // subtle rotation on core surface
          const rotAngle = 0.013;
          const rx = dx * Math.cos(rotAngle) - dy * Math.sin(rotAngle);
          const ry = dx * Math.sin(rotAngle) + dy * Math.cos(rotAngle);
          mol.x = centerX + rx;
          mol.y = centerY + ry;
        } 
        else if (mol.state === 'evaporating') {
          // move away rapidly
          if (dist < activeRadius) {
            mol.state = 'absorbed';
          }
        }

        // Render water molecule dot
        ctx.beginPath();
        const activeColor = mol.state === 'absorbed' ? '#f43f5e' : mol.state === 'evaporating' ? '#f59e0b' : '#38bdf8';
        ctx.arc(mol.x, mol.y, mol.size, 0, Math.PI * 2);
        ctx.fillStyle = activeColor;
        ctx.fill();

        // Expire if out of boundary
        return mol.x > 0 && mol.x < w && mol.y > 0 && mol.y < h;
      });

      // Interactive blueprint dynamic tag coordinates
      ctx.fillStyle = isLight ? '#0f172a' : '#22d3ee';
      ctx.font = '8px monospace';
      ctx.fillText(`MOLECULAR_RH: ${humidity}%`, 20, 20);
      ctx.fillText(`EQUILIBRIUM_INDEX: ${((100 - humidity) * (dryAirFlow / 50)).toFixed(1)} EM`, 20, 32);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [humidity, temperature, dryAirFlow, activeGranuleType, isLight]);

  // Use Memo calculations for sticking warning probability
  const stickingSafetyRating = useMemo(() => {
    const dangerScore = (humidity * 1.5) - (dryAirFlow * 0.5) - (temperature * 0.2);
    if (dangerScore > 65) return { status: 'KRYTYCZNE (LEPIENIE)', color: 'text-red-500 animate-pulse', desc: 'Wysoka skłonność do zatykania ubytków czoła stempla.' };
    if (dangerScore > 35) return { status: 'OSTRZEŻENIE (DOKLEJANIE)', color: 'text-amber-500', desc: 'Możliwe osadzanie na rogach tłoczenia.' };
    return { status: 'OPTYMALNY (SUCHY)', color: 'text-emerald-500', desc: 'Granulacja stabilna, idealny przepływ sypki.' };
  }, [humidity, dryAirFlow, temperature]);

  return (
    <div className="space-y-6">
      
      {/* HEADER ROW */}
      <div className={`rounded-2xl p-6 relative overflow-hidden transition-all ${
        isLight ? 'bg-white border border-slate-200 shadow-xs' : 'bg-biofarm-dark text-white border border-white/5 bg-grid-pattern-dark'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1.5 border-l-2 border-[#38bdf8] pl-4">
            <span className={`text-[9px] font-mono uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-cyan-400 font-black'}`}>
              PHARMA 4.0 - MICROSCOPIC MOLECULAR GRAPHICS
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight uppercase">
              Molecular Granule Moisture Equilibrium
            </h1>
            <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Wizualna interakcja absorpcji cząsteczek wody na kryształku substancji ułatwiająca analizę lepienia stempli. 
              Minimalistyczna i precyzyjna animacja w rzucie mikroskopowym.
            </p>
          </div>
        </div>
      </div>

      {/* CORE EXPERIMENTATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* CANVASES VIEWPORT COMPONENT */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`rounded-2xl p-6 relative overflow-hidden flex flex-col items-center border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5'
          }`}>
            
            {/* Toolbar filter */}
            <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-700/10">
              <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                <Droplets className="w-4 h-4 text-sky-400 animate-bounce" /> Stan Molekularny Kryształu
              </h3>

              {/* Granule matrix switcher */}
              <div className="flex gap-1">
                {(['Hydrophilic', 'Hydrophobic', 'Starch-based'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setActiveGranuleType(type);
                      if (type === 'Hydrophobic') {
                        setHumidity(12);
                      } else {
                        setHumidity(52);
                      }
                      addToast('ZMIANA STRUKTURY GRANULATU', `Wczytano model wiązania: ${type}`, 'info');
                    }}
                    className={`px-2.5 py-1 text-[9px] font-mono font-bold rounded-lg ${
                      activeGranuleType === type 
                        ? 'bg-sky-500 text-slate-950 font-black' 
                        : isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Microscopic Canvas Box */}
            <div className={`w-full p-4 flex items-center justify-center rounded-xl border relative overflow-hidden ${
              isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950 border-white/5'
            }`}>
              <canvas
                ref={canvasRef}
                width={500}
                height={280}
                className="max-w-full h-auto drop-shadow-sm"
              />

              {/* Overlay states */}
              <div className="absolute top-4 right-4 text-right flex flex-col gap-0.5 text-[8.5px] font-mono text-sky-400">
                <div>MOLECULAR_COUNT: {moleculesRef.current.length}</div>
                <div>STICKINESS_INDEX: {humidity > 60 ? 'HIGH ADHESION' : 'STABLE DRY'}</div>
                <div>CELLULAR_PULSE: ACTIVE</div>
              </div>
            </div>

            {/* PRECISE ROTATING SLIDERS */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 pt-4 border-t border-slate-700/10">
              
              {/* HUMIDITY RH% */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Wilgotność Powietrza RH:</span>
                  <span className="font-extrabold text-sky-400">{humidity}% RH</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={humidity}
                  onChange={(e) => setHumidity(Number(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 cursor-col-resize rounded bg-slate-950/40"
                />
              </div>

              {/* TEMPERATURE */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Temperatura Nawiewu:</span>
                  <span className="font-extrabold text-rose-400">{temperature} °C</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="45"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 cursor-col-resize rounded bg-slate-950/40"
                />
              </div>

              {/* PRECISE AIR FLOW VELOCITY */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Szybkość Powietrza (Dry):</span>
                  <span className="font-extrabold text-emerald-500">{dryAirFlow}% F</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={dryAirFlow}
                  onChange={(e) => setDryAirFlow(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 cursor-col-resize rounded bg-slate-950/40"
                />
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: ANALYTICS SHEET */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* GMP INDEX MONITOR CARD */}
          <div className={`rounded-2xl p-5 space-y-4 border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <ShieldCheck className="w-4 h-4 text-[#06b6d4]" /> Ryzyko Lepienia Granulatu
            </h3>

            <div className="space-y-3 font-mono text-[10px] leading-relaxed">
              <div className="p-3 bg-slate-950/40 text-center flex flex-col gap-0.5 rounded-lg">
                <span className="text-[8px] text-slate-500 uppercase">Ocena Zgodności Zygzaka:</span>
                <span className={`text-xs font-black ${stickingSafetyRating.color}`}>
                  {stickingSafetyRating.status}
                </span>
                <p className="text-[8.5px] text-slate-400 mt-1">{stickingSafetyRating.desc}</p>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-700/10">
                <span className="text-slate-500">Molekularny punkt rosy:</span>
                <span>{(humidity * 0.18 + 2).toFixed(1)} °C</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500">Stała termodynamiczna:</span>
                <span className="text-emerald-500">1.28 J/g·K</span>
              </div>
            </div>

            {/* PRESETS FOR SMART INTERACTIVE ACTION */}
            <div className="grid grid-cols-3 gap-1.5 pt-2">
              <button
                onClick={() => handleApplyPreset('dry')}
                className="px-1 py-2 text-[8px] font-bold text-slate-300 bg-white/5 rounded hover:bg-white/10"
              >
                TRYB DRY%
              </button>
              <button
                onClick={() => handleApplyPreset('gmp')}
                className="px-1 py-2 text-[8px] font-bold text-sky-400 bg-sky-500/10 rounded border border-sky-500/20 hover:bg-sky-500/20"
              >
                OPT_GMP
              </button>
              <button
                onClick={() => handleApplyPreset('moist')}
                className="px-1 py-2 text-[8px] font-bold text-rose-400 bg-rose-500/10 rounded border border-rose-500/20 hover:bg-rose-500/20"
              >
                WARN_CRIT
              </button>
            </div>
          </div>

          {/* HAZARDS ANALYSIS BIOFARM */}
          <div className={`rounded-xl p-5 space-y-3 border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Wskazówki Walidacyjne
            </h3>
            <p className={`text-[10px] leading-relaxed font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Nadmierna wilgotność względna (powyżej 60% RH) cząstek pyłkowych powoduje pęcznienie mostków ciekłych granulatu, 
              co drastycznie powiększa siłę przylegania substancji czynnych (API) do stali prasującej. 
              Stała laminarna kontrola wilgotności u boku tabletkarki to podstawa ciągłości procesu.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
