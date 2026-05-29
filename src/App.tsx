import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolSet, TabletPress, ToolStatus } from './types';
import { BiofarmLogo } from './components/BiofarmLogo';
import { LandingHero } from './components/LandingHero';
import { BiofarmCinematicIntro } from './components/BiofarmCinematicIntro';
import { DashboardOverview } from './components/DashboardOverview';
import { ToolSetForm } from './components/ToolSetForm';
import { ToolSetTable } from './components/ToolSetTable';
import { TabletPresses } from './components/TabletPresses';
import { ReportsPanel } from './components/ReportsPanel';
import { QRScannerModal } from './components/QRScannerModal';
import { VisualChangeoverMatrix } from './components/VisualChangeoverMatrix';
import { SpectrophotometerProfiler } from './components/SpectrophotometerProfiler';
import { KineticTurretSimulator } from './components/KineticTurretSimulator';
import { CleanroomFlowSimulator } from './components/CleanroomFlowSimulator';
import { FluidWearCollider } from './components/FluidWearCollider';
import { ExplodedAssembly } from './components/ExplodedAssembly';
import { AudioSpectrogram } from './components/AudioSpectrogram';
import { PvdPlasmaVaporizer } from './components/PvdPlasmaVaporizer';
import { GranuleMoistureSimulator } from './components/GranuleMoistureSimulator';
import { LaserProfiler } from './components/LaserProfiler';
import { PowderCompressionSim } from './components/PowderCompressionSim';
import { DieBoreOvalityTracker } from './components/DieBoreOvalityTracker';
import { DustExtractionWindTunnel } from './components/DustExtractionWindTunnel';
import { CryoTemperingSimulator } from './components/CryoTemperingSimulator';
import { TribologyFrictionScanner } from './components/TribologyFrictionScanner';

// Icon imports
import {
  LayoutDashboard,
  PlusSquare,
  Database,
  Cpu,
  TrendingUp,
  LogOut,
  User,
  Activity,
  Droplet,
  Thermometer,
  ShieldCheck,
  Power,
  Search,
  QrCode,
  Bell,
  AlertTriangle,
  AlertCircle,
  Volume2,
  X,
  ExternalLink,
  Sun,
  Moon,
  Layers,
  RotateCw,
  Wind,
  Zap,
  Scan,
  Gauge,
  CircleDot
} from 'lucide-react';

import {
  INITIAL_LOCATIONS,
  INITIAL_SUPPLIERS,
  INITIAL_STEEL_TYPES,
  INITIAL_PRODUCTS,
  INITIAL_TOOLSETS,
  INITIAL_PRESSES,
} from './mockData';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  toolsetId?: string;
  timestamp: string;
}

