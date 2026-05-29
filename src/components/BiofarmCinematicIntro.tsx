import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Cpu } from 'lucide-react';

interface BiofarmCinematicIntroProps {
  onComplete: () => void;
}

// Typographic Vector Definition of each individual letter in "IOFARM"
const lettersData: Record<string, { viewBox: string, paths: string[], widthClass: string, hasGlow?: boolean }> = {
  I: { 
    viewBox: "0 0 20 100", 
    paths: ["M 0,20 L 20,0 H 20 V 100 H 0 Z"], 
    widthClass: "w-[12px] sm:w-[16px] md:w-[20px]" 
  },
  O: { 
    viewBox: "0 0 84 100", 
    paths: [
      "M 42,0 C 65,0 84,22 84,50 C 84,78 65,100 42,100 C 19,100 0,78 0,50 C 0,22 19,0 42,0 Z",
      "M 42,21 C 29,21 21,34 21,50 C 21,66 29,79 42,79 C 55,79 63,66 63,50 C 63,34 55,21 42,21 Z"
    ], 
    widthClass: "w-[50px] sm:w-[68px] md:w-[84px]" 
  },
  F: { 
    viewBox: "0 0 76 100", 
    paths: ["M 0,24 L 24,0 H 76 V 12 H 16 V 50 H 60 V 62 H 16 V 100 H 16 L 0,84 Z"], 
    widthClass: "w-[45px] sm:w-[60px] md:w-[76px]",
    hasGlow: true 
  },
  A: { 
    viewBox: "0 0 84 100", 
    paths: [
      "M 16,100 L 0,84 L 38,0 H 54 L 84,100 H 68 L 58,60 H 26 L 16,100 Z",
      "M 30,48 H 54 L 42,16 Z"
    ], 
    widthClass: "w-[50px] sm:w-[68px] md:w-[84px]" 
  },
  R: { 
    viewBox: "0 0 80 100", 
    paths: [
      "M 0,24 L 24,0 H 50 C 72,0 78,10 78,24 C 78,38 70,48 48,48 L 74,100 H 58 L 36,48 H 16 V 100 H 0 Z",
      "M 16,12 H 44 C 52,12 54,16 54,24 C 54,32 52,36 44,36 H 16 Z"
    ], 
    widthClass: "w-[48px] sm:w-[64px] md:w-[80px]" 
  },
  M: { 
    viewBox: "0 0 92 100", 
    paths: ["M 0,24 L 24,0 H 32 L 46,55 L 60,16 L 76,0 H 92 V 100 H 76 V 32 L 46,75 L 16,32 V 100 H 0 Z"], 
    widthClass: "w-[55px] sm:w-[74px] md:w-[92px]" 
  }
};

const letterArray = ['I', 'O', 'F', 'A', 'R', 'M'];

