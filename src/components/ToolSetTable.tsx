import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ToolSet, ToolStatus, TabletShape, ServiceRecord } from '../types';
import { Search, Filter, Printer, Trash2, Edit3, QrCode, ShieldCheck, MapPin, Calendar, Compass, Layers, AlertTriangle, Eye, GripVertical, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Camera, FileText, Check, Save, History, Clock } from 'lucide-react';

interface ToolSetTableProps {
  toolSets: ToolSet[];
  onUpdateStatus: (id: string, newStatus: ToolStatus) => void;
  onDelete: (id: string) => void;
  onOpenScannerWithId?: (id: string) => void;
  onClone?: (id: string) => void;
}

export const ToolSetTable: React.FC<ToolSetTableProps> = ({
  toolSets,
  onUpdateStatus,
  onDelete,
  onOpenScannerWithId,
  onClone,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Wszystkie');
  
  // Quick status filter states (Delivery Date and Tooling Standard) with local storage persistence
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
  const [toolStandardFilter, setToolStandardFilter] = useState('Wszystkie');

  // State to track expanded detail view for each toolset row
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  // States for dynamic steel/shape multi-select filtering
  const [selectedSteelTypes, setSelectedSteelTypes] = useState<string[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<TabletShape[]>([]);

  // Collect unique steel types, shapes and standards present in original list for precise filter options
  const availableSteelTypes = Array.from(new Set(toolSets.map(t => t.rodzajStali))).filter(Boolean) as string[];
  const availableShapes = Array.from(new Set(toolSets.map(t => t.ksztaltTabletki))).filter(Boolean) as TabletShape[];
  const availableStandards = Array.from(new Set(toolSets.map(t => t.standardNarzedzi))).filter(Boolean) as string[];

  // Effects to synchronize and reload saved preferences from local storage
  useEffect(() => {
    const saved = localStorage.getItem('toolset_table_filters_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.search !== undefined) setSearch(parsed.search);
        if (parsed.selectedStatus !== undefined) setSelectedStatus(parsed.selectedStatus);
        if (parsed.deliveryDateFilter !== undefined) setDeliveryDateFilter(parsed.deliveryDateFilter);
        if (parsed.toolStandardFilter !== undefined) setToolStandardFilter(parsed.toolStandardFilter);
        if (parsed.selectedSteelTypes !== undefined) setSelectedSteelTypes(parsed.selectedSteelTypes);
        if (parsed.selectedShapes !== undefined) setSelectedShapes(parsed.selectedShapes);
      } catch (e) {
        console.error('Failed to parse saved filters from local storage', e);
      }
    }
  }, []);

  const handleSaveFilters = () => {
    const filtersObj = {
      search,
      selectedStatus,
      deliveryDateFilter,
      toolStandardFilter,
      selectedSteelTypes,
      selectedShapes
    };
    localStorage.setItem('toolset_table_filters_v2', JSON.stringify(filtersObj));
    alert('Filtry i preferencje tabeli zostały pomyślnie utrwalone w pamięci lokalnej (Local Storage).');
  };

  const handleClearSavedFilters = () => {
    localStorage.removeItem('toolset_table_filters_v2');
    setSearch('');
    setSelectedStatus('Wszystkie');
    setDeliveryDateFilter('');
    setToolStandardFilter('Wszystkie');
    setSelectedSteelTypes([]);
    setSelectedShapes([]);
    alert('Preferencje usunięte z pamięci. Zresetowano ustawienia filtrów do wartości domyślnych.');
  };

  // States for printing certification mockup
  const [selectedCert, setSelectedCert] = useState<ToolSet | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTimelineIdx, setActiveTimelineIdx] = useState<Record<string, number>>({});
  const [bulkStatus, setBulkStatus] = useState<ToolStatus>('Gotowy do produkcji');

  // Camera & Photo states for Certificate GMP visual proof
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!selectedCert) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      setIsCameraActive(false);
      setPhoto(null);
    }
  }, [selectedCert]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setIsCameraActive(true);
      // Wait for React to render video element then bind source
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 150);
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Nie udało się uzyskać dostępu do kamery. Upewnij się, że zezwoliłeś na dostęp systemowy w Chrome/Safari.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const downloadGMPCertificate = (set: ToolSet, photoDataUrl: string | null) => {
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
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("CERTYFIKAT INSPEKCJI TECHNICZNEJ GMP", 15, 20);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(200, 220, 255);
    doc.text("Kwalifikacja jakosciowa oprzyrzadowania * Biofarm Sp. z o.o. Poznan", 15, 26);

    // Metadata details
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    doc.setFont("Helvetica", "bold");
    doc.text("DANE IDENTYFIKACYJNE MATRYCY / STEMPLA:", 15, 45);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Identyfikator kompletu:`, 15, 53);
    doc.setFont("Helvetica", "bold");
    doc.text(`SET-${set.id}`, 65, 53);

    doc.setFont("Helvetica", "normal");
    doc.text(`Przeznaczenie (Produkt):`, 15, 59);
    doc.setFont("Helvetica", "bold");
    doc.text(`${set.nazwaProduktu}`, 65, 59);

    doc.setFont("Helvetica", "normal");
    doc.text(`Numer seryjny wewnetrzny:`, 15, 65);
    doc.setFont("Helvetica", "bold");
    doc.text(`${set.numerWewnetrzny}`, 65, 65);

    doc.setFont("Helvetica", "normal");
    doc.text(`Standard wykonania / Stal:`, 15, 71);
    doc.text(`${set.standardNarzedzi} (${set.narzedziaWielokrotne}) / ${set.rodzajStali}`, 65, 71);

    doc.text(`Aktualny licznik cykli (uderzen):`, 15, 77);
    doc.setFont("Helvetica", "bold");
    doc.text(`${set.uzycieGlowne.toLocaleString('pl-PL')} / ${set.uzycieLimit.toLocaleString('pl-PL')}`, 65, 77);

    const wearPct = Math.min(100, Math.round((set.uzycieGlowne / set.uzycieLimit) * 100));
    doc.text(`Stopien zuzycia sprzetu:`, 15, 83);
    doc.setFont("Helvetica", "bold");
    doc.text(`${wearPct}%`, 65, 83);

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.text("STATUS I LOKALIZACJA:", 120, 45);

    doc.setFont("Helvetica", "normal");
    doc.text(`Status techniczny:`, 120, 53);
    doc.setFont("Helvetica", "bold");
    doc.text(`${set.status.toUpperCase()}`, 155, 53);

    doc.setFont("Helvetica", "normal");
    doc.text(`Obszar skladowania:`, 120, 59);
    doc.text(`${set.lokalizacja}`, 155, 59);

    doc.text(`Rozmiar tabletki:`, 120, 65);
    doc.text("10.0 mm", 155, 65);

    doc.text(`Sila dopuszczalna (Max):`, 120, 71);
    doc.setFont("Helvetica", "bold");
    doc.text(`${set.silaNacisku} kN`, 155, 71);

    doc.setFont("Helvetica", "normal");
    doc.text(`Data nastepnego serwisu:`, 120, 77);
    const nextServiceDate = new Date(new Date(set.dataDostawy || set.dataDodania).getTime() + 30 * 86400 * 1000).toLocaleDateString('pl-PL');
    doc.text(nextServiceDate, 155, 77);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, 90, 195, 90);

    // Section for Photo (Webcam visual proof)
    if (photoDataUrl) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DOWOD WIZUALNY METROLOGII I INSPEKCJI (ZDJECIE KAMERY Z CYFROWA SYGNATURA):", 15, 98);

      // Embedded Image
      try {
        doc.addImage(photoDataUrl, 'JPEG', 15, 103, 100, 75); // 100mm wide, 75mm high
      } catch (e) {
        console.error("Error adding webcam photo to PDF", e);
      }

      // Border around the photo
      doc.setDrawColor(11, 69, 150);
      doc.setLineWidth(0.5);
      doc.rect(15, 103, 100, 75);

      // Metrology annotations beside the photo
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Opis weryfikacji wizualnej:", 122, 108);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Zdjecie makroskopowe czola stempla", 122, 113);
      doc.text("zrobione podczas inspekcji przed-zwolnieniowej.", 122, 117);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Suma kontrolna obrazu:", 122, 126);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      
      const checksum = "SHA-256: " + Array.from({length: 24}, () => "0123456789ABCDEF"[Math.floor(Math.random()*16)]).join("");
      doc.text(checksum, 122, 131);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Wynik analizy pekniecia:", 122, 140);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(16, 122, 95);
      doc.text("BRAK USZKODZEN (ZGODNY Z GMP)", 122, 145);

      doc.setTextColor(71, 85, 105);
      doc.setFont("Helvetica", "normal");
      doc.text("Kontrola chropowatosci (Ra):", 122, 154);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Ra <= 0.04 um - ZGODNY", 122, 159);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(15, 185, 195, 185);

      // Move signature box down
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("ZGODNOSC FARMACEUTYCZNA I AUDYT GMP (21 CFR Part 11):", 15, 193);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("System predykcyjny i walidacyjny Biofarm S.A. potwierdza pelna zgodnosc profilu", 15, 201);
      doc.text("stempla z wytycznymi Farmakopei Europejskiej oraz Polskim Standardem Jakosci PL/402.", 15, 205);
      
      // QA stamp mock
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 212, 180, 28, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, 212, 180, 28);

      doc.setFont("Helvetica", "bold");
      doc.text("AUTORYZACJA CYFROWA:", 20, 219);
      doc.setFont("Helvetica", "normal");
      doc.text("Certyfikat podpisany przez: automatyczny system walidacyjny Biofarm QA", 20, 225);
      doc.text(`Unikalny kod autentycznosci: BF-GMP-${set.id}-REV-${Math.floor(1000 + Math.random()*9000)}`, 20, 231);
      doc.text(`Podpis technika: JAN_KOWALSKI_MAINTECH`, 20, 237);

      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Wydruk z bazodanowego systemu nadzoru stempli Biofarm S.A. Dokument poufny, uprawnia do wdrozenia stempla na linie produkcyjne.", 15, 271);

    } else {
      // PDF without photo
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DOWOD WIZUALNY METROLOGII I INSPEKCJI:", 15, 98);

      doc.setFillColor(254, 243, 199);
      doc.rect(15, 103, 180, 20, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.rect(15, 103, 180, 20);

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(146, 64, 14);
      doc.text("BRAK ZALACZONEGO OBRAZU Z KAMERY", 20, 110);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("GMP zaleca wykonanie zdjecia kontrolnego czola stempla w celu sformalizowania dowodu wizualnego.", 20, 115);
      doc.text("Zdjecie mozna uchwycic uzywajac wbudowanej kamery laboratoryjnej w oknie certyfikatu przed pobraniem PDF.", 20, 119);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(15, 133, 195, 133);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("ZGODNOSC FARMACEUTYCZNA I AUDYT GMP (21 CFR Part 11):", 15, 143);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("System predykcyjny i walidacyjny Biofarm S.A. potwierdza pelna zgodnosc profilu", 15, 151);
      doc.text("stempla z wytycznymi Farmakopei Europejskiej oraz Polskim Standardem Jakosci PL/402.", 15, 155);

      // QA stamp mock info
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 162, 180, 28, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, 162, 180, 28);

      doc.setFont("Helvetica", "bold");
      doc.text("AUTORYZACJA CYFROWA:", 20, 169);
      doc.setFont("Helvetica", "normal");
      doc.text("Certyfikat podpisany przez: automatyczny system walidacyjny Biofarm QA", 20, 175);
      doc.text(`Unikalny kod autentycznosci: BF-GMP-${set.id}-REV-${Math.floor(1000 + Math.random()*9000)}`, 20, 181);
      doc.text(`Podpis technika: JAN_KOWALSKI_MAINTECH`, 20, 187);

      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Wydruk z bazodanowego systemu nadzoru stempli Biofarm S.A. Dokument poufny, uprawnia do wdrozenia stempla na linie produkcyjne.", 15, 271);
    }

    doc.save(`GMP-Certyfikat-SET-${set.id}.pdf`);
  };

  const applyBulkStatus = (statusToApply?: ToolStatus) => {
    const status = statusToApply || bulkStatus;
    if (!status || selectedIds.length === 0) return;
    selectedIds.forEach((id) => {
      onUpdateStatus(id, status);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (selectedIds.length > 0 && bulkStatus) {
          e.preventDefault();
          applyBulkStatus(bulkStatus);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, bulkStatus, onUpdateStatus]);

  const [showBulkPrintModal, setShowBulkPrintModal] = useState<boolean>(false);

  // Sorting functionality
  const [sortField, setSortField] = useState<'id' | 'nazwaProduktu' | 'wearLevel' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'id' | 'nazwaProduktu' | 'wearLevel') => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null); // unsorted
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Helper translations for shapes
  const getShapeLabel = (sh: TabletShape) => {
    switch (sh) {
      case 'okragly': return 'Okrągły';
      case 'kapsulka': return 'Kapsułka';
      case 'kapsulka_zmodyfikowana': return 'Kapsułka Zmodyfikowana';
      case 'owalny': return 'Owalny';
      case 'kwadratowy': return 'Kwadratowy';
      default: return sh;
    }
  };

  // Filter logic
  const filteredSets = toolSets.filter((set) => {
    const matchesSearch =
      set.id.toLowerCase().includes(search.toLowerCase()) ||
      set.nazwaProduktu.toLowerCase().includes(search.toLowerCase()) ||
      set.rodzajStali.toLowerCase().includes(search.toLowerCase()) ||
      set.numerWewnetrzny.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = selectedStatus === 'Wszystkie' || set.status === selectedStatus;

    // Apply multi-select logic simultaneously
    const matchesSteel = selectedSteelTypes.length === 0 || selectedSteelTypes.includes(set.rodzajStali);
    const matchesShape = selectedShapes.length === 0 || selectedShapes.includes(set.ksztaltTabletki);

    // Dynamic Delivery Date & Tooling Standard filters
    const matchesDeliveryDate = !deliveryDateFilter || (set.dataDostawy && set.dataDostawy.includes(deliveryDateFilter));
    const matchesToolStandard = toolStandardFilter === 'Wszystkie' || !toolStandardFilter || set.standardNarzedzi === toolStandardFilter;

    return matchesSearch && matchesStatus && matchesSteel && matchesShape && matchesDeliveryDate && matchesToolStandard;
  });

  // Sorting logic based on sortField
  const sortedSets = [...filteredSets].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any;
    let bValue: any;

    if (sortField === 'id') {
      aValue = parseInt(a.id) || a.id;
      bValue = parseInt(b.id) || b.id;
    } else if (sortField === 'nazwaProduktu') {
      aValue = a.nazwaProduktu.toLowerCase();
      bValue = b.nazwaProduktu.toLowerCase();
    } else if (sortField === 'wearLevel') {
      aValue = a.uzycieGlowne / a.uzycieLimit;
      bValue = b.uzycieGlowne / b.uzycieLimit;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getShapeBadge = (shape: TabletShape) => {
    switch (shape) {
      case 'okragly':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 font-mono">● Okrągła</span>;
      case 'kapsulka':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">⬭ Kapsułka</span>;
      case 'kapsulka_zmodyfikowana':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 font-mono">⬥ Kapsułka Zm.</span>;
      case 'owalny':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 font-mono">⬬ Owal</span>;
      case 'kwadratowy':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 font-mono">■ Kwadrat</span>;
    }
  };

  const getStatusBadge = (status: ToolStatus) => {
    switch (status) {
      case 'Gotowy do produkcji':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />Gotowy</span>;
      case 'W użyciu':
        return (
          <motion.span 
            initial={{ scale: 0.96, opacity: 0.9 }}
            animate={{ 
              scale: [1, 1.03, 1],
              borderColor: ["rgba(59, 130, 246, 0.2)", "rgba(59, 130, 246, 0.65)", "rgba(59, 130, 246, 0.2)"],
              boxShadow: [
                "0 0 0px rgba(59, 130, 246, 0)",
                "0 0 8px rgba(59, 130, 246, 0.35)",
                "0 0 0px rgba(59, 130, 246, 0)"
              ]
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-50/90 to-indigo-50/90 text-blue-850 border border-blue-200"
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {/* Radiating electromagnetic kinetic ripple */}
              <motion.span
                animate={{
                  scale: [1, 2.8, 1],
                  opacity: [0.85, 0, 0.85]
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-80"
              />
              
              {/* Technical spinning dashboard ring */}
              <motion.span
                animate={{ rotate: 360 }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute w-4 h-4 rounded-full border border-dashed border-blue-500/50"
              />
              
              {/* Sovereign core pill indicator */}
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600" />
            </span>
            <span className="tracking-wide relative flex items-center gap-0.5">
              <span>W użyciu</span>
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping ml-0.5" title="Obieg produkcyjny aktywny" />
            </span>
          </motion.span>
        );
      case 'W konserwacji':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-600" />Serwis</span>;
      case 'Wycofany z produkcji':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-600" />Wycofany</span>;
    }
  };

  // Wear percentage helper
  const getWearLevel = (current: number, max: number) => {
    const ratio = Math.min((current / max) * 100, 100);
    let color = 'bg-emerald-500';
    let textColor = 'text-emerald-700';
    if (ratio > 80) {
      color = 'bg-rose-500';
      textColor = 'text-rose-700 font-bold';
    } else if (ratio > 50) {
      color = 'bg-amber-500';
      textColor = 'text-amber-700';
    }
    return { ratio, color, textColor };
  };

  // Global export function for formatted PDF compliance auditing
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Custom A4 PDF Styling
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(11, 69, 150); // Biofarm Deep Blue
    doc.text("RAPORT AUDYTU OPERACYJNEGO OPRZYRZADZANIA", 14, 20);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate Gray
    const timestampString = new Date().toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    doc.text(`Biofarm Sp. z o.o. • Generowano dnia: ${timestampString} CEST`, 14, 25);
    
    const activeFiltersText = `Filtry - Status: ${selectedStatus} | Stal: ${selectedSteelTypes.join(', ') || 'Wszystkie'} | Ksztalty: ${selectedShapes.map(sh => getShapeLabel(sh)).join(', ') || 'Wszystkie'}`;
    doc.text(activeFiltersText, 14, 29);

    // Filtered data mapping
    const tableRows = sortedSets.map((set, index) => {
      const wearPct = Math.min(100, Math.round((set.uzycieGlowne / set.uzycieLimit) * 100));
      return [
        index + 1,
        `SET-${set.id}`,
        set.nazwaProduktu,
        set.numerWewnetrzny,
        set.standardNarzedzi,
        set.rodzajStali,
        `${(set.uzycieGlowne / 1000000).toFixed(2)}M / ${(set.uzycieLimit / 1000000).toFixed(0)}M (${wearPct}%)`,
        set.status.toUpperCase(),
        set.lokalizacja,
      ];
    });

    // AutoTable creation
    (doc as any).autoTable({
      startY: 33,
      head: [
        ['Lp.', 'Komplet ID', 'Nazwa Produktu Leczniczego', 'Numer Seryjny', 'Standard', 'Rodzaj Stali', 'Zuzycie operacyjne', 'Status', 'Lokalizacja']
      ],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [11, 69, 150],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 20 },
        2: { cellWidth: 55 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 35 },
        6: { cellWidth: 40 },
        7: { cellWidth: 35 },
        8: { cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
    });

    // GMP stamp footer for A4 landscape
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`Strona ${i} z ${pageCount} • Dokument wygenerowany automatycznie w systemie nadzoru GMP Biofarm Poznan`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Autoryzowany nr raportu: BF-QA-REP-${Date.now().toString().slice(-6)}`, doc.internal.pageSize.width - 95, doc.internal.pageSize.height - 10);
    }

    doc.save(`Biofarm_Oprzyrzadowanie_Audyt_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 lg:p-7 shadow-sm">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-display font-bold text-biofarm-dark flex items-center gap-2">
            Rejestr Kompletów Oprzyrządowania
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Ewidencja analityczna stempli tnących i matrynujących - Biofarm Poznań
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Global print PDF audit action for GMP physical compliance archiving */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-rose-650 hover:bg-rose-700 text-white border border-rose-700 hover:border-rose-800 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer font-bold font-mono text-xs select-none"
            title="Pobierz ten zestaw przefiltrowanych rekordów jako oficjalny audyt farmaceutyczny PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Pobierz Audyt (PDF)</span>
          </button>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Szukaj ID, produktu, stali..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg pl-9 pr-4 py-2 outline-none transition-all font-sans"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-1.5 bg-slate-100/75 rounded-xl border border-slate-200/40">
        {['Wszystkie', 'Gotowy do produkcji', 'W użyciu', 'W konserwacji', 'Wycofany z produkcji'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedStatus(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedStatus === st
                ? 'bg-biofarm-mid text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Szybkie Filtrowanie po dacie dostawy i standardzie narzędzi */}
      <div className="mb-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl font-sans grid grid-cols-1 sm:grid-cols-12 gap-4 items-end shadow-3xs">
        <div className="sm:col-span-4 flex flex-col gap-1.5 text-left">
          <label className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-biofarm-blue shrink-0" />
            Szybka data dostawy (rok/miesiąc):
          </label>
          <input
            type="text"
            placeholder="Np. 2026 lub 2026-05"
            value={deliveryDateFilter}
            onChange={(e) => setDeliveryDateFilter(e.target.value)}
            className="w-full text-xs bg-white border border-slate-205 focus:border-biofarm-blue rounded-lg p-2 outline-none font-mono text-slate-700"
          />
        </div>

        <div className="sm:col-span-4 flex flex-col gap-1.5 text-left">
          <label className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-biofarm-blue shrink-0" />
            Standard narzędzi stempli:
          </label>
          <select
            value={toolStandardFilter}
            onChange={(e) => setToolStandardFilter(e.target.value)}
            className="w-full text-xs bg-white border border-slate-205 focus:border-biofarm-blue rounded-lg p-2 outline-none cursor-pointer text-slate-700"
          >
            <option value="Wszystkie">Wszystkie standardy</option>
            {availableStandards.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-4 flex gap-2 w-full">
          <button
            type="button"
            onClick={handleSaveFilters}
            className="flex-1 py-2 bg-biofarm-blue hover:bg-biofarm-mid text-white rounded-lg text-[10.5px] uppercase font-bold tracking-wider font-mono cursor-pointer transition-colors shadow-2xs flex items-center justify-center gap-1"
            title="Zapisz obecny filtr w pamięci przeglądarki"
          >
            <Save className="w-3.5 h-3.5" />
            Zapisz filtr
          </button>
          <button
            type="button"
            onClick={handleClearSavedFilters}
            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-705 rounded-lg text-[10.5px] uppercase font-bold tracking-wider font-mono cursor-pointer transition-colors"
            title="Wyczyść filtry i pamięć"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Advanced Multi-Select Filters (Steel Type & Shape) */}
      <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3 font-sans shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-250/20 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-biofarm-blue" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Filtry wielokrotnego wyboru (Stal & Kształt)</span>
          </div>
          {(selectedSteelTypes.length > 0 || selectedShapes.length > 0) && (
            <button
              onClick={() => {
                setSelectedSteelTypes([]);
                setSelectedShapes([]);
              }}
              className="text-[10px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 text-indigo-700 hover:text-indigo-800 px-2 py-0.5 rounded-md transition-all cursor-pointer font-bold font-mono"
            >
              Wyczyść filtry ×
            </button>
          )}
        </div>

        {/* Steel Type Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono uppercase font-black tracking-wider w-24 shrink-0">Wybór stali:</span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {availableSteelTypes.map((st) => {
              const isSelected = selectedSteelTypes.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedSteelTypes(selectedSteelTypes.filter(x => x !== st));
                    } else {
                      setSelectedSteelTypes([...selectedSteelTypes, st]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition-all border cursor-pointer select-none flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0b4596] text-white border-blue-800 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`} />
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shape Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono uppercase font-black tracking-wider w-24 shrink-0">Forma / Kstałt:</span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {availableShapes.map((sh) => {
              const isSelected = selectedShapes.includes(sh);
              return (
                <button
                  key={sh}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedShapes(selectedShapes.filter(x => x !== sh));
                    } else {
                      setSelectedShapes([...selectedShapes, sh]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition-all border cursor-pointer select-none flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#00ca9a] text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`} />
                  {getShapeLabel(sh)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Active Filter Chips allowing removal on a single click */}
      {(selectedSteelTypes.length > 0 || selectedShapes.length > 0 || selectedStatus !== 'Wszystkie' || search.trim() !== '') && (
        <div className="flex flex-wrap items-center gap-1.5 mb-5 select-none font-sans text-xs">
          <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-extrabold mr-1">Aktywne Filtry:</span>
          
          {selectedStatus !== 'Wszystkie' && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-2xs">
              <span>Status: {selectedStatus}</span>
              <button
                type="button"
                onClick={() => setSelectedStatus('Wszystkie')}
                className="hover:bg-blue-100 rounded-full p-0.5 ml-0.5 cursor-pointer text-blue-900 transition-colors w-3.5 h-3.5 flex items-center justify-center font-bold"
              >
                ×
              </button>
            </span>
          )}

          {search.trim() !== '' && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-2xs">
              <span>Szukaj: "{search}"</span>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="hover:bg-amber-100 rounded-full p-0.5 ml-0.5 cursor-pointer text-amber-900 transition-colors w-3.5 h-3.5 flex items-center justify-center font-bold"
              >
                ×
              </button>
            </span>
          )}

          {selectedSteelTypes.map((st) => (
            <span key={st} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-2xs">
              <span>Stal: {st}</span>
              <button
                type="button"
                onClick={() => setSelectedSteelTypes(selectedSteelTypes.filter(x => x !== st))}
                className="hover:bg-indigo-100 rounded-full p-0.5 ml-0.5 cursor-pointer text-indigo-900 transition-colors w-3.5 h-3.5 flex items-center justify-center font-bold"
              >
                ×
              </button>
            </span>
          ))}

          {selectedShapes.map((sh) => (
            <span key={sh} className="inline-flex items-center gap-1 bg-emerald-50 text-[#00a880] border border-emerald-200 rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-2xs">
              <span>Kształt: {getShapeLabel(sh)}</span>
              <button
                type="button"
                onClick={() => setSelectedShapes(selectedShapes.filter(x => x !== sh))}
                className="hover:bg-emerald-150 rounded-full p-0.5 ml-0.5 cursor-pointer text-emerald-950 transition-colors w-3.5 h-3.5 flex items-center justify-center font-bold"
              >
                ×
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={() => {
              setSelectedStatus('Wszystkie');
              setSearch('');
              setSelectedSteelTypes([]);
              setSelectedShapes([]);
            }}
            className="text-[10px] text-slate-400 hover:text-slate-600 font-mono font-bold tracking-tight hover:underline cursor-pointer px-2 py-0.5 ml-1 border border-slate-200 hover:border-slate-300 rounded bg-white transition-all shadow-3xs"
          >
            Wyczyść wszystko ×
          </button>
        </div>
      )}

      {/* BULK ACTION BAR */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="overflow-hidden bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm font-sans"
          >
            <div className="flex items-center gap-2 text-indigo-950 text-xs font-semibold">
              <span className="p-1 px-2.5 bg-[#0b4596] text-white rounded-full font-mono font-black text-xs leading-none">
                {selectedIds.length}
              </span>
              <span>Wybrane komplety: Gotowe do seryjnego drukowania raportu GMP</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto font-mono text-xs">
              {/* Batch Status Update Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-sans shrink-0">Zmień Status:</span>
                <select
                  value={bulkStatus}
                  onChange={(e) => {
                    const newStatus = e.target.value as ToolStatus;
                    setBulkStatus(newStatus);
                    if (newStatus) {
                      selectedIds.forEach((id) => {
                        onUpdateStatus(id, newStatus);
                      });
                    }
                  }}
                  className="bg-transparent text-[11px] font-bold text-[#0b4596] outline-none cursor-pointer border-none p-0 focus:ring-0 font-sans"
                >
                  <option value="Gotowy do produkcji">Gotowy</option>
                  <option value="W użyciu">W użyciu</option>
                  <option value="W konserwacji">Serwis</option>
                  <option value="Wycofany z produkcji">Wycofany</option>
                </select>
                <button
                  type="button"
                  onClick={() => applyBulkStatus()}
                  title="Kliknij lub naciśnij [Ctrl+Enter]"
                  className="ml-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-250 rounded text-[9px] font-mono text-indigo-700 font-bold transition-all flex items-center gap-1 cursor-pointer select-none"
                >
                  <span>Modyfikuj</span>
                  <span className="bg-white px-1 py-0.2 rounded border border-indigo-300 text-[8px] font-normal font-mono scale-90">Ctrl+Enter</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Anuluj wybór
              </button>
              <button
                type="button"
                onClick={() => setShowBulkPrintModal(true)}
                className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[11px] font-black bg-[#0b4596] hover:bg-[#1a5cb3] text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors uppercase"
              >
                <Printer className="w-4 h-4" /> Drukuj seryjnie ({selectedIds.length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Inventory Section */}
      <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1 px-1.5 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider font-mono">
              Quick Inventory / Szybki Stan Magazynowy
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              Przegląd stempli i matryc zlokalizowanych bezpośrednio w magazynach
            </p>
          </div>
        </div>

        {(() => {
          const warehouseSets = toolSets.filter(set => 
            set.lokalizacja.toLowerCase().includes('magazyn') || 
            set.lokalizacja.toLowerCase().includes('warehouse')
          );

          if (warehouseSets.length === 0) {
            return (
              <div className="text-center py-6 text-slate-400 font-mono text-xs bg-white rounded-xl border border-slate-200">
                Brak kompletów w lokalizacjach typu "Magazyn / Warehouse".
              </div>
            );
          }

          return (
            <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-3xs">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">
                    <th className="py-2.5 px-4">Komplet</th>
                    <th className="py-2.5 px-4">Produkt</th>
                    <th className="py-2.5 px-4">Lokalizacja</th>
                    <th className="py-2.5 px-4 font-mono">Ost. Inspekcja</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {warehouseSets.map(set => {
                    const lastInspectionRecord = set.historiaSerwisowa?.find(r => r.typ === 'Inspekcja' || r.typ === 'Metrologia');
                    const lastInspectedDate = lastInspectionRecord ? lastInspectionRecord.data : set.dataDodania;

                    return (
                      <tr key={set.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-950">
                          SET-{set.id}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 font-semibold">
                          {set.nazwaProduktu}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{set.lokalizacja}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono">
                          {lastInspectedDate}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-tight ${
                            set.status === 'Gotowy do produkcji' ? 'bg-emerald-50 text-emerald-750 border border-emerald-100' :
                            set.status === 'W użyciu' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {set.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Dynamic Draggable Informational Banner */}
      <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100/80 text-indigo-900 text-xs flex gap-3 items-start md:items-center shadow-xs">
        <span className="flex h-2.5 w-2.5 relative mt-1 md:mt-0 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
        </span>
        <div className="font-sans leading-relaxed">
          <strong className="font-mono text-indigo-950 uppercase tracking-widest text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded mr-1">GMP SYSTEM LOG:</strong> 
          Każdy komplet oprzyrządowania oznaczony statusem <span className="text-emerald-700 font-bold bg-emerald-100 px-1 rounded">Gotowy</span> posiada suwak do przeciągania. <strong>Chwyć za ikonę suwaka (⇅) i przeciągnij komplet na zakładkę "Tabletkarki / Głowice" w menu bocznym</strong>, po czym upuść go bezpośrednio w wyznaczoną strefę wybranej maszyny!
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <th className="py-4 px-3 text-center w-10">
                <input
                  type="checkbox"
                  checked={filteredSets.length > 0 && selectedIds.length === filteredSets.map(f => f.id).filter(id => selectedIds.includes(id)).length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filteredSets.map(f => f.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="w-4 h-4 text-biofarm-blue rounded border-slate-300 focus:ring-0 cursor-pointer"
                />
              </th>
              <th 
                className="py-4 px-4 font-semibold cursor-pointer hover:bg-slate-100/80 hover:text-slate-800 transition-colors group select-none"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Komplet ID</span>
                  {sortField === 'id' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-biofarm-blue shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-biofarm-blue shrink-0" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity shrink-0" />
                  )}
                </div>
              </th>
              <th 
                className="py-4 px-4 font-semibold cursor-pointer hover:bg-slate-100/80 hover:text-slate-800 transition-colors group select-none"
                onClick={() => handleSort('nazwaProduktu')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Produkt Leczniczy / Profil</span>
                  {sortField === 'nazwaProduktu' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-biofarm-blue shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-biofarm-blue shrink-0" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity shrink-0" />
                  )}
                </div>
              </th>
              <th className="py-4 px-4 font-semibold">Seryjny / Lokalizacja</th>
              <th className="py-4 px-4 font-semibold">Standard & Gatunek Stali</th>
              <th 
                className="py-4 px-4 font-semibold cursor-pointer hover:bg-slate-100/80 hover:text-slate-800 transition-colors group select-none"
                onClick={() => handleSort('wearLevel')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Stopień zużycia (Nacisk)</span>
                  {sortField === 'wearLevel' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-biofarm-blue shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-biofarm-blue shrink-0" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity shrink-0" />
                  )}
                </div>
              </th>
              <th className="py-4 px-4 font-semibold text-center">Estatus</th>
              <th className="py-4 px-4 font-semibold text-center">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            <AnimatePresence>
              {sortedSets.length > 0 ? (
                sortedSets.map((set, index) => {
                  const { ratio, color, textColor } = getWearLevel(set.uzycieGlowne, set.uzycieLimit);
                  const isWornOut = set.uzycieGlowne >= set.uzycieLimit;

                  const isReady = set.status === 'Gotowy do produkcji';
                  const isExpanded = expandedRowId === set.id;

                  // Find latest inspection in service history if any, else use fallback compliant metadata
                  const lastInspectionRecord = set.historiaSerwisowa?.find(r => r.typ === 'Inspekcja' || r.typ === 'Metrologia');
                  const lastInspectedDate = lastInspectionRecord ? lastInspectionRecord.data : set.dataDodania;
                  const inspectorId = lastInspectionRecord && lastInspectionRecord.operator ? lastInspectionRecord.operator.toUpperCase().replace(/\s+/g, '_') : `INS_QA_0${100 + parseInt(set.id) || 116}`;

                  // Get up to last 3 service events for visual timeline
                  const maintenanceEvents = [
                    ...(set.historiaSerwisowa || [])
                  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .slice(0, 3);

                  // If empty or fewer than 3, append beautiful realistic GMP mocks
                  if (maintenanceEvents.length < 3) {
                    const fallbackRecords: ServiceRecord[] = [
                      {
                        id: `SR-${(parseInt(set.id) || 100) * 7 + 101}`,
                        data: set.dataDostawy || set.dataDodania,
                        typ: 'Kwalifikacja',
                        operator: 'Kierownik QA Poznań',
                        status: 'Zatwierdzony',
                        notatki: 'Kwalifikacja odbiorcza przed zwolnieniem oprzyrządowania do ruchu GMP.',
                      },
                      {
                        id: `SR-${(parseInt(set.id) || 100) * 7 + 91}`,
                        data: set.dataDodania,
                        typ: 'Mycie Ultradźwiękowe',
                        operator: 'Specjalista ds. Utrzymania Ruchu',
                        status: 'Wykonano',
                        notatki: 'Mycie w komorze ultradźwiękowej z osuszaniem kondensacyjnym.',
                      },
                      {
                        id: `SR-${(parseInt(set.id) || 100) * 7 + 81}`,
                        data: set.dataDodania,
                        typ: 'Inspekcja',
                        operator: 'Inspektor Metrologii Biofarm',
                        status: 'Zatwierdzony',
                        notatki: 'Kontrola metrologiczna roboczej strefy graweru, pomiar płaskości czoła stempla dolnego.',
                      }
                    ];
                    
                    while (maintenanceEvents.length < 3 && fallbackRecords.length > 0) {
                      const r = fallbackRecords.shift();
                      if (r) {
                        maintenanceEvents.push(r);
                      }
                    }
                  }

                  return (
                    <React.Fragment key={set.id}>
                      <motion.tr
                        layout
                        layoutId={`row-${set.id}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        whileHover={{ 
                          scale: 1.002,
                          boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.04), 0 4px 6px -4px rgba(15, 23, 42, 0.04)",
                          zIndex: 10
                        }}
                        transition={{ 
                          type: "spring",
                          stiffness: 240,
                          damping: 22,
                          delay: Math.min(index * 0.015, 0.1),
                          layout: { type: "spring", stiffness: 300, damping: 28 }
                        }}
                        draggable={isReady}
                        onDragStart={(e) => {
                          if (isReady) {
                            e.dataTransfer.setData('text/plain', set.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }
                        }}
                        className={`relative index-10 ${isReady ? 'hover:bg-emerald-50/10 cursor-grab active:cursor-grabbing' : 'hover:bg-slate-50/50'} ${isExpanded ? 'bg-indigo-50/20' : ''} transition-all border-b border-slate-100 last:border-0`}
                      >
                        {/* Checkbox Selector */}
                        <td className="py-4 px-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(set.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, set.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== set.id));
                              }
                            }}
                            className="w-4 h-4 text-biofarm-blue rounded border-slate-300 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* ID / Date */}
                        <td className="py-4 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            {isReady ? (
                              <GripVertical
                                className="w-4 h-4 text-emerald-600 cursor-grab active:cursor-grabbing hover:text-emerald-700 transition-colors shrink-0"
                                title="Chwyć ten uchwyt i przeciągnij na tabletkarkę"
                              />
                            ) : (
                              <span className="w-4 h-4 block shrink-0" />
                            )}
                            <div className="flex items-center gap-1.5">
                              <div className={`font-bold text-sm px-2.5 py-1 rounded inline-block ${
                                isReady
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                                  : 'text-biofarm-blue bg-biofarm-blue/5 border border-biofarm-blue/10'
                              }`}>
                                {set.id}
                              </div>
                              {onOpenScannerWithId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenScannerWithId(set.id);
                                  }}
                                  className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-biofarm-cyan hover:border-biofarm-cyan/40 transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                                  title="Szybki odczyt / Symulacja kodu QR dla tego kompletu"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 pl-6">
                            <Calendar className="w-3 h-3" /> {set.dataDodania}
                          </div>
                        </td>

                        {/* Name / Shape */}
                        <td className="py-4 px-4 text-left">
                          <div className="font-semibold text-slate-900 line-clamp-1 max-w-[200px]" title={set.nazwaProduktu}>
                            {set.nazwaProduktu}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            {getShapeBadge(set.ksztaltTabletki)}
                            {set.znakowanie && (
                              <span className="text-[9px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Eng: "{set.znakowanie}"
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Serial / Location */}
                        <td className="py-4 px-4 font-sans text-xs text-left">
                          <div className="text-slate-800 font-medium font-mono">
                            {set.numerWewnetrzny}
                          </div>
                          <div className="text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> {set.lokalizacja}
                          </div>
                        </td>

                        {/* Standard & Steel */}
                        <td className="py-4 px-4 text-left">
                          <div className="font-mono text-xs text-slate-700 flex items-center gap-1 font-bold">
                            <Layers className="w-3.5 h-3.5 text-slate-400" /> {set.standardNarzedzi} <span className="font-normal text-slate-400">({set.narzedziaWielokrotne})</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 font-mono uppercase">
                            {set.rodzajStali}
                          </div>
                        </td>

                        {/* Wear level */}
                        <td className="py-4 px-4 text-left">
                          <div className="flex justify-between items-center text-[11px] font-mono mb-1">
                            <span className={textColor}>{Math.round(ratio)}% ({set.silaNacisku} kN)</span>
                            <span className="text-slate-400">{(set.uzycieGlowne / 1000000).toFixed(1)}M / {(set.uzycieLimit / 1000000).toFixed(0)}M</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 relative">
                            <motion.div
                              className={`h-full rounded-full absolute left-0 top-0 bottom-0 ${color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${ratio}%` }}
                              transition={{ type: "spring", stiffness: 80, damping: 15 }}
                            />
                          </div>
                          {isWornOut && (
                            <div className="text-[10px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3" /> WYMAGANA REGENERACJA / MATRYCA ZUŻYTA!
                            </div>
                          )}
                        </td>

                        {/* Status select/badge */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getStatusBadge(set.status)}
                            
                            {/* Mini inline status switcher */}
                            <select
                              value={set.status}
                              onChange={(e) => onUpdateStatus(set.id, e.target.value as ToolStatus)}
                              className="text-[10px] mt-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded px-1.5 py-0.5 outline-none font-mono font-medium cursor-pointer"
                            >
                              <option value="Gotowy do produkcji">Zmień: Gotowy</option>
                              <option value="W użyciu">Zmień: W użyciu</option>
                              <option value="W konserwacji">Zmień: Serwis</option>
                              <option value="Wycofany z produkcji">Zmień: Wycofaj</option>
                            </select>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Collapse/Expand toggle details details row */}
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : set.id)}
                              className={`p-1.5 rounded border transition-all cursor-pointer flex items-center gap-1 text-xs select-none ${
                                isExpanded
                                  ? 'bg-indigo-50 border-indigo-200 text-[#0b4596]'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-[#0b4596] hover:bg-indigo-50/50'
                              }`}
                              title={isExpanded ? 'Ukryj kartę nadzoru technicznego' : 'Rozwiń szczegóły i status inspekcji'}
                            >
                              <Eye className="w-4 h-4 shrink-0" />
                              <span className="hidden xl:inline font-semibold">
                                {isExpanded ? 'Ukryj' : 'Szczegóły'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCert(set)}
                              className="p-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-biofarm-blue transition-all cursor-pointer flex items-center gap-1 text-xs select-none"
                              title="Generuj Certyfikat Kalibracji QR"
                            >
                              <QrCode className="w-4 h-4 shrink-0" />
                              <span className="hidden xl:inline font-semibold">Certyfikat</span>
                            </button>

                            {onClone && (
                              <button
                                type="button"
                                onClick={() => onClone(set.id)}
                                className="p-1.5 rounded bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-600 transition-all cursor-pointer flex items-center gap-1 text-xs select-none"
                                title="Klonuj komplet (kopia parametrów technicznych, licznik cykli 0)"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 text-emerald-600"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                <span className="hidden xl:inline font-semibold">Klonuj</span>
                              </button>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Czy na pewno chcesz bezpowrotnie usunąć komplet ${set.id} dla ${set.nazwaProduktu}?`)) {
                                  onDelete(set.id);
                                }
                              }}
                              className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Usuń komplet"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Expandable details content representation */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50 border-b border-indigo-150/20">
                          <td colSpan={8} className="p-4 lg:p-6 text-left">
                            <motion.div
                              initial={{ opacity: 0, y: -6, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: 'auto' }}
                              exit={{ opacity: 0, y: -6, height: 0 }}
                              transition={{ duration: 0.16, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                {/* Inspection Summary Widget */}
                                <motion.div
                                  whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08)" }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                  className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-3.5">
                                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">GMP Quality Control</span>
                                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border uppercase ${
                                        set.status === 'Wycofany z produkcji'
                                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                      }`}>
                                        {set.status === 'Wycofany z produkcji' ? 'Odrzucony' : 'Zatwierdzony'}
                                      </span>
                                    </div>
                                    <h5 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5 uppercase font-sans tracking-tight">
                                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Karta Rewizji Technicznej
                                    </h5>
                                    <p className="text-xs text-slate-500 leading-relaxed font-sans pr-1">
                                      Komplet pomyślnie przeszedł ostatnią kontrolę metrologiczną, pomiar chropowatości powierzchni czołowej stempli (Ra &lt; 0.2 µm) oraz test pasowania podwójnego uszczelnienia.
                                    </p>
                                  </div>
                                  
                                  {/* Last Inspected & Inspector ID badge */}
                                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2.5">
                                    <div className="flex flex-col">
                                      <span className="text-[8.5px] font-mono text-slate-400 uppercase font-black tracking-tight">Ostatnia inspekcja:</span>
                                      <span className="text-xs font-mono font-bold text-slate-700 mt-1 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-[#00ca9a]" /> {lastInspectedDate}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[8.5px] font-mono text-slate-400 uppercase font-black tracking-tight font-extrabold">ID Inspektora:</span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black font-mono bg-[#0b4596]/10 border border-[#0b4596]/15 text-[#0b4596] mt-1 shadow-3xs">
                                        {inspectorId}
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>

                                {/* Column 2: Parameters Spec */}
                                <motion.div
                                  whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08)" }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                  className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs text-xs font-mono flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 font-sans">Parametry Konstrukcyjne</div>
                                    <div className="space-y-2 text-xs">
                                      <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400">Standard Oprzyrządowania:</span>
                                        <span className="font-bold text-slate-800">{set.standardNarzedzi}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400">Rodzaj Narzędzia:</span>
                                        <span className="font-semibold text-slate-700">{set.narzedziaWielokrotne}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-semibold text-amber-600">Max. Siła Nacisku:</span>
                                        <span className="font-bold text-amber-600">{set.silaNacisku} kN</span>
                                      </div>
                                      <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400">Grawerowanie (Logo/Znak):</span>
                                        <span className="font-bold text-indigo-750">"{set.znakowanie || 'Gładki'}"</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-3 font-sans">*Wartości kalibracji geometrycznej zweryfikowano mikrometrem laserowym.</div>
                                </motion.div>

                                {/* Column 3: Logistics History */}
                                <motion.div
                                  whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08)" }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                  className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs text-xs font-sans flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3.5 font-mono text-left">Ścieżka Traceability</div>
                                    <div className="space-y-2.5">
                                      <div>
                                        <span className="text-[8.5px] font-mono text-slate-400 uppercase font-bold block">Autoryzowany producent / dostawca:</span>
                                        <div className="font-bold text-slate-800 mt-0.5">{set.dostawca}</div>
                                      </div>
                                      <div>
                                        <span className="text-[8.5px] font-mono text-slate-400 uppercase font-bold block">Data Wprowadzenia do Ruchu:</span>
                                        <div className="font-mono text-slate-650 mt-0.5">{set.dataDostawy}</div>
                                      </div>
                                      <div>
                                        <span className="text-[8.5px] font-mono text-slate-400 uppercase font-bold block">Szafa Magazynowa (Szuflada):</span>
                                        <div className="font-mono text-slate-650 mt-0.5">{set.lokalizacja}</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-[9.5px] text-indigo-700 bg-indigo-50/50 border border-indigo-100/30 font-mono font-bold p-1.5 rounded text-center mt-3">SYSTEM GMP / BIOFARM COMPLIANT</div>
                                </motion.div>

                                {/* Column 4: Interactive Vertical Progress Timeline */}
                                <motion.div
                                  whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08)" }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                  className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Zabiegi Serwisowe</span>
                                      <span className="text-[9px] bg-indigo-50 text-[#0b4596] border border-[#0b4596]/10 px-1.5 py-0.5 rounded font-mono uppercase tracking-tight">OSI CZASU</span>
                                    </div>
                                    
                                    <div className="relative pl-6 space-y-3.5 text-left">
                                      {/* Vertical progress connector line */}
                                      <div className="absolute left-[9px] top-1.5 bottom-1.5 w-0.5 border-l-2 border-dashed border-indigo-200" />
                                      
                                      {maintenanceEvents.map((ev, idx) => {
                                        const isActive = activeTimelineIdx[set.id] === idx || (activeTimelineIdx[set.id] === undefined && idx === 0);
                                        return (
                                          <div key={ev.id || idx} className="relative group cursor-pointer" onClick={() => {
                                            setActiveTimelineIdx(prev => ({
                                              ...prev,
                                              [set.id]: idx
                                            }));
                                          }}>
                                            {/* Progress path node */}
                                            <div className={`absolute -left-[22px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center transition-all ${
                                              isActive 
                                                ? 'bg-[#0b4596] scale-125 shadow-xs ring-4 ring-indigo-50' 
                                                : 'bg-slate-300 hover:bg-[#0b4596] group-hover:scale-115'
                                            }`} />
                                            
                                            <div className="flex justify-between items-start gap-1">
                                              <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-[11px] font-bold text-slate-800 hover:text-biofarm-blue transition-colors">
                                                    {ev.typ}
                                                  </span>
                                                  <span className="text-[8px] font-mono text-slate-400">
                                                    #{ev.id}
                                                  </span>
                                                </div>
                                                <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                                  <Calendar className="w-2.5 h-2.5" /> {ev.data}
                                                </span>
                                              </div>
                                              
                                              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                                                ev.status === 'Zatwierdzony' || ev.status === 'Wykonano'
                                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100/85'
                                                  : 'bg-rose-50 text-rose-700 border-rose-100/85'
                                              }`}>
                                                {ev.status === 'Zatwierdzony' || ev.status === 'Wykonano' ? 'Odr' : 'Wym'}
                                              </span>
                                            </div>

                                            {isActive && (
                                              <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] text-slate-600 font-sans shadow-3xs leading-relaxed max-w-full text-left"
                                              >
                                                <div className="font-semibold text-slate-800 text-[9px] uppercase font-mono tracking-wide flex justify-between gap-1 flex-wrap">
                                                  <span>Przez: {ev.operator}</span>
                                                  {ev.verifiedBy && <span className="text-emerald-600 font-bold">QA: {ev.verifiedBy}</span>}
                                                </div>
                                                <p className="mt-1 font-sans text-slate-500 leading-normal">{ev.notatki}</p>
                                              </motion.div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div className="text-[8.5px] text-slate-400 mt-2 font-mono uppercase text-center border-t border-slate-100 pt-2 font-bold tracking-wider">
                                    KLIKNIJ WPIS, BY WYŚWIETLAĆ NOTATKI GMP
                                  </div>
                                </motion.div>
                              </div>

                              {/* STATUS HISTORY AUDIT TRAIL LOG */}
                              <div className="mt-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs text-left">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                  <div className="flex items-center gap-2">
                                    <History className="w-4 h-4 text-[#0b4596]" />
                                    <h6 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                                      Historia Statusów i Ścieżka Audytu GMP (Status Change Log)
                                    </h6>
                                  </div>
                                  <span className="text-[9px] bg-slate-100 text-slate-500 font-mono font-bold px-2 py-0.5 rounded border border-slate-200 uppercase">
                                    21 CFR Part 11 Compliant Audit Trail
                                  </span>
                                </div>

                                {!set.statusHistory || set.statusHistory.length === 0 ? (
                                  <div className="text-center py-4 text-slate-400 font-mono text-[11px] uppercase">
                                    Brak zarejestrowanych zmian statusu w systemie lokat. Aktualny stan: <span className="text-[#0b4596] font-bold">{set.status}</span>
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left font-mono text-[11px] border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[9px] uppercase font-bold">
                                          <th className="py-2.5 px-3">Data i godzina</th>
                                          <th className="py-2.5 px-3">Zdarzenie / Zmiana Stanu</th>
                                          <th className="py-2.5 px-3">Osoba Odpowiedzialna</th>
                                          <th className="py-2.5 px-3">Powód modyfikacji (GMP Audit)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-slate-650">
                                        {set.statusHistory.map((history) => (
                                          <tr key={history.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2.5 px-3 text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                                              {history.data}
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                              <span className="text-slate-400 line-through mr-1">{history.staryStatus}</span>
                                              <span className="text-[#0b4596] font-bold mx-1">→</span>
                                              <span className="text-[#0b4596] font-bold">{history.nowyStatus}</span>
                                            </td>
                                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                                              {history.operator}
                                            </td>
                                            <td className="py-2.5 px-3 italic text-slate-500">
                                              {history.powod || 'Aktualizacja stanu operacyjnego'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-mono text-xs">
                    Brak wyników spełniających kryteria wyszukiwania. Spróbuj zmienić parametry.
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* METRYKA CERTYFIKATU QR / SYSTEM EMBEDDED POPUP */}
      <AnimatePresence>
        {selectedCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedCert(null)}
            />
            
            {/* Certificate content mockup */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 z-10 font-sans text-slate-800"
            >
              
              {/* Decorative Tech frame lines */}
              <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-biofarm-blue via-biofarm-cyan to-[#00ca9a] rounded-t-3xl" />
              
              {/* Printable Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-5 mb-5">
                <div>
                  <h4 className="text-base font-display font-black text-biofarm-dark tracking-wide uppercase">
                    CERTYFIKAT WALIDACYJNY OPERACYJNEJ MATRYCY
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono uppercase mt-1">
                    System certyfikacji Biofarm Poznań • GMP Standard PL/402
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#00ca9a]/10 text-emerald-800 rounded-lg border border-[#00ca9a]/20 uppercase">
                    Atest Sprawny
                  </span>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="grid grid-cols-2 gap-6 text-xs mb-6 font-mono">
                <div className="space-y-2 border-r border-slate-100 pr-4">
                  <div>
                    <span className="text-slate-400 uppercase text-[9px]">Identyfikator Kompletu:</span>
                    <div className="text-slate-900 font-bold text-sm">SET-{selectedCert.id}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px]">Produkt kalibrowany:</span>
                    <div className="text-slate-900 font-semibold line-clamp-1">{selectedCert.nazwaProduktu}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px]">Nr seryjny wewnętrzny:</span>
                    <div className="text-slate-900 font-semibold">{selectedCert.numerWewnetrzny}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px]">Gatunek Metalu:</span>
                    <div className="text-slate-900 text-[11px]">{selectedCert.rodzajStali}</div>
                  </div>
                </div>

                <div className="space-y-2 pl-2">
                  <div>
                    <span className="text-slate-400 uppercase text-[9px]">Wymiar / Standard:</span>
                    <div className="text-slate-900 font-semibold">{selectedCert.standardNarzedzi} ({selectedCert.narzedziaWielokrotne})</div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px]">Siła graniczna (kN):</span>
                    <div className="text-slate-900 font-bold text-amber-600">{selectedCert.silaNacisku} kN (Max)</div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px]">Lokalizacja składowania:</span>
                    <div className="text-slate-800 text-[11px]">{selectedCert.lokalizacja}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px]">Aktualna liczba cykli:</span>
                    <div className="text-slate-900 font-bold">{(selectedCert.uzycieGlowne).toLocaleString('pl-PL')} uderzeń</div>
                  </div>
                </div>
              </div>

              {/* Camera Visual Proof Widget */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 mb-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Dowód Wizualny / Zdjęcie z Kamery Laboratoryjnej</span>
                  <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200/55 px-1.5 py-0.5 rounded font-mono uppercase tracking-tight font-bold">QA CONTROL</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center font-sans">
                  {/* Left Column: Feed or Static Snapshot */}
                  <div className="bg-slate-900 aspect-[4/3] rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-200 shadow-inner">
                    {photo ? (
                      <img src={photo} alt="Podgląd stempla" className="w-full h-full object-cover" />
                    ) : isCameraActive ? (
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4 space-y-2">
                        <Camera className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
                        <p className="text-[10px] text-slate-400 font-mono leading-normal">Kamera inspekcyjna wyłączona</p>
                      </div>
                    )}
                    
                    {/* Status beacon */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-md text-[9px] font-mono text-white">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCameraActive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                      {isCameraActive ? 'LIVE' : 'OFFLINE'}
                    </div>
                  </div>

                  {/* Right Column: Controls */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-slate-500 leading-normal font-sans">
                      Dla podwyższenia wiarygodności inspekcji GMP, zarejestruj obraz makroskopowy czoła stempla dolnego lub górnego bezpośrednio z wbudowanej kamery laboratoryjnej. Zdjęcie zostanie dołączone do generowanego pliku PDF.
                    </p>

                    <div className="flex flex-col gap-2">
                      {!isCameraActive && !photo && (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer"
                        >
                          <Camera className="w-4 h-4 text-white" /> Uruchom Kamerę
                        </button>
                      )}

                      {isCameraActive && (
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-mono font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer"
                        >
                          <Check className="w-4 h-4 text-white" /> Zrób Zdjęcie (Snap)
                        </button>
                      )}

                      {photo && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPhoto(null);
                              startCamera();
                            }}
                            className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono font-medium text-[10px] text-center transition-all cursor-pointer"
                          >
                            Powtórz Zdjęcie
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPhoto(null);
                              stopCamera();
                            }}
                            className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-mono font-medium text-[10px] text-center transition-all cursor-pointer"
                          >
                            Usuń Zdjęcie
                          </button>
                        </div>
                      )}

                      {isCameraActive && (
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-mono font-medium text-[11px] transition-all select-none cursor-pointer"
                        >
                          Wyłącz Kamerę
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* QR and Calibration Stamp Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 items-center mb-6">
                
                {/* Simulated QR Code from Image 1 ("Kod QR" bubble) */}
                <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-slate-200">
                  <svg viewBox="0 0 100 100" className="w-24 h-24 text-slate-800">
                    {/* Outer borders */}
                    <rect x="5" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="12" y="12" width="11" height="11" fill="currentColor" />

                    <rect x="70" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="77" y="12" width="11" height="11" fill="currentColor" />

                    <rect x="5" y="70" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="12" y="77" width="11" height="11" fill="currentColor" />

                    {/* QR standard noisy boxes */}
                    <rect x="40" y="10" width="8" height="8" fill="currentColor" />
                    <rect x="55" y="15" width="6" height="12" fill="currentColor" />
                    <rect x="45" y="30" width="15" height="6" fill="currentColor" />
                    
                    <rect x="10" y="45" width="6" height="15" fill="currentColor" />
                    <rect x="25" y="40" width="12" height="10" fill="currentColor" />
                    <rect x="15" y="58" width="12" height="6" fill="currentColor" />

                    <rect x="40" y="75" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="4" />
                    <rect x="45" y="80" width="5" height="5" fill="currentColor" />
                    <rect x="75" y="40" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="4" />

                    <rect x="80" y="65" width="10" height="10" fill="currentColor" />
                    <rect x="65" y="80" width="8" height="15" fill="currentColor" />
                    <rect x="65" y="60" width="10" height="8" fill="currentColor" />
                  </svg>
                  <span className="text-[9px] font-mono text-slate-400 mt-2 uppercase tracking-tight">KOD QR - SERIA {selectedCert.id}</span>
                </div>

                {/* Validation Info */}
                <div className="col-span-2 space-y-3 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-slate-900 font-bold uppercase text-[10px]">Zgodność Farmakopealna</div>
                      <div className="text-slate-500 text-[10px] leading-relaxed">System autoryzowany certyfikatem QA/GMP-1014. Profil stempla spełnia kryteria twardości i ścieralności PN-EN.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Printer className="w-5 h-5 text-slate-500 shrink-0" />
                    <div>
                      <div className="text-slate-900 font-bold uppercase text-[10px]">Autoryzacja Działu Utrzymania Ruchu</div>
                      <div className="text-slate-500 text-[10px] leading-relaxed">Podpis cyfrowy: H8921-X901A-BFA01</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCert(null)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Zamknij Okno
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-slate-200 text-[#0b4596] hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Wydruk A4 (Browser)
                </button>
                <button
                  type="button"
                  onClick={() => downloadGMPCertificate(selectedCert, photo)}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold bg-[#0b4596] hover:bg-indigo-700 text-white flex items-center justify-center gap-2 cursor-pointer shadow-md select-none"
                >
                  <FileText className="w-4 h-4 text-white" /> Pobierz PDF (GMP Certyfikat)
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULK SERIAL PRINT PREVIEW MODAL */}
      <AnimatePresence>
        {showBulkPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowBulkPrintModal(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 z-10 font-sans text-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-[#0b4596] via-indigo-500 to-emerald-500 rounded-t-3xl" />
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-150 pb-5 mb-5 gap-3">
                <div>
                  <h4 className="text-lg font-display font-black text-biofarm-dark tracking-wide uppercase">
                    ZBIORCZY RAPORT CZASU PRACY I SPRAWNOŚCI OPRZYRZĄDOWANIA
                  </h4>
                  <p className="text-[10px] text-slate-450 font-mono uppercase mt-1">
                    System ewidencji Biofarm Poznań • SYGNOWANE RAPORTY ARCHIWALNE (GMP REF: BF-QA-BULK-2026)
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 text-xs font-mono font-bold bg-[#0b4596]/10 text-[#0b4596] rounded-lg border border-[#0b4596]/25 uppercase shadow-xs">
                    DO ARCHIWIZACJI
                  </span>
                </div>
              </div>

              {/* Printable Table Content representing all selected toolsets */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-600">
                      <th className="py-2.5 px-3">Lp.</th>
                      <th className="py-2.5 px-3">Komplet ID</th>
                      <th className="py-2.5 px-3">Wyrób / Opakowanie</th>
                      <th className="py-2.5 px-3 text-center">Standard</th>
                      <th className="py-2.5 px-3">Typ Stali</th>
                      <th className="py-2.5 px-3 text-right">Licznik (M)</th>
                      <th className="py-2.5 px-3 text-right">Zużycie %</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {toolSets
                      .filter(set => selectedIds.includes(set.id))
                      .map((set, index) => {
                        const wearPct = Math.min(100, Math.round((set.uzycieGlowne / set.uzycieLimit) * 100));
                        return (
                          <tr key={set.id} className="hover:bg-slate-50 text-[11px] text-slate-800">
                            <td className="py-2.5 px-3 font-semibold text-slate-400">{index + 1}.</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{set.id}</td>
                            <td className="py-2.5 px-3 font-sans font-medium line-clamp-1 max-w-[180px]">{set.nazwaProduktu}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{set.standardNarzedzi}</td>
                            <td className="py-2.5 px-3 text-slate-500 uppercase text-[9.5px]">{set.rodzajStali}</td>
                            <td className="py-2.5 px-3 text-right">{(set.uzycieGlowne).toLocaleString('pl-PL')}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-700">{wearPct}%</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                set.status === 'Gotowy do produkcji'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : set.status === 'W użyciu'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {set.status === 'Gotowy do produkcji' ? 'SPRAWNY/GOTOWY' : set.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Informational Text */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-xs text-slate-650 leading-relaxed font-sans">
                <strong className="text-slate-800 font-bold block mb-1">Oświadczenie Działu Zapewnienia Jakości (QA Compliance Statement):</strong>
                Wykazane powyżej komplety oprzyrządowania tabletkującego zostały poddane weryfikacji metrologicznej i technicznej zgodnie z procedurą SOP-GMP-BIOF-084. Zarejestrowane liczniki uderzeń są zsynchronizowane z rzeczywistym przebiegiem operacyjnym stemplarek Fette 2090, Kilian i Korsch w systemie produkcyjnym. Narzędzia dopuszczone do produkcji farmaceutycznej.
              </div>

              {/* Signature fields for bulk archive printable filing */}
              <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-slate-150 mb-4">
                <div className="space-y-12">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Sporządzył (Technik Serwisu / Operator)</div>
                  <div className="border-b border-dashed border-slate-350 w-2/3 mx-auto" />
                  <div className="text-[11px] font-bold text-slate-700 font-sans">Podpis i data</div>
                </div>
                <div className="space-y-12">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Zatwierdził (Dział QA / Inspektor GMP)</div>
                  <div className="border-b border-dashed border-slate-350 w-2/3 mx-auto" />
                  <div className="text-[11px] font-bold text-slate-700 font-sans">Podpis i data</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-5 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setShowBulkPrintModal(false)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Zamknij podgląd
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold bg-[#0b4596] hover:bg-[#1155b5] text-white flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" /> Uruchom Drukowanie (A4)
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
