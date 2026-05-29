import React from 'react';
import { motion } from 'motion/react';
import { BiofarmLogo } from './BiofarmLogo';
import { Shield, Sparkles, Activity, Cpu, ArrowRight } from 'lucide-react';
import cleanroomBg from '../assets/images/cleanroom_bg_1779828675178.png';

interface LandingHeroProps {
  onEnter: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onEnter }) => {
  return (
    <div className="relative min-h-screen bg-biofarm-dark text-white overflow-hidden flex flex-col justify-between font-sans bg-grid-pattern-dark">
      {/* 3D Render High-Tech Background Asset Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url(${cleanroomBg})` }}
      />

      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-biofarm-blue/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-biofarm-cyan/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Navigation bar */}
      <header className="border-b border-white/10 px-8 py-5 flex justify-between items-center relative z-10 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <BiofarmLogo variant="light" height={44} />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center gap-6"
        >
          <span className="text-xs font-mono text-white/45 tracking-widest hidden sm:inline uppercase">
            [ SECURE PHARMA PROTOCOL ]
          </span>
          <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-biofarm-cyan/10 border border-biofarm-cyan/30 text-biofarm-cyan text-xs font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-biofarm-cyan animate-pulse" />
            V3.0.0 ACTIVE
          </span>
        </motion.div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 py-12">
        
        {/* Left column: Text Content */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left space-y-8">
          <div className="inline-block">
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-xs font-mono text-biofarm-cyan tracking-[0.2em] uppercase border border-biofarm-cyan/30 px-3 py-1 rounded bg-biofarm-cyan/5"
            >
              System Zarządzania Standardem GMP
            </motion.span>
          </div>

          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
              className="text-4xl md:text-6xl xl:text-7xl font-display font-light leading-[1.05] tracking-tight"
            >
              Nowy Standard <br />
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-biofarm-cyan">
                Oprzyrządowania
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-slate-400 text-base md:text-lg max-w-xl font-light leading-relaxed"
            >
              Przemysłowa precyzja Biofarm spotyka cyfrowe zarządzanie. Monitoruj, dodawaj, weryfikuj oraz analizuj zużycie stempli i matryc w czasie rzeczywistym.
            </motion.p>
          </div>

          {/* Key specs ticker grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="grid grid-cols-3 gap-4 py-4 border-y border-white/5 font-mono"
          >
            <div>
              <div className="text-2xl font-medium text-white font-display">25+ kN</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Siła Nacisku</div>
            </div>
            <div>
              <div className="text-2xl font-medium text-white font-display">GMP-V</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Status Walidacji</div>
            </div>
            <div>
              <div className="text-2xl font-medium text-white font-display">0.02 mm</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 font-mono">Tolerancja Stali</div>
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <button
              id="btn-enter-portal"
              onClick={onEnter}
              className="group relative inline-flex items-center gap-3 px-8 py-5 rounded-lg bg-white text-biofarm-dark font-display font-semibold text-sm tracking-wider uppercase overflow-hidden hover:text-white transition-colors duration-300 shadow-xl cursor-pointer"
            >
              <div className="absolute inset-0 w-0 bg-biofarm-blue transition-all duration-300 ease-out group-hover:w-full -z-1" />
              <span>Wejdź do systemu zarządzania</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>

        {/* Right column: Interactive Premium Visual Matrix representing toolsets */}
        <div className="lg:col-span-5 relative flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="w-full max-w-[420px] aspect-square rounded-3xl border border-white/10 bg-gradient-to-tr from-white/5 to-white/[0.02] p-8 backdrop-blur-xl relative overflow-hidden"
          >
            {/* Embedded grid line */}
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/5" />
            <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-white/5" />

            {/* Glowing neon sphere resembling tablet punch geometry */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-br from-biofarm-cyan/30 to-biofarm-blue/25 blur-xl animate-pulse" />

            <div className="relative h-full flex flex-col justify-between">
              {/* Card Header showing technical data */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-biofarm-cyan uppercase tracking-widest">
                    MODEL MATRYCY
                  </div>
                  <div className="text-xl font-display font-semibold text-white">
                    EU-D / CAPSULE-M
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-biofarm-cyan">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              {/* Wireframe Rotating tablet simulator */}
              <div className="my-auto flex justify-center py-6">
                <motion.svg
                  viewBox="0 0 100 100"
                  className="w-40 h-40 text-white/20"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                >
                  {/* Tablet outline circles */}
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 2" />
                  <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" />
                  {/* Internal grid lines */}
                  <line x1="15" y1="50" x2="85" y2="50" stroke="currentColor" strokeWidth="0.5" />
                  <line x1="50" y1="15" x2="50" y2="85" stroke="currentColor" strokeWidth="0.5" />
                  {/* Capsule shape indicator */}
                  <rect x="32" y="42" width="36" height="16" rx="8" fill="none" stroke="#00ca9a" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(0,202,154,0.5)]" />
                  {/* Technical crosses */}
                  <path d="M50,10 L50,20 M50,80 L50,90 M10,50 L20,50 M80,50 L90,50" stroke="#06b6d4" strokeWidth="1.5" />
                </motion.svg>
              </div>

              {/* Specs block */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-400">
                <div className="border-l-2 border-biofarm-cyan pl-2">
                  <div className="text-[10px] text-slate-500 uppercase">Stal Hartowana</div>
                  <div className="text-white">M340 Bohler</div>
                </div>
                <div className="border-l-2 border-[#00ca9a] pl-2">
                  <div className="text-[10px] text-slate-500 uppercase">Wypolerowanie</div>
                  <div className="text-white">Ra &lt; 0.1 μm</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tiny decorative floating tags */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            className="absolute -top-4 -right-2 bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-2 backdrop-blur-md"
          >
            <Shield className="w-3 h-3 text-biofarm-cyan" />
            <span>ISO 9001:2015</span>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 6, delay: 1, ease: 'easeInOut' }}
            className="absolute -bottom-6 -left-4 bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-2 backdrop-blur-md"
          >
            <Sparkles className="w-3 h-3 text-[#00ca9a]" />
            <span>GMP PL-BIO-01</span>
          </motion.div>
        </div>
      </main>

      {/* Footer Info line */}
      <footer className="border-t border-white/5 py-6 px-12 text-center text-xs text-slate-500 font-mono relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          © {new Date().getFullYear()} Biofarm Sp. z o.o. • Wszystkie Prawa Zastrzeżone • GMP Toolset Portal
        </div>
        <div className="flex gap-6">
          <span className="hover:text-white transition-colors cursor-pointer">Specyfikacja Techniczna</span>
          <span className="hover:text-white transition-colors cursor-pointer">Bezpieczeństwo (RFiD)</span>
        </div>
      </footer>
    </div>
  );
};
