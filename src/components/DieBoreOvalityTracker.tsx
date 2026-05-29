import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CircleDot, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  RefreshCw, 
  Zap, 
  Binary, 
  ClipboardCheck, 
  Activity,
  Layers
} from 'lucide-react';

interface DieBoreOvalityTrackerProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

interface StationInfo {
  id: number;
  label: string;
  measuredX: number; // in mm
  measuredY: number; // in mm
  scoringIndex: number; // out of 10
  status: 'clean' | 'warning' | 'failed';
}

export const DieBoreOvalityTracker: React.FC<DieBoreOvalityTrackerProps> = ({
  theme,
  isLight,
  addToast
}) => {
  const [stations, setStations] = useState<StationInfo[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number>(1);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'tracker' | 'sop_maintenance'>('tracker');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize 16 turret stations with realistic initial wear on startup
  useEffect(() => {
    const list: StationInfo[] = [];
    for (let i = 1; i <= 16; i++) {
      let x = 24.002;
      let y = 24.001;
      let score = 1;
      let status: 'clean' | 'warning' | 'failed' = 'clean';

      // Introduce some random wear at stations 4, 9, 13
      if (i === 4) {
        x = 24.018;
        y = 23.992;
        score = 4;
        status = 'warning';
      } else if (i === 9) {
        x = 24.041;
        y = 23.978;
        score = 8;
        status = 'failed';
      } else if (i === 13) {
        x = 24.015;
        y = 24.001;
        score = 3;
        status = 'warning';
      } else {
        // slight normal variation
        const varX = Math.random() * 0.005;
        const varY = Math.random() * 0.003;
        x = parseFloat((24.000 + varX).toFixed(3));
        y = parseFloat((24.000 + varY).toFixed(3));
        score = Math.floor(Math.random() * 2) + 1;
      }

      list.push({
        id: i,
        label: `Gniazdo #${i}`,
        measuredX: x,
        measuredY: y,
        scoringIndex: score,
        status: status
      });
    }
    setStations(list);
  }, []);

  const selectedStation = stations.find(s => s.id === selectedStationId) || stations[0];

  // Dynamic calculations for selected station
  const baseDiameter = 24.000; // Standard perfect die inner diameter in mm
  const actualX = selectedStation ? selectedStation.measuredX : baseDiameter;
  const actualY = selectedStation ? selectedStation.measuredY : baseDiameter;
  const ovalityDeviationMm = Math.abs(actualX - actualY);
  const ovalityDeviationUm = parseFloat((ovalityDeviationMm * 1000).toFixed(1)); // to micrometers

  // Determine grading matching standard SOP tolerances
  // <10um: Clean
  // 10um to 25um: Warn
  // >25um: Fail
  const getStationGrade = (um: number) => {
    if (um < 10.0) return { label: 'SPRAWNA (Zgodny)', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-300', status: 'clean' };
    if (um >= 10.0 && um <= 25.0) return { label: 'TOLERANCJA OSTRZEGAWCZA (Zalecane honowanie)', color: 'text-amber-500 bg-amber-500/10 border-amber-300', status: 'warning' };
    return { label: 'KRYTYCZNA OVALNOŚĆ (Blokada / Wymiana)', color: 'text-rose-500 bg-rose-500/10 border-rose-300', status: 'failed' };
  };

  const currentGrade = getStationGrade(ovalityDeviationUm);

  // Cross section mesh generator in real-time
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let pulseAngle = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    handleResize();

    const render = () => {
      pulseAngle += 0.04;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Cyber space
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, w, h);

      // Radar grids
      ctx.strokeStyle = '#111e36';
      ctx.lineWidth = 1;
      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = h * 0.35;

      // concentric target circles
      ctx.beginPath(); ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, baseRadius * 0.75, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, baseRadius * 0.5, 0, Math.PI * 2); ctx.stroke();

      // Crosshairs
      ctx.beginPath(); ctx.moveTo(cx - baseRadius - 20, cy); ctx.lineTo(cx + baseRadius + 20, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - baseRadius - 20); ctx.lineTo(cx, cy + baseRadius + 20); ctx.stroke();

      // 1. Draw Perfect circular wireframe (Target 24.000mm)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // 2. Draw Actual Measured distorted mesh (exaggerated by x600 for visual clarity!)
      // Deviation: X diameter vs Y diameter of station
      // actualX relative to baseDiameter
      const devRatioX = actualX / baseDiameter;
      const devRatioY = actualY / baseDiameter;

      const scaleMultiplier = 550; // visual exaggeration of microns
      const stretchRadX = baseRadius + (actualX - baseDiameter) * scaleMultiplier;
      const stretchRadY = baseRadius + (actualY - baseDiameter) * scaleMultiplier;

      const isWarningOrFailed = ovalityDeviationUm >= 10.0;
      const meshColor = ovalityDeviationUm > 25.0 ? '239, 68, 68' : isWarningOrFailed ? '245, 158, 11' : '34, 211, 238';

      // Shape filling
      ctx.fillStyle = `rgba(${meshColor}, 0.12)`;
      ctx.beginPath();
      const segments = 120;
      for (let i = 0; i < segments; i++) {
        const phi = (i / segments) * Math.PI * 2;
        // Interpolate radius based on elliptical deformation formula
        const rx = Math.cos(phi);
        const ry = Math.sin(phi);
        const currentRad = Math.sqrt(
          (stretchRadX * stretchRadX * stretchRadY * stretchRadY) /
          (stretchRadY * stretchRadY * rx * rx + stretchRadX * stretchRadX * ry * ry)
        );
        const px = cx + currentRad * Math.cos(phi);
        const py = cy + currentRad * Math.sin(phi);

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Bold contour line of measured mesh
      ctx.strokeStyle = `rgb(${meshColor})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 3. Coordinate measuring probe animation sweep if measuring
      if (isMeasuring) {
        const scannerAngle = pulseAngle * 1.5;
        const scanLineX = cx + Math.cos(scannerAngle) * (baseRadius + 15);
        const scanLineY = cy + Math.sin(scannerAngle) * (baseRadius + 15);

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(scanLineX, scanLineY);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(scanLineX, scanLineY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('PNEUMATIC PROBE MEASURING...', 12, h - 14);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '7px monospace';
        ctx.fillText(`ID_DIE: STATION-${selectedStationId} | KALIBRATOR: MET-P01`, 12, h - 14);
      }

      // Live annotations pointing to deformation peaks
      ctx.fillStyle = `rgb(${meshColor})`;
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`oX: ${actualX.toFixed(3)} mm`, cx + stretchRadX + 8, cy + 4);
      ctx.fillText(`oY: ${actualY.toFixed(3)} mm`, cx - 35, cy - stretchRadY - 8);

      animFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrame);
  }, [actualX, actualY, selectedStationId, isMeasuring, ovalityDeviationUm]);

  // Adjust parameters manually via slider inputs
  const handleUpdateDiameter = (axis: 'X' | 'Y', val: number) => {
    if (!selectedStation) return;
    const fixedVal = parseFloat(val.toFixed(3));
    
    setStations(prev => prev.map((item) => {
      if (item.id === selectedStation.id) {
        const nextX = axis === 'X' ? fixedVal : item.measuredX;
        const nextY = axis === 'Y' ? fixedVal : item.measuredY;
        const deltaUm = Math.abs(nextX - nextY) * 1000;
        
        let status: 'clean' | 'warning' | 'failed' = 'clean';
        if (deltaUm >= 10.0 && deltaUm <= 25.0) status = 'warning';
        if (deltaUm > 25.0) status = 'failed';

        return {
          ...item,
          measuredX: nextX,
          measuredY: nextY,
          status: status
        };
      }
      return item;
    }));
  };

  // Automated CNC pneumatic pneumatic probe caliber test logic
  const handleTriggerStationCalibrate = () => {
    if (isMeasuring) return;
    setIsMeasuring(true);

    addToast(
      `Badanie gniazda #${selectedStationId}`,
      `Głowica pomiarowa CNC zstępuje do matrycy gniazda. Trwa pomiar ciśnieniowy sprężonego powietrza.`,
      'info'
    );

    setTimeout(() => {
      setIsMeasuring(false);
      // Recalculate slightly or reset to perfect centered tolerances
      setStations(prev => prev.map((item) => {
        if (item.id === selectedStationId) {
          // calibrate to normal
          return {
            ...item,
            measuredX: 24.004,
            measuredY: 24.002,
            scoringIndex: 1,
            status: 'clean'
          };
        }
        return item;
      }));

      addToast(
        'Kalibracja skończona',
        `Wzorowanie gniazda #${selectedStationId} ukończone. Wynik w normie tolerancji rzędu H7.`,
        'success'
      );
    }, 2800);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/5 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-[#00ca9a] font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#00ca9a]" /> PROPOZYCJA C: DIE-BORE OVALITY & TURRET TRACKER
          </span>
          <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white">
            Interaktywny Kalibrator i Pasowanie Gniazd Turretu
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Monitor gniazd matrycowych (Die Station Array). Ovalność gniazd prowadzi do sypania proszku pod talerz i uszkadzania stempli. Wykryj deformaty eliptyczne przed rozpoczęciem kampanii GMP.
          </p>
        </div>
      </div>

      {/* Nav menu tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-3">
        <button
          onClick={() => setActiveTab('tracker')}
          className={`pb-3 text-xs font-bold font-mono px-1 flex items-center gap-1.5 transition-all outline-none ${
            activeTab === 'tracker' 
              ? 'text-[#00ca9a] border-b-2 border-[#00ca9a] font-semibold' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <CircleDot className="w-3.5 h-3.5" /> DIALER INTRUZYJNY G-MATRIX
        </button>
        <button
          onClick={() => setActiveTab('sop_maintenance')}
          className={`pb-3 text-xs font-bold font-mono px-1 flex items-center gap-1.5 transition-all outline-none ${
            activeTab === 'sop_maintenance' 
              ? 'text-[#00ca9a] border-b-2 border-[#00ca9a] font-semibold' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" /> RECEPTURA I INSTRUKCJA SOP-GMP
        </button>
      </div>

      {activeTab === 'tracker' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column Local Turret Matrix (35%) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/10 shadow-3xs space-y-3.5">
              <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase tracking-wider">
                Głowica Turretu (16-Station Radial Dial):
              </span>

              {/* Radial or Grid selection mapping */}
              <div className="grid grid-cols-4 gap-2.5">
                {stations.map((sta) => {
                  const isSelected = selectedStationId === sta.id;
                  
                  let bgBorderColor = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350';
                  if (sta.status === 'warning') {
                    bgBorderColor = 'bg-amber-500/5 border-amber-500/40 text-amber-500 dark:text-amber-400';
                  } else if (sta.status === 'failed') {
                    bgBorderColor = 'bg-rose-500/5 border-rose-500/40 text-rose-500 dark:text-rose-450';
                  }

                  if (isSelected) {
                    bgBorderColor = 'bg-emerald-500 text-[#001730] border-emerald-400 font-extrabold shadow';
                  }

                  return (
                    <button
                      key={sta.id}
                      onClick={() => {
                        setSelectedStationId(sta.id);
                        setIsMeasuring(false);
                      }}
                      className={`h-12 flex flex-col justify-center items-center rounded-xl border text-[11px] font-mono cursor-pointer transition-all active:scale-90 hover:brightness-105 ${bgBorderColor}`}
                    >
                      <span className="text-[10px] uppercase font-bold">St.</span>
                      <span className="text-sm font-black">{sta.id}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-between text-[10px] font-mono text-slate-400 border-t border-slate-100 dark:border-white/5">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Sprawny</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Honowanie</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Krytyczny</span>
              </div>
            </div>

            {/* Micro metrological profile of the selected bore */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl border border-white/5 space-y-4 font-mono text-xs">
              <span className="text-[10px] text-cyan-400 block font-bold border-b border-white/5 pb-2">METROLOGIA ST-#{selectedStationId}:</span>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Nominalna średnica:</span>
                  <span className="font-bold text-slate-300">24.000 mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Rzeczywisty osiowy X:</span>
                  <span className="font-bold text-[#00ca9a]">{actualX.toFixed(3)} mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Rzeczywisty osiowy Y:</span>
                  <span className="font-bold text-[#00ca9a]">{actualY.toFixed(3)} mm</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2">
                  <span>Suma zniekształcenia:</span>
                  <span className={`font-bold ${ovalityDeviationUm > 20 ? 'text-rose-455' : 'text-cyan-400'}`}>
                    {ovalityDeviationUm} μm
                  </span>
                </div>
              </div>

              <div className={`p-3 border rounded-xl rounded-b-none text-center font-bold text-[10px] ${currentGrade.color}`}>
                {currentGrade.label}
              </div>
            </div>
          </div>

          {/* Column Mesh Visualizer Canvas (40%) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-[#05070f] rounded-2xl border border-slate-800 p-4 h-[330px] relative overflow-hidden flex flex-col justify-between">
              
              {/* Floating stats */}
              <div className="absolute top-4 left-4 text-[9px] font-mono text-emerald-400 space-y-0.5">
                <div>PROBE APERTURE H7</div>
                <div className="text-slate-500">ZOOM MULTIPLIER: x550</div>
              </div>

              <div className="flex-1 max-h-[250px]">
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>

              {/* Reset calibrator */}
              <div className="pt-2">
                <button
                  onClick={handleTriggerStationCalibrate}
                  disabled={isMeasuring}
                  className="w-full flex items-center justify-center gap-2 bg-[#02b37d] hover:bg-[#039e6f] active:scale-95 transition-all text-slate-950 font-mono font-black text-xs uppercase py-3 px-4 rounded-xl shadow-md cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isMeasuring ? 'animate-spin' : ''}`} />
                  {isMeasuring ? 'Trwa testowanie die-bore...' : 'AUTOKALIBRACJA CZUJNIKIEM MET-CNC'}
                </button>
              </div>
            </div>
          </div>

          {/* Column Sliders calibration manual fine-tune (25%) */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-[#0b1329] p-5 rounded-2xl border border-slate-205 dark:border-white/10 shadow-3xs space-y-4 h-full">
              <span className="text-xs font-bold font-mono text-slate-700 dark:text-white uppercase block border-b border-slate-100 dark:border-white/5 pb-2.5">
                Korekta Manualna (Sztuczne zużycie):
              </span>

              <div className="space-y-4.5 pt-1">
                {/* Diameter X Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-500">ŚREDNICA X:</span>
                    <span className="font-bold text-[#00ca9a]">{actualX.toFixed(3)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="23.950"
                    max="24.080"
                    step="0.001"
                    value={actualX}
                    disabled={isMeasuring}
                    onChange={(e) => handleUpdateDiameter('X', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00ca9a]"
                  />
                </div>

                {/* Diameter Y Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-500">ŚREDNICA Y:</span>
                    <span className="font-bold text-[#00ca9a]">{actualY.toFixed(3)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="23.950"
                    max="24.080"
                    step="0.001"
                    value={actualY}
                    disabled={isMeasuring}
                    onChange={(e) => handleUpdateDiameter('Y', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00ca9a]"
                  />
                </div>
              </div>

              {/* Troubleshooting warning info */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/40 text-[10px] font-mono leading-relaxed text-slate-500 space-y-1.5 mt-8">
                <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase">Porada Diagnostyczna:</span>
                <p>
                  Jeśli owalność przekracza <span className="font-bold text-amber-500">10.0 μm</span>, konieczne jest wyjęcie matrycy i poddanie jej procesowi honowania re-geometrycznego na maszynie polerskiej. Powyżej <span className="font-bold text-rose-500">25.0 μm</span> dochodzi do nieodwracalnego rozciągnięcia matrycy - matryca kwalifikuje się do złomowania.
                </p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        // SOP Guideline documentation content matching compliance checklists
        <div className="bg-white dark:bg-[#0b1329] p-6 rounded-2xl border border-slate-205 dark:border-white/5 shadow-sm space-y-4 max-w-4xl">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-3">
            <ClipboardCheck className="w-5 h-5 text-[#00ca9a]" />
            <h3 className="text-sm font-bold font-display text-slate-800 dark:text-white uppercase">
              PROCEDURA SOP-GMP-BIOF-099: INTEGRALNOŚĆ I PASOWANIE GNIAZD MATRYCOWYCH
            </h3>
          </div>

          <div className="space-y-3.5 text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed">
            <p className="font-bold text-slate-800 dark:text-white">1. PARAMETRY GEOMETRYCZNE MATRYCY:</p>
            <p>
              Każde gniazdo matrycowe poddawane jest automatycznemu testowi kalibracji pneumatycznej co najmniej raz przed rozpoczęciem serii GMP. Tolerancja błędu kołowości (ovalności) wynosi maksymalnie 10.0 μm. Odchylenie powyżej tej wartości generuje krytyczne tarcie i stwardnienie granulatu przy krawędzi stołu, prowadzące do "zatrzaskiwania" stempli.
            </p>

            <p className="font-bold text-slate-800 dark:text-white">2. WPŁYW ZUŻYCIA PILOTA MATRYC:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Średnica nominalna d0 = 24.000 mm (Klasa tolerancji pasowania ISO H7).</li>
              <li>Wskaźniki mikro-rys (scathing) o głębokości powyżej 5 μm kwalifikują gniazdo do natychmiastowej regeneracji.</li>
              <li>Podczas montażu nowego kompletu stempli bęben matrycowy musi być wolny od zabrudzeń stałych leku o średnicy &gt;0.1 μm.</li>
            </ul>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex items-start gap-3 mt-4 text-slate-700 dark:text-slate-300">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-500 block uppercase text-[10px]">UWAGA GMP SECURITY LIMIT:</span>
                Praca z owalnością rzędu &gt;25.0 μm grozi urwaniem główki stempla pod wpływem przeciążeń poprzecznych tnących przy nacisku prasy powyżej 40kN! Nastąpi wtedy blokada bezpieczeństwa.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
