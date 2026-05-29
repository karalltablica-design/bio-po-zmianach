import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Camera, CameraOff, X, Maximize2, CheckCircle, AlertTriangle, Barcode } from 'lucide-react';
import { ToolSet } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolSets: ToolSet[];
  onScanSuccess: (toolsetId: string) => void;
  initialScanId?: string | null;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  toolSets,
  onScanSuccess,
  initialScanId,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'QR' | 'BARCODE'>('QR');

  // Trigger auto-simulation if initialScanId is specified
  useEffect(() => {
    if (isOpen && initialScanId) {
      handleSimulateScan(initialScanId);
    }
  }, [isOpen, initialScanId]);

  // Initialize and stop camera stream
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setCameraError(null);
    setScannedId(null);

    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        // Request browser camera stream
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsLoading(false);
      } catch (err: any) {
        console.warn('Camera blocked or unavailable:', err);
        setCameraError(
          'Nie udało się uzyskać bezpośredniego dostępu do aparatu (brak sprzętu, niebezpieczny protokół lub zablokowane uprawnienia w ramce premium).'
        );
        setIsLoading(false);
      }
    }

    startCamera();

    return () => {
      // Cleanup tracks
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleSimulateScan = (id: string) => {
    setScannedId(id);
    
    // Play virtual scan sound sequence if browser context permits (or standard alert glow)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(1240, audioCtx.currentTime); // High pitch beep
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // Fallback if audio context block
    }

    // Trigger success callback after brief simulated delay
    setTimeout(() => {
      onScanSuccess(id);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark blur backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-2xl bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-750 font-sans z-10 flex flex-col md:flex-row h-[560px] md:h-[480px]"
      >
        {/* Glow accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-biofarm-blue via-biofarm-cyan to-[#00ca9a]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-full transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left column: Camera Scan viewport */}
        <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-6 h-1/2 md:h-full">
          
          {/* Scan Mode Switch Toggle overlay */}
          <div className="absolute top-4 left-4 z-40 bg-slate-950/90 border border-slate-800 p-1 rounded-xl flex gap-1 select-none">
            <button
              type="button"
              onClick={() => setScanMode('QR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                scanMode === 'QR'
                  ? 'bg-biofarm-blue text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR 2D</span>
            </button>
            <button
              type="button"
              onClick={() => setScanMode('BARCODE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                scanMode === 'BARCODE'
                  ? 'bg-biofarm-blue text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>EAN 1D</span>
            </button>
          </div>

          {isLoading && (
            <div className="text-center z-10 space-y-3">
              <div className="w-10 h-10 border-4 border-biofarm-blue border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-mono">Inicjalizowanie sensora optycznego...</p>
            </div>
          )}

          {!cameraError && !isLoading && (
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover opacity-80"
              />
              
              {/* Dynamic animated target box overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`relative ${scanMode === 'QR' ? 'w-48 h-48 rounded-2xl font-sans' : 'w-72 h-24 rounded-xl font-sans'} border border-white/25 flex items-center justify-center transition-all duration-300`}>
                  {/* Glowing corners */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-[#00ca9a]" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-[#00ca9a]" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-[#00ca9a]" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-[#00ca9a]" />
                  
                  {/* Pulsing Target Laser line */}
                  <motion.div 
                    animate={scanMode === 'QR' ? { y: [-92, 92] } : { y: [-44, 44] }}
                    transition={{
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 1.8,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#00ca9a] to-transparent shadow-[0_0_10px_2px_rgba(0,202,154,0.5)]"
                  />
                  
                  {scanMode === 'QR' ? (
                    <QrCode className="w-16 h-16 text-white/10" />
                  ) : (
                    <Barcode className="w-16 h-16 text-white/10" />
                  )}
                </div>
              </div>

              {/* Status bar */}
              <div className="absolute bottom-4 inset-x-4 bg-slate-900/95 border border-slate-800 p-3 rounded-xl flex items-center gap-2 text-xs backdrop-blur-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Sensor {scanMode}</span>
                <span className="text-slate-400 text-[10px] truncate ml-auto">
                  {scanMode === 'QR' ? 'Skoncentruj kod QR w ramce' : 'Skoncentruj kod kreskowy 1D (EAN/UPC) w ramce'}
                </span>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="text-center p-6 z-10 space-y-4 max-w-xs">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-550/20">
                <CameraOff className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Dostęp do kamery zablokowany
              </p>
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                Przeglądarka zablokowała kamerę z powodu restrykcji pochodzenia iframe (Chrome Sandbox), lub nie wykryto aktywnego sprzętu.
              </p>
              <div className="text-[11px] bg-slate-800/80 px-2.5 py-1.5 rounded-lg text-amber-400 font-mono inline-block">
                ➔ Użyj panelu symulacji po prawej
              </div>
            </div>
          )}

          {/* Success Flash Overlay */}
          <AnimatePresence>
            {scannedId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#00ca9a]/90 flex flex-col items-center justify-center gap-3 z-30 font-sans"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-xl"
                >
                  <CheckCircle className="w-10 h-10" />
                </motion.div>
                <div className="text-center text-white p-4">
                  <h3 className="font-bold text-sm tracking-wide uppercase">
                    {scanMode === 'QR' ? 'KOD QR ROZPOZNANY!' : 'KOD KRESKOWY ROZPOZNANY!'}
                  </h3>
                  <p className="text-xs font-mono font-bold mt-1 bg-black/20 px-3 py-1 rounded-full inline-block">
                    {scanMode === 'QR' ? `SET-${scannedId}` : `EAN-13: 590000000${scannedId.padStart(4, '0')}`}
                  </p>
                  <p className="text-[10px] text-white/80 mt-2 font-mono">Przekierowywanie do raportu walidacyjnego...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: Simulate or select toolsets list */}
        <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col bg-slate-900/90 h-1/2 md:h-full">
          <div className="p-4 border-b border-slate-850">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-biofarm-cyan" />
              Szybka symulacja GMP
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Wybierz komplet stempli, aby natychmiastowo symulować udany odczyt sensora {scanMode === 'QR' ? 'QR Code' : 'EAN 1D Barcode'}.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {toolSets.map((set) => {
              const wearRatio = (set.uzycieGlowne / set.uzycieLimit) * 100;
              const eanCode = `590000000${set.id.padStart(4, '0')}`;
              
              return (
                <button
                  key={set.id}
                  onClick={() => handleSimulateScan(set.id)}
                  disabled={scannedId !== null}
                  className="w-full px-3 py-2.5 bg-slate-800/55 hover:bg-slate-800/95 rounded-xl border border-slate-750 hover:border-slate-650 flex flex-col text-left transition-all group disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[11px] font-mono font-black text-biofarm-cyan group-hover:text-[#00ca9a] transition-colors">SET-{set.id}</span>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850">
                      {Math.round(wearRatio)}% zużycia
                    </span>
                  </div>
                  
                  {/* Dynamic display of scan target details */}
                  <div className="text-[9.5px] font-mono text-cyan-400/90 mt-1 flex justify-between">
                    <span>{scanMode === 'QR' ? 'Sym: QR_CODE' : `Sym: ${eanCode}`}</span>
                  </div>

                  <div className="text-[10px] font-sans font-semibold text-slate-200 truncate mt-1 leading-normal">
                    {set.nazwaProduktu}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase">
                    Stal: {set.rodzajStali.replace(' Bohler (PM-N)', '').replace(' Extra (Bohler)', '')}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-slate-950/40 border-t border-slate-850 text-center text-[9px] text-slate-500 font-mono">
            Poznań GMP Standard Validation
          </div>
        </div>
      </motion.div>
    </div>
  );
};
