import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Wrench, 
  Info,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Settings,
  Flame,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface ExplodedAssemblyProps {
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success') => void;
}

export const ExplodedAssembly: React.FC<ExplodedAssemblyProps> = ({
  theme,
  isLight,
  addToast
}) => {
  const [explosionFactor, setExplosionFactor] = useState<number>(35); // 0 to 100% sliding explosion
  const [highlightedPart, setHighlightedPart] = useState<string | null>('P5');
  const [stampStandard, setStampStandard] = useState<'EU-D' | 'EU-B'>('EU-D');
  const [activeLayer, setActiveLayer] = useState<'all' | 'metal' | 'seals' | 'spring'>('all');
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const playTimerRef = useRef<number | null>(null);

  // Auto-playing sequence demo loop
  useEffect(() => {
    if (isPlayingDemo) {
      playTimerRef.current = window.setInterval(() => {
        setExplosionFactor((prev) => {
          if (prev >= 100) {
            return 0; // Loop around
          }
          return prev + 1;
        });
      }, 50) as unknown as number;
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlayingDemo]);

  // Assembly metadata parts list with customized vector illustrations (SVG path builders)
  const assemblyParts = useMemo(() => [
    {
      id: 'P1',
      name: 'Upper Punch Head (Główka stempla)',
      dispY: -130, // Max distance vector offset
      desc: 'Wysoce utwardzona faza stalowa ze strefą uderzenia młota pneumatycznego. Absorbuje naciski główne do 60 kN i powstrzymuje odkształcenia grzyba główki.',
      material: 'Stal szybkotnąca S7 Tool Steel (61 HRC)',
      wearGrade: 'Normalne mechaniczne (Ra < 0.04 µm)',
      category: 'metal',
      drawSvg: (factor: number, color: string) => {
        return (
          <svg className="w-24 h-16" viewBox="0 0 100 60">
            {/* Crown of the mushroom head */}
            <path d="M 20,40 C 20,10 80,10 80,40 L 90,45 L 85,50 L 15,50 L 10,45 Z" fill={color} stroke="currentColor" strokeWidth="1.5" />
            <line x1="15" y1="50" x2="85" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            <circle cx="50" cy="30" r="3" fill="#22d3ee" className="animate-pulse" />
          </svg>
        );
      }
    },
    {
      id: 'P2',
      name: 'Guide Key Alignment Nut (Klin pozycjonujący)',
      dispY: -80,
      desc: 'Element dopasowujący, zapobiegający obracaniu się stempla w gniazdach wirnika. Kluczowy przy wybijaniu niesymetrycznych pigułek z logo.',
      material: 'Mosiądz techniczny gatunek CuZn39Pb3',
      wearGrade: 'Umiarkowane tarcie poprzeczne (wymienny)',
      category: 'metal',
      drawSvg: (factor: number, color: string) => {
        return (
          <svg className="w-16 h-12" viewBox="0 0 80 40">
            <rect x="25" y="10" width="30" height="20" rx="3" fill={color} stroke="currentColor" strokeWidth="1.5" />
            <path d="M 15,20 L 25,20 M 55,20 L 65,20" stroke="#f43f5e" strokeWidth="2.5" />
          </svg>
        );
      }
    },
    {
      id: 'P3',
      name: 'Compacting Return Spring (Sprężyna amortyzacyjna)',
      dispY: -30,
      desc: 'Wielozwojowa sprężyna powrotna cofająca stempel po opuszczeniu krzywki górnej bębna. Cierpi na zmęczenie materiałowe po 2 mln obrotów.',
      material: 'Stal sprężynowa 51CrV4 (Chromowo-Wanadowa)',
      wearGrade: 'Wysoki stopień sprężystości (Zalecany test)',
      category: 'spring',
      drawSvg: (factor: number, color: string) => {
        // High quality dynamic spring pitch stretching based on explosion/separation factor!
        const stretchHeight = 30 + (factor * 0.4);
        return (
          <svg className="w-20 h-16" viewBox={`0 0 100 ${stretchHeight}`}>
            {/* Spring coils drawn as consecutive sinusoidal cubic curves */}
            <path 
              d={`M 25,2 
                  C 75,2 75,8 25,10
                  C 75,10 75,18 25,20
                  C 75,20 75,28 25,30
                  C 75,30 75,38 25,40
                  C 75,40 75,48 25,50`} 
              fill="none" 
              stroke={color} 
              strokeWidth="2.5" 
              className="transition-all duration-75"
            />
            {/* Guide shaft through spring */}
            <line x1="50" y1="0" x2="50" y2={stretchHeight} stroke="rgba(34, 211, 238, 0.2)" strokeDasharray="2,2" />
          </svg>
        );
      }
    },
    {
      id: 'P4',
      name: 'Felt Dust Collection Cup (Uszczelniacz filcowy)',
      dispY: 20,
      desc: 'Uszczelniacz chroniący strefę prasowania przed olejem przekładniowym oraz pyleniem API substancji drażniących drogi oddechowe.',
      material: 'Prasowany biały filc FDA i kauczuk Viton',
      wearGrade: 'Ekstremalne ścieranie pyliste (Wymiana systemowa)',
      category: 'seals',
      drawSvg: (factor: number, color: string) => {
        return (
          <svg className="w-24 h-12" viewBox="0 0 100 40">
            {/* Donut shaped rubber gasket */}
            <ellipse cx="50" cy="20" rx="35" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
            <ellipse cx="50" cy="20" rx="20" ry="6" fill={color} stroke="none" />
            <path d="M 15,20 L 15,26 C 15,35 85,35 85,26 L 85,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      }
    },
    {
      id: 'P5',
      name: 'DLC Anti-Adhesion Mirror Tip (Lustrzane czoło z powłoką DLC)',
      dispY: 80,
      desc: 'Najważniejsze czoło formujące z naniesionym filtrem amorficznego węgla (Carbon Diamond Matrix). Zapobiega klejeniu granulatu (sticking).',
      material: 'Substrat wolframowy + Powłoka Ta-C 0.8 µm',
      wearGrade: 'Wrażliwa na mikropęknięcia pitingu',
      category: 'metal',
      drawSvg: (factor: number, color: string) => {
        return (
          <svg className="w-24 h-16" viewBox="0 0 100 50">
            {/* Concave specialized tip mold with gradient reflect */}
            <defs>
              <linearGradient id="dlcGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                <stop offset="55%" stopColor="#ec4899" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {/* Mold metal tip body */}
            <path d="M 30,5 L 70,5 L 75,35 C 75,35 50,45 25,35 Z" fill={color} stroke="currentColor" strokeWidth="1.5" />
            {/* Highly polished DLC face plate */}
            <path d="M 25,35 C 50,45 75,35 75,35 L 70,42 C 50,48 30,42 30,42 Z" fill="url(#dlcGlow)" stroke="#fff" strokeWidth="1" className="animate-pulse" />
          </svg>
        );
      }
    },
    {
      id: 'P6',
      name: 'Viton Base Lock O-Ring (Pojedynczy pierścień Viton)',
      dispY: 130,
      desc: 'Pierścień gumowy tłumiący mechaniczny odrzut drgań bocznych stempla o stół matrycowy podczas prasowania głównego.',
      material: 'Kauczuk fluorowy Viton FKM FDA Compliant',
      wearGrade: 'Normalne zmęczenie cieplne sterylizacji',
      category: 'seals',
      drawSvg: (factor: number, color: string) => {
        return (
          <svg className="w-16 h-10" viewBox="0 0 80 30">
            <ellipse cx="40" cy="15" rx="25" ry="8" fill="none" stroke={color} strokeWidth="3" />
            <circle cx="40" cy="15" r="4" fill="#a855f7" />
          </svg>
        );
      }
    }
  ], []);

  // Determine current disassembly text phase in real-time
  const activeDisassemblyStep = useMemo(() => {
    if (explosionFactor < 15) {
      return {
        step: 'faza 1 / 5',
        label: 'STRUKTURA MONOLITYCZNA (Intact Block)',
        guidance: 'Wszystkie elementy stempla są poprawnie spięte klinem, o-ringi zabezpieczone, sprężyny ściśnięte z siłą wstępną.'
      };
    } else if (explosionFactor < 45) {
      return {
        step: 'faza 2 / 5',
        label: 'ROZPRĘŻENIE SPRĘŻYNY (Spring Release)',
        guidance: 'Następuje powolne podnoszenie kołnierza ślizgowego. Sprężyna amortyzacyjna o wysokim module ulega płynnemu rozciąganiu.'
      };
    } else if (explosionFactor < 65) {
      return {
        step: 'faza 3 / 5',
        label: 'DEMONTAŻ KLINA GŁÓWNEGO (Alignment Key)',
        guidance: 'Uwolnienie poprzecznego klina zabezpieczającego wyjmowanie główki poddawany analizie tarcia.'
      };
    } else if (explosionFactor < 85) {
      return {
        step: 'faza 4 / 5',
        label: 'ŚCIĄGNIĘCIE FILCÓW GASKET (Seal Off-load)',
        guidance: 'Uszczelniacze filcowe wysuwają się z rowków korpusu trzpienia. Moment inspekcji naniesionego oleju medycznego.'
      };
    } else {
      return {
        step: 'faza 5 / 5',
        label: 'ANALIZA KRYTYCZNEGO LUSTRA DLC (Exploded Face View)',
        guidance: 'Czoło formujące z lustrzanym węglem amorficznym (Carbon Mirror DLC) zostaje w pełni wyizolowane ze struktury nośnej mechanicznej.'
      };
    }
  }, [explosionFactor]);

  const handleApplyFullExplosion = () => {
    setExplosionFactor(100);
    setIsPlayingDemo(false);
    addToast(
      'WIZUALE 2030: PEŁNA EKSPLOZJA CAD',
      'Elementy głowicy rozproszone na osi pionowej. Prezentacja trójwymiarowej architektury wewnętrznej podzespołu.',
      'success'
    );
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER CARD */}
      <div className={`rounded-2xl p-6 relative overflow-hidden transition-all ${
        isLight ? 'bg-white border border-slate-200' : 'bg-biofarm-dark text-white border border-white/5 bg-grid-pattern-dark'
      }`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1.5 border-l-2 border-[#22d3ee] pl-4">
            <span className={`text-[9px] font-mono uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-cyan-400 font-extrabold'}`}>
              CYFROWA BLIŹNIACZA TABLICA DIAGNOSTYCZNA GMP (CAD-PROJECTION)
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight uppercase">
              Exploded-View Interactive Assembly (Eksplozja Głowicy 2030)
            </h1>
            <p className={`text-xs max-w-3xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Przełomowa, płynna animacja typu <strong className="text-[#22d3ee]">Explosion-Reveal</strong> rozsuwająca poszczególne stemplówki, 
              sprężyny oraz filce na osi. Symuluj pełne rozbrojenie zespołu HSS w środowisku sterylnym Biofarm.
            </p>
          </div>
        </div>
      </div>

      {/* CORE WORKBENCH GRAPHICS AND DESIGN AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* INTERACTIVE CAD STAGE CONTAINER */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`rounded-2xl p-6 relative overflow-hidden flex flex-col items-center border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5'
          }`}>
            
            {/* Header tools */}
            <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-slate-700/10">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setStampStandard('EU-D');
                    addToast('ZMIANA STANDARDU', 'Wczytano wymiary geometryczne szablonu EU-D dla dużych obciążeń.', 'info');
                  }}
                  className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                    stampStandard === 'EU-D' 
                      ? 'bg-biofarm-blue text-white shadow shadow-blue-500/20' 
                      : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  STANDARD EU-D (&Oslash;44.1 mm)
                </button>
                <button
                  onClick={() => {
                    setStampStandard('EU-B');
                    addToast('ZMIANA STANDARDU', 'Wczytano wymiary geometryczne szablonu wąskiego EU-B.', 'info');
                  }}
                  className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                    stampStandard === 'EU-B' 
                      ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20' 
                      : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  STANDARD EU-B (&Oslash;19.0 mm)
                </button>
              </div>

              {/* Layer switch buttons */}
              <div className="flex items-center gap-1 bg-slate-950/20 p-1 rounded-xl">
                {([
                  { id: 'all', label: 'Wszystkie' },
                  { id: 'metal', label: 'Tylko Stal' },
                  { id: 'seals', label: 'Uszczelki' },
                  { id: 'spring', label: 'Sprężyny' }
                ] as const).map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => setActiveLayer(layer.id)}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                      activeLayer === layer.id 
                        ? 'bg-cyan-500/20 text-cyan-400' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>
            </div>

            {/* HIGH-END INTERACTIVE BLUEPRINT PANEL */}
            <div className={`w-full p-4 flex flex-col items-center min-h-[500px] justify-center rounded-2xl border relative overflow-hidden select-none ${
              isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950/70 border-white/5'
            }`}>
              
              {/* Technical grid lines and crosshair axes */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                <div className="w-[300px] h-[300px] rounded-full border border-dashed border-[#22d3ee]/10" />
                <div className="w-[500px] h-[500px] absolute rounded-full border border-dashed border-[#22d3ee]/5" />
                {/* Horizontal reference line */}
                <div className="absolute w-full h-[1px] bg-slate-700/10 dark:bg-cyan-400/5 top-1/2 left-0" />
                {/* Vertical reference line */}
                <div className="absolute h-full w-[1px] bg-slate-700/10 dark:bg-cyan-400/5 left-1/2 top-0" />
              </div>

              {/* Exploded center dynamic axis guide with neon dot */}
              <div className="absolute top-6 bottom-6 w-[1.5px] bg-dashed border-r border-indigo-500/20 dark:border-cyan-400/20 pointer-events-none" />

              {/* DETAILED PART ANCHORS SEQUENCE (EXPLOSION-REVEAL AREA) */}
              <div className="relative w-full max-w-sm flex flex-col items-center py-24 gap-4">
                <AnimatePresence mode="popLayout">
                  {assemblyParts.map((part) => {
                    const isVisible = activeLayer === 'all' || part.category === activeLayer;
                    if (!isVisible) return null;

                    // Compute unique spring-stretching displacement 
                    const currentDispY = part.dispY * (explosionFactor / 45);
                    const isHighlighted = highlightedPart === part.id;
                    
                    const markerColor = isHighlighted 
                      ? '#22d3ee' 
                      : isLight ? '#0f172a' : 'rgba(255,255,255,0.7)';

                    return (
                      <motion.div
                        key={part.id}
                        layout
                        animate={{ 
                          y: currentDispY,
                          scale: isHighlighted ? 1.06 : 0.98,
                          rotateX: isHighlighted ? 15 : 0
                        }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 140, 
                          damping: 15,
                          mass: 1 
                        }}
                        onClick={() => setHighlightedPart(part.id)}
                        className={`relative group px-4 py-3 rounded-2xl border-2 w-64 flex flex-col items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all ${
                          isHighlighted 
                            ? 'border-cyan-400 bg-cyan-950/20 shadow-xl shadow-cyan-500/5' 
                            : isLight 
                              ? 'bg-white border-slate-200 hover:border-indigo-600 text-slate-800' 
                              : 'bg-slate-900/80 border-slate-800 hover:border-cyan-400/50 text-slate-200'
                        }`}
                        title="Kliknij, aby podświetlić metryczkę CAD"
                      >
                        {/* Dynamic status dots */}
                        {isHighlighted && (
                          <span className="absolute -top-1.5 right-4 px-1.5 py-0.5 rounded-full text-[6.5px] font-mono tracking-widest bg-cyan-400 text-slate-900 uppercase font-black animate-pulse">
                            Inspekcja (selected)
                          </span>
                        )}

                        {/* Part illustration vector drawer */}
                        <div className="h-16 flex items-center justify-center">
                          {part.drawSvg(explosionFactor, markerColor)}
                        </div>

                        {/* Text labels */}
                        <div className="text-center">
                          <div className="text-[10px] font-mono uppercase font-black tracking-wider flex items-center justify-center gap-1">
                            <span className="text-cyan-400">{part.id}</span>
                            <span>{part.name}</span>
                          </div>
                          <span className="text-[7.5px] font-mono text-slate-500 uppercase mt-0.5 block">
                            Standard Matrix Steel: {part.material}
                          </span>
                        </div>

                        {/* CAD alignment connection lines on highlight */}
                        {isHighlighted && (
                          <div className="absolute right-[-40px] left-auto w-10 h-[1.5px] bg-cyan-400/60 pointer-events-none hidden md:block">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute right-0 -top-0.5" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Step indicator tag */}
              <div className="absolute top-4 left-4 bg-slate-905/65 backdrop-blur-md p-3 rounded-xl border border-white/5 max-w-xs font-mono text-[9px] text-[#22d3ee]">
                <div className="font-extrabold uppercase text-[10px] text-white flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                  Krok {activeDisassemblyStep.step}
                </div>
                <div className="font-black text-white">{activeDisassemblyStep.label}</div>
                <p className="text-[8.5px] text-slate-400 leading-relaxed mt-1">
                  {activeDisassemblyStep.guidance}
                </p>
              </div>

              {/* Informational technical coordinates */}
              <div className="absolute bottom-4 left-4 flex flex-col gap-0.5 text-[8px] font-mono text-slate-500">
                <div>EXPLOSION_SEQUENCE: P1-&gt;P2-&gt;P3-&gt;P4-&gt;P5-&gt;P6</div>
                <div>DISASSEMBLY_DANGER_INDEX: {explosionFactor > 75 ? 'HIGH_ISOLATE' : 'MONOLITH_SAFE'}</div>
                <div>Z-AXIS TRANSLATION: {((explosionFactor / 100) * 450).toFixed(1)} mm</div>
              </div>
            </div>

            {/* EXPONENTS SLIDERS AND ACTION BUTTONS */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-5 border-t border-slate-700/10">
              
              {/* RADIAL SPLIT SLIDER */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'} font-bold`}>
                    Dystans rozciągu (Explode Slider):
                  </span>
                  <span className="font-black text-[#0b4596] dark:text-cyan-400 text-xs">
                    {explosionFactor}% ({((explosionFactor / 100) * 450).toFixed(0)} mm)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={explosionFactor}
                  onChange={(e) => {
                    setExplosionFactor(Number(e.target.value));
                    setIsPlayingDemo(false); // Stop play sequence if adjusting manually
                  }}
                  className="w-full accent-cyan-400 h-2 cursor-col-resize rounded-lg bg-slate-950/40"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>ZWARTA FORMA (0%)</span>
                  <span>STAN DEMONTAŻU (50%)</span>
                  <span>EKSPLOZJA MAKSYMALNA (100%)</span>
                </div>
              </div>

              {/* ADVANCED REVEAL SEQUENCE DIRECT CONTROL ACTIONS */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setIsPlayingDemo(!isPlayingDemo);
                    addToast(
                      isPlayingDemo ? 'ZAPAUZOWANO DEMONTAŻ' : 'CYKL DEMONTAŻU AUTOPLAY',
                      isPlayingDemo ? 'Wstrzymano rozsuwanie stempli.' : 'Płynna wizualizacja demontażówki ruszyła automatycznie.',
                      'success'
                    );
                  }}
                  className={`px-3.5 py-2 text-[10px] font-black uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlayingDemo 
                      ? 'bg-rose-500 text-white' 
                      : isLight 
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' 
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {isPlayingDemo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlayingDemo ? 'PAUSE CYCLE' : 'PLAY EXPLOSION-REVEAL'}
                </button>

                <button
                  onClick={() => {
                    setExplosionFactor(0);
                    setIsPlayingDemo(false);
                  }}
                  className={`px-3 py-2 text-[10px] font-bold uppercase rounded-xl transition-colors cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-slate-950/40 hover:bg-slate-950 text-slate-400'
                  }`}
                >
                  ZŁÓŻ MONOLIT
                </button>

                <button
                  onClick={handleApplyFullExplosion}
                  className="px-3.5 py-2 text-[10px] font-extrabold text-white uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
                >
                  MAX SPLIT
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL PART SHEET EXPLORER */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* DETAILED PART EXPLORER METRIC */}
          <div className={`rounded-2xl p-5 space-y-4 border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Cpu className="w-4 h-4 text-biofarm-cyan" /> Karta Techniczna GMP / CAD
            </h3>

            {highlightedPart ? (
              (() => {
                const partObj = assemblyParts.find(p => p.id === highlightedPart);
                if (!partObj) return null;

                return (
                  <div className="space-y-4 font-mono text-[10px]">
                    <div className="p-3 bg-cyan-950/15 border border-cyan-500/20 text-cyan-400 rounded-xl">
                      <span className="text-[7.5px] text-slate-500 uppercase block">Wybrany Element Roboczy:</span>
                      <strong className="text-xs uppercase">{partObj.name}</strong>
                    </div>

                    <div className="space-y-3 leading-relaxed">
                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase">Gatunek Materiału HSS:</span>
                        <p className={`font-black uppercase text-[10.5px] ${isLight ? 'text-slate-850' : 'text-slate-100'}`}>
                          {partObj.material}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase">Dopuszczalne zużycie powierzchni:</span>
                        <p className="text-amber-500 font-bold">{partObj.wearGrade}</p>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase">Analityka Funkcjonalna i Zgodność GMP:</span>
                        <p className={`text-[9px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-350'}`}>
                          {partObj.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-[10px] text-slate-500 font-mono">
                Wskaż dowolny klockowy segment stempla na rysunku CAD po lewej, aby wyświetlić jego metryczkę materiałową.
              </div>
            )}
          </div>

          {/* CRITICAL ASSEMBLY REPAIR WARNINGS */}
          <div className={`rounded-xl p-5 space-y-3 border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Rejestr Walidacji Monolitu
            </h3>
            <p className={`text-[10px] leading-relaxed font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Złożone stemple podlegają automatycznej weryfikacji mikrometrycznej. 
              Przesuwanie suwaka <strong className="text-[#22d3ee]">Explode-Reveal</strong> imituje procedurę demontażową, 
              jaką inżynier jakości Działu Utrzymania Ruchu przeprowadza przed każdą sterylizacją Autoklawem.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
