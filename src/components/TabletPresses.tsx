import React, { useState, useMemo } from 'react';
import { TabletPress, ToolSet } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Power, 
  Settings, 
  Cpu, 
  RefreshCw, 
  Layers, 
  CheckCircle, 
  AlertOctagon, 
  Flame, 
  GripVertical,
  Shield, 
  Plus, 
  Trash2, 
  Info, 
  Sparkles, 
  Hammer, 
  Wrench, 
  Gauge, 
  Clock 
} from 'lucide-react';

interface TabletPressesProps {
  presses: TabletPress[];
  toolSets: ToolSet[];
  onToggleStatus: (pressId: string) => void;
  onMountToolset: (pressId: string, toolsetId: string | undefined) => void;
}

// Rotor / interchangeable turret definition
interface Rotor {
  id: string;
  kod: string;
  kompatybilnaPrasaId?: string; // Mounted on which machine
  typ: 'Segmentowy (High-Speed)' | 'Matrycowy (Klasyczny)' | 'Wielowiertowy / Specjalny';
  stacje: number;
  rodzajStali: string;
  powloka: 'Brak' | 'PVD Chrome' | 'CrN Matrix' | 'DLC Carbon' | 'Nano-TiN';
  status: 'Gotowy (Wolny)' | 'Zamontowany' | 'W myciu CIP' | 'Kalibracja i Metrologia' | 'Kwarantanna';
  liczbaCykli: number;
  limitCykli: number;
  ostatniPrzeglad: string;
  odchylenieBicia: number; // runout tolerance in mm, e.g. 0.012
  liderZatwierdzajacy?: string;
}

// Pre-existing initialized rotors
const INITIAL_ROTORS: Rotor[] = [
  {
    id: 'ROT-FETTE-D42',
    kod: 'ROT-FETTE-209-D',
    kompatybilnaPrasaId: 'PRESS-FETTE-1',
    typ: 'Segmentowy (High-Speed)',
    stacje: 42,
    rodzajStali: 'M340 Bohler (PM-N)',
    powloka: 'DLC Carbon',
    status: 'Zamontowany',
    liczbaCykli: 1240000,
    limitCykli: 12000000,
    ostatniPrzeglad: '2026-05-18',
    odchylenieBicia: 0.011,
    liderZatwierdzajacy: 'inż. Dariusz Kowalski',
  },
  {
    id: 'ROT-KILIAN-B36',
    kod: 'ROT-KIL-TX400-B',
    kompatybilnaPrasaId: 'PRESS-KILIAN-1',
    typ: 'Matrycowy (Klasyczny)',
    stacje: 36,
    rodzajStali: '1.2379 (D2)',
    powloka: 'CrN Matrix',
    status: 'Zamontowany',
    liczbaCykli: 2400000,
    limitCykli: 10000000,
    ostatniPrzeglad: '2026-05-20',
    odchylenieBicia: 0.015,
    liderZatwierdzajacy: 'mgr Karolina Nowak',
  },
  {
    id: 'ROT-FETTE-B45',
    kod: 'ROT-FETTE-209-B',
    kompatybilnaPrasaId: undefined,
    typ: 'Segmentowy (High-Speed)',
    stacje: 45,
    rodzajStali: 'Vasco 50',
    powloka: 'Nano-TiN',
    status: 'Gotowy (Wolny)',
    liczbaCykli: 400000,
    limitCykli: 15000000,
    ostatniPrzeglad: '2026-05-25',
    odchylenieBicia: 0.008,
    liderZatwierdzajacy: 'tech. Mariusz Wiśniewski',
  },
  {
    id: 'ROT-KORSCH-P16',
    kod: 'ROT-KOR-XL100',
    kompatybilnaPrasaId: undefined,
    typ: 'Wielowiertowy / Specjalny',
    stacje: 16,
    rodzajStali: 'Durable-Max Carbon',
    powloka: 'DLC Carbon',
    status: 'Gotowy (Wolny)',
    liczbaCykli: 200000,
    limitCykli: 8000000,
    ostatniPrzeglad: '2026-05-22',
    odchylenieBicia: 0.014,
    liderZatwierdzajacy: 'inż. Dariusz Kowalski',
  },
  {
    id: 'ROT-ROMACO-B32',
    kod: 'ROT-ROM-S250-B',
    kompatybilnaPrasaId: undefined,
    typ: 'Matrycowy (Klasyczny)',
    stacje: 32,
    rodzajStali: 'H13 Premium Chrome',
    powloka: 'Brak',
    status: 'W myciu CIP',
    liczbaCykli: 5100000,
    limitCykli: 10000000,
    ostatniPrzeglad: '2026-05-26',
    odchylenieBicia: 0.022, // Exceeds 0.02 limit!
    liderZatwierdzajacy: 'tech. Mariusz Wiśniewski',
  },
];