export const BiofarmCinematicIntro: React.FC<BiofarmCinematicIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'genesis' | 'letterB' | 'transform' | 'pulse' | 'dissolve'>('genesis');
  const [skipHovered, setSkipHovered] = useState(false);

  useEffect(() => {
    // Stage choreography timeline corresponding to luxury video sequence:
    // 0.2s: Genesis ambient space begins
    // 0.8s: Perfect large B symbol lands in direct center
    // 2.2s: Clean layout shift begins - B slides left as the logo expands with sweep
    // 3.9s: Absolute pulse alignment & subtitle lock
    // 5.3s: Beautiful overlay dissolve transition
    const t1 = setTimeout(() => setPhase('letterB'), 600);
    const t2 = setTimeout(() => setPhase('transform'), 2200);
    const t3 = setTimeout(() => setPhase('pulse'), 3900);
    const t4 = setTimeout(() => setPhase('dissolve'), 5300);
    const t5 = setTimeout(() => {
      onComplete();
    }, 6000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[10000] bg-[#030611] flex flex-col items-center justify-center overflow-hidden select-none font-sans">
      
      {/* Sci-Fi Blueprint Spatial Grid Layer */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,202,154,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,202,154,0.012)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-90" />
      
      {/* Deep volumetric optical nebulae light casts */}
      <motion.div 
        animate={{ 
          scale: [1, 1.06, 1],
          opacity: [0.18, 0.26, 0.18]
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-blue-600/12 blur-[140px] pointer-events-none" 
      />
      
      <motion.div 
        animate={{ 
          scale: [1, 1.12, 1],
          opacity: [0.12, 0.20, 0.12]
        }}
        transition={{ duration: 7, delay: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[450px] h-[450px] rounded-full bg-[#00ca9a]/8 blur-[110px] pointer-events-none" 
      />

      {/* Cybernetic telemetry and GMP operational indicators */}
      <div className="absolute top-6 left-6 right-6 flex justify-between text-[9px] font-mono tracking-[0.25em] text-cyan-400/40 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-[#00ca9a] rounded-full animate-ping" />
          <span>PORTAL_ACTIVE // CORE v3.0 // CMP_ENG</span>
        </div>
        <div className="hidden sm:block">BIOFARM MEDICAL SOLUTIONS // VISUAL BRAND PREMIERE</div>
      </div>

      {/* Modern interactive operator skip option */}
      <button 
        onClick={onComplete}
        onMouseEnter={() => setSkipHovered(true)}
        onMouseLeave={() => setSkipHovered(false)}
        className="absolute bottom-10 right-10 bg-white/5 border border-white/10 hover:border-cyan-400 hover:text-cyan-300 hover:bg-white/10 text-white/50 px-4 py-2 rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all duration-300 z-10 cursor-pointer"
      >
        Omiń Intro {skipHovered ? '»' : '>'}
      </button>

      {/* Centerpiece Cinematic Animation Stage */}
      <div className="relative flex flex-col items-center justify-center min-h-[300px] w-full max-w-5xl px-4">

        {/* Outer concentric tech halo (rotates and expands behind the centered B) */}
        <AnimatePresence>
          {phase === 'letterB' && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [1, 1.05, 1], opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute flex items-center justify-center pointer-events-none z-0"
            >
              <div className="w-80 h-80 border-2 border-dashed border-[#00ca9a]/20 rounded-full animate-spin [animation-duration:50s]" />
              <div className="absolute w-96 h-96 border border-cyan-500/10 rounded-full animate-ping [animation-duration:8s]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Responsive, beautiful flex row containing the letters. Plentiful workspace (gaps) to ensure perfect tracking */}
        <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 h-32 md:h-40">
          
          {/* 1. Sovereign Logo Letter "B" (Morphs smoothly left/right using layout transitions) */}
          <motion.div
            layout
            transition={{
              type: "spring",
              stiffness: 90,
              damping: 18,
              mass: 1.1
            }}
            className="relative flex items-center justify-center text-white shrink-0"
          >
            <motion.svg
              initial={{ scale: 0.25, opacity: 0, rotate: -15 }}
              animate={phase === 'genesis' ? { scale: 0.25, opacity: 0 } : { scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 1.1, type: "spring" }}
              viewBox="0 0 82 100"
              className="w-[50px] sm:w-[68px] md:w-[82px] h-[60px] sm:h-[82px] md:h-[100px]"
              fill="currentColor"
            >
              <path 
                d="M 0,24 L 24,0 H 55 C 76,0 82,10 82,24 C 82,36 74,46 55,48 C 74,50 82,60 82,76 C 82,90 76,100 45,100 H 28 V 62 H 46 V 50 H 28 V 37 H 55 V 25 H 14 V 100 H 0 Z" 
                fillRule="evenodd" 
              />
            </motion.svg>

            {/* Bright Laser core pulse on the B */}
            {phase === 'letterB' && (
              <motion.div 
                animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.95, 1.05, 0.95] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-cyan-400/20 rounded-lg blur-md mix-blend-color-dodge pointer-events-none"
              />
            )}
          </motion.div>

          {/* 2. Expanding characters string: "IOFARM", each rendered exactly using our premium vector layout */}
          <AnimatePresence>
            {(phase === 'transform' || phase === 'pulse' || phase === 'dissolve') && (
              <div className="flex items-center gap-4 sm:gap-6 md:gap-8 lg:gap-10">
                {letterArray.map((letter, idx) => {
                  const data = lettersData[letter];
                  if (!data) return null;

                  return (
                    <motion.div
                      key={letter}
                      initial={{ opacity: 0, x: -60, scale: 0.7, filter: 'blur(12px)' }}
                      animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
                      transition={{
                        duration: 0.55,
                        delay: idx * 0.12,
                        ease: [0.16, 1, 0.3, 1] // Custom ultra-smooth ease
                      }}
                      className="relative flex items-center justify-center text-white shrink-0 select-none"
                    >
                      <svg
                        viewBox={data.viewBox}
                        className={`${data.widthClass} h-[60px] sm:h-[82px] md:h-[100px] text-white`}
                        fill="currentColor"
                      >
                        {data.paths.map((p, pIdx) => (
                          <path key={pIdx} d={p} fillRule="evenodd" />
                        ))}
                      </svg>

                      {/* Accent spark glow specific to F inside the sequence */}
                      {data.hasGlow && (
                        <motion.div 
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          className="absolute inset-0 bg-cyan-500/20 blur-sm mix-blend-color-dodge rounded pointer-events-none"
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Sweep bar (laser sweep line that travels horizontally mimicking production tablet calibration) */}
          {phase === 'transform' && (
            <motion.div
              initial={{ left: "10%", opacity: 0 }}
              animate={{ left: ["10%", "95%", "100%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute top-0 bottom-0 w-[4px] bg-gradient-to-b from-transparent via-[#00ca9a] to-transparent shadow-[0_0_20px_#00ca9a] z-50 pointer-events-none"
            />
          )}

          {/* Particle flash flare */}
          {phase === 'transform' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 2.2, 0], opacity: [0.8, 1, 0] }}
              transition={{ delay: 0.5, duration: 1.0 }}
              className="absolute right-[20%] w-20 h-20 rounded-full bg-cyan-400/20 blur-xl pointer-events-none mix-blend-screen"
            />
          )}

          {/* Shockwave visual pulse ring */}
          <AnimatePresence>
            {phase === 'pulse' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0.85, 0], scale: [0.85, 1.35, 1.6] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute inset-y-0 w-full bg-transparent border border-white/40 pointer-events-none mix-blend-color-dodge filter blur-sm"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Fine subtext indicators positioned with spacious margin */}
        <div className="h-16 mt-8 relative flex flex-col items-center justify-center">
          
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={phase !== 'genesis' ? { width: 340, opacity: 1 } : { width: 0, opacity: 0 }}
            transition={{ duration: 1.3, delay: 0.6 }}
            className="h-[1px] bg-gradient-to-r from-transparent via-[#00ca9a]/40 to-transparent mb-4"
          />

          <AnimatePresence>
            {(phase === 'transform' || phase === 'pulse' || phase === 'dissolve') && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.8 }}
                className="text-center space-y-2"
              >
                <p className="text-[12px] font-mono tracking-[0.45em] text-[#00ca9a] uppercase font-bold">
                  PHARMA 4.0 ECOSYSTEM
                </p>
                <p className="text-[9px] font-mono tracking-[0.25em] text-slate-400 uppercase">
                  INTELLIGENT TABLET TOOLING SYSTEM
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Blueprint background labels of heavy high-concept pharma technology */}
      <div className="absolute bottom-6 left-6 hidden sm:flex gap-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400/20" />
          <div className="text-[8px] font-mono text-slate-500">
            <div>GMP CALIBRATION</div>
            <div>STATUS_CERTIFIED: BIOFARM_PL</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400/20" />
          <div className="text-[8px] font-mono text-slate-500">
            <div>ACTIVE STAMP SCANNER</div>
            <div>PRECISION CONTROLLER v3</div>
          </div>
        </div>
      </div>

    </div>
  );
};