export default function App() {
  // Navigation states
  const [showCinematicIntro, setShowCinematicIntro] = useState<boolean>(true);
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    const stored = localStorage.getItem('biofarm_skip_landing');
    return stored === 'true' ? false : true;
  });
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedHistoryToolId, setSelectedHistoryToolId] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  // Scanner & Notification states
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerInitialId, setScannerInitialId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast notification trigger function with virtual sound beep
  const addToast = (title: string, message: string, type: 'warning' | 'info' | 'success', toolsetId?: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    const timestamp = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    setToasts((prev) => [...prev, { id, title, message, type, toolsetId, timestamp }]);
    
    // Play sound notification if user allowed
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'warning' ? 880 : 1240, audioCtx.currentTime); 
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio autoplay policy fallback
    }

    // Auto delete after 8 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8500);
  };

  // State arrays with localStorage hydration
  const [locations, setLocations] = useState<string[]>(() => {
    const stored = localStorage.getItem('biofarm_locations');
    return stored ? JSON.parse(stored) : INITIAL_LOCATIONS;
  });

  const [suppliers, setSuppliers] = useState<string[]>(() => {
    const stored = localStorage.getItem('biofarm_suppliers');
    return stored ? JSON.parse(stored) : INITIAL_SUPPLIERS;
  });

  const [steelTypes, setSteelTypes] = useState<string[]>(() => {
    const stored = localStorage.getItem('biofarm_steel');
    return stored ? JSON.parse(stored) : INITIAL_STEEL_TYPES;
  });

  const [toolSets, setToolSets] = useState<ToolSet[]>(() => {
    const stored = localStorage.getItem('biofarm_toolsets');
    return stored ? JSON.parse(stored) : INITIAL_TOOLSETS;
  });

  const [presses, setPresses] = useState<TabletPress[]>(() => {
    const stored = localStorage.getItem('biofarm_presses');
    return stored ? JSON.parse(stored) : INITIAL_PRESSES;
  });

  const products = INITIAL_PRODUCTS;

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('biofarm_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const isLight = theme === 'light';

  useEffect(() => {
    localStorage.setItem('biofarm_theme', theme);
  }, [theme]);

  // Active production simulation loop (OEE & wear stimulation) with customizable options
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(50000); // 50k, 150k, 300k, 500k
  const [simulationInterval, setSimulationInterval] = useState<number>(3000); // 3000ms, 1500ms, 800ms
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isSimulationActive) return;

    const interval = setInterval(() => {
      // Find all toolsets currently in use on presses that are in "Praca" status
      const activePresses = presses.filter((p) => p.status === 'Praca' && p.aktualnyKompletId);
      const activeToolsetIds = activePresses.map((p) => p.aktualnyKompletId as string);

      if (activeToolsetIds.length === 0) return;

      const newLogs: string[] = [];
      const alertsToTrigger: { id: string; name: string; pct: string }[] = [];

      setToolSets((prev) => {
        return prev.map((t) => {
          if (activeToolsetIds.includes(t.id)) {
            const pressName = activePresses.find((p) => p.aktualnyKompletId === t.id)?.nazwa || 'Stemplarka';
            const nextUsage = t.uzycieGlowne + simulationSpeed; // Dodaj wybraną liczbę uderzeń roboczych
            const isFinished = nextUsage >= t.uzycieLimit;
            
            const prevWearPct = (t.uzycieGlowne / t.uzycieLimit) * 100;
            const wearPctValue = (nextUsage / t.uzycieLimit) * 100;
            const wearPercent = wearPctValue.toFixed(1);

            // Notification whenever a toolset's wear exceeds 90%
            if (wearPctValue >= 90 && prevWearPct < 90) {
              alertsToTrigger.push({ id: t.id, name: t.nazwaProduktu, pct: wearPercent });
            }

            // Format simulation logs
            newLogs.push(`[${pressName}] Komplet #${t.id} +${(simulationSpeed / 1000).toFixed(0)}k -> Zużycie: ${wearPercent}%`);

            return {
              ...t,
              uzycieGlowne: isFinished ? t.uzycieLimit : nextUsage,
              status: isFinished ? 'W konserwacji' : t.status, // automatyczny alert po przekroczeniu limitu!
            };
          }
          return t;
        });
      });

      // Trigger alerts in a clean asynchronous reaction bubble
      alertsToTrigger.forEach((alert) => {
        addToast(
          `ALERT ZUŻYCIA GMP (>90%)`,
          `Komplet #${alert.id} (${alert.name}) przekroczył 90% tolerancji zużycia! Otrzymany odczyt: ${alert.pct}%. Zalecana konserwacja techniczna stempli.`,
          'warning',
          alert.id
        );
      });

      if (newLogs.length > 0) {
        setSimulationLogs((prev) => [
          ...newLogs,
          ...prev
        ].slice(0, 4)); // Keep the last 4 messages
      }
    }, simulationInterval);

    return () => clearInterval(interval);
  }, [isSimulationActive, presses, simulationSpeed, simulationInterval]);

  const handleUpdateToolSet = (updated: ToolSet) => {
    setToolSets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  };

  // Persist State Change Triggers
  useEffect(() => {
    localStorage.setItem('biofarm_locations', JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem('biofarm_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('biofarm_steel', JSON.stringify(steelTypes));
  }, [steelTypes]);

  useEffect(() => {
    localStorage.setItem('biofarm_toolsets', JSON.stringify(toolSets));
  }, [toolSets]);

  useEffect(() => {
    localStorage.setItem('biofarm_presses', JSON.stringify(presses));
  }, [presses]);

  // Handlers for Form Dynamic Modals
  const handleAddLocation = (loc: string) => {
    if (!locations.includes(loc)) {
      setLocations((prev) => [...prev, loc]);
    }
  };

  const handleAddSupplier = (sup: string) => {
    if (!suppliers.includes(sup)) {
      setSuppliers((prev) => [...prev, sup]);
    }
  };

  const handleAddSteelType = (steel: string) => {
    if (!steelTypes.includes(steel)) {
      setSteelTypes((prev) => [...prev, steel]);
    }
  };

  // Create a new ToolSet
  const handleSaveToolSet = (newSet: ToolSet) => {
    setToolSets((prev) => [newSet, ...prev]);
    // Redirect view to database grid automatically
    setActiveTab('database');
  };

  // Change individual set status
  const handleUpdateStatus = (id: string, newStatus: ToolStatus) => {
    setToolSets((prev) =>
      prev.map((set) => {
        if (set.id === id) {
          if (set.status === newStatus) return set;
          const newEntry = {
            id: Math.random().toString(36).substring(2, 9),
            data: new Date().toISOString().replace('T', ' ').substring(0, 19),
            staryStatus: set.status,
            nowyStatus: newStatus,
            operator: 'Andrzej Wiśniewski (System QC)',
            powod: 'Zmiana statusu w panelu operatorskim (GMP Manual Update)'
          };
          const updatedHistory = [newEntry, ...(set.statusHistory || [])];
          return { ...set, status: newStatus, statusHistory: updatedHistory };
        }
        return set;
      })
    );
  };

  // Delete set
  const handleDeleteToolSet = (id: string) => {
    setToolSets((prev) => prev.filter((set) => set.id !== id));
    
    // Unlink from active presses if deleted
    setPresses((prev) =>
      prev.map((p) => (p.aktualnyKompletId === id ? { ...p, aktualnyKompletId: undefined, status: 'Przezbrajanie' } : p))
    );
  };

  // Clone/Duplicate existing tooling set (Proposal 3 of current batch)
  const handleCloneToolSet = (id: string) => {
    const target = toolSets.find((t) => t.id === id);
    if (!target) return;

    const numericIds = toolSets.map((t) => parseInt(t.id, 10)).filter((n) => !isNaN(n));
    const nextIdVal = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    const newId = nextIdVal.toString();

    const clone: ToolSet = {
      ...target,
      id: newId,
      numerWewnetrzny: `${target.numerWewnetrzny}-CLONE-${newId}`,
      uzycieGlowne: 0, // resets cycles
      status: 'Gotowy do produkcji', // ready by default
      dataDodania: new Date().toISOString().split('T')[0],
      historiaSerwisowa: [
        {
          id: `SR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          data: new Date().toISOString().split('T')[0],
          typ: 'Kwalifikacja',
          operator: 'Automatyczny Kloner (Bio-Tools)',
          status: 'Zatwierdzony',
          notatki: `Utworzono automatycznie jako duplikat wzorca SET-${target.id}. Wszelkie liczniki przebiegu zresetowane do 0.`,
          isGmpVerified: true,
          verifiedBy: 'System Cloner QA',
          verificationDate: new Date().toISOString().split('T')[0],
        },
      ],
      statusHistory: [
        {
          id: `SH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          data: new Date().toISOString().split('T')[0],
          staryStatus: 'Nowo utworzony',
          nowyStatus: 'Gotowy do produkcji',
          operator: 'Andrzej Wiśniewski (System QC)',
          powod: `Utworzono na podstawie wzorcowego zestawu SET-${target.id} (Klonowanie bazowe)`,
        },
      ],
    };

    setToolSets((prev) => [...prev, clone]);
    addToast(
      'SKLONOWANO KOMPLET NARZĘDZI',
      `Komplet SET-${target.id} został pomyślnie powielony jako nowy komplet SET-${newId}. Licznik uderzeń wynosi 0.`,
      'success',
      newId
    );
  };

  // Toggle work modes of Tablet Press
  const handleTogglePressStatus = (pressId: string) => {
    setPresses((prev) =>
      prev.map((p) => {
        if (p.id === pressId) {
          const modes: TabletPress['status'][] = ['Praca', 'Przestój', 'Przezbrajanie', 'Czyszczenie'];
          const currentIndex = modes.indexOf(p.status);
          const nextIndex = (currentIndex + 1) % modes.length;
          return { ...p, status: modes[nextIndex] };
        }
        return p;
      })
    );
  };

  // Mount/Unmount toolset onto Tablet Press matrix
  const handleMountToolset = (pressId: string, toolsetId: string | undefined) => {
    // Find if the press currently has a toolset mounted
    const press = presses.find((p) => p.id === pressId);
    const oldToolsetId = press?.aktualnyKompletId;

    setPresses((prev) =>
      prev.map((p) => {
        if (p.id === pressId) {
          return {
            ...p,
            aktualnyKompletId: toolsetId,
            status: toolsetId ? 'Praca' : 'Przezbrajanie',
          };
        }
        return p;
      })
    );

    // Update toolset statuses
    setToolSets((prev) =>
      prev.map((t) => {
        if (toolsetId && t.id === toolsetId) {
          return { ...t, status: 'W użyciu' };
        }
        if (oldToolsetId && t.id === oldToolsetId && t.id !== toolsetId) {
          return { ...t, status: 'Gotowy do produkcji' };
        }
        return t;
      })
    );
  };

  const handleEnterPortal = () => {
    localStorage.setItem('biofarm_skip_landing', 'true');
    setShowLanding(false);
  };

  const handleExitPortal = () => {
    localStorage.removeItem('biofarm_skip_landing');
    setShowLanding(true);
  };

  const handleOpenScannerWithId = (id: string) => {
    setScannerInitialId(id);
    setIsScannerOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Cinematic intro logo brand transition (Top 5 World Web Presentation Level) */}
      <AnimatePresence>
        {showCinematicIntro && (
          <BiofarmCinematicIntro onComplete={() => setShowCinematicIntro(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showLanding ? (
          <motion.div
            key="landing"
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5 }}
          >
            <LandingHero onEnter={handleEnterPortal} />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col min-h-screen"
          >
            {/* CLEANROOM ENVIRONMENT METRICS HEADER */}
            <div className={`px-6 py-2 border-b flex flex-wrap justify-between items-center text-[10px] font-mono gap-4 transition-all ${
              isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-biofarm-dark text-slate-400 border-white/5'
            }`}>
              <div className="flex items-center gap-4">
                <span className={`flex items-center gap-1.5 font-semibold ${isLight ? 'text-blue-700 font-extrabold' : 'text-biofarm-cyan font-semibold'}`}>
                  <Thermometer className="w-3.5 h-3.5" /> TEMP: 20.4 °C (±0.2)
                </span>
                <span className={`flex items-center gap-1.5 font-semibold ${isLight ? 'text-emerald-700 font-extrabold' : 'text-[#00ca9a] font-semibold'}`}>
                  <Droplet className="w-3.5 h-3.5" /> WILGOTNOŚĆ: 42.1% (RH)
                </span>
                <span className={`flex items-center gap-1.5 font-semibold ${isLight ? 'text-slate-700 font-extrabold' : 'text-slate-300 font-semibold'}`}>
                  <Activity className="w-3.5 h-3.5" /> NADCIŚNIENIE: 12.5 Pa 
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1 font-bold uppercase ${isLight ? 'text-[#0e5c3e]' : 'text-emerald-500'}`}>
                  <ShieldCheck className="w-3 h-3" /> GMP CERTIFIED • PL-1049
                </span>
                <span className={isLight ? 'text-slate-300' : 'text-white/30'}>|</span>
                <span>UTC: {new Date().toISOString().replace('T', ' ').substring(0, 19)}</span>
              </div>
            </div>

            {/* MAIN APP SHELL */}
            <div className="flex-1 flex flex-col md:flex-row">
              
              {/* LEFT NAVIGATION SIDEBAR */}
              <aside className={`w-full md:w-64 p-6 flex flex-col justify-between shrink-0 relative transition-all ${
                isLight ? 'bg-white text-slate-800 border-r border-slate-200 shadow-sm' : 'bg-biofarm-dark text-white border-r border-white/5 bg-grid-pattern-dark'
              }`}>
                {/* Backdrop glowing sphere */}
                <div className="absolute bottom-5 left-5 w-24 h-24 bg-biofarm-blue/20 rounded-full blur-xl pointer-events-none" />

                <div className="space-y-8 relative z-10">
                  
                  {/* Biofarm wordmark */}
                  <div className={`border-b pb-4 flex justify-between items-center ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                    <button 
                      onClick={() => setShowCinematicIntro(true)}
                      title="Odtwórz intro kinowe BIOFARM"
                      className="hover:scale-[1.03] active:scale-95 transition-all outline-none text-left cursor-pointer flex items-center gap-1.5"
                    >
                      <BiofarmLogo variant={isLight ? 'dark' : 'light'} height={36} />
                      <span className="text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded animate-pulse">INTRO</span>
                    </button>
                  </div>

                  {/* Sidebar list items matching Image 1 layout */}
                  <nav className="space-y-1">
                    {[
                      { id: 'dashboard', label: 'Panel główny', icon: <LayoutDashboard className="w-4 h-4" /> },
                      { id: 'form', label: 'Dodawanie kompletów', icon: <PlusSquare className="w-4 h-4" /> },
                      { id: 'database', label: 'Baza stempli i matryc', icon: <Database className="w-4 h-4" /> },
                      { id: 'presses', label: 'Tabletkarki / Głowice', icon: <Cpu className="w-4 h-4" /> },
                      { id: 'changeover', label: 'Zmiana formatowa MOC', icon: <Layers className="w-4 h-4" /> },
                      { id: 'spectroscopy', label: 'Spektrofotometria 3D', icon: <Activity className="w-4 h-4" /> },
                      { id: 'kinetics', label: 'Dynamika stempli 3D', icon: <RotateCw className="w-4 h-4" /> },
                      { id: 'laminar', label: 'Laminar i Termo 3D', icon: <Wind className="w-4 h-4" /> },
                      { id: 'fluidwear', label: 'Rozpad Powłoki DLC', icon: <Activity className="w-4 h-4" /> },
                      { id: 'exploded', label: 'Eksplozja Głowicy CAD', icon: <Layers className="w-4 h-4" /> },
                      { id: 'spectrogram', label: 'Akustyka Wiru 3D', icon: <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" /> },
                      { id: 'pvd', label: 'Hologram PVD 3D', icon: <Zap className="w-4 h-4 text-cyan-450 animate-bounce" /> },
                      { id: 'moisture', label: 'Mikroskop Wilgoci', icon: <Droplet className="w-4 h-4 text-sky-405 animate-pulse" /> },
                      { id: 'laserProfiler', label: 'Skaner Laserowy [A]', icon: <Scan className="w-4 h-4 text-cyan-400 animate-pulse" /> },
                      { id: 'compressionSim', label: 'Zagęszczanie & Siły [B]', icon: <Gauge className="w-4 h-4 text-purple-400" /> },
                      { id: 'dieBoreTracker', label: 'Kalibrator Gniazd [C]', icon: <CircleDot className="w-4 h-4 text-[#00ca9a]" /> },
                      { id: 'dustWindTunnel', label: 'Tunel Powietrzny [I]', icon: <Wind className="w-4 h-4 text-cyan-305 animate-pulse" /> },
                      { id: 'cryoTempering', label: 'Mrożenie i Siła [II]', icon: <Thermometer className="w-4 h-4 text-orange-450 animate-bounce" /> },
                      { id: 'tribometricScanner', label: 'Tribologia DLC [III]', icon: <Zap className="w-4 h-4 text-yellow-405" /> },
                      { id: 'reports', label: 'Raporty i analityka', icon: <TrendingUp className="w-4 h-4" /> },
                    ].map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          id={`nav-${tab.id}`}
                          onClick={() => setActiveTab(tab.id)}
                          onDragEnter={() => setActiveTab(tab.id)}
                          onDragOver={(e) => e.preventDefault()}
                          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                            isActive
                              ? isLight
                                ? 'bg-[#001e40] text-white shadow-md border-r-4 border-cyan-400 font-extrabold'
                                : 'bg-biofarm-blue text-white shadow-md border-r-4 border-biofarm-cyan'
                              : isLight
                                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>

                  {/* Drag-and-drop GMP tutorial card */}
                  <div className={`hidden md:block rounded-xl p-3.5 text-[10px] leading-relaxed font-mono relative overflow-hidden border ${
                    isLight 
                      ? 'bg-slate-50 text-slate-605 border-slate-200 shadow-3xs' 
                      : 'bg-gradient-to-br from-slate-800 to-slate-900 border-white/10 text-slate-400'
                  }`}>
                    <div className="absolute top-0 right-0 w-12 h-12 bg-biofarm-cyan/10 rounded-full blur-xl pointer-events-none" />
                    <span className={`font-bold block mb-1 ${isLight ? 'text-[#001e40]' : 'text-biofarm-cyan'}`}>💡 COUPLING INTERFACE:</span>
                    Chwyć dowolny komplet z Bazy bądź Magazynu i przeciągnij na wybraną tabletkarkę, by zamontować go natychmiastowo.
                  </div>

                   {/* LIVE PRODUCTION SIMULATION TOGGLE (PROPOZYCJA 1) */}
                   <div className={`rounded-xl p-3.5 space-y-3 relative overflow-hidden text-[10px] font-mono border ${
                     isLight 
                       ? 'bg-slate-50 border-slate-202 text-slate-700 shadow-sm' 
                       : 'bg-slate-900 border-white/5 text-slate-300 shadow-inner'
                   }`}>
                     <div className="flex justify-between items-center">
                       <span className={`font-bold flex items-center gap-1 ${isLight ? 'text-slate-900 font-black' : 'text-white'}`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${isSimulationActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`} />
                         Symulator Pras
                       </span>
                       <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase tracking-wide ${
                         isLight ? 'bg-slate-200 text-slate-800 font-bold' : 'bg-slate-800 text-[#00ca9a]'
                       }`}>
                         GMP SIM V2
                       </span>
                     </div>
                     
                     <div className={`space-y-1 p-2 rounded border ${
                       isLight ? 'bg-white border-slate-200' : 'bg-black/40 border-white/5'
                     }`}>
                       <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Moc uderzenia:</div>
                       <div className="flex gap-1" id="speed-cnt">
                         {[
                           { val: 50000, label: '50k' },
                           { val: 150000, label: '150k' },
                           { val: 500000, label: '500k' },
                         ].map((speedOpt) => (
                           <button
                             key={speedOpt.val}
                             type="button"
                             onClick={() => setSimulationSpeed(speedOpt.val)}
                             className={`flex-1 py-0.5 rounded font-bold text-center text-[8px] transition-colors cursor-pointer select-none ${
                               simulationSpeed === speedOpt.val
                                 ? isLight
                                   ? 'bg-[#001e40] text-white shadow-xs'
                                   : 'bg-[#00ca9a] text-slate-950 font-black'
                                 : isLight
                                   ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                   : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                             }`}
                           >
                             {speedOpt.label}
                           </button>
                         ))}
                       </div>

                       <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5" id="interval-lbl">Interwał spływu:</div>
                       <div className="flex gap-1" id="interval-cnt">
                         {[
                           { val: 3000, label: '3s' },
                           { val: 1500, label: '1.5s' },
                           { val: 800, label: '0.8s' },
                         ].map((intOpt) => (
                           <button
                             key={intOpt.val}
                             type="button"
                             onClick={() => setSimulationInterval(intOpt.val)}
                             className={`flex-1 py-0.5 rounded font-bold text-center text-[8px] transition-colors cursor-pointer select-none ${
                               simulationInterval === intOpt.val
                                 ? isLight
                                   ? 'bg-[#003870] text-white font-bold'
                                   : 'bg-biofarm-blue text-white font-black'
                                 : isLight
                                   ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                   : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                             }`}
                           >
                             {intOpt.label}
                           </button>
                         ))}
                       </div>
                     </div>

                     {/* Live simulation logger console */}
                     {isSimulationActive && simulationLogs.length > 0 && (
                       <div className={`p-1.5 rounded text-[8px] font-mono leading-tight space-y-0.5 max-h-[44px] overflow-hidden opacity-90 border ${
                         isLight
                           ? 'bg-slate-900 text-emerald-400 border-emerald-900/10'
                           : 'bg-black/75 text-[#00ca9a] tracking-wide border-emerald-500/10'
                       }`}>
                         {simulationLogs.slice(0, 2).map((log, li) => (
                           <div key={li} className="truncate">➔ {log}</div>
                         ))}
                       </div>
                     )}
 
                     <button
                       type="button"
                       onClick={() => setIsSimulationActive(prev => !prev)}
                       className={`w-full py-1.5 px-2 rounded font-bold text-center text-[9px] uppercase transition-all tracking-wider flex items-center justify-center gap-1 cursor-pointer ${
                         isSimulationActive
                           ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
                           : isLight
                             ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold hover:text-white'
                             : 'bg-[#00ca9a] hover:bg-emerald-400 text-slate-950 font-black'
                       }`}
                     >
                       {isSimulationActive ? '🔴 PAUZA' : '🟢 ROZPOCZNIJ PRACĘ'}
                     </button>
                    </div>
                  </div>

                  {/* THEME TOGGLE MENU (Biofarm Dark vs Clean Light Mode) */}
                  <div className={`pt-4 border-t relative z-10 ${isLight ? 'border-slate-200 mt-4' : 'border-white/5 mt-6'}`}>
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase mb-2">
                    <span>Tryb magazyner / biuro:</span>
                    <span className={`font-bold ${isLight ? 'text-[#001e40] font-extrabold' : 'text-biofarm-cyan'}`}>
                      {isLight ? 'BIOFARM LIGHT ☀️' : 'BIOFARM DARK 🌙'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 border cursor-pointer select-none ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-805 border-slate-300'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                    }`}
                  >
                    {isLight ? (
                      <>
                        <Moon className="w-4 h-4 text-indigo-650" />
                        <span>Dodaj Tryb Ciemny (Dark)</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span>Dodaj Tryb Jasny (Light)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Logged user spec and Logout action */}
                <div className={`pt-6 border-t mt-4 space-y-4 relative z-10 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                      isLight 
                        ? 'bg-slate-100 text-slate-650 border-slate-200' 
                        : 'bg-white/10 text-biofarm-cyan border-white/15'
                    }`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-xs truncate max-w-[150px]">
                      <div className={`font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>Karol Gemini</div>
                      <div className="text-[10px] text-slate-500 font-mono font-bold">karol.gemini.ai@</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExitPortal}
                    className={`w-full text-left py-2 px-3 rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer uppercase font-bold ${
                      isLight 
                        ? 'text-rose-650 hover:text-rose-700 hover:bg-rose-50' 
                        : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Wyloguj (Intro)</span>
                  </button>
                </div>
              </aside>

              {/* CENTER WORKSPACE BODY & TOP BAR HEADER */}
              <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
                
                {/* PERSISTENT HEADER BAR */}
                <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-40 shrink-0 shadow-xs relative">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">Sekcja:</span>
                    <h1 className="text-xs font-semibold text-slate-800 uppercase tracking-widest font-mono">
                      {activeTab === 'dashboard' && 'Panel główny'}
                      {activeTab === 'form' && 'Dodawanie kompletów'}
                      {activeTab === 'database' && 'Baza stempli i matryc'}
                      {activeTab === 'presses' && 'Tabletkarki / Głowice'}
                      {activeTab === 'changeover' && 'Zmiana formatowa MOC'}
                      {activeTab === 'spectroscopy' && 'Spektrofotometria 3D'}
                      {activeTab === 'kinetics' && 'Dynamika stempli 3D'}
                      {activeTab === 'laminar' && 'Laminar & Termo 3D'}
                      {activeTab === 'fluidwear' && 'Rozpad Powłoki dlc'}
                      {activeTab === 'exploded' && 'Eksplozja Głowicy roboczej CAD'}
                      {activeTab === 'spectrogram' && 'Akustyka Wiru 3D'}
                      {activeTab === 'pvd' && 'Holograficzne Napylanie PVD 3D'}
                      {activeTab === 'moisture' && 'Mikroskop Wilgoci Granulatu'}
                      {activeTab === 'reports' && 'Raporty i analityka'}
                    </h1>
                  </div>

                  {/* Top-level Unified Search input bar & QR Scan Button */}
                  <div className="flex items-center gap-2.5 w-full sm:w-auto font-sans z-50">
                    {/* Scanner Launch Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsScannerOpen(true);
                        setScannerInitialId(null);
                      }}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-700 hover:text-[#0b4596] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-bold select-none text-[11px] shrink-0 font-mono"
                      title="Skanuj kod QR z stempla/matrycy dla szybkiej ewidencji"
                    >
                      <QrCode className="w-4 h-4 text-biofarm-cyan" />
                      <span>Skaner QR</span>
                    </button>

                    <div className="relative w-full sm:w-64 font-sans">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Szukaj ID lub produktu..."
                        value={globalSearchQuery}
                        onChange={(e) => setGlobalSearchQuery(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg pl-9 pr-4 py-2 outline-none transition-all font-sans"
                      />

                      {/* Results Dropdown */}
                      {globalSearchQuery.trim() !== '' && (
                        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs max-h-60 overflow-y-auto w-72 sm:w-80">
                          <div className="bg-slate-50 px-3 py-1.5 text-[9px] font-mono text-slate-400 border-b border-slate-100 uppercase tracking-widest font-black text-left">
                            Wyniki wyszukiwania ({toolSets.filter(t => t.id.toLowerCase().includes(globalSearchQuery.toLowerCase()) || t.nazwaProduktu.toLowerCase().includes(globalSearchQuery.toLowerCase())).length})
                          </div>
                          {toolSets.filter(t => 
                            t.id.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
                            t.nazwaProduktu.toLowerCase().includes(globalSearchQuery.toLowerCase())
                          ).length > 0 ? (
                            toolSets.filter(t => 
                              t.id.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
                              t.nazwaProduktu.toLowerCase().includes(globalSearchQuery.toLowerCase())
                            ).slice(0, 6).map((res) => (
                              <div
                                key={res.id}
                                onClick={() => {
                                  setSelectedHistoryToolId(res.id);
                                  setActiveTab('reports');
                                  setGlobalSearchQuery('');
                                }}
                                className="px-3 py-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors border-b border-slate-50 last:border-0 text-left"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-semibold text-slate-800 truncate text-[11px]">{res.nazwaProduktu}</div>
                                  <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                    ID: {res.id} • Stal: {res.rodzajStali.split(' ')[0]}
                                  </div>
                                </div>
                                <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  res.status === 'Gotowy do produkcji' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  res.status === 'W użyciu' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                  'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {res.status === 'Gotowy do produkcji' ? 'GOTOWY' : res.status.toUpperCase()}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-slate-400 font-mono text-[10px]">
                              Brak pasujących kompletów
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </header>

                {/* SCROLLING MAIN CONTAINER */}
                <main className="flex-1 bg-slate-50 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      {activeTab === 'dashboard' && (
                        <DashboardOverview
                          toolSets={toolSets}
                          presses={presses}
                          onNavigateToForm={() => setActiveTab('form')}
                          onSelectToolSetHistory={(id) => {
                            setSelectedHistoryToolId(id);
                            setActiveTab('reports');
                          }}
                          theme={theme}
                        />
                      )}

                      {activeTab === 'form' && (
                        <ToolSetForm
                          locations={locations}
                          suppliers={suppliers}
                          steelTypes={steelTypes}
                          products={products}
                          onAddLocation={handleAddLocation}
                          onAddSupplier={handleAddSupplier}
                          onAddSteelType={handleAddSteelType}
                          onSave={handleSaveToolSet}
                        />
                      )}

                      {activeTab === 'database' && (
                        <ToolSetTable
                          toolSets={toolSets}
                          onUpdateStatus={handleUpdateStatus}
                          onDelete={handleDeleteToolSet}
                          onOpenScannerWithId={handleOpenScannerWithId}
                          onClone={handleCloneToolSet}
                        />
                      )}

                      {activeTab === 'presses' && (
                        <TabletPresses
                          presses={presses}
                          toolSets={toolSets}
                          onToggleStatus={handleTogglePressStatus}
                          onMountToolset={handleMountToolset}
                        />
                      )}

                      {activeTab === 'changeover' && (
                        <VisualChangeoverMatrix
                          toolSets={toolSets}
                          presses={presses}
                          onUpdateToolSet={handleUpdateToolSet}
                          onMountToolsetOnPress={handleMountToolset}
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'spectroscopy' && (
                        <SpectrophotometerProfiler
                          toolSets={toolSets}
                          onUpdateToolSet={handleUpdateToolSet}
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'kinetics' && (
                        <KineticTurretSimulator
                          toolSets={toolSets}
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'laminar' && (
                        <CleanroomFlowSimulator
                          toolSets={toolSets}
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'fluidwear' && (
                        <FluidWearCollider
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'exploded' && (
                        <ExplodedAssembly
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'spectrogram' && (
                        <AudioSpectrogram
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'pvd' && (
                        <PvdPlasmaVaporizer
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'moisture' && (
                        <GranuleMoistureSimulator
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'laserProfiler' && (
                        <LaserProfiler
                          toolSets={toolSets}
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'compressionSim' && (
                        <PowderCompressionSim
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'dieBoreTracker' && (
                        <DieBoreOvalityTracker
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'dustWindTunnel' && (
                        <DustExtractionWindTunnel
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'cryoTempering' && (
                        <CryoTemperingSimulator
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'tribometricScanner' && (
                        <TribologyFrictionScanner
                          theme={theme}
                          isLight={isLight}
                          addToast={addToast}
                        />
                      )}

                      {activeTab === 'reports' && (
                        <ReportsPanel
                          toolSets={toolSets}
                          onUpdateToolSet={handleUpdateToolSet}
                          initialSelectedToolSetId={selectedHistoryToolId}
                          onClearInitialSelectedToolSetId={() => setSelectedHistoryToolId(null)}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </main>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Browser interactive Camera / Symulator QR Scanner Modal */}
      <AnimatePresence>
        {isScannerOpen && (
          <QRScannerModal
            isOpen={isScannerOpen}
            onClose={() => {
              setIsScannerOpen(false);
              setScannerInitialId(null);
            }}
            toolSets={toolSets}
            initialScanId={scannerInitialId}
            onScanSuccess={(id) => {
              addToast(
                'ODCZYT QR WALIDACYJNY',
                `Pomyślnie zsynchronizowano panel dla stempla SET-${id}. Otwieranie karty certyfikatu.`,
                'success',
                id
              );
              setSelectedHistoryToolId(id);
              setActiveTab('reports');
            }}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Toast Notifications HUD overlay container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none p-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-slate-900 border border-slate-750 p-4 rounded-2xl shadow-xl backdrop-blur-md flex gap-3 text-white overflow-hidden relative cursor-pointer group"
              onClick={() => {
                if (toast.toolsetId) {
                  setSelectedHistoryToolId(toast.toolsetId);
                  setActiveTab('reports');
                }
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }}
            >
              <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                toast.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />

              <div className="flex-1 min-w-0 font-sans pl-1">
                <div className="flex items-center gap-1.5">
                  {toast.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#00ca9a] shrink-0" />
                  )}
                  <span className="text-[9px] uppercase font-bold tracking-widest font-mono text-slate-400">
                    {toast.title}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 ml-auto">{toast.timestamp}</span>
                </div>
                <p className="text-xs text-slate-100 font-semibold mt-1 px-0.5 leading-relaxed">
                  {toast.message}
                </p>
                {toast.toolsetId && (
                  <div className="mt-2.5 text-[10px] text-[#00ca9a] font-mono font-bold flex items-center gap-1 border-t border-slate-800/80 pt-1.5">
                    <ExternalLink className="w-3 h-3" /> Kliknij, aby przejść do historii set-{toast.toolsetId}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="text-slate-500 hover:text-white shrink-0 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer self-start"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
