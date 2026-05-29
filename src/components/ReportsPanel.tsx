import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, TrendingUp, HelpCircle, ShieldCheck, Download, Award, ShieldAlert, AlertTriangle, Info, ExternalLink, Hash, Calendar, History, Wrench, X, User, Clock, FileText, Search, Printer, Plus, Lock, Fingerprint, Check, Layers, Camera, Paperclip, Eye } from 'lucide-react';
import { ResponsiveContainer, AreaChart as RechartsAreaChart, Area as RechartsArea, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine, LineChart as RechartsLineChart, Line as RechartsLine, Legend as RechartsLegend } from 'recharts';
import { ToolSet, ServiceRecord, ToolStatus } from '../types';
import { AddServiceRecordModal } from './AddServiceRecordModal';
import { ChemistrySimulationCanvas } from './ChemistrySimulationCanvas';
import { jsPDF } from 'jspdf';



// ==========================================
// INTERACTIVE 3D MICROSCOPE INSPECTION TAB
// ==========================================
interface Tool3DInspectionTabProps {
  tool: ToolSet;
  onUpdateToolSet: (updated: ToolSet) => void;
  onChangeSelectedTool: (updated: ToolSet) => void;
}

export const Tool3DInspectionTab: React.FC<Tool3DInspectionTabProps> = ({
  tool,
  onUpdateToolSet,
  onChangeSelectedTool,
}) => {
  // Rotate states
  const [yaw, setYaw] = useState<number>(0.5); // Initial horizontal rotation (radians)
  const [pitch, setPitch] = useState<number>(-0.2); // Initial vertical angle
  const [isRotating, setIsRotating] = useState<boolean>(true); // Idle rotation active
  const [activeDefectId, setActiveDefectId] = useState<string | null>(null);

  // Form states to add new microscopic defect
  const [showAddDefect, setShowAddDefect] = useState<boolean>(false);
  const [newDefectOpis, setNewDefectOpis] = useState<string>('');
  const [newDefectStopien, setNewDefectStopien] = useState<'Słaby' | 'Umiarkowany' | 'Krytyczny'>('Umiarkowany');
  const [newDefectPowiekszenie, setNewDefectPowiekszenie] = useState<string>('150x');
  const [newDefectY, setNewDefectY] = useState<number>(45); // Y position from bottom in mm
  const [newDefectKat, setNewDefectKat] = useState<number>(120); // Rotation angle in deg
  
  // Local or hydrated defects list (Proposal 1 helper)
  const defects = React.useMemo(() => {
    if (tool.mikroskopDefekty && tool.mikroskopDefekty.length > 0) {
      return tool.mikroskopDefekty;
    }
    // Return sample defects if empty so the user is immediately seeing live 3D pointers
    return [
      {
        id: 'DEF-001',
        x: 0,
        y: 65, // on the punch shank (korpus stempla)
        z: 0,
        opis: 'Mikrozarysowanie i ślad zatarcia na prowadzeniu',
        stopien: 'Słaby' as const,
        data: '2026-05-12',
        powiekszenie: '100x',
        kompletnyOpis: 'Powierzchowne zarysowania wzdłużne powstałe na skutek niedostatecznego smarowania w gniazdach stemplarki. Chropowatość lokalna wzrosła do Ra=0.12µm. Wskazane polerowanie mikro-ścierne.',
      },
      {
        id: 'DEF-002',
        x: 0,
        y: 110, // near the tip transition (stożek przejściowy)
        z: 0,
        opis: 'Mikropęknięcie zmęczeniowe na promieniu główki',
        stopien: 'Krytyczny' as const,
        data: '2026-05-27',
        powiekszenie: '250x',
        kompletnyOpis: 'Poprzeczna linia przełomu zmęczeniowego o długości 0.38mm wykryta metodą wzbudzania fluorescencyjnego. Ryzyko pęknięcia całego stempla pod naciskiem powyżej 15 kN ! Element wycofany z użycia roboczego.',
      },
      {
        id: 'DEF-003',
        x: 0,
        y: 15, // near the punch mirror (czoło robocze)
        z: 0,
        opis: 'Delaminacja powłoki twardej CrN / Wyszczerbienie krawędzi',
        stopien: 'Umiarkowany' as const,
        data: '2026-05-24',
        powiekszenie: '500x',
        kompletnyOpis: 'Odprysk powłoki ochronnej chromowej o średnicy 45µm na krawędzi formującej fazę tabletki. Ryzyko przyklejania granulatu (Sticking) podczas twardego prasowania tabletek. Rekomendowane regenerowanie powłoki CrN.',
      }
    ];
  }, [tool.mikroskopDefekty]);

  // Handle auto spinning
  useEffect(() => {
    if (!isRotating) return;
    const interval = setInterval(() => {
      setYaw((y) => (y + 0.007) % (Math.PI * 2));
    }, 30);
    return () => clearInterval(interval);
  }, [isRotating]);

  // Handle canvas mouse dragging
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const dragStart = React.useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsRotating(false);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      yaw,
      pitch,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setYaw(dragStart.current.yaw + dx * 0.01);
    setPitch(Math.max(-Math.PI / 3, Math.min(Math.PI / 3, dragStart.current.pitch + dy * 0.01)));
  };

  const handleMouseUp = () => {
    dragStart.current = null;
  };

  // Redraw 3D punch outline inside HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2 - 20;

    // Drawing context setup
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';

    // Projection mathematics helper (Perspective projection for CAD look)
    const project3D = (x: number, y: number, z: number) => {
      // Rotation around Y (yaw)
      const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
      const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);

      // Rotation around X (pitch)
      const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
      const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);

      // Screen transform
      const fovVal = 400;
      const fDist = fovVal / (fovVal + z2);
      const scaleFactor = 1.6;
      return {
        x: cx + x1 * scaleFactor * fDist,
        y: cy + y2 * scaleFactor * fDist,
        z: z2, // depth for sorting and back-face culling
      };
    };

    // Blueprint representation of a Metrological Tool Punch
    // We represent the cylindrical profile as 12 circular slices down the Y axis
    // Heights range from -110 (Główka stempla) to +110 (Czoło robocze)
    const sections = [
      { yStatus: -110, r: 24, label: 'Główka Stempla (Punch Head)' },       // 0: Head flat top
      { yStatus: -95, r: 28, label: 'Promień Główki' },                   // 1: Head bevel
      { yStatus: -80, r: 16, label: 'Kołnierz Ograniczający (Neck)' },      // 2: Neck
      { yStatus: -50, r: 16, label: 'Trzon Stempla (Shank)' },            // 3: Shank upper
      { yStatus: 0, r: 16, label: 'Trzon Stempla (Shank)' },              // 4: Shank middle
      { yStatus: 50, r: 16, label: 'Trzon Stempla (Shank)' },              // 5: Shank lower
      { yStatus: 75, r: 16, label: 'Baryłka Prowadzenia (Back Barrel)' },  // 6: Barrel transition
      { yStatus: 90, r: 14, label: 'Stożek Redukcyjny (Cone)' },          // 7: Reduction taper
      { yStatus: 100, r: 10, label: 'Końcówka Robocza (Tip Stem)' },       // 8: Tip neck
      { yStatus: 108, r: 9.5, label: 'Ostrze Fazujące (Bevel)' },          // 9: Tip bevel
      { yStatus: 110, r: 9.2, label: 'Czoło Tłoczące (Punch Face Mirror)' } // 10: Punch face edge
    ];

    // Draw the main glass wireframe container shading (Chamber look)
    const drawSlices = () => {
      // 1. Draw horizontal rings
      sections.forEach((slice, idx) => {
        const ringPoints = [];
        const numSegments = 32;
        for (let i = 0; i < numSegments; i++) {
          const theta = (i / numSegments) * Math.PI * 2;
          const rx = slice.r * Math.cos(theta);
          const rz = slice.r * Math.sin(theta);
          ringPoints.push(project3D(rx, slice.yStatus, rz));
        }

        // Draw ring path
        ctx.beginPath();
        ctx.moveTo(ringPoints[0].x, ringPoints[0].y);
        for (let i = 1; i < ringPoints.length; i++) {
          ctx.lineTo(ringPoints[i].x, ringPoints[i].y);
        }
        ctx.closePath();

        // Shading style based on depth position
        if (idx === 0 || idx === sections.length - 1) {
          ctx.fillStyle = idx === 0 ? 'rgba(79, 70, 229, 0.12)' : 'rgba(16, 185, 129, 0.25)';
          ctx.fill();
        }
        
        ctx.strokeStyle = idx === sections.length - 1 
          ? 'rgba(16, 185, 129, 0.6)' 
          : slice.yStatus > 80 
            ? 'rgba(56, 189, 248, 0.55)' 
            : 'rgba(148, 163, 184, 0.25)';
        ctx.stroke();
      });

      // 2. Draw vertical rib lines linking slices together
      const numRibs = 8;
      for (let r = 0; r < numRibs; r++) {
        const theta = (r / numRibs) * Math.PI * 2;
        ctx.beginPath();
        const startPt = project3D(sections[0].r * Math.cos(theta), sections[0].yStatus, sections[0].r * Math.sin(theta));
        ctx.moveTo(startPt.x, startPt.y);

        for (let s = 1; s < sections.length; s++) {
          const pt = project3D(sections[s].r * Math.cos(theta), sections[s].yStatus, sections[s].r * Math.sin(theta));
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.stroke();
      }
    };

    drawSlices();

    // 3. Render pulsatings defects hotspots on top of the 3D grid
    defects.forEach((def) => {
      // Convert angular position + height to initial 3D model coordinate
      // We've stored static positions. Let's compute Y directly, and make them spread out around a simulated radius
      const heightOffset = def.y - 60; // relative to center cy
      
      // Calculate angular dispersion based on ID or index
      const localAngleRad = def.id === 'DEF-001' ? 0.3 : def.id === 'DEF-002' ? 3.6 : 1.9;
      
      // Determine radius of body at this Y height
      let currentRadius = 16;
      if (heightOffset < -30) currentRadius = 24 - (heightOffset + 110) * 0.1; // head
      else if (heightOffset > 40) currentRadius = 10; // tip stem

      const modelX = currentRadius * Math.cos(localAngleRad);
      const modelZ = currentRadius * Math.sin(localAngleRad);

      const pObj = project3D(modelX, heightOffset, modelZ);

      // Only draw the hot spot if it's on the front half of the cylinder (Z sorting)
      // Rotated Z position tells us depth; smaller Z means closer to camera
      if (pObj.z < 25) {
        const isHovered = activeDefectId === def.id;
        const color = def.stopien === 'Krytyczny' ? 'rgba(239, 68, 68, ' : def.stopien === 'Umiarkowany' ? 'rgba(245, 158, 11, ' : 'rgba(59, 130, 246, ';
        
        // Draw outward ripple wave
        const ripple = (Date.now() / 450) % 2;
        ctx.beginPath();
        ctx.arc(pObj.x, pObj.y, (isHovered ? 12 : 7) + ripple * 6, 0, Math.PI * 2);
        ctx.strokeStyle = color + (1 - ripple / 2).toFixed(2) + ')';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Solid inner core
        ctx.beginPath();
        ctx.arc(pObj.x, pObj.y, isHovered ? 6.5 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = color + '0.9)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Mini HUD Label
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 4;
        ctx.fillText(def.id, pObj.x + 9, pObj.y + 3);
        ctx.shadowBlur = 0; // reset
      }
    });

  }, [yaw, pitch, defects, activeDefectId]);

  // Handle addition of a new defect
  const handleSaveDefect = () => {
    if (!newDefectOpis.trim()) {
      alert('Proszę podać opis fizyczny mikropęknięcia/defektu.');
      return;
    }

    const newDef: any = {
      id: `DEF-00${defects.length + 1}`,
      x: 0,
      y: newDefectY, // heights match form
      z: 0,
      opis: newDefectOpis,
      stopien: newDefectStopien,
      data: new Date().toISOString().split('T')[0],
      powiekszenie: newDefectPowiekszenie,
      kompletnyOpis: `Inspekcja mikroskopowa (${newDefectPowiekszenie}) wykazała defekt o statusie ${newDefectStopien}. Wykryty na wysokości ${newDefectY} mm od krawędzi czoła roboczego pod kątem radialnym ${newDefectKat}°. ${newDefectOpis}`
    };

    const updatedSet: ToolSet = {
      ...tool,
      mikroskopDefekty: [...(tool.mikroskopDefekty || []), newDef]
    };

    onUpdateToolSet(updatedSet);
    onChangeSelectedTool(updatedSet);

    // Reset Form
    setNewDefectOpis('');
    setShowAddDefect(false);
    setActiveDefectId(newDef.id);

    // Alert
    alert(`DODANO REJESTR INSPEKCJI: Wada ${newDef.id} pomyślnie nałożona na wektorowy trójwymiarowy model stempla.`);
  };

  const activeDefectDetail = defects.find((d) => d.id === activeDefectId) || defects[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Visual top bar header with actions */}
      <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <h4 className="text-white text-sm font-bold tracking-tight uppercase font-mono flex items-center gap-1.5">
            🎯 Cyklonika Trójwymiarowa stempla (CAD 3D Mesh Inspection)
          </h4>
          <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
            Interaktywna makieta wektorowa stempla górnego / dolnego z siatką geometryczną. Przeciągnij model myszą, aby swobodnie obrócić go w osiach yaw/pitch i zidentyfikować wady mikroskopowe.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsRotating(!isRotating);
          }}
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            isRotating 
              ? 'bg-amber-600/15 border-amber-500/30 text-amber-300' 
              : 'bg-slate-800/80 border-slate-700 text-slate-350 hover:text-white'
          }`}
        >
          {isRotating ? '⏸ Wstrzymaj AutoObrót' : '🔄 Uruchom AutoObrót'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive 3D Canvas element */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-850 p-4 flex flex-col justify-between items-center relative min-h-[440px] select-none">
          
          {/* HUD Status layer */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-[10px] font-mono pointer-events-none">
            <div className="bg-slate-900/85 border border-white/5 px-2.5 py-1 rounded-lg text-amber-300">
              ROTATOR YAW: <strong className="font-bold text-white">{(yaw * (180 / Math.PI)).toFixed(0)}°</strong> | PITCH: <strong className="font-bold text-white">{(pitch * (180 / Math.PI)).toFixed(0)}°</strong>
            </div>

            <div className="bg-slate-900/85 border border-white/5 px-2.5 py-1 rounded-lg text-slate-400">
              OBIEKTY: <strong className="font-bold text-emerald-400">PUNCH_HEAD_EU-B_V1</strong>
            </div>
          </div>

          {/* HTML5 Canvas */}
          <canvas
            ref={canvasRef}
            width={380}
            height={340}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-grab active:cursor-grabbing w-full max-w-[380px] h-[340px] mt-4"
          />

          <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider mb-2">
            💡 PODPOWIEDŹ: Kliknij i przeciągaj lewym klawiszem myszki po stemplu, aby go obejść ze wszystkich stron
          </p>

          {/* Rotations Sliders row for assistive usage */}
          <div className="w-full border-t border-slate-900 pt-3 flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="shrink-0 w-8">YAW:</span>
              <input 
                type="range" 
                min="0" 
                max="6.28" 
                step="0.05"
                value={yaw}
                onChange={(e) => {
                  setIsRotating(false);
                  setYaw(parseFloat(e.target.value));
                }}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
            <div className="flex-1 flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="shrink-0 w-8">PITCH:</span>
              <input 
                type="range" 
                min="-1.5" 
                max="1.5" 
                step="0.05"
                value={pitch}
                onChange={(e) => {
                  setIsRotating(false);
                  setPitch(parseFloat(e.target.value));
                }}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Defects checklist and detail view */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          
          {/* List of active spots */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-200/5 p-4.5 space-y-3.5 text-left">
            <h5 className="text-white text-xs font-bold font-mono uppercase tracking-widest border-b border-white/5 pb-2">
              📋 Lista Wykrytych Pęknięć / Defektów Mikroskopowych
            </h5>
            
            <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
              {defects.map((def) => {
                const isActive = activeDefectId === def.id;
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => {
                      setIsRotating(false);
                      setActiveDefectId(def.id);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition-all ${
                      isActive 
                        ? 'bg-slate-900 border-indigo-500 text-white shadow-md' 
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          def.stopien === 'Krytyczny' 
                            ? 'bg-rose-500' 
                            : def.stopien === 'Umiarkowany' 
                              ? 'bg-amber-500' 
                              : 'bg-blue-500'
                        }`} />
                        <span className="font-mono text-[9px] font-bold uppercase">{def.id}</span>
                        <span className="text-[10.5px] font-semibold tracking-tight truncate max-w-[140px] text-slate-200">
                          {def.opis}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        Powiększenie: <strong className="text-slate-400">{def.powiekszenie}</strong> | wys.: {def.y} mm
                      </div>
                    </div>
                    
                    <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded ${
                      def.stopien === 'Krytyczny' 
                        ? 'bg-rose-500/15 text-rose-300' 
                        : def.stopien === 'Umiarkowany' 
                          ? 'bg-amber-500/15 text-amber-300' 
                          : 'bg-blue-500/15 text-blue-300'
                    }`}>
                      {def.stopien}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddDefect(!showAddDefect);
                setNewDefectOpis('');
              }}
              className="w-full text-center py-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-550 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer block"
            >
              {showAddDefect ? '➔ Zamknij Kreator Wpisów' : '✚ Wprowadź Nowy Defekt z Mikroskopu'}
            </button>
          </div>

          {/* Microscope Detail HUD */}
          <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4.5 space-y-4 text-left relative overflow-hidden">
            {showAddDefect ? (
              // Add form
              <div className="space-y-3.5">
                <div className="border-b border-indigo-950/60 pb-1.5 flex justify-between items-center">
                  <span className="text-amber-400 font-mono text-[10px] uppercase font-black">LOKALNA REJESTRACJA WADY</span>
                  <span className="text-[8.5px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">MICRO-SPECTRAL EYE ON</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block uppercase">Zwięzły Opis Fizyczny:</label>
                  <input
                    type="text"
                    value={newDefectOpis}
                    onChange={(e) => setNewDefectOpis(e.target.value)}
                    placeholder="np. Mikropęknięcie poprzeczne, delaminacja powłoki"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Zagrożenie GMP:</label>
                    <select
                      value={newDefectStopien}
                      onChange={(e: any) => setNewDefectStopien(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="Słaby">Słabe (Obserwowane)</option>
                      <option value="Umiarkowany">Umiarkowane</option>
                      <option value="Krytyczny">Krytyczne (Reject)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Powiększenie:</label>
                    <select
                      value={newDefectPowiekszenie}
                      onChange={(e) => setNewDefectPowiekszenie(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="100x">Mikroskop 100x</option>
                      <option value="150x">Mikroskop 150x</option>
                      <option value="250x">Mikroskop 250x</option>
                      <option value="500x">Elektronowy SEM 500x</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Wysokość stempla (mm):</label>
                    <input
                      type="number"
                      min="5"
                      max="115"
                      value={newDefectY}
                      onChange={(e) => setNewDefectY(parseInt(e.target.value) || 45)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none text-center font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Kąt obwodowy (°):</label>
                    <input
                      type="number"
                      min="0"
                      max="359"
                      value={newDefectKat}
                      onChange={(e) => setNewDefectKat(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none text-center font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveDefect}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs py-2 rounded-xl transition-all cursor-pointer"
                >
                  ✓ Dodaj Defekt i Zaktualizuj Rysunek 3D
                </button>
              </div>
            ) : (
              // Selected defect detail
              <div className="space-y-3.5">
                <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="p-0.5 bg-indigo-505 bg-indigo-500/10 text-indigo-400 rounded">
                      <Search className="w-4 h-4 text-indigo-400" />
                    </span>
                    <span className="text-white font-mono text-xs font-black">
                      POWIĘKSZENIE MIKROSKOPOWE {activeDefectDetail?.powiekszenie || 'NUG-1X'}
                    </span>
                  </div>
                  <span className="text-[9px] text-amber-500 font-mono font-bold">ID: {activeDefectDetail?.id || 'DEF-000'}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-slate-450 bg-slate-900 border border-slate-850 p-2 rounded-xl">
                  <div>
                    Wysokość stempla: <strong className="text-white block">{activeDefectDetail?.y || 45} mm</strong>
                  </div>
                  <div>
                    Znakowanie stempla: <strong className="text-emerald-400 block">"{tool.znakowanie}"</strong>
                  </div>
                  <div>
                    Stopień zagrożenia: 
                    <strong className={`block ${
                      activeDefectDetail?.stopien === 'Krytyczny' ? 'text-rose-450 text-rose-400' : 'text-amber-400'
                    }`}>
                      {activeDefectDetail?.stopien || 'Umiarkowany'}
                    </strong>
                  </div>
                  <div>
                    Data inspekcji: <strong className="text-white block">{activeDefectDetail?.data || '2026-05-24'}</strong>
                  </div>
                </div>

                <div className="space-y-1 font-sans">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Podsumowanie i wnioski z mikroskopu:</span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {activeDefectDetail?.kompletnyOpis || 'Załaduj jeden z defektów, klikając na pulsujące kręgi na hologramie po lewej stronie.'}
                  </p>
                </div>

                <div className="p-2 border border-blue-500/10 bg-blue-550/5 text-[9px] text-cyan-300 font-mono rounded flex items-start gap-1.5 leading-normal">
                  <Info className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span>
                    Zgodne z certyfikacją laboratoryjną DIN EN ISO 10993-5 (Mikrotomografia optyczna). Wpisy auditowe nienaruszalne.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// DOCUMENT SCANNING & ATTACHMENTS MODULE
// ==========================================
interface ToolAttachmentsTabProps {
  tool: ToolSet;
  onUpdateToolSet: (updated: ToolSet) => void;
  onChangeSelectedTool: (updated: ToolSet) => void;
}

export const ToolAttachmentsTab: React.FC<ToolAttachmentsTabProps> = ({
  tool,
  onUpdateToolSet,
  onChangeSelectedTool,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [docName, setDocName] = useState<string>('');
  const [docType, setDocType] = useState<string>('Świadectwo Jakości Stali');
  const [ocrScanning, setOcrScanning] = useState<boolean>(false);
  const [ocrTextResult, setOcrTextResult] = useState<string>('');
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Stop camera helper
  const stopCamera = (streamObj: MediaStream | null) => {
    if (streamObj) {
      streamObj.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraActive(false);
  };

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      // Safely close webcam stream when closing tab
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // Turn on camera
  const handleStartCamera = async () => {
    setCapturedPhoto(null);
    setOcrTextResult('');
    setOcrScanning(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      alert('Nie udało się uzyskać dostępu do kamery. Upewnij się, że nadałeś uprawnienia w przeglądarce i spróbuj ponownie.');
      console.error(err);
    }
  };

  // Snap photo from the camera element
  const handleCapturePhoto = () => {
    if (!videoRef.current || !cameraStream) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      
      // Stop the stream immediately to save power
      stopCamera(cameraStream);

      // Trigger OCR scanner effect
      setOcrScanning(true);
      setTimeout(() => {
        setOcrScanning(false);
        // Autopopulate decoded OCR parameters based on tool's metal and ID
        const generatedOcr = `
[SYSTEM INTEGRITY CHECK: CERTIFICATE ISO/DIS 10204-3.1]
CERTIFICATE NO: BF-QUAL-${tool.id}-${Math.floor(100000 + Math.random() * 900000)}
STEEL ALLOY: ${tool.rodzajStali.toUpperCase()}
FRACTURE HARDNESS RANGE: ${tool.rodzajStali.includes('Bohler') ? '61.8 - 62.4 HRC' : '57.9 - 58.5 HRC'}
METROLOGY TOLERANCE (LENGTH): ±0.015 mm (TARGET: PASSED)
SIGNATORY QA REPRESENTATIVE: dr Karol Nowicki
STAMP HOLOGRAPH: VERIFIED BY QC-AUDIT-BIOFARM
        `.trim();
        setOcrTextResult(generatedOcr);
        setDocName(`Świadectwo jakości stali_${new Date().toISOString().split('T')[0]}`);
      }, 1900);
    }
  };

  // Add demo mock certificate if they don't have camera available
  const handleAddDemoDocument = () => {
    setCapturedPhoto('demo_seal');
    setDocName(`Automatyczny raport kalibracji Mitutoyo_${tool.id}`);
    setDocType('Raport Pomiary Metrologiczne');
    setOcrTextResult(`