export const TabletPresses: React.FC<TabletPressesProps> = ({
  presses,
  toolSets,
  onToggleStatus,
  onMountToolset,
}) => {
  const [activeDragOverId, setActiveDragOverId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'machines' | 'rotors'>('machines');

  // Internal local states for Routers and interchangeable Turrets module
  const [rotors, setRotors] = useState<Rotor[]>(INITIAL_ROTORS);
  const [rotorSearch, setRotorSearch] = useState<string>('');
  const [rotorFilterStatus, setRotorFilterStatus] = useState<string>('Wszystkie');
  const [showAddRotorModal, setShowAddRotorModal] = useState<boolean>(false);

  // New Rotor form state
  const [newRotor, setNewRotor] = useState<Omit<Rotor, 'id' | 'liczbaCykli' | 'ostatniPrzeglad'>>({
    kod: 'ROT-NEW-PHARMA',
    typ: 'Segmentowy (High-Speed)',
    stacje: 36,
    rodzajStali: 'M340 Bohler (PM-N)',
    powloka: 'DLC Carbon',
    status: 'Gotowy (Wolny)',
    limitCykli: 10000000,
    odchylenieBicia: 0.010,
    liderZatwierdzajacy: 'inż. Dariusz Kowalski',
  });

  const availableToolsets = toolSets.filter((t) => t.status === 'Gotowy do produkcji');

  const getStatusStyle = (status: TabletPress['status']) => {
    switch (status) {
      case 'Praca':
        return {
          bg: 'bg-emerald-500/10 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          text: 'W PRACY (UP)',
        };
      case 'Przestój':
        return {
          bg: 'bg-rose-500/10 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
          text: 'PRZESTÓJ (DOWN)',
        };
      case 'Przezbrajanie':
        return {
          bg: 'bg-amber-500/10 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          text: 'PRZEZBRAJANIE',
        };
      case 'Czyszczenie':
        return {
          bg: 'bg-blue-500/10 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
          text: 'SANITYZACJA',
        };
    }
  };

  // Switch or Swap active rotor on press
  const handleSwapRotorOnPress = (pressId: string, rotorId: string | undefined) => {
    setRotors(currentRotors => {
      return currentRotors.map(rotor => {
        // If this rotor is the one being assigned to the press
        if (rotor.id === rotorId) {
          return {
            ...rotor,
            kompatybilnaPrasaId: pressId,
            status: 'Zamontowany' as const
          };
        }
        // If this rotor was previously mounted on the target press, make it free
        if (rotor.kompatybilnaPrasaId === pressId && rotor.id !== rotorId) {
          return {
            ...rotor,
            kompatybilnaPrasaId: undefined,
            status: 'Gotowy (Wolny)' as const
          };
        }
        return rotor;
      });
    });

    const selectedRotor = rotors.find(r => r.id === rotorId);
    if (selectedRotor) {
      alert(`Pomyślnie zamontowano wirnik ${selectedRotor.kod} (Stacje: ${selectedRotor.stacje}, Typ: ${selectedRotor.typ}) na tabletkarce ${pressId}. System skorygował licznik gniazd i zaktualizował protokół FDA.`);
    } else {
      alert(`Zdemontowano aktywny wirnik z tabletkarki ${pressId}. Urządzenie oczekuje na instalację nowej głowicy roboczej.`);
    }
  };

  // Perform quick calibration & CIP wash logic
  const handleCalibrateAndWashRotor = (rotorId: string) => {
    setRotors(current => current.map(r => {
      if (r.id === rotorId) {
        return {
          ...r,
          status: 'Gotowy (Wolny)' as const,
          odchylenieBicia: Number((0.005 + Math.random() * 0.008).toFixed(3)),
          ostatniPrzeglad: new Date().toISOString().split('T')[0],
          liderZatwierdzajacy: 'inż. Dariusz Kowalski (QA)'
        };
      }
      return r;
    }));
    alert(`Zakończono automatyczne mycie ultrasonograficzne CIP oraz mikrometryczną kalibrację osiową. Odchylenie bicia wirnika skorygowane do poziomu bezpiecznego (<0.015mm). Status: GOTOWY.`);
  };

  // Add a new rotor to storage
  const handleCreateRotor = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `ROT-${newRotor.kod.toUpperCase().replace(/[^A-Z0-9-]/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const newlyCreated: Rotor = {
      ...newRotor,
      id,
      liczbaCykli: 0,
      ostatniPrzeglad: new Date().toISOString().split('T')[0],
    };

    setRotors(prev => [...prev, newlyCreated]);
    setShowAddRotorModal(false);
    alert(`Zarejestrowano pomyślnie nową głowicę tabletkarską: ${newlyCreated.kod} ze specyfikacją ${newlyCreated.stacje} stacji GMP.`);
  };

  // Remove a rotor from storage
  const handleDeleteRotor = (rotorId: string) => {
    const target = rotors.find(r => r.id === rotorId);
    if (!target) return;
    if (target.status === 'Zamontowany') {
      alert(`Błąd krytyczny GMP: Nie można wycofać wirnika, który jest obecnie zamontowany na pracującej tabletkarce. Zdemontuj go najpierw!`);
      return;
    }
    if (confirm(`Czy na pewno chcesz usunąć i przekazać do złomowania głowicę roboczą ${target.kod}? Operacja jest nieodwracalna.`)) {
      setRotors(prev => prev.filter(r => r.id !== rotorId));
    }
  };

  // Filtered rotors list
  const filteredRotors = useMemo(() => {
    return rotors.filter(r => {
      const matchesSearch = r.kod.toLowerCase().includes(rotorSearch.toLowerCase()) || 
                            r.rodzajStali.toLowerCase().includes(rotorSearch.toLowerCase()) ||
                            r.typ.toLowerCase().includes(rotorSearch.toLowerCase());
      
      const matchesStatus = rotorFilterStatus === 'Wszystkie' || r.status === rotorFilterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [rotors, rotorSearch, rotorFilterStatus]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Dynamic Module Selector Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
        <div>
          <h3 className="text-xl font-display font-bold text-[#0b4596] flex items-center gap-2">
            Centrala Dyspozytorska Parku Maszynowego
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
            Zautomatyzowane monitorowanie stemplarek, matryc i głowic wymiennych Biofarm S.A.
          </p>
        </div>

        {/* Modular Navigation Tabs with micro animations */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setCurrentTab('machines')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 select-none ${
              currentTab === 'machines'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-505 text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Pulpit Tabletkarek</span>
          </button>
          
          <button
            type="button"
            onClick={() => setCurrentTab('rotors')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 select-none ${
              currentTab === 'rotors'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Rejestr Wirników i Rotorów (GMP)</span>
            {rotors.some(r => r.odchylenieBicia > 0.02) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentTab === 'machines' ? (
          <motion.div
            key="machines-pulpit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Column: List of physical machines */}
            <div className="lg:col-span-9 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {presses.map((press) => {
                  const statusStyle = getStatusStyle(press.status);
                  const mountedToolset = toolSets.find((t) => t.id === press.aktualnyKompletId);
                  const activeRotor = rotors.find((r) => r.kompatybilnaPrasaId === press.id);
                  const isDraggingOverThis = activeDragOverId === press.id;

                  return (
                    <div
                      key={press.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setActiveDragOverId(press.id);
                      }}
                      onDragLeave={() => {
                        setActiveDragOverId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setActiveDragOverId(null);
                        const toolsetId = e.dataTransfer.getData('text/plain');
                        if (toolsetId) {
                          onMountToolset(press.id, toolsetId);
                        }
                      }}
                      className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-300 text-left ${
                        isDraggingOverThis
                          ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50/10 scale-[1.01] shadow-md'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Premium Drag and Drop engagement overlay */}
                      {isDraggingOverThis && (
                        <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-emerald-500 z-10 pointer-events-none">
                          <div className="bg-emerald-600 text-white font-mono text-[10px] font-bold px-3.5 py-1.5 rounded-lg shadow-md tracking-wider flex items-center gap-1.5 uppercase animate-pulse">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Upuść komplet, aby szybko uzbroić głowicę
                          </div>
                        </div>
                      )}

                      {/* Header containing Name & status badge */}
                      <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4 gap-2">
                        <div>
                          <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded inline-block">
                            {press.id}
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mt-1">
                            {press.nazwa}
                          </h4>
                        </div>

                        <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-full border flex items-center gap-1.5 shrink-0 uppercase select-none ${statusStyle.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusStyle.dot}`} />
                          {statusStyle.text}
                        </span>
                      </div>

                      {/* Technical breakdown summary */}
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[8.5px] text-slate-400 uppercase block">Standard</span>
                          <span className="text-slate-850 font-bold">{press.kompatybilnyStandard.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-[8.5px] text-slate-400 uppercase block">Rotor Główny</span>
                          <span className="text-indigo-600 font-bold">{activeRotor ? activeRotor.kod : 'Brak wirnika!'}</span>
                        </div>
                        <div>
                          <span className="text-[8.5px] text-slate-400 uppercase block">Prędkość m.</span>
                          <span className="text-slate-850 font-bold">{(press.predkoscRobocza).toLocaleString()} szt/h</span>
                        </div>
                      </div>

                      {/* OEE prediction calculations */}
                      {(() => {
                        const calculateOEE = () => {
                          if (press.status === 'Przestój') {
                            return { availability: 15, performance: 0, quality: 0, oee: 0 };
                          }
                          let availability = 95;
                          if (press.status === 'Czyszczenie') availability = 80;
                          if (press.status === 'Przezbrajanie') availability = 60;

                          const performance = press.status === 'Praca' ? 94 : 0;
                          
                          let quality = 0;
                          if (mountedToolset) {
                            const wearRatio = (mountedToolset.uzycieGlowne / mountedToolset.uzycieLimit) * 100;
                            if (wearRatio < 50) quality = 99.8;
                            else if (wearRatio < 90) quality = 99.1;
                            else quality = 96.5; 
                          } else {
                            quality = press.status === 'Praca' ? 98.7 : 0;
                          }

                          const oeeValue = Math.round((availability * performance * quality) / 10000);
                          return { availability, performance, quality, oee: oeeValue };
                        };

                        const metrics = calculateOEE();
                        return (
                          <div className="mb-4 bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-mono select-none">
                              <span className="text-slate-400 uppercase font-bold tracking-tight">Wskaźnik OEE maszyny:</span>
                              <span className={`font-bold px-1.5 py-0.25 rounded border ${
                                metrics.oee >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 
                                metrics.oee >= 40 ? 'bg-amber-50 text-amber-700 border-amber-250' : 
                                'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                OEE: {metrics.oee}%
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] font-mono">
                              <div className="bg-white p-1.5 rounded-lg border border-slate-150">
                                <span className="text-slate-400 block text-[7.5px] uppercase">Dostępność</span>
                                <span className="text-slate-850 font-black">{metrics.availability}%</span>
                              </div>
                              <div className="bg-white p-1.5 rounded-lg border border-slate-150">
                                <span className="text-slate-400 block text-[7.5px] uppercase">Wydajność</span>
                                <span className="text-slate-850 font-black">{metrics.performance}%</span>
                              </div>
                              <div className="bg-white p-1.5 rounded-lg border border-slate-150">
                                <span className="text-slate-400 block text-[7.5px] uppercase">Jakość</span>
                                <span className="text-slate-850 font-black">{metrics.quality}%</span>
                              </div>
                            </div>

                            {/* Circular visual performance indicator */}
                            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  metrics.oee >= 80 ? 'bg-[#00ca9a]' : metrics.oee >= 40 ? 'bg-amber-400' : 'bg-slate-400'
                                }`}
                                style={{ width: `${metrics.oee}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Mounted rotor details & installation tools */}
                      <div className="border border-slate-150 rounded-xl p-3.5 space-y-3 bg-slate-50/25 mb-4/8">
                        <div className="flex justify-between items-center text-[10.5px] select-none">
                          <span className="font-bold text-slate-700 uppercase tracking-tight">Aktywna głowica robocza (Rotor)</span>
                          <span className="text-[8.5px] font-mono bg-blue-50 text-blue-700 border border-blue-100 px-1.5 rounded-full font-black uppercase">
                            GMP TURRET
                          </span>
                        </div>

                        {activeRotor ? (
                          <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-indigo-700 font-mono text-[10.5px]">
                                {activeRotor.id} ({activeRotor.kod})
                              </div>
                              <p className="text-[9.5px] font-semibold text-slate-600 mt-0.5">
                                Typ: {activeRotor.typ}
                              </p>
                              <p className="text-[8.5px] font-mono text-slate-400 uppercase mt-0.5">
                                Stacje: <span className="text-slate-700 font-bold">{activeRotor.stacje}</span> • Stal: {activeRotor.rodzajStali.split(' ')[0]}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <select
                                id={`swap-rotor-${press.id}`}
                                value={activeRotor.id}
                                onChange={(e) => handleSwapRotorOnPress(press.id, e.target.value)}
                                className="text-[9.5px] font-mono outline-none border border-slate-205 bg-slate-50 px-2 py-1 rounded-md font-bold text-slate-700 cursor-pointer hover:bg-slate-100"
                              >
                                {rotors.filter(r => r.status === 'Gotowy (Wolny)' || r.id === activeRotor.id).map(r => (
                                  <option key={r.id} value={r.id}>
                                    {r.kod} ({r.stacje} stacji)
                                  </option>
                                ))}
                                <option value="">Zdemontuj rotor</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-[10px] text-rose-500 font-semibold font-mono text-center py-2.5 border border-dashed border-rose-200 bg-rose-50/20 rounded-lg">
                              ⚠️ Brak zamontowanego rotora! Maszyna unieruchomiona.
                            </div>
                            
                            <div className="flex gap-1">
                              <select
                                id={`install-rotor-empty-${press.id}`}
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) handleSwapRotorOnPress(press.id, e.target.value);
                                }}
                                className="w-full text-[10px] font-mono outline-none border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-slate-600"
                              >
                                <option value="">-- Wybierz wolny wirnik z magazynu --</option>
                                {rotors.filter(r => r.status === 'Gotowy (Wolny)').map(r => (
                                  <option key={r.id} value={r.id}>
                                    {r.kod} - {r.typ} ({r.stacje} st.)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Punch layout / Toolset attachment */}
                      <div className="border border-slate-150 rounded-xl p-3.5 space-y-3 bg-slate-50/30 mt-4">
                        <div className="flex justify-between items-center text-[10.5px]">
                          <span className="font-bold text-slate-700 uppercase tracking-tight">Oprzyrządowanie (Matryce)</span>
                          <span className="text-[8.5px] font-mono text-slate-400 uppercase font-bold">FUSE COMP</span>
                        </div>

                        {mountedToolset ? (
                          <div className="space-y-2 text-xs">
                            <div className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                              <div>
                                <div className="font-bold text-[#0b4596] text-[10.5px] font-mono">
                                  KOMPLET ID: {mountedToolset.id}
                                </div>
                                <div className="text-[11px] font-semibold text-slate-800 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[190px]" title={mountedToolset.nazwaProduktu}>
                                  {mountedToolset.nazwaProduktu}
                                </div>
                                <div className="text-[8.5px] text-slate-400 mt-0.5 font-mono uppercase">
                                  Stal: {mountedToolset.rodzajStali.split(' ')[0]} • Nacisk {mountedToolset.silaNacisku}kN
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[8.5px] font-mono font-bold">
                                  {mountedToolset.standardNarzedzi}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (press.status === 'Praca') {
                                  alert('Błąd krytyczny FDA: Nie można zdjąć kompletów stempli podczas aktywnej kompresji. Wyłącz najpierw status pracy!');
                                  return;
                                }
                                onMountToolset(press.id, undefined);
                              }}
                              className="w-full text-center text-[10px] text-rose-600 hover:text-rose-800 font-bold border border-rose-200 hover:border-rose-300 py-1.5 rounded-lg cursor-pointer transition-all bg-white uppercase select-none"
                            >
                              Zdejmij stemplarki z wirnika
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="text-[10px] text-slate-400 text-center py-4 border border-dashed border-slate-200 bg-white rounded-lg">
                              Brak aktywnego oprzyrządowania stemplowego.
                            </div>

                            {availableToolsets.length > 0 ? (
                              <div className="flex gap-2 h-8 items-center select-none">
                                <select
                                  id={`attach-toolset-direct-${press.id}`}
                                  defaultValue=""
                                  className="flex-1 text-[10px] bg-white border border-slate-205 rounded-lg px-2.5 h-full outline-none font-mono text-slate-600 font-bold"
                                  onChange={(e) => {
                                    if (e.target.value) onMountToolset(press.id, e.target.value);
                                  }}
                                >
                                  <option value="">-- Przypisz wolny komplet manualnie --</option>
                                  {availableToolsets.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      ID {t.id} - {t.nazwaProduktu} ({t.standardNarzedzi})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <p className="text-[8.5px] text-rose-500 font-black font-mono text-center uppercase tracking-tight">
                                Brak pasujących kompletów ze statusem "Gotowy do produkcji" w bazie!
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quick Machine Switch Toggle and Calibrate Buttons */}
                      <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeRotor && press.status !== 'Praca') {
                              alert('Nie można uruchomić tabletkarki bez wcześniej zainstalowanego wirnika głównego!');
                              return;
                            }
                            onToggleStatus(press.id);
                          }}
                          className="flex-1 py-1.5 text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer text-center uppercase select-none flex items-center justify-center gap-1"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>Zmień stan</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const nextLoad = Math.floor(60000 + Math.random() * 150000);
                            alert(`GMP SENSOR FEEDBACK: Skalibrowano ciśnienie prasowania, sensory temperatury oraz system RFID dla tabletkarki ${press.id}. Prawidłowa prędkość optymalna: ${nextLoad.toLocaleString()} szt./godz.`);
                          }}
                          className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-center"
                          title="Szybka kalibracja systemowa"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Inventory to drag toolsets from */}
            <div className="lg:col-span-3 flex flex-col gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs h-fit min-h-[460px] text-left">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 uppercase font-display">
                  <Layers className="w-4 h-4 text-[#0b4596] shrink-0" />
                  Magazyn Kompletów
                </h4>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
                  Stemplarki gotowe do montażu
                </p>
              </div>

              <div className="text-[9px] bg-indigo-50/50 text-indigo-900 border border-indigo-100 p-3 rounded-xl font-mono leading-relaxed space-y-1">
                <span className="font-bold flex items-center gap-1 uppercase text-indigo-950 text-[10px] tracking-tight">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Szybkie uzbrojenie GMP
                </span>
                <p>
                  Przeciągnij komplet stempli za pomocą krawędzi chwytnej na wybraną tabletkarkę po lewej stronie, aby niezwłocznie rozpocząć przygotowanie serii.
                </p>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
                {availableToolsets.length > 0 ? (
                  availableToolsets.map((t) => (
                    <motion.div
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', t.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      whileHover={{ 
                        scale: 1.02, 
                        y: -1,
                        boxShadow: "0 6px 12px -2px rgba(15, 23, 42, 0.05)"
                      }}
                      transition={{ type: "spring", stiffness: 440, damping: 25 }}
                      className="p-3 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl cursor-grab active:cursor-grabbing space-y-2 group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                          <span className="font-mono text-[10px] font-bold text-[#00ca9a] bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.25 rounded">
                            {t.id}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                          {t.standardNarzedzi}
                        </span>
                      </div>
                      <div>
                        <h5 className="text-[10.5px] font-bold text-slate-700 truncate" title={t.nazwaProduktu}>
                          {t.nazwaProduktu}
                        </h5>
                        <div className="flex justify-between text-[8px] text-slate-400 font-mono uppercase mt-1">
                          <span>Stal: {t.rodzajStali.split(' ')[0]}</span>
                          <span>Nacisk: {t.silaNacisku}kN</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-10 px-4 border border-dashed border-slate-200 bg-slate-50 rounded-xl text-slate-405 text-slate-400 font-mono text-[10px]">
                    Brak wolnych stemplarek o statusie "Gotowy" w magazynie.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          
          /* ROTOR / TURRETS LIST AND INTERACTIVE METROLOGY REGISTER (Wprowadzony punkt 2) */
          <motion.div
            key="rotors-pulpit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Upper quick stats widgets for Rotors */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-left">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Wszystkie wirniki w ewidencji</span>
                  <span className="text-xl font-black font-mono text-slate-800">{rotors.length}</span>
                </div>
                <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-left">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">W aktywnej kompresji</span>
                  <span className="text-xl font-black font-mono text-emerald-600">{rotors.filter(r => r.status === 'Zamontowany').length}</span>
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-left">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Technologia Segmentowa</span>
                  <span className="text-xl font-black font-mono text-[#0b4596]">{rotors.filter(r => r.typ.includes('Segmentowy')).length}</span>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-105 text-[#0b4596] rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-left">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Alert Metrologia Ra/Bicie</span>
                  <span className={`text-xl font-black font-mono ${rotors.some(r => r.odchylenieBicia > 0.02) ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                    {rotors.filter(r => r.odchylenieBicia > 0.02).length}
                  </span>
                </div>
                <div className={`p-2 rounded-lg border ${rotors.some(r => r.odchylenieBicia > 0.02) ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <AlertOctagon className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Warn user if there is any rotor with exceeded tolerance limit */}
            {rotors.some(r => r.odchylenieBicia > 0.02) && (
              <div className="p-4 bg-rose-50/80 border border-rose-205 rounded-xl flex items-start gap-3 text-left">
                <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-950 uppercase font-mono">
                    Niezgodność jakościowa GMP (Odchylenie bicia &gt; 0.02 mm)
                  </h4>
                  <p className="text-[10px] text-rose-800 leading-normal font-sans">
                    Wykryto, że wirnik <strong>{rotors.find(r => r.odchylenieBicia > 0.02)?.id}</strong> wykazuje bicie osiowe na poziomie <strong>{rotors.find(r => r.odchylenieBicia > 0.02)?.odchylenieBicia} mm</strong>. Maksymalna norma producenta to 0.020 mm celem zapobiegnięcia stickingowi oraz niszczeniu stempli. Wymagane natychmiastowe skierowanie na mycie ultrasonograficzne CIP i kalibrację mikrometryczną!
                  </p>
                </div>
              </div>
            )}

            {/* Rotors list and inventory manager suite */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                    Maszynowy Rejestr Interchangeable Turrets & Wirników
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                    Unikalne wirniki, ich stan kalibracji, ubytkowość, limity i powłoki osłonowe antyprzyczepne
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Filtruj kod, stal, typ..."
                    value={rotorSearch}
                    onChange={(e) => setRotorSearch(e.target.value)}
                    className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono bg-slate-50/50 w-full sm:w-48"
                  />

                  <select
                    value={rotorFilterStatus}
                    onChange={(e) => setRotorFilterStatus(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50/55 font-mono cursor-pointer"
                  >
                    <option value="Wszystkie">-- Status: Wszystkie --</option>
                    <option value="Gotowy (Wolny)">Gotowy (Wolny)</option>
                    <option value="Zamontowany">Zamontowany</option>
                    <option value="W myciu CIP">W myciu CIP</option>
                    <option value="Kalibracja i Metrologia">Kalibracja</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowAddRotorModal(true)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-[#00ca9a] text-white text-xs font-bold font-mono rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 uppercase select-none shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Zarejestruj Rotor</span>
                  </button>
                </div>
              </div>

              {/* Main Turrets Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-mono tracking-wider text-[9px]">
                      <th className="p-4 font-bold">KOD WIRNIKA (ID)</th>
                      <th className="p-4 font-bold">TYP KONSTRUKCJI</th>
                      <th className="p-4 font-bold">STACJE MATRYC</th>
                      <th className="p-4 font-bold">STAL / POWŁOKA PVD</th>
                      <th className="p-4 font-bold text-center">ZUŻYCIE (CYKLE)</th>
                      <th className="p-4 font-bold text-center">BICIE POCIĄGOWE</th>
                      <th className="p-4 font-bold">STATUS OPERACYJNY</th>
                      <th className="p-4 font-bold text-right">AKCJE GMP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRotors.map((r) => {
                      const pctWear = Math.min((r.liczbaCykli / r.limitCykli) * 100, 100);
                      const punchExceeded = r.odchylenieBicia > 0.02;

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="font-mono font-bold text-slate-800">{r.kod}</div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">{r.id}</div>
                          </td>
                          <td className="p-4 font-medium text-slate-650 text-slate-600">
                            {r.typ}
                          </td>
                          <td className="p-4">
                            <span className="font-mono font-black text-slate-800 bg-slate-100 px-2.0.5 py-1 border border-slate-200 rounded">
                              {r.stacje} stacji
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-700">{r.rodzajStali.split(' ')[0]}</div>
                            <div className="text-[9.5px] font-mono mt-0.5 uppercase tracking-tight">
                              <span className={`px-1 rounded text-[8px] font-bold ${r.powloka === 'Brak' ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-705 border border-indigo-100'}`}>
                                Powłoka: {r.powloka}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 max-w-[120px]">
                            <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 mb-1">
                              <span>{pctWear.toFixed(0)}% zużycia</span>
                              <span>{r.liczbaCykli.toLocaleString()} / {r.limitCykli.toLocaleString()}</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${pctWear > 80 ? 'bg-rose-500' : pctWear > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${pctWear}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10.5px] border ${
                              punchExceeded 
                                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-black' 
                                : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            }`}>
                              {r.odchylenieBicia.toFixed(3)} mm
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase border select-none inline-block ${
                              r.status === 'Gotowy (Wolny)' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : r.status === 'Zamontowany'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : r.status === 'W myciu CIP'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {r.status}
                            </span>
                            {r.kompatybilnaPrasaId && (
                              <div className="text-[9px] text-[#0b4596] font-semibold mt-0.5 uppercase">
                                Maszyna: {r.kompatybilnaPrasaId.replace('PRESS-', '')}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => handleCalibrateAndWashRotor(r.id)}
                                className="px-2.5 py-1 text-[8.5px] font-mono uppercase bg-slate-100 hover:bg-[#00ca9a] hover:text-white border border-slate-202 text-slate-600 rounded-lg font-bold cursor-pointer transition-colors"
                                title="Mycie ultradźwiękowe CIP i pomiar bicia metrologicznego"
                              >
                                CIP / Metrologia ⚙️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRotor(r.id)}
                                className="p-1 border border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-lg cursor-pointer transition-colors"
                                title="Wycofanie głowicy z ewidencji GMP"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredRotors.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400 font-mono text-[10.5px]">
                          Brak wyników wyszukiwania rotorów spełniających kryteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General technical description of Rotors / GMP instructions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-8 space-y-2">
                <span className="p-1 px-2.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-lg text-[9px] font-black font-mono tracking-wider uppercase inline-block">
                  TECHNICZNY PROTOKÓŁ GMP WIRNIKÓW BIOFARM S.A.
                </span>
                <h4 className="text-sm font-bold text-slate-100 uppercase font-sans tracking-tight">
                  Metodyka utrzymania wymiennych wirników we współczesnej farmakopei
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans font-light">
                  Interchangeable Turrets pozwalają na ekspresową zmianę standardów tłoczenia (np. z EU-B na EU-D) bez konieczności re-alokacji całej tabletkarki. Wyróżniamy podział na głowice tradycyjne (klasyczne z matrycami) oraz super-wydajne głowice segmentowe, redukujące straty rozruchu o ponad 40%. Przepisy FDA 21 CFR Part 211 wymagają rygorystycznych pomiarów bicia osiowego po każdym cyklu CIP, co gwarantuje pełne bezpieczeństwo stemplarek.
                </p>
              </div>

              <div className="md:col-span-4 bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-3">
                <Shield className="w-9 h-9 text-indigo-400 shrink-0 select-none" />
                <div className="space-y-0.5">
                  <span className="text-[9px] text-[#00ca9a] font-mono font-bold uppercase block">Zabezpieczono podpisem cyfrowym</span>
                  <span className="text-[10px] text-white font-mono font-bold block">MD5/SHA SHA-256 VALIDATED</span>
                  <p className="text-[8.5px] text-slate-400 font-mono">
                    Audytowane bazy danych pod nadzorem QA FDA.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Renders dynamic modal context to create a new interchangeable rotor */}
      <AnimatePresence>
        {showAddRotorModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-left"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase font-mono tracking-tight flex items-center gap-1">
                    <Wrench className="w-4 h-4 text-zinc-700" />
                    Zarejestruj nową głowicę (Rotor)
                  </h4>
                  <p className="text-[8.5px] text-slate-400 font-mono mt-0.5 uppercase">
                    Wprowadzenie nowej głowicy roboczej do ewidencji GMP
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddRotorModal(false)}
                  className="p-1 cursor-pointer bg-slate-200/50 hover:bg-slate-200/80 rounded"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRotor} className="p-6 space-y-4 text-xs">
                {/* Code */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-mono uppercase tracking-wider block text-[9.5px]">Kod fabryczny głowicy:</label>
                  <input
                    type="text"
                    required
                    value={newRotor.kod}
                    onChange={(e) => setNewRotor(p => ({ ...p, kod: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none font-mono focus:border-indigo-505"
                  />
                </div>

                {/* Stations & Typ */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-mono uppercase tracking-wider block text-[9.5px]">Typ głowicy:</label>
                    <select
                      value={newRotor.typ}
                      onChange={(e) => setNewRotor(p => ({ ...p, typ: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-white cursor-pointer"
                    >
                      <option value="Segmentowy (High-Speed)">Segmentowy</option>
                      <option value="Matrycowy (Klasyczny)">Matrycowy (Klasyczny)</option>
                      <option value="Wielowiertowy / Specjalny">Wielowiertowy (Specjalny)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 font-mono uppercase tracking-wider block text-[9.5px]">Stacje (miejsca stemplowe):</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={60}
                      value={newRotor.stacje}
                      onChange={(e) => setNewRotor(p => ({ ...p, stacje: parseInt(e.target.value) || 36 }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Steel & Coating */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-mono uppercase tracking-wider block text-[9.5px]">Rodzaj stali wirnika:</label>
                    <select
                      value={newRotor.rodzajStali}
                      onChange={(e) => setNewRotor(p => ({ ...p, rodzajStali: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-white"
                    >
                      <option value="M340 Bohler (PM-N)">M340 Bohler</option>
                      <option value="1.2379 (D2)">1.2379 (D2)</option>
                      <option value="Vasco 50">Vasco 50</option>
                      <option value="H13 Premium Chrome">H13 Premium Chrome</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 font-mono uppercase tracking-wider block text-[9.5px]">Powłoka PVD:</label>
                    <select
                      value={newRotor.powloka}
                      onChange={(e) => setNewRotor(p => ({ ...p, powloka: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-white"
                    >
                      <option value="DLC Carbon">DLC Carbon</option>
                      <option value="Nano-TiN">Nano-TiN</option>
                      <option value="CrN Matrix">CrN Matrix</option>
                      <option value="Brak">Brak powłoki</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-mono uppercase tracking-wider block text-[9.5px]">Limit uderzeń (cykle):</label>
                    <input
                      type="number"
                      value={newRotor.limitCykli}
                      onChange={(e) => setNewRotor(p => ({ ...p, limitCykli: parseInt(e.target.value) || 10000000 }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 font-mono uppercase tracking-wider block text-[9.5px]">Bicie osiowe startowe:</label>
                    <input
                      type="number"
                      step={0.001}
                      min={0.001}
                      max={0.018}
                      value={newRotor.odchylenieBicia}
                      onChange={(e) => setNewRotor(p => ({ ...p, odchylenieBicia: parseFloat(e.target.value) || 0.010 }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-[9px] text-slate-400 leading-normal">
                  ⚠️ Prawidłowa rejestracja wirnika pociąga za sobą automatyczne nadanie hologramu kalibracji RFID widocznego w audycie FDA 21 CFR Part 11.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRotorModal(false)}
                    className="flex-1 py-2 text-center border border-slate-200 hover:border-slate-300 text-slate-600 font-mono font-bold rounded-lg cursor-pointer transition-all bg-white"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-slate-900 hover:bg-emerald-600 text-white font-mono font-bold rounded-lg cursor-pointer transition-all uppercase"
                  >
                    Zatwierdź GMP ➔
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
