import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Wrench, ShieldCheck, UserCheck, AlertTriangle, Fingerprint, Lock, Check } from 'lucide-react';
import { ToolSet, ServiceRecord, ToolStatus } from '../types';

interface AddServiceRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolSets: ToolSet[];
  onAddRecord: (toolsetId: string, record: ServiceRecord, newStatus?: ToolStatus) => void;
}

export const AddServiceRecordModal: React.FC<AddServiceRecordModalProps> = ({
  isOpen,
  onClose,
  toolSets,
  onAddRecord,
}) => {
  const [selectedToolsetId, setSelectedToolsetId] = useState<string>(toolSets[0]?.id || '');
  const [taskType, setTaskType] = useState<ServiceRecord['typ']>('Polerowanie');
  const [operatorId, setOperatorId] = useState<string>('');
  const [verifierId, setVerifierId] = useState<string>('');
  const [status, setStatus] = useState<ServiceRecord['status']>('Wykonano');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Metrological specs
  const [dlugoscMax, setDlugoscMax] = useState<string>('133.61');
  const [dlugoscMin, setDlugoscMin] = useState<string>('133.59');
  const [bicie, setBicie] = useState<string>('0.003');
  const [ra, setRa] = useState<string>('0.04');

  // GMP Checkbox states
  const [gmpCheckCleaning, setGmpCheckCleaning] = useState(false);
  const [gmpCheckMicroscope, setGmpCheckMicroscope] = useState(false);
  const [gmpCheckTolerance, setGmpCheckTolerance] = useState(false);
  const [gmpCheckQASign, setGmpCheckQASign] = useState(false);

  // Step-by-Step 5-Phase Maintenance Wizard state
  const [currentWizardPhase, setCurrentWizardPhase] = useState<number>(1);
  const [wizardPhaseApprovals, setWizardPhaseApprovals] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false
  });

  const handleApprovePhase = (phaseIndex: number, approved: boolean) => {
    setWizardPhaseApprovals(prev => {
      const updated = { ...prev, [phaseIndex]: approved };
      
      // Auto-update general CFR checklists for legacy reports triggers
      setGmpCheckCleaning(updated[1] && updated[2]);
      setGmpCheckMicroscope(updated[2] && updated[3]);
      setGmpCheckTolerance(updated[4]);
      setGmpCheckQASign(updated[5]);
      
      return updated;
    });
  };

  // E-Signature / PIN layer
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  // QA Inspector Authentication States
  const [showQaInspectorAuth, setShowQaInspectorAuth] = useState(false);
  const [qaInspectorPin, setQaInspectorPin] = useState('');
  const [qaInspectorName, setQaInspectorName] = useState('');
  const [qaPinError, setQaPinError] = useState('');
  const [qaCheckMetrology, setQaCheckMetrology] = useState(false);
  const [qaCheckGmpStandard, setQaCheckGmpStandard] = useState(false);
  const [isQaSigning, setIsQaSigning] = useState(false);

  if (!isOpen) return null;

  const handlePreValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToolsetId) {
      alert('Proszę wybrać komplet stempli.');
      return;
    }
    if (!operatorId.trim()) {
      alert('Proszę podać identyfikator bądz nazwisko technika.');
      return;
    }
    if (!verifierId.trim()) {
      alert('Zgodnie z protokołem GMP CFR Part 11, wymagany jest identyfikator drugiego kontrolera QA.');
      return;
    }

    // Verify all 5 wizard steps are completed
    const allPhasesCompleted = wizardPhaseApprovals[1] && wizardPhaseApprovals[2] && wizardPhaseApprovals[3] && wizardPhaseApprovals[4] && wizardPhaseApprovals[5];
    if (!allPhasesCompleted) {
      alert('BŁĄD ZGODNOŚCI GMP: Każdy z 5 etapów czyszczenia i konserwacji musi zostać przeanalizowany i zatwierdzony w kreatorze krok po kroku.');
      return;
    }

    if (!notes.trim()) {
      alert('Proszę uzupełnić opis wykonanej procedury.');
      return;
    }
    if (!date) {
      alert('Proszę podać prawidłową datę przeprowadzenia serwisu.');
      return;
    }

    // Trigger electronic signature flow
    setShowPinPrompt(true);
    setPinCode('');
    setPinError('');
  };

  const handleConfirmSignature = () => {
    if (pinCode !== '1234') {
      setPinError('Niepoprawny kod PIN autoryzacji GMP! (Domyślny PIN to: 1234)');
      return;
    }

    setIsSigning(true);
    setTimeout(() => {
      if (status === 'Zatwierdzony') {
        setIsSigning(false);
        setPinCode('');
        setShowPinPrompt(false);
        // Pre-fill fields for QA Verification stage
        setQaInspectorName(verifierId || 'Joanna Nowak (QA)');
        setQaInspectorPin('');
        setQaPinError('');
        setQaCheckMetrology(false);
        setQaCheckGmpStandard(false);
        setShowQaInspectorAuth(true); // Open the dedicated QA validation flow
        return;
      }

      // Generate a dynamic SHA255 signature checksum
      const hex = '0123456789abcdef';
      let checksum = '';
      for (let i = 0; i < 40; i++) {
        checksum += hex[Math.floor(Math.random() * 16)];
      }

      const checksPassed = gmpCheckCleaning && gmpCheckMicroscope && gmpCheckTolerance && gmpCheckQASign;
      const checklistMsg = checksPassed
        ? '\n[ZATWIERDZONA PEŁNA PROCEDURA WALIDACYJNA GMP (Mycie, Mikroskopia, Tolerancje, Podpis QA)]'
        : '\n[OSTRZEŻENIE: PROCEDURA CZĘŚCIOWA - BRAK PEŁNEGO PROTOKOŁU GMP]';

      const sigNote = `\n[PODPIS CYFROWY GMP - 21 CFR PART 11]\nSygnowane przez technika: ${operatorId}\nAutoryzowane przez QA: ${verifierId}\nPowód: Manualna rejestracja serwisu (${taskType})\nSuma kontrolna: SHA255-${checksum.substring(0, 20)}\nStatus: Autoryzacja cyfrowa podwójnego podpisu`;

      const newRecord: ServiceRecord = {
        id: Math.floor(100000 + Math.random() * 900000).toString(),
        data: date,
        typ: taskType,
        operator: operatorId,
        status: status,
        notatki: notes + checklistMsg + sigNote,
        metrologia: {
          dlugoscCalkowitaMax: parseFloat(dlugoscMax) || undefined,
          dlugoscCalkowitaMin: parseFloat(dlugoscMin) || undefined,
          biciePromieniowe: parseFloat(bicie) || undefined,
          chropowatoscRa: parseFloat(ra) || undefined,
        },
        verifiedBy: verifierId,
        isGmpVerified: true,
        verificationDate: new Date().toISOString().split('T')[0]
      };

      // If status is Zatwierdzony or Wykonano, we can set the tool's overall state to "Gotowy do produkcji"
      const nextToolStatus: ToolStatus = status === 'Wykonano'
        ? 'Gotowy do produkcji'
        : 'W konserwacji';

      onAddRecord(selectedToolsetId, newRecord, nextToolStatus);
      setIsSigning(false);
      setShowPinPrompt(false);
      onClose();
    }, 1200);
  };

  const handleConfirmQaSignature = () => {
    if (!qaCheckMetrology || !qaCheckGmpStandard) {
      setQaPinError('Musisz zatwierdzić oba oświadczenia kontrolne QA (metrologia i dopuszczenie GMP).');
      return;
    }
    if (!qaInspectorName.trim()) {
      setQaPinError('Proszę podać nazwisko bądz identyfikator QA Inspectora.');
      return;
    }
    if (qaInspectorPin !== '5555') {
      setQaPinError('Niepoprawny kod bezpieczeństwa QA Inspector! (Wskazówka: Domyślny PIN QA to 5555)');
      return;
    }

    setIsQaSigning(true);
    setTimeout(() => {
      // Generate a dynamic SHA255 dual signature checksum
      const hex = '0123456789abcdef';
      let checksum = '';
      for (let i = 0; i < 40; i++) {
        checksum += hex[Math.floor(Math.random() * 16)];
      }

      const checksPassed = gmpCheckCleaning && gmpCheckMicroscope && gmpCheckTolerance && gmpCheckQASign;
      const checklistMsg = checksPassed
        ? '\n[ZATWIERDZONA PEŁNA PROCEDURA WALIDACYJNA GMP (Mycie, Mikroskopia, Tolerancje, Podpis QA)]'
        : '\n[OSTRZEŻENIE: PROCEDURA CZĘŚCIOWA - BRAK PEŁNEGO PROTOKOŁU GMP]';

      const sigNote = `\n[PODPIS CYFROWY GMP - 21 CFR PART 11 - TECHNIK]\nSygnowane przez technika: ${operatorId}\nPowód: Rejestracja serwisu i weryfikacja techniczna (${taskType})\nSuma kontrolna: SHA255-${checksum.substring(0, 20)}`;
      
      const qaNote = `\n[WPIS AUTORYZOWANY DUAL-SIGNATURE - QA INSPECTOR]\nOsoba autoryzująca (QA Inspector): ${qaInspectorName}\nKlasa operacji: Dopuszczenie strefy czystej (FOR PRODUCTION RELEASE)\nInstytucja certyfikująca: Dział Zapewnienia Jakości (QA Biofarm Poznań)\nSuma kontrolna QA: SHA255-${checksum.substring(20, 40).toUpperCase()}\nPełna zgodność metrologiczna: TAK (Potwierdzona)\nStatus dokumentu GMP: ZATWIERDZONY / BEZPIECZNY`;

      const newRecord: ServiceRecord = {
        id: Math.floor(100000 + Math.random() * 900000).toString(),
        data: date,
        typ: taskType,
        operator: operatorId,
        status: 'Zatwierdzony',
        notatki: notes + checklistMsg + sigNote + qaNote,
        metrologia: {
          dlugoscCalkowitaMax: parseFloat(dlugoscMax) || undefined,
          dlugoscCalkowitaMin: parseFloat(dlugoscMin) || undefined,
          biciePromieniowe: parseFloat(bicie) || undefined,
          chropowatoscRa: parseFloat(ra) || undefined,
        },
        verifiedBy: qaInspectorName,
        isGmpVerified: true,
        verificationDate: new Date().toISOString().split('T')[0]
      };

      onAddRecord(selectedToolsetId, newRecord, 'Gotowy do produkcji');
      setIsQaSigning(false);
      setShowQaInspectorAuth(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] relative z-10 font-sans text-left"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-biofarm-dark to-slate-905 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/85 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-white/10 text-biofarm-cyan flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-blue-200">Rejestracja Serwisu i Walidacji</span>
              <h3 className="font-bold text-base leading-tight">
                Zarejestruj Manualny Zabieg Konserwatorski
              </h3>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 max-h-[68vh]">
          {!showPinPrompt && !showQaInspectorAuth ? (
            <form onSubmit={handlePreValidate} className="space-y-4 text-xs">
              
              {/* Select Toolset row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Dotyczy kompletu stempli / matryc:</label>
                  <select
                    value={selectedToolsetId}
                    onChange={(e) => setSelectedToolsetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg font-mono text-xs cursor-pointer focus:bg-white outline-none"
                  >
                    <option value="" disabled>Wybierz komplet...</option>
                    {toolSets.map((t) => (
                      <option key={t.id} value={t.id}>
                        SET-{t.id} - {t.nazwaProduktu} ({t.standardNarzedzi})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Rodzaj zabiegu i kalibracji:</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg font-mono text-xs cursor-pointer focus:bg-white outline-none"
                  >
                    <option value="Polerowanie">Polerowanie czołowe stempli</option>
                    <option value="Mycie Ultradźwiękowe">Mycie w komorze ultradźwiękowej</option>
                    <option value="Inspekcja">Inspekcja techniczna i kalibracja</option>
                    <option value="Kwalifikacja">Kwalifikacja techniczna (IQ/OQ)</option>
                    <option value="Metrologia">Metrologiczne pomiary starzeniowe</option>
                  </select>
                </div>
              </div>

              {/* Personnel row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Technik wykonujący (ID / Nazwisko):</label>
                  <input
                    type="text"
                    placeholder="Np. Jan Kowalski"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg text-xs focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Podwójna weryfikacja QA (Sprawdzający):</label>
                  <input
                    type="text"
                    placeholder="Np. Joanna Nowak (QA)"
                    value={verifierId}
                    onChange={(e) => setVerifierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg text-xs focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Data przeprowadzenia:</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg font-mono text-xs focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status and Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Szczegółowe uwagi techniczne (GMP):</label>
                  <input
                    type="text"
                    placeholder="Opisz np. rodzaj pasty polerskiej, stan powierzchni..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg text-xs focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Rekomendowany status końcowy:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg font-mono text-xs cursor-pointer focus:bg-white outline-none"
                  >
                    <option value="Wykonano">Wykonano (Przekaż do Magazynu)</option>
                    <option value="Zatwierdzony">Zatwierdzony / Zgodny (GMP OK)</option>
                    <option value="Wymaga uwagi">Wymaga uwagi / Re-inspekcja</option>
                  </select>
                </div>
              </div>

              {/* Optional Metrological card */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 space-y-2">
                <span className="text-[9.5px] font-mono font-bold text-biofarm-blue uppercase block tracking-wider">
                  📐 REJESTR POMIARÓW METROLOGICZNYCH (METROLOGICAL FEEDBACK):
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[8px] font-mono text-slate-450 uppercase">Długość max (mm):</label>
                    <input
                      type="text"
                      value={dlugoscMax}
                      onChange={(e) => setDlugoscMax(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-center font-mono text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-slate-450 uppercase">Długość min (mm):</label>
                    <input
                      type="text"
                      value={dlugoscMin}
                      onChange={(e) => setDlugoscMin(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-center font-mono text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-slate-450 uppercase">Bicie promieniowe (mm):</label>
                    <input
                      type="text"
                      value={bicie}
                      onChange={(e) => bicie && setBicie(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-center font-mono text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-slate-450 uppercase">Gładkość czoła Ra (µm):</label>
                    <input
                      type="text"
                      value={ra}
                      onChange={(e) => setRa(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-center font-mono text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* GMP 5-Phase Maintenance Wizard Stepper */}
              <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <span className="text-[10px] uppercase font-bold text-slate-100 tracking-wider">
                      RESTRYKCYJNY KREATOR KONSERWACJI (STANDARD GMP BIOFARM)
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-black uppercase shrink-0 ${
                    (wizardPhaseApprovals[1] && wizardPhaseApprovals[2] && wizardPhaseApprovals[3] && wizardPhaseApprovals[4] && wizardPhaseApprovals[5])
                      ? 'bg-[#00ca9a] text-slate-950 font-black animate-none'
                      : 'bg-amber-500 text-slate-950 font-bold animate-pulse'
                  }`}>
                    {(wizardPhaseApprovals[1] && wizardPhaseApprovals[2] && wizardPhaseApprovals[3] && wizardPhaseApprovals[4] && wizardPhaseApprovals[5]) 
                      ? 'Zatwierdzony (Kwalifikowano)' 
                      : 'W toku: uzupełnij 5 faz'
                    }
                  </span>
                </div>

                {/* Steps Visual Indicator Bar */}
                <div className="flex items-center justify-between px-2 py-1 select-none">
                  {[1, 2, 3, 4, 5].map((phNum) => {
                    const isCompleted = wizardPhaseApprovals[phNum];
                    const isActive = currentWizardPhase === phNum;
                    return (
                      <React.Fragment key={phNum}>
                        <button
                          type="button"
                          onClick={() => setCurrentWizardPhase(phNum)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs border transition-all cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                              : isActive
                                ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400/35 font-extrabold'
                                : 'bg-slate-950 border-slate-805 text-slate-500'
                          }`}
                        >
                          {phNum}
                        </button>
                        {phNum < 5 && (
                          <div className={`flex-1 h-0.5 rounded transition-all ${
                            wizardPhaseApprovals[phNum] ? 'bg-emerald-500' : 'bg-slate-800'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Current Active Wizard Step Content Card */}
                <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-lg text-left space-y-3 font-sans">
                  {currentWizardPhase === 1 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20">
                          Faza 1/5: Demontaż i Weryfikacja Wstępna
                        </span>
                        {wizardPhaseApprovals[1] && <span className="text-[9px] text-[#00ca9a] font-bold">✓ Zatwierdzona</span>}
                      </div>
                      <p className="text-[10.5px] leading-relaxed text-slate-300">
                        Oczyść elementy kompletu z grubszych pozostałości proszku farmaceutycznego. Zdemontuj stemple dolne, górne oraz matryce do osobnych tacek transportowych. Dokonaj inspekcji tożsamości zestawu (numer wewnętrzny i grawerunki).
                      </p>
                      <div className="bg-[#6366f1]/10 p-2 border border-[#6366f1]/20 rounded-lg text-[9.5px] font-mono text-indigo-300 leading-normal">
                        <strong>Zalecenie Biofarm:</strong> Używaj wyznaczonego odkurzacza strefowego z filtrem HEPA H14 w klasie czystości D.
                      </div>
                    </div>
                  )}

                  {currentWizardPhase === 2 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20">
                          Faza 2/5: Mycie Ultradźwiękowe głębokie
                        </span>
                        {wizardPhaseApprovals[2] && <span className="text-[9px] text-[#00ca9a] font-bold">✓ Zatwierdzona</span>}
                      </div>
                      <p className="text-[10.5px] leading-relaxed text-slate-300">
                        Zanurz oprzyrządowanie w komorze ultradźwiękowej wypełnionej 3% roztworem certyfikowanego detergentu alkalicznego. Myj w temperaturze 45-50°C przez pełen cykl trwający 15 minut (częstotliwość 40 kHz).
                      </p>
                      <div className="bg-[#6366f1]/10 p-2 border border-[#6366f1]/20 rounded-lg text-[9.5px] font-mono text-indigo-300 leading-normal">
                        <strong>Zalecenie Biofarm:</strong> Nie przeciążaj koszyków stemplowych. Stemple nie mogą bezpośrednio stykać się ze sobą czołami, by uniknąć pęknięć.
                      </div>
                    </div>
                  )}

                  {currentWizardPhase === 3 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20">
                          Faza 3/5: Płukanie, Odwadnianie & IPA 70%
                        </span>
                        {wizardPhaseApprovals[3] && <span className="text-[9px] text-[#00ca9a] font-bold">✓ Zatwierdzona</span>}
                      </div>
                      <p className="text-[10.5px] leading-relaxed text-slate-300">
                        Opłucz dokładnie wodą oczyszczoną (Aqua Purificata) celem neutralizacji detergentu. Przedmuchaj filtrowanym sprężonym powietrzem, a następnie spryskaj obficie roztworem IPA 70% w celu pełnej dekontaminacji.
                      </p>
                      <div className="bg-[#6366f1]/10 p-2 border border-[#6366f1]/20 rounded-lg text-[9.5px] font-mono text-indigo-300 leading-normal">
                        <strong>Zalecenie Biofarm:</strong> Konieczna kontrola mikrobiologiczna. Alkoholowanie musi pokryć 100% powierzchni matrycy.
                      </div>
                    </div>
                  )}

                  {currentWizardPhase === 4 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20">
                          Faza 4/5: Suszenie Termiczne & Polerowanie Czołowe
                        </span>
                        {wizardPhaseApprovals[4] && <span className="text-[9px] text-[#00ca9a] font-bold">✓ Zatwierdzona</span>}
                      </div>
                      <p className="text-[10.5px] leading-relaxed text-slate-300">
                        Umieść oprzyrządowanie w suszarce technicznej o obiegu wymuszonym na 20 minut w temperaturze 70°C. Następnie dokonaj delikatnego polerowania czoła przy użyciu autoryzowanej gładzącej pasty tlenkowej (Ra &lt; 0.08 µm).
                      </p>
                      <div className="bg-[#6366f1]/10 p-2 border border-[#6366f1]/20 rounded-lg text-[9.5px] font-mono text-indigo-300 leading-normal">
                        <strong>Zalecenie Biofarm:</strong> Nadmierne polerowanie może spłycić grawerunki i spowodować późniejsze wady tłoczenia tabletki.
                      </div>
                    </div>
                  )}

                  {currentWizardPhase === 5 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20">
                          Faza 5/5: Inspekcja Metrologiczna & Próba Dopuszczenia
                        </span>
                        {wizardPhaseApprovals[5] && <span className="text-[9px] text-[#00ca9a] font-bold">✓ Zatwierdzona</span>}
                      </div>
                      <p className="text-[10.5px] leading-relaxed text-slate-300">
                        Wykonaj inspekcję stereoskopową krawędzi, sprawdź brak mikrowykruszeń. Zmierz odchylenia bicia bocznego stempli, a także długość całkowitą (powinna mieścić się w tolerancji ±0.03 mm w odniesieniu do rysunku technicznego).
                      </p>
                      <div className="bg-[#6366f1]/10 p-2 border border-[#6366f1]/20 rounded-lg text-[9.5px] font-mono text-indigo-300 leading-normal">
                        <strong>Zalecenie Biofarm:</strong> Wprowadź uzyskane odczyty metrologiczne do karty technicznej powyżej, przed zasygnowaniem protokołu.
                      </div>
                    </div>
                  )}

                  {/* Approval Checkbox button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !wizardPhaseApprovals[currentWizardPhase];
                        handleApprovePhase(currentWizardPhase, nextVal);
                        
                        // Automatically push to the next step on click to make it extremely smooth and professional!
                        if (nextVal && currentWizardPhase < 5) {
                          setTimeout(() => {
                            setCurrentWizardPhase(curr => Math.min(5, curr + 1));
                          }, 300);
                        }
                      }}
                      className={`w-full py-2 rounded-lg font-mono font-bold text-[10px] uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        wizardPhaseApprovals[currentWizardPhase]
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 animate-pulse'
                          : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
                      }`}
                    >
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>
                        {wizardPhaseApprovals[currentWizardPhase]
                          ? `Zatwierdzono Fazę ${currentWizardPhase} (Klip GMP)`
                          : `Zatwierdź Fazę ${currentWizardPhase} zgodnie z Biofarm GMP`
                        }
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sub-navigation buttons inside wizard */}
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <button
                    type="button"
                    disabled={currentWizardPhase === 1}
                    onClick={() => setCurrentWizardPhase(curr => Math.max(1, curr - 1))}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-705 disabled:opacity-40 text-slate-300 cursor-pointer"
                  >
                    &larr; Wstecz
                  </button>
                  <span className="text-slate-500">FAZA {currentWizardPhase} z 5</span>
                  <button
                    type="button"
                    disabled={currentWizardPhase === 5}
                    onClick={() => setCurrentWizardPhase(curr => Math.min(5, curr + 1))}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-705 disabled:opacity-40 text-slate-300 cursor-pointer"
                  >
                    Dalej &rarr;
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 font-mono">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 font-black uppercase text-[10px] bg-slate-155 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-black uppercase text-[10px] bg-[#00ca9a] hover:bg-emerald-500 text-slate-950 rounded-lg cursor-pointer transition-all shadow-sm"
                >
                  Podpisz i Zatwierdź wpis GMP (21 CFR)
                </button>
              </div>

            </form>
          ) : showPinPrompt && !showQaInspectorAuth ? (
            
            /* CFR Part 11 Pin prompt section */
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-5 bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl max-w-md mx-auto space-y-4 font-sans text-center"
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full">
                  <Fingerprint className="w-8 h-8 animate-pulse text-[#00ca9a]" />
                </div>
                <h4 className="font-black text-white text-sm uppercase tracking-wider font-mono">Wymagany podpis elektroniczny (21 CFR Part 11)</h4>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  Wpisujesz manualny zabieg technicznego utrzymania ruchu w strefie czystej Biofarm Poznań. Wprowadź swój osobisty GMP PIN.
                </p>
              </div>

              <div className="space-y-4 text-left text-xs font-mono">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 space-y-1 bg-black/50 text-[11px]">
                  <div><span className="text-slate-500">Zadanie:</span> <span className="font-bold text-white">{taskType.toUpperCase()}</span></div>
                  <div><span className="text-slate-500">Komplet:</span> <span className="font-bold text-biofarm-cyan">SET-{selectedToolsetId}</span></div>
                  <div><span className="text-slate-500">Wykonawca:</span> <span className="font-bold text-slate-200">{operatorId}</span></div>
                  <div><span className="text-slate-500">QA weryfikator:</span> <span className="font-bold text-emerald-400">{verifierId}</span></div>
                  <div><span className="text-slate-500">Data serwisu:</span> <span>{date}</span></div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Wprowadź kod PIN operatora:</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Lock className="w-4 h-4 text-indigo-400" />
                    </span>
                    <input
                      type="password"
                      placeholder="••••"
                      maxLength={4}
                      value={pinCode}
                      onChange={(e) => {
                        setPinCode(e.target.value);
                        setPinError('');
                      }}
                      disabled={isSigning}
                      className="w-full bg-slate-950 border border-slate-800 text-center text-white p-2 pl-9 font-mono font-black text-lg rounded-xl tracking-[0.25em] outline-none"
                    />
                  </div>
                  <span className="text-[8.5px] text-slate-500 block mt-1 font-sans text-center">Wskazówka demonstracyjna: Domyślny PIN to 1234</span>
                </div>

                {pinError && (
                  <div className="p-2 border border-rose-500/20 bg-rose-500/10 text-rose-300 text-[10px] rounded-lg font-sans flex items-start gap-1.5 leading-normal">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{pinError}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 font-mono text-xs">
                <button
                  type="button"
                  disabled={isSigning}
                  onClick={() => setShowPinPrompt(false)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg cursor-pointer uppercase font-bold"
                >
                  Cofnij
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSignature}
                  disabled={isSigning}
                  className="flex-1 py-1.5 bg-[#00ca9a] hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 rounded-lg cursor-pointer uppercase font-black font-mono text-[10px]"
                >
                  {isSigning ? 'Sygnowanie...' : 'Uwierzytelnij'}
                </button>
              </div>
            </motion.div>
          ) : (
            /* Dedicated Verification Modal to enforce Quality Assurance (QA Inspector) dual authorization */
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-5 bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl max-w-md mx-auto space-y-4 font-sans text-left"
            >
              <div className="flex flex-col items-center justify-center space-y-2 text-center border-b border-slate-800 pb-3">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full">
                  <ShieldCheck className="w-7 h-7 text-cyan-400 animate-pulse" />
                </div>
                <h4 className="font-black text-white text-xs uppercase tracking-wider font-mono">
                  Wymagana autoryzacja drugiego użytkownika (QA Inspector Dual-Authorization)
                </h4>
                <p className="text-[9.5px] text-slate-450 leading-normal font-sans">
                  Zgodnie z procedurami GMP, status <span className="text-emerald-400 font-bold">Zatwierdzony/Zgodny</span> wymaga kontrasygnaty drugiego, niezależnego pracownika Działu Jakości (QA Inspector).
                </p>
              </div>

              {/* Review card */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1.5 text-[10.5px] font-mono">
                <span className="text-[8.5px] text-slate-500 block uppercase font-bold">Zgłoszony zapis serwisowy:</span>
                <div><span className="text-slate-450">Komplet:</span> <span className="font-bold text-biofarm-cyan">SET-{selectedToolsetId}</span></div>
                <div><span className="text-slate-450">Zabieg:</span> <span className="font-bold text-slate-200">{taskType}</span></div>
                <div><span className="text-slate-450">Technik:</span> <span className="font-bold text-slate-200">{operatorId}</span></div>
                <div className="pt-1 border-t border-slate-900 grid grid-cols-2 gap-x-2 text-[9.5px] text-cyan-400">
                  <div>Max dł: {dlugoscMax} mm</div>
                  <div>Min dł: {dlugoscMin} mm</div>
                  <div>Bicie: {bicie} mm</div>
                  <div>Gładkość: Ra {ra} µm</div>
                </div>
              </div>

              {/* QA Verification Checkboxes */}
              <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-[10px]">
                <span className="text-[8.5px] text-slate-500 font-mono uppercase font-bold block mb-1">Potwierdzenia walidacyjne QA:</span>
                
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={qaCheckMetrology}
                    onChange={(e) => setQaCheckMetrology(e.target.checked)}
                    className="w-3.5 h-3.5 mt-0.5 rounded text-cyan-500 focus:ring-0 cursor-pointer border-slate-700 bg-slate-900"
                  />
                  <div>
                    <span className="font-bold text-slate-200 block text-[10px]">Mam wgląd w wyniki i zatwierdzam stan metrologiczny</span>
                    <span className="text-[8.5px] text-slate-400 font-mono block">Długości całkowite, bicie promieniowe i mikroskopia są zgodne.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={qaCheckGmpStandard}
                    onChange={(e) => setQaCheckGmpStandard(e.target.checked)}
                    className="w-3.5 h-3.5 mt-0.5 rounded text-cyan-500 focus:ring-0 cursor-pointer border-slate-700 bg-slate-900"
                  />
                  <div>
                    <span className="font-bold text-slate-200 block text-[10px]">Zatwierdzam dopuszczenie do strefy czystej (GMP KO)</span>
                    <span className="text-[8.5px] text-slate-400 font-mono block">Forma stempli spełnia wymogi dla produkcji Biofarm.</span>
                  </div>
                </label>
              </div>

              {/* Pin inputs */}
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[8px] text-slate-400 uppercase font-mono mb-1">Tożsamość QA Inspectora:</label>
                    <input
                      type="text"
                      placeholder="Joanna Nowak"
                      value={qaInspectorName}
                      onChange={(e) => {
                        setQaInspectorName(e.target.value);
                        setQaPinError('');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-1.5 font-mono text-xs focus:bg-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] text-slate-400 uppercase font-mono mb-1">Kod PIN QA Inspectora:</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500">
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      </span>
                      <input
                        type="password"
                        placeholder="••••"
                        maxLength={4}
                        value={qaInspectorPin}
                        onChange={(e) => {
                          setQaInspectorPin(e.target.value);
                          setQaPinError('');
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-center text-white rounded-lg p-1.5 pl-8 font-mono font-bold tracking-[0.2em] focus:bg-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <span className="text-[8.5px] text-slate-500 font-mono block text-center">Wskazówka demonstracyjna: Domyślny PIN QA to 5555</span>

                {qaPinError && (
                  <div className="p-2 border border-rose-500/20 bg-rose-500/10 text-rose-300 text-[9px] rounded-lg font-sans flex items-start gap-1 shrink-0 leading-normal">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{qaPinError}</span>
                  </div>
                )}
              </div>

              {/* Submit actions */}
              <div className="flex gap-2 font-mono text-xs pt-1">
                <button
                  type="button"
                  disabled={isQaSigning}
                  onClick={() => setShowQaInspectorAuth(false)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-lg cursor-pointer uppercase font-bold"
                >
                  Cofnij
                </button>
                <button
                  type="button"
                  onClick={handleConfirmQaSignature}
                  disabled={isQaSigning}
                  className="flex-1 py-1.5 bg-[#00ca9a] hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 rounded-lg cursor-pointer uppercase font-black font-mono text-[10px]"
                >
                  {isQaSigning ? 'Autoryzacja...' : 'Zatwierdź jako QA'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
