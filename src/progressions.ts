// ----------------------------------------------------------------
// スケール度数スロット名
// ----------------------------------------------------------------
export type Degree = 'I' | 'IV' | 'V' | 'VI' | '♭VII';

// 1小節分のコード情報
export interface PatternSlot {
  guitar: Degree;
  bass: Degree;
  guitarSample?: string; // 特殊ボイシング用サンプルキー直接指定（例: 'Gadd9'）
  chordSuffix?: string;  // 表示名サフィックス（例: '(add9)'）
}

export interface ProgressionPattern {
  id: string;
  slots: readonly PatternSlot[];  // 4 または 8 スロット
}

export interface KeyDef {
  id: string;
  label: string;
  available: boolean;
  display:   Record<Degree, string>;
  sampleKey: Record<Degree, string>;
}

// ----------------------------------------------------------------
// コード進行パターン
// ----------------------------------------------------------------
export const PATTERNS: readonly ProgressionPattern[] = [
  {
    id: 'P1',
    slots: [
      { guitar: 'I',    bass: 'I'    },
      { guitar: 'V',    bass: 'V'    },
      { guitar: 'VI',   bass: 'VI'   },
      { guitar: 'IV',   bass: 'IV'   },
    ],
  },
  {
    id: 'P2',
    slots: [
      { guitar: 'VI',   bass: 'VI'   },
      { guitar: 'IV',   bass: 'IV'   },
      { guitar: 'V',    bass: 'V'    },
      { guitar: 'I',    bass: 'I'    },
    ],
  },
  {
    id: 'P3',
    slots: [
      { guitar: 'I',    bass: 'I'    },
      { guitar: '♭VII', bass: '♭VII' },
      { guitar: 'IV',   bass: 'I'    },                                          // IV/I
      { guitar: 'I',    bass: 'I'    },
      { guitar: 'I',    bass: 'I'    },
      { guitar: 'IV',   bass: 'IV'   },
      { guitar: '♭VII', bass: '♭VII', guitarSample: 'Gadd9', chordSuffix: '(add9)' },
      { guitar: 'IV',   bass: 'I'    },                                          // IV/I
    ],
  },
];

// ----------------------------------------------------------------
// キー定義
// ----------------------------------------------------------------
export const KEYS: readonly KeyDef[] = [
  {
    id: 'A', label: 'A', available: true,
    display:   { I: 'A',  IV: 'D',  V: 'E',  VI: 'F#m', '♭VII': 'G'  },
    sampleKey: { I: 'A',  IV: 'D',  V: 'E',  VI: 'F#m', '♭VII': 'G'  },
  },
  {
    id: 'E', label: 'E', available: true,
    display:   { I: 'E',  IV: 'A',  V: 'B',  VI: 'C#m', '♭VII': 'D'  },
    sampleKey: { I: 'E',  IV: 'A',  V: 'B',  VI: 'C#m', '♭VII': 'D'  },
  },
  {
    id: 'C', label: 'C', available: true,
    display:   { I: 'C',  IV: 'F',  V: 'G',  VI: 'Am',  '♭VII': 'B♭' },
    sampleKey: { I: 'C',  IV: 'F',  V: 'G',  VI: 'Am',  '♭VII': 'Bb' },
  },
  {
    id: 'G', label: 'G', available: true,
    display:   { I: 'G',  IV: 'C',  V: 'D',  VI: 'Em',  '♭VII': 'F'  },
    sampleKey: { I: 'G',  IV: 'C',  V: 'D',  VI: 'Em',  '♭VII': 'F'  },
  },
  {
    id: 'Am', label: 'Am', available: true,
    display:   { I: 'Am', IV: 'Dm', V: 'E',  VI: 'F',   '♭VII': 'G'  },
    sampleKey: { I: 'Am', IV: 'Dm', V: 'E',  VI: 'F',   '♭VII': 'G'  },
  },
  {
    id: 'Em', label: 'Em', available: true,
    display:   { I: 'Em', IV: 'Am', V: 'B',  VI: 'C',   '♭VII': 'D'  },
    sampleKey: { I: 'Em', IV: 'Am', V: 'B',  VI: 'C',   '♭VII': 'D'  },
  },
];

// ----------------------------------------------------------------
// ヘルパー関数
// ----------------------------------------------------------------

const DEGREE_NUMBERS: Record<Degree, string> = {
  I: '1', IV: '4', V: '5', VI: '6', '♭VII': '♭7',
};

/** pattern → 度数の数字表記 (例: "1-5-6-4") */
export function getDegreeNumbers(pattern: ProgressionPattern): string {
  return pattern.slots.map((s) => DEGREE_NUMBERS[s.guitar]).join('-');
}

/** pattern + key → 表示用コード名（スラッシュコード・サフィックス対応） */
export function getDisplayChords(
  pattern: ProgressionPattern,
  key: KeyDef,
): string[] {
  return pattern.slots.map((slot) => {
    const g = key.display[slot.guitar];
    const b = key.display[slot.bass];
    const suffix = slot.chordSuffix ?? '';
    if (slot.guitar !== slot.bass) {
      return `${g}${suffix}/${b}`;
    }
    return `${g}${suffix}`;
  });
}

/** pattern + key → ギター/ベース別サンプルキー配列 */
export function getSampleSlots(
  pattern: ProgressionPattern,
  key: KeyDef,
): { guitar: string; bass: string }[] {
  return pattern.slots.map((slot) => ({
    guitar: slot.guitarSample ?? key.sampleKey[slot.guitar],
    bass:   key.sampleKey[slot.bass],
  }));
}
