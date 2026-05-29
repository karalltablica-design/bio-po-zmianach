import React, { useState, useEffect, useRef } from 'react';
import { 
  Binary, 
  Settings, 
  Layers, 
  Compass, 
  Workflow, 
  Activity, 
  Zap,
  HelpCircle,
  PlusCircle
} from 'lucide-react';

interface TribologyFrictionScannerProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

export const TribologyFrictionScanner: React.FC<TribologyFrictionScannerProps> = ({
  theme,
  isLight,
  addToast
}) => {
  // Input sliders and states
  const [coating, setCoating] = useState<'DLC' | 'CrN' | 'Steel' | 'TiAlN'>('DLC');
  const [loadForce, setLoadForce] = useState<number>(45); // Newtons
  const [lubrication, setLubrication] = useState<'dry' | 'grease' | 'solid-film'>('dry');
  const [slidingSpeed, setSlidingSpeed] = useState<number>(250); // mm/s

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dynamic values calculated from tribology formulas
  const [frictionCoeff, setFrictionCoeff] = useState<number>(0.08); // friction micro coeff
  const [shearStress, setShearStress] = useState<number>(12); // MPa
  const [frictionTemp, setFrictionTemp] = useState<number>(31.5); // localized flash temperature °C

  useEffect(() => {
    // Tribological math matching typical H13/D2 steel base and coatings
    let baseFriction = 0.55; // Raw Steel on Steel
    if (coating === 'DLC') baseFriction = 0.05; // Incredible low friction
    else if (coating === 'CrN') baseFriction = 0.22;
    else if (coating === 'TiAlN') baseFriction = 0.35;

    // Lub penalties
    let lubModifier = 1.0;
    if (lubrication === 'grease') lubModifier = 0.25;
    else if (lubrication === 'solid-film') lubModifier = 0.45;

    // Normal force increases contact area/deformation friction
    const forceFactor = 1.0 + (loadForce * 0.003);
    const speedFactor = 1.0 + (slidingSpeed * 0.0005);

    const calculatedCoeff = parseFloat((baseFriction * lubModifier * forceFactor).toFixed(3));
    setFrictionCoeff(calculatedCoeff);

    // Localized flash temperature calculation (frictional heating)
    const flashTemp = parseFloat((22.0 + (loadForce * calculatedCoeff * speedFactor * 1.6)).toFixed(1));
    setFrictionTemp(flashTemp);

    // Shear stress in MPa
    const shear = Math.floor(loadForce * calculatedCoeff * 8.5);
    setShearStress(shear);

    if (calculatedCoeff > 0.45) {
      addToast(
        'Krytyczne tarcie powierzchni stempla!',
        `Współczynnik tarcia przekracza dopuszczalne normy GMP (${calculatedCoeff} > 0.15). Ryzyko zatarcia stempli i uszkodzenia bębna.`,
        'warning'
      );
    }
  }, [coating, loadForce, lubrication, slidingSpeed]);

  // High-performance canvas slider scanning visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let tipOffset = 0;
    let lineChartPoints: { x: number; y: number }[] = [];

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    handleResize();

    const render = () => {
      // Lateral slide movement speed
      const speedCoeff = slidingSpeed * 0.015;
      tipOffset += speedCoeff;

      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Dark futuristic viewport background
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);

      // Tech Grid overlay
      ctx.strokeStyle = '#0e172a';
      ctx.lineWidth = 0.8;
      for (let x = 0; x < w; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 15) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // 1. Draw Surface material structure (Nanoscale waves)
      // Height waves representing crystalline rough boundary asperities
      ctx.fillStyle = coating === 'Steel' ? '#334155' : coating === 'DLC' ? '#115e59' : coating === 'TiAlN' ? '#9a3412' : '#0369a1';
      ctx.strokeStyle = coating === 'Steel' ? '#64748b' : coating === 'DLC' ? '#14b8a6' : coating === 'TiAlN' ? '#f97316' : '#38bdf8';
      ctx.lineWidth = 2.0;

      const surfaceY = h * 0.65;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, surfaceY);

      // Surface roughness function based on selected coating
      // DLC is incredibly flat and isotropic, Steel is rough and bumpy with sharp contact peaks
      const roughnessAmp = coating === 'Steel' ? 22 : coating === 'DLC' ? 2.5 : coating === 'TiAlN' ? 12 : 7.5;
      const points: {x: number, y: number}[] = [];

      for (let x = 0; x <= w; x++) {
        // Compose waves with different wavelengths for natural texture
        const wave1 = Math.sin(x * 0.05) * roughnessAmp;
        const wave2 = Math.cos(x * 0.12) * (roughnessAmp * 0.3);
        const y = surfaceY + wave1 + wave2;
        points.push({ x, y });
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // 2. Scan Probe Cantilever Needle (AFM Mode)
      // Calculate active horizontal position of the cantilever tip
      const activeX = (tipOffset % (w - 80)) + 40;
      
      // Interpolate probe height to slide perfectly over surface waves
      const surfaceYAtProbe = points[Math.floor(activeX)] ? points[Math.floor(activeX)].y : surfaceY;

      // Draw shiny triangular ruby scanning tip
      ctx.fillStyle = '#ef4444'; // Red ruby pointer
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(activeX, surfaceYAtProbe - 2);
      ctx.lineTo(activeX - 10, surfaceYAtProbe - 25);
      ctx.lineTo(activeX + 10, surfaceYAtProbe - 25);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Laser deflection emitter pointer (AFM logic visual)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(activeX, surfaceYAtProbe - 15);
      // Point laser up to floating scanner diode
      ctx.lineTo(w * 0.5, 25);
      ctx.stroke();

      // Floating scanner photodiode receiver box
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(w * 0.5 - 20, 10, 40, 15);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#10b981'; // Green active beam LED
      ctx.beginPath();
      ctx.arc(w * 0.5, 17, 3, 0, Math.PI * 2);
      ctx.fill();

      // 3. Frictional shear stress heatmap glowing spot at contact joint
      // Strong glowing circle to visualize localized micro-flash heat
      if (frictionTemp > 40) {
        const heatIntensity = Math.min(30, (frictionTemp - 30) * 0.35);
        const grad = ctx.createRadialGradient(activeX, surfaceYAtProbe, 2, activeX, surfaceYAtProbe, heatIntensity + 4);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
        grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.3)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(activeX, surfaceYAtProbe, heatIntensity + 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Live sliding force oscillations waveform plot (at bottom overlay)
      // Plot scrolling force sensor signals
      const activeForceY = (surfaceYAtProbe - surfaceY) * 2.5; // Exaggerate
      lineChartPoints.push({ x: w - 120, y: h - 35 + activeForceY });
      if (lineChartPoints.length > 100) lineChartPoints.shift();

      // Draw mini scrolling telemetry line chart on the bottom right
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      lineChartPoints.forEach((pt, idx) => {
        const drawX = w - 120 + idx;
        const drawY = pt.y;
        if (idx === 0) ctx.moveTo(drawX, drawY);
        else ctx.lineTo(drawX, drawY);
      });
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '7px monospace';
      ctx.fillText('OSCYLOSKOP ADHEZYJNY μ-SENSE', w - 120, h - 55);

      animFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrame);
  }, [coating, lubrication, loadForce, slidingSpeed, frictionTemp]);

  return (
    <div className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-cyan-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> PROPOZYCJA III: TRIBOMETRIC ATOMIC FORCE SCANNER
          </span>
          <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white">
            Tribologia Powłok i Mikroskop Sił Zachowawczych
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Metrologiczny model ślizgowy w skali nano. Analizuj tarcie graniczne powłok supertwardych DLC (Diamond-Like Carbon) w celu przeciwdziałania zjawisku "sticking" - klejenia się granulatu do czoła stempla.
          </p>
        </div>

        {/* Dynamic selector of coating */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
          {[
            { id: 'DLC', label: 'Diamentowa DLC' },
            { id: 'CrN', label: 'Azotek Chromu CrN' },
            { id: 'TiAlN', label: 'Tytan-Aluminium' },
            { id: 'Steel', label: 'Stal Bez Powłoki' }
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCoating(c.id as any)}
              className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg transition-all outline-none ${
                coating === c.id 
                  ? 'bg-cyan-500 text-slate-950 shadow font-bold' 
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main split dashboard layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column inputs (40%) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-3xs space-y-4">
            <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase tracking-wider">
              Konfiguracja obciążenia tribologicznego:
            </span>

            {/* Slider 1: Load force */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-700 dark:text-slate-350 font-semibold">Siła nacisku normalnego (Contact Force):</span>
                <span className="font-mono text-cyan-400 font-bold">{loadForce} N</span>
              </div>
              <input
                type="range"
                min="5"
                max="150"
                value={loadForce}
                onChange={(e) => setLoadForce(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Slider 2: Sliding speed */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-700 dark:text-slate-350 font-semibold">Szybkość przesuwu (Sliding Velocity):</span>
                <span className="font-mono text-cyan-400 font-bold">{slidingSpeed} mm/s</span>
              </div>
              <input
                type="range"
                min="50"
                max="800"
                step="50"
                value={slidingSpeed}
                onChange={(e) => setSlidingSpeed(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Friction lubricating mode */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-350 block">Środki smarne stempli (Tribo-Lubrication):</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dry', label: 'Suche (Dry)' },
                  { id: 'grease', label: 'Smar GMP' },
                  { id: 'solid-film', label: 'Powłoka Teflon' }
                ].map((lub) => (
                  <button
                    key={lub.id}
                    onClick={() => setLubrication(lub.id as any)}
                    className={`py-2 px-2 border rounded-xl font-mono text-[10px] cursor-pointer transition-all ${
                      lubrication === lub.id 
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 font-bold' 
                        : 'border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lub.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Atomic meter details readout */}
          <div className="bg-[#0b1329] p-5 rounded-2xl border border-white/5 space-y-3.5 text-xs font-mono">
            <span className="text-[10px] text-cyan-400 block font-bold uppercase tracking-wider">
              Anometria tarcia i temperatura flash:
            </span>

            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>WSPÓŁCZYNNIK TARCIA MIKRO (μ):</span>
              <span className={`font-black text-sm ${
                frictionCoeff > 0.35 ? 'text-rose-450' : 'text-emerald-400'
              }`}>{frictionCoeff}</span>
            </div>

            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>TEMPERATURA STRUKTURALNA STYKU:</span>
              <span className={`font-black text-sm ${
                frictionTemp > 95 ? 'text-orange-500 font-bold' : 'text-cyan-350'
              }`}>{frictionTemp} °C</span>
            </div>

            <div className="flex justify-between">
              <span>NAPREŻENIE ŚCINAJĄCE (SHEAR):</span>
              <span className="font-black text-emerald-450 text-sm">{shearStress} MPa</span>
            </div>
          </div>
        </div>

        {/* Right column viewports (60%) */}
        <div className="lg:col-span-7">
          <div className="bg-[#05070d] p-4 border border-slate-805 rounded-2xl h-[360px] flex flex-col justify-between overflow-hidden relative">
            <span className="text-[10px] font-mono text-cyan-400 block border-b border-white/5 pb-2">
              NANOSTRUCTURE RENDERER: Skan powierzchni roboczej stempla o chropowatości cząsteczkowej
            </span>

            <div className="flex-1 my-3 relative rounded-xl overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full block rounded-xl" />
            </div>

            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 border-t border-white/5 pt-2">
              <span>Piezoceramiczny sterownik mikroskopu AFM-7</span>
              <span>Kalibracja: ASTM G133</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
