import { ToolSet, TabletPress } from './types';

export const INITIAL_LOCATIONS = [
  'Magazyn Główny A-1',
  'Magazyn Narzędziownia B-4',
  'Linia Produkcyjna L1',
  'Linia Produkcyjna L3',
  'Dział Walidacji i Testów',
  'Kwarantanna / Serwis',
];

export const INITIAL_SUPPLIERS = [
  'OP Technika',
  'Senacode S.A.',
  'PharmaTools Global',
  'SteelPress Sp. z o.o.',
  'Elizabeth Carbide Europe',
];

export const INITIAL_STEEL_TYPES = [
  '1.2379 (D2)',
  'M315 Extra (Bohler)',
  'M340 Bohler (PM-N)',
  'Vasco 50',
  'Durable-Max Carbon',
  'H13 Premium Chrome',
];

export const INITIAL_PRODUCTS = [
  'Metformina Biofarm 1000 mg',
  'Biofenac 100 mg',
  'Bioprazol Max 20 mg',
  'Ginkofar Forte 80 mg',
  'Alergo-Max 5 mg',
  'Biosotal 80 mg',
  'Haloperidol Biofarm 5 mg',
  'Biomentin 10 mg',
  'Cinnarizinum Biofarm 25 mg',
];

export const INITIAL_TOOLSETS: ToolSet[] = [
  {
    id: '621972',
    lokalizacja: 'Linia Produkcyjna L3',
    nazwaProduktu: 'Metformina Biofarm 1000 mg',
    numerWewnetrzny: 'BF/P-2025/112',
    dostawca: 'OP Technika',
    dataDostawy: '2025-10-14',
    ksztaltTabletki: 'kapsulka_zmodyfikowana',
    standardNarzedzi: 'EU-D',
    narzedziaWielokrotne: 'Podwójne-2',
    iloscZamawianych: 24,
    znakowanie: 'M1000 / BF',
    silaNacisku: 35,
    rodzajStali: 'M340 Bohler (PM-N)',
    status: 'W użyciu',
    dataDodania: '2025-10-15',
    uzycieGlowne: 2400000,
    uzycieLimit: 5000000,
    statusHistory: [
      {
        id: 'h1',
        data: '2026-05-15 08:30:11',
        staryStatus: 'Gotowy do produkcji',
        nowyStatus: 'W użyciu',
        operator: 'Andrzej Wiśniewski (System QC)',
        powod: 'Dopuszczenie serii produkcyjnej Metformina BF M1000'
      },
      {
        id: 'h2',
        data: '2026-05-10 14:15:22',
        staryStatus: 'W konserwacji',
        nowyStatus: 'Gotowy do produkcji',
        operator: 'Krzysztof Kowalski (Utrzymanie Ruchu)',
        powod: 'Polerowanie stempli i kontrola metrologiczna po serii'
      }
    ]
  },
  {
    id: '621841',
    lokalizacja: 'Magazyn Narzędziownia B-4',
    nazwaProduktu: 'Biofenac 100 mg',
    numerWewnetrzny: 'BF/P-2026/015',
    dostawca: 'Senacode S.A.',
    dataDostawy: '2026-02-08',
    ksztaltTabletki: 'okragly',
    standardNarzedzi: 'EU-B',
    narzedziaWielokrotne: 'Pojedyncze',
    iloscZamawianych: 36,
    znakowanie: 'BF / 100',
    silaNacisku: 25,
    rodzajStali: '1.2379 (D2)',
    status: 'Gotowy do produkcji',
    dataDodania: '2026-02-10',
    uzycieGlowne: 0,
    uzycieLimit: 4000000,
    statusHistory: [
      {
        id: 'h3',
        data: '2026-05-20 11:10:05',
        staryStatus: 'Nowo utworzony',
        nowyStatus: 'Gotowy do produkcji',
        operator: 'Joanna Nowak (QA Inspector)',
        powod: 'Zatwierdzenie nowego kompletu narzędzi T-15'
      }
    ]
  },
  {
    id: '621503',
    lokalizacja: 'Linia Produkcyjna L1',
    nazwaProduktu: 'Bioprazol Max 20 mg',
    numerWewnetrzny: 'BF/P-2025/088',
    dostawca: 'PharmaTools Global',
    dataDostawy: '2025-07-22',
    ksztaltTabletki: 'kapsulka',
    standardNarzedzi: 'EU-B',
    narzedziaWielokrotne: 'Wielokrotne-4',
    iloscZamawianych: 16,
    znakowanie: 'BPR20',
    silaNacisku: 18,
    rodzajStali: 'Vasco 50',
    status: 'W użyciu',
    dataDodania: '2025-07-25',
    uzycieGlowne: 4100000,
    uzycieLimit: 4500000,
  },
  {
    id: '621110',
    lokalizacja: 'Kwarantanna / Serwis',
    nazwaProduktu: 'Ginkofar Forte 80 mg',
    numerWewnetrzny: 'BF/P-2024/301',
    dostawca: 'OP Technika',
    dataDostawy: '2024-11-02',
    ksztaltTabletki: 'owalny',
    standardNarzedzi: 'EU-D',
    narzedziaWielokrotne: 'Pojedyncze',
    iloscZamawianych: 30,
    znakowanie: 'GF80',
    silaNacisku: 40,
    rodzajStali: 'M315 Extra (Bohler)',
    status: 'W konserwacji',
    dataDodania: '2024-11-05',
    uzycieGlowne: 3200000,
    uzycieLimit: 3500000,
    statusHistory: [
      {
        id: 'h4',
        data: '2026-05-25 16:40:00',
        staryStatus: 'W użyciu',
        nowyStatus: 'W konserwacji',
        operator: 'Andrzej Wiśniewski (System QC)',
        powod: 'Zlecenie okresowych badań chropowatości i polerowania stempli'
      }
    ]
  },
  {
    id: '620980',
    lokalizacja: 'Magazyn Główny A-1',
    nazwaProduktu: 'Alergo-Max 5 mg',
    numerWewnetrzny: 'BF/P-2024/167',
    dostawca: 'SteelPress Sp. z o.o.',
    dataDostawy: '2024-05-19',
    ksztaltTabletki: 'okragly',
    standardNarzedzi: 'TSM-B',
    narzedziaWielokrotne: 'Wielokrotne-8',
    iloscZamawianych: 12,
    znakowanie: 'A5 / BF',
    silaNacisku: 12,
    rodzajStali: 'Durable-Max Carbon',
    status: 'Gotowy do produkcji',
    dataDodania: '2024-05-22',
    uzycieGlowne: 1500000,
    uzycieLimit: 6000000,
  },
  {
    id: '620432',
    lokalizacja: 'Magazyn Główny A-1',
    nazwaProduktu: 'Biosotal 80 mg',
    numerWewnetrzny: 'BF/P-2023/190',
    dostawca: 'OP Technika',
    dataDostawy: '2023-08-11',
    ksztaltTabletki: 'kwadratowy',
    standardNarzedzi: 'EU-D',
    narzedziaWielokrotne: 'Pojedyncze',
    iloscZamawianych: 24,
    znakowanie: 'BS80',
    silaNacisku: 28,
    rodzajStali: '1.2379 (D2)',
    status: 'Wycofany z produkcji',
    dataDodania: '2023-08-15',
    uzycieGlowne: 4850000,
    uzycieLimit: 4500000, // Worn out! uzycieGlowne > uzycieLimit
  },
];

