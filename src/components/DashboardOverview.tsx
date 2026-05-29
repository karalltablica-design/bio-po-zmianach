import React, { useState } from 'react';
import { ToolSet, TabletPress } from '../types';
import { motion } from 'motion/react';
import { ShieldCheck, Activity, PenTool as Tool, AlertTriangle, Layers, TrendingUp, CheckCircle, Flame, Thermometer, Droplet, Clock, Users, Award, Zap } from 'lucide-react';
import cleanroomBg from '../assets/images/cleanroom_bg_1779828675178.png';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReChartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface DashboardOverviewProps {
  toolSets: ToolSet[];
  presses: TabletPress[];
  onNavigateToForm: () => void;
  onSelectToolSetHistory: (id: string) => void;
  theme?: 'light' | 'dark';
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  toolSets,
  presses,
  onNavigateToForm,
  onSelectToolSetHistory,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  // Stats
  const totalCount = toolSets.length;
  const inUseCount = toolSets.filter((t) => t.status === 'W użyciu').length;
  const inMaintenanceCount = toolSets.filter((t) => t.status === 'W konserwacji').length;
  
  // Worn out count is where current stroke >= limit OR status is retired
  const wornOutCount = toolSets.filter((t) => t.uzycieGlowne >= t.uzycieLimit || t.status === 'Wycofany z produkcji').length;

  const totalCycles = toolSets.reduce((sum, current) => sum + current.uzycieGlowne, 0);

  // Calculate steel type distribution for custom visual graph
  const steelCounts: { [key: string]: number } = {};
  toolSets.forEach((t) => {
    steelCounts[t.rodzajStali] = (steelCounts[t.rodzajStali] || 0) + 1;
  });

  // Recharts Donut data: count of statuses
  const readyCount = toolSets.filter((t) => t.status === 'Gotowy do produkcji').length;
  const retiredCount = toolSets.filter((t) => t.status === 'Wycofany z produkcji').length;

  const statusData = [
    { name: 'Gotowy', value: readyCount, color: '#10B981' }, 
    { name: 'W użyciu', value: inUseCount, color: '#06b6d4' }, 
    { name: 'Konserwacja', value: inMaintenanceCount, color: '#f59e0b' }, 
    { name: 'Wycofane', value: retiredCount, color: '#EF4444' }, 
  ].filter(item => item.value > 0);

  // OEE Calculator and Bar Chart Data
  const calculateOEEValue = (pressObj: TabletPress, toolSetsList: ToolSet[]) => {
    if (pressObj.status === 'Przestój') {
      return 0;
    }
    let availability = 95;
    if (pressObj.status === 'Czyszczenie') availability = 80;
    if (pressObj.status === 'Przezbrajanie') availability = 60;

    const performance = pressObj.status === 'Praca' ? 94 : 0;
    
    let quality = 0;
    const mounted = toolSetsList.find((t) => t.id === pressObj.aktualnyKompletId);
    if (mounted) {
      const wearRatio = (mounted.uzycieGlowne / mounted.uzycieLimit) * 100;
      if (wearRatio < 50) quality = 99.8;
      else if (wearRatio < 90) quality = 99.1;
      else quality = 96.5; 
    } else {
      quality = pressObj.status === 'Praca' ? 98.5 : 0;
    }

    const oeeValue = Math.round((availability * performance * quality) / 10000);
    return oeeValue;
  };

  const oeeData = presses.map((p) => {
    const oee = calculateOEEValue(p, toolSets);
    return {
      name: p.nazwa,
      'OEE (%)': oee,
      status: p.status,
    };
  });

  // 30-day simulated OEE dataset trend (Option 3 & 4)
  const trend30DaysData = React.useMemo(() => {
    const data = [];
    const baseDate = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dayString = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
      
      const step = (30 - i);
      const seedValue = Math.sin(step / 2) * 2;
      
      const availability = Math.round((94.5 + seedValue + Math.cos(step) * 1) * 10) / 10;
      const performance = Math.round((92.2 - seedValue / 3 + Math.sin(step * 1.5) * 1.5) * 10) / 10;
      const quality = Math.round((99.2 + Math.sin(step * 3) * 0.4) * 10) / 10;
      const oee = Math.round((availability * performance * quality) / 10000 * 10) / 10;

      data.push({
        date: dayString,
        'Dostępność (%)': availability,
        'Wydajność (%)': performance,
        'Jakość (%)': quality,
        'OEE (%)': oee,
      });
    }
    return data;
  }, []);

  // Shift OEE performance dataset with team details for three shifts: Rano (6-14), Popołudnie (14-22), Noc (22-6)
  const shiftOeeStats = React.useMemo(() => {
    const hour = new Date().getHours();
    const currentShiftId = hour >= 6 && hour < 14 ? 'Rano' : hour >= 14 && hour < 22 ? 'Popołudnie' : 'Noc';
    
    return [
      {
        id: 'Rano',
        hours: '06:00 - 14:00',
        crewName: 'Brygada A (Cobalt)',
        leader: 'inż. Dariusz Kowalski',
        oee: 88.4,
        availability: 92.1,
        performance: 96.5,
        quality: 99.4,
        status: hour >= 6 && hour < 14 ? 'Aktywna (LIVE)' : (hour >= 14 || hour < 6 ? 'Zakończona' : 'Oczekująca'),
        isActive: currentShiftId === 'Rano',
        volume: 540200,
        tempControl: '21.4 °C',
        humidity: '42.5%',
        notes: 'Pomyślny test sprężania stempli serii Bioprazol Max. Parametry wibracji głowic stabilne.',
        color: 'from-blue-500/10 to-indigo-500/5',
        dotColor: 'bg-indigo-500',
        textColor: 'text-indigo-600',
        borderColor: 'border-indigo-200/60',
        iconColor: 'text-indigo-500 bg-indigo-50',
      },
      {
        id: 'Popołudnie',
        hours: '14:00 - 22:00',
        crewName: 'Brygada B (Aurum)',
        leader: 'mgr Karolina Nowak',
        oee: 92.5,
        availability: 95.8,
        performance: 97.2,
        quality: 99.5,
        status: hour >= 14 && hour < 22 ? 'Aktywna (LIVE)' : (hour >= 22 || hour < 14 ? 'Zakończona' : 'Oczekująca'),
        isActive: currentShiftId === 'Popołudnie',
        volume: 598000,
        tempControl: '21.8 °C',
        humidity: '41.9%',
        notes: 'Rekordowy uzysk dobowy. Optymalny poślizg stempli z powłoką PVD zapobiegł osadzaniu pyłów.',
        color: 'from-emerald-500/10 to-teal-500/5',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-650 text-emerald-600',
        borderColor: 'border-emerald-200/60',
        iconColor: 'text-emerald-500 bg-emerald-50',
      },
      {
        id: 'Noc',
        hours: '22:00 - 06:00',
        crewName: 'Brygada C (Platinum)',
        leader: 'tech. Mariusz Wiśniewski',
        oee: 84.1,
        availability: 88.5,
        performance: 95.2,
        quality: 99.3,
        status: hour >= 22 || hour < 6 ? 'Aktywna (LIVE)' : 'Oczekująca',
        isActive: currentShiftId === 'Noc',
        volume: 420500,
        tempControl: '20.9 °C',
        humidity: '44.2%',
        notes: 'Ruch prewencyjny. Przeprowadzono mycie CIP prasy o godz. 03:00 i kalibrację siłomierzy.',
        color: 'from-amber-500/10 to-orange-500/5',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-600',
        borderColor: 'border-amber-200/60',
        iconColor: 'text-amber-500 bg-amber-50',
      }
    ];
  }, []);

  const [activeShiftTab, setActiveShiftTab] = useState<'Rano' | 'Popołudnie' | 'Noc'>(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'Rano';
    if (hour >= 14 && hour < 22) return 'Popołudnie';
    return 'Noc';
  });

  const [dashboardFilter, setDashboardFilter] = useState<'Wszystkie' | 'Gotowy do produkcji' | 'W użyciu' | 'W konserwacji' | 'Wycofany z produkcji'>('Wszystkie');

  const filteredToolsets = toolSets.filter(t => {
    if (dashboardFilter === 'Wszystkie') return true;
    return t.status === dashboardFilter;
  });

  return (
    <div className="space-y-8 font-sans">
      
      {/* 1. Welcoming Grid Header Bar with minimal tech details */}
      <div className={`relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl gap-4 transition-all ${
        isLight 
          ? 'bg-gradient-to-r from-slate-100 to-white text-slate-800 border border-slate-200 shadow-3xs' 
          : 'bg-[#001633] text-white border border-white/10'
      }`}>
        {/* Cleanroom tech visual element background overlay */}
        <div 
          className={`absolute inset-0 bg-cover bg-center pointer-events-none transition-all ${
            isLight ? 'opacity-[0.08] mix-blend-multiply' : 'opacity-[0.25] mix-blend-screen'
          }`}
          style={{ backgroundImage: `url(${cleanroomBg})` }}
        />
        <div className="relative z-10">
          <h2 className={`text-xl font-display font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Witaj w Centrum Sterowania Oprzyrządowaniem
          </h2>
          <p className={`text-sm mt-1 font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Zakłady Farmaceutyczne Biofarm S.A. • Dział Utrzymania Ruchu & Kontroli Jakości (QA)
          </p>
        </div>
        <div className={`relative z-10 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${
          isLight 
            ? 'text-indigo-900 bg-slate-100 border-slate-300 font-extrabold' 
            : 'text-biofarm-cyan bg-white/5 border-white/10'
        }`}>
          STREFA: <span className={isLight ? 'text-emerald-700 font-black' : 'text-emerald-400 font-bold'}>GMP KLASA D (ISO-8)</span>
        </div>
      </div>

      {/* 2. Key Stats Cards Row */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.12,
            },
          },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          {
            label: 'Komplety Narzędzi',
            val: totalCount,
            sub: 'Zarejestrowane w systemie',
            icon: <Tool className="w-5 h-5 text-biofarm-blue" />,
            color: 'border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300',
          },
          {
            label: 'Obecnie w użyciu (Press)',
            val: inUseCount,
            sub: 'Na czynnych tabletkarkach',
            icon: <Activity className="w-5 h-5 text-[#00ca9a]" />,
            color: 'border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300',
          },
          {
            label: 'W konserwacji',
            val: inMaintenanceCount,
            sub: 'Regeneracja / Polerowanie',
            icon: <Layers className="w-5 h-5 text-amber-500" />,
            color: 'border-amber-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300',
          },
          {
            label: 'Wycofane / Zużyte',
            val: wornOutCount,
            sub: 'Osiągnięty limit uderzeń',
            icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
            color: 'border-rose-100 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-300',
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.95 },
              show: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 100,
                  damping: 15,
                },
              },
            }}
            whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
            className={`border rounded-xl p-5 shadow-sm space-y-3 relative overflow-hidden backdrop-blur-sm transition-colors duration-300 ${stat.color}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">{stat.label}</span>
              <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200/50">
                {stat.icon}
              </div>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-slate-800 tracking-tight">
                {stat.val}
              </div>
              <div className="text-xs text-slate-400 mt-1">{stat.sub}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Dynamic Status Filter & Quick Navigation Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              Szybka Nawigacja & Filtr Statusu Oprzyrządowania (GMP)
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
              Weryfikuj zasoby stemplowe i matrycowe w czasie rzeczywistym według przydziału i fazy procesowej
            </p>
          </div>
          <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-1 rounded-lg font-mono font-bold uppercase">
            Widok: {dashboardFilter} ({filteredToolsets.length})
          </span>
        </div>

        {/* Buttons Group */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'Wszystkie', label: 'Wszystkie', count: toolSets.length, color: 'border-slate-200 text-slate-755 hover:bg-slate-50' },
            { key: 'Gotowy do produkcji', label: 'Gotowe do produkcji', count: readyCount, color: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50/50' },
            { key: 'W użyciu', label: 'W użyciu', count: inUseCount, color: 'border-cyan-200 text-cyan-705 hover:bg-cyan-50/50' },
            { key: 'W konserwacji', label: 'W konserwacji', count: inMaintenanceCount, color: 'border-amber-200 text-amber-705 hover:bg-amber-50/50' },
            { key: 'Wycofany z produkcji', label: 'Wycofane', count: retiredCount, color: 'border-rose-200 text-rose-705 hover:bg-rose-50/50' },
          ].map((btn) => {
            const isActive = dashboardFilter === btn.key;
            return (
              <button
                key={btn.key}
                type="button"
                onClick={() => setDashboardFilter(btn.key as any)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold select-none cursor-pointer transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : `bg-white ${btn.color}`
                }`}
              >
                <span>{btn.label}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white font-black' : 'bg-slate-100 text-slate-600'}`}>
                  {btn.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid of Results */}
        {filteredToolsets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredToolsets.map((t) => {
              const wearPercent = Math.min(100, Math.round((t.uzycieGlowne / t.uzycieLimit) * 100));
              const isWarning = wearPercent >= 90;
              
              const activePress = t.status === 'W użyciu' ? presses.find(p => p.aktualnyKompletId === t.id) : null;

              return (
                <div 
                  key={t.id}
                  className="p-4 border rounded-xl flex flex-col justify-between space-y-3 shadow-3xs hover:shadow-2xs transition-all duration-200 bg-slate-50/40 border-slate-150 hover:bg-slate-50/80 hover:border-slate-200"
                >
                  <div className="flex justify-between items-start gap-1">
                    <div>
                      <span className={`text-[8.5px] font-mono font-black px-2 py-0.5 rounded border uppercase ${
                        t.status === 'Gotowy do produkcji' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : t.status === 'W użyciu'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            : t.status === 'W konserwacji'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        SET-{t.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-2 line-clamp-1 h-4">
                        {t.nazwaProduktu}
                      </h4>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100 uppercase shrink-0">
                      {t.rodzajStali}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>Zużycie stempli:</span>
                      <strong className={isWarning ? "text-rose-600 font-black animate-pulse" : "text-slate-705 font-bold"}>
                        {wearPercent}%
                      </strong>
                    </div>
                    <div className="w-full h-1 bg-slate-150 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isWarning ? 'bg-rose-500' : 'bg-[#0b4596]'}`} 
                        style={{ width: `${wearPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-mono bg-white border border-slate-100/80 p-2 rounded-lg text-slate-500 leading-snug min-h-[48px] flex flex-col justify-center">
                    {activePress ? (
                      <span className="text-cyan-705 font-semibold flex items-center gap-1 text-[10.5px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping inline-block shrink-0" />
                        Prasa: {activePress.nazwa}
                      </span>
                    ) : t.status === 'W konserwacji' ? (
                      <span className="text-amber-705 font-semibold">
                        Regeneracja i polerowanie
                      </span>
                    ) : t.status === 'Gotowy do produkcji' ? (
                      <span className="text-emerald-755 font-medium">
                        Zabezpieczone w magazynie
                      </span>
                    ) : (
                      <span className="text-rose-705 font-medium">
                        Wycofane / Zutylizowane
                      </span>
                    )}
                    <span className="text-[8.5px] text-slate-400 block mt-0.5">
                      Następny przegląd: {t.hologramKalibracji || 'b.d.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectToolSetHistory(t.id)}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-mono font-bold rounded-lg transition-all uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1 select-none"
                  >
                    Nawiguj do Raportu ➔
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-205 text-slate-500 rounded-xl p-8 text-center text-xs font-mono select-none">
            Brak zarejestrowanych kompletów stempli spełniających filtr "{dashboardFilter}".
          </div>
        )}
      </div>

      {/* NEW ACTIVE WEAR ALERTS LIST WIDGET (>90%) */}
      {(() => {
        const alertsList = toolSets
          .map(t => ({ ...t, pct: (t.uzycieGlowne / t.uzycieLimit) * 100 }))
          .filter(t => t.pct >= 90 && t.status !== 'Wycofany z produkcji')
          .sort((a, b) => b.pct - a.pct);

        return (
          <div id="wear-alerts-list-widget" className="bg-white p-6 rounded-2xl border border-slate-205 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
                    Aktywne Alerty Zużycia Elementów Tłocznych (&ge; 90%)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                    Zalecana natychmiastowa relokacja do polerowania lub regeneracji GMP
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold font-mono uppercase">
                Stan techniczny: {alertsList.length} do weryfikacji
              </span>
            </div>

            {alertsList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alertsList.map((item) => {
                  const daysEst = Math.max(1, Math.ceil((item.uzycieLimit - item.uzycieGlowne) / 36000));
                  return (
                    <div 
                      key={item.id} 
                      className="p-4 border rounded-xl flex flex-col justify-between space-y-3 shadow-3xs relative overflow-hidden bg-rose-50/10 border-rose-150"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[9px] font-bold text-rose-705 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">
                            SET-{item.id}
                          </span>
                          <h4 className="text-xs font-semibold text-slate-800 mt-2 line-clamp-1">
                            {item.nazwaProduktu}
                          </h4>
                        </div>
                        <span className="text-xs font-black font-mono text-rose-600 bg-rose-50 px-2.5 py-1 rounded">
                          {item.pct.toFixed(1)}%
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(item.pct, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>{item.uzycieGlowne.toLocaleString()} uderzeń</span>
                          <span>pozostało ok. {daysEst} dni</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectToolSetHistory(item.id)}
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold font-mono rounded-lg transition-all uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1 shadow-sm select-none"
                      >
                        Przejdź do historii serwisowej ➔
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 text-slate-500 rounded-xl p-4 text-center font-sans text-xs flex flex-col items-center justify-center space-y-1">
                <span className="text-[#00ca9a] font-black uppercase text-[10px] tracking-widest block">System czysty</span>
                <p className="text-slate-500 font-medium">Brak elementów o stopniu zużycia powyżej 90%.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Donut and OEE Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Chart: Status Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
              Statusy Oprzyrządowania (Szt.)
            </h3>
            <p className="text-[10px] text-slate-400 uppercase mt-0.5 font-mono">
              Aktywny rozkład kompletów stempli i matryc
            </p>
          </div>

          <div className="h-64 flex flex-col sm:flex-row items-center justify-around gap-4">
            <div className="w-full sm:w-1/2 h-full min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReChartsTooltip 
                    contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-1/2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-650 truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shrink-0">{item.value} szt.</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Chart: OEE Bar Chart for Tablet Presses */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
              Wskaźniki OEE Tabletkarek (%)
            </h3>
            <p className="text-[10px] text-slate-400 uppercase mt-0.5 font-mono">
              Ogólna wydajność maszyn (GMP Target: &ge;85%)
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={oeeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <ReChartsTooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                  contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="OEE (%)" radius={[4, 4, 0, 0]}>
                  {oeeData.map((entry, index) => {
                    const value = entry['OEE (%)'];
                    let fill = '#64748B'; 
                    if (entry.status === 'Praca') {
                      fill = value >= 80 ? '#10B981' : '#F59E0B'; 
                    } else if (entry.status === 'Przestój') {
                      fill = '#EF4444'; 
                    } else if (entry.status === 'Przezbrajanie') {
                      fill = '#3B82F6'; 
                    } else {
                      fill = '#8B5CF6'; 
                    }
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 30-DAY PRODUCTION OEE TREND LINE CHART */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
              30-dniowy Trend Wydajności GMP (OEE)
            </h3>
            <p className="text-[10px] text-slate-400 uppercase mt-0.5 font-mono">
              Kluczowe komponenty wydajności tabletkarskiej Biofarm S.A.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-[9px] font-mono">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-cyan-500 rounded-full" /> Dostępność</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-purple-500 rounded-full" /> Wydajność</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-emerald-500 rounded-full" /> Jakość</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2 bg-[#0b4596] rounded" /> Ogólny OEE</span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend30DaysData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 8, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis domain={[75, 100]} tick={{ fill: '#64748B', fontSize: 8, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <ReChartsTooltip
                contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px', fontFamily: 'monospace' }}
              />
              <Line type="monotone" dataKey="Dostępność (%)" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="Wydajność (%)" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="Jakość (%)" stroke="#10b981" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="OEE (%)" stroke="#0b4596" strokeWidth={3} dot={{ r: 3, fill: '#0b4596', stroke: '#FFF', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SHIFT OEE PERFORMANCE ANALYTICAL SUITE */}
      <div id="shift-oee-analytical-suite" className="bg-white p-6 rounded-2xl border border-slate-205 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[9.5px] font-black font-mono tracking-wider uppercase">
                ANALITYKA ZMIANOWA OEE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ca9a] animate-ping" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans mt-1">
              Efektywność Pracy Ekip Produkcyjnych (Rano • Popołudnie • Noc)
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
              Weryfikacja parametrów OEE wydziału kapsułkowania i sprężania Biofarm S.A. w czasie rzeczywistym
            </p>
          </div>

          <div className="flex gap-1.5 bg-slate-105 bg-slate-100 p-1.5 rounded-xl border border-slate-205/80">
            {shiftOeeStats.map((sh) => (
              <button
                key={sh.id}
                type="button"
                onClick={() => setActiveShiftTab(sh.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                  activeShiftTab === sh.id
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>{sh.id}</span>
                {sh.status.includes('LIVE') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bento Grid layout for Shift cards overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {shiftOeeStats.map((sh) => {
            const isSelected = activeShiftTab === sh.id;
            const isLive = sh.status.includes('LIVE');
            const liveHighlightBorder = isLive 
              ? 'ring-2 ring-emerald-500/60 ring-offset-2 border-emerald-300' 
              : 'border-slate-200';

            return (
              <div
                key={sh.id}
                onClick={() => setActiveShiftTab(sh.id as any)}
                className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-xs text-left ${
                  isSelected 
                    ? `bg-slate-50 border-slate-900 shadow-xs ${liveHighlightBorder}` 
                    : `bg-white/50 border-slate-200/60 ${liveHighlightBorder}`
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] text-slate-500 font-mono font-bold">{sh.hours}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-850 tracking-tight mt-1">
                      {sh.crewName}
                    </h4>
                  </div>
                  
                  <span className={`text-[8px] font-mono font-black border uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    isLive
                      ? 'bg-emerald-50 text-emerald-755 border-emerald-200 animate-pulse'
                      : sh.status === 'Zakończona'
                        ? 'bg-slate-100 text-slate-550 border-slate-200'
                        : 'bg-amber-50 text-amber-705 border-amber-250'
                  }`}>
                    {sh.status}
                  </span>
                </div>

                {/* Circular indicator container */}
                <div className="flex items-center gap-4 py-1.5">
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={sh.id === 'Rano' ? 'text-indigo-500' : sh.id === 'Popołudnie' ? 'text-emerald-500' : 'text-amber-500'}
                        strokeDasharray={`${sh.oee}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-black font-mono text-slate-850">{sh.oee}%</span>
                      <span className="text-[6.5px] uppercase font-bold text-slate-400">OEE</span>
                    </div>
                  </div>

                  <div className="space-y-1 select-none min-w-0 flex-1">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase">Lider operacyjny:</span>
                    <span className="text-[11px] font-bold text-slate-800 block tracking-tight truncate" title={sh.leader}>{sh.leader}</span>
                    <span className="text-[9.5px] text-slate-600 font-mono bg-white border border-slate-200 px-1.5 py-0.25 rounded inline-block">
                      Vol: {sh.volume.toLocaleString()} szt.
                    </span>
                  </div>
                </div>

                {/* Horizontal simple sliders for A-P-Q */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  {[
                    { label: 'Dostępność', val: sh.availability, col: 'bg-cyan-500' },
                    { label: 'Wydajność', val: sh.performance, col: 'bg-indigo-500' },
                    { label: 'Jakość', val: sh.quality, col: 'bg-emerald-500' }
                  ].map((subStat) => (
                    <div key={subStat.label} className="space-y-0.5 font-mono text-[9px] text-slate-500">
                      <div className="flex justify-between">
                        <span>{subStat.label}:</span>
                        <strong className="text-slate-700 font-bold">{subStat.val}%</strong>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${subStat.col}`} style={{ width: `${subStat.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Shift Crew Detailed Interactive Analysis Report Card */}
        {(() => {
          const selectedShift = shiftOeeStats.find(s => s.id === activeShiftTab) || shiftOeeStats[0];
          return (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 text-left">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-slate-900 text-white rounded-lg">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                      Karta audytowa GMP: {selectedShift.crewName} ({selectedShift.id})
                    </h4>
                    <p className="text-[8.5px] text-slate-500 font-mono">
                      Supervisor zmianowy: {selectedShift.leader} • Godziny pracy: {selectedShift.hours}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 text-[9px] font-mono shrink-0">
                  <span className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded">
                    Temp: <strong className="text-slate-800">{selectedShift.tempControl}</strong>
                  </span>
                  <span className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded">
                    Wilgotność: <strong className="text-slate-800">{selectedShift.humidity}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                
                {/* Visual Crew comparison summary d3 style diagram */}
                <div className="md:col-span-5 flex flex-col justify-center space-y-3.5 bg-white p-4 rounded-xl border border-slate-250 border-slate-200">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold text-left">
                    Rozkład strat tribologicznych i mechanicznych (%)
                  </span>
                  
                  <div className="space-y-2.5 font-mono text-[10px]">
                    {[
                      { key: 'Czas przezbrojeń (stemplarki)', value: selectedShift.id === 'Noc' ? 8.5 : selectedShift.id === 'Rano' ? 5.2 : 3.0, barColor: 'bg-rose-500' },
                      { key: 'Mikroprzestoje techniczne (sticking)', value: selectedShift.id === 'Noc' ? 3.3 : selectedShift.id === 'Rano' ? 2.7 : 1.2, barColor: 'bg-amber-500' },
                      { key: 'Utrata tempa (prędkość stemplowania)', value: selectedShift.id === 'Noc' ? 4.8 : selectedShift.id === 'Rano' ? 3.5 : 2.8, barColor: 'bg-yellow-500' },
                      { key: 'Korygujący odpad jakościowy (QA Reject)', value: selectedShift.id === 'Noc' ? 0.7 : selectedShift.id === 'Rano' ? 0.6 : 0.5, barColor: 'bg-purple-500' }
                    ].map((loss) => {
                      const pctWidth = (loss.value / 10) * 100;
                      return (
                        <div key={loss.key} className="space-y-1 text-left">
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span className="truncate max-w-[190px]">{loss.key}</span>
                            <strong>{loss.value}%</strong>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${loss.barColor}`} style={{ width: `${pctWidth}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Text logs and expert recommendation */}
                <div className="md:col-span-7 space-y-3 font-mono text-[11px] leading-relaxed text-left">
                  <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[8px] text-indigo-400 font-bold tracking-wider block uppercase">
                      RAPORT OPERACYJNY WYDZIAŁU FORM I KAPSUŁEK
                    </span>
                    <p className="text-xs leading-normal font-sans italic">
                      "{selectedShift.notes}"
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch">
                    <div className="flex items-start gap-1.5 text-[9px] text-slate-400 leading-normal max-w-sm">
                      <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                      <span>
                        Wypasowanie i regeneracja w locie: Brygada z najwyższym OEE zostanie nominowana do nagrody kwartalnej Biofarm Safety First. Obecny target premiowy wynosi &ge;85%.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        alert(`Wygenerowano audit log dla zmiany: ${selectedShift.id}\nBrygada: ${selectedShift.crewName}\nSuma cykli: ${selectedShift.volume.toLocaleString()} uderzeń\nŚrednie OEE zmianowe: ${selectedShift.oee}%\nZabezpieczono podpisem cyfrowym SHA256 zgodnym z FDA 21 CFR Part 11.`);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-[#00ca9a] text-white font-mono font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 uppercase select-none"
                    >
                      🛡️ Eksportuj Raport Zmiany FDA ➔
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
      </div>

      {/* 4. Deep Analytics Visual Section (Fine Line Borders, technical details) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Grid: Live Steel Durability & Stroke wear indicators */}
        <div className="lg:col-span-7 bg-white p-6 lg:p-7 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-indigo-50 pb-4">
            <div>
              <h3 className="text-base font-display font-bold text-biofarm-dark">
                Zalecenia Trwałości i Gatunki Stali
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 uppercase">
                Szacowane limity uderzeń wg metalurgii
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-biofarm-blue" />
          </div>

          <div className="space-y-4">
            {[
              { steel: 'M340 Bohler (PM-N)', limit: '5.0M uderzeń', color: 'bg-emerald-500', desc: 'Sproszkowana stal nowej generacji o maksymalnej odporności na ścieranie kleiste.' },
              { steel: 'Vasco 50', limit: '4.5M uderzeń', color: 'bg-teal-500', desc: 'Wysoka udarność stempla, doskonała do mocnego znakowania i logotypów Biofarm.' },
              { steel: '1.2379 (D2)', limit: '4.0M uderzeń', color: 'bg-blue-500', desc: 'Standardowa odporność. Wymaga częstszego polerowania oliwą parafinową.' },
              { steel: 'Durable-Max Carbon', limit: '6.0M uderzeń', color: 'bg-indigo-500', desc: 'Wzmocniona powłoką DLC chropowatość robocza poniżej Ra 0.08.' },
            ].map((item) => (
              <div key={item.steel} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800 font-mono">{item.steel}</span>
                  <span className="px-2 py-0.5 bg-slate-200/50 rounded font-bold text-slate-700 font-mono">{item.limit} limit</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: '100%' }} />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Grid: Steel Type breakdown SVG chart & Quick Actions */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          
          {/* Steel usage donut visualization mockup */}
          <div className={`p-6 rounded-2xl shadow-lg space-y-4 flex-1 relative overflow-hidden transition-all ${
            isLight 
              ? 'bg-slate-100 border border-slate-250 text-slate-800' 
              : 'bg-biofarm-dark text-white border border-white/10 bg-grid-pattern-dark shadow-2xl'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-biofarm-cyan/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className={`border-b pb-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <h4 className={`text-sm font-semibold tracking-wider font-mono uppercase ${isLight ? 'text-indigo-900 font-extrabold' : 'text-biofarm-cyan'}`}>
                Metryki Zużycia Całkowitego
              </h4>
              <p className={`text-[10px] mt-0.5 uppercase tracking-wide ${isLight ? 'text-slate-500 font-semibold' : 'text-slate-400'}`}>
                Łączna produkcja tabletkarek Biofarm
              </p>
            </div>

            <div className="flex items-center gap-6 py-2">
              {/* Beautiful custom vector indicator of cycles */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke={isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'} strokeWidth="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#06b6d4" strokeWidth="10" strokeDasharray="251" strokeDashoffset="75" className="drop-shadow-[0_0_6px_#06b6d4]" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500 font-bold' : 'text-slate-404 text-slate-400'}`}>PUMPING</span>
                  <span className={`text-base font-display font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>70%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className={`text-2xl font-display font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {(totalCycles / 1000000).toFixed(2)}M <span className={`text-xs font-normal ${isLight ? 'text-slate-550' : 'text-slate-400'}`}>cykli</span>
                </div>
                <p className={`text-[11px] leading-relaxed font-mono ${isLight ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                  Suma nacisków stemplowych zarejestrowanych we wszystkich czynnych seriach Biofarm.
                </p>
              </div>
            </div>

            {/* Quick alert notifications (Interactive with history modal link) */}
            <div 
              onClick={() => onSelectToolSetHistory('621503')}
              className={`p-3 rounded-lg border hover:border-orange-400 text-xs flex gap-2 cursor-pointer transition-all duration-300 shadow-sm group ${
                isLight 
                  ? 'bg-orange-50/80 border-orange-200 text-orange-950 font-medium' 
                  : 'bg-orange-500/15 border-orange-500/30 hover:bg-orange-500/25 hover:border-orange-400 text-orange-200'
              }`}
              title="Kliknij ten pasek, aby otworzyć pełny, dedykowany modal historii serwisowej kompletu #621503!"
            >
              <Flame className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform animate-pulse" />
              <span className="flex-1">
                Zalecana konserwacja dla kompletu stempli <strong>#621503</strong> (Bioprazol Max) ze względu na mikro-zużycie krawędzi.
                <span className={`block text-[9px] uppercase font-bold tracking-wider mt-0.5 underline transition-colors ${
                  isLight ? 'text-emerald-800' : 'text-[#00ca9a] group-hover:text-emerald-400'
                }`}>
                  ➔ Kliknij tutaj, aby wejść w dedykowany Dziennik Serwisowy GMP
                </span>
              </span>
            </div>
          </div>

          {/* Quick Actions Portal */}
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-center space-y-3 shadow-inner">
            <h4 className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">
              Szybkie akcje dyspozytorskie
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onNavigateToForm}
                className="px-4 py-3 bg-biofarm-blue hover:bg-biofarm-mid text-white text-xs font-bold rounded-lg text-center transition-all cursor-pointer shadow-sm uppercase tracking-wide"
              >
                + Nowy Komplet
              </button>
              
              <button
                type="button"
                className="px-4 py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg text-center transition-all cursor-pointer uppercase tracking-wide"
                onClick={() => alert('Wydruk raportu stanu w toku - sprawdź podłączony ploter GMP!')}
              >
                Drukuj Raport Stanu
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 4. Pre-emptive Live Maintenance Alerts Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-base font-display font-bold text-biofarm-dark flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              Alerty Prewencyjne GMP (Zużycie &ge; 90%)
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
              Stanowiskowe podsumowanie kompletów zbliżających się do limitu cykli prasujących
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            STATUS: <span className="text-indigo-600 font-bold">MONITORING CYKLI</span>
          </div>
        </div>

        {(() => {
          const maintenanceAlerts = toolSets
            .map(t => {
              const pct = (t.uzycieGlowne / t.uzycieLimit) * 100;
              return { ...t, percentage: pct };
            })
            .filter(t => t.percentage >= 90 && t.status !== 'Wycofany z produkcji')
            .sort((a, b) => b.percentage - a.percentage);

          if (maintenanceAlerts.length > 0) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {maintenanceAlerts.map((alertItem) => {
                  const isCritical = alertItem.percentage >= 95;
                  const averageDailyUsage = Math.max(30000, 45000 + (parseInt(alertItem.id) || 12345) % 5 * 15000);
                  const strokesRemaining = alertItem.uzycieLimit - alertItem.uzycieGlowne;
                  const daysRemaining = Math.max(0, Math.ceil(strokesRemaining / averageDailyUsage));

                  return (
                    <motion.div
                      key={alertItem.id}
                      onClick={() => onSelectToolSetHistory(alertItem.id)}
                      className={`p-4 border rounded-xl space-y-3 relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-md hover:border-indigo-300 ${
                        isCritical
                          ? 'border-rose-350 bg-rose-100/25 hover:bg-rose-100/40'
                          : 'bg-rose-50/15 border-rose-100 hover:bg-rose-50/30'
                      }`}
                      animate={isCritical ? {
                        scale: [1, 1.015, 1],
                        borderColor: ['#fecaca', '#fca5a5', '#fecaca'],
                        backgroundColor: ['rgba(254, 226, 226, 0.15)', 'rgba(254, 226, 226, 0.35)', 'rgba(254, 226, 226, 0.15)'],
                      } : undefined}
                      transition={isCritical ? {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      } : undefined}
                      whileHover={{ scale: 1.02, y: -2 }}
                      title="Kliknij, aby otworzyć dziennik operacyjny i certyfikat dla tego kompletu!"
                    >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                          {alertItem.id}
                        </span>
                        <div className="text-xs font-semibold text-slate-800 mt-1.5 line-clamp-1">
                          {alertItem.nazwaProduktu}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-black text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded">
                        {alertItem.percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Wykonane uderzenia</span>
                        <span>{alertItem.uzycieGlowne.toLocaleString()} / {alertItem.uzycieLimit.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-500 rounded-full" 
                          style={{ width: `${Math.min(alertItem.percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono bg-slate-50 border border-slate-100/70 rounded-lg p-2 text-slate-500">
                      <span>Średnie zużycie: <strong className="text-slate-700">{(averageDailyUsage / 1000).toFixed(0)}k/dobę</strong></span>
                      <span className="flex items-center gap-1">
                        Pozostało: <strong className={daysRemaining <= 3 ? "text-rose-600 font-bold" : "text-amber-600 font-bold"}>{daysRemaining} {daysRemaining === 1 ? 'dzień' : 'dni'}</strong>
                      </span>
                    </div>

                    <p className="text-[10px] text-amber-800 bg-amber-50 rounded-lg p-2 border border-amber-105 leading-normal font-mono relative">
                      Wymagana regeneracja roboczej korony stempla przed utratą graweru Biofarm.
                      <span className="block text-[8px] text-indigo-600 font-bold mt-1 text-right italic font-sans">
                        Kliknij, by otworzyć Dziennik Serwisowy GMP ➔
                      </span>
                    </p>
                  </motion.div>
                  );
                })}
              </div>
            );
          } else {
            return (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-emerald-800">
                  Wszystkie komplety w normie (zużycie &lt; 90%)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  Brak pilnych wskazań do polerowania lub regeneracji graweru w Dziale Utrzymania Ruchu BIOFARM.
                </p>
              </div>
            );
          }
        })()}
      </div>
    </div>
  );
};
