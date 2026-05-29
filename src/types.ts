export type TabletShape = 'okragly' | 'kapsulka' | 'kapsulka_zmodyfikowana' | 'owalny' | 'kwadratowy';

export type ToolStatus = 'Gotowy do produkcji' | 'W użyciu' | 'W konserwacji' | 'Wycofany z produkcji';

export interface ServiceRecord {
  id: string;
  data: string;
  typ: 'Kwalifikacja' | 'Polerowanie' | 'Inspekcja' | 'Metrologia' | 'Mycie Ultradźwiękowe';
  operator: string;
  status: 'Zatwierdzony' | 'Wykonano' | 'Wymaga uwagi';
  notatki: string;
  metrologia?: {
    dlugoscCalkowitaMax?: number; // mm
    dlugoscCalkowitaMin?: number; // mm
    biciePromieniowe?: number;    // mm
    chropowatoscRa?: number;      // µm
  };
  verifiedBy?: string; // Drugi sprawdzający (Four-Eyes Principle / QA)
  isGmpVerified?: boolean; // Czy zweryfikowane podwójnym podpisem GMP
  verificationDate?: string; // Data weryfikacji drugiego sprawdzającego
}

export interface StatusHistoryEntry {
  id: string;
  data: string;
  staryStatus: ToolStatus | 'Nowo utworzony';
  nowyStatus: ToolStatus;
  operator: string;
  powod?: string;
}

export interface ToolSet {
  id: string;
  lokalizacja: string;
  nazwaProduktu: string;
  numerWewnetrzny: string;
  dostawca: string;
  dataDostawy: string;
  ksztaltTabletki: TabletShape;
  standardNarzedzi: string;
  narzedziaWielokrotne: string;
  iloscZamawianych: number;
  znakowanie: string;
  silaNacisku: number; // kN
  rodzajStali: string;
  status: ToolStatus;
  dataDodania: string;
  uzycieGlowne: number; // Liczba uderzeń / stroke count
  uzycieLimit: number;  // Maksymalna liczba uderzeń
  hologramKalibracji?: string;
  historiaSerwisowa?: ServiceRecord[];
  statusHistory?: StatusHistoryEntry[];
  mikroskopDefekty?: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    opis: string;
    stopien: 'Słaby' | 'Umiarkowany' | 'Krytyczny';
    data: string;
    powiekszenie: string;
    kompletnyOpis?: string;
  }>;
  zalaczniki?: Array<{
    id: string;
    data: string;
    nazwa: string;
    typDokumentu: string;
    fotaUrl: string;
    rozmiar?: string;
  }>;
}

export interface TabletPress {
  id: string;
  nazwa: string;
  typ: 'Rotacyjna' | 'Jednostemplowa';
  kompatybilnyStandard: string[]; // ['EU-D', 'EU-B'] etc.
  stacjaCount: number;
  aktualnyKompletId?: string;
  status: 'Praca' | 'Przestój' | 'Przezbrajanie' | 'Czyszczenie';
  predkoscRobocza: number; // szt/h
}
