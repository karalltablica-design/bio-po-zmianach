import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolSet, TabletShape, ToolStatus } from '../types';
import { Plus, HelpCircle, Check, MapPin, Building, Activity, ShieldAlert, Award, Hash, Lock } from 'lucide-react';

interface ToolSetFormProps {
  locations: string[];
  suppliers: string[];
  steelTypes: string[];
  products: string[];
  onAddLocation: (loc: string) => void;
  onAddSupplier: (sup: string) => void;
  onAddSteelType: (steel: string) => void;
  onSave: (toolSet: ToolSet) => void;
  activeId?: string;
}

export const ToolSetForm: React.FC<ToolSetFormProps> = ({
  locations,
  suppliers,
  steelTypes,
  products,
  onAddLocation,
  onAddSupplier,
  onAddSteelType,
  onSave,
}) => {
  // Local form state with draft restore
  const [lokalizacja, setLokalizacja] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).lokalizacja || '';
    } catch {}
    return '';
  });
  const [nazwaProduktu, setNazwaProduktu] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).nazwaProduktu || '';
    } catch {}
    return '';
  });
  const [numerWewnetrzny, setNumerWewnetrzny] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).numerWewnetrzny || '';
    } catch {}
    return '';
  });
  const [dostawca, setDostawca] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).dostawca || '';
    } catch {}
    return '';
  });
  const [dataDostawy, setDataDostawy] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).dataDostawy || '';
    } catch {}
    return '';
  });
  const [ksztaltTabletki, setKsztaltTabletki] = useState<TabletShape>(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).ksztaltTabletki || 'okragly';
    } catch {}
    return 'okragly';
  });
  const [standardNarzedzi, setStandardNarzedzi] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).standardNarzedzi || 'EU-B';
    } catch {}
    return 'EU-B';
  });
  const [narzedziaWielokrotne, setNarzedziaWielokrotne] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).narzedziaWielokrotne || 'Pojedyncze';
    } catch {}
    return 'Pojedyncze';
  });
  const [iloscZamawianych, setIloscZamawianych] = useState<number>(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).iloscZamawianych || 24;
    } catch {}
    return 24;
  });
  const [znakowanie, setZnakowanie] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).znakowanie || '';
    } catch {}
    return '';
  });
  const [silaNacisku, setSilaNacisku] = useState<number>(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).silaNacisku || 30;
    } catch {}
    return 30;
  });
  const [rodzajStali, setRodzajStali] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft) return JSON.parse(draft).rodzajStali || '';
    } catch {}
    return '';
  });

  // Modals for adding custom options
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [newLocVal, setNewLocVal] = useState('');
  
  const [showAddSup, setShowAddSup] = useState(false);
  const [newSupVal, setNewSupVal] = useState('');

  const [showAddSteel, setShowAddSteel] = useState(false);
  const [newSteelVal, setNewSteelVal] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generate a random ID mimicking "Nowy Komplet ID" in image 1
  const [completId, setCompletId] = useState(() => {
    try {
      const draft = localStorage.getItem('biofarm_toolset_form_draft');
      if (draft && JSON.parse(draft).completId) return JSON.parse(draft).completId;
    } catch {}
    return String(Math.floor(100000 + Math.random() * 900000));
  });

  // Hook to persist form changes into localStorage as draft
  useEffect(() => {
    const draftObj = {
      lokalizacja,
      nazwaProduktu,
      numerWewnetrzny,
      dostawca,
      dataDostawy,
      ksztaltTabletki,
      standardNarzedzi,
      narzedziaWielokrotne,
      iloscZamawianych,
      znakowanie,
      silaNacisku,
      rodzajStali,
      completId,
    };
    localStorage.setItem('biofarm_toolset_form_draft', JSON.stringify(draftObj));
  }, [
    lokalizacja,
    nazwaProduktu,
    numerWewnetrzny,
    dostawca,
    dataDostawy,
    ksztaltTabletki,
    standardNarzedzi,
    narzedziaWielokrotne,
    iloscZamawianych,
    znakowanie,
    silaNacisku,
    rodzajStali,
    completId,
  ]);

  const handleRegenerateId = () => {
    setCompletId(String(Math.floor(100000 + Math.random() * 900000)));
  };

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleAddLocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocVal.trim()) {
      onAddLocation(newLocVal.trim());
      setLokalizacja(newLocVal.trim());
      setShowAddLoc(false);
      setNewLocVal('');
      notify('Dodano nową lokalizację magazynową');
    }
  };

  const handleAddSupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSupVal.trim()) {
      onAddSupplier(newSupVal.trim());
      setDostawca(newSupVal.trim());
      setShowAddSup(false);
      setNewSupVal('');
      notify('Dodano nowego dostawcę oprzyrządowania');
    }
  };

  const handleAddSteelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSteelVal.trim()) {
      onAddSteelType(newSteelVal.trim());
      setRodzajStali(newSteelVal.trim());
      setShowAddSteel(false);
      setNewSteelVal('');
      notify('Wprowadzono nowy rodzaj stali stemplowej');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lokalizacja || !nazwaProduktu || !numerWewnetrzny || !dostawca || !dataDostawy || !rodzajStali) {
      notify('Proszę wypełnić wszystkie pola formularza oznaczona czerwoną gwiazdką');
      return;
    }

    const newSet: ToolSet = {
      id: completId,
      lokalizacja,
      nazwaProduktu,
      numerWewnetrzny,
      dostawca,
      dataDostawy,
      ksztaltTabletki,
      standardNarzedzi,
      narzedziaWielokrotne,
      iloscZamawianych,
      znakowanie,
      silaNacisku,
      rodzajStali,
      status: 'Gotowy do produkcji',
      dataDodania: new Date().toISOString().split('T')[0],
      uzycieGlowne: 0,
      uzycieLimit: 4000000,
    };

    onSave(newSet);
    localStorage.removeItem('biofarm_toolset_form_draft');
    notify(`Z powodzeniem dodano Komplet stempli i matryc o ID ${completId}!`);
    
    // reset some state/generate new ID
    setCompletId(String(Math.floor(100000 + Math.random() * 900000)));
    setZnakowanie('');
    setNumerWewnetrzny('');
    setNazwaProduktu('');
    setDataDostawy('');
    // keep static supplier/location for speed
  };

  // Safe pressure calculator warning
  const getSilaAlert = () => {
    if (silaNacisku > 40) {
      return {
        type: 'danger',
        msg: 'Uwaga: Obciążenie powyżej 40 kN może trwale uszkodzić stempel o standardzie EU-B!',
      };
    }
    if (ksztaltTabletki === 'kapsulka_zmodyfikowana' && silaNacisku > 30) {
      return {
        type: 'warning',
        msg: 'Zalecane: Dla kształtu kapsułki zmodyfikowanej utrzymaj normę poniżej 30 kN ze względu na naprężenia w narożach.',
      };
    }
    return null;
  };

  const alert = getSilaAlert();

  return (
    <div className="relative font-sans text-slate-800 bg-white p-6 lg:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
      
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-biofarm-dark text-white rounded-xl shadow-2xl border border-biofarm-cyan/30 text-xs font-mono"
          >
            <div className="w-2 h-2 rounded-full bg-biofarm-cyan animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-5 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-biofarm-dark flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-biofarm-blue" />
            Dodawanie Kompletów Narzędzi
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
              Formularz rejestracji oprzyrządowania stemplowego GMP / ISO-PHARMA
            </span>
            <span className="text-[9.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold font-mono px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 animate-pulse">
              <Check className="w-3 h-3 text-emerald-600" /> AUTOZAPIS AKTYWNY
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono text-xs">
          <span className="text-slate-500 font-medium">Nowy Komplet ID:</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 font-semibold text-sm">
            {completId}
          </span>
          <button
            type="button"
            onClick={handleRegenerateId}
            className="text-[10px] text-biofarm-blue hover:underline font-semibold cursor-pointer"
          >
            [ REGENERUJ ]
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Core Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN - General Specifications */}
          <div className="space-y-5">
            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-mono font-bold text-biofarm-blue uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Specyfikacja Fizyczno-Logistyczna
              </h3>

              {/* LOKALIZACJA */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-slate-700">Lokalizacja <span className="text-rose-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setShowAddLoc(true)}
                    className="text-biofarm-blue hover:text-biofarm-blue/80 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Dodaj nową
                  </button>
                </div>
                <select
                  value={lokalizacja}
                  onChange={(e) => setLokalizacja(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 hover:border-slate-300 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg px-3 py-2.5 outline-none transition-all"
                  required
                >
                  <option value="">Wybierz lokalizację...</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* NAZWA PRODUKTU */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Nazwa produktu leczniczego <span className="text-rose-500">*</span></label>
                <select
                  value={nazwaProduktu}
                  onChange={(e) => setNazwaProduktu(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 hover:border-slate-300 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg px-3 py-2.5 outline-none transition-all"
                  required
                >
                  <option value="">np.Metmorfina 100</option>
                  {products.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* NUMER WEWNĘTRZNY */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  Numer wewnętrzny serii / katalogowy <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-mono text-xs">
                    #
                  </span>
                  <input
                    type="text"
                    placeholder="np. BF/P-2026/049"
                    value={numerWewnetrzny}
                    onChange={(e) => setNumerWewnetrzny(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 hover:border-slate-300 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg pl-8 pr-3 py-2.5 outline-none font-mono tracking-wide"
                    required
                  />
                </div>
              </div>

              {/* DOSTAWCA */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-slate-700">Dostawca oprzyrządowania <span className="text-rose-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setShowAddSup(true)}
                    className="text-biofarm-blue hover:text-biofarm-blue/80 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Dodaj nowego
                  </button>
                </div>
                <select
                  value={dostawca}
                  onChange={(e) => setDostawca(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 hover:border-slate-300 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg px-3 py-2.5 outline-none transition-all"
                  required
                >
                  <option value="">Wybierz dostawcę...</option>
                  {suppliers.map((sup) => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
                </select>
              </div>

              {/* DATA DOSTAWY */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Data dostawy do zakładu <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={dataDostawy}
                  onChange={(e) => setDataDostawy(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg px-3 py-2 outline-none font-mono text-slate-700"
                  required
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Technical specifications */}
          <div className="space-y-5">
            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-mono font-bold text-biofarm-blue uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Parametry Maszynowe i Standaryzacja
              </h3>

              {/* STANDARD NARZĘDZI */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>Standard narzędzi</span>
                  <span className="text-slate-400 font-mono text-[9px]">PUNCH GEOMETRY</span>
                </label>
                <select
                  value={standardNarzedzi}
                  onChange={(e) => setStandardNarzedzi(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 hover:border-slate-300 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg px-3 py-2.5 outline-none transition-all"
                >
                  <option value="EU-D">Standard EU-D (Grube stple)</option>
                  <option value="EU-B">Standard EU-B (Cienkie stple)</option>
                  <option value="TSM-B">Standard TSM-B (US Standard)</option>
                  <option value="TSM-D">Standard TSM-D (US Standard)</option>
                  <option value="Euro-D">Euro-D Specjalne</option>
                  <option value="Custom">Custom (Indywidualny)</option>
                </select>
              </div>

              {/* NARZĘDZIA WIELOKROTNE */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Rodzaj zwielokrotnienia końcówki stempla</label>
                <select
                  value={narzedziaWielokrotne}
                  onChange={(e) => setNarzedziaWielokrotne(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 hover:border-slate-300 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg px-3 py-2.5 outline-none transition-all"
                >
                  <option value="Pojedyncze">Pojedyncze (1 stempel = 1 tabletka)</option>
                  <option value="Podwójne-2">Podwójne (Twin Tip - 2 końcówki)</option>
                  <option value="Wielokrotne-4">Czterokrotne (Multi Tip - 4 końcówki)</option>
                  <option value="Wielokrotne-8">Ośmiokrotne (Multi Tip - 8 końcówek)</option>
                </select>
              </div>

              {/* ILOŚĆ ZAMAWIANYCH NARZĘDZI */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Ilość kompletów roboczych w zestawie (szt.)</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={iloscZamawianych}
                  onChange={(e) => setIloscZamawianych(Number(e.target.value))}
                  className="w-full text-sm bg-white border border-slate-200 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg px-3 py-2 outline-none font-mono"
                />
              </div>

              {/* ZNAKOWANIE NARZĘDZI (Grawerunek) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Znakowanie (grawer na powierzchni roboczej)</label>
                <input
                  type="text"
                  placeholder="np. logo BF / kod dawki"
                  value={znakowanie}
                  onChange={(e) => setZnakowanie(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg px-3 py-2 outline-none font-mono"
                />
              </div>

              {/* SIŁA NACISKU */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    Maksymalna siła nacisku [kN] <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-slate-400 text-[10px] font-mono">Max Pressure Force</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={silaNacisku}
                    onChange={(e) => setSilaNacisku(Number(e.target.value))}
                    className="w-full text-sm bg-white border border-slate-200 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg pl-3 pr-10 py-2 outline-none font-mono text-slate-800"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                    kN
                  </div>
                </div>

                {/* Live pressure threshold caution */}
                {alert && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`p-2.5 rounded-md text-[11px] flex gap-2 border leading-relaxed ${
                      alert.type === 'danger'
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{alert.msg}</span>
                  </motion.div>
                )}
              </div>

              {/* RODZAJ STALI */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-slate-700">Rodzaj stali do stempli <span className="text-rose-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setShowAddSteel(true)}
                    className="text-biofarm-blue hover:text-biofarm-blue/80 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Dodaj inny gatunek
                  </button>
                </div>
                <select
                  value={rodzajStali}
                  onChange={(e) => setRodzajStali(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 hover:border-slate-300 focus:border-biofarm-blue focus:ring-1 focus:ring-biofarm-blue rounded-lg px-3 py-2.5 outline-none transition-all"
                  required
                >
                  <option value="">Wybierz stal...</option>
                  {steelTypes.map((steel) => (
                    <option key={steel} value={steel}>{steel}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* KSZTAŁT TABLETKI - Visual interactive selector as key component in image 1 */}
        <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
              Kształt tabletki (Tablet Geometry Specification)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Wizualny Kreator Profilu</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {
                id: 'okragly' as TabletShape,
                pl: 'Okrągły',
                desc: 'Standardowy, płaski lub wypukły profil',
                svg: (
                  <svg viewBox="0 0 40 40" className="w-12 h-12">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <circle cx="20" cy="20" r="1" fill="currentColor" />
                  </svg>
                ),
              },
              {
                id: 'kapsulka' as TabletShape,
                pl: 'Kapsułka',
                desc: 'Podłużna tabletka o prostych bokach',
                svg: (
                  <svg viewBox="0 0 40 40" className="w-12 h-12">
                    <rect x="8" y="14" width="24" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <line x1="20" y1="14" x2="20" y2="26" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                  </svg>
                ),
              },
              {
                id: 'kapsulka_zmodyfikowana' as TabletShape,
                pl: 'Kapsułka Zm.',
                desc: 'Modyfikowany, ścięty lub sferyczny kształt',
                svg: (
                  <svg viewBox="0 0 40 40" className="w-12 h-12">
                    <rect x="6" y="12" width="28" height="16" rx="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <circle cx="12" cy="20" r="1.5" fill="currentColor" />
                    <circle cx="28" cy="20" r="1.5" fill="currentColor" />
                  </svg>
                ),
              },
              {
                id: 'owalny' as TabletShape,
                pl: 'Owalny',
                desc: 'Eliptyczny, lekko zwężony profil',
                svg: (
                  <svg viewBox="0 0 40 40" className="w-12 h-12">
                    <ellipse cx="20" cy="20" rx="16" ry="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <line x1="20" y1="9" x2="20" y2="31" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  </svg>
                ),
              },
              {
                id: 'kwadratowy' as TabletShape,
                pl: 'Kwadratowy',
                desc: 'Kwadrat o łagodnie zaokrąglonych krawędziach',
                svg: (
                  <svg viewBox="0 0 40 40" className="w-12 h-12">
                    <rect x="10" y="10" width="20" height="20" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M10,10 L30,30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                  </svg>
                ),
              },
            ].map((shape) => {
              const matches = ksztaltTabletki === shape.id;
              return (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => setKsztaltTabletki(shape.id)}
                  className={`flex flex-col items-center justify-between p-3.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                    matches
                      ? 'bg-biofarm-mid text-white border-biofarm-cyan drop-shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="mb-2 transition-transform duration-300 transform group-hover:scale-105">
                    {shape.svg}
                  </div>
                  <span className="text-xs font-semibold leading-tight">{shape.pl}</span>
                  <span className="text-[9px] text-slate-400 mt-1 block h-5 leading-none overflow-hidden text-ellipsis max-w-full">
                    {matches ? (
                      <span className="text-biofarm-cyan font-bold font-mono">WYBRANY</span>
                    ) : (
                      shape.desc
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FORM BUTTON CONTROLS */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            <Lock className="w-3.5 h-3.5 inline mr-1 text-slate-300" /> Szyfrowane połączenie SSL z bazą Biofarm GMP
          </span>
          <button
            id="btn-save-toolset"
            type="submit"
            className="w-full sm:w-auto px-10 py-4 bg-biofarm-blue hover:bg-biofarm-mid text-white rounded-lg font-display font-bold text-sm tracking-wider uppercase shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Zatwierdź i Zapisz Nowy Komplet
          </button>
        </div>
      </form>

      {/* MODALS FOR ADDING INLINE options */}
      
      {/* 1. ADD LOCATION MODEL */}
      <AnimatePresence>
        {showAddLoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowAddLoc(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 z-10"
            >
              <h4 className="text-base font-display font-bold text-biofarm-dark mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-biofarm-blue" />
                Nowy Punkt składowania (Lokalizacja)
              </h4>
              <form onSubmit={handleAddLocSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Nazwa sekcji / regału</label>
                  <input
                    type="text"
                    required
                    placeholder="np. Sektor C - Regał 12"
                    value={newLocVal}
                    onChange={(e) => setNewLocVal(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 focus:border-biofarm-blue rounded-lg px-3 py-2 outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLoc(false)}
                    className="px-4 py-2 text-xs font-semibold border border-slate-100 text-slate-500 hover:bg-slate-50 rounded-md cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-biofarm-blue hover:bg-biofarm-mid text-white rounded-md cursor-pointer"
                  >
                    Dodaj i Wybierz
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. ADD SUPPLIER MODEL */}
      <AnimatePresence>
        {showAddSup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowAddSup(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 z-10"
            >
              <h4 className="text-base font-display font-bold text-biofarm-dark mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-biofarm-blue" />
                Dodaj nowego dostawcę stempli
              </h4>
              <form onSubmit={handleAddSupSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Pełna nazwa dostawcy</label>
                  <input
                    type="text"
                    required
                    placeholder="np. Fette Compacting Poland"
                    value={newSupVal}
                    onChange={(e) => setNewSupVal(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 focus:border-biofarm-blue rounded-lg px-3 py-2 outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSup(false)}
                    className="px-4 py-2 text-xs font-semibold border border-slate-100 text-slate-500 hover:bg-slate-50 rounded-md cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-biofarm-blue hover:bg-biofarm-mid text-white rounded-md cursor-pointer"
                  >
                    Dodaj i Wybierz
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. ADD STEEL SPEC MODEL */}
      <AnimatePresence>
        {showAddSteel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowAddSteel(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 z-10"
            >
              <h4 className="text-base font-display font-bold text-biofarm-dark mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-biofarm-blue" />
                Wprowadź nowy gatunek stali stemplowej
              </h4>
              <form onSubmit={handleAddSteelSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Oznaczenie stali / Norma DIN</label>
                  <input
                    type="text"
                    required
                    placeholder="np. S7 Tool Steel o podwyższonej gęstości"
                    value={newSteelVal}
                    onChange={(e) => setNewSteelVal(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 focus:border-biofarm-blue rounded-lg px-3 py-2 outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSteel(false)}
                    className="px-4 py-2 text-xs font-semibold border border-slate-100 text-slate-500 hover:bg-slate-50 rounded-md cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-biofarm-blue hover:bg-biofarm-mid text-white rounded-md cursor-pointer"
                  >
                    Dodaj i Wybierz
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