export const INITIAL_PRESSES: TabletPress[] = [
  {
    id: 'PRESS-FETTE-1',
    nazwa: 'T1 - Fette Compacting 2200ic',
    typ: 'Rotacyjna',
    kompatybilnyStandard: ['EU-D', 'EU-B'],
    stacjaCount: 42,
    aktualnyKompletId: '621972', // Metformina
    status: 'Praca',
    predkoscRobocza: 180000,
  },
  {
    id: 'PRESS-KILIAN-1',
    nazwa: 'T2 - KILIAN SYNTHESIS 500',
    typ: 'Rotacyjna',
    kompatybilnyStandard: ['EU-B', 'TSM-B'],
    stacjaCount: 36,
    aktualnyKompletId: '621503', // Bioprazol
    status: 'Praca',
    predkoscRobocza: 120000,
  },
  {
    id: 'PRESS-KORSCH-1',
    nazwa: 'T3 - KORSCH XL400 MFP',
    typ: 'Rotacyjna',
    kompatybilnyStandard: ['EU-D', 'EU-B', 'TSM-B'],
    stacjaCount: 29,
    aktualnyKompletId: undefined,
    status: 'Przezbrajanie',
    predkoscRobocza: 45000,
  },
  {
    id: 'PRESS-ROMACO-1',
    nazwa: 'T4 - KORSCH XL400 SL',
    typ: 'Rotacyjna',
    kompatybilnyStandard: ['EU-B'],
    stacjaCount: 32,
    aktualnyKompletId: undefined,
    status: 'Czyszczenie',
    predkoscRobocza: 90000,
  },
];
