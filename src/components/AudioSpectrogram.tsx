import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Volume2, 
  VolumeX, 
  Activity, 
  Gauge, 
  Sliders, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle,
  Zap,
  CheckCircle,
  HelpCircle,
  Info
} from 'lucide-react';

interface AudioSpectrogramProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

export const AudioSpectrogram: React.FC<AudioSpectrogramProps> = ({
  theme,
  isLight,
  addToast
}) => {
  // Acoustic and spectral diagnostic parameters states
  const [rotationSpeedHz, setRotationSpeedHz] = useState<number>(1.2); // 1.2 Hz = 72 RPM
  const [impactAmplitude, setImpactAmplitude] = useState<number>(45); // Db spike amplitude representation of punch hits
  const [bearingHumFreq, setBearingHumFreq] = useState<number>(310); // Hz background motor hum
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [noiseStatus, setNoiseStatus] = useState<'optim' | 'warn' | 'crit'>('optim');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const spectrogramData = useRef<number[]>(Array(100).fill(0)); // Circular frequency memory
  const sliceIndexRef = useRef<number>(0);

  // Sound generator synthesizing real machinery rotating sound (FDA safe)
  const toggleMachineryAudio = () => {
    if (isAudioEnabled) {
      // Disconnect current running active oscillators nicely
      try {
        if (oscRef.current) oscRef.current.stop();
        audioCtxRef.current?.close();
      } catch (e) {}
      setIsAudioEnabled(false);
      addToast('SPEKTROGRAM AKUSTYCZNY WYŁĄCZONY', 'Dźwięk referencyjny wyciszony.', 'info');
    } else {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtxClass();
        audioCtxRef.current = ctx;

        // Background rotation deep hum generator
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(bearingHumFreq, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.02, ctx.currentTime);

        osc.start();
        oscRef.current = osc;
        gainRef.current = gainNode;

        // Periodic high-speed stamp clicks (Klapnięcia stempli) based on rotation Speed (Hz)
        const clickInterval = setInterval(() => {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            clearInterval(clickInterval);
            return;
          }
          // Dynamic punch strike click trigger synthesizer
          const stampOsc = audioCtxRef.current.createOscillator();
          const stampGain = audioCtxRef.current.createGain();
          stampOsc.connect(stampGain);
          stampGain.connect(audioCtxRef.current.destination);

          stampOsc.type = 'triangle';
          stampOsc.frequency.setValueAtTime(1200, audioCtxRef.current.currentTime);
          stampOsc.frequency.exponentialRampToValueAtTime(100, audioCtxRef.current.currentTime + 0.1);

          stampGain.gain.setValueAtTime(0.04 * (impactAmplitude / 50), audioCtxRef.current.currentTime);
          stampGain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.1);

          stampOsc.start();
          stampOsc.stop(audioCtxRef.current.currentTime + 0.12);
        }, (1 / rotationSpeedHz) * 1000);

        setIsAudioEnabled(true);
        addToast('REPRODUKCJA SYGNAŁU AKUSTYCZNEGO', 'Odpalono syntetyzer widma wibracji maszynowych lekarstwa.', 'success');
      } catch (err) {
        addToast('BLOKADA AUDIO', 'Zezwól przeglądarce na odtwarzanie multimediów w ustawieniach!', 'warning');
      }
    }
  };

  // Clean-up oscillators on unmount
  useEffect(() => {
    return () => {
      try {
        if (oscRef.current) oscRef.current.stop();
        audioCtxRef.current?.close();
      } catch (e) {}
    };
  }, []);

  // Update dynamic background Hum frequency in real-time
  useEffect(() => {
    if (isAudioEnabled && oscRef.current && audioCtxRef.current) {
      oscRef.current.frequency.setValueAtTime(bearingHumFreq, audioCtxRef.current.currentTime);
    }
    // Update alarm status depending on parameters
    if (impactAmplitude > 75 || bearingHumFreq > 480) {
      setNoiseStatus('crit');
    } else if (impactAmplitude > 52 || bearingHumFreq > 360) {
      setNoiseStatus('warn');
    } else {
      setNoiseStatus('optim');
    }
  }, [bearingHumFreq, impactAmplitude, isAudioEnabled]);

  // Main canvas spectrogram waterfall rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Buffer to hold historic spectrogram slices (Waterfall effect)
    const waterfallRows: number[][] = [];
    const maxWaterfallRows = 140;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw technical blueprint grid rules
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(236, 72, 153, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      }

      // Generate simulated diagnostic spectral slices in real-time
      const frequenciesCount = 64;
      const currentSlice: number[] = [];
      const timeMs = Date.now() * 0.001;

      for (let f = 0; f < frequenciesCount; f++) {
        // Base ambient floor noise
        let val = Math.random() * 8;

        // Peak corresponding to engine humming frequency (harmonics at 1x, 2x, 3x)
        const humBin = Math.floor(bearingHumFreq / 10);
        if (Math.abs(f - humBin) < 3) {
          val += (3 - Math.abs(f - humBin)) * 14;
        }

        // Periodic high energy spikes representing punch micro-strikes clicks
        const clickDuty = Math.sin(timeMs * rotationSpeedHz * Math.PI * 2);
        if (clickDuty > 0.94) {
          // high energy impact spectrum
          val += (Math.random() * 4 + 4) * (impactAmplitude * 0.16);
        }

        currentSlice.push(Math.min(100, val));
      }

      // Add to historic scrolling memory
      waterfallRows.unshift(currentSlice);
      if (waterfallRows.length > maxWaterfallRows) {
        waterfallRows.pop();
      }

      // 1. Draw Waterfall visualization (Historic spectra scrolling downward)
      const graphH = h - 110; // Reserve bottom area for oscilloscope/waveform line
      const cellW = w / frequenciesCount;
      const cellH = graphH / maxWaterfallRows;

      for (let y = 0; y < waterfallRows.length; y++) {
        const row = waterfallRows[y];
        for (let x = 0; x < row.length; x++) {
          const power = row[x];
          
          // Compute color map representing thermal acoustics signature
          // Red-gold for critical spikes, violet-blue for silent floor
          const r = Math.floor((power / 100) * 235);
          const g = Math.floor((power / 100) * 115);
          const b = Math.floor(55 + (1 - power / 100) * 180);

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
        }
      }

      // 2. Draw Waveform oscilloscope sweep on the lower panel
      ctx.strokeStyle = isLight ? '#0f172a' : '#10b981';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      
      const waveYBase = h - 60;
      for (let sx = 0; sx < w; sx++) {
        const theta = (sx / w) * Math.PI * 18;
        // Superimposed frequencies mimicking bearing noise + rotating vibration spikes
        let offset = Math.sin(theta + timeMs * 11) * 12;
        offset += Math.sin(theta * 3.4 - timeMs * 4) * 6;

        const clickPulse = Math.sin((sx + timeMs * 180) * 0.08);
        if (Math.abs(clickPulse) > 0.94) {
          offset += (Math.random() - 0.5) * impactAmplitude * 0.44; // static vibration click
        }
        
        const sy = waveYBase + offset;
        if (sx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Labels info
      ctx.fillStyle = isLight ? '#0f172a' : '#22d3ee';
      ctx.font = '8px monospace';
      ctx.fillText('SPECTRO DIAGNOSTIC WATERFALL (ACUTE EMISSION)', 14, 20);
      ctx.fillText(`ROTATION SPEED HZ: ${rotationSpeedHz.toFixed(2)} Hz`, 14, h - 10);
      ctx.fillText(`BEARING MOTOR FREQ: ${bearingHumFreq} Hz`, w - 180, h - 10);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [rotationSpeedHz, impactAmplitude, bearingHumFreq, isLight]);

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
                <Activity className="w-5 h-5 animate-pulse text-emerald-400" />
              </span>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ISO Class 5 - Spectroscopic Acoustic Emissions
                </span>
                <h1 className={`text-xl lg:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Spatial Audio Spectrogram (Akustyka Wiru)
                </h1>
              </div>
            </div>
            <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Wizualizacja spektralna drgań i szumów ultradźwiękowych tabletkarki Biofarm. Spektrogram kołowy i analizator wodospadowy
              (Waterfall chart) pozwalają zidentyfikować mikro-pęknięcia powierzchni stempli na podstawie odgłosów uderzenia.
            </p>
          </div>
        </div>
      </div>

      {/* WORKSPACE VIEWPORT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* WATERFALL SPECTRA CANVAS COMPONENT */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`rounded-xl p-5 relative overflow-hidden flex flex-col items-center ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            
            {/* Header toolbar */}
            <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-slate-700/10">
              <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                <Volume2 className="w-4 h-4 text-biofarm-cyan" /> Wodospad Emisyjny Wibroakustyki
              </h3>

              {/* Synthesizer triggering control button */}
              <button
                onClick={toggleMachineryAudio}
                className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all ${
                  isAudioEnabled 
                    ? 'bg-rose-500 text-white shadow shadow-rose-500/20' 
                    : isLight ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-white/5 text-slate-400 border border-white/5'
                }`}
              >
                {isAudioEnabled ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isAudioEnabled ? 'STOP MACHINERY AUDIO' : 'LISTEN LIVE EMISSION SYNTH'}
              </button>
            </div>

            {/* Spectrogram digital stage */}
            <div className={`w-full p-4 flex items-center justify-center rounded-xl border relative overflow-hidden ${
              isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950 border-white/5'
            }`}>
              <canvas
                ref={canvasRef}
                width={550}
                height={320}
                className="max-w-full h-auto drop-shadow"
              />

              {/* Holographic matrix status details */}
              <div className="absolute top-4 right-4 flex flex-col gap-0.5 text-[8px] font-mono text-cyan-400 text-right opacity-80">
                <div>ACOUSTIC_STATUS: {noiseStatus.toUpperCase()}</div>
                <div>SAMPLING_RATE: 22.05 kHz</div>
                <div>BANDWIDTH_LIMIT: 400 - 1500 Hz</div>
              </div>
            </div>

            {/* SLIDERS FOR VIBRATIONAL FREQUENCIES AND CLICK INTENSITIES */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 pt-4 border-t border-slate-700/15">
              
              {/* SPEED FREQUENCY (Hz) */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Częstotliwość Obrotowa (Hz):</span>
                  <span className="font-extrabold text-cyan-400">{rotationSpeedHz.toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.05"
                  value={rotationSpeedHz}
                  onChange={(e) => setRotationSpeedHz(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>0.5 Hz (~30 RPM)</span>
                  <span>4.0 Hz (~240 RPM)</span>
                </div>
              </div>

              {/* IMPACT CLICK STAMP Db */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Głośność klapnięć stempla:</span>
                  <span className="font-extrabold text-rose-500">{impactAmplitude} dB</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={impactAmplitude}
                  onChange={(e) => setImpactAmplitude(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Cichy Chód</span>
                  <span className="text-red-500">Micro-cracks &gt; 80dB</span>
                </div>
              </div>

              {/* BEARING HUMMING Hz */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Dźwięk referencyjny silnika:</span>
                  <span className="font-extrabold text-[#0b4596] dark:text-cyan-400">{bearingHumFreq} Hz</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="600"
                  step="5"
                  value={bearingHumFreq}
                  onChange={(e) => setBearingHumFreq(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Niski Hum (150Hz)</span>
                  <span>Wykotłania (600Hz)</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: ACOUSTIC HEALTH CLASSIFICATION CARDS */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* HARMONICS CLASSIFY CARD */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Gauge className="w-4 h-4 text-biofarm-cyan" /> Diagnostyka Drgań i Luzów
            </h2>

            <div className="space-y-3.5 text-[10px] font-mono">
              <div className="p-3 rounded-lg bg-slate-950/40 text-center flex flex-col gap-0.5">
                <span className="text-[8px] text-slate-500 uppercase">Wskaźnik Emisji Akustycznej</span>
                <span className={`text-lg font-black ${
                  noiseStatus === 'crit' ? 'text-red-400 animate-pulse' : noiseStatus === 'warn' ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {noiseStatus === 'crit' ? 'KRYTYCZNE LUZY ROLKI' : noiseStatus === 'warn' ? 'PITYNG KRAWĘDZIOWY' : 'DYSK STABILNY'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-700/10">
                <span className="text-slate-500">Częstotliwość podwójna (2x):</span>
                <span>{(bearingHumFreq * 2)} Hz</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-700/10">
                <span className="text-slate-500">Harmoniczna krytyczna stempla:</span>
                <span className="text-cyan-400">{(rotationSpeedHz * 36).toFixed(1)} Hz</span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">Zgodność z normą wibracji ISO:</span>
                <span className="text-emerald-500">NORMAL STABLE</span>
              </div>
            </div>
          </div>

          {/* DETAILED ACCURATE REPORT NOTE */}
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Detekcja Pęknięć Mikroskopowych (Acoustic Crack detection)
            </h2>
            <p className={`text-[10px] leading-relaxed font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Badania wibroakustyczne udowadniają, że rozwijające się mikropęknięcia rdzenia ze stali szybkotnącej HSS emitują fale sprężyste o bardzo wysokiej częstotliwości (rzędu kilkunastu kHz) w momencie uderzenia o rolkę prasującą. Stały monitor spektroskopu zabezpiecza całą tabletkarkę przed nagłą mechaniczną katastrofą (pęknięciem stempla i zablokowaniem całego bębna wirnika).
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
