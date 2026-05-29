import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Activity, 
  Zap, 
  Thermometer, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  ShieldAlert 
} from 'lucide-react';

interface CryoTemperingSimulatorProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

type CryoStage = 'cooling' | 'deep_freeze' | 'heating' | 'high_temper' | 'done';

export const CryoTemperingSimulator: React.FC<CryoTemperingSimulatorProps> = ({
  theme,
  isLight,
  addToast
}) => {
  const [temperature, setTemperature] = useState<number>(20); // Celsius (-196 to 300)
  const [holdTime, setHoldTime] = useState<number>(4); // hours
  const [coolingRate, setCoolingRate] = useState<number>(5.0); // °C / min
  const [selectedSteel, setSelectedSteel] = useState<'AISI_D2' | 'PM_M4' | 'AISI_O1'>('AISI_D2');

  const [currentStage, setCurrentStage] = useState<CryoStage>('done');
  const [hardness, setHardness] = useState<number>(58.5); // HRC
  const [austenitePercent, setAustenitePercent] = useState<number>(18); // % (residual Austenite)
  const [martensitePercent, setMartensitePercent] = useState<number>(82); // %

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSimulatingCycle, setIsSimulatingCycle] = useState<boolean>(false);

  // Simple automated heating-cooling cycle simulation
  const handleTriggerCycle = () => {
    if (isSimulatingCycle) return;
    setIsSimulatingCycle(true);
    setCurrentStage('cooling');
    addToast(
      'Rozpoczęto hartowanie stempli',
      `Komora kriogeniczna inicjuje fazę schładzania z szybkością -${coolingRate}°C/min.`,
      'info'
    );
  };

  useEffect(() => {
    if (!isSimulatingCycle) return;

    let timer: any;
    let step = 0;

    const runSimulation = () => {
      timer = setInterval(() => {
        step++;
        if (step <= 25) {
          // Cooling down to cryo -196C
          setCurrentStage('cooling');
          const targetTemp = Math.max(-196, 20 - (step * 9));
          setTemperature(targetTemp);
          // Austenit transforms into Martensite
          const transRatio = step / 25;
          setAustenitePercent(Math.max(2, Math.floor(18 - (transRatio * 15))));
          setMartensitePercent(Math.min(98, Math.floor(82 + (transRatio * 16))));
          setHardness(parseFloat((58.5 + transRatio * 6.0).toFixed(1)));
        } else if (step > 25 && step <= 45) {
          // Deep crying freezing -196C hold time
          setCurrentStage('deep_freeze');
          setTemperature(-196);
          setAustenitePercent(2);
          setMartensitePercent(98);
          // Maximum transformation toughness locking in
          setHardness(64.5);
        } else if (step > 45 && step <= 70) {
          // Reheating and tempering stage to +260 C
          setCurrentStage('heating');
          const progress = (step - 45) / 25;
          const targetTemp = Math.floor(-196 + (progress * 456)); // ends up around 260
          setTemperature(targetTemp);
        } else if (step > 70 && step <= 90) {
          // Stress relief / high temper cycle
          setCurrentStage('high_temper');
          setTemperature(260);
          setHardness(62.8); // slight HRC relaxation but major toughness increase
        } else {
          // Cycle finished
          clearInterval(timer);
          setTemperature(20);
          setCurrentStage('done');
          setIsSimulatingCycle(false);
          addToast(
            'Zakończono kriogenizację!',
            `Wyżarzanie i kriogenizacja stempli ukończone pomyślnie. Twardość nominalna: 62.8 HRC. Osnowa bezmikropękniowa.`,
            'success'
          );
        }
      }, 100);
    };

    runSimulation();
    return () => clearInterval(timer);
  }, [isSimulatingCycle, coolingRate]);

  // Thermographic Metal Shading Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let pulse = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    handleResize();

    const render = () => {
      pulse += 0.05;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Dark space
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, w, h);

      // 1. Chamber ambient glow
      const cx = w * 0.45;
      const cy = h / 2;

      // Draw vacuum chamber outline
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, h * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      // Ambient temperature color gradient
      // cold -196 is cyan, hot 260 is pulsing orange
      let ambientColor = 'rgba(255, 255, 255, 0.02)';
      if (temperature < 0) {
        const intensity = Math.min(0.5, Math.abs(temperature) / 196);
        ambientColor = `rgba(56, 189, 248, ${intensity * 0.15})`;
      } else if (temperature > 50) {
        const intensity = Math.min(0.6, (temperature - 50) / 210);
        ambientColor = `rgba(249, 115, 22, ${intensity * 0.15})`;
      }

      ctx.fillStyle = ambientColor;
      ctx.beginPath();
      ctx.arc(cx, cy, h * 0.42 - 1, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw 3D Punch Tool Silhouette inside chamber
      // Calculate color based on temperature
      // Frozen: deep slate blue #1e293b with frosty outer outline
      // Hot: orange #ea580c to pale yellow at peak
      let metalColor = 'rgb(115, 125, 140)';
      let glowColor = 'rgba(255, 255, 255, 0)';

      if (temperature < 0) {
        const intensity = Math.abs(temperature) / 196;
        const r = Math.floor(115 - (intensity * 80));
        const g = Math.floor(125 - (intensity * 40));
        const b = Math.floor(140 + (intensity * 80));
        metalColor = `rgb(${r}, ${g}, ${b})`;
        glowColor = `rgba(14, 165, 233, ${intensity * (0.3 + Math.sin(pulse) * 0.1)})`;
      } else if (temperature > 50) {
        const intensity = (temperature - 50) / 210;
        const r = Math.min(255, Math.floor(115 + (intensity * 140)));
        const g = Math.floor(125 - (intensity * 75));
        const b = Math.floor(140 - (intensity * 100));
        metalColor = `rgb(${r}, ${g}, ${b})`;
        glowColor = `rgba(249, 115, 22, ${intensity * (0.4 + Math.sin(pulse) * 0.15)})`;
      }

      // Draw glowing shadow for thermography
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = Math.abs(temperature) > 50 ? 25 : 0;

      // Composite coordinates for the punch tool
      ctx.fillStyle = metalColor;
      ctx.beginPath();
      // Face
      ctx.moveTo(cx - 30, cy - 50);
      ctx.lineTo(cx + 30, cy - 50);
      // Neck
      ctx.lineTo(cx + 18, cy - 10);
      // Shaft
      ctx.lineTo(cx + 18, cy + 50);
      // Barrel base
      ctx.lineTo(cx + 35, cy + 60);
      ctx.lineTo(cx - 35, cy + 60);
      ctx.lineTo(cx - 18, cy + 50);
      ctx.lineTo(cx - 18, cy - 10);
      ctx.closePath();
      ctx.fill();

      // Reset shadows
      ctx.shadowBlur = 0;

      // Draw frosting highlights for cryo phase
      if (temperature < -100) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Draw crystalline grain array dynamically on the right side box
      const boxX = w * 0.76;
      const boxY = h * 0.22;
      const boxW = w * 0.21;
      const boxH = h * 0.55;

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.rect(boxX, boxY, boxW, boxH);
      ctx.fill(); ctx.stroke();

      // Grid of atoms representing lattice structure
      // Cooling locks martensitic blocks (rotated diagonals)
      // Cryo transforms FCC (austenite - cube) to BCT (martensite - sharp interlocking diagonals)
      const dotColors = temperature < -50 ? 'rgba(56, 189, 248, 0.75)' : 'rgba(249, 115, 22, 0.7)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 0.8;

      const spacing = 12;
      const rows = Math.floor(boxH / spacing);
      const cols = Math.floor(boxW / spacing);

      for (let r = 1; r < rows; r++) {
        for (let c = 1; c < cols; c++) {
          const px = boxX + c * spacing;
          const py = boxY + r * spacing;

          // Martensite needles vs Austenite boxes
          if (temperature < -100) {
            // needle structure (diagonal connection lines)
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
            ctx.beginPath();
            ctx.moveTo(px - 5, py - 5);
            ctx.lineTo(px + 5, py + 5);
            ctx.stroke();
          } else {
            // box structure (interconnecting squares)
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.08)';
            ctx.strokeRect(px - 4, py - 4, 8, 8);
          }

          // Center atomic cores
          ctx.fillStyle = dotColors;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Floating text indicators in viewport
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px monospace';
      ctx.fillText(`KOMORA C-CYO: STEEL ${selectedSteel}`, 14, 22);

      animFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrame);
  }, [temperature, selectedSteel]);

  return (
    <div className="space-y-6 text-left">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-cyan-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> PROPOZYCJA II: CRYOGENIC TEMPERING CONTROL CHAMBER
          </span>
          <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white">
            Wymrażanie Kriogeniczne i Optymalizacja Hartownicza
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Przeprowadź kompletny cykl obróbki wymrażania głębokiego we fluktuacie od -196°C do +260°C. Redukcja szczątkowego Austenitu podnosi żywotność matrycy stępkowej o 300% (eliminacja pęknięć krawędzi łamaczy wody).
          </p>
        </div>

        {/* Steel Type Selectors */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl shrink-0">
          {[
            { id: 'AISI_D2', label: 'Stal D2 (Premium)' },
            { id: 'PM_M4', label: 'Stal PM M4 (Pro)' },
            { id: 'AISI_O1', label: 'Stal O1 (Standard)' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedSteel(st.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black font-mono transition-all outline-none ${
                selectedSteel === st.id 
                  ? 'bg-cyan-500 text-slate-950 font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column Controls (40%) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-3xs space-y-4">
            <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase tracking-wider">
              Konfigurator Autoklawu Thermo-Cryo:
            </span>

            {/* Hold Time */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-700 dark:text-slate-350 font-semibold">Głębokie przemrożenie (Hold Time):</span>
                <span className="font-mono text-cyan-400 font-bold">{holdTime} godzin</span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                step="1"
                value={holdTime}
                onChange={(e) => setHoldTime(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Cooling Rate */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-700 dark:text-slate-350 font-semibold">Tempo schładzania (Cooling Gradient):</span>
                <span className="font-mono text-cyan-400 font-bold">-{coolingRate.toFixed(1)} °C/min</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={coolingRate}
                onChange={(e) => setCoolingRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Play trigger button */}
            <div className="pt-3">
              <button
                onClick={handleTriggerCycle}
                disabled={isSimulatingCycle}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-mono font-black text-xs uppercase py-3 px-4 rounded-xl shadow cursor-pointer transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                <Thermometer className="w-4 h-4 text-slate-950 animate-bounce" />
                {isSimulatingCycle ? 'KRUOGENIZACJA W TOKU SYST-A...' : 'ROZPOCZNIJ CYKL TERMOKRYOGENICZNY'}
              </button>
            </div>
          </div>

          {/* Phase distribution analysis screen */}
          <div className="bg-[#0b1329] p-5 rounded-2xl border border-white/5 space-y-4 text-xs font-mono">
            <span className="text-[10px] text-cyan-400 block font-bold uppercase tracking-wider">
              Stan mikrostruktury metalurgicznej:
            </span>

            <div className="space-y-3 pt-1">
              {/* Tempering temperature meter */}
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span>AKTUALNA TEMPERATURA RDZENIA:</span>
                <span className={`font-bold ${
                  temperature < 0 ? 'text-cyan-400' : 'text-orange-500'
                }`}>{temperature} °C</span>
              </div>

              {/* Hardness meter HRC */}
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span>RZEWISTODAJNA TWARDOŚĆ STALI:</span>
                <span className="font-bold text-emerald-400">{hardness} HRC</span>
              </div>

              {/* Austenit % */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Austenit Szczątkowy (Zabójca trwałości):</span>
                  <span>{austenitePercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 transition-all duration-300" 
                    style={{ width: `${austenitePercent * 5}%` }}
                  />
                </div>
              </div>

              {/* Martensite % */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Martenzyt Iglasty (Wytrzymały rdzeń):</span>
                  <span>{martensitePercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${martensitePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Visualization viewport (60%) */}
        <div className="lg:col-span-7">
          <div className="bg-[#05070d] rounded-2xl p-4 border border-slate-805 h-[360px] flex flex-col justify-between overflow-hidden relative">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                VIRTUAL CHAMBER METALLOGRAPHY: Podgląd fazowy matryc HRC-700
              </span>
              <div className="flex gap-4 text-[9px] font-mono uppercase text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Austenit
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Martenzyt
                </span>
              </div>
            </div>

            <div className="flex-1 my-3 relative overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full block rounded-xl" />

              {/* Float visual active state stage tag */}
              <div className="absolute top-4 left-4">
                <span className="bg-[#ea580c]/10 text-[#f97316] border border-[#ea580c]/30 text-[9px] font-bold font-mono px-2 py-1 rounded uppercase">
                  {currentStage === 'cooling' && '📉 SCHŁADZANIE RDZENIA'}
                  {currentStage === 'deep_freeze' && '❄️ DEEP FREEZE -196C'}
                  {currentStage === 'heating' && '📈 RE-TEMPERING WYSOKI'}
                  {currentStage === 'high_temper' && '🔥 STRES-REDUKCJA 260C'}
                  {currentStage === 'done' && '✓ CYKL WYŻARZANIA UKOŃCZONY'}
                </span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex justify-between items-center.">
              <span>System monitorowania autoklawów Biofarm sp. z o.o.</span>
              <span>Tolerancja: +/- 0.5 HRC</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