[MITUTOYO METROLOGIC HIGH-PRECISION MEASUREMENT]
DEVICE MODEL: MIT-SH-992A-OP
TOOL_SET_REFERENCE: SET-${tool.id}
TOTAL HEIGHT REC: 133.606 mm (TOLERANCE: OK)
DIAMETER JIG: 16.002 mm (OK)
SURFACE FINISH (Ra): 0.038 µm (OK)
AUDIT REPORT STAMP: COMPLIANT WITH FDA GMP 133.60 ±0.05
    `.trim());
  };

  // Save the full document attachment back to state
  const handleSaveAttachment = () => {
    if (!docName.trim()) {
      alert('Proszę wprowadzić nazwę dla załączanego pliku/świadectwa.');
      return;
    }

    const imageToSave = capturedPhoto === 'demo_seal' 
      ? 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=350&auto=format&fit=crop'
      : (capturedPhoto || '');

    const newAttach: any = {
      id: `ATT-${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      nazwa: docName,
      typDokumentu: docType,
      fotaUrl: imageToSave,
      rozmiar: '512 KB',
      ocrTekst: ocrTextResult
    };

    const updatedSet: ToolSet = {
      ...tool,
      zalaczniki: [...(tool.zalaczniki || []), newAttach]
    };

    onUpdateToolSet(updatedSet);
    onChangeSelectedTool(updatedSet);

    // Clear locals
    setCapturedPhoto(null);
    setOcrTextResult('');
    setDocName('');
    setSelectedAttachmentId(newAttach.id);

    // Prompt CFR Part 11 alert
    alert(`SKAN PAPIEROWEGO ŚWIADECTWA UDANY! Dokument "${docName}" został przyklejony technicznie do zestawu narzędzi SET-${tool.id}. OCR zdigitalizował parametry.`);
  };

  const currentAttachments = tool.zalaczniki || [];
  const selectedAttach = currentAttachments.find(a => a.id === selectedAttachmentId);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <h4 className="text-white text-sm font-bold tracking-tight uppercase font-mono flex items-center gap-1.5">
            📎 Skaner i Repozytorium Świadectw Jakości Dostawcy (QA File Store)
          </h4>
          <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
            Dodaj papierowe świadectwo jakości stali lub pomiarów metrologicznych, używając wbudowanego obiektywu kamery urządzenia. Działający w czasie rzeczywistym system wizyjny OCR zabezpiecza i izoluje dane jakościowe.
          </p>
        </div>

        <div className="flex gap-2">
          {!isCameraActive ? (
            <>
              <button
                type="button"
                onClick={handleStartCamera}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs transition-with-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Camera className="w-4 h-4 text-slate-100" />
                Skanuj Aparatem
              </button>
              <button
                type="button"
                onClick={handleAddDemoDocument}
                className="px-3.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-350 border border-slate-800 hover:text-white font-mono text-xs transition-all cursor-pointer flex items-center gap-1"
                title="Szybkie dodanie testowego pliku z bazy świadectw"
              >
                ✚ Załącz Demo ISO
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => stopCamera(cameraStream)}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs cursor-pointer"
            >
              Wyłącz Aparat
            </button>
          )}
        </div>
      </div>

      {/* Main active camera interface */}
      {isCameraActive && (
        <div className="bg-black border border-slate-800 rounded-2xl overflow-hidden p-3 relative flex flex-col justify-center items-center">
          <div className="text-xs font-mono text-emerald-400 absolute top-6 left-6 z-10 bg-black/80 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>KAMERA LIVE: ŚWIADECTWO MATERIAŁOWE STANDARD</span>
          </div>

          {/* Camera Frame Viewport */}
          <div className="relative w-full max-w-[580px] h-[340px] rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Document Scanning Overlay Reticle */}
            <div className="absolute inset-0 border-[28px] border-black/55 pointer-events-none flex items-center justify-center">
              {/* Center green bounding targeting box */}
              <div className="w-[300px] h-[190px] border-2 border-emerald-500/80 rounded-lg relative flex flex-col justify-between p-3">
                {/* 4 neon glowing framing corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1" />

                {/* Sweeping laser scanner bars */}
                <div className="w-full h-0.5 bg-emerald-400 relative animate-scan shadow-[0_0_10px_#10b981]" />

                <span className="text-[8px] font-mono text-center text-emerald-400 bg-black/75 py-0.5 px-1 rounded mx-auto uppercase">
                   Wizjer Świadectwa Jakości
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
            >
              📷 PRZECHWYĆ I ZDIGITALIZUJ (OCR AI) ➔
            </button>
            <button
              type="button"
              onClick={() => stopCamera(cameraStream)}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono rounded-xl cursor-pointer hover:bg-slate-800"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* OCR processing states or newly snapped document configuration */}
      {ocrScanning && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-indigo-700/30 text-center space-y-3 relative overflow-hidden">
          <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto text-indigo-400" />
          <h5 className="text-white text-xs font-mono font-bold uppercase tracking-widest animate-pulse">
            CYFROWA ANALIZA REKORDÓW - OPTYCZNE ROZPOZNAWANIE ZNAKÓW (AI OCR SYSTEM)...
          </h5>
          <div className="text-[9px] text-indigo-300 font-mono space-y-1 block max-w-sm mx-auto opacity-70">
            <p className="animate-pulse">➔ Trwa rekonstrukcja krawędzi świadectwa...</p>
            <p className="delay-150 animate-pulse">➔ Mapowanie gatunku stali: {tool.rodzajStali}</p>
            <p className="delay-300 animate-pulse">➔ Odczyt certyfikatów CE i DIN EN ISO 10204...</p>
          </div>
        </div>
      )}

      {capturedPhoto && !ocrScanning && (
        <div className="bg-slate-900/40 border border-indigo-500/20 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-5 text-left items-stretch">
          
          {/* Snap image preview */}
          <div className="md:col-span-4 bg-slate-950 rounded-xl overflow-hidden p-2.5 border border-slate-800 flex flex-col justify-center items-center h-[210px]">
            {capturedPhoto === 'demo_seal' ? (
              <div className="text-center space-y-2">
                <ShieldCheck className="w-12 h-12 text-blue-500 mx-auto animate-pulse" />
                <span className="font-mono text-[9px] text-blue-400 uppercase tracking-widest block font-bold">CYFROWY STAMP ISO</span>
                <span className="text-[10px] text-slate-450 leading-relaxed block px-2">Autoryzowany raport pomiarowy z aparatury metrologicznej</span>
              </div>
            ) : (
              <img
                src={capturedPhoto}
                alt="Captured paper document certificate"
                className="max-h-[190px] object-contain rounded border border-white/5"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {/* Form details input on right */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="border-b border-indigo-950/60 pb-1 flex justify-between items-center text-xs">
                <span className="text-emerald-400 font-mono uppercase font-extrabold text-[10px]">MAPOWANIE NAZWY ARCHIWUM</span>
                <span className="text-[8.5px] font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-350">STATUS: READY TO SAVE</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9.5px] text-slate-450 block font-bold uppercase font-mono">Tytuł Załącznika:</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="Wprowadź nazwę dokumentu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] text-slate-450 block font-bold uppercase font-mono">Kategoria Dokumentu:</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none font-mono"
                  >
                    <option value="Świadectwo Jakości Stali">Świadectwo Jakości Stali (3.1)</option>
                    <option value="Raport Pomiary Metrologiczne">Raport Metrologiczny (Mitutoyo)</option>
                    <option value="Certyfikat Zgodności FDA">Certyfikat FDA / GMP Conformity</option>
                    <option value="Inne dokumenty">Inne załączniki</option>
                  </select>
                </div>
              </div>

              {/* Decoded OCR display */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-450 block uppercase font-mono font-bold">
                  🤖 ZDIAGNOZOWANY TEKST SPECYFIKACJI (ODKODOWANO PRZEZ OCR):
                </span>
                <pre className="text-[9px] bg-black/80 font-mono p-3 rounded-lg text-[#00ca9a] leading-tight max-h-[110px] overflow-y-auto border border-emerald-950">
                  {ocrTextResult || "[Brak odkodowanych danych]"}
                </pre>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAttachment}
              className="w-full bg-indigo-600 hover:bg-emerald-600 text-white py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer text-center"
            >
              💾 ZAPISZ I PODEPNIJ ZAŁĄCZNIK W AUDIT TRAIL ➔
            </button>
          </div>

        </div>
      )}

      {/* List of current attachments in database */}
      <div className="border border-slate-200/5 bg-slate-900/20 p-4.5 rounded-2xl text-left">
        <h5 className="text-white text-xs font-bold font-mono uppercase tracking-widest border-b border-white/5 pb-2.5 mb-4 flex justify-between items-center bg-transparent">
          <span>📂 Repozytorium Załączników Kompletu SET-{tool.id}</span>
          <span className="text-[10px] text-[#00ca9a] font-normal font-mono bg-[#00ca9a]/10 px-2 py-0.5 rounded border border-[#00ca9a]/20">
            {currentAttachments.length} aktywne pliki
          </span>
        </h5>

        {currentAttachments.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs max-w-md mx-auto space-y-2">
            <Paperclip className="w-8 h-8 mx-auto text-slate-600 animate-bounce" />
            <p>Brak podpiętych załączników w repozytorium.</p>
            <p className="text-[10px] text-slate-600">
              Aby dodać papierowy certyfikat, użyj przycisku "Skanuj Aparatem" lub "Załącz Demo ISO" na górze, co pozwoli Ci zachować integralność cyfrową GMP.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* List side */}
            <div className="md:col-span-5 space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {currentAttachments.map((attach) => {
                const isActive = selectedAttachmentId === attach.id;
                return (
                  <button
                    key={attach.id}
                    type="button"
                    onClick={() => setSelectedAttachmentId(attach.id)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      isActive 
                        ? 'bg-slate-900 border-indigo-500 text-white shadow-md' 
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span className="mt-0.5 p-1 bg-indigo-505 bg-indigo-500/10 text-indigo-400 rounded shrink-0">
                      <FileText className="w-4 h-4 text-indigo-450 text-indigo-400" />
                    </span>
                    <div className="space-y-0.5 truncate flex-1 md:w-auto">
                      <div className="font-bold text-xs text-white truncate">{attach.nazwa}</div>
                      <div className="text-[9px] text-slate-505 text-slate-500 font-mono">
                        {attach.typDokumentu} • {attach.data}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Attachment Showcase Preview on right */}
            <div className="md:col-span-7 bg-slate-950/60 rounded-xl p-4.5 border border-slate-850 flex flex-col justify-between min-h-[220px]">
              {selectedAttach ? (
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2 flex justify-between items-start gap-2 text-xs">
                    <div>
                      <h6 className="text-white font-bold leading-tight truncate max-w-[220px]">{selectedAttach.nazwa}</h6>
                      <span className="text-[9px] text-slate-405 text-slate-400 font-mono uppercase">{selectedAttach.typDokumentu}</span>
                    </div>

                    <span className="text-[9px] font-mono text-emerald-400 border border-emerald-900 bg-emerald-950/30 px-2 py-0.5 rounded shrink-0 leading-none">
                      Weryfikacja OCR: OK
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Tiny thumbnail */}
                    <div className="md:col-span-4 bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-center flex flex-col justify-center h-[120px]">
                      {selectedAttach.fotaUrl.includes('images.unsplash.com') ? (
                        <img 
                          src={selectedAttach.fotaUrl} 
                          alt="Unsplash blueprint background" 
                          className="max-h-[110px] w-full object-cover rounded border border-white/5" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="space-y-1">
                          <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                          <span className="text-[9px] font-mono text-slate-350 block">SKAN_KAMERA</span>
                        </div>
                      )}
                    </div>

                    {/* OCR Results Text box */}
                    <div className="md:col-span-8 space-y-1.5">
                      <span className="text-[9.5px] text-slate-450 block font-mono font-bold uppercase">Zintegrowane Metadane OCR:</span>
                      <pre className="text-[9px] leading-tight bg-black font-mono p-3 rounded-lg text-indigo-305 text-indigo-300 border border-indigo-950 max-h-[110px] overflow-y-auto max-w-full">
                        {selectedAttach.ocrTekst || "[Brak metadanych OCR dla tego pliku]"}
                      </pre>
                    </div>
                  </div>

                  <div className="p-2 border border-blue-500/10 bg-indigo-505 bg-indigo-500/5 text-[9px] text-cyan-300 font-mono rounded flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Plik zablokowany przed edycją. Kopia binarnego sumowania: SECURE_MD5_LOCK</span>
                  </div>
                </div>
              ) : (
                <div className="m-auto text-center text-slate-400 font-mono text-xs py-4">
                  Wybierz dowolny załącznik ze spisu po lewej, aby odczytać dane OCR.
                </div>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
};


interface ToolWearAnalyticsTabProps {
  tool: ToolSet;
}

export const ToolWearAnalyticsTab: React.FC<ToolWearAnalyticsTabProps> = ({ tool }) => {
  // Steel type option overriding / dynamic simulation state
  const [selectedSteelType, setSelectedSteelType] = useState<string>(() => tool.rodzajStali || 'Bohler M340');

  // Simulator configuration states
  const [granulateAbrasiveness, setGranulateAbrasiveness] = useState<number>(1.2); // range 0.8 - 1.8
  const [pressSpeed, setPressSpeed] = useState<number>(60000); // speed in strokes/hour
  const [customPolishingCount, setCustomPolishingCount] = useState<number>(() => {
    const historical = (tool.historiaSerwisowa || []).filter(r => r.typ === 'Polerowanie').length;
    return historical || Math.max(1, Math.floor(tool.uzycieGlowne / 800000));
  });
  
  // Real-time dynamic ticking counter (simulates sub-second remaining time)
  const [tick, setTick] = useState<number>(0);
  useEffect(() => {
    const interval = setTimeout(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearTimeout(interval);
  }, [tick]);

  // Material physics constants based on Selected Tool Steel
  const steelPhysics = React.useMemo(() => {
    const steel = selectedSteelType.toUpperCase();
    if (steel.includes('VANADIS') || steel.includes('PM-60') || steel.includes('V4') || steel.includes('VASCO')) {
      return { 
        name: 'Vanadis PM-60 SuperClean', 
        hrc: '63-65 HRC', 
        microhardness: '2450 HV', 
        alloy: 'Cr-V-Mo Premium PM proszkowa', 
        friction: '0.30', 
        factor: 1.55, 
        desc: 'Stal proszkowa trzeciej generacji (PM). Ekstremalna ochrona graweru przed wycieraniem ściernym granulatu.' 
      };
    } else if (steel.includes('K340') || steel.includes('K110') || steel.includes('K390')) {
      return { 
        name: 'Bohler K340 ESR', 
        hrc: '61-62 HRC', 
        microhardness: '1020 HV', 
        alloy: 'Stal elektrożużlowa ESR wysokiej gęstości', 
        friction: '0.38', 
        factor: 1.20, 
        desc: 'Elektrożużlowo przetapiany gatunek o wysokiej odporności na pęknięcia zmęczeniowe pod naciskiem.' 
      };
    } else if (steel.includes('D2') || steel.includes('NC11') || steel.includes('1.2379') || steel.includes('STANDARDOWA')) {
      return { 
        name: 'Stal Standardowa 1.2379 (D2)', 
        hrc: '58-60 HRC', 
        microhardness: '785 HV', 
        alloy: 'Klasyczna ledeburytyczna stal chromowa D2', 
        friction: '0.45', 
        factor: 0.95, 
        desc: 'Standardowa stal ekonomiczna o średniej odporności tribologicznej i podatności na mikro-wykruszenia.' 
      };
    } else {
      // Default to high quality Bohler M340 (Martenzytyczna chromowa)
      return { 
        name: 'Bohler M340 ISOPLAST', 
        hrc: '59-61 HRC', 
        microhardness: '915 HV', 
        alloy: 'Stal martenzytyczna Cr-Mo-V wolna od mikro-wtrąceń', 
        friction: '0.35', 
        factor: 1.30, 
        desc: 'Chroni przed korozją kwasową kwaśnych granulatów leczniczych, idealna przy myciu wash-in-place CIP.' 
      };
    }
  }, [selectedSteelType]);

  // Wear calculations
  const wearFromStrokes = (tool.uzycieGlowne / tool.uzycieLimit) * 100;
  // Polishing layer removal component (each polish takes away about 6.5% of engraving depth before logo is shallow)
  const wearFromPolishes = (customPolishingCount * 6.5);
  // Total cumulative wear score based on chosen alloy physics factor
  const degradationScoreRaw = (wearFromStrokes + wearFromPolishes) * granulateAbrasiveness / steelPhysics.factor;
  const totalWear = Math.min(100, Math.round(degradationScoreRaw * 10) / 10);
  const rulPercent = Math.max(0, Math.round((100 - totalWear) * 10) / 10);

  // Remainder values
  const strokesRemaining = Math.max(0, Math.floor(tool.uzycieLimit * (rulPercent / 100)));
  
  // Est. remaining run-time in hours
  const operatingHoursRemaining = pressSpeed > 0 ? strokesRemaining / pressSpeed : 9999;
  const daysOfProduction = Math.round((operatingHoursRemaining / 16) * 10) / 10; // assumed 16 hours double-shift per day

  // Generator for interactive Recharts trend data
  const chartData = React.useMemo(() => {
    const points = [];
    const limit = tool.uzycieLimit || 3000000;
    const step = limit / 6;
    
    for (let i = 0; i <= 6; i++) {
      const currentStrokes = i * step;
      const strokesM = currentStrokes / 1000000;
      
      // Nominal standard reference curve (optimal rate)
      const nominalWear = Math.min(100, Math.round((currentStrokes / limit) * 100 * 10) / 10);
      
      // Estimated polishing runs up to current strokes (roughly 1.3 polishes per Million strokes)
      const estimatedPolishesAtX = Math.floor(currentStrokes / 750000);
      
      // Projected simulated wear with abrasiveness and alloy factor
      const projectedWearRaw = ( (currentStrokes / limit) * 100 + (estimatedPolishesAtX * 6.5) ) * granulateAbrasiveness / steelPhysics.factor;
      const projectedWear = Math.min(100, Math.round(projectedWearRaw * 10) / 10);
      
      points.push({
        label: `${strokesM.toFixed(1)}M`,
        strokes: currentStrokes,
        nominal: nominalWear,
        projected: projectedWear,
      });
    }
    return points;
  }, [tool.uzycieLimit, granulateAbrasiveness, steelPhysics.factor]);

  // PREDICTIVE WEAR AI DIAGNOSTIC SUITE
  // Analyzes 2-year history of service operations (polishes, microdefects, strikes)
  const predictiveFailureRatio = React.useMemo(() => {
    // Neural network approximation model
    let baseRisk = (totalWear * totalWear) / 102; 
    
    // Impact of abrasiveness
    baseRisk += (granulateAbrasiveness - 1.0) * 32; 
    
    // Impact of microscopic defects found
    const microCracksCount = (tool.mikroskopDefekty || []).length;
    baseRisk += microCracksCount * 14;

    // Heavy polishing causes micro-fracturing risk on the engraving walls
    if (customPolishingCount > 4) {
      baseRisk += (customPolishingCount - 4) * 8;
    }

    // Material safety compensation
    if (steelPhysics.name.includes('Vanadis')) {
      baseRisk -= 15; // CPM premium steel is extremely resilient to heavy erosion
    } else if (steelPhysics.name.includes('Standardowa')) {
      baseRisk += 18; // D2 standard has higher brittleness risk under dynamic cycle loads
    } else if (steelPhysics.name.includes('M340')) {
      baseRisk -= 8; // chromium reduces pitting erosion
    }

    return Math.min(99.8, Math.max(0.2, Math.round(baseRisk * 10) / 10));
  }, [totalWear, granulateAbrasiveness, tool.mikroskopDefekty, customPolishingCount, steelPhysics]);

  // Lead time and replenishments suggestion engine
  const aiOrderSuggestion = React.useMemo(() => {
    const daysLeft = Math.floor(daysOfProduction);
    
    let leadTimeDays = 7;
    let fallbackVendor = 'Böhler-Uddeholm Group PL';
    
    if (steelPhysics.name.includes('Vanadis')) {
      leadTimeDays = 12; // Powder PM takes longer delivery cycles
      fallbackVendor = 'Uddeholm Baltic Division';
    } else if (steelPhysics.name.includes('M340')) {
      leadTimeDays = 9;
      fallbackVendor = 'Böhler Precision Systems';
    } else if (steelPhysics.name.includes('Standardowa')) {
      leadTimeDays = 5;
      fallbackVendor = 'Krajowe Narzędziownie Precyzyjne';
    }

    const orderBuffer = 4; // Safety buffer days
    const totalDaysThreshold = leadTimeDays + orderBuffer;
    const daysUntilPurchase = daysLeft - totalDaysThreshold;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Math.max(0, daysUntilPurchase));
    const formattedDate = targetDate.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });

    const orderingUrgency = daysLeft < totalDaysThreshold 
      ? 'CRITICAL_ORDER_NOW' 
      : daysLeft < (totalDaysThreshold + 10) 
        ? 'WARNING_ORDER_SOON' 
        : 'SECURE_OPERATION';

    return {
      daysUntilPurchase: Math.max(0, daysUntilPurchase),
      orderDateFormatted: formattedDate,
      leadTime: leadTimeDays,
      vendor: fallbackVendor,
      urgency: orderingUrgency,
      buffer: orderBuffer
    };
  }, [daysOfProduction, steelPhysics]);

  // Formatting countdown text for the ticker
  const formatRulCountdown = () => {
    if (rulPercent <= 0) return '00 dni : 00 godz : 00 min : 00 sek (PRODUKCJA WSTRZYMANA!)';
    
    const minutesRemaining = Math.floor(operatingHoursRemaining * 60) - (tick % 60);
    if (minutesRemaining <= 0) return '00 dni : 00 godz : 05 min : 00 sek';
    
    const totalSeconds = minutesRemaining * 60;
    const d = Math.floor(totalSeconds / (3600 * 24));
    const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(Math.max(0, 59 - (tick % 60)));
    
    return `${d.toString().padStart(2, '0')} dni : ${h.toString().padStart(2, '0')} godz : ${m.toString().padStart(2, '0')} min : ${s.toString().padStart(2, '0')} sek`;
  };

  const getRulColor = () => {
    if (rulPercent >= 68) return 'text-emerald-500 border-emerald-500/30';
    if (rulPercent >= 30) return 'text-amber-500 border-amber-500/30';
    return 'text-rose-500 border-rose-500/30';
  };

  const getRulBg = () => {
    if (rulPercent >= 68) return 'bg-emerald-500/5';
    if (rulPercent >= 30) return 'bg-amber-500/5';
    return 'bg-rose-500/5 animate-pulse';
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Dynamic material selection and variables control */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 space-y-5">
        
        {/* Toggle steel alloys switcher */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-mono tracking-widest font-black text-[#6366f1] block uppercase">
              WYBÓR GATUNKU STALI / PRZESTAWIANIE MATERIAŁOWE
            </span>
            <h4 className="text-sm font-black font-sans text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Węzłowy komparator właściwości tribologicznych
            </h4>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850">
            {[
              { id: 'M340', label: 'Böhler M340' },
              { id: 'PM-60', label: 'Vanadis PM-60' },
              { id: 'K340', label: 'Böhler K340' },
              { id: 'D2', label: 'Stal D2 (1.2379)' }
            ].map((alloyOpt) => {
              const isSelected = selectedSteelType.toUpperCase().includes(alloyOpt.id);
              return (
                <button
                  key={alloyOpt.id}
                  type="button"
                  onClick={() => setSelectedSteelType(alloyOpt.label)}
                  className={`px-3 py-1.5 rounded-lg text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {alloyOpt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-mono">
          
          {/* Sliders abrasiveness */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center text-slate-350">
              <span>Ścieralność granulatu:</span>
              <strong className="text-indigo-400">x{granulateAbrasiveness.toFixed(2)}</strong>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.8"
              step="0.05"
              value={granulateAbrasiveness}
              onChange={(e) => setGranulateAbrasiveness(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <div className="flex justify-between text-[8px] text-slate-500">
              <span>0.8 (Miękki/Laktoza)</span>
              <span>1.8 (Ścierny/Kwas)</span>
            </div>
          </div>

          {/* Slider operation speed */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center text-slate-350">
              <span>Tempo stemplarki (uderzenia):</span>
              <strong className="text-emerald-400">{pressSpeed.toLocaleString()} /h</strong>
            </div>
            <input
              type="range"
              min="20000"
              max="120000"
              step="5000"
              value={pressSpeed}
              onChange={(e) => setPressSpeed(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[8px] text-slate-500">
              <span>20k szt/h</span>
              <span>120k szt/h (Fette 2090)</span>
            </div>
          </div>

          {/* Polishing counter adjuster */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center text-slate-350">
              <span>Ilość polerowań trzonu/czoła:</span>
              <strong className="text-amber-400">{customPolishingCount} cykli</strong>
            </div>
            <div className="flex gap-2 items-center justify-between">
              <button
                type="button"
                onClick={() => setCustomPolishingCount(c => Math.max(0, c - 1))}
                className="flex-1 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 font-bold active:scale-95 transition-all text-xs"
              >
                -1 polish
              </button>
              <button
                type="button"
                onClick={() => setCustomPolishingCount(c => Math.min(15, c + 1))}
                className="flex-1 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 font-bold active:scale-95 transition-all text-xs"
              >
                +1 polish
              </button>
            </div>
            <p className="text-[8px] text-slate-500 leading-none">
              Każda regeneracja zbiera mikronowe rezerwy stali czoła.
            </p>
          </div>

        </div>
      </div>

      {/* Main double column widget grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Side: Glowing RUL Indicator Block */}
        <div className={`lg:col-span-5 p-5 rounded-xl border flex flex-col justify-between space-y-4 ${getRulBg()} ${getRulColor()}`}>
          <div className="border-b border-current/10 pb-2.5 text-left">
            <span className="text-[9px] tracking-widest font-mono font-black uppercase block">REMANENT STERYLNO-TECHNOLOGICZNY</span>
            <h4 className="text-sm font-bold font-sans mt-0.5 text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 shrink-0" />
              Wskaźnik RUL (Remaining Useful Life)
            </h4>
          </div>

          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            {/* Massive Glowing Wear Value */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-current/25 animate-spin" style={{ animationDuration: '40s' }} />
              <div className="w-32 h-32 rounded-full border-4 border-current/30 flex flex-col items-center justify-center p-3 text-center bg-slate-950 text-white shadow-xl">
                <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">STAN RUL</span>
                <span className="text-3xl font-black font-mono tracking-tight">{rulPercent}%</span>
                <span className={`text-[8px] font-mono font-black border uppercase px-1.5 py-0.25 mt-1 rounded bg-slate-900 ${
                  rulPercent >= 68 ? 'text-emerald-450 border-emerald-500/30' : rulPercent >= 30 ? 'text-amber-450 border-amber-500/30' : 'text-rose-450 border-rose-500/30 animate-pulse'
                }`}>
                  {rulPercent >= 68 ? 'Znakomity' : rulPercent >= 30 ? 'Średni (Korekta)' : 'WSTRZYMANY (REJECT)'}
                </span>
              </div>
            </div>

            {/* Simulated Live Ticking Countdown Timer */}
            <div className="w-full text-center space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-850 shadow-inner">
              <span className="text-[8px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Estymowany czas pracy do utraty grawerunku:</span>
              <div className="text-xs sm:text-sm font-black font-mono text-indigo-400">{formatRulCountdown()}</div>
              <span className="text-[7.5px] font-mono text-slate-500 block">Zliczana w czasie rzeczywistym redukcja mikronowa</span>
            </div>
          </div>

          <div className="space-y-2 font-mono text-[10.5px] text-slate-700 text-left">
            <div className="flex justify-between border-b border-current/5 pb-1">
              <span>Pozostały wolumen cykli roboczych:</span>
              <strong className="text-slate-900 font-bold">{strokesRemaining.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between border-b border-current/5 pb-1">
              <span>Dni ciągłej produkcji (16h shift):</span>
              <strong className="text-slate-900 font-bold">{daysOfProduction} dni</strong>
            </div>
            <div className="flex justify-between border-b border-current/5 pb-1">
              <span>Zużycie erozyjne stali:</span>
              <strong className="text-slate-900 font-bold">{totalWear}%</strong>
            </div>
          </div>
        </div>

        {/* Right Side: Recharts Trend Line Plot */}
        <div className="lg:col-span-7 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="border-b border-slate-200 pb-2 mb-3 text-left">
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block font-bold">ZESPÓŁ ANALITYKI MATEMATYCZNEJ BIOFARM</span>
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Interaktywny Wykres RUL i Prognozy Żywotności Stali
              </h4>
              <span className="text-[8.5px] font-mono px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded uppercase">
                {steelPhysics.name}
              </span>
            </div>
          </div>

          <div key={JSON.stringify(chartData)} className="w-full h-56 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" unit="%" style={{ fontSize: 9, fontFamily: 'monospace' }} domain={[0, 110]} />
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 10, fontFamily: 'monospace' }}
                />
                <RechartsLine 
                  type="monotone" 
                  dataKey="projected" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ r: 3.5, strokeWidth: 1.5 }}
                  activeDot={{ r: 6 }}
                  name={`Prognoza dla ${steelPhysics.name}`} 
                  isAnimationActive={true} 
                  animationDuration={850} 
                  animationEasing="ease-out" 
                />
                <RechartsLine 
                  type="monotone" 
                  dataKey="nominal" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={false}
                  name="Nominalne zużycie referencyjne" 
                  isAnimationActive={true} 
                  animationDuration={850} 
                  animationEasing="ease-out" 
                />
                <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Serwis (90%)', fill: '#f59e0b', fontSize: 8, position: 'insideBottomRight', fontFamily: 'monospace' }} />
                <ReferenceLine y={100} stroke="#ef4444" strokeWidth={1} label={{ value: 'Krytyczne (100%)', fill: '#ef4444', fontSize: 8, position: 'insideBottomRight', fontFamily: 'monospace' }} />
                <RechartsLegend wrapperStyle={{ fontSize: 9, fontFamily: 'sans-serif', paddingTop: 8 }} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-500 border-t border-slate-200/60 pt-2 mt-2">
            <span>X: Zsumowane uderzenia stempla (Miliony)</span>
            <span>Y: Zużycie wskaźnikowe (mikrometry)</span>
          </div>
        </div>

      </div>

      {/* Predictive Wear AI Block - 14 Days Forecast & Parts ordering Suggestions */}
      <div className="bg-slate-950 rounded-2xl border border-indigo-950/70 p-5 space-y-4 text-left relative overflow-hidden">
        
        {/* Glow corner background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] rounded-xl font-black font-mono text-[9.5px] tracking-tight">
              PREDICTIVE WEAR AI v2.4
            </span>
            <h5 className="text-white text-xs font-bold tracking-tight uppercase font-mono">
              Autonomiczny system prognozy awarii stempla
            </h5>
          </div>

          <span className={`text-[8.5px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
            aiOrderSuggestion.urgency === 'CRITICAL_ORDER_NOW' 
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 animate-pulse'
              : aiOrderSuggestion.urgency === 'WARNING_ORDER_SOON'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          }`}>
            {aiOrderSuggestion.urgency === 'CRITICAL_ORDER_NOW' 
              ? '⚠️ Krytyczna konieczność zamówienia' 
              : aiOrderSuggestion.urgency === 'WARNING_ORDER_SOON'
                ? '⚡ Zamów wkrótce (bezpieczeństwo)' 
                : '🛡️ Stan floty bezpieczny'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          
          {/* Risk Dial percentage */}
          <div className="md:col-span-4 bg-slate-900/60 rounded-xl p-4 border border-slate-900 text-center space-y-2">
            <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
              Prawdopodobieństwo awarii (horyzont 14 dni)
            </span>
            <div className="text-3xl font-black font-mono tracking-tighter text-indigo-400">
              {predictiveFailureRatio}%
            </div>
            
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  predictiveFailureRatio > 65 ? 'bg-rose-500' : predictiveFailureRatio > 35 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${predictiveFailureRatio}%` }}
              />
            </div>
            
            <span className="text-[8.5px] text-slate-500 leading-normal block font-mono">
              Predykcja oparta na {tool.historiaSerwisowa?.length || 3}-letnich cyklach i pęknięciach.
            </span>
          </div>

          {/* Core Suggestions content */}
          <div className="md:col-span-8 space-y-3 font-mono text-[11px] leading-relaxed">
            <p className="text-slate-300">
              Algorytm AI przeanalizował historię <strong className="text-white">stali {steelPhysics.name}</strong>, limit <strong className="text-white">{(tool.uzycieLimit / 1e6).toFixed(1)}M uderzeń</strong>, twardość <strong className="text-white">{steelPhysics.hrc}</strong>, oraz obecną szorstkość mechaniczną.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-900/40 p-3 rounded-xl border border-slate-900">
              <div className="space-y-1">
                <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Zalecany termin zamówienia:</span>
                <strong className={`block text-xs ${aiOrderSuggestion.urgency === 'CRITICAL_ORDER_NOW' ? 'text-rose-450 text-rose-400' : 'text-[#00ca9a]'}`}>
                  {aiOrderSuggestion.orderDateFormatted}
                </strong>
                <span className="text-[8px] text-slate-500 block">
                  {aiOrderSuggestion.daysUntilPurchase > 0 
                    ? `(za dokładnie ${aiOrderSuggestion.daysUntilPurchase} dni robocze)` 
                    : '(CZAS UPŁYNĄŁ - WYŚLIJ FORMULARZ)'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Kluczowe parametry AI dostawy:</span>
                <span className="text-slate-200 block text-xs truncate" title={aiOrderSuggestion.vendor}>
                  🏢 {aiOrderSuggestion.vendor}
                </span>
                <span className="text-[8px] text-slate-500 block">
                  Czas realizacji dostawy: <strong className="text-slate-350">{aiOrderSuggestion.leadTime} dni</strong> (+ {aiOrderSuggestion.buffer} dni buforu)
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch">
              <div className="flex items-start gap-1.5 text-[9px] text-slate-400 leading-normal max-w-sm">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Wczesne zamówienie optymalizuje koszty i eliminuje przestoje maszynowe stemplarek tabletek ze względu na wymogi rezerwacji GMP (CFR Part 11).
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  alert(`Wygenerowano formularz zakupu spares do działu zaopatrzenia:\nWniosek o stal: ${steelPhysics.name}\nIlość: 1 kpl (nowe stemple EU-B)\nDostawca: ${aiOrderSuggestion.vendor}\nSugerowana wysyłka: ${aiOrderSuggestion.orderDateFormatted}`);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-emerald-600 text-white font-mono font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
              >
                📥 Wyślij Zapotrzebowanie AI ➔
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Physics material specifics card (Technical parameters info) */}
      <div className="p-4 bg-slate-950 text-white rounded-xl border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-1 border-b border-slate-900 pb-1.5 mb-2">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-bold text-slate-300">PARAMETRY FIZYKO-CHEMICZNE WYBRANEGO GATUNKU STALI</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10.5px] text-left">
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Twardość czoła roboczego:</span>
            <strong className="text-slate-200">{steelPhysics.hrc}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Współczynnik tarcia (Dry):</span>
            <strong className="text-slate-200">f = {steelPhysics.friction}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Mikrotwardość grawerunku:</span>
            <strong className="text-slate-200">{steelPhysics.microhardness}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Struktura krystaliczna:</span>
            <strong className="text-slate-200 truncate block">{steelPhysics.alloy}</strong>
          </div>
        </div>
        <p className="text-[9.5px] text-slate-400 leading-normal mt-2.5 bg-slate-900 p-2 rounded border border-slate-850 text-left">
          {steelPhysics.desc} Symulator prognozuje, że przy obecnych ustawieniach mikro-szorstkość ścianek formy nie przekroczy dopuszczalnej normy przyczepności. System zgłosi automatyczny post-warning w przypadku przekroczenia krytycznego progu zużycia.
        </p>
      </div>

    </div>
  );
};

interface ReportsPanelProps {
  toolSets: ToolSet[];
  onUpdateToolSet?: (updated: ToolSet) => void;
  initialSelectedToolSetId?: string | null;
  onClearInitialSelectedToolSetId?: () => void;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ 
  toolSets = [], 
  onUpdateToolSet,
  initialSelectedToolSetId,
  onClearInitialSelectedToolSetId
}) => {
  const [activeTab, setActiveTab] = useState<'krajowe' | 'export'>('krajowe');
  const [reportsSubView, setReportsSubView] = useState<'steel_wear' | 'oee_analytics' | 'production_heatmap' | 'status_history'>('steel_wear');
  const [statusHistorySelectedToolId, setStatusHistorySelectedToolId] = useState<string>(toolSets[0]?.id || '');
  
  // Custom OEE thresholds for each machine (Requirement 2)
  const [oeeAlertThresholds, setOeeAlertThresholds] = useState<Record<string, number>>({
    'PRESS-FETTE-1': 75,
    'PRESS-KILIAN-1': 75,
    'PRESS-KORSCH-1': 75,
    'PRESS-ROMACO-1': 75,
  });

  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedOeePress2, setSelectedOeePress2] = useState<'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'>('PRESS-KILIAN-1');

  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState<boolean>(false);
  const [selectedOeePress, setSelectedOeePress] = useState<'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'>('PRESS-FETTE-1');
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ lineIdx: number; dayIdx: number } | null>({ lineIdx: 0, dayIdx: 1 });
  const [heatmapDateRange, setHeatmapDateRange] = useState<'7' | '30' | '60'>('7');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [selectedHistoryTool, setSelectedHistoryTool] = useState<ToolSet | null>(null);
  const [maintenanceSearchQuery, setMaintenanceSearchQuery] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState<'ALL' | 'SUCCESS' | 'WARNING'>('ALL');
  
  // Custom tool steel wear prediction dataset (HRC vs Cycles count)
  const materialConsumptionData = React.useMemo(() => {
    const data = [];
    for (let cycles = 0.5; cycles <= 5.0; cycles += 0.5) {
      const wear58 = Math.round((cycles * 3.4 + Math.pow(cycles, 1.3) * 0.8) * 10) / 10;
      const wear62 = Math.round((cycles * 1.8 + Math.pow(cycles, 1.1) * 0.3) * 10) / 10;
      const wear66 = Math.round((cycles * 0.7 + Math.pow(cycles, 1.05) * 0.08) * 10) / 10;
      
      data.push({
        cycles: `${cycles}M`,
        wear58,
        wear62,
        wear66,
      });
    }
    return data;
  }, []);

  // Predykcja stopnia zużycia stempli (Wear Rate %) w czasie dla kluczowych gatunków stali (1.2379 vs Bohler vs PM-60)
  const steelWearOverTimeData = React.useMemo(() => {
    const data = [];
    for (let days = 0; days <= 120; days += 10) {
      const wear12379 = days === 0 ? 0 : Math.min(100, Math.round((days * 0.72 + Math.pow(days, 1.15) * 0.08) * 10) / 10);
      const wearBohlerK340 = days === 0 ? 0 : Math.min(100, Math.round((days * 0.45 + Math.pow(days, 1.1) * 0.035) * 10) / 10);
      const wearBohlerM340 = days === 0 ? 0 : Math.min(100, Math.round((days * 0.32 + Math.pow(days, 1.05) * 0.02) * 10) / 10);
      const wearPM60 = days === 0 ? 0 : Math.min(100, Math.round((days * 0.14 + Math.pow(days, 1.01) * 0.006) * 10) / 10);
      
      data.push({
        day: `${days} dni`,
        days,
        wear12379,
        wearBohlerK340,
        wearBohlerM340,
        wearPM60,
      });
    }
    return data;
  }, []);

  // Historically simulated stack OEE data for the 4 presses
  const oeeAreaDataForPresses = React.useMemo(() => {
    return {
      'PRESS-FETTE-1': [
        { day: '01.05', 'Dostępność': 96.2, 'Wydajność': 94.5, 'Jakość': 99.5, 'OEE': 90.4 },
        { day: '03.05', 'Dostępność': 95.8, 'Wydajność': 93.8, 'Jakość': 99.4, 'OEE': 89.3 },
        { day: '05.05', 'Dostępność': 94.1, 'Wydajność': 92.1, 'Jakość': 99.6, 'OEE': 86.3 },
        { day: '07.05', 'Dostępność': 95.5, 'Wydajność': 95.2, 'Jakość': 99.4, 'OEE': 90.3 },
        { day: '09.05', 'Dostępność': 96.8, 'Wydajność': 96.1, 'Jakość': 99.5, 'OEE': 92.5 },
        { day: '11.05', 'Dostępność': 92.4, 'Wydajność': 94.8, 'Jakość': 99.3, 'OEE': 87.0 },
        { day: '13.05', 'Dostępność': 95.1, 'Wydajność': 95.9, 'Jakość': 99.7, 'OEE': 90.9 },
        { day: '15.05', 'Dostępność': 96.0, 'Wydajność': 95.0, 'Jakość': 99.6, 'OEE': 90.8 }
      ],
      'PRESS-KILIAN-1': [
        { day: '01.05', 'Dostępność': 93.1, 'Wydajność': 91.5, 'Jakość': 99.2, 'OEE': 84.5 },
        { day: '03.05', 'Dostępność': 92.8, 'Wydajność': 92.0, 'Jakość': 99.1, 'OEE': 84.6 },
        { day: '05.05', 'Dostępność': 91.5, 'Wydajność': 90.4, 'Jakość': 99.4, 'OEE': 82.2 },
        { day: '07.05', 'Dostępność': 94.0, 'Wydajność': 93.1, 'Jakość': 99.3, 'OEE': 86.9 },
        { day: '09.05', 'Dostępność': 95.2, 'Wydajność': 94.0, 'Jakość': 99.1, 'OEE': 88.7 },
        { day: '11.05', 'Dostępność': 90.1, 'Wydajność': 91.2, 'Jakość': 99.0, 'OEE': 81.3 },
        { day: '13.05', 'Dostępność': 93.8, 'Wydajność': 93.5, 'Jakość': 99.5, 'OEE': 87.3 },
        { day: '15.05', 'Dostępność': 94.5, 'Wydajność': 94.1, 'Jakość': 99.3, 'OEE': 88.3 }
      ],
      'PRESS-KORSCH-1': [
        { day: '01.05', 'Dostępność': 91.4, 'Wydajność': 93.2, 'Jakość': 99.8, 'OEE': 85.0 },
        { day: '03.05', 'Dostępność': 90.9, 'Wydajność': 94.1, 'Jakość': 99.7, 'OEE': 85.3 },
        { day: '05.05', 'Dostępność': 93.5, 'Wydajność': 92.8, 'Jakość': 99.9, 'OEE': 86.7 },
        { day: '07.05', 'Dostępność': 94.1, 'Wydajność': 95.0, 'Jakość': 99.8, 'OEE': 89.2 },
        { day: '09.05', 'Dostępność': 95.0, 'Wydajność': 95.8, 'Jakość': 99.9, 'OEE': 90.9 },
        { day: '11.05', 'Dostępność': 88.5, 'Wydajność': 91.4, 'Jakość': 99.6, 'OEE': 80.6 },
        { day: '13.05', 'Dostępność': 92.4, 'Wydajność': 94.6, 'Jakość': 99.8, 'OEE': 87.2 },
        { day: '15.05', 'Dostępność': 93.8, 'Wydajność': 95.2, 'Jakość': 99.9, 'OEE': 89.2 }
      ],
      'PRESS-ROMACO-1': [
        { day: '01.05', 'Dostępność': 94.5, 'Wydajność': 95.8, 'Jakość': 99.1, 'OEE': 89.7 },
        { day: '03.05', 'Dostępność': 93.9, 'Wydajność': 94.6, 'Jakość': 99.0, 'OEE': 87.9 },
        { day: '05.05', 'Dostępność': 92.1, 'Wydajność': 93.2, 'Jakość': 99.3, 'OEE': 85.2 },
        { day: '07.05', 'Dostępność': 95.0, 'Wydajność': 96.1, 'Jakość': 99.2, 'OEE': 90.5 },
        { day: '09.05', 'Dostępność': 96.2, 'Wydajność': 96.9, 'Jakość': 99.3, 'OEE': 92.5 },
        { day: '11.05', 'Dostępność': 91.0, 'Wydajność': 93.8, 'Jakość': 99.1, 'OEE': 84.6 },
        { day: '13.05', 'Dostępność': 94.8, 'Wydajność': 95.0, 'Jakość': 99.5, 'OEE': 89.6 },
        { day: '15.05', 'Dostępność': 95.3, 'Wydajność': 95.5, 'Jakość': 99.4, 'OEE': 90.5 }
      ]
    };
  }, []);

  const handleDownloadLabelPDF = (tool: ToolSet) => {
    const cleanStr = (str: string) => {
      if (!str) return '';
      return str
        .replace(/[ąĄ]/g, 'a').replace(/[ćĆ]/g, 'c').replace(/[ęĘ]/g, 'e')
        .replace(/[łŁ]/g, 'l').replace(/[ńŃ]/g, 'n').replace(/[óÓ]/g, 'o')
        .replace(/[śŚ]/g, 's').replace(/[źŹ]/g, 'z').replace(/[żŻ]/g, 'z');
    };

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85, 54]
    });

    const lastCal = tool.hologramKalibracji || "25.05.2026";

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(2, 2, 81, 50);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.rect(3, 3, 79, 48);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text("BIOFARM POZNAN S.A. - GMP LABEL", 5, 8);
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(5, 10, 80, 10);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("ID KOMPLETU:", 5, 15);
    doc.setFont("Helvetica", "normal");
    doc.text(`SET-${tool.id}`, 25, 15);

    doc.setFont("Helvetica", "bold");
    doc.text("KOD WEWN.:", 5, 20);
    doc.setFont("Helvetica", "normal");
    doc.text(cleanStr(tool.numerWewnetrzny || 'b.d.'), 25, 20);

    doc.setFont("Helvetica", "bold");
    doc.text("PRODUKT:", 5, 25);
    doc.setFont("Helvetica", "normal");
    const pName = cleanStr(tool.nazwaProduktu);
    doc.text(pName.length > 22 ? pName.substring(0, 22) + "..." : pName, 25, 25);

    doc.setFont("Helvetica", "bold");
    doc.text("KALIBRACJA:", 5, 30);
    doc.setFont("Helvetica", "normal");
    doc.text(cleanStr(lastCal), 25, 30);

    doc.setFont("Helvetica", "bold");
    doc.text("STATUS:", 5, 35);
    doc.setFont("Helvetica", "bold");
    doc.text(cleanStr(tool.status), 25, 35);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text("Skanuj kod QR na terminalu zeby zsynchronizowac OEE.", 5, 42);
    doc.text("Zatwierdzone GMP Aneks 15 * System Bio-Tools", 5, 45);

    const qrX = 55;
    const qrY = 13;
    const qS = 23;
    
    doc.setFillColor(255, 255, 255);
    doc.rect(qrX, qrY, qS, qS, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(qrX, qrY, qS, qS, 'S');

    const drawFinderPattern = (x: number, y: number) => {
      doc.setFillColor(0, 0, 0);
      doc.rect(x, y, 6, 6, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(x + 1, y + 1, 4, 4, 'F');
      doc.setFillColor(0, 0, 0);
      doc.rect(x + 2, y + 2, 2, 2, 'F');
    };

    drawFinderPattern(qrX + 1, qrY + 1);
    drawFinderPattern(qrX + qS - 7, qrY + 1);
    drawFinderPattern(qrX + 1, qrY + qS - 7);

    const matrix = [
      [1,0,1,1,1,0],
      [0,1,0,0,1,1],
      [1,1,1,0,1,0],
      [0,0,1,1,0,1],
      [1,0,1,0,1,1],
      [0,1,1,1,0,0]
    ];
    doc.setFillColor(0, 0, 0);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (matrix[r][c] === 1) {
          doc.rect(qrX + 7 + c * 1.5, qrY + 7 + r * 1.5, 1.5, 1.5, 'F');
        }
      }
    }

    doc.save(`ETYKIETA_METROLOGICZNA_SET_${tool.id}.pdf`);
  };

  const handleDownloadLabelPNG = (tool: ToolSet) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 250;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#888888';
    ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText('BIOFARM POZNAN S.A.', 24, 40);

    ctx.font = 'bold 11px Courier New';
    ctx.fillStyle = '#444444';
    ctx.fillText('GMP TECHNICAL THERMAL LABEL', 24, 56);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(24, 65);
    ctx.lineTo(376, 65);
    ctx.stroke();

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#333333';
    let y = 95;
    const drawItem = (label: string, text: string) => {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#000000';
      ctx.fillText(label, 24, y);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#555555';
      ctx.fillText(text, 120, y);
      y += 22;
    };

    drawItem('ID KOMPLETU:', `SET-${tool.id}`);
    drawItem('KOD WEWN.:', tool.numerWewnetrzny || 'b.d.');
    drawItem('PRODUKT:', tool.nazwaProduktu.length > 18 ? tool.nazwaProduktu.substring(0, 18) + '...' : tool.nazwaProduktu);
    drawItem('KALIBRACJA:', tool.hologramKalibracji || '25.05.2026');
    drawItem('STATUS:', tool.status);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText('Zatwierdzone GMP Aneks 15 * System Bio-Tools', 24, 218);
    ctx.fillText('Skanuj kod QR na terminalu OEE', 24, 230);

    const qrX = 270;
    const qrY = 85;
    const qS = 100;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX, qrY, qS, qS);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(qrX, qrY, qS, qS);

    const drawPNGFinder = (fx: number, fy: number) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(fx, fy, 25, 25);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fx + 4, fy + 4, 17, 17);
      ctx.fillStyle = '#000000';
      ctx.fillRect(fx + 8, fy + 8, 9, 9);
    };

    drawPNGFinder(qrX + 4, qrY + 4);
    drawPNGFinder(qrX + qS - 29, qrY + 4);
    drawPNGFinder(qrX + 4, qrY + qS - 29);

    ctx.fillStyle = '#000000';
    const matrix = [
      [1,0,1,1,1,0],
      [0,1,0,0,1,1],
      [1,1,1,0,1,0],
      [0,0,1,1,0,1],
      [1,0,1,0,1,1],
      [0,1,1,1,0,0]
    ];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; r < 6 && c < 6; c++) {
        if (matrix[r][c] === 1) {
          ctx.fillRect(qrX + 32 + c * 6, qrY + 32 + r * 6, 6, 6);
        }
      }
    }

    const link = document.createElement('a');
    link.download = `ETYKIETA_METROLOGICZNA_SET_${tool.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Function to export all GMP logs and toolsets data to a structured JSON file (Requirement 3)
  const handleExportGmpJson = () => {
    try {
      const gmpDataToExport = {
        title: "Krajowy System Ewidencji Systemowej i Monitorowania OEE - Raport Archiwalny GMP",
        exportTimestamp: new Date().toISOString(),
        exportedBy: "karol.gemini.ai@gmail.com",
        systemVersion: "v2.1.0-compliance",
        securityStandard: "21 CFR Part 11 Compliant Audit Log",
        recordsCount: toolSets.length,
        data: toolSets.map(set => ({
          id: set.id,
          productName: set.nazwaProduktu,
          internalNumber: set.numerWewnetrzny,
          location: set.lokalizacja,
          supplier: set.dostawca,
          deliveryDate: set.dataDostawy,
          shape: set.ksztaltTabletki,
          standard: set.standardNarzedzi,
          multipleTooling: set.narzedziaWielokrotne,
          quantity: set.iloscZamawianych,
          marking: set.znakowanie,
          maxForceKn: set.silaNacisku,
          steelType: set.rodzajStali,
          currentStatus: set.status,
          dateAdded: set.dataDodania,
          totalStrokes: set.uzycieGlowne,
          strokeLimit: set.uzycieLimit,
          wearPercentage: Math.round((set.uzycieGlowne / set.uzycieLimit) * 100),
          serviceHistory: set.historiaSerwisowa || [],
          statusHistory: set.statusHistory || []
        }))
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gmpDataToExport, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `GMP-ARCHIVE-${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      console.error("Failed to export JSON archive", error);
      alert("Błąd podczas eksportu danych GMP. Sprawdź poprawność danych.");
    }
  };

  // States for forecasting tool wear exceedance (Linear Lifetime Forecast)
  const [forecastToolId, setForecastToolId] = useState<string>(toolSets[0]?.id || '');
  const [forecastCompareToolId, setForecastCompareToolId] = useState<string>('');
  const [dailyStrokes, setDailyStrokes] = useState<number>(35000);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(30);

  // Auto-open requested history tool modal
  useEffect(() => {
    if (initialSelectedToolSetId) {
      const tool = toolSets.find(t => t.id === initialSelectedToolSetId);
      if (tool) {
        setSelectedHistoryTool(tool);
        setStatusHistorySelectedToolId(initialSelectedToolSetId);
        if (onClearInitialSelectedToolSetId) {
          onClearInitialSelectedToolSetId();
        }
      }
    }
  }, [initialSelectedToolSetId, toolSets, onClearInitialSelectedToolSetId]);

  // States for Service History inputs (Option 1 & 5)
  const [modalTab, setModalTab] = useState<'dziennik' | 'certyfikat' | 'predykcja' | 'inspekcja_3d' | 'zalaczniki'>('dziennik');
  const [showAddRecordForm, setShowAddRecordForm] = useState<boolean>(false);
  const [newRecordType, setNewRecordType] = useState<'Kwalifikacja' | 'Polerowanie' | 'Inspekcja' | 'Metrologia' | 'Mycie Ultradźwiękowe'>('Polerowanie');
  const [newRecordOperator, setNewRecordOperator] = useState<string>('');
  const [newRecordVerifier, setNewRecordVerifier] = useState<string>('');
  const [newRecordStatus, setNewRecordStatus] = useState<'Zatwierdzony' | 'Wykonano' | 'Wymaga uwagi'>('Wykonano');
  const [newRecordNotes, setNewRecordNotes] = useState<string>('');
  
  // GMP validation checklists (Propozycja 2)
  const [gmpCheckCleaning, setGmpCheckCleaning] = useState<boolean>(false);
  const [gmpCheckMicroscope, setGmpCheckMicroscope] = useState<boolean>(false);
  const [gmpCheckTolerance, setGmpCheckTolerance] = useState<boolean>(false);
  const [gmpCheckQASign, setGmpCheckQASign] = useState<boolean>(false);
  
  // Predictive wearable load simulation slider (Propozycja 3)
  const [loadSimulationValue, setLoadSimulationValue] = useState<number>(1000000);
  
  // Metrological tolerances
  const [newRecordDlugoscMax, setNewRecordDlugoscMax] = useState<string>('133.61');
  const [newRecordDlugoscMin, setNewRecordDlugoscMin] = useState<string>('133.59');
  const [newRecordBicie, setNewRecordBicie] = useState<string>('0.003');
  const [newRecordRa, setNewRecordRa] = useState<string>('0.04');

  // CSV generation and downloading handler (Option 1)
  const handleExportCSV = () => {
    // Generate complete CSV content explaining history service records and wear status
    const headers = [
      'Komplet ID',
      'Nazwa Produktu',
      'Rozmiar / Standard',
      'Rodzaj Stali',
      'Stan Zuzycia %',
      'Uzycie Glowne (Stemony)',
      'Limit Uzycia (Stemony)',
      'Sila Nacisku (kN)',
      'Liczba Rekordow Serwisowych',
      'Ostatnia Operacja Serwisowa',
      'Poziom Twardosci HRC'
    ];

    const rows = toolSets.map(set => {
      const wearPercent = Math.round((set.uzycieGlowne / set.uzycieLimit) * 100);
      const svcRecords = set.historiaSerwisowa || [];
      const lastSvc = svcRecords.length > 0 ? svcRecords[svcRecords.length - 1] : null;
      const lastSvcDesc = lastSvc ? `${lastSvc.typ} - ${lastSvc.operator} (${lastSvc.data})` : 'Brak';
      const hrc = set.rodzajStali.includes('Bohler') ? '62 HRC' : set.rodzajStali.includes('WC-Co') ? '66 HRC' : '58 HRC';

      return [
        `SET-${set.id}`,
        `"${set.nazwaProduktu.replace(/"/g, '""')}"`,
        set.standardNarzedzi,
        `"${set.rodzajStali}"`,
        `${wearPercent}%`,
        set.uzycieGlowne,
        set.uzycieLimit,
        set.silaNacisku,
        svcRecords.length,
        `"${lastSvcDesc.replace(/"/g, '""')}"`,
        hrc
      ];
    });

    const csvContent = [
      '\uFEFF' + headers.join(','), // BOM for excel Polish characters
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Biofarm_Oprzyrzadowanie_Pelny_Raport_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFullTechnicalAuditPDF = () => {
    const cleanStr = (str: string) => {
      if (!str) return '';
      return str
        .replace(/[ąĄ]/g, 'a').replace(/[ćĆ]/g, 'c').replace(/[ęĘ]/g, 'e')
        .replace(/[łŁ]/g, 'l').replace(/[ńŃ]/g, 'n').replace(/[óÓ]/g, 'o')
        .replace(/[śŚ]/g, 's').replace(/[źŹ]/g, 'z').replace(/[żŻ]/g, 'z');
    };

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Outer border/frame
    doc.setDrawColor(11, 69, 150); // Biofarm Blue
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Decorative Header Cover
    doc.setFillColor(11, 69, 105);
    doc.rect(10, 10, 190, 30, 'F');

    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text("PELNY RAPORT AUDYTU TECHNICZNEGO OPRZYRZADOWANIA I MASZYN GMP", 15, 22);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("DZIAL INTEGRACJI JAKOSCI I UTRZYMANIA RUCHU * BIOFARM POZNAN S.A.", 15, 29);
    doc.text("Zgodnosc z wytycznymi GMP / Aneks 15 / 21 CFR Part 11 (Audit Trail)", 15, 34);

    // Metadata section
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.text("1. METRIC SPECS & AUDIT CONTROL SUMMARY:", 15, 48);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Data generowania audytu: ${new Date().toISOString().substring(0, 19).replace('T', ' ')} UTC`, 15, 54);
    doc.text(`Dokument referencyjny: B-GMP-TSA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, 15, 60);
    doc.text(`Status metrologiczny: WSZYSTKIE URZADZENIA SKALIBROWANE`, 15, 66);
    doc.text(`Suma kontrolna audytu: SHA255-AUDIT-FBA${Math.floor(1000000 + Math.random() * 9000000)}`, 15, 72);

    // Write table of all tool sets
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("2. AKTUALNE POZIOMY STROKOW I STOPNIE ZUZYCIA KOMPLETOW:", 15, 82);

    // Header array
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 86, 180, 7, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("ID Kompletu", 17, 91);
    doc.text("Produkt", 45, 91);
    doc.text("Stal", 90, 91);
    doc.text("Standard", 115, 91);
    doc.text("Uderzenia", 137, 91);
    doc.text("Wear Rate", 160, 91);
    doc.text("Status", 178, 91);

    // Dynamic row writing
    doc.setFont("Helvetica", "normal");
    toolSets.forEach((set, idx) => {
      const yOf = 93 + (idx * 6.5);
      doc.rect(15, yOf, 180, 6.5);
      
      const wearPct = Math.min(100, Math.round((set.uzycieGlowne / set.uzycieLimit) * 100));

      doc.setFont("Helvetica", "bold");
      doc.text(`SET-${set.id}`, 17, yOf + 4.5);
      doc.setFont("Helvetica", "normal");
      doc.text(cleanStr(set.nazwaProduktu.substring(0, 22)), 45, yOf + 4.5);
      doc.text(cleanStr(set.rodzajStali.substring(0, 12)), 90, yOf + 4.5);
      doc.text(cleanStr(set.standardNarzedzi), 115, yOf + 4.5);
      doc.text(`${(set.uzycieGlowne / 1000000).toFixed(2)}M`, 137, yOf + 4.5);
      
      doc.setFont("Helvetica", "bold");
      doc.text(`${wearPct}%`, 160, yOf + 4.5);
      doc.text(cleanStr(set.status === 'Gotowy do produkcji' ? 'GOTOWY' : set.status === 'W użyciu' ? 'W UZYCIU' : 'SERWIS'), 178, yOf + 4.5);
    });

    // Let's add more detailed information below, such as outstanding service records
    let currentY = 93 + (toolSets.length * 6.5) + 12;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("3. RAPORT HISTORII SERWISOWEJ I WALIDACYJNEJ (OSTATNIE ZAPISY):", 15, currentY);

    currentY += 4;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, currentY, 180, 7, 'F');
    doc.setFontSize(7.5);
    doc.text("Komplet ID", 17, currentY + 4.5);
    doc.text("Typ Zabiegu", 40, currentY + 4.5);
    doc.text("Technik / Operator", 85, currentY + 4.5);
    doc.text("Status", 130, currentY + 4.5);
    doc.text("Metrologia (Bicie/Ra)", 150, currentY + 4.5);

    // Write log for latest service history records dynamically
    let svcCount = 0;
    doc.setFont("Helvetica", "normal");
    
    // Flatten lists of history
    toolSets.forEach(set => {
      const svcRecords = set.historiaSerwisowa || [];
      svcRecords.forEach(rec => {
        if (svcCount >= 8) return; // limit rows
        svcCount++;
        currentY += 6.5;
        doc.rect(15, currentY, 180, 6.5);
        
        doc.setFont("Helvetica", "bold");
        doc.text(`SET-${set.id}`, 17, currentY + 4.5);
        doc.setFont("Helvetica", "normal");
        doc.text(cleanStr(rec.typ), 40, currentY + 4.5);
        doc.text(cleanStr(rec.operator), 85, currentY + 4.5);
        doc.text(cleanStr(rec.status), 130, currentY + 4.5);
        
        const bicieVal = rec.metrologia?.biciePromieniowe !== undefined ? `${rec.metrologia.biciePromieniowe}mm` : 'N/A';
        const raVal = rec.metrologia?.chropowatoscRa !== undefined ? `Ra ${rec.metrologia.chropowatoscRa}um` : 'N/A';
        doc.text(`${bicieVal} / ${raVal}`, 150, currentY + 4.5);
      });
    });

    if (svcCount === 0) {
      currentY += 6.5;
      doc.rect(15, currentY, 180, 6.5);
      doc.text("BRAK ZAREJESTROWANYCH PROCEDUR MANUALNYCH W BAZIE.", 35, currentY + 4.5);
    }

    // Now let's transition to Page 2 for machine list metrology and signatures
    doc.addPage();
    doc.setDrawColor(11, 69, 150);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Page 2 header
    doc.setFillColor(11, 69, 150);
    doc.rect(10, 10, 190, 15, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("RAPORT METROLOGICZNY MASZYN I SYGNATURY BIOMETRYCZNE", 15, 20);

    // Machine list section
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("4. POMIARY METROLOGICZNE I KLASA DOKLADNOSCI PRESS-OEE:", 15, 36);

    // Fill table
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 41, 180, 7, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Zidentyfikowana Maszyna", 17, 46);
    doc.text("Biezace OEE", 75, 46);
    doc.text("Prog Alarmu OEE", 110, 46);
    doc.text("Ostatni Serwis", 145, 46);

    doc.setFont("Helvetica", "normal");
    const pressesExtList = [
      { id: 'PRESS-FETTE-1', name: 'T1 - Fette Compacting 2200ic', oee: 90.8, lastClean: 'Mycie standardowe GMP' },
      { id: 'PRESS-KILIAN-1', name: 'T2 - KILIAN SYNTHESIS 500', oee: 88.3, lastClean: 'Wymiana oleju i uszczelnien' },
      { id: 'PRESS-KORSCH-1', name: 'T3 - KORSCH XL400 MFP', oee: 89.2, lastClean: 'Wymiana stempli' },
      { id: 'PRESS-ROMACO-1', name: 'T4 - KORSCH XL400 SL', oee: 90.5, lastClean: 'Inspekcja lozysk' }
    ];

    pressesExtList.forEach((press, i) => {
      const yOf = 48 + (i * 7.5);
      doc.rect(15, yOf, 180, 7.5);
      
      doc.setFont("Helvetica", "bold");
      doc.text(cleanStr(press.name), 17, yOf + 5);
      doc.setFont("Helvetica", "normal");
      doc.text(`${press.oee.toFixed(1)}%`, 75, yOf + 5);
      doc.text(`${oeeAlertThresholds[press.id] || 75}%`, 110, yOf + 5);
      doc.text(cleanStr(press.lastClean), 145, yOf + 5);
    });

    // Add a beautiful GMP seal box representing complete 21 CFR conformance and security logs
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("5. CERTYFIKACJA CYFROWA ZGODNOSCI SYSTEMOWEJ (21 CFR PART 11):", 15, 95);

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 100, 180, 50, 'F');
    doc.rect(15, 100, 180, 50);

    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.setFont("Helvetica", "bold");
    doc.text("OSWIADCZENIE DZIALU JAKOSCI BIOFARM POZNAN:", 18, 105);
    doc.setFont("Helvetica", "normal");
    doc.text("Niniejszy dokument stanowi cyfrowy wyciag z bazy danych Systemu Kontroli Zuzycia Stempli.", 18, 110);
    doc.text("Wszystkie procedury pomiarowe, czyszczenie ultradzwiekowe oraz polerowanie zostaly przeprowadzone", 18, 114);
    doc.text("zgodnie z obowiazujacymi instrukcjami stanowiskowymi SOP oraz wytycznymi GMP/GDP.", 18, 118);
    doc.text("System zapisu historii statusow gwarantuje pelna sciezke audytowa (Audit Trail) zmian stanów.", 18, 122);
    
    doc.setFont("Helvetica", "bold");
    doc.text("PODWOJNA KONTROLA I ZASADA CZWORGA OCZU (FOUR-EYES PRINCIPLE):", 18, 129);
    doc.setFont("Helvetica", "normal");
    doc.text("Wpisy manualne i kalibracje wymagaly uwierzytelnienia kodem PIN (Technik oraz kontroler QA).", 18, 134);
    doc.text(`Wszystkie stany krytyczne zostaly zidentyfikowane i zarchiwizowane dla przyszlych audytów GIF.`, 18, 138);

    // Signatures
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    // Technician signature lines
    doc.line(18, 195, 88, 195);
    doc.setFont("Helvetica", "bold");
    doc.text("PODPIS TECHNIKA (SERWISANT):", 18, 168);
    doc.setFont("Helvetica", "normal");
    doc.text("Andrzej Wisniewski (Lead Tech)", 18, 175);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Sygnowano biometrycznie kodem PIN: #1234", 18, 180);
    doc.text("Data podpisu: " + new Date().toISOString().split('T')[0], 18, 184);

    // QA Inspector signature lines
    doc.line(110, 195, 180, 195);
    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "bold");
    doc.text("ZATWIERDZENIE DZIALU JAKOSCI (QA):", 110, 168);
    doc.setFont("Helvetica", "normal");
    doc.text("Joanna Nowak (QA Senior Inspector)", 110, 175);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Sygnowano biometrycznie kodem PIN: #5555", 110, 180);
    doc.text("Data podpisu: " + new Date().toISOString().split('T')[0], 110, 184);

    // Save PDF
    doc.save(`PELNY_AUDYT_TECHNICZNY_GMP_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportSummaryPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Outer border/frame
    doc.setDrawColor(11, 69, 150); // Biofarm Blue
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Decorative Header
    doc.setFillColor(11, 69, 150);
    doc.rect(10, 10, 190, 25, 'F');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("ZBIORCZY RAPORT ANALITYCZNY OEE I ZUZYCIA", 15, 20);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(200, 220, 255);
    doc.text("Dzial Zapewnienia Jakosci (QA) i Utrzymania Ruchu * Biofarm Poznan S.A.", 15, 26);

    // Metadata details
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    doc.setFont("Helvetica", "bold");
    doc.text("METADANE RAPORTU I WALIDACJA SYSTEMU:", 15, 45);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Data raportu (systemowa):`, 15, 52);
    doc.setFont("Helvetica", "bold");
    doc.text(`${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]}`, 65, 52);

    doc.setFont("Helvetica", "normal");
    doc.text(`Opracowal (QC Operator):`, 15, 58);
    doc.setFont("Helvetica", "bold");
    doc.text(`Andrzej Wisniewski (System QC)`, 65, 58);

    doc.setFont("Helvetica", "normal");
    doc.text(`Zatwierdzil (QA Inspector):`, 15, 64);
    doc.setFont("Helvetica", "bold");
    doc.text(`Joanna Nowak (Biofarm QA)`, 65, 64);

    doc.setFont("Helvetica", "normal");
    doc.text(`Status zgodnosci GMP:`, 15, 70);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(0, 150, 100);
    doc.text(`KOMPLETNY I ZGODNY (ZATWIERDZONY CYFROWO)`, 65, 70);

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.text("1. PROGNOZOWANE STOPNIE ZUZYCIA STALI SPECJALNYCH (BOHLER):", 15, 82);

    // Header of data table 1
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 87, 180, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 87, 180, 7);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Cykle (M)", 20, 92);
    doc.text("Zuzucie 58 HRC (um)", 60, 92);
    doc.text("Zuzucie 62 HRC (um)", 110, 92);
    doc.text("Zuzucie 66 HRC (um)", 160, 92);

    doc.setFont("Helvetica", "normal");
    const pointsDemo = ['1.0M', '2.5M', '4.0M', '5.0M'];
    const wear58 = [5.0, 14.5, 26.8, 36.4];
    const wear62 = [2.3, 6.7, 12.1, 16.2];
    const wear66 = [0.8, 2.5, 4.2, 5.5];

    pointsDemo.forEach((cyc, idx) => {
      const yOffset = 94 + (idx * 6);
      doc.rect(15, yOffset, 180, 6);
      doc.text(cyc, 20, yOffset + 4.5);
      doc.text(`${wear58[idx]} um`, 60, yOffset + 4.5);
      doc.text(`${wear62[idx]} um`, 110, yOffset + 4.5);
      doc.text(`${wear66[idx]} um`, 160, yOffset + 4.5);
    });

    // Drawing a visual bar chart representation in vector format
    doc.setDrawColor(11, 69, 150);
    doc.setLineWidth(0.4);
    // Draw chart grid
    doc.line(20, 150, 190, 150); // X Axis
    doc.line(20, 122, 20, 150); // Y Axis
    
    doc.setFontSize(7);
    doc.text("50 um", 12, 124);
    doc.text("0 um", 15, 149);

    // Bars
    // 58 HRC Bar
    doc.setFillColor(244, 63, 94);
    doc.rect(35, 150 - (36.4 / 50 * 25), 18, (36.4 / 50 * 25), 'F');
    doc.text("58 HRC", 38, 154);

    // 62 HRC Bar
    doc.setFillColor(6, 182, 212);
    doc.rect(85, 150 - (16.2 / 50 * 25), 18, (16.2 / 50 * 25), 'F');
    doc.text("62 HRC", 88, 154);

    // 66 HRC Bar
    doc.setFillColor(16, 185, 129);
    doc.rect(135, 150 - (5.5 / 50 * 25), 18, (5.5 / 50 * 25), 'F');
    doc.text("66 HRC", 138, 154);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Rys 1. Porownawcze prognozy zuzycia czola stempli przy 5.0M cykli (um)", 30, 160);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. ZESTAWIENIE EFEKTYWNOSCI OEE TABLETKAREK BIOFARM:", 15, 168);

    doc.setFillColor(241, 245, 249);
    doc.rect(15, 172, 180, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 172, 180, 7);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Maszyna (ID)", 18, 177);
    doc.text("Dostepnosc", 55, 177);
    doc.text("Wydajnosc", 85, 177);
    doc.text("Jakosc", 115, 177);
    doc.text("Skumulowane OEE", 145, 177);
    doc.text("Prog Alarmu", 175, 177);

    doc.setFont("Helvetica", "normal");
    const pressesList = [
      { id: 'PRESS-FETTE-1', name: 'T1 - Fette Compacting 2200ic', d: 96.0, w: 95.0, q: 99.6, o: 90.8 },
      { id: 'PRESS-KILIAN-1', name: 'T2 - KILIAN SYNTHESIS 500', d: 94.5, w: 94.1, q: 99.3, o: 88.3 },
      { id: 'PRESS-KORSCH-1', name: 'T3 - KORSCH XL400 MFP', d: 93.8, w: 95.2, q: 99.9, o: 89.2 },
      { id: 'PRESS-ROMACO-1', name: 'T4 - KORSCH XL400 SL', d: 95.3, w: 95.5, q: 99.4, o: 90.5 }
    ];

    pressesList.forEach((press, i) => {
      const yOf = 179 + (i * 6.5);
      doc.rect(15, yOf, 180, 6.5);
      doc.setFont("Helvetica", "bold");
      doc.text(press.name, 18, yOf + 4.5);
      doc.setFont("Helvetica", "normal");
      doc.text(`${press.d.toFixed(1)}%`, 55, yOf + 4.5);
      doc.text(`${press.w.toFixed(1)}%`, 85, yOf + 4.5);
      doc.text(`${press.q.toFixed(1)}%`, 115, yOf + 4.5);
      doc.setFont("Helvetica", "bold");
      doc.text(`${press.o.toFixed(1)}%`, 145, yOf + 4.5);
      doc.text(`${oeeAlertThresholds[press.id] || 75}%`, 175, yOf + 4.5);
    });

    // Transition to Page 2
    doc.addPage();

    // Outer border/frame for Page 2
    doc.setDrawColor(11, 69, 150);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Page 2 header
    doc.setFillColor(11, 69, 150);
    doc.rect(10, 10, 190, 18, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("ZBIORCZY RAPORT ANALITYCZNY OEE - STRONA 2/2", 15, 22);

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("3. ROZBICIE DANYCH ZMIANOWYCH DLA WYBRANEJ MASZYNY:", 15, 40);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Prasujaca tabletkarka systemowa: ${selectedOeePress}`, 15, 46);

    // Let's print table with shifts on Page 2
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 52, 180, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 52, 180, 7);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Dzien", 18, 57);
    doc.text("Zmiana robocza", 45, 57);
    doc.text("Dostepnosc", 85, 57);
    doc.text("Wydajnosc", 115, 57);
    doc.text("Jakosc", 145, 57);
    doc.text("Wynik OEE (%)", 170, 57);

    doc.setFont("Helvetica", "normal");
    const rawPressHistory = oeeAreaDataForPresses[selectedOeePress as 'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'] || [];
    const pressHistoryLimit = rawPressHistory.slice(0, 7); // keep it safe for fitting page
    
    pressHistoryLimit.forEach((item, idx) => {
      const yOffsetBase = 59 + (idx * 12);
      
      const av = item['Dostępność'];
      const pr = item['Wydajność'];
      const ql = item['Jakość'];
      
      const dayAv = Math.min(100, av + 0.6);
      const dayPr = Math.min(100, pr + 0.8);
      const dayQl = Math.min(100, ql - 0.2);
      const dayOee = (dayAv * dayPr * dayQl) / 10000;

      const nightAv = Math.min(100, av - 0.8);
      const nightPr = Math.min(100, pr - 1.0);
      const nightQl = Math.min(100, ql + 0.1);
      const nightOee = (nightAv * nightPr * nightQl) / 10000;

      // Day row box
      doc.rect(15, yOffsetBase, 180, 6);
      doc.setFont("Helvetica", "bold");
      doc.text(item.day, 18, yOffsetBase + 4.1);
      doc.setFont("Helvetica", "normal");
      doc.text("DZIEN (06:00 - 18:00)", 45, yOffsetBase + 4.1);
      doc.text(`${dayAv.toFixed(1)}%`, 85, yOffsetBase + 4.1);
      doc.text(`${dayPr.toFixed(1)}%`, 115, yOffsetBase + 4.1);
      doc.text(`${dayQl.toFixed(1)}%`, 145, yOffsetBase + 4.1);
      doc.setFont("Helvetica", "bold");
      doc.text(`${(dayOee * 100).toFixed(1)}%`, 170, yOffsetBase + 4.1);

      // Night row box
      doc.setFont("Helvetica", "normal");
      doc.rect(15, yOffsetBase + 6, 180, 6);
      doc.text("NOC (18:00 - 06:00)", 45, yOffsetBase + 10.1);
      doc.text(`${nightAv.toFixed(1)}%`, 85, yOffsetBase + 10.1);
      doc.text(`${nightPr.toFixed(1)}%`, 115, yOffsetBase + 10.1);
      doc.text(`${nightQl.toFixed(1)}%`, 145, yOffsetBase + 10.1);
      doc.setFont("Helvetica", "bold");
      doc.text(`${(nightOee * 100).toFixed(1)}%`, 170, yOffsetBase + 10.1);
    });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("4. AUTORYZACJA CYFROWA TECHNICZNA I DOPUSZCZENIE KONTROLI JAKOSCI:", 15, 155);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Dzial Zapewnienia Jakosci (Quality Assurance) Biofarm S.A. poswiadcza, iz systemy", 15, 161);
    doc.text("raportowe OEE oraz starzenia stempli sa zgodne z wymaganiami walidacyjnymi GMP KO", 15, 165);
    doc.text("oraz podlegaja ciaglemu audytowi cyfrowemu zgodnie z standardem 21 CFR Part 11.", 15, 169);

    // Seal box background
    doc.setFillColor(240, 253, 250); // soft teal
    doc.rect(15, 174, 180, 36, 'F');
    doc.setDrawColor(13, 148, 136); // teal border
    doc.setLineWidth(0.5);
    doc.rect(15, 174, 180, 36);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110); // dark teal
    doc.text("CYFROWY PROTOKOL WALIDACYJNY SYSTEMU QA:", 20, 181);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Autoryzacja przez system:", 20, 187);
    doc.setFont("Helvetica", "bold");
    doc.text("Biofarm QA-Suite Automatic Validation v3.9", 65, 187);

    doc.setFont("Helvetica", "normal");
    doc.text("Glowny audytor QA:", 20, 193);
    doc.setFont("Helvetica", "bold");
    doc.text("Joanna Nowak (QA Inspector ID: 4099)", 65, 193);

    doc.setFont("Helvetica", "normal");
    doc.text("Unikalny klucz skrotu (Hash):", 20, 199);
    doc.setFont("Helvetica", "bold");
    doc.text(`SHA255-DE39B2CC778F3B01EE-${Math.floor(100000 + Math.random()*900000)}`, 65, 199);

    doc.setFont("Helvetica", "normal");
    doc.text("Status autoryzacji:", 20, 205);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(11, 69, 150);
    doc.text("ZATWIERDZONY DO EKSPLOATACJI PRODUKCYJNEJ (PRODUCTION RELEASED)", 65, 205);

    // Footer on page 2
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Wydruk z bazodanowego systemu nadzoru stempli i OEE Biofarm S.A. Dokument poufny, rejestrowany w Audit Trail.", 15, 271);

    doc.save(`Biofarm_Zbiorczy_Raport_OEE_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // E-Signature and 21 CFR Part 11 states (Propozycja 1)
  const [showESigModal, setShowESigModal] = useState<boolean>(false);
  const [esigLogin, setEsigLogin] = useState<string>('');
  const [esigPin, setEsigPin] = useState<string>('');
  const [esigReason, setEsigReason] = useState<string>('Zatwierdzenie sprawności metrologicznej i technicznej (CFR Part 11)');
  const [esigActionType, setEsigActionType] = useState<'service_record' | 'certificate'>('service_record');
  const [isSigningInProcess, setIsSigningInProcess] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');
  const [isCertSigned, setIsCertSigned] = useState<boolean>(false);
  const [signedOperatorName, setSignedOperatorName] = useState<string>('');
  const [signedTimestamp, setSignedTimestamp] = useState<string>('');
  const [signedHash, setSignedHash] = useState<string>('');

  // Słownik przyczyn podpisu GMP (CFR Part 11 Signature Reasons)
  const signatureReasons = [
    'Zatwierdzenie sprawności metrologicznej i technicznej (CFR Part 11)',
    'Wykonanie konserwacji okresowej - polerowanie i mycie',
    'Dopuszczenie kompletu do produkcji farmaceutycznej',
    'Kwalifikacja techniczna po przeprowadzeniu regeneracji',
    'Rewizja okresowa parametrów technicznych stempli'
  ];

  // Audit Trail CFR Part 11 state log list (Propozycja 1)
  const [auditTrail, setAuditTrail] = useState<Array<{
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    reason: string;
    hash: string;
    status: 'SUCCESS' | 'WARNING';
  }>>([
    {
      id: "TX-41125",
      timestamp: "2026-05-25 09:20:15",
      actor: "dr Joanna Kowalska (QA Lead)",
      action: "Zatwierdzenie Certyfikatu Zgodności Metrologicznej dla zestawu #1001",
      reason: "Dopuszczenie kompletu do produkcji farmaceutycznej",
      hash: "SHA256: e8f89bc77d01abf12ef440c9d90fe123eabc76d5423bc3fe89ab8c92a104...",
      status: 'SUCCESS'
    },
    {
      id: "TX-41120",
      timestamp: "2026-05-24 10:45:10",
      actor: "Michał Wiśniewski (Senior Operator)",
      action: "Zapis logu polerowania mechanicznego kompletu #621503",
      reason: "Wykonanie konserwacji okresowej - polerowanie i mycie",
      hash: "SHA256: de98bf7a2305cf12ea80dfab1204cfeb5ac90fe123ea78ab9cde456fed...",
      status: 'SUCCESS'
    },
    {
      id: "TX-40918",
      timestamp: "2026-05-18 11:22:45",
      actor: "mgr inż. Krzysztof Nowak (QA)",
      action: "IQ/OQ Kwalifikacja techniczna kompletu stempli #621503",
      reason: "Zatwierdzenie sprawności metrologicznej i technicznej (CFR Part 11)",
      hash: "SHA255: 4f3a2b9e8c07d1a25ea7b2f4c6e80ad45bc39e2f90a16bda9b348daecf2...",
      status: 'SUCCESS'
    },
    {
      id: "TX-40810",
      timestamp: "2026-05-12 14:15:33",
      actor: "mgr inż. Andrzej Wiśniewski (Senior GMP Specialist)",
      action: "Zatwierdzenie procedury profilowania i wymiany uszczelnień dla zestawu #1002",
      reason: "Kwalifikacja techniczna po przeprowadzeniu regeneracji",
      hash: "SHA256: da39a3ee5e6b4b0d3255bfef95601890afd80709cdfc61f32a4cf13a5f...",
      status: 'SUCCESS'
    },
    {
      id: "TX-40301",
      timestamp: "2026-05-05 08:02:11",
      actor: "dr Joanna Kowalska (QA Lead)",
      action: "Systemowe zatwierdzenie wyników automatycznego pomiaru 3D kompletu #1003",
      reason: "Zatwierdzenie sprawności metrologicznej i technicznej (CFR Part 11)",
      hash: "SHA256: 7f83bc1c67623cf56fb892dfd546bc1209abcde34ee9cdff562bac9910d...",
      status: 'SUCCESS'
    }
  ]);

  // Interactive CAD / Calibration profile parameters (Propozycja 2)
  const [certDlugosc, setCertDlugosc] = useState<number>(133.61);
  const [certBicie, setCertBicie] = useState<number>(0.003);
  const [certRa, setCertRa] = useState<number>(0.04);
  const [certPasowanie, setCertPasowanie] = useState<number>(0.005);

  // Synchronize simulated CAD metrics whenever selected toolset changes
  useEffect(() => {
    if (selectedHistoryTool) {
      const records = selectedHistoryTool.historiaSerwisowa || [];
      const latestMetrology = records.slice().reverse().find(r => r.metrologia?.dlugoscCalkowitaMax)?.metrologia;
      setCertDlugosc(latestMetrology?.dlugoscCalkowitaMax || 133.61);
      setCertBicie(latestMetrology?.biciePromieniowe || 0.003);
      setCertRa(latestMetrology?.chropowatoscRa || 0.04);
      setCertPasowanie(0.005);
      setIsCertSigned(false);
    }
  }, [selectedHistoryTool]);

  // Calculates and displays tools nearing their limit (>90% usage)
  // Corrosion & wash simulator states (Proposal 2 of current batch)
  const [washChemical, setWashChemical] = useState<string>('active_acid');
  const [washPh, setWashPh] = useState<number>(2.5);

  // CFR Part 11 Co-Signature states (Proposal 1 of current batch)
  const [coSignEvents, setCoSignEvents] = useState<Array<{
    id: string;
    toolId: string;
    productName: string;
    serviceType: string;
    operator: string;
    date: string;
    notes: string;
    isSigned: boolean;
    coSigner?: string;
    coSignedDate?: string;
  }>>([
    {
      id: 'EVT-9921',
      toolId: '101',
      productName: 'Paracetamol 500mg',
      serviceType: 'Kalibracja i Metrologia',
      operator: 'Michał Wiśniewski (Operator)',
      date: new Date().toISOString().split('T')[0],
      notes: 'Pomiar mikrometryczny grubości bębnowej górnej krawędzi stempla. Tolerancja bicia w normie (0.005mm). Wymaga sprawdzającego z działu QA.',
      isSigned: false,
    },
    {
      id: 'EVT-9925',
      toolId: '102',
      productName: 'Witamina C 1000mg',
      serviceType: 'Polerowanie i Mycie',
      operator: 'Tomasz Mazur (Senior Technician)',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      notes: 'Zakończono polerowanie czoła za pomocą pasty tlenku glinu 1µm. Brak zarysowań graweru roboczego. Wymaga weryfikacji GMP.',
      isSigned: false,
    }
  ]);
  const [activeSigningId, setActiveSigningId] = useState<string | null>(null);
  const [coSignAuditor, setCoSignAuditor] = useState<string>('dr Joanna Kowalska (QA Lead)');
  const [coSignPin, setCoSignPin] = useState<string>('');
  const [coSignError, setCoSignError] = useState<string>('');

  const getMaintenanceSoonTools = (sets: ToolSet[]) => {
    return sets
      .map(set => {
        const percentage = (set.uzycieGlowne / set.uzycieLimit) * 100;
        return { ...set, percentage };
      })
      .filter(set => set.percentage >= 90 && set.status !== 'Wycofany z produkcji')
      .sort((a, b) => b.percentage - a.percentage);
  };

  const getServiceHistory = (t: ToolSet) => {
    const baseDate = new Date(t.dataDostawy);
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result.toISOString().split('T')[0];
    };

    const staticHistory = [
      {
        date: addDays(baseDate, 1),
        type: 'Kwalifikacja techniczna (IQ/OQ)',
        operator: 'mgr inż. Krzysztof Nowak (Dział Walidacji)',
        status: 'Zatwierdzony / Zgodny',
        notes: `Pomiar metrologiczny średnicy roboczej [d=${t.standardNarzedzi === 'EU-B' ? '19.00' : '25.40'} mm] oraz wysokości całkowitej stempli. Testy pasowania w gniazdach stemplarek Fette 2090. Odchyłka bicia promieniowego < 0.008 mm. Narzędzia dopuszczone do kontaktu z produktem leczniczym ${t.nazwaProduktu}.`
      },
      {
        date: addDays(baseDate, Math.max(30, Math.floor(t.uzycieGlowne / 1000000) * 15)),
        type: 'Polerowanie maszynowe & Mycie',
        operator: 'Monika Zielińska (Sektor Narzędziowni)',
        status: 'Wykonano',
        notes: `Mycie w kąpieli ultradźwiękowej z detergentem neutralnym. Polerowanie mechaniczne powierzchni czołowych stempli za pomocą pasty diamentowej 3µm (Ra osiągnięte: 0.06 µm). Weryfikacja wizualna pod mikroskopem stereoskopowym (brak mikropęknięć koron roboczych).`
      }
    ];

    if (t.uzycieGlowne > 1500000) {
      staticHistory.push({
        date: addDays(baseDate, Math.max(65, Math.floor(t.uzycieGlowne / 1000000) * 28)),
        type: 'Inspekcja okresowa & Wymiana uszczelnień',
        operator: 'Tomasz Mazur (Dział Utrzymania Ruchu)',
        status: 'Wykonano',
        notes: `Wymiana pierścieni zgarniających (uszczelek pyłoszczelnych) na nowe z silikonu medycznego (zgodność FDA). Kontrola luzu osiowego w tulejach prowadzących stempla górnego i dolnego. Smarowanie smarem dopuszczonym do kontaktu z żywnością NSF H1.`
      });
    }

    const percentage = (t.uzycieGlowne / t.uzycieLimit) * 100;
    if (percentage >= 90) {
      staticHistory.push({
        date: '2026-05-12',
        type: 'Korekta grawerunku & Profilowanie',
        operator: 'mgr inż. Andrzej Wiśniewski (Senior GMP Specialist)',
        status: 'Wymaga uwagi',
        notes: `Stwierdzono degradację mikro-krawędzi formującej graweru grawitacyjnego [Mln uderzeń: ${(t.uzycieGlowne/1000000).toFixed(2)}M]. Występuje ryzyko "przyklejania" granulatu ${t.nazwaProduktu} w szczelinie logo. Zlecono pilną weryfikację kąta natarcia ostrza oraz ponowne polerowanie.`
      });
    }

    // Merge custom logs stored under t.historiaSerwisowa
    const customHistory = (t.historiaSerwisowa || []).map((record) => {
      let notesText = record.notatki;
      if (record.metrologia && (record.metrologia.dlugoscCalkowitaMax || record.metrologia.chropowatoscRa)) {
        notesText += ` [Dane metrologiczne: dł. max/min = ${record.metrologia.dlugoscCalkowitaMax || 'N/A'}/${record.metrologia.dlugoscCalkowitaMin || 'N/A'} mm, bicie = ${record.metrologia.biciePromieniowe || 'N/A'} mm, Ra = ${record.metrologia.chropowatoscRa || 'N/A'} µm].`;
      }
      return {
        date: record.data,
        type: record.typ,
        operator: record.operator,
        status: record.status === 'Zatwierdzony' ? 'Zatwierdzony / Zgodny' : record.status,
        notes: notesText
      };
    });

    return [...staticHistory, ...customHistory].sort((a, b) => b.date.localeCompare(a.date));
  };

  const handleAddServiceRecord = () => {
    if (!selectedHistoryTool || !onUpdateToolSet) return;
    if (!newRecordOperator.trim()) {
      alert('Proszę podać nazwisko operatora (sygnatariusza GMP).');
      return;
    }
    if (!newRecordVerifier.trim()) {
      alert('Zgodnie z zasadą podwójnej kontroli (Four-Eyes Principle / GMP 21 CFR Part 11) wymagane jest podanie drugiego sprawdzającego reprezentującego dział QA.');
      return;
    }
    if (!newRecordNotes.trim()) {
      alert('Proszę uzupełnić notatki techniczne i uwagi GMP.');
      return;
    }

    // Instead of saving directly, we pop the CFR Part 11 E-Signature login prompt
    setEsigLogin(newRecordOperator.toLowerCase().replace(/\s/g, '.'));
    setEsigPin('');
    setPinError('');
    setEsigActionType('service_record');
    
    // Auto-map action reason based on selected service record type
    let mappedReason = 'Zatwierdzenie sprawności metrologicznej i technicznej (CFR Part 11)';
    if (newRecordType === 'Polerowanie' || newRecordType === 'Mycie Ultradźwiękowe') {
      mappedReason = 'Wykonanie konserwacji okresowej - polerowanie i mycie';
    } else if (newRecordType === 'Kwalifikacja') {
      mappedReason = 'Kwalifikacja techniczna po przeprowadzeniu regeneracji';
    } else if (newRecordType === 'Metrologia') {
      mappedReason = 'Rewizja okresowa parametrów technicznych stempli';
    }
    setEsigReason(mappedReason);
    setShowESigModal(true);
  };

  const executeSignedServiceRecord = (signedBy: string, reasonText: string, signatureHash: string) => {
    if (!selectedHistoryTool || !onUpdateToolSet) return;
    
    // Determine checklist string
    const checksPassed = gmpCheckCleaning && gmpCheckMicroscope && gmpCheckTolerance && gmpCheckQASign;
    const checklistText = checksPassed 
      ? "\n[ZATWIERDZONA PEŁNA PROCEDURA WALIDACYJNA GMP (Mycie, Mikroskopia, Tolerancje, Podpis QA)]"
      : "\n[OSTRZEŻENIE: PROCEDURA CZĘŚCIOWA - BRAK PEŁNEGO PROTOKOŁU GMP]";

    const eSignatureNote = `\n[PODPIS ELEKTRONICZNY - 21 CFR PART 11]\nPodpisany przez: ${signedBy}\nDrugi sprawdzający (QA): ${newRecordVerifier}\nPowód: ${reasonText}\nSuma kontrolna: SHA255-${signatureHash}\nStatus autoryzacji: Zgoda elektroniczna podwójnej kontroli`;

    const newRecord: ServiceRecord = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      data: new Date().toISOString().split('T')[0],
      typ: newRecordType,
      operator: signedBy,
      status: newRecordStatus,
      notatki: newRecordNotes + checklistText + eSignatureNote,
      metrologia: {
        dlugoscCalkowitaMax: parseFloat(newRecordDlugoscMax) || undefined,
        dlugoscCalkowitaMin: parseFloat(newRecordDlugoscMin) || undefined,
        biciePromieniowe: parseFloat(newRecordBicie) || undefined,
        chropowatoscRa: parseFloat(newRecordRa) || undefined,
      },
      verifiedBy: newRecordVerifier || undefined,
      isGmpVerified: true,
      verificationDate: new Date().toISOString().split('T')[0]
    };

    const updatedToolSet: ToolSet = {
      ...selectedHistoryTool,
      historiaSerwisowa: [...(selectedHistoryTool.historiaSerwisowa || []), newRecord],
      status: newRecordStatus === 'Zatwierdzony' || newRecordStatus === 'Wykonano' ? 'Gotowy do produkcji' : selectedHistoryTool.status
    };

    onUpdateToolSet(updatedToolSet);
    setSelectedHistoryTool(updatedToolSet);

    // Save into Audit Trail
    const newAuditTx = {
      id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: `${signedBy} (QA: ${newRecordVerifier})`,
      action: `Autoryzacja zapisu interwencji serwisowej (${newRecordType}) dla kompletu #${selectedHistoryTool.id}`,
      reason: reasonText,
      hash: "SHA255: " + signatureHash,
      status: (newRecordStatus === 'Wymaga uwagi' ? 'WARNING' : 'SUCCESS') as 'SUCCESS' | 'WARNING'
    };
    setAuditTrail(prev => [newAuditTx, ...prev]);

    // Reset form
    setShowAddRecordForm(false);
    setNewRecordNotes('');
    setNewRecordOperator('');
    setNewRecordVerifier('');
    
    // Reset checklists
    setGmpCheckCleaning(false);
    setGmpCheckMicroscope(false);
    setGmpCheckTolerance(false);
    setGmpCheckQASign(false);
  };

  const executeSignedCertificate = (signedBy: string, reasonText: string, signatureHash: string) => {
    if (!selectedHistoryTool) return;
    setIsCertSigned(true);
    setSignedOperatorName(signedBy);
    setSignedTimestamp(new Date().toLocaleString());
    setSignedHash(signatureHash);

    // Append audit trail log
    const newAuditTx = {
      id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: signedBy,
      action: `Zatwierdzenie Certyfikatu Zgodności Metrologicznej dla zestawu #${selectedHistoryTool.id}`,
      reason: reasonText,
      hash: "SHA255: " + signatureHash,
      status: 'SUCCESS' as const
    };
    setAuditTrail(prev => [newAuditTx, ...prev]);
  };

  const handleTriggerCertificateSignature = () => {
    if (!selectedHistoryTool) return;
    
    // Default Operator to signed user or general QA Role based on initials
    setEsigLogin('qa.lead');
    setEsigPin('');
    setPinError('');
    setEsigActionType('certificate');
    setEsigReason('Dopuszczenie kompletu do produkcji farmaceutycznej');
    setShowESigModal(true);
  };

  const handleSignConfirm = () => {
    if (!esigLogin.trim()) {
      setPinError('Identyfikator sygnatariusza (login) jest wymagany!');
      return;
    }
    if (!esigPin.trim()) {
      setPinError('Kod PIN autoryzacji jest wymagany!');
      return;
    }
    // PIN Check
    if (esigPin !== '1234') {
      setPinError('Niepoprawny kod PIN autoryzacji GMP dla danej roli! (Wskazówka: Domyślny PIN to 1234)');
      return;
    }

    setPinError('');
    setIsSigningInProcess(true);

    setTimeout(() => {
      // Generate secure sha256 mock hash resembling official signature hashes
      const hexChars = '0123456789abcdef';
      let simulatedHash = '';
      for (let i = 0; i < 40; i++) {
        simulatedHash += hexChars[Math.floor(Math.random() * 16)];
      }

      const fullname = esigLogin === 'qa.lead' 
        ? 'dr Joanna Kowalska (QA Lead)' 
        : esigLogin.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

      if (esigActionType === 'service_record') {
        executeSignedServiceRecord(fullname, esigReason, simulatedHash);
      } else {
        executeSignedCertificate(fullname, esigReason, simulatedHash);
      }

      setIsSigningInProcess(false);
      setShowESigModal(false);
    }, 1500);
  };

  const maintenanceSoonTools = getMaintenanceSoonTools(toolSets);

  const filteredMaintenanceSoonTools = React.useMemo(() => {
    return maintenanceSoonTools.filter(t => 
      t.id.toLowerCase().includes(maintenanceSearchQuery.toLowerCase()) ||
      t.nazwaProduktu.toLowerCase().includes(maintenanceSearchQuery.toLowerCase())
    );
  }, [maintenanceSoonTools, maintenanceSearchQuery]);

  const mtbfStats = React.useMemo(() => {
    // Obliczamy MTBF tylko dla lokalizacji będących liniami produkcyjnymi
    const lines = Array.from(new Set(toolSets.map(t => t.lokalizacja)))
      .filter(loc => loc.toLowerCase().includes('linia'));

    // Jeśli brak, używamy domyślnych
    const finalLines = lines.length > 0 ? lines : ['Linia Produkcyjna L1', 'Linia Produkcyjna L3'];

    return finalLines.map(lineName => {
      const lineTools = toolSets.filter(t => t.lokalizacja === lineName);
      
      let totalStrokes = 0;
      let totalInterventions = 0;

      lineTools.forEach(t => {
        totalStrokes += t.uzycieGlowne;
        const history = getServiceHistory(t);
        totalInterventions += history.length;
      });

      // MTBF w uderzeniach roboczych (strokes)
      // Standardowo w farmacji re-polerowanie stempli wykonuje się co 1.0M - 1.5M uderzeń.
      let mtbfStrokes = 1500000; // Bazowa domyślna wartość (1.5M)
      if (totalInterventions > 0 && totalStrokes > 0) {
        mtbfStrokes = totalStrokes / totalInterventions;
      } else if (lineTools.length > 0) {
        const avgLimit = lineTools.reduce((acc, t) => acc + t.uzycieLimit, 0) / lineTools.length;
        mtbfStrokes = Math.round(avgLimit / 2.5);
      }

      // Normalizacja do bezpiecznych i realnych przedziałów technologicznych GMP
      if (mtbfStrokes < 400000) mtbfStrokes = 400000;
      if (mtbfStrokes > 2200000) mtbfStrokes = 2200000;

      // MTBF w dniach roboczych (zakładając średnio 120 000 obciążeń uderzeniowych na dobę ciągłej pracy pras)
      const mtbfDays = Math.round((mtbfStrokes / 120000) * 10) / 10;

      // Ocena punktowa stabilności sprzętowej bazująca na MTBF (optymalnie >= 1.4 Mln)
      let healthScore = Math.min(100, Math.round((mtbfStrokes / 1600000) * 100));
      if (healthScore < 45) healthScore = 45;

      let healthLabel = 'Doskonały';
      let healthColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
      if (healthScore < 70) {
        healthLabel = 'Wymaga uwagi';
        healthColor = 'text-rose-600 bg-rose-50 border-rose-200/50';
      } else if (healthScore < 85) {
        healthLabel = 'Zadowalający';
        healthColor = 'text-amber-600 bg-amber-50 border-amber-200/50';
      }

      return {
        lineName,
        toolsCount: lineTools.length,
        totalStrokes,
        totalInterventions,
        mtbfStrokes,
        mtbfDays,
        healthScore,
        healthLabel,
        healthColor
      };
    });
  }, [toolSets]);

  // Agregacja zużycia według linii produkcyjnych i magazynów
  const locationStats = React.useMemo(() => {
    const statsMap: Record<string, { totalStrokes: number; count: number }> = {};
    
    // Inicjalizacja domyślnych danych dająca pewność, że wszystkie lokalizacje się wyświetlą
    const defaultLocations = [
      'Linia Produkcyjna L1',
      'Linia Produkcyjna L3',
      'Magazyn Narzędziownia B-4',
      'Magazyn Główny A-1',
      'Kwarantanna / Serwis',
      'Dział Walidacji i Testów'
    ];
    
    defaultLocations.forEach(loc => {
      statsMap[loc] = { totalStrokes: 0, count: 0 };
    });

    toolSets.forEach((set) => {
      const loc = set.lokalizacja;
      if (!statsMap[loc]) {
        statsMap[loc] = { totalStrokes: 0, count: 0 };
      }
      statsMap[loc].totalStrokes += set.uzycieGlowne;
      statsMap[loc].count += 1;
    });

    return Object.entries(statsMap).map(([rawName, data]) => {
      // Przyjazna polska nazwa dla tablicy renderującej
      let displayName = rawName;
      let colorClass = 'from-slate-400 to-slate-500';
      
      if (rawName.includes('L1')) {
        displayName = 'Linia Produkcyjna L1';
        colorClass = 'from-[#0b4596] to-blue-500';
      } else if (rawName.includes('L3')) {
        displayName = 'Linia Produkcyjna L3';
        colorClass = 'from-[#00ca9a] to-emerald-400';
      } else if (rawName.includes('Narzędziownia')) {
        displayName = 'Narzędziownia B-4';
        colorClass = 'from-amber-400 to-amber-500';
      } else if (rawName.includes('Magazyn Główny')) {
        displayName = 'Magazyn Główny A-1';
        colorClass = 'from-indigo-400 to-indigo-500';
      } else if (rawName.includes('Kwarantanna')) {
        displayName = 'Kwarantanna i Serwis';
        colorClass = 'from-rose-400 to-rose-500';
      } else if (rawName.includes('Walidacji')) {
        displayName = 'Dział Walidacji';
        colorClass = 'from-violet-400 to-violet-500';
      }

      return {
        rawName,
        name: displayName,
        value: data.totalStrokes / 1_000_000, // w milionach uderzeń
        exactValue: data.totalStrokes,
        count: data.count,
        colorClass
      };
    }).sort((a, b) => b.exactValue - a.exactValue);
  }, [toolSets]);

  const maxStrokes = Math.max(...locationStats.map(s => s.value), 1);
  const highestLoadLocation = locationStats[0];

  // Interactive dynamic statistics for our custom SVG curve
  const monthlyData = [
    { month: 'Styczeń', cycles: 4.8 },
    { month: 'Luty', cycles: 5.2 },
    { month: 'Marzec', cycles: 6.9 },
    { month: 'Kwiecień', cycles: 5.8 },
    { month: 'Maj', cycles: 8.2 },
    { month: 'Czerwiec (Projekcja)', cycles: 9.5 },
  ];

  const maxVal = 10;
  const chartHeight = 160;
  const chartWidth = 520;

  // 30-Day OEE Trend Data Generator
  const oeeTrendData = React.useMemo(() => {
    const data = [];
    const baseSeed = 
      selectedOeePress === 'PRESS-FETTE-1' ? 88 : 
      selectedOeePress === 'PRESS-KILIAN-1' ? 82 : 
      selectedOeePress === 'PRESS-KORSCH-1' ? 73 : 79;

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
      
      const fluctuation = Math.sin((30 - i) * 0.7) * 4 + Math.cos((30 - i) * 0.3) * 2;
      const oee = Math.min(99, Math.max(50, Math.round(baseSeed + fluctuation)));
      const availability = Math.min(100, Math.round(oee + 3 + Math.sin(30 - i) * 1.5));
      const performance = Math.min(100, Math.round(oee - 2 + Math.cos(30 - i) * 2));
      const quality = Math.min(100, Math.round(98.8 + ((30 - i) % 7) * 0.15));

      data.push({
        day: dateStr,
        OEE: oee,
        Dostępność: availability,
        Wydajność: performance,
        Jakość: quality,
      });
    }
    return data;
  }, [selectedOeePress]);

  // Transform monthly data to coordinate strings for Area outline and Line path.
  const points = monthlyData.map((d, index) => {
    const val = activeTab === 'export' ? d.cycles * 0.45 : d.cycles;
    const x = (index / (monthlyData.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (val / maxVal) * (chartHeight - 40) - 20;
    return { x, y, label: d.month, val };
  });

  const pathString = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaString = `${pathString} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-display font-bold text-biofarm-dark flex items-center gap-2">
            Raporty i Analizy Zużycia
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
            Przemysłowa analityka wydajnościowa stempli prasujących GMP
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            id="export-summary-pdf-btn"
            onClick={handleExportSummaryPDF}
            className="px-4 py-2.5 bg-[#0b4596] hover:bg-[#002f6c] text-white border border-[#0b4596] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer font-bold font-mono text-xs select-none uppercase tracking-wide shrink-0"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Eksport Zbiorczy PDF (QA)</span>
          </button>

          <button
            type="button"
            id="export-technical-audit-pdf-btn"
            onClick={handleExportFullTechnicalAuditPDF}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-650 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer font-bold font-mono text-xs select-none uppercase tracking-wide shrink-0"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Pełny Audyt Techniczny PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddRecordModalOpen(true)}
            className="px-4 py-2.5 bg-[#00ca9a] hover:bg-emerald-500 text-slate-950 hover:text-slate-900 border border-emerald-500 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer font-bold font-mono text-xs select-none uppercase tracking-wide shrink-0"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Zarejestruj Serwis (Manualny)</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW SELECTOR TABS FOR REPORTS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 w-full border-b border-slate-200 pb-4">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-205 gap-1 self-start w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setReportsSubView('steel_wear')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 select-none ${
              reportsSubView === 'steel_wear'
                ? 'bg-[#0b4596] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Zużycie stali & Mikrotwardość</span>
          </button>
          <button
            type="button"
            onClick={() => setReportsSubView('oee_analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 select-none ${
              reportsSubView === 'oee_analytics'
                ? 'bg-[#0b4596] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Analityka OEE Tabletkarek</span>
          </button>
          <button
            type="button"
            onClick={() => setReportsSubView('production_heatmap')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 select-none ${
              reportsSubView === 'production_heatmap'
                ? 'bg-[#0b4596] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Obciążenie Linii (Heatmap)</span>
          </button>
          <button
            type="button"
            onClick={() => setReportsSubView('status_history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 select-none ${
              reportsSubView === 'status_history'
                ? 'bg-[#0b4596] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historia statusów GMP</span>
          </button>
        </div>

        {/* JSON Archival Export Button (Requirement 3) - DEFERRED FOR PHASE III */}
        <div className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 opacity-70 cursor-not-allowed select-none" title="Funkcja eksportu JSON została odłożona na Etap III">
          <Clock className="w-3.5 h-3.5 text-slate-405" />
          <span>Eksport JSON (Etap III)</span>
        </div>
      </div>

      {reportsSubView === 'steel_wear' ? (
        <>
          {/* PROPOZYCJA 3: ZAAWANSOWANY PROGNOZER I PREDYKCJA ZUŻYCIA */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-500/20 shadow-lg space-y-6 relative overflow-hidden">
        {/* Ambient glow decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-biofarm-blue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-505 bg-[#00ca9a]/15 text-[#00ca9a] rounded-lg">
                <Wrench className="w-5 h-5" />
              </span>
              <h4 className="text-base font-bold font-display text-white tracking-tight">
                Predykcyjny Prognozer Trwałości Stempli i Matryc
              </h4>
            </div>
            <p className="text-[10px] text-slate-400 font-mono uppercase mt-1">
              Symulacja starzeniowa pod obciążeniem eksploatacyjnym GMP
            </p>
          </div>
          <span className="text-[9px] font-mono bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 px-2.5 py-1 rounded-lg">
            METODA: EXTRAPOLACJA LINIOWA METODĄ NAJMNIEJSZYCH KWADRATÓW
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Slider control on left */}
          <div className="lg:col-span-4 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold font-sans">Symulowane obciążenie:</span>
                <span className="text-[#00ca9a] font-mono font-black text-sm">
                  +{(loadSimulationValue / 1000000).toFixed(2)}M <span className="text-[10px] font-medium text-slate-400">uderzeń</span>
                </span>
              </div>
              
              <input
                type="range"
                min="0"
                max="3000000"
                step="100000"
                value={loadSimulationValue}
                onChange={(e) => setLoadSimulationValue(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00ca9a]"
              />
              
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Dziś (+0)</span>
                <span>+1.5M</span>
                <span>Max (+3.0M)</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal font-sans">
              Przesuń suwak, aby oszacować stan fizyczny oprzyrządowania po zrealizowaniu zaplanowanych serii produkcyjnych w fabryce Biofarm.
            </p>
          </div>

          {/* Right side live forecast stats */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(() => {
              // Perform projection calculations
              let safeCount = 0;
              let warningCount = 0;
              let criticalCount = 0;

              const projectedSets = toolSets.map(t => {
                const projectedUsage = t.uzycieGlowne + loadSimulationValue;
                const ratio = (projectedUsage / t.uzycieLimit) * 100;
                
                if (ratio >= 100) criticalCount++;
                else if (ratio >= 85) warningCount++;
                else safeCount++;

                return { ...t, projectedUsage, ratio, originalRatio: (t.uzycieGlowne / t.uzycieLimit) * 100 };
              });

              return (
                <>
                  {/* Stat panels */}
                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-emerald-500/20 text-left space-y-1.5 hover:border-emerald-500/40 transition-all">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 block font-bold">Zdatne do pracy</span>
                    <div className="text-xl font-bold font-mono tracking-tight text-white">{safeCount} kompletów</div>
                    <div className="text-[9px] text-[#00ca9a] font-mono">➔ Zużycie prognozowane &lt; 85%</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-amber-500/20 text-left space-y-1.5 hover:border-amber-500/40 transition-all">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 block font-bold">Wymagany serwis</span>
                    <div className="text-xl font-bold font-mono tracking-tight text-white">{warningCount} kompletów</div>
                    <div className="text-[9px] text-amber-500 font-mono">➔ Zużycie prognozowane 85-100%</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-rose-500/20 text-left space-y-1.5 hover:border-rose-500/40 transition-all">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-rose-400 block font-bold">Krytyczne / STOP</span>
                    <div className="text-xl font-bold font-mono tracking-tight text-white">{criticalCount} kompletów</div>
                    <div className="text-[9px] text-rose-500 font-mono">➔ Przekroczenie limitu 100%!</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Dynamic miniature graphical list of critical prediction items */}
        {loadSimulationValue > 0 && (
          <div className="bg-black/25 rounded-xl p-4 border border-white/5 space-y-3">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="uppercase text-slate-300 font-bold">⚡ Prognozowane przekroczenie limitów dla kompletów stempli:</span>
              <span>WIDOK PROJEKCYJNY STARZENIOWY</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toolSets
                .map(t => {
                  const projectedUsage = t.uzycieGlowne + loadSimulationValue;
                  const ratio = Math.round((projectedUsage / t.uzycieLimit) * 100);
                  const isExceeded = ratio >= 100;
                  return { ...t, projectedUsage, ratio, isExceeded };
                })
                .sort((a, b) => b.ratio - a.ratio)
                .slice(0, 4)
                .map(item => (
                  <div key={item.id} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono text-[9px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-705/50 font-mono mr-2">
                          #{item.id}
                        </span>
                        <span className="text-[10px] font-bold text-white font-sans">{item.nazwaProduktu}</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${item.isExceeded ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                        {item.ratio}% prognozowane
                      </span>
                    </div>

                    {/* Progress indicator comparing current vs simulated */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                        {/* Current Usage */}
                        <div 
                          className="bg-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${Math.min((item.uzycieGlowne / item.uzycieLimit) * 100, 100)}%` }}
                        />
                        {/* Simulated incremental load */}
                        {item.ratio > (item.uzycieGlowne / item.uzycieLimit) * 100 && (
                          <div 
                            className={`${item.isExceeded ? 'bg-rose-500' : 'bg-amber-400'} h-full transition-all duration-305`}
                            style={{ width: `${Math.min(item.ratio - (item.uzycieGlowne / item.uzycieLimit) * 100, 100 - (item.uzycieGlowne / item.uzycieLimit) * 100)}%` }}
                          />
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono">
                        <span>Aktualnie: {(item.uzycieGlowne/1000000).toFixed(2)}M / Limit {(item.uzycieLimit/1000000).toFixed(1)}M</span>
                        <span className="text-slate-400 font-bold">Po obciążeniu: {(item.projectedUsage/1000000).toFixed(2)}M</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Rząd 1: Główne wykresy obok siebie */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Custom Beautiful Vector Curve chart */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Łączna produkcja tabletkarska Biofarm (Mln sztuk)
                </h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                  Zsumowany wolumen obciążeń dla stempli i matryc
                </p>
              </div>

              <div className="flex bg-slate-100 px-2.5 py-1 rounded-lg gap-2 text-[10px] font-mono font-bold text-slate-500">
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded cursor-pointer ${activeTab === 'krajowe' ? 'bg-white text-biofarm-blue shadow-xs' : ''}`}
                  onClick={() => setActiveTab('krajowe')}
                >
                  Rynek Krajowy
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded cursor-pointer ${activeTab === 'export' ? 'bg-white text-biofarm-blue shadow-xs' : ''}`}
                  onClick={() => setActiveTab('export')}
                >
                  Export / EU
                </button>
              </div>
            </div>

            {/* Render Vector SVG Graph */}
            <div className="relative w-full overflow-hidden bg-slate-50/50 p-4 rounded-xl border border-slate-100 mt-4">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto overflow-visible select-none"
              >
                {/* Horizontal Grid lines */}
                {[2, 4, 6, 8, 10].map((gridLine) => {
                  const y = chartHeight - (gridLine / maxVal) * (chartHeight - 40) - 20;
                  return (
                    <g key={gridLine} className="opacity-40">
                      <line x1="20" y1={y} x2={chartWidth - 25} y2={y} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4 4" />
                      <text x="5" y={y + 3} fontSize="8" fill="#94a3b8" className="font-mono">{gridLine}M</text>
                    </g>
                  );
                })}

                {/* Glowing gradient definition */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0b4596" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0b4596" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Area filled block */}
                <motion.path
                  d={areaString}
                  fill="url(#chartGradient)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, d: areaString }}
                  transition={{ duration: 1, delay: 0.5 }}
                />

                {/* Line path contour */}
                <motion.path
                  d={pathString}
                  fill="none"
                  stroke="#0b4596"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1, d: pathString }}
                  transition={{
                    pathLength: { duration: 1.5, ease: "easeInOut" },
                    d: { duration: 0.6, ease: "easeInOut" }
                  }}
                />

                {/* Highlight points */}
                {points.map((pt, i) => (
                  <g key={pt.label}>
                    <motion.circle
                      cx={pt.x}
                      cy={pt.y}
                      r="5"
                      fill="#FFFFFF"
                      stroke="#0b4596"
                      strokeWidth="2.5"
                      className="cursor-pointer"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1, cx: pt.x, cy: pt.y }}
                      transition={{
                        scale: { delay: 0.8 + i * 0.12, type: 'spring', stiffness: 200, damping: 12 },
                        opacity: { delay: 0.8 + i * 0.12 },
                        cx: { duration: 0.6, ease: "easeInOut" },
                        cy: { duration: 0.6, ease: "easeInOut" }
                      }}
                      whileHover={{ scale: 1.4, transition: { duration: 0.2 } }}
                    />
                    {/* Tooltip value */}
                    <motion.text
                      x={pt.x}
                      y={pt.y - 10}
                      fontSize="9"
                      fontWeight="bold"
                      fill="#0f2d59"
                      textAnchor="middle"
                      className="font-mono"
                      initial={{ opacity: 0, y: pt.y }}
                      animate={{ opacity: 1, x: pt.x, y: pt.y - 10 }}
                      transition={{
                        opacity: { delay: 1.2 + i * 0.1, duration: 0.3 },
                        x: { duration: 0.6, ease: "easeInOut" },
                        y: { duration: 0.6, ease: "easeInOut" }
                      }}
                    >
                      {pt.val.toFixed(1)}M
                    </motion.text>
                    {/* Monthly Labels */}
                    <motion.text
                      x={pt.x}
                      y={chartHeight - 4}
                      fontSize="8"
                      fill="#64748b"
                      textAnchor="middle"
                      className="font-mono font-medium"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, x: pt.x }}
                      transition={{
                        opacity: { delay: 1.4 },
                        x: { duration: 0.6, ease: "easeInOut" }
                      }}
                    >
                      {pt.label}
                    </motion.text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-500 font-mono mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span>Smarowanie matryc: <span className="text-emerald-600 font-bold">1.2 mg/tab.</span></span>
            <span>Nacisk maksymalny: <span className="text-amber-600 font-bold">45 kN</span></span>
          </div>
        </div>

        {/* Right Column - Production Lines Bar Chart */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Obciążenie Linii Produkcyjnych i Sektorów
                </h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                  Sumaryczne zużycie (Mln uderzeń) stempli w lokacjach
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-4">
              {locationStats.map((stat, i) => {
                const pct = stat.value > 0 ? (stat.value / maxStrokes) * 100 : 0;
                return (
                  <div key={stat.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-350" />
                        {stat.name}
                        <span className="text-[8px] text-slate-400 font-normal px-1.5 py-0.5 rounded bg-slate-100 uppercase">
                          {stat.count} {stat.count === 1 ? 'zestaw' : stat.count >= 2 && stat.count <= 4 ? 'zestawy' : 'zestawów'}
                        </span>
                      </span>
                      <span className="text-slate-905 font-bold">
                        {stat.value.toFixed(2)} M <span className="text-[10px] text-slate-400 font-normal">uderzeń</span>
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-50 border border-slate-100/70 rounded-full overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: `${pct}%`, opacity: 1 }}
                        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.12 }}
                        className={`h-full rounded-full bg-gradient-to-r ${stat.colorClass} shadow-3xs`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono bg-slate-50/75 p-3 rounded-xl border border-slate-100 mt-4 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Najbardziej obciążona strefa GMP:</span>
              <span className="text-[#00ca9a] font-bold uppercase">{highestLoadLocation?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-200/50">
              <span>System Monitoringu Obciążeń Biofarm S.A.</span>
              <span>Aktualizacja w czasie rzeczywistym</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rząd 2: Alerty Konserwacji oraz Ograniczenia Sił Nacisku */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Pre-emptive Maintenance Alerts Section for Tools >90% usage */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
                PREWENCYJNE ALERTY KONSERWACJI (ZUŻYCIE &ge; 90%)
              </h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                Prognoza regeneracji stempli i matryc przed degradacją korony roboczej grawerunku
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
              maintenanceSoonTools.length > 0 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              WYMAGA INTERWENCJI: {maintenanceSoonTools.length}
            </span>
          </div>

          {maintenanceSoonTools.length > 0 ? (
            <div className="space-y-4">
              {/* GMP Search Filter Tool */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={maintenanceSearchQuery}
                  onChange={(e) => setMaintenanceSearchQuery(e.target.value)}
                  placeholder="Filtruj alerty według ID lub nazwy produktu..."
                  className="w-full pl-9 pr-8 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-700 placeholder-slate-405 shadow-3xs"
                />
                {maintenanceSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMaintenanceSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {filteredMaintenanceSoonTools.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMaintenanceSoonTools.map((t) => {
                const isCritical = t.percentage >= 95;
                const isHovered = hoveredCardId === t.id;
                const averageDailyUsage = Math.max(30000, 45000 + (parseInt(t.id) || 12345) % 5 * 15000);
                const strokesRemaining = t.uzycieLimit - t.uzycieGlowne;
                const daysRemaining = Math.max(0, Math.ceil(strokesRemaining / averageDailyUsage));

                return (
                  <div key={t.id} className="relative">
                    <motion.div 
                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 shadow-2xs relative overflow-visible cursor-help transition-colors duration-300 ${
                        isCritical 
                          ? 'border-rose-300 bg-rose-100/30' 
                          : 'border-rose-100 bg-rose-50/20 hover:bg-rose-50/40'
                      }`}
                      onMouseEnter={() => setHoveredCardId(t.id)}
                      onMouseLeave={() => setHoveredCardId(null)}
                      animate={isCritical ? {
                        scale: [1, 1.015, 1],
                        borderColor: ['#fecaca', '#fca5a5', '#fecaca'],
                        backgroundColor: ['rgba(254, 226, 226, 0.2)', 'rgba(254, 226, 226, 0.45)', 'rgba(254, 226, 226, 0.2)'],
                      } : undefined}
                      transition={isCritical ? {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      } : undefined}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />

                      {/* Interactive GMP Tooltip */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-72 bg-slate-950 text-white rounded-xl p-3.5 shadow-xl z-50 text-xs border border-slate-800 space-y-2 pointer-events-none font-sans"
                          >
                            <div className="flex items-center gap-1.5 border-b border-slate-850 pb-1.5 mb-1.5">
                              <Info className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="font-mono font-bold tracking-wider text-[8px] uppercase text-slate-300">METADANE OPRZYRZĄDOWANIA (GMP)</span>
                            </div>
                            
                            <div className="space-y-1.5 font-mono text-[10px]">
                              <div className="flex justify-between items-center bg-slate-900 p-1 px-2 rounded border border-slate-800/40">
                                <span className="text-slate-400 uppercase flex items-center gap-1 text-[9px]">
                                  <ExternalLink className="w-3 h-3 text-indigo-450" /> Dostawca:
                                </span>
                                <span className="font-bold text-slate-200">{t.dostawca || 'Biofarm S.A.'}</span>
                              </div>
                              
                              <div className="flex justify-between items-center bg-slate-900 p-1 px-2 rounded border border-slate-800/40">
                                <span className="text-slate-400 uppercase flex items-center gap-1 text-[9px]">
                                  <Hash className="w-3 h-3 text-indigo-450" /> Numer seryjny:
                                </span>
                                <span className="font-bold text-indigo-300 text-[10px]">{t.numerWewnetrzny || `BF-SET-${t.id}`}</span>
                              </div>
                              
                              <div className="flex justify-between items-center bg-slate-900 p-1 px-2 rounded border border-slate-800/40">
                                <span className="text-slate-400 uppercase flex items-center gap-1 text-[9px]">
                                  <Calendar className="w-3 h-3 text-indigo-450" /> Data rejestracji:
                                </span>
                                <span className="font-bold text-amber-400 text-[10px]">{t.dataDodania}</span>
                              </div>
                            </div>

                            <div className="text-[8px] text-slate-500 text-center uppercase tracking-widest pt-1 border-t border-slate-900/50 font-mono">
                              Dział Kontroli Jakości Biofarm
                            </div>
                            
                            {/* Tooltip Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                              {t.id}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                              {t.standardNarzedzi} • {t.rodzajStali}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-800 mt-1.5">
                            {t.nazwaProduktu}
                          </h5>
                        </div>
                        <span className="text-xs font-mono font-black text-rose-600 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md">
                          {t.percentage.toFixed(1)}%
                        </span>
                      </div>

                      <div className="space-y-2 relative z-10">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Precyzyjny stan zużycia
                          </span>
                          <span className="text-slate-600 font-bold">
                            {t.uzycieGlowne.toLocaleString()} / {t.uzycieLimit.toLocaleString()} uderzeń
                          </span>
                        </div>
                        
                        <div className="w-full h-3 bg-slate-100 rounded-full p-[2px] border border-slate-200/50 overflow-hidden relative shadow-inner">
                          <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: `${Math.min(t.percentage, 100)}%` }}
                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 relative overflow-hidden"
                          >
                            {/* Animated shimmering overlay to represent active/operational status */}
                            <motion.div
                              animate={{
                                x: ["-100%", "100%"]
                              }}
                              transition={{
                                duration: 2.2,
                                repeat: Infinity,
                                ease: "linear"
                              }}
                              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                            />
                            
                            {/* Continuous breathing glow of wear indicator */}
                            <motion.div
                              animate={{ opacity: [0.35, 0.7, 0.35] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className="absolute inset-0 bg-white/10"
                            />
                          </motion.div>
                        </div>
                        
                        <div className="flex justify-between items-center text-[9px] font-mono bg-slate-50 border border-slate-100/70 rounded-lg p-2 text-slate-500 mt-1">
                          <span>Średnie zużycie: <strong className="text-slate-700">{(averageDailyUsage / 1000).toFixed(0)}k/dobę</strong></span>
                          <span className="flex items-center gap-1">
                            Pozostało: <strong className={daysRemaining <= 3 ? "text-rose-600 font-bold" : "text-amber-600 font-bold"}>{daysRemaining} {daysRemaining === 1 ? 'dzień' : 'dni'}</strong>
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-rose-600/90 leading-normal font-mono bg-white/70 p-2 rounded-lg border border-rose-100 flex items-start gap-1.5 relative z-10">
                        <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>
                          Osiągnięto limit krytyczny. Zalecane natychmiastowe skierowanie kompletu do <strong>Działu Regeneracji i Polerowania</strong> w celu rewizji mikro-chropowatości.
                        </span>
                      </p>

                      <div className="pt-2.5 border-t border-rose-200/40 mt-1 flex justify-end relative z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHistoryTool(t);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 text-[10px] sm:text-xs font-mono font-bold tracking-tight transition-all cursor-pointer border border-rose-200"
                        >
                          <History className="w-3.5 h-3.5 animate-pulse" />
                          Dziennik Serwisowy (GMP)
                        </button>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-slate-200 bg-slate-50 rounded-xl text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-2">
                  <span className="text-xl animate-bounce">🔍</span>
                  <span className="font-bold text-slate-700">Brak alertów spełniających kryteria</span>
                  <span className="text-[10px] text-slate-400 text-center max-w-sm">
                    Nie znaleziono ID lub nazwy produktu pasującej do frazy: <strong className="text-slate-600 font-mono">"{maintenanceSearchQuery}"</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMaintenanceSearchQuery('')}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 border border-slate-900 text-white font-mono font-bold text-[10px] uppercase cursor-pointer tracking-wider transition-colors"
                  >
                    Wyczyść filtr wyszukiwania
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-200 bg-slate-55/40 rounded-xl text-slate-450 font-mono text-xs flex flex-col items-center justify-center gap-1.5">
              <span className="text-xl">✅</span>
              <span className="font-semibold text-slate-600">Pełna gotowość operacyjna stemplarek Biofarm</span>
              <span className="text-[10px] text-slate-400 uppercase">Wszystkie aktywne komplety posiadają optymalną żywotność poniżej 90% limitu.</span>
            </div>
          )}
        </div>

        {/* Right Column - Stress testing rules by Shape */}
        <div className="lg:col-span-4 bg-biofarm-dark text-white p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between bg-grid-pattern-dark relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-biofarm-cyan/5 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h4 className="text-xs font-mono font-bold text-biofarm-cyan uppercase tracking-wider">
                Ograniczenia Fizjologiczne Nacisku
              </h4>
              <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                Bezpieczne limity odpornościowe (kN)
              </p>
            </div>

            <div className="space-y-3 text-xs font-mono">
              {[
                { shape: 'Okrągły profil płaski', threshold: '40 kN max', label: 'Brak obostrzeń grawerunku' },
                { shape: 'Profil podłużny / Kapsułka', threshold: '28 kN max', label: 'Sprawdź grubość ścianek bocznych' },
                { shape: 'Kapsułka Zmodyfikowana', threshold: '24 kN max', label: 'Wymagane zaokrąglenia min R=0.5' },
                { shape: 'Kształt owalny lekki', threshold: '32 kN max', label: 'Optymalna sferyczna korona' },
                { shape: 'Kształty Kwadratowe / Custom', threshold: '20 kN max', label: 'Podwójny docisk pneumatyczny' },
              ].map((limit) => (
                <div key={limit.shape} className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div>
                    <span className="text-slate-300 font-semibold block">{limit.shape}</span>
                    <span className="text-[9px] text-slate-500">{limit.label}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-bold shrink-0">
                    {limit.threshold}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10">
            <button
              type="button"
              className="w-full py-2.5 rounded-lg bg-biofarm-cyan hover:bg-biofarm-cyan/80 text-biofarm-dark font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              onClick={handleExportCSV}
            >
              <Download className="w-4 h-4" /> Eksportuj kompletny wolumen (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Rząd 3: Analiza Niezawodności i MTBF Linii */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </span>
              ŚREDNI CZAS DO AWARII / REGENERACJI (MTBF)
            </h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
              Predykcyjna analiza niezawodności stempli i matryc dla aktywnych linii tabletkarskich
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[9px] uppercase font-bold tracking-tight">
            Raport niezawodności GMP
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mtbfStats.map((stat) => (
            <div key={stat.lineName} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50/80 transition-colors flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    {stat.lineName}
                  </h5>
                  <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">
                    Komplety stempli w ruchu: <strong>{stat.toolsCount}</strong>
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${stat.healthColor}`}>
                  STAN: {stat.healthLabel.toUpperCase()} ({stat.healthScore}%)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-3xs text-left">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Metrologiczny MTBF</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-1">
                    {Math.round(stat.mtbfStrokes).toLocaleString()}
                  </span>
                  <span className="text-[8px] text-slate-400 block mt-0.5">uderzeń roboczych</span>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-3xs text-left">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Operacyjny MTBF</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-1">
                    {stat.mtbfDays}
                  </span>
                  <span className="text-[8px] text-slate-400 block mt-0.5">dni ciągłej produkcji</span>
                </div>
              </div>

              {/* Dynamic summary progress indicator */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Wskaźnik stabilności pracy stempli:</span>
                  <span className="font-bold text-slate-705">{stat.healthScore}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-[1px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.healthScore}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full rounded-full bg-gradient-to-r ${
                      stat.healthScore >= 90
                        ? 'from-emerald-400 to-green-500'
                        : stat.healthScore >= 70
                          ? 'from-blue-400 to-indigo-500'
                          : 'from-amber-400 to-rose-500'
                    }`}
                  />
                </div>
              </div>

              {/* Informative description footer */}
              <div className="text-[9px] text-slate-500 font-mono flex items-start gap-1.5 bg-white p-2.5 border border-slate-200/60 rounded-lg text-left">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Suma obciążeń linii: <strong>{(stat.totalStrokes / 1000000).toFixed(2)}M</strong> uderzeń. Zarejestrowano <strong>{stat.totalInterventions}</strong> operacje polerowania i kwalifikacji GMP.
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TRENDY OEE PRAS TABLETKARSKICH (RECHARTS LINE CHART) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#0b4596]" />
              </span>
              Wskaźnik Efektywności Pras (OEE - Ostatnie 30 Dni)
            </h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
              Analiza trendu dostępności, wydajności i jakości parku maszynowego Biofarm S.A.
            </p>
          </div>

          {/* tablet press selection controls */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 gap-1 text-[10px] font-mono font-bold text-slate-600">
            {[
              { id: 'PRESS-FETTE-1', label: 'T1 - Fette Compacting 2200ic' },
              { id: 'PRESS-KILIAN-1', label: 'T2 - KILIAN SYNTHESIS 500' },
              { id: 'PRESS-KORSCH-1', label: 'T3 - KORSCH XL400 MFP' },
              { id: 'PRESS-ROMACO-1', label: 'T4 - KORSCH XL400 SL' },
            ].map((press) => (
              <button
                key={press.id}
                type="button"
                onClick={() => setSelectedOeePress(press.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedOeePress === press.id
                    ? 'bg-white text-biofarm-blue shadow-xs font-black'
                    : 'hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                {press.label}
              </button>
            ))}
          </div>
        </div>

        {/* The Recharts Line Chart for 30-day OEE */}
        <div className="w-full h-80 min-h-[300px] pt-4 font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={oeeTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" unit="%" domain={[30, 100]} style={{ fontSize: 10 }} />
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 12,
                  color: '#f8fafc',
                  fontSize: 11,
                  padding: 12,
                }}
              />
              
              <RechartsLegend verticalAlign="top" height={36} iconType="circle" />
              
              <RechartsLine
                type="monotone"
                dataKey="OEE"
                stroke="#0b4596"
                strokeWidth={3}
                dot={{ r: 2.5, strokeWidth: 1 }}
                activeDot={{ r: 6 }}
                name="Ogólny OEE (%)"
              />
              
              <RechartsLine
                type="monotone"
                dataKey="Dostępność"
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="Dostępność (%)"
                opacity={0.7}
              />
              
              <RechartsLine
                type="monotone"
                dataKey="Wydajność"
                stroke="#00ca9a"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                name="Wydajność (%)"
                opacity={0.7}
              />

              <RechartsLine
                type="monotone"
                dataKey="Jakość"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                name="Wskaźnik Jakości (%)"
                opacity={0.6}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap justify-between items-center text-[9.5px] font-mono text-slate-400 bg-slate-50 border border-slate-100 p-3 rounded-xl gap-2">
          <span>Cel OEE Biofarm Poznań: &ge; 85% (Klasa światowa / World Class OEE)</span>
          <span className="font-bold text-slate-500">
            Średnie OEE (30 dni): {(oeeTrendData.reduce((acc, curr) => acc + curr.OEE, 0) / 30).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* SECTION: PREDICTIVE MAINTENANCE & REMAINING USEFUL LIFE (RUL) FORECAST */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="p-1 px-1.5 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-mono text-[9px] font-bold">
                PM
              </span>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Prewencyjne Utrzymanie Ruchu & RUL (Predictive Maintenance Console)
              </h4>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
              Inteligentna prognoza zużycia czoła stempli i kalkulacja Remaining Useful Life (RUL)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Tool Selection */}
            <div className="flex flex-col gap-1 w-full sm:w-60">
              <label className="text-[9px] font-mono text-slate-400 uppercase font-black">Wybór Kompletu do Analizy RUL:</label>
              <select
                value={forecastToolId}
                onChange={(e) => {
                  setForecastToolId(e.target.value);
                  if (forecastCompareToolId === e.target.value) {
                    setForecastCompareToolId('');
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-indigo-505 font-mono"
              >
                {toolSets.map(t => (
                  <option key={t.id} value={t.id}>
                    SET-{t.id} - {t.nazwaProduktu} ({Math.round(t.uzycieGlowne / t.uzycieLimit * 100)}% zużycia)
                  </option>
                ))}
              </select>
            </div>

            {/* Comparative Tool Selection */}
            <div className="flex flex-col gap-1 w-full sm:w-60">
              <label className="text-[9px] font-mono text-slate-400 uppercase font-black">Porównaj z kompletem (Opcjonalnie):</label>
              <select
                value={forecastCompareToolId}
                onChange={(e) => setForecastCompareToolId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-indigo-505 font-mono"
              >
                <option value="">-- brak porównania --</option>
                {toolSets.filter(t => t.id !== forecastToolId).map(t => (
                  <option key={t.id} value={t.id}>
                    SET-{t.id} - {t.nazwaProduktu} ({t.rodzajStali})
                  </option>
                ))}
              </select>
            </div>

            {/* Daily Stroke Count Input / Slider */}
            <div className="flex flex-col gap-1 w-full sm:w-48">
              <label className="text-[9px] font-mono text-slate-400 uppercase font-black">Średnie obciążenie / dobę:</label>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5">
                <input
                  type="number"
                  min="5000"
                  max="150000"
                  step="5000"
                  value={dailyStrokes}
                  onChange={(e) => setDailyStrokes(Math.max(1000, parseInt(e.target.value) || 0))}
                  className="w-full text-slate-800 font-mono font-bold text-xs bg-transparent border-0 focus:ring-0 p-0"
                />
                <span className="text-[9.5px] font-mono text-slate-400 font-bold">szt/dzień</span>
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const selectedTool = toolSets.find(t => t.id === forecastToolId);
          if (!selectedTool) {
            return (
              <div className="text-center py-8 text-slate-400 font-mono text-xs bg-slate-50 rounded-xl border border-dashed border-slate-250">
                Wybierz komplet stempli, aby zainicjować predykcyjny silnik kalkulacji RUL.
              </div>
            );
          }

          const currentUsage = selectedTool.uzycieGlowne;
          const limit = selectedTool.uzycieLimit;
          const remainingHits = Math.max(0, limit - currentUsage);
          
          // Remaining Useful Life (RUL) calculations in %
          const mainRulPercent = Math.max(0, Math.round((remainingHits / limit * 100) * 10) / 10);
          
          // Days to deplete the toolset
          const daysToDepletion = dailyStrokes > 0 ? Math.ceil(remainingHits / dailyStrokes) : 365;

          // Estimated total wear percentage over time
          const dailyWearSpeed = limit > 0 ? (dailyStrokes / limit) * 100 : 0;

          // Generate timeline dataset for Recharts LineChart
          const pointsCount = 6;
          const stepDays = daysToDepletion > 0 ? Math.ceil(daysToDepletion / (pointsCount - 1)) : 30;
          const chartData: Array<{ dayIndex: number; label: string; dateStr: string; wear: number; compWear?: number; hits: number }> = [];

          const compTool = toolSets.find(t => t.id === forecastCompareToolId);

          const mainSteel = (selectedTool.rodzajStali || '').toUpperCase();
          const mainFactor = mainSteel.includes('VANADIS') || mainSteel.includes('V4') || mainSteel.includes('VASCO') ? 0.75 : mainSteel.includes('440') || mainSteel.includes('M390') ? 0.90 : mainSteel.includes('D2') || mainSteel.includes('NC11') ? 1.15 : 1.0;

          const compSteel = compTool ? (compTool.rodzajStali || '').toUpperCase() : '';
          const compFactor = compSteel.includes('VANADIS') || compSteel.includes('V4') || compSteel.includes('VASCO') ? 0.75 : compSteel.includes('440') || compSteel.includes('M390') ? 0.90 : compSteel.includes('D2') || compSteel.includes('NC11') ? 1.15 : 1.0;

          for (let i = 0; i < pointsCount; i++) {
            const daysAhead = i * stepDays;
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + daysAhead);
            const dateStr = targetDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const projectedQuantity = currentUsage + (daysAhead * dailyStrokes);
            const wearPercentage = Math.min(125, Math.round((projectedQuantity / limit) * 100 * mainFactor));

            let compWearPercentage = undefined;
            if (compTool) {
              const compUsage = compTool.uzycieGlowne;
              const compLimit = compTool.uzycieLimit;
              const compProjectedQuantity = compUsage + (daysAhead * dailyStrokes);
              compWearPercentage = Math.min(125, Math.round((compProjectedQuantity / compLimit) * 100 * compFactor));
            }

            chartData.push({
              dayIndex: daysAhead,
              label: daysAhead === 0 ? 'Dziś' : `+${daysAhead} dni`,
              dateStr: dateStr,
              wear: wearPercentage,
              compWear: compWearPercentage,
              hits: projectedQuantity,
            });
          }

          // Calculate dates
          const today = new Date();
          const depletionDate = new Date();
          depletionDate.setDate(today.getDate() + daysToDepletion);
          const depletionDateStr = remainingHits <= 0 
            ? 'PRZEKROCZONE / BRAK'
            : depletionDate.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });

          const reorderDate = new Date();
          reorderDate.setDate(today.getDate() + Math.max(0, daysToDepletion - leadTimeDays));
          const reorderDateStr = remainingHits <= 0
            ? 'NATYCHMIAST'
            : reorderDate.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });

          const isCriticalStatus = daysToDepletion <= leadTimeDays || remainingHits <= 0;

          // Get RUL color badges
          const getRulColorClass = (pct: number) => {
            if (pct >= 65) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            if (pct >= 30) return 'bg-amber-50 text-amber-700 border-amber-200';
            return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
          };

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Statistics details and reorder recommendations */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 font-sans">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Kalkulacja Resztkowa RUL</span>
                    <span className={`text-[10px] font-mono tracking-tight border px-2 py-0.5 rounded uppercase font-black ${getRulColorClass(mainRulPercent)}`}>
                      RUL: {mainRulPercent}%
                    </span>
                  </div>

                  {/* Remaining Useful Life status indicator/bar */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Stan Żywotności (Remaining Useful Life):</span>
                      <strong className="text-slate-800 font-mono">{mainRulPercent}%</strong>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          mainRulPercent >= 65 ? 'bg-emerald-500' :
                          mainRulPercent >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${mainRulPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <span className="text-slate-400 block uppercase text-[8.5px] font-mono">Bieżące Zużycie:</span>
                      <strong className="text-slate-800 text-sm">
                        {Math.round(currentUsage / limit * 100)}% ({ (currentUsage / 1000000).toFixed(2) }M)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase text-[8.5px] font-mono">Pozostały zapas:</span>
                      <strong className="text-slate-800 text-sm">
                        {(remainingHits / 1000000).toFixed(2)}M uderzeń
                      </strong>
                    </div>
                    
                    <div className="col-span-2 pt-1 border-t border-dashed border-slate-200" />
                    
                    <div>
                      <span className="text-slate-400 block uppercase text-[8.5px] font-mono">Pojemność limitowa:</span>
                      <span className="text-slate-600 font-bold font-mono">{(limit / 1000000).toFixed(1)}M szt.</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase text-[8.5px] font-mono">Dobowy spadek RUL:</span>
                      <span className="text-indigo-600 font-bold font-mono">-{dailyWearSpeed.toFixed(4)}% / dobę</span>
                    </div>
                  </div>

                  {/* Highlight box for estimated wear out date */}
                  <div className={`p-4 rounded-xl border flex flex-col gap-1 text-left shadow-xs ${
                    isCriticalStatus
                      ? 'bg-rose-50/70 border-rose-200 text-rose-800'
                      : 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono uppercase font-black opacity-85 block">Prognozowany dzień 100% zużycia:</span>
                      {isCriticalStatus && <span className="text-[8px] bg-rose-200 text-rose-800 px-1.5 rounded font-mono font-bold animate-pulse">ALARM SRUB</span>}
                    </div>
                    <div className="text-xl font-black tracking-tight">{depletionDateStr}</div>
                    <span className="text-[10px] font-medium opacity-90 leading-tight">
                      {remainingHits <= 0 
                        ? 'OSTRZEŻENIE: Komplet natychmiastowo przekroczył dopuszczalny limit operacyjny GMP!'
                        : `Pozostało szacunkowo ${daysToDepletion} dni (podwójna zmiana / praca 16h) bezpiecznej eksploatacji.`}
                    </span>
                  </div>

                  {/* Recommendation action advisory (dynamically based on leadTimeDays state) */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
                    <span className="text-[9px] font-mono uppercase font-black text-amber-700 block">Rekomendacja zakupowa i buforowa:</span>
                    <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                      {remainingHits <= 0 
                        ? 'Wymagane natychmiastowe zamówienie nowego twardego kompletu stempli w celu uniknięcia kosztownego zatrzymania linii prasującej.'
                        : `Inicjuj formalne zapotrzebowanie zakupowe przed dniem `}
                      {remainingHits > 0 && <strong className="text-amber-800 font-bold">{reorderDateStr}</strong>}
                      {remainingHits > 0 && ` (zapewnia zdefiniowany przez Ciebie ${leadTimeDays}-dniowy czas realizacji dostawy / Lead-time).`}
                    </p>
                  </div>

                  {/* INTERACTIVE LEAD-TIME PURCHASING & RECOMMENDED ORDER DATE CALCULATOR */}
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-[11px] text-left">
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                      <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-100">
                        Lead-Time & Procurement Suggestor
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>CZAS DOSTAWY (LEAD-TIME):</span>
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            min="5"
                            max="90"
                            value={leadTimeDays}
                            onChange={(e) => setLeadTimeDays(Math.max(1, parseInt(e.target.value) || 30))}
                            className="bg-slate-950 text-emerald-400 font-bold text-center w-12 rounded border border-slate-800 px-1 py-0.5 text-[11px]"
                          />
                          <span>dni</span>
                        </div>
                      </div>
                      
                      {/* Range slider control */}
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="5"
                          max="90"
                          step="5"
                          value={leadTimeDays}
                          onChange={(e) => setLeadTimeDays(parseInt(e.target.value) || 30)}
                          className="w-full h-1 bg-slate-800 rounded-lg cursor-pointer appearance-none accent-emerald-450"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-[8.5px] text-slate-500">
                        <span>Lotniczy (Express): 5 dni</span>
                        <span>Morski (Economy): 90 dni</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-800/80 pt-2 space-y-1 text-slate-400">
                      <div className="flex justify-between items-center text-[10px]">
                        <span>Średnie obciążenie / dobę:</span>
                        <span className="text-slate-200 font-bold">{dailyStrokes.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span>Czas do 100% zużycia:</span>
                        <span className="text-slate-200 font-bold">{daysToDepletion} dni</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span>Zakupowy bufor czasu:</span>
                        <span className={`font-black uppercase ${daysToDepletion - leadTimeDays <= 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                          {daysToDepletion - leadTimeDays} dni
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wide">
                        Sugerowana data wysłania zamówienia:
                      </span>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className={`text-sm font-black uppercase ${daysToDepletion - leadTimeDays <= 0 ? 'text-rose-500 font-sans' : 'text-white'}`}>
                          {daysToDepletion - leadTimeDays <= 0 ? 'WYŚLIJ NATYCHMIAST!' : reorderDateStr}
                        </span>
                        {daysToDepletion - leadTimeDays > 0 && (
                          <span className="text-[9px] text-slate-500">
                            (za {daysToDepletion - leadTimeDays} dni)
                          </span>
                        )}
                      </div>
                      {daysToDepletion - leadTimeDays <= 0 ? (
                        <div className="text-[8.5px] leading-tight text-rose-400 italic font-mono uppercase tracking-tight pt-1 border-t border-rose-950/40">
                          CRITICAL: Lead-time dostawy ({leadTimeDays} dni) przekracza pozostały okres eksploatacji stempli ({daysToDepletion} dni). Grozi przestojem!
                        </div>
                      ) : (
                        <div className="text-[8.5px] leading-tight text-[#00ca9a] font-bold uppercase tracking-wider">
                          Harmonogram zakupowy bezpieczny.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* The Recharts Line Chart */}
              <div className="lg:col-span-7 space-y-2 bg-slate-50/50 border border-slate-150 p-4 rounded-2xl w-full">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2 font-sans">
                  <span className="text-xs font-bold text-slate-700">
                    Wykres Wykładniczo-Liniowy Starzenia Stali {selectedTool.rodzajStali || 'HPG-100'} 
                    {compTool ? ` vs ${compTool.rodzajStali}` : ''}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Dobowy wolumen: {dailyStrokes.toLocaleString()} / d</span>
                </div>
                
                <div className="w-full h-72 min-h-[250px] font-mono text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={chartData} margin={{ top: 15, right: 30, left: -20, bottom: 5 }}>
                      <XAxis dataKey="dateStr" stroke="#64748b" style={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" unit="%" domain={[0, 120]} style={{ fontSize: 10 }} />
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                      
                      <RechartsTooltip
                        content={(props) => {
                          if (props.active && props.payload && props.payload.length) {
                            const data = props.payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 shadow-lg font-mono text-[11px] text-slate-100">
                                <div className="font-bold text-white mb-1">{data.dateStr} ({data.label})</div>
                                <div className="space-y-1">
                                  <div><strong>SET-{selectedTool.id} ({selectedTool.rodzajStali}):</strong></div>
                                  <div className="pl-2">Zużycie: <strong className="text-indigo-400 font-bold">{data.wear}%</strong></div>
                                  <div className="pl-2">RUL: <strong className="text-emerald-400 font-bold">{Math.max(0, 100 - data.wear)}%</strong></div>
                                  <div className="pl-2">Stemony: <strong className="text-slate-350">{data.hits.toLocaleString()}</strong></div>
                                  
                                  {compTool && data.compWear !== undefined && (
                                    <>
                                      <div className="pt-1 border-t border-slate-800 mt-1"><strong>SET-{compTool.id} ({compTool.rodzajStali}):</strong></div>
                                      <div className="pl-2">Zużycie: <strong className="text-purple-400 font-bold">{data.compWear}%</strong></div>
                                      <div className="pl-2">RUL: <strong className="text-pink-400 font-bold">{Math.max(0, 100 - data.compWear)}%</strong></div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      
                      {/* Critical line representing the 100% depletion limit */}
                      <ReferenceLine 
                        y={100} 
                        stroke="#f43f5e" 
                        strokeDasharray="5 5" 
                        strokeWidth={2} 
                        label={{ value: "LIMIT OPERACYJNY 100%", fill: "#f43f5e", fontSize: 9, position: 'top', fontWeight: 'bold' }} 
                      />
                      
                      <RechartsLine
                        type="monotone"
                        dataKey="wear"
                        stroke="#0b4596"
                        strokeWidth={3}
                        dot={{ r: 4, stroke: "#0b4596", strokeWidth: 2, fill: "#fff" }}
                        activeDot={{ r: 7 }}
                        name={`SET-${selectedTool.id} (Wykres główny)`}
                      />

                      {compTool && (
                        <RechartsLine
                          type="monotone"
                          dataKey="compWear"
                          stroke="#a855f7"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 4, stroke: "#a855f7", strokeWidth: 1.5, fill: "#fff" }}
                          activeDot={{ r: 6 }}
                          name={`SET-${compTool.id} (Komparator)`}
                        />
                      )}
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="text-[10px] font-mono text-slate-500 text-center uppercase tracking-wider flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0b4596]" />
                    <span>Prognozowane zużycie SET-{selectedTool.id} ({selectedTool.rodzajStali})</span>
                  </div>
                  {compTool && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
                      <span>Prognozowane zużycie SET-{compTool.id} ({compTool.rodzajStali})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-rose-500 block animate-pulse" />
                    <span>Próg alarmowy wymiany GMP (100%)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* FDA 21 CFR PART 11 SECURE CHRONOLOGICAL AUDIT TRAIL LOG SYSTEM */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 px-1.5 bg-slate-900 text-[#00ca9a] rounded-lg flex items-center justify-center">
                <Fingerprint className="w-4 h-4 text-[#00ca9a]" />
              </span>
              <h4 className="text-sm font-bold text-slate-800">
                FDA 21 CFR Part 11 Audit Trail & Podpisy Cyfrowe
              </h4>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
              Niezaprzeczalny, zabezpieczony sumą kontrolną rejestr autoryzowanych zdarzeń metrologicznych, serwisowych i jakościowych
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const hexChars = '0123456789abcdef';
                let randomHash = '';
                for (let i = 0; i < 40; i++) randomHash += hexChars[Math.floor(Math.random() * 16)];
                
                const verifiedAuditTx = {
                  id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                  timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                  actor: "dr Joanna Kowalska (QA Lead)",
                  action: "Okresowy audyt spójności bazy danych i rejestrów Audit Trail",
                  reason: "Procedura kontroli wewnętrznej bezpieczeństwa danych",
                  hash: "SHA256: " + randomHash,
                  status: 'SUCCESS' as const
                };
                setAuditTrail(prev => [verifiedAuditTx, ...prev]);
                alert("WYKONANO AUDYT: Integralność bazy danych została zweryfikowana pomyślnie. Wszystkie podpisy cyfrowe pasują do powiązanych rekordów.");
              }}
              className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider font-sans rounded-xl bg-slate-1050 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#00ca9a]" /> batch verify signatures
            </button>

            <span className="text-[9.5px] font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-250 uppercase font-black tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
              Database Lock Status: Immutable
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-sans">
          Zgodnie z wymogami regulacji <strong>FDA 21 CFR Part 11</strong> oraz unijnego <strong>GMP Annex 11</strong>, każda zmiana jakościowa, metrologiczna, dopuszczenie do produkcji lub wykonanie naprawy stempli w fabryce <strong>Biofarm Poznań</strong> jest opatrzona niezaprzeczalnym elektronicznym podpisem (E-Signature). Log ten wyświetla chronologiczny, bezpieczny rejestr wszystkich certyfikowań.
        </p>

        {/* Searching and Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs items-center">
          <div className="md:col-span-6 flex flex-col gap-1">
            <span className="text-[9px] uppercase font-mono font-black text-slate-400">Przeszukanie rejestru e-podpisów:</span>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Szukaj po: sygnatariuszu, typie zdarzenia, transakcji, sumie sha..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 font-sans focus:ring-0 focus:outline-hidden p-0 text-slate-800 placeholder:text-slate-405"
              />
              {auditSearchQuery && (
                <button type="button" onClick={() => setAuditSearchQuery('')} className="p-0.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col gap-1">
            <span className="text-[9px] uppercase font-mono font-black text-slate-400">Filtrowanie statusu:</span>
            <select
              value={auditStatusFilter}
              onChange={(e) => setAuditStatusFilter(e.target.value as any)}
              className="w-full bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl cursor-pointer font-sans"
            >
              <option value="ALL">Wszystkie e-podpisy (All events)</option>
              <option value="SUCCESS">Pomyślnie podpisane (Signed)</option>
              <option value="WARNING">Błędy weryfikacji (Validation Errors)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex flex-col gap-1 text-right self-end">
            <span className="text-[9px] uppercase font-mono font-black text-slate-400">Wyniki wyszukiwania:</span>
            <div className="font-mono text-slate-600 font-bold px-1 text-xs">
              {(() => {
                const totalMatching = auditTrail.filter(tx => {
                  const query = auditSearchQuery.toLowerCase();
                  const matchesQuery = 
                    tx.id.toLowerCase().includes(query) ||
                    tx.actor.toLowerCase().includes(query) ||
                    tx.action.toLowerCase().includes(query) ||
                    tx.reason.toLowerCase().includes(query) ||
                    tx.hash.toLowerCase().includes(query);
                    
                  if (auditStatusFilter === 'ALL') return matchesQuery;
                  return matchesQuery && tx.status === auditStatusFilter;
                }).length;
                return `Dopasowano: ${totalMatching} z ${auditTrail.length}`;
              })()}
            </div>
          </div>
        </div>

        {/* Secure log console */}
        <div className="bg-slate-900 border border-slate-800 text-slate-350 rounded-xl max-h-[380px] overflow-y-auto divide-y divide-slate-800">
          {(() => {
            const list = auditTrail.filter(tx => {
              const query = auditSearchQuery.toLowerCase();
              const matchesQuery = 
                tx.id.toLowerCase().includes(query) ||
                tx.actor.toLowerCase().includes(query) ||
                tx.action.toLowerCase().includes(query) ||
                tx.reason.toLowerCase().includes(query) ||
                tx.hash.toLowerCase().includes(query);
                
              if (auditStatusFilter === 'ALL') return matchesQuery;
              return matchesQuery && tx.status === auditStatusFilter;
            });

            if (list.length === 0) {
              return (
                <div className="text-center py-10 font-mono text-xs text-slate-500">
                  Brak zapisów audytowych spełniających kryteria wyszukiwania.
                </div>
              );
            }

            return list.map((tx) => (
              <div key={tx.id} className="p-4 space-y-2 hover:bg-slate-850/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[9px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-950/60 border border-emerald-800/50 text-[#00ca9a] font-black px-2 py-0.5 rounded tracking-wider">
                      CFR PART 11 AUTHENTICATED
                    </span>
                    <span className="text-slate-400 font-bold">BLOCK-ID: {tx.id}</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    UTC SYSTIME: {tx.timestamp}
                  </span>
                </div>

                <div className="text-[12px] text-white font-bold font-sans">
                  {tx.action}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] font-sans text-slate-450 border-t border-dashed border-slate-800/80 pt-2">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Zarejestrowany Podpis (Operator): <strong className="text-slate-200 font-semibold">{tx.actor}</strong></span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Oficjalny cel podpisu: <span className="text-slate-350 italic">"{tx.reason}"</span></span>
                  </div>
                </div>

                <div className="text-[9px] truncate font-mono bg-slate-950 px-2.5 py-1.5 rounded border border-slate-850/80 mt-1.5 flex items-center gap-2">
                  <span className="text-[#00ca9a] shrink-0 font-black">SHA-256 DIGITAL CHECKSUM:</span>
                  <code className="text-cyan-400 font-mono select-all truncate">{tx.hash}</code>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* BRAND NEW INTERACTIVE TOOL STEEL MATERIAL WEAR CHART (HRC VS CYCLES) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">
                Zużycie Materiału w Funkcji Twardości HRC
              </h4>
              <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                Ubytek powłoki stempla (μm) na podstawie cykli i mikrotwardości
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={materialConsumptionData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="cycles" style={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#64748b" axisLine={false} tickLine={false} />
                <YAxis style={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#64748b" axisLine={false} tickLine={false} label={{ value: 'Zużycie materiału (μm)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 8, fontFamily: 'monospace' }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: 8, color: '#f8fafc', fontSize: 10, fontFamily: 'monospace' }}
                />
                <RechartsLine type="monotone" dataKey="wear58" stroke="#f43f5e" strokeWidth={1.5} dot={{ r: 3 }} name="Twardość 58 HRC" />
                <RechartsLine type="monotone" dataKey="wear62" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} name="Twardość 62 HRC (M340)" />
                <RechartsLine type="monotone" dataKey="wear66" stroke="#10b981" strokeWidth={1.5} dot={{ r: 3 }} name="Twardość 66 HRC (Premium)" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-mono text-slate-500 justify-center">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> 58 HRC</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" /> 62 HRC (Bohler M340)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 66 HRC (WC-Co/CrN)</span>
          </div>
        </div>

        {/* COMPARATIVE WEAR RATE OVER TIME CHART (1.2379 VS BOHLER VS PM) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">
                Porównawcza Prognoza Zużycia (Wear Rate) w Czasie
              </h4>
              <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                Stopień eksploatacji stempli czołowych (%) dla poszczególnych gatunków stali
              </p>
            </div>
            <span className="text-[9px] font-mono bg-[#0b4596]/10 text-[#0b4596] border border-[#0b4596]/15 px-2 py-0.5 rounded font-black uppercase">
              Horyzont 120 dni
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={steelWearOverTimeData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="day" style={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#64748b" axisLine={false} tickLine={false} />
                <YAxis style={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#64748b" axisLine={false} tickLine={false} domain={[0, 100]} unit="%" label={{ value: 'Zużycie stempli (%)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 8, fontFamily: 'monospace' }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: 8, color: '#f8fafc', fontSize: 10, fontFamily: 'monospace' }}
                />
                <RechartsLine type="monotone" dataKey="wear12379" stroke="#ef4444" strokeWidth={2.0} dot={{ r: 3 }} name="Stal Standard: 1.2379 (D2)" />
                <RechartsLine type="monotone" dataKey="wearBohlerK340" stroke="#f59e0b" strokeWidth={2.0} strokeDasharray="4 4" dot={{ r: 3 }} name="Stal Bohler: K340" />
                <RechartsLine type="monotone" dataKey="wearBohlerM340" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Stal Bohler: M340 Kwasoodporna" />
                <RechartsLine type="monotone" dataKey="wearPM60" stroke="#10b981" strokeWidth={3.0} dot={{ r: 4 }} name="Stal Proszkowa: Vanadis / PM" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-mono text-slate-500 justify-center">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> 1.2379 (D2)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Bohler K340</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Bohler M340</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 font-extrabold" /> PM Super-Alloy</span>
          </div>
        </div>
      </div>

      {/* PROPOZYCJA 2: INTERAKTYWNY KALKULATOR KOROZJI CHEMICZNEJ I PASYWACJI */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-500/20 shadow-lg mt-6 text-left space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#00ca9a]/15 text-[#00ca9a] rounded-lg">
                <ShieldCheck className="w-5 h-5 text-[#00ca9a]" />
              </span>
              <h4 className="text-base font-bold font-display text-white tracking-tight">
                Kalkulator Odporności Chemicznej i Pasywacji (GMP Cleanroom Chemistry)
              </h4>
            </div>
            <p className="text-[10px] text-slate-400 font-mono uppercase mt-1">
              Symulacja starzeniowa stempli pod wpływem dezynfekcji i mycia Cleanroom
            </p>
          </div>
          <span className="text-[9px] font-mono bg-indigo-500/25 border border-indigo-400/30 text-indigo-200 px-2.5 py-1 rounded-lg">
            AKTUALNY STANDARD: EN ISO 10993 BIOMATERIAŁY & STAL W PRODUKCJI FARMACEUTYCZNEJ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Controls on left */}
          <div className="md:col-span-5 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Środek Myjący / Dezynfekujący:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'active_acid', label: 'Kwasy Organiczne', desc: 'Pasywacja (pH 1.5 - 3.5)' },
                  { id: 'chlorine', label: 'Chlor Aktywny', desc: 'Dezynfekcja (pH 5.0 - 8.5)' },
                  { id: 'demi_water', label: 'Woda demineralizowana', desc: 'Płukanie (pH 6.5 - 7.5)' },
                  { id: 'alkali', label: 'Zasady Aktywne', desc: 'Mycie CIP (pH 11.5 - 13.5)' },
                ].map((chem) => (
                  <button
                    key={chem.id}
                    type="button"
                    onClick={() => {
                      setWashChemical(chem.id);
                      if (chem.id === 'active_acid') setWashPh(2.2);
                      else if (chem.id === 'chlorine') setWashPh(6.0);
                      else if (chem.id === 'demi_water') setWashPh(7.0);
                      else if (chem.id === 'alkali') setWashPh(12.5);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      washChemical === chem.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-950/60'
                    }`}
                  >
                    <div className="font-bold text-xs">{chem.label}</div>
                    <div className="text-[9px] text-slate-405 opacity-80 mt-0.5">{chem.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">Odczyn kwasowości (pH roztworu):</span>
                <span className={`font-mono font-black text-xs px-2 py-0.5 rounded ${
                  washPh < 4.0 
                    ? 'bg-rose-500/10 text-rose-350 border border-rose-500/20' 
                    : washPh > 10.0 
                      ? 'bg-amber-500/10 text-amber-305 border border-amber-500/20' 
                      : 'bg-emerald-500/10 text-emerald-355 border border-emerald-500/20'
                }`}>
                  pH {washPh.toFixed(1)} ({washPh < 4.0 ? 'KWASOWY' : washPh > 10.0 ? 'ALKALICZNY' : 'NEUTRALNY'})
                </span>
              </div>
              
              <input
                type="range"
                min="1"
                max="14"
                step="0.5"
                value={washPh}
                onChange={(e) => setWashPh(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00ca9a]"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>Ekstremalny kwas (pH 1)</span>
                <span>Obojętny (pH 7)</span>
                <span>Mocna zasada (pH 14)</span>
              </div>
            </div>

            {/* Simulated Live Microscopic Chemistry Reactor */}
            <div className="pt-2">
              <ChemistrySimulationCanvas chemical={washChemical} ph={washPh} />
            </div>
          </div>

          {/* Graph comparison on right */}
          <div className="md:col-span-7 bg-black/35 rounded-xl p-4.5 border border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              ⚠️ SZACUNKOWY DEGRADACYJNY WPŁYW KOROZYJNY NA GATUNKI STALI
            </div>

            <div className="space-y-3 pt-1">
              {[
                { 
                  name: 'Stal Bohler M340 (Kwasoodporna Premium)', 
                  chrome: '17.3% Cr + N', 
                  calcRisk: () => {
                    if (washPh >= 2.0 && washPh <= 12.0) return 2; // extremely low risk
                    return Math.min(10, Math.floor((14 - washPh) / 1.5));
                  },
                  color: 'bg-emerald-500', 
                  textColor: 'text-emerald-450' 
                },
                { 
                  name: 'Stal Proszkowa Vanadis PM-60', 
                  chrome: '4.2% Cr (Wysoki Kobalt)', 
                  calcRisk: () => {
                    if (washChemical === 'active_acid' || washPh < 4.5) return 8; // high acid risk
                    if (washPh > 11.0) return 6;
                    return 3;
                  },
                  color: 'bg-rose-520 bg-rose-500', 
                  textColor: 'text-rose-450' 
                },
                { 
                  name: 'Stal Bohler K340 (Elektrożużlowa)', 
                  chrome: '8.3% Cr', 
                  calcRisk: () => {
                    if (washPh < 3.5) return 6; 
                    if (washPh > 10.5) return 4;
                    return 2;
                  },
                  color: 'bg-amber-500', 
                  textColor: 'text-amber-450' 
                },
                { 
                  name: 'Stal Standardowa 1.2379 (D2)', 
                  chrome: '12.0% Cr', 
                  calcRisk: () => {
                    if (washChemical === 'chlorine') return 7; // susceptible to pitting
                    if (washPh < 3.0) return 5;
                    return 3;
                  },
                  color: 'bg-cyan-500', 
                  textColor: 'text-cyan-450' 
                }
              ].map((steel, idx) => {
                const riskVal = steel.calcRisk();
                const riskPercent = riskVal * 10;
                let riskLabel = 'Znikome (Pasywna odporność)';
                let riskBadge = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
                
                if (riskVal >= 7) {
                  riskLabel = 'Ryzyko Krytyczne (Korozja wżerowa!)';
                  riskBadge = 'bg-rose-500/10 text-rose-350 border-rose-500/20 animate-pulse';
                } else if (riskVal >= 4) {
                  riskLabel = 'Ryzyko Umiarkowane (Wymagana pasywacja)';
                  riskBadge = 'bg-amber-500/10 text-amber-305 border-amber-500/20';
                }

                return (
                  <div key={idx} className="space-y-1.5 text-left font-sans">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-100">{steel.name}</span>
                        <span className="text-[9px] font-mono text-slate-450 ml-2">({steel.chrome})</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${riskBadge}`}>
                        {riskPercent}% / {riskLabel}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full ${steel.color} transition-all duration-300`} 
                        style={{ width: `${riskPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-950/65 border border-white/5 p-3 rounded-xl flex items-start gap-2 text-[10.5px] text-slate-350 leading-relaxed font-sans">
              <span className="p-1 bg-indigo-505 bg-indigo-500/10 text-indigo-300 rounded shrink-0 font-bold">INFO</span>
              <span>
                {washChemical === 'active_acid' 
                  ? "UWAGA: Kąpiele pasywujące stempli kwasem cytrynowym sprzyjają odbudowie warstwy pasywnej tlenku chromu na stali premium Bohler M340. Dla stali proszkowej PM-60 o niskim chromie kwas organiczny wywołuje matowienie powierzchni i degradację graweru roboczego."
                  : washChemical === 'chlorine'
                    ? "UWAGA: Środki oparte na chluorze aktywnym (silne halogenki) mogą powodować korozję wżerową (Pitting Corrosion) na standardowej stali 1.2379. Stale o podwyższonej gęstości węglików są bardziej odporne na to zjawisko."
                    : washChemical === 'alkali'
                      ? "Zasadowy odczyn stabilizuje większość stopów, jednak długotrwały kontakt ze stemplami dolnymi o twardości powyżej 60 HRC może powodować odbarwienia. Zaleca się wypłukanie w wodzie demineralizowanej."
                      : "Woda demineralizowana o neutralnym pH (7.0) jest optymalna dla wszystkich gatunków pod warunkiem natychmiastowego suszenia i zakonserwowania stempli za pomocą atestowanego smaru medycznego FDA-H1."
                }
              </span>
            </div>
          </div>
        </div>
      </div>
      </>
      ) : reportsSubView === 'oee_analytics' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Machine selector card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
                Wybór Tabletkarki Przemysłowej GMP
              </h4>
              <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">
                Wybierz maszynę z głowicą rewolwerową, aby przeanalizować składowe OEE w czasie rzeczywistym
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'PRESS-FETTE-1', label: 'T1 - Fette Compacting 2200ic', status: 'Praca', active: 'Paracetamol 500mg', speed: '42k tab/h', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { id: 'PRESS-KILIAN-1', label: 'T2 - KILIAN SYNTHESIS 500', status: 'Praca', active: 'Wit. C 1000mg', speed: '58k tab/h', badgeColor: 'bg-[#001633] text-emerald-300 border-emerald-200' },
                { id: 'PRESS-KORSCH-1', label: 'T3 - KORSCH XL400 MFP (Prasa 3)', status: 'Przezbrajanie', active: 'Ibuprofen 400mg', speed: '0 tab/h', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
                { id: 'PRESS-ROMACO-1', label: 'T4 - KORSCH XL400 SL (Prasa 4)', status: 'Przestój', active: 'Brak', speed: '0 tab/h', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
              ].map((press) => {
                const isSelected = selectedOeePress === press.id;
                const pressHistory = oeeAreaDataForPresses[press.id as 'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'] || [];
                const lastPoint = pressHistory[pressHistory.length - 1] || { 'OEE': 85 };
                const currentThreshold = oeeAlertThresholds[press.id] || 75;
                const isOeeBelow = lastPoint['OEE'] < currentThreshold;

                return (
                  <button
                    key={press.id}
                    type="button"
                    onClick={() => setSelectedOeePress(press.id as any)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 cursor-pointer ${
                      isOeeBelow
                        ? isSelected
                          ? 'bg-[#1a0505] border-rose-500 text-white shadow-md ring-2 ring-rose-500/40 animate-pulse'
                          : 'bg-rose-50/50 border-rose-300 text-slate-900 hover:bg-rose-100/70 border-2'
                        : isSelected
                          ? 'bg-[#001633] border-biofarm-blue text-white shadow-md ring-2 ring-biofarm-blue/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider truncate">
                        {press.label}
                      </span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold shrink-0 ${
                        isOeeBelow && !isSelected
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : isSelected
                            ? 'bg-white/10 text-emerald-300 border-emerald-500/20'
                            : press.badgeColor
                      }`}>
                        {isOeeBelow ? 'CRIT OEE' : press.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold truncate">
                        Wsad: <span className={isSelected ? 'text-cyan-300' : 'text-slate-800 font-bold'}>{press.active}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                        <span>Prędkość: {press.speed}</span>
                        <strong className={`font-bold font-mono ${isOeeBelow ? 'text-rose-500 font-extrabold' : 'text-slate-600'}`}>{lastPoint['OEE']}%</strong>
                      </div>

                      {isOeeBelow && (
                        <div className="pt-1 select-none border-t border-rose-300/40 flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-wider text-rose-600">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          <span>ALARM &lt; {currentThreshold}%</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration & Comparison Area (Requirement 2 & 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* OEE Alarm limits config (Requirement 2) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-left">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">
                  Limity Alarmów OEE (Krytyczne)
                </h4>
              </div>
              <p className="text-[9.5px] text-slate-400 font-mono uppercase">
                Zdefiniuj własny poziom prętowości krytycznej dla każdej maszyny z osobna
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {[
                  { id: 'PRESS-FETTE-1', label: 'T1 - Fette Compacting 2200ic' },
                  { id: 'PRESS-KILIAN-1', label: 'T2 - KILIAN SYNTHESIS 500' },
                  { id: 'PRESS-KORSCH-1', label: 'T3 - KORSCH XL400 MFP' },
                  { id: 'PRESS-ROMACO-1', label: 'T4 - KORSCH XL400 SL' }
                ].map((item) => (
                  <div key={item.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-slate-600 truncate">{item.label}</span>
                      <span className="text-[9px] font-mono font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-100 uppercase">
                        &lt; {oeeAlertThresholds[item.id] || 75}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="60"
                        max="95"
                        step="1"
                        id={`threshold-${item.id}`}
                        value={oeeAlertThresholds[item.id] || 75}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setOeeAlertThresholds(prev => ({ ...prev, [item.id]: val }));
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-biofarm-blue"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison Setup (Requirement 4) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-left">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Layers className="w-4 h-4 text-[#0b4596]" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">
                  Tryb Porównaj Maszyny
                </h4>
              </div>
              <p className="text-[9.5px] text-slate-400 font-mono uppercase">
                Nałóż na siebie wykresy dwóch tabletkarek na jednym obszarze roboczym
              </p>
              
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="compare-mode-toggle"
                      onClick={() => setCompareMode(!compareMode)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${compareMode ? 'bg-[#0b4596]' : 'bg-slate-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${compareMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Aktywuj porównanie maszyn</span>
                      <span className="text-[8.5px] text-slate-400 font-mono">Pokaż dane porównawcze dla dwóch pras</span>
                    </div>
                  </div>
                </div>

                {compareMode && (
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-600 block">Druga prasa do porównania:</span>
                    <select
                      id="compare-press-select"
                      value={selectedOeePress2}
                      onChange={(e) => setSelectedOeePress2(e.target.value as any)}
                      className="bg-white border border-slate-250 rounded-lg p-1 font-mono text-xs text-slate-705 outline-none w-full sm:w-auto"
                    >
                      {[
                        { id: 'PRESS-FETTE-1', label: 'T1 - Fette Compacting 2200ic' },
                        { id: 'PRESS-KILIAN-1', label: 'T2 - KILIAN SYNTHESIS 500' },
                        { id: 'PRESS-KORSCH-1', label: 'T3 - KORSCH XL400 MFP' },
                        { id: 'PRESS-ROMACO-1', label: 'T4 - KORSCH XL400 SL' }
                      ]
                      .filter(p => p.id !== selectedOeePress) // exclude first press to compare
                      .map((press) => (
                        <option key={press.id} value={press.id}>{press.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Alert Banner if OEE falls below custom threshold */}
          {(() => {
            const pressHistory = oeeAreaDataForPresses[selectedOeePress as 'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'] || [];
            const lastPoint = pressHistory[pressHistory.length - 1] || { 'OEE': 89 };
            const currentThreshold = oeeAlertThresholds[selectedOeePress] || 75;
            const isOeeBelow = lastPoint['OEE'] < currentThreshold;

            if (!isOeeBelow) return null;

            return (
              <div className="p-4 border border-rose-500/25 bg-rose-50/70 rounded-xl flex items-start gap-3 text-left animate-fadeIn">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h5 className="font-sans font-bold text-xs text-rose-800 uppercase tracking-tight">⚠️ SYSTEMOWY MONITOR JAKOŚCI GMP: ALERT OEE</h5>
                  <p className="text-xs text-rose-700 leading-normal mt-0.5">
                    Aktualny poziom OEE maszynowego dla <span className="font-bold">{selectedOeePress}</span> wynosi <span className="font-bold underline text-rose-800">{lastPoint['OEE']}%</span>, co jest <span className="font-bold text-rose-900">poniżej</span> zdefiniowanego przez Ciebie krytycznego limitu alarmu (<span className="font-bold">{currentThreshold}%</span>). Sprawdź zapisy serwisowe i zużycie czół stempli.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* OEE Component Cards */}
          {(() => {
            const pressHistory = oeeAreaDataForPresses[selectedOeePress as 'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'] || [];
            const lastPoint = pressHistory[pressHistory.length - 1] || { 'Dostępność': 95, 'Wydajność': 95, 'Jakość': 99, 'OEE': 89 };
            
            const pressHistory2 = oeeAreaDataForPresses[selectedOeePress2 as 'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'] || [];
            const lastPoint2 = pressHistory2[pressHistory2.length - 1] || { 'Dostępność': 95, 'Wydajność': 95, 'Jakość': 99, 'OEE': 89 };

            if (compareMode) {
              const oee1 = lastPoint['OEE'];
              const oee2 = lastPoint2['OEE'];
              const leader = oee1 >= oee2 ? selectedOeePress : selectedOeePress2;
              const diff = Math.abs(oee1 - oee2).toFixed(1);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
                  <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2 text-left">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 block">Lider Wydajności OEE</span>
                    <div className="text-xl font-bold font-mono text-blue-700 truncate">{leader}</div>
                    <p className="text-[9px] text-slate-400 font-sans uppercase font-medium">Przewaga lidera o +{diff} pp. OEE</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-2 text-left">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 block">Różnica wskaźników</span>
                    <div className="text-2xl font-bold font-mono text-purple-700">{diff}%</div>
                    <p className="text-[9px] text-slate-400 font-sans uppercase font-medium">Porównanie punktów procentowych</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-left">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-600 block">OEE {selectedOeePress}</span>
                      <span className={`text-[8px] font-mono px-1 border rounded ${oee1 < (oeeAlertThresholds[selectedOeePress] || 75) ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-250'}`}>
                        {oee1 < (oeeAlertThresholds[selectedOeePress] || 75) ? 'Alarm' : 'Dopuszczony'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-cyan-600">{oee1}%</div>
                    <p className="text-[9px] text-slate-400 font-sans uppercase font-medium">Próg: {oeeAlertThresholds[selectedOeePress] || 75}%</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-left">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-600 block">OEE {selectedOeePress2}</span>
                      <span className={`text-[8px] font-mono px-1 border rounded ${oee2 < (oeeAlertThresholds[selectedOeePress2] || 75) ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-250'}`}>
                        {oee2 < (oeeAlertThresholds[selectedOeePress2] || 75) ? 'Alarm' : 'Dopuszczony'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-purple-600">{oee2}%</div>
                    <p className="text-[9px] text-slate-400 font-sans uppercase font-medium">Próg: {oeeAlertThresholds[selectedOeePress2] || 75}%</p>
                  </div>
                </div>
              );
            }

            // Normal OEE Component Cards
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
                {[
                  { label: 'Dostępność (Availability)', val: `${lastPoint['Dostępność']}%`, color: 'text-cyan-600', bg: 'bg-cyan-50/40', sub: 'Efektywny czas pracy głowicy' },
                  { label: 'Wydajność (Performance)', val: `${lastPoint['Wydajność']}%`, color: 'text-purple-600', bg: 'bg-purple-50/40', sub: 'Tempo formowania tabletek' },
                  { label: 'Jakość (Quality)', val: `${lastPoint['Jakość']}%`, color: 'text-emerald-600', bg: 'bg-emerald-50/40', sub: 'Zgodność z tolerancją GMP' },
                  { label: 'Skumulowany OEE', val: `${lastPoint['OEE']}%`, color: 'text-blue-600', bg: 'bg-blue-50/90 font-black', sub: 'Ogólny wynik efektywności' },
                ].map((card, idx) => (
                  <div key={idx} className={`p-y-5 p-x-4 p-5 rounded-2xl border border-slate-200 shadow-sm text-left ${card.bg} space-y-2`}>
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 block">{card.label}</span>
                    <div className={`text-2xl font-bold font-mono ${card.color}`}>{card.val}</div>
                    <p className="text-[9px] text-slate-400 font-sans uppercase font-medium">{card.sub}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Main Area Chart for OEE Components */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">
                  {compareMode ? 'Zaawansowana Porównawcza Analiza OEE Tabletkarek' : 'Zaawansowany Wykres Składowych OEE i Trendów Skumulowanych'}
                </h4>
                <p className="text-[10px] text-slate-405 uppercase mt-0.5">
                  {compareMode 
                    ? `Wizualizacja porównawcza krzywych OEE dla ${selectedOeePress} oraz ${selectedOeePress2}` 
                    : `Krzywe składowe dla wybranej maszyny pętli w czasie rzeczywistym (15 dni wstecz)`}
                </p>
              </div>
              <div className="flex bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 gap-4 text-[9px] font-mono select-none">
                {!compareMode ? (
                  <>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-cyan-400 rounded-full" /> Dostępność</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-purple-400 rounded-full" /> Wydajność</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-emerald-400 rounded-full" /> Jakość</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-cyan-400 rounded-full" /> OEE ({selectedOeePress})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-purple-400 rounded-full" /> OEE ({selectedOeePress2})</span>
                  </>
                )}
              </div>
            </div>

            {(() => {
              const pressHistory = oeeAreaDataForPresses[selectedOeePress as 'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'] || [];
              const pressHistory2 = oeeAreaDataForPresses[selectedOeePress2 as 'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'] || [];
              
              const comparativeData = pressHistory.map((item, index) => {
                const item2 = pressHistory2[index] || {};
                return {
                  day: item.day,
                  oee1: item.OEE,
                  oee2: item2.OEE || 0,
                };
              });

              return (
                <div key={`${selectedOeePress}-${compareMode ? selectedOeePress2 : ''}`} className="h-96 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    {!compareMode ? (
                      <RechartsAreaChart data={pressHistory} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                        <defs>
                          <linearGradient id="oeeColorAvail" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="oeeColorPerf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c084fc" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="oeeColorQual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                        <XAxis dataKey="day" style={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#64748b" axisLine={false} tickLine={false} />
                        <YAxis style={{ fontSize: 9, fontFamily: 'monospace' }} domain={[70, 100]} stroke="#64748b" axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: 8, color: '#f8fafc', fontSize: 10, fontFamily: 'monospace' }}
                        />
                        {/* Threshold Line (Requirement 2) */}
                        <ReferenceLine 
                          y={oeeAlertThresholds[selectedOeePress] || 75} 
                          stroke="#f43f5e" 
                          strokeDasharray="3 3" 
                          strokeWidth={1.5} 
                          label={{ value: `Limit Alarmu (${oeeAlertThresholds[selectedOeePress] || 75}%)`, fill: '#e11d48', fontSize: 8, position: 'top', fontFamily: 'monospace', fontWeight: 'bold' }} 
                        />
                        <RechartsArea type="monotone" dataKey="Dostępność" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#oeeColorAvail)" name="Dostępność (%)" isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
                        <RechartsArea type="monotone" dataKey="Wydajność" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#oeeColorPerf)" name="Wydajność (%)" isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
                        <RechartsArea type="monotone" dataKey="Jakość" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#oeeColorQual)" name="Jakość (%)" isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
                      </RechartsAreaChart>
                    ) : (
                      <RechartsAreaChart data={comparativeData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                        <defs>
                          <linearGradient id="oeeCompare1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="oeeCompare2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                        <XAxis dataKey="day" style={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#64748b" axisLine={false} tickLine={false} />
                        <YAxis style={{ fontSize: 9, fontFamily: 'monospace' }} domain={[70, 100]} stroke="#64748b" axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: 8, color: '#f8fafc', fontSize: 10, fontFamily: 'monospace' }}
                        />
                        {/* Reference lines for both machines in compare mode */}
                        <ReferenceLine 
                          y={oeeAlertThresholds[selectedOeePress] || 75} 
                          stroke="#06b6d4" 
                          strokeDasharray="3 3" 
                          strokeWidth={1} 
                          label={{ value: `Limit ${selectedOeePress} (${oeeAlertThresholds[selectedOeePress] || 75}%)`, fill: '#0891b2', fontSize: 8, position: 'top', fontFamily: 'monospace' }} 
                        />
                        <ReferenceLine 
                          y={oeeAlertThresholds[selectedOeePress2] || 75} 
                          stroke="#a855f7" 
                          strokeDasharray="3 3" 
                          strokeWidth={1} 
                          label={{ value: `Limit ${selectedOeePress2} (${oeeAlertThresholds[selectedOeePress2] || 75}%)`, fill: '#7c3aed', fontSize: 8, position: 'bottom', fontFamily: 'monospace' }} 
                        />
                        <RechartsArea type="monotone" dataKey="oee1" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#oeeCompare1)" name={`OEE dla ${selectedOeePress} (%)`} isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
                        <RechartsArea type="monotone" dataKey="oee2" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#oeeCompare2)" name={`OEE dla ${selectedOeePress2} (%)`} isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
                      </RechartsAreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </div>

          {/* RAW SHIFT BREAKDOWN TABLE (Requirement 1) */}
          {(() => {
            const pressHistory = oeeAreaDataForPresses[selectedOeePress as 'PRESS-FETTE-1' | 'PRESS-KILIAN-1' | 'PRESS-KORSCH-1' | 'PRESS-ROMACO-1'] || [];
            
            return (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#0b4596]" />
                    Tabela Surowych Danych Zmianowych OEE (Rano / Popołudnie / Noc)
                  </h4>
                  <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                    Kompletna analityka 3-zmianowa dla tabletkarki Fette, Korsch, Killian (Wybrana: <span className="text-[#0b4596] font-bold">{selectedOeePress}</span>)
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/50">
                  <table className="w-full text-xs text-left text-slate-600 font-mono border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 text-[9px] uppercase font-bold tracking-wider">
                        <th className="p-3">Data</th>
                        <th className="p-3">Zmiana Robocza</th>
                        <th className="p-3 text-right">Dostępność (%)</th>
                        <th className="p-3 text-right">Wydajność (%)</th>
                        <th className="p-3 text-right">Jakość (%)</th>
                        <th className="p-3 text-right">Skumulowany OEE (%)</th>
                        <th className="p-3 text-center">Status GMP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pressHistory.map((item, idx) => {
                        const av = item['Dostępność'];
                        const pr = item['Wydajność'];
                        const ql = item['Jakość'];
                        const dayThreshold = oeeAlertThresholds[selectedOeePress] || 75;
                        
                        // Shift 1: Rano 6-14
                        const ranoAv = Math.min(100, Math.round((av + 1.2) * 10) / 10);
                        const ranoPr = Math.min(100, Math.round((pr + 1.5) * 10) / 10);
                        const ranoQl = Math.min(100, Math.round((ql + 0.2) * 10) / 10);
                        const ranoOee = Math.round((ranoAv * ranoPr * ranoQl) / 10000 * 10) / 10;
                        const isRanoOk = ranoOee >= dayThreshold;

                        // Shift 2: Popołudnie 14-22
                        const popoAv = Math.min(100, Math.round((av + 0.3) * 10) / 10);
                        const popoPr = Math.min(100, Math.round((pr + 0.5) * 10) / 10);
                        const popoQl = Math.min(100, Math.round((ql - 0.2) * 10) / 10);
                        const popoOee = Math.round((popoAv * popoPr * popoQl) / 10000 * 10) / 10;
                        const isPopoOk = popoOee >= dayThreshold;

                        // Shift 3: Noc 22-6
                        const nocAv = Math.min(100, Math.round((av - 1.5) * 10) / 10);
                        const nocPr = Math.min(100, Math.round((pr - 2.0) * 10) / 10);
                        const nocQl = Math.min(100, Math.round((ql + 0.1) * 10) / 10);
                        const nocOee = Math.round((nocAv * nocPr * nocQl) / 10000 * 10) / 10;
                        const isNocOk = nocOee >= dayThreshold;

                        return (
                          <React.Fragment key={idx}>
                            {/* Rano Row */}
                            <tr className="hover:bg-slate-100/50 transition-colors">
                              <td className="p-3 font-semibold text-slate-800 border-b border-slate-200" rowSpan={3}>{item.day}</td>
                              <td className="p-3 text-amber-600 font-bold flex items-center gap-1.5 pt-4">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                Rano 6-14
                              </td>
                              <td className="p-3 text-right text-cyan-600 font-medium">{ranoAv.toFixed(1)}%</td>
                              <td className="p-3 text-right text-purple-600 font-medium">{ranoPr.toFixed(1)}%</td>
                              <td className="p-3 text-right text-emerald-600 font-medium">{ranoQl.toFixed(1)}%</td>
                              <td className={`p-3 text-right font-black ${isRanoOk ? 'text-[#0b4596]' : 'text-rose-600'}`}>
                                {ranoOee.toFixed(1)}%
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${isRanoOk ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                  {isRanoOk ? 'Zgodny' : 'Alert'}
                                </span>
                              </td>
                            </tr>
                            {/* Popołudnie Row */}
                            <tr className="hover:bg-slate-100/50 transition-colors">
                              <td className="p-3 text-blue-600 font-bold flex items-center gap-1.5 pt-3">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                Popołudnie 14-22
                              </td>
                              <td className="p-3 text-right text-cyan-600 font-medium">{popoAv.toFixed(1)}%</td>
                              <td className="p-3 text-right text-purple-600 font-medium">{popoPr.toFixed(1)}%</td>
                              <td className="p-3 text-right text-emerald-600 font-medium">{popoQl.toFixed(1)}%</td>
                              <td className={`p-3 text-right font-black ${isPopoOk ? 'text-[#0b4596]' : 'text-rose-600'}`}>
                                {popoOee.toFixed(1)}%
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${isPopoOk ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                  {isPopoOk ? 'Zgodny' : 'Alert'}
                                </span>
                              </td>
                            </tr>
                            {/* Noc Row */}
                            <tr className="hover:bg-slate-100/50 border-b border-slate-200 transition-colors">
                              <td className="p-3 text-slate-500 font-bold flex items-center gap-1.5 pt-3">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                Noc 22-6
                              </td>
                              <td className="p-3 text-right text-cyan-600 font-medium">{nocAv.toFixed(1)}%</td>
                              <td className="p-3 text-right text-purple-600 font-medium">{nocPr.toFixed(1)}%</td>
                              <td className="p-3 text-right text-emerald-600 font-medium">{nocQl.toFixed(1)}%</td>
                              <td className={`p-3 text-right font-black ${isNocOk ? 'text-[#0b4596]' : 'text-rose-600'}`}>
                                {nocOee.toFixed(1)}%
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${isNocOk ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                  {isNocOk ? 'Zgodny' : 'Alert'}
                                </span>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      ) : reportsSubView === 'production_heatmap' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Heatmap Layout Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">
                  Wizualizacja Obciążenia Linii Produkcyjnych (Heatmap)
                </h4>
                <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                  Analiza zagęszczenia serii produkcyjnych w podziale na linie GMP i dni tygodnia
                </p>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 text-[9px] font-mono gap-3 px-3">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-100 border border-slate-200 rounded" /> Przestój / OFF</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-sky-50 border border-sky-300 rounded" /> Niski (&lt;30%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-100 border border-indigo-300 rounded" /> Średni (30-70%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-600 rounded" /> Wysoki (70-90%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded animate-pulse" /> Szczytowy (&gt;90%)</span>
              </div>
            </div>

            {/* INTERACTIVE DATE RANGE FILTER (Requirement 2) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-left select-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0b4596] animate-pulse" />
                <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider font-mono">Horyzont czasowy analizy obciążeń linii:</span>
              </div>
              <div className="flex items-center bg-white border border-slate-205 rounded-lg p-0.5 text-[10px] sm:text-[11px] font-mono shadow-3xs gap-0.5 whitespace-nowrap overflow-x-auto max-w-full">
                {[
                  { id: '7', label: 'Ostatnie 7 dni (Bieżące OEE)' },
                  { id: '30', label: 'Ostatnie 30 dni (Statystyka skumulowana)' },
                  { id: '60', label: 'Ostatnie 60 dni (Horyzont strategiczny)' }
                ].map((range) => (
                  <button
                    key={range.id}
                    type="button"
                    onClick={() => setHeatmapDateRange(range.id as any)}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      heatmapDateRange === range.id
                        ? 'bg-[#0b4596] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#0b4596] hover:bg-slate-50'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Heatmap interactive body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
              
              {/* Heatmap Grid Cell Selector */}
              <div className="lg:col-span-8 overflow-x-auto">
                <div className="min-w-[580px] space-y-2">
                  {/* Days of week headers row */}
                  <div className="grid grid-cols-8 gap-2 pb-1 text-center">
                    <div className="col-span-1 text-left p-2 font-mono text-[9px] uppercase font-bold text-slate-400">Linie produkcyjne</div>
                    {[
                      { short: 'Pon', long: 'Poniedziałek' },
                      { short: 'Wt', long: 'Wtorek' },
                      { short: 'Śr', long: 'Środa' },
                      { short: 'Cz', long: 'Czwartek' },
                      { short: 'Pt', long: 'Piątek' },
                      { short: 'So', long: 'Sobota' },
                      { short: 'Nd', long: 'Niedziela' }
                    ].map((d) => (
                      <div key={d.short} className="font-mono text-[10px] uppercase font-black text-slate-500 py-1 bg-slate-50 rounded-md border border-slate-100" title={d.long}>
                        {d.short}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap rows */}
                  {[
                    'Linia L1 (T1 - Fette 2200ic)',
                    'Linia L2 (T2 - KILIAN 500)',
                    'Linia L3 (T3 - KORSCH MFP)',
                    'Linia L4 (T4 - KORSCH SL)',
                    'Linia L5 (Fette 1200 / Backup)',
                    'Linia L6 (Eksperymentalna)'
                  ].map((lineName, lineIdx) => {
                    // Load levels per day Pon-Nd
                    const baseLoads = [
                      [85, 90, 45, 12, 0, 0, 0], // L1 Load
                      [30, 75, 80, 85, 90, 15, 0], // L2 Load
                      [0, 35, 40, 70, 85, 92, 45], // L3 Load
                      [65, 70, 75, 20, 0, 0, 0],   // L4 Load
                      [15, 20, 85, 95, 80, 10, 0],  // L5 Load
                      [90, 85, 30, 40, 55, 60, 15]   // L6 Load
                    ][lineIdx];

                    // Process and modify baseline load level statistics based on selected date range trend filter
                    const rowLoads = baseLoads.map(load => {
                      if (load === 0) return 0;
                      if (heatmapDateRange === '30') {
                        // For 30 days demand is averaged out; reduce peak fluctuations
                        const modified = Math.round(load * 0.82 + 5); 
                        return Math.min(100, Math.max(10, modified));
                      } else if (heatmapDateRange === '60') {
                        // For 60 days standard demand is smoother; lower peak values
                        const modified = Math.round(load * 0.70 + 8);
                        return Math.min(100, Math.max(10, modified));
                      }
                      return load; // Default 7 days
                    });

                    return (
                      <div key={lineIdx} className="grid grid-cols-8 gap-2 items-center">
                        {/* Line identity badge */}
                        <div className="col-span-1 text-left text-[10.5px] font-sans font-bold text-slate-700 pr-2 truncate" title={lineName}>
                          {lineName}
                        </div>
                        
                        {/* Day cells */}
                        {rowLoads.map((load, dayIdx) => {
                          const isSelected = selectedHeatmapCell?.lineIdx === lineIdx && selectedHeatmapCell?.dayIdx === dayIdx;
                          let cellStyle = "bg-slate-50 hover:bg-slate-100 text-slate-400 border border-slate-200/50";
                          let dotStyle = "bg-slate-300";
                          
                          if (load >= 90) {
                            cellStyle = "bg-rose-500 text-white border border-rose-600 hover:bg-rose-600 animate-pulse";
                            dotStyle = "bg-white";
                          } else if (load >= 70) {
                            cellStyle = "bg-blue-600 text-white border border-blue-700 hover:bg-blue-700";
                            dotStyle = "bg-white";
                          } else if (load >= 30) {
                            cellStyle = "bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-200";
                            dotStyle = "bg-indigo-500";
                          } else if (load > 0) {
                            cellStyle = "bg-sky-50 text-sky-800 border border-sky-200/80 hover:bg-sky-100";
                            dotStyle = "bg-sky-400";
                          }

                          return (
                            <button
                              key={dayIdx}
                              type="button"
                              onClick={() => setSelectedHeatmapCell({ lineIdx, dayIdx })}
                              className={`h-14 rounded-xl flex flex-col justify-between p-2 text-left transition-all relative select-none cursor-pointer ${cellStyle} ${
                                isSelected ? 'ring-3 ring-biofarm-blue ring-offset-2 scale-102 shadow-md z-10' : ''
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[10px] font-mono font-bold leading-none">{load}%</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${dotStyle} shrink-0`} />
                              </div>
                              <span className="text-[8px] font-sans truncate block uppercase font-medium tracking-tight opacity-75">
                                {(() => {
                                  const batches = ['Paracetamol', 'Vit. C', 'Ibuprofen', 'Konserwacja', 'Przezbrajanie'];
                                  return load === 0 ? 'Przestój' : batches[(lineIdx + dayIdx) % batches.length];
                                })()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar: Details for Selected Heatmap Cell */}
              <div className="lg:col-span-4 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 text-left">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <span className="p-1.5 bg-biofarm-blue/20 text-biofarm-cyan rounded-lg">
                    <Calendar className="w-4 h-4 text-biofarm-cyan" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-widest font-mono text-biofarm-cyan">Szczegóły obciążenia linii</h5>
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">Status i zaplanowane zlecenia GMP</span>
                  </div>
                </div>

                {selectedHeatmapCell ? (() => {
                  const { lineIdx, dayIdx } = selectedHeatmapCell;
                  const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
                  const lines = [
                    'Linia L1 - T1 - Fette Compacting 2200ic',
                    'Linia L2 - T2 - KILIAN SYNTHESIS 500',
                    'Linia L3 - T3 - KORSCH XL400 MFP',
                    'Linia L4 - T4 - KORSCH XL400 SL',
                    'Linia L5 - Fette 1200 / Backup',
                    'Linia L6 - Głowica Eksperymentalna'
                  ];
                  const baseLoads = [
                    [85, 90, 45, 12, 0, 0, 0],
                    [30, 75, 80, 85, 90, 15, 0],
                    [0, 35, 40, 70, 85, 92, 45],
                    [65, 70, 75, 20, 0, 0, 0],
                    [15, 20, 85, 95, 80, 10, 0],
                    [90, 85, 30, 40, 55, 60, 15]
                  ];
                  
                  const baseLoadValue = baseLoads[lineIdx][dayIdx];
                  let loadVal = baseLoadValue;
                  if (baseLoadValue > 0) {
                    if (heatmapDateRange === '30') {
                      loadVal = Math.min(100, Math.max(10, Math.round(baseLoadValue * 0.82 + 5)));
                    } else if (heatmapDateRange === '60') {
                      loadVal = Math.min(100, Math.max(10, Math.round(baseLoadValue * 0.70 + 8)));
                    }
                  }
                  
                  const batches = [
                    { name: 'Paracetamol 500mg (Seria P-910)', volume: '1.2M uderzeń', tool: 'SET-101', strokes: '35 000 / h' },
                    { name: 'Witamina C 1000mg (Seria VC-02)', volume: '2.5M uderzeń', tool: 'SET-102', strokes: '58 000 / h' },
                    { name: 'Ibuprofen Forte (Seria IB-303)', volume: '800k uderzeń', tool: 'SET-103', strokes: '45 000 / h' },
                    { name: 'Prace Konserwacyjne (Brak zlecenia)', volume: '-', tool: '-', strokes: '-' },
                    { name: 'Przezbrajanie / Mycie Głowicy', volume: '-', tool: '-', strokes: '-' }
                  ];
                  
                  const selectedBatch = loadVal === 0 ? { name: 'PLANOWANY PRZESTÓJ', volume: '-', tool: 'Brak', strokes: '0/h' } : batches[(lineIdx + dayIdx) % batches.length];

                  return (
                    <div className="space-y-4 text-xs font-sans">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-mono block uppercase">Wybrana Linia / Stanowisko:</span>
                        <span className="font-bold text-sm text-slate-100">{lines[lineIdx]}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">Dzień roboczy:</span>
                          <span className="font-semibold text-[#00ca9a]">{days[dayIdx]}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">Obciążenie linii:</span>
                          <span className={`font-mono font-bold ${loadVal >= 90 ? 'text-red-400 animate-pulse' : loadVal >= 70 ? 'text-blue-300' : loadVal > 0 ? 'text-cyan-300' : 'text-slate-500'}`}>
                            {loadVal}% {loadVal >= 90 ? 'Critical' : loadVal >= 70 ? 'Heavy' : loadVal > 0 ? 'Optimal' : 'Idle'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-[9px] text-slate-500 font-mono uppercase">Zlecenie produkcyjne GMP:</span>
                          <span className="font-bold block text-slate-200 mt-0.5">{selectedBatch.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">Planowany wolumen:</span>
                            <span className="text-[#00ca9a]">{selectedBatch.volume}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">Predykcyjna prędkość:</span>
                            <span className="text-slate-350">{selectedBatch.strokes}</span>
                          </div>
                        </div>
                        <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Użyty komplet stempli:</span>
                          <span className="bg-slate-800 px-2.5 py-0.5 rounded text-cyan-400 font-mono font-bold border border-slate-700">{selectedBatch.tool}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] text-slate-400 font-mono block uppercase mb-1.5">Wpływ na zużycie oprzyrządowania:</span>
                        <div className="p-2 rounded-lg bg-[#00ca9a]/5 border border-[#00ca9a]/20 text-[11px] leading-relaxed text-[#00ca9a] font-mono flex gap-2">
                          <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                          <span>
                            {loadVal >= 70 
                              ? `Szacowane zużycie kompletu wynosi ok. ${(loadVal * 0.04).toFixed(2)} μm na dobę przy wybranej twardości stali Bohler.`
                              : loadVal > 0 
                              ? `Stabilny rozkład siły nacisku. Nominalny przyrost ścierania w normie metrologicznej (<0.01 μm/dobę).`
                              : "Zalecany optymalny czas na mycie ultradźwiękowe lub polerowanie głowic roboczych kompletu stempli."
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <p className="text-center font-mono text-slate-500 py-10">Zaznacz dowolną komórkę na siatce, aby przeanalizować szczegóły.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      ) : (
        /* HERE WE RENDER THE 'Historia modyfikacji statusów' PANEL */
        <div className="space-y-6 animate-fadeIn">
          {/* Card header */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">
                  Historia Modyfikacji Statusów (GMP Audit Trail)
                </h4>
                <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                  Dziennik historycznych zmian statusu dla wybranego kompletu stempli / matryc Biofarm S.A.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-bold uppercase font-sans">
                Zapis i Spójność: Zabezpieczone GMP
              </span>
            </div>

            {/* Dropdown for selecting toolset */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono uppercase font-bold">Wybór kompletu stempli:</label>
                  <span className="text-[10px] text-slate-500 font-mono">Przegląd historyczny modyfikacji faz procesu</span>
                </div>
              </div>

              <select
                value={statusHistorySelectedToolId}
                onChange={(e) => setStatusHistorySelectedToolId(e.target.value)}
                className="w-full sm:w-80 bg-white border border-slate-205 rounded-lg px-3 py-2 text-slate-800 text-xs shadow-3xs cursor-pointer outline-none focus:border-indigo-500 font-sans"
              >
                {toolSets.map((t) => (
                  <option key={t.id} value={t.id}>
                    SET-{t.id} - {t.nazwaProduktu} ({t.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table under selected tool */}
          {(() => {
            const currentSelectedTool = toolSets.find(t => t.id === statusHistorySelectedToolId);
            const history = currentSelectedTool?.statusHistory || [];

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats and timeline column */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest">Podsumowanie zestawu</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Metryki statystyczne statusu</p>
                  </div>

                  {currentSelectedTool && (
                    <div className="space-y-4">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Obecny Status</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            currentSelectedTool.status === 'Gotowy do produkcji' ? 'bg-emerald-500' :
                            currentSelectedTool.status === 'W użyciu' ? 'bg-cyan-500 animate-pulse' :
                            currentSelectedTool.status === 'W konserwacji' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          <strong className="text-slate-800 text-xs font-mono">{currentSelectedTool.status}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Zarejestrowane zmiany</span>
                          <strong className="text-slate-850 font-mono text-base">{history.length} razy</strong>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Użycie robocze</span>
                          <strong className="text-slate-850 font-mono text-xs block">{currentSelectedTool.uzycieGlowne.toLocaleString()} uderzeń</strong>
                        </div>
                      </div>

                      <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50 space-y-1 text-[11px] text-indigo-950 font-sans">
                        <span className="font-bold text-indigo-900 block text-[10px] uppercase font-mono">Zgodność GMP Annex 11:</span>
                        <p className="text-indigo-805 leading-relaxed">
                          Każda zmiana statusu oprzyrządowania w systemie Biofarm S.A. loguje tożsamość operatora i wymaga podania oficjalnego, autoryzowanego powołania technicznego.
                        </p>
                      </div>

                      {/* MINIATURE TECHNICAL LABEL PREVIEW AND DOWNLOAD COMPONENT (Requirement 3) - DEFERRED FOR PHASE III */}
                      <div className="pt-4 border-t border-slate-100 space-y-2 font-sans opacity-70">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block font-bold">Generowanie Etykiet Technicznych (Spec):</span>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-[10px] font-mono text-slate-500 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>Moduł generowania etykiet technicznych PDF/PNG został przełożony na Etap III jako dalsza integracja GMP.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Micro Timeline visual effect */}
                  {history.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-mono uppercase block font-bold">Oś Czasu Przepływu Statusu:</span>
                      <div className="relative pl-4 border-l border-slate-150 space-y-5">
                        {history.slice(0, 4).map((h, i) => {
                          return (
                            <div key={h.id || i} className="relative text-[10.5px]">
                              {/* Dot representation */}
                              <span className="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-white" />
                              <div className="font-semibold text-slate-700 font-mono text-[9px]">
                                {h.data} • {h.operator}
                              </div>
                              <div className="text-slate-800 font-bold mt-1 max-w-full truncate">
                                ➔ {h.nowyStatus}
                              </div>
                              {h.powod && (
                                <p className="text-[9.5px] text-slate-400 truncate mt-0.5 font-sans">"{h.powod}"</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Table list column */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest">Rejestr Zmian Statusu (Audit Trail)</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Chronologiczny wykaz zmian zalogowanych w bazie</p>
                    </div>

                    <div className="overflow-x-auto">
                      {history.length > 0 ? (
                        <table className="w-full text-left font-mono text-xs whitespace-nowrap">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] uppercase">
                              <th className="p-2.5 font-bold">Lp.</th>
                              <th className="p-2.5 font-bold">Data</th>
                              <th className="p-2.5 font-bold">Zmiana Statusu</th>
                              <th className="p-2.5 font-bold">Operator</th>
                              <th className="p-2.5 font-bold">GMP Powód Modyfikacji</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {history.map((entry, idx) => (
                              <tr key={entry.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-2.5 text-slate-400 font-bold">{idx + 1}</td>
                                <td className="p-2.5 text-slate-600 text-[10.5px]">{entry.data}</td>
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9.5px] text-slate-400 line-through truncate max-w-[80px]">{entry.staryStatus}</span>
                                    <span className="text-slate-400 font-bold">➔</span>
                                    <span className={`px-2 py-0.5 rounded text-[9.5px] uppercase font-bold border ${
                                      entry.nowyStatus === 'Gotowy do produkcji' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      entry.nowyStatus === 'W użyciu' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                                      entry.nowyStatus === 'W konserwacji' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>{entry.nowyStatus}</span>
                                  </div>
                                </td>
                                <td className="p-2.5 font-semibold text-slate-750">{entry.operator}</td>
                                <td className="p-2.5 text-slate-500 font-sans max-w-[200px] truncate" title={entry.powod}>
                                  {entry.powod || <span className="text-slate-300 italic">b.d.</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="bg-slate-50 border border-slate-205 text-slate-400 rounded-xl p-8 text-center text-xs font-mono leading-normal">
                          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          Brak wcześniejszych wpisów modyfikacji statusu dla tego zestawu.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* PROPOZYCJA 1: KOMFORTOWY PANEL KONTRA-SYGNATURY CFR PART 11 (Dual Approval Queue) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-lg mt-6 text-left space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <Fingerprint className="w-5 h-5 text-emerald-400 animate-pulse" />
                  </span>
                  <h4 className="text-base font-bold font-display text-white tracking-tight">
                    Kolejka Kontrasygnat Jakościowych QA (FDA 21 CFR Part 11)
                  </h4>
                </div>
                <p className="text-[10px] text-slate-400 font-mono uppercase mt-1">
                  Rejestr zdarzeń technicznych i metrologicznych oczekujących na podwójną autoryzację (Four-Eyes Principle)
                </p>
              </div>
              <span className="text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg">
                SECURE GMP INTEGRITY RUNNING
              </span>
            </div>

            <div className="space-y-4">
              {coSignEvents.map((evt) => {
                const isSigningActive = activeSigningId === evt.id;
                return (
                  <div 
                    key={evt.id} 
                    className={`p-4 rounded-xl border transition-all ${
                      evt.isSigned 
                        ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_2px_15px_rgba(16,185,129,0.03)]' 
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[9px] font-bold text-slate-300">
                            {evt.id}
                          </span>
                          <span className="text-xs font-bold text-white">{evt.serviceType}</span>
                          <span className="text-xs text-slate-400 font-semibold">•</span>
                          <span className="text-[10.5px] text-[#00ca9a] font-mono">{evt.productName} (zestaw #{evt.toolId})</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-450 font-mono">
                          <span>Technik: <strong>{evt.operator}</strong></span>
                          <span>•</span>
                          <span>Data wykonania: {evt.date}</span>
                        </div>
                      </div>

                      <div>
                        {evt.isSigned ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-lg text-[10.5px] font-mono font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Zweryfikowano przez: {evt.coSigner} dnia {evt.coSignedDate}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSigningId(isSigningActive ? null : evt.id);
                              setCoSignPin('');
                              setCoSignError('');
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs font-mono transition-all cursor-pointer ${
                              isSigningActive 
                                ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-indigo-50 border border-indigo-550'
                            }`}
                          >
                            {isSigningActive ? 'Anuluj podpis' : 'Kontrasygnuj teraz (QA)'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 text-xs text-slate-350 leading-relaxed font-sans flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-250 block mb-0.5">Ustalenia techniczne:</span>
                        <p>{evt.notes}</p>
                      </div>
                    </div>

                    {/* Inline signing subform */}
                    {isSigningActive && !evt.isSigned && (
                      <div className="mt-4 pt-4 border-t border-slate-800 bg-slate-950/60 p-4 rounded-xl space-y-4">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                          <Lock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          <span>Panel autoryzacyjny drugiego sygnatariusza (Zasada podwójnego sprawdzania):</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                          <div className="md:col-span-5 space-y-1.5">
                            <label className="text-[10px] text-slate-450 uppercase font-mono block font-bold">Imię i Nazwisko Audytora QA:</label>
                            <input
                              type="text"
                              value={coSignAuditor}
                              onChange={(e) => setCoSignAuditor(e.target.value)}
                              placeholder="Specjalista QA"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs font-mono outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="md:col-span-3 space-y-1.5">
                            <label className="text-[10px] text-slate-450 uppercase font-mono block font-bold">PIN autoryzacji (1234):</label>
                            <input
                              type="password"
                              value={coSignPin}
                              onChange={(e) => {
                                setCoSignPin(e.target.value);
                                setCoSignError('');
                              }}
                              placeholder="••••"
                              maxLength={4}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-center font-mono text-xs outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="md:col-span-4">
                            <button
                              type="button"
                              onClick={() => {
                                if (coSignPin !== '1234') {
                                  setCoSignError('Niepoprawny PIN autoryzacyjny GMP! Użyj kodu testowego 1234.');
                                  return;
                                }
                                if (!coSignAuditor.trim()) {
                                  setCoSignError('Proszę podać podpis audytora.');
                                  return;
                                }

                                // Apply verification signature
                                setCoSignEvents(prev => 
                                  prev.map(item => 
                                    item.id === evt.id 
                                      ? { 
                                          ...item, 
                                          isSigned: true, 
                                          coSigner: coSignAuditor, 
                                          coSignedDate: new Date().toISOString().replace('T', ' ').substring(0, 16) 
                                        } 
                                      : item
                                  )
                                );
                                
                                // Push transaction details to system Audit Trail
                                const newTx = {
                                  id: `TX-${Math.floor(Math.random() * 90000) + 10000}`,
                                  timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                                  actor: coSignAuditor,
                                  action: `Kontrasygnata cyfrowa QA dla zdarzenia ${evt.id} zestaw #${evt.toolId}`,
                                  reason: 'Zatwierdzenie drugiego sygnatariusza (CFR Part 11 Co-Sign off)',
                                  hash: `SHA256: ${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}ac01ef`,
                                  status: 'SUCCESS' as const
                                };

                                setAuditTrail(prev => [newTx, ...prev]);
                                setActiveSigningId(null);
                                alert('PODPIS CYFROWY WYGENEROWANY: Logi GMP zostały unieruchomione. Transakcja zarejestrowana w nienaruszalnym Audit Trail.');
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg font-bold text-xs font-mono transition-all cursor-pointer"
                            >
                              Podpisz i Zablokuj Logi ➔
                            </button>
                          </div>
                        </div>

                        {coSignError && (
                          <p className="text-rose-400 text-[10px] font-mono animate-shake">{coSignError}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL MANUAL SERVICE LOGGING MODAL */}
      <AnimatePresence>
        {isAddRecordModalOpen && (
          <AddServiceRecordModal
            isOpen={isAddRecordModalOpen}
            onClose={() => setIsAddRecordModalOpen(false)}
            toolSets={toolSets}
            onAddRecord={(toolsetId, record, newStatus) => {
              const targetTool = toolSets.find(t => t.id === toolsetId);
              if (!targetTool || !onUpdateToolSet) return;

              const updatedToolSet: ToolSet = {
                ...targetTool,
                historiaSerwisowa: [...(targetTool.historiaSerwisowa || []), record],
                status: newStatus || targetTool.status,
              };

              onUpdateToolSet(updatedToolSet);

              // Add CFR Part 11 Audit Trail event inside ReportsPanel's state
              const newAuditTx = {
                id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                actor: `${record.operator} (QA: ${record.verifiedBy || 'BRAK'})`,
                action: `Ręczna rejestracja zabiegu (${record.typ}) dla kompletu #${toolsetId}`,
                reason: `Manualne prace konserwacyjne i kalibracyjne na życzenie operatora`,
                hash: "SHA258: " + record.id,
                status: 'SUCCESS' as const
              };
              setAuditTrail(prev => [newAuditTx, ...prev]);
            }}
          />
        )}
      </AnimatePresence>

      {/* Dynamic GMP Service History Modal */}
      <AnimatePresence>
        {selectedHistoryTool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setSelectedHistoryTool(null)}
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] relative z-10 font-sans text-left"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#0b4596] to-[#1e5cb3] text-white p-5 relative">
                <button
                  type="button"
                  onClick={() => setSelectedHistoryTool(null)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-white/10 text-emerald-300 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-blue-200">Dziennik Operacyjny i GMP</span>
                    <h3 className="font-bold text-base leading-tight">
                      {selectedHistoryTool.nazwaProduktu}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 text-[10px] sm:text-xs">
                  <span className="px-2.5 py-1 rounded bg-white/15 border border-white/10 font-mono">
                    ID zestawu: <strong>{selectedHistoryTool.id}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-white/15 border border-white/10 font-mono">
                    Standard: <strong>{selectedHistoryTool.standardNarzedzi}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-white/15 border border-white/10 font-mono">
                    Stal: <strong>{selectedHistoryTool.rodzajStali}</strong>
                  </span>
                </div>
              </div>

              {/* Tab Selector (Dziennik Operacyjny vs Certyfikat GMP vs Prognoza RUL vs Inspekcja 3D vs Załączniki) */}
              <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 relative z-10 text-[10px] sm:text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('dziennik');
                    setShowAddRecordForm(false);
                  }}
                  className={`flex-1 min-w-[120px] py-2.5 text-center font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                    modalTab === 'dziennik'
                      ? 'border-[#0b4596] text-[#0b4596] bg-white font-black'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" /> Dziennik
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('predykcja');
                    setShowAddRecordForm(false);
                  }}
                  className={`flex-1 min-w-[120px] py-2.5 text-center font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                    modalTab === 'predykcja'
                      ? 'border-[#0b4596] text-[#0b4596] bg-white font-black'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Prognoza RUL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('certyfikat');
                    setShowAddRecordForm(false);
                  }}
                  className={`flex-1 min-w-[120px] py-2.5 text-center font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                    modalTab === 'certyfikat'
                      ? 'border-[#0b4596] text-[#0b4596] bg-white font-black'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Certyfikat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('inspekcja_3d');
                    setShowAddRecordForm(false);
                  }}
                  className={`flex-1 min-w-[120px] py-2.5 text-center font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                    modalTab === 'inspekcja_3d'
                      ? 'border-[#0b4596] text-[#0b4596] bg-white font-black'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Skaner 3D & Defekty
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('zalaczniki');
                    setShowAddRecordForm(false);
                  }}
                  className={`flex-1 min-w-[120px] py-2.5 text-center font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                    modalTab === 'zalaczniki'
                      ? 'border-[#0b4596] text-[#0b4596] bg-white font-black'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" /> Załączniki ({selectedHistoryTool.zalaczniki?.length || 0})
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 max-h-[55vh]">
                {modalTab === 'dziennik' ? (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs gap-3">
                      <div>
                        <span className="text-slate-400 block font-mono text-[9px] uppercase">Bieżący Wolumen / Limit</span>
                        <span className="font-bold text-slate-800 font-mono text-xs sm:text-sm">
                          {selectedHistoryTool.uzycieGlowne.toLocaleString()} / {selectedHistoryTool.uzycieLimit.toLocaleString()} uderzeń
                        </span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {onUpdateToolSet && (
                          <button
                            type="button"
                            onClick={() => setShowAddRecordForm(!showAddRecordForm)}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#0b4596] hover:bg-[#1a5cb3] text-white font-mono font-bold text-[10px] uppercase rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {showAddRecordForm ? 'Zwiń formularz' : 'Nowy wpis GMP'}
                          </button>
                        )}
                        <span className="px-2.5 py-1.5 rounded bg-rose-50 border border-rose-200 font-mono text-[9px] text-rose-700 font-bold flex items-center gap-1 uppercase">
                          <AlertTriangle className="w-3.5 h-3.5" /> Rewizja
                        </span>
                      </div>
                    </div>

                    {/* NEW SERVICE RECORD FORM (Option 1) */}
                    <AnimatePresence>
                      {showAddRecordForm && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-slate-50 border border-slate-205 rounded-xl p-4 space-y-3 text-xs text-left"
                        >
                          <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
                            <span className="font-bold text-slate-700 font-mono text-[10px] uppercase">Wpisz Szczegóły Interwencji Serwisowej:</span>
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono uppercase">GMP REGULATED</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono text-slate-550 mb-1 uppercase">Rodzaj Zabiegu / Operacji:</label>
                              <select
                                value={newRecordType}
                                onChange={(e) => setNewRecordType(e.target.value as any)}
                                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none font-mono text-xs cursor-pointer"
                              >
                                <option value="Polerowanie">Polerowanie czołowe stempli</option>
                                <option value="Mycie Ultradźwiękowe">Mycie w komorze ultradźwiękowej</option>
                                <option value="Inspekcja">Inspekcja techniczna i kalibracja</option>
                                <option value="Kwalifikacja">Kwalifikacja techniczna (IQ/OQ)</option>
                                <option value="Metrologia">Metrologiczne pomiary starzeniowe</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono text-slate-550 mb-1 uppercase">Osoba Wykonująca / ID:</label>
                              <input
                                type="text"
                                placeholder="imię, nazwisko lub ID (np. Jan Kowalski)"
                                value={newRecordOperator}
                                onChange={(e) => setNewRecordOperator(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono text-slate-550 mb-1 uppercase">Drugi Sprawdzający / QA ID:</label>
                              <input
                                type="text"
                                placeholder="imię, nazwisko lub ID (np. Joanna Kowalska)"
                                value={newRecordVerifier}
                                onChange={(e) => setNewRecordVerifier(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none text-xs focus:border-[#00ca9a]"
                              />
                            </div>
                          </div>

                          {/* Dynamic Collapsible section for Metrological metrics (Option 5) */}
                          <div className="bg-white border border-slate-150 rounded-lg p-3 space-y-2">
                            <span className="text-[9px] font-mono font-bold text-[#00ca9a] uppercase block tracking-wider">
                              ⚙️ Dodaj dane metrologiczne (zgodność GMP):
                            </span>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="block text-[8px] font-mono text-slate-450 uppercase">Długość MAX (mm):</label>
                                <input
                                  type="text"
                                  placeholder="Długość max"
                                  value={newRecordDlugoscMax}
                                  onChange={(e) => setNewRecordDlugoscMax(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-205 rounded px-1.5 py-1 text-[10px] font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono text-slate-450 uppercase">Długość MIN (mm):</label>
                                <input
                                  type="text"
                                  placeholder="Długość min"
                                  value={newRecordDlugoscMin}
                                  onChange={(e) => setNewRecordDlugoscMin(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-205 rounded px-1.5 py-1 text-[10px] font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono text-slate-450 uppercase">Bicie prom. (mm):</label>
                                <input
                                  type="text"
                                  placeholder="Bicie"
                                  value={newRecordBicie}
                                  onChange={(e) => setNewRecordBicie(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-205 rounded px-1.5 py-1 text-[10px] font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono text-slate-450 uppercase">Chropowatość Ra (µm):</label>
                                <input
                                  type="text"
                                  placeholder="Chropowatość Ra"
                                  value={newRecordRa}
                                  onChange={(e) => setNewRecordRa(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-205 rounded px-1.5 py-1 text-[10px] font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          {/* GMP QUALIFICATION CHECKLIST (PROPOZYCJA 2) */}
                          <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-3.5 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono font-bold text-[#0b4596] uppercase tracking-wider block">
                                📋 Karta Kwalifikacji i Procedur GMP (Wymagana przed zatwierdzeniem):
                              </span>
                              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-black uppercase shadow-xs ${
                                (gmpCheckCleaning && gmpCheckMicroscope && gmpCheckTolerance && gmpCheckQASign)
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-amber-400 text-slate-900 animate-pulse'
                              }`}>
                                {(gmpCheckCleaning && gmpCheckMicroscope && gmpCheckTolerance && gmpCheckQASign) ? 'ZGODNE (QA OK)' : 'W TOKU'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <label className="flex items-start gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={gmpCheckCleaning}
                                  onChange={(e) => setGmpCheckCleaning(e.target.checked)}
                                  className="w-3.5 h-3.5 text-biofarm-blue rounded mt-0.5 border-slate-300 focus:ring-0 cursor-pointer"
                                />
                                <div className="text-[10px] leading-tight">
                                  <span className="font-bold text-slate-800 block">1. Mycie ultradźwiękowe & Dekontaminacja</span>
                                  <span className="text-slate-400 text-[9px] font-mono">Kąpiel w neutralnym roztworze + pukanie w IPA 70%</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={gmpCheckMicroscope}
                                  onChange={(e) => setGmpCheckMicroscope(e.target.checked)}
                                  className="w-3.5 h-3.5 text-biofarm-blue rounded mt-0.5 border-slate-300 focus:ring-0 cursor-pointer"
                                />
                                <div className="text-[10px] leading-tight">
                                  <span className="font-bold text-slate-800 block">2. Inspekcja wizualna i mikroskopowa</span>
                                  <span className="text-slate-400 text-[9px] font-mono">Stereoskopowe sprawdzenie pod kątem mikropęknięć</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={gmpCheckTolerance}
                                  onChange={(e) => setGmpCheckTolerance(e.target.checked)}
                                  className="w-3.5 h-3.5 text-biofarm-blue rounded mt-0.5 border-slate-300 focus:ring-0 cursor-pointer"
                                />
                                <div className="text-[10px] leading-tight">
                                  <span className="font-bold text-slate-800 block">3. Pasowanie & Pomiary Metrologiczne</span>
                                  <span className="text-slate-400 text-[9px] font-mono">Bicie robocze & test suwliwości gniazd stemplarek</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={gmpCheckQASign}
                                  onChange={(e) => setGmpCheckQASign(e.target.checked)}
                                  className="w-3.5 h-3.5 text-biofarm-blue rounded mt-0.5 border-slate-300 focus:ring-0 cursor-pointer"
                                />
                                <div className="text-[10px] leading-tight">
                                  <span className="font-bold text-slate-800 block">4. Podpis Autoryzowanego Operatora QA</span>
                                  <span className="text-slate-400 text-[9px] font-mono">Rejestracja tożsamości w systemie GMP-S</span>
                                </div>
                              </label>
                            </div>

                            {/* Warning message if checkboxes not checked */}
                            {!(gmpCheckCleaning && gmpCheckMicroscope && gmpCheckTolerance && gmpCheckQASign) && (
                              <div className="p-2 border border-amber-300/40 bg-amber-500/10 rounded-lg flex items-center gap-1.5 text-[9px] text-amber-800 font-mono">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Wpis zostanie oznaczony flagą ostrzegawczą o niepełnej walidacji procedury. Zaznacz wszystkie punkty, aby uzyskać status pełnej autoryzacji GMP.</span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-mono text-slate-1000 mb-1 uppercase">Notatki techniczne i uwagi GMP:</label>
                              <input
                                type="text"
                                placeholder="Np. Polerowanie pastą diamentową 3µm, Ra zgodne..."
                                value={newRecordNotes}
                                onChange={(e) => setNewRecordNotes(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono text-slate-550 mb-1 uppercase">Status:</label>
                              <select
                                value={newRecordStatus}
                                onChange={(e) => setNewRecordStatus(e.target.value as any)}
                                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none font-mono text-xs cursor-pointer"
                              >
                                <option value="Wykonano">Wykonano (Serwis)</option>
                                <option value="Zatwierdzony">Zatwierdzony / Zgodny (GMP)</option>
                                <option value="Wymaga uwagi">Wymaga uwagi / Rewizja</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1 font-mono">
                            <button
                              type="button"
                              onClick={() => setShowAddRecordForm(false)}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-750 uppercase font-black text-[9px] rounded-md cursor-pointer"
                            >
                              Anuluj
                            </button>
                            <button
                              type="button"
                              onClick={handleAddServiceRecord}
                              className="px-4 py-1.5 bg-[#00ca9a] hover:bg-emerald-500 text-biofarm-dark font-black uppercase text-[9px] rounded-md cursor-pointer"
                            >
                              ✓ Zatwierdź i Zapisz wpis GMP
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* PREDICTIVE MAINTENANCE TIMELINE ASSISTANT */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-xl border border-indigo-500/30 shadow-md space-y-4 text-left font-sans">
                      <div className="flex justify-between items-start border-b border-indigo-900/50 pb-2">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-200 font-mono">
                            Automatyczny Asystent Resursu i Prognoza Interwencji (Predictive Maintenance)
                          </span>
                        </div>
                        <span className="text-[8px] font-mono bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 px-2 py-0.5 rounded uppercase">
                          Zgodność z GMP Biofarm
                        </span>
                      </div>

                      {(() => {
                        const current = selectedHistoryTool.uzycieGlowne;
                        const limit = selectedHistoryTool.uzycieLimit;
                        const percentage = Math.min(100, Math.round((current / limit) * 100));

                        // Predictions: polishing every 500,000 cycles, inspection every 1,000,000 cycles
                        const nextPolishing = (Math.floor(current / 500000) + 1) * 500000;
                        const polishingRemaining = nextPolishing - current;
                        const nextInspection = (Math.floor(current / 1000000) + 1) * 1000000;
                        const inspectionRemaining = nextInspection - current;

                        const dailyRate = 60000; // estimated cycles per day
                        const daysToPolishing = Math.round((polishingRemaining / dailyRate) * 10) / 10;
                        const daysToInspection = Math.round((inspectionRemaining / dailyRate) * 10) / 10;

                        const addDaysToCurrent = (days: number) => {
                          const d = new Date();
                          d.setDate(d.getDate() + Math.max(1, Math.round(days)));
                          return d.toISOString().split('T')[0];
                        };

                        const polishDateStr = addDaysToCurrent(daysToPolishing);
                        const inspectDateStr = addDaysToCurrent(daysToInspection);

                        return (
                          <div className="space-y-4">
                            <div className="space-y-1 font-mono">
                              <div className="flex justify-between items-center text-[10px] text-slate-350">
                                <span>Bieżący stan licznika cykli:</span>
                                <strong className="text-white">{current.toLocaleString()} / {limit.toLocaleString()} uderzeń ({percentage}%)</strong>
                              </div>
                              <div className="relative h-6 bg-slate-950 border border-slate-800 rounded-lg p-0.5 flex items-center overflow-hidden">
                                <div className="absolute inset-y-0 left-0 bg-indigo-500/20" style={{ width: `${percentage}%` }} />
                                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0b4596] to-indigo-500 transition-all duration-500 rounded-md" style={{ width: `${percentage}%` }} />
                                
                                <div className="absolute left-[33%] top-0 bottom-0 w-[1.5px] bg-slate-600/30 border-l border-dashed border-white/20 flex flex-col items-center justify-start pointer-events-none" title="Próg 1.0M">
                                  <span className="text-[8px] text-slate-400 mt-0.5 font-bold">1.0M</span>
                                </div>
                                <div className="absolute left-[66%] top-0 bottom-0 w-[1.5px] bg-slate-600/30 border-l border-dashed border-white/20 flex flex-col items-center justify-start pointer-events-none" title="Próg 2.0M">
                                  <span className="text-[8px] text-slate-400 mt-0.5 font-bold">2.0M</span>
                                </div>

                                <span className="absolute text-[9px] font-black right-2 text-white drop-shadow-md z-10 select-none">
                                  {percentage}% zużycia limitu
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-mono">
                              <div className="p-3 bg-slate-950/80 border border-indigo-500/10 rounded-lg space-y-1.5 flex flex-col justify-between">
                                <div className="space-y-0.5">
                                  <div className="flex justify-between items-center border-b border-indigo-900/45 pb-1">
                                    <span className="text-amber-300 font-bold flex items-center gap-1">
                                      <Wrench className="w-3.5 h-3.5" /> NASTĘPNE POLEROWANIE CZOŁA
                                    </span>
                                    <span className="font-bold text-[10px] text-slate-400">interwał 500k</span>
                                  </div>
                                  <p className="text-slate-400 text-[10px] leading-relaxed mt-1">
                                    Pozostało uderzeń: <strong className="text-white">{(polishingRemaining).toLocaleString()}</strong>
                                  </p>
                                  <p className="text-slate-400 text-[10px] leading-relaxed">
                                    Prognozowany próg: <strong className="text-slate-200">{(nextPolishing).toLocaleString()} uderzeń</strong>
                                  </p>
                                </div>
                                <div className="flex justify-between items-center bg-amber-500/10 text-amber-300 px-2 py-1 rounded border border-amber-500/20 text-[10px] font-bold mt-1.5">
                                  <span>Szacowana data serwisu:</span>
                                  <span>{polishDateStr}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-slate-950/80 border border-indigo-500/10 rounded-lg space-y-1.5 flex flex-col justify-between">
                                <div className="space-y-0.5">
                                  <div className="flex justify-between items-center border-b border-indigo-900/45 pb-1">
                                    <span className="text-emerald-300 font-bold flex items-center gap-1">
                                      <ShieldCheck className="w-3.5 h-3.5" /> INSPEKCJA OKRESOWA
                                    </span>
                                    <span className="font-bold text-[10px] text-slate-400">interwał 1.0M</span>
                                  </div>
                                  <p className="text-slate-400 text-[10px] leading-relaxed mt-1">
                                    Pozostało uderzeń: <strong className="text-white">{(inspectionRemaining).toLocaleString()}</strong>
                                  </p>
                                  <p className="text-slate-400 text-[10px] leading-relaxed">
                                    Prognozowany próg: <strong className="text-slate-200">{(nextInspection).toLocaleString()} uderzeń</strong>
                                  </p>
                                </div>
                                <div className="flex justify-between items-center bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20 text-[10px] font-bold mt-1.5">
                                  <span>Szacowana data inspekcji:</span>
                                  <span>{inspectDateStr}</span>
                                </div>
                              </div>
                            </div>

                            {polishingRemaining < 100000 && (
                              <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-lg flex items-center gap-2 text-[10px] text-rose-300 animate-pulse font-mono">
                                <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0" />
                                <span>ALARM: Pozostało mniej niż 100 000 uderzeń do zalecanego polerowania czołowego! Przygotuj komplet do konserwacji technicznej.</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Service Timeline */}
                    <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100 mt-4">
                      {getServiceHistory(selectedHistoryTool).map((log: any, index) => {
                        const isAlert = log.status.includes('uwagi');
                        const isApproved = log.status.includes('Zatwierdzony') || log.status.includes('Zgodny');
                        
                        // Treat validation type or anything containing explicit verification parameters as GMP Verified
                        const isGmpVerified = log.isGmpVerified || log.type.includes('Kwalifikacja techniczna');
                        const verifier = log.verifiedBy || (log.type.includes('Kwalifikacja techniczna') ? 'dr Joanna Kowalska (QA Lead)' : null);

                        return (
                          <div key={index} className="flex gap-4 relative">
                            {/* Timeline node */}
                            <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 z-10 ${
                              isAlert 
                                ? 'bg-amber-50 border-amber-300 text-amber-600' 
                                : isGmpVerified 
                                  ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                                  : isApproved 
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
                                    : 'bg-indigo-50 border-indigo-250 text-indigo-600'
                            }`}>
                              {isAlert ? <AlertTriangle className="w-4 h-4" /> : isApproved || isGmpVerified ? <ShieldCheck className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                            </div>

                            {/* Event details block */}
                            <div className={`flex-1 space-y-1.5 text-left font-mono p-4 rounded-xl border transition-all ${
                              isGmpVerified 
                                ? 'bg-emerald-500/[0.02] border-emerald-500/20 shadow-[0_2px_10px_rgba(16,185,129,0.03)]' 
                                : 'bg-slate-50/40 border-slate-150'
                            }`}>
                              <div className="flex flex-wrap justify-between items-start gap-1">
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                    {log.type}
                                    {isGmpVerified && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white font-mono text-[8px] font-black uppercase tracking-wider">
                                        GMP Verified
                                      </span>
                                    )}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className="flex items-center gap-1 text-[10px] text-slate-450 font-mono">
                                      <Calendar className="w-3 h-3 text-slate-350" />
                                      {log.date}
                                    </span>
                                    <span className="text-[10px] text-slate-300">•</span>
                                    <span className="flex items-center gap-1 text-[10px] text-slate-450 font-mono">
                                      <User className="w-3 h-3 text-slate-350" />
                                      Wykonawca: {log.operator}
                                    </span>
                                  </div>
                                </div>

                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                  isAlert 
                                    ? 'bg-amber-50 text-amber-705 border-amber-200' 
                                    : isGmpVerified 
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : isApproved 
                                        ? 'bg-emerald-50 text-emerald-705 border-emerald-200' 
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                  {isGmpVerified ? 'Zatwierdzony (QA)' : log.status}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-150 p-2.5 rounded-lg font-mono">
                                {log.notes}
                              </p>

                              {isGmpVerified && verifier && (
                                <div className="text-[10px] text-slate-550 pt-1 border-t border-slate-100 flex items-center gap-1 mt-2">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Weryfikacja podwójna (Zasada 4-Eyes Principle) zakończona pomyślnie. QA Inspector: <strong className="text-emerald-700">{verifier}</strong>. Wpis nienaruszalny w systemie GMP-S.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* FDA 21 CFR PART 11 INVESTIGATION AUDIT TRAIL LOG CONSOLE */}
                    <div className="mt-8 border-t border-slate-250 pt-5 space-y-3 font-mono text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Fingerprint className="w-4 h-4 text-slate-600 animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                            Rejestr Zdarzeń Zgodności (Immutable FDA 21 CFR Part 11 Audit Trail)
                          </span>
                        </div>
                        <span className="self-start sm:self-auto text-[8px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase font-black tracking-widest">
                          ● Integrity Log SECURE
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-relaxed max-w-2xl font-sans">
                        Zgodnie z wymogami regulacyjnymi FDA dla zautomatyzowanych systemów ewidencji, każda zmiana jakościowa, metrologiczna, czy zmiana okresowej konserwacji stempli w bazie musi odpowiadać zarejestrowanemu w tym systemie podpisowi cyfrowemu. Zapisy w Audit Trail są permanentne.
                      </p>

                      <div className="bg-slate-900 border border-slate-800 text-slate-300 p-3.5 rounded-xl space-y-3 max-h-56 overflow-y-auto text-[10.5px]">
                        {auditTrail.map((tx) => (
                          <div key={tx.id} className="border-b border-slate-800 pb-2.5 last:border-0 last:pb-0 space-y-1">
                            <div className="flex justify-between items-center text-[9px]">
                              <span className="font-mono text-[8px] bg-slate-800 px-1.5 py-0.5 rounded font-black text-cyan-400">
                                TRANSACTION {tx.id}
                              </span>
                              <span className="text-slate-500 font-mono">
                                UTC TIMESTAMP: {tx.timestamp}
                              </span>
                            </div>
                            <div className="text-slate-100 font-bold font-sans text-xs">
                              {tx.action}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-slate-400">
                              <span>Sygnatariusz GMP: <strong className="text-slate-200 font-semibold">{tx.actor}</strong></span>
                              <span>Cel: <span className="text-slate-350 italic">"{tx.reason}"</span></span>
                            </div>
                            <div className="text-[8px] text-slate-450 truncate font-mono bg-slate-950 px-2 py-1 rounded border border-slate-850 mt-1">
                              <span>SHA-256 BLOCK SIGNATURE:</span> <code className="text-emerald-400 font-bold">{tx.hash}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : modalTab === 'predykcja' ? (
                  /* WEAR RATE ANALYTICS PREDICTION PANEL WITH RECHARTS */
                  <ToolWearAnalyticsTab tool={selectedHistoryTool} />
                ) : modalTab === 'inspekcja_3d' ? (
                  /* INTERACTIVE 3D MICROSCOPE INSPECTION WORKSHEET */
                  <Tool3DInspectionTab
                    tool={selectedHistoryTool}
                    onUpdateToolSet={onUpdateToolSet}
                    onChangeSelectedTool={setSelectedHistoryTool}
                  />
                ) : modalTab === 'zalaczniki' ? (
                  /* QUALITY CERTIFICATES SCANNING ATTACHMENTS REPOSITORY */
                  <ToolAttachmentsTab
                    tool={selectedHistoryTool}
                    onUpdateToolSet={onUpdateToolSet}
                    onChangeSelectedTool={setSelectedHistoryTool}
                  />
                ) : (
                  /* METROLOGY QUALITY CALIBRATION CERTIFICATE (Option 5) + CAD WORKBENCH (Propozycja 2 & 1) */
                  <div className="space-y-6">
                    {/* Live CAD Interactive Engineering Workbench (Hidden on printer) */}
                    <div className="bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-4 print:hidden">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 bg-[#00ca9a]/15 text-[#00ca9a] rounded">
                            <Wrench className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider font-sans text-slate-200">
                            Wizualny Panel Inspekcji Metrologicznej CAD stempli (Live)
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800 px-1.5 py-0.5 rounded uppercase font-bold">
                          Standard: {selectedHistoryTool.standardNarzedzi}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                        {/* Sliders on the left */}
                        <div className="md:col-span-5 space-y-3.5 text-xs">
                          <p className="text-[10px] text-slate-400 leading-normal font-mono">
                            Zmieniaj parametry metrologiczne suwakami, aby odzwierciedlić ścieranie, bicie robocze lub chropowatość i zobaczyć odchyłki bezpośrednio na rysunku technicznym.
                          </p>

                          {/* Length control */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 font-bold">1. Długość całkowita (L):</span>
                              <span className={`font-mono font-bold ${certDlugosc < 133.55 || certDlugosc > 133.65 ? 'text-rose-400' : 'text-emerald-405'}`}>
                                {certDlugosc.toFixed(2)} mm {certDlugosc < 133.55 || certDlugosc > 133.65 ? '❌ REJECT' : '✓ OK'}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="133.50"
                              max="133.70"
                              step="0.01"
                              value={certDlugosc}
                              onChange={(e) => setCertDlugosc(parseFloat(e.target.value))}
                              className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                            />
                            <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                              <span>Min 133.50</span>
                              <span>Norma: 133.60 ±0.05</span>
                              <span>Max 133.70</span>
                            </div>
                          </div>

                          {/* Runout/Bicie control */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 font-bold">2. Bicie promieniowe:</span>
                              <span className={`font-mono font-bold ${certBicie > 0.008 ? 'text-rose-400' : 'text-emerald-405'}`}>
                                {certBicie.toFixed(4)} mm {certBicie > 0.008 ? '❌ REJECT' : '✓ OK'}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.000"
                              max="0.015"
                              step="0.001"
                              value={certBicie}
                              onChange={(e) => setCertBicie(parseFloat(e.target.value))}
                              className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                            <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                              <span>0.000 mm</span>
                              <span>Norma: &lt; 0.008 mm</span>
                              <span>0.015 mm</span>
                            </div>
                          </div>

                          {/* Roughness control */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 font-bold">3. Szorstkość czoła (Ra):</span>
                              <span className={`font-mono font-bold ${certRa > 0.10 ? 'text-rose-400' : 'text-emerald-405'}`}>
                                {certRa.toFixed(3)} µm {certRa > 0.10 ? '❌ REJECT' : '✓ OK'}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.01"
                              max="0.20"
                              step="0.01"
                              value={certRa}
                              onChange={(e) => setCertRa(parseFloat(e.target.value))}
                              className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-teal-400"
                            />
                            <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                              <span>0.01 µm</span>
                              <span>Norma: &lt; 0.10 µm</span>
                              <span>0.20 µm</span>
                            </div>
                          </div>

                          {/* Fit control */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 font-bold">4. Tolerancja pasowania trzonu:</span>
                              <span className={`font-mono font-bold ${certPasowanie > 0.020 ? 'text-rose-400' : 'text-emerald-405'}`}>
                                {certPasowanie.toFixed(4)} mm {certPasowanie > 0.020 ? '❌ REJECT' : '✓ OK'}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.001"
                              max="0.030"
                              step="0.001"
                              value={certPasowanie}
                              onChange={(e) => setCertPasowanie(parseFloat(e.target.value))}
                              className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-teal-400"
                            />
                            <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                              <span>0.001 mm</span>
                              <span>Norma: &lt; 0.020 mm</span>
                              <span>0.030 mm</span>
                            </div>
                          </div>

                          {/* Quick Calibration Helper */}
                          <div className="flex gap-2.5 pt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCertDlugosc(133.60);
                                setCertBicie(0.002);
                                setCertRa(0.03);
                                setCertPasowanie(0.004);
                              }}
                              className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-emerald-950 font-mono font-bold text-[8.5px] uppercase rounded transition-colors cursor-pointer"
                            >
                              Zgodny nominal (Nominal OK)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCertDlugosc(133.51); // too short
                                setCertBicie(0.012); // high runout
                                setCertRa(0.12); // rough surface
                                setCertPasowanie(0.023); // loose fit
                              }}
                              className="flex-1 py-1 px-2 bg-red-950/20 hover:bg-red-950/40 text-rose-450 border border-red-950/30 font-mono font-bold text-[8.5px] uppercase rounded transition-colors cursor-pointer"
                            >
                              Ścieranie / Błąd (Wear simulated)
                            </button>
                          </div>
                        </div>

                        {/* Interactive technical SVG drawing on the right */}
                        <div className="md:col-span-7 select-none">
                          {(() => {
                            const isEUD = selectedHistoryTool.standardNarzedzi === 'EU-D';
                            const barrelY = isEUD ? 40 : 50;
                            const barrelHeight = isEUD ? 86 : 66;

                            const isDlugoscInvalid = certDlugosc < 133.55 || certDlugosc > 133.65;
                            const isBicieInvalid = certBicie > 0.008;
                            const isRaInvalid = certRa > 0.10;
                            const isPasowanieInvalid = certPasowanie > 0.020;

                            const hasAnyIssue = isDlugoscInvalid || isBicieInvalid || isRaInvalid || isPasowanieInvalid;

                            return (
                              <div className="relative space-y-1">
                                <svg viewBox="0 0 460 160" className="w-full bg-[#09101b] border border-[#1b2533] rounded-xl font-mono relative overflow-hidden">
                                  {/* CAD grid lines background */}
                                  <defs>
                                    <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#101929" strokeWidth="0.65" />
                                    </pattern>
                                    <filter id="glowRed">
                                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                      <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                      </feMerge>
                                    </filter>
                                  </defs>
                                  <rect width="100%" height="100%" fill="url(#cadGrid)" />
                                  
                                  {/* Center lines */}
                                  <line x1="10" y1="80" x2="450" y2="80" stroke="#13243a" strokeDasharray="6,4" strokeWidth="0.75" />
                                  
                                  {/* Red glow underlay if total length is damaged */}
                                  {isDlugoscInvalid && (
                                    <rect x="20" y="30" width="395" height="100" fill="#ef4444" fillOpacity="0.08" filter="url(#glowRed)" className="animate-pulse" />
                                  )}

                                  {/* Punch head and base profile */}
                                  <rect 
                                    x="25" 
                                    y="45" 
                                    width="20" 
                                    height="70" 
                                    rx="2" 
                                    fill={isPasowanieInvalid ? '#ef4444' : '#475569'} 
                                    stroke={isPasowanieInvalid ? '#fca5a5' : '#64748b'} 
                                    strokeWidth="1.2" 
                                    opacity={isPasowanieInvalid ? 0.9 : 0.8}
                                    className={isPasowanieInvalid ? 'animate-pulse' : ''}
                                  />
                                  <path 
                                    d="M25,45 C12,55 12,105 25,115 Z" 
                                    fill={isPasowanieInvalid ? '#ef4444' : '#334155'} 
                                    stroke={isPasowanieInvalid ? '#fca5a5' : '#475569'} 
                                    strokeWidth="1.2" 
                                    opacity={isPasowanieInvalid ? 0.9 : 0.8}
                                    className={isPasowanieInvalid ? 'animate-pulse' : ''}
                                  />
                                  
                                  {/* Neck groove */}
                                  <rect x="45" y="55" width="25" height="50" fill="#0c1322" stroke="#334155" strokeWidth="1.2" />

                                  {/* Barrel guide cylinder */}
                                  <rect 
                                    x="70" 
                                    y={barrelY} 
                                    width="210" 
                                    height={barrelHeight} 
                                    fill={isBicieInvalid ? '#ef4444' : '#3d4a5e'} 
                                    stroke={isBicieInvalid ? '#fca5a5' : '#64748b'} 
                                    strokeWidth="1.5" 
                                    className="transition-all duration-300"
                                    opacity={isBicieInvalid ? 0.8 : 0.95}
                                  />
                                  <line x1="70" y1="80" x2="280" y2="80" stroke="#4a5568" strokeDasharray="3,3" />
                                  <rect x="70" y={barrelY + 4} width="210" height="6" fill="#cbd5e1" opacity="0.1" />

                                  {/* Runout Alert icon */}
                                  {isBicieInvalid && (
                                    <circle cx="175" cy="80" r="16" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2" className="animate-spin" style={{ transformOrigin: '175px 80px', animationDuration: '3s' }} />
                                  )}

                                  {/* Stem Transition Neck */}
                                  <path 
                                    d={`M280,${barrelY} L320,${barrelY + (isEUD ? 15 : 10)} L365,${barrelY + (isEUD ? 15 : 10)} L365,${barrelY + barrelHeight - (isEUD ? 15 : 10)} L320,${barrelY + barrelHeight - (isEUD ? 15 : 10)} L280,${barrelY + barrelHeight} Z`} 
                                    fill="#1b263b" 
                                    stroke="#475569" 
                                    strokeWidth="1" 
                                  />

                                  {/* Punch Stem mirror tip face */}
                                  <path 
                                    d={`M365,${barrelY + (isEUD ? 15 : 10)} L405,${barrelY + (isEUD ? 15 : 10)} A10,12 0 0,0 405,${barrelY + barrelHeight - (isEUD ? 15 : 10)} L365,${barrelY + barrelHeight - (isEUD ? 15 : 10)} Z`} 
                                    fill={isRaInvalid ? '#991b1b' : '#475569'} 
                                    stroke={isRaInvalid ? '#fecaca' : '#94a3b8'} 
                                    strokeWidth="1.2" 
                                    className={isRaInvalid ? 'animate-pulse' : ''}
                                  />
                                  {/* Cup curvature */}
                                  <path 
                                    d={`M405,${barrelY + (isEUD ? 18 : 13)} Q399,80 405,${barrelY + barrelHeight - (isEUD ? 18 : 13)}`} 
                                    fill="none" 
                                    stroke={isRaInvalid ? '#f87171' : '#10b981'} 
                                    strokeWidth="2" 
                                  />

                                  {/* TOTAL LENGTH (L) DIMENSION GUIDES */}
                                  <g stroke={isDlugoscInvalid ? '#f87171' : '#10b981'} strokeWidth="1">
                                    <line x1="15" y1="135" x2="415" y2="135" />
                                    <line x1="15" y1="127" x2="15" y2="143" />
                                    <line x1="415" y1="127" x2="415" y2="143" />
                                    <path d="M15,135 L22,132 L22,138 Z" fill={isDlugoscInvalid ? '#f87171' : '#10b981'} />
                                    <path d="M415,135 L408,132 L408,138 Z" fill={isDlugoscInvalid ? '#f87171' : '#10b981'} />
                                  </g>
                                  <text x="215" y="148" fill={isDlugoscInvalid ? '#f87171' : '#10b981'} textAnchor="middle" fontSize="8" className="font-bold">
                                    Długość robocza (L) = {certDlugosc.toFixed(2)} mm {isDlugoscInvalid ? '⚠️ ODCHYŁKA' : '✓ ZGODNA'}
                                  </text>

                                  {/* Runout arrow */}
                                  <g stroke={isBicieInvalid ? '#f87171' : '#06b6d4'} strokeWidth="1">
                                    <line x1="140" y1="36" x2="140" y2={barrelY} />
                                    <circle cx="140" cy="36" r="1.5" fill={isBicieInvalid ? '#ef4444' : '#06b6d4'} />
                                    <path d={`M140,${barrelY} L137,${barrelY - 5} L143,${barrelY - 5} Z`} fill={isBicieInvalid ? '#ef4444' : '#06b6d4'} />
                                  </g>
                                  <text x="140" y="27" fill={isBicieInvalid ? '#f87171' : '#06b6d4'} textAnchor="middle" fontSize="7.5" className="font-bold">
                                    Bicie: {certBicie.toFixed(4)} mm
                                  </text>

                                  {/* Ra annotation */}
                                  <g stroke={isRaInvalid ? '#f87171' : '#14b8a6'} strokeWidth="1">
                                    <line x1="410" y1="36" x2="410" y2={barrelY + (isEUD ? 15 : 10)} />
                                    <circle cx="410" cy="36" r="1.5" fill={isRaInvalid ? '#ef4444' : '#14b8a6'} />
                                    <path d={`M410,${barrelY + (isEUD ? 15 : 10)} L407,${barrelY + (isEUD ? 15 : 10) - 5} L413,${barrelY + (isEUD ? 15 : 10) - 5} Z`} fill={isRaInvalid ? '#ef4444' : '#14b8a6'} />
                                  </g>
                                  <text x="410" y="27" fill={isRaInvalid ? '#f87171' : '#14b8a6'} textAnchor="middle" fontSize="7.5" className="font-bold">
                                    Czoło Ra: {certRa.toFixed(3)} µm
                                  </text>

                                  {/* Specs Box inside Drawing */}
                                  <rect x="330" y="112" width="120" height="35" fill="#020617" opacity="0.85" rx="4" stroke="#1c2533" strokeWidth="1" />
                                  <text x="335" y="122" fill="#94a3b8" fontSize="6.5" fontWeight="bold">STANDARYZACJA:</text>
                                  <text x="335" y="131" fill="#38bdf8" fontSize="8" fontWeight="black" className="uppercase">{selectedHistoryTool.standardNarzedzi} TYPE</text>
                                  <text x="335" y="141" fill={hasAnyIssue ? '#ef4444' : '#10b981'} fontSize="7" fontWeight="black" className="uppercase">
                                    {hasAnyIssue ? '❌ ODCHYŁKA' : '✓ ZGODNY GMP'}
                                  </text>
                                </svg>
                                <div className="flex justify-between items-center px-1.5 text-[8.5px] font-mono text-slate-400">
                                  <span>AutoCAD-Vector-Stamp.dwg v2.1</span>
                                  <span className={`font-bold uppercase ${hasAnyIssue ? 'text-rose-400 animate-pulse' : 'text-[#00ca9a]'}`}>
                                    {hasAnyIssue ? 'ALARM: Wykryto błędy tolerancji fizycznej!' : 'SYSTEM GOTOWY - Kalibracja Metrologiczna OK'}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* OFFICIAL CERTIFICATE DOCUMENT CONTAINER */}
                    <div className="bg-white border-4 border-double border-slate-300 p-6 rounded-2xl shadow-inner relative overflow-hidden text-center space-y-4 font-mono select-text print-section">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-biofarm-cyan/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-biofarm-blue/5 rounded-full blur-2xl pointer-events-none" />

                      {/* Header */}
                      <div className="flex flex-col items-center border-b border-slate-200 pb-4">
                        <span className="text-[9px] tracking-widest text-[#00ca9a] font-bold uppercase border border-[#00ca9a]/30 px-2 py-0.5 rounded bg-[#00ca9a]/5">
                          ★ BIOFARM QUALITY ASSURANCE DEPT ★
                        </span>
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mt-2 flex items-center gap-1">
                          METRICAL CERTIFICATE OF CONFORMANCE
                        </h4>
                        <span className="text-[9px] text-slate-400 font-mono">
                          CERTYFIKAT SPRAWNOŚCI I KALIBRACJI OPRZYRZĄDOWANIA NR BF-{selectedHistoryTool.id}-2026
                        </span>
                      </div>

                      {/* Cert Specifications Map */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left text-slate-650 bg-slate-50 p-4 border border-slate-150 rounded-lg text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Model wyrobu:</span>
                          <strong className="text-slate-850 font-sans">{selectedHistoryTool.nazwaProduktu}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Standard głowicy:</span>
                          <strong className="text-slate-850 font-sans">{selectedHistoryTool.standardNarzedzi} ({selectedHistoryTool.narzedziaWielokrotne})</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Wewnętrzny ID partii:</span>
                          <strong className="text-slate-850 font-mono">{selectedHistoryTool.id}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Producent d.:</span>
                          <strong className="text-slate-850 font-sans">{selectedHistoryTool.dostawca}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Znakowanie / Grawer:</span>
                          <strong className="text-slate-850 font-mono font-bold text-[#0b4596]">"{selectedHistoryTool.znakowanie}"</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Chropowatość czoła stempli (okresowa):</span>
                          <strong className="text-slate-850 font-sans">Ra ≤ {certRa.toFixed(2)} µm ({certRa > 0.10 ? 'POZA SPECYFIKACJĄ' : 'ZGODNA'})</strong>
                        </div>
                      </div>

                      {/* Verification Table - REACTIVE TO OVERRIDES */}
                      <div className="space-y-1.5 text-left border border-slate-200 rounded-lg p-3 bg-white">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block border-b border-slate-100 pb-1 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          ZWERYFIKOWANE TOLERANCJE OPRZYRZĄDOWANIA (STABILITY PARAMETERS):
                        </span>

                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                            <span className="text-slate-500">Długość całkowita robocza stempli:</span>
                            <div className="flex gap-2">
                              <span className="text-slate-400 font-normal">norma: 133.60 ±0.05 mm</span>
                              <strong className={`${certDlugosc < 133.55 || certDlugosc > 133.65 ? 'text-rose-600 animate-pulse' : 'text-emerald-700'} font-bold`}>
                                {certDlugosc.toFixed(2)} mm ({certDlugosc < 133.55 || certDlugosc > 133.65 ? 'NIEZGODNY/FAIL' : 'ZGODNY'})
                              </strong>
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                            <span className="text-slate-500">Bicie promieniowe prowadzenia stempla:</span>
                            <div className="flex gap-2">
                              <span className="text-slate-400 font-normal">norma: &lt; 0.008 mm</span>
                              <strong className={`${certBicie > 0.008 ? 'text-rose-600 animate-pulse' : 'text-emerald-700'} font-bold`}>
                                {certBicie.toFixed(4)} mm ({certBicie > 0.008 ? 'NIEZGODNY/FAIL' : 'ZGODNY'})
                              </strong>
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                            <span className="text-slate-500">Chropowatość powierzchni roboczych (Ra):</span>
                            <div className="flex gap-2">
                              <span className="text-slate-400 font-normal">norma: &lt; 0.10 µm</span>
                              <strong className={`${certRa > 0.10 ? 'text-rose-600 animate-pulse' : 'text-emerald-700'} font-bold`}>
                                {certRa.toFixed(3)} µm ({certRa > 0.10 ? 'NIEZGODNY/FAIL' : 'ZGODNY'})
                              </strong>
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                            <span className="text-slate-400 font-normal">Odchyłka pasowania w gniazdach stemplarki:</span>
                            <div className="flex gap-2">
                              <span className="text-slate-400 font-normal">norma: &lt; 0.020 mm</span>
                              <strong className={`${certPasowanie > 0.020 ? 'text-rose-600 animate-pulse' : 'text-emerald-700'} font-bold`}>
                                {certPasowanie.toFixed(4)} mm ({certPasowanie > 0.020 ? 'NIEZGODNY/FAIL' : 'ZGODNY'})
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Validation Statement */}
                      <p className="text-[10px] leading-relaxed text-slate-500 text-left bg-emerald-50/50 border border-emerald-100 p-2.5 rounded">
                        Niniejszym poświadcza się, że wyżej opisany komplet stempli i matryc przeszedł kontrolę metrologiczna, mechaniczna i kwalifikację technologiczną zgodnie z zasadami Dobrej Praktyki Wytwarzania (GMP) Biofarm sp. z o.o. {certDlugosc < 133.55 || certDlugosc > 133.65 || certBicie > 0.008 || certRa > 0.10 || certPasowanie > 0.020 ? 'Uprzedzenie: Oprzyrządowanie wykazuje odkurcz/zużycie wykraczające poza progi błędu GMP i zostało tymczasowo ZABLOKOWANE.' : 'Narzędzia są wolne od zanieczyszczeń, spękań oraz wad powierzchniowych i są w pełni DOPUSZCZONE do produkcji farmaceutycznej.'}
                      </p>

                      {/* Signatures / CFR Part 11 Electronic signature stamp outcome */}
                      {isCertSigned ? (
                        <div className="pt-3 border-t-2 border-emerald-500 bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-250 text-left space-y-1.5 relative overflow-hidden">
                          {/* Absolute micro shadow pattern */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600 text-white font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm">
                            <ShieldCheck className="w-2.5 h-2.5" /> SECURE SEAL GMP
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                            <Fingerprint className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Dokument zatwierdzony cyfrowo (FDA 21 CFR Part 11 & Aneks 11)</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[9px] text-slate-600 font-mono">
                            <div>
                              <span>Sygnatariusz:</span> <strong className="text-slate-900">{signedOperatorName} (Zapewnienie Jakości QA)</strong>
                            </div>
                            <div>
                              <span>Czas złożenia podpisu:</span> <strong className="text-slate-900">{signedTimestamp}</strong>
                            </div>
                            <div>
                              <span>Cel autoryzacji:</span> <strong className="text-slate-900">{esigReason}</strong>
                            </div>
                            <div>
                              <span>Rodzaj poświadczenia:</span> <strong className="text-slate-900 text-emerald-700">Elektroniczna deklaracja zgodności</strong>
                            </div>
                            <div className="sm:col-span-2 text-[8px] text-slate-400 truncate border-t border-slate-200/50 pt-1 mt-1 font-mono">
                              <span>Skrót kryptograficzny sumy rekordu:</span> <code className="bg-slate-100 font-bold px-1.5 py-0.5 rounded text-emerald-700 font-mono">{signedHash}</code>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-150 grid grid-cols-2 text-[8px] text-slate-400 gap-4 text-center">
                          <div>
                            <span>Zatwierdził pod względem GMP</span>
                            <div className="border-b border-dashed border-slate-300 h-6 my-1" />
                            <strong className="text-slate-650 block uppercase font-bold text-[7px]">Dział Zapewnienia Jakości QA</strong>
                          </div>
                          <div>
                            <span>Wykonał pomiary metrologiczne</span>
                            <div className="border-b border-dashed border-slate-300 h-6 my-1" />
                            <strong className="text-slate-650 block uppercase font-bold text-[7px]">Technik Narzędziowni</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Printer and Signing triggers */}
                    <div className="flex justify-end gap-2 text-xs print:hidden">
                      <button
                        type="button"
                        onClick={() => {
                          window.print();
                        }}
                        className="px-4 py-2 bg-slate-850 hover:bg-slate-900 text-white font-mono font-bold text-[10px] uppercase rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm transition-all shadow-indigo-950/20"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Drukuj Certyfikat GMP
                      </button>
                      <button
                        type="button"
                        onClick={handleTriggerCertificateSignature}
                        disabled={isCertSigned}
                        className={`px-4 py-2 text-white font-mono font-bold text-[10px] uppercase rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm transition-all ${
                          isCertSigned 
                            ? 'bg-emerald-600 opacity-80 cursor-not-allowed' 
                            : 'bg-[#0b4596] hover:bg-[#1a5cb3]'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {isCertSigned ? '✓ Podpisano cyfrowo' : 'Podpisz i wyeksportuj PDF'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-450">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Autoryzowany system zarządzania oprzyrządowaniem Biofarm GMP</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryTool(null)}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Zamknij Okno
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 21 CFR PART 11 E-SIGNATURE SYSTEM MODAL Overlay */}
      <AnimatePresence>
        {showESigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-750 text-slate-100 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-indigo-950/50 flex flex-col font-mono text-left"
            >
              {/* Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-rose-500">
                  <Fingerprint className="w-5 h-5 text-emerald-450 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200 font-mono">
                    Autoryzacja Podpisu (FDA 21 CFR PART 11)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isSigningInProcess) setShowESigModal(false);
                  }}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress body */}
              {isSigningInProcess ? (
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-850 border-t-emerald-400 animate-spin" />
                    <Lock className="w-6 h-6 text-emerald-400 absolute animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-slate-100 uppercase tracking-widest animate-pulse">
                      Sealing GMP Electronic Ledger
                    </h5>
                    <p className="text-[9px] text-[#00ca9a] tracking-normal font-mono uppercase font-bold">
                      Wyznaczanie sumy kontrolnej SHA-152...
                    </p>
                    <p className="text-[8px] text-slate-500 font-mono">
                      Stemplowanie znacznikiem czasu NIST Biofarm-GMP2
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-4 text-xs font-sans">
                  {/* Warning label */}
                  <div className="bg-amber-950/30 border border-amber-900/35 p-3 rounded-lg text-amber-300 font-mono text-[9px] leading-relaxed flex gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase block mb-0.5 font-mono text-amber-400">OSTRZEŻENIE SYSTEMU AUTORYZACJI GMP:</span>
                      Niniejszy podpis składa cyfrową deklarację równoznaczną prawnie z odręcznym podpisem papierowym. Operacja zostanie trwale uwieczniona w niezmiennym Audit Trail.
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3 font-mono">
                    <div>
                      <label className="block text-[9px] text-slate-400 uppercase mb-1 font-bold">Identyfikator sygnatariusza (Login / ID):</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-slate-500">
                          <User className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="np. j.kowalski"
                          value={esigLogin}
                          onChange={(e) => setEsigLogin(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 pl-8 text-slate-100 focus:outline-none focus:border-slate-700 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 uppercase mb-1 font-bold">Kod PIN autoryzacji:</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-slate-500 text-slate-600">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="password"
                          placeholder="Wprowadź kod PIN (np. 1234)"
                          value={esigPin}
                          onChange={(e) => setEsigPin(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 pl-8 text-slate-100 focus:outline-none focus:border-slate-700 text-xs font-mono tracking-widest"
                        />
                      </div>
                      <span className="text-[8.5px] text-slate-450 block mt-1">
                        🔒 Wskazówka: Domyślny PIN autoryzacji systemowej do testów to <strong className="text-emerald-400 font-bold">1234</strong>
                      </span>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 uppercase mb-1 font-bold">Deklarowany powód podpisu (GMP Dictionary):</label>
                      <select
                        value={esigReason}
                        onChange={(e) => setEsigReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-100 text-[10.5px] cursor-pointer outline-none focus:border-slate-755 font-sans"
                      >
                        {signatureReasons.map((reason, idx) => (
                          <option key={idx} value={reason} className="bg-slate-900 font-sans">
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>

                    {pinError && (
                      <p className="text-[9.5px] text-rose-400 animate-pulse bg-rose-955/20 border border-rose-900 p-2 rounded-md font-sans">
                        ⚠️ {pinError}
                      </p>
                    )}
                  </div>

                  {/* Footer buttons */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-850 font-mono">
                    <button
                      type="button"
                      onClick={() => setShowESigModal(false)}
                      className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded cursor-pointer text-[10px]"
                    >
                      Zrezygnuj
                    </button>
                    <button
                      type="button"
                      onClick={handleSignConfirm}
                      className="px-5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded cursor-pointer text-[10px]"
                    >
                      ✓ Autoryzuj Podpis
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
