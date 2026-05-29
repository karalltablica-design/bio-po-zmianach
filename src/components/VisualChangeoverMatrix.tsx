import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolSet, TabletPress, TabletShape, ToolStatus } from '../types';
import { 
  Compass, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  Printer, 
  FileText, 
  Binary, 
  Sparkles, 
  Lock, 
  UserCheck, 
  ListTodo, 
  Activity,
  History,
  RotateCcw,
  Gauge
} from 'lucide-react';

interface VisualChangeoverMatrixProps {
  toolSets: ToolSet[];
  presses: TabletPress[];
  onUpdateToolSet: (updated: ToolSet) => void;
  onMountToolsetOnPress: (pressId: string, toolsetId: string) => void;
  theme: 'dark' | 'light';
  isLight: boolean;
  addToast: (title: string, message: string, type: 'warning' | 'info' | 'success', toolsetId?: string) => void;
}

export const VisualChangeoverMatrix: React.FC<VisualChangeoverMatrixProps> = ({
  toolSets,
  presses,
  onUpdateToolSet,
  onMountToolsetOnPress,
  theme,
  isLight,
  addToast,
}) => {
  // Selection states
  const [selectedPressId, setSelectedPressId] = useState<string>(presses[0]?.id || '');
  const [selectedToolsetId, setSelectedToolsetId] = useState<string>(
    toolSets.filter(t => t.status === 'Gotowy do produkcji')[0]?.id || toolSets[0]?.id || ''
  );

  // Clearance and Tolerance parameters (micrometres)
  const [radialClearance, setRadialClearance] = useState<number>(18); // default sweetspot 18um
  const [embossingDepth, setEmbossingDepth] = useState<number>(0.12); // mm

  // Checklist states
  const [checklist, setChecklist] = useState({
    lineCleared: false,
    checkedCoaxiality: false,
    lubricationVerified: false,
    clearanceMeasured: false,
  });

  // QA Authorization state
  const [qaOperator, setQaOperator] = useState<string>('');
  const [qaPin, setQaPin] = useState<string>('');
  const [isSignOffComplete, setIsSignOffComplete] = useState<boolean>(false);
  const [signedChangeoverLog, setSignedChangeoverLog] = useState<Array<{
    timestamp: string;
    pressName: string;
    toolsetName: string;
    standard: string;
    clearance: number;
    approver: string;
    token: string;
  }>>(() => {
    const saved = localStorage.getItem('biofarm_changeover_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Active tablet shape configuration based on the tooling selection
  const selectedPress = useMemo(() => presses.find(p => p.id === selectedPressId), [presses, selectedPressId]);
  const selectedToolset = useMemo(() => toolSets.find(t => t.id === selectedToolsetId), [toolSets, selectedToolsetId]);

  // Compatibility Calculations
  const compatibilityMetrics = useMemo(() => {
    if (!selectedPress || !selectedToolset) return null;

    // 1. Standard matching
    const standardMatched = selectedPress.kompatybilnyStandard.includes(selectedToolset.standardNarzedzi);

    // 2. Load capacity verification
    // Assume machines have maximum recommended safe punch load (Fette: 45kN, Kilian: 30kN, Romaco: 28kN)
    const maxMachineForce = selectedPress.id.includes('FETTE') ? 45 : selectedPress.id.includes('KILIAN') ? 32 : 25;
    const forceLimitIsSafe = selectedToolset.silaNacisku <= maxMachineForce;

    // 3. Clearances verification (Sweet spot is between 12µm and 27µm depending on tablet profile)
    let clearanceWarning = '';
    let clearanceStatus: 'ok' | 'warning' | 'danger' = 'ok';
    if (radialClearance < 10) {
      clearanceWarning = 'RYZYKO ZAKLESZCZENIA: Zbyt mała szczelina boczna przy wysokim ciśnieniu prasowania! Może doprowadzić do zatarcia stempla w matrycy.';
      clearanceStatus = 'danger';
    } else if (radialClearance > 30) {
      clearanceWarning = 'FLESZ/RĄBEK TABLETKI: Zbyt duża szczelina boczna spowoduje przeciskanie masy tabletkowej i powstawanie ostrych krawędzi (flesza).';
      clearanceStatus = 'warning';
    }

    // 4. State readiness
    const isReadyForProduction = selectedToolset.status === 'Gotowy do produkcji';

    const overallScore = [
      standardMatched, 
      forceLimitIsSafe, 
      clearanceStatus === 'ok',
      isReadyForProduction
    ].filter(Boolean).length;

    return {
      standardMatched,
      maxMachineForce,
      forceLimitIsSafe,
      clearanceStatus,
      clearanceWarning,
      isReadyForProduction,
      overallScore, // out of 4
    };
  }, [selectedPress, selectedToolset, radialClearance]);

  // Reset checklist when tooling or machine changes
  const handleSelectionChange = (pressId: string, toolsetId: string) => {
    if (pressId) setSelectedPressId(pressId);
    if (toolsetId) setSelectedToolsetId(toolsetId);
    setChecklist({
      lineCleared: false,
      checkedCoaxiality: false,
      lubricationVerified: false,
      clearanceMeasured: false,
    });
    setIsSignOffComplete(false);
  };

  // Perform PDF/Audit receipt creation or print emulation
  const handlePrintCertificate = () => {
    if (!selectedPress || !selectedToolset) return;
    addToast(
      'DRUKOWANIE PROTOKOŁU MOC',
      `Karta kompatybilności i certyfikat przerejestrowania dla linii ${selectedPress.nazwa} zostały wygenerowane i przesłane do drukarki sterylnej.`,
      'success',
      selectedToolset.id
    );
  };

  // Handle management of change approval submission
  const handleApproveChangeover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPress || !selectedToolset || !compatibilityMetrics) return;

    if (!checklist.lineCleared || !checklist.checkedCoaxiality || !checklist.lubricationVerified || !checklist.clearanceMeasured) {
      addToast(
        'BŁĄD ZATWIERDZENIA GMP',
        'Nie można zatwierdzić zmiany formatowej bez odznaczenia wszystkich punktów kontrolnych GMP!',
        'warning'
      );
      return;
    }

    if (!qaOperator.trim()) {
      addToast('BŁĄD KWALIFIKACJI', 'Wpisz nazwisko kierownika QA autoryzującego zmianę formatową.', 'warning');
      return;
    }

    if (qaPin !== '9981' && qaPin !== '1234' && qaPin !== 'BIOFARM') {
      addToast(
        'BŁĄD AUTORYZACJI',
        'Podany kod PIN QA jest nieprawidłowy lub wygasł. (Wskazówka: Użyj PIN-u produkcyjnego "9981" lub "BIOFARM")',
        'warning'
      );
      return;
    }

    if (!compatibilityMetrics.standardMatched) {
      addToast(
        'ZABRONIONO WDROŻENIA',
        `Niezgodność geometryczna standardów stempli (${selectedToolset.standardNarzedzi}) i gniazd głowicy (${selectedPress.kompatybilnyStandard.join(', ')}). Blokada bezpieczeństwa QA.`,
        'warning',
        selectedToolset.id
      );
      return;
    }

    // Append to status history and change state to "W użyciu"
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updatedHistory = [
      ...(selectedToolset.statusHistory || []),
      {
        id: 'MOC-' + Date.now().toString().slice(-6),
        data: timestamp,
        staryStatus: selectedToolset.status,
        nowyStatus: 'W użyciu' as ToolStatus,
        operator: `${qaOperator} (Kierownik Zapewnienia Jakości QA)`,
        powod: `Zarządzanie Zmianą MOC na ${selectedPress.nazwa}. Pomiar szczeliny rad.: ${radialClearance}µm. Autoryzacja cyfrowa CFR 21 Part 11.`
      }
    ];

    const updatedToolset: ToolSet = {
      ...selectedToolset,
      status: 'W użyciu',
      lokalizacja: `Linia Produkcyjna ${selectedPress.nazwa.split(' ')[0]}`,
      statusHistory: updatedHistory,
    };

    onUpdateToolSet(updatedToolset);
    onMountToolsetOnPress(selectedPress.id, selectedToolset.id);

    // Dynamic unique audit token
    const token = `SHA-256:BF${selectedPress.id.slice(-4)}${selectedToolset.id}X${Math.floor(1000 + Math.random() * 9000)}`;
    const newLogItem = {
      timestamp,
      pressName: selectedPress.nazwa,
      toolsetName: `${selectedToolset.nazwaProduktu} (${selectedToolset.standardNarzedzi})`,
      standard: selectedToolset.standardNarzedzi,
      clearance: radialClearance,
      approver: qaOperator,
      token
    };

    const newLogs = [newLogItem, ...signedChangeoverLog];
    setSignedChangeoverLog(newLogs);
    localStorage.setItem('biofarm_changeover_logs', JSON.stringify(newLogs));

    setIsSignOffComplete(true);
    addToast(
      'MOC ZATWIERDZONA (EU-B/D)',
      `Zmiana formatowa na linii ${selectedPress.nazwa} pomyślnie podpisana cyfrowo. Komplet narzędzi wydany z magazynu i zamontowany na stemplarce.`,
      'success',
      selectedToolset.id
    );
  };

  // Helper renderer to draw the exact vector blueprint CAD detailed sketch based on pill shape
  const renderCadBlueprint = (shape: TabletShape) => {
    const isRound = shape === 'okragly';
    const isCapsule = shape === 'kapsulka' || shape === 'kapsulka_zmodyfikowana';
    const isOval = shape === 'owalny';
    const isSquare = shape === 'kwadratowy';

    // Text marking
    const marking = selectedToolset ? selectedToolset.znakowanie : 'B/F';

    return (
      <svg className="w-full h-48 md:h-56" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Technical Grid Blueprint Background */}
        <defs>
          <pattern id="blueprint-grid" width="15" height="15" patternUnits="userSpaceOnUse">
            <path d="M 15 0 L 0 0 0 15" fill="none" stroke={isLight ? "rgba(11, 69, 150, 0.06)" : "rgba(6, 182, 212, 0.07)"} strokeWidth="1" />
          </pattern>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect width="300" height="200" fill="transparent" />
        <rect width="300" height="200" fill="url(#blueprint-grid)" rx="8" />

        {/* Outer dynamic punch clearance wall (gray mechanical outer die border) */}
        <circle cx="150" cy="100" r="76" stroke={isLight ? "#cbd5e1" : "#334155"} strokeWidth="1" strokeDasharray="4 4" />
        <text x="150" y="16" fill={isLight ? "#475569" : "#94a3b8"} fontSize="8" fontFamily="monospace" textAnchor="middle">
          ŚREDNICA MATRYCY: D = 32.00 mm
        </text>

        {/* Clearance margin visual effect (amplified for visual demo) */}
        {/* Radial clearance animation ring */}
        <circle 
          cx="150" 
          cy="100" 
          r={73 + (radialClearance - 10) * 0.15} 
          stroke={
            compatibilityMetrics?.clearanceStatus === 'danger' 
              ? '#ef4444' 
              : compatibilityMetrics?.clearanceStatus === 'warning'
                ? '#f59e0b'
                : isLight ? '#0b4596' : '#22d3ee'
          } 
          strokeWidth="1.5" 
          strokeOpacity="0.45"
          className="animate-pulse"
        />

        {/* Core tablet geometry shape */}
        {isRound && (
          <g>
            {/* Round tablet main face */}
            <circle cx="150" cy="100" r="70" fill={isLight ? "#f1f5f9" : "#1e293b"} stroke={isLight ? "#1e293b" : "#22d3ee"} strokeWidth="2.5" />
            {/* Concentric edge bevel line */}
            <circle cx="150" cy="100" r="62" stroke={isLight ? "#94a3b8" : "#475569"} strokeWidth="1" strokeDasharray="2 2" />
            {/* Marking text */}
            <text x="150" y="104" fill={isLight ? "#0f172a" : "#fff"} fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" letterSpacing="1">
              {marking}
            </text>
          </g>
        )}

        {isCapsule && (
          <g>
            {/* Capsule pill path */}
            <rect x="90" y="65" width="120" height="70" rx="35" fill={isLight ? "#f1f5f9" : "#1e293b"} stroke={isLight ? "#1e293b" : "#22d3ee"} strokeWidth="2.5" />
            {/* Bevel internal path */}
            <rect x="96" y="71" width="108" height="58" rx="29" stroke={isLight ? "#94a3b8" : "#475569"} strokeWidth="1" strokeDasharray="3 2" fill="none" />
            {/* Cross scoreline */}
            <line x1="150" y1="65" x2="150" y2="135" stroke={isLight ? "#64748b" : "#4b5563"} strokeWidth="1.5" strokeDasharray="1 1" />
            <text x="150" y="104" fill={isLight ? "#0f172a" : "#fff"} fontSize="12" fontWeight="extrabold" fontFamily="sans-serif" textAnchor="middle">
              {marking}
            </text>
          </g>
        )}

        {isOval && (
          <g>
            {/* Ellipse representation */}
            <ellipse cx="150" cy="100" rx="90" ry="60" fill={isLight ? "#f1f5f9" : "#1e293b"} stroke={isLight ? "#1e293b" : "#22d3ee"} strokeWidth="2.5" />
            {/* Bevel line */}
            <ellipse cx="150" cy="100" rx="80" ry="50" stroke={isLight ? "#94a3b8" : "#475569"} strokeWidth="1" strokeDasharray="3 2" fill="none" />
            {/* Central scoreline split */}
            <line x1="60" y1="100" x2="240" y2="100" stroke={isLight ? "#0b4596" : "#22d3ee"} strokeWidth="1.5" strokeOpacity="0.7" />
            <text x="150" y="90" fill={isLight ? "#0f172a" : "#fff"} fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
              {marking.split('/')[0] || marking}
            </text>
            <text x="150" y="118" fill={isLight ? "#0b4596" : "#22d3ee"} fontSize="10" fontFamily="sans-serif" textAnchor="middle">
              {marking.split('/')[1] || 'GMP'}
            </text>
          </g>
        )}

        {isSquare && (
          <g>
            {/* Square shaped with curved radii */}
            <rect x="90" y="40" width="120" height="120" rx="16" fill={isLight ? "#f1f5f9" : "#1e293b"} stroke={isLight ? "#1e293b" : "#22d3ee"} strokeWidth="2.5" />
            <rect x="100" y="50" width="100" height="100" rx="10" stroke={isLight ? "#94a3b8" : "#475569"} strokeWidth="1" strokeDasharray="2 2" fill="none" />
            <text x="150" y="105" fill={isLight ? "#0f172a" : "#fff"} fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
              {marking}
            </text>
          </g>
        )}

        {/* Blueprint dimension measurements indicators */}
        <g stroke={isLight ? "#475569" : "#0d9488"} strokeWidth="1" strokeOpacity="0.7">
          {/* Dimension arrows */}
          <line x1="45" y1="100" x2="65" y2="100" />
          <line x1="235" y1="100" x2="255" y2="100" />
          <line x1="150" y1="28" x2="150" y2="35" />
          <line x1="150" y1="165" x2="150" y2="175" />
        </g>
        <circle cx="55" cy="100" r="2" fill={isLight ? "#ff0000" : "#22d3ee"} />
        <circle cx="245" cy="100" r="2" fill={isLight ? "#ff0000" : "#22d3ee"} />

        {/* Clearance value display block in bottom right corner */}
        <rect x="180" y="145" width="112" height="48" rx="6" fill={isLight ? "rgba(15, 23, 42, 0.04)" : "rgba(13, 148, 136, 0.1)"} stroke={isLight ? "#cbd5e1" : "rgba(13, 148, 136, 0.3)"} strokeWidth="1" />
        <text x="236" y="158" fill={isLight ? "#334155" : "#38bdf8"} fontSize="8" fontFamily="monospace" textAnchor="middle">RADIUS CLEARANCE</text>
        <text x="236" y="176" fill={isLight ? "#0f172a" : "#34d399"} fontSize="15" fontWeight="black" fontFamily="monospace" textAnchor="middle">
          {radialClearance} µm
        </text>
        <text x="236" y="186" fill={isLight ? "#64748b" : "#94a3b8"} fontSize="7" fontFamily="sans-serif" textAnchor="middle">
          TOL.: ±0.003 mm
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION WITH SUBTITLE */}
      <div className={`rounded-2xl p-6 relative overflow-hidden transition-all ${
        isLight ? 'bg-white border border-slate-200 shadow-sm' : 'bg-biofarm-dark text-white border border-white/5 bg-grid-pattern-dark'
      }`}>
        <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-l from-biofarm-blue/20 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl shrink-0 ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-biofarm-cyan'}`}>
                <Compass className="w-5 h-5 animate-spin-slow" />
              </span>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  MODULE: MOC-CFR-21
                </span>
                <h1 className={`text-xl lg:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Zarządzanie Zmianą Formatową i Kompatybilnością
                </h1>
              </div>
            </div>
            <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Procedura MOC (Management of Change). Przed przeniesieniem oprzyrządowania do śluzy czystej (Cleanroom Validation Barrier),
              zawsze zweryfikuj fizyczne parametry geometrii stempla i gniazda matrycy.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> EU-GMP COMPLIANT
            </span>
            <span className={`px-2 py-1 rounded ${isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-800 text-slate-300'}`}>
              VER: 2.11
            </span>
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE - COMPARATOR SELECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SELECTION AND COMPATIBILITY CHECKS */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className={`rounded-xl p-5 space-y-5 ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'}`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Wrench className="w-4 h-4 text-biofarm-cyan" /> Krok 1: Wybór Zasobów
            </h2>

            {/* Tablet Press (Machine / Line Selection) */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                1. Wybierz Tabletkarkę (Linię)
              </label>
              <select
                value={selectedPressId}
                onChange={(e) => handleSelectionChange(e.target.value, selectedToolsetId)}
                className={`w-full p-2.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-1 ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-slate-400' 
                    : 'bg-slate-950 border-white/10 text-slate-200 focus:ring-cyan-500 focus:border-cyan-500'
                }`}
              >
                {presses.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nazwa} ({p.kompatybilnyStandard.join('/')})
                  </option>
                ))}
              </select>
            </div>

            {/* Toolset Selection (Stemple i matryce) */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                2. Wybierz Komplet Stempli / Matryc
              </label>
              <select
                value={selectedToolsetId}
                onChange={(e) => handleSelectionChange(selectedPressId, e.target.value)}
                className={`w-full p-2.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-1 ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-slate-400' 
                    : 'bg-slate-950 border-white/10 text-slate-200 focus:ring-cyan-500 focus:border-cyan-500'
                }`}
              >
                {toolSets.map(t => (
                  <option key={t.id} value={t.id}>
                    SET-{t.id} : {t.nazwaProduktu.substring(0, 20)} ({t.standardNarzedzi} - {t.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick specifications view */}
            {selectedToolset && selectedPress && (
              <div className={`p-4 rounded-lg space-y-2 text-[10px] font-mono ${isLight ? 'bg-slate-50' : 'bg-slate-950/50'}`}>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Standard stempla:</span>
                  <span className="font-extrabold">{selectedToolset.standardNarzedzi}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Wymóg gniazd linii:</span>
                  <span className="font-extrabold text-biofarm-cyan">
                    {selectedPress.kompatybilnyStandard.join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Sila nacisku stempla:</span>
                  <span className="font-extrabold">{selectedToolset.silaNacisku} kN</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Kształt tabletki:</span>
                  <span className="font-extrabold text-amber-500 uppercase">{selectedToolset.ksztaltTabletki}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Hologram GMP:</span>
                  <span className="font-extrabold text-emerald-500">QUALIFIED-2026</span>
                </div>
              </div>
            )}
          </div>

          {/* COMPATIBILITY STATUS CARD */}
          {compatibilityMetrics && selectedPress && selectedToolset && (
            <div className={`rounded-xl p-5 space-y-4 border ${
              compatibilityMetrics.overallScore === 4
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                : compatibilityMetrics.overallScore >= 2
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Kwalifikacja MOC
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  compatibilityMetrics.overallScore === 4 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-500'
                }`}>
                  {compatibilityMetrics.overallScore} / 4 KRYTERIÓW
                </span>
              </div>

              {/* Individual verification steps */}
              <div className="space-y-2.5 font-mono text-[10px]">
                {/* 1. Standard Matching */}
                <div className="flex items-center justify-between">
                  <span>1. Kompatybilność standardu (EU-D vs EU-B):</span>
                  <span className={`font-bold py-0.5 px-2 rounded uppercase text-[8px] ${
                    compatibilityMetrics.standardMatched 
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {compatibilityMetrics.standardMatched ? 'ZGODNA' : 'NIEKOMPATYBILNA'}
                  </span>
                </div>

                {/* 2. Tool Limit Force vs Machine Limit Force */}
                <div className="flex items-center justify-between">
                  <span>2. Dopuszczalny nacisk ({selectedToolset.silaNacisku}kN &le; {compatibilityMetrics.maxMachineForce}kN):</span>
                  <span className={`font-bold py-0.5 px-2 rounded uppercase text-[8px] ${
                    compatibilityMetrics.forceLimitIsSafe 
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 opacity-90'
                  }`}>
                    {compatibilityMetrics.forceLimitIsSafe ? 'BEZPIECZNY' : 'RYZYKOWNY'}
                  </span>
                </div>

                {/* 3. Radial Clearance sweetspot check */}
                <div className="flex items-center justify-between">
                  <span>3. Szczelina robocza ({radialClearance}µm):</span>
                  <span className={`font-bold py-0.5 px-2 rounded uppercase text-[8px] ${
                    compatibilityMetrics.clearanceStatus === 'ok' 
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : compatibilityMetrics.clearanceStatus === 'warning'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {compatibilityMetrics.clearanceStatus === 'ok' ? 'W NORMIE' : compatibilityMetrics.clearanceStatus === 'warning' ? 'OSTRZEŻENIE' : 'KRYTYCZNA'}
                  </span>
                </div>

                {/* 4. Base toolset status */}
                <div className="flex items-center justify-between">
                  <span>4. Dostępność magazynowa kompletu:</span>
                  <span className={`font-bold py-0.5 px-2 rounded uppercase text-[8px] ${
                    compatibilityMetrics.isReadyForProduction 
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {selectedToolset.status}
                  </span>
                </div>
              </div>

              {/* Clearance Warnings banner */}
              {compatibilityMetrics.clearanceWarning && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-rose-600 dark:text-rose-300 text-[10px] leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{compatibilityMetrics.clearanceWarning}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN: TECHNICAL CAD BLUEPRINT VIEWER & GAP SIMULATION */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className={`rounded-xl p-5 space-y-4 relative ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <div className="flex justify-between items-center">
              <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                <Binary className="w-4 h-4 text-biofarm-cyan" /> Krok 2: CAD Blueprint & Tolerancja
              </h2>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-biofarm-cyan border border-blue-500/20">
                AUTO-CALCS ACTIVE
              </span>
            </div>

            {/* RENDER CAD GRAPHIC BASED ON SELECTION */}
            {selectedToolset ? (
              <div className={`relative border rounded-xl overflow-hidden ${
                isLight ? 'bg-slate-950 border-slate-200' : 'bg-slate-950 border-white/5'
              }`}>
                {renderCadBlueprint(selectedToolset.ksztaltTabletki)}
                
                {/* Blueprint holographic neon lines design layout */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 text-[8px] font-mono text-cyan-400 opacity-80 select-none">
                  <div>SYS_ENG: CAD_VERIFY_ACTIVE</div>
                  <div>SHAPE_PROFILE: {selectedToolset.ksztaltTabletki.toUpperCase()}</div>
                  <div>STAND_ISO: {selectedToolset.standardNarzedzi === 'EU-D' ? 'D-441-A' : 'B-340-H'}</div>
                </div>
              </div>
            ) : (
              <div className="h-48 rounded-xl flex items-center justify-center bg-slate-950 border border-white/5 font-mono text-xs text-slate-500 text-center">
                Wybierz komplet, aby wyświetlić rysunek CAD
              </div>
            )}

            {/* GAP SIMULATION SLIDERS */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Luz promieniowy stępel-matryca:</span>
                  <span className={`font-black uppercase tracking-wider ${
                    compatibilityMetrics?.clearanceStatus === 'ok' 
                      ? 'text-emerald-500' 
                      : compatibilityMetrics?.clearanceStatus === 'warning'
                        ? 'text-amber-500'
                        : 'text-rose-500'
                  }`}>
                    {radialClearance} µm (microns)
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="1"
                  value={radialClearance}
                  onChange={(e) => setRadialClearance(Number(e.target.value))}
                  className="w-full accent-biofarm-cyan cursor-col-resize h-1"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>5µm (Zakleszczenie)</span>
                  <span className="text-emerald-500 font-bold">12-25µm (Optimum GMP)</span>
                  <span>45µm (Słaba krawędź)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Głębokość graweru (znakowania):</span>
                  <span className="font-extrabold text-cyan-400">{embossingDepth.toFixed(2)} mm</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.01"
                  value={embossingDepth}
                  onChange={(e) => setEmbossingDepth(Number(e.target.value))}
                  className="w-full accent-biofarm-cyan h-1 cursor-col-resize"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>0.05mm (Zacieranie)</span>
                  <span className="text-[#0b4596] dark:text-cyan-400">Optimum: 0.12 - 0.20 mm</span>
                  <span>0.40mm (Capping)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MANAGEMENT OF CHANGE (MOC) APPROVAL FORM */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className={`rounded-xl p-5 space-y-4 ${
            isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
          }`}>
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Lock className="w-4 h-4 text-biofarm-cyan" /> Krok 3: Akceptacja Zmiany QA (MOC)
            </h2>

            <form onSubmit={handleApproveChangeover} className="space-y-4">
              
              {/* Mandatory Checklist */}
              <div className="space-y-2.5">
                <label className={`text-[10px] font-bold uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Przed-montażowa lista kontrolna GMP:
                </label>
                
                <div className="space-y-2 font-mono text-[10px]">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.lineCleared}
                      onChange={(e) => setChecklist(prev => ({ ...prev, lineCleared: e.target.checked }))}
                      className="mt-0.5 rounded accent-biofarm-cyan text-white"
                    />
                    <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                      Oczyszczenie linii i śluzy (Line Clearance) potwierdzone.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.checkedCoaxiality}
                      onChange={(e) => setChecklist(prev => ({ ...prev, checkedCoaxiality: e.target.checked }))}
                      className="mt-0.5 rounded accent-biofarm-cyan text-white"
                    />
                    <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                      Sprawdzono współosiowość prowadnic i gniazd wirnika roboczego.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.lubricationVerified}
                      onChange={(e) => setChecklist(prev => ({ ...prev, lubricationVerified: e.target.checked }))}
                      className="mt-0.5 rounded accent-biofarm-cyan text-white"
                    />
                    <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                      Zweryfikowano film olejowy i poprawność smarowania główek stempli.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.clearanceMeasured}
                      onChange={(e) => setChecklist(prev => ({ ...prev, clearanceMeasured: e.target.checked }))}
                      className="mt-0.5 rounded accent-biofarm-cyan text-white"
                    />
                    <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                      Zmierzono mikrometrycznie szczelinę promieniową i wprowadzono wyniki.
                    </span>
                  </label>
                </div>
              </div>

              {/* QA Approval Fields */}
              <div className="space-y-3 pt-2 border-t border-slate-700/20">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`text-[9px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Sygnatura QA
                    </label>
                    <input
                      type="text"
                      value={qaOperator}
                      onChange={(e) => setQaOperator(e.target.value)}
                      placeholder="e.g. Dariusz Nowak"
                      className={`w-full p-2 rounded text-xs font-mono border focus:outline-none focus:ring-1 ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 focus:ring-slate-400' 
                          : 'bg-slate-950 border-white/10 text-white focus:ring-cyan-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[9px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      KOD PIN QA
                    </label>
                    <input
                      type="password"
                      value={qaPin}
                      onChange={(e) => setQaPin(e.target.value)}
                      placeholder="e.g. ****"
                      className={`w-full p-2 rounded text-xs font-mono border focus:outline-none focus:ring-1 ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 focus:ring-slate-400' 
                          : 'bg-slate-950 border-white/10 text-white focus:ring-cyan-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="text-[8px] font-mono text-slate-500 leading-relaxed">
                  Autoryzacja za pomocą kodu PIN zapewnia nienaruszalność protokołów FDA CFR 21 Part 11 w systemie Zapewnienia Jakości.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSignOffComplete || !selectedPress || !selectedToolset}
                className={`w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSignOffComplete 
                    ? 'bg-emerald-500 text-white shadow shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-biofarm-blue to-[#001e40] dark:from-cyan-500 dark:to-biofarm-blue text-white shadow-md hover:scale-[1.01]'
                }`}
              >
                {isSignOffComplete ? (
                  <>
                    <UserCheck className="w-4 h-4" strokeWidth={3} /> ROZŁADUNEK I WIATRÓWKA ZATWIERDZONE
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> ZATWIERDŹ ZMIANĘ MOC & WYDAJ Z MAGAZYNU
                  </>
                )}
              </button>

              {isSignOffComplete && (
                <button
                  type="button"
                  onClick={handlePrintCertificate}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                    isLight 
                      ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' 
                      : 'bg-slate-950 text-slate-300 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <Printer className="w-4 h-4" /> DRUKUJ CERTYFIKAT ZATWIERDZENIA MOC
                </button>
              )}
            </form>
          </div>
        </div>

      </div>

      {/* DETAILED PATH AUDIT TRACKING SUMMARY */}
      <div className={`rounded-xl p-5 space-y-4 ${
        isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-white/5'
      }`}>
        <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
          <History className="w-4 h-4 text-biofarm-cyan" /> Ścieżka Audytowa MOC (Ostatnie Przeforamtowania Linii)
        </h2>

        {signedChangeoverLog.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-[10px] font-mono">
            Brak zarejestrowanych zmian formatowych w obecnej sesji GMP. Wszystkie logi zapisują się do localStorage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px]">
              <thead>
                <tr className={isLight ? 'text-slate-500 border-b border-slate-200' : 'text-slate-400 border-b border-white/10'}>
                  <th className="pb-2">TIMESTAMP</th>
                  <th className="pb-2">LINIA (PRASA)</th>
                  <th className="pb-2">KOMPLET ROBOCZY</th>
                  <th className="pb-2">SZCZELINA (D)</th>
                  <th className="pb-2">AUTORYZOWAŁ OPERATOR</th>
                  <th className="pb-2 text-right">GMP CRYTPO-TOKEN</th>
                </tr>
              </thead>
              <tbody>
                {signedChangeoverLog.slice(0, 5).map((log, index) => (
                  <tr key={index} className={isLight ? 'border-b border-indigo-50/50' : 'border-b border-white/5'}>
                    <td className="py-2.5">{log.timestamp}</td>
                    <td className="py-2.5 font-bold text-biofarm-cyan">{log.pressName}</td>
                    <td className="py-2.5">{log.toolsetName}</td>
                    <td className="py-2.5">{log.clearance} µm</td>
                    <td className="py-2.5 font-bold">{log.approver}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-500 select-all">{log.token}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
