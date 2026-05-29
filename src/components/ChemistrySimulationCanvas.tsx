import React, { useRef, useEffect } from 'react';

interface ChemistrySimulationCanvasProps {
  chemical: string;
  ph: number;
}

export const ChemistrySimulationCanvas: React.FC<ChemistrySimulationCanvasProps> = ({
  chemical,
  ph
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Set high-DPI sizing
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    handleResize();

    // Setup molecular particle system
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
      type: 'ion' | 'bubble' | 'oxid_layer';
      angle?: number;
    }

    const particles: Particle[] = [];
    const maxParticles = 60;

    const render = () => {
      time += 1;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw elegant dark background with cyber grid
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 1;
      const gridSize = 12;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 2. Draw metallic surface (steel lattice) on the bottom
      const surfaceY = h - 35;
      const gradient = ctx.createLinearGradient(0, surfaceY, 0, h);
      gradient.addColorStop(0, '#334155'); // slate-700
      gradient.addColorStop(0.3, '#475569'); // slate-600
      gradient.addColorStop(1, '#1e293b'); // slate-800
      ctx.fillStyle = gradient;
      ctx.fillRect(0, surfaceY, w, h);

      // Draw metallic lattice nodes (atoms of steel)
      ctx.fillStyle = '#64748b'; // slate-500
      for (let x = 15; x < w; x += 22) {
        for (let y = surfaceY + 8; y < h; y += 12) {
          ctx.beginPath();
          ctx.arc(x + (y % 2 * 6), y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Render passivation oxide barrier or corrosion pits
      if (chemical === 'active_acid') {
        // Chromium active oxide passive protective layer
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)'; // translucent emerald green
        ctx.fillRect(0, surfaceY - 6, w, 6);

        // Solid protective barrier line
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, surfaceY - 6);
        ctx.lineTo(w, surfaceY - 6);
        ctx.stroke();

        // Neon dots representing chromium oxide Cr2O3 molecules
        ctx.fillStyle = '#34d399';
        for (let x = 8; x < w; x += 15) {
          ctx.beginPath();
          ctx.arc(x, surfaceY - 6, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw HUD labeling inside canvas
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('✓ AKTYWNA WARSTWA PASYWNA (Cr₂O₃) - CHRONI STAL', 8, surfaceY - 12);
      } else if (chemical === 'chlorine') {
        // Red radioactive indicator of active etching / pitting corrosion
        const p1 = Math.sin(time * 0.05) * 2;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        
        // Jagged, corroded surface line due to active chlorine pitting
        ctx.beginPath();
        ctx.moveTo(0, surfaceY);
        for (let x = 0; x < w; x += 15) {
          const pitDepth = x % 45 === 0 ? 8 + p1 : 0;
          ctx.lineTo(x, surfaceY + pitDepth);
        }
        ctx.stroke();

        // Red translucent alert fill inside pits
        for (let x = 0; x < w; x += 45) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.beginPath();
          ctx.arc(x, surfaceY, 10, 0, Math.PI);
          ctx.fill();

          ctx.strokeStyle = 'rgba(239,68,68,0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('⚠️ KOROZJA WŻEROWA (ACTIVE PITTING) - USZKODZENIE GEOMETRII', 8, surfaceY - 12);
      } else if (chemical === 'alkali') {
        // Alkaline salt protection overlay
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, surfaceY - 2);
        ctx.lineTo(w, surfaceY - 2);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('● WARSTWA ALKALICZNA - WYSOKA STABILIZACJA', 8, surfaceY - 10);
      } else {
        // Water rinse layer
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, surfaceY - 1);
        ctx.lineTo(w, surfaceY - 1);
        ctx.stroke();

        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('✓ PŁUKANIE KONTROLNE (H₂O DEMI)', 8, surfaceY - 10);
      }

      // 4. Update and draw ions / chemical molecules particles
      // Spawn new particles depending on chemical and pH
      let spawnRate = 0.1;
      if (chemical === 'active_acid') spawnRate = 0.2;
      else if (chemical === 'chlorine') spawnRate = 0.35; // high activity
      else if (chemical === 'alkali') spawnRate = 0.15;

      if (particles.length < maxParticles && Math.random() < spawnRate) {
        let pColor = '#38bdf8'; // Default blue (demi)
        let pRadius = 2;
        let pType: 'ion' | 'bubble' | 'oxid_layer' = 'ion';

        if (chemical === 'active_acid') {
          pColor = ph < 2.5 ? '#f43f5e' : '#ec4899'; // Strong acid is ruby red / pink H+
          pRadius = 1.5 + Math.random() * 2;
        } else if (chemical === 'chlorine') {
          pColor = '#fbbf24'; // Active green-yellow chlorine Cl- ions
          pRadius = 2 + Math.random() * 2.5;
        } else if (chemical === 'alkali') {
          pColor = '#a855f7'; // Purple bases OH-
          pRadius = 2.5 + Math.random() * 2;
        }

        particles.push({
          x: Math.random() * w,
          y: Math.random() * (surfaceY - 20),
          vx: (Math.random() - 0.5) * 1.2,
          vy: chemical === 'chlorine' ? 0.4 + Math.random() * 1.5 : 0.2 + Math.random() * 0.8, // chlorine drops faster
          radius: pRadius,
          color: pColor,
          alpha: 0.9,
          type: pType
        });
      }

      // Draw and update active particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Movement
        p.x += p.vx;
        p.y += p.vy;

        // Bouncing walls
        if (p.x < 0 || p.x > w) p.vx *= -1;

        // Interaction with surface
        if (p.y >= surfaceY - 4) {
          if (chemical === 'active_acid') {
            // H+ ions react to build oxide layers and float as hydrogen gas H2 bubbles
            p.color = '#38bdf8'; // turns into gas
            p.radius = 3 + Math.random() * 3;
            p.vy = -1.2 - Math.random() * 1.5; // floats up fast as bubble!
            p.vx += (Math.random() - 0.5) * 0.8;
            p.type = 'bubble';
          } else if (chemical === 'chlorine') {
            // Cl- ions stick to surface and cause corrosion sparks!
            if (Math.random() < 0.3) {
              p.y = surfaceY - (Math.random() * 4);
              p.vx = 0;
              p.vy = 0;
              p.alpha -= 0.04; // dissolves
            } else {
              // bounce off and float slowly with red flash
              p.color = '#ef4444';
              p.vy = -0.3;
              p.vx = (Math.random() - 0.5) * 1;
            }
          } else {
            // default dissolve
            p.alpha -= 0.05;
          }
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.type === 'bubble') {
          // Draw translucent gas bubble with ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.fillStyle = 'rgba(96, 165, 250, 0.15)';
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Sparkle glow for chlorine
          if (chemical === 'chlorine' && Math.random() > 0.8) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
          }
        }
        ctx.restore();

        // Expired particle cleanup
        if (p.alpha <= 0.05 || p.y < -10) {
          particles.splice(i, 1);
        }
      }

      // 5. Digital Overlay (HUD Indicators)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '7px monospace';
      ctx.fillText(`Kationy H⁺/OH⁻ x${particles.length} | Odczyn: ${ph.toFixed(2)}`, w - 180, 16);
      
      const rateLabel = chemical === 'active_acid' ? 'PASYWACJA ELEKTROLITYCZNA' : chemical === 'chlorine' ? 'DYSOCJACJA KOROZYJNA' : 'STAN OBOJĘTNY';
      ctx.fillText(`Faza dynamiczna: ${rateLabel}`, w - 180, 26);

      // Draw target focus boxes over corrosion zone
      if (chemical === 'chlorine') {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(w / 2 - 30, surfaceY - 15, 60, 20);
        ctx.fillStyle = '#ef4444';
        ctx.fillText('FOCUS: PITTING DETECTED', w / 2 - 28, surfaceY - 18);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [chemical, ph]);

  return (
    <div className="relative rounded-xl border border-indigo-505/20 overflow-hidden shadow-inner">
      <canvas 
        ref={canvasRef} 
        className="w-full h-36 block transition-all grayscale-0"
      />
      <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1.5 text-[8.5px] font-mono text-slate-300">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
        REAKTOR DEZYKACYJNY i CHROPOWATOŚCI STALI
      </div>
    </div>
  );
};
