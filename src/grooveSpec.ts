// ----------------------------------------------------------------
// GrooveSpec: Style 入力から生成されるグルーブパラメータ
// ----------------------------------------------------------------

export interface GrooveSpec {
  /** ヒューマナイズ強度 ±ms (0 = 機械的, 30 = かなりルーズ) */
  humanizeMs: number;
  /** キック密度 0–1 (各ステップの発音確率) */
  kickDensity: number;
  /** ハット密度 0–1 (各ステップの発音確率) */
  hatDensity: number;
  /** ギター間引き率 0–1 (小節ごとのスキップ確率; 0 = 常に発音) */
  guitarSkip: number;
}

export const STYLES = ['Tight', 'Rock', 'Funk', 'Jazz', 'Ballad', 'Latin'] as const;

export type StyleName = (typeof STYLES)[number];

export const STYLE_PRESETS: Record<StyleName, GrooveSpec> = {
  Tight:  { humanizeMs: 0,  kickDensity: 1.00, hatDensity: 1.00, guitarSkip: 0.00 },
  Rock:   { humanizeMs: 8,  kickDensity: 1.00, hatDensity: 1.00, guitarSkip: 0.00 },
  Funk:   { humanizeMs: 15, kickDensity: 0.75, hatDensity: 0.85, guitarSkip: 0.25 },
  Jazz:   { humanizeMs: 25, kickDensity: 0.60, hatDensity: 0.70, guitarSkip: 0.50 },
  Ballad: { humanizeMs: 20, kickDensity: 0.70, hatDensity: 0.50, guitarSkip: 0.30 },
  Latin:  { humanizeMs: 10, kickDensity: 0.80, hatDensity: 0.90, guitarSkip: 0.15 },
};
